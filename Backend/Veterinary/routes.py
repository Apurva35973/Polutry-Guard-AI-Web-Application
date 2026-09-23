from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from utlis.response import createResult
from utlis.db_utlis import executeQuery
from datetime import datetime
import json

vet_bp = Blueprint('vet', __name__)


def current_vet():
    rows = executeQuery(
        """SELECT vet_id, full_name, email, phone_number, specialization, license_number,
                  experience_years, hospital_clinic, status, verification_status, certificate_url
           FROM Veterinarians WHERE email=%s""", (get_jwt_identity(),)
    )
    return rows[0] if rows else None


def vet_only():
    if get_jwt().get("role") != "Veterinarian":
        return None, createResult("Access Denied : Veterinarian Only", None)
    vet = current_vet()
    if not vet:
        return None, createResult("Veterinarian account not found", None)
    v_status = vet.get("verification_status") or "Pending"
    if v_status != "Approved":
        if v_status == "Rejected":
            return None, createResult("Your veterinarian account has not been approved.", None)
        return None, createResult("Your veterinarian account is awaiting admin verification.", None)
    return vet, None


@vet_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    """Veterinarian workload summary & recent cases."""
    vet, err = vet_only()
    if err:
        return err

    vid = vet["vet_id"]

    consultations = executeQuery(
        """SELECT status, COUNT(*) count FROM Vet_Consultations WHERE vet_id=%s GROUP BY status""",
        (vid,),
    )
    summary = {"Pending": 0, "Active": 0, "Completed": 0, "Resolved": 0, "Cancelled": 0}
    for row in consultations:
        st = row["status"]
        if st in summary:
            summary[st] = row["count"]
        if st == "Completed":
            summary["Resolved"] = row["count"]

    # Active count can also include pending/in-progress
    active_count = executeQuery(
        """SELECT COUNT(*) count FROM Vet_Consultations WHERE vet_id=%s AND status IN ('Pending', 'Active')""",
        (vid,)
    )[0]["count"]
    summary["Active"] = active_count

    recent_cases = executeQuery(
        """SELECT vc.consultation_id, vc.consultation_id as case_id, vc.farmer_id, vc.disease_name, vc.recommendation, vc.status, vc.consultation_date,
                  f.farm_name, f.farm_type, f.full_name as farmer_name, f.address, f.phone_number
           FROM Vet_Consultations vc
           JOIN Farmers f ON f.farmer_id=vc.farmer_id
           WHERE vc.vet_id=%s
           ORDER BY vc.consultation_date DESC LIMIT 10""",
        (vid,)
    )

    # Active alerts count
    alert_count = executeQuery(
        """SELECT COUNT(*) count FROM Farmer_Alerts WHERE status != 'Resolved'""", ()
    )[0]["count"]

    # High risk farms count
    high_risk_farms = executeQuery(
        """SELECT COUNT(DISTINCT farmer_id) count FROM Disease_Predictions WHERE risk_level='High' AND prediction_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)""", ()
    )[0]["count"]

    return createResult(None, {
        "vet": vet,
        "summary": summary,
        "recent_cases": recent_cases,
        "total_alerts": alert_count,
        "high_risk_farms": high_risk_farms
    })


@vet_bp.route("/profile/complete", methods=["PUT"])
@jwt_required()
def complete_profile():
    if get_jwt().get("role") != "Veterinarian":
        return createResult("Access Denied : Veterinarian Only", None)
    data = request.get_json(silent=True) or {}
    fields = ("specialization", "license_number", "experience_years", "hospital_clinic")
    for field in fields:
        if data.get(field) in (None, ""):
            return createResult(f"{field} is required", None)
    try:
        experience = int(data["experience_years"])
        if experience < 0:
            raise ValueError
    except (TypeError, ValueError):
        return createResult("experience_years must be a non-negative whole number", None)
    vet = executeQuery("SELECT vet_id FROM Veterinarians WHERE email=%s", (get_jwt_identity(),))
    if not vet:
        return createResult("Veterinarian account not found", None)
    executeQuery(
        """UPDATE Veterinarians SET specialization=%s, license_number=%s, experience_years=%s, hospital_clinic=%s
           WHERE vet_id=%s""",
        (data["specialization"].strip(), data["license_number"].strip(), experience, data["hospital_clinic"].strip(), vet[0]["vet_id"]),
    )
    return createResult(None, {"profile_completed": True})


