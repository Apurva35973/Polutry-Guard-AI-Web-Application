"""CNN module for Poultry Disease Classification."""

__all__ = [
    "predict_image",
    "load_image_model",
    "load_class_mapping",
    "get_model_path",
    "ImageModelUnavailable",
]


def __getattr__(name: str):
    if name in __all__:
        import Poultry_Guard_ML.cnn.inference.image_predictor as img_pred
        return getattr(img_pred, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

