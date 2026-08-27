from datetime import datetime
from flask import Blueprint, request
from utlis.response import createResult
from utlis.db_utlis import executeQuery
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from Farmer.biosecurity import create_alert, json_value, mortality_analytics

farmer_bp = Blueprint("farmer", __name__)


@farmer_bp.route("/profile/complete", methods=["PUT"])
@jwt_required()
def complete_profile():
    if get_jwt().get("role") != "Farmer":
        return createResult("Access Denied : Farmer Only", None)

    data = request.get_json(silent=True) or {}
    required_fields = ("farm_name", "address", "latitude", "longitude")
    for field in required_fields:
        if data.get(field) in (None, ""):
            return createResult(f"{field} is required", None)

    # Support breed & farm_type
    valid_breeds = {"White Leghorn", "Rhode Island Red", "Broiler Ross 308"}
    valid_types = {"Broiler", "Layer", "Breeder"}

    breed = data.get("breed")
    farm_type = data.get("farm_type")

    if breed and breed in valid_breeds:
        if not farm_type or farm_type not in valid_types:
            farm_type = "Layer" if breed == "White Leghorn" else ("Breeder" if breed == "Rhode Island Red" else "Broiler")
    elif farm_type and farm_type in valid_types:
        if not breed:
            breed = "White Leghorn" if farm_type == "Layer" else ("Rhode Island Red" if farm_type == "Breeder" else "Broiler Ross 308")
    else:
        breed = "Broiler Ross 308"
        farm_type = "Broiler"

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
        SET farm_name=%s, farm_type=%s, breed=%s, address=%s, latitude=%s, longitude=%s
        WHERE farmer_id=%s
        """,
        (data["farm_name"].strip(), farm_type, breed, data["address"].strip(), latitude, longitude, existing_profile["farmer_id"]),
    )
    return createResult(None, {"profile_completed": True})


def current_farmer():
    """Return the authenticated farmer's core profile, or None when missing."""
    rows = executeQuery(
        """SELECT farmer_id, full_name, email, phone_number, farm_name, farm_type, address,
           latitude, longitude, total_birds, status FROM Farmers WHERE email=%s""",
        (get_jwt_identity(),),
    )
    return rows[0] if rows else None


def farmer_only():
    if get_jwt().get("role") != "Farmer":
        return None, createResult("Access Denied : Farmer Only", None)
    farmer = current_farmer()
    return farmer, None if farmer else createResult("Farmer account not found", None)


@farmer_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    farmer, error = farmer_only()
    if error: return error
    fid = farmer["farmer_id"]
    latest = executeQuery("""SELECT temperature, humidity, ammonia, timestamp, status FROM environment_readings
        WHERE farm_id=%s ORDER BY timestamp DESC LIMIT 1""", (fid,))
    alerts = executeQuery("""SELECT alert_id, category, severity, title, description, status, created_at
        FROM Farmer_Alerts WHERE farmer_id=%s ORDER BY created_at DESC LIMIT 10""", (fid,))
    vaccines = executeQuery("""SELECT vaccination_id, vaccine_name, target_disease, scheduled_date, status
        FROM Vaccinations WHERE farmer_id=%s AND status <> 'Completed' ORDER BY scheduled_date LIMIT 5""", (fid,))
    predictions = executeQuery("""SELECT predicted_class, confidence, screened_at FROM Disease_Prediction_Details
        WHERE farmer_id=%s ORDER BY screened_at DESC LIMIT 5""", (fid,))
    reminders = executeQuery("""SELECT reminder_id, task_name, activity_category, scheduled_at, status FROM Farmer_Reminders
        WHERE farmer_id=%s AND status='Scheduled' ORDER BY scheduled_at LIMIT 5""", (fid,))
    # Fetch vet consultation responses so farmer can see doctor's diagnosis and prescription
    vet_consultations = executeQuery("""
        SELECT vc.consultation_id, vc.disease_name, vc.recommendation, vc.status,
               vc.consultation_date,
               v.full_name AS vet_name, v.specialization AS vet_specialization,
               v.hospital_clinic AS vet_clinic
        FROM Vet_Consultations vc
        JOIN Veterinarians v ON v.vet_id = vc.vet_id
        WHERE vc.farmer_id=%s
        ORDER BY vc.consultation_date DESC
        LIMIT 10""", (fid,))
    return createResult(None, {"farm": farmer, "environment": latest[0] if latest else None,
        "mortality": mortality_analytics(fid), "alerts": alerts, "vaccinations": vaccines,
        "reminders": reminders, "predictions": predictions,
        "vet_consultations": vet_consultations})


