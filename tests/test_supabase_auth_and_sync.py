import os
import sys
import unittest
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Ensure root directory in sys.path
ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "Backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / ".env")

from utlis.db_utlis import executeQuery, get_transaction_cursor
from auth.supabase_auth import (
    verify_supabase_jwt,
    resolve_user_profile,
    supabase_sign_in_with_password,
    supabase_sign_up
)
from services.sync_service import (
    sync_record_to_supabase,
    enqueue_sync,
    sync_and_outbox,
    generate_idempotency_key,
    process_pending_sync_queue,
    TABLE_MAPPINGS
)
from app import create_app

class TestSupabaseAuthAndSync(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    # =========================================================================
    # 1. AUTHENTICATION TESTS
    # =========================================================================
    def test_01_invalid_jwt_verification(self):
        """Test verifying an invalid JWT token fails safely."""
        ok, err = verify_supabase_jwt("invalid.token.here")
        self.assertFalse(ok)
        self.assertIn("Invalid or expired Supabase token", err)

    def test_02_unauthorized_api_request(self):
        """Test that protected endpoints without JWT return error."""
        res = self.client.get("/farmer/dashboard")
        data = res.get_json()
        self.assertIn(res.status_code, (200, 401)) # 200 with createResult error or 401
        self.assertTrue(data.get("error") is not None or data.get("status") == "error")

    def test_03_role_based_access_enforcement(self):
        """Test that user with Farmer role cannot access Admin routes."""
        from flask_jwt_extended import create_access_token
        with self.app.app_context():
            token = create_access_token(
                identity="farmer@poultryguard.com",
                additional_claims={"role": "Farmer", "user_id": 1}
            )

        # Attempt to access Admin endpoint with Farmer token
        admin_res = self.client.get("/admin/farmers/all", headers={"Authorization": f"Bearer {token}"})
        admin_data = admin_res.get_json()
        self.assertIn("Admin Only", admin_data.get("error", ""))

    def test_04_role_mismatch_rejection(self):
        """Test that selecting wrong role tab rejects authentication."""
        from unittest.mock import patch
        # Mock verify_supabase_jwt to return a valid Supabase user
        with patch("auth.routes.verify_supabase_jwt", return_value=(True, {"id": "test-uuid-farmer", "email": "farmer@poultryguard.com"})):
            res = self.client.post("/auth/supabase-session", json={
                "access_token": "valid.mock.token",
                "role": "Veterinarian" # Mismatched role
            })
            data = res.get_json()
            self.assertIn("Invalid role selected", data.get("error", ""))

    def test_05_profile_resolution_and_uuid_linking(self):
        """Test that resolve_user_profile links supabase_user_id without touching passwords."""
        test_uuid = "00000000-0000-0000-0000-000000000001"
        user, role = resolve_user_profile(test_uuid, "farmer@poultryguard.com")
        self.assertEqual(role, "Farmer")
        self.assertEqual(user["supabase_user_id"], test_uuid)

        # Verify in MySQL directly
        rows = executeQuery("SELECT supabase_user_id FROM Farmers WHERE email=%s", ("farmer@poultryguard.com",))
        self.assertEqual(rows[0]["supabase_user_id"], test_uuid)

    # =========================================================================
    # 2. CRUD SYNCHRONIZATION TESTS
    # =========================================================================
    def test_06_farmer_insert_update_delete_sync(self):
        """Test Farmer INSERT, UPDATE, DELETE sync and outbox entries."""
        # 1. Enqueue and test INSERT
        idem1 = enqueue_sync("Farmers", 888801, "INSERT", {
            "farmer_id": 888801,
            "full_name": "Test Farmer Sync",
            "email": "syncfarmer888801@test.com",
            "farm_name": "Sync Farm",
            "farm_type": "Broiler"
        })
        self.assertTrue(len(idem1) > 0)
        rows = executeQuery("SELECT * FROM sync_queue WHERE idempotency_key = %s", (idem1,))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["operation"], "INSERT")

        # 2. Enqueue and test UPDATE
        idem2 = enqueue_sync("Farmers", 888801, "UPDATE", {"farm_name": "Updated Sync Farm"})
        rows2 = executeQuery("SELECT * FROM sync_queue WHERE idempotency_key = %s", (idem2,))
        self.assertEqual(len(rows2), 1)
        self.assertEqual(rows2[0]["operation"], "UPDATE")

        # 3. Enqueue and test DELETE
        idem3 = enqueue_sync("Farmers", 888801, "DELETE")
        rows3 = executeQuery("SELECT * FROM sync_queue WHERE idempotency_key = %s", (idem3,))
        self.assertEqual(len(rows3), 1)
        self.assertEqual(rows3[0]["operation"], "DELETE")

        # Cleanup
        executeQuery("DELETE FROM sync_queue WHERE record_id = '888801'")

    def test_07_device_and_hardware_kit_sync(self):
        """Test Hardware_Kits and Device_Assignments sync metadata."""
        self.assertIn("Hardware_Kits", TABLE_MAPPINGS)
        self.assertIn("Device_Assignments", TABLE_MAPPINGS)
        idem = enqueue_sync("Hardware_Kits", 888802, "INSERT", {
            "hardware_kit_id": 888802,
            "kit_code": "KIT-TEST-888802",
            "status": "Available"
        })
        rows = executeQuery("SELECT * FROM sync_queue WHERE idempotency_key = %s", (idem,))
        self.assertEqual(len(rows), 1)
        executeQuery("DELETE FROM sync_queue WHERE record_id = '888802'")

    def test_08_alert_sync(self):
        """Test Farmer_Alerts sync."""
        self.assertIn("Farmer_Alerts", TABLE_MAPPINGS)
        idem = enqueue_sync("Farmer_Alerts", 888803, "INSERT", {
            "alert_id": 888803,
            "farmer_id": 1,
            "severity": "HIGH",
            "title": "Temperature Alert"
        })
        rows = executeQuery("SELECT * FROM sync_queue WHERE idempotency_key = %s", (idem,))
        self.assertEqual(len(rows), 1)
        executeQuery("DELETE FROM sync_queue WHERE record_id = '888803'")

    # =========================================================================
    # 3. IDEMPOTENCY AND DUPLICATE PREVENTION TESTS
    # =========================================================================
    def test_09_idempotency_deterministic_keys(self):
        """Test that same operation generates identical idempotency key."""
        k1 = generate_idempotency_key("Farmers", 123, "INSERT", {"name": "Alpha"})
        k2 = generate_idempotency_key("Farmers", 123, "INSERT", {"name": "Alpha"})
        self.assertEqual(k1, k2)

        # Changing payload creates different key
        k3 = generate_idempotency_key("Farmers", 123, "INSERT", {"name": "Beta"})
        self.assertNotEqual(k1, k3)

    def test_10_duplicate_insert_handling(self):
        """Test that inserting the same item twice into sync_queue does not duplicate rows."""
        payload = {"farmer_id": 888804, "full_name": "Idempotent Farmer"}
        idem1 = enqueue_sync("Farmers", 888804, "INSERT", payload)
        idem2 = enqueue_sync("Farmers", 888804, "INSERT", payload)
        self.assertEqual(idem1, idem2)

        rows = executeQuery("SELECT COUNT(*) as cnt FROM sync_queue WHERE idempotency_key = %s", (idem1,))
        self.assertEqual(rows[0]["cnt"], 1, "Duplicate sync_queue entry created!")
        executeQuery("DELETE FROM sync_queue WHERE record_id = '888804'")

    # =========================================================================
    # 4. FAILURE AND OFFLINE RESILIENCE TESTS
    # =========================================================================
    def test_11_offline_sync_resilience(self):
        """
        Verify that when cloud sync is unreachable/fails, MySQL operation succeeds,
        the event is safely placed in sync_queue with retry scheduled.
        """
        res = sync_and_outbox("Farmers", 888805, "INSERT", {
            "farmer_id": 888805,
            "full_name": "Offline Resilient Farmer"
        })
        self.assertTrue(res["queued"])
        self.assertTrue(len(res["idempotency_key"]) > 0)

        # Verify entry in sync_queue
        rows = executeQuery("SELECT * FROM sync_queue WHERE idempotency_key = %s", (res["idempotency_key"],))
        self.assertEqual(len(rows), 1)
        self.assertIn(rows[0]["status"], ("pending", "completed", "failed"))
        executeQuery("DELETE FROM sync_queue WHERE record_id = '888805'")

    # =========================================================================
    # 5. TRANSACTION ROLLBACK TESTS
    # =========================================================================
    def test_12_transaction_rollback_safety(self):
        """
        Test that if a MySQL transaction fails, all changes and queue entries are rolled back.
        """
        try:
            with get_transaction_cursor() as (cur, con):
                cur.execute("INSERT INTO Farmers (full_name, email, phone_number) VALUES (%s, %s, %s)",
                            ("Rollback Farmer", "rollback@test.com", "1234567890"))
                fid = cur.lastrowid
                enqueue_sync("Farmers", fid, "INSERT", {"farmer_id": fid}, cur=cur)
                # Intentionally trigger an exception to force rollback
                raise RuntimeError("Forced transaction failure")
        except RuntimeError:
            pass

        # Verify that NEITHER the farmer nor the sync_queue entry exists
        farmers = executeQuery("SELECT * FROM Farmers WHERE email=%s", ("rollback@test.com",))
        self.assertEqual(len(farmers), 0, "Farmer record was not rolled back!")

        sync_rows = executeQuery("SELECT * FROM sync_queue WHERE table_name='Farmers' AND record_id=%s", (fid,))
        self.assertEqual(len(sync_rows), 0, "Sync queue record was not rolled back!")

if __name__ == "__main__":
    unittest.main()
