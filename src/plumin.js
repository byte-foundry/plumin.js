var opentype = require('../node_modules/opentype.js/src/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-core.js'),
	Font = require('./Font.js'),
	utils = require('./utils.js');

function plumin() {}

plumin.opentype = opentype;
plumin.paper = paper;
plumin.Font = font;
plumin.utils = utils;

module.exports = plumin;