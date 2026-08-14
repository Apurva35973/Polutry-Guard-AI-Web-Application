from __future__ import annotations

from typing import Any

from .environmental_predictor import predict_environmental_risk
from .image_predictor import predict_image

# Project decision thresholds only; they are configurable and not clinically validated.
IMAGE_CONFIDENCE_THRESHOLD = 0.70
HIGH_RISK_THRESHOLD = 0.70


def late_fusion(image_result: dict[str, Any], environmental_result: dict[str, Any]) -> dict[str, Any]:
    disease = image_result["predicted_disease"]
    confidence = image_result["confidence"]
    status = environmental_result["environmental_status"]
    high_risk = environmental_result["risk_probabilities"]["High"] >= HIGH_RISK_THRESHOLD
    environmental_urgent = high_risk or status == "CRITICAL" or environmental_result["risk_level"] == "High"
    disease_detected = disease != "Healthy" and confidence >= IMAGE_CONFIDENCE_THRESHOLD

    if disease_detected and environmental_urgent:
        level, alert_type, reason = "HIGH", "DISEASE_AND_ENVIRONMENT", "Possible disease detected from image with elevated environmental/biosecurity risk."
    elif disease_detected:
        level, alert_type, reason = "MEDIUM", "POSSIBLE_DISEASE", "Possible disease detected from image; environmental/biosecurity risk is currently lower."
    elif environmental_urgent:
        level, alert_type, reason = "HIGH", "ENVIRONMENTAL_BIOSECURITY", "Image is healthy/uncertain, but environmental/biosecurity conditions require attention."
    else:
        level, alert_type, reason = "LOW", "NORMAL", "No high-confidence image disease signal and no elevated environmental/biosecurity risk."
    return {"alert_level": level, "type": alert_type, "disease_detected": disease_detected, "reason": reason, "message": reason + " This early-warning result is not a veterinary diagnosis."}


def predict_poultry_status(image_input: Any, environmental_input: dict[str, Any]) -> dict[str, Any]:
    image_result = predict_image(image_input)
    environmental_result = predict_environmental_risk(environmental_input)
    return {"image_model": image_result, "environmental_model": {**environmental_result, "probabilities": environmental_result["risk_probabilities"]}, "ensemble": late_fusion(image_result, environmental_result)}
