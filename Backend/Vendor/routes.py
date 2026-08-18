from flask import Flask,request,Blueprint
from utlis.response import createResult
from utlis.db_utlis import executeQuery
from flask_jwt_extended import jwt_manager,jwt_required,get_jwt
import re
from datetime import datetime
from flask_cors import CORS

vendor_bp= Blueprint("vendor", __name__)

@vendor_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():

    claims = get_jwt()

    if claims.get("role") != "Vendor":
        return createResult(
            "Access Denied : Vendor Only",
            None
        )

    vendor_id = claims.get("user_id")

    query = """
        SELECT *
        FROM Vendors
        WHERE vendor_id = %s
    """

    result = executeQuery(
        query,
        (vendor_id,)
    )

    return createResult(None, result)

@vendor_bp.route("/profile/update", methods=["PUT"])
@jwt_required()
def update_profile():

    claims = get_jwt()

    if claims.get("role") != "Vendor":
        return createResult(
            "Access Denied : Vendor Only",
            None
        )

    vendor_id = claims.get("user_id")

    data = request.get_json()

    query = """
        UPDATE Vendors
        SET
        full_name=%s,
        business_name=%s,
        phone_number=%s,
        address=%s,
        latitude=%s,
        longitude=%s
        WHERE vendor_id=%s
    """

    params = (
        data["full_name"],
        data["business_name"],
        data["phone_number"],
        data["address"],
        data["latitude"],
        data["longitude"],
        vendor_id
    )

    result = executeQuery(query, params)

    return createResult(None, result)

@vendor_bp.route("/nearby-farms", methods=["GET"])
@jwt_required()
def nearby_farms():

    claims = get_jwt()

    if claims.get("role") != "Vendor":
        return createResult(
            "Access Denied : Vendor Only",
            None
        )

    vendor_id = claims.get("user_id")

    vendor_query = """
        SELECT latitude, longitude
        FROM Vendors
        WHERE vendor_id=%s
    """

    vendor = executeQuery(
        vendor_query,
        (vendor_id,)
    )

    if not vendor:
        return createResult(
            "Vendor not found",
            None
        )

    latitude = vendor[0]["latitude"]
    longitude = vendor[0]["longitude"]

    query = """
        SELECT
            farmer_id,
            full_name,
            farm_name,
            farm_type,
            address,
            total_birds,
            latitude,
            longitude
        FROM Farmers
        WHERE status='Active'
    """

    result = executeQuery(query, None)

    return createResult(None, {
        "vendor_location": {
            "latitude": latitude,
            "longitude": longitude
        },
        "farms": result
    })


@vendor_bp.route("/outbreak-alerts", methods=["GET"])
@jwt_required()
def outbreak_alerts():

    claims = get_jwt()

    if claims.get("role") != "Vendor":
        return createResult(
            "Access Denied : Vendor Only",
            None
        )

    query = """
        SELECT *
        FROM Outbreak_Alerts
        WHERE status='Active'
    """

    result = executeQuery(query, None)

    return createResult(None, result)

@vendor_bp.route("/alerts", methods=["GET"])
@jwt_required()
def get_alerts():

    claims = get_jwt()

    if claims.get("role") != "Vendor":
        return createResult(
            "Access Denied : Vendor Only",
            None
        )

    query = """
        SELECT *
        FROM Alerts
        ORDER BY created_at DESC
    """

    result = executeQuery(query, None)

    return createResult(None, result)

@vendor_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():

    claims = get_jwt()

    if claims.get("role") != "Vendor":
        return createResult(
            "Access Denied : Vendor Only",
            None
        )

    query = """
        SELECT
        (SELECT COUNT(*) FROM Farmers) total_farms,
        (SELECT COUNT(*) FROM Outbreak_Alerts
            WHERE status='Active') active_outbreaks,
        (SELECT COUNT(*) FROM Alerts
            WHERE acknowledged=0) active_alerts
    """

    result = executeQuery(query, None)

    return createResult(None, result)