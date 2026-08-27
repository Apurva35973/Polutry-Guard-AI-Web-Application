from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from Poultry_Guard_ML.environmental.config import (
    CLASS_MAPPING,
    DISEASE_CANONICAL_MAP,
    ENV_DIR,
    ENVIRONMENTAL_CLASSES,
    INVERSE_CLASS_MAPPING,
    METADATA_PATH,
    MODEL_PATH,
    PREPROCESSOR_PATH,
    XGBOOST_MODEL_PATH,
)
from Poultry_Guard_ML.environmental.preprocessing.preprocessor import (
    EnvironmentalPreprocessor,
)


def compute_multiclass_ece(
    y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10
) -> float:
    """Compute Expected Calibration Error (ECE) for multiclass probabilities."""
    confidences = np.max(y_prob, axis=1)
    predictions = np.argmax(y_prob, axis=1)
    accuracies = predictions == y_true

    ece = 0.0
    bin_boundaries = np.linspace(0, 1, n_bins + 1)

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        prop_in_bin = np.mean(in_bin)

        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(accuracies[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin

    return float(ece)


def compute_multiclass_brier(
    y_true: np.ndarray, y_prob: np.ndarray, n_classes: int = 3
) -> float:
    """Compute multiclass Brier score."""
    y_true_onehot = np.eye(n_classes)[y_true]
    return float(np.mean(np.sum((y_prob - y_true_onehot) ** 2, axis=1)))


def load_and_validate_dataset(
    csv_path: str,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Load dataset, inspect memory, clean/normalize target classes, and exclude unauthorized diseases."""
    print(f"Loading dataset from: {csv_path}")
    start_time = time.time()

    dtypes = {
        "Breed": "category",
        "Temperature_C": "float32",
        "Humidity_percent": "float32",
        "Ammonia_ppm": "float32",
        "Mortality_Rate_percent": "float32",
        "Egg_Production_percent": "float32",
        "Amount_of_Feeding_g_bird_day": "float32",
        "Disease": "object",
    }

    df = pd.read_csv(csv_path, dtype=dtypes)
    load_time = time.time() - start_time
    print(
        f"Loaded {len(df):,} rows in {load_time:.2f}s. Memory: {df.memory_usage(deep=True).sum() / (1024*1024):.2f} MB"
    )

    # Normalize disease column
    df["Disease_Clean"] = df["Disease"].astype(str).str.strip().str.lower()
    df["Disease_Normalized"] = df["Disease_Clean"].map(DISEASE_CANONICAL_MAP)

    unmapped = df[df["Disease_Normalized"].isna()]
    if len(unmapped) > 0:
        unauthorized = unmapped["Disease"].value_counts().to_dict()
        print(f"WARNING: Found unauthorized/unmapped disease classes: {unauthorized}")
        print("Excluding unauthorized classes from this 3-class training dataset.")
        df = df[df["Disease_Normalized"].notna()].copy()

    df["Target"] = df["Disease_Normalized"].map(CLASS_MAPPING).astype(int)

    print("\nDataset Class Distribution (Normalized):")
    for cls_name, cls_idx in CLASS_MAPPING.items():
        count = (df["Target"] == cls_idx).sum()
        pct = (count / len(df)) * 100
        print(f"  Class {cls_idx} ({cls_name:<18}): {count:,} ({pct:.2f}%)")

    features = df[
        [
            "Breed",
            "Temperature_C",
            "Humidity_percent",
            "Ammonia_ppm",
            "Mortality_Rate_percent",
            "Egg_Production_percent",
            "Amount_of_Feeding_g_bird_day",
        ]
    ]
    target = df["Target"]

    return features, target


def train_environmental_model(
    csv_path: str,
    output_model_path: str = str(XGBOOST_MODEL_PATH),
    output_preprocessor_path: str = str(PREPROCESSOR_PATH),
    output_metadata_path: str = str(METADATA_PATH),
    random_state: int = 42,
) -> Dict[str, Any]:
    """Train XGBoost multiclass model on stratified 80/10/10 split with early stopping and evaluation."""
    print("=" * 60)
    print("POULTRY GUARD ENVIRONMENTAL XGBOOST TRAINING PIPELINE")
    print("=" * 60)

    X_df, y_all = load_and_validate_dataset(csv_path)
    total_samples = len(X_df)

    # Stratified 80/10/10 Split
    print("\nSplitting dataset into 80% Train, 10% Validation, 10% Test...")
    X_train_df, X_temp_df, y_train, y_temp = train_test_split(
        X_df, y_all, test_size=0.20, random_state=random_state, stratify=y_all
    )
    X_val_df, X_test_df, y_val, y_test = train_test_split(
        X_temp_df, y_temp, test_size=0.50, random_state=random_state, stratify=y_temp
    )

    print(f"  Training Set   : {len(X_train_df):,} samples ({len(X_train_df)/total_samples*100:.1f}%)")
    print(f"  Validation Set : {len(X_val_df):,} samples ({len(X_val_df)/total_samples*100:.1f}%)")
    print(f"  Test Set       : {len(X_test_df):,} samples ({len(X_test_df)/total_samples*100:.1f}%)")

    # Fit Preprocessor on Training Set ONLY
    print("\nFitting EnvironmentalPreprocessor on training set...")
    preprocessor = EnvironmentalPreprocessor(scale_numeric=False)
    preprocessor.fit(X_train_df)

    X_train = preprocessor.transform(X_train_df)
    X_val = preprocessor.transform(X_val_df)
    X_test = preprocessor.transform(X_test_df)
    feature_names = preprocessor.get_feature_names_out()
    print(f"Preprocessed feature dimensions: {X_train.shape[1]} features -> {feature_names}")

    # Configure XGBoost Classifier
    print("\nConfiguring XGBoost Multiclass Classifier...")
    xgb_model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.15,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        early_stopping_rounds=15,
        random_state=random_state,
        n_jobs=-1,
        tree_method="hist",
    )

    print("\nTraining XGBoost model with early stopping on validation loss...")
    train_start = time.time()
    xgb_model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_val, y_val)],
        verbose=25,
    )
    train_duration = time.time() - train_start
    best_iteration = int(xgb_model.best_iteration)
    print(f"\nTraining completed in {train_duration:.2f}s.")
    print(f"Best Iteration: {best_iteration}")

    # Validation evaluation
    val_probs = xgb_model.predict_proba(X_val)
    val_preds = np.argmax(val_probs, axis=1)
    val_acc = accuracy_score(y_val, val_preds)
    val_loss = log_loss(y_val, val_probs)
    val_brier = compute_multiclass_brier(y_val.to_numpy(), val_probs)
    val_ece = compute_multiclass_ece(y_val.to_numpy(), val_probs)

    print(f"\nValidation Performance:")
    print(f"  Accuracy    : {val_acc * 100:.4f}%")
    print(f"  Log Loss    : {val_loss:.6f}")
    print(f"  Brier Score : {val_brier:.6f}")
    print(f"  ECE         : {val_ece:.6f}")

    # Save Preprocessor Artifact
    print(f"\nSaving preprocessor artifact to: {output_preprocessor_path}")
    preprocessor.save(output_preprocessor_path)

    # Save XGBoost Model Artifact
    print(f"Saving XGBoost model to: {output_model_path}")
    os.makedirs(os.path.dirname(output_model_path), exist_ok=True)
    joblib.dump(xgb_model, output_model_path)

    # Also save to default MODEL_PATH for seamless backwards compatibility
    if str(output_model_path) != str(MODEL_PATH):
        joblib.dump(xgb_model, MODEL_PATH)

    # Feature Importance
    importances = xgb_model.feature_importances_
    feat_importance_dict = {
        name: float(imp) for name, imp in zip(feature_names, importances)
    }

    # Save Metadata
    metadata = {
        "model_type": "XGBClassifier",
        "objective": "multi:softprob",
        "num_classes": 3,
        "classes": ENVIRONMENTAL_CLASSES,
        "class_mapping": CLASS_MAPPING,
        "inverse_class_mapping": {int(k): v for k, v in INVERSE_CLASS_MAPPING.items()},
        "feature_names": feature_names,
        "feature_importances": feat_importance_dict,
        "best_iteration": best_iteration,
        "training_samples": len(X_train),
        "validation_samples": len(X_val),
        "test_samples": len(X_test),
        "validation_metrics": {
            "accuracy": float(val_acc),
            "log_loss": float(val_loss),
            "brier_score": float(val_brier),
            "ece": float(val_ece),
        },
        "saved_model_path": output_model_path,
        "saved_preprocessor_path": output_preprocessor_path,
    }

    with open(output_metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {output_metadata_path}")

    # Save test dataset splits to scratch / disk for independent evaluation script
    test_data_dir = ENV_DIR / "training" / "splits"
    os.makedirs(test_data_dir, exist_ok=True)
    test_split_path = test_data_dir / "test_set.csv"
    test_df_full = X_test_df.copy()
    test_df_full["Target"] = y_test
    test_df_full.to_csv(test_split_path, index=False)
    print(f"Saved test set partition to: {test_split_path}")

    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train Environmental XGBoost Classifier for PoultryGuard AI"
    )
    parser.add_argument(
        "--csv",
        type=str,
        default="Poultry_Guard_ML/poultry_coryza_1000000.csv",
        help="Path to synthetic environmental dataset CSV",
    )
    parser.add_argument(
        "--output_model",
        type=str,
        default=str(XGBOOST_MODEL_PATH),
        help="Output model path",
    )
    parser.add_argument(
        "--output_preprocessor",
        type=str,
        default=str(PREPROCESSOR_PATH),
        help="Output preprocessor path",
    )
    args = parser.parse_args()

    train_environmental_model(
        csv_path=args.csv,
        output_model_path=args.output_model,
        output_preprocessor_path=args.output_preprocessor,
    )
