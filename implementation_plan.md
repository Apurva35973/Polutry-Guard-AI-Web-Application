# Implementation Plan - Poultry Biosecurity Disease Outbreak Risk Prediction

This plan outlines the design and implementation of a Machine Learning pipeline to predict disease outbreak risk levels in poultry farms based on environmental and farm management factors.

## Context & Approach
Since the existing workspace files (e.g., `Egg_Production.csv` and `poultry_preprocessed_data (1).csv`) only cover a subset of the features requested, we will generate a **highly realistic, scientifically grounded synthetic dataset** of 5,000 records. This dataset will model realistic biological and environmental correlations in poultry farming:
- **Temperature & Humidity**: Extreme conditions (heat stress when Temp > 30°C and Humidity > 80%; or respiratory stress when Humidity < 40%) will increase risk.
- **Mortality Rate**: Direct, high-impact indicator of outbreak risk.
- **Egg Production & Feed Intake**: Drops in these metrics relative to the number of active birds and bird age signify disease symptoms, driving risk level to Medium or High.
- **Vaccination Status**: Unvaccinated flocks will carry significantly higher risk under stress conditions.
- **Bird Age**: Younger chicks (1-14 days) and older laying hens will have higher vulnerability.

We will write a comprehensive, modular Python pipeline to perform the analysis, train four classification models, evaluate their performance, save the best model, and produce a Google Colab-compatible script.

---

## Proposed Changes

### [Component 1: Dataset Generation]

#### [NEW] [poultry_biosecurity_dataset.csv](file:///d:/Polutry%20Guard/Polutry-Guard-AI/Temperature%20and%20Humidity%20Sensory%20Data/poultry_biosecurity_dataset.csv)
- Generated dataset containing 5,000 records with features: `Temperature`, `Humidity`, `Mortality_Rate`, `Egg_Production`, `Amount_of_Feeding`, `Active_Birds`, `Bird_Age`, `Vaccination_Status`, and `Risk_Level`.
- Designed with built-in scientific rules to ensure realistic machine learning patterns.

---

### [Component 2: Machine Learning Pipeline]

#### [NEW] [poultry_ml_pipeline.py](file:///d:/Polutry%20Guard/Polutry-Guard-AI/Temperature%20and%20Humidity%20Sensory%20Data/poultry_ml_pipeline.py)
A self-contained Python script to:
1. **EDA**:
   - Check missing values.
   - Plot correlation matrix heatmap.
   - Plot distribution of key features.
   - Visualize feature importances.
2. **Preprocessing**:
   - Handle missing values (if any).
   - Encode categorical variable `Vaccination_Status` (Binary / One-Hot).
   - Scale numeric features using standard scaling.
   - Encode multi-class target `Risk_Level` (`Low`: 0, `Medium`: 1, `High`: 2).
3. **Model Training & Comparison**:
   - Split dataset into 80% train and 20% test sets.
   - Train and tune **Logistic Regression**, **Random Forest**, **XGBoost**, and **Decision Tree**.
   - Compare models using **Accuracy**, **Precision**, **Recall**, and **F1-Score** (weighted/macro).
   - Plot and save confusion matrices for each model.
4. **Best Model Selection & Saving**:
   - Identify the top model.
   - Save the best model and preprocessor (scaler/encoders) using `pickle`.
5. **Feature Importance Ranking**:
   - Extract and plot feature importances from tree-based models.
6. **Scientific Explanation**:
   - Provide a markdown/text analysis of the impact of Temperature and Humidity.

---

### [Component 3: Risk Prediction Module]

#### [NEW] [predict_risk_module.py](file:///d:/Polutry%20Guard/Polutry-Guard-AI/Temperature%20and%20Humidity%20Sensory%20Data/predict_risk_module.py)
- A reusable script containing the `predict_risk` function:
  ```python
  def predict_risk(
      temperature,
      humidity,
      mortality_rate,
      egg_production,
      amount_of_feeding,
      active_birds
  ):
      ...
      return risk_score, risk_level
  ```
- Loads the saved pickle model, reconstructs default/median values for unpassed inputs (like `Bird_Age` and `Vaccination_Status`), processes the features, and outputs:
  - **Risk Score**: The probability of High/Medium risk (0.0 to 1.0).
  - **Risk Level**: `'Low'`, `'Medium'`, or `'High'`.

---

### [Component 4: Google Colab Code]

#### [NEW] [poultry_colab_notebook.ipynb](file:///d:/Polutry%20Guard/Polutry-Guard-AI/Temperature%20and%20Humidity%20Sensory%20Data/poultry_colab_notebook.ipynb)
- A fully formatted, ready-to-run Jupyter Notebook configured for Google Colab, containing all components (data generation, EDA plots, modeling, best model evaluation, custom function, and markdown narrative explaining the findings).

---

## Verification Plan

### Automated Tests
- We will execute the Python script `poultry_ml_pipeline.py` to ensure it runs without errors, produces the plots, trains the models, and pickles the results.
- We will run a validation script `test_predict_risk.py` that verifies the `predict_risk` function works correctly for all ranges of inputs (extreme heat, high mortality, optimal conditions).

### Manual Verification
- Review the generated figures (`correlation_matrix.png`, `feature_importances.png`, `confusion_matrices.png`) to ensure they represent high-quality data visualizations.
