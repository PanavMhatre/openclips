#!/usr/bin/env python3
"""
Speaker-locked face tracker for podcast clips.

Primary detector: YuNet (OpenCV DNN) — neural network, handles angles,
partial occlusion, varied lighting far better than Haar cascades.
Falls back to Haar cascade ensemble if YuNet model can't be loaded.

Output JSON: {"detected": bool, "width": int, "height": int, "samples": [...]}
Each sample: {"t": float, "x": float, "y": float, "w": float, "h": float}
x/y = face CENTER in source pixel coordinates.
"""

import json
import math
import os
import sys
import urllib.request

import cv2
import numpy as np


# ── Constants ─────────────────────────────────────────────────────────────────

YUNET_MODEL_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)
YUNET_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_detection_yunet_2023mar.onnx")

# Minimum face size to consider (scaled pixels at detection resolution)
MIN_FACE_PX = 28
# Detection resolution width — balance speed vs accuracy
DETECT_W = 640


# ── Utilities ─────────────────────────────────────────────────────────────────

def clamp(value, low, high):
    return max(low, min(high, value))


def ensure_yunet_model():
    """Download YuNet model if not already cached."""
    if os.path.exists(YUNET_MODEL_PATH):
        return True
    try:
        os.makedirs(os.path.dirname(YUNET_MODEL_PATH), exist_ok=True)
        urllib.request.urlretrieve(YUNET_MODEL_URL, YUNET_MODEL_PATH)
        return os.path.exists(YUNET_MODEL_PATH)
    except Exception:
        return False


def build_yunet(input_w, input_h):
    """Build YuNet detector for given input size."""
    if not ensure_yunet_model():
        return None
    try:
        detector = cv2.FaceDetectorYN.create(
            YUNET_MODEL_PATH,
            "",
            (input_w, input_h),
            score_threshold=0.55,
            nms_threshold=0.3,
            top_k=20,
        )
        return detector
    except Exception:
        return None


def build_haar_detectors():
    """Fallback Haar cascade ensemble."""
    frontal = [
        cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml"),
        cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"),
    ]
    profile = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
    return frontal, profile


# ── Face detection ─────────────────────────────────────────────────────────────

def detect_yunet(frame_bgr, detector, scale):
    """
    Run YuNet on frame_bgr. Returns list of dicts with keys:
      x, y, w, h  — bounding box in ORIGINAL source pixels
      cx, cy      — center in source pixels
      conf        — detection confidence 0-1
      lm          — 5 landmarks [[x,y],...] in source pixels
                    order: right_eye, left_eye, nose, mouth_right, mouth_left
    """
    h, w = frame_bgr.shape[:2]
    detector.setInputSize((w, h))
    _, faces = detector.detect(frame_bgr)
    results = []
    if faces is None:
        return results
    for face in faces:
        x, y, fw, fh = face[0], face[1], face[2], face[3]
        conf = float(face[14])
        # Landmarks: 5 points × 2 coords starting at index 4
        lm = []
        for i in range(5):
            lx = float(face[4 + i * 2]) / scale
            ly = float(face[4 + i * 2 + 1]) / scale
            lm.append([lx, ly])
        results.append({
            "x": float(x) / scale,
            "y": float(y) / scale,
            "w": float(fw) / scale,
            "h": float(fh) / scale,
            "cx": (float(x) + float(fw) / 2) / scale,
            "cy": (float(y) + float(fh) / 2) / scale,
            "conf": conf,
            "lm": lm,  # [right_eye, left_eye, nose, mouth_right, mouth_left]
        })
    return results


