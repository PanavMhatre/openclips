#!/usr/bin/env python3
"""
Ball tracker for sports clips.
Detects the ball (basketball, soccer ball, etc.) using a combination of:
  1. Motion-based detection (background subtraction + contour circularity)
  2. Color-based detection (orange/brown for basketball, white/black for soccer)
  3. Temporal smoothing to avoid jitter

Outputs JSON: {"detected": bool, "width": int, "height": int, "samples": [...]}
Each sample: {"t": float, "x": float, "y": float, "w": float, "h": float}
x/y are the ball CENTER in source pixel coordinates.
"""

import json
import math
import sys

import cv2
import numpy as np


def clamp(value, low, high):
    return max(low, min(high, value))


def circularity(contour):
    area = cv2.contourArea(contour)
    if area < 1:
        return 0.0
    perimeter = cv2.arcLength(contour, True)
    if perimeter < 1:
        return 0.0
    return 4 * math.pi * area / (perimeter * perimeter)


def detect_ball_motion(frame, bg_subtractor, min_radius=8, max_radius=120):
    """Detect ball via background subtraction + circularity filter."""
    fg_mask = bg_subtractor.apply(frame)
    # Remove shadows (value 127) and noise
    _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 60:
            continue
        circ = circularity(contour)
        if circ < 0.45:
            continue
        (cx, cy), radius = cv2.minEnclosingCircle(contour)
        if radius < min_radius or radius > max_radius:
            continue
        candidates.append({
            "x": float(cx),
            "y": float(cy),
            "r": float(radius),
            "score": circ * min(1.0, area / (math.pi * radius * radius + 1)),
        })
    return candidates


