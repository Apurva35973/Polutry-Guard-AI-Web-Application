"""
Retraining Pipeline for ResNet18 3-Class Classifier (V2 Checkpoint).

Key features:
1. Loads dataset_manifest_v2.json with balanced, leak-free Coryza additions.
2. Low-memory execution: batch_size=8, num_workers=0 (guaranteed safe on 8GB RAM laptop).
3. Preserves original checkpoint: writes to best_resnet18_poultry_3class_v2.pth.
4. Preserves canonical mapping: {Fowlpox: 0, Infectious Coryza: 1, Healthy: 2}.
5. Computes full per-class metrics and evaluates on both standard benchmark test set
   and unseen external Coryza test set.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict, Tuple

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from torch.utils.data import DataLoader

from Poultry_Guard_ML.cnn.config import (
    CANONICAL_CNN_CLASSES,
    CLASS_MAPPING_PATH,
    DEFAULT_CLASS_MAPPING,
    IMAGE_SIZE,
    MODEL_PATH,
    NORMALIZE_MEAN,
    NORMALIZE_STD,
    RAW_INDEX_TO_CLASS,
)
from Poultry_Guard_ML.cnn.model.resnet18 import get_resnet18_model
from Poultry_Guard_ML.cnn.preprocessing.transforms import get_train_transform, get_val_transform, get_test_transform
from Poultry_Guard_ML.cnn.training.dataset import PoultryDataset
from Poultry_Guard_ML.common.utils import get_device

MANIFEST_V2_PATH = MODEL_PATH.parent / "dataset_manifest_v2.json"
MODEL_V2_PATH = MODEL_PATH.parent / "best_resnet18_poultry_3class_v2.pth"


def compute_class_weights(labels: list[int], num_classes: int = 3) -> torch.Tensor:
    counts = np.bincount(labels, minlength=num_classes)
    total = len(labels)
    weights = total / (num_classes * np.maximum(counts, 1).astype(np.float32))
    return torch.tensor(weights, dtype=torch.float32)


def evaluate_split(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float, float, float, float]:
    model.eval()
    running_loss = 0.0
    all_preds: list[int] = []
    all_targets: list[int] = []

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(device)
            targets = targets.to(device)

            outputs = model(inputs)
            loss = criterion(outputs, targets)

            running_loss += loss.item() * inputs.size(0)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(targets.cpu().numpy())

    total_samples = len(all_targets)
    if total_samples == 0:
        return 0.0, 0.0, 0.0, 0.0, 0.0

    avg_loss = running_loss / total_samples
    acc = float(np.mean(np.array(all_preds) == np.array(all_targets)))
    macro_prec = float(precision_score(all_targets, all_preds, average="macro", zero_division=0))
    macro_rec = float(recall_score(all_targets, all_preds, average="macro", zero_division=0))
    macro_f1 = float(f1_score(all_targets, all_preds, average="macro", zero_division=0))

    return avg_loss, acc, macro_prec, macro_rec, macro_f1


def train_v2(
    epochs: int = 12,
    batch_size: int = 8,
    lr: float = 1e-4,
    patience: int = 5,
    save_path: Path = MODEL_V2_PATH,
) -> Dict[str, any]:
    if not MANIFEST_V2_PATH.exists():
        raise FileNotFoundError(f"Manifest V2 not found at {MANIFEST_V2_PATH}")

    device = get_device(prefer_gpu=True)
    print(f"=== Starting Retraining Pipeline V2 ===")
    print(f"Device: {device}")
    print(f"Batch Size: {batch_size} | Num Workers: 0 (8GB RAM Safe Mode)")
    print(f"Target Checkpoint: {save_path.name}")
    print(f"Class Mapping: {DEFAULT_CLASS_MAPPING}")

    # Datasets
    train_dataset = PoultryDataset(split="train", manifest_path=MANIFEST_V2_PATH, transform=get_train_transform())
    val_dataset = PoultryDataset(split="valid", manifest_path=MANIFEST_V2_PATH, transform=get_val_transform())

    print(f"Train samples: {len(train_dataset)}, Validation samples: {len(val_dataset)}")
    print(f"Train distribution: {train_dataset.get_class_counts()}")
    print(f"Validation distribution: {val_dataset.get_class_counts()}")

    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=True, num_workers=0, pin_memory=False
    )
    val_loader = DataLoader(
        val_dataset, batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=False
    )

    # Model
    model = get_resnet18_model(num_classes=3, pretrained=True)
    model = model.to(device)

    # Class weights & Loss
    class_weights = compute_class_weights(train_dataset.get_labels(), num_classes=3).to(device)
    print(f"Class weights (Fowlpox, Coryza, Healthy): {class_weights.cpu().numpy().round(3)}")
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # Optimizer & Scheduler
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_val_f1 = -1.0
    best_epoch = 0
    patience_counter = 0
    history = []

    print("\n" + "=" * 80)
    print(f"{'Epoch':<7} | {'Train Loss':<11} | {'Val Loss':<9} | {'Val Acc':<8} | {'Val Prec':<9} | {'Val Rec':<8} | {'Val F1':<8} | {'Status'}")
    print("=" * 80)

    start_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        t0 = time.time()

        for inputs, targets in train_loader:
            inputs = inputs.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)

        scheduler.step()
        train_loss = running_loss / len(train_dataset)

        # Evaluate validation
        val_loss, val_acc, val_prec, val_rec, val_f1 = evaluate_split(
            model, val_loader, criterion, device
        )

        epoch_record = {
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val_loss,
            "val_acc": val_acc,
            "val_f1": val_f1,
            "lr": optimizer.param_groups[0]["lr"],
            "epoch_time_s": round(time.time() - t0, 1),
        }
        history.append(epoch_record)

        is_best = val_f1 > best_val_f1
        status_msg = ""

        if is_best:
            best_val_f1 = val_f1
            best_epoch = epoch
            patience_counter = 0
            status_msg = f"[BEST] (F1: {val_f1*100:.2f}%)"

            # Save checkpoint with comprehensive metadata
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "epoch": epoch,
                "best_val_macro_f1": best_val_f1,
                "best_val_accuracy": val_acc,
                "train_loss": train_loss,
                "val_loss": val_loss,
                "class_to_idx": DEFAULT_CLASS_MAPPING,
                "idx_to_class": RAW_INDEX_TO_CLASS,
                "classes": CANONICAL_CNN_CLASSES,
                "image_size": IMAGE_SIZE,
                "normalize_mean": NORMALIZE_MEAN,
                "normalize_std": NORMALIZE_STD,
                "model_architecture": "resnet18",
                "training_config": {
                    "batch_size": batch_size,
                    "lr": lr,
                    "num_workers": 0,
                    "epochs_trained": epoch,
                },
            }
            save_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save(checkpoint, save_path)
        else:
            patience_counter += 1
            status_msg = f"Patience {patience_counter}/{patience}"

        print(
            f"{epoch:<7} | {train_loss:<11.4f} | {val_loss:<9.4f} | {val_acc*100:<7.2f}% | "
            f"{val_prec*100:<8.2f}% | {val_rec*100:<7.2f}% | {val_f1*100:<7.2f}% | {status_msg}",
            flush=True
        )

        if patience_counter >= patience:
            print(f"\n[Early Stopping triggered after {epoch} epochs without F1 improvement.]")
            break

    total_training_time = round(time.time() - start_time, 1)
    print("=" * 80)
    print(f"Training Complete in {total_training_time}s. Best Epoch: {best_epoch} with Val Macro F1: {best_val_f1*100:.2f}%")
    print(f"Saved Checkpoint: {save_path.resolve()}\n")

    # Final Comprehensive Evaluation
    run_comprehensive_evaluation(save_path, device)

    return {
        "best_epoch": best_epoch,
        "best_val_macro_f1": best_val_f1,
        "history": history,
        "checkpoint_path": str(save_path),
        "total_time_s": total_training_time,
    }


def run_comprehensive_evaluation(checkpoint_path: Path, device: torch.device):
    print("=" * 80)
    print("COMPREHENSIVE POST-TRAINING EVALUATION")
    print("=" * 80)

    # Load best checkpoint
    model = get_resnet18_model(num_classes=3, pretrained=False)
    ckpt = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)
    model.eval()

    # 1. Evaluate Benchmark Test Set (329 samples)
    test_dataset = PoultryDataset(split="test", manifest_path=MANIFEST_V2_PATH, transform=get_test_transform())
    test_loader = DataLoader(test_dataset, batch_size=8, shuffle=False, num_workers=0)

    all_preds = []
    all_targets = []
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(targets.numpy())

    class_names = [RAW_INDEX_TO_CLASS[i] for i in range(3)]
    print("\n--- 1. BENCHMARK TEST SET RESULTS (329 samples) ---")
    print(classification_report(all_targets, all_preds, target_names=class_names, digits=4))
    print("Confusion Matrix (Rows: Ground Truth, Cols: Predicted):")
    print(confusion_matrix(all_targets, all_preds))

    # 2. Dedicated External Coryza Test Set (20 samples)
    with open(MANIFEST_V2_PATH, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)
    ext_samples = manifest_data.get("coryza_external_test", [])

    print(f"\n--- 2. UNSEEN EXTERNAL CORYZA TEST SET ({len(ext_samples)} samples) ---")
    coryza_correct = 0
    test_transform = get_test_transform()

    from PIL import Image
    for idx, s in enumerate(ext_samples, 1):
        img_p = Path(s["image_path"])
        with Image.open(img_p) as img:
            t = test_transform(img.convert("RGB")).unsqueeze(0).to(device)
            with torch.no_grad():
                out = model(t)
                probs = torch.softmax(out, dim=1).squeeze(0).cpu().numpy()
                pred_idx = int(np.argmax(probs))
                pred_name = RAW_INDEX_TO_CLASS[pred_idx]
                is_correct = (pred_name == "Infectious Coryza")
                if is_correct:
                    coryza_correct += 1

                print(
                    f"[{idx:>2}/{len(ext_samples)}] {img_p.name[:35]:<35} -> "
                    f"Pred: {pred_name:<16} (Coryza Prob: {probs[1]*100:>5.1f}%, Fowlpox: {probs[0]*100:>5.1f}%) | "
                    f"{'PASS' if is_correct else 'FAIL'}"
                )

    ext_acc = (coryza_correct / len(ext_samples)) * 100 if ext_samples else 0.0
    print(f"\nExternal Coryza Accuracy: {coryza_correct}/{len(ext_samples)} ({ext_acc:.1f}%)")
    print("=" * 80)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=4)
    args = parser.parse_args()

    train_v2(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience,
    )