# ==========================================
# 1. CASES MANAGEMENT
# ==========================================
@vet_bp.route("/cases", methods=["GET", "POST"])
@jwt_required()
def cases_handler():
    vet, err = vet_only()
    if err:
        return err

    vid = vet["vet_id"]

    if request.method == "GET":
        status_filter = request.args.get("status")
        query = """
            SELECT vc.consultation_id, vc.consultation_id as case_id, vc.farmer_id, vc.disease_name,
                   vc.recommendation, vc.status, vc.consultation_date,
                   f.farm_name, f.farm_type, f.full_name as farmer_name, f.address, f.phone_number, f.total_birds
            FROM Vet_Consultations vc
            JOIN Farmers f ON f.farmer_id=vc.farmer_id
            WHERE (vc.vet_id=%s OR vc.vet_id IS NULL)
        """
        params = [vid]
        if status_filter and status_filter.lower() != "all":
            query += " AND vc.status = %s"
            params.append(status_filter)
        query += " ORDER BY vc.consultation_date DESC LIMIT 200"

        cases = executeQuery(query, tuple(params))
        return createResult(None, cases)

    # POST create case
    data = request.get_json(silent=True) or {}
    farmer_id = data.get("farmer_id")
    disease_name = data.get("disease_name", "General Health Review").strip()
    recommendation = data.get("recommendation", "").strip()

    if not farmer_id:
        return createResult("farmer_id is required", None)

    executeQuery(
        """INSERT INTO Vet_Consultations (farmer_id, vet_id, disease_name, recommendation, status)
           VALUES (%s, %s, %s, %s, 'Pending')""",
        (farmer_id, vid, disease_name, recommendation)
    )
    return createResult(None, {"created": True})


@vet_bp.route("/cases/<int:case_id>", methods=["GET", "PATCH", "PUT"])
@jwt_required()
def single_case_handler(case_id):
    vet, err = vet_only()
    if err:
        return err

    if request.method == "GET":
        cases = executeQuery(
            """SELECT vc.consultation_id, vc.consultation_id as case_id, vc.farmer_id, vc.vet_id, vc.disease_name,
                      vc.recommendation, vc.status, vc.consultation_date,
                      f.farm_name, f.farm_type, f.full_name as farmer_name, f.address, f.phone_number, f.total_birds, f.latitude, f.longitude
               FROM Vet_Consultations vc
               JOIN Farmers f ON f.farmer_id=vc.farmer_id
               WHERE vc.consultation_id=%s""",
            (case_id,)
        )
        if not cases:
            return createResult("Case not found", None)

        case_item = cases[0]

        # Fetch recent predictions and mortality for this farmer for context
        fid = case_item["farmer_id"]
        predictions = executeQuery(
            "SELECT * FROM Disease_Predictions WHERE farmer_id=%s ORDER BY prediction_time DESC LIMIT 5",
            (fid,)
        )
        mortality = executeQuery(
            "SELECT * FROM Mortality_Records WHERE farmer_id=%s ORDER BY recorded_at DESC LIMIT 5",
            (fid,)
        )
        telemetry = executeQuery(
            "SELECT * FROM environment_readings WHERE farm_id=%s ORDER BY timestamp DESC LIMIT 1",
            (fid,)
        )

        return createResult(None, {
            "case": case_item,
            "predictions": predictions,
            "mortality": mortality,
            "telemetry": telemetry[0] if telemetry else None
        })

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    recommendation = data.get("recommendation")
    disease_name = data.get("disease_name")

    updates = []
    params = []

    if status:
        allowed = {"Pending", "Active", "Completed", "Resolved", "Cancelled"}
        if status in allowed:
            # If front sends "Resolved", map to "Completed" if needed or store as is
            db_status = "Completed" if status == "Resolved" else status
            updates.append("status=%s")
            params.append(db_status)

    if recommendation is not None:
        updates.append("recommendation=%s")
        params.append(recommendation)

    if disease_name:
        updates.append("disease_name=%s")
        params.append(disease_name)

    if not updates:
        return createResult("No valid updates provided", None)

    params.append(case_id)
    executeQuery(
        f"UPDATE Vet_Consultations SET {', '.join(updates)} WHERE consultation_id=%s",
        tuple(params)
    )
    return createResult(None, {"updated": True})


