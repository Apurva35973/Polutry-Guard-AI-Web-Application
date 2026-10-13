"""Ensemble late-fusion disease prediction module."""

__all__ = [
    "predict_ensemble",
    "predict_biosecurity",
    "predict_poultry_status",
    "late_fusion",
]


def __getattr__(name: str):
    if name in ("predict_ensemble", "predict_biosecurity", "predict_poultry_status"):
        import Poultry_Guard_ML.ensemble.ensemble_predictor as ens_pred
        return getattr(ens_pred, name)
    if name == "late_fusion":
        from Poultry_Guard_ML.ensemble.fusion import late_fusion
        return late_fusion
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

