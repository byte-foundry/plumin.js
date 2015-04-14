var path = require('path'),
	gulp = require('gulp'),
	shelter = require('gulp-shelter');

shelter = shelter( gulp );

shelter({
	/* Variables */
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

	/* Fragments */
	_browserify: [
		'browserify src/${project}.js',
			'${browserifyArgs}',
			// we want a source map
			'--debug'
	],
	_uglify: [
		'uglifyjs dist/${project}.js',
			'-o dist/${project}.min.js',
			'--in-source-map dist/${project}.js.map',
			'--source-map dist/${project}.min.js.map'
	],
	// extract the source-map in its own file
	_exorcist: 'exorcist dist/${project}.js.map > dist/${project}.js',
	_dist: '${_browserify} | ${_exorcist} && ${_uglify}',
	_mocha: 'mocha test/*.js test/**.js --colors',
	_jscs: 'jscs src/**.js test/**.js',
	_eslint: 'eslint src/**.js test/**.js',
	_browsersync: 'browser-sync start --server --files "dist/*.js, index.html"',

	/* Tasks */
	watchify: {
		dsc: 'Update dist/plumin.js on source change',
		cmd: [ 'watchify src/${project}.js',
				'${browserifyArgs}',
				'-o dist/${project}.js',
				'--verbose'
		]
	},
	build: {
		dsc: 'Lint code, generate dist files and test them',
		cmd: '( ${_jscs} & ${_eslint} ) && ${_dist} && ${_mocha}'
	},
	serve: {
		dsc: 'Opens index.html and live-reload on changes',
		cmd: '${watchify} & ${_browsersync}'
	},
	test: {
		dsc: 'Build ${project}.js + map and test it',
		cmd: '${_browserify} | ${_exorcist} && ${_mocha}'
	},
	debug: {
		dsc: 'Debug ${project}.js using node-inspector ' +
				'(required as global module)',
		cmd: [ 'node-inspector --no-preload --web-port=8081',
				'& mocha --debug-brk -w test/*.js'
		]
	}
});
