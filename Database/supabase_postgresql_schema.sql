-- ====================================================================
-- Poultry Guard AI — Complete Supabase PostgreSQL Schema
-- Idempotent DDL Migration for Supabase SQL Editor
-- ====================================================================

-- Function to handle automated updated_at timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. FARMERS TABLE
CREATE TABLE IF NOT EXISTS farmers (
    farmer_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(25) UNIQUE,
    password_hash VARCHAR(255) NULL,
    supabase_user_id VARCHAR(64) NULL,
    farm_name VARCHAR(150),
    farm_type VARCHAR(50) DEFAULT 'Broiler',
    breed VARCHAR(50) DEFAULT 'Broiler Ross 308',
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    total_birds INT DEFAULT 0,
    wifi_ssid VARCHAR(100) NULL,
    wifi_password VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farmers_email ON farmers (email);
CREATE INDEX IF NOT EXISTS idx_farmers_supabase_user_id ON farmers (supabase_user_id);

-- 2. VETERINARIANS TABLE
CREATE TABLE IF NOT EXISTS veterinarians (
    vet_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(25) UNIQUE,
    specialization VARCHAR(100),
    license_number VARCHAR(50) UNIQUE,
    experience_years INT,
    hospital_clinic VARCHAR(150),
    password_hash VARCHAR(255) NULL,
    supabase_user_id VARCHAR(64) NULL,
    verification_status VARCHAR(20) DEFAULT 'Pending',
    certificate_url VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vets_email ON veterinarians (email);
CREATE INDEX IF NOT EXISTS idx_vets_supabase_user_id ON veterinarians (supabase_user_id);

-- 3. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(25),
    password_hash VARCHAR(255) NULL,
    supabase_user_id VARCHAR(64) NULL,
    role VARCHAR(50) DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email);
CREATE INDEX IF NOT EXISTS idx_admins_supabase_user_id ON admins (supabase_user_id);

-- 4. VENDORS TABLE
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(100) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(25) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    supabase_user_id VARCHAR(64) NULL,
    vehicle_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50),
    carrying_capacity INT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status VARCHAR(20) DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors (email);
CREATE INDEX IF NOT EXISTS idx_vendors_supabase_user_id ON vendors (supabase_user_id);

