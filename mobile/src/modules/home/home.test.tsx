import React from 'react';
import { Text } from 'react-native';
import Renderer from 'react-test-renderer';
import Home from '../../screens/dev-hub';
import { hydrate, KEYS, write } from '../../shared/storage';
import { ensureSeeded } from '../../shared/seed';
import { toDateKey } from '../../shared/dates';
import { getWeekSchedule } from '../workouts/schedule';
import { weekStartOf } from '../../shared/dates';
import { saveActivity } from '../activity/activity';
import { startTraining } from '../training/session-model';
const mockNavigate = jest.fn();
jest.mock('../../navigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate }),
}));
beforeEach(async () => {
  await hydrate(null);
  ensureSeeded();
  mockNavigate.mockClear();
});
test('Home renders shared planned session and opens Workout with its session id', () => {
  const day = toDateKey(new Date());
  const template = getWeekSchedule(weekStartOf(day))[0];
  write(KEYS.sessions, [
    { ...template, id: 'ss-home', date: day, status: 'planned' },
  ]);
  let tree: Renderer.ReactTestRenderer;
  Renderer.act(() => {
    tree = Renderer.create(<Home />);
  });
  const button = tree!.root
    .findAllByType(Text)
    .find(node => node.props.children === 'Start workout');
  expect(button).toBeDefined();
  Renderer.act(() => {
    tree!.root.findByProps({ accessibilityLabel: 'Start workout' }).props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('Workout', { session: 'ss-home' });
  Renderer.act(() => tree!.unmount());
});
test('saved manual activity immediately appears on Home via shared subscription', () => {
  let tree: Renderer.ReactTestRenderer;
  Renderer.act(() => {
    tree = Renderer.create(<Home />);
  });
  Renderer.act(() => {
    saveActivity({
      id: 'ac-home',
      type: 'walk',
      name: 'Park walk',
      date: toDateKey(new Date()),
      durationSec: 900,
      distanceKm: 1,
      elevationM: null,
      note: '',
      effort: null,
      source: 'manual',
      at: new Date().toISOString(),
    });
  });
  expect(
    tree!.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Park walk'),
  ).toBe(true);
  Renderer.act(() => tree!.unmount());
});

test('Home has no week calendar and the start bar falls back to choosing a workout', () => {
  write(KEYS.sessions, []);
  let tree: Renderer.ReactTestRenderer;
  Renderer.act(() => {
    tree = Renderer.create(<Home />);
  });
  expect(tree!.root.findAllByProps({ accessibilityLabel: 'Previous week' })).toHaveLength(0);
  Renderer.act(() => {
    tree!.root.findByProps({ accessibilityLabel: 'Choose a workout' }).props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('Workouts');
  Renderer.act(() => tree!.unmount());
});
test('the start bar resumes an active workout before anything else', () => {
  const day = toDateKey(new Date());
  const template = getWeekSchedule(weekStartOf(day))[0];
  write(KEYS.sessions, [{ ...template, id: 'ss-home', date: day, status: 'planned' }]);
  const now = Date.now();
  const session = startTraining(
    { id: 'tr-home', workoutId: template.workoutId, sessionId: null, title: 'Test', plan: [{ exerciseId: 'push-up', setCount: 1, restSec: 0 }] },
    now,
  );
  write(KEYS.activeTraining, session);
  let tree: Renderer.ReactTestRenderer;
  Renderer.act(() => {
    tree = Renderer.create(<Home />);
  });
  Renderer.act(() => {
    tree!.root.findByProps({ accessibilityLabel: 'Resume workout' }).props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('Workout');
  Renderer.act(() => tree!.unmount());
});
