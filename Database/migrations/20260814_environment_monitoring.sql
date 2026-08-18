-- Stores historical weather readings and threshold alerts for the farmer dashboard.
CREATE TABLE IF NOT EXISTS environment_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    humidity DECIMAL(5,2) NOT NULL,
    timestamp DATETIME NOT NULL,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    INDEX idx_environment_readings_farm_timestamp (farm_id, timestamp),
    CONSTRAINT fk_environment_readings_farm
        FOREIGN KEY (farm_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS environment_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    parameter VARCHAR(30) NOT NULL,
    value DECIMAL(8,2) NOT NULL,
    threshold DECIMAL(8,2) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    INDEX idx_environment_alerts_farm_timestamp (farm_id, timestamp),
    CONSTRAINT fk_environment_alerts_farm
        FOREIGN KEY (farm_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);