@farmer_bp.route("/profile", methods=["GET", "PUT"])
@jwt_required()
def profile():
    farmer, error = farmer_only()
    if error: return error
    if request.method == "GET": return createResult(None, farmer)
    data = request.get_json(silent=True) or {}
    allowed = ("full_name", "phone_number", "farm_name", "farm_type", "breed", "address", "latitude", "longitude", "total_birds")
    changes = {key: data[key] for key in allowed if key in data}
    if not changes: return createResult("no editable profile fields supplied", None)
    if "total_birds" in changes:
        try:
            changes["total_birds"] = int(changes["total_birds"])
            if changes["total_birds"] < 0: raise ValueError
        except (ValueError, TypeError): return createResult("total_birds must be a non-negative whole number", None)
    if "breed" in changes and changes["breed"] not in {"White Leghorn", "Rhode Island Red", "Broiler Ross 308"}:
        return createResult("invalid breed", None)
    if "farm_type" in changes and changes["farm_type"] not in {"Broiler", "Layer", "Breeder"}: return createResult("invalid farm_type", None)
    for coordinate, low, high in (("latitude", -90, 90), ("longitude", -180, 180)):
        if coordinate in changes:
            try: changes[coordinate] = float(changes[coordinate])
            except (TypeError, ValueError): return createResult(f"{coordinate} must be numeric", None)
            if not low <= changes[coordinate] <= high: return createResult(f"{coordinate} is outside valid range", None)
    set_clause = ", ".join(f"{key}=%s" for key in changes)
    executeQuery(f"UPDATE Farmers SET {set_clause} WHERE farmer_id=%s", tuple(changes.values()) + (farmer["farmer_id"],))
    return createResult(None, {"updated": True})


@farmer_bp.route("/devices", methods=["GET"])
@jwt_required()
def devices():
    # Farmer view is deliberately read-only; assignment/replacement stays with Admin.
    farmer, error = farmer_only()
    if error: return error
    rows = executeQuery("""SELECT hk.kit_code, hk.esp32_device_id, hk.pcb_serial_number, hk.firmware_version,
        hk.temperature_sensor_serial, hk.humidity_sensor_serial, hk.ammonia_sensor_serial, hk.microphone_sensor_serial,
        hk.status, hk.last_seen_at, hk.installation_date FROM Device_Assignments da
        JOIN Hardware_Kits hk ON hk.hardware_kit_id=da.hardware_kit_id
        WHERE da.farmer_id=%s AND da.status='Active' ORDER BY da.assigned_at DESC""", (farmer["farmer_id"],))
    return createResult(None, rows)


