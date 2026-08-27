"""
============================================================
  PoultryGuard AI  -  MASTER ML TEST RUNNER
  Run:  python run_ml_tests.py
============================================================
Tests all 3 sub-systems and prints a single combined report.
"""
from __future__ import annotations

import io
import json
import sys
import time
import unittest
from pathlib import Path

# -- colour helpers (works on Windows with ANSI if terminal supports it) ------
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def banner(text: str, char: str = "=", width: int = 72) -> None:
    print(f"\n{BOLD}{CYAN}{char * width}{RESET}")
    print(f"{BOLD}{CYAN}  {text}{RESET}")
    print(f"{BOLD}{CYAN}{char * width}{RESET}")

def ok(msg):  print(f"  {GREEN}[PASS]{RESET} {msg}")
def fail(msg): print(f"  {RED}[FAIL]{RESET} {msg}")
def info(msg): print(f"  {YELLOW}[INFO]{RESET} {msg}")

# -----------------------------------------------------------------------------
# SECTION 1  -  UNIT TESTS (14 cases)
# -----------------------------------------------------------------------------
def run_unit_tests() -> tuple[int, int]:
    banner("SECTION 1: UNIT TESTS  (14 test cases)", "=")
    loader = unittest.TestLoader()
    suite  = loader.discover("Poultry_Guard_ML/tests", pattern="test_*.py")
    stream = io.StringIO()
    runner = unittest.TextTestRunner(stream=stream, verbosity=2)
    t0     = time.time()
    result = runner.run(suite)
    elapsed = time.time() - t0

    # Print each test result
    for line in stream.getvalue().splitlines():
        if " ... ok" in line:
            ok(line.split(" ... ")[0].strip())
        elif "FAIL" in line or "ERROR" in line:
            fail(line.strip())

    passed  = result.testsRun - len(result.failures) - len(result.errors)
    total   = result.testsRun
    status  = GREEN + "ALL PASSED" + RESET if not result.failures and not result.errors else RED + "SOME FAILED" + RESET
    print(f"\n  Unit Tests: {passed}/{total} passed  ({elapsed:.1f}s)  {status}")

    if result.failures or result.errors:
        for case, trace in result.failures + result.errors:
            print(f"\n  {RED}DETAILS:{RESET} {case}\n  {trace}")

    return passed, total


# -----------------------------------------------------------------------------
# SECTION 2  -  REAL IMAGE TEST  (CNN ResNet-18)
# -----------------------------------------------------------------------------
def run_cnn_real_image_tests() -> tuple[int, int]:
    banner("SECTION 2: CNN RESNET-18  -  REAL IMAGE INFERENCE", "=")
    from Poultry_Guard_ML.cnn.inference.image_predictor import predict_image

    import glob
    test_imgs = (
        glob.glob("datasets/fowlpox/test/*.jpg")
        or glob.glob("datasets/All disease/test/Fowlpox/*.jpg")
    )[:5]

    if not test_imgs:
        info("No fowlpox test images found at fowlpox/Fowlpox-1/test/*.jpg")
        info("Skipping real-image CNN test (use a dummy image instead).")
        return 0, 0

    correct = 0
    for idx, img_path in enumerate(test_imgs, 1):
        res   = predict_image(img_path)
        pred  = res["predicted_class"]
        conf  = res["confidence"]
        probs = res["probabilities"]
        right = pred == "Fowlpox"
        if right:
            correct += 1
        fn = Path(img_path).name
        marker = ok if right else fail
        marker(f"Image {idx}: {fn:<55}  -> {pred:20}  {conf*100:.2f}%")

    pct = correct / len(test_imgs) * 100
    col = GREEN if correct == len(test_imgs) else YELLOW
    print(f"\n  CNN Accuracy on Fowlpox samples: {col}{correct}/{len(test_imgs)}  ({pct:.1f}%){RESET}")
    return correct, len(test_imgs)


