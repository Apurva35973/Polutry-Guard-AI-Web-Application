"""Poultry_Guard_ML: Unified Production ML Package for PoultryGuard AI."""

from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image
from Poultry_Guard_ML.environmental.inference.environmental_predictor import (
    predict_environment,
    predict_environmental_disease,
    predict_environmental_risk,
)
from Poultry_Guard_ML.ensemble.ensemble_predictor import (
    predict_biosecurity,
    predict_ensemble,
    predict_poultry_status,
)
from Poultry_Guard_ML.ensemble.fusion import late_fusion

__version__ = "1.0.0"

__all__ = [
    "predict_image",
    "predict_environment",
    "predict_environmental_disease",
    "predict_environmental_risk",
    "predict_ensemble",
    "predict_biosecurity",
    "predict_poultry_status",
    "late_fusion",
]
