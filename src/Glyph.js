/* @flow */
import type {GlyphElem, GlyphLabel, OtObj, Point} from '../typedef/types.js.flow';

import {PointC} from './util/linear.js';

import Outline from './Outline.js';
import OutlineGroup from './OutlineGroup.js';

export default class Glyph {
	outlines: Array<Outline>;
	components: Array<GlyphElem>;
	ot: OtObj;
	name: string;
	anchors: Array<any>;
	parentAnchors: Array<any>;
	_base: ?number;

	constructor({
		unicode,
		name,
		xMin,
		yMin,
		xMax,
		yMax,
		advanceWidth,
		outlines,
		components,
		anchors,
		parentAnchors,
		subset,
	}: {
		unicode: number,
		name: string,
		xMin?: number,
		yMin?: number,
		xMax?: number,
		yMax?: number,
		advanceWidth: number,
		outlines?: Array<Outline>,
		components?: Array<GlyphElem>,
		anchors?: Array<any>,
		parentAnchors?: Array<any>,
		subset?: ?number,
	}) {
		this.ot = {
			unicode,
			name,
			xMin,
			yMin,
			xMax,
			yMax,
			advanceWidth,
		};

		this.name = name;
		this._base = subset;

		this.outlines = outlines || [];

		// the second child will hold all components
		this.components = components || [];

		// Should all anchors and parentAnchors also leave in child groups?
		this.anchors = anchors || [];
		this.parentAnchors = parentAnchors || [];
	}

	addOutline(child: Outline): Glyph {
		const outlines = [...this.outlines];

		outlines.push(child);

		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			outlines,
			components: this.components,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
		});
	}

	addComponent(component: GlyphElem): Glyph {
		const components: Array<GlyphElem> = [...this.components];

		components.push(component);

		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			outlines: this.outlines,
			components,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
		});
	}

	set(label: GlyphLabel, value: number): Glyph {
		switch (label) {
			case 'advanceWidth': {
				return new Glyph({
					unicode: this.ot.unicode,
					name: this.name,
					xMin: this.ot.xMin,
					xMax: this.ot.xMax,
					yMin: this.ot.yMin,
					yMax: this.ot.yMax,
					advanceWidth: value,
					outlines: this.outlines,
					components: this.components,
					anchors: this.anchors,
					parentAnchors: this.parentAnchors,
					subset: this.subset,
				});
			}
			case 'subset': {
				return new Glyph({
					unicode: this.ot.unicode,
					name: this.name,
					xMin: this.ot.xMin,
					xMax: this.ot.xMax,
					yMin: this.ot.yMin,
					yMax: this.ot.yMax,
					advanceWidth: this.ot.advanceWidth,
					outlines: this.outlines,
					components: this.components,
					anchors: this.anchors,
					parentAnchors: this.parentAnchors,
					subset: value,
				});
			}
			case 'unicode': {
				return new Glyph({
					unicode: value,
					name: this.name,
					xMin: this.ot.xMin,
					xMax: this.ot.xMax,
					yMin: this.ot.yMin,
					yMax: this.ot.yMax,
					advanceWidth: this.ot.advanceWidth,
					outlines: this.outlines,
					components: this.components,
					anchors: this.anchors,
					parentAnchors: this.parentAnchors,
					subset: this.subset,
				});
			}
			default: {
				return this;
			}
		}
	}

	setOutlines(outlines: Array<Outline>): Glyph {
		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			outlines,
			components: this.components,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
			subset: this.subset,
		});
	}

	setComponents(components: Array<GlyphElem>): Glyph {
		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			outlines: this.outlines,
			components,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
			subset: this.subset,
		});
	}

	get advanceWidth(): number {
		return this.ot.advanceWidth;
	}

	get subset(): ?number {
		return this._base;
	}

	get unicode(): number {
		return this.ot.unicode;
	}

	addAnchor(item: any) {
		this.anchors.push(item);
		return item;
	}

	addAnchors(anchors: Array<any>) {
		return anchors.forEach(function(anchor) {
			this.addAnchor(anchor);
		}, this);
	}

	addParentAnchor(item: any) {
		this.parentAnchors.push(item);
		return item;
	}

	static interpolate(glyph0: Glyph, glyph1: Glyph, coef: number): Glyph {

		// If we added an interpolate method to Group, we'd be able to just
		// interpolate all this.children directly.
		// instead we interpolate the outline first
		const outlines = [];

		if (glyph0.outlines.length === glyph1.outlines.length) {
			const outlines0 = glyph0.outlines;
			const outlines1 = glyph1.outlines;

			for (let i = 0; i < glyph0.outlines.length; i++) {
				outlines.push(Outline.interpolate(outlines0[i], outlines1[i], coef));
			}
		}

		const components = [];

		if (glyph0.components.length === glyph1.components.length) {
			const components0 = glyph0.components;
			const components1 = glyph1.components;

			for (let i = 0; i < glyph0.outlines.length; i++) {
				if (components0[i] instanceof Outline
					&& components1[i] instanceof Outline) {
					components.push(Outline.interpolate(components0[i], components1[i], coef));
				}
				else if (components0[i] instanceof OutlineGroup
					&& components1[i] instanceof OutlineGroup) {
					components.push(OutlineGroup.interpolate(components0[i], components1[i], coef));
				}
			}
		}

		const options = {
			unicode: glyph0.ot.unicode,
			advanceWidth: glyph0.ot.advanceWidth + (glyph1.ot.advanceWidth - glyph0.ot.advanceWidth) * coef,
			name: glyph0.name,
			xMin: (glyph0.ot.xMin || 0) + ((glyph1.ot.xMin || 0) - (glyph0.ot.xMin || 0)) * coef,
			yMin: (glyph0.ot.yMin || 0) + ((glyph1.ot.yMin || 0) - (glyph0.ot.yMin || 0)) * coef,
			xMax: (glyph0.ot.xMax || 0) + ((glyph1.ot.xMax || 0) - (glyph0.ot.xMax || 0)) * coef,
			yMax: (glyph0.ot.yMax || 0) + ((glyph1.ot.yMax || 0) - (glyph0.ot.yMax || 0)) * coef,
			outlines,
			components,
		};

		return new Glyph(options);
	}

	getSVGData(aPath: {commands: Array<mixed>} = {commands: []}): {commands: Array<mixed>} {
		const path = {
			commands: [...aPath.commands],
		};

		this.outlines.forEach((outline) => {
			outline.getSVGData(path);
		});

		this.components.forEach((component) => {
			component.getSVGData(path);
		});

		return path;
	}

	getOTCommands(): {commands: Array<mixed>} {
		const path = {
			commands: [],
		};

		this.outlines.forEach((outline) => {
			path.commands.push(...outline.getOTCommands().commands);
		});

		this.components.forEach((component) => {
			path.commands.push(...component.getOTCommands().commands);
		});

		return path;
	}

	scale2D(vector: Point, center?: Point): Glyph {
		const outlines = this.outlines.map((child) => {
			return child.scale2D(vector, center);
		});

		const components = this.components.map((child) => {
			return child.scale2D(vector, center);
		});

		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
			subset: this.subset,
			outlines,
			components,
		});
	}

	scale(scale: number, center?: Point): Glyph {
		return this.scale2D(
			new PointC({
				x: scale,
				y: scale,
			}),
			center
		);
	}

	rotate(theta: Point, center?: Point): Glyph {
		const outlines = this.outlines.map((child) => {
			return child.rotate(theta, center);
		});

		const components = this.components.map((child) => {
			return child.rotate(theta, center);
		});

		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
			subset: this.subset,
			outlines,
			components,
		});
	}

	translate(vector: Point): Glyph {
		const outlines = this.outlines.map((child) => {
			return child.translate(vector);
		});

		const components = this.components.map((child) => {
			return child.translate(vector);
		});

		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
			subset: this.subset,
			outlines,
			components,
		});
	}

	skew(vector: Point, center?: Point): Glyph {
		const outlines = this.outlines.map((child) => {
			return child.skew(vector, center);
		});

		const components = this.components.map((child) => {
			return child.skew(vector, center);
		});

		return new Glyph({
			unicode: this.ot.unicode,
			name: this.name,
			xMin: this.ot.xMin,
			xMax: this.ot.xMax,
			yMin: this.ot.yMin,
			yMax: this.ot.yMax,
			advanceWidth: this.ot.advanceWidth,
			anchors: this.anchors,
			parentAnchors: this.parentAnchors,
			subset: this.subset,
			outlines,
			components,
		});
	}
