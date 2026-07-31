const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships a wa-sqlite.wasm that Metro must treat as an asset
config.resolver.assetExts.push('wasm');

// expo-sqlite's web worker needs SharedArrayBuffer, which requires
// cross-origin isolation headers on every dev-server response
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  },
};

module.exports = config;
