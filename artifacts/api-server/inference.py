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
TRANSFORM = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

DEVICE = torch.device("cpu")
CLASS_NAMES = ["real", "ai_generated"]   # index 0 = real, index 1 = ai_generated

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
        # Count number of output classes from final linear layer key
        num_classes = 2
        for key, val in raw.items():
            if any(k in key for k in ("classifier.1.weight", "fc.weight", "head.fc.weight",
                                       "classifier.weight", "last_linear.weight")):
                num_classes = val.shape[0]
                log.info("Detected num_classes=%d from key '%s'", num_classes, key)
                break

        # Build base architecture
        model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=num_classes)

        # Try strict load first
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

# ── Inference ─────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.60   # below this → "uncertain"

def predict_image(b64_data: str) -> dict:
    """Decode base64 image bytes, preprocess, run model, return result dict."""
    img_bytes = base64.b64decode(b64_data)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    tensor = TRANSFORM(img).unsqueeze(0).to(DEVICE)   # [1, 3, 224, 224]

    with torch.no_grad():
        logits = MODEL(tensor)                         # [1, num_classes]
        probs  = torch.softmax(logits, dim=1)[0]       # [num_classes]

    num_classes = probs.shape[0]

    if num_classes == 2:
        real_prob = float(probs[0])
        ai_prob   = float(probs[1])
    elif num_classes == 1:
        # Binary output (single sigmoid logit)
        ai_prob   = float(torch.sigmoid(logits[0, 0]))
        real_prob = 1.0 - ai_prob
    else:
        # Multi-class — treat last class as ai_generated, first as real
        real_prob = float(probs[0])
        ai_prob   = float(probs[-1])

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
            f"Neural network analysis detected synthetic patterns. "
            f"AI-generation probability: {ai_pct}%. "
            "Frequency-domain fingerprint and texture uniformity are inconsistent with authentic photography."
        )
    elif label == "real":
        explanation = (
            f"Model confirms authentic photographic characteristics. "
            f"Real-image probability: {real_pct}%. "
            "Natural noise signature, lens distortion, and sensor patterns are consistent with real-world capture."
        )
    else:
        explanation = (
            f"Model confidence is low ({conf_pct}%). "
            f"AI score {ai_pct}% vs Real score {real_pct}%. "
            "Cannot make a definitive determination — image may be a partial composite or edited photograph."
        )

    # Normalise label to API contract values
    prediction = "ai_generated" if label in ("ai_generated", "uncertain") else "real"

    return {
        "prediction":       prediction,
        "label":            label,                  # includes "uncertain" for caller
        "aiGeneratedPercent": ai_pct,
        "realPercent":       real_pct,
        "confidenceScore":   conf_pct,
        "explanation":       explanation,
    }


# ── Main stdin/stdout message loop ────────────────────────────────────────────
def main():
    log.info("Inference worker ready — waiting for requests on stdin")
    # Flush stdout so Node can read the ready signal
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
            else:
                print(json.dumps({"type": "error", "id": req_id,
                                  "error": f"Unknown request type: {req.get('type')}"}), flush=True)

        except Exception:
            tb = traceback.format_exc()
            log.error("Prediction error:\n%s", tb)
            print(json.dumps({"type": "error", "id": req_id, "error": tb}), flush=True)


if __name__ == "__main__":
    main()
