import os
import json
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from utlis.db_utlis import executeQuery

DEFAULT_SUPABASE_URL = "https://uhgbahpyfzbficruiaos.supabase.co"
DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ2JhaHB5ZnpiZmljcnVpYW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDI2OTksImV4cCI6MjEwMjM3ODY5OX0.WUyoydq4uOEpgH70OXMGc8Gre7tPmtEayCMPw8_-Z7U"
DEFAULT_SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ2JhaHB5ZnpiZmljcnVpYW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjY5OSwiZXhwIjoyMTAyMzc4Njk5fQ.urUYa06pdUN5oMaQ4H3KRSFafFWccFF5JvIR2zGq3vs"

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or DEFAULT_SUPABASE_URL).strip().rstrip("/")
if SUPABASE_URL.endswith("/rest/v1"):
    SUPABASE_URL = SUPABASE_URL[:-8].rstrip("/")

def _is_jwt(k):
    return bool(k and str(k).strip().startswith("eyJ"))

raw_anon = os.environ.get("SUPABASE_ANON_KEY", "").strip()
raw_key = os.environ.get("SUPABASE_KEY", "").strip()
raw_service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

SUPABASE_ANON_KEY = (
    raw_anon if _is_jwt(raw_anon) else (
        raw_key if _is_jwt(raw_key) else DEFAULT_SUPABASE_ANON_KEY
    )
)

SUPABASE_SERVICE_ROLE_KEY = (
    raw_service if _is_jwt(raw_service) else (
        raw_key if _is_jwt(raw_key) else DEFAULT_SUPABASE_SERVICE_ROLE_KEY
    )
)

def verify_supabase_jwt(access_token):
    """
    Validates a Supabase access token (JWT) using the Supabase GoTrue Auth API.
    Returns (True, user_data) on success, or (False, error_msg) on failure.
    user_data contains 'id' (Supabase Auth UUID), 'email', 'app_metadata', etc.
    """
    if not access_token:
        return False, "Access token missing."

    url = f"{SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}"
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.getcode() == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return True, data
            return False, f"Supabase Auth returned status {resp.getcode()}"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else str(e)
        try:
            err_json = json.loads(body)
            msg = err_json.get("msg") or err_json.get("error_description") or err_json.get("message") or body
        except Exception:
            msg = body
        return False, f"Invalid or expired Supabase token: {msg}"
    except Exception as e:
        return False, f"Error verifying Supabase token: {str(e)}"

def supabase_sign_in_with_password(email, password):
    """
    Signs in a user directly with Supabase Auth using email and password.
    Returns (True, session_data) on success, or (False, error_msg) on failure.
    """
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.getcode() == 200:
                return True, json.loads(resp.read().decode("utf-8"))
            return False, "Failed to authenticate with Supabase"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else str(e)
        try:
            err_json = json.loads(body)
            msg = err_json.get("msg") or err_json.get("error_description") or err_json.get("message") or body
        except Exception:
            msg = body
        return False, msg
    except Exception as e:
        return False, f"Supabase authentication connection error: {str(e)}"

def supabase_sign_up(email, password, user_metadata=None):
    """
    Registers a new user in Supabase Auth.
    Returns (True, auth_data) on success, or (False, error_msg) on failure.
    """
    url = f"{SUPABASE_URL}/auth/v1/signup"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    body_data = {"email": email, "password": password}
    if user_metadata:
        body_data["data"] = user_metadata
    payload = json.dumps(body_data).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.getcode() in (200, 201):
                return True, json.loads(resp.read().decode("utf-8"))
            return False, "Failed to register user in Supabase"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else str(e)
        try:
            err_json = json.loads(body)
            msg = err_json.get("msg") or err_json.get("error_description") or err_json.get("message") or body
        except Exception:
            msg = body
        return False, msg
    except Exception as e:
        return False, f"Supabase registration connection error: {str(e)}"

