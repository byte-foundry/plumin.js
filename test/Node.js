describe('Node', function() {
	before(function() {
		plumin.setup({
			width: 1024,
			height: 1024
		});
	});

	describe('.x, .y', function() {
		it('should alias .point.x and .point.y to .x and .y', function() {
			var node = new plumin.Node({ point: [ 1, 2 ] });

			expect(node.x).to.equal(1);
			expect(node.y).to.equal(2);
		});
	});

});
