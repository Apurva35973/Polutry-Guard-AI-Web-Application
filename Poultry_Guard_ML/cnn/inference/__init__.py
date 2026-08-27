"""CNN inference module."""
from .image_predictor import (
    ImageModelUnavailable,
    get_model_path,
    load_class_mapping,
    load_image_model,
    predict_image,
)

__all__ = [
    "ImageModelUnavailable",
    "get_model_path",
    "load_class_mapping",
    "load_image_model",
    "predict_image",
]
