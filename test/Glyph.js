var noop = function() {};

describe('Glyph', function() {
	before(function() {
		plumin.setup({
			width: 1024,
			height: 1024
		});
	});

	describe('#contours', function() {
		it('should proxy #contours to its #children[0].children', function() {
			var glyph = new plumin.Glyph({
					name: 'A',
					_remove: noop,
					_setProject: noop,
					ot: { unicode: 'A'.charCodeAt(0) }
				});

			expect( glyph.contours ).to.equal( glyph.children[0].children );
		});

		it('should add contours to its #children[0].children', function() {
			var glyph = new plumin.Glyph({
					name: 'A',
					_remove: noop,
					_setProject: noop,
					ot: { unicode: 'A'.charCodeAt(0) }
				}),
				contour = new plumin.Path.Line({
					from: [ 20, 20 ],
					to: [ 80, 80 ]
				});

				expect( glyph.contours ).to.have.length( 0 );

				glyph.addContour( contour );

				expect( glyph.contours ).to.have.length( 1 );
				expect( glyph.contours[0] ).to.equal( contour );
		});

		it('should be able to combine the contours of a glyph', function() {
			var glyph = new plumin.Glyph({
					name: 'A',
					_remove: noop,
					_setProject: noop,
					ot: { unicode: 'A'.charCodeAt(0) }
				}),
				outline = new plumin.Outline(
					'M0,0 L100,0 L100,100 L0,100z' +
					'M50,50 L150,50, L150,150 L50,150z'
				);

				expect( glyph.contours ).to.have.length( 0 );

				glyph.addContour( outline );

				expect( glyph.contours ).to.have.length( 2 );

				var combined = glyph.combineTo( new plumin.Outline() );

				expect( combined.children ).to.have.length( 1 );

				combined = combined.children[0];

				expect(combined.nodes[0].x).to.equal(0);
				expect(combined.nodes[0].y).to.equal(0);

				expect(combined.nodes[1].x).to.equal(100);
				expect(combined.nodes[1].y).to.equal(0);

				expect(combined.nodes[2].x).to.equal(100);
				expect(combined.nodes[2].y).to.equal(50);

				expect(combined.nodes[3].x).to.equal(150);
				expect(combined.nodes[3].y).to.equal(50);

				expect(combined.nodes[4].x).to.equal(150);
				expect(combined.nodes[4].y).to.equal(150);

				expect(combined.nodes[5].x).to.equal(50);
				expect(combined.nodes[5].y).to.equal(150);

				expect(combined.nodes[6].x).to.equal(50);
				expect(combined.nodes[6].y).to.equal(100);

				expect(combined.nodes[7].x).to.equal(0);
				expect(combined.nodes[7].y).to.equal(100);
		});
	});

	describe('#components', function() {
		it('should proxy #components to its #children[1].children', function() {
			var glyph = new plumin.Glyph({
					name: 'A',
					_remove: noop,
					_setProject: noop,
					ot: { unicode: 'A'.charCodeAt(0) }
				});

			expect( glyph.components ).to.equal( glyph.children[1].children );
		});

		it('should add components to its #children[1].children', function() {
			var glyph = new plumin.Glyph({
					name: 'A',
					_remove: noop,
					_setProject: noop,
					ot: { unicode: 'A'.charCodeAt(0) }
				}),
				component = new plumin.Glyph({
					name: 'B',
					_remove: noop,
					_setProject: noop,
					ot: { unicode: 'B'.charCodeAt(0) }
				});

				expect( glyph.components ).to.have.length( 0 );

				glyph.addComponent( component );

				expect( glyph.components ).to.have.length( 1 );
				expect( glyph.components[0] ).to.equal( component );
		});
	});
});
