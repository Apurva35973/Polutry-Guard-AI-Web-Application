import unittest
from io import BytesIO
from unittest.mock import patch

from ml.inference.ensemble_predictor import late_fusion
from ml.inference.environmental_predictor import EnvironmentalInputError, predict_environmental_risk
from ml.inference import image_predictor


SAMPLE = {"Temperature": 33.5, "Humidity": 78, "Mortality_Rate": 0.024, "Egg_Production": 850, "Amount_of_Feeding": 4300}


class EnvironmentalPredictorTests(unittest.TestCase):
    def test_returns_all_risk_probabilities(self):
        result = predict_environmental_risk(SAMPLE)
        self.assertEqual(set(result["risk_probabilities"]), {"Low", "Medium", "High"})
        self.assertAlmostEqual(sum(result["risk_probabilities"].values()), 1.0, places=6)
        self.assertAlmostEqual(result["risk_score"], 1 - result["risk_probabilities"]["Low"], places=6)

    def test_rejects_missing_feature(self):
        with self.assertRaises(EnvironmentalInputError):
            predict_environmental_risk({"Temperature": 25})


class EnsembleTests(unittest.TestCase):
    def test_does_not_map_high_risk_to_a_disease(self):
        image = {"predicted_disease": "Healthy", "confidence": 0.95, "probabilities": {"Healthy": 0.95}}
        risk = {"risk_level": "High", "environmental_status": "CRITICAL", "risk_probabilities": {"Low": 0.01, "Medium": 0.04, "High": 0.95}}
        result = late_fusion(image, risk)
        self.assertFalse(result["disease_detected"])
        self.assertEqual(result["type"], "ENVIRONMENTAL_BIOSECURITY")


class ImagePredictorTests(unittest.TestCase):
    def test_missing_checkpoint_is_reported(self):
        with patch.object(image_predictor, "CHECKPOINT_PATHS", ()):
            with self.assertRaises(image_predictor.ImageModelUnavailable):
                image_predictor.image_model_path()

    def test_invalid_image_is_rejected_before_inference(self):
        try:
            import PIL  # noqa: F401
        except ImportError:
            self.skipTest("Pillow is unavailable")
        with self.assertRaises(ValueError):
            image_predictor.predict_image(BytesIO(b"not an image"))


if __name__ == "__main__":
    unittest.main()
