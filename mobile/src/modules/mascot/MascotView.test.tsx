import React from 'react';
import Renderer from 'react-test-renderer';
import { Mascot } from './MascotView';
import { getMascotMood, setMascotMood } from './mascot';
import { hydrate } from '../../shared/storage';
import { submitCheckIn } from '../checkin/checkin';
let tree: Renderer.ReactTestRenderer | undefined;
beforeEach(async () => {
  jest.useFakeTimers();
  await hydrate(null);
});
afterEach(() => {
  if (tree) Renderer.act(() => tree!.unmount());
  tree = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
});
async function mount() {
  await Renderer.act(async () => {
    tree = Renderer.create(<Mascot />);
  });
}
function face(mood: string) {
  return tree!.root.findByProps({
    accessibilityLabel: `FitLens mascot: ${mood}`,
  });
}
test('tap reacts then restores shared base mood without persisting the reaction', async () => {
  setMascotMood('happy');
  await mount();
  Renderer.act(() => face('happy').props.onPress());
  expect(face('energized')).toBeDefined();
  expect(getMascotMood()).toBe('happy');
  Renderer.act(() => jest.advanceTimersByTime(950));
  expect(face('happy')).toBeDefined();
});
test.each(['tired', 'exhausted', 'concerned'] as const)(
  'tap gently acknowledges %s then returns to it',
  async base => {
    setMascotMood(base);
    await mount();
    Renderer.act(() => face(base).props.onPress());
    expect(face('calm')).toBeDefined();
    Renderer.act(() => jest.advanceTimersByTime(950));
    expect(face(base)).toBeDefined();
  },
);
test.each([
  [3, 'happy'],
  [6, 'content'],
  [8, 'tired'],
  [10, 'exhausted'],
] as const)(
  'check-in RPE %i is reflected as %s on mounted Home mascot',
  async (rpe, mood) => {
    await mount();
    Renderer.act(() => {
      submitCheckIn(
        { historyId: 'hs-mood', rpe, discomfort: [], scores: {}, note: '' },
        false,
      );
    });
    expect(face(mood)).toBeDefined();
  },
);
test('pain check-in during a tap immediately replaces transient reaction and survives its timeout', async () => {
  await mount();
  Renderer.act(() => face('happy').props.onPress());
  Renderer.act(() => {
    submitCheckIn(
      {
        historyId: 'hs-mood',
        rpe: 3,
        discomfort: [{ region: 'knees', sensation: 'pain', exerciseId: null }],
        scores: {},
        note: '',
      },
      true,
    );
  });
  expect(face('concerned')).toBeDefined();
  Renderer.act(() => jest.advanceTimersByTime(1500));
  expect(face('concerned')).toBeDefined();
  expect(getMascotMood()).toBe('concerned');
});
