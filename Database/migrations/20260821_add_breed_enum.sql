-- Migration: Add breed ENUM to Farmers table and update farm_type to align with dataset breeds
-- Supported Breeds:
-- 1. White Leghorn (Commercial Layer)
-- 2. Rhode Island Red (Dual Purpose)
-- 3. Broiler Ross 308 (Commercial Meat)

ALTER TABLE Farmers
    ADD COLUMN breed ENUM('White Leghorn', 'Rhode Island Red', 'Broiler Ross 308') DEFAULT 'Broiler Ross 308';

-- Also allow farm_type to be nullable or accept breed-aligned values
ALTER TABLE Farmers
    MODIFY farm_type ENUM('Broiler', 'Layer', 'Breeder', 'White Leghorn', 'Rhode Island Red', 'Broiler Ross 308') NULL;
