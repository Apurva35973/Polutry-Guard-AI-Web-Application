import os
import sys
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import create_app
from utlis.db_utlis import executeQuery
from flask_jwt_extended import create_access_token


class TestVeterinarianContactFeature(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

        # Find farmer 12 or existing farmer with consultations
        farmers = executeQuery("SELECT farmer_id, email FROM Farmers WHERE farmer_id=12 LIMIT 1", None)
        if not farmers:
            farmers = executeQuery("SELECT farmer_id, email FROM Farmers LIMIT 1", None)
        
        cls.farmer_id = farmers[0]["farmer_id"]
        cls.farmer_email = farmers[0]["email"]

        # Find vet 5 or existing approved vet with phone
        vets = executeQuery("SELECT vet_id, email, phone_number, full_name FROM Veterinarians WHERE phone_number IS NOT NULL LIMIT 1", None)
        cls.vet = vets[0] if vets else None

        with cls.app.app_context():
            cls.farmer_token = create_access_token(
                identity=cls.farmer_email,
                additional_claims={"role": "Farmer", "user_id": cls.farmer_id}
            )
            cls.unauthorized_token = create_access_token(
                identity="random@poultryguard.com",
                additional_claims={"role": "Vendor", "user_id": 999}
            )

    def test_01_farmer_dashboard_includes_vet_phone(self):
        """Verify /farmer/dashboard includes vet_phone_number in vet_consultations records."""
        res = self.client.get(
            "/farmer/dashboard",
            headers={"Authorization": f"Bearer {self.farmer_token}"}
        )
        self.assertEqual(res.status_code, 200)
        payload = res.get_json()
        self.assertIsNone(payload.get("error"))
        data = payload.get("data", {})
        self.assertIn("vet_consultations", data)
        consultations = data["vet_consultations"]

        if consultations:
            first_c = consultations[0]
            self.assertIn("vet_name", first_c)
            self.assertIn("vet_phone_number", first_c)
            self.assertIn("recommendation", first_c)
            print(f"[PASS] Farmer dashboard returned vet consultation with Dr. {first_c.get('vet_name')}, phone: {first_c.get('vet_phone_number')}")

    def test_02_farmer_dedicated_consultations_endpoint(self):
        """Verify GET /farmer/consultations returns proper records with vet contact."""
        res = self.client.get(
            "/farmer/consultations",
            headers={"Authorization": f"Bearer {self.farmer_token}"}
        )
        self.assertEqual(res.status_code, 200)
        payload = res.get_json()
        self.assertIsNone(payload.get("error"))
        consultations = payload.get("data", [])
        self.assertIsInstance(consultations, list)
        if consultations:
            self.assertIn("vet_phone_number", consultations[0])
            print(f"[PASS] /farmer/consultations successfully returned {len(consultations)} consultations.")

    def test_03_unauthorized_role_blocked_from_farmer_consultations(self):
        """Verify Vendor or unapproved roles cannot access farmer consultations."""
        res = self.client.get(
            "/farmer/consultations",
            headers={"Authorization": f"Bearer {self.unauthorized_token}"}
        )
        payload = res.get_json()
        self.assertIn("error", payload)
        self.assertIn("Access Denied", payload["error"])
        print("[PASS] Unauthorized role blocked from farmer consultations endpoint.")


if __name__ == "__main__":
    unittest.main()