@farmer_bp.route("/mortality", methods=["POST", "GET"])
@jwt_required()
def mortality():
    farmer, error = farmer_only()
    if error: return error
    fid = farmer["farmer_id"]
    if request.method == "GET":
        return createResult(None, executeQuery("""SELECT * FROM Mortality_Records WHERE farmer_id=%s
            ORDER BY recorded_at DESC LIMIT 200""", (fid,)))
    data = request.get_json(silent=True) or {}
    try: deaths = int(data.get("death_count"))
    except (ValueError, TypeError): return createResult("death_count must be a whole number", None)
    if deaths < 0: return createResult("death_count must be at least 0", None)
    population = int(farmer.get("total_birds") or 0)
    if population and deaths > population and not data.get("allow_exceeds_population"):
        return createResult("death_count cannot exceed current flock population", None)
    symptoms = data.get("observed_symptoms", [])
    if not isinstance(symptoms, list): return createResult("observed_symptoms must be a list", None)
    recorded_at = data.get("recorded_at") or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    executeQuery("""INSERT INTO Mortality_Records (farmer_id, flock_id, death_count, observed_symptoms, custom_symptoms, suspected_cause, recorded_at, created_by)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", (fid, data.get("flock_id"), deaths, json_value(symptoms), data.get("custom_symptoms"), data.get("suspected_cause"), recorded_at, fid))
    if deaths > 0: create_alert(fid, "MORTALITY", "HIGH", "Mortality recorded", f"Farmer recorded {deaths} bird deaths. This is an observation, not a diagnosis.", "mortality-record", 60)
    return createResult(None, {"recorded": True})


@farmer_bp.route("/mortality/analytics", methods=["GET"])
@jwt_required()
def mortality_summary():
    farmer, error = farmer_only()
    return error or createResult(None, mortality_analytics(farmer["farmer_id"]))


@farmer_bp.route("/reminders", methods=["GET", "POST"])
@jwt_required()
def reminders():
    farmer, error = farmer_only()
    if error: return error
    fid = farmer["farmer_id"]
    if request.method == "GET":
        return createResult(None, executeQuery("""SELECT *, CASE WHEN status='Scheduled' AND scheduled_at < NOW() THEN 'Overdue' ELSE status END computed_status
            FROM Farmer_Reminders WHERE farmer_id=%s ORDER BY scheduled_at""", (fid,)))
    data = request.get_json(silent=True) or {}
    categories = {"Vaccination", "Medicine", "Feed", "Cleaning", "Disinfection", "Inspection", "Equipment maintenance", "Other"}
    recurrences = {"None", "Daily", "Weekly", "Monthly"}
    if not str(data.get("task_name") or "").strip() or data.get("activity_category") not in categories:
        return createResult("task_name and a valid activity_category are required", None)
    if data.get("recurrence", "None") not in recurrences: return createResult("invalid recurrence", None)
    try: scheduled = datetime.fromisoformat(str(data["scheduled_at"]).replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError): return createResult("scheduled_at must be a valid ISO date/time", None)
    executeQuery("""INSERT INTO Farmer_Reminders (farmer_id, task_name, activity_category, scheduled_at, recurrence, instructions)
        VALUES (%s,%s,%s,%s,%s,%s)""", (fid, data["task_name"].strip(), data["activity_category"], scheduled, data.get("recurrence", "None"), data.get("instructions")))
    return createResult(None, {"created": True})


@farmer_bp.route("/reminders/<int:reminder_id>", methods=["PUT", "DELETE"])
@jwt_required()
def update_reminder(reminder_id):
    farmer, error = farmer_only()
    if error: return error
    fid = farmer["farmer_id"]
    if request.method == "DELETE":
        executeQuery("DELETE FROM Farmer_Reminders WHERE reminder_id=%s AND farmer_id=%s", (reminder_id, fid))
        return createResult(None, {"deleted": True})
    data = request.get_json(silent=True) or {}
    if data.get("status") == "Completed":
        executeQuery("UPDATE Farmer_Reminders SET status='Completed', completed_at=NOW() WHERE reminder_id=%s AND farmer_id=%s", (reminder_id, fid))
        return createResult(None, {"updated": True})
    return createResult("only completion is currently editable; delete and recreate to change scheduling", None)


@farmer_bp.route("/vaccinations", methods=["GET", "POST"])
@jwt_required()
def vaccinations():
    farmer, error = farmer_only()
    if error: return error
    fid = farmer["farmer_id"]
    if request.method == "GET":
        rows = executeQuery("""SELECT *, CASE WHEN status='Scheduled' AND scheduled_date=CURDATE() THEN 'Due Today'
            WHEN status='Scheduled' AND scheduled_date < CURDATE() THEN 'Missed' ELSE status END computed_status
            FROM Vaccinations WHERE farmer_id=%s ORDER BY scheduled_date""", (fid,))
        return createResult(None, rows)
    data = request.get_json(silent=True) or {}
    if not str(data.get("vaccine_name") or "").strip() or not data.get("scheduled_date"):
        return createResult("vaccine_name and scheduled_date are required", None)
    try: datetime.strptime(data["scheduled_date"], "%Y-%m-%d")
    except ValueError: return createResult("scheduled_date must be YYYY-MM-DD", None)
    executeQuery("""INSERT INTO Vaccinations (farmer_id, flock_id, vaccine_name, target_disease, scheduled_date, dose_information, notes)
        VALUES (%s,%s,%s,%s,%s,%s,%s)""", (fid, data.get("flock_id"), data["vaccine_name"].strip(), data.get("target_disease"), data["scheduled_date"], data.get("dose_information"), data.get("notes")))
    return createResult(None, {"created": True})


@farmer_bp.route("/vaccinations/<int:vaccination_id>", methods=["PATCH"])
@jwt_required()
def update_vaccination(vaccination_id):
    farmer, error = farmer_only()
    if error: return error
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in {"Scheduled", "Completed", "Missed"}: return createResult("invalid vaccination status", None)
    result = executeQuery("""UPDATE Vaccinations SET status=%s, completed_date=CASE WHEN %s='Completed' THEN CURDATE() ELSE completed_date END
        WHERE vaccination_id=%s AND farmer_id=%s""", (status, status, vaccination_id, farmer["farmer_id"]))
    return createResult(None, {"updated": bool(result["affectedRows"])})


@farmer_bp.route("/alerts", methods=["GET"])
@jwt_required()
def alerts():
    farmer, error = farmer_only()
    if error: return error
    clauses, params = ["farmer_id=%s"], [farmer["farmer_id"]]
    for field, column in (("category", "category"), ("severity", "severity"), ("status", "status")):
        if request.args.get(field): clauses.append(f"{column}=%s"); params.append(request.args[field])
    return createResult(None, executeQuery(f"SELECT * FROM Farmer_Alerts WHERE {' AND '.join(clauses)} ORDER BY created_at DESC LIMIT 250", tuple(params)))


@farmer_bp.route("/alerts/<int:alert_id>", methods=["PATCH"])
@jwt_required()
def update_alert(alert_id):
    farmer, error = farmer_only()
    if error: return error
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in {"Unread", "Read", "Acknowledged", "Resolved"}: return createResult("invalid alert status", None)
    executeQuery("UPDATE Farmer_Alerts SET status=%s WHERE alert_id=%s AND farmer_id=%s", (status, alert_id, farmer["farmer_id"]))
    return createResult(None, {"updated": True})


@farmer_bp.route("/support-requests", methods=["GET", "POST"])
@jwt_required()
def support_requests():
    farmer, error = farmer_only()
    if error: return error
    fid = farmer["farmer_id"]
    if request.method == "GET":
        return createResult(None, executeQuery("SELECT * FROM Support_Requests WHERE farmer_id=%s ORDER BY created_at DESC", (fid,)))
    data = request.get_json(silent=True) or {}
    categories = {"Device not working", "Sensor not responding", "Hardware installation", "Hardware replacement", "Technical issue", "Other"}
    if data.get("category") not in categories or not str(data.get("description") or "").strip():
        return createResult("a valid category and description are required", None)
    priority = (data.get("priority") or "Medium").title()
    if priority not in {"Low", "Medium", "High", "Critical"}: return createResult("invalid priority", None)
    executeQuery("INSERT INTO Support_Requests (farmer_id, category, description, priority) VALUES (%s,%s,%s,%s)", (fid, data["category"], data["description"].strip(), priority))
    return createResult(None, {"created": True})


@farmer_bp.route("/veterinarian-requests", methods=["GET", "POST"])
@jwt_required()
def veterinarian_requests():
    farmer, error = farmer_only()
    if error: return error
    fid = farmer["farmer_id"]
    if request.method == "GET":
        return createResult(None, executeQuery("SELECT * FROM Veterinarian_Requests WHERE farmer_id=%s ORDER BY created_at DESC", (fid,)))
    data = request.get_json(silent=True) or {}
    # Snapshot is context for a veterinarian to review, never a diagnosis.
    latest_environment = executeQuery("SELECT temperature, humidity, ammonia, timestamp FROM environment_readings WHERE farm_id=%s ORDER BY timestamp DESC LIMIT 1", (fid,))
    snapshot = {"risk_level": data.get("risk_level"), "environment": latest_environment[0] if latest_environment else None,
                "mortality": mortality_analytics(fid), "prediction": data.get("prediction")}
    executeQuery("INSERT INTO Veterinarian_Requests (farmer_id, disease_alert, message, snapshot) VALUES (%s,%s,%s,%s)", (fid, data.get("disease_alert"), data.get("message"), json_value(snapshot)))
    return createResult(None, {"created": True, "message": "Request shared for veterinary review; no diagnosis was made."})


@farmer_bp.route("/disease-predictions", methods=["GET"])
@jwt_required()
def disease_predictions():
    farmer, error = farmer_only()
    return error or createResult(None, executeQuery("SELECT * FROM Disease_Prediction_Details WHERE farmer_id=%s ORDER BY screened_at DESC LIMIT 100", (farmer["farmer_id"],)))


@farmer_bp.route("/disease-prediction", methods=["POST"])
@jwt_required()
def disease_prediction():
    """Run inference only. The model is cached by the inference module and never trained here."""
    farmer, error = farmer_only()
    if error: return error
    image = request.files.get("image")
    if image is None or not image.filename: return createResult("image is required", None)
    try:
        from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image
        result = predict_image(image.stream)
    except (ValueError, RuntimeError, FileNotFoundError) as exc:
        return createResult(str(exc), None)
    fid = farmer["farmer_id"]
    # predict_image returns 'predicted_class' (not 'predicted_disease')
    predicted = result["predicted_class"]
    confidence = float(result["confidence"])
    risk = "Low" if predicted == "Healthy" else ("High" if confidence >= .75 else "Medium")
    try:
        executeQuery("""INSERT INTO Disease_Predictions (farmer_id, disease_name, risk_level, confidence_score, model_used)
            VALUES (%s,%s,%s,%s,%s)""", (fid, predicted, risk, round(confidence * 100, 2), result["model"]))
        prediction = executeQuery("SELECT LAST_INSERT_ID() prediction_id", ())[0]
        pred_id = prediction["prediction_id"]
        if pred_id:
            executeQuery("""INSERT INTO Disease_Prediction_Details (prediction_id, farmer_id, predicted_class, confidence, probabilities, image_name)
                VALUES (%s,%s,%s,%s,%s,%s)""", (pred_id, fid, predicted, confidence, json_value(result.get("probabilities")), image.filename))
    except Exception as db_err:
        # DB logging failure must not block the AI result from reaching the frontend
        import logging
        logging.warning(f"Disease prediction DB logging failed: {db_err}")
    if predicted != "Healthy":
        severity = "HIGH" if confidence >= .75 else "MEDIUM"
        create_alert(fid, "DISEASE RISK", severity, "AI-based screening requires attention",
                     f"Potential {predicted} indication ({confidence * 100:.1f}% confidence). This is not a veterinary diagnosis; consult a veterinarian.",
                     f"screening:{predicted}", 120)
    return createResult(None, {**result, "risk_level": risk, "disclaimer": "AI-based screening only; not a confirmed veterinary diagnosis."})



@farmer_bp.route("/reports/generate", methods=["POST"])
@jwt_required()
def generate_report():
    farmer, error = farmer_only()
    if error: return error
    data = request.get_json(silent=True) or {}
    try:
        start = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        end = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
        if start > end: raise ValueError
    except (KeyError, ValueError): return createResult("a valid start_date and end_date (YYYY-MM-DD) are required", None)
    fid = farmer["farmer_id"]
    env = executeQuery("""SELECT AVG(temperature) average_temperature, MIN(temperature) minimum_temperature, MAX(temperature) maximum_temperature,
        AVG(humidity) average_humidity, MIN(humidity) minimum_humidity, MAX(humidity) maximum_humidity,
        AVG(ammonia) average_ammonia, MAX(ammonia) maximum_ammonia FROM environment_readings WHERE farm_id=%s AND DATE(timestamp) BETWEEN %s AND %s""", (fid, start, end))[0]
    alerts = executeQuery("""SELECT severity, status, COUNT(*) count FROM Farmer_Alerts WHERE farmer_id=%s AND DATE(created_at) BETWEEN %s AND %s GROUP BY severity, status""", (fid, start, end))
    predictions = executeQuery("""SELECT predicted_class, COUNT(*) count FROM Disease_Prediction_Details WHERE farmer_id=%s AND DATE(screened_at) BETWEEN %s AND %s GROUP BY predicted_class""", (fid, start, end))
    vaccinations = executeQuery("""SELECT status, COUNT(*) count FROM Vaccinations WHERE farmer_id=%s AND scheduled_date BETWEEN %s AND %s GROUP BY status""", (fid, start, end))
    return createResult(None, {"report_title": "Poultry Guard AI Farm Report", "farm": farmer, "period": {"start": str(start), "end": str(end), "generated_at": datetime.utcnow().isoformat()}, "environment": env, "mortality": mortality_analytics(fid), "alert_summary": alerts, "ai_screening": predictions, "vaccinations": vaccinations, "note": "This API returns verified report data; render it as PDF/CSV in a configured report-export service."})


@farmer_bp.route("/hardware-kit", methods=["GET"])
@jwt_required()
def hardware_kit_status():
    """Expose the farmer's assigned kit, or their outstanding request."""
    if get_jwt().get("role") != "Farmer":
        return createResult("Access Denied : Farmer Only", None)

    farmer = current_farmer()
    if not farmer:
        return createResult("Farmer account not found", None)

    assignments = executeQuery(
        """SELECT hk.kit_code, hk.esp32_device_id, hk.pcb_serial_number,
                  hk.firmware_version, hk.status, hk.installation_date, hk.last_seen_at,
                  da.assigned_at
           FROM Device_Assignments da
           JOIN Hardware_Kits hk ON hk.hardware_kit_id=da.hardware_kit_id
           WHERE da.farmer_id=%s AND da.status='Active'
           ORDER BY da.assigned_at DESC LIMIT 1""",
        (farmer["farmer_id"],),
    )
    requests = executeQuery(
        """SELECT request_id, reason, priority, status, requested_at, updated_at
           FROM Hardware_Assignment_Requests
           WHERE farmer_id=%s AND status='Pending'
           ORDER BY requested_at DESC LIMIT 1""",
        (farmer["farmer_id"],),
    )
    return createResult(None, {
        "assignment": assignments[0] if assignments else None,
        "request": requests[0] if requests else None,
    })


@farmer_bp.route("/hardware-kit/request", methods=["POST"])
@jwt_required()
def request_hardware_kit():
    """Create one pending hardware request; the admin chooses an available kit."""
    if get_jwt().get("role") != "Farmer":
        return createResult("Access Denied : Farmer Only", None)

    farmer = current_farmer()
    if not farmer:
        return createResult("Farmer account not found", None)
    if not farmer["farm_name"] or not farmer["address"]:
        return createResult("Complete your farm profile before requesting a hardware kit", None)

    active = executeQuery(
        "SELECT assignment_id FROM Device_Assignments WHERE farmer_id=%s AND status='Active' LIMIT 1",
        (farmer["farmer_id"],),
    )
    if active:
        return createResult("A hardware kit is already assigned to this farm", None)

    pending = executeQuery(
        "SELECT request_id FROM Hardware_Assignment_Requests WHERE farmer_id=%s AND status='Pending' LIMIT 1",
        (farmer["farmer_id"],),
    )
    if pending:
        return createResult(None, {"request_id": pending[0]["request_id"], "status": "Pending"})

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "Farmer requested a hardware kit.").strip()
    priority = (data.get("priority") or "Medium").title()
    if priority not in {"Low", "Medium", "High", "Critical"}:
        return createResult("priority must be Low, Medium, High, or Critical", None)

    executeQuery(
        """INSERT INTO Hardware_Assignment_Requests
           (farmer_id, farm_name_snapshot, location_snapshot, reason, priority)
           VALUES (%s, %s, %s, %s, %s)""",
        (farmer["farmer_id"], farmer["farm_name"], farmer["address"], reason, priority),
    )
    return createResult(None, {"status": "Pending"})
