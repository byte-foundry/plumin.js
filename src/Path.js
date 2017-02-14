/* @flow */
import type {Point, Curve, Matrix, Size, Segment} from '../typedef/types.js.flow';

import {transform2D, add2D, subtract2D, mulScalar2D, arcToCubicBezier, PointC} from './util/linear.js';
import Node from './Node.js';


/* Extend the Path prototype to add OpenType conversion
 * and alias *segments methods and properties to *nodes
 */
export default class Path {
	nodes: Array<Node>;
	closed: boolean;
	visible: false;

	constructor({segments, svg, closed}: {segments?: Array<Segment>, svg?: string, closed?: boolean} = {segments: [], svg: undefined, closed: false}) {
		if (svg) {
			this.nodes = [];
			const regexp = /(([A-z])([^A-z]*))/g;
			const commands = [];
			let result = regexp.exec(svg);

			while (result) {
				commands.push(result);
				result = regexp.exec(svg);
			}

			commands.forEach(([, , name, coordsUntrimmed]) => {
				const coords = coordsUntrimmed.trim();

				switch (name.toUpperCase()) {
					case 'M': {
						const [x, y]: [number, number] = coords.split(/[,\s]+/).map(parseFloat);
						const tempPath: Path = this.moveTo(new PointC({x, y}));

						this.nodes = tempPath.nodes;
						return;
					}
					case 'L': {
						const [x, y] = coords.split(/[,\s]+/).map(parseFloat);
						const tempPath: Path = this.lineTo(new PointC({
							x,
							y,
						}));

						this.nodes = tempPath.nodes;
						return;
					}
					case 'Z': {
						const tempPath: Path = this.closePath();

						this.closed = tempPath.closed;
						this.nodes = tempPath.nodes;
						return;
					}
					case 'C': {
						const regexpCurve = /([0-9]+)[,\s]+([0-9]+)/g;
						const points = [];
						let resultCurve = regexpCurve.exec(coords);

						while (resultCurve) {
							points.push(resultCurve);
							resultCurve = regexpCurve.exec(coords);
						}

						const [c1, c2, c3] = points.map((item) => {
							const [x, y] = item[0].split(/[,\s]+/).map(parseFloat);

							return new PointC({
								x,
								y,
							});
						});
						const tempPath = this.curveTo({
							c1,
							c2,
							c3,
						});

						this.nodes = tempPath.nodes;
						return;
					}
					case 'Q': {
						const regexpCurve = /([0-9]+)[,\s]+([0-9]+)/g;
						const points = [];
						let resultCurve = regexpCurve.exec(coords);

						while (resultCurve) {
							points.push(resultCurve);
							resultCurve = regexpCurve.exec(coords);
						}

						const [c1, c2] = points.map((item) => {
							const [x, y] = item[0].split(/[,\s]+/).map(parseFloat);

							return new PointC({
								x,
								y,
							});
						});

						const tempPath = this.quadTo({
							c1,
							c2,
						});

						this.nodes = tempPath.nodes;
						return;
					}
					default: {
						return;
					}
				}
			});
		}
		else if (segments instanceof Array) {
			const nodes: Array<Node> = segments.map((segment): Node => {
				if (segment instanceof Node) {
					return segment;
				}
				else {
					return new Node(new PointC(segment));
				}
			});

			this.nodes = nodes;
			this.closed = closed || false;
		}
	}

	static Rectangle({point, size}: {point: Point, size: Size}) {
		const topLeft = point;
		const topRight = add2D(
			point,
			new PointC({
				x: size.width,
				y: 0,
			})
		);
		const bottomRight = add2D(
			point,
			new PointC({
				x: size.width,
				y: size.height,
			})
		);
		const bottomLeft = add2D(
			point,
			new PointC({
				x: 0,
				y: size.height,
			})
		);

		return new Path({
			segments: [topLeft, topRight, bottomRight, bottomLeft],
			closed: true,
		});
	}

