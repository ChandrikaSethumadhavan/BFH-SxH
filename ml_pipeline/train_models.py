from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from .config import TrainingConfig
from .dataset import CholecSeg8kDataset
from .losses import CombinedSegmentationLoss
from .models import PhaseClassifier, UNetSegmenter
from .ranking import PHASE_WEIGHTS
from .utils import AverageMeter, poly_lr, save_checkpoint


def train_segmentation(config: TrainingConfig, device: torch.device) -> Dict[str, float]:
    train_ds = CholecSeg8kDataset(config, split="train", augment=True)
    val_ds = CholecSeg8kDataset(config, split="val", augment=False)

    train_loader = DataLoader(
        train_ds,
        batch_size=config.train_batch_size,
        shuffle=True,
        num_workers=config.num_workers,
        pin_memory=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=config.eval_batch_size,
        shuffle=False,
        num_workers=config.num_workers,
        pin_memory=True,
    )

    model = UNetSegmenter(num_classes=len(train_ds.pixel_to_label)).to(device)
    criterion = CombinedSegmentationLoss(
        dice_weight=config.dice_weight, ce_weight=config.ce_weight
    )
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=config.lr_segmentation, weight_decay=config.weight_decay
    )

    best_val = float("inf")

    for epoch in range(1, config.max_epochs_segmentation + 1):
        model.train()
        train_loss = AverageMeter("train_loss")

        for images, masks, _ in tqdm(train_loader, desc=f"[Seg] Epoch {epoch}"):
            images = images.to(device)
            masks = masks.to(device)

            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, masks)
            loss.backward()
            optimizer.step()

            train_loss.update(loss.item(), images.size(0))

        if epoch % config.validate_every == 0:
            val_loss = evaluate_segmentation(model, val_loader, criterion, device)
            if val_loss < best_val:
                best_val = val_loss
                save_checkpoint(
                    config.segmentation_checkpoint,
                    {"model_state": model.state_dict(), "epoch": epoch},
                )

        lr = poly_lr(config.lr_segmentation, epoch, config.max_epochs_segmentation)
        for param_group in optimizer.param_groups:
            param_group["lr"] = lr

    return {"val_loss": best_val}


def evaluate_segmentation(model, dataloader, criterion, device):
    model.eval()
    losses = AverageMeter("val_loss")
    with torch.no_grad():
        for images, masks, _ in dataloader:
            images = images.to(device)
            masks = masks.to(device)
            logits = model(images)
            loss = criterion(logits, masks)
            losses.update(loss.item(), images.size(0))
    return losses.avg


def train_phase_classifier(config: TrainingConfig, device: torch.device) -> Dict[str, float]:
    train_ds = CholecSeg8kDataset(config, split="train", augment=True)
    val_ds = CholecSeg8kDataset(config, split="val", augment=False)

    train_loader = DataLoader(
        train_ds,
        batch_size=config.train_batch_size,
        shuffle=True,
        num_workers=config.num_workers,
        pin_memory=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=config.eval_batch_size,
        shuffle=False,
        num_workers=config.num_workers,
        pin_memory=True,
    )

    model = PhaseClassifier(num_classes=len(train_ds.phase_to_idx)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=config.lr_phase, weight_decay=config.weight_decay
    )

    best_acc = 0.0
    for epoch in range(1, config.max_epochs_phase + 1):
        model.train()
        train_loss = AverageMeter("phase_loss")
        train_acc = AverageMeter("phase_acc")

        for images, _, phases in tqdm(train_loader, desc=f"[Phase] Epoch {epoch}"):
            images = images.to(device)
            phases = phases.to(device)

            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, phases)
            loss.backward()
            optimizer.step()

            preds = torch.argmax(logits, dim=1)
            acc = (preds == phases).float().mean().item()

            train_loss.update(loss.item(), images.size(0))
            train_acc.update(acc, images.size(0))

        val_acc = evaluate_phase(model, val_loader, device)
        if val_acc > best_acc:
            best_acc = val_acc
            save_checkpoint(
                config.phase_checkpoint,
                {"model_state": model.state_dict(), "epoch": epoch},
            )

    return {"val_acc": best_acc}


def evaluate_phase(model, dataloader, device):
    model.eval()
    acc_meter = AverageMeter("acc")
    with torch.no_grad():
        for images, _, phases in dataloader:
            images = images.to(device)
            phases = phases.to(device)
            logits = model(images)
            preds = torch.argmax(logits, dim=1)
            acc = (preds == phases).float().mean().item()
            acc_meter.update(acc, images.size(0))
    return acc_meter.avg


def main():
    parser = argparse.ArgumentParser(
        description="Train segmentation and phase classification models on CholecSeg8k."
    )
    parser.add_argument(
        "--dataset-root",
        type=Path,
        default=Path("cholecseg8k_dataset"),
        help="Path to the extracted dataset",
    )
    parser.add_argument(
        "--artifacts-dir",
        type=Path,
        default=Path("ml_pipeline/artifacts"),
        help="Directory to store checkpoints and logs",
    )
    parser.add_argument("--image-size", type=int, default=256)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--epochs-seg", type=int, default=25)
    parser.add_argument("--epochs-phase", type=int, default=20)
    parser.add_argument("--num-workers", type=int, default=0)

    args = parser.parse_args()

    config = TrainingConfig(
        dataset_root=args.dataset_root,
        artifacts_dir=args.artifacts_dir,
        image_size=args.image_size,
        train_batch_size=args.batch_size,
        num_workers=args.num_workers,
        max_epochs_segmentation=args.epochs_seg,
        max_epochs_phase=args.epochs_phase,
    )
    config.ensure_artifacts_dir()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    seg_metrics = train_segmentation(config, device)
    print(f"Best segmentation val loss: {seg_metrics['val_loss']:.4f}")

    phase_metrics = train_phase_classifier(config, device)
    print(f"Best phase val accuracy: {phase_metrics['val_acc']:.3f}")


if __name__ == "__main__":
    main()
