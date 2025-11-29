from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class DiceLoss(nn.Module):
    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits, targets):
        num_classes = logits.shape[1]
        probs = torch.softmax(logits, dim=1)
        targets_one_hot = F.one_hot(targets, num_classes=num_classes).permute(0, 3, 1, 2)
        probs = probs.contiguous()
        targets_one_hot = targets_one_hot.float()

        dims = (0, 2, 3)
        intersection = torch.sum(probs * targets_one_hot, dims)
        cardinality = torch.sum(probs + targets_one_hot, dims)
        dice_score = (2.0 * intersection + self.smooth) / (cardinality + self.smooth)
        return 1 - dice_score.mean()


class CombinedSegmentationLoss(nn.Module):
    def __init__(self, dice_weight: float = 0.7, ce_weight: float = 0.3):
        super().__init__()
        self.dice = DiceLoss()
        self.ce = nn.CrossEntropyLoss()
        self.dice_weight = dice_weight
        self.ce_weight = ce_weight

    def forward(self, logits, targets):
        return self.dice_weight * self.dice(logits, targets) + self.ce_weight * self.ce(
            logits, targets
        )
