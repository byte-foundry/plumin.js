var paper = require('../node_modules/paper/dist/paper-worker.js');

function Contour( args ) {
	paper.Path.prototype.constructor.call( this, args );

	this.nodes = this.segments;
}

Contour.prototype = Object.create(paper.Path.prototype);
Contour.prototype.constructor = Contour;

Contour.prototype.addNodes = paper.Path.prototype.addSegments;

Contour.prototype.prepareOT = function( path ) {
	path.commands.push({
		type: 'M',
		x: Math.round( this.firstSegment.point.x ) || 0,
		y: Math.round( this.firstSegment.point.y ) || 0
	});

	this.curves.forEach(function( curve ) {
		if ( curve.isLinear() ) {
			path.commands.push({
				type: 'L',
				x: Math.round( curve.point2.x ) || 0,
				y: Math.round( curve.point2.y ) || 0
			});

		} else {
			path.commands.push({
				type: 'C',
				x1: Math.round( curve.point1.x + curve.handle1.x ) || 0,
				y1: Math.round( curve.point1.y + curve.handle1.y ) || 0,
				x2: Math.round( curve.point2.x + curve.handle2.x ) || 0,
				y2: Math.round( curve.point2.y + curve.handle2.y ) || 0,
				x: Math.round( curve.point2.x ) || 0,
				y: Math.round( curve.point2.y ) || 0
			});
		}
	});

	return path;
};

module.exports = Contour;