var paper = require('paper');

function Outline() {
	paper.CompoundPath.prototype.constructor.apply( this );
}

// inehrit CompoundPath
Outline.prototype = Object.create(paper.CompoundPath.prototype);
Outline.prototype.constructor = Outline;

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

Outline.prototype.updateOTCommands = function( path, shouldMerge ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	if ( shouldMerge ) {
		var merged = this.children.reduce(function( merged, contour ) {
			if ( !merged ) {
				return contour;
			}

			return contour

		}, null).bind(this);

		merged.updateOTCommands( path );

	} else {
		this.children.forEach(function( contour ) {
			contour.updateOTCommands( path );
		}).bind(this);
	}

	return this.ot;
};

module.exports = Outline;
