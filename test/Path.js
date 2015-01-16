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
		it('should add a glyph to the glyphMap, charMap and altMap of the font', function() {
			var rect = new plumin.Path.Rectangle({
					point: [0, -255],
					size: [100, 800]
				});

			expect( rect.nodes.length ).to.equal( 4 );
			expect( rect.firstNode ).to.equal( rect.nodes[0] );
			expect( rect.lastNode ).to.equal( rect.nodes[3] );
		});
	});

});