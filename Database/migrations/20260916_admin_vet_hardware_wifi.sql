-- Poultry Guard: Admin, Veterinarian Verification, Hardware Management, and Wi-Fi Configuration migration

-- 1. Extend Veterinarians with verification status and certificate document URL
ALTER TABLE Veterinarians
    ADD COLUMN verification_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    ADD COLUMN certificate_url VARCHAR(255) NULL,
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Ensure existing seed vet is approved
UPDATE Veterinarians SET verification_status = 'Approved' WHERE email = 'vet@poultryguard.com';

-- 3. Extend Farmers with Wi-Fi SSID and password
ALTER TABLE Farmers
    ADD COLUMN wifi_ssid VARCHAR(100) NULL,
    ADD COLUMN wifi_password VARCHAR(255) NULL;

-- 4. Extend Hardware_Assignment_Requests with Wi-Fi SSID and password
ALTER TABLE Hardware_Assignment_Requests
    ADD COLUMN wifi_ssid VARCHAR(100) NULL,
    ADD COLUMN wifi_password VARCHAR(255) NULL;

-- 5. Extend Hardware_Kits with Wi-Fi SSID and password
ALTER TABLE Hardware_Kits
    ADD COLUMN wifi_ssid VARCHAR(100) NULL,
    ADD COLUMN wifi_password VARCHAR(255) NULL;
