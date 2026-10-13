import os
import json
import hashlib
import threading
import time
import urllib.request
import urllib.error
from datetime import datetime, date, timezone
from decimal import Decimal

from utlis.db_utlis import executeQuery, getConnection

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://uhgbahpyfzbficruiaos.supabase.co").strip().rstrip("/")
if SUPABASE_URL.endswith("/rest/v1"):
    SUPABASE_URL = SUPABASE_URL[:-8].rstrip("/")

DEFAULT_SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ2JhaHB5ZnpiZmljcnVpYW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjY5OSwiZXhwIjoyMTAyMzc4Njk5fQ.urUYa06pdUN5oMaQ4H3KRSFafFWccFF5JvIR2zGq3vs"

def _is_jwt(k):
    return bool(k and str(k).strip().startswith("eyJ"))

raw_service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
raw_key = os.environ.get("SUPABASE_KEY", "").strip()
raw_anon = os.environ.get("SUPABASE_ANON_KEY", "").strip()

# Prefer SUPABASE_SERVICE_ROLE_KEY for server-side syncing (bypasses RLS)
SUPABASE_KEY = (
    raw_service if _is_jwt(raw_service) else (
        raw_key if _is_jwt(raw_key) else (
            raw_anon if _is_jwt(raw_anon) else DEFAULT_SUPABASE_SERVICE_ROLE_KEY
        )
    )
)

