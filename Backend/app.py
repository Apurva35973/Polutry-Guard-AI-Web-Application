from pathlib import Path

from flask import Flask, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

# Load the project-local secret configuration before any service reads it.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from utlis.response import createResult

from auth.routes import auth_bp
from Admin.routes import admin_bp
from Farmer.routes import farmer_bp
from Veterinary.routes import vet_bp
from Vendor.routes import vendor_bp
from Devices.routes import device_bp
from Disease.routes import disease_bp
from Alerts.routes import alert_bp
from Environment.routes import environment_bp

import os


def create_app():

    app = Flask(__name__)

    CORS(
        app,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173"
                ],
                "methods": [
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                ],
                "allow_headers": [
                    "*",
                    "Content-Type",
                    "Authorization"
                ],
                "expose_headers": [
                    "Content-Type",
                    "Authorization"
                ]
            }
        },
        supports_credentials=True
    )

    # JWT Configuration
    app.config["JWT_SECRET_KEY"] = "poultry_guard_secret"
    app.config["DEVICE_OFFLINE_TIMEOUT_SECONDS"] = int(
        os.getenv("DEVICE_OFFLINE_TIMEOUT_SECONDS", "300")
    )

    jwt_mgr = JWTManager(app)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(farmer_bp, url_prefix="/farmer")
    app.register_blueprint(vet_bp, url_prefix="/vet")
    app.register_blueprint(device_bp, url_prefix="/devices")
    app.register_blueprint(disease_bp, url_prefix="/disease")
    app.register_blueprint(alert_bp, url_prefix="/alerts")
    app.register_blueprint(vendor_bp, url_prefix="/vendor")
    app.register_blueprint(environment_bp, url_prefix="/api")

    # Public static file route for vet certificates (no JWT required)
    # Filenames are UUIDs so they are not guessable.
    @app.route("/public/certificates/<path:filename>", methods=["GET"])
    def serve_certificate_public(filename):
        cert_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "uploads", "certificates"
        )
        if not os.path.isfile(os.path.join(cert_dir, filename)):
            return createResult("Certificate file not found", None), 404
        return send_from_directory(cert_dir, filename)

    # JWT Error Handlers
    @jwt_mgr.invalid_token_loader
    def invalid_token_handler(error):
        return createResult(error="Invalid JWT Token", data=None)

    @jwt_mgr.unauthorized_loader
    def unauthorized_handler(error):
        return createResult(error="JWT Token Missing", data=None)

    @jwt_mgr.expired_token_loader
    def expired_token_handler(jwt_header, jwt_payload):
        return createResult(error="JWT Token Expired", data=None)

    # Global Error Handlers
    @app.errorhandler(500)
    def handle_500(error):
        err = getattr(error, "original_exception", error)
        return createResult(error=repr(err), data=None)

    @app.errorhandler(404)
    def handle_404(error):
        return createResult(error="Endpoint Not Found", data=None)

    @app.errorhandler(400)
    def handle_400(error):
        return createResult(error=str(error.description), data=None)

    return app
