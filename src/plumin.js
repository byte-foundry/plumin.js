var opentype = require('../node_modules/opentype.js/src/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-core.js'),
	Font = require('./Font.js'),
	Glyph = require('./Glyph.js'),
	Contour = require('./Contour.js');

function plumin() {}

plumin.opentype = opentype;
plumin.paper = paper;
plumin.Font = Font;
plumin.Glyph = Glyph;
plumin.Contour = Contour;
plumin.Node = paper.Segment;
plumin.Point = paper.Point;
plumin.Matrix = paper.Matrix;
plumin.setup = paper.setup.bind(paper);

module.exports = plumin;