def detect_ball_color(frame, sport="basketball"):
    """Detect ball via HSV color range."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    masks = []

    if sport in ("basketball", "Basketball"):
        # Orange-brown basketball
        masks.append(cv2.inRange(hsv, np.array([5, 100, 100]), np.array([25, 255, 255])))
    elif sport in ("soccer", "Soccer", "football", "Football"):
        # White soccer ball
        masks.append(cv2.inRange(hsv, np.array([0, 0, 180]), np.array([180, 40, 255])))
        # Black patches
        masks.append(cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 50])))
    elif sport in ("tennis", "Tennis"):
        # Neon yellow-green tennis ball
        masks.append(cv2.inRange(hsv, np.array([25, 100, 100]), np.array([45, 255, 255])))
    elif sport in ("baseball", "Baseball"):
        # White baseball
        masks.append(cv2.inRange(hsv, np.array([0, 0, 200]), np.array([180, 30, 255])))
    else:
        # Generic: try orange + white
        masks.append(cv2.inRange(hsv, np.array([5, 100, 100]), np.array([25, 255, 255])))
        masks.append(cv2.inRange(hsv, np.array([0, 0, 200]), np.array([180, 30, 255])))

    combined = masks[0]
    for m in masks[1:]:
        combined = cv2.bitwise_or(combined, m)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 40:
            continue
        circ = circularity(contour)
        if circ < 0.35:
            continue
        (cx, cy), radius = cv2.minEnclosingCircle(contour)
        if radius < 6 or radius > 150:
            continue
        candidates.append({
            "x": float(cx),
            "y": float(cy),
            "r": float(radius),
            "score": circ * 0.7,  # slightly lower confidence than motion
        })
    return candidates


def merge_candidates(motion_cands, color_cands, frame_w, frame_h):
    """Merge motion and color detections, preferring motion when they agree."""
    all_cands = []

    for mc in motion_cands:
        # Check if a color candidate is nearby (within 1.5x radius)
        boosted = False
        for cc in color_cands:
            dist = math.hypot(mc["x"] - cc["x"], mc["y"] - cc["y"])
            if dist < max(mc["r"], cc["r"]) * 2.5:
                # Both agree — boost score
                mc = dict(mc, score=mc["score"] * 1.4 + cc["score"] * 0.3)
                boosted = True
                break
        all_cands.append(mc)

    # Add color-only candidates that didn't match any motion candidate
    for cc in color_cands:
        matched = any(
            math.hypot(cc["x"] - mc["x"], cc["y"] - mc["y"]) < max(cc["r"], mc["r"]) * 2.5
            for mc in motion_cands
        )
        if not matched:
            all_cands.append(cc)

    if not all_cands:
        return None

    # Filter out candidates in the very top (scoreboard) or bottom (ticker) strips
    all_cands = [
        c for c in all_cands
        if c["y"] > frame_h * 0.06 and c["y"] < frame_h * 0.94
    ]
    if not all_cands:
        return None

    return max(all_cands, key=lambda c: c["score"])


def smooth_samples(raw_samples, alpha=0.35):
    """
    Exponential smoothing on x/y to reduce jitter.
    Also clamp large jumps (camera cuts) to avoid wild swings.
    """
    if not raw_samples:
        return []
    smoothed = [raw_samples[0].copy()]
    for i in range(1, len(raw_samples)):
        prev = smoothed[-1]
        curr = raw_samples[i]
        dt = curr["t"] - prev["t"]
        # If the ball jumped very far in a short time, it's likely a camera cut
        dist = math.hypot(curr["x"] - prev["x"], curr["y"] - prev["y"])
        max_speed = 1800  # pixels per second — fast but not teleport
        if dt > 0 and dist / dt > max_speed:
            # Camera cut or tracking error — accept new position directly
            smoothed.append(curr.copy())
        else:
            smoothed.append({
                "t": curr["t"],
                "x": prev["x"] * (1 - alpha) + curr["x"] * alpha,
                "y": prev["y"] * (1 - alpha) + curr["y"] * alpha,
                "r": prev["r"] * (1 - alpha) + curr["r"] * alpha,
            })
    return smoothed


def center_of_frame(frame_w, frame_h):
    return {"t": 0.0, "x": frame_w / 2, "y": frame_h / 2, "r": 30.0}


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"detected": False, "samples": []}))
        return 0

    video_path = sys.argv[1]
    start = float(sys.argv[2])
    duration = max(0.1, float(sys.argv[3]))
    max_samples = int(sys.argv[4]) if len(sys.argv) > 4 else 48
    sport = sys.argv[5] if len(sys.argv) > 5 else "basketball"

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(json.dumps({"detected": False, "samples": []}))
        return 0

    source_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920)
    source_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080)

    # Background subtractor — MOG2 is good for sports (handles lighting changes)
    bg_subtractor = cv2.createBackgroundSubtractorMOG2(
        history=120, varThreshold=40, detectShadows=True
    )

    # Prime the background model with a few frames before the clip start
    prime_start = max(0.0, start - 2.0)
    prime_step = 0.25
    prime_t = prime_start
    while prime_t < start:
        cap.set(cv2.CAP_PROP_POS_MSEC, prime_t * 1000)
        ok, frame = cap.read()
        if ok and frame is not None:
            small = cv2.resize(frame, (640, int(640 * source_height / max(1, source_width))))
            bg_subtractor.apply(small)
        prime_t += prime_step

    step = max(0.12, duration / max_samples)
    count = min(max_samples, max(1, int(math.ceil(duration / step)) + 1))

    raw_samples = []
    no_detect_streak = 0

    for index in range(count):
        rel_t = min(duration, index * step)
        cap.set(cv2.CAP_PROP_POS_MSEC, (start + rel_t) * 1000)
        ok, frame = cap.read()
        if not ok or frame is None:
            continue

        # Work at 640px wide for speed
        scale = 640 / max(1, source_width)
        small_w = 640
        small_h = int(source_height * scale)
        small = cv2.resize(frame, (small_w, small_h))

        motion_cands = detect_ball_motion(small, bg_subtractor)
        color_cands = detect_ball_color(small, sport)
        best = merge_candidates(motion_cands, color_cands, small_w, small_h)

        if best is not None:
            no_detect_streak = 0
            raw_samples.append({
                "t": round(rel_t, 3),
                "x": round(best["x"] / scale, 1),
                "y": round(best["y"] / scale, 1),
                "r": round(best["r"] / scale, 1),
            })
        else:
            no_detect_streak += 1
            # If we've been tracking and suddenly lose it, interpolate from last known
            if raw_samples and no_detect_streak <= 4:
                last = raw_samples[-1]
                raw_samples.append({
                    "t": round(rel_t, 3),
                    "x": last["x"],
                    "y": last["y"],
                    "r": last["r"],
                })

    cap.release()

    if not raw_samples:
        # No ball detected at all — fall back to center of frame
        print(json.dumps({
            "detected": False,
            "width": source_width,
            "height": source_height,
            "samples": [center_of_frame(source_width, source_height)],
        }))
        return 0

    smoothed = smooth_samples(raw_samples, alpha=0.4)

    # Convert to the format the Node.js side expects
    # x/y = ball center in source pixels, w/h = crop size hint (unused by crop logic directly)
    output_samples = [
        {
            "t": s["t"],
            "x": round(clamp(s["x"], 0, source_width), 1),
            "y": round(clamp(s["y"], 0, source_height), 1),
            "w": round(s.get("r", 30) * 2, 1),
            "h": round(s.get("r", 30) * 2, 1),
        }
        for s in smoothed
    ]

    print(json.dumps({
        "detected": True,
        "width": source_width,
        "height": source_height,
        "samples": output_samples,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
