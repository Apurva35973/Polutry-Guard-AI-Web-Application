"""
Training script for 3-Class ResNet18 Poultry Disease Classifier.

Trains with transfer learning, class weighting, learning rate scheduling,
early stopping on Validation Macro F1, and complete checkpoint metadata saving.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import f1_score, precision_score, recall_score
from torch.utils.data import DataLoader

from Poultry_Guard_ML.cnn.config import (
    CANONICAL_CNN_CLASSES,
    CLASS_MAPPING_PATH,
    DATASET_MANIFEST_PATH,
    DEFAULT_CLASS_MAPPING,
    IMAGE_SIZE,
    MODEL_PATH,
    NORMALIZE_MEAN,
    NORMALIZE_STD,
    RAW_INDEX_TO_CLASS,
)
from Poultry_Guard_ML.cnn.model.resnet18 import get_resnet18_model
from Poultry_Guard_ML.cnn.preprocessing.prepare_dataset import scan_and_prepare_datasets
from Poultry_Guard_ML.cnn.preprocessing.transforms import get_train_transform, get_val_transform
from Poultry_Guard_ML.cnn.training.dataset import PoultryDataset
from Poultry_Guard_ML.common.utils import get_device


def compute_class_weights(labels: list[int], num_classes: int = 3) -> torch.Tensor:
    """Compute balanced inverse-frequency class weights for CrossEntropyLoss."""
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
    """
    Evaluate model on a DataLoader split.
    Returns: (loss, accuracy, macro_precision, macro_recall, macro_f1)
    """
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


def train_cnn_model(
    epochs: int = 15,
    batch_size: int = 32,
    lr: float = 1e-4,
    patience: int = 5,
    save_path: Path = MODEL_PATH,
    datasets_root: Path | None = None,
) -> Dict[str, any]:
    """Train ResNet18 3-class classifier and save best checkpoint."""
    # Ensure manifest exists
    if not DATASET_MANIFEST_PATH.exists():
        print("Dataset manifest not found. Scanning and building clean manifest...")
        from Poultry_Guard_ML.cnn.config import DEFAULT_DATASETS_DIR
        root = datasets_root if datasets_root else DEFAULT_DATASETS_DIR
        scan_and_prepare_datasets(root)

    device = get_device(prefer_gpu=True)
    print(f"Training on device: {device}")

    # Load datasets
    train_dataset = PoultryDataset(split="train", transform=get_train_transform())
    val_dataset = PoultryDataset(split="valid", transform=get_val_transform())

    print(f"Train samples: {len(train_dataset)}, Validation samples: {len(val_dataset)}")
    print(f"Train class distribution: {train_dataset.get_class_counts()}")
    print(f"Validation class distribution: {val_dataset.get_class_counts()}")

    # DataLoader
    num_workers = 0  # Safe cross-platform default on Windows
    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=False
    )
    val_loader = DataLoader(
        val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=False
    )

    # Model & Class Weights
    num_classes = len(CANONICAL_CNN_CLASSES)
    model = get_resnet18_model(num_classes=num_classes, pretrained=True).to(device)

    train_labels = train_dataset.get_labels()
    class_weights = compute_class_weights(train_labels, num_classes=num_classes).to(device)
    print(f"Computed Class Weights: {class_weights.cpu().numpy().tolist()}")

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=2
    )

    best_val_macro_f1 = -1.0
    best_epoch = -1
    best_metrics: Dict[str, float] = {}
    epochs_no_improve = 0

    print("\n" + "=" * 80)
    print(f"{'Epoch':^6} | {'Train Loss':^10} | {'Train Acc':^10} | {'Val Loss':^10} | {'Val Acc':^10} | {'Val Macro F1':^12} | {'Time (s)':^8}")
    print("=" * 80)

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        running_loss = 0.0
        train_preds: list[int] = []
        train_targets: list[int] = []

        for inputs, targets in train_loader:
            inputs = inputs.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            train_preds.extend(preds)
            train_targets.extend(targets.cpu().numpy())

        train_loss = running_loss / len(train_dataset)
        train_acc = float(np.mean(np.array(train_preds) == np.array(train_targets)))

        # Evaluate on validation set
        val_loss, val_acc, val_prec, val_rec, val_f1 = evaluate_split(
            model, val_loader, criterion, device
        )

        elapsed = time.time() - t0
        print(f"{epoch:^6d} | {train_loss:^10.4f} | {train_acc*100:^9.2f}% | {val_loss:^10.4f} | {val_acc*100:^9.2f}% | {val_f1*100:^11.2f}% | {elapsed:^8.1f}")

        scheduler.step(val_f1)

        # Checkpoint if best Validation Macro F1
        if val_f1 > best_val_macro_f1:
            best_val_macro_f1 = val_f1
            best_epoch = epoch
            epochs_no_improve = 0
            best_metrics = {
                "train_loss": train_loss,
                "train_acc": train_acc,
                "val_loss": val_loss,
                "val_acc": val_acc,
                "val_macro_precision": val_prec,
                "val_macro_recall": val_rec,
                "val_macro_f1": val_f1,
            }

            save_path.parent.mkdir(parents=True, exist_ok=True)
            checkpoint_payload = {
                "epoch": epoch,
                "model_architecture": "ResNet18",
                "num_classes": num_classes,
                "canonical_classes": CANONICAL_CNN_CLASSES,
                "class_mapping": DEFAULT_CLASS_MAPPING,
                "index_to_class": RAW_INDEX_TO_CLASS,
                "image_size": IMAGE_SIZE,
                "normalize_mean": NORMALIZE_MEAN,
                "normalize_std": NORMALIZE_STD,
                "best_val_metrics": best_metrics,
                "state_dict": model.state_dict(),
            }
            torch.save(checkpoint_payload, save_path)
            print(f"  --> Saved new best checkpoint at Epoch {epoch} (Val Macro F1: {val_f1*100:.2f}%) to {save_path.name}")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"\nEarly stopping triggered after {epoch} epochs (no improvement for {patience} epochs).")
                break

    print("=" * 80)
    print(f"Training Complete. Best Epoch: {best_epoch} with Val Macro F1: {best_val_macro_f1*100:.2f}%")
    print("=" * 80 + "\n")

    return {
        "best_epoch": best_epoch,
        "best_val_macro_f1": best_val_macro_f1,
        "best_metrics": best_metrics,
        "model_path": str(save_path),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train 3-Class Poultry Guard ResNet18 CNN.")
    parser.add_argument("--epochs", type=int, default=10, help="Maximum epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--patience", type=int, default=4, help="Early stopping patience")
    args = parser.parse_args()

    train_cnn_model(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr, patience=args.patience)
