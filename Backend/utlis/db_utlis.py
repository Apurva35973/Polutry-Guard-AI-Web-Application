import os
import re
from contextlib import contextmanager

try:
    import psycopg2
    import psycopg2.extras
except ImportError as _ie:
    raise ImportError(
        "psycopg2-binary is required. Add 'psycopg2-binary>=2.9.9' to requirements.txt "
        "and re-deploy."
    ) from _ie


def _build_dsn() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        return url

    host = (
        os.getenv("PGHOST")
        or os.getenv("DB_HOST")
        or os.getenv("SUPABASE_DB_HOST")
        or ""
    ).strip()

    if not host:
        raise ConnectionError(
            "PostgreSQL is not configured. Set DATABASE_URL (full connection string) "
            "or set PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE on Render."
        )

    port = (os.getenv("PGPORT") or os.getenv("DB_PORT") or "5432").strip()
    user = (os.getenv("PGUSER") or os.getenv("DB_USER") or "postgres").strip()
    password = (os.getenv("PGPASSWORD") or os.getenv("DB_PASSWORD") or "").strip()
    database = (os.getenv("PGDATABASE") or os.getenv("DB_NAME") or "postgres").strip()
    sslmode = (os.getenv("PGSSLMODE") or os.getenv("DB_SSLMODE") or "require").strip()

    return f"postgresql://{user}:{password}@{host}:{port}/{database}?sslmode={sslmode}"


def getConnection():
    dsn = _build_dsn()
    try:
        conn = psycopg2.connect(dsn, connect_timeout=10)
        conn.autocommit = False
        with conn.cursor() as _cur:
            _cur.execute("SELECT 1")
        return conn
    except psycopg2.OperationalError as exc:
        raise ConnectionError(
            f"Failed to connect to PostgreSQL: {exc}. "
            "Verify DATABASE_URL or PG* environment variables."
        ) from exc


_INSERT_RE = re.compile(r"^\s*INSERT\s+INTO\b", re.IGNORECASE)
_RETURNING_RE = re.compile(r"\bRETURNING\b", re.IGNORECASE)


def executeQuery(query: str, params=None):
    effective_query = query
    is_insert = bool(_INSERT_RE.search(query))
    has_returning = bool(_RETURNING_RE.search(query))

    if is_insert and not has_returning:
        effective_query = query.rstrip().rstrip(";") + " RETURNING *"

    conn = getConnection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(effective_query, params)

            if cur.description:
                rows = [dict(r) for r in cur.fetchall()]

                if is_insert and not has_returning:
                    conn.commit()
                    last_id = None
                    if rows:
                        first_row = rows[0]
                        for pk_candidate in (
                            "id",
                            list(first_row.keys())[0] if first_row else None,
                        ):
                            if pk_candidate and pk_candidate in first_row:
                                last_id = first_row[pk_candidate]
                                break
                    return {
                        "affectedRows": cur.rowcount,
                        "lastrowid": last_id,
                        "_rows": rows,
                    }

                return rows

            else:
                conn.commit()
                return {
                    "affectedRows": cur.rowcount,
                    "lastrowid": None,
                }
    except psycopg2.errors.UniqueViolation as exc:
        conn.rollback()
        raise Exception(f"Duplicate entry: {exc}") from exc
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


from contextlib import contextmanager

@contextmanager
def get_transaction_cursor():
    conn = getConnection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield cur, conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def is_db_configured() -> bool:
    try:
        _build_dsn()
        return True
    except ConnectionError:
        return False


is_mysql_configured = is_db_configured
