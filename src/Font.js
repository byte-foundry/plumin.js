var opentype = require('../node_modules/opentype.js/dist/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-core.js'),
	Glyph = require('./Glyph.js');

function Font( args ) {
	paper.Group.prototype.constructor.apply( this );

	if ( !args ) {
		args = {};
	}

	if ( !args.styleName ) {
		args.styleName = 'Regular';
	}

	if ( !args.unitsPerEm ) {
		args.unitsPerEm = 1024;
	}

	this.fontinfo = this.ot = new opentype.Font( args );

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

	if ( typeof window === 'object' && window.document && !document.fonts ) {
		document.head.appendChild(
			this.styleElement = document.createElement('style')
		);
		// let's find the corresponding CSSStyleSheet
		// (would be much easier with Array#find)
		this.styleSheet = document.styleSheets[
			[].map.call(document.styleSheets, function(ss) {
				return ss.ownerNode;
			}).indexOf(this.styleElement)
		];
	}
}

Font.prototype = Object.create(paper.Group.prototype);
Font.prototype.constructor = Font;

// proxy .glyphs to .children
// Todo: handle unicode updates
Object.defineProperty(
	Font.prototype,
	'glyphs',
	Object.getOwnPropertyDescriptor( paper.Item.prototype, 'children' )
);

// TODO: proper proxying of ...Glyph[s] methods to ...Child[ren] methods
// see Glyph.js
Font.prototype.addGlyph = function( glyph ) {
	this.addChild( glyph );
	this.glyphMap[glyph.name] = glyph;

	if ( glyph.ot.unicode === undefined ) {
		return glyph;
	}

	// build the default cmap
	// if multiple glyphs share the same unicode, use the glyph where unicode
	// and name are equal
	if ( !this.charMap[glyph.ot.unicode] ||
			( glyph.name.length === 1 &&
				glyph.name.charCodeAt(0) === glyph.ot.unicode ) ) {

		this.charMap[glyph.ot.unicode] = glyph;
	}

	// build the alternates map
	if ( !this.altMap[glyph.ot.unicode] ) {
		this.altMap[glyph.ot.unicode] = [];
	}
	this.altMap[glyph.ot.unicode].push( glyph );

	// invalidate glyph subset cache
	// TODO: switch to immutable.js to avoid this maddness
	this._lastSubset = undefined;

	return glyph;
};

Font.prototype.addGlyphs = function( glyphs ) {
	return glyphs.forEach(function( glyph ) {
		this.addGlyph(glyph);

	}, this);
};

Object.defineProperty( Font.prototype, 'subset', {
	get: function() {
		return this.getGlyphSubset();
	},
	set: function( set ) {
		this._subset =
			typeof set === 'boolean' ? set :
			Font.normalizeSubset( set );
	}
});

Font.normalizeSubset = function( set ) {
	return ( typeof set === 'string' ?
			set.split('').map(function(e) {
				return e.charCodeAt(0);
			}) :
			set || []
		)
		.filter(function(e, i, arr) {
			return arr.lastIndexOf(e) === i;
		})
		.sort();
};

Font.prototype.getGlyphSubset = function( _set ) {
	var set =
			_set === undefined ? this._subset :
			typeof _set === 'boolean' ? _set :
			Font.normalizeSubset( _set );

	// true returns all glyphs
	if ( set === true ) {
		return this.children;
	}

	// Assume the set provided was an array of glyphs
	if ( set.length && typeof set[0] !== 'number' ) {
		// always include .undef
		if ( set.indexOf( this.glyphMap['.notdef'] ) === -1 ) {
			set.unshift( this.glyphMap['.notdef'] );
		}
		return set;
	}

	// reuse last subset if possible
	// TODO: implement caching using immutable.js
	if ( this._lastSubset &&
			this._lastSubset[0] ===
			( typeof set === 'object' ? set.join() : set ) ) {

		return this._lastSubset[1];
	}

	// memoize last subset
	this._lastSubset = [
		// store the set serialized to make subsequent comparisons easier
		typeof set === 'object' ? set.join() : set,
		this.children.filter(function( glyph ) {
			// false will return all glyphs that have one or more unicodes
			if ( set === false &&
					( glyph.ot.unicode !== undefined ||
					( glyph.ot.unicodes && glyph.ot.unicodes.length ) ) ) {

				return true;
			}

			if ( set &&
					( set.indexOf( glyph.ot.unicode ) !== -1 ) ||
					( glyph.ot.unicode === 0 ) ) {

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

	this.ot.ascender =
		font0.ot.ascender + ( font1.ot.ascender - font0.ot.ascender ) * coef;
	this.ot.descender =
		font0.ot.descender + ( font1.ot.descender - font0.ot.descender ) * coef;

	return this;
};

Font.prototype.updateSVGData = function( set ) {
	this.getGlyphSubset( set ).map(function( glyph ) {
		return glyph.updateSVGData();
	});

	return this;
};

Font.prototype.updateOTCommands = function( set ) {
	this.getGlyphSubset( set ).map(function( glyph ) {
		return glyph.updateOTCommands();
	});

	this.ot.glyphs = this.getGlyphSubset().map(function( glyph ) {
		return glyph.ot;
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

	var _URL = window.URL || window.webkitURL;
	Font.prototype.addToFonts = document.fonts ?
		// CSS font loading, lightning fast
		function( buffer ) {
			var fontface = new window.FontFace(
				this.ot.familyName,
				buffer || this.ot.toBuffer()
			);

			document.fonts.add( fontface );

			if ( this.lastFontFace ) {
				document.fonts.delete( this.lastFontFace );
			}

			this.lastFontFace = fontface;

			return this;
		} :
		function( buffer ) {
			var url = _URL.createObjectURL(
					new Blob(
						[ new DataView( buffer || this.ot.toBuffer() ) ],
						{ type: 'font/opentype' }
					)
				);

			if ( this.fontObjectURL ) {
				_URL.revokeObjectURL( this.fontObjectURL );
				this.styleSheet.deleteRule(0);
			}

			this.styleSheet.insertRule(
				'@font-face { font-family: "' + this.ot.familyName + '";' +
				'src: url(' + url + '); }',
				0
			);
			this.fontObjectURL = url;

			return this;
		};

	var a = document.createElement('a');
	Font.prototype.download = function( buffer ) {
		var reader = new FileReader(),
			familyName = this.ot.familyName;

		reader.onloadend = function() {
			a.download = familyName + '.otf';
			a.href = reader.result;
			a.dispatchEvent(new MouseEvent('click'));

			setTimeout(function() {
				a.href = '#';
				_URL.revokeObjectURL( reader.result );
			}, 100);
		};

		reader.readAsDataURL(new Blob(
			[ new DataView( buffer || this.ot.toBuffer() ) ],
			{ type: 'font/opentype' }
		));

		return this;
	};

}

module.exports = Font;
