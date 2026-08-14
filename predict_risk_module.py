from __future__ import annotations

from typing import Any

from ml.inference.environmental_predictor import predict_environmental_risk


def predict_risk(input_data: dict[str, Any]) -> dict[str, Any]:
    """Compatibility wrapper for the original environmental-risk API."""
    result = predict_environmental_risk(input_data)
    # Keep the previous response fields while exposing the full probability distribution.
    return {
        "risk_level": result["risk_level"],
        "risk_score": result["risk_score"],
        "risk_probabilities": result["risk_probabilities"],
        "environmental_status": result["environmental_status"],
        "message": result["message"],
    }


if __name__ == "__main__":
    demo = {
        "Temperature": 33.5,
        "Humidity": 78,
        "Mortality_Rate": 0.024,
        "Egg_Production": 850,
        "Amount_of_Feeding": 4300,
    }
    print(predict_risk(demo))
