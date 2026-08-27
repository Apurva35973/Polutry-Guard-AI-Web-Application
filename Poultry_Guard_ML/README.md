# Poultry_Guard_ML: Unified Production Machine Learning Package

`Poultry_Guard_ML` is the consolidated machine learning package for PoultryGuard AI, integrating:
1. **CNN Poultry Disease Classifier**: Deep learning model (ResNet18) for image-based disease screening across 5 poultry health classes (`Healthy`, `Coccidiosis`, `Newcastle`, `Salmonella`, `Fowlpox`).
2. **Environmental Biosecurity Risk Predictor**: Machine learning pipeline analyzing microclimatic sensor metrics and farm parameters to assess outbreak probability.
3. **Late-Fusion Ensemble Predictor**: Multimodal decision engine combining visual evidence and sensor risks into an explainable alert status.

---

## Directory Structure

```text
Poultry_Guard_ML/
├── __init__.py
├── requirements.txt
├── README.md
├── common/
│   ├── __init__.py
│   └── utils.py
├── cnn/
│   ├── __init__.py
│   ├── config.py
│   ├── model/
│   │   ├── best_resnet18_poultry.pth
│   │   ├── resnet18.py
│   │   └── class_mapping.json
│   ├── preprocessing/
│   │   └── transforms.py
│   ├── inference/
│   │   └── image_predictor.py
│   └── training/
│       ├── dataset.py
│       ├── train.py
│       └── evaluate.py
├── environmental/
│   ├── __init__.py
│   ├── config.py
│   ├── model/
│   │   ├── poultry_guard_risk_pipeline.joblib
│   │   ├── Environmental_factorModel.pkl
│   │   └── metadata.json
│   ├── preprocessing/
│   │   └── preprocessor.py
│   ├── inference/
│   │   └── environmental_predictor.py
│   └── training/
│       └── train_environmental.py
├── ensemble/
│   ├── __init__.py
│   ├── config.py
│   ├── fusion.py
│   └── ensemble_predictor.py
└── tests/
    ├── __init__.py
    └── test_ml_pipeline.py
```

---

## Quick Usage

### 1. CNN Image Disease Classification

```python
from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image

# Pass a filepath, PIL Image, bytes, or file stream
result = predict_image("path/to/poultry_image.jpg")
print(result)
# Output:
# {
#     "model": "ResNet18",
#     "predicted_class": "Fowlpox",
#     "confidence": 0.8012,
#     "probabilities": {
#         "Healthy": 0.0210,
#         "Coccidiosis": 0.0340,
#         "Newcastle": 0.0450,
#         "Salmonella": 0.0988,
#         "Fowlpox": 0.8012
#     }
# }
```

### 2. Environmental Biosecurity Risk Assessment

```python
from Poultry_Guard_ML.environmental.inference.environmental_predictor import predict_environment

result = predict_environment(
    temperature=33.5,
    humidity=78.0,
    mortality_rate=0.024,
    egg_production=850,
    feed_consumption=4300,
)
print(result)
# Output:
# {
#     "model": "RandomForestClassifier",
#     "predicted_risk": "HIGH",
#     "risk_score": 0.7820,
#     "probabilities": {
#         "LOW": 0.2180,
#         "MEDIUM": 0.3200,
#         "HIGH": 0.4620
#     },
#     "environmental_status": "WARNING",
#     "message": "Elevated biosecurity risk detected..."
# }
```

### 3. Multimodal Late-Fusion Prediction

```python
from Poultry_Guard_ML.ensemble.ensemble_predictor import predict_biosecurity

result = predict_biosecurity(
    image_input="path/to/poultry_image.jpg",
    environmental_input={
        "Temperature": 33.5,
        "Humidity": 78.0,
        "Mortality_Rate": 0.024,
        "Egg_Production": 850,
        "Amount_of_Feeding": 4300,
    }
)
print(result["ensemble"])
# Output:
# {
#     "disease": "Fowlpox",
#     "disease_confidence": 0.8012,
#     "environmental_risk": "HIGH",
#     "environmental_confidence": 0.4620,
#     "alert_level": "HIGH",
#     "decision": "DISEASE_AND_ENVIRONMENT",
#     "type": "DISEASE_AND_ENVIRONMENT",
#     "reason": "Visual disease indication (Fowlpox at 80.1% confidence) coincides with severe environmental stress (HIGH risk, status WARNING).",
#     "message": "..."
# }
```

---

## Testing

Run the test suite via unittest:
```bash
python -m unittest Poultry_Guard_ML/tests/test_ml_pipeline.py
```
