/* @flow */
describe('Glyph', function() {
	describe('outlines', function() {
		it('adding outlines should generate a new Glyph instance', function() {
			const glyph = new plumin.Glyph({
					name: 'A',
					unicode: 'A'.charCodeAt(0),
				});

			const contour = new plumin.Outline({
					svg: 'M20 20 L80 80',
				});

			const newGlyph = glyph.addOutline(contour);

			expect(glyph).to.not.equals(newGlyph);
			expect(glyph.outlines).to.not.equals(newGlyph.outlines);
			expect(newGlyph.outlines).to.have.length(1);
			expect(newGlyph.outlines[0]).to.equals(contour);
		});

	});

	describe('components', function() {
		it('adding components should generate a new Glyph instance', function() {
			const glyph = new plumin.Glyph({
					name: 'A',
					unicode: 'A'.charCodeAt(0),
				});

			const contour = new plumin.Outline({
					svg: 'M20 20 L80 80',
				});

			const newGlyph = glyph.addComponent(contour);

			expect(glyph).to.not.equals(newGlyph);
			expect(glyph.components).to.not.equals(newGlyph.components);
			expect(newGlyph.components).to.have.length(1);
			expect(newGlyph.components[0]).to.equals(contour);
		});
	});

	describe('subset, advanceWidth and unicode', function() {
		it('it should generate new instance on set and have appropriate value', function() {
			const glyph = new plumin.Glyph({
					name: 'A',
					unicode: 'A'.charCodeAt(0),
				});

			const glyphSet = glyph.set('subset', 10);

			expect(glyph).to.not.equals(glyphSet);
			expect(glyphSet._base).to.equals(10);

			const glyphAdvanceWidth = glyphSet.set('advanceWidth', 200);

			expect(glyphAdvanceWidth).to.not.equals(glyphSet);
			expect(glyphAdvanceWidth.ot.advanceWidth).to.equals(200);
			expect(glyphAdvanceWidth._base).to.equals(10);

			const glyphUnicode = glyphAdvanceWidth.set('unicode', 65);

			expect(glyphAdvanceWidth).to.not.equals(glyphUnicode);
			expect(glyphUnicode._base).to.equals(10);
			expect(glyphUnicode.ot.advanceWidth).to.equals(200);
			expect(glyphUnicode.ot.unicode).to.equals(65);
		});

	});
});
