"""Step 3: count squat reps from a stream of knee angles.

Works frame by frame (update() per frame), so the same class can run offline on a video or live
on a camera feed later. A rep = knee goes DOWN (below down_below) and comes back UP (above up_above).

Guards:
- smoothing: median of the last few angles removes single-frame landmark glitches;
- gap handling: frames without a reliable pose are skipped, the state is kept across short gaps,
  and after a long gap (person left the frame) a half-finished rep is dropped;
- minimum rep length: a down-and-up faster than min_rep_s is treated as noise.

Usage: python counter.py outputs/squad_01_angles.csv   (CSV written by pose.py)
"""

import csv
import sys
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from statistics import median


@dataclass
class CounterConfig:
    down_below: float = 100.0   # knee angle (deg) that counts as the bottom of a squat
    up_above: float = 160.0     # knee angle (deg) that counts as standing again
    smooth_frames: int = 5      # median window
    min_rep_s: float = 0.4      # shortest believable rep (down -> up)
    max_gap_s: float = 1.0      # longer than this without a pose = reset a half-finished rep


@dataclass
class RepResult:
    """Output in the spirit of the data contract: what was counted, and when."""
    exercise_id: str = "squat"
    reps: int = 0
    rep_times_s: list[float] = field(default_factory=list)  # time each rep was completed


class SquatCounter:
    def __init__(self, config: CounterConfig | None = None):
        self.cfg = config or CounterConfig()
        self.result = RepResult()
        self.state = "up"
        self.down_since_ms: int | None = None
        self.last_seen_ms: int | None = None
        self.window: deque[float] = deque(maxlen=self.cfg.smooth_frames)

    def update(self, t_ms: int, angle: float | None) -> float | None:
        """Feed one frame. Returns the smoothed angle (None if no reliable pose)."""
        if angle is None:
            return None
        if self.last_seen_ms is not None and t_ms - self.last_seen_ms > self.cfg.max_gap_s * 1000:
            # Lost the person for a while: start fresh rather than finish a rep we didn't see.
            self.window.clear()
            self.state, self.down_since_ms = "up", None
        self.last_seen_ms = t_ms

        self.window.append(angle)
        smooth = median(self.window)

        if self.state == "up" and smooth < self.cfg.down_below:
            self.state, self.down_since_ms = "down", t_ms
        elif self.state == "down" and smooth > self.cfg.up_above:
            self.state = "up"
            if (t_ms - self.down_since_ms) / 1000 >= self.cfg.min_rep_s:
                self.result.reps += 1
                self.result.rep_times_s.append(round(t_ms / 1000, 2))
        return smooth


def count_from_csv(path: Path, config: CounterConfig | None = None) -> RepResult:
    counter = SquatCounter(config)
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            angle = float(row["knee_angle_deg"]) if row["knee_angle_deg"] else None
            counter.update(int(row["t_ms"]), angle)
    return counter.result


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        r = count_from_csv(Path(arg))
        print(f"{Path(arg).name}: {r.reps} reps at {r.rep_times_s} s")
