var paper = require('../node_modules/paper/dist/paper-core.js');

Object.defineProperty( paper.Segment.prototype, 'x', {
	get: function() {
		return this.point.x;
	},
	set: function( value ) {
		this.point.x = value;
	}
});

Object.defineProperty( paper.Segment.prototype, 'y', {
	get: function() {
		return this.point.y;
	},
	set: function( value ) {
		this.point.y = value;
	}
});

module.exports = paper.Segment;