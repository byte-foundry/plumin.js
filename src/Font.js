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

	if ( args && args.glyphs ) {
		this.addGlyphs( args.glyphs );
	}

	this.addedFonts = [];
	// work around https://bugzilla.mozilla.org/show_bug.cgi?id=1100005
	// by using fonts.delete in batch, every 1 second
	if ( typeof window === 'object' && window.document ) {
		setInterval(function() {
			while ( this.addedFonts.length > 1 ) {
				document.fonts.delete( this.addedFonts.shift() );
			}
		}.bind(this), 1000);
	}
}

Font.prototype.addGlyph = function( glyph ) {
	this.glyphs.push( glyph );
	this.glyphMap[glyph.name] = glyph;

	if ( glyph.ot.unicode === undefined ) {
		return glyph;
	}

	// build the default cmap
	// if multiple glyphs share the same unicode, use the glyph where unicode and name are equal
	if ( !this.charMap[glyph.ot.unicode] ||
			( glyph.name.length === 1 && glyph.name.charCodeAt(0) === glyph.ot.unicode ) ) {

		this.charMap[glyph.ot.unicode] = glyph;
	}

	// build the alternates map
	if ( !this.altMap[glyph.ot.unicode] ) {
		this.altMap[glyph.ot.unicode] = [];
	}
	this.altMap[glyph.ot.unicode].push( glyph );

	return glyph;
};

Font.prototype.addGlyphs = function( glyphs ) {
	return glyphs.forEach(function( glyph ) {
		this.addGlyph(glyph);

	}, this);
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
			if ( this._subset === false &&
					( glyph.ot.unicode !== undefined ||
					( glyph.ot.unicodes && glyph.ot.unicodes.length ) ) ) {

				return true;
			}

			if ( this._subset && this._subset.indexOf( glyph.ot.unicode ) !== -1 ) {
				return true;
			}

			// TODO: handle multiple unicodes

			return false;
		}, this)
	];

	return this._lastSubset[1];
};

Font.prototype.interpolate = function( font0, font1, coef, set ) {
	this.getGlyphSubset( set ).map(function( glyph ) {
		glyph.interpolate(
			font0.glyphMap[glyph.name],
			font1.glyphMap[glyph.name],
			coef
		);
	});

	// TODO: evaluate if taking subsetting into account makes kerning
	// interpolation faster or slower.
	if ( this.ot.kerningPairs ) {
		for ( var i in this.ot.kerningPairs ) {
			this.ot.kerningPairs[i] =
				font0.ot.kerningPairs[i] +
				( font1.ot.kerningPairs[i] - font0.ot.kerningPairs[i] ) * coef;
		}
	}

	return this;
};

Font.prototype.updateOTCommands = function( set ) {
	this.ot.glyphs = this.getGlyphSubset( set ).map(function( glyph ) {
		return glyph.updateOTCommands();
	});

	return this;
};

Font.prototype.importOT = function( otFont ) {
	this.ot = otFont;

	otFont.glyphs.forEach(function( otGlyph ) {
		var glyph = new Glyph({
				name: otGlyph.name,
				unicode: otGlyph.unicode
			});

		this.addGlyph( glyph );
		glyph.importOT( otGlyph );

	}, this);

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
			this.addedFonts.push( fontface );

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