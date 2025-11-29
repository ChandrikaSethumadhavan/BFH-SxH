from __future__ import annotations

from typing import Dict, Iterable, List

from .config import PHASE_DEFINITIONS

# Higher weights mean that a phase is more relevant to reporting.
PHASE_WEIGHTS: Dict[str, float] = {
    "pre_op": 0.2,
    "port_setup": 0.4,
    "exposure": 0.6,
    "critical_dissection": 0.9,
    "clip_and_divide": 1.0,
    "closure": 0.5,
}

# Instrument/structure priority for report-worthy content
OBJECT_PRIORITIES: Dict[str, float] = {
    "cystic_duct": 1.0,
    "cystic_artery": 1.0,
    "common_bile_duct": 0.9,
    "grasper": 0.6,
    "hook": 0.5,
    "scissors": 0.7,
    "gallbladder": 0.8,
    "liver": 0.4,
}


def calculate_phase_score(phase_probabilities: Dict[str, float]) -> float:
    score = 0.0
    for phase, prob in phase_probabilities.items():
        weight = PHASE_WEIGHTS.get(phase, 0.3)
        score += prob * weight
    return min(score, 1.0)


def calculate_object_score(objects: Iterable[str]) -> float:
    total = 0.0
    for obj in objects:
        total += OBJECT_PRIORITIES.get(obj, 0.2)
    return min(total, 3.0) / 3.0


def compute_importance(
    quality_score: float,
    phase_score: float,
    object_score: float,
    ai_bonus: float = 0.1,
) -> float:
    """
    Combine the different signals into a single 0-100 importance metric.
    """
    normalized_quality = quality_score / 100.0
    combined = (
        0.4 * normalized_quality + 0.35 * phase_score + 0.25 * object_score + ai_bonus
    )
    return float(max(0.0, min(1.0, combined)) * 100.0)


def empty_phase_probabilities() -> Dict[str, float]:
    phases = [name for name, _ in PHASE_DEFINITIONS]
    baseline = 1.0 / len(phases)
    return {phase: baseline for phase in phases}
