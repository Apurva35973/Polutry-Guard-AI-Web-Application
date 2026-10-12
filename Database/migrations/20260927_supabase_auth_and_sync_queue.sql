-- ====================================================================
-- Migration: 20260927_supabase_auth_and_sync_queue.sql
-- Description: Adds supabase_user_id to user/profile tables,
--              makes password_hash optional, and creates the
--              sync_queue table for idempotent outbox synchronization.
-- ====================================================================

-- 1. Farmers: add supabase_user_id and make password_hash nullable
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Farmers' AND COLUMN_NAME = 'supabase_user_id');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE Farmers ADD COLUMN supabase_user_id VARCHAR(36) NULL, ADD INDEX idx_farmers_supabase_user_id (supabase_user_id)', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE Farmers MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- 2. Veterinarians: add supabase_user_id and make password_hash nullable
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Veterinarians' AND COLUMN_NAME = 'supabase_user_id');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE Veterinarians ADD COLUMN supabase_user_id VARCHAR(36) NULL, ADD INDEX idx_veterinarians_supabase_user_id (supabase_user_id)', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE Veterinarians MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- 3. Admins: add supabase_user_id and make password_hash nullable
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Admins' AND COLUMN_NAME = 'supabase_user_id');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE Admins ADD COLUMN supabase_user_id VARCHAR(36) NULL, ADD INDEX idx_admins_supabase_user_id (supabase_user_id)', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE Admins MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- 4. Vendors: add supabase_user_id and make password_hash nullable
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Vendors' AND COLUMN_NAME = 'supabase_user_id');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE Vendors ADD COLUMN supabase_user_id VARCHAR(36) NULL, ADD INDEX idx_vendors_supabase_user_id (supabase_user_id)', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE Vendors MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- 5. sync_queue: outbox table for reliable, idempotent Supabase synchronization
CREATE TABLE IF NOT EXISTS sync_queue (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    record_id VARCHAR(64) NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    payload JSON NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at DATETIME NULL,
    next_retry_at DATETIME NULL,
    error_message TEXT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    INDEX idx_sync_queue_status_retry (status, next_retry_at),
    INDEX idx_sync_queue_table_record (table_name, record_id)
);
