from __future__ import annotations

from typing import Any, Dict, Optional, Tuple
import numpy as np

from Poultry_Guard_ML.common.utils import round_floats
from Poultry_Guard_ML.ensemble.config import (
    CLASS_CANONICAL_MAP,
    CNN_WEIGHT,
    ENSEMBLE_CLASSES,
    ENV_WEIGHT,
)


def canonicalize_class_name(name: str) -> str:
    """Normalize any class label (e.g. 'Fowl Pox', 'coryza') to canonical name."""
    clean = str(name).strip().lower()
    return CLASS_CANONICAL_MAP.get(clean, str(name).strip())


def align_probabilities(probs: Dict[str, Any]) -> Dict[str, float]:
    """Align raw model probability keys to canonical 3 classes."""
    aligned: Dict[str, float] = {cls_name: 0.0 for cls_name in ENSEMBLE_CLASSES}
    if not isinstance(probs, dict):
        return aligned

    for k, v in probs.items():
        canonical_k = canonicalize_class_name(k)
        try:
            val = float(v)
        except (ValueError, TypeError):
            val = 0.0
        if canonical_k in aligned:
            aligned[canonical_k] += val
        else:
            aligned[canonical_k] = val

    # Ensure probabilities are normalized
    total = sum(aligned[cls] for cls in ENSEMBLE_CLASSES)
    if total > 0:
        for cls in ENSEMBLE_CLASSES:
            aligned[cls] = aligned[cls] / total
    else:
        for cls in ENSEMBLE_CLASSES:
            aligned[cls] = 1.0 / len(ENSEMBLE_CLASSES)

    return aligned


def generate_explanation(
    cnn_class: str,
    cnn_conf: float,
    env_class: str,
    env_conf: float,
    ensemble_class: str,
    ensemble_conf: float,
) -> str:
    """Generate human-readable diagnostic explanation of multimodal fusion."""
    cnn_canon = canonicalize_class_name(cnn_class)
    env_canon = canonicalize_class_name(env_class)

    if cnn_canon == env_canon:
        if cnn_canon == "Healthy":
            return "Visual image analysis and environmental farm factors both confirm healthy flock status."
        return f"Visual diagnostic symptoms and environmental housing conditions both strongly indicate {cnn_canon}."

    if ensemble_class == cnn_canon:
        return (
            f"Image model indicates {cnn_canon} ({cnn_conf*100:.1f}%) while environmental factors suggest {env_canon} ({env_conf*100:.1f}%). "
            f"Visual diagnostic evidence serves as the primary determinant ({ensemble_class})."
        )

    return (
        f"Environmental housing factors strongly indicate {env_canon} ({env_conf*100:.1f}%), "
        f"influencing the multimodal assessment to {ensemble_class}."
    )


def late_fusion(
    cnn_result: Dict[str, Any],
    environmental_result: Dict[str, Any],
    cnn_weight: float = CNN_WEIGHT,
    env_weight: float = ENV_WEIGHT,
) -> Dict[str, Any]:
    """
    Perform probability-level late fusion between CNN and Environmental models.

    Mathematical Formula:
        P_final(class) = (w_cnn * P_cnn(class) + w_env * P_env(class)) / (w_cnn + w_env)
        Final predicted disease = argmax(P_final)

    Parameters:
        cnn_result: Result dict from predict_image() containing 'probabilities'
        environmental_result: Result dict from predict_environmental_risk() containing 'probabilities'
        cnn_weight: Weight for visual CNN (default 0.7)
        env_weight: Weight for environmental factor model (default 0.3)

    Returns:
        Structured multimodal ensemble prediction output.
    """
    # Normalize weights so sum = 1.0
    total_w = float(cnn_weight + env_weight)
    if total_w <= 0:
        total_w = 1.0
    w_cnn = float(cnn_weight) / total_w
    w_env = float(env_weight) / total_w

    cnn_probs = align_probabilities(cnn_result.get("probabilities", {}))
    env_probs = align_probabilities(environmental_result.get("probabilities", {}))

    # Calculate fused probabilities
    fused_probs: Dict[str, float] = {}
    for cls_name in ENSEMBLE_CLASSES:
        p_c = cnn_probs.get(cls_name, 0.0)
        p_e = env_probs.get(cls_name, 0.0)
        fused_probs[cls_name] = (w_cnn * p_c) + (w_env * p_e)

    # Normalize fused probabilities to strictly sum to 1.0
    total_fused = sum(fused_probs.values())
    if total_fused > 0:
        fused_probs = {k: v / total_fused for k, v in fused_probs.items()}

    ensemble_class = max(fused_probs, key=fused_probs.get)
    ensemble_conf = float(fused_probs[ensemble_class])

    cnn_top_class = canonicalize_class_name(cnn_result.get("predicted_class", "Healthy"))
    cnn_top_conf = float(cnn_result.get("confidence", cnn_probs.get(cnn_top_class, 0.0)))

    env_top_class = canonicalize_class_name(environmental_result.get("predicted_class", "Healthy"))
    env_top_conf = float(environmental_result.get("confidence", env_probs.get(env_top_class, 0.0)))

    explanation = generate_explanation(
        cnn_class=cnn_top_class,
        cnn_conf=cnn_top_conf,
        env_class=env_top_class,
        env_conf=env_top_conf,
        ensemble_class=ensemble_class,
        ensemble_conf=ensemble_conf,
    )

    alert_level = "LOW" if ensemble_class == "Healthy" else ("HIGH" if ensemble_conf >= 0.70 else "MEDIUM")

    result = {
        "predicted_class": ensemble_class,
        "confidence": ensemble_conf,
        "probabilities": {
            "Fowlpox": fused_probs.get("Fowlpox", 0.0),
            "Infectious Coryza": fused_probs.get("Infectious Coryza", 0.0),
            "Healthy": fused_probs.get("Healthy", 0.0),
        },
        "cnn_probabilities": {
            "Fowlpox": cnn_probs.get("Fowlpox", 0.0),
            "Infectious Coryza": cnn_probs.get("Infectious Coryza", 0.0),
            "Healthy": cnn_probs.get("Healthy", 0.0),
        },
        "environmental_probabilities": {
            "Fowlpox": env_probs.get("Fowlpox", 0.0),
            "Infectious Coryza": env_probs.get("Infectious Coryza", 0.0),
            "Healthy": env_probs.get("Healthy", 0.0),
        },
        "weights": {
            "cnn": w_cnn,
            "environmental": w_env,
        },
        "fusion_weights": {
            "cnn_weight": w_cnn,
            "env_weight": w_env,
            "cnn": w_cnn,
            "environmental": w_env,
        },
        "alert_level": alert_level,
        "decision": ensemble_class,
        "type": ensemble_class,
        "disease_detected": bool(ensemble_class != "Healthy"),
        "reason": explanation,
        "message": explanation,
        "explanation": explanation,
        "evidence_summary": {
            "image_prediction": cnn_top_class,
            "image_confidence": cnn_top_conf,
            "environmental_prediction": env_top_class,
            "environmental_confidence": env_top_conf,
        },
    }

    return round_floats(result, precision=6)
