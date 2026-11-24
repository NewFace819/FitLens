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
