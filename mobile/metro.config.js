const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro to only look at the mobile directory and its own node_modules
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// 1. Force Metro to resolve "browser" or "react-native" fields first to pick up the correct Axios build
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'cjs', 'json', 'mjs'];
config.resolver.unstable_enablePackageExports = true; // Critical for axios v1.x+

// 2. Mock out Node.js modules that might still be requested by stray code
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    crypto: require.resolve('expo-crypto'),
    url: require.resolve('react-native-url-polyfill'),
};

module.exports = config;
