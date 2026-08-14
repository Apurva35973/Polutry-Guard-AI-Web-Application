import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import ReduceLROnPlateau
import pandas as pd
from sklearn.metrics import f1_score
from dataset import create_dataloaders
from model import get_resnet18_model, freeze_backbone, unfreeze_backbone

CONFIG = {
    "image_size": 224,
    "batch_size": 32,
    "epochs": 20,
    "learning_rate": 1e-3,
    "weight_decay": 1e-4,
    "num_classes": 5,
    "seed": 42,
    "patience": 5, # for early stopping
    "fine_tune_epochs": 10,
    "fine_tune_lr": 1e-5
}

def set_seed(seed):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    import numpy as np
    np.random.seed(seed)
    import random
    random.seed(seed)

def get_device():
    if torch.cuda.is_available():
        print(f"Training device: CUDA ({torch.cuda.get_device_name(0)})")
        return torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        print("Training device: MPS")
        return torch.device("mps")
    else:
        print("Training device: CPU")
        return torch.device("cpu")

def save_config(config, path="../training_config.json"):
    with open(path, 'w') as f:
        json.dump(config, f, indent=4)
        
def train_epoch(model, dataloader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for inputs, labels in dataloader:
        inputs, labels = inputs.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc

def validate_epoch(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for inputs, labels in dataloader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    epoch_macro_f1 = f1_score(all_labels, all_preds, average='macro')
    
    return epoch_loss, epoch_acc, epoch_macro_f1

def train_model(config):
    print("==================================================")
    print("8. TRAINING CONFIGURATION")
    print("==================================================")
    set_seed(config["seed"])
    device = get_device()
    save_config(config)
    
    print("\nInitializing DataLoaders...")
    train_loader, val_loader, test_loader, class_counts = create_dataloaders(
        index_csv="dataset_index.csv", 
        batch_size=config["batch_size"], 
        image_size=config["image_size"],
        seed=config["seed"]
    )
    
    model = get_resnet18_model(num_classes=config["num_classes"], pretrained=True)
    model = freeze_backbone(model) # Phase 1: Train classifier only
    model = model.to(device)
    
    # Loss & Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=config["learning_rate"], weight_decay=config["weight_decay"])
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=2)
    
    best_macro_f1 = 0.0
    patience_counter = 0
    history = []
    
    # Prepare directories
    os.makedirs("../models", exist_ok=True)
    best_model_path = "../models/best_resnet18_poultry.pth"
    
    print("\nStarting Phase 1: Training Classifier...")
    for epoch in range(config["epochs"]):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, val_macro_f1 = validate_epoch(model, val_loader, criterion, device)
        
        print(f"Epoch {epoch+1}/{config['epochs']} | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} F1: {val_macro_f1:.4f}")
        
        scheduler.step(val_macro_f1)
        history.append({'epoch': epoch+1, 'train_loss': train_loss, 'val_loss': val_loss, 
                        'train_acc': train_acc, 'val_acc': val_acc, 'val_f1': val_macro_f1, 'lr': optimizer.param_groups[0]['lr']})
        
        # Early Stopping & Checkpointing
        if val_macro_f1 > best_macro_f1:
            best_macro_f1 = val_macro_f1
            patience_counter = 0
            
            # Save comprehensive checkpoint
            checkpoint = {
                'epoch': epoch + 1,
                'state_dict': model.state_dict(),
                'best_macro_f1': best_macro_f1,
                'config': config,
                'class_mapping': json.load(open("../class_mapping.json"))
            }
            torch.save(checkpoint, best_model_path)
            print(f"--> Saved best model to {best_model_path}")
        else:
            patience_counter += 1
            
        if patience_counter >= config["patience"]:
            print(f"Early stopping triggered after {epoch+1} epochs.")
            break
            
    # Phase 2: Fine-Tuning
    print("\nStarting Phase 2: Fine-tuning entire network...")
    # Load best model from Phase 1
    checkpoint = torch.load(best_model_path)
    model.load_state_dict(checkpoint['state_dict'])
    
    model = unfreeze_backbone(model)
    optimizer = optim.AdamW(model.parameters(), lr=config["fine_tune_lr"], weight_decay=config["weight_decay"])
    scheduler = ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=2)
    patience_counter = 0
    
    for epoch in range(config["fine_tune_epochs"]):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, val_macro_f1 = validate_epoch(model, val_loader, criterion, device)
        
        print(f"Fine-Tune Epoch {epoch+1}/{config['fine_tune_epochs']} | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} F1: {val_macro_f1:.4f}")
              
        scheduler.step(val_macro_f1)
        
        if val_macro_f1 > best_macro_f1:
            best_macro_f1 = val_macro_f1
            patience_counter = 0
            checkpoint = {
                'epoch': epoch + 1 + config["epochs"],
                'state_dict': model.state_dict(),
                'best_macro_f1': best_macro_f1,
                'config': config,
                'class_mapping': json.load(open("../class_mapping.json"))
            }
            torch.save(checkpoint, best_model_path)
            print(f"--> Saved best model to {best_model_path}")
        else:
            patience_counter += 1
            
        if patience_counter >= config["patience"]:
            print(f"Early stopping triggered during fine-tuning.")
            break
            
    # Save training history
    pd.DataFrame(history).to_csv("training_history.csv", index=False)
    print("\nTraining completed.")

if __name__ == "__main__":
    train_model(CONFIG)
