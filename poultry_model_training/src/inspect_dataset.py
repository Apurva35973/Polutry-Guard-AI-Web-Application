import pandas as pd
import os
import glob

def inspect_datasets():
    print("==================================================")
    print("1. INSPECT DATASET STRUCTURE")
    print("==================================================")
    
    class_counts = {}
    
    # 1. Read data.csv for the first 4 classes
    csv_path = "../data.csv"
    if os.path.exists(csv_path):
        print(f"Reading {csv_path}...")
        df = pd.read_csv(csv_path)
        counts = df['Label'].value_counts().to_dict()
        for label, count in counts.items():
            # Map 'New Castle Disease' to 'Newcastle' if necessary
            mapped_label = 'Newcastle' if label == 'New Castle Disease' else label
            class_counts[mapped_label] = class_counts.get(mapped_label, 0) + count
    else:
        print(f"Warning: {csv_path} not found.")

    # 2. Read fowlpox directories
    fowlpox_dirs = ["../fowlpox", "../fowlpox1"]
    fowlpox_count = 0
    for d in fowlpox_dirs:
        if os.path.exists(d):
            # Count images in test, train, valid subfolders recursively
            images = glob.glob(f"{d}/**/*.jpg", recursive=True) + \
                     glob.glob(f"{d}/**/*.jpeg", recursive=True) + \
                     glob.glob(f"{d}/**/*.png", recursive=True)
            fowlpox_count += len(images)
    
    if fowlpox_count > 0:
        class_counts['Fowlpox'] = fowlpox_count
    
    print("\nDataset Summary:")
    print(f"{'Class':<20} {'Number of Images'}")
    print("-" * 35)
    for cls_name, count in class_counts.items():
        print(f"{cls_name:<20} {count}")
    
    print("\nNote: Sample images cannot be displayed in terminal, but paths are logged.")

if __name__ == "__main__":
    inspect_datasets()
