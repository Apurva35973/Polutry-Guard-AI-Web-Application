from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, BinaryIO

IMAGE_LABELS = ("Coccidiosis", "Healthy", "Newcastle Disease", "Salmonella")
IMAGE_SIZE = (224, 224)
NORMALIZE_MEAN = (0.485, 0.456, 0.406)
NORMALIZE_STD = (0.229, 0.224, 0.225)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
CHECKPOINT_PATHS = (
    PROJECT_ROOT / "ml" / "models" / "image" / "best.pt",
    PROJECT_ROOT / "resnet18" / "best.pt",
)


class ImageModelUnavailable(FileNotFoundError):
    pass


def image_model_path() -> Path:
    for candidate in CHECKPOINT_PATHS:
        if candidate.exists():
            return candidate
    raise ImageModelUnavailable(
        "ResNet18 checkpoint not found. The training notebook references resnet18/best.pt; "
        "place the existing checkpoint at ml/models/image/best.pt (preferred) or resnet18/best.pt."
    )


@lru_cache(maxsize=1)
def load_image_model() -> Any:
    try:
        import torch
        from torchvision.models import resnet18
    except ImportError as exc:
        raise RuntimeError("PyTorch and torchvision are required for image inference.") from exc
    checkpoint = torch.load(image_model_path(), map_location="cpu", weights_only=False)
    state_dict = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
    if not isinstance(state_dict, dict):
        raise ValueError("Unsupported ResNet18 checkpoint format; expected a state_dict or checkpoint dict.")
    model = resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, len(IMAGE_LABELS))
    model.load_state_dict(state_dict)
    model.eval()
    return model


def predict_image(image_input: str | Path | BinaryIO) -> dict[str, Any]:
    try:
        from PIL import Image, UnidentifiedImageError
    except ImportError as exc:
        raise RuntimeError("Pillow is required for image validation.") from exc
    try:
        with Image.open(image_input) as image:
            image = image.convert("RGB")
            # Validate input before loading the model; this gives clients a useful 400 response.
            image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("Invalid image input. Upload a readable image file.") from exc
    # Check the supplied artifact before reporting optional runtime dependency issues.
    image_model_path()
    try:
        import torch
        from torchvision import transforms
    except (ImportError, RuntimeError) as exc:
        raise RuntimeError("PyTorch and torchvision are required for image inference.") from exc
    try:
        with Image.open(image_input) as image:
            image = image.convert("RGB")
            transform = transforms.Compose([
                transforms.Resize(IMAGE_SIZE), transforms.ToTensor(),
                transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
            ])
            tensor = transform(image).unsqueeze(0)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("Invalid image input. Upload a readable image file.") from exc
    model = load_image_model()
    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1)[0].cpu().tolist()
    probability_map = {label: float(value) for label, value in zip(IMAGE_LABELS, probabilities)}
    label = max(probability_map, key=probability_map.get)
    return {"model": "ResNet18", "predicted_disease": label, "confidence": probability_map[label], "probabilities": probability_map}
