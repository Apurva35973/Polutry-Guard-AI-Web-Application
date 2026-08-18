from flask import Flask, request, Blueprint, current_app
from utlis.response import createResult
from utlis.db_utlis import executeQuery
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
import re
from datetime import datetime
from flask_cors import CORS


admin_bp = Blueprint('admin',__name__)


def admin_only():
    """Return an API error response when the caller is not an Admin."""
    if get_jwt().get("role") != "Admin":
        return createResult("Access Denied : Admin Only", None)
    return None


def device_status_expression(alias="hk"):
    timeout = int(current_app.config["DEVICE_OFFLINE_TIMEOUT_SECONDS"])
    return f"""
        CASE
          WHEN {alias}.status IN ('Maintenance', 'Faulty', 'Available') THEN {alias}.status
          WHEN {alias}.assigned_farmer_id IS NULL THEN 'Available'
          WHEN {alias}.last_seen_at IS NOT NULL
               AND {alias}.last_seen_at >= DATE_SUB(NOW(), INTERVAL {timeout} SECOND) THEN 'Online'
          ELSE 'Offline'
        END
    """
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


# Superintendent monitoring APIs.  These use the new inventory tables and do
# not alter the legacy Devices CRUD endpoints above.
@admin_bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    denied = admin_only()
    if denied: return denied
    status_sql = device_status_expression()
    query = f"""
      SELECT
        (SELECT COUNT(*) FROM Farmers) total_farmers,
        (SELECT COUNT(*) FROM Farmers WHERE status='Active') active_farmers,
        (SELECT COUNT(*) FROM Farmers WHERE status='Active') total_farms,
        (SELECT COUNT(*) FROM Farmers WHERE status='Active') active_farms,
        (SELECT COUNT(*) FROM Hardware_Kits) total_devices,
        (SELECT COUNT(*) FROM Hardware_Kits hk WHERE {status_sql}='Online') online_devices,
        (SELECT COUNT(*) FROM Hardware_Kits hk WHERE {status_sql}='Offline') offline_devices,
        (SELECT COUNT(*) FROM Alerts WHERE acknowledged=FALSE) active_alerts,
        (SELECT COUNT(*) FROM Veterinarians) total_veterinarians,
        (SELECT COUNT(*) FROM Veterinarians WHERE status IN ('Available','Busy')) active_veterinarians,
        (SELECT COUNT(*) FROM Hardware_Assignment_Requests WHERE status='Pending') pending_assignment_requests,
        (SELECT COUNT(*) FROM Support_Tickets WHERE status IN ('Open','In Progress')) open_support_tickets
    """
    return createResult(None, executeQuery(query, None)[0])


@admin_bp.route("/farmers", methods=["GET"])
@jwt_required()
def list_farmers_for_people():
    denied = admin_only()
    if denied: return denied
    search = request.args.get("search", "").strip()
    location = request.args.get("location", "").strip()
    device_status = request.args.get("status", "").strip().title()
    farm_status = request.args.get("farm_status", "").strip().title()
    page = max(request.args.get("page", 1, type=int), 1)
    page_size = min(max(request.args.get("page_size", 20, type=int), 1), 100)
    conditions, params = ["1=1"], []
    if search:
        like = f"%{search}%"
        conditions.append("(f.full_name LIKE %s OR f.farm_name LIKE %s OR hk.esp32_device_id LIKE %s)")
        params.extend([like, like, like])
    if location:
        conditions.append("f.address LIKE %s"); params.append(f"%{location}%")
    if farm_status:
        conditions.append("f.status=%s"); params.append(farm_status)
    status_sql = device_status_expression("hk")
    if device_status in {"Online", "Offline", "Available", "Assigned", "Maintenance", "Faulty"}:
        conditions.append(f"{status_sql}=%s"); params.append(device_status)
    where = " AND ".join(conditions)
    base = f""" FROM Farmers f
      LEFT JOIN Device_Assignments da ON da.farmer_id=f.farmer_id AND da.status='Active'
      LEFT JOIN Hardware_Kits hk ON hk.hardware_kit_id=da.hardware_kit_id WHERE {where}"""
    count = executeQuery("SELECT COUNT(*) total" + base, tuple(params))[0]["total"]
    rows = executeQuery(f"""SELECT f.farmer_id, f.full_name, f.farm_name, f.address, f.status AS farm_status,
      hk.kit_code, hk.esp32_device_id, hk.last_seen_at, {status_sql} AS device_status
      {base} ORDER BY f.full_name LIMIT %s OFFSET %s""", tuple(params + [page_size, (page-1)*page_size]))
    return createResult(None, {"items": rows, "page": page, "page_size": page_size, "total": count})


