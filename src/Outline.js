/* @flow */

import {PointC} from './util/linear.js';

import Path from './Path.js';

export default class Outline {
	children: Array<Path>;

	constructor({svg, paths}: {svg?: string, paths?: Array<Path>} = {}) {
		this.children = [];
		if (svg) {
			const regexp = /(M[^M]*)/g;
			const commands = [];
			let result = regexp.exec(svg);

			while (result) {
				commands.push(result);
				result = regexp.exec(svg);
			}

			commands.forEach(([svgItem]) => {
				this.children.push(new Path({svg: svgItem}));
			});
		}
		else if (paths) {
			this.children = paths;
		}
	}

	insertChildren(index: number, items: Array<Path>): Outline {
		const children = [...this.children];

		children.splice(index, 0, ...items);

		return new Outline({
			paths: children,
		});
	}

	static interpolate(outline0: Outline, outline1: Outline, coef: number): Outline {
		const paths = [];

		if (outline0.children.length === outline1.children.length) {
			for (let i = 0; i < outline0.children.length; i++) {
				// The number of children should be the same everywhere,
				// but we're going to try our best anyway
				if (!outline0.children[i] || !outline1.children[i]) {
					break;
				}

				paths.push(outline0.children[i].interpolate(
					outline1.children[i],
					coef
				));
			}
		}

		return new Outline({
			paths,
		});
	}

	getSVGData(aPath: {commands: Array<mixed>} = {commands: []}): {commands: Array<mixed>} {
		const path = {
			commands: [...aPath.commands],
		};

		this.children.forEach((contour) => {
			contour.getSVGData(path);
		}, this);

		return path;
	}

	combineTo(outline: Outline): Outline {
		/*
		 * Should combine path into one by using a nonzero rule
		*/
		throw new Error(`this does not work. This is your outline`);
	}

	getOTCommands(): {commands: Array<mixed>} {
		const path = {
			commands: [],
		};

		this.children.forEach((contour) => {
			contour.getOTCommands(path);
		});

		return path;
	}

	subtract(path: Path): Outline {
		const children = [...this.children];

		if (path.orientation()) {
			children.push(path.reverse());
		}
		else {
			children.push(path);
		}

		return new Outline({
			paths: children,
		});
	}

	scale2D(vector: Point, center?: Point): Outline {
		const children = this.children.map((child) => {
			return child.scale2D(vector, center);
		});

		return new Outline({
			paths: children,
		});
	}

	scale(scale: number, center?: Point): Outline {
		return this.scale2D(
			new PointC({
				x: scale,
				y: scale,
			}),
			center
		);
	}

	rotate(theta: Point, center?: Point): Outline {
		const children = this.children.map((child) => {
			return child.rotate(theta, center);
		});

		return new Outline({
			paths: children,
		});
	}

	translate(vector: Point): Outline {
		const children = this.children.map((child) => {
			return child.translate(vector);
		});

		return new Outline({
			paths: children,
		});
	}

	skew(vector: Point, center?: Point): Outline {
		const children = this.children.map((child) => {
			return child.skew(vector, center);
		});

		return new Outline({
			paths: children,
		});
	}
}
	/*
Outline.fromPath = function( path ) {
	var result = new Outline();
	return path._clone( result, false );
};
*/
