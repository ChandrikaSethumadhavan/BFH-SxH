#!/usr/bin/env python3
"""
CPU-friendly script for:
 1. Semantic segmentation via SegFormer (ADE20K checkpoint).
 2. Phase recognition via a local Trans-SVNet checkpoint (optional).

Usage:
    PYTHONPATH=/home/muthu/hackathon_backup \
      /home/muthu/hackathon_backup/surgical-backend/venv/bin/python \
      scripts/run_segmentation_phase.py \
      --frame cholecseg8k_dataset/video01/video01_00080/frame_100_endo.png \
      --phase-checkpoint models/trans_svnet_checkpoint.pth
"""

from __future__ import annotations

import argparse
import warnings
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from transformers import AutoImageProcessor, SegformerForSemanticSegmentation


def load_segformer(device: torch.device):
    segformer_id = "nvidia/segformer-b0-finetuned-ade-512-512"
    processor = AutoImageProcessor.from_pretrained(segformer_id)
    model = SegformerForSemanticSegmentation.from_pretrained(
        segformer_id,
        ignore_mismatched_sizes=True,
    ).to(device)
    model.eval()
    return processor, model


def run_segmentation(frame_path: Path, processor, model, device: torch.device):
    image = Image.open(frame_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        mask = outputs.logits.argmax(dim=1)[0].cpu().numpy()
    return np.array(image), mask


def load_phase_model(ckpt_path: Path, device: torch.device):
    if not ckpt_path.exists():
        warnings.warn(
            f"Phase checkpoint not found at {ckpt_path}. Phase inference will be skipped."
        )
        return None
    phase_model = torch.load(ckpt_path, map_location=device)
    if hasattr(phase_model, "eval"):
        phase_model.eval()
    return phase_model


def run_phase(frame_path: Path, phase_model, device: torch.device):
    if phase_model is None:
        return None
    phase_transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    image = Image.open(frame_path).convert("RGB")
    tensor = phase_transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = phase_model(tensor)
    if isinstance(logits, tuple):
        logits = logits[0]
    probs = torch.softmax(logits.squeeze(), dim=0)
    phase_idx = int(torch.argmax(probs))
    return phase_idx, probs.cpu().numpy()


def main():
    parser = argparse.ArgumentParser(description="Segmentation + Phase inference (CPU).")
    parser.add_argument("--frame", type=Path, required=True, help="Path to RGB frame.")
    parser.add_argument(
        "--phase-checkpoint",
        type=Path,
        default=Path("models/trans_svnet_checkpoint.pth"),
        help="Path to Trans-SVNet checkpoint (.pth).",
    )
    parser.add_argument(
        "--device",
        default="cpu",
        choices=["cpu"],
        help="Inference device (CPU only to stay lightweight).",
    )

    args = parser.parse_args()
    if not args.frame.exists():
        parser.error(f"Frame not found: {args.frame}")

    device = torch.device("cpu")
    processor, seg_model = load_segformer(device)
    image_np, mask_np = run_segmentation(args.frame, processor, seg_model, device)
    print(f"Segmentation mask shape: {mask_np.shape}")
    print(f"Unique classes (indices) in mask: {np.unique(mask_np)}")

    phase_model = load_phase_model(args.phase_checkpoint, device)
    if phase_model is not None:
        phase_result = run_phase(args.frame, phase_model, device)
        if phase_result:
            idx, probs = phase_result
            print(f"Predicted phase index: {idx}")
            print("First 10 phase probs:", probs[:10])


if __name__ == "__main__":
    main()
