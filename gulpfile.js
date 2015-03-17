var help = require('gulp-help'),
	gulp = require('gulp'),
	shell = require('gulp-shell');

var mocha,
	jscs,
	eslint,
	browserify,
	uglify;

// Adds a 'help' tak that lists all available tasks
gulp = help(gulp);

gulp.task('mocha', 'Run unit tests using Mocha', shell.task([
	mocha = 'mocha test/*.js --colors'
]));

gulp.task('jscs', 'Enforce coding style using jscs', shell.task([
	jscs = 'jscs src/**.js'
]));

gulp.task('eslint', 'Lint code using eslint', shell.task([
	eslint = 'eslint src/**.js'
]));

gulp.task('test', 'Lint + Unit tests', shell.task([
	jscs, eslint, mocha
]));

gulp.task('browserify', 'Build standalone plumin.js in dist/plumin.js',
	shell.task([ browserify =
		'browserify src/plumin.js --dg false --debug --standalone plumin ' +
		'| derequire | exorcist dist/plumin.js.map > dist/plumin.js'
	])
);

gulp.task('uglify', 'Minimize dist file using Uglify', shell.task([
	uglify = 'uglifyjs dist/plumin.js > dist/plumin.min.js'
]));

gulp.task('build', 'Build standalone plumin.js and plumins.min.js in dist/',
	shell.task([ browserify, uglify ])
);

gulp.task('watchify', 'Update dist/plumin.js on source change', shell.task([
	'watchify src/plumin.js --dg false --debug --standalone plumin ' +
	'-o dist/plumin.js -v'
]));
