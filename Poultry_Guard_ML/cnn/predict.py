"""
CLI Predict tool for Poultry Guard CNN.
Example: python -m Poultry_Guard_ML.cnn.predict --image path/to/image.jpg
"""

import argparse
import json
from pathlib import Path
from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image


def main():
    parser = argparse.ArgumentParser(description="Predict poultry disease from image.")
    parser.add_argument("--image", type=str, required=True, help="Path to input image")
    args = parser.parse_args()

    result = predict_image(args.image)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
