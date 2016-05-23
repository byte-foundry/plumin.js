var opentype = require('opentype.js');
var paper = require('paper');
var Font = require('./Font.js');
var Glyph = require('./Glyph.js');
var Outline = require('./Outline');
var Path = require('./Path.js');
var Node = require('./Node.js');

paper.PaperScope.prototype.Font = Font;
paper.PaperScope.prototype.Glyph = Glyph;
paper.PaperScope.prototype.Outline = Outline;
paper.PaperScope.prototype.Path = Path;
paper.PaperScope.prototype.Node = Node;

paper.opentype = opentype;

module.exports = paper;
