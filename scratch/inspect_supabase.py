import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv(".env")
url = os.environ.get("SUPABASE_URL", "").rstrip("/")
skey = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": skey,
    "Authorization": f"Bearer {skey}"
}

print(f"Connecting to Supabase at: {url}")

# 1. Fetch Supabase Auth users
try:
    req = urllib.request.Request(f"{url}/auth/v1/admin/users", headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        users = data.get("users", []) if isinstance(data, dict) else data
        print(f"\n--- Supabase Auth Users (Total: {len(users)}) ---")
        for u in users:
            uid = u.get("id")
            email = u.get("email")
            created_at = u.get("created_at")
            meta = u.get("user_metadata", {})
            print(f"UUID: {uid} | Email: {email} | Role/Meta: {meta} | Created: {created_at}")
except Exception as e:
    print(f"Error fetching auth users: {e}")

# 2. Check all public tables
tables = [
    "farmers", "veterinarians", "admins", "vendors", "devices", "hardware_kits",
    "sensor_data", "disease_predictions", "disease_prediction_details", "vet_consultations",
    "alerts", "farmer_alerts", "outbreak_alerts", "chatbot_history", "transport_requests",
    "vendor_trips", "device_assignments", "device_heartbeats", "hardware_assignment_requests",
    "support_tickets", "support_requests", "veterinarian_requests", "environment_readings",
    "environment_alerts", "farm_environment_thresholds", "mortality_records", "vaccinations",
    "farmer_reminders", "telemetry"
]

print("\n--- Supabase Public Tables Record Counts ---")
counts = {}
rows_by_table = {}
for t in tables:
    try:
        t_req = urllib.request.Request(
            f"{url}/rest/v1/{t}?select=*&limit=1000",
            headers={**headers, "Prefer": "count=exact"}
        )
        with urllib.request.urlopen(t_req) as resp:
            content_range = resp.headers.get("Content-Range", "")
            body = json.loads(resp.read().decode())
            total = len(body)
            if "/" in content_range:
                try:
                    total = int(content_range.split("/")[1])
                except Exception:
                    pass
            counts[t] = total
            rows_by_table[t] = body
            print(f"Table: {t:<28} | Rows: {total}")
            if t == "admins" and body:
                print(f"  -> Admins data: {body}")
    except urllib.error.HTTPError as e:
        print(f"Table: {t:<28} | Error: HTTP {e.code} {e.read().decode()[:80]}")
    except Exception as e:
        print(f"Table: {t:<28} | Error: {e}")

# Write raw inspection to scratch file
os.makedirs("scratch", exist_ok=True)
with open("scratch/supabase_inspection.json", "w") as f:
    json.dump({
        "auth_users": users if 'users' in locals() else [],
        "counts": counts,
        "admins": rows_by_table.get("admins", [])
    }, f, indent=2)
print("\nSaved inspection details to scratch/supabase_inspection.json")
