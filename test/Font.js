var noop = function() {};

describe('Font', function() {
	before(function() {
		plumin.paper.install(window);
		plumin.paper.setup({
			width: 1024,
			height: 1024
		});
	});

	describe('#glyphs', function() {
		it('should proxy #glyphs prop to its #children prop', function() {
			var font = new plumin.Font();

			expect( font.glyphs ).to.equal( font.children );
		});
	});

	describe('#addGlyph', function() {
		it('should add a glyph to the glyphMap, charMap and altMap of the font',
			function() {
				var font = new plumin.Font(),
					expected = [
						0 + '',
						'A'.charCodeAt(0) + '',
						'B'.charCodeAt(0) + '',
						'C'.charCodeAt(0) + ''
					];

				font.addGlyph({
					name: 'A',
					_remove: noop,
					_setProject: noop,
					_getOwner: noop,
					ot: { unicode: 'A'.charCodeAt(0) }
				});
				font.addGlyph({
					name: 'B',
					_remove: noop,
					_setProject: noop,
					_getOwner: noop,
					ot: { unicode: 'B'.charCodeAt(0) }
				});
				font.addGlyph({
					name: 'C',
					_remove: noop,
					_setProject: noop,
					_getOwner: noop,
					ot: { unicode: 'C'.charCodeAt(0) }
				});

				expect(Object.keys( font.glyphMap )).to.deep.equal([
					'.notdef', 'A', 'B', 'C'
				]);
				expect(Object.keys( font.charMap )).to.deep.equal( expected );
				expect(Object.keys( font.altMap )).to.deep.equal( expected );
			}
		);

		it('should handle two glyphs sharing the same unicode', function() {
			var font = new plumin.Font(),
				code = 'A'.charCodeAt(0),
				a = {
					name: 'A',
					_remove: noop,
					_setProject: noop,
					_getOwner: noop,
					ot: { unicode: code }
				},
				aBis = {
					name: 'A bis',
					_remove: noop,
					_setProject: noop,
					_getOwner: noop,
					ot: { unicode: code }
				},
				aTer = {
					name: 'A ter',
					_remove: noop,
					_setProject: noop,
					_getOwner: noop,
					ot: { unicode: code }
				};

			font.addGlyph(aTer);
			font.addGlyph(aBis);
			font.addGlyph(a);

			expect(Object.keys( font.glyphMap )).to.deep.equal([
				'.notdef', 'A ter', 'A bis', 'A'
			]);
			expect( font.charMap['A'.charCodeAt(0)] ).to.equal( a );
			expect( font.altMap['A'.charCodeAt(0)] ).to.deep.equal([
				aTer, aBis, a
			]);
		});

		it('should add glyphs to the #children prop', function() {
			var font = new plumin.Font(),
				glyph = new plumin.Glyph({
					name: 'A',
					_remove: noop,
					_setProject: noop,
					_getOwner: noop
				});

			// the font always has a .notdef glyph
			expect( font.children ).to.have.length( 1 );
			expect( font.children[0] ).to.equal( font.glyphMap['.notdef'] );

			font.addGlyph( glyph );

			expect( font.children ).to.have.length( 2 );
			expect( font.children[1] ).to.equal( glyph );

		});
	});

	describe('#subset', function() {
		it('should be possible to isolate some glyphs of the font', function() {
			var font = new plumin.Font(),
				glyphs = font.glyphMap;

			font.addGlyph({
				name: 'A',
				_remove: noop,
				_setProject: noop,
				_getOwner: noop,
				ot: { unicode: 'A'.charCodeAt(0) }
			});
			font.addGlyph({
				name: 'B',
				_remove: noop,
				_setProject: noop,
				_getOwner: noop,
				ot: { unicode: 'B'.charCodeAt(0) }
			});
			font.addGlyph({
				name: 'C',
				_remove: noop,
				_setProject: noop,
				_getOwner: noop,
				ot: { unicode: 'C'.charCodeAt(0) }
			});
			font.addGlyph({
				name: 'Zob',
				_remove: noop,
				_setProject: noop,
				_getOwner: noop,
				ot: { unicode: undefined }
			});

			expect( font.subset ).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.B,
				glyphs.C
			]);

			// font.subset = true;
			//
			// expect( font.subset ).to.have.members([
			// 	glyphs['.notdef'],
			// 	glyphs.A,
			// 	glyphs.B,
			// 	glyphs.C,
			// 	glyphs.Zob
			// ]);

			font.subset = 'AB';

			expect( font.subset ).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.B
			]);

			font.subset = [ 66, 67 ];

			expect( font.subset ).to.have.members([
				glyphs['.notdef'],
				glyphs.B,
				glyphs.C
			]);

			font.subset = false;

			expect( font.subset ).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.B,
				glyphs.C
			]);

			font.subset = '';

			expect( font.subset ).to.have.members([ glyphs['.notdef'] ]);

			font.subset = [ glyphs.A, glyphs.B ];

			expect( font.subset ).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.B
			]);

			font.addGlyph({
				name: 'À',
				base: 'A'.charCodeAt(0),
				_remove: noop,
				_setProject: noop,
				_getOwner: noop,
				ot: { unicode: 'À'.charCodeAt(0) }
			});

			font.subset = 'ÀB';

			expect( font.subset ).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.À,
				glyphs.B
			]);
		});
	});
});
