module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/'], // Node's compiled-domain suite has its own runner.
  // Navigation, svg and storage ship untranspiled ESM; let Babel handle them.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|react-native-notify-kit)/)',
  ],
};
