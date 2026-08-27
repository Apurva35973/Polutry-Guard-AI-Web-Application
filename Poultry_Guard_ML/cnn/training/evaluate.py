"""
Evaluation script for 3-Class ResNet18 Poultry Disease Model on Test Split.

Calculates:
- Overall Accuracy
- Macro Precision, Recall, F1
- Per-class Precision, Recall, F1 for Fowlpox, Infectious Coryza, Healthy
- Confusion Matrix
- Classification Report
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict

import numpy as np
import torch
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from torch.utils.data import DataLoader

from Poultry_Guard_ML.cnn.config import (
    CANONICAL_CNN_CLASSES,
    MODEL_PATH,
    RAW_INDEX_TO_CLASS,
)
from Poultry_Guard_ML.cnn.model.resnet18 import get_resnet18_model
from Poultry_Guard_ML.cnn.preprocessing.transforms import get_test_transform
from Poultry_Guard_ML.cnn.training.dataset import PoultryDataset
from Poultry_Guard_ML.common.utils import get_device


def evaluate_test_set(
    model_path: Path = MODEL_PATH,
    batch_size: int = 32,
) -> Dict[str, Any]:
    """Run full evaluation on the independent test dataset."""
    if not model_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at {model_path}. Train the model first.")

    device = get_device(prefer_gpu=True)
    test_dataset = PoultryDataset(split="test", transform=get_test_transform())
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    num_classes = len(CANONICAL_CNN_CLASSES)
    model = get_resnet18_model(num_classes=num_classes, pretrained=False)

    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
    state_dict = checkpoint["state_dict"] if "state_dict" in checkpoint else checkpoint
    model.load_state_dict(state_dict)
    model = model.to(device)
    model.eval()

    all_preds: list[int] = []
    all_targets: list[int] = []
    all_probs: list[list[float]] = []

    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = np.argmax(probs, axis=1)

            all_probs.extend(probs.tolist())
            all_preds.extend(preds.tolist())
            all_targets.extend(targets.numpy().tolist())

    y_true = np.array(all_targets)
    y_pred = np.array(all_preds)

    overall_acc = float(np.mean(y_true == y_pred))
    macro_prec = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    macro_rec = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))

    target_names = [RAW_INDEX_TO_CLASS[i] for i in range(num_classes)]
    cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes)))
    report_str = classification_report(
        y_true, y_pred, target_names=target_names, digits=4, zero_division=0
    )

    per_class_metrics: Dict[str, Dict[str, float]] = {}
    for idx, name in enumerate(target_names):
        # binary metrics for current class
        b_true = (y_true == idx).astype(int)
        b_pred = (y_pred == idx).astype(int)
        p = float(precision_score(b_true, b_pred, zero_division=0))
        r = float(recall_score(b_true, b_pred, zero_division=0))
        f = float(f1_score(b_true, b_pred, zero_division=0))
        per_class_metrics[name] = {"precision": p, "recall": r, "f1": f}

    print("\n" + "=" * 65)
    print("INDEPENDENT TEST SET EVALUATION REPORT")
    print("=" * 65)
    print(f"Total Test Samples: {len(y_true)}")
    print(f"Overall Accuracy:   {overall_acc*100:.2f}%")
    print(f"Macro Precision:    {macro_prec*100:.2f}%")
    print(f"Macro Recall:       {macro_rec*100:.2f}%")
    print(f"Macro F1-Score:     {macro_f1*100:.2f}%")
    print("\n" + "-" * 65)
    print("PER-CLASS METRICS")
    print("-" * 65)
    for name in target_names:
        m = per_class_metrics[name]
        print(f"\n{name}:")
        print(f"  Precision: {m['precision']*100:.2f}%")
        print(f"  Recall:    {m['recall']*100:.2f}%")
        print(f"  F1-Score:  {m['f1']*100:.2f}%")

    print("\n" + "-" * 65)
    print("CONFUSION MATRIX")
    print("-" * 65)
    header = f"{'True \\ Pred':<20}" + "".join([f"{name:>15}" for name in target_names])
    print(header)
    for i, row_name in enumerate(target_names):
        row_str = f"{row_name:<20}" + "".join([f"{cm[i, j]:>15d}" for j in range(num_classes)])
        print(row_str)

    print("\n" + "-" * 65)
    print("CLASSIFICATION REPORT")
    print("-" * 65)
    print(report_str)
    print("=" * 65 + "\n")

    return {
        "overall_accuracy": overall_acc,
        "macro_precision": macro_prec,
        "macro_recall": macro_rec,
        "macro_f1": macro_f1,
        "per_class": per_class_metrics,
        "confusion_matrix": cm.tolist(),
        "classification_report": report_str,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate 3-Class Poultry Guard CNN on Test Set.")
    parser.add_argument("--model-path", type=str, default=str(MODEL_PATH), help="Path to model checkpoint")
    args = parser.parse_args()

    evaluate_test_set(model_path=Path(args.model_path))
