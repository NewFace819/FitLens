"""Read a video file frame by frame, with the timestamp MediaPipe needs.

Usage (prints basic info, a quick check that a video is readable):
  python video_io.py videos/squat_01.mp4
"""

import sys
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


@dataclass
class VideoInfo:
    path: Path
    fps: float
    frame_count: int
    width: int
    height: int

    @property
    def duration_s(self) -> float:
        return self.frame_count / self.fps if self.fps else 0.0


def open_video(path: Path) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {path}")
    return cap


def video_info(path: Path) -> VideoInfo:
    cap = open_video(path)
    try:
        return VideoInfo(path=path,
                         fps=cap.get(cv2.CAP_PROP_FPS),
                         frame_count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
                         width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                         height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    finally:
        cap.release()


def read_frames(path: Path) -> Iterator[tuple[int, np.ndarray]]:
    """Yield (timestamp_ms, RGB frame). Timestamps strictly increase, as MediaPipe's VIDEO mode requires."""
    cap = open_video(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    last_ms = -1
    index = 0
    try:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            # Phone videos sometimes report broken timestamps, so fall back to frame index / fps.
            ms = int(cap.get(cv2.CAP_PROP_POS_MSEC)) or int(index * 1000 / fps)
            ms = max(ms, last_ms + 1)
            last_ms = ms
            index += 1
            yield ms, cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    finally:
        cap.release()


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        info = video_info(Path(arg))
        n = sum(1 for _ in read_frames(info.path))
        print(f"{info.path.name}: {info.width}x{info.height}, {info.fps:.1f} fps, "
              f"{info.duration_s:.1f} s, {n} frames read")
