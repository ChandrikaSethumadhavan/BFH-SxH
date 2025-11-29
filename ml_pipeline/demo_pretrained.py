"""
Quick demo to test pretrained models for surgical video segmentation.
Run: pip install segmentation-models-pytorch
Then: python -m ml_pipeline.demo_pretrained
"""
import torch
import segmentation_models_pytorch as smp

print("=" * 60)
print("PRETRAINED MODEL DEMO FOR SURGICAL VIDEO ANALYSIS")
print("=" * 60)

# === SEGMENTATION MODEL ===
print("\n1. Creating U-Net with pretrained ResNet34 encoder...")

seg_model = smp.Unet(
    encoder_name="resnet34",
    encoder_weights="imagenet",  # Download pretrained weights
    in_channels=3,
    classes=9,  # CholecSeg8k has 9 classes
    activation=None
)

seg_params = sum(p.numel() for p in seg_model.parameters())
print(f"   ✓ Segmentation model created successfully!")
print(f"   ✓ Parameters: {seg_params:,}")

# Test forward pass
dummy_input = torch.randn(1, 3, 256, 256)
seg_output = seg_model(dummy_input)
print(f"   ✓ Output shape: {seg_output.shape}")
print(f"   ✓ Expected: [1, 9, 256, 256] for 9-class segmentation")

# === PHASE CLASSIFICATION ===
print("\n2. Creating phase classifier with pretrained ResNet18...")

from torchvision import models
import torch.nn as nn

phase_model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
phase_model.fc = nn.Linear(512, 6)  # Replace final layer for 6 phases

phase_params = sum(p.numel() for p in phase_model.parameters())
print(f"   ✓ Phase model created successfully!")
print(f"   ✓ Parameters: {phase_params:,}")

phase_output = phase_model(dummy_input)
print(f"   ✓ Output shape: {phase_output.shape}")
print(f"   ✓ Expected: [1, 6] for 6 surgical phases")

# === LIGHTWEIGHT ALTERNATIVE ===
print("\n3. Creating lightweight MobileNetV2 model (for CPU)...")

mobile_seg = smp.Unet(
    encoder_name="mobilenet_v2",
    encoder_weights="imagenet",
    in_channels=3,
    classes=9,
    activation=None
)

mobile_params = sum(p.numel() for p in mobile_seg.parameters())
print(f"   ✓ MobileNet model created successfully!")
print(f"   ✓ Parameters: {mobile_params:,} (much lighter!)")

mobile_output = mobile_seg(dummy_input)
print(f"   ✓ Output shape: {mobile_output.shape}")

# === SUMMARY ===
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"✓ Pretrained models are working correctly!")
print(f"\nModel Sizes:")
print(f"  - ResNet34 U-Net:  {seg_params:,} parameters")
print(f"  - ResNet18 Phase:  {phase_params:,} parameters")
print(f"  - MobileNetV2:     {mobile_params:,} parameters (3x smaller!)")
print(f"\nRecommendation for CPU training:")
print(f"  Use MobileNetV2 for fastest training on CPU")
print(f"  Fine-tune for just 5-10 epochs on subset of data")
print(f"\nYou can now modify ml_pipeline/models/segmentation.py")
print(f"to use smp.Unet() instead of custom UNetSegmenter!")
print("=" * 60)
