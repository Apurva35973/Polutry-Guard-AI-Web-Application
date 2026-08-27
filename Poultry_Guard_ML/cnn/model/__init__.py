"""CNN model architecture definitions and helpers."""
from .resnet18 import get_resnet18_model, freeze_backbone, unfreeze_backbone

__all__ = ["get_resnet18_model", "freeze_backbone", "unfreeze_backbone"]
