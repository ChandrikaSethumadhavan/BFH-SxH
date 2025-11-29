from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Pixel values from the CholecSeg8k mask files mapped to semantic labels.
# The dataset ships grayscale masks where each integer encodes a class.
PIXEL_VALUE_TO_LABEL: Dict[int, str] = {
    0: "background",
    11: "liver",
    12: "gallbladder",
    21: "cystic_duct",
    22: "cystic_artery",
    23: "common_bile_duct",
    31: "grasper",
    32: "hook",
    50: "scissors",
}

# Relative phase buckets for a laparoscopic cholecystectomy.
# The tuple expresses (phase_name, percentage_of_case).
PHASE_DEFINITIONS: List[Tuple[str, float]] = [
    ("pre_op", 0.10),
    ("port_setup", 0.10),
    ("exposure", 0.20),
    ("critical_dissection", 0.35),
    ("clip_and_divide", 0.15),
    ("closure", 0.10),
]


@dataclass
class TrainingConfig:
    dataset_root: Path = Path("cholecseg8k_dataset")
    artifacts_dir: Path = Path("ml_pipeline/artifacts")

    # Data pipeline
    image_size: int = 512
    num_workers: int = 0
    train_batch_size: int = 4
    eval_batch_size: int = 4
    val_split: float = 0.1
    test_split: float = 0.1
    random_seed: int = 42

    # Optimisation
    max_epochs_segmentation: int = 25
    max_epochs_phase: int = 20
    lr_segmentation: float = 3e-4
    lr_phase: float = 1e-4
    weight_decay: float = 1e-4

    # Loss balancing
    dice_weight: float = 0.7
    ce_weight: float = 0.3

    # Logging / evaluation cadence
    validate_every: int = 1
    checkpoint_every: int = 5

    endovit_segmentation_checkpoint: Optional[Path] = None
    endovit_phase_checkpoint: Optional[Path] = None

    def __post_init__(self):
        if self.endovit_segmentation_checkpoint is None:
            candidate = self.artifacts_dir / "endovit_seg.pth"
            if candidate.exists():
                self.endovit_segmentation_checkpoint = candidate
        if self.endovit_phase_checkpoint is None:
            candidate = self.artifacts_dir / "endovit_phase.pth"
            if candidate.exists():
                self.endovit_phase_checkpoint = candidate

    def ensure_artifacts_dir(self) -> None:
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    @property
    def segmentation_checkpoint(self) -> Path:
        return self.artifacts_dir / "segmentation_unet.pt"

    @property
    def phase_checkpoint(self) -> Path:
        return self.artifacts_dir / "phase_classifier.pt"
