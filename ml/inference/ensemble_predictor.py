"""Compatibility layer redirecting to Poultry_Guard_ML."""
from Poultry_Guard_ML.ensemble.ensemble_predictor import (
    predict_biosecurity,
    predict_ensemble,
    predict_poultry_status,
)
from Poultry_Guard_ML.ensemble.fusion import late_fusion

__all__ = [
    "predict_biosecurity",
    "predict_ensemble",
    "predict_poultry_status",
    "late_fusion",
]
