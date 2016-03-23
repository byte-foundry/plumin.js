describe('Node', function() {
	before(function() {
		plumin.setup({
			width: 1024,
			height: 1024
		});
	});

	describe('outline to path', function() {
		it('should combine its children into a single path', function() {
			var outline = new plumin.Outline(
				'M0,0 L100,0 L100,100 L0,100z' +
				'M50,50 L150,50, L150,150 L50,150z'
			);

			var combined = outline.combineTo();

			expect(combined.children.length).to.equal(1);

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

		it('should respect children direction during combination', function() {
			var outline = new plumin.Outline(
				'M0,0 L100,0 L100,100 L0,100z' +
				'M50,50 L50,150, L150,150 L150,50z'
			);

			var combined = outline.combineTo();

			expect(combined.children.length).to.equal(1);

			combined = combined.children[0];

			expect(combined.nodes[0].x).to.equal(0);
			expect(combined.nodes[0].y).to.equal(0);

			expect(combined.nodes[1].x).to.equal(100);
			expect(combined.nodes[1].y).to.equal(0);

			expect(combined.nodes[2].x).to.equal(100);
			expect(combined.nodes[2].y).to.equal(50);

			expect(combined.nodes[3].x).to.equal(50);
			expect(combined.nodes[3].y).to.equal(50);

			expect(combined.nodes[4].x).to.equal(50);
			expect(combined.nodes[4].y).to.equal(100);

			expect(combined.nodes[5].x).to.equal(0);
			expect(combined.nodes[5].y).to.equal(100);
		});

		it('should respect .exportReversed property', function() {
			var outline = new plumin.Outline(
				'M0,0 L100,0 L100,100 L0,100z' +
				'M50,50 L150,50, L150,150 L50,150z'
			);

			outline.children[1].exportReversed = true;

			var combined = outline.combineTo();

			expect(combined.children.length).to.equal(1);

			combined = combined.children[0];

			expect(combined.nodes[0].x).to.equal(0);
			expect(combined.nodes[0].y).to.equal(0);

			expect(combined.nodes[1].x).to.equal(100);
			expect(combined.nodes[1].y).to.equal(0);

			expect(combined.nodes[2].x).to.equal(100);
			expect(combined.nodes[2].y).to.equal(50);

			expect(combined.nodes[3].x).to.equal(50);
			expect(combined.nodes[3].y).to.equal(50);

			expect(combined.nodes[4].x).to.equal(50);
			expect(combined.nodes[4].y).to.equal(100);

			expect(combined.nodes[5].x).to.equal(0);
			expect(combined.nodes[5].y).to.equal(100);
		});

		it('should respect .exportReversed property', function() {
			var outline = new plumin.Outline(
				'M0,0 L100,0 L100,100 L0,100z' +
				'M50,50 L150,50, L150,150 L50,150z'
			);

			outline.children[1].exportReversed = true;

			var combined = outline.combineTo();

			expect(combined.children.length).to.equal(1);

			combined = combined.children[0];

			expect(combined.nodes[0].x).to.equal(0);
			expect(combined.nodes[0].y).to.equal(0);

			expect(combined.nodes[1].x).to.equal(100);
			expect(combined.nodes[1].y).to.equal(0);

			expect(combined.nodes[2].x).to.equal(100);
			expect(combined.nodes[2].y).to.equal(50);

			expect(combined.nodes[3].x).to.equal(50);
			expect(combined.nodes[3].y).to.equal(50);

			expect(combined.nodes[4].x).to.equal(50);
			expect(combined.nodes[4].y).to.equal(100);

			expect(combined.nodes[5].x).to.equal(0);
			expect(combined.nodes[5].y).to.equal(100);
		});

		it('should be able to combine a shape and a counter-shape', function() {
			var outline = new plumin.Outline(
				'M0,0 L100,0 L100,100 L0,100z' +
				'M25,25 L25,75 L75,75 L75,25z'
			);

			var combined = outline.combineTo();

			expect(combined.children).to.have.length(2);
			expect(combined.children[0].clockwise).to.be.true;
			expect(combined.children[1].clockwise).to.be.false;
		});
	});

});
