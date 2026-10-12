import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app
from utlis.db_utlis import executeQuery
from passlib.hash import sha256_crypt as crypto

def run_tests():
    app = create_app()
    client = app.test_client()

    print("=== STARTING AUTHENTICATION VERIFICATION TESTS ===")

    # Setup test accounts
    test_approved_vet = "test_approved_vet@poultryguard.com"
    test_pending_vet = "test_pending_vet@poultryguard.com"
    test_farmer = "test_auth_farmer@poultryguard.com"
    correct_pwd = "ValidVetPassword123!"
    wrong_pwd = "WrongPassword999!"

    # Clean up any leftover test rows
    executeQuery("DELETE FROM Veterinarians WHERE email IN (%s, %s)", (test_approved_vet, test_pending_vet))
    executeQuery("DELETE FROM Farmers WHERE email = %s", (test_farmer,))

    # 1. Create Approved Veterinarian (simulating legacy unhashed approved account)
    executeQuery("""
        INSERT INTO Veterinarians
        (full_name, email, phone_number, specialization, license_number, experience_years, verification_status, status)
        VALUES (%s, %s, %s, %s, %s, %s, 'Approved', 'Available')
    """, ("Dr. Test Approved", test_approved_vet, "1111111111", "Avian Medicine", "VET-TEST-01", 5))

    # 2. Create Pending Veterinarian
    executeQuery("""
        INSERT INTO Veterinarians
        (full_name, email, phone_number, specialization, license_number, experience_years, password_hash, verification_status, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending', 'Available')
    """, ("Dr. Test Pending", test_pending_vet, "2222222222", "Avian Medicine", "VET-TEST-02", 3, crypto.hash(correct_pwd)))

    # 3. Create Farmer
    executeQuery("""
        INSERT INTO Farmers
        (full_name, email, phone_number, password_hash, farm_name)
        VALUES (%s, %s, %s, %s, %s)
    """, ("Test Farmer User", test_farmer, "3333333333", crypto.hash(correct_pwd), "Test Poultry Farm"))

    try:
        # TEST 1: Approved veterinarian + correct credentials (first login auto-provisions)
        res1 = client.post("/auth/login", json={"email": test_approved_vet, "password": correct_pwd, "role": "Veterinarian"})
        data1 = res1.get_json()
        print("\nTest 1 (Approved Vet + Correct Password):", data1.get("status"))
        assert data1.get("status") == "success", f"Expected success, got {data1}"
        assert data1.get("data", {}).get("role") == "Veterinarian"
        assert bool(data1.get("data", {}).get("token")) is True
        print("[PASS] Test 1 passed: Approved vet logged in successfully and received JWT.")

        # TEST 2: Approved veterinarian + incorrect password
        res2 = client.post("/auth/login", json={"email": test_approved_vet, "password": wrong_pwd, "role": "Veterinarian"})
        data2 = res2.get_json()
        print("\nTest 2 (Approved Vet + Incorrect Password):", data2.get("status"), data2.get("error"))
        assert data2.get("status") == "error", f"Expected error, got {data2}"
        assert "Invalid" in data2.get("error", "")
        print("[PASS] Test 2 passed: Incorrect password was rejected.")

        # TEST 3: Unapproved veterinarian + correct credentials
        res3 = client.post("/auth/login", json={"email": test_pending_vet, "password": correct_pwd, "role": "Veterinarian"})
        data3 = res3.get_json()
        print("\nTest 3 (Unapproved Vet + Correct Password):", data3.get("status"), data3.get("error"))
        assert data3.get("status") == "error", f"Expected error, got {data3}"
        assert "awaiting admin verification" in data3.get("error", "")
        print("[PASS] Test 3 passed: Unapproved vet rejected with awaiting verification message.")

        # TEST 4: Farmer attempting to log in as Veterinarian (Role spoofing check)
        res4 = client.post("/auth/login", json={"email": test_farmer, "password": correct_pwd, "role": "Veterinarian"})
        data4 = res4.get_json()
        print("\nTest 4 (Farmer logging in as Veterinarian):", data4.get("status"), data4.get("error"))
        assert data4.get("status") == "error", f"Expected error, got {data4}"
        assert "Invalid role selected" in data4.get("error", "")
        print("[PASS] Test 4 passed: Role mismatch blocked.")

        # TEST 5: Farmer logging in as Farmer
        res5 = client.post("/auth/login", json={"email": test_farmer, "password": correct_pwd, "role": "Farmer"})
        data5 = res5.get_json()
        print("\nTest 5 (Farmer logging in as Farmer):", data5.get("status"))
        assert data5.get("status") == "success", f"Expected success, got {data5}"
        assert data5.get("data", {}).get("role") == "Farmer"
        print("[PASS] Test 5 passed: Legitimate farmer login succeeded.")

        print("\n=== ALL AUTHENTICATION TESTS PASSED PERFECTLY ===")

    finally:
        # Cleanup test accounts
        executeQuery("DELETE FROM Veterinarians WHERE email IN (%s, %s)", (test_approved_vet, test_pending_vet))
        executeQuery("DELETE FROM Farmers WHERE email = %s", (test_farmer,))

if __name__ == "__main__":
    run_tests()
