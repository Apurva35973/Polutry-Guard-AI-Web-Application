import pandas as pd
import os
import glob
import json

def create_dataset_index(output_csv="dataset_index.csv", mapping_json="class_mapping.json"):
    print("==================================================")
    print("4. AUTOMATIC DATA DISCOVERY & INDEX CREATION")
    print("==================================================")
    
    records = []
    
    # Define mapping
    class_mapping = {
        "Coccidiosis": 0,
        "Newcastle": 1,
        "Salmonella": 2,
        "Fowlpox": 3,
        "Healthy": 4
    }
    
    # 1. Parse data.csv for the original 4 classes
    csv_path = "../../data.csv"
    if os.path.exists(csv_path):
        print(f"Reading original 4 classes from {csv_path}...")
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            img_path = str(row['Images'])
            # Normalize path
            img_path = img_path.replace("\\", "/")
            label = str(row['Label'])
            # Map label
            label = "Newcastle" if label == "New Castle Disease" else label
            
            if label in class_mapping:
                records.append({
                    "image_path": img_path,
                    "class_name": label,
                    "class_index": class_mapping[label]
                })
    
    # 2. Scan fowlpox directories for Fowlpox class
    fowlpox_dirs = ["../../fowlpox", "../../fowlpox1"]
    print("Scanning Fowlpox directories...")
    fowlpox_label = "Fowlpox"
    fowlpox_idx = class_mapping[fowlpox_label]
    
    for d in fowlpox_dirs:
        if os.path.exists(d):
            images = glob.glob(f"{d}/**/*.jpg", recursive=True) + \
                     glob.glob(f"{d}/**/*.jpeg", recursive=True) + \
                     glob.glob(f"{d}/**/*.png", recursive=True)
            for img in images:
                # Normalize path
                img = img.replace("\\", "/")
                records.append({
                    "image_path": img,
                    "class_name": fowlpox_label,
                    "class_index": fowlpox_idx
                })

    # 3. Save combined index
    index_df = pd.DataFrame(records)
    print(f"Total images combined: {len(index_df)}")
    
    index_df.to_csv(output_csv, index=False)
    print(f"Saved dataset index to {output_csv}")
    
    # 4. Save class mapping
    with open(mapping_json, 'w') as f:
        json.dump(class_mapping, f, indent=4)
    print(f"Saved class mapping to {mapping_json}")

if __name__ == "__main__":
    create_dataset_index()