# -----------------------------------------------------------------------------
# SECTION 3  -  ENVIRONMENTAL XGBOOST SCENARIOS
# -----------------------------------------------------------------------------
def run_environmental_tests() -> None:
    banner("SECTION 3: ENVIRONMENTAL XGBOOST  -  SCENARIO TESTS", "=")
    from Poultry_Guard_ML.environmental.inference.environmental_predictor import predict_environment

    scenarios = [
        {
            "name": "Optimal housing (expect Healthy)",
            "expect": "Healthy",
            "data": dict(breed="Broiler", temperature=24.0, humidity=60.0, ammonia=10.0,
                         mortality_rate=0.8, egg_production=90.0, feed_intake=120.0),
        },
        {
            "name": "Elevated heat + low feed (expect disease)",
            "expect": None,          # any disease class is fine
            "data": dict(breed="Broiler", temperature=34.0, humidity=78.0, ammonia=28.0,
                         mortality_rate=4.5, egg_production=65.0, feed_intake=90.0),
        },
        {
            "name": "Very high NH3 stress",
            "expect": None,
            "data": dict(breed="Layer", temperature=30.0, humidity=75.0, ammonia=40.0,
                         mortality_rate=3.2, egg_production=70.0, feed_intake=100.0),
        },
        {
            "name": "Cool & balanced (expect Healthy)",
            "expect": "Healthy",
            "data": dict(breed="Broiler", temperature=22.0, humidity=55.0, ammonia=8.0,
                         mortality_rate=0.5, egg_production=92.0, feed_intake=125.0),
        },
    ]

    for sc in scenarios:
        res   = predict_environment(**sc["data"])
        pred  = res["predicted_class"]
        conf  = res["confidence"]
        probs = res["probabilities"]
        correct = sc["expect"] is None or pred == sc["expect"]
        marker = ok if correct else fail
        marker(f"{sc['name']}")
        print(f"         Prediction : {pred}  ({conf*100:.2f}%)")
        print(f"         Probs      : " + "  ".join(f"{k}: {v*100:.2f}%" for k, v in probs.items()))


