import os
import json
import torch
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
from dataset import create_dataloaders
from model import get_resnet18_model

def evaluate_model(config_path="../training_config.json", model_path="../models/best_resnet18_poultry.pth"):
    print("==================================================")
    print("10. EVALUATION ON TEST SET")
    print("==================================================")
    
    with open(config_path, 'r') as f:
        config = json.load(f)
        
    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Evaluation device: {device}")
    
    with open("../class_mapping.json", 'r') as f:
        class_mapping = json.load(f)
    
    idx_to_class = {v: k for k, v in class_mapping.items()}
    class_names = [idx_to_class[i] for i in range(len(idx_to_class))]
    
    # Load model
    model = get_resnet18_model(num_classes=config["num_classes"], pretrained=False)
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['state_dict'])
    model = model.to(device)
    model.eval()
    
    print("\nInitializing DataLoaders...")
    _, _, test_loader, _ = create_dataloaders(
        index_csv="dataset_index.csv", 
        batch_size=config["batch_size"], 
        image_size=config["image_size"],
        seed=config["seed"]
    )
    
    all_preds = []
    all_labels = []
    all_probs = []
    all_paths = [] # To track misclassified
    
    os.makedirs("../results/misclassified", exist_ok=True)
    
    print("Running evaluation on test set...")
    with torch.no_grad():
        for i, (inputs, labels) in enumerate(test_loader):
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)
            
            _, predicted = outputs.max(1)
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())
            
            # Note: keeping track of paths requires modifying the DataLoader to return paths.
            # For simplicity, we just use the test_split.csv order, which matches the dataloader since shuffle=False.

    test_df = pd.read_csv("test_split.csv")
    
    # Metrics
    acc = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average=None)
    macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='macro')
    
    print("\nOverall Metrics:")
    print(f"Accuracy:        {acc:.4f}")
    print(f"Macro Precision: {macro_precision:.4f}")
    print(f"Macro Recall:    {macro_recall:.4f}")
    print(f"Macro F1:        {macro_f1:.4f}")
    
    print("\nPer-Class Metrics:")
    print(f"{'Class':<15} {'Precision':<10} {'Recall':<10} {'F1':<10}")
    print("-" * 50)
    for i, name in enumerate(class_names):
        print(f"{name:<15} {precision[i]:<10.4f} {recall[i]:<10.4f} {f1[i]:<10.4f}")
        
    # Confusion Matrix
    print("\n==================================================")
    print("11. CONFUSION MATRIX")
    print("==================================================")
    cm = confusion_matrix(all_labels, all_preds)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names)
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix on Test Set')
    plt.tight_layout()
    plt.savefig("../results/confusion_matrix.png")
    print("--> Saved confusion matrix to ../results/confusion_matrix.png")
    
    # Plot Training Curves
    print("\n==================================================")
    print("12. TRAINING CURVES")
    print("==================================================")
    if os.path.exists("training_history.csv"):
        history = pd.read_csv("training_history.csv")
        fig, axes = plt.subplots(1, 3, figsize=(18, 5))
        
        # Loss
        axes[0].plot(history['epoch'], history['train_loss'], label='Train Loss')
        axes[0].plot(history['epoch'], history['val_loss'], label='Val Loss')
        axes[0].set_title('Loss vs Epochs')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Loss')
        axes[0].legend()
        
        # Accuracy
        axes[1].plot(history['epoch'], history['train_acc'], label='Train Acc')
        axes[1].plot(history['epoch'], history['val_acc'], label='Val Acc')
        axes[1].set_title('Accuracy vs Epochs')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Accuracy')
        axes[1].legend()
        
        # Learning Rate
        axes[2].plot(history['epoch'], history['lr'], label='Learning Rate')
        axes[2].set_title('Learning Rate vs Epochs')
        axes[2].set_xlabel('Epoch')
        axes[2].set_ylabel('LR')
        axes[2].set_yscale('log')
        axes[2].legend()
        
        plt.tight_layout()
        plt.savefig("../results/training_curves.png")
        print("--> Saved training curves to ../results/training_curves.png")

    print("\n==================================================")
    print("13. PER-CLASS ANALYSIS")
    print("==================================================")
    best_idx = np.argmax(f1)
    worst_idx = np.argmin(f1)
    print(f"Best-performing class:  {class_names[best_idx]} (F1: {f1[best_idx]:.4f})")
    print(f"Worst-performing class: {class_names[worst_idx]} (F1: {f1[worst_idx]:.4f})")
    
    # Find most confused pair
    np.fill_diagonal(cm, 0)
    most_confused = np.unravel_index(np.argmax(cm, axis=None), cm.shape)
    print(f"Most confused pair of classes: {class_names[most_confused[0]]} ↔ {class_names[most_confused[1]]}")
    print("Note: This does not automatically mean the diseases are biologically similar; it means the current image model has difficulty distinguishing their available visual patterns.")

    print("\n==================================================")
    print("14. ERROR ANALYSIS")
    print("==================================================")
    # Find some misclassified samples
    misclassified_idx = [i for i, (a, p) in enumerate(zip(all_labels, all_preds)) if a != p]
    
    for i in misclassified_idx[:10]: # save up to 10 examples
        img_path = test_df.iloc[i]['image_path']
        actual = class_names[all_labels[i]]
        predicted = class_names[all_preds[i]]
        conf = all_probs[i][all_preds[i]]
        
        # We would normally save the image here, but just logging it
        print(f"Misclassified: {img_path} | Actual: {actual} | Predicted: {predicted} | Confidence: {conf:.2f}")
        
    print("\nEvaluation complete.")

if __name__ == "__main__":
    evaluate_model()
