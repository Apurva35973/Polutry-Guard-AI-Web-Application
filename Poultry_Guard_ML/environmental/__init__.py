"""Environmental disease classification module."""

__all__ = [
    "predict_environment",
    "predict_environmental_disease",
    "predict_environmental_risk",
    "load_environmental_model",
    "get_model_path",
    "EnvironmentalModelUnavailable",
    "EnvironmentalInputError",
]


def __getattr__(name: str):
    if name in (
        "predict_environment",
        "predict_environmental_disease",
        "predict_environmental_risk",
        "load_environmental_model",
        "get_model_path",
        "EnvironmentalModelUnavailable",
    ):
        import Poultry_Guard_ML.environmental.inference.environmental_predictor as env_pred
        return getattr(env_pred, name)
    if name == "EnvironmentalInputError":
        from Poultry_Guard_ML.environmental.preprocessing.preprocessor import EnvironmentalInputError
        return EnvironmentalInputError
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

