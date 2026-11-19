/**
 * UI tests for Hải's Workouts and Plan screens, on the app's shared storage (no device storage).
 * A tiny two-tab harness stands in for navigation so a test can move between the screens.
 * @format
 */

import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReactTestRenderer, { ReactTestInstance } from 'react-test-renderer';
import { getStore } from '../src/modules/workouts/store';
import PlanScreen from '../src/screens/PlanScreen';
import WorkoutsScreen from '../src/screens/WorkoutsScreen';
import { hydrate, localStorageView } from '../src/shared/storage';

const TODAY = '2026-11-12'; // a Thursday in the week of 2026-11-09

const tick = () => new Promise<void>(r => setTimeout(() => r(), 5));

function Harness({ today }: { today: string }) {
  const [tab, setTab] = useState<'workouts' | 'plan'>('workouts');
  return (
    <View>
      {tab === 'workouts' ? <WorkoutsScreen store={getStore()} /> : <PlanScreen store={getStore()} today={today} />}
      {(['workouts', 'plan'] as const).map(t => (
        <Pressable key={t} testID={`tab-${t}`} onPress={() => setTab(t)}>
          <Text>{t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** What is saved under a key (the raw `{v, data}` JSON), as the device would get it. */
const saved = { get: (key: string) => localStorageView.getItem(key) ?? undefined };

async function render() {
  await hydrate(null); // empty storage for every test
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Harness today={TODAY} />);
  });
  return { tree, backend: { data: saved } };
}
const byId = (tree: ReactTestRenderer.ReactTestRenderer, id: string): ReactTestInstance =>
  tree.root.findByProps({ testID: id });
const has = (tree: ReactTestRenderer.ReactTestRenderer, id: string) => tree.root.findAllByProps({ testID: id }).length > 0;
const press = async (tree: ReactTestRenderer.ReactTestRenderer, id: string) => {
  await ReactTestRenderer.act(async () => {
    byId(tree, id).props.onPress();
  });
};
const text = (tree: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

test('renders the Workouts tab with the routines', async () => {
  const { tree } = await render();
  expect(has(tree, 'tab-workouts')).toBe(true);
  expect(text(tree)).toContain('Upper Body');
  expect(text(tree)).toContain('Routines');
});

test('creating a workout opens it, lists it under "Your workouts" and saves it to the device', async () => {
  const { tree, backend } = await render();
  await ReactTestRenderer.act(async () => {
    byId(tree, 'workout-name').props.onChangeText('My Sunday session');
  });
  await press(tree, 'create-workout');
  expect(has(tree, 'add-exercise')).toBe(true); // now on the detail screen, ready to add exercises
  expect(text(tree)).toContain('My Sunday session');
  await press(tree, 'back');
  expect(text(tree)).toContain('Your workouts');
  await ReactTestRenderer.act(tick);
  expect(backend.data.get('fitlens.workouts')).toContain('My Sunday session');
});

test('an empty name is refused with a message', async () => {
  const { tree } = await render();
  await press(tree, 'create-workout');
  expect(byId(tree, 'workouts-status').props.children).toContain('name');
});

test('Plan tab: build a week, apply it, then mark one done and remove one', async () => {
  const { tree } = await render();
  await press(tree, 'tab-plan');
  expect(byId(tree, 'week-label').props.children).toBe('This week');

  await press(tree, 'build-week');
  await press(tree, 'preview-draft');
  // findAll sees both the component and the native element it renders; count native elements only
  expect(tree.root.findAll(n => n.props.testID === 'draft-row' && typeof n.type === 'string')).toHaveLength(3);
  await press(tree, 'apply-draft');
  expect(byId(tree, 'plan-status').props.children).toContain('Added 3 sessions');

  const sessionIds = tree.root
    .findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('session-') && typeof n.props.onPress === 'function')
    .map(n => n.props.testID as string);
  const unique = [...new Set(sessionIds)];
  expect(unique).toHaveLength(3);

  await press(tree, unique[0]);
  await press(tree, 'mark-done');
  expect(byId(tree, 'plan-status').props.children).toBe('Marked as done.');

  await press(tree, unique[1]);
  await press(tree, 'remove-session');
  expect([...new Set(tree.root.findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('session-') && typeof n.props.onPress === 'function').map(n => n.props.testID))]).toHaveLength(2);
});

test('Plan tab: avoiding every area gives a clear message and applies nothing', async () => {
  const { tree } = await render();
  await press(tree, 'tab-plan');
  await press(tree, 'build-week');
  for (const r of ['knees', 'back', 'wrists', 'shoulders', 'ankles', 'hips']) {
    await press(tree, `avoid-${r}`);
  }
  await press(tree, 'preview-draft');
  expect(has(tree, 'draft-empty')).toBe(true);
  expect(has(tree, 'apply-draft')).toBe(false);
});

test('Plan tab: week navigation and copying a week', async () => {
  const { tree } = await render();
  await press(tree, 'tab-plan');
  await press(tree, 'add-2026-11-10');
  await press(tree, 'pick-tpl-core');
  expect(byId(tree, 'plan-status').props.children).toContain('Added');
  await press(tree, 'copy-week');
  expect(byId(tree, 'plan-status').props.children).toContain('Copied 1 session');
  await press(tree, 'next-week');
  expect(byId(tree, 'week-label').props.children).toBe('Next week');
  expect(has(tree, 'day-2026-11-17')).toBe(true);
  await press(tree, 'prev-week');
  expect(byId(tree, 'week-label').props.children).toBe('This week');
});

const end = async (tree: ReactTestRenderer.ReactTestRenderer, id: string, value: string) => {
  await ReactTestRenderer.act(async () => {
    byId(tree, id).props.onEndEditing({ nativeEvent: { text: value } });
  });
};
const status = (tree: ReactTestRenderer.ReactTestRenderer) => byId(tree, 'detail-status').props.children;

test('editing a routine makes your own copy and leaves the routine untouched', async () => {
  const { tree, backend } = await render();
  await press(tree, 'workout-tpl-upper');
  expect(text(tree)).toContain('Changing a routine makes your own copy');
  await press(tree, 'sets-plus-0');
  expect(status(tree)).toContain('own copy');
  expect(byId(tree, 'sets-0').props.children).toBe(4); // bench press default is 3 sets
  await press(tree, 'back');
  const json = text(tree);
  expect(json).toContain('Your workouts');
  await ReactTestRenderer.act(tick);
  expect(backend.data.get('fitlens.workouts')).toContain('tpl-upper'); // basedOn
  // the routine itself still has 3 sets
  await press(tree, 'workout-tpl-upper');
  expect(byId(tree, 'sets-0').props.children).toBe(3);
});

test('detail: reps, order, add and remove exercises, rename', async () => {
  const { tree } = await render();
  await ReactTestRenderer.act(async () => {
    byId(tree, 'workout-name').props.onChangeText('Mine');
  });
  await press(tree, 'create-workout');
  await press(tree, 'add-exercise');
  await press(tree, 'exercise-goblet-squat');
  await press(tree, 'add-exercise');
  await press(tree, 'exercise-biceps-curl');
  expect(text(tree)).toContain('Goblet Squat');
  expect(text(tree)).toContain('Biceps Curl');

  await end(tree, 'reps-0', '15');
  expect(byId(tree, 'reps-0').props.defaultValue).toBe('15');

  await press(tree, 'down-0'); // squat moves below curl
  const order = (t: ReactTestRenderer.ReactTestRenderer) =>
    [text(t).indexOf('Goblet Squat'), text(t).indexOf('Biceps Curl')];
  expect(order(tree)[1]).toBeLessThan(order(tree)[0]);

  await press(tree, 'remove-0'); // removes the curl (now first)
  expect(text(tree)).not.toContain('Biceps Curl');
  expect(text(tree)).toContain('Goblet Squat');

  await end(tree, 'title-input', 'Mine renamed');
  expect(status(tree)).toBe('Renamed.');
});

test('detail: a workout on the plan cannot be deleted; after removing it from the plan it can', async () => {
  const { tree } = await render();
  await ReactTestRenderer.act(async () => {
    byId(tree, 'workout-name').props.onChangeText('Planned one');
  });
  await press(tree, 'create-workout');
  await press(tree, 'back');
  await press(tree, 'tab-plan');
  await press(tree, 'add-2026-11-10');
  const pickId = tree.root
    .findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('pick-wk-') && typeof n.type === 'string')
    .map(n => n.props.testID as string)[0];
  await press(tree, pickId);
  const sessionId = tree.root
    .findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('session-') && typeof n.type === 'string')
    .map(n => n.props.testID as string)[0];

  await press(tree, 'tab-workouts');
  await press(tree, pickId.replace('pick-', 'workout-'));
  await press(tree, 'delete-workout');
  expect(status(tree)).toContain('on your plan');

  await press(tree, 'back');
  await press(tree, 'tab-plan');
  await press(tree, sessionId);
  await press(tree, 'remove-session');
  await press(tree, 'tab-workouts');
  await press(tree, pickId.replace('pick-', 'workout-'));
  await press(tree, 'delete-workout');
  expect(byId(tree, 'workouts-status').props.children).toBe('Workout deleted.');
  expect(text(tree)).not.toContain('Planned one');
});

test('Plan: set a time and move a session to another day; a clash is refused', async () => {
  const { tree } = await render();
  await press(tree, 'tab-plan');
  const addOn = async (date: string) => {
    await press(tree, `add-${date}`);
    await press(tree, 'pick-tpl-core');
  };
  await addOn('2026-11-10');
  await addOn('2026-11-11');
  const ids = [...new Set(tree.root
    .findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('session-') && typeof n.type === 'string')
    .map(n => n.props.testID as string))];
  expect(ids).toHaveLength(2);

  await press(tree, ids[0]);
  await press(tree, 'hour-18');
  await press(tree, 'minute-30');
  await press(tree, 'save-session');
  expect(text(tree)).toContain('18:30 · ');

  await press(tree, ids[1]);
  await press(tree, 'day-chip-2026-11-10'); // same day as the first one
  await press(tree, 'hour-18');
  await press(tree, 'minute-30');
  await press(tree, 'save-session');
  expect(byId(tree, 'edit-error').props.children).toContain('already have a workout');

  await press(tree, 'minute-45'); // different time on that day is fine
  await press(tree, 'save-session');
  expect(text(tree)).toContain('18:45 · ');
  expect(byId(tree, 'plan-status').props.children).toBe('Saved.');
});
