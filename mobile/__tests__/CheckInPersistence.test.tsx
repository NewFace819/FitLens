import React from 'react';
import Renderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import CheckInScreen from '../src/screens/check-in';
import {hydrate, KEYS, type Persistence} from '../src/shared/storage';
import {saveHistory, getReview} from '../src/modules/history/history';

jest.mock('../src/navigation', () => ({
  useAppNavigation: () => ({navigate: jest.fn()}),
  useAppRoute: () => ({params: {history:'hs-checkin'}}),
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
