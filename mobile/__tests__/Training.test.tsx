import React from 'react';
import Renderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { getStore } from '../src/modules/workouts/store';
import TrainingScreen from '../src/screens/workout';
import { hydrate, KEYS, type Persistence } from '../src/shared/storage';
import { getHistory } from '../src/modules/history/history';
import { getActiveTraining } from '../src/modules/training/training-service';
import type { RootStackParamList } from '../src/shared/routes';
import { usePreventRemove } from '@react-navigation/native';
import { cameraTargetReps } from '../src/modules/training/camera-handoff';

const mockNav = { replace: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
let mockParams: RootStackParamList['Workout'];
jest.mock('../src/navigation', () => ({
  useAppNavigation: () => mockNav,
  useAppRoute: () => ({ params: mockParams }),
}));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }));
// Native visual primitives are mocked, but the screen, set editor, models,
// repositories and completion service are the actual implementations.
jest.mock('../src/ui/components', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    Screen: ({ children, footer }: any) => (
      <View>
        {children}
        {footer}
      </View>
    ),
    TopBar: ({ title }: any) => <Text>{title}</Text>,
    Divider: () => <View />,
    Button: ({ title, ...props }: any) => (
      <Pressable {...props}>
        <Text>{title}</Text>
      </Pressable>
    ),
    ListRow: ({ label, ...props }: any) => (
      <Pressable {...props}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

let app: ReactTestRenderer;
let disk: Map<string, string>;
let persistence: Persistence;
beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-19T03:00:00Z'));
  jest.clearAllMocks();
  mockParams = undefined;
  disk = new Map();
  persistence = {
    loadAll: async () => [...disk],
    save: async (key, value) => {
      disk.set(key, value);
    },
    remove: async keys => {
      keys.forEach(key => disk.delete(key));
    },
  };
  await hydrate(persistence);
  await act(async () => {
    app = Renderer.create(<TrainingScreen />);
  });
});
afterEach(async () => {
  await act(async () => app.unmount());
  jest.useRealTimers();
});

const button = (title: string): ReactTestInstance =>
  app.root.findAll(
    node =>
      node.props.title === title && typeof node.props.onPress === 'function',
  )[0];
const click = async (title: string) => {
  const target = button(title);
  expect(target).toBeDefined();
  expect(target.props.disabled).not.toBe(true);
  await act(async () => {
    await target.props.onPress();
  });
};
const enter = async (label: string, value: string) => {
  const input = app.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  )[0];
  await act(async () => {
    input.props.onChangeText(value);
  });
};

const reopenTraining = async (params?: RootStackParamList['Workout']) => {
  await act(async () => app.unmount());
  mockParams = params;
  await act(async () => { app = Renderer.create(<TrainingScreen />); });
};

test('records a set, pauses/resumes and navigates only after durable Finish', async () => {
  await click(getStore().getWorkout('tpl-upper')!.title);
  await enter('Set 1 weight in kg', '0');
  await enter('Set 1 repetitions', '10');
  await click('Complete set');
  expect(getActiveTraining()?.training.exercises[0].sets[0].done).toBe(true);
  await click('Pause');
  await act(async () => {
    jest.advanceTimersByTime(60000);
  });
  await click('Resume');
  await click('Finish workout');
  expect(getHistory()).toHaveLength(1);
  expect(getHistory()[0].sets).toEqual([
    { exerciseId: getStore().getWorkout('tpl-upper')!.items[0].exerciseId, kg: 0, reps: 10 },
  ]);
  expect(mockNav.replace).toHaveBeenCalledWith('CheckIn', {
    history: getHistory()[0].id,
    fromWorkout: true,
  });
  await hydrate(persistence);
  expect(getHistory()).toHaveLength(1);
  expect(getActiveTraining()).toBeNull();
});

test('failed Finish stays recoverable and Retry does not duplicate history', async () => {
  await click(getStore().getWorkout('tpl-upper')!.title);
  await enter('Set 1 weight in kg', '0');
  await enter('Set 1 repetitions', '8');
  await click('Complete set');
  const save = persistence.save;
  persistence.save = async (key, value) => {
    if (key === KEYS.history) throw Error('Device full');
    await save(key, value);
  };
  await click('Finish workout');
  expect(mockNav.replace).not.toHaveBeenCalled();
  expect(getActiveTraining()?.finishedAt).not.toBeNull();
  expect(getHistory()).toHaveLength(0);
  expect(button('Retry saving result')).toBeDefined();
  persistence.save = save;
  await click('Retry saving result');
  expect(getHistory()).toHaveLength(1);
  expect(mockNav.replace).toHaveBeenCalledTimes(1);
});

