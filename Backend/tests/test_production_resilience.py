import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

# Add Backend root to path
BACKEND_ROOT = str(Path(__file__).resolve().parents[1])
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app import create_app
from utlis.db_utlis import getConnection, is_mysql_configured
from auth.supabase_auth import resolve_user_profile, _resolve_from_supabase_rest
from Farmer.biosecurity import mortality_analytics
from flask_jwt_extended import create_access_token


class TestProductionResilience(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.app.config["JWT_SECRET_KEY"] = "test-secret-key-for-resilience-32bytes-min!"
        cls.client = cls.app.test_client()

    def _get_farmer_token(self, email="resilience_farmer@example.com", role="Farmer"):
        with self.app.app_context():
            return create_access_token(
                identity=email,
                additional_claims={"role": role, "email": email}
            )

    def _get_vet_token(self, email="resilience_vet@example.com"):
        return self._get_farmer_token(email=email, role="Veterinarian")

    # =========================================================================
    # Task 1 & 4: Database configuration & Render environment handling
    # =========================================================================
    def test_missing_database_configuration_on_render(self):
        """Verify clear ConnectionError when MYSQL_HOST is missing in Render environment."""
        with patch.dict(os.environ, {"RENDER": "true"}, clear=False):
            if "MYSQL_HOST" in os.environ:
                del os.environ["MYSQL_HOST"]
            self.assertFalse(is_mysql_configured())
            with self.assertRaises(ConnectionError) as ctx:
                getConnection()
            self.assertIn("MYSQL_HOST is not configured in Render environment variables", str(ctx.exception))
            self.assertIn("MYSQL_PASSWORD", str(ctx.exception))

    def test_mysql_configured_detection(self):
        """Verify is_mysql_configured returns True when MYSQL_HOST is provided."""
        with patch.dict(os.environ, {"RENDER": "true", "MYSQL_HOST": "db.render.internal"}):
            self.assertTrue(is_mysql_configured())

    # =========================================================================
    # Task 2: Farmer profile resolution guarantees 'farmer_id' (No KeyError)
    # =========================================================================
    @patch("services.sync_service.execute_supabase_rest")
    def test_supabase_fallback_guarantees_farmer_id(self, mock_sp_rest):
        """When MySQL fails and user is resolved from Supabase REST, both 'id' and 'farmer_id' exist."""
        def mock_rest(method, endpoint, payload=None):
            if "farmers" in endpoint:
                return (True, [{
                    "farmer_id": 42,
                    "full_name": "Test Farmer",
                    "email": "farmer42@example.com",
                    "phone_number": "9876543210",
                    "farm_name": "Green Acres",
                    "farm_type": "Broiler",
                    "address": "Pune, India",
                    "latitude": 18.52,
                    "longitude": 73.85,
                    "total_birds": 500,
                    "status": "Active",
                    "auth_user_id": "supabase-uuid-42"
                }])
            return (True, [])

        mock_sp_rest.side_effect = mock_rest

        with patch("auth.supabase_auth.executeQuery", side_effect=ConnectionError("MySQL down")):
            user, role = resolve_user_profile("supabase-uuid-42", "farmer42@example.com")
            self.assertEqual(role, "Farmer")
            self.assertIsNotNone(user)
            self.assertIn("farmer_id", user)
            self.assertIn("id", user)
            self.assertEqual(user["farmer_id"], 42)
            self.assertEqual(user["id"], 42)

    # =========================================================================
    # Task 2 & 3: Missing farmer record handling (404, not 200)
    # =========================================================================
    @patch("Farmer.routes.current_farmer", return_value=None)
    def test_telemetry_missing_farmer_record_returns_404(self, mock_farmer):
        """When authenticated farmer record does not exist, return 404."""
        token = self._get_farmer_token()
        res = self.client.get(
            "/farmer/telemetry",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertEqual(data.get("status"), "error")
        self.assertIn("Farmer account not found", data.get("error"))

    @patch("Farmer.routes.current_farmer", return_value=None)
    def test_hardware_kit_request_missing_farmer_returns_404(self, mock_farmer):
        """When authenticated farmer record does not exist, kit request returns 404."""
        token = self._get_farmer_token()
        res = self.client.post(
            "/farmer/hardware-kit/request",
            headers={"Authorization": f"Bearer {token}"},
            json={"priority": "High"}
        )
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertEqual(data.get("status"), "error")

    # =========================================================================
    # Task 2 & 3: Role authorization & Non-farmer access (403, not 200)
    # =========================================================================
    def test_vet_role_blocked_from_farmer_telemetry(self):
        """Non-farmer role accessing farmer telemetry receives 403."""
        vet_token = self._get_vet_token()
        res = self.client.get(
            "/farmer/telemetry",
            headers={"Authorization": f"Bearer {vet_token}"}
        )
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertIn("Access Denied", data.get("error"))

    def test_vet_role_blocked_from_hardware_kit_request(self):
        """Non-farmer role requesting hardware kit receives 403."""
        vet_token = self._get_vet_token()
        res = self.client.post(
            "/farmer/hardware-kit/request",
            headers={"Authorization": f"Bearer {vet_token}"},
            json={"priority": "Medium"}
        )
        self.assertEqual(res.status_code, 403)

    # =========================================================================
    # Task 3: No KeyError when farmer record has 'id' or 'farmer_id'
    # =========================================================================
    @patch("Farmer.routes.current_farmer")
    @patch("Farmer.routes.get_or_sync_farmer_telemetry")
    def test_farmer_telemetry_no_key_error(self, mock_telem, mock_farmer):
        """Ensure farmer_telemetry never raises KeyError: 'farmer_id' even if farmer only has 'id'."""
        mock_farmer.return_value = {
            "id": 99,
            "full_name": "Resilient Farmer",
            "email": "farmer99@example.com"
        }
        mock_telem.return_value = (None, "No active hardware kit assigned to this farm")

        token = self._get_farmer_token("farmer99@example.com")
        res = self.client.get(
            "/farmer/telemetry",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 404 (kit not assigned), NOT crash with 500 KeyError
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertEqual(data.get("status"), "error")
        self.assertIn("No active hardware kit assigned", data.get("error"))

    # =========================================================================
    # Task 3: Hardware kit validation (Incomplete profile & Invalid priority)
    # =========================================================================
    @patch("Farmer.routes.current_farmer")
    def test_hardware_kit_request_incomplete_profile_returns_400(self, mock_farmer):
        """Requesting kit without farm_name/address returns 400."""
        mock_farmer.return_value = {
            "farmer_id": 10,
            "id": 10,
            "full_name": "Incomplete Farmer",
            "email": "incomplete@example.com",
            "farm_name": None,
            "address": None
        }
        token = self._get_farmer_token("incomplete@example.com")
        res = self.client.post(
            "/farmer/hardware-kit/request",
            headers={"Authorization": f"Bearer {token}"},
            json={"priority": "High"}
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("Complete your farm profile", data.get("error"))

    @patch("Farmer.routes.current_farmer")
    @patch("Farmer.routes.executeQuery")
    def test_hardware_kit_request_invalid_priority_returns_400(self, mock_query, mock_farmer):
        """Requesting kit with invalid priority returns 400."""
        mock_farmer.return_value = {
            "farmer_id": 10,
            "id": 10,
            "farm_name": "Valley Farm",
            "address": "Valley Road"
        }
        mock_query.return_value = []  # No active kit, no pending request
        token = self._get_farmer_token()
        res = self.client.post(
            "/farmer/hardware-kit/request",
            headers={"Authorization": f"Bearer {token}"},
            json={"priority": "UrgentNow!"}
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("priority must be Low, Medium, High, or Critical", data.get("error"))

    # =========================================================================
    # Task 1 & 8: Environment route farm ownership check (403 on mismatch)
    # =========================================================================
    @patch("Environment.routes.executeQuery")
    @patch("auth.supabase_auth._resolve_from_supabase_rest")
    def test_unauthorized_farm_access_rejected_403(self, mock_sp_res, mock_mysql):
        """Farmer accessing another farm's environment data receives 403."""
        # MySQL fails
        mock_mysql.side_effect = ConnectionError("MySQL down")
        # Supabase resolves farmer with farmer_id=10
        mock_sp_res.return_value = ({
            "id": 10,
            "farmer_id": 10,
            "email": "resilience_farmer@example.com"
        }, "Farmer")

        token = self._get_farmer_token("resilience_farmer@example.com")
        # Request farm 99 (not owned by farmer 10)
        res = self.client.get(
            "/api/environment/current/99",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Access denied", res.get_json().get("error"))

    @patch("Environment.routes.executeQuery")
    @patch("auth.supabase_auth._resolve_from_supabase_rest")
    @patch("Environment.service.fetch_openweather_reading")
    def test_authorized_farm_access_allowed_with_supabase_fallback(self, mock_weather, mock_sp_res, mock_mysql):
        """Farmer accessing their own farm succeeds even if MySQL is down."""
        mock_mysql.side_effect = ConnectionError("MySQL down")
        mock_sp_res.return_value = ({
            "id": 10,
            "farmer_id": 10,
            "email": "resilience_farmer@example.com"
        }, "Farmer")
        mock_weather.return_value = {
            "farm_id": "10",
            "temperature": 25.0,
            "humidity": 60.0,
            "timestamp": "2026-10-13T10:00:00Z",
            "source": "openweather",
            "stale": False
        }

        token = self._get_farmer_token("resilience_farmer@example.com")
        res = self.client.get(
            "/api/environment/current/10",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("farm_id"), "10")
        self.assertEqual(data.get("temperature"), 25.0)

    # =========================================================================
    # Task 1 & 8: Mortality analytics resilience to database outage
    # =========================================================================
    @patch("Farmer.biosecurity.executeQuery")
    @patch("services.sync_service.execute_supabase_rest")
    def test_mortality_analytics_resilient_to_mysql_failure(self, mock_sp, mock_mysql):
        """Mortality analytics falls back to Supabase and returns complete dictionary without crashing."""
        mock_mysql.side_effect = ConnectionError("MySQL host unreachable")
        mock_sp.side_effect = [
            (True, [{"death_count": 5, "recorded_at": "2026-10-13T08:00:00Z"}]),  # mortality_records
            (True, [{"total_birds": 100}])  # farmers
        ]

        result = mortality_analytics(10)
        self.assertIsInstance(result, dict)
        self.assertIn("total", result)
        self.assertIn("mortality_rate", result)
        self.assertIn("trend", result)
        self.assertEqual(result["total"], 5)
        self.assertEqual(result["flock_population"], 100)
        self.assertEqual(result["mortality_rate"], 5.0)

    @patch("Farmer.biosecurity.executeQuery")
    @patch("services.sync_service.execute_supabase_rest")
    def test_mortality_analytics_both_databases_down_no_crash(self, mock_sp, mock_mysql):
        """Mortality analytics gracefully returns zeroed metrics if both MySQL and Supabase fail."""
        mock_mysql.side_effect = ConnectionError("MySQL down")
        mock_sp.side_effect = Exception("Supabase connection refused")

        result = mortality_analytics(10)
        self.assertIsInstance(result, dict)
        self.assertEqual(result["total"], 0)
        self.assertEqual(result["trend"], [])
        self.assertIsNone(result["mortality_rate"])


if __name__ == "__main__":
    unittest.main()
