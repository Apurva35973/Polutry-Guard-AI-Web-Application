import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# 1. Initialize Firebase with your downloaded JSON file
cred = credentials.Certificate("../Firebase-credentials.json")
firebase_admin.initialize_app(cred)

# 2. Open the Firestore Client
db = firestore.client()

# 3. Define the data you want to send
poultry_data = {
    "device_id": "sensor_node_01",
    "temperature_celsius": 26.8,
    "humidity_percentage": 65,
    "chicken_count_detected": 14,
    "status": "Optimal",
    "timestamp": firestore.SERVER_TIMESTAMP  # Captures exact server time
}

try:
    # 4. This line automatically creates a table called "poultry_logs" 
    # and inserts a document with an auto-generated unique ID.
    db.collection("poultry_logs").add(poultry_data)
    print("🔥 Success! Data sent to Firestore. Check your browser dashboard!")
    
except Exception as e:
    print(f"❌ Error connecting to Firebase: {e}")
