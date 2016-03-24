var opentype = require('opentype.js'),
	paper = require('paper'),
	Outline = require('./Outline.js');

function Glyph( args ) {
	paper.Group.prototype.constructor.apply( this );

	if ( args && typeof args.unicode === 'string' ) {
		args.unicode = args.unicode.charCodeAt(0);
	}

	this.ot = new opentype.Glyph( args );
	this.ot.path = new opentype.Path();

	this.name = args.name;
	// workaround opentype 'unicode === 0' bug
	this.ot.unicode = args.unicode;

	this.addChild( new Outline() );
	// the second child will hold all components
	this.addChild( new paper.Group() );
	// Should all anchors and parentAnchors also leave in child groups?
	this.anchors = ( args && args.anchors ) || [];
	this.parentAnchors = ( args && args.parentAnchors ) || [];

	// each individual glyph must be explicitely made visible
	this.visible = false;
	// default colors required to display the glyph in a canvas
	this.fillColor = new paper.Color(0, 0, 0);
	// stroke won't be displayed unless strokeWidth is set to 1
	this.strokeColor = new paper.Color(0, 0, 0);
	this.strokeScaling = false;
}

Glyph.prototype = Object.create(paper.Group.prototype);
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

Object.defineProperty(Glyph.prototype, 'base', {
	set: function( code ) {
		this._base = typeof code === 'string' ?
			code.charCodeAt(0) :
			code;
	},
	get: function() {
		return this._base;
	}
});

// alias .advanceWidth to .ot.advanceWidth
Object.defineProperty(Glyph.prototype, 'advanceWidth', {
	set: function( value ) {
		this.ot.advanceWidth = value;
	},
	get: function() {
		return this.ot.advanceWidth;
	}
});

// proxy .contours to .children[0]
Object.defineProperty( Glyph.prototype, 'contours', {
	get: function() {
		return this.children[0].children;
	}
});

// proxy .components to .children[1]
Object.defineProperty( Glyph.prototype, 'components', {
	get: function() {
		return this.children[1].children;
	}
});

// proxy ...Contour[s] methods to children[0]...Child[ren] methods
// and proxy ...Component[s] methods to children[1]...Child[ren] methods
Object.getOwnPropertyNames( paper.Item.prototype ).forEach(function(name) {
	var proto = this;

	// exclude getters and non-methods
	if ( Object.getOwnPropertyDescriptor(proto, name).get ||
			typeof proto[name] !== 'function' ) {
		return;
	}

	if ( name.indexOf('Children') !== -1 ) {
		proto[name.replace('Children', 'Contours')] = function() {
			proto[name].apply( this.children[0], arguments );
		};

		proto[name.replace('Children', 'Components')] = function() {
			proto[name].apply( this.children[1], arguments );
		};

	} else if ( name.indexOf('Child') !== -1 ) {
		proto[name.replace('Child', 'Contour')] = function() {
			proto[name].apply( this.children[0], arguments );
		};

		proto[name.replace('Child', 'Component')] = function() {
			proto[name].apply( this.children[1], arguments );
		};
	}

}, paper.Item.prototype);

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

	return this;
};

Glyph.prototype.updateSVGData = function( path ) {
	if ( !path ) {
		this.svgData = [];
		path = this.svgData;
	}

	this.children[0].updateSVGData( path );

	this.children[1].children.forEach(function( component ) {
		component.updateSVGData( path );
	});

	return this.svgData;
};

Glyph.prototype.updateOTCommands = function( path ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	this.children[0].updateOTCommands( path );

	this.children[1].children.forEach(function( component ) {
		component.updateOTCommands( path );
	});

	return this.ot;
};

Glyph.prototype.combineOTCommands = function( path ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	var combined = this.combineTo( new Outline() );

	if ( combined ) {
		// prototypo.js will make all contours clockwise without this
		combined.isPrepared = true;
		combined.updateOTCommands( path );
	}

	return this.ot;
};

Glyph.prototype.combineTo = function( outline ) {
	if ( !outline ) {
		outline = new Outline();
	}

	outline = this.children[0].combineTo( outline );

	return this.children[1].children.reduce(function( outline, component ) {
		// and then combine it to the rest of the glyph
		return component.combineTo( outline );
	}, outline);
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
				this.children[0].addChild( current );

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
	}.bind(this));

	return this;
};

module.exports = Glyph;
