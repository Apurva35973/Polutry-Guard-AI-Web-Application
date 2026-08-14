from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.utils.class_weight import compute_sample_weight

try:
    from xgboost import XGBClassifier
except ImportError:  # XGBoost is optional for environments that do not have it yet.
    XGBClassifier = None


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "poultry_preprocessed_data (1).csv"
MODEL_PATH = BASE_DIR / "poultry_guard_risk_pipeline.joblib"
ANALYSIS_PATH = BASE_DIR / "dataset_analysis_report.csv"
MODEL_REPORT_PATH = BASE_DIR / "model_comparison_report.csv"

TARGET_COL = "Risk_Level"
LABEL_METHOD_COL = "Risk_Label_Method"
RISK_ORDER = ["Low", "Medium", "High"]
CLASS_MAPPING = {label: idx for idx, label in enumerate(RISK_ORDER)}
INV_CLASS_MAPPING = {idx: label for label, idx in CLASS_MAPPING.items()}

CANONICAL_FEATURES = {
    "Temperature": ["Temperature", "Temperature (C)", "Temperature (°C)", "Temperature (Â°C)"],
    "Humidity": ["Humidity", "Humidity (%)"],
    "Mortality_Rate": ["Mortality_Rate", "Mortality_Rate (%)"],
    "Egg_Production": ["Egg_Production"],
    "Amount_of_Feeding": ["Amount_of_Feeding", "Amount_of_Feeding (kg/day)"],
    "Active_Birds": ["Active_Birds"],
    "Bird_Age": ["Bird_Age", "Bird_Age (days)"],
    "Vaccination_Status": ["Vaccination_Status"],
}

REQUIRED_CONCEPTS = [
    "Temperature",
    "Humidity",
    "Mortality_Rate",
    "Egg_Production",
    "Amount_of_Feeding",
    "Active_Birds",
    "Bird_Age",
    "Vaccination_Status",
]


def find_column(df: pd.DataFrame, concept: str) -> str | None:
    for candidate in CANONICAL_FEATURES[concept]:
        if candidate in df.columns:
            return candidate
    return None


def normalize_humidity(value: float) -> float:
    if pd.isna(value):
        return np.nan
    value = float(value)
    if 0 <= value <= 1.5:
        return value * 100.0
    return value


def classify_environment_status(temperature: float, humidity: float) -> str:
    temp_critical = temperature >= 35 or temperature <= 12
    hum_critical = humidity >= 85 or humidity <= 30
    temp_warning = temperature >= 30 or temperature <= 18
    hum_warning = humidity >= 70 or humidity <= 40

    if temp_critical or hum_critical:
        return "CRITICAL"
    if temp_warning or hum_warning:
        return "WARNING"
    return "NORMAL"


def derive_rule_based_risk(row: pd.Series) -> str:
    """Transparent proxy label when real Risk_Level labels are absent."""
    points = 0

    mortality = row.get("Mortality_Rate")
    temperature = row.get("Temperature")
    humidity = row.get("Humidity")
    egg_production = row.get("Egg_Production")
    feeding = row.get("Amount_of_Feeding")

    if pd.notna(mortality):
        if mortality >= 0.05:
            points += 3
        elif mortality >= 0.03:
            points += 2
        elif mortality >= 0.02:
            points += 1

    if pd.notna(temperature):
        if temperature >= 35 or temperature <= 12:
            points += 2
        elif temperature >= 30 or temperature <= 18:
            points += 1

    if pd.notna(humidity):
        if humidity >= 85 or humidity <= 30:
            points += 2
        elif humidity >= 70 or humidity <= 40:
            points += 1

    # These are transparent proxy thresholds, not disease labels.
    if pd.notna(egg_production) and egg_production < 700:
        points += 1
    if pd.notna(feeding) and feeding < 3500:
        points += 1

    if points >= 4:
        return "High"
    if points >= 2:
        return "Medium"
    return "Low"


