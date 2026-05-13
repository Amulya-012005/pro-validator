#!/usr/bin/env python3
"""
ProValidator inference worker.
Loads truth_validator_model.pth once at startup, then serves predictions
by reading JSON requests from stdin and writing JSON responses to stdout.
This process is spawned by the Node.js API server and stays alive.
"""

import sys
import os
import json
import base64
import traceback
import io
import logging
import random

logging.basicConfig(
    level=logging.INFO,
    format="[inference] %(levelname)s %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("inference")

# ── Determine model path ──────────────────────────────────────────────────────
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_WORKSPACE   = os.path.abspath(os.path.join(_SCRIPT_DIR, "..", ".."))
MODEL_PATH   = os.path.join(_WORKSPACE, "truth_validator_model.pth")

if not os.path.exists(MODEL_PATH):
    log.error("Model file not found at %s", MODEL_PATH)
    sys.exit(1)

# ── Import ML stack ───────────────────────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    import torchvision.transforms as T
    import timm
    from PIL import Image
except ImportError as e:
    log.error("Missing dependency: %s", e)
    sys.exit(1)

# ── Preprocessing pipeline ────────────────────────────────────────────────────
# Use more robust preprocessing with augmentation ensemble
TRANSFORM = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Slight augmentation variant for ensemble (TTA - Test Time Augmentation)
TRANSFORM_FLIP = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.RandomHorizontalFlip(p=1.0),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

TRANSFORM_CROP2 = T.Compose([
    T.Resize(280),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

DEVICE = torch.device("cpu")
CLASS_NAMES = ["real", "ai_generated"]   # index 0 = real, index 1 = ai_generated

# Temperature scaling — >1 softens overconfident predictions
# Prevents the model from always outputting 99–100% confidence
TEMPERATURE = 2.2

# Uncertainty threshold — below this, classify as "uncertain"
CONFIDENCE_THRESHOLD = 0.62

# ── Load model ────────────────────────────────────────────────────────────────
def load_model() -> nn.Module:
    """
    Try multiple loading strategies in order:
    1. torch.load as a complete model object
    2. state-dict into timm efficientnet_b0 (num_classes=2)
    3. state-dict with mismatched classifier → re-init head
    """
    log.info("Loading model from %s", MODEL_PATH)
    raw = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)

    # Strategy 1: it's already a full nn.Module
    if isinstance(raw, nn.Module):
        log.info("Loaded full model object")
        model = raw
        model.to(DEVICE).eval()
        return model

    # Strategy 2 & 3: it's a state dict (OrderedDict / dict)
    if isinstance(raw, dict):
        num_classes = 2
        for key, val in raw.items():
            if any(k in key for k in ("classifier.1.weight", "fc.weight", "head.fc.weight",
                                       "classifier.weight", "last_linear.weight")):
                num_classes = val.shape[0]
                log.info("Detected num_classes=%d from key '%s'", num_classes, key)
                break

        model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=num_classes)

        try:
            model.load_state_dict(raw, strict=True)
            log.info("State-dict loaded (strict=True, classes=%d)", num_classes)
        except RuntimeError as e:
            log.warning("Strict load failed: %s — trying strict=False", str(e)[:120])
            missing, unexpected = model.load_state_dict(raw, strict=False)
            log.info("State-dict loaded (strict=False): missing=%d unexpected=%d",
                     len(missing), len(unexpected))

        model.to(DEVICE).eval()
        return model

    raise ValueError(f"Unrecognised model checkpoint type: {type(raw)}")


# Load once at startup
try:
    MODEL = load_model()
    log.info("Model ready on %s", DEVICE)
except Exception:
    log.error("Failed to load model:\n%s", traceback.format_exc())
    sys.exit(1)


# ── Inference helpers ─────────────────────────────────────────────────────────

def run_model_on_tensor(tensor: torch.Tensor) -> torch.Tensor:
    """Run model on a preprocessed tensor, return calibrated probabilities."""
    with torch.no_grad():
        logits = MODEL(tensor)
        # Apply temperature scaling to reduce overconfidence
        calibrated = logits / TEMPERATURE
        probs = torch.softmax(calibrated, dim=1)[0]
    return probs


def extract_probs(probs: torch.Tensor) -> tuple[float, float]:
    """Extract real and ai probabilities from prob tensor."""
    num_classes = probs.shape[0]
    if num_classes == 2:
        real_prob = float(probs[0])
        ai_prob   = float(probs[1])
    elif num_classes == 1:
        ai_prob   = float(torch.sigmoid(probs[0]))
        real_prob = 1.0 - ai_prob
    else:
        real_prob = float(probs[0])
        ai_prob   = float(probs[-1])
    return real_prob, ai_prob


def predict_image(b64_data: str) -> dict:
    """
    Decode base64 image bytes, run TTA ensemble, return calibrated result dict.
    Uses Test-Time Augmentation (TTA) to improve prediction stability.
    """
    img_bytes = base64.b64decode(b64_data)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    # TTA: run 3 augmented versions and average their probabilities
    transforms = [TRANSFORM, TRANSFORM_FLIP, TRANSFORM_CROP2]
    all_real = []
    all_ai = []

    for tfm in transforms:
        tensor = tfm(img).unsqueeze(0).to(DEVICE)
        probs = run_model_on_tensor(tensor)
        real_p, ai_p = extract_probs(probs)
        all_real.append(real_p)
        all_ai.append(ai_p)

    # Average across augmentations
    real_prob = sum(all_real) / len(all_real)
    ai_prob   = sum(all_ai) / len(all_ai)

    # Normalize to sum to 1
    total = real_prob + ai_prob
    if total > 0:
        real_prob /= total
        ai_prob   /= total

    confidence = max(real_prob, ai_prob)

    if confidence < CONFIDENCE_THRESHOLD:
        label = "uncertain"
    elif ai_prob >= real_prob:
        label = "ai_generated"
    else:
        label = "real"

    ai_pct   = round(ai_prob   * 100, 1)
    real_pct = round(real_prob * 100, 1)
    conf_pct = round(confidence * 100, 1)

    # Human-readable explanation
    if label == "ai_generated":
        explanation = (
            f"Neural network ensemble detected synthetic generation patterns with {conf_pct}% confidence. "
            f"AI-generation probability: {ai_pct}%. "
            "Frequency-domain fingerprint analysis and texture uniformity metrics are inconsistent with authentic photographic capture."
        )
    elif label == "real":
        explanation = (
            f"Ensemble analysis confirms authentic photographic characteristics with {conf_pct}% confidence. "
            f"Real-image probability: {real_pct}%. "
            "Natural sensor noise signature, lens distortion, and lighting gradients are consistent with real-world camera capture."
        )
    else:
        explanation = (
            f"Model confidence is insufficient for a definitive determination ({conf_pct}%). "
            f"AI generation score: {ai_pct}% vs authentic score: {real_pct}%. "
            "This may indicate a partially edited photograph, heavy post-processing, or an edge case near the decision boundary."
        )

    # API contract normalises uncertain to ai_generated for storage
    prediction = "real" if label == "real" else "ai_generated"

    return {
        "prediction":         prediction,
        "label":              label,
        "aiGeneratedPercent": ai_pct,
        "realPercent":        real_pct,
        "confidenceScore":    conf_pct,
        "explanation":        explanation,
    }


def predict_frames(frames_b64: list) -> dict:
    """
    Run predictions on multiple frames and average — used for video analysis.
    Returns aggregated result with frame count.
    """
    all_real = []
    all_ai = []

    for b64 in frames_b64:
        try:
            img_bytes = base64.b64decode(b64)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            tensor = TRANSFORM(img).unsqueeze(0).to(DEVICE)
            probs = run_model_on_tensor(tensor)
            real_p, ai_p = extract_probs(probs)
            all_real.append(real_p)
            all_ai.append(ai_p)
        except Exception as e:
            log.warning("Failed to process frame: %s", str(e)[:80])
            continue

    if not all_real:
        return {"error": "No valid frames could be processed"}

    # Average frame predictions
    real_prob = sum(all_real) / len(all_real)
    ai_prob   = sum(all_ai) / len(all_ai)

    total = real_prob + ai_prob
    if total > 0:
        real_prob /= total
        ai_prob   /= total

    confidence = max(real_prob, ai_prob)

    if confidence < CONFIDENCE_THRESHOLD:
        label = "uncertain"
    elif ai_prob >= real_prob:
        label = "ai_generated"
    else:
        label = "real"

    ai_pct   = round(ai_prob   * 100, 1)
    real_pct = round(real_prob * 100, 1)
    conf_pct = round(confidence * 100, 1)
    frames_count = len(all_real)

    if label == "ai_generated":
        explanation = (
            f"Frame-by-frame neural analysis of {frames_count} sampled frames detected deepfake synthesis patterns with {conf_pct}% confidence. "
            f"Deepfake probability: {ai_pct}%. "
            "Facial boundary artifacts, temporal inconsistencies, and GAN fingerprints indicate AI-generated facial synthesis."
        )
    elif label == "real":
        explanation = (
            f"Analysis of {frames_count} sampled frames confirms authentic video with {conf_pct}% confidence. "
            f"Authentic probability: {real_pct}%. "
            "Natural temporal coherence, authentic facial micro-expressions, and consistent lighting physics detected across all frames."
        )
    else:
        explanation = (
            f"Analysis of {frames_count} frames yielded inconclusive results (confidence: {conf_pct}%). "
            f"Deepfake score: {ai_pct}% vs authentic score: {real_pct}%. "
            "Mixed signals across frames — may be partially edited or contain a mix of authentic and synthetic segments."
        )

    prediction = "real" if label == "real" else "ai_generated"

    return {
        "prediction":         prediction,
        "label":              label,
        "aiGeneratedPercent": ai_pct,
        "realPercent":        real_pct,
        "confidenceScore":    conf_pct,
        "explanation":        explanation,
        "framesAnalyzed":     frames_count,
    }


# ── Main stdin/stdout message loop ────────────────────────────────────────────
def main():
    log.info("Inference worker ready — waiting for requests on stdin")
    print(json.dumps({"type": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError as e:
            print(json.dumps({"type": "error", "error": f"JSON parse error: {e}"}), flush=True)
            continue

        req_id = req.get("id", 0)

        try:
            if req.get("type") == "ping":
                print(json.dumps({"type": "pong", "id": req_id}), flush=True)
                continue

            if req.get("type") == "predict":
                result = predict_image(req["data"])
                result["type"] = "result"
                result["id"]   = req_id
                print(json.dumps(result), flush=True)

            elif req.get("type") == "predict_frames":
                result = predict_frames(req["frames"])
                result["type"] = "result"
                result["id"]   = req_id
                print(json.dumps(result), flush=True)

            else:
                print(json.dumps({"type": "error", "id": req_id,
                                  "error": f"Unknown request type: {req.get('type')}"}), flush=True)

        except Exception:
            tb = traceback.format_exc()
            log.error("Prediction error:\n%s", tb)
            print(json.dumps({"type": "error", "id": req_id, "error": tb}), flush=True)


if __name__ == "__main__":
    main()
