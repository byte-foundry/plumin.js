import opentype from 'opentype.js';
import Outline from './Outline.js';
import Path from './Path.js';

export default class Glyph {
	constructor(args) {
			paper.Group.prototype.constructor.apply(this);

		if (args && typeof args.unicode === 'string') {
			args.unicode = args.unicode.charCodeAt(0);
		}

		this.ot = new opentype.Glyph(args);
		this.ot.path = new opentype.Path();

		this.name = args.name;
		// workaround opentype 'unicode === 0' bug
		this.ot.unicode = args.unicode;

		this.children = [];

		this.addChild(new Outline());
		// the second child will hold all components
		// this.addChild( new paper.Group() );
		// Should all anchors and parentAnchors also leave in child groups?
		this.anchors = (args && args.anchors) || [];
		this.parentAnchors = (args && args.parentAnchors) || [];

		// each individual glyph must be explicitely made visible
		this.visible = false;
		// default colors required to display the glyph in a canvas
		this.fillColor = 'rgba(0, 0, 0, 1)';
		// stroke won't be displayed unless strokeWidth is set to 1
		this.strokeColor = 'rgba(0, 0, 0, 1)';
		this.strokeScaling = false;
	}

	addChild(child) {
		this.children.push(child);
	}

	set advanceWidth(value) {
		this.ot.advanceWidth = value;
	}

	get advanceWidth() {
		return this.ot.advanceWidth;
	}

	set subset(code) {
		this._base = typeof code === 'string'
			? code.charCodeAt(0)
			: code;
	}

	get subset() {
		return this._base;
	}

	set unicode(code) {
		this.ot.unicode = typeof code === 'string'
			? code.charCodeAt(0)
			: code;
	}

	get unicode() {
		return this.ot.unicode;
	}

	get contours() {
		return this.children[0].children;
	}

	get components() {
		return this.children[1].children;
	}

	addAnchor(item) {
		this.anchors.push(item);
		return item;
	}

	addAnchors(anchors) {
		return anchors.forEach(function(anchor) {
			this.addAnchor(anchor);
		}, this);
	}

	addParentAnchor(item) {
		this.parentAnchors.push(item);
		return item;
	}

	addUnicode(code) {
		this.ot.addUnicode(code);

		return this;
	}

	interpolate(glyph0, glyph1, coef) {
		// If we added an interpolate method to Group, we'd be able to just
		// interpolate all this.children directly.
		// instead we interpolate the outline first
		this.children[0].interpolate(
			glyph0.children[0], glyph1.children[0], coef
		);
		// and then the components
		this.children[1].children.forEach(function(component, j) {
			component.interpolate(
				glyph0.children[1].children[j], glyph1.children[1].children[j], coef
			);
		});

		this.ot.advanceWidth = glyph0.ot.advanceWidth
			+ (glyph1.ot.advanceWidth - glyph0.ot.advanceWidth) * coef;
		this.ot.leftSideBearing = glyph0.ot.leftSideBearing
			+ (glyph1.ot.leftSideBearing - glyph0.ot.leftSideBearing) * coef;
		this.ot.xMax = glyph0.ot.xMax
			+ (glyph1.ot.xMax - glyph0.ot.xMax) * coef;
		this.ot.xMin = glyph0.ot.xMin
			+ (glyph1.ot.xMin - glyph0.ot.xMin) * coef;
		this.ot.yMax = glyph0.ot.yMax
			+ (glyph1.ot.yMax - glyph0.ot.yMax) * coef;
		this.ot.yMin = glyph0.ot.yMin
			+ (glyph1.ot.yMin - glyph0.ot.yMin) * coef;

		return this;
	}

	updateSVGData(path = []) {
		this.svgData = path;
		this.children[0].updateSVGData(path);

		this.children[1].children.forEach(function(component) {
			component.updateSVGData(path);
		});

		return this.svgData;
	}
	updateOTCommands(path = []) {
		this.ot.path.commands = path;

		this.children[0].updateOTCommands(path);

		this.children[1].children.forEach(function(component) {
			component.updateOTCommands(path);
		});

		return this.ot;
	}

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
					this.children[0].addChild(current);

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
}
