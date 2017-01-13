import opentype from 'opentype.js';
import Glyph from './Glyph.js';
import assign from 'lodash';

const _URL = window.URL || window.webkitURL;

const a = document.createElement('a');

const triggerDownload = (font, arrayBuffer, filename) => {
	const reader = new FileReader();
	const enFamilyName = filename || font.ot.getEnglishName('fontFamily');

	reader.onloadend = () => {
		a.download = `${enFamilyName }.otf`;
		a.href = reader.result;
		a.dispatchEvent(new MouseEvent('click'));

		setTimeout(() => {
			a.href = '#';
			_URL.revokeObjectURL(reader.result);
		}, 100);
	};

	reader.readAsDataURL(new Blob(
		[ new DataView(arrayBuffer || font.toArrayBuffer()) ],
		{type: 'font/opentype'}
	));
};


function mergeFont(url, name, user, arrayBuffer, merged, cb) {
	fetch(
		[
			url,
			name.family,
			name.style,
			user,
			name.template || 'unknown',
		].join('/')
		+ (merged ? '/overlap' : ''), {
			method: 'POST',
			headers: {'Content-Type': 'application/otf'},
			body: arrayBuffer,
	})
	.then(function(response) {
		return response.arrayBuffer();
	})
	.then(cb);
}

