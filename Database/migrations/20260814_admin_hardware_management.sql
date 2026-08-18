-- Poultry Guard Admin hardware management extension.
-- The current application models one farm in the Farmers profile; assignments
-- therefore reference farmer_id and retain the farm name as a snapshot.

ALTER TABLE Devices
    ADD COLUMN pcb_serial_number VARCHAR(100) NULL,
    ADD COLUMN firmware_version VARCHAR(50) NULL,
    ADD COLUMN last_seen_at DATETIME NULL,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
    
CREATE TABLE IF NOT EXISTS Hardware_Kits (
    hardware_kit_id INT AUTO_INCREMENT PRIMARY KEY,
    kit_code VARCHAR(50) NOT NULL UNIQUE,
    esp32_device_id VARCHAR(100) NOT NULL UNIQUE,
    pcb_serial_number VARCHAR(100) NULL UNIQUE,
    firmware_version VARCHAR(50) NULL,
    temperature_sensor_serial VARCHAR(100) NULL,
    humidity_sensor_serial VARCHAR(100) NULL,
    ammonia_sensor_serial VARCHAR(100) NULL,
    microphone_sensor_serial VARCHAR(100) NULL,
    camera_serial VARCHAR(100) NULL,
    status ENUM('Available','Assigned','Maintenance','Faulty') NOT NULL DEFAULT 'Available',
    assigned_farmer_id INT NULL,
    last_seen_at DATETIME NULL,
    assigned_at DATETIME NULL,
    installation_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_hardware_kit_farmer FOREIGN KEY (assigned_farmer_id) REFERENCES Farmers(farmer_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Device_Assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    hardware_kit_id INT NOT NULL,
    farmer_id INT NOT NULL,
    farm_name_snapshot VARCHAR(150) NOT NULL,
    assigned_by_admin_id INT NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at DATETIME NULL,
    replacement_reason TEXT NULL,
    status ENUM('Active','Replaced','Unassigned') NOT NULL DEFAULT 'Active',
    CONSTRAINT fk_assignment_kit FOREIGN KEY (hardware_kit_id) REFERENCES Hardware_Kits(hardware_kit_id),
    CONSTRAINT fk_assignment_farmer FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id),
    CONSTRAINT fk_assignment_admin FOREIGN KEY (assigned_by_admin_id) REFERENCES Admins(admin_id)
);

CREATE TABLE IF NOT EXISTS Device_Heartbeats (
    heartbeat_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hardware_kit_id INT NOT NULL,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_heartbeat_kit FOREIGN KEY (hardware_kit_id) REFERENCES Hardware_Kits(hardware_kit_id) ON DELETE CASCADE,
    INDEX idx_heartbeat_kit_received (hardware_kit_id, received_at)
);

CREATE TABLE IF NOT EXISTS Hardware_Assignment_Requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    farm_name_snapshot VARCHAR(150) NOT NULL,
    location_snapshot TEXT NULL,
    reason TEXT NOT NULL,
    priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
    status ENUM('Pending','Approved','Assigned','Rejected','Completed') NOT NULL DEFAULT 'Pending',
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignment_request_farmer FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Support_Tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NULL,
    hardware_kit_id INT NULL,
    category ENUM('Hardware assignment','Device replacement','Sensor failure','Device offline','Installation request','Technical support') NOT NULL,
    issue TEXT NOT NULL,
    priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
    status ENUM('Open','In Progress','Resolved','Rejected') NOT NULL DEFAULT 'Open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_farmer FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_kit FOREIGN KEY (hardware_kit_id) REFERENCES Hardware_Kits(hardware_kit_id) ON DELETE SET NULL
);
