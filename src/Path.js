/* Extend the Path prototype to add OpenType conversion
 * and alias *segments methods and properties to *nodes
 */
var paper = require('../node_modules/paper/dist/paper-core.js');

var proto = paper.PaperScope.prototype.Path.prototype;

// alias *Segments methods to *Nodes equivalents
[ 'add', 'insert', 'remove' ].forEach(function(name) {
	proto[name + 'Nodes'] =
		proto[name + 'Segments'];
});

// alias .segments to .nodes
Object.defineProperties(proto, {
	nodes: Object.getOwnPropertyDescriptor( proto, 'segments' ),
	firstNode: Object.getOwnPropertyDescriptor( proto, 'firstSegment' ),
	lastNode: Object.getOwnPropertyDescriptor( proto, 'lastSegment' )
});

proto._updateData = function( data, pushSimple, pushBezier ) {
	if ( this.visible === false ) {
		return data;
	}

	var length = this.curves.length,
		closed = this.closed;

	pushSimple(
		'M',
		Math.round( this.curves[0].point1.x ) || 0,
		Math.round( this.curves[0].point1.y ) || 0
	);

	this.curves.slice(0, closed ? -1 : length).forEach(function( curve ) {
		if ( curve.isLinear() ) {
			pushSimple(
				'L',
				Math.round( curve.point2.x ) || 0,
				Math.round( curve.point2.y ) || 0
			);

		} else {
			pushBezier(
				'C',
				Math.round( curve.point1.x + curve.handle1.x ) || 0,
				Math.round( curve.point1.y + curve.handle1.y ) || 0,
				Math.round( curve.point2.x + curve.handle2.x ) || 0,
				Math.round( curve.point2.y + curve.handle2.y ) || 0,
				Math.round( curve.point2.x ) || 0,
				Math.round( curve.point2.y ) || 0
			);
		}
	});

	if ( closed ) {
		pushSimple('Z');
	}

	return data;
};

proto.updateOTCommands = function( data ) {
	return this._updateData(
		data,
		function pushSimple() {
			data.commands.push({
				type: arguments[0],
				x: arguments[1],
				y: arguments[2]
			});
		},
		function pushBezier() {
			data.commands.push({
				type: arguments[0],
				x1: arguments[1],
				y1: arguments[2],
				x2: arguments[3],
				y2: arguments[4],
				x: arguments[5],
				y: arguments[6]
			});
		}
	);
};

proto.updateSVGData = function( data ) {
	return this._updateData(
		data,
		function pushSimple() {
			data.push.apply( data, arguments );
		},
		function pushBezier() {
			data.push.apply( data, arguments );
		}
	);
};

module.exports = paper.Path;
