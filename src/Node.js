/* @flow */
import type {Point, Matrix, NodeLabel, NodeValue} from '../typedef/types.js.flow';

import {transform2D, PointC, matrixMul} from './util/linear.js';

export default class Node {
	_point: Point;
	_handleIn: ?Point;
	_handleOut: ?Point;

	constructor(point: Point, handleIn: ?Point, handleOut: ?Point) {
		this._point = point;
		this._handleIn = handleIn;
		this._handleOut = handleOut;
	}

	set(label: NodeLabel, value: NodeValue): Node {
		switch (label) {
			case 'x': {
				if (typeof value === 'number') {
					return new Node(
						this._point.merge({x: value}),
						this._handleIn,
						this._handleOut,
					);
				}
				else {
					throw new Error('Cannot affect Point to x');
				}
			}
			case 'y': {
				if (typeof value === 'number') {
					return new Node(
						this._point.merge({y: value}),
						this._handleIn,
						this._handleOut,
					);
				}
				else {
					throw new Error('Cannot affect Point to y');
				}
			}
			case 'point': {
				if (value instanceof PointC) {
					return new Node(
						value,
						this._handleIn,
						this._handleOut,
					);
				}
				else {
					throw new Error('Cannot affect number to point');
				}
			}
			case 'handleIn': {
				if (value instanceof PointC) {
					return new Node(
						this._point,
						value,
						this._handleOut,
					);
				}
				else {
					throw new Error('Cannot affect number to handleIn');
				}
			}
			case 'handleOut': {
				if (value instanceof PointC) {
					return new Node(
						this._point,
						this._handleIn,
						value,
					);
				}
				else {
					throw new Error('Cannot affect number to handleOut');
				}
			}
			default: {
				return this;
			}
		}
	}

	get x(): number {
		return this._point.x;
	}

	get y(): number {
		return this._point.y;
	}

	applyMatrix(matrix: Matrix): Node {
		const point = transform2D(matrix, this._point);
		const handleIn = this._handleIn ? transform2D(matrix, this._handleIn) : null;
		const handleOut = this._handleOut ? transform2D(matrix, this._handleOut) : null;

		return new Node(point, handleIn, handleOut);
	}

	rotate(theta: number, center?: Point = new PointC({x: 0, y: 0})): Node {
		const phi = Math.PI * theta / 180;
		const preRotate = [1, 0, 0, 1, -center.x, -center.y];
		const rotate = [Math.cos(phi), -Math.sin(phi), Math.sin(phi), Math.cos(phi), 0, 0];
		const postRotate = [1, 0, 0, 1, center.x, center.y];

		const matrix = matrixMul(
			matrixMul(
				preRotate,
				rotate
			),
			postRotate
		);

		return this.applyMatrix(matrix);
	}

	translate(vector: Point): Node {
		const matrix = [1, 0, 0, 1, vector.x, vector.y];

		return this.applyMatrix(matrix);
	}

	scale2D(vector: Point, center?: Point = new PointC({x: 0, y: 0})): Node {
		const preScale = [1, 0, 0, 1, -center.x, -center.y];
		const scale = [vector.x, 0, 0, vector.y, 0, 0];
		const postScale = [1, 0, 0, 1, center.x, center.y];

		const matrix = matrixMul(
			postScale,
			matrixMul(
				scale,
				preScale
			)
		);

		return this.applyMatrix(matrix);
	}

	scale(scale: number, center?: Point = new PointC({x: 0, y: 0})): Node {
		return this.scale2D(new PointC({
			x: scale,
			y: scale,
		}), center);
	}

	skew(vector: Point, center: Point = new PointC({x: 0, y: 0})): Node {
		const preSkew = [1, 0, 0, 1, -center.x, -center.y];
		const skew = [vector.x, 0, 0, vector.y, 0, 0];
		const postSkew = [1, 0, 0, 1, center.x, center.y];

		const matrix = matrixMul(
			postSkew,
			matrixMul(
				skew,
				preSkew
			)
		);

		return this.applyMatrix(matrix);
	}
}
