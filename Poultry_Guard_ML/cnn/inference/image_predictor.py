"""
Inference API for 3-Class Poultry Disease Classification.

Provides predict_image() returning predicted_class, confidence,
and exact probability distribution across all 3 classes:
- Fowlpox
- Infectious Coryza
- Healthy
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, BinaryIO, Dict, Tuple

import torch
from PIL import Image, UnidentifiedImageError

from Poultry_Guard_ML.cnn.config import (
    CANONICAL_CNN_CLASSES,
    CLASS_MAPPING_PATH,
    IMAGE_SIZE,
    MODEL_PATH,
    RAW_INDEX_TO_CLASS,
)
from Poultry_Guard_ML.cnn.model.resnet18 import get_resnet18_model
from Poultry_Guard_ML.cnn.preprocessing.transforms import get_inference_transform
from Poultry_Guard_ML.common.utils import get_device, round_floats


class ImageModelUnavailable(FileNotFoundError):
    """Raised when the 3-class ResNet18 model checkpoint cannot be located."""


def get_model_path() -> Path:
    """Return verified path to ResNet18 model checkpoint."""
    if MODEL_PATH.exists():
        return MODEL_PATH
    raise ImageModelUnavailable(
        f"ResNet18 3-class checkpoint not found at {MODEL_PATH}."
    )


def load_class_mapping() -> Tuple[Dict[str, int], Dict[int, str]]:
    """Load canonical class mapping or fallback to defaults."""
    if CLASS_MAPPING_PATH.exists():
        try:
            with open(CLASS_MAPPING_PATH, "r", encoding="utf-8") as f:
                mapping = json.load(f)
            idx_to_class = {int(v): str(k) for k, v in mapping.items()}
            return mapping, idx_to_class
        except Exception:
            pass
    return {name: idx for idx, name in RAW_INDEX_TO_CLASS.items()}, dict(RAW_INDEX_TO_CLASS)


@lru_cache(maxsize=1)
def load_image_model() -> Tuple[torch.nn.Module, Dict[int, str], torch.device]:
    """Load and cache the trained 3-class ResNet18 model."""
    checkpoint_path = get_model_path()
    _, idx_to_class = load_class_mapping()
    num_classes = len(idx_to_class)

    device = get_device(prefer_gpu=True)
    model = get_resnet18_model(num_classes=num_classes, pretrained=False)

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

    if isinstance(checkpoint, dict):
        state_dict = checkpoint.get("state_dict", checkpoint.get("model_state_dict", checkpoint))
    else:
        state_dict = checkpoint

    if not isinstance(state_dict, dict):
        raise ValueError("Invalid ResNet18 checkpoint: expected state_dict.")

    model.load_state_dict(state_dict)
    model = model.to(device)
    model.eval()

    return model, idx_to_class, device


def _load_and_validate_image(image_input: str | Path | BinaryIO | bytes | Image.Image) -> Image.Image:
    """Load and validate any image input, converting strictly to RGB."""
    if isinstance(image_input, Image.Image):
        image = image_input.convert("RGB")
        image.load()
        return image

    if hasattr(image_input, "seek"):
        try:
            image_input.seek(0)
        except Exception:
            pass

    try:
        if isinstance(image_input, bytes):
            import io
            image = Image.open(io.BytesIO(image_input))
        else:
            image = Image.open(image_input)

        image = image.convert("RGB")
        image.load()
        return image
    except (UnidentifiedImageError, OSError, ValueError, TypeError) as exc:
        raise ValueError(f"Invalid image input. Please provide a readable image file: {str(exc)}") from exc


def predict_image(
    image_input: str | Path | BinaryIO | bytes | Image.Image,
    top_k: int | None = None,
) -> Dict[str, Any]:
    """
    Run disease classification on a single poultry image.

    Parameters:
        image_input: Filepath, bytes, file stream, or PIL Image.
        top_k: Optional limit on returned top predictions.

    Returns:
        Structured prediction dict containing:
        - predicted_class: Primary disease name ('Fowlpox', 'Infectious Coryza', 'Healthy')
        - predicted_disease: Alias for compatibility ('Fowlpox', 'Infectious Coryza', 'Healthy')
        - confidence: Probability of the top class (0.0 - 1.0)
        - probabilities: Map of class names to probabilities summing to 1.0
        - model: 'ResNet18'
    """
    image = _load_and_validate_image(image_input)
    model, idx_to_class, device = load_image_model()
    transform = get_inference_transform(image_size=IMAGE_SIZE)

    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()

    prob_map = {idx_to_class[i]: float(probabilities[i]) for i in range(len(probabilities))}

    # Ensure canonical class order exists in output
    all_probs = {cls_name: float(prob_map.get(cls_name, 0.0)) for cls_name in CANONICAL_CNN_CLASSES}

    top_class = max(all_probs, key=all_probs.get)
    confidence = float(all_probs[top_class])

    result = {
        "model": "ResNet18",
        "predicted_class": top_class,
        "predicted_disease": top_class,
        "confidence": confidence,
        "probabilities": all_probs,
    }

    return round_floats(result, precision=6)
