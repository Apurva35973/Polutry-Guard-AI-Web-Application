from __future__ import annotations

import json
import sys
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from utlis.db_utlis import executeQuery

from Environment.service import current_environment, evaluate_environment, get_alerts, get_history

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

environment_bp = Blueprint("environment", __name__)


def owned_farm(farm_id):
    if get_jwt().get("role") != "Farmer":
        return False
    rows = executeQuery("SELECT farmer_id FROM Farmers WHERE email=%s AND farmer_id=%s", (get_jwt_identity(), farm_id))
    return bool(rows)


@environment_bp.get("/environment/current/<farm_id>")
@jwt_required()
def get_current_environment(farm_id):
    if not owned_farm(farm_id): return jsonify({"error": "Access denied"}), 403
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    return jsonify(current_environment(farm_id, lat=lat, lon=lon))


@environment_bp.get("/environment/history/<farm_id>")
@jwt_required()
def get_environment_history(farm_id):
    if not owned_farm(farm_id): return jsonify({"error": "Access denied"}), 403
    limit = request.args.get("limit", default=100, type=int)
    time_range = request.args.get("range")
    return jsonify({"farm_id": farm_id, "history": get_history(farm_id, limit=limit, time_range=time_range)})


@environment_bp.get("/environment/alerts/<farm_id>")
@jwt_required()
def get_environment_alerts(farm_id):
    if not owned_farm(farm_id): return jsonify({"error": "Access denied"}), 403
    limit = request.args.get("limit", default=50, type=int)
    return jsonify({"farm_id": farm_id, "alerts": get_alerts(farm_id, limit=limit)})


@environment_bp.post("/environment/check")
def check_environment():
    payload = request.get_json(silent=True) or {}
    farm_id = str(payload.get("farm_id", "prototype"))
    temperature = payload.get("temperature")
    humidity = payload.get("humidity")

    if temperature is None or humidity is None:
        return jsonify({"error": "temperature and humidity are required"}), 400

    status, alerts = evaluate_environment(float(temperature), float(humidity))
    return jsonify(
        {
            "farm_id": farm_id,
            "temperature": float(temperature),
            "humidity": float(humidity),
            "environment_status": status,
            "alert": bool(alerts),
            "alerts": alerts,
        }
    )


@environment_bp.get("/risk/<farm_id>")
def get_risk(farm_id):
    # Keep live environmental monitoring available if optional ML dependencies
    # are not installed yet.
    from predict_risk_module import predict_risk

    input_data = {
        "Temperature": request.args.get("temperature", type=float),
        "Humidity": request.args.get("humidity", type=float),
        "Mortality_Rate": request.args.get("mortality_rate", type=float),
        "Egg_Production": request.args.get("egg_production", type=float),
        "Amount_of_Feeding": request.args.get("amount_of_feeding", type=float),
    }
    missing = [key for key, value in input_data.items() if value is None]
    if missing:
        return (
            jsonify(
                {
                    "farm_id": farm_id,
                    "error": "AI risk prediction needs complete model inputs.",
                    "missing_fields": missing,
                    "message": (
                        "Temperature and humidity may come from the weather API, but mortality, "
                        "egg production, and feeding should come from farmer input or farm records."
                    ),
                }
            ),
            422,
        )

    try:
        prediction = predict_risk(input_data)
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"farm_id": farm_id, "error": str(exc)}), 422
    environment_status = prediction["environmental_status"]
    elevated = prediction["risk_level"] in {"Medium", "High"} and environment_status in {
        "WARNING",
        "CRITICAL",
    }
    return jsonify(
        {
            "farm_id": farm_id,
            **prediction,
            "elevated_biosecurity_risk": elevated,
            "disclaimer": "Risk assessment only; not a veterinary diagnosis.",
        }
    )


@environment_bp.post("/ml/predict")
def predict_ml_status():
    """Run image disease classification and environmental late-fusion inference."""
    from Poultry_Guard_ML.environmental.preprocessing.preprocessor import EnvironmentalInputError
    from Poultry_Guard_ML.cnn.inference.image_predictor import ImageModelUnavailable
    from Poultry_Guard_ML.ensemble.ensemble_predictor import predict_poultry_status

    image = request.files.get("image")
    if image is None or not image.filename:
        return jsonify({"error": "image is required as a multipart file field."}), 400
    raw_environment = request.form.get("environmental")
    if raw_environment is None:
        return jsonify({"error": "environmental is required as a JSON multipart field."}), 400
    try:
        environmental_input = json.loads(raw_environment)
    except (TypeError, json.JSONDecodeError):
        return jsonify({"error": "environmental must be a JSON object."}), 400
    if not isinstance(environmental_input, dict):
        return jsonify({"error": "environmental must be a JSON object."}), 400
    try:
        return jsonify(predict_poultry_status(image.stream, environmental_input))
    except EnvironmentalInputError as exc:
        return jsonify({"error": str(exc)}), 422
    except ImageModelUnavailable as exc:
        return jsonify({"error": str(exc), "code": "IMAGE_MODEL_NOT_FOUND"}), 503
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc), "code": "MODEL_NOT_FOUND"}), 503
    except RuntimeError as exc:
        return jsonify({"error": str(exc), "code": "ML_DEPENDENCY_UNAVAILABLE"}), 503
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        # Avoid leaking internal details while keeping the Flask server alive.
        return jsonify({"error": "ML inference failed. Check model availability and input format."}), 500
