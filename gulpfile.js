var path = require('path'),
	gulp = require('gulp'),
	shell = require('gulp-shell'),
	browserify = require('browserify'),
	watchify = require('watchify'),
	exorcist = require('exorcist'),
	source = require('vinyl-source-stream');

function d( description, fn ) {
	fn.description = description;
	return fn;
}

function _browserify() {
	return browserify({
		entries: require.resolve('./src/plumin.js'),
		standalone: 'plumin',
		// we dont need to detect globals -> faster build
		detectGlobals: false,
		// we want a source-map
		debug: true,
		// don't parse big deps -> faster build, no need to derequire them
		noParse: [
			path.join(
				__dirname, 'node_modules/opentype.js/dist/opentype.js'
			),
			path.join(
				__dirname, 'node_modules/paper/dist/paper-core.js'
			)
		],
		// required by watchify
		cache: {},
		packageCache: {}
	});
}

function _bundle(b) {
	return b.bundle()
		.pipe(exorcist(path.join(__dirname, 'dist/plumin.js.map')))
		.pipe(source('plumin.js'))
		.pipe(gulp.dest('./dist'));
}

// low level tasks
gulp.task('mocha', d('Run unit tests using Mocha', shell.task([
	'mocha test/*.js --colors'
])));

gulp.task('jscs', d('Enforce coding style using jscs', shell.task([
	'jscs src/**.js'
])));

gulp.task('eslint', d('Lint code using eslint', shell.task([
	'eslint src/**.js'
])));

gulp.task('browserify', d('Build standalone plumin.js in dist/',
	function() {
		return _bundle( _browserify() );
	}
));

gulp.task('uglify', d('Minimize dist file using Uglify', shell.task([
	'uglifyjs dist/plumin.js ' +
		'-o dist/plumin.min.js ' +
		'--in-source-map dist/plumin.js.map ' +
		'--source-map dist/plumin.min.js.map '
])));

gulp.task('dist', d('Generate all dist files', shell.task([
	'gulp browserify && gulp uglify'
])));

gulp.task('watchify', d('Update dist/plumin.js on source change', function() {
	var b = _browserify();
	watchify(b).on('update', function() {
		console.log('[watchify] update');
		_bundle( b );
	});

	_bundle( b );
}));

gulp.task('browsersync', d('Live-reload using browsersync', shell.task([
	'browser-sync start --server --files "dist/*.js, index.html"'
])));

// high level tasks
gulp.task('build', d('Lint code, generate dist files and test them',
	shell.task([ 'gulp jscs && gulp eslint && gulp dist && gulp mocha' ])
));

gulp.task('serve', d('Opens index.html and live-reload on changes', shell.task([
	'gulp watchify & gulp browsersync'
])));

gulp.task('debug',
	d('Debug plumin.js using node-inspector (required as global module)',
		shell.task([
			'node-inspector --no-preload --web-port=8081 ' +
			'& mocha --debug-brk -w test/*.js'
		]))
);
