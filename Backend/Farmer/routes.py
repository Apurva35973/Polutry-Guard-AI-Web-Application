from flask import Blueprint, request
from utlis.response import createResult
from utlis.db_utlis import executeQuery
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

farmer_bp = Blueprint("farmer", __name__)


@farmer_bp.route("/profile/complete", methods=["PUT"])
@jwt_required()
def complete_profile():
    if get_jwt().get("role") != "Farmer":
        return createResult("Access Denied : Farmer Only", None)

    data = request.get_json(silent=True) or {}
    required_fields = ("farm_name", "farm_type", "address", "latitude", "longitude")
    for field in required_fields:
        if data.get(field) in (None, ""):
            return createResult(f"{field} is required", None)

    if data["farm_type"] not in {"Broiler", "Layer", "Breeder"}:
        return createResult("farm_type must be Broiler, Layer, or Breeder", None)

    try:
        latitude = float(data["latitude"])
        longitude = float(data["longitude"])
    except (TypeError, ValueError):
        return createResult("latitude and longitude must be valid numbers", None)

    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        return createResult("latitude or longitude is outside the valid range", None)

    email = get_jwt_identity()
    rows = executeQuery(
        """
        SELECT farmer_id, farm_name, farm_type, address, latitude, longitude
        FROM Farmers
        WHERE email=%s
        """,
        (email,),
    )
    if not rows:
        return createResult("Farmer account not found", None)
    existing_profile = rows[0]
    profile_fields = ("farm_name", "farm_type", "address", "latitude", "longitude")
    if all(existing_profile.get(field) not in (None, "") for field in profile_fields):
        return createResult("Farm profile has already been completed", None)

    executeQuery(
        """
        UPDATE Farmers
        SET farm_name=%s, farm_type=%s, address=%s, latitude=%s, longitude=%s
        WHERE farmer_id=%s
        """,
        (data["farm_name"].strip(), data["farm_type"], data["address"].strip(), latitude, longitude, existing_profile["farmer_id"]),
    )
    return createResult(None, {"profile_completed": True})
