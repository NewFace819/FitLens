import React from 'react';
import Renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import HistoryScreen from '../src/screens/history';
import RecapScreen from '../src/screens/recap';
import { hydrate, type Persistence } from '../src/shared/storage';
import { appendReviewDurable, saveHistory } from '../src/modules/history/history';
import { buildReview } from '../src/modules/checkin/review-model';

const mockNavigate = jest.fn();
let mockRecapId: string | undefined;
jest.mock('../src/navigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, replace: jest.fn() }),
  useAppRoute: () => ({ params: mockRecapId ? { history: mockRecapId } : undefined }),
  goBackOrHome: jest.fn(),
}));
jest.mock('../src/ui/components', () => {
  const { View, Text: RNText, Pressable } = require('react-native');
  return {
    Screen: ({ children }: any) => <View>{children}</View>,
    TopBar: ({ title }: any) => <RNText>{title}</RNText>,
    Divider: () => <View />,
    Button: ({ title, ...props }: any) => (
      <Pressable {...props}>
        <RNText>{title}</RNText>
      </Pressable>
    ),
  };
});

let app: ReactTestRenderer;
beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-28T03:00:00Z')); // Saturday
  mockNavigate.mockClear();
  mockRecapId = undefined;
  const disk = new Map<string, string>();
  const persistence: Persistence = {
    loadAll: async () => [...disk],
    save: async (k, v) => { disk.set(k, v); },
    remove: async keys => { keys.forEach(k => disk.delete(k)); },
  };
  await hydrate(persistence);
});
afterEach(async () => {
  await act(async () => app.unmount());
  jest.useRealTimers();
});

const render = async (screen: React.ReactElement) => {
  await act(async () => { app = Renderer.create(screen); });
};
/** Every string rendered inside a Text, joined per Text node. */
const texts = () =>
  app.root.findAllByType(Text).map(node => {
    const c = node.props.children;
    return Array.isArray(c) ? c.filter(x => typeof x === 'string').join('') : String(c);
  });
const shows = (text: string) => texts().some(t => t.includes(text));
const press = async (title: string) => {
  const target = app.root.findAll(n => n.props.title === title && typeof n.props.onPress === 'function')[0];
  expect(target).toBeDefined();
  await act(async () => { target.props.onPress(); });
};

const seed = async () => {
  await saveHistory({
    id: 'hs-fri', workoutId: 'tpl-lower', workoutTitle: 'Legs at home', sessionId: null,
    date: '2026-11-27', durationSec: 40 * 60, stoppedByPain: false,
    sets: [
      { exerciseId: 'goblet-squat', kg: 20, reps: 10 },
      { exerciseId: 'goblet-squat', kg: 20, reps: 10 },
    ],
    completedAt: '2026-11-27T10:00:00.000Z',
  });
  await saveHistory({
    id: 'hs-pain', workoutId: 'tpl-upper', sessionId: null,
    date: '2026-11-18', durationSec: 20 * 60, stoppedByPain: true, sets: [],
    completedAt: '2026-11-18T10:00:00.000Z',
  });
  await saveHistory({
    id: 'hs-oct', workoutId: 'tpl-full', sessionId: null,
    date: '2026-10-30', durationSec: 30 * 60, stoppedByPain: false,
    sets: [{ exerciseId: 'push-up', kg: 0, reps: 12 }],
    completedAt: '2026-10-30T10:00:00.000Z',
  });
  await appendReviewDurable(buildReview({
    historyId: 'hs-fri', rpe: 7, discomfort: [], scores: {}, note: '',
  } as any));
};

test('a new user sees a clear empty state with a way to start', async () => {
  await render(<HistoryScreen />);
  expect(shows('No workouts yet')).toBe(true);
  expect(shows('Your month in motion')).toBe(false);
  await press('Start a workout');
  expect(mockNavigate).toHaveBeenCalledWith('Workout');
});

test('history groups by week with month numbers, duration, volume, effort and pain stops', async () => {
  await seed();
  await render(<HistoryScreen />);
  expect(shows('Your month in motion · November')).toBe(true);
  expect(shows('2 workouts')).toBe(true); // October's workout is not in this month
  expect(shows('1 h 00 min')).toBe(true);
  expect(shows('400 kg')).toBe(true);
  expect(shows('This week · 1 workout · 40 min')).toBe(true);
  expect(shows('Last week · 1 workout · 20 min')).toBe(true);
  expect(shows('Oct 26 – Nov 1 · 1 workout · 30 min')).toBe(true);
  expect(shows('Legs at home')).toBe(true); // the title saved at start wins
  expect(shows('Fri, Nov 27 · 40 min · 400 kg · Effort 7/10')).toBe(true);
  expect(shows('Wed, Nov 18 · 20 min · 0 sets')).toBe(true);
  expect(shows('Stopped for pain')).toBe(true);
  expect(shows('Fri, Oct 30 · 30 min · 1 set')).toBe(true); // bodyweight shows sets, not 0 kg

  const row = app.root.findAll(n => n.props.accessibilityRole === 'button' &&
    typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Legs at home'))[0];
  await act(async () => { row.props.onPress(); });
  expect(mockNavigate).toHaveBeenCalledWith('Recap', { history: 'hs-fri' });
});

test('recap shows the session numbers, its sets, effort and its month', async () => {
  await seed();
  mockRecapId = 'hs-fri';
  await render(<RecapScreen />);
  expect(shows('Fri, Nov 27')).toBe(true);
  expect(shows('Legs at home')).toBe(true);
  expect(shows('✓ Complete')).toBe(true);
  expect(shows('400 kg')).toBe(true);
  expect(shows('Weight × reps, added up across every set')).toBe(true);
  expect(shows('40 min')).toBe(true);
  expect(shows('2 sets')).toBe(true);
  expect(shows('1 exercise')).toBe(true);
  expect(shows('7/10')).toBe(true);
  expect(shows('Set 2 · 20 kg · 10 reps')).toBe(true);
  expect(shows('2 workouts')).toBe(true);
  expect(shows('1 h 00 min well spent · 400 kg lifted')).toBe(true);
  await press('Edit check-in');
  expect(mockNavigate).toHaveBeenCalledWith('CheckIn', { history: 'hs-fri' });
});

test('a pain-stopped recap says so, and a missing recap offers the history list', async () => {
  await seed();
  mockRecapId = 'hs-pain';
  await render(<RecapScreen />);
  expect(shows('Stopped for pain. Rest, and tell us where it hurt in the check-in.')).toBe(true);
  expect(shows('Bodyweight and timed sets add no volume')).toBe(true);
  expect(shows('Not checked in yet')).toBe(true);
  expect(shows('✓ Complete')).toBe(false);
  await act(async () => app.unmount());

  mockRecapId = 'hs-gone';
  await render(<RecapScreen />);
  expect(shows('We couldn’t find this session.')).toBe(true);
  await press('See all workouts');
  expect(mockNavigate).toHaveBeenCalledWith('History');
});
