"""Poultry_Guard_ML: Unified Production ML Package for PoultryGuard AI."""

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


def __getattr__(name: str):
    if name == "predict_image":
        from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image
        return predict_image
    if name in ("predict_environment", "predict_environmental_disease", "predict_environmental_risk"):
        import Poultry_Guard_ML.environmental.inference.environmental_predictor as env_pred
        return getattr(env_pred, name)
    if name in ("predict_ensemble", "predict_biosecurity", "predict_poultry_status"):
        import Poultry_Guard_ML.ensemble.ensemble_predictor as ens_pred
        return getattr(ens_pred, name)
    if name == "late_fusion":
        from Poultry_Guard_ML.ensemble.fusion import late_fusion
        return late_fusion
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