def supabase_admin_create_user(email, password, user_metadata=None):
    """
    Creates and immediately confirms a user via Supabase GoTrue Admin API.
    Bypasses public signup email rate limits and sets email_confirm=True.
    Returns (True, user_data) or (False, error_msg).
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        return False, "SUPABASE_SERVICE_ROLE_KEY is not configured."

    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    body_data = {
        "email": email,
        "password": password,
        "email_confirm": True
    }
    if user_metadata:
        body_data["user_metadata"] = user_metadata
    payload = json.dumps(body_data).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.getcode() in (200, 201):
                return True, json.loads(resp.read().decode("utf-8"))
            return False, f"Admin API returned {resp.getcode()}"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else str(e)
        try:
            err_json = json.loads(body)
            msg = err_json.get("msg") or err_json.get("error_description") or err_json.get("message") or body
        except Exception:
            msg = body
        return False, msg
    except Exception as e:
        return False, f"Admin user creation connection error: {str(e)}"

def supabase_admin_set_password(supabase_user_id, password):
    """
    Updates a user's password and ensures email_confirm=True via Supabase Admin API.
    """
    if not SUPABASE_SERVICE_ROLE_KEY or not supabase_user_id:
        return False, "Missing credentials or user ID."

    url = f"{SUPABASE_URL}/auth/v1/admin/users/{supabase_user_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    body_data = {
        "password": password,
        "email_confirm": True
    }
    payload = json.dumps(body_data).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="PUT")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.getcode() == 200:
                return True, json.loads(resp.read().decode("utf-8"))
            return False, f"Admin update returned {resp.getcode()}"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else str(e)
        return False, body
    except Exception as e:
        return False, str(e)

def supabase_admin_get_user_by_email(email):
    """
    Finds a user in Supabase Auth by email using the Admin API.
    Returns (True, user_dict) or (False, None).
    """
    if not SUPABASE_SERVICE_ROLE_KEY or not email:
        return False, None

    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.getcode() == 200:
                data = json.loads(resp.read().decode("utf-8"))
                users = data.get("users", [])
                target = str(email).strip().lower()
                for u in users:
                    if str(u.get("email", "")).strip().lower() == target:
                        return True, u
        return False, None
    except Exception:
        return False, None

def _resolve_from_mysql(supabase_user_id, email=None):
    """Query MySQL database for user profile and role."""
    # 1. ADMIN
    if supabase_user_id:
        rows = executeQuery(
            "SELECT admin_id as id, full_name, email, phone_number, password_hash, role, supabase_user_id, 'Admin' as role_type FROM Admins WHERE supabase_user_id = %s",
            (supabase_user_id,)
        )
        if rows:
            user = rows[0]
            user["role"] = "Admin"
            return user, "Admin"

    if email:
        rows = executeQuery(
            "SELECT admin_id as id, full_name, email, phone_number, password_hash, role, supabase_user_id, 'Admin' as role_type FROM Admins WHERE email = %s",
            (email,)
        )
        if rows:
            user = rows[0]
            user["role"] = "Admin"
            if supabase_user_id and not user.get("supabase_user_id"):
                try:
                    executeQuery("UPDATE Admins SET supabase_user_id = %s WHERE admin_id = %s", (supabase_user_id, user["id"]))
                except Exception:
                    pass
                user["supabase_user_id"] = supabase_user_id
            return user, "Admin"

    # 2. FARMER
    if supabase_user_id:
        rows = executeQuery(
            """SELECT farmer_id as id, full_name, email, phone_number, password_hash, farm_name, farm_type,
                      address, latitude, longitude, total_birds, breed, wifi_ssid, status, supabase_user_id, 'Farmer' as role
               FROM Farmers WHERE supabase_user_id = %s""",
            (supabase_user_id,)
        )
        if rows:
            user = rows[0]
            profile_fields = ("farm_name", "farm_type", "address", "latitude", "longitude")
            user["profile_completed"] = all(
                user.get(field) is not None and str(user[field]).strip() != ""
                for field in profile_fields
            )
            return user, "Farmer"

    if email:
        rows = executeQuery(
            """SELECT farmer_id as id, full_name, email, phone_number, password_hash, farm_name, farm_type,
                      address, latitude, longitude, total_birds, breed, wifi_ssid, status, supabase_user_id, 'Farmer' as role
               FROM Farmers WHERE email = %s""",
            (email,)
        )
        if rows:
            user = rows[0]
            profile_fields = ("farm_name", "farm_type", "address", "latitude", "longitude")
            user["profile_completed"] = all(
                user.get(field) is not None and str(user[field]).strip() != ""
                for field in profile_fields
            )
            if supabase_user_id and not user.get("supabase_user_id"):
                try:
                    executeQuery("UPDATE Farmers SET supabase_user_id = %s WHERE farmer_id = %s", (supabase_user_id, user["id"]))
                except Exception:
                    pass
                user["supabase_user_id"] = supabase_user_id
            return user, "Farmer"

    # 3. VETERINARIAN
    if supabase_user_id:
        rows = executeQuery(
            """SELECT vet_id as id, full_name, email, phone_number, password_hash, specialization, license_number,
                      experience_years, hospital_clinic, verification_status, certificate_url, status, supabase_user_id, 'Veterinarian' as role
               FROM Veterinarians WHERE supabase_user_id = %s""",
            (supabase_user_id,)
        )
        if rows:
            user = rows[0]
            profile_fields = ("specialization", "license_number", "experience_years", "hospital_clinic")
            user["profile_completed"] = all(
                user.get(field) is not None and str(user[field]).strip() != ""
                for field in profile_fields
            )
            return user, "Veterinarian"

    if email:
        rows = executeQuery(
            """SELECT vet_id as id, full_name, email, phone_number, password_hash, specialization, license_number,
                      experience_years, hospital_clinic, verification_status, certificate_url, status, supabase_user_id, 'Veterinarian' as role
               FROM Veterinarians WHERE email = %s""",
            (email,)
        )
        if rows:
            user = rows[0]
            profile_fields = ("specialization", "license_number", "experience_years", "hospital_clinic")
            user["profile_completed"] = all(
                user.get(field) is not None and str(user[field]).strip() != ""
                for field in profile_fields
            )
            if supabase_user_id and not user.get("supabase_user_id"):
                try:
                    executeQuery("UPDATE Veterinarians SET supabase_user_id = %s WHERE vet_id = %s", (supabase_user_id, user["id"]))
                except Exception:
                    pass
                user["supabase_user_id"] = supabase_user_id
            return user, "Veterinarian"

    # 4. VENDOR
    if supabase_user_id:
        rows = executeQuery(
            """SELECT vendor_id as id, full_name, email, phone_number, password_hash, business_name, vendor_type,
                      address, latitude, longitude, status, supabase_user_id, 'Vendor' as role
               FROM Vendors WHERE supabase_user_id = %s""",
            (supabase_user_id,)
        )
        if rows:
            return rows[0], "Vendor"

    if email:
        rows = executeQuery(
            """SELECT vendor_id as id, full_name, email, phone_number, password_hash, business_name, vendor_type,
                      address, latitude, longitude, status, supabase_user_id, 'Vendor' as role
               FROM Vendors WHERE email = %s""",
            (email,)
        )
        if rows:
            user = rows[0]
            if supabase_user_id and not user.get("supabase_user_id"):
                try:
                    executeQuery("UPDATE Vendors SET supabase_user_id = %s WHERE vendor_id = %s", (supabase_user_id, user["id"]))
                except Exception:
                    pass
                user["supabase_user_id"] = supabase_user_id
            return user, "Vendor"

    return None, None


def _resolve_from_supabase_rest(supabase_user_id, email=None):
    """
    Fallback resolver that queries Supabase PostgREST tables when MySQL is unavailable.
    """
    from services.sync_service import execute_supabase_rest

    target_email = str(email).strip().lower() if email else None

    # 1. ADMIN
    if supabase_user_id:
        ok, rows = execute_supabase_rest("GET", f"admins?auth_user_id=eq.{supabase_user_id}")
        if ok and rows:
            u = rows[0]
            return {
                "id": u.get("admin_id"),
                "full_name": u.get("full_name") or "Admin User",
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "role": "Admin",
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
            }, "Admin"

    if target_email:
        ok, rows = execute_supabase_rest("GET", f"admins?email=eq.{target_email}")
        if ok and rows:
            u = rows[0]
            return {
                "id": u.get("admin_id"),
                "full_name": u.get("full_name") or "Admin User",
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "role": "Admin",
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
            }, "Admin"

    # 2. FARMER
    if supabase_user_id:
        ok, rows = execute_supabase_rest("GET", f"farmers?auth_user_id=eq.{supabase_user_id}")
        if ok and rows:
            u = rows[0]
            profile_fields = ("farm_name", "farm_type", "address", "latitude", "longitude")
            profile_completed = all(u.get(f) is not None and str(u[f]).strip() != "" for f in profile_fields)
            return {
                "id": u.get("farmer_id"),
                "full_name": u.get("full_name"),
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "farm_name": u.get("farm_name"),
                "farm_type": u.get("farm_type"),
                "address": u.get("address"),
                "latitude": u.get("latitude"),
                "longitude": u.get("longitude"),
                "total_birds": u.get("total_birds", 0),
                "status": u.get("status", "Active"),
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
                "role": "Farmer",
                "profile_completed": profile_completed,
            }, "Farmer"

    if target_email:
        ok, rows = execute_supabase_rest("GET", f"farmers?email=eq.{target_email}")
        if ok and rows:
            u = rows[0]
            profile_fields = ("farm_name", "farm_type", "address", "latitude", "longitude")
            profile_completed = all(u.get(f) is not None and str(u[f]).strip() != "" for f in profile_fields)
            return {
                "id": u.get("farmer_id"),
                "full_name": u.get("full_name"),
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "farm_name": u.get("farm_name"),
                "farm_type": u.get("farm_type"),
                "address": u.get("address"),
                "latitude": u.get("latitude"),
                "longitude": u.get("longitude"),
                "total_birds": u.get("total_birds", 0),
                "status": u.get("status", "Active"),
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
                "role": "Farmer",
                "profile_completed": profile_completed,
            }, "Farmer"

    # 3. VETERINARIAN
    if supabase_user_id:
        ok, rows = execute_supabase_rest("GET", f"veterinarians?auth_user_id=eq.{supabase_user_id}")
        if ok and rows:
            u = rows[0]
            profile_fields = ("specialization", "license_number", "experience_years", "hospital_clinic")
            profile_completed = all(u.get(f) is not None and str(u[f]).strip() != "" for f in profile_fields)
            return {
                "id": u.get("vet_id"),
                "full_name": u.get("full_name"),
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "specialization": u.get("specialization"),
                "license_number": u.get("license_number"),
                "experience_years": u.get("experience_years"),
                "hospital_clinic": u.get("hospital_clinic"),
                "verification_status": u.get("verification_status") or "Approved",
                "status": u.get("status", "Available"),
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
                "role": "Veterinarian",
                "profile_completed": profile_completed,
            }, "Veterinarian"

    if target_email:
        ok, rows = execute_supabase_rest("GET", f"veterinarians?email=eq.{target_email}")
        if ok and rows:
            u = rows[0]
            profile_fields = ("specialization", "license_number", "experience_years", "hospital_clinic")
            profile_completed = all(u.get(f) is not None and str(u[f]).strip() != "" for f in profile_fields)
            return {
                "id": u.get("vet_id"),
                "full_name": u.get("full_name"),
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "specialization": u.get("specialization"),
                "license_number": u.get("license_number"),
                "experience_years": u.get("experience_years"),
                "hospital_clinic": u.get("hospital_clinic"),
                "verification_status": u.get("verification_status") or "Approved",
                "status": u.get("status", "Available"),
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
                "role": "Veterinarian",
                "profile_completed": profile_completed,
            }, "Veterinarian"

    # 4. VENDOR
    if supabase_user_id:
        ok, rows = execute_supabase_rest("GET", f"vendors?auth_user_id=eq.{supabase_user_id}")
        if ok and rows:
            u = rows[0]
            return {
                "id": u.get("vendor_id"),
                "full_name": u.get("owner_name") or u.get("vendor_name"),
                "business_name": u.get("vendor_name"),
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "status": u.get("status", "Available"),
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
                "role": "Vendor",
            }, "Vendor"

    if target_email:
        ok, rows = execute_supabase_rest("GET", f"vendors?email=eq.{target_email}")
        if ok and rows:
            u = rows[0]
            return {
                "id": u.get("vendor_id"),
                "full_name": u.get("owner_name") or u.get("vendor_name"),
                "business_name": u.get("vendor_name"),
                "email": u.get("email"),
                "phone_number": u.get("phone_number"),
                "status": u.get("status", "Available"),
                "supabase_user_id": u.get("auth_user_id") or supabase_user_id,
                "role": "Vendor",
            }, "Vendor"

    # 5. Fallback to Supabase Auth User Metadata
    if target_email or supabase_user_id:
        found, sp_user = supabase_admin_get_user_by_email(target_email) if target_email else (False, None)
        if found and sp_user:
            meta = sp_user.get("user_metadata") or {}
            role = meta.get("role") or "Farmer"
            return {
                "id": sp_user.get("id"),
                "full_name": meta.get("full_name") or sp_user.get("email", "").split("@")[0],
                "email": sp_user.get("email"),
                "role": role,
                "supabase_user_id": sp_user.get("id"),
                "profile_completed": True,
                "verification_status": "Approved" if role == "Veterinarian" else None,
            }, role

    return None, None


def resolve_user_profile(supabase_user_id, email=None):
    """
    Resolves the application profile and role for a user.
    1. First attempts MySQL database query.
    2. If MySQL fails, errors out, or returns no match, seamlessly falls back
       to Supabase PostgreSQL tables and Supabase Auth metadata.
    Returns (user_profile_dict, role_name) or (None, None).
    """
    try:
        user, role = _resolve_from_mysql(supabase_user_id, email)
        if user:
            return user, role
    except Exception as mysql_err:
        print(f"[WARN] MySQL profile resolution error ({mysql_err}), falling back to Supabase.")

    try:
        return _resolve_from_supabase_rest(supabase_user_id, email)
    except Exception as sup_err:
        print(f"[ERROR] Supabase profile resolution error: {sup_err}")
        return None, None

