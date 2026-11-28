import {
  SquatCounter,
  countFromAngles,
  jointAngle,
  kneeAngle,
  type AngleSample,
  type Landmark,
} from './rep-counter';
import squad01 from './__fixtures__/squad_01-angles.json';
import squat2 from './__fixtures__/squat_2-angles.json';
import squat04 from './__fixtures__/squat_04-angles.json';

type Series = [number, number | null][];
const fromFixture = (rows: Series): AngleSample[] =>
  rows.map(([tMs, angle]) => ({ tMs, angle }));

// Fixtures are the knee-angle series that poc/rep_counter/pose.py wrote for each video.
// The expected results below are what poc/rep_counter/counter.py counts on the same series.
describe('recorded knee-angle series (parity with the Python PoC)', () => {
  test('squad_01: self-recorded, side view, full body: 9 reps, true count is 9', () => {
    const r = countFromAngles(fromFixture(squad01 as Series));
    expect(r.reps).toBe(9);
    expect(r.repTimesS).toEqual([
      5.05, 7.21, 9.34, 11.58, 13.74, 15.99, 19.87, 28.69, 30.97,
    ]);
  });

  test('squat_2: feet cut off in the close-up, counts 2 of 5 (known limit)', () => {
    const r = countFromAngles(fromFixture(squat2 as Series));
    expect(r.reps).toBe(2);
    expect(r.repTimesS).toEqual([2.84, 6.2]);
  });

  test('squat_04: same count as the Python PoC (true count not recorded yet)', () => {
    const r = countFromAngles(fromFixture(squat04 as Series));
    expect(r.reps).toBe(13);
    expect(r.repTimesS).toEqual([
      8.09, 9.82, 12.79, 14.36, 16.02, 17.32, 18.49, 20.09, 25.75, 27.09, 28.52,
      33.05, 37.45,
    ]);
  });
});

// 25 fps, like the PoC videos.
const STEP = 40;
function feed(counter: SquatCounter, startMs: number, angles: (number | null)[]) {
  angles.forEach((a, i) => counter.update(startMs + i * STEP, a));
  return startMs + angles.length * STEP;
}
const rep = (down: number) => [
  ...Array(6).fill(170),
  ...Array(down).fill(80),
  ...Array(6).fill(170),
];

describe('SquatCounter', () => {
  test('counts one rep for a full down-and-up', () => {
    const c = new SquatCounter();
    feed(c, 0, rep(20));
    expect(c.reps).toBe(1);
    expect(c.getResult().exerciseId).toBe('squat');
  });

  test('counts several reps in a row', () => {
    const c = new SquatCounter();
    let t = 0;
    for (let i = 0; i < 3; i++) {
      t = feed(c, t, rep(20));
    }
    expect(c.reps).toBe(3);
  });

  test('a half squat that never gets below 100 does not count', () => {
    const c = new SquatCounter();
    feed(c, 0, [...Array(6).fill(170), ...Array(20).fill(120), ...Array(6).fill(170)]);
    expect(c.reps).toBe(0);
  });

  test('a down-and-up faster than 0.4 s is treated as noise', () => {
    const c = new SquatCounter();
    feed(c, 0, rep(3));
    expect(c.reps).toBe(0);
  });

  test('a single glitchy frame does not count (median smoothing)', () => {
    const c = new SquatCounter();
    feed(c, 0, [...Array(6).fill(170), 60, ...Array(6).fill(170)]);
    expect(c.reps).toBe(0);
    expect(c.isDown).toBe(false);
  });

  test('isDown is true at the bottom of a squat', () => {
    const c = new SquatCounter();
    feed(c, 0, [...Array(6).fill(170), ...Array(10).fill(80)]);
    expect(c.isDown).toBe(true);
    expect(c.reps).toBe(0);
  });

  test('frames without a pose are skipped and return null', () => {
    const c = new SquatCounter();
    expect(c.update(0, null)).toBeNull();
    expect(c.update(40, Number.NaN)).toBeNull();
    expect(c.reps).toBe(0);
  });

  test('a short gap (0.5 s) in the middle of a rep keeps the rep', () => {
    const c = new SquatCounter();
    let t = feed(c, 0, [...Array(6).fill(170), ...Array(12).fill(80)]);
    t += 500;
    feed(c, t, Array(6).fill(170));
    expect(c.reps).toBe(1);
  });

  test('a long gap (1.5 s) drops a half-finished rep', () => {
    const c = new SquatCounter();
    let t = feed(c, 0, [...Array(6).fill(170), ...Array(12).fill(80)]);
    t += 1500;
    feed(c, t, Array(6).fill(170));
    expect(c.reps).toBe(0);
    expect(c.isDown).toBe(false);
  });

  test('thresholds can be changed', () => {
    const c = new SquatCounter({ downBelow: 130 });
    feed(c, 0, [...Array(6).fill(170), ...Array(20).fill(120), ...Array(6).fill(170)]);
    expect(c.reps).toBe(1);
  });

  test('getResult is a snapshot: later frames do not change it', () => {
    const c = new SquatCounter();
    const t = feed(c, 0, rep(20));
    const snap = c.getResult();
    feed(c, t, rep(20));
    expect(snap.reps).toBe(1);
    expect(snap.repTimesS).toHaveLength(1);
    expect(c.reps).toBe(2);
  });
});

