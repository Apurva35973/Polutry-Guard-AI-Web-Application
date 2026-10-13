import sys
import uuid
sys.path.insert(0, 'Backend')
import app
from utlis import db_utlis
from flask_jwt_extended import create_access_token

# Mock MySQL to simulate connection failure
def broken_eq(*args, **kwargs):
    raise db_utlis.mysql.connector.errors.InterfaceError(2003, "Can't connect to MySQL server on 'localhost:3306' (Errno 111: Connection refused)")

db_utlis.executeQuery = broken_eq
import auth.routes
import Farmer.routes
auth.routes.executeQuery = broken_eq
Farmer.routes.executeQuery = broken_eq

client = app.app.test_client()

# 1. Register a test farmer
test_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
pwd = "testpassword123"
res_reg = client.post('/auth/register/farmer', json={
    'full_name': 'Farm Feather Owner',
    'email': test_email,
    'phone_number': '8177883514',
    'password': pwd
}, headers={'Origin': 'https://super-moxie-bf2daf.netlify.app'})
print('1. Registration:', res_reg.status_code, res_reg.data.decode().strip())

# 2. Login to get JWT
res_login = client.post('/auth/login', json={
    'email': test_email,
    'password': pwd,
    'role': 'Farmer'
}, headers={'Origin': 'https://super-moxie-bf2daf.netlify.app'})
data = res_login.get_json()
token = data['data']['token']
print('2. Login Token obtained.')

# 3. Test OPTIONS /farmer/profile/complete
res_opt = client.options('/farmer/profile/complete', headers={
    'Origin': 'https://super-moxie-bf2daf.netlify.app',
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'Content-Type,Authorization'
})
print('3. OPTIONS /farmer/profile/complete:', res_opt.status_code)
print('   CORS Origin:', res_opt.headers.get('Access-Control-Allow-Origin'))

# 4. Test PUT /farmer/profile/complete (Farm Feather)
res_comp = client.put('/farmer/profile/complete', json={
    'farm_name': 'Farm Feather',
    'breed': 'Rhode Island Red',
    'farm_type': 'Breeder',
    'address': 'sant mala ichalkaranji',
    'latitude': 16.681689,
    'longitude': 74.469772
}, headers={
    'Origin': 'https://super-moxie-bf2daf.netlify.app',
    'Authorization': f'Bearer {token}'
})
print('4. PUT /farmer/profile/complete:', res_comp.status_code, res_comp.data.decode().strip())
print('   CORS Origin:', res_comp.headers.get('Access-Control-Allow-Origin'))

# 5. Test GET /farmer/dashboard
res_dash = client.get('/farmer/dashboard', headers={
    'Origin': 'https://super-moxie-bf2daf.netlify.app',
    'Authorization': f'Bearer {token}'
})
print('5. GET /farmer/dashboard:', res_dash.status_code)
print('   CORS Origin:', res_dash.headers.get('Access-Control-Allow-Origin'))
