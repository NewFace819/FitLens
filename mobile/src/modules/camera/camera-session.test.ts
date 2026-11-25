import { CameraSession, supportsSquat, type PoseFrame } from './camera-session';
function frame(tMs: number, angle: number): PoseFrame {
  const radians = ((180 - angle) * Math.PI) / 180;
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0,
  }));
  landmarks[23] = { x: 0.5, y: 0.25, visibility: 1 };
  landmarks[25] = { x: 0.5, y: 0.5, visibility: 1 };
  landmarks[27] = {
    x: 0.5 + 0.25 * Math.sin(radians),
    y: 0.5 + 0.25 * Math.cos(radians),
    visibility: 1,
  };
  return { tMs, width: 640, height: 640, landmarks };
}
function segment(
  session: CameraSession,
  from: number,
  to: number,
  angle: number,
) {
  for (let t = from; t <= to; t += 100) session.frame(frame(t, angle));
}
test('preview never counts; a running down/up cycle counts once', () => {
  const s = new CameraSession();
  segment(s, 0, 400, 180);
  segment(s, 500, 1100, 80);
  segment(s, 1200, 1800, 180);
  expect(s.snapshot().reps).toBe(0);
  s.start();
  segment(s, 2000, 2400, 180);
  segment(s, 2500, 3100, 80);
  segment(s, 3200, 3800, 180);
  expect(s.snapshot().reps).toBe(1);
});
test('pause or camera switch drops half a rep and retains completed reps', () => {
  const s = new CameraSession();
  s.start();
  segment(s, 0, 400, 180);
  segment(s, 500, 1100, 80);
  segment(s, 1200, 1800, 180);
  segment(s, 1900, 2500, 80);
  expect(s.pause().reps).toBe(1);
  s.resume();
  segment(s, 3000, 3600, 180);
  expect(s.snapshot().reps).toBe(1);
  segment(s, 3700, 4300, 80);
  segment(s, 4400, 5000, 180);
  expect(s.snapshot().reps).toBe(2);
});
test('lost legs or a long gap cannot complete an unseen rep', () => {
  const s = new CameraSession();
  s.start();
  segment(s, 0, 400, 180);
  segment(s, 500, 1100, 80);
  s.frame({ ...frame(2000, 180), landmarks: [] });
  segment(s, 4000, 4700, 180);
  expect(s.snapshot().reps).toBe(0);
  expect(s.frame({ ...frame(4800, 180), landmarks: [] }).visible).toBe(false);
});
test('rejects invalid dimensions, timestamps and off-frame joints', () => {
  const s = new CameraSession();
  s.start();
  s.frame(frame(0, 180));
  expect(s.frame({ ...frame(100, 80), width: 0 }).angle).toBeCloseTo(180);
  s.frame(frame(100, 180));
  expect(s.frame(frame(100, 80)).angle).toBeCloseTo(180);
  const bad = frame(200, 80);
  bad.landmarks[27].y = 2;
  expect(s.frame(bad).visible).toBe(false);
});
test('unsupported exercises do not pretend to be squat counters', () => {
  expect(supportsSquat('goblet-squat')).toBe(true);
  expect(supportsSquat('bench-press')).toBe(false);
});
