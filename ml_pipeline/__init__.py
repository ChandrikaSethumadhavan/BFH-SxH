"""
Utilities for training and running the surgical scene understanding pipeline.

The package bundles together:
- a dataset loader for CholecSeg8k
- lightweight PyTorch models for surgical phase classification
- a UNet-style segmentation network for instrument/organ parsing
- helpers for importance ranking and backend inference integration
"""

from .config import TrainingConfig, PHASE_DEFINITIONS, PIXEL_VALUE_TO_LABEL  # noqa: F401
from .inference_service import SurgicalSceneAnalyzer  # noqa: F401

__all__ = [
    "TrainingConfig",
    "PHASE_DEFINITIONS",
    "PIXEL_VALUE_TO_LABEL",
    "SurgicalSceneAnalyzer",
]
