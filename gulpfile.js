var path = require('path'),
	gulp = require('gulp'),
	gutil = require('gulp-util'),
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
		detectGlobals: false,
		debug: true,
		standalone: 'plumin',
		noParse: [
			path.join(
				__dirname, 'node_modules/opentype.js/dist/opentype.js'
			),
			path.join(
				__dirname, 'node_modules/paper/dist/paper-core.js'
			)
		],
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

gulp.task('browserify', d('Build standalone plumin.js in dist/plumin.js',
	function() {
		return _bundle( _browserify() );
	}
));

gulp.task('uglify', d('Minimize dist file using Uglify', shell.task([
	'uglifyjs dist/plumin.js > dist/plumin.min.js'
])));

gulp.task('watchify', d('Update dist/plumin.js on source change',
	function() {
		var b = _browserify();
		watchify(b).on('update', function() {
			gutil.log('watchify:update');
			_bundle( b );
		});

		_bundle( b );
	}
));

// high level tasks
gulp.task('build', [ 'browserify', 'uglify' ],
	d('Build standalone plumin.js and plumins.min.js in dist', function(done) {
		return done();
	}
));

gulp.task('test', [ 'jscs', 'eslint', 'mocha' ],
	d('Lint + Unit tests', function(done) {
		return done();
	}
));

gulp.task('debug',
	d(
		'Debug prototypo.js using node-inspector (required as global module)',
		shell.task([
			'node-inspector --no-preload --web-port=8081 ' +
			'& mocha --debug-brk -w test/*.js'
		])
	)
);
