from flask import Flask,request,Blueprint
from utlis.response import createResult
from utlis.db_utlis import executeQuery
from flask_jwt_extended import jwt_manager,jwt_required,get_jwt
import re
from datetime import datetime
from flask_cors import CORS


admin_bp = Blueprint('admin',__name__)
@admin_bp.route("/farmers/all", methods=["GET"])
@jwt_required()
def get_all_farmers():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    query = """
            SELECT farmer_id,
                   full_name,
                   email,
                   phone_number,
                   farm_name,
                   farm_type,
                   total_birds,
                   status
            FROM Farmers
            """

    result = executeQuery(query, None)

    return createResult(None, result)

@admin_bp.route("/farmer/delete", methods=["DELETE"])
@jwt_required()
def delete_farmer():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    farmer_id = request.args.get("farmer_id")

    if not farmer_id:
        return createResult(
            "farmer_id is required",
            None
        )

    query = """
            DELETE FROM Farmers
            WHERE farmer_id=%s
            """

    result = executeQuery(
        query,
        (farmer_id,)
    )

    return createResult(None, result)

@admin_bp.route("/farmer/add", methods=["POST"])
@jwt_required()
def add_farmer():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)

    data = request.get_json()

    query = """
        INSERT INTO Farmers
        (
            full_name,
            email,
            phone_number,
            password_hash,
            farm_name,
            farm_type,
            address,
            latitude,
            longitude,
            total_birds
        )
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """

    params = (
        data["full_name"],
        data["email"],
        data["phone_number"],
        data["password_hash"],
        data["farm_name"],
        data["farm_type"],
        data["address"],
        data["latitude"],
        data["longitude"],
        data["total_birds"]
    )

    result = executeQuery(query, params)

    return createResult(None, result)

@admin_bp.route("/farmer/update", methods=["PUT"])
@jwt_required()
def update_farmer():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)

    farmer_id = request.args.get("farmer_id")

    if not farmer_id:
        return createResult("farmer_id required", None)

    query = """
        UPDATE Farmers
        SET
        full_name=%s,
        email=%s,
        phone_number=%s,
        farm_name=%s,
        farm_type=%s,
        address=%s,
        total_birds=%s,
        status=%s
        WHERE farmer_id=%s
    """

    params = (
        request.json["full_name"],
        request.json["email"],
        request.json["phone_number"],
        request.json["farm_name"],
        request.json["farm_type"],
        request.json["address"],
        request.json["total_birds"],
        request.json["status"],
        farmer_id
    )

    result = executeQuery(query, params)

    return createResult(None, result)

@admin_bp.route("/vets/all", methods=["GET"])
@jwt_required()
def get_all_vets():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    query = """
            SELECT *
            FROM Veterinarians
            """

    result = executeQuery(query, None)

    return createResult(None, result)

@admin_bp.route("/vet/add", methods=["POST"])
@jwt_required()
def add_vet():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    data = request.get_json()

    if not data:
        return createResult(
            "Request Body Required",
            None
        )

    required_fields = (
        "full_name",
        "email",
        "phone_number",
        "specialization",
        "license_number",
        "experience_years",
        "hospital_clinic",
        "password_hash"
    )

    for field in required_fields:

        if field not in data:
            return createResult(
                f"{field} is required",
                None
            )

    query = """
            INSERT INTO Veterinarians
            (
                full_name,
                email,
                phone_number,
                specialization,
                license_number,
                experience_years,
                hospital_clinic,
                password_hash
            )
            VALUES
            (%s,%s,%s,%s,%s,%s,%s,%s)
            """

    params = (
        data["full_name"],
        data["email"],
        data["phone_number"],
        data["specialization"],
        data["license_number"],
        data["experience_years"],
        data["hospital_clinic"],
        data["password_hash"]
    )

    result = executeQuery(query, params)

    return createResult(None, result)

