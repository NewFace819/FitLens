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
import { actOnSession, startTraining } from '../training/session-model';
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
    tree!.root.findByProps({ label: 'Start workout' }).props.onPress();
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

test('an unfinished workout replaces the scheduled one on the today card and resumes it', () => {
  const day = toDateKey(new Date());
  const template = getWeekSchedule(weekStartOf(day))[0];
  write(KEYS.sessions, [{ ...template, id: 'ss-home', date: day, status: 'planned' }]);
  const now = Date.now();
  let active = startTraining(
    {
      id: 'tr-home',
      workoutId: template.workoutId,
      sessionId: null,
      title: 'Evening push',
      plan: [{ exerciseId: 'push-up', setCount: 3, restSec: 0 }],
    },
    now,
  )!;
  active = actOnSession(active, { type: 'editSet', setIndex: 0, kg: 0, reps: 10 }, now);
  active = actOnSession(active, { type: 'completeSet', setIndex: 0 }, now);
  write(KEYS.activeTraining, active);

  let tree: Renderer.ReactTestRenderer;
  Renderer.act(() => {
    tree = Renderer.create(<Home />);
  });
  const shown = (text: string) =>
    tree!.root.findAllByType(Text).some(node => {
      const c = node.props.children;
      return (Array.isArray(c) ? c.join('') : String(c)).includes(text);
    });
  expect(shown('In progress')).toBe(true);
  expect(shown('Evening push')).toBe(true);
  expect(shown('1 of 3 sets done')).toBe(true);
  expect(shown('Also scheduled today')).toBe(true);
  expect(shown('Start workout')).toBe(false);
  Renderer.act(() => {
    tree!.root.findByProps({ label: 'Resume workout' }).props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('Workout');
  Renderer.act(() => tree!.unmount());
});