	static RegularPolygon({center, radius, sides}: {center: Point, radius: number, sides: number}): Path {
		let result: Path = new Path({
			segments: [],
			closed: true,
		});
		const angleStep = 2 * Math.PI / sides;
		let angle = Math.PI / 2 - angleStep;
		let point = add2D(
			center,
			new PointC({
				x: 0,
				y: radius,
			})
		);

		result = result.moveTo(point);

		for (let i = 0; i < sides; i++) {
			angle += angleStep;
			point = add2D(
				center,
				new PointC({
					x: radius * Math.cos(angle),
					y: radius * Math.sin(angle),
				})
			);

			result = result.lineTo(point);
		}

		return result;
	}

	static Ellipse({center, size}: {center: Point, size: Size}) {
		let result = new Path({
			segments: [],
			closed: true,
		});
		let curves = [
			arcToCubicBezier(size.width, size.height, 0, 0.25),
			arcToCubicBezier(size.width, size.height, 0.25, 0.5),
			arcToCubicBezier(size.width, size.height, 0.5, 0.75),
			arcToCubicBezier(size.width, size.height, 0.75, 1),
		];

		if (size.height > size.width) {
			curves = curves.map((curve) => {
				return curve.map((item) => {
					const point = new Node(item);
					const {x, y} = point.rotate(90, center);

					return new PointC({
						x,
						y,
					});
				});
			});
		}

		result = result.moveTo(add2D(center, curves[0][0]));

		curves.forEach((curve) => {
			const [, c1, c2, c3] = curve;

			result = result.curveTo({
				c1: add2D(center, c1),
				c2: add2D(center, c2),
				c3: add2D(center, c3),
			});
		});

		return result;
	}

