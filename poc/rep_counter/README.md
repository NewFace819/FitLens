# Squat rep counter (PoC)

Counts squats in a video using MediaPipe Pose (free, offline, runs on a laptop CPU). It measures the knee angle (hip–knee–ankle) on every frame and counts one rep each time the knee goes below 100° and back above 160°.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Download the pose model (about 9 MB, gitignored) into `models/`:
<https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task>

## Videos

- Put test videos in `videos/` and their true rep counts in `videos/labels.json`.
- Videos are personal and large, so **git ignores them**. Share them with the team another way, such as Drive.
- Film from the **side or at 45°, with the whole body in frame** (head to feet). If the feet are cut off, the knee angle becomes unreliable.

## Scripts

| Script | What it does | Output (in `outputs/`, gitignored) |
|---|---|---|
| `video_io.py <video>` | Checks that a video is readable (resolution, fps, length) | prints info |
| `pose.py <video>` | Pose detection and knee angle per frame | `<video>_angles.csv`, `<video>_angles.png` (chart) |
| `counter.py <csv>` | Counts reps from the angle CSV | prints the count and when each rep finished |
| `debug_video.py <video>` | Draws the skeleton, knee angle and live count on the video | `<video>_debug.mp4` |

## How the counter works (`counter.py`)

`SquatCounter.update(t_ms, angle)` takes one frame at a time, so it can also run on a live camera later. It has three guards:
- **Smoothing:** a median of the last 5 angles removes one-frame glitches.
- **Gaps:** frames with no pose are skipped. A gap longer than 1 s cancels a half-finished rep.
- **Minimum rep length:** a rep must take at least 0.4 s, otherwise it's treated as noise.

## Results so far

| Video | True | Counted | Note |
|---|---|---|---|
| squad_01.mp4 | 9 | 9 | self-recorded, side view, full body |
| squat_2.mp4 | 5 | 2 | YouTube clip; the close-up cuts off the feet, so standing reads ~120° and those reps never complete. A known limit. |

The thresholds are fixed for now. Adaptive thresholds (standing judged from each video's own highest angle) will be considered once there are more videos.
