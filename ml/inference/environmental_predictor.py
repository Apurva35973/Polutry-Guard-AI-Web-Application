"""Compatibility layer redirecting to Poultry_Guard_ML."""
from Poultry_Guard_ML.environmental.inference.environmental_predictor import (
    EnvironmentalInputError,
    EnvironmentalModelUnavailable,
    load_environmental_artifact,
    predict_environment,
    predict_environmental_risk,
)

__all__ = [
    "EnvironmentalInputError",
    "EnvironmentalModelUnavailable",
    "load_environmental_artifact",
    "predict_environment",
    "predict_environmental_risk",
]