def inspect_dataset(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for concept in REQUIRED_CONCEPTS:
        column = find_column(df, concept)
        if column is None:
            rows.append(
                {
                    "Column": concept,
                    "Present?": "No",
                    "Missing %": 100.0,
                    "Data Type": "absent",
                    "Possible Use": missing_feature_strategy(concept),
                }
            )
            continue

        rows.append(
            {
                "Column": column,
                "Present?": "Yes",
                "Missing %": round(float(df[column].isna().mean() * 100), 3),
                "Data Type": str(df[column].dtype),
                "Possible Use": possible_use(concept),
            }
        )

    for column in [TARGET_COL, "Disease", "Disease_Label", "Outbreak", "Health_Status"]:
        rows.append(
            {
                "Column": column,
                "Present?": "Yes" if column in df.columns else "No",
                "Missing %": round(float(df[column].isna().mean() * 100), 3)
                if column in df.columns
                else 100.0,
                "Data Type": str(df[column].dtype) if column in df.columns else "absent",
                "Possible Use": "Model target/label" if column in df.columns else "Not available as a target",
            }
        )

    return pd.DataFrame(rows)


def possible_use(concept: str) -> str:
    return {
        "Temperature": "Environmental stress indicator; validate in Celsius.",
        "Humidity": "Environmental stress indicator; normalize fraction/percent units.",
        "Mortality_Rate": "Direct flock-health signal and strongest proxy-label input.",
        "Egg_Production": "Production drop indicator; useful for risk prediction.",
        "Amount_of_Feeding": "Feed intake proxy; useful for risk prediction.",
        "Active_Birds": "Needed to derive per-bird production/feed metrics if collected.",
        "Bird_Age": "Important age/type context for thresholds and model behavior.",
        "Vaccination_Status": "Management-risk categorical feature if collected.",
    }[concept]


def missing_feature_strategy(concept: str) -> str:
    return {
        "Active_Birds": "Absent; collect from farm records/web app. Cannot be derived reliably.",
        "Bird_Age": "Absent; collect per flock cycle. Cannot be derived reliably.",
        "Vaccination_Status": "Absent; collect manually or from vaccination records.",
    }.get(concept, "Absent; do not fabricate silently.")


def build_training_frame(raw_df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    df = raw_df.copy()
    rename_map = {}
    for concept in REQUIRED_CONCEPTS:
        column = find_column(df, concept)
        if column:
            rename_map[column] = concept
    df = df.rename(columns=rename_map)

    before_rows = len(df)
    df = df.drop_duplicates().reset_index(drop=True)

    if "Humidity" in df.columns:
        df["Humidity"] = df["Humidity"].apply(normalize_humidity)

    numeric_present = [c for c in REQUIRED_CONCEPTS if c in df.columns and c != "Vaccination_Status"]
    for column in numeric_present:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    invalid_masks = []
    if "Temperature" in df.columns:
        invalid_masks.append(df["Temperature"].lt(0) | df["Temperature"].gt(50))
    if "Humidity" in df.columns:
        invalid_masks.append(df["Humidity"].lt(0) | df["Humidity"].gt(100))
    if "Mortality_Rate" in df.columns:
        invalid_masks.append(df["Mortality_Rate"].lt(0))
    if "Egg_Production" in df.columns:
        invalid_masks.append(df["Egg_Production"].lt(0))
    if "Amount_of_Feeding" in df.columns:
        invalid_masks.append(df["Amount_of_Feeding"].lt(0))

    if invalid_masks:
        invalid_mask = np.logical_or.reduce(invalid_masks)
        df = df.loc[~invalid_mask].reset_index(drop=True)

    if TARGET_COL not in df.columns:
        df[TARGET_COL] = df.apply(derive_rule_based_risk, axis=1)
        df[LABEL_METHOD_COL] = "rule_based_proxy_v1"
    else:
        df[LABEL_METHOD_COL] = "dataset_provided"

    metadata = {
        "source_dataset": str(DATA_PATH.name),
        "rows_before_cleaning": before_rows,
        "rows_after_cleaning": int(len(df)),
        "duplicates_removed": int(before_rows - len(raw_df.drop_duplicates())),
        "label_method": str(df[LABEL_METHOD_COL].iloc[0]),
        "humidity_unit_handling": "Values <= 1.5 are interpreted as fractions and multiplied by 100.",
        "invalid_value_policy": "Rows outside fixed realistic ranges are removed before split.",
    }
    return df, metadata


def build_models(numeric_features: list[str], categorical_features: list[str]) -> dict[str, Pipeline]:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_features),
            ("cat", categorical_pipeline, categorical_features),
        ],
        remainder="drop",
    )

    model_defs = {
        "Logistic Regression": LogisticRegression(
            class_weight="balanced", max_iter=1000, random_state=42
        ),
        "Decision Tree": DecisionTreeClassifier(
            class_weight="balanced", max_depth=8, random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            class_weight="balanced",
            n_estimators=200,
            max_depth=12,
            random_state=42,
            n_jobs=-1,
        ),
    }
    if XGBClassifier is not None:
        model_defs["XGBoost"] = XGBClassifier(
            objective="multi:softprob",
            eval_metric="mlogloss",
            n_estimators=200,
            max_depth=5,
            learning_rate=0.08,
            random_state=42,
            n_jobs=-1,
        )

    return {
        name: Pipeline(steps=[("preprocess", preprocessor), ("model", model)])
        for name, model in model_defs.items()
    }


