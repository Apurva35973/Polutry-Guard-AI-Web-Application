"""Compatibility layer redirecting to Poultry_Guard_ML."""
from Poultry_Guard_ML.cnn.inference.image_predictor import (
    ImageModelUnavailable,
    load_image_model,
    predict_image,
)

__all__ = ["ImageModelUnavailable", "load_image_model", "predict_image"]
