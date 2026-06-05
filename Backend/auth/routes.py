from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from passlib.hash import sha256_crypt as crypto

from utlis.response import createResult
from utlis.db_utlis import executeQuery

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
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

    # ADMIN

    query = """
        SELECT
            admin_id as id,
            full_name,
            email,
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
                password_hash,
                farm_name,
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
                password_hash,
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

    success = crypto.verify(
        password,
        user["password_hash"]
    )

    if not success:
        return createResult(
            "Invalid Email or Password",
            None
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

    data = request.get_json()

    required_fields = [
        "full_name",
        "email",
        "phone_number",
        "password",
        "farm_name",
        "farm_type",
        "address",
        "latitude",
        "longitude"
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
        data["farm_name"],
        data["farm_type"],
        data["address"],
        data["latitude"],
        data["longitude"]
    )

    executeQuery(query, params)

    return createResult(
        None,
        "Farmer Registered Successfully"
    )

@auth_bp.route("/register/vet", methods=["POST"])
def register_vet():

    data = request.get_json()

    required_fields = [
        "full_name",
        "email",
        "phone_number",
        "password",
        "specialization",
        "license_number",
        "experience_years",
        "hospital_clinic"
    ]

    for field in required_fields:
        if not data.get(field):
            return createResult(
                f"{field} is required",
                None
            )

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
            password_hash
        )
        VALUES
        (%s,%s,%s,%s,%s,%s,%s,%s)
    """

    params = (
        data["full_name"],
        data["email"],
        data["phone_number"],
        data["specialization"],
        data["license_number"],
        data["experience_years"],
        data["hospital_clinic"],
        password_hash
    )

    executeQuery(query, params)

    return createResult(
        None,
        "Veterinarian Registered Successfully"
    )

@auth_bp.route("/register/vendor", methods=["POST"])
def register_vendor():

    data = request.get_json()

    required_fields = [
        "full_name",
        "business_name",
        "email",
        "phone_number",
        "password",
        "vendor_type",
        "address",
        "latitude",
        "longitude"
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
            business_name,
            email,
            phone_number,
            password_hash,
            vendor_type,
            address,
            latitude,
            longitude
        )
        VALUES
        (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """

    params = (
        data["full_name"],
        data["business_name"],
        data["email"],
        data["phone_number"],
        password_hash,
        data["vendor_type"],
        data["address"],
        data["latitude"],
        data["longitude"]
    )

    executeQuery(query, params)

    return createResult(
        None,
        "Vendor Registered Successfully"
    )