import mysql.connector
import psycopg2
import urllib.parse

def main():
    cnx = mysql.connector.connect(user='root', password='Apurva@3522', host='localhost', database='poultryguard_ai')
    m_cur = cnx.cursor()

    pwd = urllib.parse.quote('Apurva@3522', safe='')
    pg_conn = psycopg2.connect(f'postgresql://postgres:{pwd}@db.uhgbahpyfzbficruiaos.supabase.co:5432/postgres?sslmode=require')
    p_cur = pg_conn.cursor()

    m_cur.execute('SHOW TABLES')
    tables = [r[0].lower() for r in m_cur.fetchall()]

    print(f'{"Table":<30} | {"MySQL":<10} | {"Supabase":<10}')
    print('-' * 56)
    for t in tables:
        try:
            m_cur.execute(f'SELECT count(*) FROM `{t}`')
            m_cnt = m_cur.fetchone()[0]
            p_cur.execute(f'SELECT count(*) FROM "{t}"')
            p_cnt = p_cur.fetchone()[0]
            if m_cnt > 0 or p_cnt > 0:
                print(f'{t:<30} | {m_cnt:<10} | {p_cnt:<10}')
        except Exception as e:
            print(f'{t:<30} | err: {e}')

    cnx.close()
    pg_conn.close()

if __name__ == '__main__':
    main()
