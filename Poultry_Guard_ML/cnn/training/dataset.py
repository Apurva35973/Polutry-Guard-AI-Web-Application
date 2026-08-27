from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import torch
from PIL import Image
from torch.utils.data import Dataset

from Poultry_Guard_ML.cnn.config import DATASET_MANIFEST_PATH


class PoultryDataset(Dataset):
    """
    PyTorch Dataset for Poultry Guard CNN disease classification.
    Loads real validated images without black-box fallback.
    """

    def __init__(
        self,
        split: str = "train",
        manifest_path: Path | str = DATASET_MANIFEST_PATH,
        transform: Optional[Callable] = None,
    ) -> None:
        self.split = split
        self.transform = transform
        self.manifest_path = Path(manifest_path)
        
        if not self.manifest_path.exists():
            raise FileNotFoundError(
                f"Dataset manifest not found at {self.manifest_path}. "
                "Please run prepare_dataset.py first."
            )
            
        with open(self.manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
            
        if self.split not in manifest:
            raise ValueError(f"Split '{self.split}' not in manifest. Available: {list(manifest.keys())}")
            
        self.samples: List[Dict[str, Any]] = manifest[self.split]

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        sample = self.samples[idx]
        image_path = sample["image_path"]
        class_id = int(sample["class_id"])
        
        try:
            with Image.open(image_path) as img:
                img = img.convert("RGB")
        except Exception as e:
            raise RuntimeError(f"Error loading real image at {image_path}: {e}")
            
        if self.transform:
            tensor = self.transform(img)
        else:
            from torchvision.transforms import ToTensor
            tensor = ToTensor()(img)
            
        return tensor, class_id

    def get_class_counts(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for s in self.samples:
            name = s["class_name"]
            counts[name] = counts.get(name, 0) + 1
        return counts

    def get_labels(self) -> List[int]:
        return [int(s["class_id"]) for s in self.samples]
