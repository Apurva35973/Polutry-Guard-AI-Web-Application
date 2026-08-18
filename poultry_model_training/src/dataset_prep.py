import pandas as pd
import os
import glob
import json

def create_dataset_index(output_csv="dataset_index.csv", mapping_json="class_mapping.json", max_samples_per_class=500):
    print("==================================================")
    print("4. OPTIMIZED DATA DISCOVERY & INDEX CREATION")
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
    
    # 1. Scan fowlpox directories for real Fowlpox images
    fowlpox_dirs = ["../../fowlpox", "../../fowlpox1"]
    print("Scanning Fowlpox directories...")
    fowlpox_label = "Fowlpox"
    fowlpox_idx = class_mapping[fowlpox_label]
    
    seen_paths = set()
    for d in fowlpox_dirs:
        if os.path.exists(d):
            images = glob.glob(f"{d}/**/*.jpg", recursive=True) + \
                     glob.glob(f"{d}/**/*.jpeg", recursive=True) + \
                     glob.glob(f"{d}/**/*.png", recursive=True)
            for img in images:
                norm_img = img.replace("\\", "/")
                if norm_img not in seen_paths:
                    seen_paths.add(norm_img)
                    records.append({
                        "image_path": norm_img,
                        "class_name": fowlpox_label,
                        "class_index": fowlpox_idx
                    })
    print(f"Found {len(seen_paths)} unique Fowlpox images.")
    
    # 2. Parse data.csv for remaining 4 classes (subsampled to max_samples_per_class to prevent 500k dummy loop)
    csv_path = "../../data.csv"
    if os.path.exists(csv_path):
        print(f"Reading classes from {csv_path} (subsampling up to {max_samples_per_class} per class for efficiency)...")
        df = pd.read_csv(csv_path)
        
        for label in ["Coccidiosis", "Newcastle", "Salmonella", "Healthy"]:
            lookup_label = "New Castle Disease" if label == "Newcastle" else label
            subset = df[df['Label'] == lookup_label]
            if len(subset) > max_samples_per_class:
                subset = subset.sample(n=max_samples_per_class, random_state=42)
            
            for _, row in subset.iterrows():
                img_path = str(row['Images']).replace("\\", "/")
                records.append({
                    "image_path": img_path,
                    "class_name": label,
                    "class_index": class_mapping[label]
                })

    # 3. Save combined index
    index_df = pd.DataFrame(records)
    print(f"Total dataset records: {len(index_df)}")
    print(index_df['class_name'].value_counts())
    
    index_df.to_csv(output_csv, index=False)
    print(f"Saved optimized dataset index to {output_csv}")
    
    # 4. Save class mapping
    with open(mapping_json, 'w') as f:
        json.dump(class_mapping, f, indent=4)
    print(f"Saved class mapping to {mapping_json}")

if __name__ == "__main__":
    create_dataset_index()
