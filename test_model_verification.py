from __future__ import annotations

import glob
import json
import os
import sys

from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image
from Poultry_Guard_ML.environmental.inference.environmental_predictor import predict_environment
from Poultry_Guard_ML.ensemble.ensemble_predictor import predict_ensemble


def run_test_suite():
    print("=" * 75)
    print("TEST SUITE 1: RESNET-18 IMAGE DISEASE CLASSIFIER (REAL SAMPLES)")
    print("=" * 75)

    test_imgs = (
        glob.glob("datasets/fowlpox/test/*.jpg")
        or glob.glob("datasets/All disease/test/Fowlpox/*.jpg")
    )[:6]
    correct_img = 0

    for idx, img_p in enumerate(test_imgs, 1):
        res = predict_image(img_p)
        pred_disease = res["predicted_class"]
        conf = res["confidence"]
        is_correct = (pred_disease == "Fowlpox")
        if is_correct:
            correct_img += 1
        print(f"Test Image {idx}: {os.path.basename(img_p)}")
        print(f"   -> Predicted Class:      {pred_disease}")
        print(f"   -> Detection Confidence: {conf * 100:.2f}%")
        print(f"   -> Class Probabilities:  {json.dumps({k: round(v, 4) for k, v in res['probabilities'].items()})}")
        print(f"   -> Verification:         {'PASS' if is_correct else 'FAIL'}")
        print()

    print(f"Image Model Accuracy: {correct_img}/{len(test_imgs)} ({correct_img/len(test_imgs)*100:.1f}%)" if test_imgs else "No test images found")

    print("\n" + "=" * 75)
    print("TEST SUITE 2: ENVIRONMENTAL FACTOR DISEASE CLASSIFIER (XGBOOST)")
    print("=" * 75)

    env_scenarios = [
        {
            "name": "Scenario 1: Optimal Farm Housing Conditions (Healthy)",
            "data": {
                "breed": "Broiler",
                "temperature": 24.0,
                "humidity": 60.0,
                "ammonia": 10.0,
                "mortality_rate": 0.8,
                "egg_production": 90.0,
                "feed_intake": 120.0,
            },
        },
        {
            "name": "Scenario 2: Elevated Heat & Dropping Feed (Disease Strain)",
            "data": {
                "breed": "Broiler",
                "temperature": 34.0,
                "humidity": 78.0,
                "ammonia": 28.0,
                "mortality_rate": 4.5,
                "egg_production": 65.0,
                "feed_intake": 90.0,
            },
        },
    ]

    for sc in env_scenarios:
        res = predict_environment(**sc["data"])
        print(f"[{sc['name']}]")
        print(f"   Inputs: Temp: {sc['data']['temperature']}C | Hum: {sc['data']['humidity']}% | NH3: {sc['data']['ammonia']}ppm | Mort: {sc['data']['mortality_rate']}%")
        print(f"   Predicted Disease Class: {res['predicted_class']} (Confidence: {res['confidence']*100:.2f}%)")
        print(f"   Class Probabilities:     {json.dumps(res['probabilities'])}")
        print()

    print("=" * 75)
    print("TEST SUITE 3: MULTIMODAL LATE-FUSION ENSEMBLE SYSTEM")
    print("=" * 75)

    sample_img = test_imgs[0] if test_imgs else "dummy"
    fusion_res = predict_ensemble(
        image_input=sample_img,
        environmental_data=env_scenarios[1]["data"]
    )

    ens = fusion_res["ensemble_prediction"]
    print("Multimodal Late-Fusion Output:")
    print(f"   * Visual Prediction:     {fusion_res['cnn_prediction']['predicted_class']} ({fusion_res['cnn_prediction']['confidence']*100:.1f}%)")
    print(f"   * Environmental Predict: {fusion_res['environmental_prediction']['predicted_class']} ({fusion_res['environmental_prediction']['confidence']*100:.1f}%)")
    print(f"   * Ensemble Decision:     {ens['predicted_class']} ({ens['confidence']*100:.1f}%)")
    print(f"   * Alert Severity:        {ens['alert_level']}")
    print(f"   * Fusion Weights:        {json.dumps(ens['fusion_weights'])}")
    print(f"   * Multimodal Probabilities:")
    for k, v in ens["probabilities"].items():
        print(f"       - {k:<18}: {v*100:.2f}%")
    print(f"   * Explainable Diagnosis: {ens['explanation']}")
    print("=" * 75)


if __name__ == "__main__":
    run_test_suite()