# ==========================================
# 2. DISEASE ALERTS
# ==========================================
@vet_bp.route("/alerts", methods=["GET"])
@jwt_required()
def alerts_handler():
    vet, err = vet_only()
    if err:
        return err

    severity = request.args.get("severity")
    status = request.args.get("status")

    query = """
        SELECT fa.alert_id, fa.farmer_id, fa.category, fa.severity, fa.title,
               fa.description, fa.status, fa.created_at,
               f.farm_name, f.farm_type, f.full_name as farmer_name, f.address, f.phone_number
        FROM Farmer_Alerts fa
        JOIN Farmers f ON f.farmer_id=fa.farmer_id
        WHERE 1=1
    """
    params = []

    if severity and severity.lower() != "all":
        query += " AND fa.severity = %s"
        params.append(severity.upper())

    if status and status.lower() != "all":
        query += " AND fa.status = %s"
        params.append(status)

    query += " ORDER BY fa.created_at DESC LIMIT 150"

    alerts = executeQuery(query, tuple(params) if params else ())

    # Attach prediction confidence or environmental status if available
    for item in alerts:
        fid = item["farmer_id"]
        latest_pred = executeQuery(
            "SELECT disease_name, confidence_score, risk_level FROM Disease_Predictions WHERE farmer_id=%s ORDER BY prediction_time DESC LIMIT 1",
            (fid,)
        )
        if latest_pred:
            item["ai_disease"] = latest_pred[0]["disease_name"]
            item["ai_confidence"] = latest_pred[0]["confidence_score"]
            item["ai_risk"] = latest_pred[0]["risk_level"]
        else:
            item["ai_disease"] = item.get("category", "General")
            item["ai_confidence"] = 85.0
            item["ai_risk"] = item.get("severity", "MEDIUM")

    return createResult(None, alerts)


@vet_bp.route("/alerts/<int:alert_id>", methods=["PATCH"])
@jwt_required()
def update_alert_handler(alert_id):
    vet, err = vet_only()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if not status or status not in {"Unread", "Read", "Acknowledged", "Resolved"}:
        return createResult("Invalid alert status", None)

    executeQuery(
        "UPDATE Farmer_Alerts SET status=%s WHERE alert_id=%s",
        (status, alert_id)
    )
    return createResult(None, {"updated": True})


# ==========================================
# 3. FARMERS DIRECTORY
# ==========================================
@vet_bp.route("/farmers", methods=["GET"])
@jwt_required()
def farmers_list():
    vet, err = vet_only()
    if err:
        return err

    search = request.args.get("search", "").strip().lower()
    farm_type = request.args.get("farm_type")
    risk_filter = request.args.get("risk")

    farmers = executeQuery(
        """SELECT f.farmer_id, f.full_name, f.farm_name, f.farm_type, f.address,
                  f.latitude, f.longitude, f.total_birds, f.phone_number, f.status, f.created_at
           FROM Farmers f
           ORDER BY f.farm_name ASC""", ()
    )

    enriched = []
    for f in farmers:
        fid = f["farmer_id"]

        # Latest prediction
        latest_pred = executeQuery(
            "SELECT disease_name, risk_level, confidence_score, prediction_time FROM Disease_Predictions WHERE farmer_id=%s ORDER BY prediction_time DESC LIMIT 1",
            (fid,)
        )
        current_risk = latest_pred[0]["risk_level"] if latest_pred else "Low"

        # Active alerts count
        active_alerts = executeQuery(
            "SELECT COUNT(*) count FROM Farmer_Alerts WHERE farmer_id=%s AND status != 'Resolved'",
            (fid,)
        )[0]["count"]

        # Latest telemetry timestamp
        latest_tel = executeQuery(
            "SELECT timestamp, temperature, humidity, ammonia, status FROM environment_readings WHERE farm_id=%s ORDER BY timestamp DESC LIMIT 1",
            (fid,)
        )

        item = {
            **f,
            "current_risk": current_risk,
            "active_alerts": active_alerts,
            "latest_prediction": latest_pred[0] if latest_pred else None,
            "latest_telemetry": latest_tel[0] if latest_tel else None,
            "last_telemetry_update": latest_tel[0]["timestamp"] if latest_tel else None
        }

        # Apply filtering
        matches_search = (
            not search or
            search in (f["full_name"] or "").lower() or
            search in (f["farm_name"] or "").lower() or
            search in (f["address"] or "").lower()
        )
        matches_type = not farm_type or farm_type.lower() == "all" or f["farm_type"] == farm_type
        matches_risk = not risk_filter or risk_filter.lower() == "all" or current_risk.lower() == risk_filter.lower()

        if matches_search and matches_type and matches_risk:
            enriched.append(item)

    return createResult(None, enriched)