# Explicit schema mapping from MySQL table names to Supabase table names and PKs
TABLE_MAPPINGS = {
    "Farmers": {
        "supabase_table": "farmers",
        "primary_key": "farmer_id",
        "ignore_columns": {"password_hash"}
    },
    "farmers": {
        "supabase_table": "farmers",
        "primary_key": "farmer_id",
        "ignore_columns": {"password_hash"}
    },
    "Veterinarians": {
        "supabase_table": "veterinarians",
        "primary_key": "vet_id",
        "ignore_columns": {"password_hash"}
    },
    "veterinarians": {
        "supabase_table": "veterinarians",
        "primary_key": "vet_id",
        "ignore_columns": {"password_hash"}
    },
    "Admins": {
        "supabase_table": "admins",
        "primary_key": "admin_id",
        "ignore_columns": {"password_hash"}
    },
    "admins": {
        "supabase_table": "admins",
        "primary_key": "admin_id",
        "ignore_columns": {"password_hash"}
    },
    "Vendors": {
        "supabase_table": "vendors",
        "primary_key": "vendor_id",
        "ignore_columns": {"password_hash"}
    },
    "vendors": {
        "supabase_table": "vendors",
        "primary_key": "vendor_id",
        "ignore_columns": {"password_hash"}
    },
    "Devices": {
        "supabase_table": "devices",
        "primary_key": "device_id",
        "ignore_columns": set()
    },
    "devices": {
        "supabase_table": "devices",
        "primary_key": "device_id",
        "ignore_columns": set()
    },
    "Hardware_Kits": {
        "supabase_table": "hardware_kits",
        "primary_key": "hardware_kit_id",
        "ignore_columns": set()
    },
    "hardware_kits": {
        "supabase_table": "hardware_kits",
        "primary_key": "hardware_kit_id",
        "ignore_columns": set()
    },
    "Sensor_Data": {
        "supabase_table": "sensor_data",
        "primary_key": "sensor_id",
        "ignore_columns": set()
    },
    "sensor_data": {
        "supabase_table": "sensor_data",
        "primary_key": "sensor_id",
        "ignore_columns": set()
    },
    "Disease_Predictions": {
        "supabase_table": "disease_predictions",
        "primary_key": "prediction_id",
        "ignore_columns": set()
    },
    "disease_predictions": {
        "supabase_table": "disease_predictions",
        "primary_key": "prediction_id",
        "ignore_columns": set()
    },
    "Disease_Prediction_Details": {
        "supabase_table": "disease_prediction_details",
        "primary_key": "prediction_detail_id",
        "ignore_columns": set()
    },
    "disease_prediction_details": {
        "supabase_table": "disease_prediction_details",
        "primary_key": "prediction_detail_id",
        "ignore_columns": set()
    },
    "Vet_Consultations": {
        "supabase_table": "vet_consultations",
        "primary_key": "consultation_id",
        "ignore_columns": set()
    },
    "vet_consultations": {
        "supabase_table": "vet_consultations",
        "primary_key": "consultation_id",
        "ignore_columns": set()
    },
    "Alerts": {
        "supabase_table": "alerts",
        "primary_key": "alert_id",
        "ignore_columns": set()
    },
    "alerts": {
        "supabase_table": "alerts",
        "primary_key": "alert_id",
        "ignore_columns": set()
    },
    "Farmer_Alerts": {
        "supabase_table": "farmer_alerts",
        "primary_key": "alert_id",
        "ignore_columns": set()
    },
    "farmer_alerts": {
        "supabase_table": "farmer_alerts",
        "primary_key": "alert_id",
        "ignore_columns": set()
    },
    "Outbreak_Alerts": {
        "supabase_table": "outbreak_alerts",
        "primary_key": "outbreak_id",
        "ignore_columns": set()
    },
    "outbreak_alerts": {
        "supabase_table": "outbreak_alerts",
        "primary_key": "outbreak_id",
        "ignore_columns": set()
    },
    "Chatbot_History": {
        "supabase_table": "chatbot_history",
        "primary_key": "chat_id",
        "ignore_columns": set()
    },
    "chatbot_history": {
        "supabase_table": "chatbot_history",
        "primary_key": "chat_id",
        "ignore_columns": set()
    },
    "Transport_Requests": {
        "supabase_table": "transport_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "transport_requests": {
        "supabase_table": "transport_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "Vendor_Trips": {
        "supabase_table": "vendor_trips",
        "primary_key": "trip_id",
        "ignore_columns": set()
    },
    "vendor_trips": {
        "supabase_table": "vendor_trips",
        "primary_key": "trip_id",
        "ignore_columns": set()
    },
    "Device_Assignments": {
        "supabase_table": "device_assignments",
        "primary_key": "assignment_id",
        "ignore_columns": set()
    },
    "device_assignments": {
        "supabase_table": "device_assignments",
        "primary_key": "assignment_id",
        "ignore_columns": set()
    },
    "Device_Heartbeats": {
        "supabase_table": "device_heartbeats",
        "primary_key": "heartbeat_id",
        "ignore_columns": set()
    },
    "device_heartbeats": {
        "supabase_table": "device_heartbeats",
        "primary_key": "heartbeat_id",
        "ignore_columns": set()
    },
    "Hardware_Assignment_Requests": {
        "supabase_table": "hardware_assignment_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "hardware_assignment_requests": {
        "supabase_table": "hardware_assignment_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "Support_Tickets": {
        "supabase_table": "support_tickets",
        "primary_key": "ticket_id",
        "ignore_columns": set()
    },
    "support_tickets": {
        "supabase_table": "support_tickets",
        "primary_key": "ticket_id",
        "ignore_columns": set()
    },
    "Support_Requests": {
        "supabase_table": "support_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "support_requests": {
        "supabase_table": "support_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "Veterinarian_Requests": {
        "supabase_table": "veterinarian_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "veterinarian_requests": {
        "supabase_table": "veterinarian_requests",
        "primary_key": "request_id",
        "ignore_columns": set()
    },
    "environment_readings": {
        "supabase_table": "environment_readings",
        "primary_key": "id",
        "ignore_columns": set()
    },
    "environment_alerts": {
        "supabase_table": "environment_alerts",
        "primary_key": "id",
        "ignore_columns": set()
    },
    "farm_environment_thresholds": {
        "supabase_table": "farm_environment_thresholds",
        "primary_key": "threshold_id",
        "ignore_columns": set()
    },
    "Mortality_Records": {
        "supabase_table": "mortality_records",
        "primary_key": "mortality_id",
        "ignore_columns": set()
    },
    "mortality_records": {
        "supabase_table": "mortality_records",
        "primary_key": "mortality_id",
        "ignore_columns": set()
    },
    "Vaccinations": {
        "supabase_table": "vaccinations",
        "primary_key": "vaccination_id",
        "ignore_columns": set()
    },
    "vaccinations": {
        "supabase_table": "vaccinations",
        "primary_key": "vaccination_id",
        "ignore_columns": set()
    },
    "Farmer_Reminders": {
        "supabase_table": "farmer_reminders",
        "primary_key": "reminder_id",
        "ignore_columns": set()
    },
    "farmer_reminders": {
        "supabase_table": "farmer_reminders",
        "primary_key": "reminder_id",
        "ignore_columns": set()
    },
    "telemetry": {
        "supabase_table": "telemetry",
        "primary_key": "telemetry_id",
        "ignore_columns": set()
    }
}

def is_supabase_configured():
    """Checks if Supabase credentials are configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

def serialize_for_json(val):
    """Converts datetimes, Decimals, dates, and bytes to JSON-safe primitives."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, bytes):
        try:
            return val.decode("utf-8")
        except UnicodeDecodeError:
            return val.hex()
    if isinstance(val, dict):
        return {k: serialize_for_json(v) for k, v in val.items()}
    if isinstance(val, list):
        return [serialize_for_json(v) for v in val]
    return val

