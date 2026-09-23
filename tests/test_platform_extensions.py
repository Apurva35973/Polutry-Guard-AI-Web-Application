import os
import sys
import json
import unittest
from io import BytesIO

# Add project root and Backend to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "Backend")
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from utlis.db_utlis import executeQuery
from flask_jwt_extended import create_access_token


class TestPlatformExtensions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            # Get existing Admin
            admins = executeQuery("SELECT admin_id, email FROM Admins LIMIT 1", None)
            if admins:
                cls.admin_id = admins[0]["admin_id"]
                cls.admin_email = admins[0]["email"]
            else:
                cls.admin_id = 1
                cls.admin_email = "admin@poultryguard.com"

            cls.admin_token = create_access_token(
                identity=cls.admin_email,
                additional_claims={"role": "Admin", "user_id": cls.admin_id}
            )

            # Get or create existing Farmer
            farmers = executeQuery("SELECT farmer_id, email FROM Farmers LIMIT 1", None)
            if farmers:
                cls.farmer_id = farmers[0]["farmer_id"]
                cls.farmer_email = farmers[0]["email"]
            else:
                cls.farmer_id = 1
                cls.farmer_email = "farmer@test.com"

            cls.farmer_token = create_access_token(
                identity=cls.farmer_email,
                additional_claims={"role": "Farmer", "user_id": cls.farmer_id, "farmer_id": cls.farmer_id}
            )

            # Find or insert a test veterinarian for verification tests
            vets = executeQuery("SELECT vet_id, email, verification_status FROM Veterinarians WHERE email='test_vet_pending@test.com'", None)
            if not vets:
                executeQuery(
                    """INSERT INTO Veterinarians (full_name, email, phone_number, password_hash, specialization, license_number, verification_status, created_at)
                       VALUES ('Dr. Test Pending', 'test_vet_pending@test.com', '9876543210', 'dummyhash', 'Avian Health', 'VET-TEST-001', 'Pending', NOW())""",
                    None
                )
                vets = executeQuery("SELECT vet_id, email, verification_status FROM Veterinarians WHERE email='test_vet_pending@test.com'", None)
            cls.pending_vet_id = vets[0]["vet_id"]
            cls.pending_vet_email = vets[0]["email"]

            cls.pending_vet_token = create_access_token(
                identity=cls.pending_vet_email,
                additional_claims={"role": "Veterinarian", "user_id": cls.pending_vet_id, "vet_id": cls.pending_vet_id}
            )

    def test_login_role_mismatch_rejected(self):
        """Attempting login with mismatched role should return clear role mismatch error."""
        # Query existing farmer's email
        res = self.client.post("/auth/login", json={
            "email": self.farmer_email,
            "password": "anypassword",
            "role": "Vendor"  # Mismatch: Registered as Farmer, trying to log in as Vendor
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "error")
        self.assertIn("Invalid role selected", data.get("error", ""))
        self.assertIn("Farmer", data.get("error", ""))

    def test_unverified_vet_consultation_blocked(self):
        """Unverified vet attempting vet-only protected endpoints should be denied."""
        # Ensure status is Pending
        executeQuery("UPDATE Veterinarians SET verification_status='Pending' WHERE vet_id=%s", (self.pending_vet_id,))

        headers = {"Authorization": f"Bearer {self.pending_vet_token}"}
        res = self.client.get("/vet/cases", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "error")
        self.assertIn("awaiting admin verification", data.get("error", "").lower())

    def test_admin_vet_applications_and_verification_workflow(self):
        """Admin should be able to view applications and approve/reject a vet."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # 1. Fetch vet applications
        res = self.client.get("/admin/veterinarians/applications", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "success")
        self.assertIsInstance(data.get("data"), list)

        # 2. Approve the test vet
        verify_res = self.client.post(
            f"/admin/veterinarians/{self.pending_vet_id}/verify",
            headers=headers,
            json={"verification_status": "Approved"}
        )
        self.assertEqual(verify_res.status_code, 200)
        v_data = verify_res.get_json()
        self.assertEqual(v_data.get("status"), "success")
        self.assertEqual(v_data["data"]["verification_status"], "Approved")

        # Verify in DB
        db_vet = executeQuery("SELECT verification_status FROM Veterinarians WHERE vet_id=%s", (self.pending_vet_id,))
        self.assertEqual(db_vet[0]["verification_status"], "Approved")

        # 3. Approved vet should now have platform access
        vet_access_res = self.client.get("/vet/cases", headers={"Authorization": f"Bearer {self.pending_vet_token}"})
        self.assertEqual(vet_access_res.status_code, 200)
        self.assertEqual(vet_access_res.get_json().get("status"), "success")

    def test_admin_profile_phone_persistence(self):
        """Admin updating phone number persists directly to database."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        new_phone = "+91-9988776655"

        update_res = self.client.put(
            "/admin/profile/update",
            headers=headers,
            json={"phone_number": new_phone, "full_name": "Admin User"}
        )
        self.assertEqual(update_res.status_code, 200)
        up_data = update_res.get_json()
        self.assertEqual(up_data.get("status"), "success")

        # Verify via GET /admin/profile
        get_res = self.client.get("/admin/profile", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        p_data = get_res.get_json()["data"]
        self.assertEqual(p_data.get("phone_number"), new_phone)

        # Verify directly in DB
        db_admin = executeQuery("SELECT phone_number FROM Admins WHERE admin_id=%s", (self.admin_id,))
        self.assertEqual(db_admin[0]["phone_number"], new_phone)

    def test_farmer_wifi_configuration_security(self):
        """Farmer saves Wi-Fi SSID and password; GET endpoint does not expose the password."""
        headers = {"Authorization": f"Bearer {self.farmer_token}"}
        test_ssid = "Shed_Wi-Fi_Test"
        test_pw = "SuperSecretPass123"

        # Save Wi-Fi
        save_res = self.client.post("/farmer/wifi", headers=headers, json={
            "wifi_ssid": test_ssid,
            "wifi_password": test_pw
        })
        self.assertEqual(save_res.status_code, 200)
        self.assertEqual(save_res.get_json().get("status"), "success")

        # Fetch Wi-Fi
        get_res = self.client.get("/farmer/wifi", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        wifi_data = get_res.get_json()["data"]
        self.assertEqual(wifi_data.get("wifi_ssid"), test_ssid)
        self.assertTrue(wifi_data.get("is_configured"))
        # Security requirement: Password must NOT be returned in GET response
        self.assertNotIn("wifi_password", wifi_data)

    def test_admin_overview_stats(self):
        """Admin overview returns non-null system metrics."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = self.client.get("/admin/overview", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "success")
        stats = data["data"]
        self.assertIn("total_farmers", stats)
        self.assertIn("total_veterinarians", stats)
        self.assertIn("total_devices", stats)
        self.assertIn("pending_assignment_requests", stats)
        self.assertIn("pending_vet_verifications", stats)


if __name__ == "__main__":
    unittest.main()
