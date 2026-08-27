from __future__ import annotations

# Configurable Late-Fusion Weights
CNN_WEIGHT = 0.7
ENV_WEIGHT = 0.3

# The unified 3-class disease space shared identically by CNN and Environmental models
ENSEMBLE_CLASSES = [
    "Fowlpox",
    "Infectious Coryza",
    "Healthy",
]

COMMON_CLASSES = ENSEMBLE_CLASSES
ALL_ENSEMBLE_CLASSES = ENSEMBLE_CLASSES
CNN_ONLY_CLASSES = []

# Alias mapping to ensure consistent canonical naming across models
CLASS_CANONICAL_MAP = {
    "healthy": "Healthy",
    "health": "Healthy",
    "fowl pox": "Fowlpox",
    "fowlpox": "Fowlpox",
    "fowl_pox": "Fowlpox",
    "infectious coryza": "Infectious Coryza",
    "coryza": "Infectious Coryza",
    "infectious_coryza": "Infectious Coryza",
}
