describe('Path', function() {
	describe('nodes, firstNode, lastNode getters', function() {
		it('should add a glyph to the glyphMap, charMap and altMap of the font',
			function() {
				const rect = plumin.Path.Rectangle({
						point: {x: 0, y: -255},
						size: {width: 100, height: 80},
					});

				expect(rect.nodes.length).to.equal(4);
				expect(rect.firstNode).to.equal(rect.nodes[0]);
				expect(rect.lastNode).to.equal(rect.nodes[3]);

				expect(rect.firstNode.x).to.equal(0);
				expect(rect.firstNode.y).to.equal(-255);

				expect(rect.nodes[1].x).to.equal(100);
				expect(rect.nodes[1].y).to.equal(-255);

				expect(rect.nodes[2].x).to.equal(100);
				expect(rect.nodes[2].y).to.equal(-175);

				expect(rect.lastNode.x).to.equal(0);
				expect(rect.lastNode.y).to.equal(-175);
			}
		);
	});

	describe('#_updateData method', function() {
		let closedPath;
		let openPath;
		let circle;

		before(function() {
			closedPath = new plumin.Path({
				segments: [ {x: 0, y: 0}, {x: 0, y: 100}, {x: 100, y: 100}, {x: 100, y: 0} ],
				closed: true,
			});

			openPath = new plumin.Path({
				segments: [ {x: 0, y: 0}, {x: 0, y: 100}, {x: 100, y: 100}, {x: 100, y: 0} ],
				closed: false,
			});

			circle = new plumin.Path({
				svg: 'M 0 50 C 0 75 25 100 50 100 C 75 100 100 75 100 50 '
				+ 'C 100 25 75 0 50 0 C 25 0 0 25 0 50 Z',
			});
		});

		it('should return an array with pseudo-svg commands - closed path',
			function() {
				const data = {
					commands: [],
				};
				const result = closedPath.updateData(
						data,
						function() {
							return data.commands.push(...arguments);
						},
						function() {
							return data.commands.push(...arguments);
						}
					);

				expect(result.commands).to.deep.equal([
					'M', 0, 0,
					'L', 0, 100,
					'L', 100, 100,
					'L', 100, 0,
					'L', 0, 0,
					'Z',
				]);

			}
		);

		it('should return an array with pseudo-svg commands - open path',
			function() {
				const data = {
					commands: [],
				};
				const result = openPath.updateData(
						data,
						function() {
							return data.commands.push(...arguments);
						},
						function() {
							return data.commands.push(...arguments);
						}
					);

				expect(result.commands).to.deep.equal([
					'M', 0, 0,
					'L', 0, 100,
					'L', 100, 100,
					'L', 100, 0,
				]);

			}
		);

		it('should return an array with pseudo-svg commands - circle',
			function() {
				const data = {
					commands: [],
				};
				const result = circle.updateData(
						data,
						function() {
							return data.commands.push(...arguments);
						},
						function() {
							return data.commands.push(...arguments);
						}
					);

				expect(result.commands).to.deep.equal([
					'M', 0, 50,
					'C', 0, 75, 25, 100, 50, 100,
					'C', 75, 100, 100, 75, 100, 50,
					'C', 100, 25, 75, 0, 50, 0,
					'C', 25, 0, 0, 25, 0, 50,
					'Z',
				]);

			}
		);

		it('should return an array with pseudo-svg commands'
			+ ' - exportReversed circle',
			function() {
				const data = {
					commands: [],
				};
				const result = circle.updateData(
						data,
						function() {
							return data.commands.push(...arguments);
						},
						function() {
							return data.commands.push(...arguments);
						},
						{
							reverse: true,
						}
					);

				expect(result.commands).to.deep.equal([
					'M', 0, 50,
					'C', 0, 25, 25, 0, 50, 0,
					'C', 75, 0, 100, 25, 100, 50,
					'C', 100, 75, 75, 100, 50, 100,
					'C', 25, 100, 0, 75, 0, 50,
					'Z',
				]);

			}
		);
	});

});
