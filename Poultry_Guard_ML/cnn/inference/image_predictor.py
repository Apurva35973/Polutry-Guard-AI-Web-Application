"""
Inference API for 3-Class Poultry Disease Classification.

Provides predict_image() returning predicted_class, confidence,
and exact probability distribution across all 3 classes:
- Fowlpox
- Infectious Coryza
- Healthy
"""

from __future__ import annotations

import gc
import json
import threading
from pathlib import Path
from typing import Any, BinaryIO, Dict, Tuple

from PIL import Image, UnidentifiedImageError

from Poultry_Guard_ML.cnn.config import (
    CANONICAL_CNN_CLASSES,
    CLASS_MAPPING_PATH,
    IMAGE_SIZE,
    MODEL_PATH,
    RAW_INDEX_TO_CLASS,
    RESIZE_SIZE,
)
from Poultry_Guard_ML.common.utils import get_device, round_floats

_MODEL_LOCK = threading.Lock()
_CACHED_MODEL: Any = None
_CACHED_IDX_TO_CLASS: Dict[int, str] | None = None
_CACHED_DEVICE: Any = None
_CACHED_TRANSFORM: Any = None


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


def load_image_model() -> Tuple[Any, Dict[int, str], Any]:
    """Load and cache the trained 3-class ResNet18 model in a thread-safe singleton."""
    global _CACHED_MODEL, _CACHED_IDX_TO_CLASS, _CACHED_DEVICE
    if _CACHED_MODEL is not None and _CACHED_IDX_TO_CLASS is not None and _CACHED_DEVICE is not None:
        return _CACHED_MODEL, _CACHED_IDX_TO_CLASS, _CACHED_DEVICE

    with _MODEL_LOCK:
        if _CACHED_MODEL is not None and _CACHED_IDX_TO_CLASS is not None and _CACHED_DEVICE is not None:
            return _CACHED_MODEL, _CACHED_IDX_TO_CLASS, _CACHED_DEVICE

        import torch
        torch.set_grad_enabled(False)
        # Cap PyTorch threads for 512MB RAM container constraint
        try:
            torch.set_num_threads(1)
        except Exception:
            pass
        try:
            torch.set_num_interop_threads(1)
        except Exception:
            pass

        from Poultry_Guard_ML.cnn.model.resnet18 import get_resnet18_model

        checkpoint_path = get_model_path()
        _, idx_to_class = load_class_mapping()
        num_classes = len(idx_to_class)

        device = torch.device("cpu")
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

        for param in model.parameters():
            param.requires_grad = False

        # Immediately free temporary checkpoint state from RAM
        del checkpoint
        del state_dict
        gc.collect()

        _CACHED_MODEL = model
        _CACHED_IDX_TO_CLASS = idx_to_class
        _CACHED_DEVICE = device

        return _CACHED_MODEL, _CACHED_IDX_TO_CLASS, _CACHED_DEVICE


def _get_cached_transform():
    """Lazily load and cache inference transform."""
    global _CACHED_TRANSFORM
    if _CACHED_TRANSFORM is not None:
        return _CACHED_TRANSFORM

    with _MODEL_LOCK:
        if _CACHED_TRANSFORM is None:
            from Poultry_Guard_ML.cnn.preprocessing.transforms import get_inference_transform
            _CACHED_TRANSFORM = get_inference_transform(image_size=IMAGE_SIZE)
        return _CACHED_TRANSFORM


def _load_and_validate_image(image_input: str | Path | BinaryIO | bytes | Image.Image) -> Image.Image:
    """Load and validate any image input, converting strictly to RGB and resizing to prevent OOM."""
    if isinstance(image_input, Image.Image):
        image = image_input.convert("RGB")
        image.thumbnail((RESIZE_SIZE, RESIZE_SIZE), Image.Resampling.BILINEAR)
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
        image.thumbnail((RESIZE_SIZE, RESIZE_SIZE), Image.Resampling.BILINEAR)
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
    import torch

    image = _load_and_validate_image(image_input)
    model, idx_to_class, device = load_image_model()
    transform = _get_cached_transform()

    tensor = transform(image).unsqueeze(0).to(device)

    inference_ctx = getattr(torch, "inference_mode", torch.no_grad)
    with inference_ctx():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()

    del tensor
    del logits
    del image
    gc.collect()

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

