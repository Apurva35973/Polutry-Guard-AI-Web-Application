from __future__ import annotations

import torch
import torch.nn as nn
from torchvision.models import ResNet18_Weights, resnet18


def get_resnet18_model(num_classes: int = 3, pretrained: bool = True) -> nn.Module:
    """
    Instantiate a ResNet18 model with transfer learning and a custom 3-class classification head.
    """
    if pretrained:
        try:
            weights = ResNet18_Weights.IMAGENET1K_V1
            model = resnet18(weights=weights)
        except Exception:
            # If download fails or offline, initialize clean resnet18
            model = resnet18(weights=None)
    else:
        model = resnet18(weights=None)

    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)
    return model


def freeze_backbone(model: nn.Module) -> nn.Module:
    """Freeze feature extractor backbone for initial head training."""
    for param in model.parameters():
        param.requires_grad = False
    for param in model.fc.parameters():
        param.requires_grad = True
    return model


def unfreeze_backbone(model: nn.Module) -> nn.Module:
    """Unfreeze all layers for end-to-end fine tuning."""
    for param in model.parameters():
        param.requires_grad = True
    return model
