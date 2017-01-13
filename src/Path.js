import {transform2D, add2D, subtract2D, mulScalar2D} from './util/linear.js';

/* Extend the Path prototype to add OpenType conversion
 * and alias *segments methods and properties to *nodes
 */
export default class Path {
	constructor(closed = false) {
		this.nodes = [];
		this.closed = closed;
	}

	addNode(node) {
		this.nodes.push(node);
	}

	addNodes(nodes) {
		this.nodes.push(...nodes);
	}

	insertNode(index, node) {
		this.nodes.splice(index, 0, node);
	}

	insertNodes(index, nodes) {
		this.nodes.splice(index, 0, ...nodes);
	}

	removeNode(index) {
		this.nodes.splice(index, 1);
	}

	removeNodes(start = 0, end) {
		this.nodes.splice(start, end);
	}

	moveTo(x, y) {
		this.nodes.push(new Node(
			{
				x,
				y,
			}
		));
	}

	lineTo(x, y) {
		this.nodes.push(new Node(
			{
				x,
				y,
			}
		));
	}

	curveTo({c1, c2, c3}) {
		this.nodes[this.nodes.length - 1].handleOut = c1;
		this.nodes.push(new Node(
			c3,
			c2,
		));
	}

	quadTo({c1, c2}) {
		const node = this.nodes[this.nodes.length - 1];

		node.handleOut = add2D(node.point, mulScalar2D(2 / 3, subtract2D(c1 - node.point)));

		this.nodes.push(new Node(
			c2,
			add2D(c2, mulScalar2D(2 / 3, subtract2D(c1 - c2))),
		));
	}

	closePath() {
		this.closed = true;
	}

	get firstNode() {
		return this.nodes[0];
	}

	get lastNode() {
		if (this.nodes.length > 0) {
			return this.nodes[this.nodes.length - 1];
		}
		else {
			return undefined;
		}
	}

	updateData(data, toSimple, toBezier, options = {reverse: false, matrix: [1, 0, 0, 1, 0, 0]}) {
		if (this.visible === false || this.curves.length === 0) {
			return data;
		}

		// prototypo needs to be able to change the direction of the updated data.
		const {reverse, matrix} = options;
		const curves = this.curves;
		const length = curves.length;
		const start = transform2D(
			matrix,
			curves[reverse ? length - 1 : 0][`point${ reverse ? 2 : 1}`],
		);


		data.commands.push(...toSimple(
			'M',
			Math.round(start.x) || 0,
			Math.round(start.y) || 0
		));

		for (let i = -1, l = curves.length; ++i < l;) {
			const curve = curves[reverse ? l - 1 - i : i];
			const end = transform2D(
				matrix,
				curve[`point${ reverse ? 1 : 2}`],
			);

			if (curve.isStraight()) {
				data.commands.push(...toSimple(
					'L',
					Math.round(end.x) || 0,
					Math.round(end.y) || 0,
				));

			}
			else {
				const ctrl1 = transform2D(
					matrix,
					{
							x: curve.point1.x + curve.handle1.x,
							y: curve.point1.y + curve.handle1.y,
					},
				);
				const ctrl2 = transform2D(
					matrix,
					{
						x: curve.point2.x + curve.handle2.x,
						y: curve.point2.y + curve.handle2.y,
					}
				);

				if (reverse) {
					data.commands.push(...toBezier(
						'C',
						Math.round(ctrl2.x) || 0,
						Math.round(ctrl2.y) || 0,
						Math.round(ctrl1.x) || 0,
						Math.round(ctrl1.y) || 0,
						Math.round(end.x) || 0,
						Math.round(end.y) || 0
					));
				}
				else {
					data.commands.push(...toBezier(
						'C',
						Math.round(ctrl1.x) || 0,
						Math.round(ctrl1.y) || 0,
						Math.round(ctrl2.x) || 0,
						Math.round(ctrl2.y) || 0,
						Math.round(end.x) || 0,
						Math.round(end.y) || 0
					));
				}
			}
		}

		if (this.closed) {
			data.commands.push(...toSimple('Z'));
		}

		return data;
	}

	updateOTCommands(data) {
		return this.updateData(
			data,
			function toSimple() {
				return [{
					type: arguments[0],
					x: arguments[1],
					y: arguments[2],
				}];
			},
			function toBezier() {
				return [{
					type: arguments[0],
					x1: arguments[1],
					y1: arguments[2],
					x2: arguments[3],
					y2: arguments[4],
					x: arguments[5],
					y: arguments[6],
				}];
			}
		);
	}

	updateSVGData(data) {
		return this.updateData(
			data,
			function toSimple() {
				return arguments;
			},
			function toBezier() {
				return arguments;
			}
		);
	}
}
