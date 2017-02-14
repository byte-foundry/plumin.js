/* @flow */
import type {Subset, OtObj} from '../typedef/types.js.flow';
import opentype from 'opentype.js';
import Glyph from './Glyph.js';


export default class Font {
	ot: {
		familyName: string,
		styleName: string,
		ascender: number,
		descender: number,
		unitsPerEm: number,
	};
	glyphMap: {[key: string]: Glyph};
	charMap: {[key: string]: Glyph};
	altMap: {[key: string]: Array<Glyph>};
	_subset: ?Array<Glyph>;
	styleElement: any;
	styleSheet: any;
	fontMap: Object;
	mergeTimeout: number;

	constructor(aArgs: {
		familyName?: string,
		styleName?: string,
		ascender?: number,
		descender?: number,
		unitsPerEm?: number,
		glyphMap?: {[key: string]: Glyph};
		charMap?: {[key: string]: Glyph};
		altMap?: {[key: string]: Array<Glyph>};
		subset?: Array<Glyph>;
	}) {
		const args = {
			familyName: 'Default familyName',
			styleName: 'Regular',
			ascender: 1,
			descender: -1,
			unitsPerEm: 1024,
			...aArgs,
		};

		this.ot = {...args};

		this.glyphMap = args.glyphMap || {};
		this.charMap = args.charMap || {};
		this.altMap = args.altMap || {};
		this._subset = args.subset || [];
		this.fontMap = {};

		const notdef = new Glyph({
			name: '.notdef',
			unicode: 0,
			advanceWidth: 650,
		});

		if (!this.glyphMap['.notdef']) {
			this.glyphMap['.notdef'] = notdef;
			this.charMap['0'] = notdef;
			this.altMap['0'] = [notdef];
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

	get glyphs(): {[key: string]: Glyph} {
		return this.glyphMap;
	}

	addGlyph(glyph: Glyph): Font {
		return this.addGlyphs([glyph]);
	}

	addGlyphs(glyphs: Array<Glyph>): Font {
		const glyphMap = {...this.glyphMap};
		const charMap = {...this.charMap};
		const altMap = {...this.altMap};

		glyphs.forEach((glyph) => {
			glyphMap[glyph.name] = glyph;

			if (glyph.ot.unicode === undefined) {
				return glyph;
			}

			// build the default cmap
			// if multiple glyphs share the same unicode, use the glyph where unicode
			// and name are equal
			if (!charMap[glyph.ot.unicode]
					|| (glyph.name.length === 1
					&& glyph.name.charCodeAt(0) === glyph.ot.unicode)) {

				charMap[glyph.ot.unicode] = glyph;
			}

			// build the alternates map
			if (!altMap[glyph.ot.unicode]) {
				altMap[glyph.ot.unicode] = [];
			}
			altMap[glyph.ot.unicode].push(glyph);
		});

		return new Font({
			familyName: this.ot.familyName,
			styleName: this.ot.styleName,
			ascender: this.ot.ascender,
			descender: this.ot.descender,
			unitsPerEm: this.ot.unitsPerEm,
			glyphMap,
			charMap,
			altMap,
			subset: this._subset || [],
		});
	}

	get subset(): Array<Glyph> {
		if (!this._subset) {
			this._subset = this.normalizeSubset();
		}
		return this._subset;
	}

	setSubset(set: Subset): Font {
		const subset = this.normalizeSubset(set);

		return new Font({
			familyName: this.ot.familyName,
			styleName: this.ot.styleName,
			ascender: this.ot.ascender,
			descender: this.ot.descender,
			unitsPerEm: this.ot.unitsPerEm,
			glyphMap: this.glyphMap,
			charMap: this.charMap,
			altMap: this.altMap,
			subset,
		});
	}

	normalizeSubset(_set?: Subset): Array<Glyph> {
		let setString: string;
		let setArrayNumber: Array<number>;
		let setArrayGlyph: Array<Glyph> = [];
		let result: Array<Glyph> = [];

		if (typeof _set === 'string') {
			setString = _set;
		}
		else if (Array.isArray(_set)) {
			setArrayNumber = _set;
		}

		// two cases where _set isn't an array
		// false set = all glyphs in the charMap
		if (_set === undefined) {
			setArrayGlyph = Object.keys(this.charMap).map((unicode) => {
				return this.charMap[unicode];
			});

		// convert string to array of chars
		}
		else if (setString) {
			setArrayNumber = setString.split('').map((e) => {
				return e.charCodeAt(0);
			});
		}

		// convert array of number to array of glyphs
		if (setArrayNumber) {
			setArrayGlyph = setArrayNumber.filter((unicode) => {
				return typeof unicode === 'number';
			}).map((unicode) => {
				return this.charMap[unicode.toString()];
			});
		}

		result = setArrayGlyph;

		// always include .undef
		if (result.indexOf(this.glyphMap['.notdef']) === -1) {
			result.unshift(this.glyphMap['.notdef']);
		}

		// when encountering diacritics, include their base-glyph in the subset
		result.forEach((glyph) => {
			if (glyph && glyph._base) {
				const base = this.charMap[glyph._base.toString()];

				if (result.indexOf(base) === -1) {
					result.unshift(base);
				}
			}
		});

		// remove undefined glyphs, dedupe the set and move diacritics at the end
		return result.filter((e, i, arr) => {
			return e && arr.lastIndexOf(e) === i;
		});
	}

	getGlyphSubset(_set?: Subset): Array<Glyph> {
		return _set === undefined ? this.subset : this.normalizeSubset(_set);
	}

	setAlternateFor(unicode: number, glyphName: string): Font {
		const charMap = {...this.charMap};

		charMap[unicode.toString()] = this.glyphMap[glyphName];

		return new Font({
			familyName: this.ot.familyName,
			styleName: this.ot.styleName,
			ascender: this.ot.ascender,
			descender: this.ot.descender,
			unitsPerEm: this.ot.unitsPerEm,
			glyphMap: this.glyphMap,
			charMap,
			altMap: this.altMap,
			subset: this._subset || [],
		});
	}

	/*
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
				if (Object.prototype.hasOwnProperty.call(this.ot.kerningPairs, i)) {
					this.ot.kerningPairs[i] = font0.ot.kerningPairs[i]
						+ (font1.ot.kerningPairs[i] - font0.ot.kerningPairs[i]) * coef;
				}
			}
		}

		this.ot.ascender = font0.ot.ascender
			+ (font1.ot.ascender - font0.ot.ascender) * coef;
		this.ot.descender = font0.ot.descender
			+ (font1.ot.descender - font0.ot.descender) * coef;

		return this;
	}
	*/

	getSVGData(set: Subset): Array<{commands: Array<mixed>}> {
		const result = this.getGlyphSubset(set).map(function(glyph) {
			return glyph.getSVGData();
		});

		return result;
	}

	getOTCommands(set: Subset, shouldMerge: boolean): Array<{commands: Array<mixed>, ot: OtObj}> {
		return this.getOT({
			set,
			shouldUpdateCommands: true,
			shouldMerge,
		});
	}

	getOT(args: {
		set: Subset,
		shouldUpdateCommands: boolean,
		shouldMerge: boolean,
	}): Array<{commands: Array<mixed>, ot: OtObj}> {
		const glyphs = this.getGlyphSubset(args && args.set).map((glyph) => {

				const result = {...glyph.getOTCommands(), ot: glyph.ot};

				return result;
			});

		return glyphs;
	}

	toArrayBuffer(otCommands: Array<{commands: Array<mixed>, ot: OtObj}>): ArrayBuffer {
		const glyphs = otCommands.map((otCommand) => {
			const result = new opentype.Glyph({
				name: otCommand.ot.name,
				unicode: otCommand.ot.unicode,
				advanceWidth: otCommand.ot.advanceWidth,
			});

			result.path.commands = otCommand.commands;

			return result;
		});
		const otFont = new opentype.Font({
			familyName: this.ot.familyName,
			styleName: this.ot.styleName,
			ascender: this.ot.ascender,
			descender: this.ot.descender,
			unitsPerEm: this.ot.unitsPerEm,
			glyphs,
		});

		// rewrite the postScriptName to remove invalid characters
		// TODO: this should be fixed in opentype.js
		otFont.names.postScriptName.en = (
			otFont.names.postScriptName.en.replace(/[^A-z]/g, '_')
		);

		return otFont.toArrayBuffer();
	}

	importOT(otFont: any) {
		this.ot = otFont;

		for (let i = 0; i < otFont.glyphs.length; ++i) {
			const otGlyph = otFont.glyphs.get(i);
			const glyph = new Glyph({
					name: otGlyph.name,
					unicode: otGlyph.unicode,
					advanceWidth: otGlyph,
				});

			this.addGlyph(glyph);
			glyph.importOT(otGlyph);
		}

		return this;
	}


}

const _URL = window.URL || window.webkitURL;

const a = document.createElement('a');

const triggerDownload = (arrayBuffer: ArrayBuffer, filename: string): void => {
	const reader = new FileReader();
	const enFamilyName = filename;

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
		[ new DataView(arrayBuffer) ],
		{type: 'font/opentype'}
	));
};

export function download(arrayBuffer: ArrayBuffer, name: {family: string, style: string}): void {
	if (typeof window === 'object' && window.document) {
		triggerDownload(
			arrayBuffer,
			name && (`${name.family } ${ name.style}`));
	}
}

const fontMap: {[key: string]: any} = {};

export function addToFonts(buffer: ArrayBuffer, enFamilyName: string): void {
	if (typeof window === 'object' && window.document && document.fonts) {

		if (fontMap[enFamilyName]) {
			document.fonts.delete(fontMap[enFamilyName]);
		}

		const fontface = fontMap[enFamilyName] = (
			new window.FontFace(
				enFamilyName,
				buffer
			)
		);

		if (fontface.status === 'error') {
			throw new Error('Fontface is invalid and cannot be displayed');
		}

		document.fonts.add(fontface);
	}
}
