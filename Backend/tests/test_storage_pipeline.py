import io
import sys
from pathlib import Path
from PIL import Image

sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.path.append(str(Path(__file__).resolve().parents[2]))

from app import create_app
from utlis.db_utlis import executeQuery
from passlib.hash import sha256_crypt as crypto

def test_storage():
    app = create_app()
    client = app.test_client()

    print("=== STARTING SUPABASE STORAGE & INFERENCE INTEGRATION TEST ===")

    test_farmer_email = "storage_test_farmer@poultryguard.com"
    pwd = "FarmerTestPass123!"

    # Clean up any leftover test data
    executeQuery("DELETE FROM Farmers WHERE email = %s", (test_farmer_email,))

    # Create test farmer
    db_res = executeQuery("""
        INSERT INTO Farmers (full_name, email, phone_number, password_hash, farm_name)
        VALUES (%s, %s, %s, %s, %s)
    """, ("Storage Test Farmer", test_farmer_email, "9090909090", crypto.hash(pwd), "Storage Validation Farm"))

    fid = db_res.get("lastrowid")

    try:
        # 1. Login to get token
        login_res = client.post("/auth/login", json={"email": test_farmer_email, "password": pwd, "role": "Farmer"})
        login_data = login_res.get_json()
        assert login_data.get("status") == "success", f"Login failed: {login_data}"
        token = login_data["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[OK] Authenticated test farmer. Token acquired.")

        # 2. Generate a valid 224x224 RGB test image
        img = Image.new("RGB", (224, 224), color=(180, 140, 100))
        img_io = io.BytesIO()
        img.save(img_io, format="JPEG")
        img_io.seek(0)

        # 3. Post to /farmer/poultry-images
        upload_res = client.post(
            "/farmer/poultry-images",
            data={
                "image": (img_io, "test_flock_image.jpg"),
                "source": "ESP32-CAM",
                "device_id": "ESP32_CAM_KIT_01",
            },
            headers=headers,
            content_type="multipart/form-data"
        )
        upload_data = upload_res.get_json()
        print("\nUpload Response:", upload_data.get("status"))
        assert upload_data.get("status") == "success", f"Upload failed: {upload_data}"
        payload = upload_data.get("data", {})

        print("Image Record ID:", payload.get("image_id"))
        print("Storage Path:", payload.get("storage_path"))
        print("Signed URL generated:", bool(payload.get("signed_url")))
        print("Predicted Class:", payload.get("predicted_class"))
        print("Confidence:", payload.get("confidence"))
        print("Model:", payload.get("model"))

        assert payload.get("image_id") is not None
        assert "farms/" in payload.get("storage_path")
        assert payload.get("signed_url") is not None
        assert payload.get("predicted_class") in ["Fowlpox", "Infectious Coryza", "Healthy"]
        assert payload.get("model") == "ResNet18"
        print("[PASS] Upload, private storage placement, and CNN inference succeeded.")

        # 4. Test GET /farmer/poultry-images
        list_res = client.get("/farmer/poultry-images", headers=headers)
        list_data = list_res.get_json()
        assert list_data.get("status") == "success"
        images = list_data.get("data", [])
        assert len(images) >= 1
        assert images[0]["signed_url"] is not None
        print(f"[PASS] Retrieved {len(images)} image records with fresh signed URLs.")

        # 5. Verify database record
        db_rows = executeQuery("SELECT * FROM poultry_images WHERE image_id = %s", (payload["image_id"],))
        assert len(db_rows) == 1
        assert db_rows[0]["processing_status"] == "completed"
        assert db_rows[0]["source"] == "ESP32-CAM"
        assert db_rows[0]["device_id"] == "ESP32_CAM_KIT_01"
        print("[PASS] Database metadata verification succeeded.")

        print("\n=== SUPABASE STORAGE & CNN PIPELINE FULLY VERIFIED ===")

    finally:
        executeQuery("DELETE FROM poultry_images WHERE farmer_id = %s", (fid,))
        executeQuery("DELETE FROM Farmers WHERE farmer_id = %s", (fid,))

if __name__ == "__main__":
    test_storage()
