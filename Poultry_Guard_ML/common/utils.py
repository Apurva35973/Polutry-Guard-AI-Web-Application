from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("Poultry_Guard_ML")


def get_device(prefer_gpu: bool = True) -> Any:
    """Safely return torch device, falling back gracefully to CPU."""
    try:
        import torch

        if prefer_gpu and torch.cuda.is_available():
            return torch.device("cuda")
        if prefer_gpu and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")
    except ImportError:
        return "cpu"


def normalize_humidity(value: float | int | None) -> float:
    """Convert decimal humidity (0.0 - 1.5) to percentage (0 - 100)."""
    if value is None:
        return 0.0
    val = float(value)
    if 0.0 <= val <= 1.5:
        return val * 100.0
    return val


def round_floats(obj: Any, precision: int = 4) -> Any:
    """Recursively round floating point values in dicts/lists for clean JSON serializability."""
    if isinstance(obj, float):
        return round(obj, precision)
    if isinstance(obj, dict):
        return {k: round_floats(v, precision) for k, v in obj.items()}
    if isinstance(obj, list):
        return [round_floats(v, precision) for v in obj]
    return obj
