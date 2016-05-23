/* Extend the Path prototype to add OpenType conversion
 * and alias *segments methods and properties to *nodes
 */
var paper = require('paper');

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
	if ( this.visible === false || this.curves.length === 0) {
		return data;
	}

	// prototypo needs to be able to change the direction of the updated data.
	var reverse = this.exportReversed,
		curves = this.curves,
		length = curves.length,
		matrix = this.globalMatrix,
		start =
			curves[ reverse ? length - 1 : 0 ][ 'point' + ( reverse ? 2 : 1 ) ]
				.transform( matrix );

	pushSimple(
		'M',
		Math.round( start.x ) || 0,
		Math.round( start.y ) || 0
	);

	for ( var i = -1, l = curves.length; ++i < l; ) {
		var curve = curves[ reverse ? l - 1 - i : i ],
			end = curve['point' + ( reverse ? 1 : 2 ) ].transform( matrix );

		if ( curve.isStraight() ) {
			pushSimple(
				'L',
				Math.round( end.x ) || 0,
				Math.round( end.y ) || 0
			);

		} else {
			var ctrl1 = new paper.Point(
					curve.point1.x + curve.handle1.x,
					curve.point1.y + curve.handle1.y
				).transform( matrix ),
				ctrl2 = new paper.Point(
					curve.point2.x + curve.handle2.x,
					curve.point2.y + curve.handle2.y
				).transform( matrix );

			if ( reverse ) {
				pushBezier(
					'C',
					Math.round( ctrl2.x ) || 0,
					Math.round( ctrl2.y ) || 0,
					Math.round( ctrl1.x ) || 0,
					Math.round( ctrl1.y ) || 0,
					Math.round( end.x ) || 0,
					Math.round( end.y ) || 0
				);
			} else {
				pushBezier(
					'C',
					Math.round( ctrl1.x ) || 0,
					Math.round( ctrl1.y ) || 0,
					Math.round( ctrl2.x ) || 0,
					Math.round( ctrl2.y ) || 0,
					Math.round( end.x ) || 0,
					Math.round( end.y ) || 0
				);
			}
		}
	}

	if ( this.closed ) {
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
