from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import torch
import torch.nn as nn
import torch.serialization as serialization

try:
    from ml_pipeline.external.endovit_dpt.models import DPTSegmentationModel

    ENDOVIT_IMPORT_ERROR: Optional[Exception] = None
except Exception as exc:  # pragma: no cover - optional dependency
    DPTSegmentationModel = None  # type: ignore
    ENDOVIT_IMPORT_ERROR = exc

# The EndoViT checkpoints stored argparse Namespaces in their state dicts.
serialization.add_safe_globals([argparse.Namespace])


@dataclass
class EndoViTHyperParams:
    """Hyper-parameters required to instantiate the MAE backbone inside DPT."""

    mae_model: str = "vit_base_patch16"
    nb_classes: int = 9  # matches CholecSeg8k labels
    drop_path: float = 0.1
    pool_type: str = "cls_token"
    mae_ckpt: Optional[Path] = None
    freeze_weights: int = -1
    reinit_n_layers: int = -1
    return_mae_optimizer_groups: bool = True
    mae_weight_decay: float = 0.0
    mae_layer_decay: float = 0.65

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mae_model": self.mae_model,
            "nb_classes": self.nb_classes,
            "drop_path": self.drop_path,
            "pool_type": self.pool_type,
            "mae_ckpt": str(self.mae_ckpt) if self.mae_ckpt else "",
            "freeze_weights": self.freeze_weights,
            "reinit_n_layers": self.reinit_n_layers,
            "return_mae_optimizer_groups": self.return_mae_optimizer_groups,
            "mae_weight_decay": self.mae_weight_decay,
            "mae_layer_decay": self.mae_layer_decay,
        }


class EndoVITSemanticSegmenter(nn.Module):
    """
    Thin wrapper around the DPTSegmentationModel provided by EndoViT.
    Loads the MAE backbone and consumes the published checkpoint.
    """

    def __init__(
        self,
        num_classes: int,
        checkpoint_path: Path,
        mae_hparams: Optional[EndoViTHyperParams] = None,
        device: Optional[torch.device] = None,
    ) -> None:
        if DPTSegmentationModel is None:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "EndoViT dependencies are unavailable. "
                f"Original import error: {ENDOVIT_IMPORT_ERROR}"
            )

        super().__init__()
        self.device = device or torch.device("cpu")
        self.checkpoint_path = checkpoint_path
        self.hparams = mae_hparams or EndoViTHyperParams()
        if self.hparams.mae_ckpt is None:
            self.hparams.mae_ckpt = self.checkpoint_path

        self.network = DPTSegmentationModel(
            num_classes,
            path=None,
            backbone="mae_vitb16_224",
            mae_hyperparams=self.hparams.to_dict(),
            readout="project",
            features=256,
            use_bn=True,
        )

        self._load_checkpoint()
        self.to(self.device)

    def _load_checkpoint(self) -> None:
        checkpoint = torch.load(
            self.checkpoint_path,
            map_location="cpu",
            weights_only=False,
        )
        state_dict = checkpoint.get("model", checkpoint)
        missing, unexpected = self.network.load_state_dict(state_dict, strict=False)

        if missing:
            print(f"[EndoViT] Missing keys while loading: {missing}")
        if unexpected:
            print(f"[EndoViT] Unexpected keys while loading: {unexpected}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # type: ignore[override]
        return self.network(x)


def is_endovit_supported() -> bool:
    return DPTSegmentationModel is not None


def endovit_support_error() -> Optional[Exception]:
    return ENDOVIT_IMPORT_ERROR
