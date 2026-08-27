from __future__ import annotations

import json
from pathlib import Path

ENV_DIR = Path(__file__).resolve().parent
MODEL_PATH = ENV_DIR / "model" / "Environmental_factorModel.pkl"
XGBOOST_MODEL_PATH = ENV_DIR / "model" / "poultry_environmental_xgboost.pkl"
PREPROCESSOR_PATH = ENV_DIR / "preprocessing" / "preprocessor.pkl"
CLASS_MAPPING_PATH = ENV_DIR / "config" / "class_mapping.json"
METADATA_PATH = ENV_DIR / "model" / "metadata.json"

# Target 3-class space matching CNN exactly
ENVIRONMENTAL_CLASSES = [
    "Fowlpox",
    "Infectious Coryza",
    "Healthy",
]

CLASS_MAPPING = {
    "Fowlpox": 0,
    "Infectious Coryza": 1,
    "Healthy": 2,
}

INVERSE_CLASS_MAPPING = {
    0: "Fowlpox",
    1: "Infectious Coryza",
    2: "Healthy",
}

# Supported Breeds from dataset
SUPPORTED_BREEDS = [
    "White Leghorn",
    "Rhode Island Red",
    "Broiler Ross 308",
]

DEFAULT_BREED = "Broiler Ross 308"

# Required feature columns expected by the model
NUMERIC_FEATURES = [
    "Temperature_C",
    "Humidity_percent",
    "Ammonia_ppm",
    "Mortality_Rate_percent",
    "Egg_Production_percent",
    "Amount_of_Feeding_g_bird_day",
]

CATEGORICAL_FEATURES = [
    "Breed",
]

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

# Feature mapping aliases for user friendliness & API input flexibility
FEATURE_ALIASES = {
    "breed": "Breed",
    "breed_name": "Breed",
    "bird_breed": "Breed",
    "temperature": "Temperature_C",
    "temperature_c": "Temperature_C",
    "temp": "Temperature_C",
    "humidity": "Humidity_percent",
    "humidity_percent": "Humidity_percent",
    "hum": "Humidity_percent",
    "ammonia": "Ammonia_ppm",
    "ammonia_ppm": "Ammonia_ppm",
    "nh3": "Ammonia_ppm",
    "mortality_rate": "Mortality_Rate_percent",
    "mortality_rate_percent": "Mortality_Rate_percent",
    "mortality": "Mortality_Rate_percent",
    "egg_production": "Egg_Production_percent",
    "egg_production_percent": "Egg_Production_percent",
    "eggs": "Egg_Production_percent",
    "amount_of_feeding": "Amount_of_Feeding_g_bird_day",
    "amount_of_feeding_g_bird_day": "Amount_of_Feeding_g_bird_day",
    "feed_intake": "Amount_of_Feeding_g_bird_day",
    "feed_consumption": "Amount_of_Feeding_g_bird_day",
    "feeding": "Amount_of_Feeding_g_bird_day",
    "feed": "Amount_of_Feeding_g_bird_day",
}

# Breed normalization map
BREED_ALIASES = {
    "white leghorn": "White Leghorn",
    "leghorn": "White Leghorn",
    "layer": "White Leghorn",
    "rhode island red": "Rhode Island Red",
    "rir": "Rhode Island Red",
    "dual purpose": "Rhode Island Red",
    "breeder": "Rhode Island Red",
    "broiler ross 308": "Broiler Ross 308",
    "broiler": "Broiler Ross 308",
    "ross 308": "Broiler Ross 308",
    "ross": "Broiler Ross 308",
}

# Disease normalization map
DISEASE_CANONICAL_MAP = {
    "healthy": "Healthy",
    "health": "Healthy",
    "fowl pox": "Fowlpox",
    "fowlpox": "Fowlpox",
    "fowl_pox": "Fowlpox",
    "infectious coryza": "Infectious Coryza",
    "coryza": "Infectious Coryza",
    "infectious_coryza": "Infectious Coryza",
}