def detect_haar(gray_small, frontal_list, profile, scale):
    """Fallback Haar detection. Returns same dict format as detect_yunet."""
    raw = []
    for det in frontal_list:
        raw.extend(det.detectMultiScale(gray_small, scaleFactor=1.05, minNeighbors=3, minSize=(MIN_FACE_PX, MIN_FACE_PX)))
    raw.extend(profile.detectMultiScale(gray_small, scaleFactor=1.05, minNeighbors=3, minSize=(MIN_FACE_PX, MIN_FACE_PX)))
    flipped = cv2.flip(gray_small, 1)
    for (x, y, w, h) in profile.detectMultiScale(flipped, scaleFactor=1.05, minNeighbors=3, minSize=(MIN_FACE_PX, MIN_FACE_PX)):
        raw.append((gray_small.shape[1] - x - w, y, w, h))

    # Deduplicate
    merged = []
    for (x, y, w, h) in raw:
        dup = False
        for (mx, my, mw, mh) in merged:
            ix = max(0, min(x + w, mx + mw) - max(x, mx))
            iy = max(0, min(y + h, my + mh) - max(y, my))
            if ix * iy > 0.3 * min(w * h, mw * mh):
                dup = True
                break
        if not dup:
            merged.append((x, y, w, h))

    results = []
    for (x, y, w, h) in merged:
        cx = (x + w / 2) / scale
        cy = (y + h / 2) / scale
        # Estimate mouth position from bounding box
        mx = cx
        my = (y + h * 0.78) / scale
        results.append({
            "x": x / scale, "y": y / scale,
            "w": w / scale, "h": h / scale,
            "cx": cx, "cy": cy,
            "conf": 0.7,
            "lm": [
                [cx - w * 0.18 / scale, cy - h * 0.12 / scale],  # right_eye
                [cx + w * 0.18 / scale, cy - h * 0.12 / scale],  # left_eye
                [cx, cy + h * 0.08 / scale],                      # nose
                [mx - w * 0.12 / scale, my],                      # mouth_right
                [mx + w * 0.12 / scale, my],                      # mouth_left
            ],
        })
    return results


# ── Speech scoring ─────────────────────────────────────────────────────────────

def mouth_motion_score(face, prev_face):
    """
    Compare mouth shape/position relative to the face, not absolute screen motion.
    This avoids treating a static photo or a panning B-roll face as the speaker.
    """
    if prev_face is None:
        return 0.0
    lm = face.get("lm", [])
    plm = prev_face.get("lm", [])
    if len(lm) < 5 or len(plm) < 5:
        return 0.0
    fh = max(1.0, face["h"])
    pfh = max(1.0, prev_face["h"])

    nose = lm[2]
    pnose = plm[2]
    mr, ml = lm[3], lm[4]
    pmr, pml = plm[3], plm[4]

    mouth_width = math.hypot(mr[0] - ml[0], mr[1] - ml[1]) / fh
    prev_mouth_width = math.hypot(pmr[0] - pml[0], pmr[1] - pml[1]) / pfh

    mouth_cx = ((mr[0] + ml[0]) / 2 - nose[0]) / fh
    mouth_cy = ((mr[1] + ml[1]) / 2 - nose[1]) / fh
    prev_mouth_cx = ((pmr[0] + pml[0]) / 2 - pnose[0]) / pfh
    prev_mouth_cy = ((pmr[1] + pml[1]) / 2 - pnose[1]) / pfh

    shape_change = abs(mouth_width - prev_mouth_width) * 34.0
    relative_shift = (abs(mouth_cx - prev_mouth_cx) * 12.0) + (abs(mouth_cy - prev_mouth_cy) * 22.0)
    return min(1.0, shape_change + relative_shift)


def face_size_score(face, source_w, source_h):
    """Larger faces (closer to camera) are more likely the main speaker."""
    area = face["w"] * face["h"]
    frame_area = max(1, source_w * source_h)
    return min(1.0, area / frame_area * 40.0)


def skin_score(frame_bgr, face, scale):
    """YCrCb skin detection in the face ROI."""
    x = int(face["x"] * scale)
    y = int(face["y"] * scale)
    w = int(face["w"] * scale)
    h = int(face["h"] * scale)
    h_img, w_img = frame_bgr.shape[:2]
    x, y = max(0, x), max(0, y)
    w = min(w, w_img - x)
    h = min(h, h_img - y)
    if w <= 0 or h <= 0:
        return 0.0
    roi = frame_bgr[y:y + h, x:x + w]
    if roi.size == 0:
        return 0.0
    ycrcb = cv2.cvtColor(roi, cv2.COLOR_BGR2YCrCb)
    mask = cv2.inRange(ycrcb, np.array([0, 128, 70]), np.array([255, 180, 135]))
    return float(mask.mean() / 255)


