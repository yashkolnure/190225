// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable bridgeless
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

module.exports = config;
