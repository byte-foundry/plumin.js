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

proto._updateData = function( data, reverse, pushSimple, pushBezier ) {
	if ( this.visible === false ) {
		return data;
	}

	var length = this.curves.length,
		closed = this.closed;

	pushSimple(
		'M',
		Math.round( this.curves[ reverse ? length - ( closed ? 2 : 1 ) : 0 ][
			'point' + ( reverse ? 2 : 1 )
		].x ) || 0,
		Math.round( this.curves[ reverse ? length - ( closed ? 2 : 1 ) : 0 ][
			'point' + ( reverse ? 2 : 1 )
		].y ) || 0
	);

	( reverse ?
		this.curves.slice(0, closed ? -1 : length).reverse() :
		this.curves.slice(0, closed ? -1 : length)

	).forEach(function( curve ) {
		if ( curve.isLinear() ) {
			pushSimple(
				'L',
				Math.round( curve[ 'point' + ( reverse ? 1 : 2 ) ].x ) || 0,
				Math.round( curve[ 'point' + ( reverse ? 1 : 2 ) ].y ) || 0
			);

		} else {
			pushBezier(
				'C',
				Math.round(
					curve[ 'point' + ( reverse ? 1 : 2 ) ].x +
					curve[ 'handle' + ( reverse ? 1 : 2 ) ].x
				) || 0,
				Math.round(
					curve[ 'point' + ( reverse ? 1 : 2 ) ].y +
					curve[ 'handle' + ( reverse ? 1 : 2 ) ].y
				) || 0,
				Math.round(
					curve[ 'point' + ( reverse ? 2 : 1 ) ].x +
					curve[ 'handle' + ( reverse ? 2 : 1 ) ].x
				) || 0,
				Math.round(
					curve[ 'point' + ( reverse ? 2 : 1 ) ].y +
					curve[ 'handle' + ( reverse ? 2 : 1 ) ].y
				) || 0,
				Math.round( curve[ 'point' + ( reverse ? 1 : 2 ) ].x ) || 0,
				Math.round( curve[ 'point' + ( reverse ? 1 : 2 ) ].y ) || 0
			);
		}
	});

	if ( closed ) {
		pushSimple('Z');
	}

	return data;
};

proto.updateOTCommands = function( data, reverse ) {
	return this._updateData(
		data,
		reverse,
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

proto.updateSVGData = function( data, reverse ) {
	return this._updateData(
		data,
		reverse,
		function pushSimple() {
			data.push.apply( data, arguments );
		},
		function pushBezier() {
			data.push.apply( data, arguments );
		}
	);
};

module.exports = paper.Path;
