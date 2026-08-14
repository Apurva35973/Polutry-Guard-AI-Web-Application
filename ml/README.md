# PoultryGuard ML pipeline

This folder separates production inference from training materials without replacing the existing trained artifacts.

## Detected assets

- `pytorch-resnet18.ipynb` is the image-training notebook. It defines a torchvision ResNet18 with a four-output linear head, `Resize((224, 224))`, `ToTensor()`, and ImageNet mean/std normalization. It saves a `model_state_dict` checkpoint to `resnet18/best.pt`, but that checkpoint is **not present** in this workspace.
- `poultry_guard_risk_pipeline.joblib` is the production environmental artifact. Although the training code contains an XGBoost option, artifact inspection found its selected estimator is `RandomForestClassifier`. It estimates Low/Medium/High biosecurity risk and is not a disease classifier.
- `poultry_risk_model.pkl` is an older separate RandomForest artifact with an eight-column schema. It is retained untouched and is not used by the application because the joblib artifact is the existing integrated pipeline.

## Layout and artifact policy

`inference/` holds reusable production prediction code. `models/image/` and `models/environmental/` are the preferred locations for future supplied artifacts. Existing root-level models and datasets were deliberately left in place: moving them would break existing scripts, and copying them would duplicate large artifacts. Predictors support the preferred locations first and the legacy joblib path second.

Place the supplied existing image checkpoint at `ml/models/image/best.pt` (or restore the notebook's `resnet18/best.pt`). Do not substitute a newly trained model. The training notebook's ImageFolder ordering implies Coccidiosis, Healthy, New Castle Disease, Salmonella; inference presents the third label as `Newcastle Disease`.

## Inputs and outputs

Environmental input must contain exactly the fields required by the saved artifact: `Temperature`, `Humidity`, `Mortality_Rate`, `Egg_Production`, and `Amount_of_Feeding`. Humidity in fraction form (0–1.5) is converted to percent, matching existing behavior. Missing fields return a validation error. The current trained environmental model does not use Ammonia, Active_Birds, Bird_Age, or Vaccination_Status. The repository has a database `ammonia` column, but no MQ-137/MQ integration was found.

`predict_environmental_risk()` exposes `risk_probabilities` and preserves `risk_score = 1 - P(Low)`. `predict_poultry_status(image, environmental)` returns image probabilities, risk probabilities, and a late-fusion alert. The configurable project thresholds are in `inference/ensemble_predictor.py`: image confidence 0.70 and High-risk probability 0.70. They are decision thresholds, not clinically validated values.

The image model provides image-based disease classification, while the environmental model estimates biosecurity/environmental risk. The ensemble layer combines these outputs for an early-warning decision; it does not constitute veterinary diagnosis.

## API and testing

`POST /api/ml/predict` accepts multipart form data with `image` and an `environmental` JSON field. It returns one JSON-serializable result and distinguishes a possible image disease from environmental risk. Existing `GET /api/risk/<farm_id>` remains compatible and now includes `risk_probabilities`.

Install Backend requirements plus compatible PyTorch/torchvision packages, then run `python Backend/run.py`. Run focused checks with `python -m unittest discover -s tests`. Training is not started by Flask. To add Ammonia, create a separately versioned retraining artifact with Ammonia in its training schema; do not add it to the current artifact's inference input.
