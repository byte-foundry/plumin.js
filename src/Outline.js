export default class Outline {
	constructor() {
		this.children = [];
	}

	insertChildren(index, aItems) {
		let items = aItems;

		if (Array.isArray(items)) {
			// flatten items to handle CompoundPath children
			items = [].concat([], ...items.map((item) => {
				return item.children ? item.children : item;
			}));
		}

		this.children.splice(index, 0, ...items);
	}

	fromPath(path) {
	}

	interpolate(ouline0, outline1, coef) {
		for (let i = 0, l = this.children.length; i < l; i++) {
			// The number of children should be the same everywhere,
			// but we're going to try our best anyway
			if (!outline0.children[i] || !outline1.children[i]) {
				break;
			}

			this.children[i].interpolate(
				outline0.children[i],
				outline1.children[i],
				coef
			);
		}

		return this;
	}

	updateSVGData(path = []) {
		this.svgData = path;

		this.children.forEach((contour) => {
			contour.updateSVGData(path);
		}, this);

		return this.svgData;
	}
		/*
	combineTo(outline) {
		return this.children.reduce(function(reducing, path) {
			// ignore empty and open paths
			if (path.curves.length === 0 || !path.closed) {
				return reducing;
			}

			const tmp = (reducing === undefined
				// when the initial value doesn't exist, use the first path
				// (clone it otherwise it's removed from this.children)
				? path.clone(false)
				: reducing[
					path.clockwise === !(path.exportReversed) ? 'unite' : 'subtract'
				](path)
			);

			return (tmp.constructor === paper.Path ?
				new paper.CompoundPath({children: [ tmp ]}) :
				tmp
			);

		}, outline);
	}
	*/

	updateOTCommands(path = []) {
		this.ot.path.commands = path;

		this.children.forEach((contour) => {
			contour.updateOTCommands(path);
		});

		return this.ot;
	}
}
	/*
Outline.fromPath = function( path ) {
	var result = new Outline();
	return path._clone( result, false );
};
*/
