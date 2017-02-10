describe('Outline', function() {
	describe('outline to path', function() {
		it('should accept SVG path data as an argument', function() {
			const outline = new plumin.Outline({
				svg: 'M0,0 L100,0 L100,100 L0,100z',
			});

			expect(outline.children.length).to.equal(1);

			const path = outline.children[0];

			expect(path.nodes.length).to.equal(4);

			expect(path.nodes[0].x).to.equal(0);
			expect(path.nodes[0].y).to.equal(0);

			expect(path.nodes[1].x).to.equal(100);
			expect(path.nodes[1].y).to.equal(0);

			expect(path.nodes[2].x).to.equal(100);
			expect(path.nodes[2].y).to.equal(100);

			expect(path.nodes[3].x).to.equal(0);
			expect(path.nodes[3].y).to.equal(100);

			expect(path.closed).to.equal(true);
		});
	});

});
