from __future__ import annotations

import io
import json
import unittest
from PIL import Image

from Poultry_Guard_ML.cnn.config import CANONICAL_CNN_CLASSES
from Poultry_Guard_ML.cnn.inference.image_predictor import (
    load_image_model,
    predict_image,
)
from Poultry_Guard_ML.common.utils import get_device
from Poultry_Guard_ML.ensemble.config import CNN_WEIGHT, ENSEMBLE_CLASSES, ENV_WEIGHT
from Poultry_Guard_ML.ensemble.ensemble_predictor import predict_ensemble
from Poultry_Guard_ML.ensemble.fusion import late_fusion
from Poultry_Guard_ML.environmental.config import ENVIRONMENTAL_CLASSES, SUPPORTED_BREEDS
from Poultry_Guard_ML.environmental.inference.environmental_predictor import (
    load_environmental_model,
    predict_environment,
    predict_environmental_risk,
)
from Poultry_Guard_ML.environmental.preprocessing.preprocessor import EnvironmentalInputError


def create_dummy_image() -> bytes:
    """Create an in-memory RGB JPEG image for testing."""
    img = Image.new("RGB", (224, 224), color=(150, 150, 150))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestPoultryGuardMLPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dummy_img = create_dummy_image()
        cls.sample_env = {
            "breed": "White Leghorn",
            "temperature": 21.0,
            "humidity": 60.0,
            "ammonia": 8.0,
            "mortality_rate": 0.5,
            "egg_production": 90.0,
            "amount_of_feeding": 110.0,
        }

    # 1. CNN Model Loading & Probabilities (3 classes)
    def test_cnn_loading_and_probabilities(self):
        model, idx_to_class, device = load_image_model()
        self.assertIsNotNone(model)
        self.assertEqual(len(idx_to_class), 3)
        self.assertIn(device.type, ["cpu", "cuda", "mps"])

        res = predict_image(self.dummy_img)
        self.assertEqual(res["model"], "ResNet18")
        self.assertIn(res["predicted_class"], CANONICAL_CNN_CLASSES)
        probs = res["probabilities"]
        self.assertEqual(len(probs), 3)
        self.assertAlmostEqual(sum(probs.values()), 1.0, places=2)

    # 2. Environmental Model Loading & Probabilities (3 classes)
    def test_environmental_loading_and_probabilities(self):
        model = load_environmental_model()
        self.assertIsNotNone(model)

        res = predict_environment(**self.sample_env)
        self.assertEqual(res["model"], "XGBoost")
        self.assertIn(res["predicted_class"], ENVIRONMENTAL_CLASSES)
        probs = res["probabilities"]
        self.assertEqual(len(probs), 3)
        for cls_name in ["Healthy", "Fowlpox", "Infectious Coryza"]:
            self.assertIn(cls_name, probs)
        self.assertAlmostEqual(sum(probs.values()), 1.0, places=2)

    # 3. Environmental Inference with Keyword Args vs Dict Input
    def test_environmental_api_signature_variants(self):
        res_kwargs = predict_environmental_risk(
            breed="White Leghorn",
            temperature=30.5,
            humidity=75.0,
            ammonia=35.0,
            mortality_rate=20.0,
            egg_production=65.0,
            amount_of_feeding=90.0,
        )
        self.assertEqual(res_kwargs["predicted_class"], "Fowlpox")
        self.assertAlmostEqual(sum(res_kwargs["probabilities"].values()), 1.0, places=2)

        res_dict = predict_environmental_risk({
            "breed": "White Leghorn",
            "temperature": 30.5,
            "humidity": 75.0,
            "ammonia": 35.0,
            "mortality_rate": 20.0,
            "egg_production": 65.0,
            "amount_of_feeding": 90.0,
        })
        self.assertEqual(res_dict["predicted_class"], "Fowlpox")
        self.assertEqual(res_kwargs["predicted_class"], res_dict["predicted_class"])

    # 4. Broiler Ross 308 Zero Egg Production Check
    def test_broiler_zero_egg_production_healthy_handling(self):
        # Broiler Ross 308 normally has 0% egg production and should still be classified as Healthy
        res = predict_environmental_risk(
            breed="Broiler Ross 308",
            temperature=20.0,
            humidity=55.0,
            ammonia=5.0,
            mortality_rate=0.4,
            egg_production=0.0,
            amount_of_feeding=160.0,
        )
        self.assertEqual(res["predicted_class"], "Healthy")
        self.assertGreater(res["probabilities"]["Healthy"], 0.90)

    # 5. Invalid Input Handling
    def test_invalid_image_handling(self):
        with self.assertRaises(ValueError):
            predict_image(b"not_an_image_bytes")

    def test_invalid_environmental_input(self):
        with self.assertRaises(EnvironmentalInputError):
            predict_environment(temperature="invalid_not_a_number")

    # 6. Ensemble Late Fusion Tests
    def test_ensemble_both_healthy(self):
        cnn = {"predicted_class": "Healthy", "confidence": 0.95, "probabilities": {"Healthy": 0.95, "Fowlpox": 0.03, "Infectious Coryza": 0.02}}
        env = {"predicted_class": "Healthy", "confidence": 0.99, "probabilities": {"Healthy": 0.99, "Fowlpox": 0.005, "Infectious Coryza": 0.005}}
        res = late_fusion(cnn, env, cnn_weight=0.7, env_weight=0.3)

        self.assertEqual(res["predicted_class"], "Healthy")
        self.assertGreater(res["probabilities"]["Healthy"], 0.90)
        self.assertEqual(res["alert_level"], "LOW")
        self.assertAlmostEqual(sum(res["probabilities"].values()), 1.0, places=2)

    def test_ensemble_both_fowlpox(self):
        cnn = {"predicted_class": "Fowlpox", "confidence": 0.90, "probabilities": {"Healthy": 0.03, "Fowlpox": 0.90, "Infectious Coryza": 0.07}}
        env = {"predicted_class": "Fowlpox", "confidence": 0.80, "probabilities": {"Healthy": 0.05, "Fowlpox": 0.80, "Infectious Coryza": 0.15}}
        res = late_fusion(cnn, env, cnn_weight=0.7, env_weight=0.3)

        self.assertEqual(res["predicted_class"], "Fowlpox")
        # 0.7 * 0.90 + 0.3 * 0.80 = 0.87
        self.assertAlmostEqual(res["probabilities"]["Fowlpox"], 0.87, places=2)
        self.assertEqual(res["alert_level"], "HIGH")
        self.assertAlmostEqual(sum(res["probabilities"].values()), 1.0, places=2)

    def test_ensemble_both_coryza(self):
        cnn = {"predicted_class": "Infectious Coryza", "confidence": 0.88, "probabilities": {"Healthy": 0.04, "Fowlpox": 0.08, "Infectious Coryza": 0.88}}
        env = {"predicted_class": "Infectious Coryza", "confidence": 0.95, "probabilities": {"Healthy": 0.01, "Fowlpox": 0.04, "Infectious Coryza": 0.95}}
        res = late_fusion(cnn, env, cnn_weight=0.7, env_weight=0.3)

        self.assertEqual(res["predicted_class"], "Infectious Coryza")
        self.assertGreater(res["probabilities"]["Infectious Coryza"], 0.88)
        self.assertEqual(res["alert_level"], "HIGH")
        self.assertAlmostEqual(sum(res["probabilities"].values()), 1.0, places=2)

    # 7. Real End-to-End Multimodal Execution
    def test_real_end_to_end_prediction(self):
        res = predict_ensemble(
            image_input=self.dummy_img,
            environmental_data=self.sample_env,
        )
        self.assertIn("cnn_prediction", res)
        self.assertIn("environmental_prediction", res)
        self.assertIn("ensemble_prediction", res)
        self.assertIn("decision", res)
        self.assertIn("explanation", res)

        ens_probs = res["ensemble_prediction"]["probabilities"]
        self.assertEqual(len(ens_probs), 3)
        self.assertAlmostEqual(sum(ens_probs.values()), 1.0, places=2)


if __name__ == "__main__":
    unittest.main()
