import psycopg2
import urllib.parse

pwd = urllib.parse.quote('Apurva@3522', safe='')
url = f'postgresql://postgres.uhgbahpyfzbficruiaos:{pwd}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require'
conn = psycopg2.connect(url)
cur = conn.cursor()

# Check tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
all_tables = [r[0] for r in cur.fetchall()]
print('poultry_images in DB?:', 'poultry_images' in all_tables)

# Check columns of admins, farmers, veterinarians
for t in ['admins', 'farmers', 'veterinarians']:
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{t}'")
    cols = [r[0] for r in cur.fetchall()]
    print(f'{t} columns: {cols}')

conn.close()