def sanitize_payload(table_name, payload):
    """Removes sensitive columns and converts types for Supabase REST API."""
    mapping = TABLE_MAPPINGS.get(table_name, {})
    ignore_cols = mapping.get("ignore_columns", set())
    clean = {}
    for k, v in payload.items():
        if k in ignore_cols:
            continue
        clean[k.lower()] = serialize_for_json(v)
    return clean

def generate_idempotency_key(table_name, record_id, operation, payload=None):
    """Generates a deterministic idempotency key for sync retries."""
    raw = f"{table_name}:{record_id}:{operation}"
    if payload:
        payload_str = json.dumps(serialize_for_json(payload), sort_keys=True)
        raw += f":{hashlib.sha256(payload_str.encode()).hexdigest()[:16]}"
    return hashlib.sha256(raw.encode()).hexdigest()[:64]

def execute_supabase_rest(method, endpoint, payload=None, params=None, prefer="return=representation"):
    """
    Executes a REST HTTP request against Supabase PostgREST.
    Returns (True, response_json_or_msg) on success, or (False, error_msg) on failure.
    """
    if not is_supabase_configured():
        return False, "Supabase credentials not configured."

    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        query_str = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{url}?{query_str}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer
    }

    try:
        data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.getcode()
            body_str = resp.read().decode("utf-8")
            if status in (200, 201, 204):
                try:
                    return True, json.loads(body_str) if body_str else {}
                except json.JSONDecodeError:
                    return True, body_str
            return False, f"Supabase status {status}: {body_str}"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else str(e)
        return False, f"Supabase HTTP error {e.code}: {body}"
    except Exception as e:
        return False, f"Supabase network error: {str(e)}"

def sync_record_to_supabase(table_name, record_id, operation, payload=None):
    """
    Directly synchronizes an INSERT, UPDATE, or DELETE operation to Supabase.
    - INSERT: Uses UPSERT (on_conflict=primary_key) so retries never create duplicate rows.
    - UPDATE: Patches the target record matching primary_key.
    - DELETE: Deletes the target record matching primary_key (idempotent if already deleted).
    """
    mapping = TABLE_MAPPINGS.get(table_name)
    if not mapping:
        return False, f"No table mapping found for table '{table_name}'."

    sp_table = mapping["supabase_table"]
    pk_col = mapping["primary_key"]

    if operation == "INSERT":
        if not payload:
            rows = executeQuery(f"SELECT * FROM `{table_name}` WHERE `{pk_col}` = %s", (record_id,))
            if rows:
                payload = rows[0]
            else:
                return False, f"Record {record_id} not found in MySQL for INSERT sync."
        clean_payload = sanitize_payload(table_name, payload)
        # Use Supabase REST UPSERT with resolution=merge-duplicates for idempotency
        params = {"on_conflict": pk_col}
        prefer = "resolution=merge-duplicates,return=representation"
        return execute_supabase_rest("POST", sp_table, payload=clean_payload, params=params, prefer=prefer)

    elif operation == "UPDATE":
        if not payload:
            rows = executeQuery(f"SELECT * FROM `{table_name}` WHERE `{pk_col}` = %s", (record_id,))
            if rows:
                payload = rows[0]
            else:
                return False, f"Record {record_id} not found in MySQL for UPDATE sync."
        clean_payload = sanitize_payload(table_name, payload)
        # Remove PK from update body if present to avoid updating primary key itself
        clean_payload.pop(pk_col.lower(), None)
        params = {f"{pk_col}": f"eq.{record_id}"}
        return execute_supabase_rest("PATCH", sp_table, payload=clean_payload, params=params)

    elif operation == "DELETE":
        params = {f"{pk_col}": f"eq.{record_id}"}
        ok, res = execute_supabase_rest("DELETE", sp_table, params=params)
        # In PostgREST, deleting a non-existent row returns 200/204 with [] which is idempotent success
        return ok, res

    return False, f"Unsupported operation '{operation}'."

def enqueue_sync(table_name, record_id, operation, payload=None, cur=None):
    """
    Inserts an outbox record into MySQL's sync_queue.
    If cur is provided, writes within the active transaction so the change and sync entry commit together.
    Returns the idempotency_key.
    """
    idem_key = generate_idempotency_key(table_name, record_id, operation, payload)
    json_payload = json.dumps(serialize_for_json(payload)) if payload else None

    query = """
        INSERT INTO sync_queue (table_name, record_id, operation, payload, status, idempotency_key)
        VALUES (%s, %s, %s, %s, 'pending', %s)
        ON DUPLICATE KEY UPDATE
            payload = VALUES(payload),
            status = 'pending',
            next_retry_at = NULL,
            error_message = NULL
    """
    params = (table_name, str(record_id), operation, json_payload, idem_key)

    if cur:
        cur.execute(query, params)
    else:
        executeQuery(query, params)

    return idem_key

