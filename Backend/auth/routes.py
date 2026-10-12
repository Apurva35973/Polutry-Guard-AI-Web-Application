import os
import uuid
from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from werkzeug.utils import secure_filename

from utlis.response import createResult
from utlis.db_utlis import executeQuery
from passlib.hash import sha256_crypt as crypto
from auth.supabase_auth import (
    verify_supabase_jwt,
    supabase_sign_in_with_password,
    supabase_sign_up,
    supabase_admin_create_user,
    supabase_admin_set_password,
    supabase_admin_get_user_by_email,
    resolve_user_profile
)
from services.sync_service import sync_and_outbox

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/supabase-session", methods=["POST"])
def verify_session():
    """
    Direct endpoint for frontend React to exchange a Supabase access token (JWT)
    for the corresponding application user profile and role.
    """
    data = request.get_json(silent=True) or {}
    access_token = data.get("access_token")
    selected_role = data.get("role")

    if not access_token:
        return createResult("access_token is required", None)

    valid, user_data_or_err = verify_supabase_jwt(access_token)
    if not valid:
        return createResult(user_data_or_err, None)

    supabase_user_id = user_data_or_err.get("id")
    email = user_data_or_err.get("email")

    user, actual_role = resolve_user_profile(supabase_user_id, email)
    if not user:
        return createResult("Account profile not found for this user", None)

    if selected_role:
        clean_selected = str(selected_role).strip().lower()
        clean_actual = str(actual_role).strip().lower()
        if clean_selected != clean_actual:
            return createResult(f"Invalid role selected. This account is registered as {actual_role}.", None)

    if actual_role == "Veterinarian":
        v_status = user.get("verification_status") or "Pending"
        if v_status != "Approved":
            if v_status == "Rejected":
                return createResult("Your veterinarian account has not been approved.", None)
            return createResult("Your veterinarian account is awaiting admin verification.", None)

    jwt_token = create_access_token(
        identity=user["email"],
        additional_claims={
            "role": user["role"],
            "user_id": user["id"],
            "supabase_user_id": user.get("supabase_user_id")
        },
        expires_delta=False
    )

    user["password_hash"] = "****"
    user["token"] = jwt_token
    user["supabase_token"] = access_token

    return createResult(None, user)


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Handles user login powered by Supabase Authentication with resilient local MySQL fallback.
    Accepts:
    1. { "access_token": "...", "role": "..." } from Supabase Auth signIn in React.
    2. Or { "email": "...", "password": "...", "role": "..." } which authenticates
       via Supabase Auth and validates against MySQL records.
    """
    data = request.get_json(silent=True) or {}
    access_token = data.get("access_token")
    selected_role = data.get("role")
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    supabase_user_id = None
    resolved_email = email

    if access_token:
        # Client already authenticated with Supabase Auth
        valid, user_data_or_err = verify_supabase_jwt(access_token)
        if not valid:
            return createResult(user_data_or_err, None)
        supabase_user_id = user_data_or_err.get("id")
        resolved_email = (user_data_or_err.get("email") or "").strip().lower()
    else:
        # Authenticate with Supabase Auth or MySQL password hash
        if not email or not password:
            return createResult("email and password are required", None)

        ok, auth_res = supabase_sign_in_with_password(email, password)
        if ok and isinstance(auth_res, dict):
            access_token = auth_res.get("access_token")
            supabase_user = auth_res.get("user") or {}
            supabase_user_id = supabase_user.get("id")
            resolved_email = (supabase_user.get("email") or email).strip().lower()
        else:
            # Fallback: check profile in MySQL and verify password
            user, actual_role = resolve_user_profile(None, email)
            if not user:
                return createResult("Invalid Email or Password", None)

            stored_hash = user.get("password_hash")
            password_valid = False

            if stored_hash:
                try:
                    password_valid = crypto.verify(password, stored_hash)
                except Exception:
                    password_valid = False
            elif not user.get("supabase_user_id"):
                # Unprovisioned approved account (legacy registration bug where password_hash was omitted)
                if actual_role == "Veterinarian":
                    v_stat = user.get("verification_status") or "Pending"
                    if v_stat != "Approved":
                        if v_stat == "Rejected":
                            return createResult("Your veterinarian account has not been approved.", None)
                        return createResult("Your veterinarian account is awaiting admin verification.", None)
                password_valid = True

            if not password_valid:
                return createResult("Invalid Email or Password", None)

            # Password is valid; ensure password_hash and Supabase user are synced
            table_name = "Veterinarians" if actual_role == "Veterinarian" else ("Farmers" if actual_role == "Farmer" else ("Vendors" if actual_role == "Vendor" else "Admins"))
            pk_col = "vet_id" if actual_role == "Veterinarian" else ("farmer_id" if actual_role == "Farmer" else ("vendor_id" if actual_role == "Vendor" else "admin_id"))

            if not stored_hash:
                new_hash = crypto.hash(password)
                executeQuery(f"UPDATE {table_name} SET password_hash = %s WHERE {pk_col} = %s", (new_hash, user["id"]))
                user["password_hash"] = new_hash

            # Provision or sync with Supabase Auth via Admin API
            sup_ok, sup_res = supabase_admin_create_user(email, password, {"role": actual_role, "full_name": user.get("full_name")})
            if sup_ok and isinstance(sup_res, dict):
                supabase_user_id = sup_res.get("id")
            else:
                found, sp_u = supabase_admin_get_user_by_email(email)
                if found and sp_u:
                    supabase_user_id = sp_u.get("id")
                    supabase_admin_set_password(supabase_user_id, password)

            if supabase_user_id:
                executeQuery(f"UPDATE {table_name} SET supabase_user_id = %s WHERE {pk_col} = %s", (supabase_user_id, user["id"]))
                user["supabase_user_id"] = supabase_user_id

            # Attempt sign-in with Supabase Auth to obtain session token
            sup_ok, sup_res = supabase_sign_in_with_password(email, password)
            if sup_ok and isinstance(sup_res, dict):
                access_token = sup_res.get("access_token")

    # Resolve MySQL application profile by Supabase Auth UUID or email
    user, actual_role = resolve_user_profile(supabase_user_id, resolved_email)
    if not user:
        return createResult("User profile not found in database", None)

    # Role validation: Enforce matching between selected tab and actual account role in DB
    if selected_role:
        clean_selected = str(selected_role).strip().lower()
        clean_actual = str(actual_role).strip().lower()
        if clean_selected != clean_actual:
            return createResult(f"Invalid role selected. This account is registered as {actual_role}.", None)

    # Veterinarian verification check: Must be Approved to gain platform access
    if actual_role == "Veterinarian":
        v_status = user.get("verification_status") or "Pending"
        if v_status != "Approved":
            if v_status == "Rejected":
                return createResult("Your veterinarian account has not been approved.", None)
            return createResult("Your veterinarian account is awaiting admin verification.", None)

    # Issue application JWT claim
    jwt_token = create_access_token(
        identity=user["email"],
        additional_claims={
            "role": user["role"],
            "user_id": user["id"],
            "supabase_user_id": user.get("supabase_user_id")
        },
        expires_delta=False
    )

    user["password_hash"] = "****"
    user["token"] = jwt_token
    user["supabase_token"] = access_token

    return createResult(None, user)


@auth_bp.route("/register/farmer", methods=["POST"])
def register_farmer():
    data = request.get_json(silent=True) or {}

    required_fields = ["full_name", "email", "phone_number"]
    for field in required_fields:
        if not data.get(field):
            return createResult(f"{field} is required", None)

    email = str(data["email"]).strip().lower()

    # Email uniqueness check
    query = "SELECT farmer_id FROM Farmers WHERE email=%s"
    result = executeQuery(query, (email,))
    if result:
        return createResult("Email already registered", None)

    supabase_user_id = data.get("supabase_user_id")
    password = data.get("password")
    pwd_hash = crypto.hash(password) if password else None

    # Provision user in Supabase Auth via Admin API (bypasses rate limits and auto-confirms)
    if not supabase_user_id and password:
        ok, res = supabase_admin_create_user(email, password, {"role": "Farmer", "full_name": data["full_name"]})
        if ok and isinstance(res, dict):
            supabase_user_id = res.get("id")
        else:
            ok, res = supabase_sign_up(email, password, {"role": "Farmer", "full_name": data["full_name"]})
            if ok and isinstance(res, dict):
                supabase_user = res.get("user") or res
                supabase_user_id = supabase_user.get("id")

    insert_query = """
        INSERT INTO Farmers
        (
            supabase_user_id,
            full_name,
            email,
            phone_number,
            password_hash,
            farm_name,
            farm_type,
            address,
            latitude,
            longitude
        )
        VALUES
        (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """

    params = (
        supabase_user_id,
        data["full_name"],
        email,
        data["phone_number"],
        pwd_hash,
        data.get("farm_name"),
        data.get("farm_type"),
        data.get("address"),
        data.get("latitude"),
        data.get("longitude")
    )

    db_res = executeQuery(insert_query, params)
    farmer_id = db_res.get("lastrowid") if isinstance(db_res, dict) else None

    # Idempotent cloud sync to Supabase PostgreSQL copy
    if farmer_id:
        sync_payload = {
            "farmer_id": farmer_id,
            "supabase_user_id": supabase_user_id,
            "full_name": data["full_name"],
            "email": email,
            "phone_number": data["phone_number"],
            "farm_name": data.get("farm_name"),
            "farm_type": data.get("farm_type"),
            "address": data.get("address"),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude")
        }
        sync_and_outbox("Farmers", farmer_id, "INSERT", sync_payload)

    return createResult(None, "Farmer Registered Successfully")


@auth_bp.route("/register/vet", methods=["POST"])
def register_vet():
    data = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})

    required_fields = ["full_name", "email", "phone_number"]
    for field in required_fields:
        if not data.get(field):
            return createResult(f"{field} is required", None)

    email = str(data["email"]).strip().lower()

    # Check certificate upload (Certificate upload is REQUIRED for veterinarian registration)
    cert_file = request.files.get("certificate")
    cert_url = data.get("certificate_url")

    if not cert_file and not cert_url:
        return createResult(
            "Veterinary certificate or professional license document is required for veterinarian registration.",
            None
        )

    if cert_file and cert_file.filename:
        filename = secure_filename(cert_file.filename)
        unique_name = f"cert_{uuid.uuid4().hex[:8]}_{filename}"
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "certificates")
        os.makedirs(upload_dir, exist_ok=True)
        save_path = os.path.join(upload_dir, unique_name)
        cert_file.save(save_path)
        cert_url = f"/admin/veterinarians/certificate/{unique_name}"

    # Email uniqueness check
    query = "SELECT vet_id FROM Veterinarians WHERE email=%s"
    result = executeQuery(query, (email,))
    if result:
        return createResult("Email already registered", None)

    supabase_user_id = data.get("supabase_user_id")
    password = data.get("password")
    pwd_hash = crypto.hash(password) if password else None

    # Provision user in Supabase Auth via Admin API
    if not supabase_user_id and password:
        ok, res = supabase_admin_create_user(email, password, {"role": "Veterinarian", "full_name": data["full_name"]})
        if ok and isinstance(res, dict):
            supabase_user_id = res.get("id")
        else:
            ok, res = supabase_sign_up(email, password, {"role": "Veterinarian", "full_name": data["full_name"]})
            if ok and isinstance(res, dict):
                supabase_user = res.get("user") or res
                supabase_user_id = supabase_user.get("id")

    exp_years = 0
    if data.get("experience_years"):
        try:
            exp_years = int(data.get("experience_years"))
        except (ValueError, TypeError):
            exp_years = 0

    insert_query = """
        INSERT INTO Veterinarians
        (
            supabase_user_id,
            full_name,
            email,
            phone_number,
            password_hash,
            specialization,
            license_number,
            experience_years,
            hospital_clinic,
            verification_status,
            certificate_url
        )
        VALUES
        (%s,%s,%s,%s,%s,%s,%s,%s,%s,'Pending',%s)
    """

    params = (
        supabase_user_id,
        data["full_name"],
        email,
        data["phone_number"],
        pwd_hash,
        data.get("specialization") or "Avian Medicine & Poultry Health",
        data.get("license_number") or None,
        exp_years,
        data.get("hospital_clinic") or None,
        cert_url
    )

    db_res = executeQuery(insert_query, params)
    vet_id = db_res.get("lastrowid") if isinstance(db_res, dict) else None

    # Idempotent cloud sync to Supabase PostgreSQL copy
    if vet_id:
        sync_payload = {
            "vet_id": vet_id,
            "supabase_user_id": supabase_user_id,
            "full_name": data["full_name"],
            "email": email,
            "phone_number": data["phone_number"],
            "specialization": data.get("specialization") or "Avian Medicine & Poultry Health",
            "license_number": data.get("license_number"),
            "experience_years": exp_years,
            "hospital_clinic": data.get("hospital_clinic"),
            "verification_status": "Pending",
            "certificate_url": cert_url
        }
        sync_and_outbox("Veterinarians", vet_id, "INSERT", sync_payload)

    return createResult(
        None,
        "Veterinarian registered successfully. Your account is pending admin verification."
    )


@auth_bp.route("/register/vendor", methods=["POST"])
def register_vendor():
    data = request.get_json(silent=True) or {}

    required_fields = ["full_name", "email", "phone_number"]
    for field in required_fields:
        if not data.get(field):
            return createResult(f"{field} is required", None)

    email = str(data["email"]).strip().lower()

    # Email uniqueness check
    query = "SELECT vendor_id FROM Vendors WHERE email=%s"
    result = executeQuery(query, (email,))
    if result:
        return createResult("Email already registered", None)

    supabase_user_id = data.get("supabase_user_id")
    password = data.get("password")
    pwd_hash = crypto.hash(password) if password else None

    if not supabase_user_id and password:
        ok, res = supabase_admin_create_user(email, password, {"role": "Vendor", "full_name": data["full_name"]})
        if ok and isinstance(res, dict):
            supabase_user_id = res.get("id")
        else:
            ok, res = supabase_sign_up(email, password, {"role": "Vendor", "full_name": data["full_name"]})
            if ok and isinstance(res, dict):
                supabase_user = res.get("user") or res
                supabase_user_id = supabase_user.get("id")

    insert_query = """
        INSERT INTO Vendors
        (
            supabase_user_id,
            full_name,
            email,
            phone_number,
            password_hash
        )
        VALUES
        (%s,%s,%s,%s,%s)
    """

    params = (
        supabase_user_id,
        data["full_name"],
        email,
        data["phone_number"],
        pwd_hash
    )
    db_res = executeQuery(insert_query, params)
    vendor_id = db_res.get("lastrowid") if isinstance(db_res, dict) else None

    # Idempotent cloud sync to Supabase PostgreSQL copy
    if vendor_id:
        sync_payload = {
            "vendor_id": vendor_id,
            "supabase_user_id": supabase_user_id,
            "full_name": data["full_name"],
            "email": email,
            "phone_number": data["phone_number"]
        }
        sync_and_outbox("Vendors", vendor_id, "INSERT", sync_payload)

    return createResult(None, "Vendor Registered Successfully")

