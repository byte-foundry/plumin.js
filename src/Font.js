var opentype = require('../node_modules/opentype.js/dist/opentype.js'),
	Glyph = require('./Glyph.js');

function Font( args ) {
	if ( !args ) {
		args = {};
	}

	if ( !args.styleName ) {
		args.styleName = 'Regular';
	}

	if ( !args.unitsPerEm ) {
		args.unitsPerEm = 1024;
	}

	this.ot = new opentype.Font( args );

	this.glyphs = [];
	this.glyphMap = {};
	this.charMap = {};
	this.altMap = {};
	this._subset = false;

	this.addGlyph(new Glyph({
		name: '.notdef',
		unicode: 0
	}));
}

Font.prototype.addGlyph = function( glyph ) {
	this.glyphs.push( glyph );
	this.glyphMap[glyph.name] = glyph;

	// build the default cmap
	// if multiple glyphs share the same unicode, use the glyph where unicode and name are equal
	if ( !this.charMap[glyph.unicode] ||
			( glyph.name.length === 1 && glyph.name.charCodeAt(0) === glyph.unicode ) ) {

		this.charMap[glyph.unicode] = glyph;
	}

	// build the alternates map
	if ( !this.altMap[glyph.unicode] ) {
		this.altMap[glyph.unicode] = [];
	}
	this.altMap[glyph.unicode].push( glyph );

	return this;
};

Font.prototype.addGlyphs = function( glyphs ) {
	glyphs.forEach(function( glyph ) {
		this.addGlyph(glyph);

	}, this);

	return this;
};

Object.defineProperty( Font.prototype, 'subset', {
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
	if ( this._lastSubset && this._lastSubset[0] === ( this._subset || [] ).join() ) {
		return this._lastSubset[1];
	}

	// memoize last subset
	this._lastSubset = [
		( this._subset || [] ).join(),
		this.glyphs.filter(function( glyph ) {
			if ( this._subset === false && ( glyph.unicode !== false || glyph.unicodes.length ) ) {
				return true;
			}

			if ( this._subset.indexOf( glyph.unicode ) !== -1 ) {
				return true;
			}

			// TODO: handle multiple unicodes

			return false;
		}, this)
	];

	return this._lastSubset[1];
};

Font.prototype.prepareOT = function( set ) {
	this.ot.glyphs = this.getGlyphSubset( set ).map(function( glyph ) {
		return glyph.prepareOT();
	});

	return this;
};

if ( typeof window === 'object' && window.document ) {

	var _URL = window.URL || window.webkitURL,
		ruleIndex;
	Font.prototype.addToFonts = document.fonts ?
		// CSS font loading, lightning fast
		function( buffer ) {
			var fontface = new FontFace(
				this.ot.familyName,
				buffer || this.ot.toBuffer()
			);

			document.fonts.add( fontface );

			if ( this.lastFontFace ) {
				document.fonts.delete( this.lastFontFace );
			}

			this.lastFontFace = fontface;

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
				'@font-face { font-family: "' + this.ot.familyName + '"; src: url(' + url + '); }',
				ruleIndex || document.styleSheets[0].cssRules.length
			);

			return this;
		};

	Font.prototype.download = function( buffer ) {
		var reader = new FileReader();

		reader.onloadend = function() {
			window.location = reader.result;
		};

		reader.readAsDataURL(new Blob(
			[ new DataView( buffer || this.ot.toBuffer() ) ],
			{type: 'font/opentype'}
		));

		return this;
	};

}

module.exports = Font;