@admin_bp.route("/vet/update", methods=["PUT"])
@jwt_required()
def update_vet():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)

    vet_id = request.args.get("vet_id")

    query = """
        UPDATE Veterinarians
        SET
        full_name=%s,
        email=%s,
        phone_number=%s,
        specialization=%s,
        experience_years=%s,
        hospital_clinic=%s,
        status=%s
        WHERE vet_id=%s
    """

    params = (
        request.json["full_name"],
        request.json["email"],
        request.json["phone_number"],
        request.json["specialization"],
        request.json["experience_years"],
        request.json["hospital_clinic"],
        request.json["status"],
        vet_id
    )

    result = executeQuery(query, params)

    return createResult(None, result)

@admin_bp.route("/vet/delete", methods=["DELETE"])
@jwt_required()
def delete_vet():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)

    vet_id = request.args.get("vet_id")

    query = """
        DELETE FROM Veterinarians
        WHERE vet_id=%s
    """

    result = executeQuery(
        query,
        (vet_id,)
    )

    return createResult(None, result)

@admin_bp.route("/devices/all", methods=["GET"])
@jwt_required()
def get_all_devices():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    query = """
            SELECT *
            FROM Devices
            """

    result = executeQuery(query, None)

    return createResult(None, result)

@admin_bp.route("/device/add", methods=["POST"])
@jwt_required()
def add_device():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)

    query = """
        INSERT INTO Devices
        (
            farmer_id,
            qr_code,
            esp32_id,
            raspberrypi_id,
            shed_name,
            installation_date
        )
        VALUES(%s,%s,%s,%s,%s,%s)
    """

    params = (
        request.json["farmer_id"],
        request.json["qr_code"],
        request.json["esp32_id"],
        request.json["raspberrypi_id"],
        request.json["shed_name"],
        request.json["installation_date"]
    )

    result = executeQuery(query, params)

    return createResult(None, result)

@admin_bp.route("/device/update", methods=["PUT"])
@jwt_required()
def update_device():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)

    device_id = request.args.get("device_id")

    query = """
        UPDATE Devices
        SET
        farmer_id=%s,
        qr_code=%s,
        esp32_id=%s,
        raspberrypi_id=%s,
        shed_name=%s,
        status=%s
        WHERE device_id=%s
    """

    params = (
        request.json["farmer_id"],
        request.json["qr_code"],
        request.json["esp32_id"],
        request.json["raspberrypi_id"],
        request.json["shed_name"],
        request.json["status"],
        device_id
    )

    result = executeQuery(query, params)

    return createResult(None, result)

@admin_bp.route("/device/delete", methods=["DELETE"])
@jwt_required()
def delete_device():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)

    device_id = request.args.get("device_id")

    query = """
        DELETE FROM Devices
        WHERE device_id=%s
    """

    result = executeQuery(
        query,
        (device_id,)
    )

    return createResult(None, result)

@admin_bp.route("/predictions/all", methods=["GET"])
@jwt_required()
def get_all_predictions():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    query = """
            SELECT
                dp.prediction_id,
                f.full_name,
                f.farm_name,
                dp.disease_name,
                dp.risk_level,
                dp.confidence_score,
                dp.prediction_time
            FROM Disease_Predictions dp
            INNER JOIN Farmers f
            ON dp.farmer_id = f.farmer_id
            """

    result = executeQuery(query, None)

    return createResult(None, result)

@admin_bp.route("/outbreaks/all", methods=["GET"])
@jwt_required()
def get_all_outbreaks():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    query = """
            SELECT *
            FROM Outbreak_Alerts
            """

    result = executeQuery(query, None)

    return createResult(None, result)

@admin_bp.route("/dashboard/stats", methods=["GET"])
@jwt_required()
def dashboard_stats():

    claims = get_jwt()

    if claims.get("role") != "Admin":
        return createResult(
            "Access Denied : Admin Only",
            None
        )

    query = """
            SELECT
            (SELECT COUNT(*) FROM Farmers) total_farmers,
            (SELECT COUNT(*) FROM Veterinarians) total_vets,
            (SELECT COUNT(*) FROM Devices) total_devices,
            (SELECT COUNT(*) FROM Alerts) total_alerts
            """

    result = executeQuery(query, None)

    return createResult(None, result)