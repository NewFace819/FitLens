import React from 'react';
import Renderer from 'react-test-renderer';
import { CommonActions } from '@react-navigation/native';
import CameraScreen from './camera';
import { LiveCamera } from '../modules/camera/LiveCamera';
const mockDispatch = jest.fn();
const mockBack = jest.fn();
let mockRoutes = [
  { name: 'Workout', key: 'workout-existing' },
  { name: 'Camera', key: 'camera' },
];
jest.mock('../navigation', () => ({
  useAppNavigation: () => ({
    dispatch: mockDispatch,
    getState: () => ({ routes: mockRoutes }),
  }),
  useAppRoute: () => ({
    params: { exerciseId: 'goblet-squat', targetReps: 12 },
  }),
  goBackOrHome: () => mockBack(),
}));
jest.mock('../modules/camera/LiveCamera', () => ({ LiveCamera: () => null }));
let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  mockRoutes = [
    { name: 'Workout', key: 'workout-existing' },
    { name: 'Camera', key: 'camera' },
  ];
  Renderer.act(() => {
    tree = Renderer.create(<CameraScreen />);
  });
});
afterEach(() => Renderer.act(() => tree.unmount()));
test('Done returns the count to the existing Workout route without replacing its session params', () => {
  const camera = tree.root.findByType(LiveCamera);
  expect(camera.props.exerciseId).toBe('goblet-squat');
  expect(camera.props.targetReps).toBe(12);
  Renderer.act(() => camera.props.onFinish(12));
  expect(mockDispatch).toHaveBeenCalledWith({
    ...CommonActions.setParams({ cameraReps: 12 }),
    source: 'workout-existing',
  });
  expect(mockBack).toHaveBeenCalledTimes(1);
});
test('Back cancels without returning a count', () => {
  Renderer.act(() => tree.root.findByType(LiveCamera).props.onBack());
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalledTimes(1);
});
test('Done opened from Home never changes a Workout route', () => {
  mockRoutes = [
    { name: 'Home', key: 'home' },
    { name: 'Camera', key: 'camera' },
  ];
  Renderer.act(() => tree.root.findByType(LiveCamera).props.onFinish(12));
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalledTimes(1);
});
