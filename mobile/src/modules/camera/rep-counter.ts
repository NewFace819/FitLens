/**
 * Squat rep counter. Pure TypeScript, no React, no camera.
 *
 * A port of `poc/rep_counter/counter.py` and the angle maths in `poc/rep_counter/pose.py`.
 * The Python version counted 9/9 on a self-recorded side-view video; tests here feed it the
 * same knee-angle series and expect the same reps, so the two stay in step.
 *
 * It works one frame at a time (`update()`), so it runs the same on a recorded series or on a
 * live camera. Getting the landmarks out of the camera on Android (MediaPipe Pose) is a
 * separate piece: feed the 33 landmarks to `kneeAngle()` and the result to `update()`.
 *
 * A rep = the knee goes DOWN (below `downBelow`) and comes back UP (above `upAbove`).
 * Guards:
 * - smoothing: median of the last few angles removes single-frame landmark glitches;
 * - gaps: frames without a reliable pose are skipped; after a long gap (person left the
 *   frame) a half-finished rep is dropped;
 * - minimum rep length: a down-and-up faster than `minRepS` is treated as noise.
 *
 * Known limit: the whole leg must be in frame. If the feet are cut off, standing reads
 * about 120 degrees and those reps never complete.
 */

export type CounterConfig = {
  /** Knee angle (deg) that counts as the bottom of a squat. */
  downBelow: number;
  /** Knee angle (deg) that counts as standing again. */
  upAbove: number;
  /** Median window, in frames. */
  smoothFrames: number;
  /** Shortest believable rep (down to up), in seconds. */
  minRepS: number;
  /** Longer than this without a pose resets a half-finished rep, in seconds. */
  maxGapS: number;
};

export const DEFAULT_COUNTER_CONFIG: CounterConfig = {
  downBelow: 100,
  upAbove: 160,
  smoothFrames: 5,
  minRepS: 0.4,
  maxGapS: 1.0,
};

export type RepResult = {
  exerciseId: string;
  reps: number;
  /** Time each rep was completed, in seconds from the start. */
  repTimesS: number[];
};

export type AngleSample = {
  tMs: number;
  /** Knee angle in degrees (180 = straight leg); null when there is no reliable pose. */
  angle: number | null;
};

type Phase = 'up' | 'down';

/** Median like Python's statistics.median: the mean of the two middle values for even counts. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export class SquatCounter {
  private readonly cfg: CounterConfig;
  private phase: Phase = 'up';
  private downSinceMs: number | null = null;
  private lastSeenMs: number | null = null;
  private window: number[] = [];
  private readonly result: RepResult = {
    exerciseId: 'squat',
    reps: 0,
    repTimesS: [],
  };

  constructor(config: Partial<CounterConfig> = {}) {
    this.cfg = { ...DEFAULT_COUNTER_CONFIG, ...config };
  }

  /** Feed one frame. Returns the smoothed angle, or null if there is no reliable pose. */
  update(tMs: number, angle: number | null): number | null {
    if (angle === null || !Number.isFinite(angle)) {
      return null;
    }
    if (
      this.lastSeenMs !== null &&
      tMs - this.lastSeenMs > this.cfg.maxGapS * 1000
    ) {
      // Lost the person for a while: start fresh rather than finish a rep we did not see.
      this.window = [];
      this.phase = 'up';
      this.downSinceMs = null;
    }
    this.lastSeenMs = tMs;

    this.window.push(angle);
    if (this.window.length > this.cfg.smoothFrames) {
      this.window.shift();
    }
    const smooth = median(this.window);

    if (this.phase === 'up' && smooth < this.cfg.downBelow) {
      this.phase = 'down';
      this.downSinceMs = tMs;
    } else if (this.phase === 'down' && smooth > this.cfg.upAbove) {
      this.phase = 'up';
      if (
        this.downSinceMs !== null &&
        (tMs - this.downSinceMs) / 1000 >= this.cfg.minRepS
      ) {
        this.result.reps += 1;
        this.result.repTimesS.push(Math.round((tMs / 1000) * 100) / 100);
      }
    }
    return smooth;
  }

  /** Reps counted so far. */
  get reps(): number {
    return this.result.reps;
  }

  /** True while the person is at the bottom of a squat (for live feedback). */
  get isDown(): boolean {
    return this.phase === 'down';
  }

  /** Snapshot of the result; safe to keep, later frames do not change it. */
  getResult(): RepResult {
    return { ...this.result, repTimesS: [...this.result.repTimesS] };
  }
}

/** Count reps in a recorded series of knee angles. */
export function countFromAngles(
  samples: AngleSample[],
  config: Partial<CounterConfig> = {},
): RepResult {
  const counter = new SquatCounter(config);
  for (const s of samples) {
    counter.update(s.tMs, s.angle);
  }
  return counter.getResult();
}

// --- Angle maths from MediaPipe landmarks -----------------------------------------------

export type Point = { x: number; y: number };
export type Landmark = Point & { visibility?: number };

/** MediaPipe Pose landmark indexes of one leg. */
const LEFT_LEG = { hip: 23, knee: 25, ankle: 27 } as const;
const RIGHT_LEG = { hip: 24, knee: 26, ankle: 28 } as const;
/** Below this, MediaPipe is not confident the joint is visible. */
export const MIN_VISIBILITY = 0.5;

/** Angle ABC in degrees (at B), from 2D points. */
export function jointAngle(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const cos =
    (v1x * v2x + v1y * v2y) /
    (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) + 1e-9);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/**
 * Knee angle of the more visible leg, or null if neither leg is clearly visible.
 * `landmarks` are MediaPipe's normalised 0-1 points; they are scaled to pixels first so the
 * angle is not distorted by the frame's aspect ratio.
 */
export function kneeAngle(
  landmarks: Landmark[],
  width: number,
  height: number,
): { angle: number; side: 'left' | 'right' } | null {
  let best: { visibility: number; angle: number; side: 'left' | 'right' } | null =
    null;
  const legs = [
    ['left', LEFT_LEG],
    ['right', RIGHT_LEG],
  ] as const;
  for (const [side, idx] of legs) {
    const hip = landmarks[idx.hip];
    const knee = landmarks[idx.knee];
    const ankle = landmarks[idx.ankle];
    if (!hip || !knee || !ankle) {
      continue;
    }
    const visibility = Math.min(
      hip.visibility ?? 0,
      knee.visibility ?? 0,
      ankle.visibility ?? 0,
    );
    if (visibility >= MIN_VISIBILITY && (best === null || visibility > best.visibility)) {
      const px = (p: Landmark): Point => ({ x: p.x * width, y: p.y * height });
      best = { visibility, angle: jointAngle(px(hip), px(knee), px(ankle)), side };
    }
  }
  return best ? { angle: best.angle, side: best.side } : null;
}
