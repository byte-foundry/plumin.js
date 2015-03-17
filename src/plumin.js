var opentype = require('../node_modules/opentype.js/dist/opentype.js'),
	paper = require('../node_modules/paper/dist/paper-core.js'),
	Font = require('./Font.js'),
	Glyph = require('./Glyph.js'),
	Path = require('./Path.js'),
	Node = require('./Node.js'),
	Collection = require('./Collection.js');

paper.PaperScope.prototype.Font = Font;
paper.PaperScope.prototype.Glyph = Glyph;
paper.PaperScope.prototype.Path = Path;
paper.PaperScope.prototype.Node = Node;
paper.PaperScope.prototype.Collection = Collection;

function plumin( arg ) {
	if ( arguments.length === 1 && arg instanceof Collection ) {
		return arg;
	}

	var c = Object.create( Collection.prototype );
	Collection.apply( c, arguments );
	return c;
}

plumin.opentype = opentype;

plumin.proxy = Collection.proxy.bind(plumin);
plumin.proxy(paper);

module.exports = plumin;
