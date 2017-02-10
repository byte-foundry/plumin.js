/* @flow */
import type {GlyphElem} from '../typedef/types.js.flow';

import Outline from './Outline.js';

export default class OutlineGroup {
	children: Array<GlyphElem>;

	constructor({children}: {children: Array<GlyphElem>} = {children: []}) {
		this.children = children;
	}

	addChild(child: GlyphElem): OutlineGroup {
		const children = [...this.children];

		children.push(child);

		return new OutlineGroup({
			children,
		});
	}

	removeChild(index: number): OutlineGroup {
		const children = [...this.children];

		children.splice(index, 1);

		return new OutlineGroup({
			children,
		});
	}

	insertChild(index: number, child: GlyphElem): OutlineGroup {
		const children = [...this.children];

		children.splice(index, 0, child);

		return new OutlineGroup({
			children,
		});
	}

	static interpolate(outlineGroup0: OutlineGroup, outlineGroup1: OutlineGroup, coef: number): OutlineGroup {
		const children = [];

		if (outlineGroup0.children.length === outlineGroup1.children.length) {
			for (let i = 0; i < outlineGroup0.children.length; i++) {
				const glyphElem0 = outlineGroup0.children[i];
				const glyphElem1 = outlineGroup1.children[i];

				if (glyphElem0 instanceof Outline
					&& glyphElem1 instanceof Outline) {
					children.push(Outline.interpolate(glyphElem0, glyphElem1, coef));
				}
				else if (glyphElem0 instanceof OutlineGroup
					&& glyphElem1 instanceof OutlineGroup) {
					children.push(OutlineGroup.interpolate(glyphElem0, glyphElem1, coef));
				}
			}
		}

		return new OutlineGroup({
			children,
		});
	}

	getSVGData(aPath: {commands: Array<mixed>} = {commands: []}): {commands: Array<mixed>} {
		const path = {
			commands: [...aPath.commands],
		};

		this.children.forEach((outline) => {
			outline.getSVGData(path);
		});

		return path;
	}

	getOTCommands(aPath: {commands: Array<mixed>} = {commands: []}): {commands: Array<mixed>} {
		const path = {
			commands: [...aPath.commands],
		};

		this.children.forEach((outline) => {
			outline.getOTCommands(path);
		});

		return path;
	}
}
