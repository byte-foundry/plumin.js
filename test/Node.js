describe('Node', function() {
	describe('.x, .y', function() {
		it('should alias .point.x and .point.y to .x and .y', function() {
			const node = new plumin.Node({x: 1, y: 2});

			expect(node.x).to.equal(1);
			expect(node.y).to.equal(2);
		});
	});

});
