import psycopg2
import urllib.parse
import re

pwd = urllib.parse.quote('Apurva@3522', safe='')
url = f'postgresql://postgres.uhgbahpyfzbficruiaos:{pwd}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require'
conn = psycopg2.connect(url)
cur = conn.cursor()

# Get existing tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
existing_tables = set(r[0].lower() for r in cur.fetchall())

# Read schema SQL
with open("Database/supabase_postgresql_schema.sql", "r") as f:
    sql = f.read()

# Find all CREATE TABLE IF NOT EXISTS <table_name>
table_matches = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)", sql, re.IGNORECASE)

missing_tables = []
for t in table_matches:
    t_clean = t.lower()
    if t_clean not in existing_tables:
        missing_tables.append(t_clean)

print("Tables defined in SQL:", len(table_matches))
print("Existing in Supabase:", len(existing_tables))
print("Missing tables:", set(missing_tables))

conn.close()
