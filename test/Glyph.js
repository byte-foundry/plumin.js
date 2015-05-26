var expect = require('../node_modules/chai').expect,
	plumin = require('../src/plumin');

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