	addNode(node: Node): Path {
		const nodes = [...this.nodes];

		nodes.push(node);
		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	addNodes(nodes: Array<Node>): Path {
		const newNodes = [...this.nodes];

		nodes.push(...newNodes);
		return new Path({
			segments: newNodes,
			closed: this.closed,
		});
	}

	insertNode(index: number, node: Node): Path {
		const nodes = [...this.nodes];

		nodes.splice(index, 0, node);
		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	insertNodes(index: number, nodes: Array<Node>): Path {
		const newNodes = [...this.nodes];

		newNodes.splice(index, 0, ...nodes);
		return new Path({
			segments: newNodes,
			closed: this.closed,
		});
	}

	removeNode(index: number): Path {
		const nodes = [...this.nodes];

		nodes.splice(index, 1);
		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	removeNodes(start: number = 0, end: number): Path {
		const nodes = [...this.nodes];

		nodes.splice(start, end);
		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	moveTo(point: Point): Path {
		return this.addNode(new Node(point));
	}

	lineTo(point: Point): Path {
		return this.addNode(new Node(point));
	}

	curveTo({c1, c2, c3}: {c1: Point, c2: Point, c3: Point}): Path {
		const newPath = this.removeNode(this.nodes.length - 1);
		const nodes = [...newPath.nodes];

		if (this.lastNode) {
			const node = this.lastNode.set('handleOut', c1);

			nodes.push(node);
		}

		nodes.push(new Node(
			c3,
			c2,
		));

		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	quadTo({c1, c2}: {c1: Point, c2: Point}): Path {
		const newPath = this.removeNode(this.nodes.length - 1);
		const nodes = [...newPath.nodes];

		if (this.lastNode) {
			const node = this.lastNode.set('handleOut',
				add2D(this.lastNode._point,
					mulScalar2D(2 / 3,
						subtract2D(c1, this.lastNode._point))));

			nodes.push(node);
		}
		nodes.push(new Node(
			c2,
			add2D(c2, mulScalar2D(2 / 3, subtract2D(c1, c2))),
		));

		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	closePath(): Path {
		const nodes = [...this.nodes];

		return new Path({
			segments: nodes,
			closed: true,
		});
	}

	set firstNode(value: Node) {
		if (this.nodes[0]) {
			this.nodes[0] = value;
		}
		else {
			this.nodes.push(value);
		}
	}

	get firstNode(): ?Node {
		return this.nodes[0];
	}

	set lastNode(value: Node) {
		if (this.nodes.length > 0) {
			this.nodes[this.nodes.length - 1] = value;
		}
		else {
			this.nodes.push(value);
		}
	}

	get lastNode(): ?Node {
		if (this.nodes.length > 0) {
			return this.nodes[this.nodes.length - 1];
		}
		else {
			return undefined;
		}
	}

	get curves(): Array<Curve> {
		const curves: Array<Curve> = [];

		this.nodes.forEach((node, index) => {
			if (curves.length > 0) {
				curves[curves.length - 1].handle2 = node._handleIn;
				curves[curves.length - 1].point2 = node._point;
			}

			if (
				this.nodes.length - 1 > index
				|| (this.closed && this.nodes.length - 2 > index)
				|| (this.closed && (this.firstNode && this.lastNode && (this.firstNode.x !== this.lastNode.x || this.firstNode.y !== this.lastNode.y)))
			) {

				const newCurve: Curve = {
					point1: node._point,
					handle1: node._handleOut,
					handle2: null,
					point2: null,
				};

				if (this.firstNode && this.nodes.length - 1 === index && this.nodes[0]) {
					newCurve.handle2 = this.firstNode._handleIn;
					newCurve.point2 = this.firstNode._point;
				}

				curves.push(newCurve);
			}
		});

		return curves;
	}

	applyMatrix(matrix: Matrix): Path {
		const nodes = this.nodes.map((node) => {
			return node.applyMatrix(matrix);
		});

		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	rotate(theta: number, center?: Point) {
		const nodes = this.nodes.map((node) => {
			return node.rotate(theta, center);
		});

		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	translate(vector: Point) {
		const nodes = this.nodes.map((node) => {
			return node.translate(vector);
		});

		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	scale2D(vector: Point, center?: Point) {
		const nodes = this.nodes.map((node) => {
			return node.scale2D(vector, center);
		});

		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	scale(scale: number, center?: Point) {
		return this.scale2D(
			new PointC({
				x: scale,
				y: scale,
			}),
			center
		);
	}

	skew(vector: Point, center?: Point) {
		const nodes = this.nodes.map((node) => {
			return node.skew(vector, center);
		});

		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	orientation(): boolean {
		const points: Array<Point> = [];
		let count: number = 0;

		this.nodes.forEach((node) => {
			if (node._handleIn) {
				points.push(node._handleIn);
			}

			points.push(node._point);

			if (node._handleOut) {
				points.push(node._handleOut);
			}
		});

		points.forEach((point, index) => {
			const next = points[(index + 1) % points.length];

			count += (next.x - point.x) * (next.y + point.y);
		});

		return count < 0;
	}

	reverse(): Path {
		const nodes = [...this.nodes].reverse().map((node) => {
			return new Node(
				node._point,
				node._handleOut,
				node._handleIn
			);
		});


		return new Path({
			segments: nodes,
			closed: this.closed,
		});
	}

	updateData(data: {commands: Array<mixed>}, toSimple: Function, toBezier: Function, {reverse, matrix = [1, 0, 0, 1, 0, 0]}: {reverse: boolean, matrix: Matrix} = {reverse: false, matrix: [1, 0, 0, 1, 0, 0]}): {commands: Array<mixed>} {
		if (this.visible === false || this.curves.length === 0) {
			return data;
		}

		// prototypo needs to be able to change the direction of the updated data.
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
			const curve: Curve = curves[reverse ? l - 1 - i : i];
			const end = transform2D(
				matrix,
				curve[`point${ reverse ? 1 : 2}`],
			);

			if ((!curve.handle1 && !curve.handle2) || (curve.handle1 === null && curve.handle2 === null)) {
				data.commands.push(...toSimple(
					'L',
					Math.round(end.x) || 0,
					Math.round(end.y) || 0,
				));

			}
			else if (
				curve
				&& curve.handle1
				&& curve.handle2
			) {
				//to please flow
				const handle2: Point = curve.handle2;
				const ctrl1 = transform2D(
					matrix,
					curve.handle1,
				);
				const ctrl2 = transform2D(
					matrix,
					handle2,
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

	getOTCommands(data: {commands: Array<mixed>}) {
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

	getSVGData(data: {commands: Array<mixed>}) {
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

	interpolate(path: Path): Path {
		return path;
	}
}
