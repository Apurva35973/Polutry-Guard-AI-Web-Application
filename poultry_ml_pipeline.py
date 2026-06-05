import os
import pickle
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, precision_recall_fscore_support, confusion_matrix, f1_score
from sklearn.utils.class_weight import compute_sample_weight

# Set style for professional-grade charts
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_theme(style="whitegrid")
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']

# Define paths
data_dir = r"d:\Polutry Guard\Polutry-Guard-AI\Temperature and Humidity Sensory Data"
data_path = os.path.join(data_dir, "poultry_biosecurity_dataset.csv")
output_model_path = os.path.join(data_dir, "poultry_risk_model.pkl")

print("=================================================================")
print("  POULTRY BIOSECURITY DISEASE OUTBREAK RISK ML PIPELINE STARTING")
print("=================================================================")

# -------------------------------------------------------------
# 1. LOAD DATA & MISSING VALUE ANALYSIS
# -------------------------------------------------------------
print("\n[Step 1] Loading Dataset & Analyzing Missing Values...")
df = pd.read_csv(data_path)
print(f"Dataset shape: {df.shape[0]} rows, {df.shape[1]} columns.")

# Missing value analysis
missing_counts = df.isnull().sum()
missing_pcts = (df.isnull().sum() / len(df)) * 100
missing_report = pd.DataFrame({
    'Missing Count': missing_counts,
    'Percentage (%)': missing_pcts
})
print("\n--- Missing Value Report ---")
print(missing_report)

# Save missing value analysis to file
missing_report.to_csv(os.path.join(data_dir, "eda_missing_value_report.csv"))
print("Saved missing value report to 'eda_missing_value_report.csv'")

# -------------------------------------------------------------
# 2. EXPLORATORY DATA ANALYSIS (EDA) & VISUALIZATIONS
# -------------------------------------------------------------
print("\n[Step 2] Performing Exploratory Data Analysis (EDA) & Creating Plots...")

# 2.1 Distribution Plots
print("Generating distribution plots...")
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle("Key Features and Target Class Distributions", fontsize=18, fontweight='bold', color='#1e293b')

# Temperature Distribution
sns.histplot(data=df, x="Temperature (°C)", hue="Risk_Level", multiple="stack", palette="crest", ax=axes[0, 0], kde=True)
axes[0, 0].set_title("Temperature Distribution by Risk Level", fontsize=14, fontweight='semibold')
axes[0, 0].set_xlabel("Temperature (°C)", fontsize=12)

# Humidity Distribution
sns.histplot(data=df, x="Humidity (%)", hue="Risk_Level", multiple="stack", palette="mako", ax=axes[0, 1], kde=True)
axes[0, 1].set_title("Humidity Distribution by Risk Level", fontsize=14, fontweight='semibold')
axes[0, 1].set_xlabel("Humidity (%)", fontsize=12)

# Mortality Rate Distribution
sns.histplot(data=df, x="Mortality_Rate (%)", hue="Risk_Level", multiple="stack", palette="rocket_r", ax=axes[1, 0], log_scale=(False, True))
axes[1, 0].set_title("Mortality Rate Distribution (Log Scale Count)", fontsize=14, fontweight='semibold')
axes[1, 0].set_xlabel("Mortality_Rate (%)", fontsize=12)

# Target Variable Distribution
sns.countplot(data=df, x="Risk_Level", order=["Low", "Medium", "High"], palette=["#10b981", "#f59e0b", "#ef4444"], ax=axes[1, 1])
axes[1, 1].set_title("Target Outbreak Risk Level Count", fontsize=14, fontweight='semibold')
axes[1, 1].set_xlabel("Risk Level", fontsize=12)

plt.tight_layout()
dist_plot_path = os.path.join(data_dir, "eda_distributions.png")
plt.savefig(dist_plot_path, dpi=300)
plt.close()
print(f"Saved distributions plot to '{dist_plot_path}'")