test('rapid edits and immediate pain stop preserve latest values while disk is delayed', async () => {
  await click(getStore().getWorkout('tpl-upper')!.title);
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const save = persistence.save;
  persistence.save = async (key, value) => {
    await gate;
    await save(key, value);
  };
  await enter('Set 1 weight in kg', '1');
  await enter('Set 1 weight in kg', '12');
  await enter('Set 1 repetitions', '9');
  await click('Complete set');
  await click('Stop — I feel pain');
  expect(mockNav.replace).not.toHaveBeenCalled();
  expect(getHistory()).toHaveLength(0);
  expect(usePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  await act(async () => {
    release();
  });
  expect(getHistory()[0].sets).toEqual([
    { exerciseId: getStore().getWorkout('tpl-upper')!.items[0].exerciseId, kg: 12, reps: 9 },
  ]);
  expect(getHistory()[0].stoppedByPain).toBe(true);
  expect(mockNav.replace).toHaveBeenCalledTimes(1);
});

test('reopening the screen restores a paused workout without counting background time', async () => {
  await click(getStore().getWorkout('tpl-upper')!.title);
  await enter('Set 1 weight in kg', '0');
  await enter('Set 1 repetitions', '10');
  await click('Complete set');
  await click('Pause');
  const paused = getActiveTraining();
  await act(async () => app.unmount());
  await hydrate(persistence);
  jest.setSystemTime(new Date('2026-11-19T03:30:00Z'));
  await act(async () => { app = Renderer.create(<TrainingScreen />); });
  expect(button('Resume')).toBeDefined();
  await click('Resume');
  expect(getActiveTraining()?.elapsedMs).toBe(paused?.elapsedMs);
  expect(getActiveTraining()?.restMs).toBe(paused?.restMs);
  expect(getActiveTraining()?.training.exercises[0].sets[0].done).toBe(true);
});

test('launching a different workout requires an explicit choice', async () => {
  await click('Upper Body');
  await enter('Set 1 weight in kg', '20');
  await enter('Set 1 repetitions', '10');
  await click('Complete set');

  await reopenTraining({ workout: 'tpl-lower' });
  expect(button('Undo set')).toBeUndefined();
  await click('Resume current workout');
  expect(button('Undo set')).toBeDefined();
  expect(getActiveTraining()?.workoutId).toBe('tpl-upper');

  await reopenTraining({ workout: 'tpl-lower' });
  await click('Discard and start selected workout');
  expect(getActiveTraining()?.workoutId).toBe('tpl-lower');
  expect(getHistory()).toHaveLength(0);
  expect(button('Resume current workout')).toBeUndefined();

  await click('Finish workout');
  await click('A fresh-air walk');
  expect(button('Complete set')).toBeDefined();
  expect(button('Resume current workout')).toBeUndefined();
});

test('timed walking records actual seconds and can reuse a previous duration', async () => {
  await click('A fresh-air walk');
  await enter('Set 1 duration', '5:60');
  expect(button('Complete set').props.disabled).toBe(true);
  await enter('Set 1 duration', '5:05');
  await click('Complete set');
  expect(getActiveTraining()?.training.exercises[0].sets[0]).toEqual({ durationSec: 305, done: true });
  await click('Finish workout');
  await hydrate(persistence);
  expect(getHistory()[0].sets).toEqual([{ exerciseId: 'easy-walking-warm-up', durationSec: 305 }]);
  expect(mockNav.replace).toHaveBeenCalledWith('CheckIn', { history: getHistory()[0].id, fromWorkout: true });

  await reopenTraining();
  await click('A fresh-air walk');
  await click('Use last time');
  expect(getActiveTraining()?.training.exercises[0].sets[0]).toEqual({ durationSec: 305, done: false });
});

// Camera hand-off (#32, #33). Camera returns with
// navigate({ name: 'Workout', params: { cameraReps }, merge: true }), which re-renders
// this same screen with new params; app.update() stands in for that here.
const cameraButtons = () =>
  app.root.findAll(
    node =>
      node.props.title === 'Count reps with camera' &&
      typeof node.props.onPress === 'function',
  );
const returnFromCamera = async (cameraReps: number) => {
  mockParams = { ...mockParams, cameraReps };
  await act(async () => { app.update(<TrainingScreen />); });
};

test('a set opens Camera, the returned count fills it, and the reps survive Finish and a restart', async () => {
  const lower = getStore().getWorkout('tpl-lower')!;
  await click(lower.title);
  const before = getActiveTraining()!;
  const exercise = before.training.exercises[0];
  await enter('Set 1 weight in kg', '20');

  expect(cameraButtons()).toHaveLength(exercise.sets.length);
  await act(async () => { cameraButtons()[0].props.onPress(); });
  const targetReps = cameraTargetReps(exercise.targetReps);
  expect(mockNav.navigate).toHaveBeenCalledWith('Camera', {
    exerciseId: exercise.exerciseId,
    ...(targetReps ? { targetReps } : {}),
  });

  await returnFromCamera(12);
  expect(mockNav.setParams).toHaveBeenCalledWith({ cameraReps: undefined });
  const after = getActiveTraining()!;
  // Same snapshot: same workout, same history ID, kg kept, set waits for the user.
  expect(after.id).toBe(before.id);
  expect(after.workoutId).toBe(lower.id);
  expect(after.training.exercises[0].sets[0]).toEqual({ kg: 20, reps: 12, done: false });
  const repsInput = app.root.findAll(
    node => node.props.accessibilityLabel === 'Set 1 repetitions' && typeof node.props.onChangeText === 'function',
  )[0];
  expect(repsInput.props.value).toBe('12');

  await click('Complete set');
  await click('Finish workout');
  await hydrate(persistence); // a restart reads history back from the device
  expect(getHistory()).toHaveLength(1);
  expect(getHistory()[0].sets).toEqual([{ exerciseId: exercise.exerciseId, kg: 20, reps: 12 }]);
  expect(mockNav.replace).toHaveBeenCalledWith('CheckIn', { history: getHistory()[0].id, fromWorkout: true });
});

test('a later set gets its own count, and a zero count leaves manual entry working', async () => {
  await click(getStore().getWorkout('tpl-lower')!.title);
  await enter('Set 1 weight in kg', '0');
  await enter('Set 1 repetitions', '10');
  await click('Complete set');
  // Done sets lose the camera button; the first remaining one is set 2.
  await act(async () => { cameraButtons()[0].props.onPress(); });
  await returnFromCamera(0);
  expect(app.root.findAll(node => node.props.children === 'The camera did not count any reps. Enter them by hand.')).not.toHaveLength(0);
  expect(getActiveTraining()!.training.exercises[0].sets[1]).toEqual({ kg: null, reps: null, done: false });

  mockParams = undefined;
  await act(async () => { app.update(<TrainingScreen />); });
  await act(async () => { cameraButtons()[0].props.onPress(); });
  await returnFromCamera(7);
  expect(getActiveTraining()!.training.exercises[0].sets[1]).toEqual({ kg: null, reps: 7, done: false });
  await enter('Set 2 weight in kg', '5');
  expect(getActiveTraining()!.training.exercises[0].sets[1]).toEqual({ kg: 5, reps: 7, done: false });
  expect(getActiveTraining()!.training.exercises[0].sets[0]).toEqual({ kg: 0, reps: 10, done: true });
});

test('timed sets do not offer the camera', async () => {
  await click('A fresh-air walk');
  expect(cameraButtons()).toHaveLength(0);
});

test('exercises the camera cannot count do not offer it, and manual entry still works', async () => {
  const upper = getStore().getWorkout('tpl-upper')!;
  expect(upper.items[0].exerciseId).toBe('bench-press');
  await click(upper.title);
  expect(cameraButtons()).toHaveLength(0);
  await enter('Set 1 weight in kg', '30');
  await enter('Set 1 repetitions', '8');
  await click('Complete set');
  expect(getActiveTraining()!.training.exercises[0].sets[0]).toEqual({ kg: 30, reps: 8, done: true });
});

test('paused workouts keep the camera button disabled', async () => {
  await click(getStore().getWorkout('tpl-lower')!.title);
  await click('Pause');
  expect(cameraButtons().every(node => node.props.disabled === true)).toBe(true);
});

test('opening Workout with a chosen workout starts it straight away', async () => {
  await reopenTraining({ workout: 'tpl-lower' });
  expect(getActiveTraining()?.workoutId).toBe('tpl-lower');
  expect(button('Start selected workout')).toBeUndefined();
  expect(button('Complete set')).toBeDefined();
});

test('the set timer restarts on Complete set while the total keeps running', async () => {
  await click(getStore().getWorkout('tpl-upper')!.title);
  await act(async () => { jest.advanceTimersByTime(90000); });
  const text = () => JSON.stringify(app.toJSON());
  expect(text()).toContain('This set 1:30');
  await enter('Set 1 weight in kg', '0');
  await enter('Set 1 repetitions', '10');
  await click('Complete set');
  await act(async () => { jest.advanceTimersByTime(20000); });
  expect(text()).toContain('This set 0:20');
  expect(text()).toContain('Total 1:50');
  expect(button('Skip rest')).toBeUndefined();
});

test('bad characters never reach a set field, and an invalid value clears on leaving it', async () => {
  await click(getStore().getWorkout('tpl-upper')!.title);
  const field = (label: string) =>
    app.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function')[0];
  await enter('Set 1 weight in kg', '-1,5kg');
  expect(field('Set 1 weight in kg').props.value).toBe('1.5');
  await enter('Set 1 repetitions', '-0');
  expect(field('Set 1 repetitions').props.value).toBe('0');
  await act(async () => { field('Set 1 repetitions').props.onEndEditing(); });
  expect(field('Set 1 repetitions').props.value).toBe('');
  expect(field('Set 1 weight in kg').props.value).toBe('1.5');
  expect(getActiveTraining()?.training.exercises[0].sets[0]).toEqual({ kg: 1.5, reps: null, done: false });
});
