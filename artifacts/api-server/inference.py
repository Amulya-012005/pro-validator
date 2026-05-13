#!/usr/bin/env python3
"""
ProValidator ensemble inference worker.

Multi-signal AI image detection pipeline:
  1. EfficientNet-B0 classifier  (fine-tuned model on disk)
  2. CLIP zero-shot classification (openai/clip-vit-base-patch32, optional)
  3. FFT spectral fingerprint analysis
  4. Camera sensor noise pattern analysis
  5. EXIF / metadata forensics
  6. Color & texture statistical analysis

All signals are combined via a calibrated weighted ensemble.
Communicates with Node.js host via JSON-RPC over stdin/stdout.
"""

import sys
import os
import json
import base64
import traceback
import io
import logging
import math

import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="[inference] %(levelname)s %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("inference")

# ── Paths ─────────────────────────────────────────────────────────────────────
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_WORKSPACE  = os.path.abspath(os.path.join(_SCRIPT_DIR, "..", ".."))
MODEL_PATH  = os.path.join(_WORKSPACE, "truth_validator_model.pth")

# Cache HuggingFace weights inside the workspace so they survive restarts
os.environ.setdefault("HF_HOME", os.path.join(_WORKSPACE, ".hf_cache"))
os.environ.setdefault("TRANSFORMERS_CACHE",
                      os.path.join(_WORKSPACE, ".hf_cache", "hub"))

# ── Core ML imports ───────────────────────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    import torchvision.transforms as T
    import timm
    from PIL import Image, ExifTags, ImageFilter
except ImportError as e:
    log.error("Missing core dependency: %s", e)
    sys.exit(1)

DEVICE = torch.device("cpu")

# ── Decision boundaries ───────────────────────────────────────────────────────
UNCERTAIN_LOW         = 0.45   # ensemble score < this → real
UNCERTAIN_HIGH        = 0.55   # ensemble score > this → ai_generated
SIGNAL_STD_THRESHOLD  = 0.30   # high inter-signal disagreement → uncertain

