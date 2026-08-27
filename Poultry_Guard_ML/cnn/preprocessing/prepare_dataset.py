"""
Dataset Preparation, Validation, and Leakage Prevention Pipeline.

Scans all 4 dataset directories, validates image readability (zero black fallbacks),
filters unwanted classes, prevents cross-split data leakage using perceptual hashing
and base image identifiers, and exports a unified dataset manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image

from Poultry_Guard_ML.cnn.config import (
    CANONICAL_CNN_CLASSES,
    CLASS_MAPPING_PATH,
    DATASET_MANIFEST_PATH,
    DEFAULT_CLASS_MAPPING,
)


def compute_dhash(img: Image.Image, hash_size: int = 8) -> str:
    """Compute difference hash (dHash) for perceptual image deduplication."""
    img_gray = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
    pixels = list(img_gray.getdata())
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            p_left = pixels[row * (hash_size + 1) + col]
            p_right = pixels[row * (hash_size + 1) + col + 1]
            diff.append(p_left > p_right)
    
    decimal_val = 0
    hex_parts = []
    for idx, bit in enumerate(diff):
        if bit:
            decimal_val += 2 ** (idx % 8)
        if (idx % 8) == 7:
            hex_parts.append(hex(decimal_val)[2:].rjust(2, "0"))
            decimal_val = 0
    return "".join(hex_parts)


def get_base_identifier(filename: str) -> str:
    """Extract root filename identifier before Roboflow hash variations."""
    if ".rf." in filename:
        return filename.split(".rf.")[0]
    return Path(filename).stem


def is_black_image(img: Image.Image) -> bool:
    """Return True if image is a pure black placeholder."""
    extrema = img.getextrema()
    if extrema == ((0, 0), (0, 0), (0, 0)):
        return True
    return False


def validate_image_file(file_path: Path) -> Optional[Tuple[Image.Image, str, str]]:
    """
    Validate that an image file is readable, not empty, and not purely black.
    Returns (PIL.Image, md5_hash, dhash) or None if invalid.
    """
    try:
        if file_path.stat().st_size == 0:
            return None
        
        with open(file_path, "rb") as f:
            data = f.read()
        md5_hash = hashlib.md5(data).hexdigest()
        
        with Image.open(file_path) as img:
            img.verify()
        
        # Open again after verify()
        with Image.open(file_path) as img:
            img = img.convert("RGB")
            if is_black_image(img):
                return None
            d_hash = compute_dhash(img)
            return img, md5_hash, d_hash
    except Exception:
        return None


def scan_and_prepare_datasets(
    datasets_root: Path,
    output_dir: Optional[Path] = None,
    save_manifest: bool = True,
) -> Dict[str, Any]:
    """
    Scan the 4 dataset directories, classify images into Fowlpox, Infectious Coryza, Healthy,
    prevent leakage, and compile clean train/valid/test datasets.
    """
    datasets_root = Path(datasets_root).resolve()
    
    sources = {
        "Dataset 1 (All disease)": datasets_root / "All disease",
        "Dataset 2 (fowlpox)": datasets_root / "fowlpox",
        "Dataset 3 (Healthy)": datasets_root / "Healthy",
        "Dataset 4 (Infectious croyza)": datasets_root / "Infectious croyza",
    }
    
    report: Dict[str, Any] = {
        "sources": {},
        "raw_counts": {},
        "exclusions": {
            "Bumblefoot": 0,
            "CRD": 0,
            "Unlabeled": 0,
            "Healthy CRD (ambiguous)": 0,
            "Coryza CRD (ambiguous)": 0,
            "Dataset 3 Multi-Box Frames": 0,
            "Corrupted / Unreadable": 0,
            "Black Image Placeholders": 0,
            "Cross-Split Leaks Removed": 0,
        },
        "final_counts": {"train": {}, "valid": {}, "test": {}, "total": {}},
        "class_mapping": DEFAULT_CLASS_MAPPING,
    }

    # Initialize per-class counts
    for cls_name in CANONICAL_CNN_CLASSES:
        for split in ["train", "valid", "test", "total"]:
            report["final_counts"][split][cls_name] = 0

    valid_images: List[Dict[str, Any]] = []

    # 1. Traverse and classify
    for src_name, src_dir in sources.items():
        report["sources"][src_name] = {}
        if not src_dir.exists():
            continue
        
        for split in ["train", "valid", "test"]:
            split_dir = src_dir / split
            if not split_dir.exists():
                continue
            
            # Subdirectories or direct files
            subdirs = [d for d in split_dir.iterdir() if d.is_dir()]
            if subdirs:
                for sub in subdirs:
                    folder_name = sub.name.strip()
                    sub_imgs = [
                        f for f in sub.glob("*")
                        if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
                    ]
                    report["sources"][src_name].setdefault(split, {})[folder_name] = len(sub_imgs)
                    
                    folder_norm = folder_name.lower()
                    
                    # Determine target class or exclusion
                    target_class: Optional[str] = None
                    if folder_norm == "coryza":
                        target_class = "Infectious Coryza"
                    elif folder_norm in ["fowlpox", "fowl pox"]:
                        target_class = "Fowlpox"
                    elif folder_norm == "healthy":
                        target_class = "Healthy"
                    elif "bumblefoot" in folder_norm:
                        report["exclusions"]["Bumblefoot"] += len(sub_imgs)
                    elif folder_norm == "crd":
                        report["exclusions"]["CRD"] += len(sub_imgs)
                    elif folder_norm == "unlabeled":
                        report["exclusions"]["Unlabeled"] += len(sub_imgs)
                    elif folder_norm in ["healthy crd", "healthy_crd"]:
                        report["exclusions"]["Healthy CRD (ambiguous)"] += len(sub_imgs)
                    elif folder_norm in ["coryza crd", "coryza_crd"]:
                        report["exclusions"]["Coryza CRD (ambiguous)"] += len(sub_imgs)
                    else:
                        report["exclusions"].setdefault(folder_name, 0)
                        report["exclusions"][folder_name] += len(sub_imgs)
                    
                    if target_class:
                        for img_p in sub_imgs:
                            valid_images.append({
                                "path": img_p,
                                "source": src_name,
                                "split": split,
                                "target_class": target_class,
                                "filename": img_p.name,
                                "base_id": get_base_identifier(img_p.name),
                            })
            else:
                # Direct images in split folder (e.g. Dataset 2 fowlpox, Dataset 3 Healthy)
                direct_imgs = [
                    f for f in split_dir.glob("*")
                    if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
                ]
                report["sources"][src_name].setdefault(split, {})["_direct_"] = len(direct_imgs)
                
                if "fowlpox" in src_name.lower():
                    # Dataset 2 is Fowlpox
                    for img_p in direct_imgs:
                        valid_images.append({
                            "path": img_p,
                            "source": src_name,
                            "split": split,
                            "target_class": "Fowlpox",
                            "filename": img_p.name,
                            "base_id": get_base_identifier(img_p.name),
                        })
                elif "healthy" in src_name.lower():
                    # Dataset 3 contains flock video frames with both Abnormal & Normal boxes
                    # Documented exclusion of ambiguous multi-bird flock frames
                    report["exclusions"]["Dataset 3 Multi-Box Frames"] += len(direct_imgs)

    # 2. Image integrity verification and hash extraction
    processed_records: List[Dict[str, Any]] = []
    
    for item in valid_images:
        res = validate_image_file(item["path"])
        if res is None:
            report["exclusions"]["Corrupted / Unreadable"] += 1
            continue
        
        _, md5_h, d_h = res
        item["md5"] = md5_h
        item["dhash"] = d_h
        processed_records.append(item)

    # 3. Strict Data Leakage Prevention
    # Ensure no test/validation base_id or perceptual hash exists in train
    test_val_bases: Set[str] = set()
    test_val_dhashes: Set[str] = set()
    
    for item in processed_records:
        if item["split"] in ["valid", "test"]:
            test_val_bases.add(item["base_id"])
            test_val_dhashes.add(item["dhash"])
    
    clean_manifest: Dict[str, List[Dict[str, Any]]] = {
        "train": [],
        "valid": [],
        "test": [],
    }

    seen_in_split: Dict[str, Set[str]] = {"train": set(), "valid": set(), "test": set()}

    for item in processed_records:
        sp = item["split"]
        md5_h = item["md5"]
        base_id = item["base_id"]
        d_h = item["dhash"]
        
        # Deduplicate exact file within split
        if md5_h in seen_in_split[sp]:
            continue
        seen_in_split[sp].add(md5_h)
        
        # If in train, make sure it does not leak to test/valid
        if sp == "train":
            if base_id in test_val_bases or d_h in test_val_dhashes:
                report["exclusions"]["Cross-Split Leaks Removed"] += 1
                continue
        
        clean_manifest[sp].append({
            "image_path": str(item["path"].resolve()),
            "relative_path": str(item["path"].relative_to(datasets_root)),
            "source": item["source"],
            "class_name": item["target_class"],
            "class_id": DEFAULT_CLASS_MAPPING[item["target_class"]],
            "base_id": base_id,
            "md5": md5_h,
            "dhash": d_h,
        })
        
        report["final_counts"][sp][item["target_class"]] += 1
        report["final_counts"]["total"][item["target_class"]] += 1

    # 4. Save manifest and class mapping if requested
    if save_manifest:
        out_manifest_path = DATASET_MANIFEST_PATH if output_dir is None else output_dir / "dataset_manifest.json"
        out_manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_manifest_path, "w", encoding="utf-8") as f:
            json.dump(clean_manifest, f, indent=2)
        
        out_mapping_path = CLASS_MAPPING_PATH if output_dir is None else output_dir / "class_mapping.json"
        out_mapping_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_mapping_path, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CLASS_MAPPING, f, indent=2)

    return report


def print_dataset_report(report: Dict[str, Any]) -> None:
    """Print standard summary report formatted per requirements."""
    print("\n" + "=" * 55)
    print("SOURCE DATASET DISCOVERY REPORT")
    print("=" * 55)
    for src_name, splits in report["sources"].items():
        print(f"\n{src_name}:")
        for sp, class_dict in splits.items():
            items_str = ", ".join(f"{k}: {v}" for k, v in class_dict.items())
            print(f"  {sp:5s} -> {items_str}")

    print("\n" + "=" * 55)
    print("FINAL TRAINING DATA COUNTS")
    print("=" * 55)
    for cls_name in CANONICAL_CNN_CLASSES:
        tr = report["final_counts"]["train"][cls_name]
        va = report["final_counts"]["valid"][cls_name]
        te = report["final_counts"]["test"][cls_name]
        tot = report["final_counts"]["total"][cls_name]
        print(f"{cls_name:18s} | Train: {tr:5d} | Valid: {va:4d} | Test: {te:4d} | Total: {tot:5d}")

    total_train = sum(report["final_counts"]["train"].values())
    total_val = sum(report["final_counts"]["valid"].values())
    total_test = sum(report["final_counts"]["test"].values())
    total_all = sum(report["final_counts"]["total"].values())
    print("-" * 55)
    print(f"{'TOTAL':18s} | Train: {total_train:5d} | Valid: {total_val:4d} | Test: {total_test:4d} | Total: {total_all:5d}")

    print("\n" + "=" * 55)
    print("EXCLUDED SAMPLES & REASONS")
    print("=" * 55)
    for reason, count in report["exclusions"].items():
        print(f"  {reason:35s}: {count:5d}")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare and validate Poultry Guard CNN dataset.")
    parser.add_argument(
        "--datasets-root",
        type=str,
        default=str(Path(__file__).resolve().parents[3] / "datasets"),
        help="Path to datasets root directory",
    )
    args = parser.parse_args()
    
    rep = scan_and_prepare_datasets(Path(args.datasets_root))
    print_dataset_report(rep)
