import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Ensure root .env is loaded
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from utlis.db_utlis import executeQuery
from services.sync_service import (
    sync_and_outbox,
    execute_supabase_rest,
    is_supabase_configured,
    SUPABASE_URL,
    SUPABASE_KEY
)

def send_to_supabase_rest(table_name, payload):
    """
    Sends data to Supabase PostgreSQL REST API.
    Returns (True, response_data) on success, or (False, error_msg) on failure.
    Preserved for backward-compatibility.
    """
    return execute_supabase_rest("POST", table_name, payload=payload)

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
    Persists in MySQL (and attempts Supabase PostgreSQL with outbox resilience if configured).
    Updates Hardware_Kits last_telemetry_at and last_seen_at.
    """
    if not hardware_kit_id:
        return {"success": False, "error": "hardware_kit_id is required."}

    # Deduplication check
    if thingspeak_entry_id is not None:
        try:
            existing = executeQuery(
                "SELECT telemetry_id FROM telemetry WHERE hardware_kit_id = %s AND thingspeak_entry_id = %s LIMIT 1",
                (hardware_kit_id, thingspeak_entry_id)
            )
            if existing and len(existing) > 0:
                return {
                    "success": True,
                    "inserted": False,
                    "is_duplicate": True,
                    "telemetry_id": existing[0]["telemetry_id"],
                    "message": "Telemetry entry already exists for this hardware kit and entry ID."
                }
        except Exception as e:
            print(f"[WARN] MySQL telemetry dedup query failed: {e}")

    # Format timestamp
    if recorded_at is None:
        formatted_recorded_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    elif isinstance(recorded_at, datetime):
        formatted_recorded_at = recorded_at.strftime("%Y-%m-%d %H:%M:%S")
    else:
        # String timestamp parsing fallback
        try:
            cleaned = str(recorded_at).replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            formatted_recorded_at = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            formatted_recorded_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Serialize raw_payload
    payload_str = None
    if raw_payload is not None:
        if isinstance(raw_payload, str):
            payload_str = raw_payload
        else:
            try:
                payload_str = json.dumps(raw_payload)
            except Exception:
                payload_str = None

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
    insert_params = (
        hardware_kit_id,
        farmer_id,
        thingspeak_entry_id,
        temperature,
        humidity,
        ammonia,
        vocalization_activity,
        payload_str,
        formatted_recorded_at
    )

    telemetry_id = None
    try:
        mysql_res = executeQuery(insert_query, insert_params)
        telemetry_id = mysql_res.get("lastrowid") if isinstance(mysql_res, dict) else None
    except Exception as e:
        # Handle duplicate key race condition gracefully
        if "Duplicate entry" in str(e) or "1062" in str(e):
            return {
                "success": True,
                "inserted": False,
                "is_duplicate": True,
                "message": "Telemetry entry already exists (duplicate key constraint)."
            }
        print(f"[WARN] Failed to persist telemetry in MySQL ({e}), will sync to Supabase.")

    # Update Hardware_Kits timestamp
    try:
        executeQuery(
            "UPDATE Hardware_Kits SET last_telemetry_at = %s, last_seen_at = %s WHERE hardware_kit_id = %s",
            (formatted_recorded_at, formatted_recorded_at, hardware_kit_id)
        )
    except Exception as e:
        print(f"[WARN] Failed to update Hardware_Kits last_telemetry_at: {e}")

    # Push to Supabase with outbox queuing if configured
    supabase_synced = False
    supabase_error = None
    if is_supabase_configured():
        sp_payload = {
            "telemetry_id": telemetry_id,
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
        sync_result = sync_and_outbox("telemetry", telemetry_id or f"{hardware_kit_id}_{thingspeak_entry_id}", "INSERT", sp_payload)
        supabase_synced = sync_result.get("synced", False)
        supabase_error = sync_result.get("error")

    return {
        "success": True,
        "inserted": True,
        "is_duplicate": False,
        "recorded_at": formatted_recorded_at,
        "supabase_synced": supabase_synced,
        "supabase_error": supabase_error
    }

def get_latest_telemetry_from_db(hardware_kit_id):
    """Retrieves the most recent telemetry record for a hardware kit from MySQL or Supabase."""
    try:
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
    except Exception as e:
        print(f"[WARN] MySQL get_latest_telemetry_from_db error: {e}")

    # Fallback to Supabase
    try:
        ok, rows = execute_supabase_rest("GET", f"telemetry?hardware_kit_id=eq.{hardware_kit_id}&order=recorded_at.desc&limit=1")
        if ok and rows:
            row = rows[0]
            return {
                "telemetry_id": row.get("telemetry_id"),
                "hardware_kit_id": row.get("hardware_kit_id"),
                "farmer_id": row.get("farmer_id"),
                "thingspeak_entry_id": row.get("thingspeak_entry_id"),
                "temperature": float(row["temperature"]) if row.get("temperature") is not None else None,
                "humidity": float(row["humidity"]) if row.get("humidity") is not None else None,
                "ammonia": float(row["ammonia"]) if row.get("ammonia") is not None else None,
                "vocalization_activity": float(row["vocalization_activity"]) if row.get("vocalization_activity") is not None else None,
                "recorded_at": str(row.get("recorded_at")),
                "created_at": str(row.get("created_at"))
            }
    except Exception as e:
        print(f"[WARN] Supabase get_latest_telemetry_from_db error: {e}")

    return None
