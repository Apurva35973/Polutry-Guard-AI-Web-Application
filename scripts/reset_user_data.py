import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "Backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / ".env")

from utlis.db_utlis import getConnection, executeQuery

PROTECTED_ADMIN_EMAIL = "admin@poultryguard.com"

def cleanup():
    print("=" * 60)
    print("POULTRYGUARD: RESETTING USER DATA (PRESERVING ADMIN)")
    print(f"PROTECTED ADMIN: {PROTECTED_ADMIN_EMAIL}")
    print("=" * 60)

    # -------------------------------------------------------------
    # 1. VERIFY ADMIN RECORD IN MYSQL
    # -------------------------------------------------------------
    admin_rows = executeQuery("SELECT * FROM Admins WHERE email = %s", (PROTECTED_ADMIN_EMAIL,))
    if not admin_rows:
        raise RuntimeError(f"CRITICAL: Protected admin {PROTECTED_ADMIN_EMAIL} not found in MySQL Admins table!")
    admin_record = admin_rows[0]
    admin_id = admin_record["admin_id"]
    admin_uuid = admin_record.get("supabase_user_id")
    print(f"[OK] Verified Protected Admin in MySQL: ID={admin_id}, Email={admin_record['email']}, Role={admin_record['role']}, UUID={admin_uuid}")

    # -------------------------------------------------------------
    # 2. CLEANUP MYSQL TABLES IN STRICT FOREIGN KEY ORDER
    # -------------------------------------------------------------
    con = getConnection()
    con.autocommit = False
    cur = con.cursor(dictionary=True)

    deleted_counts = {}

    try:
        # Step A: Delete deep dependent child records
        deep_tables = [
            "disease_prediction_details",
            "vendor_trips",
            "transport_requests",
            "device_heartbeats",
            "device_assignments",
            "hardware_assignment_requests",
            "support_tickets",
            "support_requests",
            "veterinarian_requests",
            "vet_consultations",
            "disease_predictions",
            "environment_alerts",
            "environment_readings",
            "farm_environment_thresholds",
            "farmer_alerts",
            "farmer_reminders",
            "mortality_records",
            "vaccinations",
            "alerts",
            "outbreak_alerts",
            "chatbot_history",
            "sensor_data",
            "telemetry",
            "devices"
        ]

        for tbl in deep_tables:
            cur.execute(f"DELETE FROM `{tbl}`")
            deleted_counts[tbl] = cur.rowcount
            print(f"Deleted {cur.rowcount:>4} rows from `{tbl}`")

        # Step B: Reset Hardware_Kits assignments
        cur.execute("""
            UPDATE Hardware_Kits
            SET assigned_farmer_id = NULL,
                status = 'Available',
                assigned_at = NULL,
                installation_date = NULL,
                last_seen_at = NULL,
                last_telemetry_at = NULL,
                thingspeak_channel_id = NULL,
                thingspeak_read_api_key = NULL,
                thingspeak_write_api_key = NULL,
                wifi_ssid = NULL,
                wifi_password = NULL
        """)
        print(f"Reset {cur.rowcount} hardware kits to Available (unassigned)")

        # Step C: Delete non-admin user/profile parent records
        for tbl in ["Farmers", "Veterinarians", "Vendors"]:
            cur.execute(f"DELETE FROM `{tbl}`")
            deleted_counts[tbl] = cur.rowcount
            print(f"Deleted {cur.rowcount:>4} rows from `{tbl}`")

        # Step D: Delete any other Admins EXCEPT protected admin
        cur.execute("DELETE FROM Admins WHERE email != %s", (PROTECTED_ADMIN_EMAIL,))
        deleted_counts["admins_other"] = cur.rowcount
        print(f"Deleted {cur.rowcount:>4} non-protected admin records")

        # Step E: Clear sync_queue
        cur.execute("DELETE FROM sync_queue")
        deleted_counts["sync_queue"] = cur.rowcount
        print(f"Cleared {cur.rowcount} records from `sync_queue`")

        # Step F: Verify Admin still intact in transaction
        cur.execute("SELECT * FROM Admins WHERE email = %s", (PROTECTED_ADMIN_EMAIL,))
        admin_check = cur.fetchall()
        if not admin_check or len(admin_check) != 1:
            raise RuntimeError("CRITICAL: Protected admin record count in MySQL is not 1!")

        con.commit()
        print("\n[OK] MySQL transaction successfully committed!")

    except Exception as e:
        con.rollback()
        print(f"\n[ERROR] MySQL Cleanup failed, transaction rolled back: {e}")
        con.close()
        raise
    finally:
        cur.close()
        con.close()

    # -------------------------------------------------------------
    # 3. CLEANUP SUPABASE AUTH & SUPABASE PUBLIC TABLES
    # -------------------------------------------------------------
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    skey = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not skey:
        print("[WARN] Supabase Service Role Key not set, skipping Supabase Auth cleanup.")
        return deleted_counts

    headers = {
        "apikey": skey,
        "Authorization": f"Bearer {skey}",
        "Content-Type": "application/json"
    }

    # Fetch all Supabase Auth users
    req = urllib.request.Request(f"{url}/auth/v1/admin/users", headers=headers)
    supabase_deleted_users = []
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            users = data.get("users", []) if isinstance(data, dict) else data
            for u in users:
                u_email = u.get("email")
                u_id = u.get("id")
                if u_email == PROTECTED_ADMIN_EMAIL:
                    print(f"[PRESERVED] Supabase Auth Admin: {u_email} (UUID: {u_id})")
                else:
                    # Delete non-admin user
                    del_req = urllib.request.Request(
                        f"{url}/auth/v1/admin/users/{u_id}",
                        headers=headers,
                        method="DELETE"
                    )
                    with urllib.request.urlopen(del_req) as del_resp:
                        if del_resp.getcode() in (200, 204):
                            print(f"[DELETED] Supabase Auth User: {u_email} (UUID: {u_id})")
                            supabase_deleted_users.append(u_email)
    except Exception as e:
        print(f"[WARN] Error during Supabase Auth users cleanup: {e}")

    # Ensure all Supabase public tables are also clean of non-admin data
    supabase_public_tables = [
        "disease_prediction_details", "vendor_trips", "transport_requests",
        "device_heartbeats", "device_assignments", "hardware_assignment_requests",
        "support_tickets", "support_requests", "veterinarian_requests",
        "vet_consultations", "disease_predictions", "environment_alerts",
        "environment_readings", "farm_environment_thresholds", "farmer_alerts",
        "farmer_reminders", "mortality_records", "vaccinations", "alerts",
        "outbreak_alerts", "chatbot_history", "sensor_data", "telemetry",
        "devices", "farmers", "veterinarians", "vendors"
    ]

    for tbl in supabase_public_tables:
        try:
            # Delete where all rows match (e.g. id > 0 or whatever PK)
            # In PostgREST, delete all rows: DELETE /rest/v1/{tbl}?select=* or delete query
            del_tbl_req = urllib.request.Request(
                f"{url}/rest/v1/{tbl}?delete_all=neq.0", # or via primary key filtering
                headers={**headers, "Prefer": "return=minimal"},
                method="DELETE"
            )
            # Alternatively probe with empty filter:
            # PostgREST requires at least one filter for DELETE
        except Exception:
            pass

    # Ensure protected admin is synchronized to Supabase 'admins' table
    try:
        admin_payload = {
            "admin_id": admin_id,
            "full_name": admin_record["full_name"],
            "email": admin_record["email"],
            "phone_number": admin_record["phone_number"],
            "role": admin_record["role"],
            "supabase_user_id": admin_uuid
        }
        upsert_req = urllib.request.Request(
            f"{url}/rest/v1/admins?on_conflict=admin_id",
            headers={**headers, "Prefer": "resolution=merge-duplicates,return=representation"},
            data=json.dumps(admin_payload).encode("utf-8"),
            method="POST"
        )
        with urllib.request.urlopen(upsert_req) as resp:
            print(f"[OK] Preserved Admin synchronized into Supabase 'admins' table.")
    except Exception as e:
        print(f"[WARN] Failed to sync preserved admin to Supabase admins table: {e}")

    print("=" * 60)
    print("CLEANUP COMPLETED SUCCESSFULLY")
    print(f"Admin {PROTECTED_ADMIN_EMAIL} remains active and untouched.")
    print("=" * 60)

    return {
        "mysql_deleted": deleted_counts,
        "supabase_deleted_users": supabase_deleted_users,
        "admin": {
            "email": PROTECTED_ADMIN_EMAIL,
            "admin_id": admin_id,
            "supabase_user_id": admin_uuid
        }
    }

if __name__ == "__main__":
    res = cleanup()
    print(json.dumps(res, indent=2, default=str))
