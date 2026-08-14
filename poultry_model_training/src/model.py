import torch
import torch.nn as nn
from torchvision.models import resnet18, ResNet18_Weights

def get_resnet18_model(num_classes=5, pretrained=True):
    print("==================================================")
    print("7. RESNET18 MODEL INITIALIZATION")
    print("==================================================")
    
    if pretrained:
        weights = ResNet18_Weights.IMAGENET1K_V1
        model = resnet18(weights=weights)
        print("Loaded pretrained ResNet18 on ImageNet.")
    else:
        model = resnet18(weights=None)
        print("Loaded initialized ResNet18 without pretraining.")
        
    # Replace final FC layer
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)
    print(f"Modified fully connected layer to output {num_classes} classes.")
    
    return model

def freeze_backbone(model):
    # Freeze all layers
    for param in model.parameters():
        param.requires_grad = False
    
    # Unfreeze final fc layer
    for param in model.fc.parameters():
        param.requires_grad = True
        
    print("Frozen ResNet18 backbone. Only final classifier layer will be trained.")
    return model

def unfreeze_backbone(model):
    # Unfreeze all layers for fine-tuning
    for param in model.parameters():
        param.requires_grad = True
    print("Unfrozen ResNet18 backbone for fine-tuning.")
    return model
