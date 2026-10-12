import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ==============================================================================
# Supabase Configuration
# ==============================================================================
# Base REST API: https://uhgbahpyfzbficruiaos.supabase.co/rest/v1/
raw_url = os.environ.get("SUPABASE_URL", "https://uhgbahpyfzbficruiaos.supabase.co").strip().rstrip("/")
if raw_url.endswith("/rest/v1"):
    raw_url = raw_url[:-8].rstrip("/")

SUPABASE_REST_URL = f"{raw_url}/rest/v1"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")).strip()

# Sample poultry telemetry data to send
poultry_data = {
    "device_id": "sensor_node_01",
    "temperature_celsius": 26.8,
    "humidity_percentage": 65,
    "chicken_count_detected": 14,
    "status": "Optimal",
    "timestamp": datetime.now(timezone.utc).isoformat()
}

def send_poultry_data_to_supabase(data, table_name="poultry_logs"):
    """
    Sends data to Supabase REST endpoint:
    {SUPABASE_REST_URL}/{table_name}
    """
    if not SUPABASE_KEY:
        print("[WARN] SUPABASE_KEY is not set in environment or config.")
        print("Please configure SUPABASE_KEY in .env or your environment variables.")

    url = f"{SUPABASE_REST_URL}/{table_name}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    try:
        data_bytes = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            status_code = resp.getcode()
            res_body = resp.read().decode("utf-8")
            if status_code in (200, 201):
                print(f"[SUCCESS] Data sent to Supabase table '{table_name}'.")
                print(f"Response: {res_body}")
                return True
            print(f"[WARN] Supabase responded with status {status_code}: {res_body}")
            return False
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        print(f"[ERROR] Supabase HTTP error {e.code}: {err_body}")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to connect to Supabase: {e}")
        return False

if __name__ == "__main__":
    print(f"[INFO] Supabase REST API endpoint: {SUPABASE_REST_URL}")
    send_poultry_data_to_supabase(poultry_data)