-- 5. HARDWARE KITS TABLE
CREATE TABLE IF NOT EXISTS hardware_kits (
    hardware_kit_id SERIAL PRIMARY KEY,
    kit_code VARCHAR(50) NOT NULL UNIQUE,
    esp32_device_id VARCHAR(100) NOT NULL UNIQUE,
    pcb_serial_number VARCHAR(100) NULL UNIQUE,
    firmware_version VARCHAR(50) NULL,
    model_version VARCHAR(50) NULL,
    temperature_sensor_serial VARCHAR(100) NULL,
    humidity_sensor_serial VARCHAR(100) NULL,
    ammonia_sensor_serial VARCHAR(100) NULL,
    microphone_sensor_serial VARCHAR(100) NULL,
    camera_serial VARCHAR(100) NULL,
    thingspeak_channel_id VARCHAR(100) NULL,
    thingspeak_read_api_key VARCHAR(100) NULL,
    thingspeak_write_api_key VARCHAR(100) NULL,
    esp8266_device_id VARCHAR(100) NULL,
    last_telemetry_at TIMESTAMP NULL,
    wifi_ssid VARCHAR(100) NULL,
    wifi_password VARCHAR(255) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Available',
    assigned_farmer_id INT NULL REFERENCES farmers(farmer_id) ON DELETE SET NULL,
    last_seen_at TIMESTAMP NULL,
    assigned_at TIMESTAMP NULL,
    installation_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hw_kit_farmer ON hardware_kits (assigned_farmer_id);
CREATE INDEX IF NOT EXISTS idx_hw_kit_code ON hardware_kits (kit_code);

-- 6. DEVICES TABLE (Legacy device tracking)
CREATE TABLE IF NOT EXISTS devices (
    device_id SERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    qr_code VARCHAR(255) UNIQUE,
    esp32_id VARCHAR(100),
    raspberrypi_id VARCHAR(100),
    shed_name VARCHAR(100),
    installation_date DATE,
    pcb_serial_number VARCHAR(100) NULL,
    firmware_version VARCHAR(50) NULL,
    last_seen_at TIMESTAMP NULL,
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_farmer ON devices (farmer_id);

-- 7. DEVICE ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS device_assignments (
    assignment_id SERIAL PRIMARY KEY,
    hardware_kit_id INT NOT NULL REFERENCES hardware_kits(hardware_kit_id) ON DELETE CASCADE,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    farm_name_snapshot VARCHAR(150) NOT NULL,
    assigned_by_admin_id INT NOT NULL REFERENCES admins(admin_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP NULL,
    replacement_reason TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);

CREATE INDEX IF NOT EXISTS idx_device_assign_farmer ON device_assignments (farmer_id);
CREATE INDEX IF NOT EXISTS idx_device_assign_kit ON device_assignments (hardware_kit_id);

-- 8. DEVICE HEARTBEATS TABLE
CREATE TABLE IF NOT EXISTS device_heartbeats (
    heartbeat_id BIGSERIAL PRIMARY KEY,
    hardware_kit_id INT NOT NULL REFERENCES hardware_kits(hardware_kit_id) ON DELETE CASCADE,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_kit_received ON device_heartbeats (hardware_kit_id, received_at DESC);

-- 9. HARDWARE ASSIGNMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS hardware_assignment_requests (
    request_id SERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    farm_name_snapshot VARCHAR(150) NOT NULL,
    location_snapshot TEXT NULL,
    reason TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    wifi_ssid VARCHAR(100) NULL,
    wifi_password VARCHAR(255) NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hw_req_farmer ON hardware_assignment_requests (farmer_id);

-- 10. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    farmer_id INT NULL REFERENCES farmers(farmer_id) ON DELETE SET NULL,
    hardware_kit_id INT NULL REFERENCES hardware_kits(hardware_kit_id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    issue TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_farmer ON support_tickets (farmer_id);

-- 11. SENSOR DATA TABLE (Direct legacy sensor stream)
CREATE TABLE IF NOT EXISTS sensor_data (
    sensor_id BIGSERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    ammonia DECIMAL(6,2),
    sound_level DECIMAL(6,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_device ON sensor_data (device_id, timestamp DESC);

-- 12. TELEMETRY TABLE (ThingSpeak IoT High-frequency sensor ingestion)
CREATE TABLE IF NOT EXISTS telemetry (
    telemetry_id SERIAL PRIMARY KEY,
    hardware_kit_id INT NOT NULL REFERENCES hardware_kits(hardware_kit_id) ON DELETE CASCADE,
    farmer_id INT NULL REFERENCES farmers(farmer_id) ON DELETE SET NULL,
    thingspeak_entry_id BIGINT NULL,
    temperature DECIMAL(5,2) NULL,
    humidity DECIMAL(5,2) NULL,
    ammonia DECIMAL(6,2) NULL,
    vocalization_activity DECIMAL(5,2) NULL,
    raw_payload JSONB NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_kit_thingspeak_entry UNIQUE (hardware_kit_id, thingspeak_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_kit_recorded ON telemetry (hardware_kit_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_farmer_recorded ON telemetry (farmer_id, recorded_at DESC);

-- 13. DISEASE PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS disease_predictions (
    prediction_id SERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    disease_name VARCHAR(100),
    risk_level VARCHAR(20),
    confidence_score DECIMAL(5,2),
    prediction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_used VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_disease_pred_farmer ON disease_predictions (farmer_id, prediction_time DESC);

-- 14. DISEASE PREDICTION DETAILS TABLE
CREATE TABLE IF NOT EXISTS disease_prediction_details (
    prediction_detail_id BIGSERIAL PRIMARY KEY,
    prediction_id INT NULL REFERENCES disease_predictions(prediction_id) ON DELETE SET NULL,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    predicted_class VARCHAR(100) NOT NULL,
    confidence DECIMAL(7,6) NOT NULL,
    probabilities JSONB NULL,
    image_name VARCHAR(255) NULL,
    screened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pred_detail_farmer ON disease_prediction_details (farmer_id);

-- 15. POULTRY IMAGES TABLE (Storage and classification pipeline)
CREATE TABLE IF NOT EXISTS poultry_images (
    image_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    device_id INT NULL,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'poultry-images',
    storage_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NULL,
    file_size_bytes BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    source VARCHAR(50) DEFAULT 'manual_upload',
    processing_status VARCHAR(50) DEFAULT 'processing',
    prediction_id INT NULL REFERENCES disease_predictions(prediction_id) ON DELETE SET NULL,
    predicted_class VARCHAR(100) NULL,
    confidence DECIMAL(7,2) NULL,
    error_message VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_poultry_images_farmer ON poultry_images (farmer_id, created_at DESC);

-- 16. VET CONSULTATIONS TABLE
CREATE TABLE IF NOT EXISTS vet_consultations (
    consultation_id SERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    vet_id INT NOT NULL REFERENCES veterinarians(vet_id) ON DELETE CASCADE,
    disease_name VARCHAR(100),
    recommendation TEXT,
    consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pending'
);

CREATE INDEX IF NOT EXISTS idx_consult_farmer ON vet_consultations (farmer_id);
CREATE INDEX IF NOT EXISTS idx_consult_vet ON vet_consultations (vet_id);

-- 17. ALERTS TABLE (General alerts)
CREATE TABLE IF NOT EXISTS alerts (
    alert_id SERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    alert_type VARCHAR(100),
    severity VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_alerts_farmer ON alerts (farmer_id, created_at DESC);

-- 18. FARMER ALERTS TABLE (Scoped biosecurity and telemetry alerts)
CREATE TABLE IF NOT EXISTS farmer_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    device_id INT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    alert_key VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farmer_alerts ON farmer_alerts (farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_cooldown ON farmer_alerts (farmer_id, alert_key, created_at DESC);

-- 19. OUTBREAK ALERTS TABLE
CREATE TABLE IF NOT EXISTS outbreak_alerts (
    outbreak_id SERIAL PRIMARY KEY,
    source_farm_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    target_farm_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    disease_name VARCHAR(100),
    radius_km DECIMAL(5,2),
    alert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active'
);

CREATE INDEX IF NOT EXISTS idx_outbreak_target ON outbreak_alerts (target_farm_id, alert_time DESC);

-- 20. CHATBOT HISTORY TABLE
CREATE TABLE IF NOT EXISTS chatbot_history (
    chat_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_farmer ON chatbot_history (farmer_id, timestamp DESC);

-- 21. TRANSPORT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS transport_requests (
    request_id SERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    vendor_id INT NULL REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    bird_count INT NOT NULL,
    bird_type VARCHAR(50),
    pickup_address TEXT,
    destination_address TEXT,
    pickup_date TIMESTAMP,
    request_status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transport_farmer ON transport_requests (farmer_id);
CREATE INDEX IF NOT EXISTS idx_transport_vendor ON transport_requests (vendor_id);

-- 22. VENDOR TRIPS TABLE
CREATE TABLE IF NOT EXISTS vendor_trips (
    trip_id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    request_id INT NOT NULL REFERENCES transport_requests(request_id) ON DELETE CASCADE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    distance_km DECIMAL(8,2),
    trip_status VARCHAR(20) DEFAULT 'Started'
);

CREATE INDEX IF NOT EXISTS idx_trips_vendor ON vendor_trips (vendor_id);

-- 23. ENVIRONMENT READINGS TABLE
CREATE TABLE IF NOT EXISTS environment_readings (
    id BIGSERIAL PRIMARY KEY,
    farm_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    temperature DECIMAL(5,2) NOT NULL,
    humidity DECIMAL(5,2) NOT NULL,
    ammonia DECIMAL(6,2) NULL,
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_env_readings_farm_timestamp ON environment_readings (farm_id, timestamp DESC);

-- 24. ENVIRONMENT ALERTS TABLE
CREATE TABLE IF NOT EXISTS environment_alerts (
    id BIGSERIAL PRIMARY KEY,
    farm_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    parameter VARCHAR(30) NOT NULL,
    value DECIMAL(8,2) NOT NULL,
    threshold DECIMAL(8,2) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_env_alerts_farm_timestamp ON environment_alerts (farm_id, timestamp DESC);

-- 25. FARM ENVIRONMENT THRESHOLDS TABLE
CREATE TABLE IF NOT EXISTS farm_environment_thresholds (
    threshold_id BIGSERIAL PRIMARY KEY,
    farm_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    metric VARCHAR(30) NOT NULL,
    warning_low DECIMAL(8,2) NULL,
    warning_high DECIMAL(8,2) NULL,
    critical_low DECIMAL(8,2) NULL,
    critical_high DECIMAL(8,2) NULL,
    cooldown_minutes INT NOT NULL DEFAULT 30,
    CONSTRAINT uq_farm_metric UNIQUE (farm_id, metric)
);

-- 26. MORTALITY RECORDS TABLE
CREATE TABLE IF NOT EXISTS mortality_records (
    mortality_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    flock_id VARCHAR(100) NULL,
    death_count INT NOT NULL,
    observed_symptoms JSONB NULL,
    custom_symptoms TEXT NULL,
    suspected_cause VARCHAR(100) NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mortality_farmer ON mortality_records (farmer_id, recorded_at DESC);

-- 27. VACCINATIONS TABLE
CREATE TABLE IF NOT EXISTS vaccinations (
    vaccination_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    flock_id VARCHAR(100) NULL,
    vaccine_name VARCHAR(150) NOT NULL,
    target_disease VARCHAR(150) NULL,
    scheduled_date DATE NOT NULL,
    completed_date DATE NULL,
    dose_information VARCHAR(255) NULL,
    notes TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vaccinations_farmer ON vaccinations (farmer_id, scheduled_date ASC);

-- 28. FARMER REMINDERS TABLE
CREATE TABLE IF NOT EXISTS farmer_reminders (
    reminder_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    task_name VARCHAR(150) NOT NULL,
    activity_category VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    recurrence VARCHAR(20) NOT NULL DEFAULT 'None',
    instructions TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON farmer_reminders (farmer_id, status, scheduled_at ASC);

-- 29. SUPPORT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS support_requests (
    request_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_req_farmer ON support_requests (farmer_id);

-- 30. VETERINARIAN REQUESTS TABLE
CREATE TABLE IF NOT EXISTS veterinarian_requests (
    request_id BIGSERIAL PRIMARY KEY,
    farmer_id INT NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
    disease_alert TEXT NULL,
    message TEXT NULL,
    snapshot JSONB NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vet_req_farmer ON veterinarian_requests (farmer_id);

-- Seed initial admin if not present
INSERT INTO admins (full_name, email, phone_number, password_hash, role)
VALUES ('System Administrator', 'admin@poultryguard.com', '9876543210', 'pbkdf2:sha256:260000$default_admin_hash', 'Admin')
ON CONFLICT (email) DO NOTHING;

-- Seed initial veterinarian if not present
INSERT INTO veterinarians (full_name, email, phone_number, specialization, license_number, experience_years, hospital_clinic, password_hash, verification_status, status)
VALUES ('Dr. Sarah Jenkins', 'vet@poultryguard.com', '9876543211', 'Avian Pathology', 'VET-MH-2024-001', 8, 'Central Avian Health Center', 'pbkdf2:sha256:260000$default_vet_hash', 'Approved', 'Available')
ON CONFLICT (email) DO NOTHING;
