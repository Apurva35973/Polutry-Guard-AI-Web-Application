from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
)

from Poultry_Guard_ML.environmental.config import (
    CLASS_MAPPING,
    ENV_DIR,
    ENVIRONMENTAL_CLASSES,
    INVERSE_CLASS_MAPPING,
    METADATA_PATH,
    PREPROCESSOR_PATH,
    SUPPORTED_BREEDS,
    XGBOOST_MODEL_PATH,
)
from Poultry_Guard_ML.environmental.preprocessing.preprocessor import (
    EnvironmentalPreprocessor,
)
from Poultry_Guard_ML.environmental.training.train_environmental import (
    compute_multiclass_brier,
    compute_multiclass_ece,
)


def evaluate_model(
    test_csv_path: str = str(ENV_DIR / "training" / "splits" / "test_set.csv"),
    model_path: str = str(XGBOOST_MODEL_PATH),
    preprocessor_path: str = str(PREPROCESSOR_PATH),
    report_output_path: str = str(ENV_DIR / "training" / "evaluation_report.json"),
) -> Dict[str, Any]:
    print("=" * 60)
    print("INDEPENDENT TEST SET EVALUATION FOR ENVIRONMENTAL XGBOOST")
    print("=" * 60)

    # 1. Load Model & Preprocessor
    print(f"Loading model from: {model_path}")
    model = joblib.load(model_path)
    print(f"Loading preprocessor from: {preprocessor_path}")
    preprocessor = EnvironmentalPreprocessor.load(preprocessor_path)

    # 2. Load Test Dataset
    print(f"Loading test set from: {test_csv_path}")
    test_df = pd.read_csv(test_csv_path)
    print(f"Test samples: {len(test_df):,}")

    X_test_df = test_df.drop(columns=["Target"])
    y_test = test_df["Target"].to_numpy()

    # 3. Transform Test Features
    X_test = preprocessor.transform(X_test_df)
    feature_names = preprocessor.get_feature_names_out()

    # 4. Predict Probabilities & Classes
    t0 = time.time()
    y_probs = model.predict_proba(X_test)
    y_preds = np.argmax(y_probs, axis=1)
    eval_time = time.time() - t0
    print(f"Inference on {len(X_test):,} samples took {eval_time:.3f}s ({len(X_test)/eval_time:,.0f} samples/sec)")

    # 5. Probability Sum Verification
    prob_sums = np.sum(y_probs, axis=1)
    max_sum_diff = float(np.max(np.abs(prob_sums - 1.0)))
    prob_sum_valid = bool(max_sum_diff < 1e-4)
    print(f"Probability sum validation: Max deviation from 1.0 = {max_sum_diff:.8f} (Valid: {prob_sum_valid})")

    # 6. Overall Metrics
    accuracy = float(accuracy_score(y_test, y_preds))
    loss = float(log_loss(y_test, y_probs))
    brier = float(compute_multiclass_brier(y_test, y_probs))
    ece = float(compute_multiclass_ece(y_test, y_probs))

    precision_macro = float(precision_score(y_test, y_preds, average="macro"))
    recall_macro = float(recall_score(y_test, y_preds, average="macro"))
    f1_macro = float(f1_score(y_test, y_preds, average="macro"))
    f1_weighted = float(f1_score(y_test, y_preds, average="weighted"))

    print("\n--- OVERALL TEST METRICS ---")
    print(f"Accuracy     : {accuracy * 100:.4f}%")
    print(f"Log Loss     : {loss:.6f}")
    print(f"Brier Score  : {brier:.6f}")
    print(f"ECE          : {ece:.6f}")
    print(f"Precision (M): {precision_macro:.4f}")
    print(f"Recall (M)   : {recall_macro:.4f}")
    print(f"F1 (Macro)   : {f1_macro:.4f}")
    print(f"F1 (Weighted): {f1_weighted:.4f}")

    # 7. Per-Class Metrics
    per_class_report = {}
    print("\n--- PER-CLASS PERFORMANCE ---")
    for cls_name, cls_idx in CLASS_MAPPING.items():
        cls_mask_true = y_test == cls_idx
        cls_mask_pred = y_preds == cls_idx
        support = int(np.sum(cls_mask_true))

        prec = float(precision_score(cls_mask_true, cls_mask_pred, zero_division=0))
        rec = float(recall_score(cls_mask_true, cls_mask_pred, zero_division=0))
        f1 = float(f1_score(cls_mask_true, cls_mask_pred, zero_division=0))

        per_class_report[cls_name] = {
            "class_index": cls_idx,
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
            "support": support,
        }
        print(f"Class '{cls_name}' (idx={cls_idx}):")
        print(f"  Support  : {support:,}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall   : {rec:.4f}")
        print(f"  F1-score : {f1:.4f}")

    # 8. Confusion Matrix
    cm = confusion_matrix(y_test, y_preds, labels=[0, 1, 2])
    cm_dict = {
        "labels": [INVERSE_CLASS_MAPPING[i] for i in range(3)],
        "matrix": cm.tolist(),
        "matrix_normalized": (cm / cm.sum(axis=1, keepdims=True)).round(4).tolist(),
    }
    print("\n--- CONFUSION MATRIX ---")
    print(f"Labels: {[INVERSE_CLASS_MAPPING[i] for i in range(3)]}")
    print(cm)

    # 9. Feature Importance (Weight, Gain, Cover)
    booster = model.get_booster()
    score_gain = booster.get_score(importance_type="gain")
    score_weight = booster.get_score(importance_type="weight")
    score_cover = booster.get_score(importance_type="cover")

    # Map f0, f1... to feature names if necessary
    feature_importance_report = {}
    for idx, f_name in enumerate(feature_names):
        f_key = f"f{idx}"
        feature_importance_report[f_name] = {
            "gain": float(score_gain.get(f_key, score_gain.get(f_name, 0.0))),
            "weight": float(score_weight.get(f_key, score_weight.get(f_name, 0.0))),
            "cover": float(score_cover.get(f_key, score_cover.get(f_name, 0.0))),
        }

    print("\n--- FEATURE IMPORTANCES (Gain Breakdown) ---")
    sorted_by_gain = sorted(
        feature_importance_report.items(), key=lambda x: x[1]["gain"], reverse=True
    )
    for name, imp in sorted_by_gain:
        print(f"  {name:<30}: Gain={imp['gain']:>10.3f}, Weight={imp['weight']:>6.0f}, Cover={imp['cover']:>10.3f}")

    # 10. Breed-Specific Analysis
    print("\n--- BREED-SPECIFIC PERFORMANCE BREAKDOWN ---")
    breed_report = {}
    for breed_name in SUPPORTED_BREEDS:
        breed_mask = test_df["Breed"] == breed_name
        n_breed = int(breed_mask.sum())

        if n_breed == 0:
            continue

        y_test_breed = y_test[breed_mask]
        y_preds_breed = y_preds[breed_mask]
        y_probs_breed = y_probs[breed_mask]

        breed_acc = float(accuracy_score(y_test_breed, y_preds_breed))
        breed_f1 = float(f1_score(y_test_breed, y_preds_breed, average="macro"))
        breed_loss = float(log_loss(y_test_breed, y_probs_breed, labels=[0, 1, 2]))
        breed_cm = confusion_matrix(y_test_breed, y_preds_breed, labels=[0, 1, 2]).tolist()

        # Disease counts in this breed
        disease_dist = {}
        for cls_name, cls_idx in CLASS_MAPPING.items():
            disease_dist[cls_name] = int((y_test_breed == cls_idx).sum())

        # Broiler 0% egg check
        if breed_name == "Broiler Ross 308":
            broiler_egg_max = float(test_df[breed_mask]["Egg_Production_percent"].max())
            broiler_egg_min = float(test_df[breed_mask]["Egg_Production_percent"].min())
            print(f"  [Verified] Broiler Ross 308 Egg Production range: [{broiler_egg_min}%, {broiler_egg_max}%]")

        breed_report[breed_name] = {
            "samples": n_breed,
            "accuracy": breed_acc,
            "macro_f1": breed_f1,
            "log_loss": breed_loss,
            "disease_distribution": disease_dist,
            "confusion_matrix": breed_cm,
        }

        print(f"Breed: {breed_name}")
        print(f"  Samples  : {n_breed:,}")
        print(f"  Accuracy : {breed_acc * 100:.4f}%")
        print(f"  Macro F1 : {breed_f1:.4f}")
        print(f"  Log Loss : {breed_loss:.6f}")
        print(f"  Disease  : {disease_dist}")

    # Compile Final Report
    report = {
        "test_samples": len(test_df),
        "classes": ENVIRONMENTAL_CLASSES,
        "class_mapping": CLASS_MAPPING,
        "metrics": {
            "accuracy": accuracy,
            "log_loss": loss,
            "brier_score": brier,
            "ece": ece,
            "precision_macro": precision_macro,
            "recall_macro": recall_macro,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "probability_sum_max_deviation": max_sum_diff,
            "probability_sum_valid": prob_sum_valid,
        },
        "per_class": per_class_report,
        "confusion_matrix": cm_dict,
        "feature_importances": feature_importance_report,
        "breed_performance": breed_report,
    }

    with open(report_output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nEvaluation report saved to: {report_output_path}")

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--test_csv", type=str, default=str(ENV_DIR / "training" / "splits" / "test_set.csv"))
    parser.add_argument("--model", type=str, default=str(XGBOOST_MODEL_PATH))
    parser.add_argument("--preprocessor", type=str, default=str(PREPROCESSOR_PATH))
    parser.add_argument("--report", type=str, default=str(ENV_DIR / "training" / "evaluation_report.json"))
    args = parser.parse_args()

    evaluate_model(args.test_csv, args.model, args.preprocessor, args.report)
