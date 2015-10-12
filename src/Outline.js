var paper = require('../node_modules/paper/dist/paper-core.js');

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
	for (var i = 0, l = this.contours.length; i < l; i++) {
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
		contour.updateSVGData( path, contour.globalMatrix );
	}, this);

	return this.svgData;
};

Outline.prototype.updateOTCommands = function( path ) {
	if ( !path ) {
		this.ot.path.commands = [];
		path = this.ot.path;
	}

	this.children.forEach(function( contour ) {
		contour.updateOTCommands( path, contour.globalMatrix );
	}, this);

	return this.ot;
};

Outline.prototype.getPaths = function( solution ) {
	this.children.forEach(function( contour ) {
		if ( contour.expandedFrom ) {
			return solution;
		}

		if ( contour.skeleton !== true ) {
			solution = contour.getPath( solution, contour.globalMatrix );
		} else if ( !contour.expandedTo[1] ) {
			solution = contour
				.expandedTo[0]
				.getPath( solution, contour.globalMatrix );
		} else {
			solution.push(
				contour.expandedTo[0]
					.getSimplePath( null, contour.globalMatrix ) );
			solution.push(
				contour.expandedTo[1]
					.getSimplePath( null, contour.globalMatrix ) );
		}
	});

	return solution;
};

module.exports = Outline;
