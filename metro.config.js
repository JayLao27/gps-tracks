const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver = {
	...config.resolver,
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
