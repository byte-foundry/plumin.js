/* Extend the Path prototype to add OpenType conversion
 * and alias *segments methods and properties to *nodes
 */
var paper = require('../node_modules/paper/dist/paper-core.js'),
	proto = paper.PaperScope.prototype.Path.prototype;

// Overwrite the constructor to handle object creator with nodes property
// proto.constructor = function(obj) {
// 	if ( obj && 'nodes' in obj ) {
// 		obj.segments = obj.nodes
// 	}
// };

// A mon avis c'est pas sur paper.Path.prototype qu'il faut faire tous ces changements

// alias *Segments methods to *Nodes equivalents
['add', 'insert', 'remove'].forEach(function(name) {
	proto[name + 'Nodes'] =
		proto[name + 'Segments'];
});

// alias .segments to .nodes
Object.defineProperties(proto, {
	nodes: {
		get: function() {
			return this.segments;
		}
	},
	firstNode: {
		get: function() {
			return this.firstSegment;
		}
	},
	lastNode: {
		get: function() {
			return this.lastSegment;
		}
	}
});

proto.prepareOT = function( path ) {
	path.commands.push({
		type: 'M',
		x: Math.round( this._segments[0].point.x ) || 0,
		y: Math.round( this._segments[0].point.y ) || 0
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

module.exports = paper.Path;