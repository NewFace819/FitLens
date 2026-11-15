const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * The pure-JS models (workouts, schedule, drafts, shared enums) live in ../prototype and are
 * shared with the browser prototype so there is one source of truth. Metro must be allowed to
 * read that folder.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '../prototype')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
