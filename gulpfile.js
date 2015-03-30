var path = require('path'),
	gulp = require('gulp'),
	shelter = require('gulp-shelter');

shelter = shelter( gulp );

shelter({
	/* Fragments */
	project: 'plumin',
	browserifyArgs: [
		'--standalone ${project}',
		// don't parse big js -> faster build, no need to derequire
		'--noparse',
			path.resolve(
				'node_modules/opentype.js/dist/opentype.js'
			),
			path.resolve(
				'node_modules/paper/dist/paper-core.js'
			),
		// no need to detect globals -> faster build
		'--dg false'
	],
	_browserify: [
		'browserify src/${project}.js',
			'${browserifyArgs}',
			// we want a source map
			'--debug'
	],

	/* Tasks */
	browserify: {
		dsc: 'Build standalone ${project}.js in dist/',
		cmd: '${_browserify} > dist/${project}.js'
	},
	watchify: {
		dsc: 'Update dist/plumin.js on source change',
		cmd: [ 'watchify src/${project}.js',
				'${browserifyArgs}',
				'-o dist/${project}.js',
				'--verbose'
		]
	},
	exorcist: {
		dsc: 'Creates the initial source-map',
		cmd: 'exorcist dist/${project}.js.map > dist/${project}.js'
	},
	mocha: {
		dsc: 'Run unit tests using Mocha',
		cmd: 'mocha test/*.js test/**.js --colors'
	},
	jscs: {
		dsc: 'Enforce coding style using jscs',
		cmd: 'jscs src/**.js test/**.js'
	},
	eslint: {
		dsc: 'Lint code using eslint',
		cmd: 'eslint src/**.js test/**.js'
	},
	uglify: {
		dsc: 'Minimize dist file using Uglify',
		cmd: [ 'uglifyjs dist/${project}.js',
				'-o dist/${project}.min.js',
				'--in-source-map dist/${project}.js.map',
				'--source-map dist/${project}.min.js.map'
		]
	},
	dist: {
		dsc: 'Generate all dist files',
		cmd: '${_browserify} | ${exorcist} && ${uglify}'
	},
	build: {
		dsc: 'Lint code, generate dist files and test them',
		cmd: '( ${jscs} & ${eslint} ) && ${dist} && ${mocha}'
	},
	browsersync: {
		dsc: 'Live-reload using browsersync',
		cmd: 'browser-sync start --server --files "dist/*.js, index.html"'
	},
	serve: {
		dsc: 'Opens index.html and live-reload on changes',
		cmd: '${watchify} & ${browsersync}'
	},
	debug: {
		dsc: 'Debug ${project}.js using node-inspector ' +
				'(required as global module)',
		cmd: [ 'node-inspector --no-preload --web-port=8081',
				'& mocha --debug-brk -w test/*.js'
		]
	}
});
