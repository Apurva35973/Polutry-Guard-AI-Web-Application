-- Run once for databases created before profile completion was introduced.
ALTER TABLE Farmers
    MODIFY farm_type ENUM('Broiler','Layer','Breeder') NULL;