def appearance_hist(frame_bgr, face, scale):
    """HSV histogram of the face+torso region for identity tracking."""
    x = int((face["x"] - face["w"] * 0.5) * scale)
    y = int((face["y"] - face["h"] * 0.3) * scale)
    w = int(face["w"] * 2.0 * scale)
    h = int(face["h"] * 2.2 * scale)
    h_img, w_img = frame_bgr.shape[:2]
    x, y = max(0, x), max(0, y)
    w = min(w, w_img - x)
    h = min(h, h_img - y)
    if w <= 0 or h <= 0:
        return None
    roi = frame_bgr[y:y + h, x:x + w]
    if roi.size == 0:
        return None
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [18, 10], [0, 180, 0, 256])
    cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
    return hist


def hist_sim(a, b):
    if a is None or b is None:
        return 0.0
    v = cv2.compareHist(a, b, cv2.HISTCMP_CORREL)
    return max(0.0, min(1.0, float(v))) if math.isfinite(v) else 0.0


# ── Identity clustering ────────────────────────────────────────────────────────

def face_iou(a, b):
    """Intersection-over-union of two face bounding boxes."""
    ax1, ay1 = a["x"], a["y"]
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx1, by1 = b["x"], b["y"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    ix = max(0, min(ax2, bx2) - max(ax1, bx1))
    iy = max(0, min(ay2, by2) - max(ay1, by1))
    inter = ix * iy
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / max(1, union)


def assign_identity(face, identities):
    """
    Match face to an existing identity by IoU + histogram similarity.
    Creates a new identity if no match found.
    Returns the matched/created identity dict.
    """
    best_id = None
    best_score = 0.0

    for ident in identities:
        # Spatial proximity (normalised by face size)
        dx = abs(face["cx"] - ident["cx"]) / max(1, (face["w"] + ident["w"]) / 2)
        dy = abs(face["cy"] - ident["cy"]) / max(1, (face["h"] + ident["h"]) / 2)
        spatial = 1.0 - min(1.0, math.hypot(dx, dy) / 1.2)

        # Appearance similarity
        app = hist_sim(face.get("hist"), ident.get("hist"))

        # Combined — weight appearance more when it's high
        if app > 0.75:
            score = spatial * 0.35 + app * 0.65
        else:
            score = spatial * 0.7 + app * 0.3

        if score > best_score and score > 0.38:
            best_score = score
            best_id = ident

    if best_id is None:
        best_id = {
            "id": len(identities),
            "cx": face["cx"], "cy": face["cy"],
            "x": face["x"], "y": face["y"],
            "w": face["w"], "h": face["h"],
            "hist": face.get("hist"),
            "speech_total": 0.0,
            "skin_total": 0.0,
            "size_total": 0.0,
            "count": 0,
            "conf_total": 0.0,
        }
        identities.append(best_id)

    # Update running average (EMA)
    alpha = 0.25
    best_id["cx"] = best_id["cx"] * (1 - alpha) + face["cx"] * alpha
    best_id["cy"] = best_id["cy"] * (1 - alpha) + face["cy"] * alpha
    best_id["w"] = best_id["w"] * (1 - alpha) + face["w"] * alpha
    best_id["h"] = best_id["h"] * (1 - alpha) + face["h"] * alpha
    if face.get("hist") is not None:
        if best_id.get("hist") is None:
            best_id["hist"] = face["hist"]
        else:
            best_id["hist"] = best_id["hist"] * 0.85 + face["hist"] * 0.15
            cv2.normalize(best_id["hist"], best_id["hist"], 0, 1, cv2.NORM_MINMAX)

    best_id["size_total"] += face.get("size_score", 0.0)
    best_id["conf_total"] += face.get("conf", 0.7)
    best_id["count"] += 1
    face["identity_id"] = best_id["id"]
    return best_id


# ── Speaker selection ──────────────────────────────────────────────────────────

def dominant_speaker(identities, records, source_w, source_h):
    """
    Pick the dominant speaker identity using:
    - Total speech score (mouth motion)
    - Face size (closer = more likely main speaker)
    - Detection confidence
    - Vertical position (faces in upper 2/3 of frame preferred)
    """
    if not identities:
        return None

    best = None
    best_score = -1.0
    for ident in identities:
        if ident["count"] == 0:
            continue
        speech = ident["speech_total"] / ident["count"]
        size = ident["size_total"] / ident["count"]
        conf = ident["conf_total"] / ident["count"]
        skin = ident.get("skin_total", 0.0) / ident["count"]
        coverage = ident["count"] / max(1, len(records))
        # Penalise faces in the bottom quarter (likely not the main speaker)
        y_penalty = 1.0 if ident["cy"] < source_h * 0.75 else 0.6
        score = (speech * 4.5 + size * 0.75 + conf * 0.35 + coverage * 0.35 + skin * 0.18) * y_penalty
        if score > best_score:
            best_score = score
            best = ident
    return best


# ── Crop path generation ───────────────────────────────────────────────────────

def build_crop_path(records, dominant_id, source_w, source_h, duration):
    """
    Build a dense list of crop keyframes locked to the dominant speaker.
    Uses smooth interpolation — emits a point every ~0.3s so ffmpeg
    can do smooth step transitions rather than hard jumps.
    """
    if not records:
        return []

    # Collect per-frame positions for the dominant speaker
    raw = []
    for rec in records:
        face = next((f for f in rec["faces"] if f.get("identity_id") == dominant_id), None)
        if face:
            raw.append({"t": rec["t"], "cx": face["cx"], "cy": face["cy"],
                        "w": face["w"], "h": face["h"],
                        "speech": face.get("speech_score", 0.0)})

    if not raw:
        return []

    # Fill gaps: if we miss a frame, carry forward the last known position
    filled = [raw[0]]
    for i in range(1, len(raw)):
        prev = filled[-1]
        curr = raw[i]
        gap = curr["t"] - prev["t"]
        # If gap > 1.5s it's likely a camera cut — accept new position directly
        if gap > 1.5:
            filled.append(curr)
        else:
            # Interpolate intermediate points at ~0.3s intervals
            steps = max(1, int(gap / 0.3))
            for s in range(1, steps + 1):
                alpha = s / steps
                filled.append({
                    "t": round(prev["t"] + gap * alpha, 3),
                    "cx": prev["cx"] * (1 - alpha) + curr["cx"] * alpha,
                    "cy": prev["cy"] * (1 - alpha) + curr["cy"] * alpha,
                    "w": prev["w"] * (1 - alpha) + curr["w"] * alpha,
                    "h": prev["h"] * (1 - alpha) + curr["h"] * alpha,
                    "speech": prev.get("speech", 0.0) * (1 - alpha) + curr.get("speech", 0.0) * alpha,
                })

    # Smooth with a small window to remove jitter
    smoothed = smooth_path(filled)

    # Convert to output format: x/y = face center in source pixels
    return [
        {
            "t": round(clamp(p["t"], 0, duration), 3),
            "x": round(clamp(p["cx"], 0, source_w), 1),
            "y": round(clamp(p["cy"], 0, source_h), 1),
            "w": round(p["w"], 1),
            "h": round(p["h"], 1),
            "speech": round(p.get("speech", 0.0), 4),
        }
        for p in smoothed
    ]


def smooth_path(points, window=3):
    """Simple moving average over cx/cy to reduce jitter."""
    if len(points) <= window:
        return points
    result = []
    for i, p in enumerate(points):
        lo = max(0, i - window // 2)
        hi = min(len(points), i + window // 2 + 1)
        chunk = points[lo:hi]
        result.append({
            "t": p["t"],
            "cx": sum(c["cx"] for c in chunk) / len(chunk),
            "cy": sum(c["cy"] for c in chunk) / len(chunk),
            "w": sum(c["w"] for c in chunk) / len(chunk),
            "h": sum(c["h"] for c in chunk) / len(chunk),
            "speech": sum(c.get("speech", 0.0) for c in chunk) / len(chunk),
        })
    return result


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"detected": False, "samples": []}))
        return 0

    video_path = sys.argv[1]
    start = float(sys.argv[2])
    duration = max(0.1, float(sys.argv[3]))
    max_samples = int(sys.argv[4]) if len(sys.argv) > 4 else 56

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(json.dumps({"detected": False, "samples": []}))
        return 0

    source_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920)
    source_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080)

    # Build detector
    detect_scale = DETECT_W / max(1, source_width)
    detect_h = int(source_height * detect_scale)
    yunet = build_yunet(DETECT_W, detect_h)
    use_yunet = yunet is not None
    if not use_yunet:
        haar_frontal, haar_profile = build_haar_detectors()

    step = max(0.4, duration / max_samples)
    count = min(max_samples, max(1, int(math.ceil(duration / step)) + 1))

    records = []
    identities = []
    prev_faces_by_id = {}  # identity_id -> last face (for mouth motion)

    for index in range(count):
        rel_t = min(duration, index * step)
        cap.set(cv2.CAP_PROP_POS_MSEC, (start + rel_t) * 1000)
        ok, frame = cap.read()
        if not ok or frame is None:
            continue

        # Resize for detection
        small = cv2.resize(frame, (DETECT_W, detect_h))

        if use_yunet:
            raw_faces = detect_yunet(small, yunet, detect_scale)
        else:
            gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
            raw_faces = detect_haar(gray, haar_frontal, haar_profile, detect_scale)

        # Score and filter each face
        frame_faces = []
        for face in raw_faces:
            # Skip tiny faces
            if face["w"] < MIN_FACE_PX / detect_scale or face["h"] < MIN_FACE_PX / detect_scale:
                continue
            # Skip faces near the very bottom (likely not the speaker)
            if face["cy"] > source_height * 0.90:
                continue

            # Compute scores
            face["hist"] = appearance_hist(small, face, detect_scale)
            face["skin_score"] = skin_score(small, face, detect_scale)
            face["size_score"] = face_size_score(face, source_width, source_height)

            # Assign identity first so we can look up previous frame
            ident = assign_identity(face, identities)
            prev = prev_faces_by_id.get(ident["id"])
            face["speech_score"] = mouth_motion_score(face, prev)
            # Update identity scores after speech is measured. Skin is metadata,
            # not speech, so static photos do not win the speaker crop.
            ident["speech_total"] += face["speech_score"]
            ident["skin_total"] += face["skin_score"]
            prev_faces_by_id[ident["id"]] = face

            frame_faces.append(face)

        records.append({"t": round(rel_t, 3), "faces": frame_faces})

    cap.release()

    if not identities:
        print(json.dumps({"detected": False, "width": source_width, "height": source_height, "samples": []}))
        return 0

    # Pick dominant speaker
    speaker = dominant_speaker(identities, records, source_width, source_height)
    if speaker is None:
        print(json.dumps({"detected": False, "width": source_width, "height": source_height, "samples": []}))
        return 0

    samples = build_crop_path(records, speaker["id"], source_width, source_height, duration)

    if not samples:
        # Fallback: use the speaker's average position
        samples = [{
            "t": 0.0,
            "x": round(speaker["cx"], 1),
            "y": round(speaker["cy"], 1),
            "w": round(speaker["w"], 1),
            "h": round(speaker["h"], 1),
            "speech": round(speaker["speech_total"] / max(1, speaker["count"]), 4),
        }]

    speech_confidence = speaker["speech_total"] / max(1, speaker["count"])
    coverage = speaker["count"] / max(1, len(records))
    reliable_speaker = speech_confidence >= 0.014 and coverage >= 0.36

    print(json.dumps({
        "detected": True,
        "width": source_width,
        "height": source_height,
        "speakerId": speaker["id"],
        "speechConfidence": round(speech_confidence, 4),
        "coverage": round(coverage, 4),
        "reliableSpeaker": reliable_speaker,
        "samples": samples,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
