from __future__ import annotations

import torch.nn as nn
import torchvision.models as models


class PhaseClassifier(nn.Module):
    """
    ResNet18 backbone with a custom classification head.
    Keeps the model lightweight enough for CPU inference.
    """

    def __init__(self, num_classes: int, use_pretrained: bool = False):
        super().__init__()
        weights = models.ResNet18_Weights.IMAGENET1K_V1 if use_pretrained else None
        backbone = models.resnet18(weights=weights)
        backbone.fc = nn.Identity()

        self.backbone = backbone
        self.classifier = nn.Sequential(
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        feats = self.backbone(x)
        logits = self.classifier(feats)
        return logits
