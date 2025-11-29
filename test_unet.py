#!/usr/bin/env python3
"""Test the UNet segmentation model on a video frame."""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from pathlib import Path
import sys

ROOT = Path.cwd()
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from ml_pipeline import SurgicalSceneAnalyzer

# Initialize analyzer (should use UNet now)
print("Loading SurgicalSceneAnalyzer...")
analyzer = SurgicalSceneAnalyzer()
print(f"Backend: {analyzer.segmentation_backend}")
print(f"Number of classes: {len(analyzer.pixel_to_label)}")
print(f"Class mapping: {analyzer.pixel_to_label}\n")

# Load a frame from video
video_path = r'C:\Users\muthu\Documents\hackathon\video01_00160_surgical.mp4'
vidcap = cv2.VideoCapture(video_path)
success, image = vidcap.read()

if success:
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Run inference
    print("Running inference on video frame...")
    analysis = analyzer.analyze_frame(image, quality_score=90.0)
    mask = analysis["segmentation_mask"]

    print("\n=== ANALYSIS RESULTS ===")
    print(f"Phase: {analysis['phase']}")
    print(f"Detected objects: {analysis['detected_objects']}")
    print(f"Importance score: {analysis['importance_score']}")

    # Check unique mask values
    unique_vals = np.unique(mask)
    print(f"\nUnique mask values: {unique_vals}")
    print(f"Mask shape: {mask.shape}")

    print("\nClass distribution:")
    for val in unique_vals:
        count = (mask == val).sum()
        percentage = count / mask.size * 100
        label = analyzer.label_list[val] if val < len(analyzer.label_list) else f"unknown_{val}"
        print(f"  Class {val} ({label}): {count} pixels ({percentage:.2f}%)")

    # Visualize
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))

    axes[0].imshow(image_rgb)
    axes[0].set_title("Original Surgical Frame")
    axes[0].axis('off')

    colors = ['black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'orange', 'purple']
    cmap = mcolors.ListedColormap(colors[:9])

    im = axes[1].imshow(mask, cmap=cmap, vmin=0, vmax=8)
    axes[1].set_title(f"UNet Segmentation")
    axes[1].axis('off')

    cbar = plt.colorbar(im, ax=axes[1], ticks=range(9))
    cbar.set_label('Classes')
    cbar.ax.set_yticklabels(analyzer.label_list)

    plt.tight_layout()
    plt.savefig('segmentation_unet.png', dpi=150, bbox_inches='tight')
    print(f"\nVisualization saved to segmentation_unet.png")
    plt.show()

vidcap.release()
print("\nTest complete!")
