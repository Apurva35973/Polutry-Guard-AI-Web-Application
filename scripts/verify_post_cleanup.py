import os
import sys
import json
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "Backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / ".env")

from utlis.db_utlis import executeQuery
from app import create_app

def verify():
    print("=" * 60)
    print("POST-CLEANUP VERIFICATION")
    print("=" * 60)

    # 1. Verify MySQL Admin
    admins = executeQuery("SELECT * FROM Admins")
    print(f"1. MySQL Admins Count: {len(admins)}")
    assert len(admins) == 1, "Expected exactly 1 admin in MySQL"
    admin = admins[0]
    print(f"   Admin: {admin['email']} | Role: {admin['role']} | UUID: {admin['supabase_user_id']}")
    assert admin["email"] == "admin@poultryguard.com"
    assert admin["supabase_user_id"] == "0a728a10-72b3-48bb-8725-7e6426bac85c"

    # 2. Verify all other MySQL user tables are empty
    farmers = executeQuery("SELECT COUNT(*) as c FROM Farmers")[0]["c"]
    vets = executeQuery("SELECT COUNT(*) as c FROM Veterinarians")[0]["c"]
    vendors = executeQuery("SELECT COUNT(*) as c FROM Vendors")[0]["c"]
    print(f"2. User Tables: Farmers={farmers}, Vets={vets}, Vendors={vendors}")
    assert farmers == 0 and vets == 0 and vendors == 0

    # 3. Verify dependent child tables in MySQL are empty
    deps = ["devices", "device_assignments", "hardware_assignment_requests", "telemetry",
            "environment_readings", "environment_alerts", "disease_predictions",
            "mortality_records", "farmer_alerts", "vet_consultations", "sync_queue"]
    dep_counts = {t: executeQuery(f"SELECT COUNT(*) as c FROM `{t}`")[0]["c"] for t in deps}
    print("3. Dependent Tables Counts:")
    for t, c in dep_counts.items():
        print(f"   {t:<32}: {c}")
        assert c == 0, f"Expected {t} to be empty, found {c}"

    # 4. Verify Hardware Kits are reset to Available
    kits = executeQuery("SELECT COUNT(*) as c FROM Hardware_Kits WHERE status = 'Available' AND assigned_farmer_id IS NULL")[0]["c"]
    total_kits = executeQuery("SELECT COUNT(*) as c FROM Hardware_Kits")[0]["c"]
    print(f"4. Hardware Kits: Total={total_kits}, Unassigned Available={kits}")
    assert kits == total_kits

    # 5. Verify Supabase Auth Users
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    skey = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": skey, "Authorization": f"Bearer {skey}"}
    req = urllib.request.Request(f"{url}/auth/v1/admin/users", headers=headers)
    with urllib.request.urlopen(req) as resp:
        users = json.loads(resp.read().decode()).get("users", [])
    print(f"5. Supabase Auth Users Count: {len(users)}")
    assert len(users) == 1, "Expected exactly 1 user in Supabase Auth"
    sp_admin = users[0]
    print(f"   Supabase Auth User: {sp_admin['email']} | UUID: {sp_admin['id']}")
    assert sp_admin["email"] == "admin@poultryguard.com"
    assert sp_admin["id"] == "0a728a10-72b3-48bb-8725-7e6426bac85c"

    # 6. Verify Supabase Public admins Table
    req = urllib.request.Request(f"{url}/rest/v1/admins?select=*", headers=headers)
    with urllib.request.urlopen(req) as resp:
        sp_admins = json.loads(resp.read().decode())
    print(f"6. Supabase Public Admins Table: {len(sp_admins)} record(s)")
    assert len(sp_admins) == 1
    assert sp_admins[0]["email"] == "admin@poultryguard.com"

    # 7. Verify Flask API Admin Authorization
    app = create_app()
    client = app.test_client()
    from flask_jwt_extended import create_access_token
    with app.app_context():
        token = create_access_token(
            identity="admin@poultryguard.com",
            additional_claims={"role": "Admin", "user_id": 1, "supabase_user_id": sp_admin["id"]}
        )
    dash_res = client.get("/admin/farmers/all", headers={"Authorization": f"Bearer {token}"})
    print(f"7. Admin API test (/admin/farmers/all): HTTP {dash_res.status_code}")
    dash_data = dash_res.get_json()
    assert dash_data["status"] == "success"
    assert dash_data["data"] == [] # 0 farmers returned cleanly

    print("=" * 60)
    print("ALL 14 POST-CLEANUP VERIFICATIONS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    verify()
