var opentype = require('../node_modules/opentype.js/dist/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-core.js');

function Glyph( args ) {
	paper.CompoundPath.prototype.constructor.apply( this );

	if ( args.unicode === undefined ) {
		args.unicode = args.name.charCodeAt(0);
	}

	if ( typeof args.unicode === 'string' ) {
		args.unicode = args.unicode.charCodeAt(0);
	}

	this.name = args.name;
	this.unicode = args.unicode;

	this.ot = new opentype.Glyph( args );
	this.ot.path = new opentype.Path();

	this.contours = ( args && args.contours ) || [];
	this.anchors = ( args && args.anchors ) || [];
	this.components = ( args && args.components ) || [];
	this.parentAnchors = ( args && args.parentAnchors ) || [];
}

Glyph.prototype = Object.create(paper.CompoundPath.prototype);
Glyph.prototype.constructor = Glyph;

Glyph.prototype.addContour = function( item ) {
	this.addChild( item );
	this.contours.push( item );
	return item;
};

Glyph.prototype.addComponent = function( item ) {
	this.addChild( item );
	this.components.push( item );
	return item;
};

Glyph.prototype.addAnchor = function( item ) {
	this.anchors.push( item );
	return item;
};

Glyph.prototype.addParentAnchor = function( item ) {
	this.parentAnchors.push( item );
	return item;
};

Glyph.prototype.prepareOT = function( path ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	this.contours.forEach(function( contour ) {
		contour.prepareOT( this.ot.path );
	}, this);

	return this.ot;
};

module.exports = Glyph;