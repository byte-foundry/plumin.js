var expect = require('../node_modules/chai').expect,
	plumin = require('../src/plumin');

describe('Font', function() {
	before(function() {
		plumin.setup({
			width: 1024,
			height: 1024
		});
	});

	describe('nodes, firstNode, lastNode getters', function() {
		it('should add a glyph to the glyphMap, charMap and altMap of the font',
			function() {
				var rect = new plumin.Path.Rectangle({
						point: [ 0, -255 ],
						size: [ 100, 80 ]
					});

				expect( rect.nodes.length ).to.equal( 4 );
				expect( rect.firstNode ).to.equal( rect.nodes[0] );
				expect( rect.lastNode ).to.equal( rect.nodes[3] );
			}
		);
	});

	describe('#_updateData method', function() {
		var closedPath,
			openPath;

		before(function() {
			closedPath = new plumin.Path({
				segments: [ [ 0, 0 ], [ 0, 100 ], [ 100, 100 ], [ 100, 0 ] ],
				closed: true
			});

			openPath = new plumin.Path({
				segments: [ [ 0, 0 ], [ 0, 100 ], [ 100, 100 ], [ 100, 0 ] ],
				closed: false
			});
		});

		it('should return an array with pseudo-svg commands - closed path',
			function() {
				var data = [],
					result = closedPath._updateData(data,
						function() {
							data.push.apply(data, arguments);
						}, function() {
							data.push.apply(data, arguments);
						}
					);

				expect(result).to.deep.equal([
					'M', 0, 0,
					'L', 0, 100,
					'L', 100, 100,
					'L', 100, 0,
					'Z'
				]);

			}
		);

		it('should return an array with pseudo-svg commands - open path',
			function() {
				var data = [],
					result = openPath._updateData(data,
						function() {
							data.push.apply(data, arguments);
						}, function() {
							data.push.apply(data, arguments);
						}
					);

				expect(result).to.deep.equal([
					'M', 0, 0,
					'L', 0, 100,
					'L', 100, 100,
					'L', 100, 0
				]);

			}
		);
	});

});