export default class Font {
	constructor(aArgs) {
		const args = assign({
			familyName: 'Default familyName',
			styleName: 'Regular',
			ascender: 1,
			descender: -1,
			unitsPerEm: 1024,
		}, aArgs);

		this.fontinfo = this.ot = new opentype.Font(args);

		this.glyphMap = {};
		this.charMap = {};
		this.altMap = {};
		this._subset = false;
		this.fontMap = {};

		this.addGlyph(new Glyph({
			name: '.notdef',
			unicode: 0,
			advanceWidth: 650,
		}));

		if (args && args.glyphs) {
			this.addGlyphs(args.glyphs);
		}

		if (typeof window === 'object' && window.document && !document.fonts) {
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

	get glyphs() {
		return this.glyphMap;
	}

	addGlyph(glyph) {
		this.glyphMap[glyph.name] = glyph;

		if (glyph.ot.unicode === undefined) {
			return glyph;
		}

		// build the default cmap
		// if multiple glyphs share the same unicode, use the glyph where unicode
		// and name are equal
		if (!this.charMap[glyph.ot.unicode]
				|| (glyph.name.length === 1
				&& glyph.name.charCodeAt(0) === glyph.ot.unicode)) {

			this.charMap[glyph.ot.unicode] = glyph;
		}

		// build the alternates map
		if (!this.altMap[glyph.ot.unicode]) {
			this.altMap[glyph.ot.unicode] = [];
		}
		this.altMap[glyph.ot.unicode].push(glyph);

		// invalidate glyph subset cache
		// TODO: switch to immutable.js to avoid this maddness
		this._lastSubset = undefined;

		return glyph;
	}

	addGlyphs(glyphs) {
		return glyphs.forEach(function(glyph) {
			this.addGlyph(glyph);

		}, this);
	}

	get subset() {
		if (!this._subset) {
			this._subset = this.normalizeSubset(false);
		}
		return this._subset;
	}

	set subset(set) {
		this._subset = this.normalizeSubset(set);
	}

	normalizeSubset(_set) {
		let set;

		// two cases where _set isn't an array
		// false set = all glyphs in the charMap
		if (_set === false) {
			set = Object.keys(this.charMap).map(function(unicode) {
				return this.charMap[unicode];
			}.bind(this));

		// convert string to array of chars
		}
		else if (typeof _set === 'string') {
			set = _set.split('').map(function(e) {
				return e.charCodeAt(0);
			});
		}
		else {
			set = _set;
		}

		// convert array of number to array of glyphs
		if (Array.isArray(set) && typeof set[0] === 'number') {
			set = set.map(function(unicode) {
				return this.charMap[unicode];
			}.bind(this));
		}

		// always include .undef
		if (set.indexOf(this.glyphMap['.notdef']) === -1) {
			set.unshift(this.glyphMap['.notdef']);
		}

		// when encountering diacritics, include their base-glyph in the subset
		set.forEach(function(glyph) {
			if (glyph && glyph.base !== undefined) {
				const base = this.charMap[glyph.base];

				if (set.indexOf(base) === -1) {
					set.unshift(base);
				}
			}
		}, this);

		// remove undefined glyphs, dedupe the set and move diacritics at the end
		return set.filter(function(e, i, arr) {
			return e && arr.lastIndexOf(e) === i;
		});
	}

	getGlyphSubset(_set) {
		return _set === undefined ? this.subset : this.normalizeSubset(_set);
	}

	setAlternateFor(unicode, glyphName) {
		this.charMap[unicode] = this.glyphMap[glyphName];
	}

	interpolate(font0, font1, coef, set) {
		this.getGlyphSubset(set).map(function(glyph) {
			glyph.interpolate(
				font0.glyphMap[glyph.name],
				font1.glyphMap[glyph.name],
				coef
			);
		});

		// TODO: evaluate if taking subsetting into account makes kerning
		// interpolation faster or slower.
		if (this.ot.kerningPairs) {
			for (const i in this.ot.kerningPairs) {
				this.ot.kerningPairs[i] = font0.ot.kerningPairs[i]
					+ (font1.ot.kerningPairs[i] - font0.ot.kerningPairs[i]) * coef;
			}
		}

		this.ot.ascender = font0.ot.ascender
			+ (font1.ot.ascender - font0.ot.ascender) * coef;
		this.ot.descender = font0.ot.descender
			+ (font1.ot.descender - font0.ot.descender) * coef;

		return this;
	}

	updateSVGData(set) {
		this.getGlyphSubset(set).map(function(glyph) {
			return glyph.updateSVGData();
		});

		return this;
	}

	updateOTCommands(set, shouldMerge) {
		return this.updateOT({
			set,
			shouldUpdateCommands: true,
			shouldMerge,
		});
	}

	updateOT(args) {
		if (args && args.shouldUpdateCommands) {
			// the following is required so that the globalMatrix of glyphs
			// is taken into account on each update. I assume this is done in the
			// main thread when calling view.update();
			this._project._updateVersion++;
		}

		this.ot.glyphs.glyphs = (
			this.getGlyphSubset(args && args.set).reduce(function(o, glyph, i) {
				if (args && args.shouldUpdateCommands) {
					o[i] = args.shouldMerge
						? glyph.combineOTCommands(null)
						: glyph.updateOTCommands(null);
				}
				else {
					o[i] = glyph.ot;
				}

				return o;
			}, {})
		);
		this.ot.glyphs.length = Object.keys(this.ot.glyphs.glyphs).length;
		return this;
	}

	toArrayBuffer() {
		// rewrite the postScriptName to remove invalid characters
		// TODO: this should be fixed in opentype.js
		this.ot.names.postScriptName.en = (
			this.ot.names.postScriptName.en.replace(/[^A-z]/g, '_')
		);

		return this.ot.toArrayBuffer();
	}

	importOT(otFont) {
		this.ot = otFont;

		for (let i = 0; i < otFont.glyphs.length; ++i) {
			const otGlyph = otFont.glyphs.get(i);
			const glyph = new Glyph({
					name: otGlyph.name,
					unicode: otGlyph.unicode,
				});

			this.addGlyph(glyph);
			glyph.importOT(otGlyph);
		}

		return this;
	}

	addToFonts(buffer, aEnFamilyName, noMerge) {
		if (typeof window === 'object' && window.document) {
			if (document.fonts) {
				//cancelling in browser merge
				clearTimeout(this.mergeTimeout);

				const enFamilyName = aEnFamilyName || this.ot.getEnglishName('fontFamily');

				if (this.fontMap[enFamilyName]) {
					document.fonts.delete(this.fontMap[enFamilyName]);
				}

				const fontface = this.fontMap[enFamilyName] = (
					new window.FontFace(
						enFamilyName,
						buffer || this.toArrayBuffer()
					)
				);

				if (fontface.status === 'error') {
					throw new Error('Fontface is invalid and cannot be displayed');
				}

				document.fonts.add(fontface);

				//we merge font that haven't been merge
				if (!noMerge) {
					const timeoutRef = this.mergeTimeout = setTimeout(() => {
					mergeFont(
						'https://merge.prototypo.io',
						{
							style: 'forbrowserdisplay',
							template: 'noidea',
							family: 'forbrowserdisplay',
						},
						'plumin',
						buffer,
						true,
						(mergedBuffer) => {
							if (timeoutRef === this.mergeTimeout) {
								this.addToFonts(mergedBuffer, enFamilyName, true);
							}
						}
					);
					}, 300);
				}

				return this;
			}
			else {
				if (!enFamilyName) {
					enFamilyName = this.ot.getEnglishName('fontFamily');
				}

				const url = _URL.createObjectURL(
						new Blob(
							[ new DataView(buffer || this.toArrayBuffer()) ],
							{type: 'font/opentype'}
						)
					);

				if (this.fontObjectURL) {
					_URL.revokeObjectURL(this.fontObjectURL);
					this.styleSheet.deleteRule(0);
				}

				this.styleSheet.insertRule(
					`@font-face { font-family: "${ enFamilyName }";src: url(${ url }); }`,
					0
				);
				this.fontObjectURL = url;

				return this;
			}
		}
	}

	download(arrayBuffer, name, user, merged) {
		if (typeof window === 'object' && window.document) {
			if (!merged) {
				triggerDownload(
					this,
					arrayBuffer,
					name && (`${name.family } ${ name.style}`));
			}
			// TODO: replace that with client-side font merging
			if (name && user) {
				mergeFont(
					'https://merge.prototypo.io',
					name,
					user,
					arrayBuffer,
					merged,
					function(bufferToDownload) {
						if (merged) {
							triggerDownload(this, bufferToDownload);
						}
					}.bind(this)
				);
			}

			return this;
		}
	}
}
