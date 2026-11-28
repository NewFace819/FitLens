/** #30: the level is visible on the mascot and on Home, and rises as sessions are saved. */
import React from 'react';
import { Text } from 'react-native';
import Renderer from 'react-test-renderer';
import Home from '../../screens/dev-hub';
import { hydrate, KEYS, write } from '../../shared/storage';
import { toDateKey } from '../../shared/dates';
import type { HistoryEntry } from '../history/history';
import { Mascot } from './MascotView';

jest.mock('../../navigation', () => ({ useAppNavigation: () => ({ navigate: jest.fn() }) }));

const today = toDateKey(new Date());
const entry = (i: number): HistoryEntry => ({
  id: `hs-lv${i}`, sessionId: null, workoutId: 'tpl-upper', date: today, durationSec: 1800, stoppedByPain: false,
  sets: Array.from({ length: 9 }, () => ({ exerciseId: 'bench-press', kg: 10, reps: 10 })),
});
const text = (t: Renderer.ReactTestRenderer) => JSON.stringify(t.toJSON());
const words = (n: Renderer.ReactTestInstance) => n.findAllByType(Text).map((x) => ([] as unknown[]).concat(x.props.children).join('')).join(' | ');

let tree: Renderer.ReactTestRenderer | undefined;
beforeEach(async () => { await hydrate(null); });
afterEach(() => {
  if (tree) Renderer.act(() => tree!.unmount());
  tree = undefined;
});

test('mascot: the level badge goes up live as sessions are saved', () => {
  Renderer.act(() => { tree = Renderer.create(<Mascot />); });
  expect(text(tree!)).toContain('"Lv ","1"');
  const face = tree!.root.find((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('FitLens mascot:'));
  expect(face.props.accessibilityValue).toEqual({ text: 'Strength level 1, Starter' });

  Renderer.act(() => { write(KEYS.history, [entry(2), entry(1)]); });
  expect(text(tree!)).toContain('"Lv ","2"');
});

test('Home shows the strength level and what is left to the next one', () => {
  write(KEYS.history, [entry(1)]);
  Renderer.act(() => { tree = Renderer.create(<Home />); });
  const card = tree!.root.find((n) => n.props.testID === 'home-strength');
  expect(words(card)).toBe('Strength · Level 1 Starter | 6 points to Steady');
});
