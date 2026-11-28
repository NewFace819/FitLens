/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-liquid-glassmorphism', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LiquidGlassView: (props) =>
      React.createElement(View, { testID: 'liquid-glass-view', ...props }),
    getGlassCapabilities: jest.fn(() => ({
      supported: true,
      tier: 'refraction',
      osVersion: 34,
      supportsNativeGlass: false,
      supportsBlur: true,
      supportsRefraction: true,
      supportsShapes: true,
    })),
    isLiquidGlassSupported: jest.fn(() => true),
    useGlassSupport: jest.fn(() => ({
      supported: true,
      tier: 'refraction',
      osVersion: 34,
      supportsNativeGlass: false,
      supportsBlur: true,
      supportsRefraction: true,
      supportsShapes: true,
    })),
  };
});

jest.mock('react-native-notify-kit', () => require('react-native-notify-kit/jest-mock'));

// The Android clock dialog is native. Tests set `nextTime` (or 'dismiss') before opening it.
jest.mock('@react-native-community/datetimepicker', () => {
  const picker = {
    nextTime: null,
    open: jest.fn(({ onChange }) => {
      if (picker.nextTime === 'dismiss' || !picker.nextTime) {
        onChange({ type: 'dismissed' }, undefined);
        return;
      }
      const [h, m] = picker.nextTime.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m, 0, 0);
      onChange({ type: 'set' }, date);
    }),
  };
  return { DateTimePickerAndroid: picker };
});
