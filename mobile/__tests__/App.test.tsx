/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { ReactTestInstance } from 'react-test-renderer';
import App from '../App';
import { FakeBackend } from '../test-utils/fakeBackend';

// SafeAreaProvider draws nothing until the native side reports insets; use the library's test mock.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const TODAY = '2026-11-12'; // a Thursday in the week of 2026-11-09

const tick = () => new Promise<void>(r => setTimeout(() => r(), 5));

// The app loads saved data first, so wait until the tabs appear.
async function render(backend = new FakeBackend()) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App backend={backend} today={TODAY} />);
  });
  for (let i = 0; i < 400 && tree.root.findAllByProps({ testID: 'tab-workouts' }).length === 0; i++) {
    await ReactTestRenderer.act(tick);
  }
  return { tree, backend };
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

test('creating a workout shows it under "Your workouts" and saves it to the device', async () => {
  const { tree, backend } = await render();
  await ReactTestRenderer.act(async () => {
    byId(tree, 'workout-name').props.onChangeText('My Sunday session');
  });
  await press(tree, 'create-workout');
  expect(text(tree)).toContain('Your workouts');
  expect(text(tree)).toContain('My Sunday session');
  expect(byId(tree, 'workouts-status').props.children).toContain('Created');
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
