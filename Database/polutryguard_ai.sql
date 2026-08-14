CREATE DATABASE poultryguard_ai;
USE poultryguard_ai;

-- 1. FARMERS TABLE

CREATE TABLE Farmers (
    farmer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    farm_name VARCHAR(150),
    farm_type ENUM('Broiler','Layer','Breeder'),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    total_birds INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Active','Inactive','Suspended') DEFAULT 'Active'
);

-- 2. VETERINARIANS TABLE

CREATE TABLE Veterinarians (
    vet_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) UNIQUE,
    specialization VARCHAR(100),
    license_number VARCHAR(50) UNIQUE,
    experience_years INT,
    hospital_clinic VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('Available','Busy','Inactive') DEFAULT 'Available'
);

-- 3. ADMINS TABLE

CREATE TABLE Admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. DEVICES TABLE

CREATE TABLE Devices (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    qr_code VARCHAR(255) UNIQUE,
    esp32_id VARCHAR(100),
    raspberrypi_id VARCHAR(100),
    shed_name VARCHAR(100),
    installation_date DATE,
    status ENUM('Active','Inactive','Maintenance') DEFAULT 'Active',

    FOREIGN KEY (farmer_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE
);

-- 5. SENSOR DATA TABLE

CREATE TABLE Sensor_Data (
    sensor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,

    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    ammonia DECIMAL(6,2),
    sound_level DECIMAL(6,2),

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (device_id)
    REFERENCES Devices(device_id)
    ON DELETE CASCADE
);

-- 6. DISEASE PREDICTIONS TABLE

CREATE TABLE Disease_Predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,

    farmer_id INT NOT NULL,

    disease_name VARCHAR(100),
    risk_level ENUM('Low','Medium','High'),
    confidence_score DECIMAL(5,2),

    prediction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    model_used VARCHAR(100),

    FOREIGN KEY (farmer_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE
);


-- 7. VET CONSULTATIONS TABLE

CREATE TABLE Vet_Consultations (
    consultation_id INT AUTO_INCREMENT PRIMARY KEY,

    farmer_id INT NOT NULL,
    vet_id INT NOT NULL,

    disease_name VARCHAR(100),
    recommendation TEXT,

    consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    status ENUM('Pending','Completed','Cancelled')
            DEFAULT 'Pending',

    FOREIGN KEY (farmer_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE,

    FOREIGN KEY (vet_id)
    REFERENCES Veterinarians(vet_id)
    ON DELETE CASCADE
);


-- 8. ALERTS TABLE

CREATE TABLE Alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,

    farmer_id INT NOT NULL,

    alert_type VARCHAR(100),
    severity ENUM('Low','Medium','High','Critical'),

    message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    acknowledged BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (farmer_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE
);


-- 9. OUTBREAK ALERTS TABLE

CREATE TABLE Outbreak_Alerts (
    outbreak_id INT AUTO_INCREMENT PRIMARY KEY,

    source_farm_id INT NOT NULL,
    target_farm_id INT NOT NULL,

    disease_name VARCHAR(100),

    radius_km DECIMAL(5,2),

    alert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    status ENUM('Active','Resolved')
           DEFAULT 'Active',

    FOREIGN KEY (source_farm_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE,

    FOREIGN KEY (target_farm_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE
);

-- 10. CHATBOT HISTORY TABLE

CREATE TABLE Chatbot_History (
    chat_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    farmer_id INT NOT NULL,

    question TEXT NOT NULL,
    response TEXT NOT NULL,

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (farmer_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE
);

INSERT INTO Admins
(
    full_name,
    email,
    phone_number,
    password_hash,
    role
)
VALUES
(
    'System Admin',
    'admin@poultryguard.com',
    '9999999999',
    '$5$rounds=535000$6WYPWXY0XkO63tln$xrBBC9k.aJr232Cx/ua68SKOp8sIxaePrRCnJsgKLN6',
    'Super Admin'
);
CREATE TABLE Vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY,

    vendor_name VARCHAR(100) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50),

    carrying_capacity INT NOT NULL,

    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    status ENUM(
        'Available',
        'Busy',
        'Inactive'
    ) DEFAULT 'Available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Transport_Requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,

    farmer_id INT NOT NULL,

    vendor_id INT NULL,

    bird_count INT NOT NULL,

    bird_type VARCHAR(50),

    pickup_address TEXT,

    destination_address TEXT,

    pickup_date DATETIME,

    request_status ENUM(
        'Pending',
        'Accepted',
        'In_Transit',
        'Completed',
        'Cancelled'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (farmer_id)
    REFERENCES Farmers(farmer_id)
    ON DELETE CASCADE,

    FOREIGN KEY (vendor_id)
    REFERENCES Vendors(vendor_id)
    ON DELETE SET NULL
);
CREATE TABLE Vendor_Trips (
    trip_id INT AUTO_INCREMENT PRIMARY KEY,

    vendor_id INT NOT NULL,

    request_id INT NOT NULL,

    start_time DATETIME,

    end_time DATETIME,

    distance_km DECIMAL(8,2),

    trip_status ENUM(
        'Started',
        'Completed'
    ) DEFAULT 'Started',

    FOREIGN KEY (vendor_id)
    REFERENCES Vendors(vendor_id)
    ON DELETE CASCADE,

    FOREIGN KEY (request_id)
    REFERENCES Transport_Requests(request_id)
    ON DELETE CASCADE
);
SELECT * FROM Vendors;

UPDATE Admins
SET password_hash='$5$rounds=535000$V0WA6wh/.C/n3I4l$4AHhKeXAjazZ8MJHzOw2nUh5T9Hf0Ukw69WHZp1SEVA'
WHERE admin_id=1;
SELECT * FROM Admins;

DELETE FROM  Farmers;
