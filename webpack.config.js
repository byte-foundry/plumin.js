const path = require('path');

module.exports = {
	entry: './src/plumin.js',
	output: {
		path: path.join(__dirname, 'dist'),
		filename: 'plumin.js',
		library: 'plumin',
		libraryTarget: 'umd',
	},
	resolve: {
		alias: {
			'paper': 'paper/dist/paper-core.js',
		},
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				loaders: ['babel-loader?cacheDirectory'],
				include: [
					path.join(__dirname, 'src'),
				],
			},
		],
	},
	externals: [{
		'./node/window': true,
		'./node/extend': true,
	}],
	node: {
		Buffer: false,
	},
};
