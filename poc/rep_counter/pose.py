"""Step 2: run MediaPipe Pose on a video and turn it into a knee-angle time series.

Usage:
  python pose.py videos/squat_01.mp4
Writes outputs/<video>_angles.csv and outputs/<video>_angles.png (a chart to eyeball the squats).
"""

import csv
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

from video_io import read_frames, video_info

HERE = Path(__file__).parent
MODEL_PATH = HERE / "models" / "pose_landmarker_full.task"
MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
             "pose_landmarker_full/float16/latest/pose_landmarker_full.task")
OUTPUT_DIR = HERE / "outputs"

# MediaPipe pose landmark indices.
LEFT = {"hip": 23, "knee": 25, "ankle": 27}
RIGHT = {"hip": 24, "knee": 26, "ankle": 28}
MIN_VISIBILITY = 0.5  # below this, MediaPipe isn't confident the joint is visible


@dataclass
class AngleSample:
    t_ms: int
    angle: float | None  # knee angle in degrees (180 = straight leg); None if no reliable pose
    side: str | None     # "left" / "right": the leg the angle was measured on


def joint_angle(a, b, c) -> float:
    """Angle ABC in degrees, from 2D points (x, y)."""
    v1 = np.array([a[0] - b[0], a[1] - b[1]])
    v2 = np.array([c[0] - b[0], c[1] - b[1]])
    cos = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9)
    return math.degrees(math.acos(float(np.clip(cos, -1.0, 1.0))))


def knee_angle(landmarks, width: int, height: int) -> tuple[float | None, str | None]:
    """Knee angle of the more visible leg, or (None, None) if neither leg is clearly visible."""
    best = None
    for side, idx in (("left", LEFT), ("right", RIGHT)):
        points = [landmarks[idx[j]] for j in ("hip", "knee", "ankle")]
        visibility = min(p.visibility for p in points)
        if visibility >= MIN_VISIBILITY and (best is None or visibility > best[0]):
            # Landmarks are normalised 0-1; scale to pixels so angles aren't distorted by aspect ratio.
            hip, knee, ankle = ((p.x * width, p.y * height) for p in points)
            best = (visibility, joint_angle(hip, knee, ankle), side)
    return (best[1], best[2]) if best else (None, None)


def make_landmarker():
    if not MODEL_PATH.exists():
        sys.exit(f"Model missing: {MODEL_PATH}\nDownload it from {MODEL_URL}")
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_poses=1,
    )
    return mp.tasks.vision.PoseLandmarker.create_from_options(options)


def extract_angles(video: Path) -> list[AngleSample]:
    info = video_info(video)
    samples = []
    with make_landmarker() as landmarker:
        for t_ms, rgb in read_frames(video):
            result = landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), t_ms)
            if result.pose_landmarks:
                angle, side = knee_angle(result.pose_landmarks[0], info.width, info.height)
            else:
                angle, side = None, None
            samples.append(AngleSample(t_ms, angle, side))
    return samples


def save_csv(samples: list[AngleSample], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["t_ms", "knee_angle_deg", "side"])
        for s in samples:
            w.writerow([s.t_ms, "" if s.angle is None else f"{s.angle:.1f}", s.side or ""])


def save_chart(samples: list[AngleSample], path: Path, title: str) -> None:
    """Plain OpenCV line chart of knee angle over time (no extra plotting dependency)."""
    w, h, pad = 1000, 360, 40
    img = np.full((h, w, 3), 255, np.uint8)
    t_max = max((s.t_ms for s in samples), default=1) or 1
    y_of = lambda deg: int(h - pad - (deg - 40) / (190 - 40) * (h - 2 * pad))  # 40-190 deg range
    x_of = lambda t: int(pad + t / t_max * (w - 2 * pad))
    for deg in (60, 90, 120, 150, 180):
        cv2.line(img, (pad, y_of(deg)), (w - pad, y_of(deg)), (225, 225, 225), 1)
        cv2.putText(img, str(deg), (4, y_of(deg) + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 120, 120), 1)
    prev = None
    for s in samples:
        if s.angle is None:
            prev = None  # gap where no reliable pose was found
            continue
        point = (x_of(s.t_ms), y_of(s.angle))
        if prev:
            cv2.line(img, prev, point, (200, 90, 40), 2)
        prev = point
    missing = sum(s.angle is None for s in samples)
    cv2.putText(img, f"{title}  |  {t_max / 1000:.1f} s  |  no pose in {missing}/{len(samples)} frames",
                (pad, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 40, 40), 1)
    cv2.imwrite(str(path), img)


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    for arg in sys.argv[1:]:
        video = Path(arg)
        samples = extract_angles(video)
        save_csv(samples, OUTPUT_DIR / f"{video.stem}_angles.csv")
        save_chart(samples, OUTPUT_DIR / f"{video.stem}_angles.png", video.name)
        found = [s.angle for s in samples if s.angle is not None]
        print(f"{video.name}: {len(samples)} frames, pose found in {len(found)}"
              + (f", knee angle {min(found):.0f}-{max(found):.0f} deg" if found else ""))


if __name__ == "__main__":
    main()
