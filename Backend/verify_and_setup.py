import sys
import os

# Add the Backend folder to pythonpath so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utlis.db_utlis import executeQuery, getConnection
from passlib.hash import sha256_crypt as crypto

def verify_and_setup():
    print("Connecting to MySQL and verifying table structures...")
    
    # 1. Check if Vendors table has correct columns, if not drop it
    try:
        columns_info = executeQuery("DESCRIBE Vendors", None)
        has_full_name = any(col['Field'] == 'full_name' for col in columns_info)
        if not has_full_name:
            print("[INFO] Recreating Vendors table to match required schema...")
            executeQuery("DROP TABLE Vendors", None)
    except Exception as e:
        # Table might not exist, which is fine
        pass

    # Create Vendors Table
    create_vendors_query = """
    CREATE TABLE IF NOT EXISTS Vendors (
        vendor_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone_number VARCHAR(15) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        business_name VARCHAR(150),
        vendor_type VARCHAR(100) DEFAULT 'Supplier',
        address TEXT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('Active','Inactive','Suspended') DEFAULT 'Active'
    );
    """
    try:
        executeQuery(create_vendors_query, None)
        print("[OK] Vendors table checked/created successfully.")
    except Exception as e:
        print("[ERROR] Error checking/creating Vendors table:", e)
        return

    # Check and add ThingSpeak and Wi-Fi columns to Hardware_Kits if needed
    try:
        hw_cols = [c['Field'] for c in executeQuery("DESCRIBE Hardware_Kits", None)]
        if 'thingspeak_channel_id' not in hw_cols:
            executeQuery("""
                ALTER TABLE Hardware_Kits
                ADD COLUMN thingspeak_channel_id VARCHAR(100) NULL,
                ADD COLUMN thingspeak_read_api_key VARCHAR(100) NULL,
                ADD COLUMN thingspeak_write_api_key VARCHAR(100) NULL,
                ADD COLUMN esp8266_device_id VARCHAR(100) NULL,
                ADD COLUMN last_telemetry_at DATETIME NULL
            """, None)
            print("[OK] Extended Hardware_Kits with ThingSpeak columns.")
        if 'wifi_ssid' not in hw_cols:
            executeQuery("""
                ALTER TABLE Hardware_Kits
                ADD COLUMN wifi_ssid VARCHAR(100) NULL,
                ADD COLUMN wifi_password VARCHAR(255) NULL
            """, None)
            print("[OK] Extended Hardware_Kits with Wi-Fi columns.")
    except Exception as e:
        print("[WARN] Hardware_Kits check/alter warning:", e)

    # Check and add verification columns to Veterinarians if needed
    try:
        vet_cols = [c['Field'] for c in executeQuery("DESCRIBE Veterinarians", None)]
        if 'verification_status' not in vet_cols:
            executeQuery("""
                ALTER TABLE Veterinarians
                ADD COLUMN verification_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
                ADD COLUMN certificate_url VARCHAR(255) NULL,
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """, None)
            print("[OK] Extended Veterinarians with verification_status and certificate_url.")
        # Ensure default seed vet is approved
        executeQuery("UPDATE Veterinarians SET verification_status='Approved' WHERE email='vet@poultryguard.com'", None)
    except Exception as e:
        print("[WARN] Veterinarians check/alter warning:", e)

    # Check and add Wi-Fi columns to Farmers if needed
    try:
        farmer_cols = [c['Field'] for c in executeQuery("DESCRIBE Farmers", None)]
        if 'wifi_ssid' not in farmer_cols:
            executeQuery("""
                ALTER TABLE Farmers
                ADD COLUMN wifi_ssid VARCHAR(100) NULL,
                ADD COLUMN wifi_password VARCHAR(255) NULL
            """, None)
            print("[OK] Extended Farmers with Wi-Fi columns.")
    except Exception as e:
        print("[WARN] Farmers check/alter warning:", e)

    # Check and add Wi-Fi columns to Hardware_Assignment_Requests if needed
    try:
        req_cols = [c['Field'] for c in executeQuery("DESCRIBE Hardware_Assignment_Requests", None)]
        if 'wifi_ssid' not in req_cols:
            executeQuery("""
                ALTER TABLE Hardware_Assignment_Requests
                ADD COLUMN wifi_ssid VARCHAR(100) NULL,
                ADD COLUMN wifi_password VARCHAR(255) NULL
            """, None)
            print("[OK] Extended Hardware_Assignment_Requests with Wi-Fi columns.")
    except Exception as e:
        print("[WARN] Hardware_Assignment_Requests check/alter warning:", e)

    # Ensure certificate upload directory exists
    try:
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "certificates")
        os.makedirs(uploads_dir, exist_ok=True)
    except Exception as e:
        print("[WARN] Error creating certificate upload directory:", e)

    # Check and create telemetry table
    try:
        executeQuery("""
            CREATE TABLE IF NOT EXISTS telemetry (
                telemetry_id INT AUTO_INCREMENT PRIMARY KEY,
                hardware_kit_id INT NOT NULL,
                farmer_id INT NULL,
                thingspeak_entry_id BIGINT NULL,
                temperature DECIMAL(5,2) NULL,
                humidity DECIMAL(5,2) NULL,
                ammonia DECIMAL(6,2) NULL,
                vocalization_activity DECIMAL(5,2) NULL,
                raw_payload JSON NULL,
                recorded_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_telemetry_hardware_kit FOREIGN KEY (hardware_kit_id)
                    REFERENCES Hardware_Kits(hardware_kit_id) ON DELETE CASCADE,
                CONSTRAINT fk_telemetry_farmer FOREIGN KEY (farmer_id)
                    REFERENCES Farmers(farmer_id) ON DELETE SET NULL,
                UNIQUE KEY uq_kit_thingspeak_entry (hardware_kit_id, thingspeak_entry_id)
            )
        """, None)
        print("[OK] Telemetry table checked/created successfully.")
    except Exception as e:
        print("[WARN] Telemetry table check warning:", e)

    # Hash for 'password'
    test_password_hash = crypto.hash("password")

    # 2. Check and Seed Admin
    try:
        admins = executeQuery("SELECT * FROM Admins WHERE email = %s", ("admin@poultryguard.com",))
        if not admins:
            executeQuery("""
                INSERT INTO Admins (full_name, email, phone_number, password_hash, role)
                VALUES (%s, %s, %s, %s, %s)
            """, ("System Admin", "admin@poultryguard.com", "9999999999", test_password_hash, "Super Admin"))
            print("[OK] Seeded Admin user (admin@poultryguard.com).")
        else:
            print("[OK] Admin user already exists.")
    except Exception as e:
        print("[ERROR] Error seeding Admin:", e)

    # 3. Check and Seed Farmer
    try:
        farmers = executeQuery("SELECT * FROM Farmers WHERE email = %s", ("farmer@poultryguard.com",))
        if not farmers:
            executeQuery("""
                INSERT INTO Farmers (full_name, email, phone_number, password_hash, farm_name, farm_type, address, latitude, longitude, total_birds)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, ("Test Farmer", "farmer@poultryguard.com", "8888888888", test_password_hash, "Poultry Paradise", "Broiler", "Farm Rd 1", 18.5204, 73.8567, 1200))
            print("[OK] Seeded Farmer user (farmer@poultryguard.com).")
        else:
            print("[OK] Farmer user already exists.")
    except Exception as e:
        print("[ERROR] Error seeding Farmer:", e)

    # 4. Check and Seed Veterinarian
    try:
        vets = executeQuery("SELECT * FROM Veterinarians WHERE email = %s", ("vet@poultryguard.com",))
        if not vets:
            executeQuery("""
                INSERT INTO Veterinarians (full_name, email, phone_number, specialization, license_number, experience_years, hospital_clinic, password_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, ("Dr. Poultry Expert", "vet@poultryguard.com", "7777777777", "Avian Medicine", "VET-12345", 8, "City Animal Hospital", test_password_hash))
            print("[OK] Seeded Veterinarian user (vet@poultryguard.com).")
        else:
            print("[OK] Veterinarian user already exists.")
    except Exception as e:
        print("[ERROR] Error seeding Veterinarian:", e)

    # 5. Check and Seed Vendor
    try:
        vendors = executeQuery("SELECT * FROM Vendors WHERE email = %s", ("vendor@poultryguard.com",))
        if not vendors:
            executeQuery("""
                INSERT INTO Vendors (full_name, email, phone_number, password_hash, business_name, vendor_type, address, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, ("Poultry Feeds Vendor", "vendor@poultryguard.com", "6666666666", test_password_hash, "Global Feed Distributors", "Supplier", "Industrial Zone 2", 18.5304, 73.8667))
            print("[OK] Seeded Vendor user (vendor@poultryguard.com).")
        else:
            print("[OK] Vendor user already exists.")
    except Exception as e:
        print("[ERROR] Error seeding Vendor:", e)

if __name__ == "__main__":
    verify_and_setup()
