import os
import mysql.connector
from contextlib import contextmanager

def is_mysql_configured():
    host = os.getenv("MYSQL_HOST")
    is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID") or os.getenv("PORT"))
    if not host and is_render:
        return False
    return bool(host or not is_render)

def getConnection():
    host = os.getenv("MYSQL_HOST")
    is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID") or os.getenv("PORT"))

    if not host:
        if is_render:
            raise ConnectionError(
                "MYSQL_HOST is not configured in Render environment variables. "
                "Please configure MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE."
            )
        host = "localhost"

    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "root" if not is_render else "")
    password = os.getenv("MYSQL_PASSWORD", "Apurva@3522" if not is_render else "")
    database = os.getenv("MYSQL_DATABASE", "poultryguard_ai")

    return mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        use_pure=True,
        connection_timeout=5
    )

def executeQuery(query, params=None):
    """
    Executes a query on MySQL.
    - If SELECT query: returns list of row dicts.
    - If data-modifying query (INSERT/UPDATE/DELETE): commits and returns dict with
      both 'affectedRows' and 'lastrowid'.
    """
    with getConnection() as con:
        with con.cursor(dictionary=True) as cur:
            cur.execute(query, params)
            if cur.description:
                return cur.fetchall()
            else:
                con.commit()
                return {
                    "affectedRows": cur.rowcount,
                    "lastrowid": cur.lastrowid
                }

@contextmanager
def get_transaction_cursor():
    """
    Context manager for atomic multi-statement MySQL transactions.
    Rolls back automatically on exception, commits on successful block exit.
    Yields (cursor, connection).
    """
    con = getConnection()
    con.autocommit = False
    cur = con.cursor(dictionary=True)
    try:
        yield cur, con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        cur.close()
        con.close()