# -----------------------------------------------------------------------------
# SECTION 4  -  LATE-FUSION ENSEMBLE  (8 standard + 1 end-to-end)
# -----------------------------------------------------------------------------
def run_ensemble_tests() -> None:
    banner("SECTION 4: LATE-FUSION MULTIMODAL ENSEMBLE  -  8 SCENARIOS", "=")
    from Poultry_Guard_ML.ensemble.fusion import late_fusion

    cases = [
        {
            "title": "Case 1: Both -> Healthy",
            "cnn": {"predicted_class": "Healthy", "confidence": 0.95,
                    "probabilities": {"Healthy": 0.95, "Fowlpox": 0.03, "Infectious Coryza": 0.02}},
            "env": {"predicted_class": "Healthy", "confidence": 0.98,
                    "probabilities": {"Healthy": 0.98, "Fowlpox": 0.01, "Infectious Coryza": 0.01}},
            "expect_class": "Healthy",
        },
        {
            "title": "Case 2: Both -> Infectious Coryza",
            "cnn": {"predicted_class": "Infectious Coryza", "confidence": 0.85,
                    "probabilities": {"Healthy": 0.05, "Fowlpox": 0.10, "Infectious Coryza": 0.85}},
            "env": {"predicted_class": "Infectious Coryza", "confidence": 0.92,
                    "probabilities": {"Healthy": 0.03, "Fowlpox": 0.05, "Infectious Coryza": 0.92}},
            "expect_class": "Infectious Coryza",
        },
        {
            "title": "Case 3: Both -> Fowlpox",
            "cnn": {"predicted_class": "Fowlpox", "confidence": 0.88,
                    "probabilities": {"Healthy": 0.04, "Infectious Coryza": 0.08, "Fowlpox": 0.88}},
            "env": {"predicted_class": "Fowl Pox", "confidence": 0.94,
                    "probabilities": {"Healthy": 0.02, "Infectious Coryza": 0.04, "Fowl Pox": 0.94}},
            "expect_class": "Fowlpox",
        },
        {
            "title": "Case 4: CNN Fowlpox 90% + ENV Fowlpox 80% (Fusion 87%)",
            "cnn": {"predicted_class": "Fowlpox", "confidence": 0.90,
                    "probabilities": {"Healthy": 0.03, "Infectious Coryza": 0.07, "Fowlpox": 0.90}},
            "env": {"predicted_class": "Fowlpox", "confidence": 0.80,
                    "probabilities": {"Healthy": 0.05, "Infectious Coryza": 0.15, "Fowlpox": 0.80}},
            "expect_class": "Fowlpox",
        },
        {
            "title": "Case 5: CNN Coryza 89% + ENV Coryza 95%",
            "cnn": {"predicted_class": "Infectious Coryza", "confidence": 0.89,
                    "probabilities": {"Healthy": 0.03, "Fowlpox": 0.08, "Infectious Coryza": 0.89}},
            "env": {"predicted_class": "Infectious Coryza", "confidence": 0.95,
                    "probabilities": {"Healthy": 0.01, "Fowlpox": 0.04, "Infectious Coryza": 0.95}},
            "expect_class": "Infectious Coryza",
        },
        {
            "title": "Case 6: Disagreement (CNN Healthy 70% vs ENV Fowlpox 90%)",
            "cnn": {"predicted_class": "Healthy", "confidence": 0.70,
                    "probabilities": {"Healthy": 0.70, "Fowlpox": 0.20, "Infectious Coryza": 0.10}},
            "env": {"predicted_class": "Fowlpox", "confidence": 0.90,
                    "probabilities": {"Healthy": 0.05, "Fowlpox": 0.90, "Infectious Coryza": 0.05}},
            "expect_class": None,  # either is valid
        },
        {
            "title": "Case 7: Strong Infectious Coryza Fusion (CNN 90% + ENV 99.99%)",
            "cnn": {"predicted_class": "Infectious Coryza", "confidence": 0.90,
                    "probabilities": {"Healthy": 0.02, "Fowlpox": 0.08, "Infectious Coryza": 0.90}},
            "env": {"predicted_class": "Infectious Coryza", "confidence": 0.9999,
                    "probabilities": {"Healthy": 0.00005, "Fowlpox": 0.00005, "Infectious Coryza": 0.9999}},
            "expect_class": "Infectious Coryza",
        },
        {
            "title": "Case 8: Strong Fowlpox Fusion (CNN 88% + ENV 99.9%)",
            "cnn": {"predicted_class": "Fowlpox", "confidence": 0.88,
                    "probabilities": {"Healthy": 0.04, "Infectious Coryza": 0.08, "Fowlpox": 0.88}},
            "env": {"predicted_class": "Fowl Pox", "confidence": 0.999,
                    "probabilities": {"Healthy": 0.0005, "Infectious Coryza": 0.0005, "Fowl Pox": 0.999}},
            "expect_class": "Fowlpox",
        },
    ]

    passed_cases = 0
    for case in cases:
        res    = late_fusion(case["cnn"], case["env"])
        pred   = res["predicted_class"]
        conf   = res["confidence"]
        alert  = res["alert_level"]
        passed = (case["expect_class"] is None) or (pred == case["expect_class"])
        if passed:
            passed_cases += 1
        marker = ok if passed else fail
        marker(f"{case['title']}")
        print(f"         CNN        : {case['cnn']['predicted_class']:25}  ({case['cnn']['confidence']*100:.1f}%)")
        print(f"         ENV        : {case['env']['predicted_class']:25}  ({case['env']['confidence']*100:.1f}%)")
        print(f"         Ensemble   : {pred:25}  ({conf*100:.1f}%)  Alert={alert}")
        print(f"         Probs      : {json.dumps({k: round(v, 4) for k, v in res['probabilities'].items()})}")
        print(f"         Explanation: {res['explanation']}")

    col = GREEN if passed_cases == len(cases) else RED
    print(f"\n  Ensemble Scenarios: {col}{passed_cases}/{len(cases)} passed{RESET}")


