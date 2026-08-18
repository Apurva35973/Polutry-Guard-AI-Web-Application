-- Farmer biosecurity extension.  A farm is represented by the existing Farmers row.
-- Apply after 20260814_environment_monitoring.sql.
-- MySQL 8.0.29+ supports ADD COLUMN IF NOT EXISTS, but older deployed MySQL
-- versions do not. Use information_schema so this migration can be run safely.
SET @ammonia_column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'environment_readings' AND COLUMN_NAME = 'ammonia'
);
SET @add_ammonia_sql := IF(@ammonia_column_exists = 0,
    'ALTER TABLE environment_readings ADD COLUMN ammonia DECIMAL(6,2) NULL',
    'SELECT 1');
PREPARE add_ammonia_statement FROM @add_ammonia_sql;
EXECUTE add_ammonia_statement;
DEALLOCATE PREPARE add_ammonia_statement;

CREATE TABLE IF NOT EXISTS farm_environment_thresholds (
    threshold_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    metric ENUM('temperature','humidity','ammonia') NOT NULL,
    warning_low DECIMAL(8,2) NULL, warning_high DECIMAL(8,2) NULL,
    critical_low DECIMAL(8,2) NULL, critical_high DECIMAL(8,2) NULL,
    cooldown_minutes INT NOT NULL DEFAULT 30,
    UNIQUE KEY uq_farm_metric (farm_id, metric),
    FOREIGN KEY (farm_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Mortality_Records (
    mortality_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL, flock_id VARCHAR(100) NULL, death_count INT NOT NULL,
    observed_symptoms JSON NULL, custom_symptoms TEXT NULL, suspected_cause VARCHAR(100) NULL,
    recorded_at DATETIME NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Vaccinations (
    vaccination_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL, flock_id VARCHAR(100) NULL, vaccine_name VARCHAR(150) NOT NULL,
    target_disease VARCHAR(150) NULL, scheduled_date DATE NOT NULL, completed_date DATE NULL,
    dose_information VARCHAR(255) NULL, notes TEXT NULL,
    status ENUM('Scheduled','Due Soon','Due Today','Completed','Missed') NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Farmer_Alerts (
    alert_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL, device_id INT NULL, category ENUM('ENVIRONMENTAL','DISEASE RISK','MORTALITY','DEVICE','VACCINATION','SYSTEM') NOT NULL,
    severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL, title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL, alert_key VARCHAR(255) NULL, status ENUM('Unread','Read','Acknowledged','Resolved') NOT NULL DEFAULT 'Unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_farmer_alerts (farmer_id, created_at), INDEX idx_alert_cooldown (farmer_id, alert_key, created_at),
    FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Disease_Prediction_Details (
    prediction_detail_id BIGINT AUTO_INCREMENT PRIMARY KEY, prediction_id INT NULL, farmer_id INT NOT NULL,
    predicted_class VARCHAR(100) NOT NULL, confidence DECIMAL(7,6) NOT NULL, probabilities JSON NULL,
    image_name VARCHAR(255) NULL, screened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE,
    FOREIGN KEY (prediction_id) REFERENCES Disease_Predictions(prediction_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Support_Requests (
    request_id BIGINT AUTO_INCREMENT PRIMARY KEY, farmer_id INT NOT NULL,
    category ENUM('Device not working','Sensor not responding','Hardware installation','Hardware replacement','Technical issue','Other') NOT NULL,
    description TEXT NOT NULL, priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
    status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Veterinarian_Requests (
    request_id BIGINT AUTO_INCREMENT PRIMARY KEY, farmer_id INT NOT NULL, disease_alert TEXT NULL,
    message TEXT NULL, snapshot JSON NULL, status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Farmer_Reminders (
    reminder_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL, task_name VARCHAR(150) NOT NULL,
    activity_category ENUM('Vaccination','Medicine','Feed','Cleaning','Disinfection','Inspection','Equipment maintenance','Other') NOT NULL,
    scheduled_at DATETIME NOT NULL, recurrence ENUM('None','Daily','Weekly','Monthly') NOT NULL DEFAULT 'None',
    instructions TEXT NULL, status ENUM('Scheduled','Completed','Overdue') NOT NULL DEFAULT 'Scheduled',
    completed_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reminders_due (farmer_id, status, scheduled_at),
    FOREIGN KEY (farmer_id) REFERENCES Farmers(farmer_id) ON DELETE CASCADE
);
