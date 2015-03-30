var opentype = require('../node_modules/opentype.js/dist/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-core.js');

function Glyph( args ) {
	paper.CompoundPath.prototype.constructor.apply( this );

	if ( args && typeof args.unicode === 'string' ) {
		args.unicode = args.unicode.charCodeAt(0);
	}

	this.ot = new opentype.Glyph( args );
	this.ot.path = new opentype.Path();

	this.name = args.name;
	// workaround opentype 'unicode === 0' bug
	this.ot.unicode = args.unicode;

	//this.contours = ( args && args.contours ) || [];
	this.anchors = ( args && args.anchors ) || [];
	this.components = ( args && args.components ) || [];
	this.parentAnchors = ( args && args.parentAnchors ) || [];

	// default fill color needed to display the glyph in a canvas
	this.fillColor = new paper.Color(0, 0, 0);
	// but each individual glyph must be explicitely made visible
	this.visible = false;
}

Glyph.prototype = Object.create(paper.CompoundPath.prototype);
Glyph.prototype.constructor = Glyph;

// Todo: handle unicode updates
Object.defineProperty(Glyph.prototype, 'unicode', {
	set: function( code ) {
		this.ot.unicode = typeof code === 'string' ?
			code.charCodeAt(0) :
			code;
	},
	get: function() {
		return this.ot.unicode;
	}
});

// proxy *Child/*Children methods to *Contour/*Contours
// This has the added benefit of preventing CompoundPath#insertChildren
// from arbitrarily changing the direction of paths
Object.getOwnPropertyNames( paper.Item.prototype )
	.forEach(function(name) {
		// exclude getters and non-methods
		if ( Object.getOwnPropertyDescriptor(this, name).get ||
				typeof this[name] !== 'function' ) {
			return;
		}

		if ( name.indexOf('Children') !== -1 ) {
			this[name.replace('Children', 'Contours')] = this[name];

		} else if ( name.indexOf('Child') !== -1 ) {
			this[name.replace('Child', 'Contour')] = this[name];
		}

	}, paper.Item.prototype);

// Fix two problems with CompoundPath#insertChildren:
// - it arbitrarily changes the direction of paths
// - it seems that it doesn't handle CompoundPath arguments
Glyph.prototype.insertChildren = function(index, items, _preserve) {
	if ( Array.isArray( items ) ) {
		// flatten items to handle CompoundPath children
		items = [].concat.apply([], items.map(function(item) {
			return item instanceof paper.Path ? item : item.children;
		}));
	}

	return paper.Item.prototype.insertChildren.call(
		this, index, items, _preserve, paper.Path
	);
};

// proxy .children to .contours
Object.defineProperty(
	Glyph.prototype,
	'contours',
	Object.getOwnPropertyDescriptor( paper.Item.prototype, 'children' )
);

Glyph.prototype.addComponent = function( item ) {
	this.components.push( item );
	return item;
};

Glyph.prototype.addComponents = function( components ) {
	return components.forEach(function(component) {
		this.addComponent(component);
	}, this);
};

Glyph.prototype.addAnchor = function( item ) {
	this.anchors.push( item );
	return item;
};

Glyph.prototype.addAnchors = function( anchors ) {
	return anchors.forEach(function(anchor) {
		this.addAnchor(anchor);
	}, this);
};

Glyph.prototype.addParentAnchor = function( item ) {
	this.parentAnchors.push( item );
	return item;
};

Glyph.prototype.addUnicode = function( code ) {
	this.ot.addUnicode( code );

	return this;
};

Glyph.prototype.interpolate = function( glyph0, glyph1, coef ) {
	for (var i = 0, l = this.contours.length; i < l; i++) {
		// The number of children should be the same everywhere,
		// but we're going to try our best anyway
		if ( !glyph0.contours[i] || !glyph1.contours[i] ) {
			break;
		}

		this.contours[i].interpolate(
			glyph0.contours[i],
			glyph1.contours[i],
			coef
		);

		/* eslint-disable no-loop-func */
		this.components.forEach(function(component, j) {
			component.interpolate(
				glyph0.components[j], glyph1.components[j], coef
			);
		});
		/* eslint-enable no-loop-func */

		this.ot.advanceWidth =
			glyph0.ot.advanceWidth +
			( glyph1.ot.advanceWidth - glyph0.ot.advanceWidth ) * coef;
		this.ot.leftSideBearing =
			glyph0.ot.leftSideBearing +
			( glyph1.ot.leftSideBearing - glyph0.ot.leftSideBearing ) * coef;
		this.ot.xMax =
			glyph0.ot.xMax + ( glyph1.ot.xMax - glyph0.ot.xMax ) * coef;
		this.ot.xMin =
			glyph0.ot.xMin + ( glyph1.ot.xMin - glyph0.ot.xMin ) * coef;
		this.ot.yMax =
			glyph0.ot.yMax + ( glyph1.ot.yMax - glyph0.ot.yMax ) * coef;
		this.ot.yMin =
			glyph0.ot.yMin + ( glyph1.ot.yMin - glyph0.ot.yMin ) * coef;
	}

	return this;
};

Glyph.prototype.updateSVGData = function( path ) {
	if ( !path ) {
		this.svgData = [];
		path = this.svgData;
	}

	this.contours.forEach(function( contour ) {
		contour.updateSVGData( path );
	}, this);

	this.components.forEach(function( component ) {
		component.updateSVGData( path );
	});

	return this.svgData;
};

Glyph.prototype.updateOTCommands = function( path ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	this.contours.forEach(function( contour ) {
		contour.updateOTCommands( path );
	}, this);

	this.components.forEach(function( component ) {
		component.updateOTCommands( path );
	});

	return this.ot;
};

Glyph.prototype.importOT = function( otGlyph ) {
	var current;
	this.ot = otGlyph;

	if ( !otGlyph.path || !otGlyph.path.commands ) {
		return this;
	}

	this.ot.path.commands.forEach(function(command) {
		switch ( command.type ) {
			case 'M':
				current = new paper.Path();
				this.addContour( current );

				current.moveTo( command );
				break;
			case 'L':
				current.lineTo( command );
				break;
			case 'C':
				current.cubicCurveTo(
					[ command.x1, command.y1 ],
					[ command.x2, command.y2 ],
					command
				);
				break;
			case 'Q':
				current.quadraticCurveTo(
					[ command.x1, command.y1 ],
					command
				);
				break;
			case 'Z':
				// When the glyph has no contour,
				// they contain a single Z command in
				// opentype.js.
				// TODO: see how we should handle that
				if ( current ) {
					current.closePath();
				}
				break;
		}
	}, this);

	return this;
};

module.exports = Glyph;