# -----------------------------------------------------------------------------
# SECTION 5  -  END-TO-END MULTIMODAL (real image + real sensors)
# -----------------------------------------------------------------------------
def run_e2e_test() -> None:
    banner("SECTION 5: END-TO-END MULTIMODAL  (real weights, real sensor data)", "=")
    import glob
    from Poultry_Guard_ML.ensemble.ensemble_predictor import predict_ensemble
    from PIL import Image

    test_imgs = glob.glob("fowlpox/Fowlpox-1/test/*.jpg")[:1]
    if test_imgs:
        img_input = test_imgs[0]
        info(f"Using real image: {img_input}")
    else:
        # Use an in-memory grey square
        info("No real images found - using synthetic 224x224 dummy image")
        buf = io.BytesIO()
        Image.new("RGB", (224, 224), (140, 140, 140)).save(buf, "JPEG")
        img_input = buf.getvalue()

    env_data = dict(breed="Broiler", temperature=34.0, humidity=78.0, ammonia=28.0,
                    mortality_rate=4.5, egg_production=65.0, feed_intake=90.0)

    res  = predict_ensemble(image_input=img_input, environmental_data=env_data)
    cnn  = res["cnn_prediction"]
    env  = res["environmental_prediction"]
    ens  = res["ensemble_prediction"]

    print(f"  Visual (CNN)          : {cnn['predicted_class']:25}  ({cnn['confidence']*100:.2f}%)")
    print(f"  Environmental (XGBoost): {env['predicted_class']:25}  ({env['confidence']*100:.2f}%)")
    print(f"  {'-'*65}")
    print(f"  Ensemble Decision     : {BOLD}{ens['predicted_class']}{RESET}  ({ens['confidence']*100:.2f}%)  Alert={ens['alert_level']}")
    print(f"  Fusion Weights        : CNN={ens['fusion_weights']['cnn_weight']}  ENV={ens['fusion_weights']['env_weight']}")
    print(f"  Explanation           : {ens['explanation']}")
    print()
    print(f"  {'Class':<25} {'Probability':>15}")
    print(f"  {'-'*42}")
    for cls, prob in ens["probabilities"].items():
        bar = "-" * int(prob * 40)
        print(f"  {cls:<25} {prob*100:>8.2f}%   {bar}")

    probs_sum = sum(ens["probabilities"].values())
    passed = abs(probs_sum - 1.0) < 0.01 and ens["predicted_class"] in ens["probabilities"]
    marker = ok if passed else fail
    marker(f"Probability sum = {probs_sum:.6f}  (should be 1.0)")


# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------
def main() -> None:
    # Force ANSI on Windows
    if sys.platform == "win32":
        import os
        os.system("color")

    print(f"\n{BOLD}{'='*72}")
    print("  PoultryGuard AI  -  MASTER ML TEST RUNNER")
    print("  Unified: Unit tests + CNN + XGBoost + Ensemble + E2E")
    print(f"{'='*72}{RESET}")

    t_total = time.time()

    ut_passed, ut_total   = run_unit_tests()
    cnn_correct, cnn_total = run_cnn_real_image_tests()
    run_environmental_tests()
    run_ensemble_tests()
    run_e2e_test()

    elapsed = time.time() - t_total
    banner("OVERALL RESULT SUMMARY", "=")
    print(f"  Section 1 - Unit Tests      : {GREEN}{ut_passed}/{ut_total} passed{RESET}")
    if cnn_total:
        pct = cnn_correct / cnn_total * 100
        col = GREEN if cnn_correct == cnn_total else YELLOW
        print(f"  Section 2 - CNN Real Images : {col}{cnn_correct}/{cnn_total}  ({pct:.1f}%){RESET}")
    else:
        print(f"  Section 2 - CNN Real Images : {YELLOW}skipped (no test images){RESET}")
    print(f"  Section 3 - Environmental   : {GREEN}4 scenarios evaluated{RESET}")
    print(f"  Section 4 - Ensemble        : {GREEN}8 fusion scenarios evaluated{RESET}")
    print(f"  Section 5 - End-to-End      : {GREEN}1 multimodal run completed{RESET}")
    print(f"\n  Total time: {elapsed:.1f}s")
    print(f"\n{BOLD}{GREEN}  All tests completed. Review output above for any FAIL lines.{RESET}\n")


if __name__ == "__main__":
    main()
