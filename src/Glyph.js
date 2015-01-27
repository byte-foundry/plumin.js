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

	this.contours = ( args && args.contours ) || [];
	this.anchors = ( args && args.anchors ) || [];
	this.components = ( args && args.components ) || [];
	this.parentAnchors = ( args && args.parentAnchors ) || [];

	// default fill color needed to display the glyph in a canvas
	this.fillColor = new paper.Color(0,0,0);
	// but each individual glyph must be explicitely made visible
	this.visible = false;
}

Glyph.prototype = Object.create(paper.CompoundPath.prototype);
Glyph.prototype.constructor = Glyph;

// Todo: handle unicode updates
Object.defineProperty(Glyph, 'unicode', {
	set: function( code ) {
		this.ot.unicode = typeof code === 'string' ?
			code.charCodeAt(0):
			code;
	},
	get: function() {
		return this.ot.unicode;
	}
});

Glyph.prototype.addContour = function( item ) {
	// prevent CompoundPath from arbitrarily changing the direction of paths
	if ( item._clockwise === undefined ) {
		item._clockwise = null;
	}

	this.addChild( item );
	this.contours.push( item );
	return item;
};

Glyph.prototype.addContours = function( contours ) {
	return contours.forEach(function(contour) {
		this.addContour(contour);
	}, this);
};

Glyph.prototype.addComponent = function( item ) {
	this.addChild( item );
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

Glyph.prototype.updateOTCommands = function( path ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	this.contours.forEach(function( contour ) {
		contour.updateOTCommands( this.ot.path );
	}, this);

	return this.ot;
};

Glyph.prototype.importOT = function( otGlyph ) {
	var current;
	this.ot = otGlyph;

	if ( !otGlyph.path || !otGlyph.path.commands ) {
		return;
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
					[command.x1, command.y1],
					[command.x2, command.y2],
					command
				);
				break;
			case 'Q':
				current.quadraticCurveTo(
					[command.x1, command.y1],
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