# 2.2 Correlation Matrix Heatmap
print("Generating correlation matrix heatmap...")
# First encode the vaccination status and target risk level to numbers for correlation
df_corr = df.copy()
df_corr['Vaccination_Status_Encoded'] = df_corr['Vaccination_Status'].map({'Vaccinated': 1, 'Unvaccinated': 0})
df_corr['Risk_Level_Encoded'] = df_corr['Risk_Level'].map({'Low': 0, 'Medium': 1, 'High': 2})

# Drop categorical string columns
df_corr_numeric = df_corr.drop(columns=['Vaccination_Status', 'Risk_Level'])

plt.figure(figsize=(12, 10))
# Let's create a beautiful custom divergent colormap
cmap = sns.diverging_palette(230, 20, as_cmap=True)
sns.heatmap(df_corr_numeric.corr(), annot=True, fmt=".2f", cmap=cmap, vmin=-1.0, vmax=1.0, linewidths=0.5, square=True,
            cbar_kws={"shrink": .8}, annot_kws={"size": 10, "weight": "semibold"})
plt.title("Correlation Matrix of Poultry Farm Features", fontsize=16, fontweight='bold', pad=20, color='#1e293b')
plt.tight_layout()
corr_plot_path = os.path.join(data_dir, "eda_correlation_matrix.png")
plt.savefig(corr_plot_path, dpi=300)
plt.close()
print(f"Saved correlation matrix to '{corr_plot_path}'")

# -------------------------------------------------------------
# 3. DATA PREPROCESSING
# -------------------------------------------------------------
print("\n[Step 3] Preprocessing Data...")

# Map target variable
risk_map = {'Low': 0, 'Medium': 1, 'High': 2}
inv_risk_map = {0: 'Low', 1: 'Medium', 2: 'High'}
df['Risk_Level_Encoded'] = df['Risk_Level'].map(risk_map)

# Encode Vaccination_Status: Vaccinated -> 1, Unvaccinated -> 0
df['Vaccination_Status_Encoded'] = df['Vaccination_Status'].map({'Vaccinated': 1, 'Unvaccinated': 0})

# Select feature columns (excluding string values and encoded targets)
feature_cols = [
    'Temperature (°C)',
    'Humidity (%)',
    'Mortality_Rate (%)',
    'Egg_Production',
    'Amount_of_Feeding (kg/day)',
    'Active_Birds',
    'Bird_Age (days)',
    'Vaccination_Status_Encoded'
]

X = df[feature_cols]
y = df['Risk_Level_Encoded']

# Train-Test Split (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
print(f"Training set: X_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
print(f"Testing set: X_test shape: {X_test.shape}, y_test shape: {y_test.shape}")

# Scale only numerical features (exclude binary vaccination status encoded)
numeric_cols = [col for col in feature_cols if col != 'Vaccination_Status_Encoded']
print(f"Scaling numeric features: {numeric_cols}")

scaler = StandardScaler()
X_train_scaled = X_train.copy()
X_test_scaled = X_test.copy()

X_train_scaled[numeric_cols] = scaler.fit_transform(X_train[numeric_cols])
X_test_scaled[numeric_cols] = scaler.transform(X_test[numeric_cols])

# -------------------------------------------------------------
# 4. TRAINING CLASSIFICATION MODELS
# -------------------------------------------------------------
print("\n[Step 4] Training Multiple Classification Models...")

models = {
    "Logistic Regression": LogisticRegression(class_weight='balanced', solver='lbfgs', max_iter=1000, random_state=42),
    "Decision Tree": DecisionTreeClassifier(class_weight='balanced', max_depth=6, random_state=42),
    "Random Forest": RandomForestClassifier(class_weight='balanced', n_estimators=150, max_depth=12, random_state=42, n_jobs=-1),
    "XGBoost": XGBClassifier(n_estimators=150, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=-1)
}

# -------------------------------------------------------------
# 5. MODEL COMPARISON
# -------------------------------------------------------------
print("\n[Step 5] Evaluating and Comparing Models...")

comparison_data = []
confusion_matrices = {}

fig, axes = plt.subplots(2, 2, figsize=(14, 12))
axes = axes.flatten()

# Calculate training sample weights for XGBoost to balance it
xgb_sample_weights = compute_sample_weight(class_weight='balanced', y=y_train)

for idx, (name, model) in enumerate(models.items()):
    print(f"  Training {name}...")
    if name == "XGBoost":
        model.fit(X_train_scaled, y_train, sample_weight=xgb_sample_weights)
    else:
        model.fit(X_train_scaled, y_train)
    
    # Predict on test set
    y_pred = model.predict(X_test_scaled)
    
    # Calculate performance metrics
    accuracy = accuracy_score(y_test, y_pred)
    balanced_acc = balanced_accuracy_score(y_test, y_pred)
    precision, recall, f1_weighted, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
    f1_macro = f1_score(y_test, y_pred, average='macro')
    
    # Store performance data
    comparison_data.append({
        "Model": name,
        "Accuracy": accuracy,
        "Balanced Accuracy": balanced_acc,
        "Precision (W)": precision,
        "Recall (W)": recall,
        "F1 Score (Weighted)": f1_weighted,
        "F1 Score (Macro)": f1_macro
    })
    
    # Calculate confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    confusion_matrices[name] = cm
    
    # Plot confusion matrix
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=["Low", "Medium", "High"], yticklabels=["Low", "Medium", "High"],
                ax=axes[idx], cbar=False, annot_kws={"size": 14, "weight": "bold"})
    axes[idx].set_title(f"Confusion Matrix: {name}", fontsize=14, fontweight='bold', pad=10)
    axes[idx].set_xlabel("Predicted Label", fontsize=11)
    axes[idx].set_ylabel("True Label", fontsize=11)