/*
	combineOTCommands(path = []) {
		this.ot.path.commands = path;

		const combined = this.combineTo(new Outline());

		if (combined) {
			// prototypo.js will make all contours clockwise without this
			combined.isPrepared = true;
			combined.updateOTCommands(path);
		}

		return this.ot;
	}

	combineTo(aOutline = new Outline()) {
		const outline = this.children[0].combineTo(aOutline);

		return this.children[1].children.reduce(function(acc, component) {
			// and then combine it to the rest of the glyph
			return component.combineTo(acc);
		}, outline);
	}

	importOT(otGlyph) {
		let current;

		this.ot = otGlyph;

		if (!otGlyph.path || !otGlyph.path.commands) {
			return this;
		}

		this.ot.path.commands.forEach(function(command) {
			switch (command.type) {
				case 'M':
					current = new Path();
					this.children[0].addOutline(current);

					current.moveTo(command.x, command.y);
					break;
				case 'L':
					current.lineTo(command.x, command.y);
					break;
				case 'C':
					current.curveTo(
						{
							c1: {x: command.x1, y: command.y1},
							c2: {x: command.x2, y: command.y2},
							c3: {x: command.x, y: command.y},
						}
					);
					break;
				case 'Q':
					current.quadTo(
						{
							c1: {x: command.x1, y: command.y1},
							c2: {x: command.x, y: command.y},
						}
					);
					break;
				case 'Z':
					// When the glyph has no contour,
					// they contain a single Z command in
					// opentype.js.
					// TODO: see how we should handle that
					if (current) {
						current.closePath();
					}
					break;
				default:
					break;
			}
		}.bind(this));

		return this;
	}
	*/
}
