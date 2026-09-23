import os
import uuid
from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from passlib.hash import sha256_crypt as crypto
from werkzeug.utils import secure_filename

from utlis.response import createResult
from utlis.db_utlis import executeQuery

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])

def login():

    data = request.get_json()

    required_fields = ["email", "password"]

    for field in required_fields:
        if not data.get(field):
            return createResult(
                f"{field} is required",
                None
            )

    email = data.get("email")
    password = data.get("password")
    selected_role = data.get("role")

    # ADMIN
    query = """
        SELECT
            admin_id as id,
            full_name,
            email,
            phone_number,
            password_hash,
            'Admin' as role
        FROM Admins
        WHERE email=%s
    """
    result = executeQuery(query, (email,))

    # FARMER
    if len(result) == 0:
        query = """
            SELECT
                farmer_id as id,
                full_name,
                email,
                phone_number,
                password_hash,
                farm_name,
                farm_type,
                address,
                latitude,
                longitude,
                total_birds,
                wifi_ssid,
                'Farmer' as role
            FROM Farmers
            WHERE email=%s
        """
        result = executeQuery(query, (email,))

    # VET
    if len(result) == 0:
        query = """
            SELECT
                vet_id as id,
                full_name,
                email,
                phone_number,
                password_hash,
                specialization,
                license_number,
                experience_years,
                hospital_clinic,
                verification_status,
                certificate_url,
                'Veterinarian' as role
            FROM Veterinarians
            WHERE email=%s
        """
        result = executeQuery(query, (email,))

    # VENDOR
    if len(result) == 0:
        query = """
            SELECT
                vendor_id as id,
                full_name,
                email,
                phone_number,
                password_hash,
                vendor_type,
                latitude,
                longitude,
                'Vendor' as role
            FROM Vendors
            WHERE email=%s
        """
        result = executeQuery(query, (email,))

    if len(result) == 0:
        return createResult(
            "Invalid Email or Password",
            None
        )

    user = result[0]
    actual_role = user["role"]

    # Role validation: Enforce matching between selected tab and actual account role in DB
    if selected_role:
        clean_selected = str(selected_role).strip().lower()
        clean_actual = str(actual_role).strip().lower()
        if clean_selected != clean_actual:
            return createResult(
                f"Invalid role selected. This account is registered as {actual_role}.",
                None
            )

    # Password check
    success = crypto.verify(
        password,
        user["password_hash"]
    )
    if not success:
        return createResult(
            "Invalid Email or Password",
            None
        )

    # Veterinarian verification check: Must be Approved to gain platform access
    if actual_role == "Veterinarian":
        v_status = user.get("verification_status") or "Pending"
        if v_status != "Approved":
            if v_status == "Rejected":
                return createResult(
                    "Your veterinarian account has not been approved.",
                    None
                )
            return createResult(
                "Your veterinarian account is awaiting admin verification.",
                None
            )

    if user["role"] == "Farmer":
        profile_fields = ("farm_name", "farm_type", "address", "latitude", "longitude")
        user["profile_completed"] = all(
            user.get(field) is not None and str(user[field]).strip() != ""
            for field in profile_fields
        )
    elif user["role"] == "Veterinarian":
        profile_fields = ("specialization", "license_number", "experience_years", "hospital_clinic")
        user["profile_completed"] = all(
            user.get(field) is not None and str(user[field]).strip() != ""
            for field in profile_fields
        )

    jwt_token = create_access_token(
        identity=user["email"],
        additional_claims={
            "role": user["role"],
            "user_id": user["id"]
        },
        expires_delta=False
    )

    user["password_hash"] = "****"
    user["token"] = jwt_token

    return createResult(None, user)

@auth_bp.route("/register/farmer", methods=["POST"])
def register_farmer():

    data = request.get_json(silent=True) or {}

    required_fields = [
        "full_name",
        "email",
        "phone_number",
        "password"
    ]

    for field in required_fields:
        if not data.get(field):
            return createResult(
                f"{field} is required",
                None
            )

    query = """
        SELECT farmer_id
        FROM Farmers
        WHERE email=%s
    """

    result = executeQuery(
        query,
        (data["email"],)
    )

    if result:
        return createResult(
            "Email already registered",
            None
        )

    password_hash = crypto.hash(
        data["password"]
    )

    query = """
        INSERT INTO Farmers
        (
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
        (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """

    params = (
        data["full_name"],
        data["email"],
        data["phone_number"],
        password_hash,
        data.get("farm_name"),
        data.get("farm_type"),
        data.get("address"),
        data.get("latitude"),
        data.get("longitude")
    )

    executeQuery(query, params)

    return createResult(
        None,
        "Farmer Registered Successfully"
    )

@auth_bp.route("/register/vet", methods=["POST"])
def register_vet():
    data = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})

    required_fields = [
        "full_name",
        "email",
        "phone_number",
        "password",
    ]

    for field in required_fields:
        if not data.get(field):
            return createResult(
                f"{field} is required",
                None
            )

    # Check certificate upload (Requirement 7: Certificate upload is REQUIRED for veterinarian registration)
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

    query = """
        SELECT vet_id
        FROM Veterinarians
        WHERE email=%s
    """

    result = executeQuery(
        query,
        (data["email"],)
    )

    if result:
        return createResult(
            "Email already registered",
            None
        )

    password_hash = crypto.hash(
        data["password"]
    )

    exp_years = 0
    if data.get("experience_years"):
        try:
            exp_years = int(data.get("experience_years"))
        except (ValueError, TypeError):
            exp_years = 0

    query = """
        INSERT INTO Veterinarians
        (
            full_name,
            email,
            phone_number,
            specialization,
            license_number,
            experience_years,
            hospital_clinic,
            password_hash,
            verification_status,
            certificate_url
        )
        VALUES
        (%s,%s,%s,%s,%s,%s,%s,%s,'Pending',%s)
    """

    params = (
        data["full_name"],
        data["email"],
        data["phone_number"],
        data.get("specialization") or "Avian Medicine & Poultry Health",
        data.get("license_number") or None,
        exp_years,
        data.get("hospital_clinic") or None,
        password_hash,
        cert_url
    )

    executeQuery(query, params)

    return createResult(
        None,
        "Veterinarian registered successfully. Your account is pending admin verification."
    )

@auth_bp.route("/register/vendor", methods=["POST"])
def register_vendor():
    data = request.get_json(silent=True) or {}

    required_fields = [
        "full_name",
        "email",
        "phone_number",
        "password"
    ]

    for field in required_fields:
        if not data.get(field):
            return createResult(
                f"{field} is required",
                None
            )

    query = """
        SELECT vendor_id
        FROM Vendors
        WHERE email=%s
    """

    result = executeQuery(
        query,
        (data["email"],)
    )

    if result:
        return createResult(
            "Email already registered",
            None
        )

    password_hash = crypto.hash(
        data["password"]
    )

    query = """
        INSERT INTO Vendors
        (
            full_name,
            email,
            phone_number,
            password_hash
        )
        VALUES
        (%s,%s,%s,%s)
    """

    params = (
        data["full_name"],
        data["email"],
        data["phone_number"],
        password_hash
    )
    executeQuery(query, params)

    return createResult(
        None,
        "Vendor Registered Successfully"
    )