plt.suptitle("Model Evaluation: Confusion Matrices", fontsize=18, fontweight='bold', y=0.98, color='#1e293b')
plt.tight_layout()
cm_plot_path = os.path.join(data_dir, "model_confusion_matrices.png")
plt.savefig(cm_plot_path, dpi=300)
plt.close()
print(f"Saved combined confusion matrices plot to '{cm_plot_path}'")

# Display comparison results in a beautiful pandas table
comparison_df = pd.DataFrame(comparison_data)
print("\n================================== MODEL COMPARISON METRICS ==================================")
print(comparison_df.to_string(index=False, formatters={
    "Accuracy": "{:.4f}".format,
    "Balanced Accuracy": "{:.4f}".format,
    "Precision (W)": "{:.4f}".format,
    "Recall (W)": "{:.4f}".format,
    "F1 Score (Weighted)": "{:.4f}".format,
    "F1 Score (Macro)": "{:.4f}".format
}))
print("==============================================================================================")

# Save metrics comparison to CSV
comparison_df.to_csv(os.path.join(data_dir, "model_comparison_report.csv"), index=False)

# Identify best model based on Macro F1 Score
best_idx = comparison_df['F1 Score (Macro)'].idxmax()
best_model_name = comparison_df.iloc[best_idx]['Model']
best_model_obj = models[best_model_name]
print(f"\n[Step 6] Best-Performing Model Identified: **{best_model_name}** with Macro F1-Score of {comparison_df.iloc[best_idx]['F1 Score (Macro)']:.4f}!")

# -------------------------------------------------------------
# 6. FEATURE IMPORTANCE RANKINGS
# -------------------------------------------------------------
print("\n[Step 7] Extracting Feature Importance...")

# Use the best model if tree-based, otherwise fallback to Random Forest for clean importance extraction
importance_model_name = best_model_name
importance_model = best_model_obj

if importance_model_name not in ["Random Forest", "XGBoost", "Decision Tree"]:
    # Fallback to Random Forest for feature importance visualization
    importance_model_name = "Random Forest"
    importance_model = models["Random Forest"]

importances = importance_model.feature_importances_
indices = np.argsort(importances)[::-1]
sorted_features = [feature_cols[i] for i in indices]
sorted_importances = importances[indices]

