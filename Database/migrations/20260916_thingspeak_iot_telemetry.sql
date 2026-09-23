-- ====================================================================
-- Migration: 20260916_thingspeak_iot_telemetry.sql
-- Description: Adds ThingSpeak IoT channel configuration to Hardware_Kits
--              and creates a dedicated telemetry table for sensor data.
-- ====================================================================

-- 1. Extend Hardware_Kits table with ThingSpeak & ESP8266 metadata
ALTER TABLE Hardware_Kits
ADD COLUMN IF NOT EXISTS thingspeak_channel_id VARCHAR(100) NULL AFTER model_version,
ADD COLUMN IF NOT EXISTS thingspeak_read_api_key VARCHAR(100) NULL AFTER thingspeak_channel_id,
ADD COLUMN IF NOT EXISTS thingspeak_write_api_key VARCHAR(100) NULL AFTER thingspeak_read_api_key,
ADD COLUMN IF NOT EXISTS esp8266_device_id VARCHAR(100) NULL AFTER thingspeak_write_api_key,
ADD COLUMN IF NOT EXISTS last_telemetry_at DATETIME NULL AFTER esp8266_device_id;

-- 2. Create Telemetry table for high-frequency IoT readings
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
);

CREATE INDEX idx_telemetry_kit_recorded ON telemetry (hardware_kit_id, recorded_at DESC);
CREATE INDEX idx_telemetry_farmer_recorded ON telemetry (farmer_id, recorded_at DESC);
