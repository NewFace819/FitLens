/**
 * #45: one safety notice, from one source of text, before a workout and next to every pain message.
 * (The end-of-onboarding placement is covered in src/screens/notifications-intro.test.tsx.)
 */
import React from 'react';
import Renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import CheckInScreen from '../src/screens/check-in';
import WorkoutScreen from '../src/screens/workout';
import { saveHistory } from '../src/modules/history/history';
import { getStore } from '../src/modules/workouts/store';
import { hydrate, KEYS, type Persistence } from '../src/shared/storage';
import { PAIN_ADVICE, SAFETY_NOTICE } from '../src/shared/safety';

// No @types/node in this project: type just what the scan below uses.
type Dirent = { name: string; isDirectory(): boolean };
const fs: { readdirSync(d: string, o: { withFileTypes: true }): Dirent[]; readFileSync(f: string, e: 'utf8'): string } = require('fs');
const path: { join(...p: string[]): string; relative(a: string, b: string): string } = require('path');
declare const process: { cwd(): string };

let mockParams: Record<string, unknown> | undefined;
jest.mock('../src/navigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), replace: jest.fn() }),
  useAppRoute: () => ({ params: mockParams }),
  goBackOrHome: jest.fn(),
  goHome: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }));
jest.mock('../src/ui/components', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    Screen: ({ children, footer }: any) => <View>{children}{footer}</View>,
    TopBar: ({ title }: any) => <Text>{title}</Text>,
    Divider: () => <View />,
    Button: ({ title, ...props }: any) => <Pressable {...props}><Text>{title}</Text></Pressable>,
    IconButton: ({ children, ...props }: any) => <Pressable {...props}>{children}</Pressable>,
    Chip: ({ label, ...props }: any) => <Pressable {...props}><Text>{label}</Text></Pressable>,
    Mascot: () => <View />,
    Sheet: ({ visible, title, children }: any) => (visible ? <View><Text>{title}</Text>{children}</View> : null),
  };
});

let app: ReactTestRenderer;
let disk: Map<string, string>;
let persistence: Persistence;
beforeEach(async () => {
  mockParams = undefined;
  disk = new Map();
  persistence = {
    loadAll: async () => [...disk],
    save: async (key, value) => { disk.set(key, value); },
    remove: async (keys) => { keys.forEach((k) => disk.delete(k)); },
  };
  await hydrate(persistence);
});
afterEach(async () => {
  await act(async () => app?.unmount());
});

const notices = () => app.root.findAll((n) => n.props.testID === 'safety-notice' && typeof n.type === 'string');
const text = () => JSON.stringify(app.toJSON());
const button = (title: string): ReactTestInstance =>
  app.root.findAll((n) => n.props.title === title && typeof n.props.onPress === 'function')[0];

test('the notice says it is general information, not medical advice', () => {
  expect(SAFETY_NOTICE).toBe('General fitness information, not medical advice. Stop if something hurts and check with a professional.');
});

test('workout: shown before starting, and again when the workout stops for pain', async () => {
  await act(async () => { app = Renderer.create(<WorkoutScreen />); });
  expect(text()).toContain('Start a workout');
  expect(notices()).toHaveLength(1);
  expect(text()).toContain(SAFETY_NOTICE);

  await act(async () => { await button(getStore().getWorkout('tpl-upper')!.title).props.onPress(); });
  expect(notices()).toHaveLength(0); // not repeated on every set
  // Saving the history fails, so the screen stays on the stopped workout and shows the pain message.
  const save = persistence.save;
  persistence.save = async (k, v) => { if (k === KEYS.history) throw Error('full'); await save(k, v); };
  await act(async () => { await button('Stop — I feel pain').props.onPress(); });
  expect(text()).toContain('Do not continue through pain.');
  expect(notices()).toHaveLength(1);
});

test('check-in: the pain message carries the notice', async () => {
  await saveHistory({ id: 'hs-pain', workoutId: 'tpl-upper', sessionId: null, date: '2026-11-19', durationSec: 30, stoppedByPain: true, sets: [{ exerciseId: 'push-up', kg: 0, reps: 8 }], completedAt: '2026-11-19T03:00:00.000Z' });
  mockParams = { history: 'hs-pain' };
  await act(async () => { app = Renderer.create(<CheckInScreen />); });
  expect(text()).toContain(PAIN_ADVICE);
  expect(notices()).toHaveLength(1);
});

test('check-in without pain shows no pain message', async () => {
  await saveHistory({ id: 'hs-ok', workoutId: 'tpl-upper', sessionId: null, date: '2026-11-19', durationSec: 30, stoppedByPain: false, sets: [{ exerciseId: 'push-up', kg: 0, reps: 8 }], completedAt: '2026-11-19T03:00:00.000Z' });
  mockParams = { history: 'hs-ok' };
  await act(async () => { app = Renderer.create(<CheckInScreen />); });
  expect(text()).not.toContain(PAIN_ADVICE);
  expect(notices()).toHaveLength(0);
});

test('one source: no screen writes its own copy of the wording, and none promises diagnosis, cure or results', () => {
  const root = path.join(process.cwd(), 'src'); // jest runs from mobile/
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
    }
  };
  walk(root);
  expect(files.length).toBeGreaterThan(50); // the scan really looked at the app
  expect(files).toContain(path.join(root, 'screens', 'check-in.tsx'));
  const own = path.join(root, 'shared', 'safety.ts');
  for (const f of files) {
    if (f === own) continue;
    const src = fs.readFileSync(f, 'utf8');
    expect({ file: path.relative(root, f), copy: src.includes('not medical advice') || src.includes('isn’t medical advice') }).toEqual({ file: path.relative(root, f), copy: false });
    expect({ file: path.relative(root, f), claim: /\b(guaranteed?|diagnos(e|is)|cures?|heals?)\b/i.test(src.replace(/HealthConnect|Health Connect/g, '')) }).toEqual({ file: path.relative(root, f), claim: false });
  }
});
