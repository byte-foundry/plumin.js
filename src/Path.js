/* Extend the Path prototype to add OpenType conversion
 * and alias *segments methods and properties to *nodes
 */
var paper = require('../node_modules/paper/dist/paper-core.js'),
	clipper = require('../node_modules/jsclipper/clipper_unminified.js');

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

proto._updateData = function( data, matrix, pushSimple, pushBezier ) {
	if ( this.visible === false || this.curves.length === 0) {
		return data;
	}

	// prototypo needs to be able to change the direction of the updated data.
	var reverse = this.exportReversed,
		curves = this.curves,
		start = curves[ reverse ? curves.length - 1 : 0 ]
			[ 'point' + ( reverse ? 2 : 1 ) ]
			.transform( matrix );

	pushSimple(
		'M',
		Math.round( start.x ) || 0,
		Math.round( start.y ) || 0
	);

	for ( var i = -1, l = curves.length; ++i < l; ) {
		var curve = curves[ reverse ? l - 1 - i : i ],
			end = curve['point' + ( reverse ? 1 : 2 ) ].transform( matrix );

		if ( curve.isLinear() ) {
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

proto.updateOTCommands = function( data, matrix ) {
	return this._updateData(
		data,
		matrix,
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

proto.updateSVGData = function( data, matrix ) {
	return this._updateData(
		data,
		matrix,
		function pushSimple() {
			data.push.apply( data, arguments );
		},
		function pushBezier() {
			data.push.apply( data, arguments );
		}
	);
};

proto.getSimplePath = function( precision, matrix ) {
	var path = [],
		offset,
		locationOnCurve;
		precision = precision || 50;

	if ( this.visible === false ) {
			return path;
	}

	if ( this.exportReversed ) {
		for (var i = this.curves.length - 1; i >= 0; i--) {
			var point2 = this.curves[i].point2.transform( matrix );
			path.push( { X: point2.x, Y: point2.y } );
			for (var j = precision - 1; j > 0; j--) {
				offset = j / precision;

				locationOnCurve = this.curves[i]
					.getLocationAt( offset, true ).point.transform( matrix );
				path.push( { X: locationOnCurve.x, Y: locationOnCurve.y } );
			}
		}
	} else {
		this.curves.forEach( function( item ) {
			var point1 = item.point1.transform( matrix );
			path.push( { X: point1.x, Y: point1.y } );
			for (var k = 1; k < precision; k++) {
				offset = k / precision;

				locationOnCurve = item
					.getLocationAt( offset, true ).point.transform( matrix );
				path.push( { X: locationOnCurve.x, Y: locationOnCurve.y } );
			}
		});
	}

	return path;
};

proto.getPath = function( solution, matrix ) {
/* eslint-disable */
	var path = this.getSimplePath( null, matrix );
	var newPathToAdd = new clipper.Paths();
	var c = new clipper.Clipper();
	c.StriclySimple = true;

	c.AddPaths( solution, clipper.PolyType.ptSubject, true );
	c.AddPath( path, clipper.PolyType.ptClip, true );
	try {
		c.Execute( clipper.ClipType.ctUnion,
			newPathToAdd,
			clipper.PolyFillType.pftNonZero,
			clipper.PolyFillType.pftNonZero);
	} catch ( err ) {
		newPathToAdd = solution;
		newPathToAdd.push( path );
	}

	return newPathToAdd;
/* eslint-enable */
};

module.exports = paper.Path;
