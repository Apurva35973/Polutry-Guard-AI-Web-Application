import json
import torch
from PIL import Image
from torchvision import transforms
from model import get_resnet18_model

def get_inference_transform(image_size=224):
    """Must be identical to validation/test preprocessing."""
    return transforms.Compose([
        transforms.Resize(image_size + 32),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

def predict_image(image_path, model_path="../models/best_resnet18_poultry.pth", config_path="../training_config.json", mapping_path="../class_mapping.json"):
    print("==================================================")
    print("17. REUSABLE INFERENCE PREPROCESSING")
    print("==================================================")
    
    with open(config_path, 'r') as f:
        config = json.load(f)
        
    with open(mapping_path, 'r') as f:
        class_mapping = json.load(f)
        
    idx_to_class = {v: k for k, v in class_mapping.items()}
    
    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    
    # Load model
    model = get_resnet18_model(num_classes=config["num_classes"], pretrained=False)
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['state_dict'])
    model = model.to(device)
    model.eval()
    
    transform = get_inference_transform(config["image_size"])
    
    # 1. Load image & 2. Convert RGB
    try:
        image = Image.open(image_path).convert("RGB")
    except Exception as e:
        return {"error": f"Failed to load image: {str(e)}"}
        
    # 3. Apply identical preprocessing
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    # 5. Run inference
    with torch.no_grad():
        output = model(input_tensor)
        # 6. Apply softmax
        probs = torch.softmax(output, dim=1).squeeze(0).cpu().numpy()
        
    # 7. Get top prediction
    top_idx = probs.argmax()
    top_class = idx_to_class[top_idx]
    
    # 8. Confidence
    confidence = float(probs[top_idx])
    
    # 9. Probabilities for all classes
    all_probs = {idx_to_class[i]: float(probs[i]) for i in range(len(probs))}
    
    result = {
        "prediction": top_class,
        "confidence": round(confidence, 4),
        "probabilities": {k: round(v, 4) for k, v in all_probs.items()}
    }
    
    print("Prediction Result:")
    print(json.dumps(result, indent=4))
    
    print("\nIMPORTANT: Do NOT treat high softmax confidence as proof of medical diagnosis.")
    print("This is an image-classification confidence score.")
    
    return result

if __name__ == "__main__":
    # Example usage
    # predict_image("path/to/sample_image.jpg")
    pass
