import os
import sys
import json
import urllib.parse
from datetime import datetime
import mysql.connector
import psycopg2
import psycopg2.extras

def migrate():
    # 1. Connect to MySQL
    m_conn = mysql.connector.connect(
        user='root',
        password='Apurva@3522',
        host='localhost',
        database='poultryguard_ai'
    )
    m_cur = m_conn.cursor(dictionary=True)

    # 2. Connect to Supabase PostgreSQL
    pwd = urllib.parse.quote('Apurva@3522', safe='')
    pg_conn = psycopg2.connect(
        f'postgresql://postgres:{pwd}@db.uhgbahpyfzbficruiaos.supabase.co:5432/postgres?sslmode=require'
    )
    pg_conn.autocommit = False
    p_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    print("Connected to both MySQL and Supabase PostgreSQL!")

    # Table migration order to respect foreign keys:
    # 1. Admins (ON CONFLICT DO NOTHING)
    # 2. Veterinarians (ON CONFLICT DO NOTHING)
    # 3. Farmers (ON CONFLICT DO NOTHING)
    # 4. Vendors
    # 5. Hardware_Kits
    # 6. Device_Assignments
    # 7. Hardware_Assignment_Requests
    # 8. Environment_Readings
    # 9. Environment_Alerts
    # 10. Disease_Predictions
    # 11. Disease_Prediction_Details
    # 12. Farmer_Alerts
    # 13. Vet_Consultations
    # 14. Telemetry

    tables_to_migrate = [
        "admins",
        "veterinarians",
        "farmers",
        "vendors",
        "hardware_kits",
        "devices",
        "device_assignments",
        "hardware_assignment_requests",
        "environment_readings",
        "environment_alerts",
        "disease_predictions",
        "disease_prediction_details",
        "farmer_alerts",
        "vet_consultations",
        "telemetry",
    ]

    for table in tables_to_migrate:
        try:
            m_cur.execute(f"SELECT * FROM `{table}`")
            rows = m_cur.fetchall()
            if not rows:
                print(f"Table {table}: 0 rows in MySQL, skipping.")
                continue

            # Fetch columns for Supabase table
            p_cur.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s
            """, (table.lower(),))
            pg_cols = set(r['column_name'] for r in p_cur.fetchall())

            inserted = 0
            for row in rows:
                filtered = {}
                for k, v in row.items():
                    k_lower = k.lower()
                    if table == "vendors" and k_lower == "owner_name":
                        filtered["vendor_name"] = v
                    if k_lower in pg_cols:
                        if isinstance(v, int) and k_lower in ("resolved", "is_resolved", "is_read", "is_active"):
                            filtered[k_lower] = bool(v)
                        else:
                            filtered[k_lower] = v

                if not filtered:
                    continue

                col_names = list(filtered.keys())
                col_list = ", ".join(f'"{c}"' for c in col_names)
                placeholders = ", ".join(["%s"] * len(col_names))
                vals = [filtered[c] for c in col_names]

                # Identify primary key candidate (e.g. table[:-1] + '_id' or 'id')
                pk = None
                for candidate in [col_names[0], f"{table.rstrip('s')}_id", "id"]:
                    if candidate in col_names:
                        pk = candidate
                        break

                if pk:
                    query = f"""
                        INSERT INTO "{table.lower()}" ({col_list})
                        VALUES ({placeholders})
                        ON CONFLICT ("{pk}") DO NOTHING
                    """
                else:
                    query = f"""
                        INSERT INTO "{table.lower()}" ({col_list})
                        VALUES ({placeholders})
                    """

                p_cur.execute(query, vals)
                inserted += p_cur.rowcount

            pg_conn.commit()

            # Advance serial sequence if serial primary key exists
            if pk:
                try:
                    p_cur.execute(f"""
                        SELECT setval(pg_get_serial_sequence('{table.lower()}', '{pk}'), 
                                      COALESCE(MAX("{pk}"), 1)) 
                        FROM "{table.lower()}"
                    """)
                    pg_conn.commit()
                except Exception as seq_err:
                    pg_conn.rollback()

            print(f"[SUCCESS] Table '{table}': inserted {inserted}/{len(rows)} records into Supabase.")

        except Exception as e:
            pg_conn.rollback()
            print(f"[ERROR] Table '{table}': {e}")

    m_conn.close()
    pg_conn.close()
    print("Migration finished!")

if __name__ == '__main__':
    migrate()
