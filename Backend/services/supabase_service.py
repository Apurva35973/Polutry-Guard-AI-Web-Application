import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from utlis.db_utlis import executeQuery

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")).strip()

def is_supabase_configured():
    """Checks if valid Supabase configuration is present in environment variables."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

def send_to_supabase_rest(table_name, payload):
    """
    Sends data to Supabase PostgreSQL REST API.
    Returns (True, response_data) on success, or (False, error_msg) on failure.
    """
    if not is_supabase_configured():
        return False, "Supabase credentials not configured."

    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            status_code = resp.getcode()
            res_body = resp.read().decode("utf-8")
            if status_code in (200, 201):
                return True, json.loads(res_body) if res_body else {}
            return False, f"Supabase responded with status {status_code}: {res_body}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        return False, f"Supabase HTTP error {e.code}: {err_body}"
    except Exception as e:
        return False, f"Failed to push to Supabase: {str(e)}"

def save_telemetry_record(
    hardware_kit_id,
    farmer_id,
    thingspeak_entry_id,
    temperature,
    humidity,
    ammonia,
    vocalization_activity,
    raw_payload=None,
    recorded_at=None
):
    """
    Persists telemetry record with deduplication based on (hardware_kit_id, thingspeak_entry_id).
    Persists in MySQL (and attempts Supabase PostgreSQL if configured).
    Updates Hardware_Kits last_telemetry_at and last_seen_at.
    """
    if not hardware_kit_id:
        return {"success": False, "error": "hardware_kit_id is required."}

    # Deduplication check
    if thingspeak_entry_id is not None:
        existing = executeQuery(
            "SELECT telemetry_id FROM telemetry WHERE hardware_kit_id = %s AND thingspeak_entry_id = %s LIMIT 1",
            (hardware_kit_id, thingspeak_entry_id)
        )
        if existing:
            return {
                "success": True,
                "inserted": False,
                "is_duplicate": True,
                "telemetry_id": existing[0]["telemetry_id"],
                "message": f"Telemetry entry {thingspeak_entry_id} already saved."
            }

    # Format recorded_at
    if recorded_at:
        try:
            if isinstance(recorded_at, str):
                # Clean ISO string to MySQL DATETIME format YYYY-MM-DD HH:MM:SS
                dt = datetime.fromisoformat(recorded_at.replace('Z', '+00:00'))
                formatted_recorded_at = dt.strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(recorded_at, datetime):
                formatted_recorded_at = recorded_at.strftime('%Y-%m-%d %H:%M:%S')
            else:
                formatted_recorded_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            formatted_recorded_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    else:
        formatted_recorded_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    raw_json = json.dumps(raw_payload) if raw_payload else None

    # Insert into MySQL
    insert_query = """
        INSERT INTO telemetry (
            hardware_kit_id,
            farmer_id,
            thingspeak_entry_id,
            temperature,
            humidity,
            ammonia,
            vocalization_activity,
            raw_payload,
            recorded_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    insert_res = executeQuery(
        insert_query,
        (
            hardware_kit_id,
            farmer_id,
            thingspeak_entry_id,
            temperature,
            humidity,
            ammonia,
            vocalization_activity,
            raw_json,
            formatted_recorded_at
        )
    )

    # Update Hardware_Kits timestamp
    try:
        executeQuery(
            "UPDATE Hardware_Kits SET last_telemetry_at = %s, last_seen_at = %s WHERE hardware_kit_id = %s",
            (formatted_recorded_at, formatted_recorded_at, hardware_kit_id)
        )
    except Exception as e:
        print(f"[WARN] Failed to update Hardware_Kits last_telemetry_at: {e}")

    # Push to Supabase if configured
    supabase_synced = False
    supabase_error = None
    if is_supabase_configured():
        sp_payload = {
            "hardware_kit_id": hardware_kit_id,
            "farmer_id": farmer_id,
            "thingspeak_entry_id": thingspeak_entry_id,
            "temperature": temperature,
            "humidity": humidity,
            "ammonia": ammonia,
            "vocalization_activity": vocalization_activity,
            "raw_payload": raw_payload,
            "recorded_at": formatted_recorded_at
        }
        ok, res_or_err = send_to_supabase_rest("telemetry", sp_payload)
        supabase_synced = ok
        if not ok:
            supabase_error = res_or_err

    return {
        "success": True,
        "inserted": True,
        "is_duplicate": False,
        "recorded_at": formatted_recorded_at,
        "supabase_synced": supabase_synced,
        "supabase_error": supabase_error
    }

def get_latest_telemetry_from_db(hardware_kit_id):
    """Retrieves the most recent telemetry record for a hardware kit from the database."""
    query = """
        SELECT telemetry_id, hardware_kit_id, farmer_id, thingspeak_entry_id,
               temperature, humidity, ammonia, vocalization_activity,
               recorded_at, created_at
        FROM telemetry
        WHERE hardware_kit_id = %s
        ORDER BY recorded_at DESC, telemetry_id DESC
        LIMIT 1
    """
    rows = executeQuery(query, (hardware_kit_id,))
    if rows and len(rows) > 0:
        row = rows[0]
        # Convert numeric types cleanly
        return {
            "telemetry_id": row["telemetry_id"],
            "hardware_kit_id": row["hardware_kit_id"],
            "farmer_id": row["farmer_id"],
            "thingspeak_entry_id": row["thingspeak_entry_id"],
            "temperature": float(row["temperature"]) if row["temperature"] is not None else None,
            "humidity": float(row["humidity"]) if row["humidity"] is not None else None,
            "ammonia": float(row["ammonia"]) if row["ammonia"] is not None else None,
            "vocalization_activity": float(row["vocalization_activity"]) if row["vocalization_activity"] is not None else None,
            "recorded_at": row["recorded_at"].isoformat() if hasattr(row["recorded_at"], 'isoformat') else str(row["recorded_at"]),
            "created_at": row["created_at"].isoformat() if hasattr(row["created_at"], 'isoformat') else str(row["created_at"])
        }
    return None
