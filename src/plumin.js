var opentype = require('../node_modules/opentype.js/dist/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-core.js'),
	Font = require('./Font.js'),
	Glyph = require('./Glyph.js'),
	Contour = require('./Contour.js'),
	Node = require('./Node.js');

// The orientation of paths in a CompoundPath is altered in a strange way by paper
// Fix that behavior, see https://github.com/paperjs/paper.js/issues/590
paper.CompoundPath.prototype.insertChildren = paper.PathItem.prototype.insertChildren;

function plumin() {}

plumin.opentype = opentype;
plumin.paper = paper;
plumin.Font = Font;
plumin.Glyph = Glyph;
plumin.Contour = Contour;
plumin.Node = Node;
plumin.Point = paper.Point;
plumin.Matrix = paper.Matrix;
plumin.setup = paper.setup.bind(paper);

module.exports = plumin;