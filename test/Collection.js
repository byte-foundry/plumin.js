var expect = require('../node_modules/chai').expect,
	plumin = require('../src/plumin');

function createOnePath() {
	return new plumin.Collection(plumin.Path, {
		segments: [[20, 20], [80, 80], [140, 20]],
		fillColor: 'black',
		closed: true
	});
}

function createTwoPaths() {
	return new plumin.Collection(plumin.Path, [{
		segments: [[20, 20], [80, 80], [140, 20]],
		fillColor: 'black',
		closed: true
	}, {
		segments: [[140, 20], [80, 80], [20, 20]],
		fillColor: 'pink',
		closed: true
	}]);
}

describe('Collection', function() {
	before(function() {
		plumin.setup({
			width: 1024,
			height: 1024
		});
	});

	describe('constructor', function() {
		it('should be possible to create a collection through the plumin function', function() {
			var $path = plumin(plumin.Path, {
				segments: [[20, 20], [80, 80], [140, 20]],
				fillColor: 'black',
				closed: true
			});

			expect($path.length).to.equal(1);
			expect($path[0].constructor).to.equal(plumin.Path);
		});

		it('should be possible to create a collection containing a single Path', function() {
			var $path = createOnePath();

			expect($path.length).to.equal(1);
			expect($path[0].constructor).to.equal(plumin.Path);
		});

		it('should be possible to create a collection containing multiple Paths', function() {
			var $paths = createTwoPaths();

			expect($paths.length).to.equal(2);
			expect($paths[0].constructor).to.equal(plumin.Path);
			expect($paths[1].constructor).to.equal(plumin.Path);
		});
	});

	describe('#prop()', function() {
		it('can be used to get the value of an instance', function() {
			var $path = createOnePath();

			expect($path.prop('segments').length).to.equal(3);
		});

		it('can be used to set the value of all instances', function() {
			var $paths = createTwoPaths();

			$paths.prop('strokeColor', '#0000ff');

			expect($paths[0].strokeColor.toCSS(true)).to.equal('#0000ff');
			expect($paths[1].strokeColor.toCSS(true)).to.equal('#0000ff');
		});
	});

	describe('proxy methods', function() {
		it('should proxy non-chainable methods', function() {
			var $path = createOnePath();

			expect($path.isEmpty()).to.equal(false);
		});

		it('should proxy chainable methods and make them chainable /via @captainObvious', function() {
			var $path = createOnePath().reverse();

			expect($path[0].constructor).to.equal(plumin.Path);
		});

		it('should proxy chainable methods and create items on the fly', function() {
			var $path = createOnePath()
					.addSegments( plumin.Segment, [[60, 60]] );

			expect($path[0].constructor).to.equal(plumin.Path);
			expect($path[0].segments.length).to.equal(4);
		});
	});
});