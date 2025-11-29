from __future__ import annotations

import functools
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn.functional as F
import torch.nn as nn
from PIL import Image

from .config import PHASE_DEFINITIONS, PIXEL_VALUE_TO_LABEL, TrainingConfig
from .models import PhaseClassifier, UNetSegmenter
from .models.endovit_segmentation import (
    EndoVITSemanticSegmenter,
    endovit_support_error,
    is_endovit_supported,
)
from .ranking import (
    calculate_object_score,
    calculate_phase_score,
    compute_importance,
    empty_phase_probabilities,
)


class SurgicalSceneAnalyzer:
    """
    Wraps the trained phase classifier and segmentation model.
    Provides utility helpers that the FastAPI backend can call for each frame.
    """

    def __init__(
        self,
        config: TrainingConfig | None = None,
        device: str | None = None,
    ) -> None:
        self.config = config or TrainingConfig()
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.config.ensure_artifacts_dir()

        num_classes = len(PIXEL_VALUE_TO_LABEL)
        self.segmentation_backend = "unet"
        self.segmentation_model = self._build_segmentation_model(num_classes)
        self.phase_model = PhaseClassifier(num_classes=len(PHASE_DEFINITIONS)).to(
            self.device
        )

        self._load_weights()
        self.segmentation_model.eval()
        self.phase_model.eval()

        self.pixel_to_label = PIXEL_VALUE_TO_LABEL
        self.label_list = list(PIXEL_VALUE_TO_LABEL.values())

    def _build_segmentation_model(self, num_classes: int) -> nn.Module:
        if (
            self.config.endovit_segmentation_checkpoint
            and self.config.endovit_segmentation_checkpoint.exists()
            and is_endovit_supported()
        ):
            try:
                model = EndoVITSemanticSegmenter(
                    num_classes=num_classes,
                    checkpoint_path=self.config.endovit_segmentation_checkpoint,
                    device=torch.device(self.device),
                )
                self.segmentation_backend = "endovit"
                return model.eval()
            except Exception as exc:
                print(f"[WARN] Failed to initialize EndoViT segmentation: {exc}")
        elif (
            self.config.endovit_segmentation_checkpoint
            and self.config.endovit_segmentation_checkpoint.exists()
            and not is_endovit_supported()
        ):
            print(
                "[WARN] EndoViT checkpoint detected but dependencies are missing. "
                f"{endovit_support_error()}"
            )

        model = UNetSegmenter(num_classes=num_classes).to(self.device)
        self.segmentation_backend = "unet"
        return model

    def _load_weights(self) -> None:
        if self.segmentation_backend == "unet" and self.config.segmentation_checkpoint.exists():
            checkpoint = torch.load(
                self.config.segmentation_checkpoint, map_location=self.device
            )
            self.segmentation_model.load_state_dict(checkpoint["model_state"])

        if self.config.phase_checkpoint.exists():
            checkpoint = torch.load(
                self.config.phase_checkpoint, map_location=self.device
            )
            self.phase_model.load_state_dict(checkpoint["model_state"])

    def preprocess_image(self, image: np.ndarray) -> torch.Tensor:
        tensor = torch.from_numpy(image).float() / 255.0
        tensor = tensor.permute(2, 0, 1)
        tensor = F.interpolate(
            tensor.unsqueeze(0),
            size=(self.config.image_size, self.config.image_size),
            mode="bilinear",
            align_corners=False,
        )
        # Normalization aligned with training
        mean = torch.tensor([0.485, 0.456, 0.406], device=tensor.device).view(1, 3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225], device=tensor.device).view(1, 3, 1, 1)
        tensor = (tensor - mean) / std
        return tensor

    @torch.inference_mode()
    def analyze_frame(
        self, image: np.ndarray, quality_score: float
    ) -> Dict[str, object]:
        tensor = self.preprocess_image(image).to(self.device)

        seg_logits = self.segmentation_model(tensor)
        if seg_logits.shape[-2:] != tensor.shape[-2:]:
            seg_logits = F.interpolate(
                seg_logits,
                size=tensor.shape[-2:],
                mode="bilinear",
                align_corners=False,
            )
        phase_logits = self.phase_model(tensor)

        seg_mask = torch.argmax(seg_logits, dim=1).squeeze(0).cpu().numpy()
        phase_probs = torch.softmax(phase_logits, dim=1).squeeze(0).cpu().numpy()

        phase_prob_dict = self._phase_probabilities_dict(phase_probs)
        phase_label = max(phase_prob_dict, key=phase_prob_dict.get)

        detected_objects = self._summarize_objects(seg_mask)

        phase_score = calculate_phase_score(phase_prob_dict)
        object_score = calculate_object_score(obj for obj, _ in detected_objects)
        importance = compute_importance(quality_score, phase_score, object_score)

        return {
            "phase": phase_label,
            "phase_probabilities": phase_prob_dict,
            "segmentation_mask": seg_mask,
            "detected_objects": detected_objects,
            "importance_score": importance,
            "phase_score": phase_score,
            "object_score": object_score,
        }

    def _phase_probabilities_dict(self, probs: np.ndarray) -> Dict[str, float]:
        phases = [name for name, _ in PHASE_DEFINITIONS]
        if probs.shape[0] != len(phases):
            return empty_phase_probabilities()
        return {phase: float(prob) for phase, prob in zip(phases, probs)}

    def _summarize_objects(self, seg_mask: np.ndarray) -> List[Tuple[str, float]]:
        areas: Dict[str, int] = {}
        total_pixels = seg_mask.size
        for class_idx, label in enumerate(self.label_list):
            count = int((seg_mask == class_idx).sum())
            if count == 0 or label == "background":
                continue
            areas[label] = count

        ranked = sorted(
            ((label, count / total_pixels) for label, count in areas.items()),
            key=lambda item: item[1],
            reverse=True,
        )
        return ranked[:5]

    def save_mask_preview(
        self, seg_mask: np.ndarray, output_path: Path, palette: Dict[int, Tuple[int, int, int]]
    ) -> None:
        """
        Optional helper to persist a color mask for UI overlays.
        """
        h, w = seg_mask.shape
        canvas = np.zeros((h, w, 3), dtype=np.uint8)
        for idx, label in enumerate(self.label_list):
            if label == "background":
                continue
            color = palette.get(idx, (255, 255, 255))
            canvas[seg_mask == idx] = color

        Image.fromarray(canvas).save(output_path)
