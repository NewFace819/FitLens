import React from 'react';
import Renderer from 'react-test-renderer';
import { AppState, PermissionsAndroid } from 'react-native';
import { LiveCamera } from './LiveCamera';
import { NativePoseCamera } from './NativePoseCamera';
import { Button } from '../home/primitives';
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('./NativePoseCamera', () => {
  const React = require('react');
  return {
    hasNativePoseCamera: true,
    NativePoseCamera: (props: unknown) =>
      React.createElement('NativePoseTest', props),
  };
});
let tree: Renderer.ReactTestRenderer | undefined;
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  if (tree) Renderer.act(() => tree!.unmount());
  tree = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
async function mount() {
  await Renderer.act(async () => {
    tree = Renderer.create(
      <LiveCamera
        exerciseId="goblet-squat"
        onBack={jest.fn()}
        onFinish={jest.fn()}
      />,
    );
  });
}
test('permission denial never mounts the camera and retains an explicit enable action', async () => {
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
  jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  await mount();
  expect(tree!.root.findAllByType(NativePoseCamera)).toHaveLength(0);
  await Renderer.act(async () => {
    tree!.root.findByProps({ label: 'Enable camera' }).props.onPress();
  });
  expect(tree!.root.findAllByType(NativePoseCamera)).toHaveLength(0);
  expect(tree!.root.findByProps({ label: 'Enable camera' })).toBeDefined();
});
test('no-pose frames cannot enable Start; background stops capture', async () => {
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
  let change: (state: 'background') => void = () => {};
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      change = listener;
      return { remove: jest.fn() };
    });
  await mount();
  expect(tree!.root.findByType(NativePoseCamera).props.active).toBe(true);
  Renderer.act(() => {
    tree!.root
      .findByType(NativePoseCamera)
      .props.onPose({
        nativeEvent: { tMs: 100, width: 640, height: 480, landmarks: [] },
      });
  });
  const start = tree!.root
    .findAllByType(Button)
    .find(button => button.props.label === 'Start counting');
  expect(start!.props.disabled).toBe(true);
  Renderer.act(() => change('background'));
  expect(tree!.root.findByType(NativePoseCamera).props.active).toBe(false);
});
