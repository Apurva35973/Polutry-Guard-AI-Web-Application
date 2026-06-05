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
