"""Draw the detected skeleton, knee angle and the live rep count (counter.py) onto a video, to see what the counter sees.

Usage:
  python debug_video.py videos/squat_01.mp4
Writes outputs/<video>_debug.mp4 (downscaled to 540 px wide to keep the file small).
"""

import sys
from pathlib import Path

import cv2
import mediapipe as mp

from counter import SquatCounter
from pose import LEFT, OUTPUT_DIR, RIGHT, knee_angle, make_landmarker
from video_io import read_frames, video_info

OUT_WIDTH = 540

# Body connections to draw (MediaPipe landmark indices).
BONES = [(11, 12), (11, 23), (12, 24), (23, 24), (11, 13), (13, 15), (12, 14), (14, 16),
         (23, 25), (25, 27), (24, 26), (26, 28), (27, 31), (28, 32)]


def open_writer(path: Path, fps: float, size: tuple[int, int]) -> cv2.VideoWriter:
    # H.264 ("avc1") plays in browsers; fall back to MPEG-4 if this OpenCV build lacks it.
    for codec in ("avc1", "mp4v"):
        writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*codec), fps, size)
        if writer.isOpened():
            return writer
    raise RuntimeError("No usable video codec found")


def render(video: Path) -> Path:
    info = video_info(video)
    scale = OUT_WIDTH / info.width
    size = (OUT_WIDTH, int(info.height * scale))
    out_path = OUTPUT_DIR / f"{video.stem}_debug.mp4"
    OUTPUT_DIR.mkdir(exist_ok=True)
    writer = open_writer(out_path, info.fps or 30, size)

    counter = SquatCounter()
    with make_landmarker() as landmarker:
        for t_ms, rgb in read_frames(video):
            result = landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), t_ms)
            frame = cv2.resize(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), size)
            angle, side = None, None
            if result.pose_landmarks:
                lm = result.pose_landmarks[0]
                angle, side = knee_angle(lm, info.width, info.height)
                px = lambda i: (int(lm[i].x * size[0]), int(lm[i].y * size[1]))
                for a, b in BONES:
                    cv2.line(frame, px(a), px(b), (255, 255, 255), 2)
                if side:  # highlight the leg being measured
                    leg = LEFT if side == "left" else RIGHT
                    hip, knee, ankle = px(leg["hip"]), px(leg["knee"]), px(leg["ankle"])
                    cv2.line(frame, hip, knee, (0, 200, 255), 4)
                    cv2.line(frame, knee, ankle, (0, 200, 255), 4)
                    cv2.circle(frame, knee, 8, (0, 0, 255), -1)
                    cv2.putText(frame, f"{angle:.0f}", (knee[0] + 12, knee[1]),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

            counter.update(t_ms, angle)
            reps, state = counter.result.reps, counter.state

            cv2.rectangle(frame, (0, 0), (size[0], 70), (30, 30, 30), -1)
            cv2.putText(frame, f"REPS {reps}", (12, 48), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (80, 255, 120), 3)
            status = f"{state.upper()}  knee {angle:.0f} deg ({side})" if angle is not None else "no pose"
            cv2.putText(frame, status, (230, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230, 230, 230), 1)
            cv2.putText(frame, f"{t_ms / 1000:5.1f} s", (230, 56), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                        (170, 170, 170), 1)
            writer.write(frame)
    writer.release()
    print(f"{video.name}: {reps} reps -> {out_path.relative_to(OUTPUT_DIR.parent)}")
    return out_path


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        render(Path(arg))
