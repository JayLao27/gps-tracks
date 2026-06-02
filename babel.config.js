// TODO: FUTURE COMPILER & BABEL ENHANCEMENTS:
// 1. Module Resolver Alias Settings: Configure `babel-plugin-module-resolver` explicitly to map root folders
//    (e.g., @/* to ./*) to ensure compilation compatibility across different bundlers.
// 2. Inline Environment Variables: Add `babel-plugin-transform-inline-environment-variables` to bake build-time
//    keys directly into the static assets when compiled for web.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [],
  };
};
