import urllib.parse
import psycopg2

def _sanitize_pg_url(url: str) -> str:
    if not url:
        return url
    url = url.strip().strip("'\"")
    for var_prefix in ("DATABASE_URL=", "DATABASE_URL =", "DATABASE_URI=", "DATABASE_URI ="):
        if url.startswith(var_prefix):
            url = url[len(var_prefix):].strip().strip("'\"")
            break

    prefix = ""
    for p in ("postgresql://", "postgres://"):
        if url.startswith(p):
            prefix = p
            break
    if not prefix:
        return url
    rest = url[len(prefix):]
    if "@" not in rest:
        return "postgresql://" + rest
    userinfo, hostinfo = rest.rsplit("@", 1)
    if ":" in userinfo:
        user, pwd = userinfo.split(":", 1)
        user = urllib.parse.quote(urllib.parse.unquote(user), safe="")
        pwd = urllib.parse.quote(urllib.parse.unquote(pwd), safe="")
        return f"postgresql://{user}:{pwd}@{hostinfo}"
    return f"postgresql://{rest}"

test_inputs = [
    'DATABASE_URL=postgresql://postgres.uhgbahpyfzbficruiaos:Apurva%403522@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require',
    '"DATABASE_URL=postgresql://postgres.uhgbahpyfzbficruiaos:Apurva%403522@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"',
    'postgresql://postgres.uhgbahpyfzbficruiaos:Apurva%403522@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require'
]

for t in test_inputs:
    cleaned = _sanitize_pg_url(t)
    print("Cleaned:", cleaned)
    c = psycopg2.connect(cleaned)
    print("Connection OK!")
    c.close()
