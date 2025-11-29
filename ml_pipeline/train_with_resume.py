"""
Training script with automatic checkpointing and resume capability.
If training is interrupted, you can resume from the last checkpoint.

Usage:
    # Start training
    python -m ml_pipeline.train_with_resume --epochs-seg 10

    # If interrupted, resume from checkpoint
    python -m ml_pipeline.train_with_resume --resume
"""
import argparse
from pathlib import Path
import torch
import torch.nn as nn
import segmentation_models_pytorch as smp
from torch.utils.data import DataLoader
from torchvision import models
from tqdm import tqdm

from ml_pipeline.config import TrainingConfig
from ml_pipeline.dataset import CholecSeg8kDataset
from ml_pipeline.losses import CombinedSegmentationLoss
from ml_pipeline.utils import AverageMeter


def save_training_state(checkpoint_path, model, optimizer, epoch, best_metric):
    """Save complete training state for resuming."""
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'best_metric': best_metric,
    }, checkpoint_path)
    print(f"  → Checkpoint saved: epoch {epoch}")


def load_training_state(checkpoint_path, model, optimizer):
    """Load training state to resume."""
    if not checkpoint_path.exists():
        return 1, float('inf')  # Start from epoch 1, worst metric

    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    model.load_state_dict(checkpoint['model_state_dict'])
    optimizer.load_state_dict(checkpoint['optimizer_state_dict'])

    start_epoch = checkpoint['epoch'] + 1
    best_metric = checkpoint['best_metric']

    print(f"  ✓ Resumed from epoch {checkpoint['epoch']}")
    print(f"  ✓ Best metric so far: {best_metric:.4f}")

    return start_epoch, best_metric


def train_with_resume(config: TrainingConfig, device: torch.device, resume: bool = False):
    """Train segmentation model with resume capability."""

    # Setup data
    train_ds = CholecSeg8kDataset(config, split="train", augment=True)
    val_ds = CholecSeg8kDataset(config, split="val", augment=False)

    train_loader = DataLoader(
        train_ds, batch_size=config.train_batch_size,
        shuffle=True, num_workers=config.num_workers, pin_memory=True
    )
    val_loader = DataLoader(
        val_ds, batch_size=config.eval_batch_size,
        shuffle=False, num_workers=config.num_workers, pin_memory=True
    )

    # Create model
    model = smp.Unet(
        encoder_name="resnet34",
        encoder_weights="imagenet",
        in_channels=3,
        classes=len(train_ds.pixel_to_label),
        activation=None
    ).to(device)

    criterion = CombinedSegmentationLoss(
        dice_weight=config.dice_weight, ce_weight=config.ce_weight
    )
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.lr_segmentation * 0.1,
        weight_decay=config.weight_decay
    )

    # Resume or start fresh
    checkpoint_path = config.artifacts_dir / "training_checkpoint.pt"

    if resume:
        start_epoch, best_val = load_training_state(checkpoint_path, model, optimizer)
    else:
        start_epoch = 1
        best_val = float('inf')
        print("Starting training from scratch...")

    # Training loop
    for epoch in range(start_epoch, config.max_epochs_segmentation + 1):
        model.train()
        train_loss = AverageMeter("train_loss")

        pbar = tqdm(train_loader, desc=f"Epoch {epoch}/{config.max_epochs_segmentation}")
        for images, masks, _ in pbar:
            images = images.to(device)
            masks = masks.to(device)

            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, masks)
            loss.backward()
            optimizer.step()

            train_loss.update(loss.item(), images.size(0))
            pbar.set_postfix({'loss': f'{train_loss.avg:.4f}'})

        # Validate
        model.eval()
        val_loss = AverageMeter("val_loss")
        with torch.no_grad():
            for images, masks, _ in val_loader:
                images = images.to(device)
                masks = masks.to(device)
                logits = model(images)
                loss = criterion(logits, masks)
                val_loss.update(loss.item(), images.size(0))

        print(f"Epoch {epoch}: Train={train_loss.avg:.4f}, Val={val_loss.avg:.4f}")

        # Save checkpoint EVERY epoch (so you can always resume)
        save_training_state(checkpoint_path, model, optimizer, epoch, best_val)

        # Save best model separately
        if val_loss.avg < best_val:
            best_val = val_loss.avg
            torch.save(
                {'model_state': model.state_dict(), 'epoch': epoch},
                config.segmentation_checkpoint
            )
            print(f"  → New best model saved! Val loss: {best_val:.4f}")

    print(f"\nTraining complete! Best val loss: {best_val:.4f}")
    print(f"Best model saved to: {config.segmentation_checkpoint}")

    # Clean up checkpoint after successful completion
    if checkpoint_path.exists():
        checkpoint_path.unlink()
        print("Removed temporary checkpoint (training completed)")


def main():
    parser = argparse.ArgumentParser(description="Train with resume capability")
    parser.add_argument("--dataset-root", type=Path, default=Path("cholecseg8k_dataset"))
    parser.add_argument("--artifacts-dir", type=Path, default=Path("ml_pipeline/artifacts"))
    parser.add_argument("--image-size", type=int, default=256)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--epochs-seg", type=int, default=10)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")

    args = parser.parse_args()

    config = TrainingConfig(
        dataset_root=args.dataset_root,
        artifacts_dir=args.artifacts_dir,
        image_size=args.image_size,
        train_batch_size=args.batch_size,
        num_workers=args.num_workers,
        max_epochs_segmentation=args.epochs_seg,
    )
    config.ensure_artifacts_dir()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print("=" * 60)
    print("TRAINING WITH AUTOMATIC CHECKPOINTING")
    print("=" * 60)
    print(f"Device: {device}")
    print(f"Resume mode: {args.resume}")
    print(f"Checkpoint every epoch to: {config.artifacts_dir}/training_checkpoint.pt")
    print("=" * 60 + "\n")

    train_with_resume(config, device, resume=args.resume)


if __name__ == "__main__":
    main()
