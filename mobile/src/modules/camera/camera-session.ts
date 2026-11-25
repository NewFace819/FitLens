import { SquatCounter, kneeAngle, type Landmark } from './rep-counter';
export type PoseFrame = {
  tMs: number;
  width: number;
  height: number;
  landmarks: Landmark[];
};
export type CameraSnapshot = {
  reps: number;
  angle: number | null;
  isDown: boolean;
  visible: boolean;
};
/** State owned by this camera session only. Pauses never complete a half-rep. */
export class CameraSession {
  private counter = new SquatCounter();
  private carried = 0;
  private running = false;
  private epoch: number | null = null;
  private lastT = -1;
  private latest: CameraSnapshot = {
    reps: 0,
    angle: null,
    isDown: false,
    visible: false,
  };
  start() {
    this.counter = new SquatCounter();
    this.carried = 0;
    this.running = true;
    this.epoch = null;
    this.lastT = -1;
    this.latest = { reps: 0, angle: null, isDown: false, visible: false };
    return this.snapshot();
  }
  pause() {
    this.carried += this.counter.reps;
    this.counter = new SquatCounter();
    this.running = false;
    this.latest = { ...this.latest, reps: this.carried, isDown: false };
    return this.snapshot();
  }
  resume() {
    this.counter = new SquatCounter();
    this.running = true;
    this.epoch = null;
    this.lastT = -1;
    return this.snapshot();
  }
  frame(frame: PoseFrame): CameraSnapshot {
    if (
      !Number.isFinite(frame.tMs) ||
      frame.tMs <= this.lastT ||
      !Number.isFinite(frame.width) ||
      !Number.isFinite(frame.height) ||
      frame.width <= 0 ||
      frame.height <= 0 ||
      !Array.isArray(frame.landmarks)
    )
      return this.snapshot();
    this.lastT = frame.tMs;
    const points = frame.landmarks.map(point =>
      point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.x <= 1 &&
      point.y >= 0 &&
      point.y <= 1
        ? point
        : { x: 0, y: 0, visibility: 0 },
    );
    const knee = kneeAngle(points, frame.width, frame.height);
    if (this.epoch === null) this.epoch = frame.tMs;
    const angle = this.running
      ? this.counter.update(frame.tMs - this.epoch, knee?.angle ?? null)
      : knee?.angle ?? null;
    this.latest = {
      reps: this.carried + this.counter.reps,
      angle,
      isDown: this.running && this.counter.isDown,
      visible: knee !== null,
    };
    return this.snapshot();
  }
  snapshot() {
    return { ...this.latest };
  }
}
export function supportsSquat(id: string) {
  return [
    'squat',
    'bodyweight-squat',
    'goblet-squat',
    'chair-squat',
    'barbell-squat',
  ].includes(id);
}
