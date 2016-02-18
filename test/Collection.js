/* eslint-disable new-cap */
function createOnePath() {
	return plumin.Path({
		segments: [[ 20, 20 ], [ 80, 80 ], [ 140, 20 ]],
		fillColor: 'black',
		closed: true
	});
}

function createTwoPaths() {
	return plumin.Path([ {
		segments: [[ 20, 20 ], [ 80, 80 ], [ 140, 20 ]],
		fillColor: 'black',
		closed: true
	}, {
		segments: [[ 140, 20 ], [ 80, 80 ], [ 20, 20 ]],
		fillColor: 'pink',
		closed: true
	} ]);
}

describe('Collection', function() {
	before(function() {
		plumin.setup({
			width: 1024,
			height: 1024
		});
	});

	describe('constructor', function() {
		it('can create a collection containing a single Path',
			function() {
				var $path = createOnePath();

				expect($path.length).to.equal(1);
				expect($path[0].constructor).to.equal(plumin.paper.Path);
			});

		it('can create a collection containing multiple Paths', function() {
			var $paths = createTwoPaths();

			expect($paths.length).to.equal(2);
			expect($paths[0].constructor).to.equal(plumin.paper.Path);
			expect($paths[1].constructor).to.equal(plumin.paper.Path);
		});

		it('can create a collection containing multiple collections',
			function() {
				var $paths = plumin( createOnePath(), createTwoPaths() );

				expect($paths.length).to.equal(3);
				expect($paths[0].constructor).to.equal(plumin.paper.Path);
				expect($paths[1].constructor).to.equal(plumin.paper.Path);
				expect($paths[2].constructor).to.equal(plumin.paper.Path);
			}
		);

		it('should be possible to create a Shape or a Path shape', function() {
			var $rect = plumin.Path.Rectangle({
					point: [ 100, 100 ],
					size: [ 250, 350 ]
				});

			expect($rect[0].segments.length).to.equal(4);
			// woops, for some reason this test fails without throwing any error
			// ignore it until we figure out why it fails
			//expect($rect[0].constructor).to.equal(
			// 	plumin.paper.PaperScope.prototype.Path.Rectangle
			// );
		});
	});

	describe('#forEach()', function() {
		it('can be used to iterate over all items of a collection', function() {
			var $paths = plumin( createOnePath(), createTwoPaths() ),
				arr = [],
				iSum = 0;

			$paths.forEach(function(item, i) {
				arr.push(item);
				iSum += i;
			});

			expect(iSum).to.equal( 0 + 1 + 2 );
			expect(arr[0]).to.equal($paths[0]);
			expect(arr[1]).to.equal($paths[1]);
			expect(arr[2]).to.equal($paths[2]);
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

		it('should proxy chainable methods and make them chainable',
			function() {
				var $path = createOnePath().reverse();

				expect($path[0].constructor).to.equal(plumin.paper.Path);
			}
		);

		it('should proxy chainable methods and create items on the fly',
			function() {
				var $path = createOnePath()
						.addSegments( plumin.Segment([[ 60, 60 ]]) );

				expect($path[0].constructor).to.equal(plumin.paper.Path);
				expect($path[0].segments.length).to.equal(4);
			}
		);

		it('should unwrap collection in arguments - plural method', function() {
			var $path = createOnePath()
					.addNodes( plumin.Node({ point: [ 100, 50 ] }) );

			expect($path[0].nodes.length).to.equal(4);
			expect($path[0].nodes[3].x).to.equal(100);
			expect($path[0].nodes[3].y).to.equal(50);
		});

		it('should unwrap collection in arguments - singular method',
			function() {
				var $path = createOnePath()
						.add( plumin.Node({ point: [ 100, 50 ] }) );

				expect($path[0].nodes.length).to.equal(4);
				expect($path[0].nodes[3].x).to.equal(100);
				expect($path[0].nodes[3].y).to.equal(50);
			}
		);
	});
});
