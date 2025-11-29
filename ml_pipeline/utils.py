from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import torch


@dataclass
class AverageMeter:
    name: str
    value: float = 0.0
    sum: float = 0.0
    count: int = 0

    def update(self, val: float, n: int = 1) -> None:
        self.value = val
        self.sum += val * n
        self.count += n

    @property
    def avg(self) -> float:
        return self.sum / max(1, self.count)


def save_checkpoint(path: Path, state: Dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(state, path)


def poly_lr(base_lr: float, epoch: int, max_epochs: int, power: float = 0.9) -> float:
    return base_lr * (1 - epoch / max_epochs) ** power