@vet_bp.route("/farmers/<int:farmer_id>", methods=["GET"])
@jwt_required()
def farmer_details(farmer_id):
    vet, err = vet_only()
    if err:
        return err

    farmer = executeQuery(
        """SELECT farmer_id, full_name, farm_name, farm_type, address,
                  latitude, longitude, total_birds, phone_number, status, created_at
           FROM Farmers WHERE farmer_id=%s""",
        (farmer_id,)
    )
    if not farmer:
        return createResult("Farmer not found", None)

    f = farmer[0]
    predictions = executeQuery(
        "SELECT * FROM Disease_Predictions WHERE farmer_id=%s ORDER BY prediction_time DESC LIMIT 15",
        (farmer_id,)
    )
    mortality = executeQuery(
        "SELECT * FROM Mortality_Records WHERE farmer_id=%s ORDER BY recorded_at DESC LIMIT 15",
        (farmer_id,)
    )
    alerts = executeQuery(
        "SELECT * FROM Farmer_Alerts WHERE farmer_id=%s ORDER BY created_at DESC LIMIT 15",
        (farmer_id,)
    )
    telemetry = executeQuery(
        "SELECT * FROM environment_readings WHERE farm_id=%s ORDER BY timestamp DESC LIMIT 20",
        (farmer_id,)
    )
    consultations = executeQuery(
        "SELECT * FROM Vet_Consultations WHERE farmer_id=%s ORDER BY consultation_date DESC LIMIT 10",
        (farmer_id,)
    )

    return createResult(None, {
        "farmer": f,
        "predictions": predictions,
        "mortality": mortality,
        "alerts": alerts,
        "telemetry": telemetry,
        "consultations": consultations
    })


# ==========================================
# 4. CONSULTATIONS
# ==========================================
@vet_bp.route("/consultations", methods=["GET", "POST"])
@jwt_required()
def consultations_handler():
    vet, err = vet_only()
    if err:
        return err

    vid = vet["vet_id"]

    if request.method == "GET":
        query = """
            SELECT vc.consultation_id, vc.farmer_id, vc.vet_id, vc.disease_name as subject,
                   vc.disease_name, vc.recommendation, vc.status, vc.consultation_date,
                   f.farm_name, f.farm_type, f.full_name as farmer_name, f.phone_number
            FROM Vet_Consultations vc
            JOIN Farmers f ON f.farmer_id=vc.farmer_id
            WHERE (vc.vet_id=%s OR vc.vet_id IS NULL)
            ORDER BY vc.consultation_date DESC
        """
        rows = executeQuery(query, (vid,))
        return createResult(None, rows)

    data = request.get_json(silent=True) or {}
    farmer_id = data.get("farmer_id")
    subject = data.get("subject") or data.get("disease_name", "Clinical Inquiry")
    recommendation = data.get("recommendation", "")

    if not farmer_id:
        return createResult("farmer_id is required", None)

    executeQuery(
        """INSERT INTO Vet_Consultations (farmer_id, vet_id, disease_name, recommendation, status)
           VALUES (%s, %s, %s, %s, 'Pending')""",
        (farmer_id, vid, subject, recommendation)
    )
    return createResult(None, {"created": True})