def sync_and_outbox(table_name, record_id, operation, payload=None, cur=None):
    """
    Enqueues the operation to MySQL sync_queue, then attempts immediate sync to Supabase.
    If immediate sync succeeds, marks queue completed.
    If immediate sync fails or is unavailable, records error and schedules retry via exponential backoff.
    Never raises an error to the caller, ensuring MySQL application changes always succeed.
    """
    idem_key = enqueue_sync(table_name, record_id, operation, payload, cur=cur)

    # If cur is active, we cannot do immediate network sync yet because transaction is uncommitted.
    # The background worker will pick it up after commit.
    if cur is not None:
        return {"queued": True, "idempotency_key": idem_key, "synced": False}

    # Otherwise transaction is already committed, attempt immediate sync
    ok, res_or_err = sync_record_to_supabase(table_name, record_id, operation, payload)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    if ok:
        try:
            executeQuery(
                "UPDATE sync_queue SET status='completed', last_attempt_at=%s, error_message=NULL WHERE idempotency_key=%s",
                (now_str, idem_key)
            )
        except Exception:
            pass
        return {"queued": True, "idempotency_key": idem_key, "synced": True}
    else:
        # Schedule first retry in 15 seconds
        retry_time = datetime.fromtimestamp(time.time() + 15).strftime("%Y-%m-%d %H:%M:%S")
        try:
            executeQuery(
                "UPDATE sync_queue SET status='pending', attempts=1, last_attempt_at=%s, next_retry_at=%s, error_message=%s WHERE idempotency_key=%s",
                (now_str, retry_time, str(res_or_err)[:500], idem_key)
            )
        except Exception:
            pass
        return {"queued": True, "idempotency_key": idem_key, "synced": False, "error": res_or_err}

def process_pending_sync_queue(batch_size=20, max_attempts=5):
    """
    Processes pending or retryable sync_queue entries with exponential backoff.
    Idempotent and resilient to crashes.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    query = """
        SELECT id, table_name, record_id, operation, payload, attempts, idempotency_key
        FROM sync_queue
        WHERE (status = 'pending' OR (status = 'failed' AND attempts < %s))
          AND (next_retry_at IS NULL OR next_retry_at <= %s)
        ORDER BY id ASC
        LIMIT %s
    """
    items = executeQuery(query, (max_attempts, now_str, batch_size))
    if not items:
        return 0

    processed_count = 0
    for item in items:
        qid = item["id"]
        table = item["table_name"]
        rec_id = item["record_id"]
        op = item["operation"]
        attempts = item["attempts"] + 1

        payload = None
        if item.get("payload"):
            try:
                payload = json.loads(item["payload"]) if isinstance(item["payload"], str) else item["payload"]
            except Exception:
                payload = None

        ok, res_or_err = sync_record_to_supabase(table, rec_id, op, payload)
        now_dt = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        if ok:
            executeQuery(
                "UPDATE sync_queue SET status='completed', last_attempt_at=%s, attempts=%s, error_message=NULL WHERE id=%s",
                (now_dt, attempts, qid)
            )
            processed_count += 1
        else:
            if attempts >= max_attempts:
                new_status = "failed"
                next_retry = None
            else:
                new_status = "pending"
                # Exponential backoff: 15s, 30s, 60s, 120s...
                delay_sec = min(15 * (2 ** (attempts - 1)), 600)
                next_retry = datetime.fromtimestamp(time.time() + delay_sec).strftime("%Y-%m-%d %H:%M:%S")

            executeQuery(
                "UPDATE sync_queue SET status=%s, attempts=%s, last_attempt_at=%s, next_retry_at=%s, error_message=%s WHERE id=%s",
                (new_status, attempts, now_dt, next_retry, str(res_or_err)[:500], qid)
            )

    return processed_count

class SyncQueueWorker(threading.Thread):
    """Background daemon thread to periodically process the sync queue."""
    def __init__(self, interval_seconds=10):
        super().__init__(daemon=True)
        self.interval_seconds = interval_seconds
        self.running = True

    def run(self):
        while self.running:
            try:
                process_pending_sync_queue()
            except Exception as e:
                # Do not crash the background worker thread
                pass
            time.sleep(self.interval_seconds)

    def stop(self):
        self.running = False

_worker_instance = None

def start_sync_worker():
    """Starts the singleton sync queue worker if not already running."""
    global _worker_instance
    if _worker_instance is None or not _worker_instance.is_alive():
        _worker_instance = SyncQueueWorker(interval_seconds=10)
        _worker_instance.start()
    return _worker_instance
