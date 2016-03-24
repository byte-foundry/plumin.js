var path = require('path');

module.exports = {
	entry: [ './src/plumin.js' ],
	output: {
		path: path.join(__dirname, 'dist'),
		filename: 'plumin.js',
		library: 'plumin',
		libraryTarget: 'umd',
	},
	resolve: {
		alias: {
			'paper': 'paper/dist/paper-core.js',
		}
	},
	externals: [{
		'./node/window': true,
		'./node/extend': true,
	}],
	node: {
		Buffer: false,
	}
};
