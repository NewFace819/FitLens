import React from 'react';
import Renderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import CheckInScreen from '../src/screens/check-in';
import {hydrate, KEYS, type Persistence} from '../src/shared/storage';
import {saveHistory, getReview} from '../src/modules/history/history';
import {getCheckInContext} from '../src/modules/checkin/checkin';
import {actOnSession} from '../src/modules/training/session-model';
import {beginWorkout, completeWorkout} from '../src/modules/training/training-service';
import {REGION_LABELS} from '../src/shared/constants';

const mockReplace = jest.fn();
let mockFromWorkout = false;
let mockHistoryId = 'hs-checkin';

jest.mock('../src/navigation', () => ({
  useAppNavigation: () => ({navigate: jest.fn(), replace: mockReplace}),
  useAppRoute: () => ({params: {history:mockHistoryId, fromWorkout:mockFromWorkout}}),
  goHome: jest.fn(), goBackOrHome: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({usePreventRemove: jest.fn()}));
jest.mock('../src/ui/components', () => {
  const {View,Text,Pressable}=require('react-native');
  return {
    Screen: ({children,footer}:any)=><View>{children}{footer}</View>,
    Button: ({title,...props}:any)=><Pressable {...props}><Text>{title}</Text></Pressable>,
    IconButton: ({children,...props}:any)=><Pressable {...props}>{children}</Pressable>,
    Chip: ({label,...props}:any)=><Pressable {...props}><Text>{label}</Text></Pressable>,
    Divider: ()=><View />,
    Mascot: ()=><View />,
    Sheet: ({visible,title,children}:any)=>visible?<View><Text>{title}</Text>{children}</View>:null,
  };
});
let app:ReactTestRenderer;
let persistence:Persistence;
beforeEach(async()=>{
  mockHistoryId = 'hs-checkin';
  const disk=new Map<string,string>();
  persistence={loadAll:async()=>[...disk],save:async(k,v)=>{disk.set(k,v);},remove:async()=>{}};
  await hydrate(persistence);
  await saveHistory({id:'hs-checkin',workoutId:'tpl-upper',sessionId:null,date:'2026-11-19',durationSec:30,stoppedByPain:false,sets:[{exerciseId:'push-up',kg:0,reps:8}],completedAt:'2026-11-19T03:00:00.000Z'});
  await act(async()=>{app=Renderer.create(<CheckInScreen />);});
});
afterEach(async()=>{await act(async()=>app.unmount());});
const saveButton=()=>app.root.findAll(n=>n.props.title==='Finish check-in'&&typeof n.props.onPress==='function')[0];
const success=()=>JSON.stringify(app.toJSON()).includes('A moment well spent.');

test('success sheet opens only after the device acknowledges the review',async()=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});const save=persistence.save;
  persistence.save=async(k,v)=>{if(k===KEYS.reviews)await gate;await save(k,v);};
  await act(async()=>{saveButton().props.onPress();});
  expect(success()).toBe(false);expect(getReview('hs-checkin')).toBeNull();
  const saving=app.root.findAll(n=>n.props.title==='Saving…'&&typeof n.props.onPress==='function')[0];
  expect(saving.props.disabled).toBe(true);
  await act(async()=>{release();});
  expect(success()).toBe(true);expect(getReview('hs-checkin')).not.toBeNull();
});

test('failed save shows retryable error and never opens the success sheet',async()=>{
  const save=persistence.save;
  persistence.save=async(k,v)=>{if(k===KEYS.reviews)throw Error('full');await save(k,v);};
  await act(async()=>{await saveButton().props.onPress();});
  expect(success()).toBe(false);expect(getReview('hs-checkin')).toBeNull();
  expect(JSON.stringify(app.toJSON())).toContain('Couldn’t save your check-in. Please try again.');
  persistence.save=save;
  await act(async()=>{await saveButton().props.onPress();});
  expect(success()).toBe(true);
});

test('a check-in opened by Workout links to the recap of the saved session', async () => {
  mockFromWorkout = true;
  try {
    await act(async () => { app.update(<CheckInScreen />); });
    await act(async () => { await saveButton().props.onPress(); });
    expect(getReview('hs-checkin')).not.toBeNull();

    const recap = app.root.findAll(
      node => node.props.title === 'View recap' && typeof node.props.onPress === 'function',
    )[0];
    await act(async () => { recap.props.onPress(); });
    expect(mockReplace).toHaveBeenCalledWith('Recap', { history: 'hs-checkin' });
  } finally {
    mockFromWorkout = false;
  }
});

test('a pain stop offers the unfinished exercise for body notes without counting it as performed', async () => {
  const now = Date.parse('2026-11-19T03:00:00.000Z');
  let workout = await beginWorkout({ workout: 'tpl-upper' }, 0, now);
  workout = actOnSession(workout, { type: 'editSet', setIndex: 0, kg: 10, reps: 8 }, now + 1000);
  workout = actOnSession(workout, { type: 'completeSet', setIndex: 0 }, now + 2000);
  workout = actOnSession(workout, { type: 'nextExercise' }, now + 3000);
  const performedId = workout.training.exercises[0].exerciseId;
  const stoppedId = workout.training.exercises[1].exerciseId;
  const stopped = actOnSession(workout, { type: 'stopByPain' }, now + 4000);
  await completeWorkout(stopped);
  await hydrate(persistence);

  const ctx = getCheckInContext(stopped.id)!;
  expect(ctx.entry.stoppedExerciseId).toBe(stoppedId);
  expect(ctx.setCount).toBe(1);
  expect(ctx.exercises.map(exercise => exercise.id)).toEqual([performedId]);
  expect(ctx.discomfortExercises.map(exercise => exercise.id)).toEqual([performedId, stoppedId]);

  mockHistoryId = stopped.id;
  await act(async () => { app.update(<CheckInScreen />); });
  const bodyPrompt = app.root.findAll(node =>
    typeof node.props.onPress === 'function' &&
    node.findAllByProps({ children: 'Anything feeling uncomfortable?' }).length > 0,
  )[0];
  const chip = (label: string) => app.root.findAllByProps({ label })[0];
  await act(async () => { bodyPrompt.props.onPress(); });
  await act(async () => { chip(REGION_LABELS.shoulders).props.onPress(); });
  await act(async () => { chip('Pain').props.onPress(); });
  const stoppedExercise = chip(ctx.discomfortExercises[1].name);
  expect(stoppedExercise.props.selected).toBe(false);
  await act(async () => { stoppedExercise.props.onPress(); });
  await act(async () => { await saveButton().props.onPress(); });
  expect(getReview(stopped.id)?.discomfort).toEqual([
    { region: 'shoulders', sensation: 'pain', exerciseId: stoppedId },
  ]);
});
