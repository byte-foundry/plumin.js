describe('Path', function() {
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
			openPath,
			circle;

		before(function() {
			closedPath = new plumin.Path({
				segments: [ [ 0, 0 ], [ 0, 100 ], [ 100, 100 ], [ 100, 0 ] ],
				closed: true
			});

			openPath = new plumin.Path({
				segments: [ [ 0, 0 ], [ 0, 100 ], [ 100, 100 ], [ 100, 0 ] ],
				closed: false
			});

			circle = new plumin.Path(
				'M 0 50 C 0 75 25 100 50 100 C 75 100 100 75 100 50 ' +
				'C 100 25 75 0 50 0 C 25 0 0 25 0 50 Z'
			);
		});

		it('should return an array with pseudo-svg commands - closed path',
			function() {
				var data = [],
					result = closedPath._updateData(
						data,
						function() {
							data.push.apply(data, arguments);
						},
						function() {
							data.push.apply(data, arguments);
						}
					);

				expect(result).to.deep.equal([
					'M', 0, 0,
					'L', 0, 100,
					'L', 100, 100,
					'L', 100, 0,
					'L', 0, 0,
					'Z'
				]);

			}
		);

		it('should return an array with pseudo-svg commands - open path',
			function() {
				var data = [],
					result = openPath._updateData(
						data,
						function() {
							data.push.apply(data, arguments);
						},
						function() {
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

		it('should return an array with pseudo-svg commands - circle',
			function() {
				var data = [],
					result = circle._updateData(
						data,
						function() {
							data.push.apply(data, arguments);
						},
						function() {
							data.push.apply(data, arguments);
						}
					);

				expect(result).to.deep.equal([
					'M', 0, 50,
					'C', 0, 75, 25, 100, 50, 100,
					'C', 75, 100, 100, 75, 100, 50,
					'C', 100, 25, 75, 0, 50, 0,
					'C', 25, 0, 0, 25, 0, 50,
					'Z'
				]);

			}
		);

		it('should return an array with pseudo-svg commands' +
			' - exportReversed circle',
			function() {
				circle.exportReversed = true;

				var data = [],
					result = circle._updateData(
						data,
						function() {
							data.push.apply(data, arguments);
						},
						function() {
							data.push.apply(data, arguments);
						}
					);

				expect(result).to.deep.equal([
					'M', 0, 50,
					'C', 0, 25, 25, 0, 50, 0,
					'C', 75, 0, 100, 25, 100, 50,
					'C', 100, 75, 75, 100, 50, 100,
					'C', 25, 100, 0, 75, 0, 50,
					'Z'
				]);

			}
		);
	});

});
