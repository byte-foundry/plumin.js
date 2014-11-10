var opentype = require('../node_modules/opentype.js/src/opentype.js');

function Font( args ) {
	this.ot = new opentype.Font( args );

	this.glyphs = [];
	this.glyphMap = {};
	this._subset = false;
}

Font.prototype.addGlyph = function( glyph ) {
	this.glyphs.push( glyph );
	this.glyphMap[glyph.name] = glyph;

	this.item.addChild( glyph );
};

Object.defineProperty( Font.prototype, subset, {
	get: function() {
		return this._subset;
	},
	set: function( set ) {
		if ( set === false ) {
			return ( this._subset = false );
		}

		return ( this._subset = (typeof set === 'string' ? set.split('') : set)
			.filter(function(e, i, arr) {
				return arr.lastIndexOf(e) === i;
			})
			.map(function(e) {
				return e.charCodeAt(0);
			})
			.sort()
		);
	}
});

Font.prototype.getGlyphSubset = function( set ) {
	if ( set !== undefined ) {
		this.subset = set;
	}

	// reuse last subset if possible
	if ( this._lastSubset && this._lastSubset[0] === ( this._subset || '' ).join() ) {
		return this._lastSubset[1];
	}

	// memoize last subset
	this._lastSubset = [
		( this._subset || '' ).join(),
		this.glyphs.filter(function( glyph ) {
			if ( this._subset === false && ( glyph.unicode !== undefined || glyph.unicodes.length ) ) {
				return true;
			}

			if ( this._subset.indexOf( glyph.unicode ) !== -1 ) {
				return true;
			}

			// TODO: handle multiple unicodes

			return false;
		})
	];

	return this._lastSubset[1];
};

Font.prototype.prepareOT = function() {
	this.ot.glyphs = this.getGlyphSubset().map(function( glyph ) {
		return glyph.prepareOT();
	});

	return this;
};

var _URL = window.URL || window.webkitURL,
	ruleIndex;
Font.prototype.addToFonts = document.fonts ?
	// CSS font loading, lightning fast
	function( buffer ) {
		document.fonts.add(
			new FontFace(
				this.familyName,
				buffer || this.ot.toBuffer()
			)
		);

		return this;
	}:
	function( buffer ) {
		var url = _URL.createObjectURL(
			new Blob(
				[ new DataView( buffer || this.ot.toBuffer() ) ],
				{type: 'font/opentype'}
			)
		);

		if ( ruleIndex ) {
			document.styleSheets[0].deleteRule( ruleIndex );
		}

		ruleIndex = document.styleSheets[0].insertRule(
			'@font-face { font-family: "' + this.familyName + '"; src: url(' + url + '); }',
			ruleIndex || document.styleSheets[0].cssRules.length
		);

		return this;
	};

module.exports = Font;