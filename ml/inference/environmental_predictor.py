from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATHS = (
    PROJECT_ROOT / "ml" / "models" / "environmental" / "poultry_guard_risk_pipeline.joblib",
    PROJECT_ROOT / "poultry_guard_risk_pipeline.joblib",  # existing artifact; kept for compatibility
)


class EnvironmentalInputError(ValueError):
    """Raised when a request does not match the saved model schema."""


def model_path() -> Path:
    for candidate in MODEL_PATHS:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "Environmental model artifact not found. Expected poultry_guard_risk_pipeline.joblib "
        "under ml/models/environmental or the project root."
    )


@lru_cache(maxsize=1)
def load_environmental_artifact() -> dict[str, Any]:
    artifact = joblib.load(model_path())
    required = {"pipeline", "feature_list", "class_mapping", "inverse_class_mapping"}
    missing = required - set(artifact)
    if missing:
        raise ValueError(f"Environmental artifact is missing keys: {', '.join(sorted(missing))}")
    return artifact


def _normalize_input(input_data: dict[str, Any], feature_list: list[str]) -> pd.DataFrame:
    missing = [feature for feature in feature_list if input_data.get(feature) is None]
    if missing:
        raise EnvironmentalInputError(
            "Missing model input fields: " + ", ".join(missing) + ". Do not fabricate values."
        )
    row = {feature: input_data[feature] for feature in feature_list}
    # This is the normalization behavior used by the existing training/inference code.
    if "Humidity" in row and float(row["Humidity"]) <= 1.5:
        row["Humidity"] = float(row["Humidity"]) * 100.0
    return pd.DataFrame([row], columns=feature_list)


def environmental_status(temperature: float, humidity: float) -> str:
    if 0 <= humidity <= 1.5:
        humidity *= 100.0
    if temperature >= 35 or temperature <= 12 or humidity >= 85 or humidity <= 30:
        return "CRITICAL"
    if temperature >= 30 or temperature <= 18 or humidity >= 70 or humidity <= 40:
        return "WARNING"
    return "NORMAL"


def predict_environmental_risk(input_data: dict[str, Any]) -> dict[str, Any]:
    """Return the saved risk model's full probability distribution."""
    artifact = load_environmental_artifact()
    pipeline = artifact["pipeline"]
    feature_list = artifact["feature_list"]
    model_input = _normalize_input(input_data, feature_list)

    probabilities = pipeline.predict_proba(model_input)[0]
    classes = list(pipeline.classes_)
    inverse = artifact["inverse_class_mapping"]
    labels = [str(inverse[int(value)]) for value in classes]
    risk_probabilities = {label: float(probability) for label, probability in zip(labels, probabilities)}
    # Keep all documented risk labels visible even if an older artifact lacks one.
    risk_probabilities = {label: risk_probabilities.get(label, 0.0) for label in ("Low", "Medium", "High")}
    risk_level = max(risk_probabilities, key=risk_probabilities.get)
    risk_score = float(1.0 - risk_probabilities["Low"])
    status = environmental_status(float(input_data["Temperature"]), float(input_data["Humidity"]))
    elevated = risk_level in {"Medium", "High"} and status in {"WARNING", "CRITICAL"}

    return {
        "model": artifact.get("model_name", type(pipeline.named_steps["model"]).__name__),
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_probabilities": risk_probabilities,
        "environmental_status": status,
        "message": (
            "Elevated biosecurity risk. Investigate flock records and consult veterinary guidance as needed."
            if elevated
            else "Biosecurity risk estimate completed. This is a risk assessment, not a veterinary diagnosis."
        ),
    }
