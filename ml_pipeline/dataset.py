from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

from .config import PHASE_DEFINITIONS, PIXEL_VALUE_TO_LABEL, TrainingConfig


@dataclass
class Sample:
    image_path: Path
    mask_path: Path
    video_id: str
    frame_index: int
    phase: str


def _phase_from_progress(progress: float) -> str:
    cumulative = 0.0
    for name, share in PHASE_DEFINITIONS:
        cumulative += share
        if progress <= cumulative:
            return name
    return PHASE_DEFINITIONS[-1][0]


class CholecSeg8kDataset(Dataset):
    """
    Custom dataset that exposes both segmentation masks and pseudo phase labels.
    The dataset splits are created at the video level to prevent leakage.
    """

    def __init__(
        self,
        config: TrainingConfig,
        split: str = "train",
        augment: bool = True,
        split_file: Path | None = None,
    ) -> None:
        self.config = config
        self.root = config.dataset_root
        self.split = split
        self.split_file = split_file or (config.artifacts_dir / "cholecseg_split.json")
        self._prepare_split_file()
        self.samples = self._gather_samples()
        self.pixel_to_label = PIXEL_VALUE_TO_LABEL
        self.num_classes = len(self.pixel_to_label)

        mean = [0.485, 0.456, 0.406]
        std = [0.229, 0.224, 0.225]

        aug_transforms = [
            transforms.Resize((config.image_size, config.image_size)),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.RandomHorizontalFlip(),
        ]
        base_transforms = [transforms.Resize((config.image_size, config.image_size))]

        self.image_transforms = transforms.Compose(
            (aug_transforms if augment and split == "train" else base_transforms)
            + [
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )

        self.mask_transforms = transforms.Compose(
            [
                transforms.Resize(
                    (config.image_size, config.image_size), interpolation=Image.NEAREST
                ),
            ]
        )

        self.phase_to_idx: Dict[str, int] = {
            phase: idx for idx, (phase, _) in enumerate(PHASE_DEFINITIONS)
        }

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        sample = self.samples[index]
        image = Image.open(sample.image_path).convert("RGB")
        mask = Image.open(sample.mask_path).convert("L")

        image = self.image_transforms(image)
        mask = torch.from_numpy(
            self._encode_mask(np.array(self.mask_transforms(mask), dtype=np.uint8))
        )

        phase_idx = self.phase_to_idx[sample.phase]
        return image, mask.long(), torch.tensor(phase_idx)

    # --- internal helpers -------------------------------------------------

    def _prepare_split_file(self) -> None:
        if self.split_file.exists():
            return

        videos = sorted([d.name for d in self.root.iterdir() if d.is_dir()])
        random.Random(self.config.random_seed).shuffle(videos)

        n_total = len(videos)
        n_test = max(1, int(n_total * self.config.test_split))
        n_val = max(1, int(n_total * self.config.val_split))
        n_train = max(1, n_total - n_val - n_test)

        splits = {
            "train": videos[:n_train],
            "val": videos[n_train : n_train + n_val],
            "test": videos[n_train + n_val : n_train + n_val + n_test],
        }

        self.split_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.split_file, "w", encoding="utf-8") as fp:
            json.dump(splits, fp, indent=2)

    def _load_splits(self) -> Dict[str, Sequence[str]]:
        with open(self.split_file, "r", encoding="utf-8") as fp:
            return json.load(fp)

    def _gather_samples(self) -> List[Sample]:
        splits = self._load_splits()
        allowed_videos = set(splits.get(self.split, []))
        samples: List[Sample] = []

        for video_dir in sorted(self.root.iterdir()):
            if not video_dir.is_dir() or video_dir.name not in allowed_videos:
                continue

            frames: List[Tuple[Path, Path]] = []
            for sequence_dir in sorted(video_dir.iterdir()):
                for image_path in sorted(sequence_dir.glob("*_endo.png")):
                    mask_path = image_path.with_name(
                        image_path.name.replace("_endo.png", "_endo_mask.png")
                    )
                    if not mask_path.exists():
                        continue
                    frames.append((image_path, mask_path))

            total = len(frames)
            if total == 0:
                continue

            for idx, (image_path, mask_path) in enumerate(frames):
                progress = idx / max(1, total - 1)
                phase = _phase_from_progress(progress)
                samples.append(
                    Sample(
                        image_path=image_path,
                        mask_path=mask_path,
                        video_id=video_dir.name,
                        frame_index=idx,
                        phase=phase,
                    )
                )
        return samples

    def _encode_mask(self, mask: np.ndarray) -> np.ndarray:
        encoded = np.zeros_like(mask, dtype=np.int64)
        for class_idx, (pixel_value, _) in enumerate(self.pixel_to_label.items()):
            encoded[mask == pixel_value] = class_idx
        return encoded
