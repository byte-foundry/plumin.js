var opentype = require('../node_modules/opentype.js/src/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-worker.js');

function Glyph( args ) {
	paper.Group.prototype.constructor.apply( this );

	if ( args.unicode === undefined ) {
		args.unicode = args.name.charCodeAt(0);
	}

	if ( typeof args.unicode === 'string' ) {
		args.unicode = args.unicode.charCodeAt(0);
	}

	this.ot = new opentype.Glyph( args );
	this.ot.path = new opentype.Path();

	this.contours = [];
	this.anchors = [];
	this.components = [];
	this.parentAnchors = [];
}

Glyph.prototype = Object.create(paper.Group.prototype);
Glyph.prototype.constructor = Glyph;

Glyph.prototype.addContour = function( item ) {
	this.addChild( item );
	this.contours.push( item );
	return this;
};

Glyph.prototype.addComponent = function( item ) {
	this.addChild( item );
	this.components.push( item );
	return this;
};

Glyph.prototype.addAnchor = function( item ) {
	this.anchors.push( item );
	return this;
};

Glyph.prototype.addParentAnchor = function( item ) {
	this.parentAnchors.push( item );
	return this;
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