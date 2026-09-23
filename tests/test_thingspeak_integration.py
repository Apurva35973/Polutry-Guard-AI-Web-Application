import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

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
from services.thingspeak_service import (
    fetch_latest_telemetry,
    test_thingspeak_connection,
    mask_api_key,
    safe_float,
    FRESHNESS_THRESHOLD_SECONDS,
)
from services.supabase_service import save_telemetry_record, get_latest_telemetry_from_db


def create_mock_urlopen(json_data, status_code=200):
    """Helper to create a context-manager compatible urlopen mock."""
    mock_resp = MagicMock()
    mock_resp.getcode.return_value = status_code
    if isinstance(json_data, (dict, list)):
        payload_bytes = json.dumps(json_data).encode("utf-8")
    elif isinstance(json_data, str):
        payload_bytes = json_data.encode("utf-8")
    else:
        payload_bytes = json_data
    mock_resp.read.return_value = payload_bytes
    mock_resp.__enter__.return_value = mock_resp
    return mock_resp


class TestThingSpeakIoTIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

        # Find existing farmer and hardware kit
        farmers = executeQuery("SELECT farmer_id, email FROM Farmers LIMIT 2", None)
        if farmers:
            cls.farmer_id = farmers[0]["farmer_id"]
            cls.farmer_email = farmers[0]["email"]
        else:
            cls.farmer_id = 1
            cls.farmer_email = "farmer@poultryguard.com"

        kits = executeQuery("SELECT hardware_kit_id, kit_code FROM Hardware_Kits LIMIT 1", None)
        cls.hardware_kit_id = kits[0]["hardware_kit_id"] if kits else 1

        with cls.app.app_context():
            # Setup tokens
            cls.admin_token = create_access_token(
                identity="admin@poultryguard.com",
                additional_claims={"role": "Admin", "user_id": 1}
            )
            cls.farmer_token = create_access_token(
                identity=cls.farmer_email,
                additional_claims={"role": "Farmer", "user_id": cls.farmer_id}
            )

    # 1. Test Admin saves and tests ThingSpeak credentials
    def test_01_admin_test_and_configure_thingspeak(self):
        mock_resp = create_mock_urlopen({
            "channel": {"id": 2418292, "name": "Test Node"},
            "feeds": [{
                "entry_id": 105,
                "created_at": "2026-09-16T05:00:00Z",
                "field1": "28.4",
                "field2": "65.2",
                "field3": "14.1",
                "field4": "42.0"
            }]
        })

        with patch("urllib.request.urlopen", return_value=mock_resp):
            # Test direct connection service
            test_res = test_thingspeak_connection("2418292", "TESTREADKEY123")
            self.assertTrue(test_res["success"])
            self.assertEqual(test_res["last_entry_id"], 105)
            self.assertEqual(test_res["sample_payload"]["temperature"], 28.4)

            # Test admin endpoint with admin token
            res = self.client.post(
                f"/admin/hardware-kits/{self.hardware_kit_id}/thingspeak/test",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json={"thingspeak_channel_id": "2418292", "thingspeak_read_api_key": "TESTKEY123"}
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data.get("status"), "success")

    # 2. Test Data within 300 seconds is flagged as fresh and Online
    def test_02_telemetry_freshness_within_300s(self):
        now_utc = datetime.now(timezone.utc)
        fresh_time_str = (now_utc - timedelta(seconds=25)).strftime("%Y-%m-%dT%H:%M:%SZ")

        mock_resp = create_mock_urlopen({
            "entry_id": 201,
            "created_at": fresh_time_str,
            "field1": "26.50",
            "field2": "58.00",
            "field3": "11.20",
            "field4": "35.00"
        })

        with patch("urllib.request.urlopen", return_value=mock_resp):
            telemetry = fetch_latest_telemetry("2418292", "TESTKEY")
            self.assertTrue(telemetry["success"])
            self.assertTrue(telemetry["is_fresh"])
            self.assertEqual(telemetry["device_status"], "Online")
            self.assertLessEqual(telemetry["age_seconds"], FRESHNESS_THRESHOLD_SECONDS)
            self.assertEqual(telemetry["telemetry"]["temperature"], 26.50)
            self.assertEqual(telemetry["telemetry"]["humidity"], 58.00)
            self.assertEqual(telemetry["telemetry"]["ammonia"], 11.20)

    # 3. Test Data older than 300 seconds is flagged as stale and Offline
    def test_03_telemetry_staleness_older_than_300s(self):
        now_utc = datetime.now(timezone.utc)
        stale_time_str = (now_utc - timedelta(seconds=450)).strftime("%Y-%m-%dT%H:%M:%SZ")

        mock_resp = create_mock_urlopen({
            "entry_id": 202,
            "created_at": stale_time_str,
            "field1": "27.10",
            "field2": "60.50",
            "field3": "12.00",
            "field4": "10.00"
        })

        with patch("urllib.request.urlopen", return_value=mock_resp):
            telemetry = fetch_latest_telemetry("2418292", "TESTKEY")
            self.assertTrue(telemetry["success"])
            self.assertFalse(telemetry["is_fresh"])
            self.assertEqual(telemetry["device_status"], "Offline")
            self.assertGreater(telemetry["age_seconds"], FRESHNESS_THRESHOLD_SECONDS)

    # 4. Test Backend retrieves ThingSpeak data and persists to database with deduplication
    def test_04_save_telemetry_and_deduplication(self):
        unique_entry_id = int(datetime.now(timezone.utc).timestamp()) + 99999
        res1 = save_telemetry_record(
            hardware_kit_id=self.hardware_kit_id,
            farmer_id=self.farmer_id,
            thingspeak_entry_id=unique_entry_id,
            temperature=25.5,
            humidity=60.0,
            ammonia=10.5,
            vocalization_activity=30.0,
            recorded_at=datetime.now(timezone.utc).isoformat()
        )
        self.assertTrue(res1["success"])
        self.assertTrue(res1["inserted"])
        self.assertFalse(res1["is_duplicate"])

        # Attempt to insert same entry_id again
        res2 = save_telemetry_record(
            hardware_kit_id=self.hardware_kit_id,
            farmer_id=self.farmer_id,
            thingspeak_entry_id=unique_entry_id,
            temperature=25.5,
            humidity=60.0,
            ammonia=10.5,
            vocalization_activity=30.0,
            recorded_at=datetime.now(timezone.utc).isoformat()
        )
        self.assertTrue(res2["success"])
        self.assertFalse(res2["inserted"])
        self.assertTrue(res2["is_duplicate"])

    # 5. Test Farmer CANNOT see or access ThingSpeak API keys or credentials
    def test_05_farmer_cannot_access_thingspeak_api_keys(self):
        # Check /farmer/telemetry
        res = self.client.get(
            "/farmer/telemetry",
            headers={"Authorization": f"Bearer {self.farmer_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        payload = json.dumps(data)

        # Assert no secret keys leaked
        self.assertNotIn("thingspeak_read_api_key", payload)
        self.assertNotIn("thingspeak_write_api_key", payload)
        self.assertNotIn("wifi_password", payload)
        self.assertNotIn("thingspeak_channel_id", payload)

        # Check /farmer/device-status
        res_status = self.client.get(
            "/farmer/device-status",
            headers={"Authorization": f"Bearer {self.farmer_token}"}
        )
        self.assertEqual(res_status.status_code, 200)
        status_payload = json.dumps(res_status.get_json())
        self.assertNotIn("thingspeak_read_api_key", status_payload)
        self.assertNotIn("thingspeak_write_api_key", status_payload)

        # Check /farmer/hardware-kit
        res_kit = self.client.get(
            "/farmer/hardware-kit",
            headers={"Authorization": f"Bearer {self.farmer_token}"}
        )
        self.assertEqual(res_kit.status_code, 200)
        kit_payload = json.dumps(res_kit.get_json())
        self.assertNotIn("thingspeak_read_api_key", kit_payload)
        self.assertNotIn("thingspeak_write_api_key", kit_payload)

    # 6. Test Unauthorized farmer cannot access telemetry of another farm's hardware kit
    def test_06_unauthorized_farmer_isolation(self):
        # Create token for a non-existent or unassigned farmer
        with self.app.app_context():
            unauthorized_token = create_access_token(
                identity="nonexistentfarmer@poultryguard.com",
                additional_claims={"role": "Farmer", "user_id": 88888}
            )

        res = self.client.get(
            "/farmer/telemetry",
            headers={"Authorization": f"Bearer {unauthorized_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "error")

    # 7. Test Sensor telemetry drives disease prediction inference
    def test_07_sensor_telemetry_drives_disease_prediction(self):
        now_utc = datetime.now(timezone.utc)
        fresh_time_str = (now_utc - timedelta(seconds=15)).strftime("%Y-%m-%dT%H:%M:%SZ")

        mock_telemetry_fresh = {
            "hardware_kit_id": self.hardware_kit_id,
            "kit_code": "HK-TEST",
            "device_status": "Online",
            "is_fresh": True,
            "freshness_status": "Fresh",
            "age_seconds": 15,
            "recorded_at": fresh_time_str,
            "telemetry": {
                "temperature": 29.5,
                "humidity": 68.0,
                "ammonia": 15.0,
                "vocalization_activity": 45.0
            }
        }

        with patch("Farmer.routes.get_or_sync_farmer_telemetry", return_value=(mock_telemetry_fresh, None)):
            res = self.client.get(
                "/farmer/disease-status",
                headers={"Authorization": f"Bearer {self.farmer_token}"}
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data.get("status"), "success")
            d = data.get("data", {})
            self.assertTrue(d.get("telemetry_fresh"))
            self.assertIn("prediction", d)
            self.assertIn(d["prediction"]["predicted_class"], ["Healthy", "Fowlpox", "Infectious Coryza"])
            self.assertIn("recommendation", d["prediction"])

    # 8. Test Stale telemetry is excluded from real-time disease prediction
    def test_08_stale_telemetry_excluded_from_inference(self):
        now_utc = datetime.now(timezone.utc)
        stale_time_str = (now_utc - timedelta(seconds=550)).strftime("%Y-%m-%dT%H:%M:%SZ")

        mock_telemetry_stale = {
            "hardware_kit_id": self.hardware_kit_id,
            "kit_code": "HK-TEST",
            "device_status": "Offline",
            "is_fresh": False,
            "freshness_status": "Stale",
            "age_seconds": 550,
            "recorded_at": stale_time_str,
            "telemetry": {
                "temperature": 29.5,
                "humidity": 68.0,
                "ammonia": 15.0,
                "vocalization_activity": 45.0
            }
        }

        with patch("Farmer.routes.get_or_sync_farmer_telemetry", return_value=(mock_telemetry_stale, None)):
            res = self.client.get(
                "/farmer/disease-status",
                headers={"Authorization": f"Bearer {self.farmer_token}"}
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data.get("status"), "success")
            d = data.get("data", {})
            self.assertFalse(d.get("telemetry_fresh"))
            self.assertIn("stale", d.get("message", "").lower())
            self.assertNotIn("prediction", d)

    # 9. Test Safe float and key masking helpers
    def test_09_helpers(self):
        self.assertEqual(safe_float("25.43"), 25.43)
        self.assertEqual(safe_float(None), None)
        self.assertEqual(safe_float("invalid"), None)
        self.assertEqual(safe_float("   "), None)

        self.assertEqual(mask_api_key("ABCDEFGHIJKLMNOP"), "ABC****NOP")
        self.assertEqual(mask_api_key("SHORT"), "******")
        self.assertIsNone(mask_api_key(None))


if __name__ == "__main__":
    unittest.main()
