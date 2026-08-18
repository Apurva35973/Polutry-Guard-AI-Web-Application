import sys
import os
import glob
import json
from ml.inference.image_predictor import predict_image
from ml.inference.environmental_predictor import predict_environmental_risk
from ml.inference.ensemble_predictor import predict_poultry_status

def run_test_suite():
    print("=" * 75)
    print("TEST SUITE 1: RESNET-18 IMAGE DISEASE CLASSIFIER (REAL TEST SAMPLES)")
    print("=" * 75)
    
    test_imgs = glob.glob("fowlpox/Fowlpox-1/test/*.jpg")[:6]
    correct_img = 0
    
    for idx, img_p in enumerate(test_imgs, 1):
        res = predict_image(img_p)
        pred_disease = res["predicted_disease"]
        conf = res["confidence"]
        is_correct = (pred_disease == "Fowlpox")
        if is_correct:
            correct_img += 1
        print(f"Test Image {idx}: {os.path.basename(img_p)}")
        print(f"   -> Predicted Class:      {pred_disease}")
        print(f"   -> Detection Confidence: {conf * 100:.2f}%")
        print(f"   -> Class Probabilities:  {json.dumps({k: round(v, 4) for k, v in res['probabilities'].items()})}")
        print(f"   -> Verification:         {'PASS (100% Correct Identification)' if is_correct else 'FAIL'}")
        print()

    print(f"Image Model Accuracy: {correct_img}/{len(test_imgs)} ({correct_img/len(test_imgs)*100:.1f}%)")

    print("\n" + "=" * 75)
    print("TEST SUITE 2: ENVIRONMENTAL BIOSECURITY OUTBREAK RISK PREDICTOR")
    print("=" * 75)
    
    scenarios = [
        {
            "name": "Scenario 1: Optimal Healthy Farm Conditions",
            "data": {
                "Temperature": 22.0,
                "Humidity": 58.0,
                "Mortality_Rate": 0.008,     # 0.8% mortality (optimal)
                "Egg_Production": 1250.0,     # Normal healthy output
                "Amount_of_Feeding": 5300.0   # Normal healthy feeding
            },
            "expected_risk": "Low"
        },
        {
            "name": "Scenario 2: Moderate Thermal Stress & Drop in Feed",
            "data": {
                "Temperature": 29.5,
                "Humidity": 72.0,
                "Mortality_Rate": 0.022,     # 2.2% mortality
                "Egg_Production": 920.0,      # Slight drop
                "Amount_of_Feeding": 4200.0   # Reduced appetite
            },
            "expected_risk": "Medium"
        },
        {
            "name": "Scenario 3: Severe Disease Outbreak Spike (Heat Stress + High Mortality)",
            "data": {
                "Temperature": 36.5,
                "Humidity": 82.0,
                "Mortality_Rate": 0.065,     # 6.5% high mortality
                "Egg_Production": 350.0,      # Severe drop
                "Amount_of_Feeding": 2100.0   # Severe drop in feeding
            },
            "expected_risk": "High"
        },
        {
            "name": "Scenario 4: High Mortality Alert (Normal Temp, Sudden Flock Deaths)",
            "data": {
                "Temperature": 24.0,
                "Humidity": 60.0,
                "Mortality_Rate": 0.055,     # 5.5% spike
                "Egg_Production": 520.0,      # Sharp drop
                "Amount_of_Feeding": 2800.0   # Low intake
            },
            "expected_risk": "High"
        }
    ]

    env_matches = 0
    for sc in scenarios:
        res = predict_environmental_risk(sc["data"])
        pred_risk = res["risk_level"]
        score = res["risk_score"]
        status = res["environmental_status"]
        probs = res["risk_probabilities"]
        is_match = (pred_risk.lower() == sc["expected_risk"].lower())
        if is_match:
            env_matches += 1
            
        print(f"[{sc['name']}]")
        print(f"   Inputs: Temp: {sc['data']['Temperature']}C | Hum: {sc['data']['Humidity']}% | Mort: {sc['data']['Mortality_Rate']*100:.1f}% | Eggs: {sc['data']['Egg_Production']} | Feed: {sc['data']['Amount_of_Feeding']} kg")
        print(f"   Predicted Risk Level: {pred_risk.upper()} (Risk Score: {score:.2f}, Sensor Status: {status})")
        print(f"   Class Probabilities:  Low: {probs['Low']*100:.1f}% | Medium: {probs['Medium']*100:.1f}% | High: {probs['High']*100:.1f}%")
        print(f"   Verification:         {'PASS (Matches Expected Category)' if is_match else 'FAIL (Expected ' + sc['expected_risk'] + ', got ' + pred_risk + ')'}")
        print()

    print(f"Environmental Scenario Accuracy: {env_matches}/{len(scenarios)} ({env_matches/len(scenarios)*100:.1f}%)")

    print("=" * 75)
    print("TEST SUITE 3: MULTIMODAL ENSEMBLE SYSTEM (IMAGE + SENSOR FUSION)")
    print("=" * 75)
    
    fusion_res = predict_poultry_status(test_imgs[0], scenarios[2]["data"])
    ens = fusion_res["ensemble"]
    print("Multi-modal Early-Warning Response:")
    print(f"   * Combined Alert Level: {ens['alert_level']}")
    print(f"   * Alert Type:           {ens['type']}")
    print(f"   * Disease Detected:     {ens['disease_detected']}")
    print(f"   * System Decision:      {ens['reason']}")
    print(f"   * Alert Action Notice:  {ens['message']}")
    print("=" * 75)

if __name__ == "__main__":
    run_test_suite()
