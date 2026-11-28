import React from 'react';
import {
  Platform,
  requireNativeComponent,
  UIManager,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import type { PoseFrame } from './camera-session';
type Props = ViewProps & {
  active: boolean;
  front: boolean;
  onPose: (event: NativeSyntheticEvent<PoseFrame>) => void;
  onCameraError: (
    event: NativeSyntheticEvent<{ code: string; message: string }>,
  ) => void;
};
const NativeView =
  Platform.OS === 'android' &&
  UIManager.getViewManagerConfig('FitLensPoseCamera')
    ? requireNativeComponent<Props>('FitLensPoseCamera')
    : null;
export const hasNativePoseCamera = !!NativeView;
export function NativePoseCamera(props: Props) {
  return NativeView ? <NativeView {...props} /> : null;
}
