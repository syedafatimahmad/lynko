const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .pdf files as assets
config.resolver.assetExts.push('pdf');

module.exports = config;
