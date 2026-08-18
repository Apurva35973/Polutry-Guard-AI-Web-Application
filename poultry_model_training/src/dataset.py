import os
import torch
import pandas as pd
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from PIL import Image
import numpy as np
from sklearn.model_selection import train_test_split

class PoultryDataset(Dataset):
    def __init__(self, df, transform=None):
        self.df = df.reset_index(drop=True)
        self.transform = transform
        
    def __len__(self):
        return len(self.df)
        
    def __getitem__(self, idx):
        img_path = self.df.loc[idx, 'image_path']
        label = self.df.loc[idx, 'class_index']
        
        # We need to construct the absolute path if it is relative.
        # If the path starts with "../../", it was resolved by dataset_prep.py correctly relative to src/
        if img_path.startswith("../../"):
            abs_img_path = img_path
        else:
            # Otherwise, assuming it's relative to the root (d:\Polutry-Guard-AI-Web-Application)
            abs_img_path = os.path.join("../..", img_path)
        
        try:
            image = Image.open(abs_img_path).convert("RGB")
        except Exception as e:
            # If image cannot be opened (missing or corrupt), create a dummy tensor 
            # (since we might be missing some images locally)
            image = Image.new("RGB", (224, 224), (0, 0, 0))
            
        if self.transform:
            image = self.transform(image)
            
        return image, label

def get_transforms(image_size=224):
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(image_size),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    val_test_transform = transforms.Compose([
        transforms.Resize(image_size + 32),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    return train_transform, val_test_transform

def create_dataloaders(index_csv, batch_size=32, num_workers=2, image_size=224, seed=42):
    df = pd.read_csv(index_csv)
    
    # 70% Train, 15% Val, 15% Test
    train_df, temp_df = train_test_split(df, test_size=0.30, stratify=df['class_index'], random_state=seed)
    val_df, test_df = train_test_split(temp_df, test_size=0.50, stratify=temp_df['class_index'], random_state=seed)
    
    train_transform, val_test_transform = get_transforms(image_size)
    
    train_dataset = PoultryDataset(train_df, transform=train_transform)
    val_dataset = PoultryDataset(val_df, transform=val_test_transform)
    test_dataset = PoultryDataset(test_df, transform=val_test_transform)
    
    # Handle Class Imbalance with WeightedRandomSampler
    class_counts = train_df['class_index'].value_counts().sort_index().to_numpy()
    weights = 1.0 / class_counts
    samples_weights = weights[train_df['class_index'].to_numpy()]
    sampler = WeightedRandomSampler(weights=samples_weights, num_samples=len(samples_weights), replacement=True)
    
    # Use pin_memory when CUDA is available and keep workers persistent for speed
    pin_memory = torch.cuda.is_available()
    persistent = num_workers > 0

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        sampler=sampler,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=persistent,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=persistent,
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=persistent,
    )
    
    # Save the splits to disk for evaluation/reusability
    train_df.to_csv("train_split.csv", index=False)
    val_df.to_csv("val_split.csv", index=False)
    test_df.to_csv("test_split.csv", index=False)
    
    return train_loader, val_loader, test_loader, class_counts