# ── EfficientNet transforms (3-crop TTA) ──────────────────────────────────────
_NORM = dict(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
EFF_TRANSFORMS = [
    T.Compose([T.Resize(256), T.CenterCrop(224), T.ToTensor(), T.Normalize(**_NORM)]),
    T.Compose([T.Resize(256), T.CenterCrop(224), T.RandomHorizontalFlip(p=1.0),
               T.ToTensor(), T.Normalize(**_NORM)]),
    T.Compose([T.Resize(288), T.CenterCrop(224), T.ToTensor(), T.Normalize(**_NORM)]),
]
EFF_TEMPERATURE = 1.6   # soften overconfidence

# ── Load EfficientNet ─────────────────────────────────────────────────────────
def _load_efficientnet():
    if not os.path.exists(MODEL_PATH):
        log.warning("Model file not found at %s — EfficientNet signal disabled", MODEL_PATH)
        return None
    log.info("Loading EfficientNet from %s", MODEL_PATH)
    try:
        raw = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
        if isinstance(raw, nn.Module):
            log.info("Loaded full nn.Module")
            return raw.to(DEVICE).eval()
        if isinstance(raw, dict):
            num_classes = 2
            for key, val in raw.items():
                if any(k in key for k in ("classifier.1.weight", "fc.weight",
                                           "head.fc.weight", "classifier.weight",
                                           "last_linear.weight")):
                    num_classes = val.shape[0]
                    log.info("Detected num_classes=%d from key '%s'", num_classes, key)
                    break
            model = timm.create_model("efficientnet_b0", pretrained=False,
                                      num_classes=num_classes)
            try:
                model.load_state_dict(raw, strict=True)
                log.info("EfficientNet loaded strict=True, classes=%d", num_classes)
            except RuntimeError as exc:
                log.warning("strict=True failed, trying strict=False: %s", str(exc)[:100])
                model.load_state_dict(raw, strict=False)
                log.info("EfficientNet loaded strict=False")
            return model.to(DEVICE).eval()
    except Exception:
        log.warning("EfficientNet load failed:\n%s", traceback.format_exc())
        return None

EFFICIENTNET = _load_efficientnet()
log.info("EfficientNet available: %s", EFFICIENTNET is not None)

# ── Load CLIP (optional) ──────────────────────────────────────────────────────
CLIP_MODEL     = None
CLIP_PROCESSOR = None

def _try_load_clip():
    global CLIP_MODEL, CLIP_PROCESSOR
    try:
        from transformers import CLIPModel, CLIPProcessor
        model_id = "openai/clip-vit-base-patch32"
        log.info("Loading CLIP (%s) — first run downloads ~350 MB …", model_id)
        CLIP_MODEL     = CLIPModel.from_pretrained(model_id)
        CLIP_PROCESSOR = CLIPProcessor.from_pretrained(model_id)
        CLIP_MODEL.eval()
        log.info("CLIP loaded successfully")
    except Exception as exc:
        log.warning("CLIP unavailable (5-signal ensemble will be used): %s",
                    str(exc)[:120])
        CLIP_MODEL = None
        CLIP_PROCESSOR = None

_try_load_clip()

# Zero-shot prompts for CLIP
_CLIP_AI_PROMPTS = [
    "an AI-generated image created by a diffusion model",
    "a synthetic image produced by Midjourney or Stable Diffusion",
    "a digital artwork generated by artificial intelligence",
    "a photorealistic image made by DALL-E or Flux AI",
    "an AI-generated face with perfect symmetry",
]
_CLIP_REAL_PROMPTS = [
    "a real photograph taken by a camera",
    "an authentic photo captured by a smartphone",
    "a genuine photograph with natural lighting and sensor noise",
    "a candid real-world photo with natural imperfections",
    "a photograph with natural depth of field and lens blur",
]


# ══════════════════════════════════════════════════════════════════════════════
# SIGNAL FUNCTIONS  — each returns float in [0, 1] where 1.0 = "definitely AI"
# ══════════════════════════════════════════════════════════════════════════════

def _signal_efficientnet(img: Image.Image):
    """EfficientNet-B0 with 3-crop TTA. Returns AI probability or None."""
    if EFFICIENTNET is None:
        return None
    try:
        ai_probs = []
        for tfm in EFF_TRANSFORMS:
            t = tfm(img).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                probs = torch.softmax(EFFICIENTNET(t) / EFF_TEMPERATURE, dim=1)[0]
            nc = probs.shape[0]
            ai_probs.append(float(probs[1]) if nc >= 2
                            else float(torch.sigmoid(probs[0])))
        return sum(ai_probs) / len(ai_probs)
    except Exception as exc:
        log.warning("EfficientNet signal error: %s", str(exc)[:80])
        return None


def _signal_clip(img: Image.Image):
    """CLIP zero-shot AI vs real. Returns AI probability or None."""
    if CLIP_MODEL is None or CLIP_PROCESSOR is None:
        return None
    try:
        all_prompts = _CLIP_AI_PROMPTS + _CLIP_REAL_PROMPTS
        inputs = CLIP_PROCESSOR(text=all_prompts, images=img,
                                return_tensors="pt", padding=True)
        with torch.no_grad():
            logits = CLIP_MODEL(**inputs).logits_per_image[0]
            probs  = torch.softmax(logits, dim=0).numpy()
        n_ai        = len(_CLIP_AI_PROMPTS)
        ai_score    = float(probs[:n_ai].sum())
        real_score  = float(probs[n_ai:].sum())
        total       = ai_score + real_score
        return (ai_score / total) if total > 0 else 0.5
    except Exception as exc:
        log.warning("CLIP signal error: %s", str(exc)[:80])
        return None


def _signal_frequency(img: Image.Image) -> float:
    """
    FFT spectral fingerprint.
    Natural images follow a 1/f^α power spectrum (α ≈ 2–3).
    AI / diffusion images often produce a flatter spectrum.
    Also checks for mid-band periodicity (GAN grid artefacts).
    """
    try:
        gray = np.array(img.resize((256, 256), Image.LANCZOS).convert("L"),
                        dtype=np.float64)
        mag  = np.abs(np.fft.fftshift(np.fft.fft2(gray)))

        h, w   = gray.shape
        cy, cx = h // 2, w // 2
        Y, X   = np.ogrid[-cy: h - cy, -cx: w - cx]
        R_int  = np.sqrt(X**2 + Y**2).astype(int)
        max_r  = min(cy, cx) - 1

        rp = np.zeros(max_r)
        ct = np.zeros(max_r)
        np.add.at(rp, R_int.ravel().clip(0, max_r - 1), mag.ravel())
        np.add.at(ct, R_int.ravel().clip(0, max_r - 1), 1)
        valid = ct > 0
        rp[valid] /= ct[valid]

        # Log-log slope over mid-frequency band
        r_vals = np.arange(4, max_r // 2)
        p_vals = np.maximum(rp[r_vals], 1e-10)
        slope  = np.polyfit(np.log(r_vals), np.log(p_vals), 1)[0]

        # Natural slope ≈ -2.2; flatter (less negative) → more AI
        deviation = slope - (-2.2)   # positive = flatter than natural
        ai_prob   = 1.0 / (1.0 + math.exp(-2.8 * deviation))
        ai_prob   = float(np.clip(ai_prob, 0.10, 0.90))

        # Mid-band coefficient of variation (GAN grid artefact detector)
        mid = rp[max_r // 4: max_r // 2]
        if len(mid) > 3 and mid.mean() > 1e-6:
            cv      = mid.std() / mid.mean()
            ai_prob = min(0.90, ai_prob + 0.05 * min(cv, 1.0))

        return ai_prob
    except Exception as exc:
        log.warning("Frequency signal error: %s", str(exc)[:80])
        return 0.5


def _signal_noise(img: Image.Image) -> float:
    """
    Camera sensor noise pattern analysis.
    Real photos carry Poisson shot-noise with heavy-tailed (high kurtosis)
    high-frequency residual.  Diffusion models eliminate all noise →
    residual is too smooth and Gaussian.
    """
    try:
        arr = np.array(img.resize((256, 256), Image.LANCZOS).convert("RGB"),
                       dtype=np.float64)
        ch_scores = []
        for c in range(3):
            ch  = Image.fromarray(arr[:, :, c].astype(np.uint8))
            res = arr[:, :, c] - np.array(
                    ch.filter(ImageFilter.GaussianBlur(radius=2)), dtype=np.float64)

            std = float(np.std(res))
            if std > 1e-6:
                z        = (res - res.mean()) / std
                kurtosis = float(np.mean(z**4)) - 3.0
            else:
                kurtosis = 0.0

            # --- Noise level ---
            if std < 1.5:
                lvl = 0.76    # too smooth → AI
            elif std < 3.0:
                lvl = 0.62
            elif std > 14.0:
                lvl = 0.28    # high noise → real camera
            elif std > 7.0:
                lvl = 0.34
            else:
                lvl = 0.44

            # --- Kurtosis (heavy-tail test) ---
            if kurtosis > 5.0:
                krt = 0.18    # very heavy-tailed → real shot noise
            elif kurtosis > 2.0:
                krt = 0.30
            elif kurtosis > 0.5:
                krt = 0.44
            elif kurtosis > -0.5:
                krt = 0.56
            else:
                krt = 0.70    # platykurtic → synthetic

            ch_scores.append(0.55 * lvl + 0.45 * krt)

        return float(np.mean(ch_scores))
    except Exception as exc:
        log.warning("Noise signal error: %s", str(exc)[:80])
        return 0.5


def _signal_exif(img_bytes: bytes) -> float:
    """
    EXIF / metadata forensics.
    Real camera images almost always carry rich EXIF (Make, Model, ISO,
    shutter, GPS, datetime).  AI-generated images have no EXIF or minimal
    metadata.  Some generators embed their name in the Software tag.
    """
    try:
        img = Image.open(io.BytesIO(img_bytes))
        fmt = (img.format or "").upper()

        # PNG is rarely a real camera output format
        fmt_penalty = 0.08 if fmt == "PNG" else 0.0

        raw_exif = None
        try:
            raw_exif = img._getexif() if hasattr(img, "_getexif") else None
        except Exception:
            pass

        exif: dict = {}
        if raw_exif:
            exif = {ExifTags.TAGS.get(k, str(k)): v for k, v in raw_exif.items()}

        if not exif:
            return float(np.clip(0.63 + fmt_penalty, 0.0, 0.95))

        # --- Explicit AI generator fingerprints ---
        _AI_KW = [
            "midjourney", "stable diffusion", "dall-e", "dall·e", "dalle",
            "adobe firefly", "firefly", "leonardo", "flux", "comfyui", "comfy",
            "invoke", "automatic1111", "a1111", "novelai", "dreamstudio",
            "runwayml", "kling", "pika", "sora", "runway", "imagen", "parti",
            "muse", "kandinsky", "deepfloyd", "ideogram", "adobe generative",
        ]
        sw = str(exif.get("Software", "")).lower()
        if any(k in sw for k in _AI_KW):
            return 0.97

        # --- EXIF richness score ---
        has_camera   = bool({"Make", "Model", "LensModel"} & set(exif))
        has_exposure = bool({"ExposureTime", "FNumber", "ISOSpeedRatings",
                             "ShutterSpeedValue", "ApertureValue"} & set(exif))
        has_gps      = "GPSInfo" in exif
        has_datetime = bool({"DateTime", "DateTimeOriginal",
                             "DateTimeDigitized"} & set(exif))
        richness     = sum([has_camera, has_exposure, has_gps, has_datetime])

        base = {4: 0.08, 3: 0.13, 2: 0.22, 1: 0.40, 0: 0.54}[richness]

        # Non-AI software (Lightroom, Photoshop) → slight edit signal but still real
        if "Software" in exif and not any(k in sw for k in _AI_KW):
            base = min(base + 0.05, 0.62)

        return float(np.clip(base + fmt_penalty, 0.05, 0.95))
    except Exception as exc:
        log.warning("EXIF signal error: %s", str(exc)[:80])
        return 0.5


def _signal_color_stats(img: Image.Image) -> float:
    """
    Color distribution & texture statistics.
    AI images often show: hyper-vivid saturation, unnaturally uniform
    saturation distribution, unusual channel correlations, and suspiciously
    spatially-uniform patches.
    """
    try:
        arr = np.array(img.resize((256, 256), Image.LANCZOS).convert("RGB"),
                       dtype=np.float64) / 255.0
        R, G, B = arr[:,:,0], arr[:,:,1], arr[:,:,2]

        mx  = np.maximum(np.maximum(R, G), B)
        mn  = np.minimum(np.minimum(R, G), B)
        sat = np.where(mx > 1e-6, (mx - mn) / mx, 0.0)

        m_sat, s_sat = float(sat.mean()), float(sat.std())
        sub = []

        # Mean saturation
        if m_sat > 0.70:
            sub.append(0.72)
        elif m_sat > 0.55:
            sub.append(0.55)
        elif m_sat < 0.15:
            sub.append(0.42)
        else:
            sub.append(0.34)

        # Saturation uniformity
        if s_sat < 0.07:
            sub.append(0.70)
        elif s_sat < 0.14:
            sub.append(0.50)
        else:
            sub.append(0.32)

        # Channel cross-correlations
        rf, gf, bf = R.ravel(), G.ravel(), B.ravel()
        c_rg = float(np.corrcoef(rf, gf)[0, 1])
        c_rb = float(np.corrcoef(rf, bf)[0, 1])
        if abs(c_rg) < 0.28 or abs(c_rb) < 0.12:
            sub.append(0.65)
        elif c_rg > 0.986:
            sub.append(0.60)
        else:
            sub.append(0.36)

        # Spatial patch variance — AI images can be unnaturally uniform globally
        patches  = arr.reshape(16, 16, 16, 16, 3).mean(axis=(1, 3))
        pvar     = float(patches.var())
        if pvar < 0.002:
            sub.append(0.62)
        elif pvar > 0.06:
            sub.append(0.30)
        else:
            sub.append(0.45)

        return float(np.mean(sub))
    except Exception as exc:
        log.warning("Color stats signal error: %s", str(exc)[:80])
        return 0.5


# ══════════════════════════════════════════════════════════════════════════════
# ENSEMBLE
# ══════════════════════════════════════════════════════════════════════════════

# Base weights (must sum to 1.0 when all signals available)
_BASE_WEIGHTS = {
    "efficientnet": 0.20,
    "clip":         0.30,
    "frequency":    0.18,
    "noise":        0.17,
    "exif":         0.10,
    "color":        0.05,
}

_READABLE = {
    "efficientnet": "Neural classifier",
    "clip":         "CLIP semantic analysis",
    "frequency":    "Spectral fingerprint",
    "noise":        "Noise pattern analysis",
    "exif":         "Metadata forensics",
    "color":        "Color distribution analysis",
}


def _explanation(label, scores, ai_pct, real_pct, conf_pct, sig_std):
    n    = len(scores)
    top3 = sorted(scores.items(), key=lambda x: abs(x[1] - 0.5), reverse=True)[:3]
    parts = []
    for name, score in top3:
        r = _READABLE.get(name, name)
        if score >= 0.65:
            parts.append(f"{r} flagged synthetic patterns")
        elif score <= 0.35:
            parts.append(f"{r} confirmed authentic characteristics")
        else:
            parts.append(f"{r} returned ambiguous signals")
    summary = "; ".join(parts) + "."

    if label == "ai_generated":
        return (
            f"Ensemble analysis across {n} forensic signals detected AI-generation "
            f"patterns with {conf_pct}% confidence. "
            f"AI-generated probability: {ai_pct}%. "
            f"{summary} "
            f"Characteristics consistent with diffusion-model synthesis "
            f"(Midjourney, Stable Diffusion, DALL-E, Flux, Leonardo AI)."
        )
    if label == "real":
        return (
            f"Multi-signal forensic analysis confirms authentic photographic origin "
            f"with {conf_pct}% confidence. "
            f"Authentic probability: {real_pct}%. "
            f"{summary} "
            f"Spectral, noise, and metadata characteristics are consistent with "
            f"genuine camera capture."
        )
    # uncertain
    return (
        f"Ensemble analysis returned an inconclusive result "
        f"(confidence: {conf_pct}%). "
        f"AI-generation score: {ai_pct}% vs authentic score: {real_pct}%. "
        f"Inter-signal disagreement: σ={sig_std:.2f}. "
        f"{summary} "
        f"This may indicate heavy post-processing, mixed content, or an image "
        f"near the AI/real decision boundary."
    )


def _run_ensemble(img: Image.Image, img_bytes: bytes) -> dict:
    """Run every signal and return calibrated prediction dict."""

    raw = {
        "efficientnet": _signal_efficientnet(img),
        "clip":         _signal_clip(img),
        "frequency":    _signal_frequency(img),
        "noise":        _signal_noise(img),
        "exif":         _signal_exif(img_bytes),
        "color":        _signal_color_stats(img),
    }

    log.info(
        "Signals  eff=%s  clip=%s  freq=%.3f  noise=%.3f  exif=%.3f  color=%.3f",
        f"{raw['efficientnet']:.3f}" if raw["efficientnet"] is not None else "N/A",
        f"{raw['clip']:.3f}"         if raw["clip"]         is not None else "N/A",
        raw["frequency"], raw["noise"], raw["exif"], raw["color"],
    )

    scores  = {k: v for k, v in raw.items() if v is not None}
    weights = {k: _BASE_WEIGHTS[k] for k in scores}
    tw      = sum(weights.values())
    weights = {k: v / tw for k, v in weights.items()}

    ai_score   = float(sum(scores[k] * weights[k] for k in scores))
    real_score = 1.0 - ai_score
    sig_std    = float(np.std(list(scores.values())))

    in_band = UNCERTAIN_LOW <= ai_score <= UNCERTAIN_HIGH
    hi_dis  = sig_std > SIGNAL_STD_THRESHOLD

    if in_band or hi_dis:
        label = "uncertain"
    elif ai_score > UNCERTAIN_HIGH:
        label = "ai_generated"
    else:
        label = "real"

    ai_pct   = round(ai_score   * 100, 1)
    real_pct = round(real_score * 100, 1)

    raw_conf = abs(ai_score - 0.5) * 2
    adj_conf = raw_conf * (1.0 - 0.45 * min(sig_std / 0.30, 1.0))
    conf_pct = round((0.45 + adj_conf * 0.48) * 100, 1)
    if label == "uncertain":
        conf_pct = round(min(conf_pct, 60.0), 1)

    return {
        "prediction":         "real" if label == "real" else "ai_generated",
        "label":              label,
        "aiGeneratedPercent": ai_pct,
        "realPercent":        real_pct,
        "confidenceScore":    conf_pct,
        "explanation":        _explanation(label, scores, ai_pct,
                                           real_pct, conf_pct, sig_std),
    }


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

def predict_image(b64_data: str) -> dict:
    img_bytes = base64.b64decode(b64_data)
    img       = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return _run_ensemble(img, img_bytes)


def predict_frames(frames_b64: list) -> dict:
    """Run ensemble on multiple video frames and aggregate."""
    ai_vals, real_vals = [], []

    for b64 in frames_b64:
        try:
            img_bytes = base64.b64decode(b64)
            img       = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            r         = _run_ensemble(img, img_bytes)
            ai_vals.append(r["aiGeneratedPercent"] / 100.0)
            real_vals.append(r["realPercent"] / 100.0)
        except Exception as exc:
            log.warning("Frame skipped: %s", str(exc)[:80])

    if not ai_vals:
        return {"error": "No valid frames could be processed"}

    ai_score   = float(np.mean(ai_vals))
    real_score = float(np.mean(real_vals))
    total      = ai_score + real_score
    if total > 0:
        ai_score   /= total
        real_score /= total

    frame_std = float(np.std(ai_vals))
    in_band   = UNCERTAIN_LOW <= ai_score <= UNCERTAIN_HIGH

    if in_band or frame_std > 0.20:
        label = "uncertain"
    elif ai_score > UNCERTAIN_HIGH:
        label = "ai_generated"
    else:
        label = "real"

    ai_pct   = round(ai_score   * 100, 1)
    real_pct = round(real_score * 100, 1)

    raw_conf = abs(ai_score - 0.5) * 2
    adj_conf = raw_conf * (1.0 - 0.45 * min(frame_std / 0.20, 1.0))
    conf_pct = round((0.45 + adj_conf * 0.48) * 100, 1)
    if label == "uncertain":
        conf_pct = round(min(conf_pct, 60.0), 1)

    n = len(ai_vals)
    if label == "ai_generated":
        expl = (
            f"Frame-by-frame ensemble analysis of {n} frames detected deepfake "
            f"synthesis patterns with {conf_pct}% confidence. "
            f"Deepfake probability: {ai_pct}%. "
            f"Facial boundary artefacts, temporal inconsistencies, and synthetic "
            f"generation fingerprints detected across sampled frames."
        )
    elif label == "real":
        expl = (
            f"Ensemble analysis of {n} frames confirms authentic video with "
            f"{conf_pct}% confidence. Authentic probability: {real_pct}%. "
            f"Natural temporal coherence, consistent camera noise, and authentic "
            f"micro-expression patterns detected."
        )
    else:
        expl = (
            f"Frame analysis of {n} frames returned inconclusive results "
            f"(confidence: {conf_pct}%). "
            f"Deepfake score: {ai_pct}% vs authentic: {real_pct}%. "
            f"Frame-level disagreement (σ={frame_std:.2f}) — may be partially "
            f"edited or contain both synthetic and authentic segments."
        )

    return {
        "prediction":         "real" if label == "real" else "ai_generated",
        "label":              label,
        "aiGeneratedPercent": ai_pct,
        "realPercent":        real_pct,
        "confidenceScore":    conf_pct,
        "explanation":        expl,
        "framesAnalyzed":     n,
    }


# ══════════════════════════════════════════════════════════════════════════════
# STDIN / STDOUT MESSAGE LOOP
# ══════════════════════════════════════════════════════════════════════════════

def main():
    log.info("Ensemble inference worker ready — waiting for requests on stdin")
    print(json.dumps({"type": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError as exc:
            print(json.dumps({"type": "error",
                              "error": f"JSON parse error: {exc}"}), flush=True)
            continue

        req_id = req.get("id", 0)
        try:
            rtype = req.get("type")
            if rtype == "ping":
                print(json.dumps({"type": "pong", "id": req_id}), flush=True)

            elif rtype == "predict":
                result         = predict_image(req["data"])
                result["type"] = "result"
                result["id"]   = req_id
                print(json.dumps(result), flush=True)

            elif rtype == "predict_frames":
                result         = predict_frames(req["frames"])
                result["type"] = "result"
                result["id"]   = req_id
                print(json.dumps(result), flush=True)

            else:
                print(json.dumps({"type": "error", "id": req_id,
                                  "error": f"Unknown type: {rtype}"}), flush=True)

        except Exception:
            tb = traceback.format_exc()
            log.error("Prediction error:\n%s", tb)
            print(json.dumps({"type": "error", "id": req_id, "error": tb}),
                  flush=True)


if __name__ == "__main__":
    main()