@admin_bp.route("/veterinarians", methods=["GET"])
@jwt_required()
def list_veterinarians_for_people():
    denied = admin_only()
    if denied: return denied
    return createResult(None, executeQuery("""SELECT vet_id, full_name, email, phone_number, specialization,
        license_number, experience_years, hospital_clinic, status FROM Veterinarians ORDER BY full_name""", None))


@admin_bp.route("/hardware-kits", methods=["GET"])
@jwt_required()
def list_hardware_kits():
    denied = admin_only()
    if denied: return denied
    status_sql = device_status_expression("hk")
    rows = executeQuery(f"""SELECT hk.*, f.full_name AS assigned_farmer, f.farm_name, f.address AS location,
        {status_sql} AS device_status FROM Hardware_Kits hk
        LEFT JOIN Farmers f ON f.farmer_id=hk.assigned_farmer_id ORDER BY hk.created_at DESC""", None)
    return createResult(None, rows)


@admin_bp.route("/hardware-kits/available", methods=["GET"])
@jwt_required()
def available_hardware_kits():
    denied = admin_only()
    if denied: return denied
    return createResult(None, executeQuery("SELECT * FROM Hardware_Kits WHERE status='Available' AND assigned_farmer_id IS NULL ORDER BY kit_code", None))


@admin_bp.route("/assignment-requests", methods=["GET"])
@jwt_required()
def assignment_requests():
    denied = admin_only()
    if denied: return denied
    return createResult(None, executeQuery("""SELECT r.*, f.full_name AS farmer_name FROM Hardware_Assignment_Requests r
       JOIN Farmers f ON f.farmer_id=r.farmer_id ORDER BY r.requested_at DESC""", None))


def assign_kit(data, replacement_reason=None):
    required = ("hardware_kit_id", "farmer_id")
    if any(data.get(key) in (None, "") for key in required):
        return None, "hardware_kit_id and farmer_id are required"
    kit = executeQuery("SELECT * FROM Hardware_Kits WHERE hardware_kit_id=%s FOR UPDATE", (data["hardware_kit_id"],))
    farmer = executeQuery("SELECT farmer_id, farm_name, address FROM Farmers WHERE farmer_id=%s", (data["farmer_id"],))
    if not kit: return None, "Hardware kit does not exist"
    if not farmer: return None, "Farmer does not exist"
    if kit[0]["status"] != "Available" or kit[0]["assigned_farmer_id"] is not None:
        return None, "Hardware kit is not available for assignment"
    if not farmer[0]["farm_name"]: return None, "Farmer does not have an authorized farm profile"
    admin_id = get_jwt().get("user_id")
    executeQuery("""UPDATE Hardware_Kits SET status='Assigned', assigned_farmer_id=%s,
        assigned_at=NOW(), installation_date=COALESCE(%s, installation_date) WHERE hardware_kit_id=%s""",
        (data["farmer_id"], data.get("installation_date") or None, data["hardware_kit_id"]))
    executeQuery("""INSERT INTO Device_Assignments (hardware_kit_id, farmer_id, farm_name_snapshot, assigned_by_admin_id, replacement_reason)
        VALUES (%s,%s,%s,%s,%s)""", (data["hardware_kit_id"], data["farmer_id"], farmer[0]["farm_name"], admin_id, replacement_reason))
    if data.get("request_id"):
        executeQuery("UPDATE Hardware_Assignment_Requests SET status='Assigned' WHERE request_id=%s AND farmer_id=%s", (data["request_id"], data["farmer_id"]))
    return {"kit_code": kit[0]["kit_code"], "farmer_name": farmer[0].get("farm_name")}, None


@admin_bp.route("/hardware-kits/assign", methods=["POST"])
@jwt_required()
def assign_hardware_kit():
    denied = admin_only()
    if denied: return denied
    result, error = assign_kit(request.get_json(silent=True) or {})
    if error: return createResult(error, None)
    return createResult(None, result)


