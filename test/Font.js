/* @flow */
describe('Font', function() {
	describe('#glyphs', function() {
		it('should contain a .notdef glyph and have a style and familyName', function() {
			const font = new plumin.Font();

			expect(font.glyphs['.notdef'].name).to.equals('.notdef');
			expect(font.ot.familyName).to.not.equals(undefined);
			expect(font.ot.styleName).to.not.equals(undefined);
		});

		it('should let me create from a glyphMap, charMap, altMap', function() {
			const notdef = new plumin.Glyph({
				unicode: 0,
				name: '.notdef',
			});
			const a = new plumin.Glyph({
				unicode: 'a'.charCodeAt(0),
				name: 'a',
			});
			const b = new plumin.Glyph({
				unicode: 'b'.charCodeAt(0),
				name: 'b',
			});
			const glyphMap = {
				[notdef.ot.name]: notdef,
				[a.ot.name]: a,
				[b.ot.name]: b,
			};
			const charMap = {
				[notdef.ot.unicode.toString()]: notdef,
				[a.ot.unicode.toString()]: a,
				[b.ot.unicode.toString()]: b,
			};
			const altMap = {
				[notdef.ot.unicode]: [notdef],
				[a.ot.unicode]: [a],
				[b.ot.unicode]: [b],
			};
			const font = new plumin.Font({
				familyName: 'family',
				styleName: 'style',
				glyphMap,
				charMap,
				altMap,
			});

			expect(font.glyphMap).to.deep.equal(glyphMap);
			expect(font.charMap).to.deep.equal(charMap);
			expect(font.altMap).to.deep.equal(altMap);
			expect(font.ot.familyName).to.equals('family');
			expect(font.ot.styleName).to.equals('style');
		});
	});

	describe('#addGlyph', function() {
		it('should add a glyph to the glyphMap, charMap and altMap of the font',
			function() {
				let font = new plumin.Font();
				const expected = [
						`${0 }`,
						`${'A'.charCodeAt(0) }`,
						`${'B'.charCodeAt(0) }`,
						`${'C'.charCodeAt(0) }`,
					];

				font = font.addGlyph({
					name: 'A',
					ot: {unicode: 'A'.charCodeAt(0)},
				});
				font = font.addGlyph({
					name: 'B',
					ot: {unicode: 'B'.charCodeAt(0)},
				});
				font = font.addGlyph({
					name: 'C',
					ot: {unicode: 'C'.charCodeAt(0)},
				});

				expect(Object.keys(font.glyphMap)).to.deep.equal([
					'.notdef', 'A', 'B', 'C',
				]);
				expect(Object.keys(font.charMap)).to.deep.equal(expected);
				expect(Object.keys(font.altMap)).to.deep.equal(expected);
			}
		);

		it('should handle two glyphs sharing the same unicode', function() {
			let font = new plumin.Font();
			const code = 'A'.charCodeAt(0);
			const a = {
					name: 'A',
					ot: {unicode: code},
				};
			const aBis = {
					name: 'A bis',
					ot: {unicode: code},
				};
			const aTer = {
					name: 'A ter',
					ot: {unicode: code},
				};

			font = font.addGlyph(aTer);
			font = font.addGlyph(aBis);
			font = font.addGlyph(a);

			expect(Object.keys(font.glyphMap)).to.deep.equal([
				'.notdef', 'A ter', 'A bis', 'A',
			]);
			expect(font.charMap['A'.charCodeAt(0)]).to.equal(a);
			expect(font.altMap['A'.charCodeAt(0)]).to.deep.equal([
				aTer, aBis, a,
			]);
		});

		it('should add glyphs to the #children prop', function() {
			let font = new plumin.Font();
			const glyph = new plumin.Glyph({
					name: 'A',
				});

			// the font always has a .notdef glyph
			expect(Object.keys(font.glyphs)).to.have.length(1);
			expect(font.glyphs[Object.keys(font.glyphs)[0]]).to.equal(font.glyphMap['.notdef']);

			font = font.addGlyph(glyph);

			expect(Object.keys(font.glyphs)).to.have.length(2);
			expect(font.glyphs[glyph.name]).to.equal(glyph);

		});
	});

	describe('#subset', function() {
		it('should be possible to isolate some glyphs of the font', function() {
			let font = new plumin.Font();

			font = font.addGlyph({
				name: 'A',
				ot: {unicode: 'A'.charCodeAt(0)},
			});
			font = font.addGlyph({
				name: 'B',
				ot: {unicode: 'B'.charCodeAt(0)},
			});
			font = font.addGlyph({
				name: 'C',
				ot: {unicode: 'C'.charCodeAt(0)},
			});
			font = font.addGlyph({
				name: 'Zob',
				ot: {unicode: undefined},
			});
			let glyphs = font.glyphMap;

			// font.subset = true;
			//
			// expect( font.subset ).to.have.members([
			// 	glyphs['.notdef'],
			// 	glyphs.A,
			// 	glyphs.B,
			// 	glyphs.C,
			// 	glyphs.Zob
			// ]);

			font = font.setSubset('AB');

			expect(font.subset).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.B,
			]);

			font = font.setSubset([ 66, 67 ]);

			expect(font.subset).to.have.members([
				glyphs['.notdef'],
				glyphs.B,
				glyphs.C,
			]);

			font = font.setSubset();

			expect(font.subset).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.B,
				glyphs.C,
			]);

			font = font.setSubset('');

			expect(font.subset).to.have.members([ glyphs['.notdef'] ]);

			font = font.addGlyph({
				name: 'À',
				_base: 'A'.charCodeAt(0),
				ot: {unicode: 'À'.charCodeAt(0)},
			});
			glyphs = font.glyphMap;

			font = font.setSubset('ÀB');

			expect(font.subset).to.have.members([
				glyphs['.notdef'],
				glyphs.A,
				glyphs.À,
				glyphs.B,
			]);
		});
	});
});