def feature_importance(best_pipeline: Pipeline, feature_names: list[str]) -> pd.DataFrame:
    model = best_pipeline.named_steps["model"]
    preprocessor = best_pipeline.named_steps["preprocess"]
    transformed_names = preprocessor.get_feature_names_out()

    if hasattr(model, "feature_importances_"):
        values = model.feature_importances_
    elif hasattr(model, "coef_"):
        values = np.mean(np.abs(model.coef_), axis=0)
    else:
        return pd.DataFrame(columns=["feature", "importance"])

    importance = pd.DataFrame({"feature": transformed_names, "importance": values})
    importance["source_feature"] = importance["feature"].str.replace(r"^(num|cat)__", "", regex=True)
    importance["source_feature"] = importance["source_feature"].str.split("_").str[0]
    return importance.sort_values("importance", ascending=False)


def train() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    raw_df = pd.read_csv(DATA_PATH)
    print(f"Loaded {DATA_PATH.name}: {raw_df.shape[0]} rows x {raw_df.shape[1]} columns")
    print("Columns:", list(raw_df.columns))
    print("Dtypes:")
    print(raw_df.dtypes)
    print("Missing values (%):")
    print((raw_df.isna().mean() * 100).round(3))
    print(f"Duplicate records: {raw_df.duplicated().sum()}")

    analysis = inspect_dataset(raw_df)
    analysis.to_csv(ANALYSIS_PATH, index=False)
    print("\nDataset analysis:")
    print(analysis.to_string(index=False))

    df, metadata = build_training_frame(raw_df)
    features = [c for c in REQUIRED_CONCEPTS if c in df.columns]
    numeric_features = [c for c in features if c != "Vaccination_Status"]
    categorical_features = [c for c in features if c == "Vaccination_Status"]

    X = df[features]
    y_labels = df[TARGET_COL]
    y = y_labels.map(CLASS_MAPPING)

    print("\nClass distribution before preprocessing:")
    print(y_labels.value_counts(normalize=False).reindex(RISK_ORDER, fill_value=0))
    print(y_labels.value_counts(normalize=True).reindex(RISK_ORDER, fill_value=0).round(4))

    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=stratify,
    )

    print("\nClass distribution after split:")
    print("Train:")
    print(y_train.map(INV_CLASS_MAPPING).value_counts().reindex(RISK_ORDER, fill_value=0))
    print("Test:")
    print(y_test.map(INV_CLASS_MAPPING).value_counts().reindex(RISK_ORDER, fill_value=0))

    models = build_models(numeric_features, categorical_features)
    comparison_rows = []
    reports = {}
    trained_models = {}

    for name, pipeline in models.items():
        print(f"\nTraining {name}...")
        fit_kwargs = {}
        if name == "XGBoost":
            fit_kwargs["model__sample_weight"] = compute_sample_weight(
                class_weight="balanced", y=y_train
            )
        pipeline.fit(X_train, y_train, **fit_kwargs)
        y_pred = pipeline.predict(X_test)

        precision_w, recall_w, f1_w, _ = precision_recall_fscore_support(
            y_test, y_pred, average="weighted", zero_division=0
        )
        precision_macro, recall_macro, _, _ = precision_recall_fscore_support(
            y_test, y_pred, average="macro", zero_division=0
        )

        comparison_rows.append(
            {
                "Model": name,
                "Accuracy": accuracy_score(y_test, y_pred),
                "Balanced Accuracy": balanced_accuracy_score(y_test, y_pred),
                "Precision": precision_w,
                "Recall": recall_w,
                "F1 Score": f1_w,
                "Macro Precision": precision_macro,
                "Macro Recall": recall_macro,
                "Macro F1": f1_score(y_test, y_pred, average="macro"),
            }
        )
        reports[name] = {
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "classification_report": classification_report(
                y_test,
                y_pred,
                target_names=RISK_ORDER,
                zero_division=0,
                output_dict=True,
            ),
        }
        trained_models[name] = pipeline

    comparison = pd.DataFrame(comparison_rows).sort_values(
        ["Macro F1", "Balanced Accuracy"], ascending=False
    )
    comparison.to_csv(MODEL_REPORT_PATH, index=False)
    best_name = comparison.iloc[0]["Model"]
    best_pipeline = trained_models[best_name]

    print("\nModel comparison:")
    print(comparison.to_string(index=False))
    print(f"\nBest model by Macro F1: {best_name}")
    print("Confusion matrix:")
    print(np.array(reports[best_name]["confusion_matrix"]))
    print("Classification report:")
    print(
        classification_report(
            y_test,
            best_pipeline.predict(X_test),
            target_names=RISK_ORDER,
            zero_division=0,
        )
    )

    importance = feature_importance(best_pipeline, features)
    print("\nFeature importance:")
    print(importance.head(30).to_string(index=False))

    watched_features = [
        "Temperature",
        "Humidity",
        "Mortality_Rate",
        "Egg_Production",
        "Amount_of_Feeding",
        "Bird_Age",
        "Active_Birds",
        "Vaccination_Status",
    ]
    watched_importance = {}
    for feature in watched_features:
        if importance.empty:
            watched_importance[feature] = None
        else:
            mask = importance["feature"].str.contains(feature, regex=False)
            watched_importance[feature] = float(importance.loc[mask, "importance"].sum())

    payload = {
        "pipeline": best_pipeline,
        "model_name": best_name,
        "feature_list": features,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "class_mapping": CLASS_MAPPING,
        "inverse_class_mapping": INV_CLASS_MAPPING,
        "metadata": {
            **metadata,
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "target_column": TARGET_COL,
            "risk_score_definition": "1 - P(Low)",
            "best_model_selection": "Highest Macro F1, balanced accuracy as tie-breaker.",
            "feature_importance": watched_importance,
            "important_warning": (
                "This model estimates biosecurity risk from available records. "
                "It is not a veterinary diagnosis, and environmental values are risk indicators only."
            ),
        },
        "evaluation": {
            "model_comparison": comparison.to_dict(orient="records"),
            "reports": reports,
        },
    }
    joblib.dump(payload, MODEL_PATH)
    print(f"\nSaved model artifact: {MODEL_PATH}")
    print("Saved dataset analysis:", ANALYSIS_PATH)
    print("Saved model report:", MODEL_REPORT_PATH)
    print("\nMetadata:")
    print(json.dumps(payload["metadata"], indent=2))


if __name__ == "__main__":
    train()