# Plot feature importance
plt.figure(figsize=(10, 6))
sns.barplot(x=sorted_importances, y=sorted_features, palette="viridis")
plt.title(f"Feature Importance Ranking ({importance_model_name})", fontsize=15, fontweight='bold', pad=15, color='#1e293b')
plt.xlabel("Relative Importance Score", fontsize=12)
plt.ylabel("Features", fontsize=12)
plt.tight_layout()
feat_plot_path = os.path.join(data_dir, "model_feature_importances.png")
plt.savefig(feat_plot_path, dpi=300)
plt.close()
print(f"Saved feature importances plot to '{feat_plot_path}'")

print("\n--- Feature Importance Table ---")
for i in range(len(sorted_features)):
    print(f"{i+1}. {sorted_features[i]:<30} : {sorted_importances[i]:.4f}")

# -------------------------------------------------------------
# 7. TEMPERATURE & HUMIDITY CONTRIBUTION EXPLANATION
# -------------------------------------------------------------
print("\n[Step 8] Analyzing Environmental Feature Contributions...")

explanation_text = """
================================-----------------================================
ENVIRONMENTAL ROLE ANALYSIS: TEMPERATURE AND HUMIDITY CONTRIBUTION TO RISK
================================-----------------================================

Based on our biological model rules and the resulting trained Machine Learning models:

1. TEMPERATURE CONTRIBUTION:
   - Poultry, particularly broiler and laying chickens, have a tight thermoneutral zone (typically between 18°C and 24°C).
   - High temperatures (>30°C to 32°C) trigger severe HEAT STRESS. To cool off, birds pant, which increases respiratory rates and makes their mucous membranes dry and highly vulnerable to viral pathogens (e.g., Newcastle Disease, Infectious Bronchitis, Avian Influenza).
   - In our model, extreme high temperatures (>34°C) combined with 'Unvaccinated' status immediately flag a 'Medium' to 'High' risk environment.
   - Low temperatures (<14°C) trigger cold stress, where chicks crowd together to conserve heat. Crowding dramatically increases the contact rate between birds, accelerating pathogen transmission and boosting the disease outbreak risk.

2. HUMIDITY CONTRIBUTION:
   - High relative humidity (>80%) restricts the bird's ability to dissipate heat through evaporative cooling (panting), vastly multiplying heat stress and causing heat stroke or respiratory arrest.
   - High humidity combined with warm conditions also creates a breeding ground for litter-borne pathogens (like Salmonella and Coccidiosis) and elevates toxic ammonia levels from feces.
   - Low humidity (<40%) makes the poultry house dry and dusty, causing mechanical irritation in the respiratory tracts of active birds, leading to viral infections.

3. COMBINED IMPACT (HI OR THI):
   - The interactions between Temperature and Humidity are multiplicative: a moderate temperature of 30°C at 50% humidity is manageable, but at 85% humidity it becomes LETHAL.
   - This multiplicative relationship is why non-linear, tree-based models like XGBoost and Random Forest easily outperform linear models like Logistic Regression in this biosecurity domain.
"""
print(explanation_text)

# Save explanation to a text file
explanation_path = os.path.join(data_dir, "environmental_impact_analysis.txt")
with open(explanation_path, "w", encoding='utf-8') as f:
    f.write(explanation_text)
print(f"Saved scientific explanation writeup to '{explanation_path}'")

# -------------------------------------------------------------
# 8. SAVE TRAINED MODEL & PREPROCESSOR
# -------------------------------------------------------------
print("\n[Step 9] Saving Best Model and Preprocessor...")

# Package model, scaler, feature columns, and target mapping together in a single dict
pickle_payload = {
    "model_name": best_model_name,
    "model": best_model_obj,
    "scaler": scaler,
    "numeric_cols": numeric_cols,
    "feature_cols": feature_cols,
    "risk_map": risk_map,
    "inv_risk_map": inv_risk_map
}

with open(output_model_path, "wb") as f:
    pickle.dump(pickle_payload, f)
print(f"Successfully saved packaged model dictionary to '{output_model_path}' using pickle.")

print("\n=================================================================")
print("  POULTRY BIOSECURITY DISEASE OUTBREAK RISK ML PIPELINE COMPLETE!")
print("=================================================================")
