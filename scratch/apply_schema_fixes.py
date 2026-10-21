import psycopg2
import urllib.parse

pwd = urllib.parse.quote('Apurva@3522', safe='')
url = f'postgresql://postgres.uhgbahpyfzbficruiaos:{pwd}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require'
conn = psycopg2.connect(url)
cur = conn.cursor()

print("Applying schema updates to Supabase...")

# 1. Create poultry_images table
cur.execute("""
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
""")
print("[OK] Created poultry_images table and index.")

# 2. Add supabase_user_id columns where auth_user_id exists
user_tables = ['admins', 'farmers', 'veterinarians', 'vendors']
for tbl in user_tables:
    cur.execute(f"""
        ALTER TABLE "{tbl}" ADD COLUMN IF NOT EXISTS supabase_user_id VARCHAR(64);
        UPDATE "{tbl}" SET supabase_user_id = auth_user_id::text 
        WHERE supabase_user_id IS NULL AND auth_user_id IS NOT NULL;
    """)
    print(f"[OK] Added supabase_user_id column to {tbl}.")

conn.commit()

# Verify
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'poultry_images'")
print("Verified poultry_images exists:", cur.fetchone())

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'supabase_user_id'")
print("Verified admins.supabase_user_id exists:", cur.fetchone())

conn.close()
print("All updates committed successfully!")
