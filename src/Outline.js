var paper = require('paper');

var Outline = paper.CompoundPath;

// function Outline() {
// 	paper.CompoundPath.prototype.constructor.apply( this, arguments );
// }
//
// // inehrit CompoundPath
// Outline.prototype = Object.create(paper.CompoundPath.prototype);
// Outline.prototype.constructor = Outline;

// Fix two problems with CompoundPath#insertChildren:
// - it arbitrarily changes the direction of paths
// - it seems that it doesn't handle CompoundPath arguments
Outline.prototype.insertChildren = function(index, items, _preserve) {
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

Outline.fromPath = function( path ) {
	var result = new Outline();
	return path._clone( result, false );
};

Outline.prototype.interpolate = function( outline0, outline1, coef ) {
	for (var i = 0, l = this.children.length; i < l; i++) {
		// The number of children should be the same everywhere,
		// but we're going to try our best anyway
		if ( !outline0.children[i] || !outline1.children[i] ) {
			break;
		}

		this.children[i].interpolate(
			outline0.children[i],
			outline1.children[i],
			coef
		);
	}

	return this;
};

Outline.prototype.updateSVGData = function( path ) {
	if ( !path ) {
		this.svgData = [];
		path = this.svgData;
	}

	this.children.forEach(function( contour ) {
		contour.updateSVGData( path );
	}, this);

	return this.svgData;
};

Outline.prototype.updateOTCommands = function( path ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	this.children.forEach(function( contour ) {
		contour.updateOTCommands( path );
	}.bind(this));

	return this.ot;
};

Outline.prototype.combineTo = function( outline ) {
	return this.children.reduce(function( reducing, path ) {
		// ignore empty and open paths
		if ( path.curves.length === 0 || !path.closed ) {
			return reducing;
		}

		var tmp = ( reducing == undefined  ?
			// when the initial value doesn't exist, use the first path
			// (clone it otherwise it's removed from this.children)
			path.clone( false ) :
			reducing[
				path.clockwise === !(path.exportReversed) ? 'unite' : 'subtract'
			]( path )
		);

		return ( tmp.constructor === paper.Path ?
			new paper.CompoundPath({ children: [ tmp ] }) :
			tmp
		);

	}, outline);
};

module.exports = Outline;
