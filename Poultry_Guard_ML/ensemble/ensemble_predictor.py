from __future__ import annotations

from typing import Any

from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image
from Poultry_Guard_ML.common.utils import round_floats
from Poultry_Guard_ML.ensemble.config import CNN_WEIGHT, ENV_WEIGHT
from Poultry_Guard_ML.ensemble.fusion import late_fusion
from Poultry_Guard_ML.environmental.inference.environmental_predictor import predict_environment


def predict_ensemble(
    image_input: Any,
    breed: str = "Broiler",
    temperature: float | None = None,
    humidity: float | None = None,
    ammonia: float | None = None,
    mortality_rate: float | None = None,
    egg_production: float | None = None,
    feed_intake: float | None = None,
    environmental_data: dict[str, Any] | None = None,
    cnn_weight: float = CNN_WEIGHT,
    env_weight: float = ENV_WEIGHT,
    **kwargs: Any,
) -> dict[str, Any]:
    """
    Run full multimodal ensemble prediction combining CNN image disease classification
    and XGBoost environmental factor disease prediction.

    Parameters:
        image_input: Filepath, bytes, file stream, or PIL Image.
        breed: Poultry breed (default 'Broiler').
        temperature: Ambient housing temperature (°C).
        humidity: Housing relative humidity (%).
        ammonia: Ammonia concentration (ppm).
        mortality_rate: Flock mortality rate (%).
        egg_production: Egg production rate (%).
        feed_intake: Daily feed intake (g/bird/day or amount).
        environmental_data: Optional dictionary containing all sensor readings.
        cnn_weight: Weight assigned to visual disease evidence (default 0.7).
        env_weight: Weight assigned to environmental factor evidence (default 0.3).

    Returns:
        Consolidated prediction containing:
        - cnn_prediction: Results from CNN model
        - environmental_prediction: Results from XGBoost model
        - ensemble_prediction: Results from late-fusion probability integration
        - decision: Final predicted disease
        - explanation: Explainable multimodal summary
    """
    # 1. Run CNN inference
    cnn_res = predict_image(image_input)

    # 2. Build environmental parameters
    env_params: dict[str, Any] = {}
    if environmental_data:
        env_params.update(environmental_data)
    env_params.update(kwargs)

    if breed is not None and "breed" not in env_params and "Breed" not in env_params:
        env_params["breed"] = breed
    if temperature is not None:
        env_params["temperature"] = temperature
    if humidity is not None:
        env_params["humidity"] = humidity
    if ammonia is not None:
        env_params["ammonia"] = ammonia
    if mortality_rate is not None:
        env_params["mortality_rate"] = mortality_rate
    if egg_production is not None:
        env_params["egg_production"] = egg_production
    if feed_intake is not None:
        env_params["feed_intake"] = feed_intake

    # 3. Run Environmental inference
    env_res = predict_environment(**env_params)

    # 4. Perform Late-Fusion
    fusion_res = late_fusion(
        cnn_result=cnn_res,
        environmental_result=env_res,
        cnn_weight=cnn_weight,
        env_weight=env_weight,
    )

    output = {
        "cnn_prediction": cnn_res,
        "environmental_prediction": env_res,
        "ensemble_prediction": fusion_res,
        "decision": fusion_res["predicted_class"],
        "confidence": fusion_res["confidence"],
        "alert_level": fusion_res["alert_level"],
        "explanation": fusion_res["explanation"],
        # Aliases for backwards compatibility with existing backend/frontend
        "cnn": cnn_res,
        "environmental": env_res,
        "ensemble": {
            **fusion_res,
            "disease": fusion_res["predicted_class"],
            "disease_confidence": fusion_res["confidence"],
            "message": fusion_res["explanation"],
            "reason": fusion_res["explanation"],
        },
        "image_model": {
            **cnn_res,
            "predicted_disease": cnn_res["predicted_class"],
        },
        "environmental_model": {
            **env_res,
            "risk_level": "Low" if env_res["predicted_class"] == "Healthy" else "High",
            "risk_score": float(1.0 - env_res["probabilities"].get("Healthy", 0.0)),
        },
    }

    return round_floats(output, precision=6)


# Backwards compatibility aliases
def predict_biosecurity(image_input: Any, environmental_input: dict[str, Any]) -> dict[str, Any]:
    """Compatibility wrapper for predict_biosecurity."""
    return predict_ensemble(image_input=image_input, environmental_data=environmental_input)


predict_poultry_status = predict_biosecurity