@vet_bp.route("/consultations/<int:consultation_id>", methods=["PATCH"])
@jwt_required()
def update_consultation_handler(consultation_id):
    vet, err = vet_only()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    recommendation = data.get("recommendation")

    updates = []
    params = []

    if status:
        allowed = {"Pending", "Active", "Completed", "Resolved", "Cancelled"}
        if status in allowed:
            db_status = status  # All values now valid in ENUM
            updates.append("status=%s")
            params.append(db_status)

    if recommendation is not None:
        updates.append("recommendation=%s")
        params.append(recommendation)

    if not updates:
        return createResult("No fields to update", None)

    params.append(consultation_id)
    executeQuery(
        f"UPDATE Vet_Consultations SET {', '.join(updates)} WHERE consultation_id=%s",
        tuple(params)
    )
    return createResult(None, {"updated": True})


# ==========================================
# 5. REPORTS & ANALYTICS
# ==========================================
@vet_bp.route("/reports", methods=["GET"])
@jwt_required()
def reports_handler():
    vet, err = vet_only()
    if err:
        return err

    vid = vet["vet_id"]

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    # Date filter clauses if supplied
    date_clause = ""
    params = [vid]
    if start_date and end_date:
        date_clause = " AND DATE(vc.consultation_date) BETWEEN %s AND %s"
        params.extend([start_date, end_date])

    # Consultations summary
    total_consultations = executeQuery(
        f"SELECT COUNT(*) count FROM Vet_Consultations vc WHERE (vc.vet_id=%s OR vc.vet_id IS NULL){date_clause}",
        tuple(params)
    )[0]["count"]

    resolved_cases = executeQuery(
        f"SELECT COUNT(*) count FROM Vet_Consultations vc WHERE (vc.vet_id=%s OR vc.vet_id IS NULL) AND vc.status IN ('Completed', 'Resolved'){date_clause}",
        tuple(params)
    )[0]["count"]

    active_cases = executeQuery(
        f"SELECT COUNT(*) count FROM Vet_Consultations vc WHERE (vc.vet_id=%s OR vc.vet_id IS NULL) AND vc.status IN ('Pending', 'Active'){date_clause}",
        tuple(params)
    )[0]["count"]

    # Disease alerts count
    disease_alerts_count = executeQuery("SELECT COUNT(*) count FROM Farmer_Alerts", ())[0]["count"]

    # High-risk farms
    high_risk_farms_count = executeQuery(
        "SELECT COUNT(DISTINCT farmer_id) count FROM Disease_Predictions WHERE risk_level='High'", ()
    )[0]["count"]

    # Disease distribution
    disease_distribution = executeQuery(
        """SELECT disease_name, COUNT(*) count
           FROM Disease_Predictions
           WHERE disease_name IS NOT NULL AND disease_name != ''
           GROUP BY disease_name
           ORDER BY count DESC""", ()
    )

    # Risk level distribution
    risk_distribution = executeQuery(
        """SELECT risk_level, COUNT(*) count
           FROM Disease_Predictions
           WHERE risk_level IS NOT NULL
           GROUP BY risk_level""", ()
    )

    # Recent cases breakdown
    cases_list = executeQuery(
        f"""SELECT vc.consultation_id, vc.disease_name, vc.recommendation, vc.status, vc.consultation_date,
                   f.farm_name, f.full_name as farmer_name
            FROM Vet_Consultations vc
            JOIN Farmers f ON f.farmer_id=vc.farmer_id
            WHERE (vc.vet_id=%s OR vc.vet_id IS NULL){date_clause}
            ORDER BY vc.consultation_date DESC LIMIT 50""",
        tuple(params)
    )

    return createResult(None, {
        "metrics": {
            "total_consultations": total_consultations,
            "resolved_cases": resolved_cases,
            "active_cases": active_cases,
            "disease_alerts": disease_alerts_count,
            "high_risk_farms": high_risk_farms_count,
        },
        "disease_distribution": disease_distribution,
        "risk_distribution": risk_distribution,
        "recent_records": cases_list,
        "export_available": True
    })
