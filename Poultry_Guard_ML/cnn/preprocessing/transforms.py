from __future__ import annotations

from torchvision import transforms
from Poultry_Guard_ML.cnn.config import IMAGE_SIZE, NORMALIZE_MEAN, NORMALIZE_STD, RESIZE_SIZE


def get_train_transform(image_size: int = IMAGE_SIZE) -> transforms.Compose:
    """Realistic data augmentation pipeline strictly for training data."""
    return transforms.Compose([
        transforms.Resize((RESIZE_SIZE, RESIZE_SIZE)),
        transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
    ])


def get_inference_transform(image_size: int = IMAGE_SIZE) -> transforms.Compose:
    """Standard deterministic validation, test, and inference pipeline."""
    return transforms.Compose([
        transforms.Resize((RESIZE_SIZE, RESIZE_SIZE)),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
    ])


def get_val_transform(image_size: int = IMAGE_SIZE) -> transforms.Compose:
    """Validation transform alias."""
    return get_inference_transform(image_size=image_size)


def get_test_transform(image_size: int = IMAGE_SIZE) -> transforms.Compose:
    """Test transform alias."""
    return get_inference_transform(image_size=image_size)
