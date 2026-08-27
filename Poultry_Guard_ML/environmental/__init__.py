"""Environmental disease classification module."""
from .inference.environmental_predictor import (
    EnvironmentalModelUnavailable,
    get_model_path,
    load_environmental_model,
    predict_environment,
    predict_environmental_disease,
    predict_environmental_risk,
)
from .preprocessing.preprocessor import EnvironmentalInputError

__all__ = [
    "predict_environment",
    "predict_environmental_disease",
    "predict_environmental_risk",
    "load_environmental_model",
    "get_model_path",
    "EnvironmentalModelUnavailable",
    "EnvironmentalInputError",
]
