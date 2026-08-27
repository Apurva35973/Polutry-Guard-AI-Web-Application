from __future__ import annotations

from pathlib import Path

# Paths
CNN_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CNN_DIR.parent.parent
MODEL_DIR = CNN_DIR / "model"
MODEL_PATH = MODEL_DIR / "best_resnet18_poultry_3class.pth"
CLASS_MAPPING_PATH = MODEL_DIR / "class_mapping.json"
DATASET_MANIFEST_PATH = MODEL_DIR / "dataset_manifest.json"
DEFAULT_DATASETS_DIR = PROJECT_ROOT / "datasets"

# Image and Preprocessing Config
IMAGE_SIZE = 224
RESIZE_SIZE = 256
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD = [0.229, 0.224, 0.225]

# Canonical 3 classes for CNN ResNet18
CANONICAL_CNN_CLASSES = [
    "Fowlpox",
    "Infectious Coryza",
    "Healthy",
]

# Explicit Default Class Mapping
DEFAULT_CLASS_MAPPING = {
    "Fowlpox": 0,
    "Infectious Coryza": 1,
    "Healthy": 2,
}

RAW_INDEX_TO_CLASS = {
    0: "Fowlpox",
    1: "Infectious Coryza",
    2: "Healthy",
}
