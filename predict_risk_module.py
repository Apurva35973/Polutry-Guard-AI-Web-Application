import os
import pickle
import pandas as pd

# Define paths
data_dir = r"d:\Polutry Guard\Polutry-Guard-AI\Temperature and Humidity Sensory Data"
model_path = os.path.join(data_dir, "poultry_risk_model.pkl")

def predict_risk(
    temperature,
    humidity,
    mortality_rate,
    egg_production,
    amount_of_feeding,
    active_birds,
    bird_age=35,               # Sensible default: 35 days (mid-point of cycle)
    vaccination_status="Vaccinated"  # Sensible default: Vaccinated
):
    """
    Predicts the disease outbreak risk level in poultry farms based on environmental and farm management factors.
    
    Parameters:
    -----------
    temperature : float
        Temperature in Celsius (°C)
    humidity : float
        Relative humidity (%)
    mortality_rate : float
        Daily mortality rate (%)
    egg_production : int
        Number of eggs produced today
    amount_of_feeding : float
        Amount of feed distributed today (kg/day)
    active_birds : int
        Number of active (alive) birds in the house today
    bird_age : int, optional
        Flock age in days (defaults to 35)
    vaccination_status : str, optional
        'Vaccinated' or 'Unvaccinated' (defaults to 'Vaccinated')
        
    Returns:
    --------
    risk_score : float
        A probability score of elevated risk (Medium/High) ranging from 0.0 to 1.0.
    risk_level : str
        Predicted risk level ('Low', 'Medium', 'High')
    """
    
    # 1. Load the pickled model and preprocessor
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Trained model file not found at '{model_path}'. "
            f"Please run 'poultry_ml_pipeline.py' first to train and save the model."
        )
        
    with open(model_path, "rb") as f:
        payload = pickle.load(f)
        
    model = payload["model"]
    scaler = payload["scaler"]
    numeric_cols = payload["numeric_cols"]
    feature_cols = payload["feature_cols"]
    inv_risk_map = payload["inv_risk_map"]
    
    # 2. Encode categorical variables and map features
    vacc_encoded = 1 if vaccination_status.lower() == "vaccinated" else 0
    
    # Create input DataFrame with exact training column names
    input_data = pd.DataFrame([{
        'Temperature (°C)': float(temperature),
        'Humidity (%)': float(humidity),
        'Mortality_Rate (%)': float(mortality_rate),
        'Egg_Production': int(egg_production),
        'Amount_of_Feeding (kg/day)': float(amount_of_feeding),
        'Active_Birds': int(active_birds),
        'Bird_Age (days)': int(bird_age),
        'Vaccination_Status_Encoded': int(vacc_encoded)
    }])
    
    # Ensure columns match training order exactly
    input_data = input_data[feature_cols]
    
    # 3. Apply standard scaler to numerical columns
    input_data_scaled = input_data.copy()
    input_data_scaled[numeric_cols] = scaler.transform(input_data[numeric_cols])
    
    # 4. Predict probabilities and risk class
    probabilities = model.predict_proba(input_data_scaled)[0] # shape (3,) -> [P(Low), P(Medium), P(High)]
    prediction_idx = model.predict(input_data_scaled)[0]
    
    # 5. Calculate Risk Score
    # We define Risk Score as the probability of ANY elevated risk (1.0 - P(Low))
    # This gives a sensitive biosecurity trigger between 0.0 and 1.0.
    risk_score = round(1.0 - probabilities[0], 4)
    
    # Map prediction back to string
    risk_level = inv_risk_map[prediction_idx]
    
    return float(risk_score), str(risk_level)


# Demonstration test block
if __name__ == "__main__":
    print("=========================================================")
    print("  TESTING PREDICT_RISK FUNCTION WITH DIFFERENT SCENARIOS")
    print("=========================================================\n")
    
    scenarios = [
        {
            "name": "Scenario 1: Optimal Environmental & Farm Conditions (Healthy)",
            "params": {
                "temperature": 21.5,
                "humidity": 55.0,
                "mortality_rate": 0.015,  # Very low mortality
                "egg_production": 8200,   # High egg production
                "amount_of_feeding": 1250, # Standard feed intake
                "active_birds": 10000,
                "bird_age": 45,
                "vaccination_status": "Vaccinated"
            }
        },
        {
            "name": "Scenario 2: Moderate Heat Stress & Feed Drop (Medium Risk)",
            "params": {
                "temperature": 32.5,       # High temperature
                "humidity": 75.0,         # Elevated humidity
                "mortality_rate": 0.18,   # Moderately elevated mortality
                "egg_production": 7000,   # Noticeable drop in egg production
                "amount_of_feeding": 1050, # Feed drop from 1250kg -> 1050kg
                "active_birds": 10000,
                "bird_age": 45,
                "vaccination_status": "Unvaccinated" # stress factor
            }
        },
        {
            "name": "Scenario 3: Severe Outbreak Spike (High Risk)",
            "params": {
                "temperature": 36.0,       # Extreme temperature
                "humidity": 82.0,         # Heavy humidity
                "mortality_rate": 1.85,    # Extremely high daily mortality (1.85%!)
                "egg_production": 2500,   # Massive drop in egg production
                "amount_of_feeding": 620,  # Severe inappetence (less than half feeding!)
                "active_birds": 10000,
                "bird_age": 45,
                "vaccination_status": "Unvaccinated"
            }
        }
    ]
    
    for sc in scenarios:
        print(f"--- {sc['name']} ---")
        p = sc["params"]
        try:
            score, level = predict_risk(
                temperature=p["temperature"],
                humidity=p["humidity"],
                mortality_rate=p["mortality_rate"],
                egg_production=p["egg_production"],
                amount_of_feeding=p["amount_of_feeding"],
                active_birds=p["active_birds"],
                bird_age=p["bird_age"],
                vaccination_status=p["vaccination_status"]
            )
            print(f"Inputs: Temp={p['temperature']}°C, Hum={p['humidity']}%, Mortality={p['mortality_rate']}%, Eggs={p['egg_production']}, Feed={p['amount_of_feeding']}kg, Birds={p['active_birds']}, Vaccinated={p['vaccination_status']}")
            print(f"Output -> Risk Score: {score:.4f} | Predicted Risk Level: {level}")
        except Exception as e:
            print(f"Error making prediction: {e}")
        print("-" * 50)
