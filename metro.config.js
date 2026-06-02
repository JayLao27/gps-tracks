// TODO: FUTURE BUNDLER & ASSET PIPELINE ENHANCEMENTS:
// 1. SVG Asset Transformer: Add `react-native-svg-transformer` settings to resolve and render .svg vectors
//    directly as React components rather than static files.
// 2. Production Console Stripping: Configure the Metro minifier (Terser/Hermes) to strip `console.log` statements
//    automatically during production release bundling to boost runtime performance.
// 3. Web Bundling Aliasing: Exclude native-only dependencies (e.g., expo-location background modules) from web builds
//    using conditional resolver aliases to minimize web bundle size.

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver = {
	...config.resolver,
	resolverMainFields: ['react-native', 'browser', 'main'],
	unstable_enablePackageExports: false,
	extraNodeModules: {
		...(config.resolver?.extraNodeModules || {}),
		stream: require.resolve('stream-browserify'),
		buffer: require.resolve('buffer'),
		util: require.resolve('util'),
		process: require.resolve('process/browser'),
	},
};

config.serializer = {
	...config.serializer,
	getModulesRunBeforeMainModule: () => [require.resolve('./polyfills')],
};

module.exports = withNativeWind(config, { input: './global.css' });