describe('knee angle from landmarks', () => {
  const blank = (): Landmark[] =>
    Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const setLeg = (
    lm: Landmark[],
    side: 'left' | 'right',
    hip: [number, number],
    knee: [number, number],
    ankle: [number, number],
    visibility = 0.9,
  ) => {
    const base = side === 'left' ? 23 : 24;
    [hip, knee, ankle].forEach(([x, y], i) => {
      lm[base + i * 2] = { x, y, visibility };
    });
  };

  test('jointAngle: straight line is 180, right angle is 90', () => {
    // Same 1e-9 guard against a zero-length leg as the Python PoC, so 180 reads 179.997.
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBeCloseTo(180, 1);
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90, 1);
  });

  test('straight leg reads about 180, bent leg about 90', () => {
    const lm = blank();
    setLeg(lm, 'left', [0.5, 0.2], [0.5, 0.5], [0.5, 0.8]);
    expect(kneeAngle(lm, 100, 100)?.angle).toBeCloseTo(180, 1);
    setLeg(lm, 'left', [0.5, 0.2], [0.5, 0.5], [0.8, 0.5]);
    expect(kneeAngle(lm, 100, 100)?.angle).toBeCloseTo(90, 1);
  });

  test('landmarks are scaled to pixels, so the aspect ratio matters', () => {
    const lm = blank();
    setLeg(lm, 'left', [0.4, 0.2], [0.5, 0.5], [0.5, 0.8]);
    const expected = jointAngle({ x: 80, y: 20 }, { x: 100, y: 50 }, { x: 100, y: 80 });
    expect(kneeAngle(lm, 200, 100)?.angle).toBeCloseTo(expected, 5);
    expect(kneeAngle(lm, 200, 100)?.angle).not.toBeCloseTo(
      kneeAngle(lm, 100, 100)!.angle,
      0,
    );
  });

  test('uses the more visible leg', () => {
    const lm = blank();
    setLeg(lm, 'left', [0.5, 0.2], [0.5, 0.5], [0.5, 0.8], 0.6);
    setLeg(lm, 'right', [0.5, 0.2], [0.5, 0.5], [0.8, 0.5], 0.95);
    const r = kneeAngle(lm, 100, 100);
    expect(r?.side).toBe('right');
    expect(r?.angle).toBeCloseTo(90, 1);
  });

  test('returns null when neither leg is clearly visible', () => {
    const lm = blank();
    setLeg(lm, 'left', [0.5, 0.2], [0.5, 0.5], [0.5, 0.8], 0.3);
    expect(kneeAngle(lm, 100, 100)).toBeNull();
    expect(kneeAngle([], 100, 100)).toBeNull();
  });
});
