import sys
import uuid
sys.path.insert(0, 'Backend')
import app
from utlis import db_utlis

# Temporarily mock executeQuery to simulate MySQL connection refused on Render
def broken_eq(*args, **kwargs):
    raise db_utlis.mysql.connector.errors.InterfaceError(2003, "Can't connect to MySQL server on 'localhost:3306' (Errno 111: Connection refused)")

db_utlis.executeQuery = broken_eq
import auth.routes
auth.routes.executeQuery = broken_eq

client = app.app.test_client()

# 1. Register a test farmer
test_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
pwd = "testpassword123"
res_post = client.post('/auth/register/farmer', json={
    'full_name': 'Cloud Farmer',
    'email': test_email,
    'phone_number': '9876543210',
    'password': pwd
}, headers={'Origin': 'https://super-moxie-bf2daf.netlify.app'})
print('1. Registration status:', res_post.status_code, res_post.data.decode().strip())

# 2. Login as the newly registered farmer
res_login = client.post('/auth/login', json={
    'email': test_email,
    'password': pwd,
    'role': 'Farmer'
}, headers={'Origin': 'https://super-moxie-bf2daf.netlify.app'})
print('2. Login status:', res_login.status_code)
print('   Login body:', res_login.data.decode().strip()[:200])
print('   CORS Origin:', res_login.headers.get('Access-Control-Allow-Origin'))
