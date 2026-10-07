const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.blockList = [
  /[/\\]\.npm-cache[/\\].*/,
  /[/\\]\.playwright[/\\].*/,
  /[/\\]scaffold[/\\].*/,
  /[/\\]test-results[/\\].*/,
];
config.resolver.useWatchman = false;
module.exports = config;
