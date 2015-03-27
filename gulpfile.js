var path = require('path'),
	gulp = require('gulp'),
	run = require('gulp-run'),
	shelter = require('gulp-shelter');

shelter = shelter( gulp, run );

console.log(path.resolve('node_modules/opentype.js/dist/opentype.js'))

shelter({
		project: 'plumin'
	}, {
		browserify: {
			dsc: 'Build standalone ${project}.js in dist/',
			cmd: [ 'browserify src/${project}.js',
					'--standalone ${project}',
					// don't parse big js -> faster build, no need to derequire
					'--no-parse',
						path.resolve(
							'node_modules/opentype.js/dist/opentype.js'
						),
						path.resolve(
							'node_modules/paper/dist/paper-core.js'
						),
					// no need to detect globals -> faster build
					'--dg false',
					// we want a source map
					'--debug'
			]
		},
		watchify: {
			dsc: 'Update dist/plumin.js on source change',
			cmd: [ 'watchify src/${project}.js',
					'--standalone ${projet}',
					'-o dist/${project}.js',
					// verbose
					'-v'
			]
		},
		exorcist: {
			dsc: 'Creates the initial source-map',
			cmd: 'exorcist ${project}.js.map > ${project}.js'
		},
		mocha: {
			dsc: 'Run unit tests using Mocha',
			cmd: 'mocha test/*.js test/**.js --colors > mocha.log'
		},
		jscs: {
			dsc: 'Enforce coding style using jscs',
			cmd: 'jscs src/**.js test/**.js > jscs.log'
		},
		eslint: {
			dsc: 'Lint code using eslint',
			cmd: 'eslint src/**.js test/**.js > eslint.log'
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
			cmd: '${browserify} | ${exorcist} && ${uglify}'
		},
		build: {
			dsc: 'Lint code, generate dist files and test them',
			cmd: 'parallelshell "${jscs}" "${eslint}" && ${dist} && ${mocha}'
		},
		browsersync: {
			dsc: 'Live-reload using browsersync',
			cmd: 'browser-sync start --server --files "dist/*.js, index.html"'
		},
		serve: {
			dsc: 'Opens index.html and live-reload on changes',
			cmd: 'parallelshell "${watchify}" "${browsersync}"'
		},
		debug: {
			dsc: 'Debug plumin.js using node-inspector ' +
					'(required as global module)',
			cmd: [ 'node-inspector --no-preload --web-port=8081',
					'& mocha --debug-brk -w test/*.js'
			]
		}
	}
);