@admin_bp.route("/hardware-kits/replace", methods=["POST"])
@jwt_required()
def replace_hardware_kit():
    denied = admin_only()
    if denied: return denied
    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()
    old_id = data.get("current_hardware_kit_id")
    if not old_id or not reason: return createResult("current_hardware_kit_id and reason are required", None)
    current = executeQuery("""SELECT da.*, hk.kit_code FROM Device_Assignments da JOIN Hardware_Kits hk ON hk.hardware_kit_id=da.hardware_kit_id
      WHERE da.hardware_kit_id=%s AND da.status='Active' FOR UPDATE""", (old_id,))
    if not current: return createResult("Current kit has no active assignment", None)
    if str(data.get("farmer_id")) != str(current[0]["farmer_id"]): return createResult("Farmer does not own the current kit assignment", None)
    executeQuery("UPDATE Device_Assignments SET status='Replaced', unassigned_at=NOW(), replacement_reason=%s WHERE assignment_id=%s", (reason, current[0]["assignment_id"]))
    executeQuery("UPDATE Hardware_Kits SET status='Maintenance', assigned_farmer_id=NULL WHERE hardware_kit_id=%s", (old_id,))
    result, error = assign_kit(data, reason)
    if error: return createResult(error, None)
    return createResult(None, result)


@admin_bp.route("/assignments/history", methods=["GET"])
@jwt_required()
def assignment_history():
    denied = admin_only()
    if denied: return denied
    return createResult(None, executeQuery("""SELECT da.*, hk.kit_code, hk.esp32_device_id, f.full_name AS farmer_name,
      a.full_name AS assigned_by FROM Device_Assignments da JOIN Hardware_Kits hk ON hk.hardware_kit_id=da.hardware_kit_id
      JOIN Farmers f ON f.farmer_id=da.farmer_id JOIN Admins a ON a.admin_id=da.assigned_by_admin_id ORDER BY da.assigned_at DESC""", None))


@admin_bp.route("/disease-alerts", methods=["GET"])
@jwt_required()
def disease_alerts():
    denied = admin_only()
    if denied: return denied
    return createResult(None, executeQuery("""SELECT al.alert_id, f.full_name AS farmer_name, f.farm_name, al.alert_type AS risk_type,
      UPPER(al.severity) AS risk_level, al.message, al.created_at, IF(al.acknowledged, 'Resolved', 'Open') AS status,
      hk.esp32_device_id FROM Alerts al JOIN Farmers f ON f.farmer_id=al.farmer_id
      LEFT JOIN Device_Assignments da ON da.farmer_id=f.farmer_id AND da.status='Active'
      LEFT JOIN Hardware_Kits hk ON hk.hardware_kit_id=da.hardware_kit_id ORDER BY al.created_at DESC""", None))


@admin_bp.route("/support-tickets", methods=["GET"])
@jwt_required()
def support_tickets():
    denied = admin_only()
    if denied: return denied
    return createResult(None, executeQuery("""SELECT st.*, f.full_name AS farmer_name, hk.kit_code, hk.esp32_device_id
      FROM Support_Tickets st LEFT JOIN Farmers f ON f.farmer_id=st.farmer_id
      LEFT JOIN Hardware_Kits hk ON hk.hardware_kit_id=st.hardware_kit_id ORDER BY st.created_at DESC""", None))


@admin_bp.route("/support-tickets/<int:ticket_id>", methods=["PATCH"])
@jwt_required()
def update_support_ticket(ticket_id):
    denied = admin_only()
    if denied: return denied
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in {"Open", "In Progress", "Resolved", "Rejected"}:
        return createResult("Invalid support ticket status", None)
    result = executeQuery("UPDATE Support_Tickets SET status=%s WHERE ticket_id=%s", (status, ticket_id))
    if not result["affectedRows"]: return createResult("Support ticket not found", None)
    return createResult(None, {"ticket_id": ticket_id, "status": status})


@admin_bp.route("/hardware-kits/<int:hardware_kit_id>/heartbeat", methods=["POST"])
@jwt_required()
def record_hardware_heartbeat(hardware_kit_id):
    """Temporary authenticated ingestion route until device credentials are provisioned."""
    denied = admin_only()
    if denied: return denied
    kit = executeQuery("SELECT hardware_kit_id FROM Hardware_Kits WHERE hardware_kit_id=%s", (hardware_kit_id,))
    if not kit: return createResult("Hardware kit not found", None)
    executeQuery("UPDATE Hardware_Kits SET last_seen_at=NOW() WHERE hardware_kit_id=%s", (hardware_kit_id,))
    executeQuery("INSERT INTO Device_Heartbeats (hardware_kit_id) VALUES (%s)", (hardware_kit_id,))
    return createResult(None, {"hardware_kit_id": hardware_kit_id, "received": True})
