(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("./node/window"), require("./node/extend"));
	else if(typeof define === 'function' && define.amd)
		define(["./node/window", "./node/extend"], factory);
	else if(typeof exports === 'object')
		exports["plumin"] = factory(require("./node/window"), require("./node/extend"));
	else
		root["plumin"] = factory(root["./node/window"], root["./node/extend"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_33__, __WEBPACK_EXTERNAL_MODULE_34__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var opentype = __webpack_require__(2);
	var paper = __webpack_require__(32);
	var Font = __webpack_require__(35);
	var Glyph = __webpack_require__(36);
	var Outline = __webpack_require__(37);
	var Path = __webpack_require__(39);
	var Node = __webpack_require__(40);
	
	paper.PaperScope.prototype.Font = Font;
	paper.PaperScope.prototype.Glyph = Glyph;
	paper.PaperScope.prototype.Outline = Outline;
	paper.PaperScope.prototype.Path = Path;
	paper.PaperScope.prototype.Node = Node;
	
	paper.opentype = opentype;
	
	module.exports = paper;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	// opentype.js
	// https://github.com/nodebox/opentype.js
	// (c) 2015 Frederik De Bleser
	// opentype.js may be freely distributed under the MIT license.
	
	/* global DataView, Uint8Array, XMLHttpRequest  */
	
	'use strict';
	
	var inflate = __webpack_require__(3);
	
	var encoding = __webpack_require__(4);
	var _font = __webpack_require__(5);
	var glyph = __webpack_require__(15);
	var parse = __webpack_require__(12);
	var path = __webpack_require__(6);
	var util = __webpack_require__(25);
	
	var cmap = __webpack_require__(11);
	var cff = __webpack_require__(13);
	var fvar = __webpack_require__(27);
	var glyf = __webpack_require__(28);
	var gpos = __webpack_require__(29);
	var head = __webpack_require__(17);
	var hhea = __webpack_require__(18);
	var hmtx = __webpack_require__(19);
	var kern = __webpack_require__(30);
	var ltag = __webpack_require__(20);
	var loca = __webpack_require__(31);
	var maxp = __webpack_require__(21);
	var _name = __webpack_require__(22);
	var os2 = __webpack_require__(23);
	var post = __webpack_require__(24);
	
	// File loaders /////////////////////////////////////////////////////////
	
	function loadFromFile(path, callback) {
	    var fs = __webpack_require__(26);
	    fs.readFile(path, function(err, buffer) {
	        if (err) {
	            return callback(err.message);
	        }
	
	        callback(null, util.nodeBufferToArrayBuffer(buffer));
	    });
	}
	
	function loadFromUrl(url, callback) {
	    var request = new XMLHttpRequest();
	    request.open('get', url, true);
	    request.responseType = 'arraybuffer';
	    request.onload = function() {
	        if (request.status !== 200) {
	            return callback('Font could not be loaded: ' + request.statusText);
	        }
	
	        return callback(null, request.response);
	    };
	
	    request.send();
	}
	
	// Table Directory Entries //////////////////////////////////////////////
	
	function parseOpenTypeTableEntries(data, numTables) {
	    var tableEntries = [];
	    var p = 12;
	    for (var i = 0; i < numTables; i += 1) {
	        var tag = parse.getTag(data, p);
	        var checksum = parse.getULong(data, p + 4);
	        var offset = parse.getULong(data, p + 8);
	        var length = parse.getULong(data, p + 12);
	        tableEntries.push({tag: tag, checksum: checksum, offset: offset, length: length, compression: false});
	        p += 16;
	    }
	
	    return tableEntries;
	}
	
	function parseWOFFTableEntries(data, numTables) {
	    var tableEntries = [];
	    var p = 44; // offset to the first table directory entry.
	    for (var i = 0; i < numTables; i += 1) {
	        var tag = parse.getTag(data, p);
	        var offset = parse.getULong(data, p + 4);
	        var compLength = parse.getULong(data, p + 8);
	        var origLength = parse.getULong(data, p + 12);
	        var compression;
	        if (compLength < origLength) {
	            compression = 'WOFF';
	        } else {
	            compression = false;
	        }
	
	        tableEntries.push({tag: tag, offset: offset, compression: compression,
	            compressedLength: compLength, originalLength: origLength});
	        p += 20;
	    }
	
	    return tableEntries;
	}
	
	function uncompressTable(data, tableEntry) {
	    if (tableEntry.compression === 'WOFF') {
	        var inBuffer = new Uint8Array(data.buffer, tableEntry.offset + 2, tableEntry.compressedLength - 2);
	        var outBuffer = new Uint8Array(tableEntry.originalLength);
	        inflate(inBuffer, outBuffer);
	        if (outBuffer.byteLength !== tableEntry.originalLength) {
	            throw new Error('Decompression error: ' + tableEntry.tag + ' decompressed length doesn\'t match recorded length');
	        }
	
	        var view = new DataView(outBuffer.buffer, 0);
	        return {data: view, offset: 0};
	    } else {
	        return {data: data, offset: tableEntry.offset};
	    }
	}
	
	// Public API ///////////////////////////////////////////////////////////
	
	// Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
	// Throws an error if the font could not be parsed.
	function parseBuffer(buffer) {
	    var indexToLocFormat;
	    var ltagTable;
	
	    // Since the constructor can also be called to create new fonts from scratch, we indicate this
	    // should be an empty font that we'll fill with our own data.
	    var font = new _font.Font({empty: true});
	
	    // OpenType fonts use big endian byte ordering.
	    // We can't rely on typed array view types, because they operate with the endianness of the host computer.
	    // Instead we use DataViews where we can specify endianness.
	    var data = new DataView(buffer, 0);
	    var numTables;
	    var tableEntries = [];
	    var signature = parse.getTag(data, 0);
	    if (signature === String.fromCharCode(0, 1, 0, 0)) {
	        font.outlinesFormat = 'truetype';
	        numTables = parse.getUShort(data, 4);
	        tableEntries = parseOpenTypeTableEntries(data, numTables);
	    } else if (signature === 'OTTO') {
	        font.outlinesFormat = 'cff';
	        numTables = parse.getUShort(data, 4);
	        tableEntries = parseOpenTypeTableEntries(data, numTables);
	    } else if (signature === 'wOFF') {
	        var flavor = parse.getTag(data, 4);
	        if (flavor === String.fromCharCode(0, 1, 0, 0)) {
	            font.outlinesFormat = 'truetype';
	        } else if (flavor === 'OTTO') {
	            font.outlinesFormat = 'cff';
	        } else {
	            throw new Error('Unsupported OpenType flavor ' + signature);
	        }
	
	        numTables = parse.getUShort(data, 12);
	        tableEntries = parseWOFFTableEntries(data, numTables);
	    } else {
	        throw new Error('Unsupported OpenType signature ' + signature);
	    }
	
	    var cffTableEntry;
	    var fvarTableEntry;
	    var glyfTableEntry;
	    var gposTableEntry;
	    var hmtxTableEntry;
	    var kernTableEntry;
	    var locaTableEntry;
	    var nameTableEntry;
	
	    for (var i = 0; i < numTables; i += 1) {
	        var tableEntry = tableEntries[i];
	        var table;
	        switch (tableEntry.tag) {
	        case 'cmap':
	            table = uncompressTable(data, tableEntry);
	            font.tables.cmap = cmap.parse(table.data, table.offset);
	            font.encoding = new encoding.CmapEncoding(font.tables.cmap);
	            break;
	        case 'fvar':
	            fvarTableEntry = tableEntry;
	            break;
	        case 'head':
	            table = uncompressTable(data, tableEntry);
	            font.tables.head = head.parse(table.data, table.offset);
	            font.unitsPerEm = font.tables.head.unitsPerEm;
	            indexToLocFormat = font.tables.head.indexToLocFormat;
	            break;
	        case 'hhea':
	            table = uncompressTable(data, tableEntry);
	            font.tables.hhea = hhea.parse(table.data, table.offset);
	            font.ascender = font.tables.hhea.ascender;
	            font.descender = font.tables.hhea.descender;
	            font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
	            break;
	        case 'hmtx':
	            hmtxTableEntry = tableEntry;
	            break;
	        case 'ltag':
	            table = uncompressTable(data, tableEntry);
	            ltagTable = ltag.parse(table.data, table.offset);
	            break;
	        case 'maxp':
	            table = uncompressTable(data, tableEntry);
	            font.tables.maxp = maxp.parse(table.data, table.offset);
	            font.numGlyphs = font.tables.maxp.numGlyphs;
	            break;
	        case 'name':
	            nameTableEntry = tableEntry;
	            break;
	        case 'OS/2':
	            table = uncompressTable(data, tableEntry);
	            font.tables.os2 = os2.parse(table.data, table.offset);
	            break;
	        case 'post':
	            table = uncompressTable(data, tableEntry);
	            font.tables.post = post.parse(table.data, table.offset);
	            font.glyphNames = new encoding.GlyphNames(font.tables.post);
	            break;
	        case 'glyf':
	            glyfTableEntry = tableEntry;
	            break;
	        case 'loca':
	            locaTableEntry = tableEntry;
	            break;
	        case 'CFF ':
	            cffTableEntry = tableEntry;
	            break;
	        case 'kern':
	            kernTableEntry = tableEntry;
	            break;
	        case 'GPOS':
	            gposTableEntry = tableEntry;
	            break;
	        }
	    }
	
	    var nameTable = uncompressTable(data, nameTableEntry);
	    font.tables.name = _name.parse(nameTable.data, nameTable.offset, ltagTable);
	    font.names = font.tables.name;
	
	    if (glyfTableEntry && locaTableEntry) {
	        var shortVersion = indexToLocFormat === 0;
	        var locaTable = uncompressTable(data, locaTableEntry);
	        var locaOffsets = loca.parse(locaTable.data, locaTable.offset, font.numGlyphs, shortVersion);
	        var glyfTable = uncompressTable(data, glyfTableEntry);
	        font.glyphs = glyf.parse(glyfTable.data, glyfTable.offset, locaOffsets, font);
	    } else if (cffTableEntry) {
	        var cffTable = uncompressTable(data, cffTableEntry);
	        cff.parse(cffTable.data, cffTable.offset, font);
	    } else {
	        throw new Error('Font doesn\'t contain TrueType or CFF outlines.');
	    }
	
	    var hmtxTable = uncompressTable(data, hmtxTableEntry);
	    hmtx.parse(hmtxTable.data, hmtxTable.offset, font.numberOfHMetrics, font.numGlyphs, font.glyphs);
	    encoding.addGlyphNames(font);
	
	    if (kernTableEntry) {
	        var kernTable = uncompressTable(data, kernTableEntry);
	        font.kerningPairs = kern.parse(kernTable.data, kernTable.offset);
	    } else {
	        font.kerningPairs = {};
	    }
	
	    if (gposTableEntry) {
	        var gposTable = uncompressTable(data, gposTableEntry);
	        gpos.parse(gposTable.data, gposTable.offset, font);
	    }
	
	    if (fvarTableEntry) {
	        var fvarTable = uncompressTable(data, fvarTableEntry);
	        font.tables.fvar = fvar.parse(fvarTable.data, fvarTable.offset, font.names);
	    }
	
	    return font;
	}
	
	// Asynchronously load the font from a URL or a filesystem. When done, call the callback
	// with two arguments `(err, font)`. The `err` will be null on success,
	// the `font` is a Font object.
	//
	// We use the node.js callback convention so that
	// opentype.js can integrate with frameworks like async.js.
	function load(url, callback) {
	    var isNode = typeof window === 'undefined';
	    var loadFn = isNode ? loadFromFile : loadFromUrl;
	    loadFn(url, function(err, arrayBuffer) {
	        if (err) {
	            return callback(err);
	        }
	
	        var font = parseBuffer(arrayBuffer);
	        return callback(null, font);
	    });
	}
	
	// Syncronously load the font from a URL or file.
	// When done, return the font object or throw an error.
	function loadSync(url) {
	    var fs = __webpack_require__(26);
	    var buffer = fs.readFileSync(url);
	    return parseBuffer(util.nodeBufferToArrayBuffer(buffer));
	}
	
	exports._parse = parse;
	exports.Font = _font.Font;
	exports.Glyph = glyph.Glyph;
	exports.Path = path.Path;
	exports.parse = parseBuffer;
	exports.load = load;
	exports.loadSync = loadSync;


/***/ },
/* 3 */
/***/ function(module, exports) {

	var TINF_OK = 0;
	var TINF_DATA_ERROR = -3;
	
	function Tree() {
	  this.table = new Uint16Array(16);   /* table of code length counts */
	  this.trans = new Uint16Array(288);  /* code -> symbol translation table */
	}
	
	function Data(source, dest) {
	  this.source = source;
	  this.sourceIndex = 0;
	  this.tag = 0;
	  this.bitcount = 0;
	  
	  this.dest = dest;
	  this.destLen = 0;
	  
	  this.ltree = new Tree();  /* dynamic length/symbol tree */
	  this.dtree = new Tree();  /* dynamic distance tree */
	}
	
	/* --------------------------------------------------- *
	 * -- uninitialized global data (static structures) -- *
	 * --------------------------------------------------- */
	
	var sltree = new Tree();
	var sdtree = new Tree();
	
	/* extra bits and base tables for length codes */
	var length_bits = new Uint8Array(30);
	var length_base = new Uint16Array(30);
	
	/* extra bits and base tables for distance codes */
	var dist_bits = new Uint8Array(30);
	var dist_base = new Uint16Array(30);
	
	/* special ordering of code length codes */
	var clcidx = new Uint8Array([
	  16, 17, 18, 0, 8, 7, 9, 6,
	  10, 5, 11, 4, 12, 3, 13, 2,
	  14, 1, 15
	]);
	
	/* used by tinf_decode_trees, avoids allocations every call */
	var code_tree = new Tree();
	var lengths = new Uint8Array(288 + 32);
	
	/* ----------------------- *
	 * -- utility functions -- *
	 * ----------------------- */
	
	/* build extra bits and base tables */
	function tinf_build_bits_base(bits, base, delta, first) {
	  var i, sum;
	
	  /* build bits table */
	  for (i = 0; i < delta; ++i) bits[i] = 0;
	  for (i = 0; i < 30 - delta; ++i) bits[i + delta] = i / delta | 0;
	
	  /* build base table */
	  for (sum = first, i = 0; i < 30; ++i) {
	    base[i] = sum;
	    sum += 1 << bits[i];
	  }
	}
	
	/* build the fixed huffman trees */
	function tinf_build_fixed_trees(lt, dt) {
	  var i;
	
	  /* build fixed length tree */
	  for (i = 0; i < 7; ++i) lt.table[i] = 0;
	
	  lt.table[7] = 24;
	  lt.table[8] = 152;
	  lt.table[9] = 112;
	
	  for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
	  for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
	  for (i = 0; i < 8; ++i) lt.trans[24 + 144 + i] = 280 + i;
	  for (i = 0; i < 112; ++i) lt.trans[24 + 144 + 8 + i] = 144 + i;
	
	  /* build fixed distance tree */
	  for (i = 0; i < 5; ++i) dt.table[i] = 0;
	
	  dt.table[5] = 32;
	
	  for (i = 0; i < 32; ++i) dt.trans[i] = i;
	}
	
	/* given an array of code lengths, build a tree */
	var offs = new Uint16Array(16);
	
	function tinf_build_tree(t, lengths, off, num) {
	  var i, sum;
	
	  /* clear code length count table */
	  for (i = 0; i < 16; ++i) t.table[i] = 0;
	
	  /* scan symbol lengths, and sum code length counts */
	  for (i = 0; i < num; ++i) t.table[lengths[off + i]]++;
	
	  t.table[0] = 0;
	
	  /* compute offset table for distribution sort */
	  for (sum = 0, i = 0; i < 16; ++i) {
	    offs[i] = sum;
	    sum += t.table[i];
	  }
	
	  /* create code->symbol translation table (symbols sorted by code) */
	  for (i = 0; i < num; ++i) {
	    if (lengths[off + i]) t.trans[offs[lengths[off + i]]++] = i;
	  }
	}
	
	/* ---------------------- *
	 * -- decode functions -- *
	 * ---------------------- */
	
	/* get one bit from source stream */
	function tinf_getbit(d) {
	  /* check if tag is empty */
	  if (!d.bitcount--) {
	    /* load next tag */
	    d.tag = d.source[d.sourceIndex++];
	    d.bitcount = 7;
	  }
	
	  /* shift bit out of tag */
	  var bit = d.tag & 1;
	  d.tag >>>= 1;
	
	  return bit;
	}
	
	/* read a num bit value from a stream and add base */
	function tinf_read_bits(d, num, base) {
	  if (!num)
	    return base;
	
	  while (d.bitcount < 24) {
	    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
	    d.bitcount += 8;
	  }
	
	  var val = d.tag & (0xffff >>> (16 - num));
	  d.tag >>>= num;
	  d.bitcount -= num;
	  return val + base;
	}
	
	/* given a data stream and a tree, decode a symbol */
	function tinf_decode_symbol(d, t) {
	  while (d.bitcount < 24) {
	    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
	    d.bitcount += 8;
	  }
	  
	  var sum = 0, cur = 0, len = 0;
	  var tag = d.tag;
	
	  /* get more bits while code value is above sum */
	  do {
	    cur = 2 * cur + (tag & 1);
	    tag >>>= 1;
	    ++len;
	
	    sum += t.table[len];
	    cur -= t.table[len];
	  } while (cur >= 0);
	  
	  d.tag = tag;
	  d.bitcount -= len;
	
	  return t.trans[sum + cur];
	}
	
	/* given a data stream, decode dynamic trees from it */
	function tinf_decode_trees(d, lt, dt) {
	  var hlit, hdist, hclen;
	  var i, num, length;
	
	  /* get 5 bits HLIT (257-286) */
	  hlit = tinf_read_bits(d, 5, 257);
	
	  /* get 5 bits HDIST (1-32) */
	  hdist = tinf_read_bits(d, 5, 1);
	
	  /* get 4 bits HCLEN (4-19) */
	  hclen = tinf_read_bits(d, 4, 4);
	
	  for (i = 0; i < 19; ++i) lengths[i] = 0;
	
	  /* read code lengths for code length alphabet */
	  for (i = 0; i < hclen; ++i) {
	    /* get 3 bits code length (0-7) */
	    var clen = tinf_read_bits(d, 3, 0);
	    lengths[clcidx[i]] = clen;
	  }
	
	  /* build code length tree */
	  tinf_build_tree(code_tree, lengths, 0, 19);
	
	  /* decode code lengths for the dynamic trees */
	  for (num = 0; num < hlit + hdist;) {
	    var sym = tinf_decode_symbol(d, code_tree);
	
	    switch (sym) {
	      case 16:
	        /* copy previous code length 3-6 times (read 2 bits) */
	        var prev = lengths[num - 1];
	        for (length = tinf_read_bits(d, 2, 3); length; --length) {
	          lengths[num++] = prev;
	        }
	        break;
	      case 17:
	        /* repeat code length 0 for 3-10 times (read 3 bits) */
	        for (length = tinf_read_bits(d, 3, 3); length; --length) {
	          lengths[num++] = 0;
	        }
	        break;
	      case 18:
	        /* repeat code length 0 for 11-138 times (read 7 bits) */
	        for (length = tinf_read_bits(d, 7, 11); length; --length) {
	          lengths[num++] = 0;
	        }
	        break;
	      default:
	        /* values 0-15 represent the actual code lengths */
	        lengths[num++] = sym;
	        break;
	    }
	  }
	
	  /* build dynamic trees */
	  tinf_build_tree(lt, lengths, 0, hlit);
	  tinf_build_tree(dt, lengths, hlit, hdist);
	}
	
	/* ----------------------------- *
	 * -- block inflate functions -- *
	 * ----------------------------- */
	
	/* given a stream and two trees, inflate a block of data */
	function tinf_inflate_block_data(d, lt, dt) {
	  while (1) {
	    var sym = tinf_decode_symbol(d, lt);
	
	    /* check for end of block */
	    if (sym === 256) {
	      return TINF_OK;
	    }
	
	    if (sym < 256) {
	      d.dest[d.destLen++] = sym;
	    } else {
	      var length, dist, offs;
	      var i;
	
	      sym -= 257;
	
	      /* possibly get more bits from length code */
	      length = tinf_read_bits(d, length_bits[sym], length_base[sym]);
	
	      dist = tinf_decode_symbol(d, dt);
	
	      /* possibly get more bits from distance code */
	      offs = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);
	
	      /* copy match */
	      for (i = offs; i < offs + length; ++i) {
	        d.dest[d.destLen++] = d.dest[i];
	      }
	    }
	  }
	}
	
	/* inflate an uncompressed block of data */
	function tinf_inflate_uncompressed_block(d) {
	  var length, invlength;
	  var i;
	  
	  /* unread from bitbuffer */
	  while (d.bitcount > 8) {
	    d.sourceIndex--;
	    d.bitcount -= 8;
	  }
	
	  /* get length */
	  length = d.source[d.sourceIndex + 1];
	  length = 256 * length + d.source[d.sourceIndex];
	
	  /* get one's complement of length */
	  invlength = d.source[d.sourceIndex + 3];
	  invlength = 256 * invlength + d.source[d.sourceIndex + 2];
	
	  /* check length */
	  if (length !== (~invlength & 0x0000ffff))
	    return TINF_DATA_ERROR;
	
	  d.sourceIndex += 4;
	
	  /* copy block */
	  for (i = length; i; --i)
	    d.dest[d.destLen++] = d.source[d.sourceIndex++];
	
	  /* make sure we start next block on a byte boundary */
	  d.bitcount = 0;
	
	  return TINF_OK;
	}
	
	/* inflate stream from source to dest */
	function tinf_uncompress(source, dest) {
	  var d = new Data(source, dest);
	  var bfinal, btype, res;
	
	  do {
	    /* read final block flag */
	    bfinal = tinf_getbit(d);
	
	    /* read block type (2 bits) */
	    btype = tinf_read_bits(d, 2, 0);
	
	    /* decompress block */
	    switch (btype) {
	      case 0:
	        /* decompress uncompressed block */
	        res = tinf_inflate_uncompressed_block(d);
	        break;
	      case 1:
	        /* decompress block with fixed huffman trees */
	        res = tinf_inflate_block_data(d, sltree, sdtree);
	        break;
	      case 2:
	        /* decompress block with dynamic huffman trees */
	        tinf_decode_trees(d, d.ltree, d.dtree);
	        res = tinf_inflate_block_data(d, d.ltree, d.dtree);
	        break;
	      default:
	        res = TINF_DATA_ERROR;
	    }
	
	    if (res !== TINF_OK)
	      throw new Error('Data error');
	
	  } while (!bfinal);
	
	  if (d.destLen < d.dest.length) {
	    if (typeof d.dest.slice === 'function')
	      return d.dest.slice(0, d.destLen);
	    else
	      return d.dest.subarray(0, d.destLen);
	  }
	  
	  return d.dest;
	}
	
	/* -------------------- *
	 * -- initialization -- *
	 * -------------------- */
	
	/* build fixed huffman trees */
	tinf_build_fixed_trees(sltree, sdtree);
	
	/* build extra bits and base tables */
	tinf_build_bits_base(length_bits, length_base, 4, 3);
	tinf_build_bits_base(dist_bits, dist_base, 2, 1);
	
	/* fix a special case */
	length_bits[28] = 0;
	length_base[28] = 258;
	
	module.exports = tinf_uncompress;


/***/ },
/* 4 */
/***/ function(module, exports) {

	// Glyph encoding
	
	'use strict';
	
	var cffStandardStrings = [
	    '.notdef', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
	    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
	    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
	    'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
	    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
	    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
	    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', 'exclamdown', 'cent', 'sterling',
	    'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle', 'quotedblleft', 'guillemotleft',
	    'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'endash', 'dagger', 'daggerdbl', 'periodcentered', 'paragraph',
	    'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright', 'guillemotright', 'ellipsis', 'perthousand',
	    'questiondown', 'grave', 'acute', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'dieresis', 'ring',
	    'cedilla', 'hungarumlaut', 'ogonek', 'caron', 'emdash', 'AE', 'ordfeminine', 'Lslash', 'Oslash', 'OE',
	    'ordmasculine', 'ae', 'dotlessi', 'lslash', 'oslash', 'oe', 'germandbls', 'onesuperior', 'logicalnot', 'mu',
	    'trademark', 'Eth', 'onehalf', 'plusminus', 'Thorn', 'onequarter', 'divide', 'brokenbar', 'degree', 'thorn',
	    'threequarters', 'twosuperior', 'registered', 'minus', 'eth', 'multiply', 'threesuperior', 'copyright',
	    'Aacute', 'Acircumflex', 'Adieresis', 'Agrave', 'Aring', 'Atilde', 'Ccedilla', 'Eacute', 'Ecircumflex',
	    'Edieresis', 'Egrave', 'Iacute', 'Icircumflex', 'Idieresis', 'Igrave', 'Ntilde', 'Oacute', 'Ocircumflex',
	    'Odieresis', 'Ograve', 'Otilde', 'Scaron', 'Uacute', 'Ucircumflex', 'Udieresis', 'Ugrave', 'Yacute',
	    'Ydieresis', 'Zcaron', 'aacute', 'acircumflex', 'adieresis', 'agrave', 'aring', 'atilde', 'ccedilla', 'eacute',
	    'ecircumflex', 'edieresis', 'egrave', 'iacute', 'icircumflex', 'idieresis', 'igrave', 'ntilde', 'oacute',
	    'ocircumflex', 'odieresis', 'ograve', 'otilde', 'scaron', 'uacute', 'ucircumflex', 'udieresis', 'ugrave',
	    'yacute', 'ydieresis', 'zcaron', 'exclamsmall', 'Hungarumlautsmall', 'dollaroldstyle', 'dollarsuperior',
	    'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', '266 ff', 'onedotenleader',
	    'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle', 'fouroldstyle', 'fiveoldstyle', 'sixoldstyle',
	    'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'commasuperior', 'threequartersemdash', 'periodsuperior',
	    'questionsmall', 'asuperior', 'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', 'isuperior', 'lsuperior',
	    'msuperior', 'nsuperior', 'osuperior', 'rsuperior', 'ssuperior', 'tsuperior', 'ff', 'ffi', 'ffl',
	    'parenleftinferior', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
	    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
	    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
	    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', 'exclamdownsmall',
	    'centoldstyle', 'Lslashsmall', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall', 'Brevesmall', 'Caronsmall',
	    'Dotaccentsmall', 'Macronsmall', 'figuredash', 'hypheninferior', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall',
	    'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds',
	    'zerosuperior', 'foursuperior', 'fivesuperior', 'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior',
	    'zeroinferior', 'oneinferior', 'twoinferior', 'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior',
	    'seveninferior', 'eightinferior', 'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior',
	    'commainferior', 'Agravesmall', 'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall',
	    'Aringsmall', 'AEsmall', 'Ccedillasmall', 'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall',
	    'Igravesmall', 'Iacutesmall', 'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall',
	    'Oacutesmall', 'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall',
	    'Uacutesmall', 'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall', '001.000',
	    '001.001', '001.002', '001.003', 'Black', 'Bold', 'Book', 'Light', 'Medium', 'Regular', 'Roman', 'Semibold'];
	
	var cffStandardEncoding = [
	    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
	    '', '', '', '', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
	    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
	    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
	    'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
	    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
	    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
	    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', '', '', '', '', '', '', '', '',
	    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
	    'exclamdown', 'cent', 'sterling', 'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle',
	    'quotedblleft', 'guillemotleft', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', '', 'endash', 'dagger',
	    'daggerdbl', 'periodcentered', '', 'paragraph', 'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright',
	    'guillemotright', 'ellipsis', 'perthousand', '', 'questiondown', '', 'grave', 'acute', 'circumflex', 'tilde',
	    'macron', 'breve', 'dotaccent', 'dieresis', '', 'ring', 'cedilla', '', 'hungarumlaut', 'ogonek', 'caron',
	    'emdash', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'AE', '', 'ordfeminine', '', '', '',
	    '', 'Lslash', 'Oslash', 'OE', 'ordmasculine', '', '', '', '', '', 'ae', '', '', '', 'dotlessi', '', '',
	    'lslash', 'oslash', 'oe', 'germandbls'];
	
	var cffExpertEncoding = [
	    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
	    '', '', '', '', 'space', 'exclamsmall', 'Hungarumlautsmall', '', 'dollaroldstyle', 'dollarsuperior',
	    'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', 'twodotenleader', 'onedotenleader',
	    'comma', 'hyphen', 'period', 'fraction', 'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle',
	    'fouroldstyle', 'fiveoldstyle', 'sixoldstyle', 'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'colon',
	    'semicolon', 'commasuperior', 'threequartersemdash', 'periodsuperior', 'questionsmall', '', 'asuperior',
	    'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', '', '', 'isuperior', '', '', 'lsuperior', 'msuperior',
	    'nsuperior', 'osuperior', '', '', 'rsuperior', 'ssuperior', 'tsuperior', '', 'ff', 'fi', 'fl', 'ffi', 'ffl',
	    'parenleftinferior', '', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
	    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
	    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
	    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', '', '', '', '', '', '', '',
	    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
	    'exclamdownsmall', 'centoldstyle', 'Lslashsmall', '', '', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall',
	    'Brevesmall', 'Caronsmall', '', 'Dotaccentsmall', '', '', 'Macronsmall', '', '', 'figuredash', 'hypheninferior',
	    '', '', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall', '', '', '', 'onequarter', 'onehalf', 'threequarters',
	    'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds', '',
	    '', 'zerosuperior', 'onesuperior', 'twosuperior', 'threesuperior', 'foursuperior', 'fivesuperior',
	    'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior', 'zeroinferior', 'oneinferior', 'twoinferior',
	    'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior', 'seveninferior', 'eightinferior',
	    'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior', 'commainferior', 'Agravesmall',
	    'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall', 'Aringsmall', 'AEsmall', 'Ccedillasmall',
	    'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall', 'Igravesmall', 'Iacutesmall',
	    'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall', 'Oacutesmall',
	    'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall', 'Uacutesmall',
	    'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall'];
	
	var standardNames = [
	    '.notdef', '.null', 'nonmarkingreturn', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent',
	    'ampersand', 'quotesingle', 'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash',
	    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less',
	    'equal', 'greater', 'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
	    'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright',
	    'asciicircum', 'underscore', 'grave', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
	    'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde',
	    'Adieresis', 'Aring', 'Ccedilla', 'Eacute', 'Ntilde', 'Odieresis', 'Udieresis', 'aacute', 'agrave',
	    'acircumflex', 'adieresis', 'atilde', 'aring', 'ccedilla', 'eacute', 'egrave', 'ecircumflex', 'edieresis',
	    'iacute', 'igrave', 'icircumflex', 'idieresis', 'ntilde', 'oacute', 'ograve', 'ocircumflex', 'odieresis',
	    'otilde', 'uacute', 'ugrave', 'ucircumflex', 'udieresis', 'dagger', 'degree', 'cent', 'sterling', 'section',
	    'bullet', 'paragraph', 'germandbls', 'registered', 'copyright', 'trademark', 'acute', 'dieresis', 'notequal',
	    'AE', 'Oslash', 'infinity', 'plusminus', 'lessequal', 'greaterequal', 'yen', 'mu', 'partialdiff', 'summation',
	    'product', 'pi', 'integral', 'ordfeminine', 'ordmasculine', 'Omega', 'ae', 'oslash', 'questiondown',
	    'exclamdown', 'logicalnot', 'radical', 'florin', 'approxequal', 'Delta', 'guillemotleft', 'guillemotright',
	    'ellipsis', 'nonbreakingspace', 'Agrave', 'Atilde', 'Otilde', 'OE', 'oe', 'endash', 'emdash', 'quotedblleft',
	    'quotedblright', 'quoteleft', 'quoteright', 'divide', 'lozenge', 'ydieresis', 'Ydieresis', 'fraction',
	    'currency', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'daggerdbl', 'periodcentered', 'quotesinglbase',
	    'quotedblbase', 'perthousand', 'Acircumflex', 'Ecircumflex', 'Aacute', 'Edieresis', 'Egrave', 'Iacute',
	    'Icircumflex', 'Idieresis', 'Igrave', 'Oacute', 'Ocircumflex', 'apple', 'Ograve', 'Uacute', 'Ucircumflex',
	    'Ugrave', 'dotlessi', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'ring', 'cedilla', 'hungarumlaut',
	    'ogonek', 'caron', 'Lslash', 'lslash', 'Scaron', 'scaron', 'Zcaron', 'zcaron', 'brokenbar', 'Eth', 'eth',
	    'Yacute', 'yacute', 'Thorn', 'thorn', 'minus', 'multiply', 'onesuperior', 'twosuperior', 'threesuperior',
	    'onehalf', 'onequarter', 'threequarters', 'franc', 'Gbreve', 'gbreve', 'Idotaccent', 'Scedilla', 'scedilla',
	    'Cacute', 'cacute', 'Ccaron', 'ccaron', 'dcroat'];
	
	// This is the encoding used for fonts created from scratch.
	// It loops through all glyphs and finds the appropriate unicode value.
	// Since it's linear time, other encodings will be faster.
	function DefaultEncoding(font) {
	    this.font = font;
	}
	
	DefaultEncoding.prototype.charToGlyphIndex = function(c) {
	    var code = c.charCodeAt(0);
	    var glyphs = this.font.glyphs;
	    if (glyphs) {
	        for (var i = 0; i < glyphs.length; i += 1) {
	            var glyph = glyphs.get(i);
	            for (var j = 0; j < glyph.unicodes.length; j += 1) {
	                if (glyph.unicodes[j] === code) {
	                    return i;
	                }
	            }
	        }
	    } else {
	        return null;
	    }
	};
	
	function CmapEncoding(cmap) {
	    this.cmap = cmap;
	}
	
	CmapEncoding.prototype.charToGlyphIndex = function(c) {
	    return this.cmap.glyphIndexMap[c.charCodeAt(0)] || 0;
	};
	
	function CffEncoding(encoding, charset) {
	    this.encoding = encoding;
	    this.charset = charset;
	}
	
	CffEncoding.prototype.charToGlyphIndex = function(s) {
	    var code = s.charCodeAt(0);
	    var charName = this.encoding[code];
	    return this.charset.indexOf(charName);
	};
	
	function GlyphNames(post) {
	    var i;
	    switch (post.version) {
	    case 1:
	        this.names = exports.standardNames.slice();
	        break;
	    case 2:
	        this.names = new Array(post.numberOfGlyphs);
	        for (i = 0; i < post.numberOfGlyphs; i++) {
	            if (post.glyphNameIndex[i] < exports.standardNames.length) {
	                this.names[i] = exports.standardNames[post.glyphNameIndex[i]];
	            } else {
	                this.names[i] = post.names[post.glyphNameIndex[i] - exports.standardNames.length];
	            }
	        }
	
	        break;
	    case 2.5:
	        this.names = new Array(post.numberOfGlyphs);
	        for (i = 0; i < post.numberOfGlyphs; i++) {
	            this.names[i] = exports.standardNames[i + post.glyphNameIndex[i]];
	        }
	
	        break;
	    case 3:
	        this.names = [];
	        break;
	    }
	}
	
	GlyphNames.prototype.nameToGlyphIndex = function(name) {
	    return this.names.indexOf(name);
	};
	
	GlyphNames.prototype.glyphIndexToName = function(gid) {
	    return this.names[gid];
	};
	
	function addGlyphNames(font) {
	    var glyph;
	    var glyphIndexMap = font.tables.cmap.glyphIndexMap;
	    var charCodes = Object.keys(glyphIndexMap);
	
	    for (var i = 0; i < charCodes.length; i += 1) {
	        var c = charCodes[i];
	        var glyphIndex = glyphIndexMap[c];
	        glyph = font.glyphs.get(glyphIndex);
	        glyph.addUnicode(parseInt(c));
	    }
	
	    for (i = 0; i < font.glyphs.length; i += 1) {
	        glyph = font.glyphs.get(i);
	        if (font.cffEncoding) {
	            glyph.name = font.cffEncoding.charset[i];
	        } else {
	            glyph.name = font.glyphNames.glyphIndexToName(i);
	        }
	    }
	}
	
	exports.cffStandardStrings = cffStandardStrings;
	exports.cffStandardEncoding = cffStandardEncoding;
	exports.cffExpertEncoding = cffExpertEncoding;
	exports.standardNames = standardNames;
	exports.DefaultEncoding = DefaultEncoding;
	exports.CmapEncoding = CmapEncoding;
	exports.CffEncoding = CffEncoding;
	exports.GlyphNames = GlyphNames;
	exports.addGlyphNames = addGlyphNames;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	// The Font object
	
	'use strict';
	
	var path = __webpack_require__(6);
	var sfnt = __webpack_require__(7);
	var encoding = __webpack_require__(4);
	var glyphset = __webpack_require__(14);
	var util = __webpack_require__(25);
	
	// A Font represents a loaded OpenType font file.
	// It contains a set of glyphs and methods to draw text on a drawing context,
	// or to get a path representing the text.
	function Font(options) {
	    options = options || {};
	
	    if (!options.empty) {
	        // Check that we've provided the minimum set of names.
	        util.checkArgument(options.familyName, 'When creating a new Font object, familyName is required.');
	        util.checkArgument(options.styleName, 'When creating a new Font object, styleName is required.');
	        util.checkArgument(options.unitsPerEm, 'When creating a new Font object, unitsPerEm is required.');
	        util.checkArgument(options.ascender, 'When creating a new Font object, ascender is required.');
	        util.checkArgument(options.descender, 'When creating a new Font object, descender is required.');
	        util.checkArgument(options.descender < 0, 'Descender should be negative (e.g. -512).');
	
	        // OS X will complain if the names are empty, so we put a single space everywhere by default.
	        this.names = {
	            fontFamily: {en: options.familyName || ' '},
	            fontSubfamily: {en: options.styleName || ' '},
	            fullName: {en: options.fullName || options.familyName + ' ' + options.styleName},
	            postScriptName: {en: options.postScriptName || options.familyName + options.styleName},
	            designer: {en: options.designer || ' '},
	            designerURL: {en: options.designerURL || ' '},
	            manufacturer: {en: options.manufacturer || ' '},
	            manufacturerURL: {en: options.manufacturerURL || ' '},
	            license: {en: options.license || ' '},
	            licenseURL: {en: options.licenseURL || ' '},
	            version: {en: options.version || 'Version 0.1'},
	            description: {en: options.description || ' '},
	            copyright: {en: options.copyright || ' '},
	            trademark: {en: options.trademark || ' '}
	        };
	        this.unitsPerEm = options.unitsPerEm || 1000;
	        this.ascender = options.ascender;
	        this.descender = options.descender;
	        this.tables = { os2: {
	            usWeightClass: options.weightClass || this.usWeightClasses.MEDIUM,
	            usWidthClass: options.widthClass || this.usWidthClasses.MEDIUM,
	            fsSelection: options.fsSelection || this.fsSelectionValues.REGULAR
	        } };
	    }
	
	    this.supported = true; // Deprecated: parseBuffer will throw an error if font is not supported.
	    this.glyphs = new glyphset.GlyphSet(this, options.glyphs || []);
	    this.encoding = new encoding.DefaultEncoding(this);
	    this.tables = this.tables || {};
	}
	
	// Check if the font has a glyph for the given character.
	Font.prototype.hasChar = function(c) {
	    return this.encoding.charToGlyphIndex(c) !== null;
	};
	
	// Convert the given character to a single glyph index.
	// Note that this function assumes that there is a one-to-one mapping between
	// the given character and a glyph; for complex scripts this might not be the case.
	Font.prototype.charToGlyphIndex = function(s) {
	    return this.encoding.charToGlyphIndex(s);
	};
	
	// Convert the given character to a single Glyph object.
	// Note that this function assumes that there is a one-to-one mapping between
	// the given character and a glyph; for complex scripts this might not be the case.
	Font.prototype.charToGlyph = function(c) {
	    var glyphIndex = this.charToGlyphIndex(c);
	    var glyph = this.glyphs.get(glyphIndex);
	    if (!glyph) {
	        // .notdef
	        glyph = this.glyphs.get(0);
	    }
	
	    return glyph;
	};
	
	// Convert the given text to a list of Glyph objects.
	// Note that there is no strict one-to-one mapping between characters and
	// glyphs, so the list of returned glyphs can be larger or smaller than the
	// length of the given string.
	Font.prototype.stringToGlyphs = function(s) {
	    var glyphs = [];
	    for (var i = 0; i < s.length; i += 1) {
	        var c = s[i];
	        glyphs.push(this.charToGlyph(c));
	    }
	
	    return glyphs;
	};
	
	Font.prototype.nameToGlyphIndex = function(name) {
	    return this.glyphNames.nameToGlyphIndex(name);
	};
	
	Font.prototype.nameToGlyph = function(name) {
	    var glyphIndex = this.nametoGlyphIndex(name);
	    var glyph = this.glyphs.get(glyphIndex);
	    if (!glyph) {
	        // .notdef
	        glyph = this.glyphs.get(0);
	    }
	
	    return glyph;
	};
	
	Font.prototype.glyphIndexToName = function(gid) {
	    if (!this.glyphNames.glyphIndexToName) {
	        return '';
	    }
	
	    return this.glyphNames.glyphIndexToName(gid);
	};
	
	// Retrieve the value of the kerning pair between the left glyph (or its index)
	// and the right glyph (or its index). If no kerning pair is found, return 0.
	// The kerning value gets added to the advance width when calculating the spacing
	// between glyphs.
	Font.prototype.getKerningValue = function(leftGlyph, rightGlyph) {
	    leftGlyph = leftGlyph.index || leftGlyph;
	    rightGlyph = rightGlyph.index || rightGlyph;
	    var gposKerning = this.getGposKerningValue;
	    return gposKerning ? gposKerning(leftGlyph, rightGlyph) :
	        (this.kerningPairs[leftGlyph + ',' + rightGlyph] || 0);
	};
	
	// Helper function that invokes the given callback for each glyph in the given text.
	// The callback gets `(glyph, x, y, fontSize, options)`.
	Font.prototype.forEachGlyph = function(text, x, y, fontSize, options, callback) {
	    x = x !== undefined ? x : 0;
	    y = y !== undefined ? y : 0;
	    fontSize = fontSize !== undefined ? fontSize : 72;
	    options = options || {};
	    var kerning = options.kerning === undefined ? true : options.kerning;
	    var fontScale = 1 / this.unitsPerEm * fontSize;
	    var glyphs = this.stringToGlyphs(text);
	    for (var i = 0; i < glyphs.length; i += 1) {
	        var glyph = glyphs[i];
	        callback(glyph, x, y, fontSize, options);
	        if (glyph.advanceWidth) {
	            x += glyph.advanceWidth * fontScale;
	        }
	
	        if (kerning && i < glyphs.length - 1) {
	            var kerningValue = this.getKerningValue(glyph, glyphs[i + 1]);
	            x += kerningValue * fontScale;
	        }
	    }
	};
	
	// Create a Path object that represents the given text.
	//
	// text - The text to create.
	// x - Horizontal position of the beginning of the text. (default: 0)
	// y - Vertical position of the *baseline* of the text. (default: 0)
	// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
	// Options is an optional object that contains:
	// - kerning - Whether to take kerning information into account. (default: true)
	//
	// Returns a Path object.
	Font.prototype.getPath = function(text, x, y, fontSize, options) {
	    var fullPath = new path.Path();
	    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
	        var glyphPath = glyph.getPath(gX, gY, gFontSize);
	        fullPath.extend(glyphPath);
	    });
	
	    return fullPath;
	};
	
	// Create an array of Path objects that represent the glyps of a given text.
	//
	// text - The text to create.
	// x - Horizontal position of the beginning of the text. (default: 0)
	// y - Vertical position of the *baseline* of the text. (default: 0)
	// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
	// Options is an optional object that contains:
	// - kerning - Whether to take kerning information into account. (default: true)
	//
	// Returns an array of Path objects.
	Font.prototype.getPaths = function(text, x, y, fontSize, options) {
	    var glyphPaths = [];
	    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
	        var glyphPath = glyph.getPath(gX, gY, gFontSize);
	        glyphPaths.push(glyphPath);
	    });
	
	    return glyphPaths;
	};
	
	// Draw the text on the given drawing context.
	//
	// ctx - A 2D drawing context, like Canvas.
	// text - The text to create.
	// x - Horizontal position of the beginning of the text. (default: 0)
	// y - Vertical position of the *baseline* of the text. (default: 0)
	// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
	// Options is an optional object that contains:
	// - kerning - Whether to take kerning information into account. (default: true)
	Font.prototype.draw = function(ctx, text, x, y, fontSize, options) {
	    this.getPath(text, x, y, fontSize, options).draw(ctx);
	};
	
	// Draw the points of all glyphs in the text.
	// On-curve points will be drawn in blue, off-curve points will be drawn in red.
	//
	// ctx - A 2D drawing context, like Canvas.
	// text - The text to create.
	// x - Horizontal position of the beginning of the text. (default: 0)
	// y - Vertical position of the *baseline* of the text. (default: 0)
	// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
	// Options is an optional object that contains:
	// - kerning - Whether to take kerning information into account. (default: true)
	Font.prototype.drawPoints = function(ctx, text, x, y, fontSize, options) {
	    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
	        glyph.drawPoints(ctx, gX, gY, gFontSize);
	    });
	};
	
	// Draw lines indicating important font measurements for all glyphs in the text.
	// Black lines indicate the origin of the coordinate system (point 0,0).
	// Blue lines indicate the glyph bounding box.
	// Green line indicates the advance width of the glyph.
	//
	// ctx - A 2D drawing context, like Canvas.
	// text - The text to create.
	// x - Horizontal position of the beginning of the text. (default: 0)
	// y - Vertical position of the *baseline* of the text. (default: 0)
	// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
	// Options is an optional object that contains:
	// - kerning - Whether to take kerning information into account. (default: true)
	Font.prototype.drawMetrics = function(ctx, text, x, y, fontSize, options) {
	    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
	        glyph.drawMetrics(ctx, gX, gY, gFontSize);
	    });
	};
	
	Font.prototype.getEnglishName = function(name) {
	    var translations = this.names[name];
	    if (translations) {
	        return translations.en;
	    }
	};
	
	// Validate
	Font.prototype.validate = function() {
	    var warnings = [];
	    var _this = this;
	
	    function assert(predicate, message) {
	        if (!predicate) {
	            warnings.push(message);
	        }
	    }
	
	    function assertNamePresent(name) {
	        var englishName = _this.getEnglishName(name);
	        assert(englishName && englishName.trim().length > 0,
	               'No English ' + name + ' specified.');
	    }
	
	    // Identification information
	    assertNamePresent('fontFamily');
	    assertNamePresent('weightName');
	    assertNamePresent('manufacturer');
	    assertNamePresent('copyright');
	    assertNamePresent('version');
	
	    // Dimension information
	    assert(this.unitsPerEm > 0, 'No unitsPerEm specified.');
	};
	
	// Convert the font object to a SFNT data structure.
	// This structure contains all the necessary tables and metadata to create a binary OTF file.
	Font.prototype.toTables = function() {
	    return sfnt.fontToTable(this);
	};
	
	Font.prototype.toBuffer = function() {
	    console.warn('Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.');
	    return this.toArrayBuffer();
	};
	
	Font.prototype.toArrayBuffer = function() {
	    var sfntTable = this.toTables();
	    var bytes = sfntTable.encode();
	    var buffer = new ArrayBuffer(bytes.length);
	    var intArray = new Uint8Array(buffer);
	    for (var i = 0; i < bytes.length; i++) {
	        intArray[i] = bytes[i];
	    }
	
	    return buffer;
	};
	
	// Initiate a download of the OpenType font.
	Font.prototype.download = function() {
	    var familyName = this.getEnglishName('fontFamily');
	    var styleName = this.getEnglishName('fontSubfamily');
	    var fileName = familyName.replace(/\s/g, '') + '-' + styleName + '.otf';
	    var arrayBuffer = this.toArrayBuffer();
	
	    if (util.isBrowser()) {
	        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
	        window.requestFileSystem(window.TEMPORARY, arrayBuffer.byteLength, function(fs) {
	            fs.root.getFile(fileName, {create: true}, function(fileEntry) {
	                fileEntry.createWriter(function(writer) {
	                    var dataView = new DataView(arrayBuffer);
	                    var blob = new Blob([dataView], {type: 'font/opentype'});
	                    writer.write(blob);
	
	                    writer.addEventListener('writeend', function() {
	                        // Navigating to the file will download it.
	                        location.href = fileEntry.toURL();
	                    }, false);
	                });
	            });
	        },
	        function(err) {
	            throw err;
	        });
	    } else {
	        var fs = __webpack_require__(26);
	        var buffer = util.arrayBufferToNodeBuffer(arrayBuffer);
	        fs.writeFileSync(fileName, buffer);
	    }
	};
	
	Font.prototype.fsSelectionValues = {
	    ITALIC:              0x001, //1
	    UNDERSCORE:          0x002, //2
	    NEGATIVE:            0x004, //4
	    OUTLINED:            0x008, //8
	    STRIKEOUT:           0x010, //16
	    BOLD:                0x020, //32
	    REGULAR:             0x040, //64
	    USER_TYPO_METRICS:   0x080, //128
	    WWS:                 0x100, //256
	    OBLIQUE:             0x200  //512
	};
	
	Font.prototype.usWidthClasses = {
	    ULTRA_CONDENSED: 1,
	    EXTRA_CONDENSED: 2,
	    CONDENSED: 3,
	    SEMI_CONDENSED: 4,
	    MEDIUM: 5,
	    SEMI_EXPANDED: 6,
	    EXPANDED: 7,
	    EXTRA_EXPANDED: 8,
	    ULTRA_EXPANDED: 9
	};
	
	Font.prototype.usWeightClasses = {
	    THIN: 100,
	    EXTRA_LIGHT: 200,
	    LIGHT: 300,
	    NORMAL: 400,
	    MEDIUM: 500,
	    SEMI_BOLD: 600,
	    BOLD: 700,
	    EXTRA_BOLD: 800,
	    BLACK:    900
	};
	
	exports.Font = Font;


/***/ },
/* 6 */
/***/ function(module, exports) {

	// Geometric objects
	
	'use strict';
	
	// A bézier path containing a set of path commands similar to a SVG path.
	// Paths can be drawn on a context using `draw`.
	function Path() {
	    this.commands = [];
	    this.fill = 'black';
	    this.stroke = null;
	    this.strokeWidth = 1;
	}
	
	Path.prototype.moveTo = function(x, y) {
	    this.commands.push({
	        type: 'M',
	        x: x,
	        y: y
	    });
	};
	
	Path.prototype.lineTo = function(x, y) {
	    this.commands.push({
	        type: 'L',
	        x: x,
	        y: y
	    });
	};
	
	Path.prototype.curveTo = Path.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {
	    this.commands.push({
	        type: 'C',
	        x1: x1,
	        y1: y1,
	        x2: x2,
	        y2: y2,
	        x: x,
	        y: y
	    });
	};
	
	Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function(x1, y1, x, y) {
	    this.commands.push({
	        type: 'Q',
	        x1: x1,
	        y1: y1,
	        x: x,
	        y: y
	    });
	};
	
	Path.prototype.close = Path.prototype.closePath = function() {
	    this.commands.push({
	        type: 'Z'
	    });
	};
	
	// Add the given path or list of commands to the commands of this path.
	Path.prototype.extend = function(pathOrCommands) {
	    if (pathOrCommands.commands) {
	        pathOrCommands = pathOrCommands.commands;
	    }
	
	    Array.prototype.push.apply(this.commands, pathOrCommands);
	};
	
	// Draw the path to a 2D context.
	Path.prototype.draw = function(ctx) {
	    ctx.beginPath();
	    for (var i = 0; i < this.commands.length; i += 1) {
	        var cmd = this.commands[i];
	        if (cmd.type === 'M') {
	            ctx.moveTo(cmd.x, cmd.y);
	        } else if (cmd.type === 'L') {
	            ctx.lineTo(cmd.x, cmd.y);
	        } else if (cmd.type === 'C') {
	            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
	        } else if (cmd.type === 'Q') {
	            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
	        } else if (cmd.type === 'Z') {
	            ctx.closePath();
	        }
	    }
	
	    if (this.fill) {
	        ctx.fillStyle = this.fill;
	        ctx.fill();
	    }
	
	    if (this.stroke) {
	        ctx.strokeStyle = this.stroke;
	        ctx.lineWidth = this.strokeWidth;
	        ctx.stroke();
	    }
	};
	
	// Convert the Path to a string of path data instructions
	// See http://www.w3.org/TR/SVG/paths.html#PathData
	// Parameters:
	// - decimalPlaces: The amount of decimal places for floating-point values (default: 2)
	Path.prototype.toPathData = function(decimalPlaces) {
	    decimalPlaces = decimalPlaces !== undefined ? decimalPlaces : 2;
	
	    function floatToString(v) {
	        if (Math.round(v) === v) {
	            return '' + Math.round(v);
	        } else {
	            return v.toFixed(decimalPlaces);
	        }
	    }
	
	    function packValues() {
	        var s = '';
	        for (var i = 0; i < arguments.length; i += 1) {
	            var v = arguments[i];
	            if (v >= 0 && i > 0) {
	                s += ' ';
	            }
	
	            s += floatToString(v);
	        }
	
	        return s;
	    }
	
	    var d = '';
	    for (var i = 0; i < this.commands.length; i += 1) {
	        var cmd = this.commands[i];
	        if (cmd.type === 'M') {
	            d += 'M' + packValues(cmd.x, cmd.y);
	        } else if (cmd.type === 'L') {
	            d += 'L' + packValues(cmd.x, cmd.y);
	        } else if (cmd.type === 'C') {
	            d += 'C' + packValues(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
	        } else if (cmd.type === 'Q') {
	            d += 'Q' + packValues(cmd.x1, cmd.y1, cmd.x, cmd.y);
	        } else if (cmd.type === 'Z') {
	            d += 'Z';
	        }
	    }
	
	    return d;
	};
	
	// Convert the path to a SVG <path> element, as a string.
	// Parameters:
	// - decimalPlaces: The amount of decimal places for floating-point values (default: 2)
	Path.prototype.toSVG = function(decimalPlaces) {
	    var svg = '<path d="';
	    svg += this.toPathData(decimalPlaces);
	    svg += '"';
	    if (this.fill & this.fill !== 'black') {
	        if (this.fill === null) {
	            svg += ' fill="none"';
	        } else {
	            svg += ' fill="' + this.fill + '"';
	        }
	    }
	
	    if (this.stroke) {
	        svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
	    }
	
	    svg += '/>';
	    return svg;
	};
	
	exports.Path = Path;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	// The `sfnt` wrapper provides organization for the tables in the font.
	// It is the top-level data structure in a font.
	// https://www.microsoft.com/typography/OTSPEC/otff.htm
	// Recommendations for creating OpenType Fonts:
	// http://www.microsoft.com/typography/otspec140/recom.htm
	
	'use strict';
	
	var check = __webpack_require__(8);
	var table = __webpack_require__(9);
	
	var cmap = __webpack_require__(11);
	var cff = __webpack_require__(13);
	var head = __webpack_require__(17);
	var hhea = __webpack_require__(18);
	var hmtx = __webpack_require__(19);
	var ltag = __webpack_require__(20);
	var maxp = __webpack_require__(21);
	var _name = __webpack_require__(22);
	var os2 = __webpack_require__(23);
	var post = __webpack_require__(24);
	
	function log2(v) {
	    return Math.log(v) / Math.log(2) | 0;
	}
	
	function computeCheckSum(bytes) {
	    while (bytes.length % 4 !== 0) {
	        bytes.push(0);
	    }
	
	    var sum = 0;
	    for (var i = 0; i < bytes.length; i += 4) {
	        sum += (bytes[i] << 24) +
	            (bytes[i + 1] << 16) +
	            (bytes[i + 2] << 8) +
	            (bytes[i + 3]);
	    }
	
	    sum %= Math.pow(2, 32);
	    return sum;
	}
	
	function makeTableRecord(tag, checkSum, offset, length) {
	    return new table.Table('Table Record', [
	        {name: 'tag', type: 'TAG', value: tag !== undefined ? tag : ''},
	        {name: 'checkSum', type: 'ULONG', value: checkSum !== undefined ? checkSum : 0},
	        {name: 'offset', type: 'ULONG', value: offset !== undefined ? offset : 0},
	        {name: 'length', type: 'ULONG', value: length !== undefined ? length : 0}
	    ]);
	}
	
	function makeSfntTable(tables) {
	    var sfnt = new table.Table('sfnt', [
	        {name: 'version', type: 'TAG', value: 'OTTO'},
	        {name: 'numTables', type: 'USHORT', value: 0},
	        {name: 'searchRange', type: 'USHORT', value: 0},
	        {name: 'entrySelector', type: 'USHORT', value: 0},
	        {name: 'rangeShift', type: 'USHORT', value: 0}
	    ]);
	    sfnt.tables = tables;
	    sfnt.numTables = tables.length;
	    var highestPowerOf2 = Math.pow(2, log2(sfnt.numTables));
	    sfnt.searchRange = 16 * highestPowerOf2;
	    sfnt.entrySelector = log2(highestPowerOf2);
	    sfnt.rangeShift = sfnt.numTables * 16 - sfnt.searchRange;
	
	    var recordFields = [];
	    var tableFields = [];
	
	    var offset = sfnt.sizeOf() + (makeTableRecord().sizeOf() * sfnt.numTables);
	    while (offset % 4 !== 0) {
	        offset += 1;
	        tableFields.push({name: 'padding', type: 'BYTE', value: 0});
	    }
	
	    for (var i = 0; i < tables.length; i += 1) {
	        var t = tables[i];
	        check.argument(t.tableName.length === 4, 'Table name' + t.tableName + ' is invalid.');
	        var tableLength = t.sizeOf();
	        var tableRecord = makeTableRecord(t.tableName, computeCheckSum(t.encode()), offset, tableLength);
	        recordFields.push({name: tableRecord.tag + ' Table Record', type: 'TABLE', value: tableRecord});
	        tableFields.push({name: t.tableName + ' table', type: 'TABLE', value: t});
	        offset += tableLength;
	        check.argument(!isNaN(offset), 'Something went wrong calculating the offset.');
	        while (offset % 4 !== 0) {
	            offset += 1;
	            tableFields.push({name: 'padding', type: 'BYTE', value: 0});
	        }
	    }
	
	    // Table records need to be sorted alphabetically.
	    recordFields.sort(function(r1, r2) {
	        if (r1.value.tag > r2.value.tag) {
	            return 1;
	        } else {
	            return -1;
	        }
	    });
	
	    sfnt.fields = sfnt.fields.concat(recordFields);
	    sfnt.fields = sfnt.fields.concat(tableFields);
	    return sfnt;
	}
	
	// Get the metrics for a character. If the string has more than one character
	// this function returns metrics for the first available character.
	// You can provide optional fallback metrics if no characters are available.
	function metricsForChar(font, chars, notFoundMetrics) {
	    for (var i = 0; i < chars.length; i += 1) {
	        var glyphIndex = font.charToGlyphIndex(chars[i]);
	        if (glyphIndex > 0) {
	            var glyph = font.glyphs.get(glyphIndex);
	            return glyph.getMetrics();
	        }
	    }
	
	    return notFoundMetrics;
	}
	
	function average(vs) {
	    var sum = 0;
	    for (var i = 0; i < vs.length; i += 1) {
	        sum += vs[i];
	    }
	
	    return sum / vs.length;
	}
	
	// Convert the font object to a SFNT data structure.
	// This structure contains all the necessary tables and metadata to create a binary OTF file.
	function fontToSfntTable(font) {
	    var xMins = [];
	    var yMins = [];
	    var xMaxs = [];
	    var yMaxs = [];
	    var advanceWidths = [];
	    var leftSideBearings = [];
	    var rightSideBearings = [];
	    var firstCharIndex;
	    var lastCharIndex = 0;
	    var ulUnicodeRange1 = 0;
	    var ulUnicodeRange2 = 0;
	    var ulUnicodeRange3 = 0;
	    var ulUnicodeRange4 = 0;
	
	    for (var i = 0; i < font.glyphs.length; i += 1) {
	        var glyph = font.glyphs.get(i);
	        var unicode = glyph.unicode | 0;
	        if (firstCharIndex > unicode || firstCharIndex === null) {
	            firstCharIndex = unicode;
	        }
	
	        if (lastCharIndex < unicode) {
	            lastCharIndex = unicode;
	        }
	
	        var position = os2.getUnicodeRange(unicode);
	        if (position < 32) {
	            ulUnicodeRange1 |= 1 << position;
	        } else if (position < 64) {
	            ulUnicodeRange2 |= 1 << position - 32;
	        } else if (position < 96) {
	            ulUnicodeRange3 |= 1 << position - 64;
	        } else if (position < 123) {
	            ulUnicodeRange4 |= 1 << position - 96;
	        } else {
	            throw new Error('Unicode ranges bits > 123 are reserved for internal usage');
	        }
	        // Skip non-important characters.
	        if (glyph.name === '.notdef') continue;
	        var metrics = glyph.getMetrics();
	        xMins.push(metrics.xMin);
	        yMins.push(metrics.yMin);
	        xMaxs.push(metrics.xMax);
	        yMaxs.push(metrics.yMax);
	        leftSideBearings.push(metrics.leftSideBearing);
	        rightSideBearings.push(metrics.rightSideBearing);
	        advanceWidths.push(glyph.advanceWidth);
	    }
	
	    var globals = {
	        xMin: Math.min.apply(null, xMins),
	        yMin: Math.min.apply(null, yMins),
	        xMax: Math.max.apply(null, xMaxs),
	        yMax: Math.max.apply(null, yMaxs),
	        advanceWidthMax: Math.max.apply(null, advanceWidths),
	        advanceWidthAvg: average(advanceWidths),
	        minLeftSideBearing: Math.min.apply(null, leftSideBearings),
	        maxLeftSideBearing: Math.max.apply(null, leftSideBearings),
	        minRightSideBearing: Math.min.apply(null, rightSideBearings)
	    };
	    globals.ascender = font.ascender;
	    globals.descender = font.descender;
	
	    var headTable = head.make({
	        flags: 3, // 00000011 (baseline for font at y=0; left sidebearing point at x=0)
	        unitsPerEm: font.unitsPerEm,
	        xMin: globals.xMin,
	        yMin: globals.yMin,
	        xMax: globals.xMax,
	        yMax: globals.yMax,
	        lowestRecPPEM: 3
	    });
	
	    var hheaTable = hhea.make({
	        ascender: globals.ascender,
	        descender: globals.descender,
	        advanceWidthMax: globals.advanceWidthMax,
	        minLeftSideBearing: globals.minLeftSideBearing,
	        minRightSideBearing: globals.minRightSideBearing,
	        xMaxExtent: globals.maxLeftSideBearing + (globals.xMax - globals.xMin),
	        numberOfHMetrics: font.glyphs.length
	    });
	
	    var maxpTable = maxp.make(font.glyphs.length);
	
	    var os2Table = os2.make({
	        xAvgCharWidth: Math.round(globals.advanceWidthAvg),
	        usWeightClass: font.tables.os2.usWeightClass,
	        usWidthClass: font.tables.os2.usWidthClass,
	        usFirstCharIndex: firstCharIndex,
	        usLastCharIndex: lastCharIndex,
	        ulUnicodeRange1: ulUnicodeRange1,
	        ulUnicodeRange2: ulUnicodeRange2,
	        ulUnicodeRange3: ulUnicodeRange3,
	        ulUnicodeRange4: ulUnicodeRange4,
	        fsSelection: font.tables.os2.fsSelection, // REGULAR
	        // See http://typophile.com/node/13081 for more info on vertical metrics.
	        // We get metrics for typical characters (such as "x" for xHeight).
	        // We provide some fallback characters if characters are unavailable: their
	        // ordering was chosen experimentally.
	        sTypoAscender: globals.ascender,
	        sTypoDescender: globals.descender,
	        sTypoLineGap: 0,
	        usWinAscent: globals.yMax,
	        usWinDescent: Math.abs(globals.yMin),
	        ulCodePageRange1: 1, // FIXME: hard-code Latin 1 support for now
	        sxHeight: metricsForChar(font, 'xyvw', {yMax: Math.round(globals.ascender / 2)}).yMax,
	        sCapHeight: metricsForChar(font, 'HIKLEFJMNTZBDPRAGOQSUVWXY', globals).yMax,
	        usDefaultChar: font.hasChar(' ') ? 32 : 0, // Use space as the default character, if available.
	        usBreakChar: font.hasChar(' ') ? 32 : 0 // Use space as the break character, if available.
	    });
	
	    var hmtxTable = hmtx.make(font.glyphs);
	    var cmapTable = cmap.make(font.glyphs);
	
	    var englishFamilyName = font.getEnglishName('fontFamily');
	    var englishStyleName = font.getEnglishName('fontSubfamily');
	    var englishFullName = englishFamilyName + ' ' + englishStyleName;
	    var postScriptName = font.getEnglishName('postScriptName');
	    if (!postScriptName) {
	        postScriptName = englishFamilyName.replace(/\s/g, '') + '-' + englishStyleName;
	    }
	
	    var names = {};
	    for (var n in font.names) {
	        names[n] = font.names[n];
	    }
	
	    if (!names.uniqueID) {
	        names.uniqueID = {en: font.getEnglishName('manufacturer') + ':' + englishFullName};
	    }
	
	    if (!names.postScriptName) {
	        names.postScriptName = {en: postScriptName};
	    }
	
	    if (!names.preferredFamily) {
	        names.preferredFamily = font.names.fontFamily;
	    }
	
	    if (!names.preferredSubfamily) {
	        names.preferredSubfamily = font.names.fontSubfamily;
	    }
	
	    var languageTags = [];
	    var nameTable = _name.make(names, languageTags);
	    var ltagTable = (languageTags.length > 0 ? ltag.make(languageTags) : undefined);
	
	    var postTable = post.make();
	    var cffTable = cff.make(font.glyphs, {
	        version: font.getEnglishName('version'),
	        fullName: englishFullName,
	        familyName: englishFamilyName,
	        weightName: englishStyleName,
	        postScriptName: postScriptName,
	        unitsPerEm: font.unitsPerEm,
	        fontBBox: [0, globals.yMin, globals.ascender, globals.advanceWidthMax]
	    });
	
	    // The order does not matter because makeSfntTable() will sort them.
	    var tables = [headTable, hheaTable, maxpTable, os2Table, nameTable, cmapTable, postTable, cffTable, hmtxTable];
	    if (ltagTable) {
	        tables.push(ltagTable);
	    }
	
	    var sfntTable = makeSfntTable(tables);
	
	    // Compute the font's checkSum and store it in head.checkSumAdjustment.
	    var bytes = sfntTable.encode();
	    var checkSum = computeCheckSum(bytes);
	    var tableFields = sfntTable.fields;
	    var checkSumAdjusted = false;
	    for (i = 0; i < tableFields.length; i += 1) {
	        if (tableFields[i].name === 'head table') {
	            tableFields[i].value.checkSumAdjustment = 0xB1B0AFBA - checkSum;
	            checkSumAdjusted = true;
	            break;
	        }
	    }
	
	    if (!checkSumAdjusted) {
	        throw new Error('Could not find head table with checkSum to adjust.');
	    }
	
	    return sfntTable;
	}
	
	exports.computeCheckSum = computeCheckSum;
	exports.make = makeSfntTable;
	exports.fontToTable = fontToSfntTable;


/***/ },
/* 8 */
/***/ function(module, exports) {

	// Run-time checking of preconditions.
	
	'use strict';
	
	// Precondition function that checks if the given predicate is true.
	// If not, it will throw an error.
	exports.argument = function(predicate, message) {
	    if (!predicate) {
	        throw new Error(message);
	    }
	};
	
	// Precondition function that checks if the given assertion is true.
	// If not, it will throw an error.
	exports.assert = exports.argument;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	// Table metadata
	
	'use strict';
	
	var check = __webpack_require__(8);
	var encode = __webpack_require__(10).encode;
	var sizeOf = __webpack_require__(10).sizeOf;
	
	function Table(tableName, fields, options) {
	    var i;
	    for (i = 0; i < fields.length; i += 1) {
	        var field = fields[i];
	        this[field.name] = field.value;
	    }
	
	    this.tableName = tableName;
	    this.fields = fields;
	    if (options) {
	        var optionKeys = Object.keys(options);
	        for (i = 0; i < optionKeys.length; i += 1) {
	            var k = optionKeys[i];
	            var v = options[k];
	            if (this[k] !== undefined) {
	                this[k] = v;
	            }
	        }
	    }
	}
	
	Table.prototype.sizeOf = function() {
	    var v = 0;
	    for (var i = 0; i < this.fields.length; i += 1) {
	        var field = this.fields[i];
	        var value = this[field.name];
	        if (value === undefined) {
	            value = field.value;
	        }
	
	        if (typeof value.sizeOf === 'function') {
	            v += value.sizeOf();
	        } else {
	            var sizeOfFunction = sizeOf[field.type];
	            check.assert(typeof sizeOfFunction === 'function', 'Could not find sizeOf function for field' + field.name);
	            v += sizeOfFunction(value);
	        }
	    }
	
	    return v;
	};
	
	Table.prototype.encode = function() {
	    return encode.TABLE(this);
	};
	
	exports.Table = Table;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	// Data types used in the OpenType font file.
	// All OpenType fonts use Motorola-style byte ordering (Big Endian)
	
	/* global WeakMap */
	
	'use strict';
	
	var check = __webpack_require__(8);
	
	var LIMIT16 = 32768; // The limit at which a 16-bit number switches signs == 2^15
	var LIMIT32 = 2147483648; // The limit at which a 32-bit number switches signs == 2 ^ 31
	
	var decode = {};
	var encode = {};
	var sizeOf = {};
	
	// Return a function that always returns the same value.
	function constant(v) {
	    return function() {
	        return v;
	    };
	}
	
	// OpenType data types //////////////////////////////////////////////////////
	
	// Convert an 8-bit unsigned integer to a list of 1 byte.
	encode.BYTE = function(v) {
	    check.argument(v >= 0 && v <= 255, 'Byte value should be between 0 and 255.');
	    return [v];
	};
	
	sizeOf.BYTE = constant(1);
	
	// Convert a 8-bit signed integer to a list of 1 byte.
	encode.CHAR = function(v) {
	    return [v.charCodeAt(0)];
	};
	
	sizeOf.CHAR = constant(1);
	
	// Convert an ASCII string to a list of bytes.
	encode.CHARARRAY = function(v) {
	    var b = [];
	    for (var i = 0; i < v.length; i += 1) {
	        b.push(v.charCodeAt(i));
	    }
	
	    return b;
	};
	
	sizeOf.CHARARRAY = function(v) {
	    return v.length;
	};
	
	// Convert a 16-bit unsigned integer to a list of 2 bytes.
	encode.USHORT = function(v) {
	    return [(v >> 8) & 0xFF, v & 0xFF];
	};
	
	sizeOf.USHORT = constant(2);
	
	// Convert a 16-bit signed integer to a list of 2 bytes.
	encode.SHORT = function(v) {
	    // Two's complement
	    if (v >= LIMIT16) {
	        v = -(2 * LIMIT16 - v);
	    }
	
	    return [(v >> 8) & 0xFF, v & 0xFF];
	};
	
	sizeOf.SHORT = constant(2);
	
	// Convert a 24-bit unsigned integer to a list of 3 bytes.
	encode.UINT24 = function(v) {
	    return [(v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
	};
	
	sizeOf.UINT24 = constant(3);
	
	// Convert a 32-bit unsigned integer to a list of 4 bytes.
	encode.ULONG = function(v) {
	    return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
	};
	
	sizeOf.ULONG = constant(4);
	
	// Convert a 32-bit unsigned integer to a list of 4 bytes.
	encode.LONG = function(v) {
	    // Two's complement
	    if (v >= LIMIT32) {
	        v = -(2 * LIMIT32 - v);
	    }
	
	    return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
	};
	
	sizeOf.LONG = constant(4);
	
	encode.FIXED = encode.ULONG;
	sizeOf.FIXED = sizeOf.ULONG;
	
	encode.FWORD = encode.SHORT;
	sizeOf.FWORD = sizeOf.SHORT;
	
	encode.UFWORD = encode.USHORT;
	sizeOf.UFWORD = sizeOf.USHORT;
	
	// FIXME Implement LONGDATETIME
	encode.LONGDATETIME = function() {
	    return [0, 0, 0, 0, 0, 0, 0, 0];
	};
	
	sizeOf.LONGDATETIME = constant(8);
	
	// Convert a 4-char tag to a list of 4 bytes.
	encode.TAG = function(v) {
	    check.argument(v.length === 4, 'Tag should be exactly 4 ASCII characters.');
	    return [v.charCodeAt(0),
	            v.charCodeAt(1),
	            v.charCodeAt(2),
	            v.charCodeAt(3)];
	};
	
	sizeOf.TAG = constant(4);
	
	// CFF data types ///////////////////////////////////////////////////////////
	
	encode.Card8 = encode.BYTE;
	sizeOf.Card8 = sizeOf.BYTE;
	
	encode.Card16 = encode.USHORT;
	sizeOf.Card16 = sizeOf.USHORT;
	
	encode.OffSize = encode.BYTE;
	sizeOf.OffSize = sizeOf.BYTE;
	
	encode.SID = encode.USHORT;
	sizeOf.SID = sizeOf.USHORT;
	
	// Convert a numeric operand or charstring number to a variable-size list of bytes.
	encode.NUMBER = function(v) {
	    if (v >= -107 && v <= 107) {
	        return [v + 139];
	    } else if (v >= 108 && v <= 1131) {
	        v = v - 108;
	        return [(v >> 8) + 247, v & 0xFF];
	    } else if (v >= -1131 && v <= -108) {
	        v = -v - 108;
	        return [(v >> 8) + 251, v & 0xFF];
	    } else if (v >= -32768 && v <= 32767) {
	        return encode.NUMBER16(v);
	    } else {
	        return encode.NUMBER32(v);
	    }
	};
	
	sizeOf.NUMBER = function(v) {
	    return encode.NUMBER(v).length;
	};
	
	// Convert a signed number between -32768 and +32767 to a three-byte value.
	// This ensures we always use three bytes, but is not the most compact format.
	encode.NUMBER16 = function(v) {
	    return [28, (v >> 8) & 0xFF, v & 0xFF];
	};
	
	sizeOf.NUMBER16 = constant(3);
	
	// Convert a signed number between -(2^31) and +(2^31-1) to a five-byte value.
	// This is useful if you want to be sure you always use four bytes,
	// at the expense of wasting a few bytes for smaller numbers.
	encode.NUMBER32 = function(v) {
	    return [29, (v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
	};
	
	sizeOf.NUMBER32 = constant(5);
	
	encode.REAL = function(v) {
	    var value = v.toString();
	
	    // Some numbers use an epsilon to encode the value. (e.g. JavaScript will store 0.0000001 as 1e-7)
	    // This code converts it back to a number without the epsilon.
	    var m = /\.(\d*?)(?:9{5,20}|0{5,20})\d{0,2}(?:e(.+)|$)/.exec(value);
	    if (m) {
	        var epsilon = parseFloat('1e' + ((m[2] ? +m[2] : 0) + m[1].length));
	        value = (Math.round(v * epsilon) / epsilon).toString();
	    }
	
	    var nibbles = '';
	    var i;
	    var ii;
	    for (i = 0, ii = value.length; i < ii; i += 1) {
	        var c = value[i];
	        if (c === 'e') {
	            nibbles += value[++i] === '-' ? 'c' : 'b';
	        } else if (c === '.') {
	            nibbles += 'a';
	        } else if (c === '-') {
	            nibbles += 'e';
	        } else {
	            nibbles += c;
	        }
	    }
	
	    nibbles += (nibbles.length & 1) ? 'f' : 'ff';
	    var out = [30];
	    for (i = 0, ii = nibbles.length; i < ii; i += 2) {
	        out.push(parseInt(nibbles.substr(i, 2), 16));
	    }
	
	    return out;
	};
	
	sizeOf.REAL = function(v) {
	    return encode.REAL(v).length;
	};
	
	encode.NAME = encode.CHARARRAY;
	sizeOf.NAME = sizeOf.CHARARRAY;
	
	encode.STRING = encode.CHARARRAY;
	sizeOf.STRING = sizeOf.CHARARRAY;
	
	decode.UTF16 = function(data, offset, numBytes) {
	    var codePoints = [];
	    var numChars = numBytes / 2;
	    for (var j = 0; j < numChars; j++, offset += 2) {
	        codePoints[j] = data.getUint16(offset);
	    }
	
	    return String.fromCharCode.apply(null, codePoints);
	};
	
	// Convert a JavaScript string to UTF16-BE.
	encode.UTF16 = function(v) {
	    var b = [];
	    for (var i = 0; i < v.length; i += 1) {
	        var codepoint = v.charCodeAt(i);
	        b.push((codepoint >> 8) & 0xFF);
	        b.push(codepoint & 0xFF);
	    }
	
	    return b;
	};
	
	sizeOf.UTF16 = function(v) {
	    return v.length * 2;
	};
	
	// Data for converting old eight-bit Macintosh encodings to Unicode.
	// This representation is optimized for decoding; encoding is slower
	// and needs more memory. The assumption is that all opentype.js users
	// want to open fonts, but saving a font will be comperatively rare
	// so it can be more expensive. Keyed by IANA character set name.
	//
	// Python script for generating these strings:
	//
	//     s = u''.join([chr(c).decode('mac_greek') for c in range(128, 256)])
	//     print(s.encode('utf-8'))
	var eightBitMacEncodings = {
	    'x-mac-croatian':  // Python: 'mac_croatian'
	        'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®Š™´¨≠ŽØ∞±≤≥∆µ∂∑∏š∫ªºΩžø' +
	        '¿¡¬√ƒ≈Ć«Č… ÀÃÕŒœĐ—“”‘’÷◊©⁄€‹›Æ»–·‚„‰ÂćÁčÈÍÎÏÌÓÔđÒÚÛÙıˆ˜¯πË˚¸Êæˇ',
	    'x-mac-cyrillic':  // Python: 'mac_cyrillic'
	        'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ†°Ґ£§•¶І®©™Ђђ≠Ѓѓ∞±≤≥іµґЈЄєЇїЉљЊњ' +
	        'јЅ¬√ƒ≈∆«»… ЋћЌќѕ–—“”‘’÷„ЎўЏџ№Ёёяабвгдежзийклмнопрстуфхцчшщъыьэю',
	    'x-mac-gaelic':
	        // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/GAELIC.TXT
	        'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØḂ±≤≥ḃĊċḊḋḞḟĠġṀæø' +
	        'ṁṖṗɼƒſṠ«»… ÀÃÕŒœ–—“”‘’ṡẛÿŸṪ€‹›Ŷŷṫ·Ỳỳ⁊ÂÊÁËÈÍÎÏÌÓÔ♣ÒÚÛÙıÝýŴŵẄẅẀẁẂẃ',
	    'x-mac-greek':  // Python: 'mac_greek'
	        'Ä¹²É³ÖÜ΅àâä΄¨çéèêë£™îï•½‰ôö¦€ùûü†ΓΔΘΛΞΠß®©ΣΪ§≠°·Α±≤≥¥ΒΕΖΗΙΚΜΦΫΨΩ' +
	        'άΝ¬ΟΡ≈Τ«»… ΥΧΆΈœ–―“”‘’÷ΉΊΌΎέήίόΏύαβψδεφγηιξκλμνοπώρστθωςχυζϊϋΐΰ\u00AD',
	    'x-mac-icelandic':  // Python: 'mac_iceland'
	        'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûüÝ°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
	        '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€ÐðÞþý·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
	    'x-mac-inuit':
	        // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/INUIT.TXT
	        'ᐃᐄᐅᐆᐊᐋᐱᐲᐳᐴᐸᐹᑉᑎᑏᑐᑑᑕᑖᑦᑭᑮᑯᑰᑲᑳᒃᒋᒌᒍᒎᒐᒑ°ᒡᒥᒦ•¶ᒧ®©™ᒨᒪᒫᒻᓂᓃᓄᓅᓇᓈᓐᓯᓰᓱᓲᓴᓵᔅᓕᓖᓗ' +
	        'ᓘᓚᓛᓪᔨᔩᔪᔫᔭ… ᔮᔾᕕᕖᕗ–—“”‘’ᕘᕙᕚᕝᕆᕇᕈᕉᕋᕌᕐᕿᖀᖁᖂᖃᖄᖅᖏᖐᖑᖒᖓᖔᖕᙱᙲᙳᙴᙵᙶᖖᖠᖡᖢᖣᖤᖥᖦᕼŁł',
	    'x-mac-ce':  // Python: 'mac_latin2'
	        'ÄĀāÉĄÖÜáąČäčĆćéŹźĎíďĒēĖóėôöõúĚěü†°Ę£§•¶ß®©™ę¨≠ģĮįĪ≤≥īĶ∂∑łĻļĽľĹĺŅ' +
	        'ņŃ¬√ńŇ∆«»… ňŐÕőŌ–—“”‘’÷◊ōŔŕŘ‹›řŖŗŠ‚„šŚśÁŤťÍŽžŪÓÔūŮÚůŰűŲųÝýķŻŁżĢˇ',
	    macintosh:  // Python: 'mac_roman'
	        'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
	        '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
	    'x-mac-romanian':  // Python: 'mac_romanian'
	        'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ĂȘ∞±≤≥¥µ∂∑∏π∫ªºΩăș' +
	        '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›Țț‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
	    'x-mac-turkish':  // Python: 'mac_turkish'
	        'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
	        '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸĞğİıŞş‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙˆ˜¯˘˙˚¸˝˛ˇ'
	};
	
	// Decodes an old-style Macintosh string. Returns either a Unicode JavaScript
	// string, or 'undefined' if the encoding is unsupported. For example, we do
	// not support Chinese, Japanese or Korean because these would need large
	// mapping tables.
	decode.MACSTRING = function(dataView, offset, dataLength, encoding) {
	    var table = eightBitMacEncodings[encoding];
	    if (table === undefined) {
	        return undefined;
	    }
	
	    var result = '';
	    for (var i = 0; i < dataLength; i++) {
	        var c = dataView.getUint8(offset + i);
	        // In all eight-bit Mac encodings, the characters 0x00..0x7F are
	        // mapped to U+0000..U+007F; we only need to look up the others.
	        if (c <= 0x7F) {
	            result += String.fromCharCode(c);
	        } else {
	            result += table[c & 0x7F];
	        }
	    }
	
	    return result;
	};
	
	// Helper function for encode.MACSTRING. Returns a dictionary for mapping
	// Unicode character codes to their 8-bit MacOS equivalent. This table
	// is not exactly a super cheap data structure, but we do not care because
	// encoding Macintosh strings is only rarely needed in typical applications.
	var macEncodingTableCache = typeof WeakMap === 'function' && new WeakMap();
	var macEncodingCacheKeys;
	var getMacEncodingTable = function(encoding) {
	    // Since we use encoding as a cache key for WeakMap, it has to be
	    // a String object and not a literal. And at least on NodeJS 2.10.1,
	    // WeakMap requires that the same String instance is passed for cache hits.
	    if (!macEncodingCacheKeys) {
	        macEncodingCacheKeys = {};
	        for (var e in eightBitMacEncodings) {
	            /*jshint -W053 */  // Suppress "Do not use String as a constructor."
	            macEncodingCacheKeys[e] = new String(e);
	        }
	    }
	
	    var cacheKey = macEncodingCacheKeys[encoding];
	    if (cacheKey === undefined) {
	        return undefined;
	    }
	
	    // We can't do "if (cache.has(key)) {return cache.get(key)}" here:
	    // since garbage collection may run at any time, it could also kick in
	    // between the calls to cache.has() and cache.get(). In that case,
	    // we would return 'undefined' even though we do support the encoding.
	    if (macEncodingTableCache) {
	        var cachedTable = macEncodingTableCache.get(cacheKey);
	        if (cachedTable !== undefined) {
	            return cachedTable;
	        }
	    }
	
	    var decodingTable = eightBitMacEncodings[encoding];
	    if (decodingTable === undefined) {
	        return undefined;
	    }
	
	    var encodingTable = {};
	    for (var i = 0; i < decodingTable.length; i++) {
	        encodingTable[decodingTable.charCodeAt(i)] = i + 0x80;
	    }
	
	    if (macEncodingTableCache) {
	        macEncodingTableCache.set(cacheKey, encodingTable);
	    }
	
	    return encodingTable;
	};
	
	// Encodes an old-style Macintosh string. Returns a byte array upon success.
	// If the requested encoding is unsupported, or if the input string contains
	// a character that cannot be expressed in the encoding, the function returns
	// 'undefined'.
	encode.MACSTRING = function(str, encoding) {
	    var table = getMacEncodingTable(encoding);
	    if (table === undefined) {
	        return undefined;
	    }
	
	    var result = [];
	    for (var i = 0; i < str.length; i++) {
	        var c = str.charCodeAt(i);
	
	        // In all eight-bit Mac encodings, the characters 0x00..0x7F are
	        // mapped to U+0000..U+007F; we only need to look up the others.
	        if (c >= 0x80) {
	            c = table[c];
	            if (c === undefined) {
	                // str contains a Unicode character that cannot be encoded
	                // in the requested encoding.
	                return undefined;
	            }
	        }
	
	        result.push(c);
	    }
	
	    return result;
	};
	
	sizeOf.MACSTRING = function(str, encoding) {
	    var b = encode.MACSTRING(str, encoding);
	    if (b !== undefined) {
	        return b.length;
	    } else {
	        return 0;
	    }
	};
	
	// Convert a list of values to a CFF INDEX structure.
	// The values should be objects containing name / type / value.
	encode.INDEX = function(l) {
	    var i;
	    //var offset, offsets, offsetEncoder, encodedOffsets, encodedOffset, data,
	    //    dataSize, i, v;
	    // Because we have to know which data type to use to encode the offsets,
	    // we have to go through the values twice: once to encode the data and
	    // calculate the offets, then again to encode the offsets using the fitting data type.
	    var offset = 1; // First offset is always 1.
	    var offsets = [offset];
	    var data = [];
	    var dataSize = 0;
	    for (i = 0; i < l.length; i += 1) {
	        var v = encode.OBJECT(l[i]);
	        Array.prototype.push.apply(data, v);
	        dataSize += v.length;
	        offset += v.length;
	        offsets.push(offset);
	    }
	
	    if (data.length === 0) {
	        return [0, 0];
	    }
	
	    var encodedOffsets = [];
	    var offSize = (1 + Math.floor(Math.log(dataSize) / Math.log(2)) / 8) | 0;
	    var offsetEncoder = [undefined, encode.BYTE, encode.USHORT, encode.UINT24, encode.ULONG][offSize];
	    for (i = 0; i < offsets.length; i += 1) {
	        var encodedOffset = offsetEncoder(offsets[i]);
	        Array.prototype.push.apply(encodedOffsets, encodedOffset);
	    }
	
	    return Array.prototype.concat(encode.Card16(l.length),
	                           encode.OffSize(offSize),
	                           encodedOffsets,
	                           data);
	};
	
	sizeOf.INDEX = function(v) {
	    return encode.INDEX(v).length;
	};
	
	// Convert an object to a CFF DICT structure.
	// The keys should be numeric.
	// The values should be objects containing name / type / value.
	encode.DICT = function(m) {
	    var d = [];
	    var keys = Object.keys(m);
	    var length = keys.length;
	
	    for (var i = 0; i < length; i += 1) {
	        // Object.keys() return string keys, but our keys are always numeric.
	        var k = parseInt(keys[i], 0);
	        var v = m[k];
	        // Value comes before the key.
	        d = d.concat(encode.OPERAND(v.value, v.type));
	        d = d.concat(encode.OPERATOR(k));
	    }
	
	    return d;
	};
	
	sizeOf.DICT = function(m) {
	    return encode.DICT(m).length;
	};
	
	encode.OPERATOR = function(v) {
	    if (v < 1200) {
	        return [v];
	    } else {
	        return [12, v - 1200];
	    }
	};
	
	encode.OPERAND = function(v, type) {
	    var d = [];
	    if (Array.isArray(type)) {
	        for (var i = 0; i < type.length; i += 1) {
	            check.argument(v.length === type.length, 'Not enough arguments given for type' + type);
	            d = d.concat(encode.OPERAND(v[i], type[i]));
	        }
	    } else {
	        if (type === 'SID') {
	            d = d.concat(encode.NUMBER(v));
	        } else if (type === 'offset') {
	            // We make it easy for ourselves and always encode offsets as
	            // 4 bytes. This makes offset calculation for the top dict easier.
	            d = d.concat(encode.NUMBER32(v));
	        } else if (type === 'number') {
	            d = d.concat(encode.NUMBER(v));
	        } else if (type === 'real') {
	            d = d.concat(encode.REAL(v));
	        } else {
	            throw new Error('Unknown operand type ' + type);
	            // FIXME Add support for booleans
	        }
	    }
	
	    return d;
	};
	
	encode.OP = encode.BYTE;
	sizeOf.OP = sizeOf.BYTE;
	
	// memoize charstring encoding using WeakMap if available
	var wmm = typeof WeakMap === 'function' && new WeakMap();
	// Convert a list of CharString operations to bytes.
	encode.CHARSTRING = function(ops) {
	    // See encode.MACSTRING for why we don't do "if (wmm && wmm.has(ops))".
	    if (wmm) {
	        var cachedValue = wmm.get(ops);
	        if (cachedValue !== undefined) {
	            return cachedValue;
	        }
	    }
	
	    var d = [];
	    var length = ops.length;
	
	    for (var i = 0; i < length; i += 1) {
	        var op = ops[i];
	        d = d.concat(encode[op.type](op.value));
	    }
	
	    if (wmm) {
	        wmm.set(ops, d);
	    }
	
	    return d;
	};
	
	sizeOf.CHARSTRING = function(ops) {
	    return encode.CHARSTRING(ops).length;
	};
	
	// Utility functions ////////////////////////////////////////////////////////
	
	// Convert an object containing name / type / value to bytes.
	encode.OBJECT = function(v) {
	    var encodingFunction = encode[v.type];
	    check.argument(encodingFunction !== undefined, 'No encoding function for type ' + v.type);
	    return encodingFunction(v.value);
	};
	
	sizeOf.OBJECT = function(v) {
	    var sizeOfFunction = sizeOf[v.type];
	    check.argument(sizeOfFunction !== undefined, 'No sizeOf function for type ' + v.type);
	    return sizeOfFunction(v.value);
	};
	
	// Convert a table object to bytes.
	// A table contains a list of fields containing the metadata (name, type and default value).
	// The table itself has the field values set as attributes.
	encode.TABLE = function(table) {
	    var d = [];
	    var length = table.fields.length;
	    var subtables = [];
	    var subtableOffsets = [];
	    var i;
	
	    for (i = 0; i < length; i += 1) {
	        var field = table.fields[i];
	        var encodingFunction = encode[field.type];
	        check.argument(encodingFunction !== undefined, 'No encoding function for field type ' + field.type + ' (' + field.name + ')');
	        var value = table[field.name];
	        if (value === undefined) {
	            value = field.value;
	        }
	
	        var bytes = encodingFunction(value);
	        if (field.type === 'SUBTABLE') {
	            subtableOffsets.push(d.length);
	            d = d.concat([0, 0]);
	            subtables.push(bytes);
	        } else {
	            d = d.concat(bytes);
	        }
	    }
	
	    for (i = 0; i < subtables.length; i += 1) {
	        var o = subtableOffsets[i];
	        var offset = d.length;
	        check.argument(offset < 65536, 'Table ' + table.name + ' too big.');
	        d[o] = offset >> 8;
	        d[o + 1] = offset & 0xff;
	        d = d.concat(subtables[i]);
	    }
	
	    return d;
	};
	
	sizeOf.TABLE = function(table) {
	    var numBytes = 0;
	    var length = table.fields.length;
	
	    for (var i = 0; i < length; i += 1) {
	        var field = table.fields[i];
	        var sizeOfFunction = sizeOf[field.type];
	        check.argument(sizeOfFunction !== undefined, 'No sizeOf function for field type ' + field.type + ' (' + field.name + ')');
	        var value = table[field.name];
	        if (value === undefined) {
	            value = field.value;
	        }
	
	        numBytes += sizeOfFunction(value);
	
	        // Subtables take 2 more bytes for offsets.
	        if (field.type === 'SUBTABLE') {
	            numBytes += 2;
	        }
	    }
	
	    return numBytes;
	};
	
	encode.SUBTABLE = encode.TABLE;
	sizeOf.SUBTABLE = sizeOf.TABLE;
	
	// Merge in a list of bytes.
	encode.LITERAL = function(v) {
	    return v;
	};
	
	sizeOf.LITERAL = function(v) {
	    return v.length;
	};
	
	exports.decode = decode;
	exports.encode = encode;
	exports.sizeOf = sizeOf;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	// The `cmap` table stores the mappings from characters to glyphs.
	// https://www.microsoft.com/typography/OTSPEC/cmap.htm
	
	'use strict';
	
	var check = __webpack_require__(8);
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	// Parse the `cmap` table. This table stores the mappings from characters to glyphs.
	// There are many available formats, but we only support the Windows format 4.
	// This function returns a `CmapEncoding` object or null if no supported format could be found.
	function parseCmapTable(data, start) {
	    var i;
	    var cmap = {};
	    cmap.version = parse.getUShort(data, start);
	    check.argument(cmap.version === 0, 'cmap table version should be 0.');
	
	    // The cmap table can contain many sub-tables, each with their own format.
	    // We're only interested in a "platform 3" table. This is a Windows format.
	    cmap.numTables = parse.getUShort(data, start + 2);
	    var offset = -1;
	    for (i = 0; i < cmap.numTables; i += 1) {
	        var platformId = parse.getUShort(data, start + 4 + (i * 8));
	        var encodingId = parse.getUShort(data, start + 4 + (i * 8) + 2);
	        if (platformId === 3 && (encodingId === 1 || encodingId === 0)) {
	            offset = parse.getULong(data, start + 4 + (i * 8) + 4);
	            break;
	        }
	    }
	
	    if (offset === -1) {
	        // There is no cmap table in the font that we support, so return null.
	        // This font will be marked as unsupported.
	        return null;
	    }
	
	    var p = new parse.Parser(data, start + offset);
	    cmap.format = p.parseUShort();
	    check.argument(cmap.format === 4, 'Only format 4 cmap tables are supported.');
	
	    // Length in bytes of the sub-tables.
	    cmap.length = p.parseUShort();
	    cmap.language = p.parseUShort();
	
	    // segCount is stored x 2.
	    var segCount;
	    cmap.segCount = segCount = p.parseUShort() >> 1;
	
	    // Skip searchRange, entrySelector, rangeShift.
	    p.skip('uShort', 3);
	
	    // The "unrolled" mapping from character codes to glyph indices.
	    cmap.glyphIndexMap = {};
	
	    var endCountParser = new parse.Parser(data, start + offset + 14);
	    var startCountParser = new parse.Parser(data, start + offset + 16 + segCount * 2);
	    var idDeltaParser = new parse.Parser(data, start + offset + 16 + segCount * 4);
	    var idRangeOffsetParser = new parse.Parser(data, start + offset + 16 + segCount * 6);
	    var glyphIndexOffset = start + offset + 16 + segCount * 8;
	    for (i = 0; i < segCount - 1; i += 1) {
	        var glyphIndex;
	        var endCount = endCountParser.parseUShort();
	        var startCount = startCountParser.parseUShort();
	        var idDelta = idDeltaParser.parseShort();
	        var idRangeOffset = idRangeOffsetParser.parseUShort();
	        for (var c = startCount; c <= endCount; c += 1) {
	            if (idRangeOffset !== 0) {
	                // The idRangeOffset is relative to the current position in the idRangeOffset array.
	                // Take the current offset in the idRangeOffset array.
	                glyphIndexOffset = (idRangeOffsetParser.offset + idRangeOffsetParser.relativeOffset - 2);
	
	                // Add the value of the idRangeOffset, which will move us into the glyphIndex array.
	                glyphIndexOffset += idRangeOffset;
	
	                // Then add the character index of the current segment, multiplied by 2 for USHORTs.
	                glyphIndexOffset += (c - startCount) * 2;
	                glyphIndex = parse.getUShort(data, glyphIndexOffset);
	                if (glyphIndex !== 0) {
	                    glyphIndex = (glyphIndex + idDelta) & 0xFFFF;
	                }
	            } else {
	                glyphIndex = (c + idDelta) & 0xFFFF;
	            }
	
	            cmap.glyphIndexMap[c] = glyphIndex;
	        }
	    }
	
	    return cmap;
	}
	
	function addSegment(t, code, glyphIndex) {
	    t.segments.push({
	        end: code,
	        start: code,
	        delta: -(code - glyphIndex),
	        offset: 0
	    });
	}
	
	function addTerminatorSegment(t) {
	    t.segments.push({
	        end: 0xFFFF,
	        start: 0xFFFF,
	        delta: 1,
	        offset: 0
	    });
	}
	
	function makeCmapTable(glyphs) {
	    var i;
	    var t = new table.Table('cmap', [
	        {name: 'version', type: 'USHORT', value: 0},
	        {name: 'numTables', type: 'USHORT', value: 1},
	        {name: 'platformID', type: 'USHORT', value: 3},
	        {name: 'encodingID', type: 'USHORT', value: 1},
	        {name: 'offset', type: 'ULONG', value: 12},
	        {name: 'format', type: 'USHORT', value: 4},
	        {name: 'length', type: 'USHORT', value: 0},
	        {name: 'language', type: 'USHORT', value: 0},
	        {name: 'segCountX2', type: 'USHORT', value: 0},
	        {name: 'searchRange', type: 'USHORT', value: 0},
	        {name: 'entrySelector', type: 'USHORT', value: 0},
	        {name: 'rangeShift', type: 'USHORT', value: 0}
	    ]);
	
	    t.segments = [];
	    for (i = 0; i < glyphs.length; i += 1) {
	        var glyph = glyphs.get(i);
	        for (var j = 0; j < glyph.unicodes.length; j += 1) {
	            addSegment(t, glyph.unicodes[j], i);
	        }
	
	        t.segments = t.segments.sort(function(a, b) {
	            return a.start - b.start;
	        });
	    }
	
	    addTerminatorSegment(t);
	
	    var segCount;
	    segCount = t.segments.length;
	    t.segCountX2 = segCount * 2;
	    t.searchRange = Math.pow(2, Math.floor(Math.log(segCount) / Math.log(2))) * 2;
	    t.entrySelector = Math.log(t.searchRange / 2) / Math.log(2);
	    t.rangeShift = t.segCountX2 - t.searchRange;
	
	    // Set up parallel segment arrays.
	    var endCounts = [];
	    var startCounts = [];
	    var idDeltas = [];
	    var idRangeOffsets = [];
	    var glyphIds = [];
	
	    for (i = 0; i < segCount; i += 1) {
	        var segment = t.segments[i];
	        endCounts = endCounts.concat({name: 'end_' + i, type: 'USHORT', value: segment.end});
	        startCounts = startCounts.concat({name: 'start_' + i, type: 'USHORT', value: segment.start});
	        idDeltas = idDeltas.concat({name: 'idDelta_' + i, type: 'SHORT', value: segment.delta});
	        idRangeOffsets = idRangeOffsets.concat({name: 'idRangeOffset_' + i, type: 'USHORT', value: segment.offset});
	        if (segment.glyphId !== undefined) {
	            glyphIds = glyphIds.concat({name: 'glyph_' + i, type: 'USHORT', value: segment.glyphId});
	        }
	    }
	
	    t.fields = t.fields.concat(endCounts);
	    t.fields.push({name: 'reservedPad', type: 'USHORT', value: 0});
	    t.fields = t.fields.concat(startCounts);
	    t.fields = t.fields.concat(idDeltas);
	    t.fields = t.fields.concat(idRangeOffsets);
	    t.fields = t.fields.concat(glyphIds);
	
	    t.length = 14 + // Subtable header
	        endCounts.length * 2 +
	        2 + // reservedPad
	        startCounts.length * 2 +
	        idDeltas.length * 2 +
	        idRangeOffsets.length * 2 +
	        glyphIds.length * 2;
	
	    return t;
	}
	
	exports.parse = parseCmapTable;
	exports.make = makeCmapTable;


/***/ },
/* 12 */
/***/ function(module, exports) {

	// Parsing utility functions
	
	'use strict';
	
	// Retrieve an unsigned byte from the DataView.
	exports.getByte = function getByte(dataView, offset) {
	    return dataView.getUint8(offset);
	};
	
	exports.getCard8 = exports.getByte;
	
	// Retrieve an unsigned 16-bit short from the DataView.
	// The value is stored in big endian.
	exports.getUShort = function(dataView, offset) {
	    return dataView.getUint16(offset, false);
	};
	
	exports.getCard16 = exports.getUShort;
	
	// Retrieve a signed 16-bit short from the DataView.
	// The value is stored in big endian.
	exports.getShort = function(dataView, offset) {
	    return dataView.getInt16(offset, false);
	};
	
	// Retrieve an unsigned 32-bit long from the DataView.
	// The value is stored in big endian.
	exports.getULong = function(dataView, offset) {
	    return dataView.getUint32(offset, false);
	};
	
	// Retrieve a 32-bit signed fixed-point number (16.16) from the DataView.
	// The value is stored in big endian.
	exports.getFixed = function(dataView, offset) {
	    var decimal = dataView.getInt16(offset, false);
	    var fraction = dataView.getUint16(offset + 2, false);
	    return decimal + fraction / 65535;
	};
	
	// Retrieve a 4-character tag from the DataView.
	// Tags are used to identify tables.
	exports.getTag = function(dataView, offset) {
	    var tag = '';
	    for (var i = offset; i < offset + 4; i += 1) {
	        tag += String.fromCharCode(dataView.getInt8(i));
	    }
	
	    return tag;
	};
	
	// Retrieve an offset from the DataView.
	// Offsets are 1 to 4 bytes in length, depending on the offSize argument.
	exports.getOffset = function(dataView, offset, offSize) {
	    var v = 0;
	    for (var i = 0; i < offSize; i += 1) {
	        v <<= 8;
	        v += dataView.getUint8(offset + i);
	    }
	
	    return v;
	};
	
	// Retrieve a number of bytes from start offset to the end offset from the DataView.
	exports.getBytes = function(dataView, startOffset, endOffset) {
	    var bytes = [];
	    for (var i = startOffset; i < endOffset; i += 1) {
	        bytes.push(dataView.getUint8(i));
	    }
	
	    return bytes;
	};
	
	// Convert the list of bytes to a string.
	exports.bytesToString = function(bytes) {
	    var s = '';
	    for (var i = 0; i < bytes.length; i += 1) {
	        s += String.fromCharCode(bytes[i]);
	    }
	
	    return s;
	};
	
	var typeOffsets = {
	    byte: 1,
	    uShort: 2,
	    short: 2,
	    uLong: 4,
	    fixed: 4,
	    longDateTime: 8,
	    tag: 4
	};
	
	// A stateful parser that changes the offset whenever a value is retrieved.
	// The data is a DataView.
	function Parser(data, offset) {
	    this.data = data;
	    this.offset = offset;
	    this.relativeOffset = 0;
	}
	
	Parser.prototype.parseByte = function() {
	    var v = this.data.getUint8(this.offset + this.relativeOffset);
	    this.relativeOffset += 1;
	    return v;
	};
	
	Parser.prototype.parseChar = function() {
	    var v = this.data.getInt8(this.offset + this.relativeOffset);
	    this.relativeOffset += 1;
	    return v;
	};
	
	Parser.prototype.parseCard8 = Parser.prototype.parseByte;
	
	Parser.prototype.parseUShort = function() {
	    var v = this.data.getUint16(this.offset + this.relativeOffset);
	    this.relativeOffset += 2;
	    return v;
	};
	
	Parser.prototype.parseCard16 = Parser.prototype.parseUShort;
	Parser.prototype.parseSID = Parser.prototype.parseUShort;
	Parser.prototype.parseOffset16 = Parser.prototype.parseUShort;
	
	Parser.prototype.parseShort = function() {
	    var v = this.data.getInt16(this.offset + this.relativeOffset);
	    this.relativeOffset += 2;
	    return v;
	};
	
	Parser.prototype.parseF2Dot14 = function() {
	    var v = this.data.getInt16(this.offset + this.relativeOffset) / 16384;
	    this.relativeOffset += 2;
	    return v;
	};
	
	Parser.prototype.parseULong = function() {
	    var v = exports.getULong(this.data, this.offset + this.relativeOffset);
	    this.relativeOffset += 4;
	    return v;
	};
	
	Parser.prototype.parseFixed = function() {
	    var v = exports.getFixed(this.data, this.offset + this.relativeOffset);
	    this.relativeOffset += 4;
	    return v;
	};
	
	Parser.prototype.parseOffset16List =
	Parser.prototype.parseUShortList = function(count) {
	    var offsets = new Array(count);
	    var dataView = this.data;
	    var offset = this.offset + this.relativeOffset;
	    for (var i = 0; i < count; i++) {
	        offsets[i] = exports.getUShort(dataView, offset);
	        offset += 2;
	    }
	
	    this.relativeOffset += count * 2;
	    return offsets;
	};
	
	Parser.prototype.parseString = function(length) {
	    var dataView = this.data;
	    var offset = this.offset + this.relativeOffset;
	    var string = '';
	    this.relativeOffset += length;
	    for (var i = 0; i < length; i++) {
	        string += String.fromCharCode(dataView.getUint8(offset + i));
	    }
	
	    return string;
	};
	
	Parser.prototype.parseTag = function() {
	    return this.parseString(4);
	};
	
	// LONGDATETIME is a 64-bit integer.
	// JavaScript and unix timestamps traditionally use 32 bits, so we
	// only take the last 32 bits.
	Parser.prototype.parseLongDateTime = function() {
	    var v = exports.getULong(this.data, this.offset + this.relativeOffset + 4);
	    this.relativeOffset += 8;
	    return v;
	};
	
	Parser.prototype.parseFixed = function() {
	    var v = exports.getULong(this.data, this.offset + this.relativeOffset);
	    this.relativeOffset += 4;
	    return v / 65536;
	};
	
	Parser.prototype.parseVersion = function() {
	    var major = exports.getUShort(this.data, this.offset + this.relativeOffset);
	
	    // How to interpret the minor version is very vague in the spec. 0x5000 is 5, 0x1000 is 1
	    // This returns the correct number if minor = 0xN000 where N is 0-9
	    var minor = exports.getUShort(this.data, this.offset + this.relativeOffset + 2);
	    this.relativeOffset += 4;
	    return major + minor / 0x1000 / 10;
	};
	
	Parser.prototype.skip = function(type, amount) {
	    if (amount === undefined) {
	        amount = 1;
	    }
	
	    this.relativeOffset += typeOffsets[type] * amount;
	};
	
	exports.Parser = Parser;


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	// The `CFF` table contains the glyph outlines in PostScript format.
	// https://www.microsoft.com/typography/OTSPEC/cff.htm
	// http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/cff.pdf
	// http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/type2.pdf
	
	'use strict';
	
	var encoding = __webpack_require__(4);
	var glyphset = __webpack_require__(14);
	var parse = __webpack_require__(12);
	var path = __webpack_require__(6);
	var table = __webpack_require__(9);
	
	// Custom equals function that can also check lists.
	function equals(a, b) {
	    if (a === b) {
	        return true;
	    } else if (Array.isArray(a) && Array.isArray(b)) {
	        if (a.length !== b.length) {
	            return false;
	        }
	
	        for (var i = 0; i < a.length; i += 1) {
	            if (!equals(a[i], b[i])) {
	                return false;
	            }
	        }
	
	        return true;
	    } else {
	        return false;
	    }
	}
	
	// Parse a `CFF` INDEX array.
	// An index array consists of a list of offsets, then a list of objects at those offsets.
	function parseCFFIndex(data, start, conversionFn) {
	    //var i, objectOffset, endOffset;
	    var offsets = [];
	    var objects = [];
	    var count = parse.getCard16(data, start);
	    var i;
	    var objectOffset;
	    var endOffset;
	    if (count !== 0) {
	        var offsetSize = parse.getByte(data, start + 2);
	        objectOffset = start + ((count + 1) * offsetSize) + 2;
	        var pos = start + 3;
	        for (i = 0; i < count + 1; i += 1) {
	            offsets.push(parse.getOffset(data, pos, offsetSize));
	            pos += offsetSize;
	        }
	
	        // The total size of the index array is 4 header bytes + the value of the last offset.
	        endOffset = objectOffset + offsets[count];
	    } else {
	        endOffset = start + 2;
	    }
	
	    for (i = 0; i < offsets.length - 1; i += 1) {
	        var value = parse.getBytes(data, objectOffset + offsets[i], objectOffset + offsets[i + 1]);
	        if (conversionFn) {
	            value = conversionFn(value);
	        }
	
	        objects.push(value);
	    }
	
	    return {objects: objects, startOffset: start, endOffset: endOffset};
	}
	
	// Parse a `CFF` DICT real value.
	function parseFloatOperand(parser) {
	    var s = '';
	    var eof = 15;
	    var lookup = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', null, '-'];
	    while (true) {
	        var b = parser.parseByte();
	        var n1 = b >> 4;
	        var n2 = b & 15;
	
	        if (n1 === eof) {
	            break;
	        }
	
	        s += lookup[n1];
	
	        if (n2 === eof) {
	            break;
	        }
	
	        s += lookup[n2];
	    }
	
	    return parseFloat(s);
	}
	
	// Parse a `CFF` DICT operand.
	function parseOperand(parser, b0) {
	    var b1;
	    var b2;
	    var b3;
	    var b4;
	    if (b0 === 28) {
	        b1 = parser.parseByte();
	        b2 = parser.parseByte();
	        return b1 << 8 | b2;
	    }
	
	    if (b0 === 29) {
	        b1 = parser.parseByte();
	        b2 = parser.parseByte();
	        b3 = parser.parseByte();
	        b4 = parser.parseByte();
	        return b1 << 24 | b2 << 16 | b3 << 8 | b4;
	    }
	
	    if (b0 === 30) {
	        return parseFloatOperand(parser);
	    }
	
	    if (b0 >= 32 && b0 <= 246) {
	        return b0 - 139;
	    }
	
	    if (b0 >= 247 && b0 <= 250) {
	        b1 = parser.parseByte();
	        return (b0 - 247) * 256 + b1 + 108;
	    }
	
	    if (b0 >= 251 && b0 <= 254) {
	        b1 = parser.parseByte();
	        return -(b0 - 251) * 256 - b1 - 108;
	    }
	
	    throw new Error('Invalid b0 ' + b0);
	}
	
	// Convert the entries returned by `parseDict` to a proper dictionary.
	// If a value is a list of one, it is unpacked.
	function entriesToObject(entries) {
	    var o = {};
	    for (var i = 0; i < entries.length; i += 1) {
	        var key = entries[i][0];
	        var values = entries[i][1];
	        var value;
	        if (values.length === 1) {
	            value = values[0];
	        } else {
	            value = values;
	        }
	
	        if (o.hasOwnProperty(key)) {
	            throw new Error('Object ' + o + ' already has key ' + key);
	        }
	
	        o[key] = value;
	    }
	
	    return o;
	}
	
	// Parse a `CFF` DICT object.
	// A dictionary contains key-value pairs in a compact tokenized format.
	function parseCFFDict(data, start, size) {
	    start = start !== undefined ? start : 0;
	    var parser = new parse.Parser(data, start);
	    var entries = [];
	    var operands = [];
	    size = size !== undefined ? size : data.length;
	
	    while (parser.relativeOffset < size) {
	        var op = parser.parseByte();
	
	        // The first byte for each dict item distinguishes between operator (key) and operand (value).
	        // Values <= 21 are operators.
	        if (op <= 21) {
	            // Two-byte operators have an initial escape byte of 12.
	            if (op === 12) {
	                op = 1200 + parser.parseByte();
	            }
	
	            entries.push([op, operands]);
	            operands = [];
	        } else {
	            // Since the operands (values) come before the operators (keys), we store all operands in a list
	            // until we encounter an operator.
	            operands.push(parseOperand(parser, op));
	        }
	    }
	
	    return entriesToObject(entries);
	}
	
	// Given a String Index (SID), return the value of the string.
	// Strings below index 392 are standard CFF strings and are not encoded in the font.
	function getCFFString(strings, index) {
	    if (index <= 390) {
	        index = encoding.cffStandardStrings[index];
	    } else {
	        index = strings[index - 391];
	    }
	
	    return index;
	}
	
	// Interpret a dictionary and return a new dictionary with readable keys and values for missing entries.
	// This function takes `meta` which is a list of objects containing `operand`, `name` and `default`.
	function interpretDict(dict, meta, strings) {
	    var newDict = {};
	
	    // Because we also want to include missing values, we start out from the meta list
	    // and lookup values in the dict.
	    for (var i = 0; i < meta.length; i += 1) {
	        var m = meta[i];
	        var value = dict[m.op];
	        if (value === undefined) {
	            value = m.value !== undefined ? m.value : null;
	        }
	
	        if (m.type === 'SID') {
	            value = getCFFString(strings, value);
	        }
	
	        newDict[m.name] = value;
	    }
	
	    return newDict;
	}
	
	// Parse the CFF header.
	function parseCFFHeader(data, start) {
	    var header = {};
	    header.formatMajor = parse.getCard8(data, start);
	    header.formatMinor = parse.getCard8(data, start + 1);
	    header.size = parse.getCard8(data, start + 2);
	    header.offsetSize = parse.getCard8(data, start + 3);
	    header.startOffset = start;
	    header.endOffset = start + 4;
	    return header;
	}
	
	var TOP_DICT_META = [
	    {name: 'version', op: 0, type: 'SID'},
	    {name: 'notice', op: 1, type: 'SID'},
	    {name: 'copyright', op: 1200, type: 'SID'},
	    {name: 'fullName', op: 2, type: 'SID'},
	    {name: 'familyName', op: 3, type: 'SID'},
	    {name: 'weight', op: 4, type: 'SID'},
	    {name: 'isFixedPitch', op: 1201, type: 'number', value: 0},
	    {name: 'italicAngle', op: 1202, type: 'number', value: 0},
	    {name: 'underlinePosition', op: 1203, type: 'number', value: -100},
	    {name: 'underlineThickness', op: 1204, type: 'number', value: 50},
	    {name: 'paintType', op: 1205, type: 'number', value: 0},
	    {name: 'charstringType', op: 1206, type: 'number', value: 2},
	    {name: 'fontMatrix', op: 1207, type: ['real', 'real', 'real', 'real', 'real', 'real'], value: [0.001, 0, 0, 0.001, 0, 0]},
	    {name: 'uniqueId', op: 13, type: 'number'},
	    {name: 'fontBBox', op: 5, type: ['number', 'number', 'number', 'number'], value: [0, 0, 0, 0]},
	    {name: 'strokeWidth', op: 1208, type: 'number', value: 0},
	    {name: 'xuid', op: 14, type: [], value: null},
	    {name: 'charset', op: 15, type: 'offset', value: 0},
	    {name: 'encoding', op: 16, type: 'offset', value: 0},
	    {name: 'charStrings', op: 17, type: 'offset', value: 0},
	    {name: 'private', op: 18, type: ['number', 'offset'], value: [0, 0]}
	];
	
	var PRIVATE_DICT_META = [
	    {name: 'subrs', op: 19, type: 'offset', value: 0},
	    {name: 'defaultWidthX', op: 20, type: 'number', value: 0},
	    {name: 'nominalWidthX', op: 21, type: 'number', value: 0}
	];
	
	// Parse the CFF top dictionary. A CFF table can contain multiple fonts, each with their own top dictionary.
	// The top dictionary contains the essential metadata for the font, together with the private dictionary.
	function parseCFFTopDict(data, strings) {
	    var dict = parseCFFDict(data, 0, data.byteLength);
	    return interpretDict(dict, TOP_DICT_META, strings);
	}
	
	// Parse the CFF private dictionary. We don't fully parse out all the values, only the ones we need.
	function parseCFFPrivateDict(data, start, size, strings) {
	    var dict = parseCFFDict(data, start, size);
	    return interpretDict(dict, PRIVATE_DICT_META, strings);
	}
	
	// Parse the CFF charset table, which contains internal names for all the glyphs.
	// This function will return a list of glyph names.
	// See Adobe TN #5176 chapter 13, "Charsets".
	function parseCFFCharset(data, start, nGlyphs, strings) {
	    var i;
	    var sid;
	    var count;
	    var parser = new parse.Parser(data, start);
	
	    // The .notdef glyph is not included, so subtract 1.
	    nGlyphs -= 1;
	    var charset = ['.notdef'];
	
	    var format = parser.parseCard8();
	    if (format === 0) {
	        for (i = 0; i < nGlyphs; i += 1) {
	            sid = parser.parseSID();
	            charset.push(getCFFString(strings, sid));
	        }
	    } else if (format === 1) {
	        while (charset.length <= nGlyphs) {
	            sid = parser.parseSID();
	            count = parser.parseCard8();
	            for (i = 0; i <= count; i += 1) {
	                charset.push(getCFFString(strings, sid));
	                sid += 1;
	            }
	        }
	    } else if (format === 2) {
	        while (charset.length <= nGlyphs) {
	            sid = parser.parseSID();
	            count = parser.parseCard16();
	            for (i = 0; i <= count; i += 1) {
	                charset.push(getCFFString(strings, sid));
	                sid += 1;
	            }
	        }
	    } else {
	        throw new Error('Unknown charset format ' + format);
	    }
	
	    return charset;
	}
	
	// Parse the CFF encoding data. Only one encoding can be specified per font.
	// See Adobe TN #5176 chapter 12, "Encodings".
	function parseCFFEncoding(data, start, charset) {
	    var i;
	    var code;
	    var enc = {};
	    var parser = new parse.Parser(data, start);
	    var format = parser.parseCard8();
	    if (format === 0) {
	        var nCodes = parser.parseCard8();
	        for (i = 0; i < nCodes; i += 1) {
	            code = parser.parseCard8();
	            enc[code] = i;
	        }
	    } else if (format === 1) {
	        var nRanges = parser.parseCard8();
	        code = 1;
	        for (i = 0; i < nRanges; i += 1) {
	            var first = parser.parseCard8();
	            var nLeft = parser.parseCard8();
	            for (var j = first; j <= first + nLeft; j += 1) {
	                enc[j] = code;
	                code += 1;
	            }
	        }
	    } else {
	        throw new Error('Unknown encoding format ' + format);
	    }
	
	    return new encoding.CffEncoding(enc, charset);
	}
	
	// Take in charstring code and return a Glyph object.
	// The encoding is described in the Type 2 Charstring Format
	// https://www.microsoft.com/typography/OTSPEC/charstr2.htm
	function parseCFFCharstring(font, glyph, code) {
	    var c1x;
	    var c1y;
	    var c2x;
	    var c2y;
	    var p = new path.Path();
	    var stack = [];
	    var nStems = 0;
	    var haveWidth = false;
	    var width = font.defaultWidthX;
	    var open = false;
	    var x = 0;
	    var y = 0;
	
	    function newContour(x, y) {
	        if (open) {
	            p.closePath();
	        }
	
	        p.moveTo(x, y);
	        open = true;
	    }
	
	    function parseStems() {
	        var hasWidthArg;
	
	        // The number of stem operators on the stack is always even.
	        // If the value is uneven, that means a width is specified.
	        hasWidthArg = stack.length % 2 !== 0;
	        if (hasWidthArg && !haveWidth) {
	            width = stack.shift() + font.nominalWidthX;
	        }
	
	        nStems += stack.length >> 1;
	        stack.length = 0;
	        haveWidth = true;
	    }
	
	    function parse(code) {
	        var b1;
	        var b2;
	        var b3;
	        var b4;
	        var codeIndex;
	        var subrCode;
	        var jpx;
	        var jpy;
	        var c3x;
	        var c3y;
	        var c4x;
	        var c4y;
	
	        var i = 0;
	        while (i < code.length) {
	            var v = code[i];
	            i += 1;
	            switch (v) {
	            case 1: // hstem
	                parseStems();
	                break;
	            case 3: // vstem
	                parseStems();
	                break;
	            case 4: // vmoveto
	                if (stack.length > 1 && !haveWidth) {
	                    width = stack.shift() + font.nominalWidthX;
	                    haveWidth = true;
	                }
	
	                y += stack.pop();
	                newContour(x, y);
	                break;
	            case 5: // rlineto
	                while (stack.length > 0) {
	                    x += stack.shift();
	                    y += stack.shift();
	                    p.lineTo(x, y);
	                }
	
	                break;
	            case 6: // hlineto
	                while (stack.length > 0) {
	                    x += stack.shift();
	                    p.lineTo(x, y);
	                    if (stack.length === 0) {
	                        break;
	                    }
	
	                    y += stack.shift();
	                    p.lineTo(x, y);
	                }
	
	                break;
	            case 7: // vlineto
	                while (stack.length > 0) {
	                    y += stack.shift();
	                    p.lineTo(x, y);
	                    if (stack.length === 0) {
	                        break;
	                    }
	
	                    x += stack.shift();
	                    p.lineTo(x, y);
	                }
	
	                break;
	            case 8: // rrcurveto
	                while (stack.length > 0) {
	                    c1x = x + stack.shift();
	                    c1y = y + stack.shift();
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    x = c2x + stack.shift();
	                    y = c2y + stack.shift();
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                }
	
	                break;
	            case 10: // callsubr
	                codeIndex = stack.pop() + font.subrsBias;
	                subrCode = font.subrs[codeIndex];
	                if (subrCode) {
	                    parse(subrCode);
	                }
	
	                break;
	            case 11: // return
	                return;
	            case 12: // flex operators
	                v = code[i];
	                i += 1;
	                switch (v) {
	                case 35: // flex
	                    // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 dx6 dy6 fd flex (12 35) |-
	                    c1x = x   + stack.shift();    // dx1
	                    c1y = y   + stack.shift();    // dy1
	                    c2x = c1x + stack.shift();    // dx2
	                    c2y = c1y + stack.shift();    // dy2
	                    jpx = c2x + stack.shift();    // dx3
	                    jpy = c2y + stack.shift();    // dy3
	                    c3x = jpx + stack.shift();    // dx4
	                    c3y = jpy + stack.shift();    // dy4
	                    c4x = c3x + stack.shift();    // dx5
	                    c4y = c3y + stack.shift();    // dy5
	                    x = c4x + stack.shift();      // dx6
	                    y = c4y + stack.shift();      // dy6
	                    stack.shift();                // flex depth
	                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
	                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
	                    break;
	                case 34: // hflex
	                    // |- dx1 dx2 dy2 dx3 dx4 dx5 dx6 hflex (12 34) |-
	                    c1x = x   + stack.shift();    // dx1
	                    c1y = y;                      // dy1
	                    c2x = c1x + stack.shift();    // dx2
	                    c2y = c1y + stack.shift();    // dy2
	                    jpx = c2x + stack.shift();    // dx3
	                    jpy = c2y;                    // dy3
	                    c3x = jpx + stack.shift();    // dx4
	                    c3y = c2y;                    // dy4
	                    c4x = c3x + stack.shift();    // dx5
	                    c4y = y;                      // dy5
	                    x = c4x + stack.shift();      // dx6
	                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
	                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
	                    break;
	                case 36: // hflex1
	                    // |- dx1 dy1 dx2 dy2 dx3 dx4 dx5 dy5 dx6 hflex1 (12 36) |-
	                    c1x = x   + stack.shift();    // dx1
	                    c1y = y   + stack.shift();    // dy1
	                    c2x = c1x + stack.shift();    // dx2
	                    c2y = c1y + stack.shift();    // dy2
	                    jpx = c2x + stack.shift();    // dx3
	                    jpy = c2y;                    // dy3
	                    c3x = jpx + stack.shift();    // dx4
	                    c3y = c2y;                    // dy4
	                    c4x = c3x + stack.shift();    // dx5
	                    c4y = c3y + stack.shift();    // dy5
	                    x = c4x + stack.shift();      // dx6
	                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
	                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
	                    break;
	                case 37: // flex1
	                    // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 d6 flex1 (12 37) |-
	                    c1x = x   + stack.shift();    // dx1
	                    c1y = y   + stack.shift();    // dy1
	                    c2x = c1x + stack.shift();    // dx2
	                    c2y = c1y + stack.shift();    // dy2
	                    jpx = c2x + stack.shift();    // dx3
	                    jpy = c2y + stack.shift();    // dy3
	                    c3x = jpx + stack.shift();    // dx4
	                    c3y = jpy + stack.shift();    // dy4
	                    c4x = c3x + stack.shift();    // dx5
	                    c4y = c3y + stack.shift();    // dy5
	                    if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
	                        x = c4x + stack.shift();
	                    } else {
	                        y = c4y + stack.shift();
	                    }
	
	                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
	                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
	                    break;
	                default:
	                    console.log('Glyph ' + glyph.index + ': unknown operator ' + 1200 + v);
	                    stack.length = 0;
	                }
	                break;
	            case 14: // endchar
	                if (stack.length > 0 && !haveWidth) {
	                    width = stack.shift() + font.nominalWidthX;
	                    haveWidth = true;
	                }
	
	                if (open) {
	                    p.closePath();
	                    open = false;
	                }
	
	                break;
	            case 18: // hstemhm
	                parseStems();
	                break;
	            case 19: // hintmask
	            case 20: // cntrmask
	                parseStems();
	                i += (nStems + 7) >> 3;
	                break;
	            case 21: // rmoveto
	                if (stack.length > 2 && !haveWidth) {
	                    width = stack.shift() + font.nominalWidthX;
	                    haveWidth = true;
	                }
	
	                y += stack.pop();
	                x += stack.pop();
	                newContour(x, y);
	                break;
	            case 22: // hmoveto
	                if (stack.length > 1 && !haveWidth) {
	                    width = stack.shift() + font.nominalWidthX;
	                    haveWidth = true;
	                }
	
	                x += stack.pop();
	                newContour(x, y);
	                break;
	            case 23: // vstemhm
	                parseStems();
	                break;
	            case 24: // rcurveline
	                while (stack.length > 2) {
	                    c1x = x + stack.shift();
	                    c1y = y + stack.shift();
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    x = c2x + stack.shift();
	                    y = c2y + stack.shift();
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                }
	
	                x += stack.shift();
	                y += stack.shift();
	                p.lineTo(x, y);
	                break;
	            case 25: // rlinecurve
	                while (stack.length > 6) {
	                    x += stack.shift();
	                    y += stack.shift();
	                    p.lineTo(x, y);
	                }
	
	                c1x = x + stack.shift();
	                c1y = y + stack.shift();
	                c2x = c1x + stack.shift();
	                c2y = c1y + stack.shift();
	                x = c2x + stack.shift();
	                y = c2y + stack.shift();
	                p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                break;
	            case 26: // vvcurveto
	                if (stack.length % 2) {
	                    x += stack.shift();
	                }
	
	                while (stack.length > 0) {
	                    c1x = x;
	                    c1y = y + stack.shift();
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    x = c2x;
	                    y = c2y + stack.shift();
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                }
	
	                break;
	            case 27: // hhcurveto
	                if (stack.length % 2) {
	                    y += stack.shift();
	                }
	
	                while (stack.length > 0) {
	                    c1x = x + stack.shift();
	                    c1y = y;
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    x = c2x + stack.shift();
	                    y = c2y;
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                }
	
	                break;
	            case 28: // shortint
	                b1 = code[i];
	                b2 = code[i + 1];
	                stack.push(((b1 << 24) | (b2 << 16)) >> 16);
	                i += 2;
	                break;
	            case 29: // callgsubr
	                codeIndex = stack.pop() + font.gsubrsBias;
	                subrCode = font.gsubrs[codeIndex];
	                if (subrCode) {
	                    parse(subrCode);
	                }
	
	                break;
	            case 30: // vhcurveto
	                while (stack.length > 0) {
	                    c1x = x;
	                    c1y = y + stack.shift();
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    x = c2x + stack.shift();
	                    y = c2y + (stack.length === 1 ? stack.shift() : 0);
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                    if (stack.length === 0) {
	                        break;
	                    }
	
	                    c1x = x + stack.shift();
	                    c1y = y;
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    y = c2y + stack.shift();
	                    x = c2x + (stack.length === 1 ? stack.shift() : 0);
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                }
	
	                break;
	            case 31: // hvcurveto
	                while (stack.length > 0) {
	                    c1x = x + stack.shift();
	                    c1y = y;
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    y = c2y + stack.shift();
	                    x = c2x + (stack.length === 1 ? stack.shift() : 0);
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                    if (stack.length === 0) {
	                        break;
	                    }
	
	                    c1x = x;
	                    c1y = y + stack.shift();
	                    c2x = c1x + stack.shift();
	                    c2y = c1y + stack.shift();
	                    x = c2x + stack.shift();
	                    y = c2y + (stack.length === 1 ? stack.shift() : 0);
	                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
	                }
	
	                break;
	            default:
	                if (v < 32) {
	                    console.log('Glyph ' + glyph.index + ': unknown operator ' + v);
	                } else if (v < 247) {
	                    stack.push(v - 139);
	                } else if (v < 251) {
	                    b1 = code[i];
	                    i += 1;
	                    stack.push((v - 247) * 256 + b1 + 108);
	                } else if (v < 255) {
	                    b1 = code[i];
	                    i += 1;
	                    stack.push(-(v - 251) * 256 - b1 - 108);
	                } else {
	                    b1 = code[i];
	                    b2 = code[i + 1];
	                    b3 = code[i + 2];
	                    b4 = code[i + 3];
	                    i += 4;
	                    stack.push(((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) / 65536);
	                }
	            }
	        }
	    }
	
	    parse(code);
	
	    glyph.advanceWidth = width;
	    return p;
	}
	
	// Subroutines are encoded using the negative half of the number space.
	// See type 2 chapter 4.7 "Subroutine operators".
	function calcCFFSubroutineBias(subrs) {
	    var bias;
	    if (subrs.length < 1240) {
	        bias = 107;
	    } else if (subrs.length < 33900) {
	        bias = 1131;
	    } else {
	        bias = 32768;
	    }
	
	    return bias;
	}
	
	// Parse the `CFF` table, which contains the glyph outlines in PostScript format.
	function parseCFFTable(data, start, font) {
	    font.tables.cff = {};
	    var header = parseCFFHeader(data, start);
	    var nameIndex = parseCFFIndex(data, header.endOffset, parse.bytesToString);
	    var topDictIndex = parseCFFIndex(data, nameIndex.endOffset);
	    var stringIndex = parseCFFIndex(data, topDictIndex.endOffset, parse.bytesToString);
	    var globalSubrIndex = parseCFFIndex(data, stringIndex.endOffset);
	    font.gsubrs = globalSubrIndex.objects;
	    font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);
	
	    var topDictData = new DataView(new Uint8Array(topDictIndex.objects[0]).buffer);
	    var topDict = parseCFFTopDict(topDictData, stringIndex.objects);
	    font.tables.cff.topDict = topDict;
	
	    var privateDictOffset = start + topDict['private'][1];
	    var privateDict = parseCFFPrivateDict(data, privateDictOffset, topDict['private'][0], stringIndex.objects);
	    font.defaultWidthX = privateDict.defaultWidthX;
	    font.nominalWidthX = privateDict.nominalWidthX;
	
	    if (privateDict.subrs !== 0) {
	        var subrOffset = privateDictOffset + privateDict.subrs;
	        var subrIndex = parseCFFIndex(data, subrOffset);
	        font.subrs = subrIndex.objects;
	        font.subrsBias = calcCFFSubroutineBias(font.subrs);
	    } else {
	        font.subrs = [];
	        font.subrsBias = 0;
	    }
	
	    // Offsets in the top dict are relative to the beginning of the CFF data, so add the CFF start offset.
	    var charStringsIndex = parseCFFIndex(data, start + topDict.charStrings);
	    font.nGlyphs = charStringsIndex.objects.length;
	
	    var charset = parseCFFCharset(data, start + topDict.charset, font.nGlyphs, stringIndex.objects);
	    if (topDict.encoding === 0) { // Standard encoding
	        font.cffEncoding = new encoding.CffEncoding(encoding.cffStandardEncoding, charset);
	    } else if (topDict.encoding === 1) { // Expert encoding
	        font.cffEncoding = new encoding.CffEncoding(encoding.cffExpertEncoding, charset);
	    } else {
	        font.cffEncoding = parseCFFEncoding(data, start + topDict.encoding, charset);
	    }
	
	    // Prefer the CMAP encoding to the CFF encoding.
	    font.encoding = font.encoding || font.cffEncoding;
	
	    font.glyphs = new glyphset.GlyphSet(font);
	    for (var i = 0; i < font.nGlyphs; i += 1) {
	        var charString = charStringsIndex.objects[i];
	        font.glyphs.push(i, glyphset.cffGlyphLoader(font, i, parseCFFCharstring, charString));
	    }
	}
	
	// Convert a string to a String ID (SID).
	// The list of strings is modified in place.
	function encodeString(s, strings) {
	    var sid;
	
	    // Is the string in the CFF standard strings?
	    var i = encoding.cffStandardStrings.indexOf(s);
	    if (i >= 0) {
	        sid = i;
	    }
	
	    // Is the string already in the string index?
	    i = strings.indexOf(s);
	    if (i >= 0) {
	        sid = i + encoding.cffStandardStrings.length;
	    } else {
	        sid = encoding.cffStandardStrings.length + strings.length;
	        strings.push(s);
	    }
	
	    return sid;
	}
	
	function makeHeader() {
	    return new table.Table('Header', [
	        {name: 'major', type: 'Card8', value: 1},
	        {name: 'minor', type: 'Card8', value: 0},
	        {name: 'hdrSize', type: 'Card8', value: 4},
	        {name: 'major', type: 'Card8', value: 1}
	    ]);
	}
	
	function makeNameIndex(fontNames) {
	    var t = new table.Table('Name INDEX', [
	        {name: 'names', type: 'INDEX', value: []}
	    ]);
	    t.names = [];
	    for (var i = 0; i < fontNames.length; i += 1) {
	        t.names.push({name: 'name_' + i, type: 'NAME', value: fontNames[i]});
	    }
	
	    return t;
	}
	
	// Given a dictionary's metadata, create a DICT structure.
	function makeDict(meta, attrs, strings) {
	    var m = {};
	    for (var i = 0; i < meta.length; i += 1) {
	        var entry = meta[i];
	        var value = attrs[entry.name];
	        if (value !== undefined && !equals(value, entry.value)) {
	            if (entry.type === 'SID') {
	                value = encodeString(value, strings);
	            }
	
	            m[entry.op] = {name: entry.name, type: entry.type, value: value};
	        }
	    }
	
	    return m;
	}
	
	// The Top DICT houses the global font attributes.
	function makeTopDict(attrs, strings) {
	    var t = new table.Table('Top DICT', [
	        {name: 'dict', type: 'DICT', value: {}}
	    ]);
	    t.dict = makeDict(TOP_DICT_META, attrs, strings);
	    return t;
	}
	
	function makeTopDictIndex(topDict) {
	    var t = new table.Table('Top DICT INDEX', [
	        {name: 'topDicts', type: 'INDEX', value: []}
	    ]);
	    t.topDicts = [{name: 'topDict_0', type: 'TABLE', value: topDict}];
	    return t;
	}
	
	function makeStringIndex(strings) {
	    var t = new table.Table('String INDEX', [
	        {name: 'strings', type: 'INDEX', value: []}
	    ]);
	    t.strings = [];
	    for (var i = 0; i < strings.length; i += 1) {
	        t.strings.push({name: 'string_' + i, type: 'STRING', value: strings[i]});
	    }
	
	    return t;
	}
	
	function makeGlobalSubrIndex() {
	    // Currently we don't use subroutines.
	    return new table.Table('Global Subr INDEX', [
	        {name: 'subrs', type: 'INDEX', value: []}
	    ]);
	}
	
	function makeCharsets(glyphNames, strings) {
	    var t = new table.Table('Charsets', [
	        {name: 'format', type: 'Card8', value: 0}
	    ]);
	    for (var i = 0; i < glyphNames.length; i += 1) {
	        var glyphName = glyphNames[i];
	        var glyphSID = encodeString(glyphName, strings);
	        t.fields.push({name: 'glyph_' + i, type: 'SID', value: glyphSID});
	    }
	
	    return t;
	}
	
	function glyphToOps(glyph) {
	    var ops = [];
	    var path = glyph.path;
	    ops.push({name: 'width', type: 'NUMBER', value: glyph.advanceWidth});
	    var x = 0;
	    var y = 0;
	    for (var i = 0; i < path.commands.length; i += 1) {
	        var dx;
	        var dy;
	        var cmd = path.commands[i];
	        if (cmd.type === 'Q') {
	            // CFF only supports bézier curves, so convert the quad to a bézier.
	            var _13 = 1 / 3;
	            var _23 = 2 / 3;
	
	            // We're going to create a new command so we don't change the original path.
	            cmd = {
	                type: 'C',
	                x: cmd.x,
	                y: cmd.y,
	                x1: _13 * x + _23 * cmd.x1,
	                y1: _13 * y + _23 * cmd.y1,
	                x2: _13 * cmd.x + _23 * cmd.x1,
	                y2: _13 * cmd.y + _23 * cmd.y1
	            };
	        }
	
	        if (cmd.type === 'M') {
	            dx = Math.round(cmd.x - x);
	            dy = Math.round(cmd.y - y);
	            ops.push({name: 'dx', type: 'NUMBER', value: dx});
	            ops.push({name: 'dy', type: 'NUMBER', value: dy});
	            ops.push({name: 'rmoveto', type: 'OP', value: 21});
	            x = Math.round(cmd.x);
	            y = Math.round(cmd.y);
	        } else if (cmd.type === 'L') {
	            dx = Math.round(cmd.x - x);
	            dy = Math.round(cmd.y - y);
	            ops.push({name: 'dx', type: 'NUMBER', value: dx});
	            ops.push({name: 'dy', type: 'NUMBER', value: dy});
	            ops.push({name: 'rlineto', type: 'OP', value: 5});
	            x = Math.round(cmd.x);
	            y = Math.round(cmd.y);
	        } else if (cmd.type === 'C') {
	            var dx1 = Math.round(cmd.x1 - x);
	            var dy1 = Math.round(cmd.y1 - y);
	            var dx2 = Math.round(cmd.x2 - cmd.x1);
	            var dy2 = Math.round(cmd.y2 - cmd.y1);
	            dx = Math.round(cmd.x - cmd.x2);
	            dy = Math.round(cmd.y - cmd.y2);
	            ops.push({name: 'dx1', type: 'NUMBER', value: dx1});
	            ops.push({name: 'dy1', type: 'NUMBER', value: dy1});
	            ops.push({name: 'dx2', type: 'NUMBER', value: dx2});
	            ops.push({name: 'dy2', type: 'NUMBER', value: dy2});
	            ops.push({name: 'dx', type: 'NUMBER', value: dx});
	            ops.push({name: 'dy', type: 'NUMBER', value: dy});
	            ops.push({name: 'rrcurveto', type: 'OP', value: 8});
	            x = Math.round(cmd.x);
	            y = Math.round(cmd.y);
	        }
	
	        // Contours are closed automatically.
	
	    }
	
	    ops.push({name: 'endchar', type: 'OP', value: 14});
	    return ops;
	}
	
	function makeCharStringsIndex(glyphs) {
	    var t = new table.Table('CharStrings INDEX', [
	        {name: 'charStrings', type: 'INDEX', value: []}
	    ]);
	
	    for (var i = 0; i < glyphs.length; i += 1) {
	        var glyph = glyphs.get(i);
	        var ops = glyphToOps(glyph);
	        t.charStrings.push({name: glyph.name, type: 'CHARSTRING', value: ops});
	    }
	
	    return t;
	}
	
	function makePrivateDict(attrs, strings) {
	    var t = new table.Table('Private DICT', [
	        {name: 'dict', type: 'DICT', value: {}}
	    ]);
	    t.dict = makeDict(PRIVATE_DICT_META, attrs, strings);
	    return t;
	}
	
	function makeCFFTable(glyphs, options) {
	    var t = new table.Table('CFF ', [
	        {name: 'header', type: 'TABLE'},
	        {name: 'nameIndex', type: 'TABLE'},
	        {name: 'topDictIndex', type: 'TABLE'},
	        {name: 'stringIndex', type: 'TABLE'},
	        {name: 'globalSubrIndex', type: 'TABLE'},
	        {name: 'charsets', type: 'TABLE'},
	        {name: 'charStringsIndex', type: 'TABLE'},
	        {name: 'privateDict', type: 'TABLE'}
	    ]);
	
	    var fontScale = 1 / options.unitsPerEm;
	    // We use non-zero values for the offsets so that the DICT encodes them.
	    // This is important because the size of the Top DICT plays a role in offset calculation,
	    // and the size shouldn't change after we've written correct offsets.
	    var attrs = {
	        version: options.version,
	        fullName: options.fullName,
	        familyName: options.familyName,
	        weight: options.weightName,
	        fontBBox: options.fontBBox || [0, 0, 0, 0],
	        fontMatrix: [fontScale, 0, 0, fontScale, 0, 0],
	        charset: 999,
	        encoding: 0,
	        charStrings: 999,
	        private: [0, 999]
	    };
	
	    var privateAttrs = {};
	
	    var glyphNames = [];
	    var glyph;
	
	    // Skip first glyph (.notdef)
	    for (var i = 1; i < glyphs.length; i += 1) {
	        glyph = glyphs.get(i);
	        glyphNames.push(glyph.name);
	    }
	
	    var strings = [];
	
	    t.header = makeHeader();
	    t.nameIndex = makeNameIndex([options.postScriptName]);
	    var topDict = makeTopDict(attrs, strings);
	    t.topDictIndex = makeTopDictIndex(topDict);
	    t.globalSubrIndex = makeGlobalSubrIndex();
	    t.charsets = makeCharsets(glyphNames, strings);
	    t.charStringsIndex = makeCharStringsIndex(glyphs);
	    t.privateDict = makePrivateDict(privateAttrs, strings);
	
	    // Needs to come at the end, to encode all custom strings used in the font.
	    t.stringIndex = makeStringIndex(strings);
	
	    var startOffset = t.header.sizeOf() +
	        t.nameIndex.sizeOf() +
	        t.topDictIndex.sizeOf() +
	        t.stringIndex.sizeOf() +
	        t.globalSubrIndex.sizeOf();
	    attrs.charset = startOffset;
	
	    // We use the CFF standard encoding; proper encoding will be handled in cmap.
	    attrs.encoding = 0;
	    attrs.charStrings = attrs.charset + t.charsets.sizeOf();
	    attrs.private[1] = attrs.charStrings + t.charStringsIndex.sizeOf();
	
	    // Recreate the Top DICT INDEX with the correct offsets.
	    topDict = makeTopDict(attrs, strings);
	    t.topDictIndex = makeTopDictIndex(topDict);
	
	    return t;
	}
	
	exports.parse = parseCFFTable;
	exports.make = makeCFFTable;


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	// The GlyphSet object
	
	'use strict';
	
	var _glyph = __webpack_require__(15);
	
	// A GlyphSet represents all glyphs available in the font, but modelled using
	// a deferred glyph loader, for retrieving glyphs only once they are absolutely
	// necessary, to keep the memory footprint down.
	function GlyphSet(font, glyphs) {
	    this.font = font;
	    this.glyphs = {};
	    if (Array.isArray(glyphs)) {
	        for (var i = 0; i < glyphs.length; i++) {
	            this.glyphs[i] = glyphs[i];
	        }
	    }
	
	    this.length = (glyphs && glyphs.length) || 0;
	}
	
	GlyphSet.prototype.get = function(index) {
	    if (typeof this.glyphs[index] === 'function') {
	        this.glyphs[index] = this.glyphs[index]();
	    }
	
	    return this.glyphs[index];
	};
	
	GlyphSet.prototype.push = function(index, loader) {
	    this.glyphs[index] = loader;
	    this.length++;
	};
	
	function glyphLoader(font, index) {
	    return new _glyph.Glyph({index: index, font: font});
	}
	
	/**
	 * Generate a stub glyph that can be filled with all metadata *except*
	 * the "points" and "path" properties, which must be loaded only once
	 * the glyph's path is actually requested for text shaping.
	 */
	
	function ttfGlyphLoader(font, index, parseGlyph, data, position, buildPath) {
	    return function() {
	        var glyph = new _glyph.Glyph({index: index, font: font});
	
	        glyph.path = function() {
	            parseGlyph(glyph, data, position);
	            var path = buildPath(font.glyphs, glyph);
	            path.unitsPerEm = font.unitsPerEm;
	            return path;
	        };
	
	        return glyph;
	    };
	}
	
	function cffGlyphLoader(font, index, parseCFFCharstring, charstring) {
	    return function() {
	        var glyph = new _glyph.Glyph({index: index, font: font});
	
	        glyph.path = function() {
	            var path = parseCFFCharstring(font, glyph, charstring);
	            path.unitsPerEm = font.unitsPerEm;
	            return path;
	        };
	
	        return glyph;
	    };
	}
	
	exports.GlyphSet = GlyphSet;
	exports.glyphLoader = glyphLoader;
	exports.ttfGlyphLoader = ttfGlyphLoader;
	exports.cffGlyphLoader = cffGlyphLoader;


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	// The Glyph object
	
	'use strict';
	
	var check = __webpack_require__(8);
	var draw = __webpack_require__(16);
	var path = __webpack_require__(6);
	
	function getPathDefinition(glyph, path) {
	    var _path = path || { commands: [] };
	    return {
	        configurable: true,
	
	        get: function() {
	            if (typeof _path === 'function') {
	                _path = _path();
	            }
	
	            return _path;
	        },
	
	        set: function(p) {
	            _path = p;
	        }
	    };
	}
	
	// A Glyph is an individual mark that often corresponds to a character.
	// Some glyphs, such as ligatures, are a combination of many characters.
	// Glyphs are the basic building blocks of a font.
	//
	// The `Glyph` class contains utility methods for drawing the path and its points.
	function Glyph(options) {
	    // By putting all the code on a prototype function (which is only declared once)
	    // we reduce the memory requirements for larger fonts by some 2%
	    this.bindConstructorValues(options);
	}
	
	Glyph.prototype.bindConstructorValues = function(options) {
	    this.index = options.index || 0;
	
	    // These three values cannnot be deferred for memory optimization:
	    this.name = options.name || null;
	    this.unicode = options.unicode || undefined;
	    this.unicodes = options.unicodes || options.unicode !== undefined ? [options.unicode] : [];
	
	    // But by binding these values only when necessary, we reduce can
	    // the memory requirements by almost 3% for larger fonts.
	    if (options.xMin) {
	        this.xMin = options.xMin;
	    }
	
	    if (options.yMin) {
	        this.yMin = options.yMin;
	    }
	
	    if (options.xMax) {
	        this.xMax = options.xMax;
	    }
	
	    if (options.yMax) {
	        this.yMax = options.yMax;
	    }
	
	    if (options.advanceWidth) {
	        this.advanceWidth = options.advanceWidth;
	    }
	
	    // The path for a glyph is the most memory intensive, and is bound as a value
	    // with a getter/setter to ensure we actually do path parsing only once the
	    // path is actually needed by anything.
	    Object.defineProperty(this, 'path', getPathDefinition(this, options.path));
	};
	
	Glyph.prototype.addUnicode = function(unicode) {
	    if (this.unicodes.length === 0) {
	        this.unicode = unicode;
	    }
	
	    this.unicodes.push(unicode);
	};
	
	// Convert the glyph to a Path we can draw on a drawing context.
	//
	// x - Horizontal position of the glyph. (default: 0)
	// y - Vertical position of the *baseline* of the glyph. (default: 0)
	// fontSize - Font size, in pixels (default: 72).
	Glyph.prototype.getPath = function(x, y, fontSize) {
	    x = x !== undefined ? x : 0;
	    y = y !== undefined ? y : 0;
	    fontSize = fontSize !== undefined ? fontSize : 72;
	    var scale = 1 / this.path.unitsPerEm * fontSize;
	    var p = new path.Path();
	    var commands = this.path.commands;
	    for (var i = 0; i < commands.length; i += 1) {
	        var cmd = commands[i];
	        if (cmd.type === 'M') {
	            p.moveTo(x + (cmd.x * scale), y + (-cmd.y * scale));
	        } else if (cmd.type === 'L') {
	            p.lineTo(x + (cmd.x * scale), y + (-cmd.y * scale));
	        } else if (cmd.type === 'Q') {
	            p.quadraticCurveTo(x + (cmd.x1 * scale), y + (-cmd.y1 * scale),
	                               x + (cmd.x * scale), y + (-cmd.y * scale));
	        } else if (cmd.type === 'C') {
	            p.curveTo(x + (cmd.x1 * scale), y + (-cmd.y1 * scale),
	                      x + (cmd.x2 * scale), y + (-cmd.y2 * scale),
	                      x + (cmd.x * scale), y + (-cmd.y * scale));
	        } else if (cmd.type === 'Z') {
	            p.closePath();
	        }
	    }
	
	    return p;
	};
	
	// Split the glyph into contours.
	// This function is here for backwards compatibility, and to
	// provide raw access to the TrueType glyph outlines.
	Glyph.prototype.getContours = function() {
	    if (this.points === undefined) {
	        return [];
	    }
	
	    var contours = [];
	    var currentContour = [];
	    for (var i = 0; i < this.points.length; i += 1) {
	        var pt = this.points[i];
	        currentContour.push(pt);
	        if (pt.lastPointOfContour) {
	            contours.push(currentContour);
	            currentContour = [];
	        }
	    }
	
	    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
	    return contours;
	};
	
	// Calculate the xMin/yMin/xMax/yMax/lsb/rsb for a Glyph.
	Glyph.prototype.getMetrics = function() {
	    var commands = this.path.commands;
	    var xCoords = [];
	    var yCoords = [];
	    for (var i = 0; i < commands.length; i += 1) {
	        var cmd = commands[i];
	        if (cmd.type !== 'Z') {
	            xCoords.push(cmd.x);
	            yCoords.push(cmd.y);
	        }
	
	        if (cmd.type === 'Q' || cmd.type === 'C') {
	            xCoords.push(cmd.x1);
	            yCoords.push(cmd.y1);
	        }
	
	        if (cmd.type === 'C') {
	            xCoords.push(cmd.x2);
	            yCoords.push(cmd.y2);
	        }
	    }
	
	    var metrics = {
	        xMin: Math.min.apply(null, xCoords),
	        yMin: Math.min.apply(null, yCoords),
	        xMax: Math.max.apply(null, xCoords),
	        yMax: Math.max.apply(null, yCoords),
	        leftSideBearing: this.leftSideBearing
	    };
	
	    if (!isFinite(metrics.xMin)) {
	        metrics.xMin = 0;
	    }
	
	    if (!isFinite(metrics.xMax)) {
	        metrics.xMax = this.advanceWidth;
	    }
	
	    if (!isFinite(metrics.yMin)) {
	        metrics.yMin = 0;
	    }
	
	    if (!isFinite(metrics.yMax)) {
	        metrics.yMax = 0;
	    }
	
	    metrics.rightSideBearing = this.advanceWidth - metrics.leftSideBearing - (metrics.xMax - metrics.xMin);
	    return metrics;
	};
	
	// Draw the glyph on the given context.
	//
	// ctx - The drawing context.
	// x - Horizontal position of the glyph. (default: 0)
	// y - Vertical position of the *baseline* of the glyph. (default: 0)
	// fontSize - Font size, in pixels (default: 72).
	Glyph.prototype.draw = function(ctx, x, y, fontSize) {
	    this.getPath(x, y, fontSize).draw(ctx);
	};
	
	// Draw the points of the glyph.
	// On-curve points will be drawn in blue, off-curve points will be drawn in red.
	//
	// ctx - The drawing context.
	// x - Horizontal position of the glyph. (default: 0)
	// y - Vertical position of the *baseline* of the glyph. (default: 0)
	// fontSize - Font size, in pixels (default: 72).
	Glyph.prototype.drawPoints = function(ctx, x, y, fontSize) {
	
	    function drawCircles(l, x, y, scale) {
	        var PI_SQ = Math.PI * 2;
	        ctx.beginPath();
	        for (var j = 0; j < l.length; j += 1) {
	            ctx.moveTo(x + (l[j].x * scale), y + (l[j].y * scale));
	            ctx.arc(x + (l[j].x * scale), y + (l[j].y * scale), 2, 0, PI_SQ, false);
	        }
	
	        ctx.closePath();
	        ctx.fill();
	    }
	
	    x = x !== undefined ? x : 0;
	    y = y !== undefined ? y : 0;
	    fontSize = fontSize !== undefined ? fontSize : 24;
	    var scale = 1 / this.path.unitsPerEm * fontSize;
	
	    var blueCircles = [];
	    var redCircles = [];
	    var path = this.path;
	    for (var i = 0; i < path.commands.length; i += 1) {
	        var cmd = path.commands[i];
	        if (cmd.x !== undefined) {
	            blueCircles.push({x: cmd.x, y: -cmd.y});
	        }
	
	        if (cmd.x1 !== undefined) {
	            redCircles.push({x: cmd.x1, y: -cmd.y1});
	        }
	
	        if (cmd.x2 !== undefined) {
	            redCircles.push({x: cmd.x2, y: -cmd.y2});
	        }
	    }
	
	    ctx.fillStyle = 'blue';
	    drawCircles(blueCircles, x, y, scale);
	    ctx.fillStyle = 'red';
	    drawCircles(redCircles, x, y, scale);
	};
	
	// Draw lines indicating important font measurements.
	// Black lines indicate the origin of the coordinate system (point 0,0).
	// Blue lines indicate the glyph bounding box.
	// Green line indicates the advance width of the glyph.
	//
	// ctx - The drawing context.
	// x - Horizontal position of the glyph. (default: 0)
	// y - Vertical position of the *baseline* of the glyph. (default: 0)
	// fontSize - Font size, in pixels (default: 72).
	Glyph.prototype.drawMetrics = function(ctx, x, y, fontSize) {
	    var scale;
	    x = x !== undefined ? x : 0;
	    y = y !== undefined ? y : 0;
	    fontSize = fontSize !== undefined ? fontSize : 24;
	    scale = 1 / this.path.unitsPerEm * fontSize;
	    ctx.lineWidth = 1;
	
	    // Draw the origin
	    ctx.strokeStyle = 'black';
	    draw.line(ctx, x, -10000, x, 10000);
	    draw.line(ctx, -10000, y, 10000, y);
	
	    // This code is here due to memory optimization: by not using
	    // defaults in the constructor, we save a notable amount of memory.
	    var xMin = this.xMin || 0;
	    var yMin = this.yMin || 0;
	    var xMax = this.xMax || 0;
	    var yMax = this.yMax || 0;
	    var advanceWidth = this.advanceWidth || 0;
	
	    // Draw the glyph box
	    ctx.strokeStyle = 'blue';
	    draw.line(ctx, x + (xMin * scale), -10000, x + (xMin * scale), 10000);
	    draw.line(ctx, x + (xMax * scale), -10000, x + (xMax * scale), 10000);
	    draw.line(ctx, -10000, y + (-yMin * scale), 10000, y + (-yMin * scale));
	    draw.line(ctx, -10000, y + (-yMax * scale), 10000, y + (-yMax * scale));
	
	    // Draw the advance width
	    ctx.strokeStyle = 'green';
	    draw.line(ctx, x + (advanceWidth * scale), -10000, x + (advanceWidth * scale), 10000);
	};
	
	exports.Glyph = Glyph;


/***/ },
/* 16 */
/***/ function(module, exports) {

	// Drawing utility functions.
	
	'use strict';
	
	// Draw a line on the given context from point `x1,y1` to point `x2,y2`.
	function line(ctx, x1, y1, x2, y2) {
	    ctx.beginPath();
	    ctx.moveTo(x1, y1);
	    ctx.lineTo(x2, y2);
	    ctx.stroke();
	}
	
	exports.line = line;


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	// The `head` table contains global information about the font.
	// https://www.microsoft.com/typography/OTSPEC/head.htm
	
	'use strict';
	
	var check = __webpack_require__(8);
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	// Parse the header `head` table
	function parseHeadTable(data, start) {
	    var head = {};
	    var p = new parse.Parser(data, start);
	    head.version = p.parseVersion();
	    head.fontRevision = Math.round(p.parseFixed() * 1000) / 1000;
	    head.checkSumAdjustment = p.parseULong();
	    head.magicNumber = p.parseULong();
	    check.argument(head.magicNumber === 0x5F0F3CF5, 'Font header has wrong magic number.');
	    head.flags = p.parseUShort();
	    head.unitsPerEm = p.parseUShort();
	    head.created = p.parseLongDateTime();
	    head.modified = p.parseLongDateTime();
	    head.xMin = p.parseShort();
	    head.yMin = p.parseShort();
	    head.xMax = p.parseShort();
	    head.yMax = p.parseShort();
	    head.macStyle = p.parseUShort();
	    head.lowestRecPPEM = p.parseUShort();
	    head.fontDirectionHint = p.parseShort();
	    head.indexToLocFormat = p.parseShort();
	    head.glyphDataFormat = p.parseShort();
	    return head;
	}
	
	function makeHeadTable(options) {
	    return new table.Table('head', [
	        {name: 'version', type: 'FIXED', value: 0x00010000},
	        {name: 'fontRevision', type: 'FIXED', value: 0x00010000},
	        {name: 'checkSumAdjustment', type: 'ULONG', value: 0},
	        {name: 'magicNumber', type: 'ULONG', value: 0x5F0F3CF5},
	        {name: 'flags', type: 'USHORT', value: 0},
	        {name: 'unitsPerEm', type: 'USHORT', value: 1000},
	        {name: 'created', type: 'LONGDATETIME', value: 0},
	        {name: 'modified', type: 'LONGDATETIME', value: 0},
	        {name: 'xMin', type: 'SHORT', value: 0},
	        {name: 'yMin', type: 'SHORT', value: 0},
	        {name: 'xMax', type: 'SHORT', value: 0},
	        {name: 'yMax', type: 'SHORT', value: 0},
	        {name: 'macStyle', type: 'USHORT', value: 0},
	        {name: 'lowestRecPPEM', type: 'USHORT', value: 0},
	        {name: 'fontDirectionHint', type: 'SHORT', value: 2},
	        {name: 'indexToLocFormat', type: 'SHORT', value: 0},
	        {name: 'glyphDataFormat', type: 'SHORT', value: 0}
	    ], options);
	}
	
	exports.parse = parseHeadTable;
	exports.make = makeHeadTable;


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	// The `hhea` table contains information for horizontal layout.
	// https://www.microsoft.com/typography/OTSPEC/hhea.htm
	
	'use strict';
	
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	// Parse the horizontal header `hhea` table
	function parseHheaTable(data, start) {
	    var hhea = {};
	    var p = new parse.Parser(data, start);
	    hhea.version = p.parseVersion();
	    hhea.ascender = p.parseShort();
	    hhea.descender = p.parseShort();
	    hhea.lineGap = p.parseShort();
	    hhea.advanceWidthMax = p.parseUShort();
	    hhea.minLeftSideBearing = p.parseShort();
	    hhea.minRightSideBearing = p.parseShort();
	    hhea.xMaxExtent = p.parseShort();
	    hhea.caretSlopeRise = p.parseShort();
	    hhea.caretSlopeRun = p.parseShort();
	    hhea.caretOffset = p.parseShort();
	    p.relativeOffset += 8;
	    hhea.metricDataFormat = p.parseShort();
	    hhea.numberOfHMetrics = p.parseUShort();
	    return hhea;
	}
	
	function makeHheaTable(options) {
	    return new table.Table('hhea', [
	        {name: 'version', type: 'FIXED', value: 0x00010000},
	        {name: 'ascender', type: 'FWORD', value: 0},
	        {name: 'descender', type: 'FWORD', value: 0},
	        {name: 'lineGap', type: 'FWORD', value: 0},
	        {name: 'advanceWidthMax', type: 'UFWORD', value: 0},
	        {name: 'minLeftSideBearing', type: 'FWORD', value: 0},
	        {name: 'minRightSideBearing', type: 'FWORD', value: 0},
	        {name: 'xMaxExtent', type: 'FWORD', value: 0},
	        {name: 'caretSlopeRise', type: 'SHORT', value: 1},
	        {name: 'caretSlopeRun', type: 'SHORT', value: 0},
	        {name: 'caretOffset', type: 'SHORT', value: 0},
	        {name: 'reserved1', type: 'SHORT', value: 0},
	        {name: 'reserved2', type: 'SHORT', value: 0},
	        {name: 'reserved3', type: 'SHORT', value: 0},
	        {name: 'reserved4', type: 'SHORT', value: 0},
	        {name: 'metricDataFormat', type: 'SHORT', value: 0},
	        {name: 'numberOfHMetrics', type: 'USHORT', value: 0}
	    ], options);
	}
	
	exports.parse = parseHheaTable;
	exports.make = makeHheaTable;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	// The `hmtx` table contains the horizontal metrics for all glyphs.
	// https://www.microsoft.com/typography/OTSPEC/hmtx.htm
	
	'use strict';
	
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	// Parse the `hmtx` table, which contains the horizontal metrics for all glyphs.
	// This function augments the glyph array, adding the advanceWidth and leftSideBearing to each glyph.
	function parseHmtxTable(data, start, numMetrics, numGlyphs, glyphs) {
	    var advanceWidth;
	    var leftSideBearing;
	    var p = new parse.Parser(data, start);
	    for (var i = 0; i < numGlyphs; i += 1) {
	        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
	        if (i < numMetrics) {
	            advanceWidth = p.parseUShort();
	            leftSideBearing = p.parseShort();
	        }
	
	        var glyph = glyphs.get(i);
	        glyph.advanceWidth = advanceWidth;
	        glyph.leftSideBearing = leftSideBearing;
	    }
	}
	
	function makeHmtxTable(glyphs) {
	    var t = new table.Table('hmtx', []);
	    for (var i = 0; i < glyphs.length; i += 1) {
	        var glyph = glyphs.get(i);
	        var advanceWidth = glyph.advanceWidth || 0;
	        var leftSideBearing = glyph.leftSideBearing || 0;
	        t.fields.push({name: 'advanceWidth_' + i, type: 'USHORT', value: advanceWidth});
	        t.fields.push({name: 'leftSideBearing_' + i, type: 'SHORT', value: leftSideBearing});
	    }
	
	    return t;
	}
	
	exports.parse = parseHmtxTable;
	exports.make = makeHmtxTable;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	// The `ltag` table stores IETF BCP-47 language tags. It allows supporting
	// languages for which TrueType does not assign a numeric code.
	// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6ltag.html
	// http://www.w3.org/International/articles/language-tags/
	// http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
	
	'use strict';
	
	var check = __webpack_require__(8);
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	function makeLtagTable(tags) {
	    var result = new table.Table('ltag', [
	        {name: 'version', type: 'ULONG', value: 1},
	        {name: 'flags', type: 'ULONG', value: 0},
	        {name: 'numTags', type: 'ULONG', value: tags.length}
	    ]);
	
	    var stringPool = '';
	    var stringPoolOffset = 12 + tags.length * 4;
	    for (var i = 0; i < tags.length; ++i) {
	        var pos = stringPool.indexOf(tags[i]);
	        if (pos < 0) {
	            pos = stringPool.length;
	            stringPool += tags[i];
	        }
	
	        result.fields.push({name: 'offset ' + i, type: 'USHORT', value: stringPoolOffset + pos});
	        result.fields.push({name: 'length ' + i, type: 'USHORT', value: tags[i].length});
	    }
	
	    result.fields.push({name: 'stringPool', type: 'CHARARRAY', value: stringPool});
	    return result;
	}
	
	function parseLtagTable(data, start) {
	    var p = new parse.Parser(data, start);
	    var tableVersion = p.parseULong();
	    check.argument(tableVersion === 1, 'Unsupported ltag table version.');
	    // The 'ltag' specification does not define any flags; skip the field.
	    p.skip('uLong', 1);
	    var numTags = p.parseULong();
	
	    var tags = [];
	    for (var i = 0; i < numTags; i++) {
	        var tag = '';
	        var offset = start + p.parseUShort();
	        var length = p.parseUShort();
	        for (var j = offset; j < offset + length; ++j) {
	            tag += String.fromCharCode(data.getInt8(j));
	        }
	
	        tags.push(tag);
	    }
	
	    return tags;
	}
	
	exports.make = makeLtagTable;
	exports.parse = parseLtagTable;


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	// The `maxp` table establishes the memory requirements for the font.
	// We need it just to get the number of glyphs in the font.
	// https://www.microsoft.com/typography/OTSPEC/maxp.htm
	
	'use strict';
	
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	// Parse the maximum profile `maxp` table.
	function parseMaxpTable(data, start) {
	    var maxp = {};
	    var p = new parse.Parser(data, start);
	    maxp.version = p.parseVersion();
	    maxp.numGlyphs = p.parseUShort();
	    if (maxp.version === 1.0) {
	        maxp.maxPoints = p.parseUShort();
	        maxp.maxContours = p.parseUShort();
	        maxp.maxCompositePoints = p.parseUShort();
	        maxp.maxCompositeContours = p.parseUShort();
	        maxp.maxZones = p.parseUShort();
	        maxp.maxTwilightPoints = p.parseUShort();
	        maxp.maxStorage = p.parseUShort();
	        maxp.maxFunctionDefs = p.parseUShort();
	        maxp.maxInstructionDefs = p.parseUShort();
	        maxp.maxStackElements = p.parseUShort();
	        maxp.maxSizeOfInstructions = p.parseUShort();
	        maxp.maxComponentElements = p.parseUShort();
	        maxp.maxComponentDepth = p.parseUShort();
	    }
	
	    return maxp;
	}
	
	function makeMaxpTable(numGlyphs) {
	    return new table.Table('maxp', [
	        {name: 'version', type: 'FIXED', value: 0x00005000},
	        {name: 'numGlyphs', type: 'USHORT', value: numGlyphs}
	    ]);
	}
	
	exports.parse = parseMaxpTable;
	exports.make = makeMaxpTable;


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	// The `name` naming table.
	// https://www.microsoft.com/typography/OTSPEC/name.htm
	
	'use strict';
	
	var types = __webpack_require__(10);
	var decode = types.decode;
	var encode = types.encode;
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	// NameIDs for the name table.
	var nameTableNames = [
	    'copyright',              // 0
	    'fontFamily',             // 1
	    'fontSubfamily',          // 2
	    'uniqueID',               // 3
	    'fullName',               // 4
	    'version',                // 5
	    'postScriptName',         // 6
	    'trademark',              // 7
	    'manufacturer',           // 8
	    'designer',               // 9
	    'description',            // 10
	    'manufacturerURL',        // 11
	    'designerURL',            // 12
	    'license',                // 13
	    'licenseURL',             // 14
	    'reserved',               // 15
	    'preferredFamily',        // 16
	    'preferredSubfamily',     // 17
	    'compatibleFullName',     // 18
	    'sampleText',             // 19
	    'postScriptFindFontName', // 20
	    'wwsFamily',              // 21
	    'wwsSubfamily'            // 22
	];
	
	var macLanguages = {
	    0: 'en',
	    1: 'fr',
	    2: 'de',
	    3: 'it',
	    4: 'nl',
	    5: 'sv',
	    6: 'es',
	    7: 'da',
	    8: 'pt',
	    9: 'no',
	    10: 'he',
	    11: 'ja',
	    12: 'ar',
	    13: 'fi',
	    14: 'el',
	    15: 'is',
	    16: 'mt',
	    17: 'tr',
	    18: 'hr',
	    19: 'zh-Hant',
	    20: 'ur',
	    21: 'hi',
	    22: 'th',
	    23: 'ko',
	    24: 'lt',
	    25: 'pl',
	    26: 'hu',
	    27: 'es',
	    28: 'lv',
	    29: 'se',
	    30: 'fo',
	    31: 'fa',
	    32: 'ru',
	    33: 'zh',
	    34: 'nl-BE',
	    35: 'ga',
	    36: 'sq',
	    37: 'ro',
	    38: 'cz',
	    39: 'sk',
	    40: 'si',
	    41: 'yi',
	    42: 'sr',
	    43: 'mk',
	    44: 'bg',
	    45: 'uk',
	    46: 'be',
	    47: 'uz',
	    48: 'kk',
	    49: 'az-Cyrl',
	    50: 'az-Arab',
	    51: 'hy',
	    52: 'ka',
	    53: 'mo',
	    54: 'ky',
	    55: 'tg',
	    56: 'tk',
	    57: 'mn-CN',
	    58: 'mn',
	    59: 'ps',
	    60: 'ks',
	    61: 'ku',
	    62: 'sd',
	    63: 'bo',
	    64: 'ne',
	    65: 'sa',
	    66: 'mr',
	    67: 'bn',
	    68: 'as',
	    69: 'gu',
	    70: 'pa',
	    71: 'or',
	    72: 'ml',
	    73: 'kn',
	    74: 'ta',
	    75: 'te',
	    76: 'si',
	    77: 'my',
	    78: 'km',
	    79: 'lo',
	    80: 'vi',
	    81: 'id',
	    82: 'tl',
	    83: 'ms',
	    84: 'ms-Arab',
	    85: 'am',
	    86: 'ti',
	    87: 'om',
	    88: 'so',
	    89: 'sw',
	    90: 'rw',
	    91: 'rn',
	    92: 'ny',
	    93: 'mg',
	    94: 'eo',
	    128: 'cy',
	    129: 'eu',
	    130: 'ca',
	    131: 'la',
	    132: 'qu',
	    133: 'gn',
	    134: 'ay',
	    135: 'tt',
	    136: 'ug',
	    137: 'dz',
	    138: 'jv',
	    139: 'su',
	    140: 'gl',
	    141: 'af',
	    142: 'br',
	    143: 'iu',
	    144: 'gd',
	    145: 'gv',
	    146: 'ga',
	    147: 'to',
	    148: 'el-polyton',
	    149: 'kl',
	    150: 'az',
	    151: 'nn'
	};
	
	// MacOS language ID → MacOS script ID
	//
	// Note that the script ID is not sufficient to determine what encoding
	// to use in TrueType files. For some languages, MacOS used a modification
	// of a mainstream script. For example, an Icelandic name would be stored
	// with smRoman in the TrueType naming table, but the actual encoding
	// is a special Icelandic version of the normal Macintosh Roman encoding.
	// As another example, Inuktitut uses an 8-bit encoding for Canadian Aboriginal
	// Syllables but MacOS had run out of available script codes, so this was
	// done as a (pretty radical) "modification" of Ethiopic.
	//
	// http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/Readme.txt
	var macLanguageToScript = {
	    0: 0,  // langEnglish → smRoman
	    1: 0,  // langFrench → smRoman
	    2: 0,  // langGerman → smRoman
	    3: 0,  // langItalian → smRoman
	    4: 0,  // langDutch → smRoman
	    5: 0,  // langSwedish → smRoman
	    6: 0,  // langSpanish → smRoman
	    7: 0,  // langDanish → smRoman
	    8: 0,  // langPortuguese → smRoman
	    9: 0,  // langNorwegian → smRoman
	    10: 5,  // langHebrew → smHebrew
	    11: 1,  // langJapanese → smJapanese
	    12: 4,  // langArabic → smArabic
	    13: 0,  // langFinnish → smRoman
	    14: 6,  // langGreek → smGreek
	    15: 0,  // langIcelandic → smRoman (modified)
	    16: 0,  // langMaltese → smRoman
	    17: 0,  // langTurkish → smRoman (modified)
	    18: 0,  // langCroatian → smRoman (modified)
	    19: 2,  // langTradChinese → smTradChinese
	    20: 4,  // langUrdu → smArabic
	    21: 9,  // langHindi → smDevanagari
	    22: 21,  // langThai → smThai
	    23: 3,  // langKorean → smKorean
	    24: 29,  // langLithuanian → smCentralEuroRoman
	    25: 29,  // langPolish → smCentralEuroRoman
	    26: 29,  // langHungarian → smCentralEuroRoman
	    27: 29,  // langEstonian → smCentralEuroRoman
	    28: 29,  // langLatvian → smCentralEuroRoman
	    29: 0,  // langSami → smRoman
	    30: 0,  // langFaroese → smRoman (modified)
	    31: 4,  // langFarsi → smArabic (modified)
	    32: 7,  // langRussian → smCyrillic
	    33: 25,  // langSimpChinese → smSimpChinese
	    34: 0,  // langFlemish → smRoman
	    35: 0,  // langIrishGaelic → smRoman (modified)
	    36: 0,  // langAlbanian → smRoman
	    37: 0,  // langRomanian → smRoman (modified)
	    38: 29,  // langCzech → smCentralEuroRoman
	    39: 29,  // langSlovak → smCentralEuroRoman
	    40: 0,  // langSlovenian → smRoman (modified)
	    41: 5,  // langYiddish → smHebrew
	    42: 7,  // langSerbian → smCyrillic
	    43: 7,  // langMacedonian → smCyrillic
	    44: 7,  // langBulgarian → smCyrillic
	    45: 7,  // langUkrainian → smCyrillic (modified)
	    46: 7,  // langByelorussian → smCyrillic
	    47: 7,  // langUzbek → smCyrillic
	    48: 7,  // langKazakh → smCyrillic
	    49: 7,  // langAzerbaijani → smCyrillic
	    50: 4,  // langAzerbaijanAr → smArabic
	    51: 24,  // langArmenian → smArmenian
	    52: 23,  // langGeorgian → smGeorgian
	    53: 7,  // langMoldavian → smCyrillic
	    54: 7,  // langKirghiz → smCyrillic
	    55: 7,  // langTajiki → smCyrillic
	    56: 7,  // langTurkmen → smCyrillic
	    57: 27,  // langMongolian → smMongolian
	    58: 7,  // langMongolianCyr → smCyrillic
	    59: 4,  // langPashto → smArabic
	    60: 4,  // langKurdish → smArabic
	    61: 4,  // langKashmiri → smArabic
	    62: 4,  // langSindhi → smArabic
	    63: 26,  // langTibetan → smTibetan
	    64: 9,  // langNepali → smDevanagari
	    65: 9,  // langSanskrit → smDevanagari
	    66: 9,  // langMarathi → smDevanagari
	    67: 13,  // langBengali → smBengali
	    68: 13,  // langAssamese → smBengali
	    69: 11,  // langGujarati → smGujarati
	    70: 10,  // langPunjabi → smGurmukhi
	    71: 12,  // langOriya → smOriya
	    72: 17,  // langMalayalam → smMalayalam
	    73: 16,  // langKannada → smKannada
	    74: 14,  // langTamil → smTamil
	    75: 15,  // langTelugu → smTelugu
	    76: 18,  // langSinhalese → smSinhalese
	    77: 19,  // langBurmese → smBurmese
	    78: 20,  // langKhmer → smKhmer
	    79: 22,  // langLao → smLao
	    80: 30,  // langVietnamese → smVietnamese
	    81: 0,  // langIndonesian → smRoman
	    82: 0,  // langTagalog → smRoman
	    83: 0,  // langMalayRoman → smRoman
	    84: 4,  // langMalayArabic → smArabic
	    85: 28,  // langAmharic → smEthiopic
	    86: 28,  // langTigrinya → smEthiopic
	    87: 28,  // langOromo → smEthiopic
	    88: 0,  // langSomali → smRoman
	    89: 0,  // langSwahili → smRoman
	    90: 0,  // langKinyarwanda → smRoman
	    91: 0,  // langRundi → smRoman
	    92: 0,  // langNyanja → smRoman
	    93: 0,  // langMalagasy → smRoman
	    94: 0,  // langEsperanto → smRoman
	    128: 0,  // langWelsh → smRoman (modified)
	    129: 0,  // langBasque → smRoman
	    130: 0,  // langCatalan → smRoman
	    131: 0,  // langLatin → smRoman
	    132: 0,  // langQuechua → smRoman
	    133: 0,  // langGuarani → smRoman
	    134: 0,  // langAymara → smRoman
	    135: 7,  // langTatar → smCyrillic
	    136: 4,  // langUighur → smArabic
	    137: 26,  // langDzongkha → smTibetan
	    138: 0,  // langJavaneseRom → smRoman
	    139: 0,  // langSundaneseRom → smRoman
	    140: 0,  // langGalician → smRoman
	    141: 0,  // langAfrikaans → smRoman
	    142: 0,  // langBreton → smRoman (modified)
	    143: 28,  // langInuktitut → smEthiopic (modified)
	    144: 0,  // langScottishGaelic → smRoman (modified)
	    145: 0,  // langManxGaelic → smRoman (modified)
	    146: 0,  // langIrishGaelicScript → smRoman (modified)
	    147: 0,  // langTongan → smRoman
	    148: 6,  // langGreekAncient → smRoman
	    149: 0,  // langGreenlandic → smRoman
	    150: 0,  // langAzerbaijanRoman → smRoman
	    151: 0   // langNynorsk → smRoman
	};
	
	// While Microsoft indicates a region/country for all its language
	// IDs, we omit the region code if it's equal to the "most likely
	// region subtag" according to Unicode CLDR. For scripts, we omit
	// the subtag if it is equal to the Suppress-Script entry in the
	// IANA language subtag registry for IETF BCP 47.
	//
	// For example, Microsoft states that its language code 0x041A is
	// Croatian in Croatia. We transform this to the BCP 47 language code 'hr'
	// and not 'hr-HR' because Croatia is the default country for Croatian,
	// according to Unicode CLDR. As another example, Microsoft states
	// that 0x101A is Croatian (Latin) in Bosnia-Herzegovina. We transform
	// this to 'hr-BA' and not 'hr-Latn-BA' because Latin is the default script
	// for the Croatian language, according to IANA.
	//
	// http://www.unicode.org/cldr/charts/latest/supplemental/likely_subtags.html
	// http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
	var windowsLanguages = {
	    0x0436: 'af',
	    0x041C: 'sq',
	    0x0484: 'gsw',
	    0x045E: 'am',
	    0x1401: 'ar-DZ',
	    0x3C01: 'ar-BH',
	    0x0C01: 'ar',
	    0x0801: 'ar-IQ',
	    0x2C01: 'ar-JO',
	    0x3401: 'ar-KW',
	    0x3001: 'ar-LB',
	    0x1001: 'ar-LY',
	    0x1801: 'ary',
	    0x2001: 'ar-OM',
	    0x4001: 'ar-QA',
	    0x0401: 'ar-SA',
	    0x2801: 'ar-SY',
	    0x1C01: 'aeb',
	    0x3801: 'ar-AE',
	    0x2401: 'ar-YE',
	    0x042B: 'hy',
	    0x044D: 'as',
	    0x082C: 'az-Cyrl',
	    0x042C: 'az',
	    0x046D: 'ba',
	    0x042D: 'eu',
	    0x0423: 'be',
	    0x0845: 'bn',
	    0x0445: 'bn-IN',
	    0x201A: 'bs-Cyrl',
	    0x141A: 'bs',
	    0x047E: 'br',
	    0x0402: 'bg',
	    0x0403: 'ca',
	    0x0C04: 'zh-HK',
	    0x1404: 'zh-MO',
	    0x0804: 'zh',
	    0x1004: 'zh-SG',
	    0x0404: 'zh-TW',
	    0x0483: 'co',
	    0x041A: 'hr',
	    0x101A: 'hr-BA',
	    0x0405: 'cs',
	    0x0406: 'da',
	    0x048C: 'prs',
	    0x0465: 'dv',
	    0x0813: 'nl-BE',
	    0x0413: 'nl',
	    0x0C09: 'en-AU',
	    0x2809: 'en-BZ',
	    0x1009: 'en-CA',
	    0x2409: 'en-029',
	    0x4009: 'en-IN',
	    0x1809: 'en-IE',
	    0x2009: 'en-JM',
	    0x4409: 'en-MY',
	    0x1409: 'en-NZ',
	    0x3409: 'en-PH',
	    0x4809: 'en-SG',
	    0x1C09: 'en-ZA',
	    0x2C09: 'en-TT',
	    0x0809: 'en-GB',
	    0x0409: 'en',
	    0x3009: 'en-ZW',
	    0x0425: 'et',
	    0x0438: 'fo',
	    0x0464: 'fil',
	    0x040B: 'fi',
	    0x080C: 'fr-BE',
	    0x0C0C: 'fr-CA',
	    0x040C: 'fr',
	    0x140C: 'fr-LU',
	    0x180C: 'fr-MC',
	    0x100C: 'fr-CH',
	    0x0462: 'fy',
	    0x0456: 'gl',
	    0x0437: 'ka',
	    0x0C07: 'de-AT',
	    0x0407: 'de',
	    0x1407: 'de-LI',
	    0x1007: 'de-LU',
	    0x0807: 'de-CH',
	    0x0408: 'el',
	    0x046F: 'kl',
	    0x0447: 'gu',
	    0x0468: 'ha',
	    0x040D: 'he',
	    0x0439: 'hi',
	    0x040E: 'hu',
	    0x040F: 'is',
	    0x0470: 'ig',
	    0x0421: 'id',
	    0x045D: 'iu',
	    0x085D: 'iu-Latn',
	    0x083C: 'ga',
	    0x0434: 'xh',
	    0x0435: 'zu',
	    0x0410: 'it',
	    0x0810: 'it-CH',
	    0x0411: 'ja',
	    0x044B: 'kn',
	    0x043F: 'kk',
	    0x0453: 'km',
	    0x0486: 'quc',
	    0x0487: 'rw',
	    0x0441: 'sw',
	    0x0457: 'kok',
	    0x0412: 'ko',
	    0x0440: 'ky',
	    0x0454: 'lo',
	    0x0426: 'lv',
	    0x0427: 'lt',
	    0x082E: 'dsb',
	    0x046E: 'lb',
	    0x042F: 'mk',
	    0x083E: 'ms-BN',
	    0x043E: 'ms',
	    0x044C: 'ml',
	    0x043A: 'mt',
	    0x0481: 'mi',
	    0x047A: 'arn',
	    0x044E: 'mr',
	    0x047C: 'moh',
	    0x0450: 'mn',
	    0x0850: 'mn-CN',
	    0x0461: 'ne',
	    0x0414: 'nb',
	    0x0814: 'nn',
	    0x0482: 'oc',
	    0x0448: 'or',
	    0x0463: 'ps',
	    0x0415: 'pl',
	    0x0416: 'pt',
	    0x0816: 'pt-PT',
	    0x0446: 'pa',
	    0x046B: 'qu-BO',
	    0x086B: 'qu-EC',
	    0x0C6B: 'qu',
	    0x0418: 'ro',
	    0x0417: 'rm',
	    0x0419: 'ru',
	    0x243B: 'smn',
	    0x103B: 'smj-NO',
	    0x143B: 'smj',
	    0x0C3B: 'se-FI',
	    0x043B: 'se',
	    0x083B: 'se-SE',
	    0x203B: 'sms',
	    0x183B: 'sma-NO',
	    0x1C3B: 'sms',
	    0x044F: 'sa',
	    0x1C1A: 'sr-Cyrl-BA',
	    0x0C1A: 'sr',
	    0x181A: 'sr-Latn-BA',
	    0x081A: 'sr-Latn',
	    0x046C: 'nso',
	    0x0432: 'tn',
	    0x045B: 'si',
	    0x041B: 'sk',
	    0x0424: 'sl',
	    0x2C0A: 'es-AR',
	    0x400A: 'es-BO',
	    0x340A: 'es-CL',
	    0x240A: 'es-CO',
	    0x140A: 'es-CR',
	    0x1C0A: 'es-DO',
	    0x300A: 'es-EC',
	    0x440A: 'es-SV',
	    0x100A: 'es-GT',
	    0x480A: 'es-HN',
	    0x080A: 'es-MX',
	    0x4C0A: 'es-NI',
	    0x180A: 'es-PA',
	    0x3C0A: 'es-PY',
	    0x280A: 'es-PE',
	    0x500A: 'es-PR',
	
	    // Microsoft has defined two different language codes for
	    // “Spanish with modern sorting” and “Spanish with traditional
	    // sorting”. This makes sense for collation APIs, and it would be
	    // possible to express this in BCP 47 language tags via Unicode
	    // extensions (eg., es-u-co-trad is Spanish with traditional
	    // sorting). However, for storing names in fonts, the distinction
	    // does not make sense, so we give “es” in both cases.
	    0x0C0A: 'es',
	    0x040A: 'es',
	
	    0x540A: 'es-US',
	    0x380A: 'es-UY',
	    0x200A: 'es-VE',
	    0x081D: 'sv-FI',
	    0x041D: 'sv',
	    0x045A: 'syr',
	    0x0428: 'tg',
	    0x085F: 'tzm',
	    0x0449: 'ta',
	    0x0444: 'tt',
	    0x044A: 'te',
	    0x041E: 'th',
	    0x0451: 'bo',
	    0x041F: 'tr',
	    0x0442: 'tk',
	    0x0480: 'ug',
	    0x0422: 'uk',
	    0x042E: 'hsb',
	    0x0420: 'ur',
	    0x0843: 'uz-Cyrl',
	    0x0443: 'uz',
	    0x042A: 'vi',
	    0x0452: 'cy',
	    0x0488: 'wo',
	    0x0485: 'sah',
	    0x0478: 'ii',
	    0x046A: 'yo'
	};
	
	// Returns a IETF BCP 47 language code, for example 'zh-Hant'
	// for 'Chinese in the traditional script'.
	function getLanguageCode(platformID, languageID, ltag) {
	    switch (platformID) {
	    case 0:  // Unicode
	        if (languageID === 0xFFFF) {
	            return 'und';
	        } else if (ltag) {
	            return ltag[languageID];
	        }
	
	        break;
	
	    case 1:  // Macintosh
	        return macLanguages[languageID];
	
	    case 3:  // Windows
	        return windowsLanguages[languageID];
	    }
	
	    return undefined;
	}
	
	var utf16 = 'utf-16';
	
	// MacOS script ID → encoding. This table stores the default case,
	// which can be overridden by macLanguageEncodings.
	var macScriptEncodings = {
	    0: 'macintosh',           // smRoman
	    1: 'x-mac-japanese',      // smJapanese
	    2: 'x-mac-chinesetrad',   // smTradChinese
	    3: 'x-mac-korean',        // smKorean
	    6: 'x-mac-greek',         // smGreek
	    7: 'x-mac-cyrillic',      // smCyrillic
	    9: 'x-mac-devanagai',     // smDevanagari
	    10: 'x-mac-gurmukhi',     // smGurmukhi
	    11: 'x-mac-gujarati',     // smGujarati
	    12: 'x-mac-oriya',        // smOriya
	    13: 'x-mac-bengali',      // smBengali
	    14: 'x-mac-tamil',        // smTamil
	    15: 'x-mac-telugu',       // smTelugu
	    16: 'x-mac-kannada',      // smKannada
	    17: 'x-mac-malayalam',    // smMalayalam
	    18: 'x-mac-sinhalese',    // smSinhalese
	    19: 'x-mac-burmese',      // smBurmese
	    20: 'x-mac-khmer',        // smKhmer
	    21: 'x-mac-thai',         // smThai
	    22: 'x-mac-lao',          // smLao
	    23: 'x-mac-georgian',     // smGeorgian
	    24: 'x-mac-armenian',     // smArmenian
	    25: 'x-mac-chinesesimp',  // smSimpChinese
	    26: 'x-mac-tibetan',      // smTibetan
	    27: 'x-mac-mongolian',    // smMongolian
	    28: 'x-mac-ethiopic',     // smEthiopic
	    29: 'x-mac-ce',           // smCentralEuroRoman
	    30: 'x-mac-vietnamese',   // smVietnamese
	    31: 'x-mac-extarabic'     // smExtArabic
	};
	
	// MacOS language ID → encoding. This table stores the exceptional
	// cases, which override macScriptEncodings. For writing MacOS naming
	// tables, we need to emit a MacOS script ID. Therefore, we cannot
	// merge macScriptEncodings into macLanguageEncodings.
	//
	// http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/Readme.txt
	var macLanguageEncodings = {
	    15: 'x-mac-icelandic',    // langIcelandic
	    17: 'x-mac-turkish',      // langTurkish
	    18: 'x-mac-croatian',     // langCroatian
	    24: 'x-mac-ce',           // langLithuanian
	    25: 'x-mac-ce',           // langPolish
	    26: 'x-mac-ce',           // langHungarian
	    27: 'x-mac-ce',           // langEstonian
	    28: 'x-mac-ce',           // langLatvian
	    30: 'x-mac-icelandic',    // langFaroese
	    37: 'x-mac-romanian',     // langRomanian
	    38: 'x-mac-ce',           // langCzech
	    39: 'x-mac-ce',           // langSlovak
	    40: 'x-mac-ce',           // langSlovenian
	    143: 'x-mac-inuit',       // langInuktitut
	    146: 'x-mac-gaelic'       // langIrishGaelicScript
	};
	
	function getEncoding(platformID, encodingID, languageID) {
	    switch (platformID) {
	    case 0:  // Unicode
	        return utf16;
	
	    case 1:  // Apple Macintosh
	        return macLanguageEncodings[languageID] || macScriptEncodings[encodingID];
	
	    case 3:  // Microsoft Windows
	        if (encodingID === 1 || encodingID === 10) {
	            return utf16;
	        }
	
	        break;
	    }
	
	    return undefined;
	}
	
	// Parse the naming `name` table.
	// FIXME: Format 1 additional fields are not supported yet.
	// ltag is the content of the `ltag' table, such as ['en', 'zh-Hans', 'de-CH-1904'].
	function parseNameTable(data, start, ltag) {
	    var name = {};
	    var p = new parse.Parser(data, start);
	    var format = p.parseUShort();
	    var count = p.parseUShort();
	    var stringOffset = p.offset + p.parseUShort();
	    for (var i = 0; i < count; i++) {
	        var platformID = p.parseUShort();
	        var encodingID = p.parseUShort();
	        var languageID = p.parseUShort();
	        var nameID = p.parseUShort();
	        var property = nameTableNames[nameID] || nameID;
	        var byteLength = p.parseUShort();
	        var offset = p.parseUShort();
	        var language = getLanguageCode(platformID, languageID, ltag);
	        var encoding = getEncoding(platformID, encodingID, languageID);
	        if (encoding !== undefined && language !== undefined) {
	            var text;
	            if (encoding === utf16) {
	                text = decode.UTF16(data, stringOffset + offset, byteLength);
	            } else {
	                text = decode.MACSTRING(data, stringOffset + offset, byteLength, encoding);
	            }
	
	            if (text) {
	                var translations = name[property];
	                if (translations === undefined) {
	                    translations = name[property] = {};
	                }
	
	                translations[language] = text;
	            }
	        }
	    }
	
	    var langTagCount = 0;
	    if (format === 1) {
	        // FIXME: Also handle Microsoft's 'name' table 1.
	        langTagCount = p.parseUShort();
	    }
	
	    return name;
	}
	
	// {23: 'foo'} → {'foo': 23}
	// ['bar', 'baz'] → {'bar': 0, 'baz': 1}
	function reverseDict(dict) {
	    var result = {};
	    for (var key in dict) {
	        result[dict[key]] = parseInt(key);
	    }
	
	    return result;
	}
	
	function makeNameRecord(platformID, encodingID, languageID, nameID, length, offset) {
	    return new table.Table('NameRecord', [
	        {name: 'platformID', type: 'USHORT', value: platformID},
	        {name: 'encodingID', type: 'USHORT', value: encodingID},
	        {name: 'languageID', type: 'USHORT', value: languageID},
	        {name: 'nameID', type: 'USHORT', value: nameID},
	        {name: 'length', type: 'USHORT', value: length},
	        {name: 'offset', type: 'USHORT', value: offset}
	    ]);
	}
	
	// Finds the position of needle in haystack, or -1 if not there.
	// Like String.indexOf(), but for arrays.
	function findSubArray(needle, haystack) {
	    var needleLength = needle.length;
	    var limit = haystack.length - needleLength + 1;
	
	    loop:
	    for (var pos = 0; pos < limit; pos++) {
	        for (; pos < limit; pos++) {
	            for (var k = 0; k < needleLength; k++) {
	                if (haystack[pos + k] !== needle[k]) {
	                    continue loop;
	                }
	            }
	
	            return pos;
	        }
	    }
	
	    return -1;
	}
	
	function addStringToPool(s, pool) {
	    var offset = findSubArray(s, pool);
	    if (offset < 0) {
	        offset = pool.length;
	        for (var i = 0, len = s.length; i < len; ++i) {
	            pool.push(s[i]);
	        }
	
	    }
	
	    return offset;
	}
	
	function makeNameTable(names, ltag) {
	    var nameID;
	    var nameIDs = [];
	
	    var namesWithNumericKeys = {};
	    var nameTableIds = reverseDict(nameTableNames);
	    for (var key in names) {
	        var id = nameTableIds[key];
	        if (id === undefined) {
	            id = key;
	        }
	
	        nameID = parseInt(id);
	        namesWithNumericKeys[nameID] = names[key];
	        nameIDs.push(nameID);
	    }
	
	    var macLanguageIds = reverseDict(macLanguages);
	    var windowsLanguageIds = reverseDict(windowsLanguages);
	
	    var nameRecords = [];
	    var stringPool = [];
	
	    for (var i = 0; i < nameIDs.length; i++) {
	        nameID = nameIDs[i];
	        var translations = namesWithNumericKeys[nameID];
	        for (var lang in translations) {
	            var text = translations[lang];
	
	            // For MacOS, we try to emit the name in the form that was introduced
	            // in the initial version of the TrueType spec (in the late 1980s).
	            // However, this can fail for various reasons: the requested BCP 47
	            // language code might not have an old-style Mac equivalent;
	            // we might not have a codec for the needed character encoding;
	            // or the name might contain characters that cannot be expressed
	            // in the old-style Macintosh encoding. In case of failure, we emit
	            // the name in a more modern fashion (Unicode encoding with BCP 47
	            // language tags) that is recognized by MacOS 10.5, released in 2009.
	            // If fonts were only read by operating systems, we could simply
	            // emit all names in the modern form; this would be much easier.
	            // However, there are many applications and libraries that read
	            // 'name' tables directly, and these will usually only recognize
	            // the ancient form (silently skipping the unrecognized names).
	            var macPlatform = 1;  // Macintosh
	            var macLanguage = macLanguageIds[lang];
	            var macScript = macLanguageToScript[macLanguage];
	            var macEncoding = getEncoding(macPlatform, macScript, macLanguage);
	            var macName = encode.MACSTRING(text, macEncoding);
	            if (macName === undefined) {
	                macPlatform = 0;  // Unicode
	                macLanguage = ltag.indexOf(lang);
	                if (macLanguage < 0) {
	                    macLanguage = ltag.length;
	                    ltag.push(lang);
	                }
	
	                macScript = 4;  // Unicode 2.0 and later
	                macName = encode.UTF16(text);
	            }
	
	            var macNameOffset = addStringToPool(macName, stringPool);
	            nameRecords.push(makeNameRecord(macPlatform, macScript, macLanguage,
	                                            nameID, macName.length, macNameOffset));
	
	            var winLanguage = windowsLanguageIds[lang];
	            if (winLanguage !== undefined) {
	                var winName = encode.UTF16(text);
	                var winNameOffset = addStringToPool(winName, stringPool);
	                nameRecords.push(makeNameRecord(3, 1, winLanguage,
	                                                nameID, winName.length, winNameOffset));
	            }
	        }
	    }
	
	    nameRecords.sort(function(a, b) {
	        return ((a.platformID - b.platformID) ||
	                (a.encodingID - b.encodingID) ||
	                (a.languageID - b.languageID) ||
	                (a.nameID - b.nameID));
	    });
	
	    var t = new table.Table('name', [
	        {name: 'format', type: 'USHORT', value: 0},
	        {name: 'count', type: 'USHORT', value: nameRecords.length},
	        {name: 'stringOffset', type: 'USHORT', value: 6 + nameRecords.length * 12}
	    ]);
	
	    for (var r = 0; r < nameRecords.length; r++) {
	        t.fields.push({name: 'record_' + r, type: 'TABLE', value: nameRecords[r]});
	    }
	
	    t.fields.push({name: 'strings', type: 'LITERAL', value: stringPool});
	    return t;
	}
	
	exports.parse = parseNameTable;
	exports.make = makeNameTable;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	// The `OS/2` table contains metrics required in OpenType fonts.
	// https://www.microsoft.com/typography/OTSPEC/os2.htm
	
	'use strict';
	
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	var unicodeRanges = [
	    {begin: 0x0000, end: 0x007F}, // Basic Latin
	    {begin: 0x0080, end: 0x00FF}, // Latin-1 Supplement
	    {begin: 0x0100, end: 0x017F}, // Latin Extended-A
	    {begin: 0x0180, end: 0x024F}, // Latin Extended-B
	    {begin: 0x0250, end: 0x02AF}, // IPA Extensions
	    {begin: 0x02B0, end: 0x02FF}, // Spacing Modifier Letters
	    {begin: 0x0300, end: 0x036F}, // Combining Diacritical Marks
	    {begin: 0x0370, end: 0x03FF}, // Greek and Coptic
	    {begin: 0x2C80, end: 0x2CFF}, // Coptic
	    {begin: 0x0400, end: 0x04FF}, // Cyrillic
	    {begin: 0x0530, end: 0x058F}, // Armenian
	    {begin: 0x0590, end: 0x05FF}, // Hebrew
	    {begin: 0xA500, end: 0xA63F}, // Vai
	    {begin: 0x0600, end: 0x06FF}, // Arabic
	    {begin: 0x07C0, end: 0x07FF}, // NKo
	    {begin: 0x0900, end: 0x097F}, // Devanagari
	    {begin: 0x0980, end: 0x09FF}, // Bengali
	    {begin: 0x0A00, end: 0x0A7F}, // Gurmukhi
	    {begin: 0x0A80, end: 0x0AFF}, // Gujarati
	    {begin: 0x0B00, end: 0x0B7F}, // Oriya
	    {begin: 0x0B80, end: 0x0BFF}, // Tamil
	    {begin: 0x0C00, end: 0x0C7F}, // Telugu
	    {begin: 0x0C80, end: 0x0CFF}, // Kannada
	    {begin: 0x0D00, end: 0x0D7F}, // Malayalam
	    {begin: 0x0E00, end: 0x0E7F}, // Thai
	    {begin: 0x0E80, end: 0x0EFF}, // Lao
	    {begin: 0x10A0, end: 0x10FF}, // Georgian
	    {begin: 0x1B00, end: 0x1B7F}, // Balinese
	    {begin: 0x1100, end: 0x11FF}, // Hangul Jamo
	    {begin: 0x1E00, end: 0x1EFF}, // Latin Extended Additional
	    {begin: 0x1F00, end: 0x1FFF}, // Greek Extended
	    {begin: 0x2000, end: 0x206F}, // General Punctuation
	    {begin: 0x2070, end: 0x209F}, // Superscripts And Subscripts
	    {begin: 0x20A0, end: 0x20CF}, // Currency Symbol
	    {begin: 0x20D0, end: 0x20FF}, // Combining Diacritical Marks For Symbols
	    {begin: 0x2100, end: 0x214F}, // Letterlike Symbols
	    {begin: 0x2150, end: 0x218F}, // Number Forms
	    {begin: 0x2190, end: 0x21FF}, // Arrows
	    {begin: 0x2200, end: 0x22FF}, // Mathematical Operators
	    {begin: 0x2300, end: 0x23FF}, // Miscellaneous Technical
	    {begin: 0x2400, end: 0x243F}, // Control Pictures
	    {begin: 0x2440, end: 0x245F}, // Optical Character Recognition
	    {begin: 0x2460, end: 0x24FF}, // Enclosed Alphanumerics
	    {begin: 0x2500, end: 0x257F}, // Box Drawing
	    {begin: 0x2580, end: 0x259F}, // Block Elements
	    {begin: 0x25A0, end: 0x25FF}, // Geometric Shapes
	    {begin: 0x2600, end: 0x26FF}, // Miscellaneous Symbols
	    {begin: 0x2700, end: 0x27BF}, // Dingbats
	    {begin: 0x3000, end: 0x303F}, // CJK Symbols And Punctuation
	    {begin: 0x3040, end: 0x309F}, // Hiragana
	    {begin: 0x30A0, end: 0x30FF}, // Katakana
	    {begin: 0x3100, end: 0x312F}, // Bopomofo
	    {begin: 0x3130, end: 0x318F}, // Hangul Compatibility Jamo
	    {begin: 0xA840, end: 0xA87F}, // Phags-pa
	    {begin: 0x3200, end: 0x32FF}, // Enclosed CJK Letters And Months
	    {begin: 0x3300, end: 0x33FF}, // CJK Compatibility
	    {begin: 0xAC00, end: 0xD7AF}, // Hangul Syllables
	    {begin: 0xD800, end: 0xDFFF}, // Non-Plane 0 *
	    {begin: 0x10900, end: 0x1091F}, // Phoenicia
	    {begin: 0x4E00, end: 0x9FFF}, // CJK Unified Ideographs
	    {begin: 0xE000, end: 0xF8FF}, // Private Use Area (plane 0)
	    {begin: 0x31C0, end: 0x31EF}, // CJK Strokes
	    {begin: 0xFB00, end: 0xFB4F}, // Alphabetic Presentation Forms
	    {begin: 0xFB50, end: 0xFDFF}, // Arabic Presentation Forms-A
	    {begin: 0xFE20, end: 0xFE2F}, // Combining Half Marks
	    {begin: 0xFE10, end: 0xFE1F}, // Vertical Forms
	    {begin: 0xFE50, end: 0xFE6F}, // Small Form Variants
	    {begin: 0xFE70, end: 0xFEFF}, // Arabic Presentation Forms-B
	    {begin: 0xFF00, end: 0xFFEF}, // Halfwidth And Fullwidth Forms
	    {begin: 0xFFF0, end: 0xFFFF}, // Specials
	    {begin: 0x0F00, end: 0x0FFF}, // Tibetan
	    {begin: 0x0700, end: 0x074F}, // Syriac
	    {begin: 0x0780, end: 0x07BF}, // Thaana
	    {begin: 0x0D80, end: 0x0DFF}, // Sinhala
	    {begin: 0x1000, end: 0x109F}, // Myanmar
	    {begin: 0x1200, end: 0x137F}, // Ethiopic
	    {begin: 0x13A0, end: 0x13FF}, // Cherokee
	    {begin: 0x1400, end: 0x167F}, // Unified Canadian Aboriginal Syllabics
	    {begin: 0x1680, end: 0x169F}, // Ogham
	    {begin: 0x16A0, end: 0x16FF}, // Runic
	    {begin: 0x1780, end: 0x17FF}, // Khmer
	    {begin: 0x1800, end: 0x18AF}, // Mongolian
	    {begin: 0x2800, end: 0x28FF}, // Braille Patterns
	    {begin: 0xA000, end: 0xA48F}, // Yi Syllables
	    {begin: 0x1700, end: 0x171F}, // Tagalog
	    {begin: 0x10300, end: 0x1032F}, // Old Italic
	    {begin: 0x10330, end: 0x1034F}, // Gothic
	    {begin: 0x10400, end: 0x1044F}, // Deseret
	    {begin: 0x1D000, end: 0x1D0FF}, // Byzantine Musical Symbols
	    {begin: 0x1D400, end: 0x1D7FF}, // Mathematical Alphanumeric Symbols
	    {begin: 0xFF000, end: 0xFFFFD}, // Private Use (plane 15)
	    {begin: 0xFE00, end: 0xFE0F}, // Variation Selectors
	    {begin: 0xE0000, end: 0xE007F}, // Tags
	    {begin: 0x1900, end: 0x194F}, // Limbu
	    {begin: 0x1950, end: 0x197F}, // Tai Le
	    {begin: 0x1980, end: 0x19DF}, // New Tai Lue
	    {begin: 0x1A00, end: 0x1A1F}, // Buginese
	    {begin: 0x2C00, end: 0x2C5F}, // Glagolitic
	    {begin: 0x2D30, end: 0x2D7F}, // Tifinagh
	    {begin: 0x4DC0, end: 0x4DFF}, // Yijing Hexagram Symbols
	    {begin: 0xA800, end: 0xA82F}, // Syloti Nagri
	    {begin: 0x10000, end: 0x1007F}, // Linear B Syllabary
	    {begin: 0x10140, end: 0x1018F}, // Ancient Greek Numbers
	    {begin: 0x10380, end: 0x1039F}, // Ugaritic
	    {begin: 0x103A0, end: 0x103DF}, // Old Persian
	    {begin: 0x10450, end: 0x1047F}, // Shavian
	    {begin: 0x10480, end: 0x104AF}, // Osmanya
	    {begin: 0x10800, end: 0x1083F}, // Cypriot Syllabary
	    {begin: 0x10A00, end: 0x10A5F}, // Kharoshthi
	    {begin: 0x1D300, end: 0x1D35F}, // Tai Xuan Jing Symbols
	    {begin: 0x12000, end: 0x123FF}, // Cuneiform
	    {begin: 0x1D360, end: 0x1D37F}, // Counting Rod Numerals
	    {begin: 0x1B80, end: 0x1BBF}, // Sundanese
	    {begin: 0x1C00, end: 0x1C4F}, // Lepcha
	    {begin: 0x1C50, end: 0x1C7F}, // Ol Chiki
	    {begin: 0xA880, end: 0xA8DF}, // Saurashtra
	    {begin: 0xA900, end: 0xA92F}, // Kayah Li
	    {begin: 0xA930, end: 0xA95F}, // Rejang
	    {begin: 0xAA00, end: 0xAA5F}, // Cham
	    {begin: 0x10190, end: 0x101CF}, // Ancient Symbols
	    {begin: 0x101D0, end: 0x101FF}, // Phaistos Disc
	    {begin: 0x102A0, end: 0x102DF}, // Carian
	    {begin: 0x1F030, end: 0x1F09F}  // Domino Tiles
	];
	
	function getUnicodeRange(unicode) {
	    for (var i = 0; i < unicodeRanges.length; i += 1) {
	        var range = unicodeRanges[i];
	        if (unicode >= range.begin && unicode < range.end) {
	            return i;
	        }
	    }
	
	    return -1;
	}
	
	// Parse the OS/2 and Windows metrics `OS/2` table
	function parseOS2Table(data, start) {
	    var os2 = {};
	    var p = new parse.Parser(data, start);
	    os2.version = p.parseUShort();
	    os2.xAvgCharWidth = p.parseShort();
	    os2.usWeightClass = p.parseUShort();
	    os2.usWidthClass = p.parseUShort();
	    os2.fsType = p.parseUShort();
	    os2.ySubscriptXSize = p.parseShort();
	    os2.ySubscriptYSize = p.parseShort();
	    os2.ySubscriptXOffset = p.parseShort();
	    os2.ySubscriptYOffset = p.parseShort();
	    os2.ySuperscriptXSize = p.parseShort();
	    os2.ySuperscriptYSize = p.parseShort();
	    os2.ySuperscriptXOffset = p.parseShort();
	    os2.ySuperscriptYOffset = p.parseShort();
	    os2.yStrikeoutSize = p.parseShort();
	    os2.yStrikeoutPosition = p.parseShort();
	    os2.sFamilyClass = p.parseShort();
	    os2.panose = [];
	    for (var i = 0; i < 10; i++) {
	        os2.panose[i] = p.parseByte();
	    }
	
	    os2.ulUnicodeRange1 = p.parseULong();
	    os2.ulUnicodeRange2 = p.parseULong();
	    os2.ulUnicodeRange3 = p.parseULong();
	    os2.ulUnicodeRange4 = p.parseULong();
	    os2.achVendID = String.fromCharCode(p.parseByte(), p.parseByte(), p.parseByte(), p.parseByte());
	    os2.fsSelection = p.parseUShort();
	    os2.usFirstCharIndex = p.parseUShort();
	    os2.usLastCharIndex = p.parseUShort();
	    os2.sTypoAscender = p.parseShort();
	    os2.sTypoDescender = p.parseShort();
	    os2.sTypoLineGap = p.parseShort();
	    os2.usWinAscent = p.parseUShort();
	    os2.usWinDescent = p.parseUShort();
	    if (os2.version >= 1) {
	        os2.ulCodePageRange1 = p.parseULong();
	        os2.ulCodePageRange2 = p.parseULong();
	    }
	
	    if (os2.version >= 2) {
	        os2.sxHeight = p.parseShort();
	        os2.sCapHeight = p.parseShort();
	        os2.usDefaultChar = p.parseUShort();
	        os2.usBreakChar = p.parseUShort();
	        os2.usMaxContent = p.parseUShort();
	    }
	
	    return os2;
	}
	
	function makeOS2Table(options) {
	    return new table.Table('OS/2', [
	        {name: 'version', type: 'USHORT', value: 0x0003},
	        {name: 'xAvgCharWidth', type: 'SHORT', value: 0},
	        {name: 'usWeightClass', type: 'USHORT', value: 0},
	        {name: 'usWidthClass', type: 'USHORT', value: 0},
	        {name: 'fsType', type: 'USHORT', value: 0},
	        {name: 'ySubscriptXSize', type: 'SHORT', value: 650},
	        {name: 'ySubscriptYSize', type: 'SHORT', value: 699},
	        {name: 'ySubscriptXOffset', type: 'SHORT', value: 0},
	        {name: 'ySubscriptYOffset', type: 'SHORT', value: 140},
	        {name: 'ySuperscriptXSize', type: 'SHORT', value: 650},
	        {name: 'ySuperscriptYSize', type: 'SHORT', value: 699},
	        {name: 'ySuperscriptXOffset', type: 'SHORT', value: 0},
	        {name: 'ySuperscriptYOffset', type: 'SHORT', value: 479},
	        {name: 'yStrikeoutSize', type: 'SHORT', value: 49},
	        {name: 'yStrikeoutPosition', type: 'SHORT', value: 258},
	        {name: 'sFamilyClass', type: 'SHORT', value: 0},
	        {name: 'bFamilyType', type: 'BYTE', value: 0},
	        {name: 'bSerifStyle', type: 'BYTE', value: 0},
	        {name: 'bWeight', type: 'BYTE', value: 0},
	        {name: 'bProportion', type: 'BYTE', value: 0},
	        {name: 'bContrast', type: 'BYTE', value: 0},
	        {name: 'bStrokeVariation', type: 'BYTE', value: 0},
	        {name: 'bArmStyle', type: 'BYTE', value: 0},
	        {name: 'bLetterform', type: 'BYTE', value: 0},
	        {name: 'bMidline', type: 'BYTE', value: 0},
	        {name: 'bXHeight', type: 'BYTE', value: 0},
	        {name: 'ulUnicodeRange1', type: 'ULONG', value: 0},
	        {name: 'ulUnicodeRange2', type: 'ULONG', value: 0},
	        {name: 'ulUnicodeRange3', type: 'ULONG', value: 0},
	        {name: 'ulUnicodeRange4', type: 'ULONG', value: 0},
	        {name: 'achVendID', type: 'CHARARRAY', value: 'XXXX'},
	        {name: 'fsSelection', type: 'USHORT', value: 0},
	        {name: 'usFirstCharIndex', type: 'USHORT', value: 0},
	        {name: 'usLastCharIndex', type: 'USHORT', value: 0},
	        {name: 'sTypoAscender', type: 'SHORT', value: 0},
	        {name: 'sTypoDescender', type: 'SHORT', value: 0},
	        {name: 'sTypoLineGap', type: 'SHORT', value: 0},
	        {name: 'usWinAscent', type: 'USHORT', value: 0},
	        {name: 'usWinDescent', type: 'USHORT', value: 0},
	        {name: 'ulCodePageRange1', type: 'ULONG', value: 0},
	        {name: 'ulCodePageRange2', type: 'ULONG', value: 0},
	        {name: 'sxHeight', type: 'SHORT', value: 0},
	        {name: 'sCapHeight', type: 'SHORT', value: 0},
	        {name: 'usDefaultChar', type: 'USHORT', value: 0},
	        {name: 'usBreakChar', type: 'USHORT', value: 0},
	        {name: 'usMaxContext', type: 'USHORT', value: 0}
	    ], options);
	}
	
	exports.unicodeRanges = unicodeRanges;
	exports.getUnicodeRange = getUnicodeRange;
	exports.parse = parseOS2Table;
	exports.make = makeOS2Table;


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	// The `post` table stores additional PostScript information, such as glyph names.
	// https://www.microsoft.com/typography/OTSPEC/post.htm
	
	'use strict';
	
	var encoding = __webpack_require__(4);
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	// Parse the PostScript `post` table
	function parsePostTable(data, start) {
	    var post = {};
	    var p = new parse.Parser(data, start);
	    var i;
	    post.version = p.parseVersion();
	    post.italicAngle = p.parseFixed();
	    post.underlinePosition = p.parseShort();
	    post.underlineThickness = p.parseShort();
	    post.isFixedPitch = p.parseULong();
	    post.minMemType42 = p.parseULong();
	    post.maxMemType42 = p.parseULong();
	    post.minMemType1 = p.parseULong();
	    post.maxMemType1 = p.parseULong();
	    switch (post.version) {
	    case 1:
	        post.names = encoding.standardNames.slice();
	        break;
	    case 2:
	        post.numberOfGlyphs = p.parseUShort();
	        post.glyphNameIndex = new Array(post.numberOfGlyphs);
	        for (i = 0; i < post.numberOfGlyphs; i++) {
	            post.glyphNameIndex[i] = p.parseUShort();
	        }
	
	        post.names = [];
	        for (i = 0; i < post.numberOfGlyphs; i++) {
	            if (post.glyphNameIndex[i] >= encoding.standardNames.length) {
	                var nameLength = p.parseChar();
	                post.names.push(p.parseString(nameLength));
	            }
	        }
	
	        break;
	    case 2.5:
	        post.numberOfGlyphs = p.parseUShort();
	        post.offset = new Array(post.numberOfGlyphs);
	        for (i = 0; i < post.numberOfGlyphs; i++) {
	            post.offset[i] = p.parseChar();
	        }
	
	        break;
	    }
	    return post;
	}
	
	function makePostTable() {
	    return new table.Table('post', [
	        {name: 'version', type: 'FIXED', value: 0x00030000},
	        {name: 'italicAngle', type: 'FIXED', value: 0},
	        {name: 'underlinePosition', type: 'FWORD', value: 0},
	        {name: 'underlineThickness', type: 'FWORD', value: 0},
	        {name: 'isFixedPitch', type: 'ULONG', value: 0},
	        {name: 'minMemType42', type: 'ULONG', value: 0},
	        {name: 'maxMemType42', type: 'ULONG', value: 0},
	        {name: 'minMemType1', type: 'ULONG', value: 0},
	        {name: 'maxMemType1', type: 'ULONG', value: 0}
	    ]);
	}
	
	exports.parse = parsePostTable;
	exports.make = makePostTable;


/***/ },
/* 25 */
/***/ function(module, exports) {

	'use strict';
	
	exports.isBrowser = function() {
	    return typeof window !== 'undefined';
	};
	
	exports.isNode = function() {
	    return typeof window === 'undefined';
	};
	
	exports.nodeBufferToArrayBuffer = function(buffer) {
	    var ab = new ArrayBuffer(buffer.length);
	    var view = new Uint8Array(ab);
	    for (var i = 0; i < buffer.length; ++i) {
	        view[i] = buffer[i];
	    }
	
	    return ab;
	};
	
	exports.arrayBufferToNodeBuffer = function(ab) {
	    var buffer = new Buffer(ab.byteLength);
	    var view = new Uint8Array(ab);
	    for (var i = 0; i < buffer.length; ++i) {
	        buffer[i] = view[i];
	    }
	
	    return buffer;
	};
	
	exports.checkArgument = function(expression, message) {
	    if (!expression) {
	        throw message;
	    }
	};


/***/ },
/* 26 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	// The `fvar` table stores font variation axes and instances.
	// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6fvar.html
	
	'use strict';
	
	var check = __webpack_require__(8);
	var parse = __webpack_require__(12);
	var table = __webpack_require__(9);
	
	function addName(name, names) {
	    var nameString = JSON.stringify(name);
	    var nameID = 256;
	    for (var nameKey in names) {
	        var n = parseInt(nameKey);
	        if (!n || n < 256) {
	            continue;
	        }
	
	        if (JSON.stringify(names[nameKey]) === nameString) {
	            return n;
	        }
	
	        if (nameID <= n) {
	            nameID = n + 1;
	        }
	    }
	
	    names[nameID] = name;
	    return nameID;
	}
	
	function makeFvarAxis(n, axis, names) {
	    var nameID = addName(axis.name, names);
	    return [
	        {name: 'tag_' + n, type: 'TAG', value: axis.tag},
	        {name: 'minValue_' + n, type: 'FIXED', value: axis.minValue << 16},
	        {name: 'defaultValue_' + n, type: 'FIXED', value: axis.defaultValue << 16},
	        {name: 'maxValue_' + n, type: 'FIXED', value: axis.maxValue << 16},
	        {name: 'flags_' + n, type: 'USHORT', value: 0},
	        {name: 'nameID_' + n, type: 'USHORT', value: nameID}
	    ];
	}
	
	function parseFvarAxis(data, start, names) {
	    var axis = {};
	    var p = new parse.Parser(data, start);
	    axis.tag = p.parseTag();
	    axis.minValue = p.parseFixed();
	    axis.defaultValue = p.parseFixed();
	    axis.maxValue = p.parseFixed();
	    p.skip('uShort', 1);  // reserved for flags; no values defined
	    axis.name = names[p.parseUShort()] || {};
	    return axis;
	}
	
	function makeFvarInstance(n, inst, axes, names) {
	    var nameID = addName(inst.name, names);
	    var fields = [
	        {name: 'nameID_' + n, type: 'USHORT', value: nameID},
	        {name: 'flags_' + n, type: 'USHORT', value: 0}
	    ];
	
	    for (var i = 0; i < axes.length; ++i) {
	        var axisTag = axes[i].tag;
	        fields.push({
	            name: 'axis_' + n + ' ' + axisTag,
	            type: 'FIXED',
	            value: inst.coordinates[axisTag] << 16
	        });
	    }
	
	    return fields;
	}
	
	function parseFvarInstance(data, start, axes, names) {
	    var inst = {};
	    var p = new parse.Parser(data, start);
	    inst.name = names[p.parseUShort()] || {};
	    p.skip('uShort', 1);  // reserved for flags; no values defined
	
	    inst.coordinates = {};
	    for (var i = 0; i < axes.length; ++i) {
	        inst.coordinates[axes[i].tag] = p.parseFixed();
	    }
	
	    return inst;
	}
	
	function makeFvarTable(fvar, names) {
	    var result = new table.Table('fvar', [
	        {name: 'version', type: 'ULONG', value: 0x10000},
	        {name: 'offsetToData', type: 'USHORT', value: 0},
	        {name: 'countSizePairs', type: 'USHORT', value: 2},
	        {name: 'axisCount', type: 'USHORT', value: fvar.axes.length},
	        {name: 'axisSize', type: 'USHORT', value: 20},
	        {name: 'instanceCount', type: 'USHORT', value: fvar.instances.length},
	        {name: 'instanceSize', type: 'USHORT', value: 4 + fvar.axes.length * 4}
	    ]);
	    result.offsetToData = result.sizeOf();
	
	    for (var i = 0; i < fvar.axes.length; i++) {
	        result.fields = result.fields.concat(makeFvarAxis(i, fvar.axes[i], names));
	    }
	
	    for (var j = 0; j < fvar.instances.length; j++) {
	        result.fields = result.fields.concat(makeFvarInstance(j, fvar.instances[j], fvar.axes, names));
	    }
	
	    return result;
	}
	
	function parseFvarTable(data, start, names) {
	    var p = new parse.Parser(data, start);
	    var tableVersion = p.parseULong();
	    check.argument(tableVersion === 0x00010000, 'Unsupported fvar table version.');
	    var offsetToData = p.parseOffset16();
	    // Skip countSizePairs.
	    p.skip('uShort', 1);
	    var axisCount = p.parseUShort();
	    var axisSize = p.parseUShort();
	    var instanceCount = p.parseUShort();
	    var instanceSize = p.parseUShort();
	
	    var axes = [];
	    for (var i = 0; i < axisCount; i++) {
	        axes.push(parseFvarAxis(data, start + offsetToData + i * axisSize, names));
	    }
	
	    var instances = [];
	    var instanceStart = start + offsetToData + axisCount * axisSize;
	    for (var j = 0; j < instanceCount; j++) {
	        instances.push(parseFvarInstance(data, instanceStart + j * instanceSize, axes, names));
	    }
	
	    return {axes:axes, instances:instances};
	}
	
	exports.make = makeFvarTable;
	exports.parse = parseFvarTable;


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	// The `glyf` table describes the glyphs in TrueType outline format.
	// http://www.microsoft.com/typography/otspec/glyf.htm
	
	'use strict';
	
	var check = __webpack_require__(8);
	var glyphset = __webpack_require__(14);
	var parse = __webpack_require__(12);
	var path = __webpack_require__(6);
	
	// Parse the coordinate data for a glyph.
	function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
	    var v;
	    if ((flag & shortVectorBitMask) > 0) {
	        // The coordinate is 1 byte long.
	        v = p.parseByte();
	        // The `same` bit is re-used for short values to signify the sign of the value.
	        if ((flag & sameBitMask) === 0) {
	            v = -v;
	        }
	
	        v = previousValue + v;
	    } else {
	        //  The coordinate is 2 bytes long.
	        // If the `same` bit is set, the coordinate is the same as the previous coordinate.
	        if ((flag & sameBitMask) > 0) {
	            v = previousValue;
	        } else {
	            // Parse the coordinate as a signed 16-bit delta value.
	            v = previousValue + p.parseShort();
	        }
	    }
	
	    return v;
	}
	
	// Parse a TrueType glyph.
	function parseGlyph(glyph, data, start) {
	    var p = new parse.Parser(data, start);
	    glyph.numberOfContours = p.parseShort();
	    glyph.xMin = p.parseShort();
	    glyph.yMin = p.parseShort();
	    glyph.xMax = p.parseShort();
	    glyph.yMax = p.parseShort();
	    var flags;
	    var flag;
	    if (glyph.numberOfContours > 0) {
	        var i;
	        // This glyph is not a composite.
	        var endPointIndices = glyph.endPointIndices = [];
	        for (i = 0; i < glyph.numberOfContours; i += 1) {
	            endPointIndices.push(p.parseUShort());
	        }
	
	        glyph.instructionLength = p.parseUShort();
	        glyph.instructions = [];
	        for (i = 0; i < glyph.instructionLength; i += 1) {
	            glyph.instructions.push(p.parseByte());
	        }
	
	        var numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
	        flags = [];
	        for (i = 0; i < numberOfCoordinates; i += 1) {
	            flag = p.parseByte();
	            flags.push(flag);
	            // If bit 3 is set, we repeat this flag n times, where n is the next byte.
	            if ((flag & 8) > 0) {
	                var repeatCount = p.parseByte();
	                for (var j = 0; j < repeatCount; j += 1) {
	                    flags.push(flag);
	                    i += 1;
	                }
	            }
	        }
	
	        check.argument(flags.length === numberOfCoordinates, 'Bad flags.');
	
	        if (endPointIndices.length > 0) {
	            var points = [];
	            var point;
	            // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
	            if (numberOfCoordinates > 0) {
	                for (i = 0; i < numberOfCoordinates; i += 1) {
	                    flag = flags[i];
	                    point = {};
	                    point.onCurve = !!(flag & 1);
	                    point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
	                    points.push(point);
	                }
	
	                var px = 0;
	                for (i = 0; i < numberOfCoordinates; i += 1) {
	                    flag = flags[i];
	                    point = points[i];
	                    point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
	                    px = point.x;
	                }
	
	                var py = 0;
	                for (i = 0; i < numberOfCoordinates; i += 1) {
	                    flag = flags[i];
	                    point = points[i];
	                    point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
	                    py = point.y;
	                }
	            }
	
	            glyph.points = points;
	        } else {
	            glyph.points = [];
	        }
	    } else if (glyph.numberOfContours === 0) {
	        glyph.points = [];
	    } else {
	        glyph.isComposite = true;
	        glyph.points = [];
	        glyph.components = [];
	        var moreComponents = true;
	        while (moreComponents) {
	            flags = p.parseUShort();
	            var component = {
	                glyphIndex: p.parseUShort(),
	                xScale: 1,
	                scale01: 0,
	                scale10: 0,
	                yScale: 1,
	                dx: 0,
	                dy: 0
	            };
	            if ((flags & 1) > 0) {
	                // The arguments are words
	                component.dx = p.parseShort();
	                component.dy = p.parseShort();
	            } else {
	                // The arguments are bytes
	                component.dx = p.parseChar();
	                component.dy = p.parseChar();
	            }
	
	            if ((flags & 8) > 0) {
	                // We have a scale
	                component.xScale = component.yScale = p.parseF2Dot14();
	            } else if ((flags & 64) > 0) {
	                // We have an X / Y scale
	                component.xScale = p.parseF2Dot14();
	                component.yScale = p.parseF2Dot14();
	            } else if ((flags & 128) > 0) {
	                // We have a 2x2 transformation
	                component.xScale = p.parseF2Dot14();
	                component.scale01 = p.parseF2Dot14();
	                component.scale10 = p.parseF2Dot14();
	                component.yScale = p.parseF2Dot14();
	            }
	
	            glyph.components.push(component);
	            moreComponents = !!(flags & 32);
	        }
	    }
	}
	
	// Transform an array of points and return a new array.
	function transformPoints(points, transform) {
	    var newPoints = [];
	    for (var i = 0; i < points.length; i += 1) {
	        var pt = points[i];
	        var newPt = {
	            x: transform.xScale * pt.x + transform.scale01 * pt.y + transform.dx,
	            y: transform.scale10 * pt.x + transform.yScale * pt.y + transform.dy,
	            onCurve: pt.onCurve,
	            lastPointOfContour: pt.lastPointOfContour
	        };
	        newPoints.push(newPt);
	    }
	
	    return newPoints;
	}
	
	function getContours(points) {
	    var contours = [];
	    var currentContour = [];
	    for (var i = 0; i < points.length; i += 1) {
	        var pt = points[i];
	        currentContour.push(pt);
	        if (pt.lastPointOfContour) {
	            contours.push(currentContour);
	            currentContour = [];
	        }
	    }
	
	    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
	    return contours;
	}
	
	// Convert the TrueType glyph outline to a Path.
	function getPath(points) {
	    var p = new path.Path();
	    if (!points) {
	        return p;
	    }
	
	    var contours = getContours(points);
	    for (var i = 0; i < contours.length; i += 1) {
	        var contour = contours[i];
	        var firstPt = contour[0];
	        var lastPt = contour[contour.length - 1];
	        var curvePt;
	        var realFirstPoint;
	        if (firstPt.onCurve) {
	            curvePt = null;
	            // The first point will be consumed by the moveTo command,
	            // so skip it in the loop.
	            realFirstPoint = true;
	        } else {
	            if (lastPt.onCurve) {
	                // If the first point is off-curve and the last point is on-curve,
	                // start at the last point.
	                firstPt = lastPt;
	            } else {
	                // If both first and last points are off-curve, start at their middle.
	                firstPt = { x: (firstPt.x + lastPt.x) / 2, y: (firstPt.y + lastPt.y) / 2 };
	            }
	
	            curvePt = firstPt;
	            // The first point is synthesized, so don't skip the real first point.
	            realFirstPoint = false;
	        }
	
	        p.moveTo(firstPt.x, firstPt.y);
	
	        for (var j = realFirstPoint ? 1 : 0; j < contour.length; j += 1) {
	            var pt = contour[j];
	            var prevPt = j === 0 ? firstPt : contour[j - 1];
	            if (prevPt.onCurve && pt.onCurve) {
	                // This is a straight line.
	                p.lineTo(pt.x, pt.y);
	            } else if (prevPt.onCurve && !pt.onCurve) {
	                curvePt = pt;
	            } else if (!prevPt.onCurve && !pt.onCurve) {
	                var midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
	                p.quadraticCurveTo(prevPt.x, prevPt.y, midPt.x, midPt.y);
	                curvePt = pt;
	            } else if (!prevPt.onCurve && pt.onCurve) {
	                // Previous point off-curve, this point on-curve.
	                p.quadraticCurveTo(curvePt.x, curvePt.y, pt.x, pt.y);
	                curvePt = null;
	            } else {
	                throw new Error('Invalid state.');
	            }
	        }
	
	        if (firstPt !== lastPt) {
	            // Connect the last and first points
	            if (curvePt) {
	                p.quadraticCurveTo(curvePt.x, curvePt.y, firstPt.x, firstPt.y);
	            } else {
	                p.lineTo(firstPt.x, firstPt.y);
	            }
	        }
	    }
	
	    p.closePath();
	    return p;
	}
	
	function buildPath(glyphs, glyph) {
	    if (glyph.isComposite) {
	        for (var j = 0; j < glyph.components.length; j += 1) {
	            var component = glyph.components[j];
	            var componentGlyph = glyphs.get(component.glyphIndex);
	            // Force the ttfGlyphLoader to parse the glyph.
	            componentGlyph.getPath();
	            if (componentGlyph.points) {
	                var transformedPoints = transformPoints(componentGlyph.points, component);
	                glyph.points = glyph.points.concat(transformedPoints);
	            }
	        }
	    }
	
	    return getPath(glyph.points);
	}
	
	// Parse all the glyphs according to the offsets from the `loca` table.
	function parseGlyfTable(data, start, loca, font) {
	    var glyphs = new glyphset.GlyphSet(font);
	    var i;
	
	    // The last element of the loca table is invalid.
	    for (i = 0; i < loca.length - 1; i += 1) {
	        var offset = loca[i];
	        var nextOffset = loca[i + 1];
	        if (offset !== nextOffset) {
	            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
	        } else {
	            glyphs.push(i, glyphset.glyphLoader(font, i));
	        }
	    }
	
	    return glyphs;
	}
	
	exports.parse = parseGlyfTable;


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	// The `GPOS` table contains kerning pairs, among other things.
	// https://www.microsoft.com/typography/OTSPEC/gpos.htm
	
	'use strict';
	
	var check = __webpack_require__(8);
	var parse = __webpack_require__(12);
	
	// Parse ScriptList and FeatureList tables of GPOS, GSUB, GDEF, BASE, JSTF tables.
	// These lists are unused by now, this function is just the basis for a real parsing.
	function parseTaggedListTable(data, start) {
	    var p = new parse.Parser(data, start);
	    var n = p.parseUShort();
	    var list = [];
	    for (var i = 0; i < n; i++) {
	        list[p.parseTag()] = { offset: p.parseUShort() };
	    }
	
	    return list;
	}
	
	// Parse a coverage table in a GSUB, GPOS or GDEF table.
	// Format 1 is a simple list of glyph ids,
	// Format 2 is a list of ranges. It is expanded in a list of glyphs, maybe not the best idea.
	function parseCoverageTable(data, start) {
	    var p = new parse.Parser(data, start);
	    var format = p.parseUShort();
	    var count =  p.parseUShort();
	    if (format === 1) {
	        return p.parseUShortList(count);
	    }
	    else if (format === 2) {
	        var coverage = [];
	        for (; count--;) {
	            var begin = p.parseUShort();
	            var end = p.parseUShort();
	            var index = p.parseUShort();
	            for (var i = begin; i <= end; i++) {
	                coverage[index++] = i;
	            }
	        }
	
	        return coverage;
	    }
	}
	
	// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
	// Returns a function that gets a class value from a glyph ID.
	function parseClassDefTable(data, start) {
	    var p = new parse.Parser(data, start);
	    var format = p.parseUShort();
	    if (format === 1) {
	        // Format 1 specifies a range of consecutive glyph indices, one class per glyph ID.
	        var startGlyph = p.parseUShort();
	        var glyphCount = p.parseUShort();
	        var classes = p.parseUShortList(glyphCount);
	        return function(glyphID) {
	            return classes[glyphID - startGlyph] || 0;
	        };
	    }
	    else if (format === 2) {
	        // Format 2 defines multiple groups of glyph indices that belong to the same class.
	        var rangeCount = p.parseUShort();
	        var startGlyphs = [];
	        var endGlyphs = [];
	        var classValues = [];
	        for (var i = 0; i < rangeCount; i++) {
	            startGlyphs[i] = p.parseUShort();
	            endGlyphs[i] = p.parseUShort();
	            classValues[i] = p.parseUShort();
	        }
	
	        return function(glyphID) {
	            var l = 0;
	            var r = startGlyphs.length - 1;
	            while (l < r) {
	                var c = (l + r + 1) >> 1;
	                if (glyphID < startGlyphs[c]) {
	                    r = c - 1;
	                } else {
	                    l = c;
	                }
	            }
	
	            if (startGlyphs[l] <= glyphID && glyphID <= endGlyphs[l]) {
	                return classValues[l] || 0;
	            }
	
	            return 0;
	        };
	    }
	}
	
	// Parse a pair adjustment positioning subtable, format 1 or format 2
	// The subtable is returned in the form of a lookup function.
	function parsePairPosSubTable(data, start) {
	    var p = new parse.Parser(data, start);
	    // This part is common to format 1 and format 2 subtables
	    var format = p.parseUShort();
	    var coverageOffset = p.parseUShort();
	    var coverage = parseCoverageTable(data, start + coverageOffset);
	    // valueFormat 4: XAdvance only, 1: XPlacement only, 0: no ValueRecord for second glyph
	    // Only valueFormat1=4 and valueFormat2=0 is supported.
	    var valueFormat1 = p.parseUShort();
	    var valueFormat2 = p.parseUShort();
	    var value1;
	    var value2;
	    if (valueFormat1 !== 4 || valueFormat2 !== 0) return;
	    var sharedPairSets = {};
	    if (format === 1) {
	        // Pair Positioning Adjustment: Format 1
	        var pairSetCount = p.parseUShort();
	        var pairSet = [];
	        // Array of offsets to PairSet tables-from beginning of PairPos subtable-ordered by Coverage Index
	        var pairSetOffsets = p.parseOffset16List(pairSetCount);
	        for (var firstGlyph = 0; firstGlyph < pairSetCount; firstGlyph++) {
	            var pairSetOffset = pairSetOffsets[firstGlyph];
	            var sharedPairSet = sharedPairSets[pairSetOffset];
	            if (!sharedPairSet) {
	                // Parse a pairset table in a pair adjustment subtable format 1
	                sharedPairSet = {};
	                p.relativeOffset = pairSetOffset;
	                var pairValueCount = p.parseUShort();
	                for (; pairValueCount--;) {
	                    var secondGlyph = p.parseUShort();
	                    if (valueFormat1) value1 = p.parseShort();
	                    if (valueFormat2) value2 = p.parseShort();
	                    // We only support valueFormat1 = 4 and valueFormat2 = 0,
	                    // so value1 is the XAdvance and value2 is empty.
	                    sharedPairSet[secondGlyph] = value1;
	                }
	            }
	
	            pairSet[coverage[firstGlyph]] = sharedPairSet;
	        }
	
	        return function(leftGlyph, rightGlyph) {
	            var pairs = pairSet[leftGlyph];
	            if (pairs) return pairs[rightGlyph];
	        };
	    }
	    else if (format === 2) {
	        // Pair Positioning Adjustment: Format 2
	        var classDef1Offset = p.parseUShort();
	        var classDef2Offset = p.parseUShort();
	        var class1Count = p.parseUShort();
	        var class2Count = p.parseUShort();
	        var getClass1 = parseClassDefTable(data, start + classDef1Offset);
	        var getClass2 = parseClassDefTable(data, start + classDef2Offset);
	
	        // Parse kerning values by class pair.
	        var kerningMatrix = [];
	        for (var i = 0; i < class1Count; i++) {
	            var kerningRow = kerningMatrix[i] = [];
	            for (var j = 0; j < class2Count; j++) {
	                if (valueFormat1) value1 = p.parseShort();
	                if (valueFormat2) value2 = p.parseShort();
	                // We only support valueFormat1 = 4 and valueFormat2 = 0,
	                // so value1 is the XAdvance and value2 is empty.
	                kerningRow[j] = value1;
	            }
	        }
	
	        // Convert coverage list to a hash
	        var covered = {};
	        for (i = 0; i < coverage.length; i++) covered[coverage[i]] = 1;
	
	        // Get the kerning value for a specific glyph pair.
	        return function(leftGlyph, rightGlyph) {
	            if (!covered[leftGlyph]) return;
	            var class1 = getClass1(leftGlyph);
	            var class2 = getClass2(rightGlyph);
	            var kerningRow = kerningMatrix[class1];
	
	            if (kerningRow) {
	                return kerningRow[class2];
	            }
	        };
	    }
	}
	
	// Parse a LookupTable (present in of GPOS, GSUB, GDEF, BASE, JSTF tables).
	function parseLookupTable(data, start) {
	    var p = new parse.Parser(data, start);
	    var lookupType = p.parseUShort();
	    var lookupFlag = p.parseUShort();
	    var useMarkFilteringSet = lookupFlag & 0x10;
	    var subTableCount = p.parseUShort();
	    var subTableOffsets = p.parseOffset16List(subTableCount);
	    var table = {
	        lookupType: lookupType,
	        lookupFlag: lookupFlag,
	        markFilteringSet: useMarkFilteringSet ? p.parseUShort() : -1
	    };
	    // LookupType 2, Pair adjustment
	    if (lookupType === 2) {
	        var subtables = [];
	        for (var i = 0; i < subTableCount; i++) {
	            subtables.push(parsePairPosSubTable(data, start + subTableOffsets[i]));
	        }
	        // Return a function which finds the kerning values in the subtables.
	        table.getKerningValue = function(leftGlyph, rightGlyph) {
	            for (var i = subtables.length; i--;) {
	                var value = subtables[i](leftGlyph, rightGlyph);
	                if (value !== undefined) return value;
	            }
	
	            return 0;
	        };
	    }
	
	    return table;
	}
	
	// Parse the `GPOS` table which contains, among other things, kerning pairs.
	// https://www.microsoft.com/typography/OTSPEC/gpos.htm
	function parseGposTable(data, start, font) {
	    var p = new parse.Parser(data, start);
	    var tableVersion = p.parseFixed();
	    check.argument(tableVersion === 1, 'Unsupported GPOS table version.');
	
	    // ScriptList and FeatureList - ignored for now
	    parseTaggedListTable(data, start + p.parseUShort());
	    // 'kern' is the feature we are looking for.
	    parseTaggedListTable(data, start + p.parseUShort());
	
	    // LookupList
	    var lookupListOffset = p.parseUShort();
	    p.relativeOffset = lookupListOffset;
	    var lookupCount = p.parseUShort();
	    var lookupTableOffsets = p.parseOffset16List(lookupCount);
	    var lookupListAbsoluteOffset = start + lookupListOffset;
	    for (var i = 0; i < lookupCount; i++) {
	        var table = parseLookupTable(data, lookupListAbsoluteOffset + lookupTableOffsets[i]);
	        if (table.lookupType === 2 && !font.getGposKerningValue) font.getGposKerningValue = table.getKerningValue;
	    }
	}
	
	exports.parse = parseGposTable;


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	// The `kern` table contains kerning pairs.
	// Note that some fonts use the GPOS OpenType layout table to specify kerning.
	// https://www.microsoft.com/typography/OTSPEC/kern.htm
	
	'use strict';
	
	var check = __webpack_require__(8);
	var parse = __webpack_require__(12);
	
	// Parse the `kern` table which contains kerning pairs.
	function parseKernTable(data, start) {
	    var pairs = {};
	    var p = new parse.Parser(data, start);
	    var tableVersion = p.parseUShort();
	    check.argument(tableVersion === 0, 'Unsupported kern table version.');
	    // Skip nTables.
	    p.skip('uShort', 1);
	    var subTableVersion = p.parseUShort();
	    check.argument(subTableVersion === 0, 'Unsupported kern sub-table version.');
	    // Skip subTableLength, subTableCoverage
	    p.skip('uShort', 2);
	    var nPairs = p.parseUShort();
	    // Skip searchRange, entrySelector, rangeShift.
	    p.skip('uShort', 3);
	    for (var i = 0; i < nPairs; i += 1) {
	        var leftIndex = p.parseUShort();
	        var rightIndex = p.parseUShort();
	        var value = p.parseShort();
	        pairs[leftIndex + ',' + rightIndex] = value;
	    }
	
	    return pairs;
	}
	
	exports.parse = parseKernTable;


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	// The `loca` table stores the offsets to the locations of the glyphs in the font.
	// https://www.microsoft.com/typography/OTSPEC/loca.htm
	
	'use strict';
	
	var parse = __webpack_require__(12);
	
	// Parse the `loca` table. This table stores the offsets to the locations of the glyphs in the font,
	// relative to the beginning of the glyphData table.
	// The number of glyphs stored in the `loca` table is specified in the `maxp` table (under numGlyphs)
	// The loca table has two versions: a short version where offsets are stored as uShorts, and a long
	// version where offsets are stored as uLongs. The `head` table specifies which version to use
	// (under indexToLocFormat).
	function parseLocaTable(data, start, numGlyphs, shortVersion) {
	    var p = new parse.Parser(data, start);
	    var parseFn = shortVersion ? p.parseUShort : p.parseULong;
	    // There is an extra entry after the last index element to compute the length of the last glyph.
	    // That's why we use numGlyphs + 1.
	    var glyphOffsets = [];
	    for (var i = 0; i < numGlyphs + 1; i += 1) {
	        var glyphOffset = parseFn.call(p);
	        if (shortVersion) {
	            // The short table version stores the actual offset divided by 2.
	            glyphOffset *= 2;
	        }
	
	        glyphOffsets.push(glyphOffset);
	    }
	
	    return glyphOffsets;
	}
	
	exports.parse = parseLocaTable;


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Paper.js v0.9.25-fix/findBestIntersection - The Swiss Army Knife of Vector Graphics Scripting.
	 * http://paperjs.org/
	 *
	 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
	 * http://scratchdisk.com/ & http://jonathanpuckey.com/
	 *
	 * Distributed under the MIT license. See LICENSE file for details.
	 *
	 * All rights reserved.
	 *
	 * Date: Thu Mar 24 14:28:41 2016 +0100
	 *
	 ***
	 *
	 * Straps.js - Class inheritance library with support for bean-style accessors
	 *
	 * Copyright (c) 2006 - 2016 Juerg Lehni
	 * http://scratchdisk.com/
	 *
	 * Distributed under the MIT license.
	 *
	 ***
	 *
	 * Acorn.js
	 * http://marijnhaverbeke.nl/acorn/
	 *
	 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
	 * created by Marijn Haverbeke and released under an MIT license.
	 *
	 */
	
	var paper = function(self, undefined) {
	
	var window = self ? self.window : __webpack_require__(33),
		document = window && window.document;
	
	self = self || window;
	
	var Base = new function() {
		var hidden = /^(statics|enumerable|beans|preserve)$/,
	
			forEach = [].forEach || function(iter, bind) {
				for (var i = 0, l = this.length; i < l; i++)
					iter.call(bind, this[i], i, this);
			},
	
			forIn = function(iter, bind) {
				for (var i in this)
					if (this.hasOwnProperty(i))
						iter.call(bind, this[i], i, this);
			},
	
			create = Object.create || function(proto) {
				return { __proto__: proto };
			},
	
			describe = Object.getOwnPropertyDescriptor || function(obj, name) {
				var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
				return get
						? { get: get, set: obj.__lookupSetter__(name),
							enumerable: true, configurable: true }
						: obj.hasOwnProperty(name)
							? { value: obj[name], enumerable: true,
								configurable: true, writable: true }
							: null;
			},
	
			_define = Object.defineProperty || function(obj, name, desc) {
				if ((desc.get || desc.set) && obj.__defineGetter__) {
					if (desc.get)
						obj.__defineGetter__(name, desc.get);
					if (desc.set)
						obj.__defineSetter__(name, desc.set);
				} else {
					obj[name] = desc.value;
				}
				return obj;
			},
	
			define = function(obj, name, desc) {
				delete obj[name];
				return _define(obj, name, desc);
			};
	
		function inject(dest, src, enumerable, beans, preserve) {
			var beansNames = {};
	
			function field(name, val) {
				val = val || (val = describe(src, name))
						&& (val.get ? val : val.value);
				if (typeof val === 'string' && val[0] === '#')
					val = dest[val.substring(1)] || val;
				var isFunc = typeof val === 'function',
					res = val,
					prev = preserve || isFunc && !val.base
							? (val && val.get ? name in dest : dest[name])
							: null,
					bean;
				if (!preserve || !prev) {
					if (isFunc && prev)
						val.base = prev;
					if (isFunc && beans !== false
							&& (bean = name.match(/^([gs]et|is)(([A-Z])(.*))$/)))
						beansNames[bean[3].toLowerCase() + bean[4]] = bean[2];
					if (!res || isFunc || !res.get || typeof res.get !== 'function'
							|| !Base.isPlainObject(res))
						res = { value: res, writable: true };
					if ((describe(dest, name)
							|| { configurable: true }).configurable) {
						res.configurable = true;
						res.enumerable = enumerable;
					}
					define(dest, name, res);
				}
			}
			if (src) {
				for (var name in src) {
					if (src.hasOwnProperty(name) && !hidden.test(name))
						field(name);
				}
				for (var name in beansNames) {
					var part = beansNames[name],
						set = dest['set' + part],
						get = dest['get' + part] || set && dest['is' + part];
					if (get && (beans === true || get.length === 0))
						field(name, { get: get, set: set });
				}
			}
			return dest;
		}
	
		function each(obj, iter, bind) {
			if (obj)
				('length' in obj && !obj.getLength
						&& typeof obj.length === 'number'
					? forEach
					: forIn).call(obj, iter, bind = bind || obj);
			return bind;
		}
	
		function set(obj, args, start) {
			for (var i = start, l = args.length; i < l; i++) {
				var props = args[i];
				for (var key in props)
					if (props.hasOwnProperty(key))
						obj[key] = props[key];
			}
			return obj;
		}
	
		return inject(function Base() {
			return set(this, arguments, 0);
		}, {
			inject: function(src) {
				if (src) {
					var statics = src.statics === true ? src : src.statics,
						beans = src.beans,
						preserve = src.preserve;
					if (statics !== src)
						inject(this.prototype, src, src.enumerable, beans, preserve);
					inject(this, statics, true, beans, preserve);
				}
				for (var i = 1, l = arguments.length; i < l; i++)
					this.inject(arguments[i]);
				return this;
			},
	
			extend: function() {
				var base = this,
					ctor,
					proto;
				for (var i = 0, obj, l = arguments.length;
						i < l && !(ctor && proto); i++) {
					obj = arguments[i];
					ctor = ctor || obj.initialize;
					proto = proto || obj.prototype;
				}
				ctor = ctor || function() {
					base.apply(this, arguments);
				};
				proto = ctor.prototype = proto || create(this.prototype);
				define(proto, 'constructor',
						{ value: ctor, writable: true, configurable: true });
				inject(ctor, this, true);
				if (arguments.length)
					this.inject.apply(ctor, arguments);
				ctor.base = base;
				return ctor;
			}
		}, true).inject({
			inject: function() {
				for (var i = 0, l = arguments.length; i < l; i++) {
					var src = arguments[i];
					if (src)
						inject(this, src, src.enumerable, src.beans, src.preserve);
				}
				return this;
			},
	
			extend: function() {
				var res = create(this);
				return res.inject.apply(res, arguments);
			},
	
			each: function(iter, bind) {
				return each(this, iter, bind);
			},
	
			set: function() {
				return set(this, arguments, 0);
			},
	
			clone: function() {
				return new this.constructor(this);
			},
	
			statics: {
				each: each,
				create: create,
				define: define,
				describe: describe,
	
				set: function(obj) {
					return set(obj, arguments, 1);
				},
	
				clone: function(obj) {
					return set(new obj.constructor(), arguments, 0);
				},
	
				isPlainObject: function(obj) {
					var ctor = obj != null && obj.constructor;
					return ctor && (ctor === Object || ctor === Base
							|| ctor.name === 'Object');
				},
	
				pick: function(a, b) {
					return a !== undefined ? a : b;
				}
			}
		});
	};
	
	if (true)
		module.exports = Base;
	
	Base.inject({
		toString: function() {
			return this._id != null
				?  (this._class || 'Object') + (this._name
					? " '" + this._name + "'"
					: ' @' + this._id)
				: '{ ' + Base.each(this, function(value, key) {
					if (!/^_/.test(key)) {
						var type = typeof value;
						this.push(key + ': ' + (type === 'number'
								? Formatter.instance.number(value)
								: type === 'string' ? "'" + value + "'" : value));
					}
				}, []).join(', ') + ' }';
		},
	
		getClassName: function() {
			return this._class || '';
		},
	
		importJSON: function(json) {
			return Base.importJSON(json, this);
		},
	
		exportJSON: function(options) {
			return Base.exportJSON(this, options);
		},
	
		toJSON: function() {
			return Base.serialize(this);
		},
	
		_set: function(props) {
			if (props && Base.isPlainObject(props))
				return Base.filter(this, props);
		},
	
		statics: {
	
			exports: {
				enumerable: true
			},
	
			extend: function extend() {
				var res = extend.base.apply(this, arguments),
					name = res.prototype._class;
				if (name && !Base.exports[name])
					Base.exports[name] = res;
				return res;
			},
	
			equals: function(obj1, obj2) {
				if (obj1 === obj2)
					return true;
				if (obj1 && obj1.equals)
					return obj1.equals(obj2);
				if (obj2 && obj2.equals)
					return obj2.equals(obj1);
				if (obj1 && obj2
						&& typeof obj1 === 'object' && typeof obj2 === 'object') {
					if (Array.isArray(obj1) && Array.isArray(obj2)) {
						var length = obj1.length;
						if (length !== obj2.length)
							return false;
						while (length--) {
							if (!Base.equals(obj1[length], obj2[length]))
								return false;
						}
					} else {
						var keys = Object.keys(obj1),
							length = keys.length;
						if (length !== Object.keys(obj2).length)
							return false;
						while (length--) {
							var key = keys[length];
							if (!(obj2.hasOwnProperty(key)
									&& Base.equals(obj1[key], obj2[key])))
								return false;
						}
					}
					return true;
				}
				return false;
			},
	
			read: function(list, start, options, length) {
				if (this === Base) {
					var value = this.peek(list, start);
					list.__index++;
					return value;
				}
				var proto = this.prototype,
					readIndex = proto._readIndex,
					index = start || readIndex && list.__index || 0;
				if (!length)
					length = list.length - index;
				var obj = list[index];
				if (obj instanceof this
					|| options && options.readNull && obj == null && length <= 1) {
					if (readIndex)
						list.__index = index + 1;
					return obj && options && options.clone ? obj.clone() : obj;
				}
				obj = Base.create(this.prototype);
				if (readIndex)
					obj.__read = true;
				obj = obj.initialize.apply(obj, index > 0 || length < list.length
					? Array.prototype.slice.call(list, index, index + length)
					: list) || obj;
				if (readIndex) {
					list.__index = index + obj.__read;
					obj.__read = undefined;
				}
				return obj;
			},
	
			peek: function(list, start) {
				return list[list.__index = start || list.__index || 0];
			},
	
			remain: function(list) {
				return list.length - (list.__index || 0);
			},
	
			readAll: function(list, start, options) {
				var res = [],
					entry;
				for (var i = start || 0, l = list.length; i < l; i++) {
					res.push(Array.isArray(entry = list[i])
							? this.read(entry, 0, options)
							: this.read(list, i, options, 1));
				}
				return res;
			},
	
			readNamed: function(list, name, start, options, length) {
				var value = this.getNamed(list, name),
					hasObject = value !== undefined;
				if (hasObject) {
					var filtered = list._filtered;
					if (!filtered) {
						filtered = list._filtered = Base.create(list[0]);
						filtered._filtering = list[0];
					}
					filtered[name] = undefined;
				}
				return this.read(hasObject ? [value] : list, start, options, length);
			},
	
			getNamed: function(list, name) {
				var arg = list[0];
				if (list._hasObject === undefined)
					list._hasObject = list.length === 1 && Base.isPlainObject(arg);
				if (list._hasObject)
					return name ? arg[name] : list._filtered || arg;
			},
	
			hasNamed: function(list, name) {
				return !!this.getNamed(list, name);
			},
	
			filter: function(dest, source, exclude) {
				var keys = Object.keys(source._filtering || source);
				for (var i = 0, l = keys.length; i < l; i++) {
					var key = keys[i];
					if (!(exclude && exclude[key])) {
						var value = source[key];
						if (value !== undefined)
							dest[key] = value;
					}
				}
				return dest;
			},
	
			isPlainValue: function(obj, asString) {
				return this.isPlainObject(obj) || Array.isArray(obj)
						|| asString && typeof obj === 'string';
			},
	
			serialize: function(obj, options, compact, dictionary) {
				options = options || {};
	
				var isRoot = !dictionary,
					res;
				if (isRoot) {
					options.formatter = new Formatter(options.precision);
					dictionary = {
						length: 0,
						definitions: {},
						references: {},
						add: function(item, create) {
							var id = '#' + item._id,
								ref = this.references[id];
							if (!ref) {
								this.length++;
								var res = create.call(item),
									name = item._class;
								if (name && res[0] !== name)
									res.unshift(name);
								this.definitions[id] = res;
								ref = this.references[id] = [id];
							}
							return ref;
						}
					};
				}
				if (obj && obj._serialize) {
					res = obj._serialize(options, dictionary);
					var name = obj._class;
					if (name && !obj._compactSerialize && (isRoot || !compact)
							&& res[0] !== name) {
						res.unshift(name);
					}
				} else if (Array.isArray(obj)) {
					res = [];
					for (var i = 0, l = obj.length; i < l; i++)
						res[i] = Base.serialize(obj[i], options, compact,
								dictionary);
				} else if (Base.isPlainObject(obj)) {
					res = {};
					var keys = Object.keys(obj);
					for (var i = 0, l = keys.length; i < l; i++) {
						var key = keys[i];
						res[key] = Base.serialize(obj[key], options, compact,
								dictionary);
					}
				} else if (typeof obj === 'number') {
					res = options.formatter.number(obj, options.precision);
				} else {
					res = obj;
				}
				return isRoot && dictionary.length > 0
						? [['dictionary', dictionary.definitions], res]
						: res;
			},
	
			deserialize: function(json, create, _data, _setDictionary, _isRoot) {
				var res = json,
					isFirst = !_data,
					hasDictionary = isFirst && json && json.length
						&& json[0][0] === 'dictionary';
				_data = _data || {};
				if (Array.isArray(json)) {
					var type = json[0],
						isDictionary = type === 'dictionary';
					if (json.length == 1 && /^#/.test(type)) {
						return _data.dictionary[type];
					}
					type = Base.exports[type];
					res = [];
					for (var i = type ? 1 : 0, l = json.length; i < l; i++) {
						res.push(Base.deserialize(json[i], create, _data,
								isDictionary, hasDictionary));
					}
					if (type) {
						var args = res;
						if (create) {
							res = create(type, args, isFirst || _isRoot);
						} else {
							res = Base.create(type.prototype);
							type.apply(res, args);
						}
					}
				} else if (Base.isPlainObject(json)) {
					res = {};
					if (_setDictionary)
						_data.dictionary = res;
					for (var key in json)
						res[key] = Base.deserialize(json[key], create, _data);
				}
				return hasDictionary ? res[1] : res;
			},
	
			exportJSON: function(obj, options) {
				var json = Base.serialize(obj, options);
				return options && options.asString === false
						? json
						: JSON.stringify(json);
			},
	
			importJSON: function(json, target) {
				return Base.deserialize(
						typeof json === 'string' ? JSON.parse(json) : json,
						function(ctor, args, isRoot) {
							var useTarget = isRoot && target
									&& target.constructor === ctor,
								obj = useTarget ? target
									: Base.create(ctor.prototype),
								init = useTarget
									? obj._initialize || obj.initialize || obj._set
									: ctor;
							if (args.length === 1 && obj instanceof Item
									&& (useTarget || !(obj instanceof Layer))) {
								var arg = args[0];
								if (Base.isPlainObject(arg))
									arg.insert = false;
							}
							init.apply(obj, args);
							if (useTarget)
								target = null;
							return obj;
						});
			},
	
			splice: function(list, items, index, remove) {
				var amount = items && items.length,
					append = index === undefined;
				index = append ? list.length : index;
				if (index > list.length)
					index = list.length;
				for (var i = 0; i < amount; i++)
					items[i]._index = index + i;
				if (append) {
					list.push.apply(list, items);
					return [];
				} else {
					var args = [index, remove];
					if (items)
						args.push.apply(args, items);
					var removed = list.splice.apply(list, args);
					for (var i = 0, l = removed.length; i < l; i++)
						removed[i]._index = undefined;
					for (var i = index + amount, l = list.length; i < l; i++)
						list[i]._index = i;
					return removed;
				}
			},
	
			capitalize: function(str) {
				return str.replace(/\b[a-z]/g, function(match) {
					return match.toUpperCase();
				});
			},
	
			camelize: function(str) {
				return str.replace(/-(.)/g, function(all, chr) {
					return chr.toUpperCase();
				});
			},
	
			hyphenate: function(str) {
				return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
			}
		}
	});
	
	var Emitter = {
		on: function(type, func) {
			if (typeof type !== 'string') {
				Base.each(type, function(value, key) {
					this.on(key, value);
				}, this);
			} else {
				var types = this._eventTypes,
					entry = types && types[type],
					handlers = this._callbacks = this._callbacks || {};
				handlers = handlers[type] = handlers[type] || [];
				if (handlers.indexOf(func) === -1) {
					handlers.push(func);
					if (entry && entry.install && handlers.length === 1)
						entry.install.call(this, type);
				}
			}
			return this;
		},
	
		off: function(type, func) {
			if (typeof type !== 'string') {
				Base.each(type, function(value, key) {
					this.off(key, value);
				}, this);
				return;
			}
			var types = this._eventTypes,
				entry = types && types[type],
				handlers = this._callbacks && this._callbacks[type],
				index;
			if (handlers) {
				if (!func || (index = handlers.indexOf(func)) !== -1
						&& handlers.length === 1) {
					if (entry && entry.uninstall)
						entry.uninstall.call(this, type);
					delete this._callbacks[type];
				} else if (index !== -1) {
					handlers.splice(index, 1);
				}
			}
			return this;
		},
	
		once: function(type, func) {
			return this.on(type, function() {
				func.apply(this, arguments);
				this.off(type, func);
			});
		},
	
		emit: function(type, event) {
			var handlers = this._callbacks && this._callbacks[type];
			if (!handlers)
				return false;
			var args = [].slice.call(arguments, 1);
			handlers = handlers.slice();
			for (var i = 0, l = handlers.length; i < l; i++) {
				if (handlers[i].apply(this, args) === false) {
					if (event && event.stop)
						event.stop();
					break;
			   }
			}
			return true;
		},
	
		responds: function(type) {
			return !!(this._callbacks && this._callbacks[type]);
		},
	
		attach: '#on',
		detach: '#off',
		fire: '#emit',
	
		_installEvents: function(install) {
			var types = this._eventTypes,
				handlers = this._callbacks,
				key = install ? 'install' : 'uninstall';
			if (types) {
				for (var type in handlers) {
					if (handlers[type].length > 0) {
						var entry = types[type],
							func = entry && entry[key];
						if (func)
							func.call(this, type);
					}
			}
			}
		},
	
		statics: {
			inject: function inject(src) {
				var events = src._events;
				if (events) {
					var types = {};
					Base.each(events, function(entry, key) {
						var isString = typeof entry === 'string',
							name = isString ? entry : key,
							part = Base.capitalize(name),
							type = name.substring(2).toLowerCase();
						types[type] = isString ? {} : entry;
						name = '_' + name;
						src['get' + part] = function() {
							return this[name];
						};
						src['set' + part] = function(func) {
							var prev = this[name];
							if (prev)
								this.off(type, prev);
							if (func)
								this.on(type, func);
							this[name] = func;
						};
					});
					src._eventTypes = types;
				}
				return inject.base.apply(this, arguments);
			}
		}
	};
	
	var PaperScope = Base.extend({
		_class: 'PaperScope',
	
		initialize: function PaperScope() {
			paper = this;
			this.settings = new Base({
				applyMatrix: true,
				insertItems: true,
				handleSize: 4,
				hitTolerance: 0
			});
			this.project = null;
			this.projects = [];
			this.tools = [];
			this.palettes = [];
			this._id = PaperScope._id++;
			PaperScope._scopes[this._id] = this;
			var proto = PaperScope.prototype;
			if (!this.support) {
				var ctx = CanvasProvider.getContext(1, 1) || {};
				proto.support = {
					nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx,
					nativeBlendModes: BlendMode.nativeModes
				};
				CanvasProvider.release(ctx);
			}
			if (!this.agent) {
				var user = self.navigator.userAgent.toLowerCase(),
					os = (/(darwin|win|mac|linux|freebsd|sunos)/.exec(user)||[])[0],
					platform = os === 'darwin' ? 'mac' : os,
					agent = proto.agent = proto.browser = { platform: platform };
				if (platform)
					agent[platform] = true;
				user.replace(
					/(opera|chrome|safari|webkit|firefox|msie|trident|atom|node)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv\:v?([.\d]+))?/g,
					function(all, n, v1, v2, rv) {
						if (!agent.chrome) {
							var v = n === 'opera' ? v2 :
									/^(node|trident)$/.test(n) ? rv : v1;
							agent.version = v;
							agent.versionNumber = parseFloat(v);
							n = n === 'trident' ? 'msie' : n;
							agent.name = n;
							agent[n] = true;
						}
					}
				);
				if (agent.chrome)
					delete agent.webkit;
				if (agent.atom)
					delete agent.chrome;
			}
		},
	
		version: "0.9.25-fix/findBestIntersection",
	
		getView: function() {
			var project = this.project;
			return project && project._view;
		},
	
		getPaper: function() {
			return this;
		},
	
		execute: function(code, options) {
			paper.PaperScript.execute(code, this, options);
			View.updateFocus();
		},
	
		install: function(scope) {
			var that = this;
			Base.each(['project', 'view', 'tool'], function(key) {
				Base.define(scope, key, {
					configurable: true,
					get: function() {
						return that[key];
					}
				});
			});
			for (var key in this)
				if (!/^_/.test(key) && this[key])
					scope[key] = this[key];
		},
	
		setup: function(element) {
			paper = this;
			this.project = new Project(element);
			return this;
		},
	
		createCanvas: function(width, height) {
			return CanvasProvider.getCanvas(width, height);
		},
	
		activate: function() {
			paper = this;
		},
	
		clear: function() {
			var projects = this.projects,
				tools = this.tools,
				palettes = this.palettes;
			for (var i = projects.length - 1; i >= 0; i--)
				projects[i].remove();
			for (var i = tools.length - 1; i >= 0; i--)
				tools[i].remove();
			for (var i = palettes.length - 1; i >= 0; i--)
				palettes[i].remove();
		},
	
		remove: function() {
			this.clear();
			delete PaperScope._scopes[this._id];
		},
	
		statics: new function() {
			function handleAttribute(name) {
				name += 'Attribute';
				return function(el, attr) {
					return el[name](attr) || el[name]('data-paper-' + attr);
				};
			}
	
			return {
				_scopes: {},
				_id: 0,
	
				get: function(id) {
					return this._scopes[id] || null;
				},
	
				getAttribute: handleAttribute('get'),
				hasAttribute: handleAttribute('has')
			};
		}
	});
	
	var PaperScopeItem = Base.extend(Emitter, {
	
		initialize: function(activate) {
			this._scope = paper;
			this._index = this._scope[this._list].push(this) - 1;
			if (activate || !this._scope[this._reference])
				this.activate();
		},
	
		activate: function() {
			if (!this._scope)
				return false;
			var prev = this._scope[this._reference];
			if (prev && prev !== this)
				prev.emit('deactivate');
			this._scope[this._reference] = this;
			this.emit('activate', prev);
			return true;
		},
	
		isActive: function() {
			return this._scope[this._reference] === this;
		},
	
		remove: function() {
			if (this._index == null)
				return false;
			Base.splice(this._scope[this._list], null, this._index, 1);
			if (this._scope[this._reference] == this)
				this._scope[this._reference] = null;
			this._scope = null;
			return true;
		},
	
		getView: function() {
			return this._scope.getView();
		}
	});
	
	var Formatter = Base.extend({
		initialize: function(precision) {
			this.precision = Base.pick(precision, 5);
			this.multiplier = Math.pow(10, this.precision);
		},
	
		number: function(val) {
			return this.precision < 16
					? Math.round(val * this.multiplier) / this.multiplier : val;
		},
	
		pair: function(val1, val2, separator) {
			return this.number(val1) + (separator || ',') + this.number(val2);
		},
	
		point: function(val, separator) {
			return this.number(val.x) + (separator || ',') + this.number(val.y);
		},
	
		size: function(val, separator) {
			return this.number(val.width) + (separator || ',')
					+ this.number(val.height);
		},
	
		rectangle: function(val, separator) {
			return this.point(val, separator) + (separator || ',')
					+ this.size(val, separator);
		}
	});
	
	Formatter.instance = new Formatter();
	
	var Numerical = new function() {
	
		var abscissas = [
			[  0.5773502691896257645091488],
			[0,0.7745966692414833770358531],
			[  0.3399810435848562648026658,0.8611363115940525752239465],
			[0,0.5384693101056830910363144,0.9061798459386639927976269],
			[  0.2386191860831969086305017,0.6612093864662645136613996,0.9324695142031520278123016],
			[0,0.4058451513773971669066064,0.7415311855993944398638648,0.9491079123427585245261897],
			[  0.1834346424956498049394761,0.5255324099163289858177390,0.7966664774136267395915539,0.9602898564975362316835609],
			[0,0.3242534234038089290385380,0.6133714327005903973087020,0.8360311073266357942994298,0.9681602395076260898355762],
			[  0.1488743389816312108848260,0.4333953941292471907992659,0.6794095682990244062343274,0.8650633666889845107320967,0.9739065285171717200779640],
			[0,0.2695431559523449723315320,0.5190961292068118159257257,0.7301520055740493240934163,0.8870625997680952990751578,0.9782286581460569928039380],
			[  0.1252334085114689154724414,0.3678314989981801937526915,0.5873179542866174472967024,0.7699026741943046870368938,0.9041172563704748566784659,0.9815606342467192506905491],
			[0,0.2304583159551347940655281,0.4484927510364468528779129,0.6423493394403402206439846,0.8015780907333099127942065,0.9175983992229779652065478,0.9841830547185881494728294],
			[  0.1080549487073436620662447,0.3191123689278897604356718,0.5152486363581540919652907,0.6872929048116854701480198,0.8272013150697649931897947,0.9284348836635735173363911,0.9862838086968123388415973],
			[0,0.2011940939974345223006283,0.3941513470775633698972074,0.5709721726085388475372267,0.7244177313601700474161861,0.8482065834104272162006483,0.9372733924007059043077589,0.9879925180204854284895657],
			[  0.0950125098376374401853193,0.2816035507792589132304605,0.4580167776572273863424194,0.6178762444026437484466718,0.7554044083550030338951012,0.8656312023878317438804679,0.9445750230732325760779884,0.9894009349916499325961542]
		];
	
		var weights = [
			[1],
			[0.8888888888888888888888889,0.5555555555555555555555556],
			[0.6521451548625461426269361,0.3478548451374538573730639],
			[0.5688888888888888888888889,0.4786286704993664680412915,0.2369268850561890875142640],
			[0.4679139345726910473898703,0.3607615730481386075698335,0.1713244923791703450402961],
			[0.4179591836734693877551020,0.3818300505051189449503698,0.2797053914892766679014678,0.1294849661688696932706114],
			[0.3626837833783619829651504,0.3137066458778872873379622,0.2223810344533744705443560,0.1012285362903762591525314],
			[0.3302393550012597631645251,0.3123470770400028400686304,0.2606106964029354623187429,0.1806481606948574040584720,0.0812743883615744119718922],
			[0.2955242247147528701738930,0.2692667193099963550912269,0.2190863625159820439955349,0.1494513491505805931457763,0.0666713443086881375935688],
			[0.2729250867779006307144835,0.2628045445102466621806889,0.2331937645919904799185237,0.1862902109277342514260976,0.1255803694649046246346943,0.0556685671161736664827537],
			[0.2491470458134027850005624,0.2334925365383548087608499,0.2031674267230659217490645,0.1600783285433462263346525,0.1069393259953184309602547,0.0471753363865118271946160],
			[0.2325515532308739101945895,0.2262831802628972384120902,0.2078160475368885023125232,0.1781459807619457382800467,0.1388735102197872384636018,0.0921214998377284479144218,0.0404840047653158795200216],
			[0.2152638534631577901958764,0.2051984637212956039659241,0.1855383974779378137417166,0.1572031671581935345696019,0.1215185706879031846894148,0.0801580871597602098056333,0.0351194603317518630318329],
			[0.2025782419255612728806202,0.1984314853271115764561183,0.1861610000155622110268006,0.1662692058169939335532009,0.1395706779261543144478048,0.1071592204671719350118695,0.0703660474881081247092674,0.0307532419961172683546284],
			[0.1894506104550684962853967,0.1826034150449235888667637,0.1691565193950025381893121,0.1495959888165767320815017,0.1246289712555338720524763,0.0951585116824927848099251,0.0622535239386478928628438,0.0271524594117540948517806]
		];
	
		var abs = Math.abs,
			sqrt = Math.sqrt,
			pow = Math.pow,
			EPSILON = 1e-12,
			MACHINE_EPSILON = 1.12e-16;
	
		function clamp(value, min, max) {
			return value < min ? min : value > max ? max : value;
		}
	
		return {
			TOLERANCE: 1e-6,
			EPSILON: EPSILON,
			MACHINE_EPSILON: MACHINE_EPSILON,
			CURVETIME_EPSILON: 4e-7,
			GEOMETRIC_EPSILON: 2e-7,
			WINDING_EPSILON: 2e-7,
			TRIGONOMETRIC_EPSILON: 1e-7,
			CLIPPING_EPSILON: 1e-9,
			KAPPA: 4 * (sqrt(2) - 1) / 3,
	
			isZero: function(val) {
				return val >= -EPSILON && val <= EPSILON;
			},
	
			clamp: clamp,
	
			integrate: function(f, a, b, n) {
				var x = abscissas[n - 2],
					w = weights[n - 2],
					A = (b - a) * 0.5,
					B = A + a,
					i = 0,
					m = (n + 1) >> 1,
					sum = n & 1 ? w[i++] * f(B) : 0;
				while (i < m) {
					var Ax = A * x[i];
					sum += w[i++] * (f(B + Ax) + f(B - Ax));
				}
				return A * sum;
			},
	
			findRoot: function(f, df, x, a, b, n, tolerance) {
				for (var i = 0; i < n; i++) {
					var fx = f(x),
						dx = fx / df(x),
						nx = x - dx;
					if (abs(dx) < tolerance)
						return nx;
					if (fx > 0) {
						b = x;
						x = nx <= a ? (a + b) * 0.5 : nx;
					} else {
						a = x;
						x = nx >= b ? (a + b) * 0.5 : nx;
					}
				}
				return x;
			},
	
			solveQuadratic: function(a, b, c, roots, min, max) {
				var count = 0,
					eMin = min - EPSILON,
					eMax = max + EPSILON,
					x1, x2 = Infinity,
					B = b,
					D;
				b /= -2;
				D = b * b - a * c;
				if (D !== 0 && abs(D) < MACHINE_EPSILON) {
					var gmC = pow(abs(a * b * c), 1 / 3);
					if (gmC < 1e-8) {
						var mult = pow(10,
								abs(Math.floor(Math.log(gmC) * Math.LOG10E)));
						if (!isFinite(mult))
							mult = 0;
						a *= mult;
						b *= mult;
						c *= mult;
						D = b * b - a * c;
					}
				}
				if (abs(a) < EPSILON) {
					if (abs(B) < EPSILON)
						return abs(c) < EPSILON ? -1 : 0;
					x1 = -c / B;
				} else if (D >= -MACHINE_EPSILON) {
					var Q = D < 0 ? 0 : sqrt(D),
						R = b + (b < 0 ? -Q : Q);
					if (R === 0) {
						x1 = c / a;
						x2 = -x1;
					} else {
						x1 = R / a;
						x2 = c / R;
					}
				}
				if (isFinite(x1) && (min == null || x1 > eMin && x1 < eMax))
					roots[count++] = min == null ? x1 : clamp(x1, min, max);
				if (x2 !== x1
						&& isFinite(x2) && (min == null || x2 > eMin && x2 < eMax))
					roots[count++] = min == null ? x2 : clamp(x2, min, max);
				return count;
			},
	
			solveCubic: function(a, b, c, d, roots, min, max) {
				var count = 0,
					x, b1, c2;
				if (abs(a) < EPSILON) {
					a = b;
					b1 = c;
					c2 = d;
					x = Infinity;
				} else if (abs(d) < EPSILON) {
					b1 = b;
					c2 = c;
					x = 0;
				} else {
					var ec = 1 + MACHINE_EPSILON,
						x0, q, qd, t, r, s, tmp;
					x = -(b / a) / 3;
					tmp = a * x;
					b1 = tmp + b;
					c2 = b1 * x + c;
					qd = (tmp + b1) * x + c2;
					q = c2 * x + d;
					t = q / a;
					r = pow(abs(t), 1/3);
					s = t < 0 ? -1 : 1;
					t = -qd / a;
					r = t > 0 ? 1.3247179572 * Math.max(r, sqrt(t)) : r;
					x0 = x - s * r;
					if (x0 !== x) {
						do {
							x = x0;
							tmp = a * x;
							b1 = tmp + b;
							c2 = b1 * x + c;
							qd = (tmp + b1) * x + c2;
							q = c2 * x + d;
							x0 = qd === 0 ? x : x - q / qd / ec;
						} while (s * x0 > s * x);
						if (abs(a) * x * x > abs(d / x)) {
							c2 = -d / x;
							b1 = (c2 - c) / x;
						}
					}
				}
				var count = Numerical.solveQuadratic(a, b1, c2, roots, min, max);
				if (isFinite(x) && (count === 0 || x !== roots[count - 1])
						&& (min == null || x > min - EPSILON && x < max + EPSILON))
					roots[count++] = min == null ? x : clamp(x, min, max);
				return count;
			}
		};
	};
	
	var UID = {
		_id: 1,
		_pools: {},
	
		get: function(ctor) {
			if (ctor) {
				var name = ctor._class,
					pool = this._pools[name];
				if (!pool)
					pool = this._pools[name] = { _id: 1 };
				return pool._id++;
			} else {
				return this._id++;
			}
		}
	};
	
	var Point = Base.extend({
		_class: 'Point',
		_readIndex: true,
	
		initialize: function Point(arg0, arg1) {
			var type = typeof arg0;
			if (type === 'number') {
				var hasY = typeof arg1 === 'number';
				this.x = arg0;
				this.y = hasY ? arg1 : arg0;
				if (this.__read)
					this.__read = hasY ? 2 : 1;
			} else if (type === 'undefined' || arg0 === null) {
				this.x = this.y = 0;
				if (this.__read)
					this.__read = arg0 === null ? 1 : 0;
			} else {
				if (Array.isArray(arg0)) {
					this.x = arg0[0];
					this.y = arg0.length > 1 ? arg0[1] : arg0[0];
				} else if (arg0.x != null) {
					this.x = arg0.x;
					this.y = arg0.y;
				} else if (arg0.width != null) {
					this.x = arg0.width;
					this.y = arg0.height;
				} else if (arg0.angle != null) {
					this.x = arg0.length;
					this.y = 0;
					this.setAngle(arg0.angle);
				} else {
					this.x = this.y = 0;
					if (this.__read)
						this.__read = 0;
				}
				if (this.__read)
					this.__read = 1;
			}
		},
	
		set: function(x, y) {
			this.x = x;
			this.y = y;
			return this;
		},
	
		equals: function(point) {
			return this === point || point
					&& (this.x === point.x && this.y === point.y
						|| Array.isArray(point)
							&& this.x === point[0] && this.y === point[1])
					|| false;
		},
	
		clone: function() {
			return new Point(this.x, this.y);
		},
	
		toString: function() {
			var f = Formatter.instance;
			return '{ x: ' + f.number(this.x) + ', y: ' + f.number(this.y) + ' }';
		},
	
		_serialize: function(options) {
			var f = options.formatter;
			return [f.number(this.x), f.number(this.y)];
		},
	
		getLength: function() {
			return Math.sqrt(this.x * this.x + this.y * this.y);
		},
	
		setLength: function(length) {
			if (this.isZero()) {
				var angle = this._angle || 0;
				this.set(
					Math.cos(angle) * length,
					Math.sin(angle) * length
				);
			} else {
				var scale = length / this.getLength();
				if (Numerical.isZero(scale))
					this.getAngle();
				this.set(
					this.x * scale,
					this.y * scale
				);
			}
		},
		getAngle: function() {
			return this.getAngleInRadians.apply(this, arguments) * 180 / Math.PI;
		},
	
		setAngle: function(angle) {
			this.setAngleInRadians.call(this, angle * Math.PI / 180);
		},
	
		getAngleInDegrees: '#getAngle',
		setAngleInDegrees: '#setAngle',
	
		getAngleInRadians: function() {
			if (!arguments.length) {
				return this.isZero()
						? this._angle || 0
						: this._angle = Math.atan2(this.y, this.x);
			} else {
				var point = Point.read(arguments),
					div = this.getLength() * point.getLength();
				if (Numerical.isZero(div)) {
					return NaN;
				} else {
					var a = this.dot(point) / div;
					return Math.acos(a < -1 ? -1 : a > 1 ? 1 : a);
				}
			}
		},
	
		setAngleInRadians: function(angle) {
			this._angle = angle;
			if (!this.isZero()) {
				var length = this.getLength();
				this.set(
					Math.cos(angle) * length,
					Math.sin(angle) * length
				);
			}
		},
	
		getQuadrant: function() {
			return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
		}
	}, {
		beans: false,
	
		getDirectedAngle: function() {
			var point = Point.read(arguments);
			return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
		},
	
		getDistance: function() {
			var point = Point.read(arguments),
				x = point.x - this.x,
				y = point.y - this.y,
				d = x * x + y * y,
				squared = Base.read(arguments);
			return squared ? d : Math.sqrt(d);
		},
	
		normalize: function(length) {
			if (length === undefined)
				length = 1;
			var current = this.getLength(),
				scale = current !== 0 ? length / current : 0,
				point = new Point(this.x * scale, this.y * scale);
			if (scale >= 0)
				point._angle = this._angle;
			return point;
		},
	
		rotate: function(angle, center) {
			if (angle === 0)
				return this.clone();
			angle = angle * Math.PI / 180;
			var point = center ? this.subtract(center) : this,
				sin = Math.sin(angle),
				cos = Math.cos(angle);
			point = new Point(
				point.x * cos - point.y * sin,
				point.x * sin + point.y * cos
			);
			return center ? point.add(center) : point;
		},
	
		transform: function(matrix) {
			return matrix ? matrix._transformPoint(this) : this;
		},
	
		add: function() {
			var point = Point.read(arguments);
			return new Point(this.x + point.x, this.y + point.y);
		},
	
		subtract: function() {
			var point = Point.read(arguments);
			return new Point(this.x - point.x, this.y - point.y);
		},
	
		multiply: function() {
			var point = Point.read(arguments);
			return new Point(this.x * point.x, this.y * point.y);
		},
	
		divide: function() {
			var point = Point.read(arguments);
			return new Point(this.x / point.x, this.y / point.y);
		},
	
		modulo: function() {
			var point = Point.read(arguments);
			return new Point(this.x % point.x, this.y % point.y);
		},
	
		negate: function() {
			return new Point(-this.x, -this.y);
		},
	
		isInside: function() {
			return Rectangle.read(arguments).contains(this);
		},
	
		isClose: function() {
			var point = Point.read(arguments),
				tolerance = Base.read(arguments);
			return this.getDistance(point) < tolerance;
		},
	
		isCollinear: function() {
			var point = Point.read(arguments);
			return Point.isCollinear(this.x, this.y, point.x, point.y);
		},
	
		isColinear: '#isCollinear',
	
		isOrthogonal: function() {
			var point = Point.read(arguments);
			return Point.isOrthogonal(this.x, this.y, point.x, point.y);
		},
	
		isZero: function() {
			return Numerical.isZero(this.x) && Numerical.isZero(this.y);
		},
	
		isNaN: function() {
			return isNaN(this.x) || isNaN(this.y);
		},
	
		dot: function() {
			var point = Point.read(arguments);
			return this.x * point.x + this.y * point.y;
		},
	
		cross: function() {
			var point = Point.read(arguments);
			return this.x * point.y - this.y * point.x;
		},
	
		project: function() {
			var point = Point.read(arguments),
				scale = point.isZero() ? 0 : this.dot(point) / point.dot(point);
			return new Point(
				point.x * scale,
				point.y * scale
			);
		},
	
		statics: {
			min: function() {
				var point1 = Point.read(arguments),
					point2 = Point.read(arguments);
				return new Point(
					Math.min(point1.x, point2.x),
					Math.min(point1.y, point2.y)
				);
			},
	
			max: function() {
				var point1 = Point.read(arguments),
					point2 = Point.read(arguments);
				return new Point(
					Math.max(point1.x, point2.x),
					Math.max(point1.y, point2.y)
				);
			},
	
			random: function() {
				return new Point(Math.random(), Math.random());
			},
	
			isCollinear: function(x1, y1, x2, y2) {
				return Math.abs(x1 * y2 - y1 * x2)
						<= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
							* 1e-7;
			},
	
			isOrthogonal: function(x1, y1, x2, y2) {
				return Math.abs(x1 * x2 + y1 * y2)
						<= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
							* 1e-7;
			}
		}
	}, Base.each(['round', 'ceil', 'floor', 'abs'], function(key) {
		var op = Math[key];
		this[key] = function() {
			return new Point(op(this.x), op(this.y));
		};
	}, {}));
	
	var LinkedPoint = Point.extend({
		initialize: function Point(x, y, owner, setter) {
			this._x = x;
			this._y = y;
			this._owner = owner;
			this._setter = setter;
		},
	
		set: function(x, y, _dontNotify) {
			this._x = x;
			this._y = y;
			if (!_dontNotify)
				this._owner[this._setter](this);
			return this;
		},
	
		getX: function() {
			return this._x;
		},
	
		setX: function(x) {
			this._x = x;
			this._owner[this._setter](this);
		},
	
		getY: function() {
			return this._y;
		},
	
		setY: function(y) {
			this._y = y;
			this._owner[this._setter](this);
		},
	
		isSelected: function() {
			return !!(this._owner._selection & this._getSelection());
		},
	
		setSelected: function(selected) {
			this._owner.changeSelection(this._getSelection(), selected);
		},
	
		_getSelection: function() {
			return this._setter === 'setPosition' ? 4 : 0;
		}
	});
	
	var Size = Base.extend({
		_class: 'Size',
		_readIndex: true,
	
		initialize: function Size(arg0, arg1) {
			var type = typeof arg0;
			if (type === 'number') {
				var hasHeight = typeof arg1 === 'number';
				this.width = arg0;
				this.height = hasHeight ? arg1 : arg0;
				if (this.__read)
					this.__read = hasHeight ? 2 : 1;
			} else if (type === 'undefined' || arg0 === null) {
				this.width = this.height = 0;
				if (this.__read)
					this.__read = arg0 === null ? 1 : 0;
			} else {
				if (Array.isArray(arg0)) {
					this.width = arg0[0];
					this.height = arg0.length > 1 ? arg0[1] : arg0[0];
				} else if (arg0.width != null) {
					this.width = arg0.width;
					this.height = arg0.height;
				} else if (arg0.x != null) {
					this.width = arg0.x;
					this.height = arg0.y;
				} else {
					this.width = this.height = 0;
					if (this.__read)
						this.__read = 0;
				}
				if (this.__read)
					this.__read = 1;
			}
		},
	
		set: function(width, height) {
			this.width = width;
			this.height = height;
			return this;
		},
	
		equals: function(size) {
			return size === this || size && (this.width === size.width
					&& this.height === size.height
					|| Array.isArray(size) && this.width === size[0]
						&& this.height === size[1]) || false;
		},
	
		clone: function() {
			return new Size(this.width, this.height);
		},
	
		toString: function() {
			var f = Formatter.instance;
			return '{ width: ' + f.number(this.width)
					+ ', height: ' + f.number(this.height) + ' }';
		},
	
		_serialize: function(options) {
			var f = options.formatter;
			return [f.number(this.width),
					f.number(this.height)];
		},
	
		add: function() {
			var size = Size.read(arguments);
			return new Size(this.width + size.width, this.height + size.height);
		},
	
		subtract: function() {
			var size = Size.read(arguments);
			return new Size(this.width - size.width, this.height - size.height);
		},
	
		multiply: function() {
			var size = Size.read(arguments);
			return new Size(this.width * size.width, this.height * size.height);
		},
	
		divide: function() {
			var size = Size.read(arguments);
			return new Size(this.width / size.width, this.height / size.height);
		},
	
		modulo: function() {
			var size = Size.read(arguments);
			return new Size(this.width % size.width, this.height % size.height);
		},
	
		negate: function() {
			return new Size(-this.width, -this.height);
		},
	
		isZero: function() {
			return Numerical.isZero(this.width) && Numerical.isZero(this.height);
		},
	
		isNaN: function() {
			return isNaN(this.width) || isNaN(this.height);
		},
	
		statics: {
			min: function(size1, size2) {
				return new Size(
					Math.min(size1.width, size2.width),
					Math.min(size1.height, size2.height));
			},
	
			max: function(size1, size2) {
				return new Size(
					Math.max(size1.width, size2.width),
					Math.max(size1.height, size2.height));
			},
	
			random: function() {
				return new Size(Math.random(), Math.random());
			}
		}
	}, Base.each(['round', 'ceil', 'floor', 'abs'], function(key) {
		var op = Math[key];
		this[key] = function() {
			return new Size(op(this.width), op(this.height));
		};
	}, {}));
	
	var LinkedSize = Size.extend({
		initialize: function Size(width, height, owner, setter) {
			this._width = width;
			this._height = height;
			this._owner = owner;
			this._setter = setter;
		},
	
		set: function(width, height, _dontNotify) {
			this._width = width;
			this._height = height;
			if (!_dontNotify)
				this._owner[this._setter](this);
			return this;
		},
	
		getWidth: function() {
			return this._width;
		},
	
		setWidth: function(width) {
			this._width = width;
			this._owner[this._setter](this);
		},
	
		getHeight: function() {
			return this._height;
		},
	
		setHeight: function(height) {
			this._height = height;
			this._owner[this._setter](this);
		}
	});
	
	var Rectangle = Base.extend({
		_class: 'Rectangle',
		_readIndex: true,
		beans: true,
	
		initialize: function Rectangle(arg0, arg1, arg2, arg3) {
			var type = typeof arg0,
				read = 0;
			if (type === 'number') {
				this.x = arg0;
				this.y = arg1;
				this.width = arg2;
				this.height = arg3;
				read = 4;
			} else if (type === 'undefined' || arg0 === null) {
				this.x = this.y = this.width = this.height = 0;
				read = arg0 === null ? 1 : 0;
			} else if (arguments.length === 1) {
				if (Array.isArray(arg0)) {
					this.x = arg0[0];
					this.y = arg0[1];
					this.width = arg0[2];
					this.height = arg0[3];
					read = 1;
				} else if (arg0.x !== undefined || arg0.width !== undefined) {
					this.x = arg0.x || 0;
					this.y = arg0.y || 0;
					this.width = arg0.width || 0;
					this.height = arg0.height || 0;
					read = 1;
				} else if (arg0.from === undefined && arg0.to === undefined) {
					this.x = this.y = this.width = this.height = 0;
					this._set(arg0);
					read = 1;
				}
			}
			if (!read) {
				var point = Point.readNamed(arguments, 'from'),
					next = Base.peek(arguments);
				this.x = point.x;
				this.y = point.y;
				if (next && next.x !== undefined || Base.hasNamed(arguments, 'to')) {
					var to = Point.readNamed(arguments, 'to');
					this.width = to.x - point.x;
					this.height = to.y - point.y;
					if (this.width < 0) {
						this.x = to.x;
						this.width = -this.width;
					}
					if (this.height < 0) {
						this.y = to.y;
						this.height = -this.height;
					}
				} else {
					var size = Size.read(arguments);
					this.width = size.width;
					this.height = size.height;
				}
				read = arguments.__index;
			}
			if (this.__read)
				this.__read = read;
		},
	
		set: function(x, y, width, height) {
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
			return this;
		},
	
		clone: function() {
			return new Rectangle(this.x, this.y, this.width, this.height);
		},
	
		equals: function(rect) {
			var rt = Base.isPlainValue(rect)
					? Rectangle.read(arguments)
					: rect;
			return rt === this
					|| rt && this.x === rt.x && this.y === rt.y
						&& this.width === rt.width && this.height === rt.height
					|| false;
		},
	
		toString: function() {
			var f = Formatter.instance;
			return '{ x: ' + f.number(this.x)
					+ ', y: ' + f.number(this.y)
					+ ', width: ' + f.number(this.width)
					+ ', height: ' + f.number(this.height)
					+ ' }';
		},
	
		_serialize: function(options) {
			var f = options.formatter;
			return [f.number(this.x),
					f.number(this.y),
					f.number(this.width),
					f.number(this.height)];
		},
	
		getPoint: function(_dontLink) {
			var ctor = _dontLink ? Point : LinkedPoint;
			return new ctor(this.x, this.y, this, 'setPoint');
		},
	
		setPoint: function() {
			var point = Point.read(arguments);
			this.x = point.x;
			this.y = point.y;
		},
	
		getSize: function(_dontLink) {
			var ctor = _dontLink ? Size : LinkedSize;
			return new ctor(this.width, this.height, this, 'setSize');
		},
	
		setSize: function() {
			var size = Size.read(arguments);
			if (this._fixX)
				this.x += (this.width - size.width) * this._fixX;
			if (this._fixY)
				this.y += (this.height - size.height) * this._fixY;
			this.width = size.width;
			this.height = size.height;
			this._fixW = 1;
			this._fixH = 1;
		},
	
		getLeft: function() {
			return this.x;
		},
	
		setLeft: function(left) {
			if (!this._fixW)
				this.width -= left - this.x;
			this.x = left;
			this._fixX = 0;
		},
	
		getTop: function() {
			return this.y;
		},
	
		setTop: function(top) {
			if (!this._fixH)
				this.height -= top - this.y;
			this.y = top;
			this._fixY = 0;
		},
	
		getRight: function() {
			return this.x + this.width;
		},
	
		setRight: function(right) {
			if (this._fixX !== undefined && this._fixX !== 1)
				this._fixW = 0;
			if (this._fixW)
				this.x = right - this.width;
			else
				this.width = right - this.x;
			this._fixX = 1;
		},
	
		getBottom: function() {
			return this.y + this.height;
		},
	
		setBottom: function(bottom) {
			if (this._fixY !== undefined && this._fixY !== 1)
				this._fixH = 0;
			if (this._fixH)
				this.y = bottom - this.height;
			else
				this.height = bottom - this.y;
			this._fixY = 1;
		},
	
		getCenterX: function() {
			return this.x + this.width * 0.5;
		},
	
		setCenterX: function(x) {
			this.x = x - this.width * 0.5;
			this._fixX = 0.5;
		},
	
		getCenterY: function() {
			return this.y + this.height * 0.5;
		},
	
		setCenterY: function(y) {
			this.y = y - this.height * 0.5;
			this._fixY = 0.5;
		},
	
		getCenter: function(_dontLink) {
			var ctor = _dontLink ? Point : LinkedPoint;
			return new ctor(this.getCenterX(), this.getCenterY(), this, 'setCenter');
		},
	
		setCenter: function() {
			var point = Point.read(arguments);
			this.setCenterX(point.x);
			this.setCenterY(point.y);
			return this;
		},
	
		getArea: function() {
			return this.width * this.height;
		},
	
		isEmpty: function() {
			return this.width === 0 || this.height === 0;
		},
	
		contains: function(arg) {
			return arg && arg.width !== undefined
					|| (Array.isArray(arg) ? arg : arguments).length === 4
					? this._containsRectangle(Rectangle.read(arguments))
					: this._containsPoint(Point.read(arguments));
		},
	
		_containsPoint: function(point) {
			var x = point.x,
				y = point.y;
			return x >= this.x && y >= this.y
					&& x <= this.x + this.width
					&& y <= this.y + this.height;
		},
	
		_containsRectangle: function(rect) {
			var x = rect.x,
				y = rect.y;
			return x >= this.x && y >= this.y
					&& x + rect.width <= this.x + this.width
					&& y + rect.height <= this.y + this.height;
		},
	
		intersects: function() {
			var rect = Rectangle.read(arguments);
			return rect.x + rect.width > this.x
					&& rect.y + rect.height > this.y
					&& rect.x < this.x + this.width
					&& rect.y < this.y + this.height;
		},
	
		touches: function() {
			var rect = Rectangle.read(arguments);
			return rect.x + rect.width >= this.x
					&& rect.y + rect.height >= this.y
					&& rect.x <= this.x + this.width
					&& rect.y <= this.y + this.height;
		},
	
		intersect: function() {
			var rect = Rectangle.read(arguments),
				x1 = Math.max(this.x, rect.x),
				y1 = Math.max(this.y, rect.y),
				x2 = Math.min(this.x + this.width, rect.x + rect.width),
				y2 = Math.min(this.y + this.height, rect.y + rect.height);
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		},
	
		unite: function() {
			var rect = Rectangle.read(arguments),
				x1 = Math.min(this.x, rect.x),
				y1 = Math.min(this.y, rect.y),
				x2 = Math.max(this.x + this.width, rect.x + rect.width),
				y2 = Math.max(this.y + this.height, rect.y + rect.height);
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		},
	
		include: function() {
			var point = Point.read(arguments);
			var x1 = Math.min(this.x, point.x),
				y1 = Math.min(this.y, point.y),
				x2 = Math.max(this.x + this.width, point.x),
				y2 = Math.max(this.y + this.height, point.y);
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		},
	
		expand: function() {
			var amount = Size.read(arguments),
				hor = amount.width,
				ver = amount.height;
			return new Rectangle(this.x - hor / 2, this.y - ver / 2,
					this.width + hor, this.height + ver);
		},
	
		scale: function(hor, ver) {
			return this.expand(this.width * hor - this.width,
					this.height * (ver === undefined ? hor : ver) - this.height);
		}
	}, Base.each([
			['Top', 'Left'], ['Top', 'Right'],
			['Bottom', 'Left'], ['Bottom', 'Right'],
			['Left', 'Center'], ['Top', 'Center'],
			['Right', 'Center'], ['Bottom', 'Center']
		],
		function(parts, index) {
			var part = parts.join(''),
				xFirst = /^[RL]/.test(part);
			if (index >= 4)
				parts[1] += xFirst ? 'Y' : 'X';
			var x = parts[xFirst ? 0 : 1],
				y = parts[xFirst ? 1 : 0],
				getX = 'get' + x,
				getY = 'get' + y,
				setX = 'set' + x,
				setY = 'set' + y,
				get = 'get' + part,
				set = 'set' + part;
			this[get] = function(_dontLink) {
				var ctor = _dontLink ? Point : LinkedPoint;
				return new ctor(this[getX](), this[getY](), this, set);
			};
			this[set] = function() {
				var point = Point.read(arguments);
				this[setX](point.x);
				this[setY](point.y);
			};
		}, {
			beans: true
		}
	));
	
	var LinkedRectangle = Rectangle.extend({
		initialize: function Rectangle(x, y, width, height, owner, setter) {
			this.set(x, y, width, height, true);
			this._owner = owner;
			this._setter = setter;
		},
	
		set: function(x, y, width, height, _dontNotify) {
			this._x = x;
			this._y = y;
			this._width = width;
			this._height = height;
			if (!_dontNotify)
				this._owner[this._setter](this);
			return this;
		}
	},
	new function() {
		var proto = Rectangle.prototype;
	
		return Base.each(['x', 'y', 'width', 'height'], function(key) {
			var part = Base.capitalize(key),
				internal = '_' + key;
			this['get' + part] = function() {
				return this[internal];
			};
	
			this['set' + part] = function(value) {
				this[internal] = value;
				if (!this._dontNotify)
					this._owner[this._setter](this);
			};
		}, Base.each(['Point', 'Size', 'Center',
				'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
				'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
				'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
			function(key) {
				var name = 'set' + key;
				this[name] = function() {
					this._dontNotify = true;
					proto[name].apply(this, arguments);
					this._dontNotify = false;
					this._owner[this._setter](this);
				};
			}, {
				isSelected: function() {
					return !!(this._owner._selection & 2);
				},
	
				setSelected: function(selected) {
					var owner = this._owner;
					if (owner.changeSelection) {
						owner.changeSelection(2, selected);
					}
				}
			})
		);
	});
	
	var Matrix = Base.extend({
		_class: 'Matrix',
	
		initialize: function Matrix(arg) {
			var count = arguments.length,
				ok = true;
			if (count === 6) {
				this.set.apply(this, arguments);
			} else if (count === 1) {
				if (arg instanceof Matrix) {
					this.set(arg._a, arg._b, arg._c, arg._d, arg._tx, arg._ty);
				} else if (Array.isArray(arg)) {
					this.set.apply(this, arg);
				} else {
					ok = false;
				}
			} else if (count === 0) {
				this.reset();
			} else {
				ok = false;
			}
			if (!ok) {
				throw new Error('Unsupported matrix parameters');
			}
		},
	
		set: function(a, b, c, d, tx, ty, _dontNotify) {
			this._a = a;
			this._b = b;
			this._c = c;
			this._d = d;
			this._tx = tx;
			this._ty = ty;
			if (!_dontNotify)
				this._changed();
			return this;
		},
	
		_serialize: function(options) {
			return Base.serialize(this.getValues(), options);
		},
	
		_changed: function() {
			var owner = this._owner;
			if (owner) {
				if (owner._applyMatrix) {
					owner.transform(null, true);
				} else {
					owner._changed(9);
				}
			}
		},
	
		clone: function() {
			return new Matrix(this._a, this._b, this._c, this._d,
					this._tx, this._ty);
		},
	
		equals: function(mx) {
			return mx === this || mx && this._a === mx._a && this._b === mx._b
					&& this._c === mx._c && this._d === mx._d
					&& this._tx === mx._tx && this._ty === mx._ty;
		},
	
		toString: function() {
			var f = Formatter.instance;
			return '[[' + [f.number(this._a), f.number(this._c),
						f.number(this._tx)].join(', ') + '], ['
					+ [f.number(this._b), f.number(this._d),
						f.number(this._ty)].join(', ') + ']]';
		},
	
		reset: function(_dontNotify) {
			this._a = this._d = 1;
			this._b = this._c = this._tx = this._ty = 0;
			if (!_dontNotify)
				this._changed();
			return this;
		},
	
		apply: function(recursively, _setApplyMatrix) {
			var owner = this._owner;
			if (owner) {
				owner.transform(null, true, Base.pick(recursively, true),
						_setApplyMatrix);
				return this.isIdentity();
			}
			return false;
		},
	
		translate: function() {
			var point = Point.read(arguments),
				x = point.x,
				y = point.y;
			this._tx += x * this._a + y * this._c;
			this._ty += x * this._b + y * this._d;
			this._changed();
			return this;
		},
	
		scale: function() {
			var scale = Point.read(arguments),
				center = Point.read(arguments, 0, { readNull: true });
			if (center)
				this.translate(center);
			this._a *= scale.x;
			this._b *= scale.x;
			this._c *= scale.y;
			this._d *= scale.y;
			if (center)
				this.translate(center.negate());
			this._changed();
			return this;
		},
	
		rotate: function(angle ) {
			angle *= Math.PI / 180;
			var center = Point.read(arguments, 1),
				x = center.x,
				y = center.y,
				cos = Math.cos(angle),
				sin = Math.sin(angle),
				tx = x - x * cos + y * sin,
				ty = y - x * sin - y * cos,
				a = this._a,
				b = this._b,
				c = this._c,
				d = this._d;
			this._a = cos * a + sin * c;
			this._b = cos * b + sin * d;
			this._c = -sin * a + cos * c;
			this._d = -sin * b + cos * d;
			this._tx += tx * a + ty * c;
			this._ty += tx * b + ty * d;
			this._changed();
			return this;
		},
	
		shear: function() {
			var shear = Point.read(arguments),
				center = Point.read(arguments, 0, { readNull: true });
			if (center)
				this.translate(center);
			var a = this._a,
				b = this._b;
			this._a += shear.y * this._c;
			this._b += shear.y * this._d;
			this._c += shear.x * a;
			this._d += shear.x * b;
			if (center)
				this.translate(center.negate());
			this._changed();
			return this;
		},
	
		skew: function() {
			var skew = Point.read(arguments),
				center = Point.read(arguments, 0, { readNull: true }),
				toRadians = Math.PI / 180,
				shear = new Point(Math.tan(skew.x * toRadians),
					Math.tan(skew.y * toRadians));
			return this.shear(shear, center);
		},
	
		append: function(mx) {
			var a1 = this._a,
				b1 = this._b,
				c1 = this._c,
				d1 = this._d,
				a2 = mx._a,
				b2 = mx._c,
				c2 = mx._b,
				d2 = mx._d,
				tx2 = mx._tx,
				ty2 = mx._ty;
			this._a = a2 * a1 + c2 * c1;
			this._c = b2 * a1 + d2 * c1;
			this._b = a2 * b1 + c2 * d1;
			this._d = b2 * b1 + d2 * d1;
			this._tx += tx2 * a1 + ty2 * c1;
			this._ty += tx2 * b1 + ty2 * d1;
			this._changed();
			return this;
		},
	
		appended: function(mx) {
			return this.clone().append(mx);
		},
	
		prepend: function(mx) {
			var a1 = this._a,
				b1 = this._b,
				c1 = this._c,
				d1 = this._d,
				tx1 = this._tx,
				ty1 = this._ty,
				a2 = mx._a,
				b2 = mx._c,
				c2 = mx._b,
				d2 = mx._d,
				tx2 = mx._tx,
				ty2 = mx._ty;
			this._a = a2 * a1 + b2 * b1;
			this._c = a2 * c1 + b2 * d1;
			this._b = c2 * a1 + d2 * b1;
			this._d = c2 * c1 + d2 * d1;
			this._tx = a2 * tx1 + b2 * ty1 + tx2;
			this._ty = c2 * tx1 + d2 * ty1 + ty2;
			this._changed();
			return this;
		},
	
		prepended: function(mx) {
			return this.clone().prepend(mx);
		},
	
		invert: function() {
			var a = this._a,
				b = this._b,
				c = this._c,
				d = this._d,
				tx = this._tx,
				ty = this._ty,
				det = a * d - b * c,
				res = null;
			if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
				this._a = d / det;
				this._b = -b / det;
				this._c = -c / det;
				this._d = a / det;
				this._tx = (c * ty - d * tx) / det;
				this._ty = (b * tx - a * ty) / det;
				res = this;
			}
			return res;
		},
	
		inverted: function() {
			return this.clone().invert();
		},
	
		concatenate: '#append',
		preConcatenate: '#prepend',
		chain: '#appended',
	
		_shiftless: function() {
			return new Matrix(this._a, this._b, this._c, this._d, 0, 0);
		},
	
		_orNullIfIdentity: function() {
			return this.isIdentity() ? null : this;
		},
	
		isIdentity: function() {
			return this._a === 1 && this._b === 0 && this._c === 0 && this._d === 1
					&& this._tx === 0 && this._ty === 0;
		},
	
		isInvertible: function() {
			var det = this._a * this._d - this._c * this._b;
			return det && !isNaN(det) && isFinite(this._tx) && isFinite(this._ty);
		},
	
		isSingular: function() {
			return !this.isInvertible();
		},
	
		transform: function( src, dst, count) {
			return arguments.length < 3
				? this._transformPoint(Point.read(arguments))
				: this._transformCoordinates(src, dst, count);
		},
	
		_transformPoint: function(point, dest, _dontNotify) {
			var x = point.x,
				y = point.y;
			if (!dest)
				dest = new Point();
			return dest.set(
					x * this._a + y * this._c + this._tx,
					x * this._b + y * this._d + this._ty,
					_dontNotify);
		},
	
		_transformCoordinates: function(src, dst, count) {
			for (var i = 0, max = 2 * count; i < max; i += 2) {
				var x = src[i],
					y = src[i + 1];
				dst[i] = x * this._a + y * this._c + this._tx;
				dst[i + 1] = x * this._b + y * this._d + this._ty;
			}
			return dst;
		},
	
		_transformCorners: function(rect) {
			var x1 = rect.x,
				y1 = rect.y,
				x2 = x1 + rect.width,
				y2 = y1 + rect.height,
				coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
			return this._transformCoordinates(coords, coords, 4);
		},
	
		_transformBounds: function(bounds, dest, _dontNotify) {
			var coords = this._transformCorners(bounds),
				min = coords.slice(0, 2),
				max = min.slice();
			for (var i = 2; i < 8; i++) {
				var val = coords[i],
					j = i & 1;
				if (val < min[j]) {
					min[j] = val;
				} else if (val > max[j]) {
					max[j] = val;
				}
			}
			if (!dest)
				dest = new Rectangle();
			return dest.set(min[0], min[1], max[0] - min[0], max[1] - min[1],
					_dontNotify);
		},
	
		inverseTransform: function() {
			return this._inverseTransform(Point.read(arguments));
		},
	
		_inverseTransform: function(point, dest, _dontNotify) {
			var a = this._a,
				b = this._b,
				c = this._c,
				d = this._d,
				tx = this._tx,
				ty = this._ty,
				det = a * d - b * c,
				res = null;
			if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
				var x = point.x - this._tx,
					y = point.y - this._ty;
				if (!dest)
					dest = new Point();
				res = dest.set(
						(x * d - y * c) / det,
						(y * a - x * b) / det,
						_dontNotify);
			}
			return res;
		},
	
		decompose: function() {
			var a = this._a,
				b = this._b,
				c = this._c,
				d = this._d,
				det = a * d - b * c,
				sqrt = Math.sqrt,
				atan2 = Math.atan2,
				degrees = 180 / Math.PI,
				rotate,
				scale,
				skew;
			if (a !== 0 || b !== 0) {
				var r = sqrt(a * a + b * b);
				rotate = Math.acos(a / r) * (b > 0 ? 1 : -1);
				scale = [r, det / r];
				skew = [atan2(a * c + b * d, r * r), 0];
			} else if (c !== 0 || d !== 0) {
				var s = sqrt(c * c + d * d);
				rotate = Math.asin(c / s)  * (d > 0 ? 1 : -1);
				scale = [det / s, s];
				skew = [0, atan2(a * c + b * d, s * s)];
			} else {
				rotate = 0;
				skew = scale = [0, 0];
			}
			return {
				translation: this.getTranslation(),
				rotation: rotate * degrees,
				scaling: new Point(scale),
				skewing: new Point(skew[0] * degrees, skew[1] * degrees)
			};
		},
	
		getValues: function() {
			return [ this._a, this._b, this._c, this._d, this._tx, this._ty ];
		},
	
		getTranslation: function() {
			return new Point(this._tx, this._ty);
		},
	
		getScaling: function() {
			return (this.decompose() || {}).scaling;
		},
	
		getRotation: function() {
			return (this.decompose() || {}).rotation;
		},
	
		applyToContext: function(ctx) {
			if (!this.isIdentity()) {
				ctx.transform(this._a, this._b, this._c, this._d,
						this._tx, this._ty);
			}
		}
	}, Base.each(['a', 'b', 'c', 'd', 'tx', 'ty'], function(key) {
		var part = Base.capitalize(key),
			prop = '_' + key;
		this['get' + part] = function() {
			return this[prop];
		};
		this['set' + part] = function(value) {
			this[prop] = value;
			this._changed();
		};
	}, {}));
	
	var Line = Base.extend({
		_class: 'Line',
	
		initialize: function Line(arg0, arg1, arg2, arg3, arg4) {
			var asVector = false;
			if (arguments.length >= 4) {
				this._px = arg0;
				this._py = arg1;
				this._vx = arg2;
				this._vy = arg3;
				asVector = arg4;
			} else {
				this._px = arg0.x;
				this._py = arg0.y;
				this._vx = arg1.x;
				this._vy = arg1.y;
				asVector = arg2;
			}
			if (!asVector) {
				this._vx -= this._px;
				this._vy -= this._py;
			}
		},
	
		getPoint: function() {
			return new Point(this._px, this._py);
		},
	
		getVector: function() {
			return new Point(this._vx, this._vy);
		},
	
		getLength: function() {
			return this.getVector().getLength();
		},
	
		intersect: function(line, isInfinite) {
			return Line.intersect(
					this._px, this._py, this._vx, this._vy,
					line._px, line._py, line._vx, line._vy,
					true, isInfinite);
		},
	
		getSide: function(point, isInfinite) {
			return Line.getSide(
					this._px, this._py, this._vx, this._vy,
					point.x, point.y, true, isInfinite);
		},
	
		getDistance: function(point) {
			return Math.abs(Line.getSignedDistance(
					this._px, this._py, this._vx, this._vy,
					point.x, point.y, true));
		},
	
		isCollinear: function(line) {
			return Point.isCollinear(this._vx, this._vy, line._vx, line._vy);
		},
	
		isOrthogonal: function(line) {
			return Point.isOrthogonal(this._vx, this._vy, line._vx, line._vy);
		},
	
		statics: {
			intersect: function(p1x, p1y, v1x, v1y, p2x, p2y, v2x, v2y, asVector,
					isInfinite) {
				if (!asVector) {
					v1x -= p1x;
					v1y -= p1y;
					v2x -= p2x;
					v2y -= p2y;
				}
				var cross = v1x * v2y - v1y * v2x;
				if (!Numerical.isZero(cross)) {
					var dx = p1x - p2x,
						dy = p1y - p2y,
						u1 = (v2x * dy - v2y * dx) / cross,
						u2 = (v1x * dy - v1y * dx) / cross,
						epsilon = 1e-12,
						uMin = -epsilon,
						uMax = 1 + epsilon;
					if (isInfinite
							|| uMin < u1 && u1 < uMax && uMin < u2 && u2 < uMax) {
						if (!isInfinite) {
							u1 = u1 <= 0 ? 0 : u1 >= 1 ? 1 : u1;
						}
						return new Point(
								p1x + u1 * v1x,
								p1y + u1 * v1y);
					}
				}
			},
	
			getSide: function(px, py, vx, vy, x, y, asVector, isInfinite) {
				if (!asVector) {
					vx -= px;
					vy -= py;
				}
				var v2x = x - px,
					v2y = y - py,
					ccw = v2x * vy - v2y * vx;
				if (ccw === 0 && !isInfinite) {
					ccw = (v2x * vx + v2x * vx) / (vx * vx + vy * vy);
					if (ccw >= 0 && ccw <= 1)
						ccw = 0;
				}
				return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
			},
	
			getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
				if (!asVector) {
					vx -= px;
					vy -= py;
				}
				return vx === 0 ? vy > 0 ? x - px : px - x
					 : vy === 0 ? vx < 0 ? y - py : py - y
					 : ((x-px) * vy - (y-py) * vx) / Math.sqrt(vx * vx + vy * vy);
			}
		}
	});
	
	var Project = PaperScopeItem.extend({
		_class: 'Project',
		_list: 'projects',
		_reference: 'project',
		_compactSerialize: true,
	
		initialize: function Project(element) {
			PaperScopeItem.call(this, true);
			this._children = [];
			this._namedChildren = {};
			this._activeLayer = null;
			this._currentStyle = new Style(null, null, this);
			this._view = View.create(this,
					element || CanvasProvider.getCanvas(1, 1));
			this._selectionItems = {};
			this._selectionCount = 0;
			this._updateVersion = 0;
		},
	
		_serialize: function(options, dictionary) {
			return Base.serialize(this._children, options, true, dictionary);
		},
	
		_changed: function(flags, item) {
			if (flags & 1) {
				var view = this._view;
				if (view) {
					view._needsUpdate = true;
					if (!view._requested && view._autoUpdate)
						view.requestUpdate();
				}
			}
			var changes = this._changes;
			if (changes && item) {
				var changesById = this._changesById,
					id = item._id,
					entry = changesById[id];
				if (entry) {
					entry.flags |= flags;
				} else {
					changes.push(changesById[id] = { item: item, flags: flags });
				}
			}
		},
	
		clear: function() {
			var children = this._children;
			for (var i = children.length - 1; i >= 0; i--)
				children[i].remove();
		},
	
		isEmpty: function() {
			return this._children.length === 0;
		},
	
		remove: function remove() {
			if (!remove.base.call(this))
				return false;
			if (this._view)
				this._view.remove();
			return true;
		},
	
		getView: function() {
			return this._view;
		},
	
		getCurrentStyle: function() {
			return this._currentStyle;
		},
	
		setCurrentStyle: function(style) {
			this._currentStyle.initialize(style);
		},
	
		getIndex: function() {
			return this._index;
		},
	
		getOptions: function() {
			return this._scope.settings;
		},
	
		getLayers: function() {
			return this._children;
		},
	
		getActiveLayer: function() {
			return this._activeLayer || new Layer({ project: this, insert: true });
		},
	
		getSymbolDefinitions: function() {
			var definitions = [],
				ids = {};
			this.getItems({
				class: SymbolItem,
				match: function(item) {
					var definition = item._definition,
						id = definition._id;
					if (!ids[id]) {
						ids[id] = true;
						definitions.push(definition);
					}
					return false;
				}
			});
			return definitions;
		},
	
		getSymbols: 'getSymbolDefinitions',
	
		getSelectedItems: function() {
			var selectionItems = this._selectionItems,
				items = [];
			for (var id in selectionItems) {
				var item = selectionItems[id],
					selection = item._selection;
				if (selection & 1 && item.isInserted()) {
					items.push(item);
				} else if (!selection) {
					this._updateSelection(item);
				}
			}
			return items;
		},
	
		_updateSelection: function(item) {
			var id = item._id,
				selectionItems = this._selectionItems;
			if (item._selection) {
				if (selectionItems[id] !== item) {
					this._selectionCount++;
					selectionItems[id] = item;
				}
			} else if (selectionItems[id] === item) {
				this._selectionCount--;
				delete selectionItems[id];
			}
		},
	
		selectAll: function() {
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++)
				children[i].setFullySelected(true);
		},
	
		deselectAll: function() {
			var selectionItems = this._selectionItems;
			for (var i in selectionItems)
				selectionItems[i].setFullySelected(false);
		},
	
		addLayer: function(layer) {
			return this.insertLayer(undefined, layer);
		},
	
		insertLayer: function(index, layer) {
			if (layer instanceof Layer) {
				layer._remove(false, true);
				Base.splice(this._children, [layer], index, 0);
				layer._setProject(this, true);
				var name = layer._name;
				if (name)
					layer.setName(name);
				if (this._changes)
					layer._changed(5);
				if (!this._activeLayer)
					this._activeLayer = layer;
			} else {
				layer = null;
			}
			return layer;
		},
	
		_insertItem: function(index, item, _preserve, _created) {
			item = this.insertLayer(index, item)
					|| (this._activeLayer || this._insertItem(undefined,
							new Layer(Item.NO_INSERT), true, true))
							.insertChild(index, item, _preserve);
			if (_created && item.activate)
				item.activate();
			return item;
		},
	
		getItems: function(options) {
			return Item._getItems(this, options);
		},
	
		getItem: function(options) {
			return Item._getItems(this, options, null, null, true)[0] || null;
		},
	
		importJSON: function(json) {
			this.activate();
			var layer = this._activeLayer;
			return Base.importJSON(json, layer && layer.isEmpty() && layer);
		},
	
		removeOn: function(type) {
			var sets = this._removeSets;
			if (sets) {
				if (type === 'mouseup')
					sets.mousedrag = null;
				var set = sets[type];
				if (set) {
					for (var id in set) {
						var item = set[id];
						for (var key in sets) {
							var other = sets[key];
							if (other && other != set)
								delete other[item._id];
						}
						item.remove();
					}
					sets[type] = null;
				}
			}
		},
	
		draw: function(ctx, matrix, pixelRatio) {
			this._updateVersion++;
			ctx.save();
			matrix.applyToContext(ctx);
			var children = this._children,
				param = new Base({
					offset: new Point(0, 0),
					pixelRatio: pixelRatio,
					viewMatrix: matrix.isIdentity() ? null : matrix,
					matrices: [new Matrix()],
					updateMatrix: true
				});
			for (var i = 0, l = children.length; i < l; i++) {
				children[i].draw(ctx, param);
			}
			ctx.restore();
	
			if (this._selectionCount > 0) {
				ctx.save();
				ctx.strokeWidth = 1;
				var items = this._selectionItems,
					size = this._scope.settings.handleSize,
					version = this._updateVersion;
				for (var id in items) {
					items[id]._drawSelection(ctx, matrix, size, items, version);
				}
				ctx.restore();
			}
		}
	});
	
	var Item = Base.extend(Emitter, {
		statics: {
			extend: function extend(src) {
				if (src._serializeFields)
					src._serializeFields = Base.set({},
						this.prototype._serializeFields, src._serializeFields);
				return extend.base.apply(this, arguments);
			},
	
			NO_INSERT: { insert: false }
		},
	
		_class: 'Item',
		_name: null,
		_applyMatrix: true,
		_canApplyMatrix: true,
		_canScaleStroke: false,
		_pivot: null,
		_visible: true,
		_blendMode: 'normal',
		_opacity: 1,
		_locked: false,
		_guide: false,
		_clipMask: false,
		_selection: 0,
		_selectBounds: true,
		_selectChildren: false,
		_serializeFields: {
			name: null,
			applyMatrix: null,
			matrix: new Matrix(),
			pivot: null,
			visible: true,
			blendMode: 'normal',
			opacity: 1,
			locked: false,
			guide: false,
			clipMask: false,
			selected: false,
			data: {}
		}
	},
	new function() {
		var handlers = ['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
				'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'];
		return Base.each(handlers,
			function(name) {
				this._events[name] = {
					install: function(type) {
						this.getView()._countItemEvent(type, 1);
					},
	
					uninstall: function(type) {
						this.getView()._countItemEvent(type, -1);
					}
				};
			}, {
				_events: {
					onFrame: {
						install: function() {
							this.getView()._animateItem(this, true);
						},
	
						uninstall: function() {
							this.getView()._animateItem(this, false);
						}
					},
	
					onLoad: {},
					onError: {}
				},
				statics: {
					_itemHandlers: handlers
				}
			}
		);
	}, {
		initialize: function Item() {
		},
	
		_initialize: function(props, point) {
			var hasProps = props && Base.isPlainObject(props),
				internal = hasProps && props.internal === true,
				matrix = this._matrix = new Matrix(),
				project = hasProps && props.project || paper.project,
				settings = paper.settings;
			this._id = internal ? null : UID.get();
			this._parent = this._index = null;
			this._applyMatrix = this._canApplyMatrix && settings.applyMatrix;
			if (point)
				matrix.translate(point);
			matrix._owner = this;
			this._style = new Style(project._currentStyle, this, project);
			if (internal || hasProps && props.insert === false
				|| !settings.insertItems && !(hasProps && props.insert === true)) {
				this._setProject(project);
			} else {
				(hasProps && props.parent || project)
						._insertItem(undefined, this, true, true);
			}
			if (hasProps && props !== Item.NO_INSERT) {
				Base.filter(this, props, {
					internal: true, insert: true, project: true, parent: true
				});
			}
			return hasProps;
		},
	
		_serialize: function(options, dictionary) {
			var props = {},
				that = this;
	
			function serialize(fields) {
				for (var key in fields) {
					var value = that[key];
					if (!Base.equals(value, key === 'leading'
							? fields.fontSize * 1.2 : fields[key])) {
						props[key] = Base.serialize(value, options,
								key !== 'data', dictionary);
					}
				}
			}
	
			serialize(this._serializeFields);
			if (!(this instanceof Group))
				serialize(this._style._defaults);
			return [ this._class, props ];
		},
	
		_changed: function(flags) {
			var symbol = this._parentSymbol,
				cacheParent = this._parent || symbol,
				project = this._project;
			if (flags & 8) {
				this._bounds = this._position = this._decomposed =
						this._globalMatrix = undefined;
			}
			if (cacheParent
					&& (flags & 40)) {
				Item._clearBoundsCache(cacheParent);
			}
			if (flags & 2) {
				Item._clearBoundsCache(this);
			}
			if (project)
				project._changed(flags, this);
			if (symbol)
				symbol._changed(flags);
		},
	
		set: function(props) {
			if (props)
				this._set(props);
			return this;
		},
	
		getId: function() {
			return this._id;
		},
	
		getName: function() {
			return this._name;
		},
	
		setName: function(name) {
	
			if (this._name)
				this._removeNamed();
			if (name === (+name) + '')
				throw new Error(
						'Names consisting only of numbers are not supported.');
			var owner = this._getOwner();
			if (name && owner) {
				var children = owner._children,
					namedChildren = owner._namedChildren;
				(namedChildren[name] = namedChildren[name] || []).push(this);
				if (!(name in children))
					children[name] = this;
			}
			this._name = name || undefined;
			this._changed(128);
		},
	
		getStyle: function() {
			return this._style;
		},
	
		setStyle: function(style) {
			this.getStyle().set(style);
		}
	}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
		function(name) {
			var part = Base.capitalize(name),
				name = '_' + name;
			this['get' + part] = function() {
				return this[name];
			};
			this['set' + part] = function(value) {
				if (value != this[name]) {
					this[name] = value;
					this._changed(name === '_locked'
							? 128 : 129);
				}
			};
		},
	{}), {
		beans: true,
	
		getSelection: function() {
			return this._selection;
		},
	
		setSelection: function(selection) {
			if (selection !== this._selection) {
				this._selection = selection;
				var project = this._project;
				if (project) {
					project._updateSelection(this);
					this._changed(129);
				}
			}
		},
	
		changeSelection: function(flag, selected) {
			var selection = this._selection;
			this.setSelection(selected ? selection | flag : selection & ~flag);
		},
	
		isSelected: function() {
			if (this._selectChildren) {
				var children = this._children;
				for (var i = 0, l = children.length; i < l; i++)
					if (children[i].isSelected())
						return true;
			}
			return !!(this._selection & 1);
		},
	
		setSelected: function(selected) {
			if (this._selectChildren) {
				var children = this._children;
				for (var i = 0, l = children.length; i < l; i++)
					children[i].setSelected(selected);
			}
			this.changeSelection(1, selected);
		},
	
		isFullySelected: function() {
			var children = this._children,
				selected = !!(this._selection & 1);
			if (children && selected) {
				for (var i = 0, l = children.length; i < l; i++)
					if (!children[i].isFullySelected())
						return false;
				return true;
			}
			return selected;
		},
	
		setFullySelected: function(selected) {
			var children = this._children;
			if (children) {
				for (var i = 0, l = children.length; i < l; i++)
					children[i].setFullySelected(selected);
			}
			this.changeSelection(1, selected);
		},
	
		isClipMask: function() {
			return this._clipMask;
		},
	
		setClipMask: function(clipMask) {
			if (this._clipMask != (clipMask = !!clipMask)) {
				this._clipMask = clipMask;
				if (clipMask) {
					this.setFillColor(null);
					this.setStrokeColor(null);
				}
				this._changed(129);
				if (this._parent)
					this._parent._changed(1024);
			}
		},
	
		getData: function() {
			if (!this._data)
				this._data = {};
			return this._data;
		},
	
		setData: function(data) {
			this._data = data;
		},
	
		getPosition: function(_dontLink) {
			var position = this._position,
				ctor = _dontLink ? Point : LinkedPoint;
			if (!position) {
				var pivot = this._pivot;
				position = this._position = pivot
						? this._matrix._transformPoint(pivot)
						: this.getBounds().getCenter(true);
			}
			return new ctor(position.x, position.y, this, 'setPosition');
		},
	
		setPosition: function() {
			this.translate(Point.read(arguments).subtract(this.getPosition(true)));
		},
	
		getPivot: function(_dontLink) {
			var pivot = this._pivot;
			if (pivot) {
				var ctor = _dontLink ? Point : LinkedPoint;
				pivot = new ctor(pivot.x, pivot.y, this, 'setPivot');
			}
			return pivot;
		},
	
		setPivot: function() {
			this._pivot = Point.read(arguments, 0, { clone: true, readNull: true });
			this._position = undefined;
		}
	}, Base.each({
			getStrokeBounds: { stroke: true },
			getHandleBounds: { handle: true },
			getInternalBounds: { internal: true }
		},
		function(options, key) {
			this[key] = function(matrix) {
				return this.getBounds(matrix, options);
			};
		},
	{
		beans: true,
	
		getBounds: function(matrix, options) {
			var hasMatrix = options || matrix instanceof Matrix,
				opts = Base.set({}, hasMatrix ? options : matrix,
						this._boundsOptions);
			if (!opts.stroke || this.getStrokeScaling())
				opts.cacheItem = this;
			var bounds = this._getCachedBounds(hasMatrix && matrix, opts);
			return arguments.length === 0
					? new LinkedRectangle(bounds.x, bounds.y, bounds.width,
							bounds.height, this, 'setBounds')
					: bounds;
		},
	
		setBounds: function() {
			var rect = Rectangle.read(arguments),
				bounds = this.getBounds(),
				_matrix = this._matrix,
				matrix = new Matrix(),
				center = rect.getCenter();
			matrix.translate(center);
			if (rect.width != bounds.width || rect.height != bounds.height) {
				if (!_matrix.isInvertible()) {
					_matrix.initialize(_matrix._backup
							|| new Matrix().translate(_matrix.getTranslation()));
					bounds = this.getBounds();
				}
				matrix.scale(
						bounds.width !== 0 ? rect.width / bounds.width : 0,
						bounds.height !== 0 ? rect.height / bounds.height : 0);
			}
			center = bounds.getCenter();
			matrix.translate(-center.x, -center.y);
			this.transform(matrix);
		},
	
		_getBounds: function(matrix, options) {
			var children = this._children;
			if (!children || children.length === 0)
				return new Rectangle();
			Item._updateBoundsCache(this, options.cacheItem);
			return Item._getBounds(children, matrix, options);
		},
	
		_getCachedBounds: function(matrix, options) {
			matrix = matrix && matrix._orNullIfIdentity();
			var internal = options.internal,
				cacheItem = options.cacheItem,
				_matrix = internal ? null : this._matrix._orNullIfIdentity(),
				cacheKey = cacheItem && (!matrix || matrix.equals(_matrix)) && [
					options.stroke ? 1 : 0,
					options.handle ? 1 : 0,
					internal ? 1 : 0
				].join('');
			Item._updateBoundsCache(this._parent || this._parentSymbol, cacheItem);
			if (cacheKey && this._bounds && cacheKey in this._bounds)
				return this._bounds[cacheKey].rect.clone();
			var bounds = this._getBounds(matrix || _matrix, options);
			if (cacheKey) {
				if (!this._bounds)
					this._bounds = {};
				var cached = this._bounds[cacheKey] = {
					rect: bounds.clone(),
					internal: options.internal
				};
			}
			return bounds;
		},
	
		_getStrokeMatrix: function(matrix, options) {
			return this.getStrokeScaling() ? matrix : (options && options.internal
					? this : this._parent).getViewMatrix().invert()._shiftless();
		},
	
		statics: {
			_updateBoundsCache: function(parent, item) {
				if (parent && item) {
					var id = item._id,
						ref = parent._boundsCache = parent._boundsCache || {
							ids: {},
							list: []
						};
					if (!ref.ids[id]) {
						ref.list.push(item);
						ref.ids[id] = item;
					}
				}
			},
	
			_clearBoundsCache: function(item) {
				var cache = item._boundsCache;
				if (cache) {
					item._bounds = item._position = item._boundsCache = undefined;
					for (var i = 0, list = cache.list, l = list.length; i < l; i++){
						var other = list[i];
						if (other !== item) {
							other._bounds = other._position = undefined;
							if (other._boundsCache)
								Item._clearBoundsCache(other);
						}
					}
				}
			},
	
			_getBounds: function(items, matrix, options) {
				var x1 = Infinity,
					x2 = -x1,
					y1 = x1,
					y2 = x2;
				options = options || {};
				for (var i = 0, l = items.length; i < l; i++) {
					var item = items[i];
					if (item._visible && !item.isEmpty()) {
						var rect = item._getCachedBounds(
							matrix && matrix.appended(item._matrix), options);
						x1 = Math.min(rect.x, x1);
						y1 = Math.min(rect.y, y1);
						x2 = Math.max(rect.x + rect.width, x2);
						y2 = Math.max(rect.y + rect.height, y2);
					}
				}
				return isFinite(x1)
						? new Rectangle(x1, y1, x2 - x1, y2 - y1)
						: new Rectangle();
			}
		}
	
	}), {
		beans: true,
	
		_decompose: function() {
			return this._decomposed || (this._decomposed = this._matrix.decompose());
		},
	
		getRotation: function() {
			var decomposed = this._decompose();
			return decomposed && decomposed.rotation;
		},
	
		setRotation: function(rotation) {
			var current = this.getRotation();
			if (current != null && rotation != null) {
				var decomposed = this._decomposed;
				this.rotate(rotation - current);
				decomposed.rotation = rotation;
				this._decomposed = decomposed;
			}
		},
	
		getScaling: function(_dontLink) {
			var decomposed = this._decompose(),
				scaling = decomposed && decomposed.scaling,
				ctor = _dontLink ? Point : LinkedPoint;
			return scaling && new ctor(scaling.x, scaling.y, this, 'setScaling');
		},
	
		setScaling: function() {
			var current = this.getScaling();
			if (current) {
				var scaling = Point.read(arguments, 0, { clone: true }),
					decomposed = this._decomposed;
				this.scale(scaling.x / current.x, scaling.y / current.y);
				decomposed.scaling = scaling;
				this._decomposed = decomposed;
			}
		},
	
		getMatrix: function() {
			return this._matrix;
		},
	
		setMatrix: function() {
			var matrix = this._matrix;
			matrix.initialize.apply(matrix, arguments);
		},
	
		getGlobalMatrix: function(_dontClone) {
			var matrix = this._globalMatrix,
				updateVersion = this._project._updateVersion;
			if (matrix && matrix._updateVersion !== updateVersion)
				matrix = null;
			if (!matrix) {
				matrix = this._globalMatrix = this._matrix.clone();
				var parent = this._parent;
				if (parent)
					matrix.prepend(parent.getGlobalMatrix(true));
				matrix._updateVersion = updateVersion;
			}
			return _dontClone ? matrix : matrix.clone();
		},
	
		getViewMatrix: function() {
			return this.getGlobalMatrix().prepend(this.getView()._matrix);
		},
	
		getApplyMatrix: function() {
			return this._applyMatrix;
		},
	
		setApplyMatrix: function(apply) {
			if (this._applyMatrix = this._canApplyMatrix && !!apply)
				this.transform(null, true);
		},
	
		getTransformContent: '#getApplyMatrix',
		setTransformContent: '#setApplyMatrix',
	}, {
		getProject: function() {
			return this._project;
		},
	
		_setProject: function(project, installEvents) {
			if (this._project !== project) {
				if (this._project)
					this._installEvents(false);
				this._project = project;
				var children = this._children;
				for (var i = 0, l = children && children.length; i < l; i++)
					children[i]._setProject(project);
				installEvents = true;
			}
			if (installEvents)
				this._installEvents(true);
		},
	
		getView: function() {
			return this._project._view;
		},
	
		_installEvents: function _installEvents(install) {
			_installEvents.base.call(this, install);
			var children = this._children;
			for (var i = 0, l = children && children.length; i < l; i++)
				children[i]._installEvents(install);
		},
	
		getLayer: function() {
			var parent = this;
			while (parent = parent._parent) {
				if (parent instanceof Layer)
					return parent;
			}
			return null;
		},
	
		getParent: function() {
			return this._parent;
		},
	
		setParent: function(item) {
			return item.addChild(this);
		},
	
		_getOwner: '#getParent',
	
		getChildren: function() {
			return this._children;
		},
	
		setChildren: function(items, _preserve) {
			this.removeChildren();
			this.addChildren(items, _preserve);
		},
	
		getFirstChild: function() {
			return this._children && this._children[0] || null;
		},
	
		getLastChild: function() {
			return this._children && this._children[this._children.length - 1]
					|| null;
		},
	
		getNextSibling: function() {
			var owner = this._getOwner();
			return owner && owner._children[this._index + 1] || null;
		},
	
		getPreviousSibling: function() {
			var owner = this._getOwner();
			return owner && owner._children[this._index - 1] || null;
		},
	
		getIndex: function() {
			return this._index;
		},
	
		equals: function(item) {
			return item === this || item && this._class === item._class
					&& this._style.equals(item._style)
					&& this._matrix.equals(item._matrix)
					&& this._locked === item._locked
					&& this._visible === item._visible
					&& this._blendMode === item._blendMode
					&& this._opacity === item._opacity
					&& this._clipMask === item._clipMask
					&& this._guide === item._guide
					&& this._equals(item)
					|| false;
		},
	
		_equals: function(item) {
			return Base.equals(this._children, item._children);
		},
	
		clone: function(options) {
			var copy = new this.constructor(Item.NO_INSERT),
				children = this._children,
				insert = Base.pick(options ? options.insert : undefined,
						options === undefined || options === true),
				deep = Base.pick(options ? options.deep : undefined, true);
			if (children)
				copy.copyAttributes(this);
			if (!children || deep)
				copy.copyContent(this);
			if (!children)
				copy.copyAttributes(this);
			if (insert)
				copy.insertAbove(this);
			var name = this._name,
				parent = this._parent;
			if (name && parent) {
				var children = parent._children,
					orig = name,
					i = 1;
				while (children[name])
					name = orig + ' ' + (i++);
				if (name !== orig)
					copy.setName(name);
			}
			return copy;
		},
	
		copyContent: function(source) {
			var children = source._children;
			for (var i = 0, l = children && children.length; i < l; i++) {
				this.addChild(children[i].clone(false), true);
			}
		},
	
		copyAttributes: function(source, excludeMatrix) {
			this.setStyle(source._style);
			var keys = ['_locked', '_visible', '_blendMode', '_opacity',
					'_clipMask', '_guide'];
			for (var i = 0, l = keys.length; i < l; i++) {
				var key = keys[i];
				if (source.hasOwnProperty(key))
					this[key] = source[key];
			}
			if (!excludeMatrix)
				this._matrix.initialize(source._matrix);
			this.setApplyMatrix(source._applyMatrix);
			this.setPivot(source._pivot);
			this.setSelection(source._selection);
			var data = source._data,
				name = source._name;
			this._data = data ? Base.clone(data) : null;
			if (name)
				this.setName(name);
		},
	
		rasterize: function(resolution, insert) {
			var bounds = this.getStrokeBounds(),
				scale = (resolution || this.getView().getResolution()) / 72,
				topLeft = bounds.getTopLeft().floor(),
				bottomRight = bounds.getBottomRight().ceil(),
				size = new Size(bottomRight.subtract(topLeft)),
				raster = new Raster(Item.NO_INSERT);
			if (!size.isZero()) {
				var canvas = CanvasProvider.getCanvas(size.multiply(scale)),
					ctx = canvas.getContext('2d'),
					matrix = new Matrix().scale(scale).translate(topLeft.negate());
				ctx.save();
				matrix.applyToContext(ctx);
				this.draw(ctx, new Base({ matrices: [matrix] }));
				ctx.restore();
				raster.setCanvas(canvas);
			}
			raster.transform(new Matrix().translate(topLeft.add(size.divide(2)))
					.scale(1 / scale));
			if (insert === undefined || insert)
				raster.insertAbove(this);
			return raster;
		},
	
		contains: function() {
			return !!this._contains(
					this._matrix._inverseTransform(Point.read(arguments)));
		},
	
		_contains: function(point) {
			var children = this._children;
			if (children) {
				for (var i = children.length - 1; i >= 0; i--) {
					if (children[i].contains(point))
						return true;
				}
				return false;
			}
			return point.isInside(this.getInternalBounds());
		},
	
		isInside: function() {
			return Rectangle.read(arguments).contains(this.getBounds());
		},
	
		_asPathItem: function() {
			return new Path.Rectangle({
				rectangle: this.getInternalBounds(),
				matrix: this._matrix,
				insert: false,
			});
		},
	
		intersects: function(item, _matrix) {
			if (!(item instanceof Item))
				return false;
			return this._asPathItem().getIntersections(item._asPathItem(), null,
					_matrix, true).length > 0;
		}
	},
	new function() {
		function hitTest() {
			return this._hitTest(
					Point.read(arguments),
					HitResult.getOptions(arguments));
		}
	
		function hitTestAll() {
			var point = Point.read(arguments),
				options = HitResult.getOptions(arguments),
				callback = options.match,
				results = [];
			options = Base.set({}, options, {
				match: function(hit) {
					if (!callback || callback(hit))
						results.push(hit);
				}
			});
			this._hitTest(point, options);
			return results;
		}
	
		function hitTestChildren(point, options, viewMatrix, _exclude) {
			var children = this._children;
			if (children) {
				for (var i = children.length - 1; i >= 0; i--) {
					var child = children[i];
					var res = child !== _exclude && child._hitTest(point, options,
							viewMatrix);
					if (res)
						return res;
				}
			}
			return null;
		}
	
		Project.inject({
			hitTest: hitTest,
			hitTestAll: hitTestAll,
			_hitTest: hitTestChildren
		});
	
		return {
			hitTest: hitTest,
			hitTestAll: hitTestAll,
			_hitTestChildren: hitTestChildren,
		};
	}, {
	
		_hitTest: function(point, options, parentViewMatrix) {
			if (this._locked || !this._visible || this._guide && !options.guides
					|| this.isEmpty()) {
				return null;
			}
	
			var matrix = this._matrix,
				viewMatrix = parentViewMatrix
						? parentViewMatrix.appended(matrix)
						: this.getGlobalMatrix().prepend(this.getView()._matrix),
				strokeMatrix = viewMatrix.inverted(),
				tolerance = Math.max(options.tolerance, 1e-6),
				tolerancePadding = options._tolerancePadding = new Size(
						Path._getStrokePadding(tolerance, strokeMatrix));
			point = matrix._inverseTransform(point);
			if (!point || !this._children &&
				!this.getBounds({ internal: true, stroke: true, handle: true })
					.expand(tolerancePadding.multiply(2))._containsPoint(point)) {
				return null;
			}
	
			var checkSelf = !(options.guides && !this._guide
					|| options.selected && !this.isSelected()
					|| options.type && options.type !== Base.hyphenate(this._class)
					|| options.class && !(this instanceof options.class)),
				callback = options.match,
				that = this,
				res;
	
			function match(hit) {
				return !callback || hit && callback(hit) ? hit : null;
			}
	
			function checkBounds(type, part) {
				var pt = bounds['get' + part]();
				if (point.subtract(pt).divide(tolerancePadding).length <= 1) {
					return new HitResult(type, that,
							{ name: Base.hyphenate(part), point: pt });
				}
			}
	
			if (checkSelf && (options.center || options.bounds) && this._parent) {
				var bounds = this.getInternalBounds();
				if (options.center) {
					res = checkBounds('center', 'Center');
				}
				if (!res && options.bounds) {
					var points = [
						'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
						'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'
					];
					for (var i = 0; i < 8 && !res; i++) {
						res = checkBounds('bounds', points[i]);
					}
				}
				res = match(res);
			}
	
			if (!res) {
				res = this._hitTestChildren(point, options, viewMatrix)
					|| checkSelf
						&& match(this._hitTestSelf(point, options, viewMatrix,
							strokeMatrix))
					|| null;
			}
			if (res && res.point) {
				res.point = matrix.transform(res.point);
			}
			return res;
		},
	
		_hitTestSelf: function(point, options) {
			if (options.fill && this.hasFill() && this._contains(point))
				return new HitResult('fill', this);
		},
	
		matches: function(name, compare) {
			function matchObject(obj1, obj2) {
				for (var i in obj1) {
					if (obj1.hasOwnProperty(i)) {
						var val1 = obj1[i],
							val2 = obj2[i];
						if (Base.isPlainObject(val1) && Base.isPlainObject(val2)) {
							if (!matchObject(val1, val2))
								return false;
						} else if (!Base.equals(val1, val2)) {
							return false;
						}
					}
				}
				return true;
			}
			var type = typeof name;
			if (type === 'object') {
				for (var key in name) {
					if (name.hasOwnProperty(key) && !this.matches(key, name[key]))
						return false;
				}
				return true;
			} else if (type === 'function') {
				return name(this);
			} else if (name === 'match') {
				return compare(this);
			} else {
				var value = /^(empty|editable)$/.test(name)
						? this['is' + Base.capitalize(name)]()
						: name === 'type'
							? Base.hyphenate(this._class)
							: this[name];
				if (name === 'class') {
					if (typeof compare === 'function')
						return this instanceof compare;
					value = this._class;
				}
				if (typeof compare === 'function') {
					return !!compare(value);
				} else if (compare) {
					if (compare.test) {
						return compare.test(value);
					} else if (Base.isPlainObject(compare)) {
						return matchObject(compare, value);
					}
				}
				return Base.equals(value, compare);
			}
		},
	
		getItems: function(options) {
			return Item._getItems(this, options, this._matrix);
		},
	
		getItem: function(options) {
			return Item._getItems(this, options, this._matrix, null, true)[0]
					|| null;
		},
	
		statics: {
			_getItems: function _getItems(item, options, matrix, param, firstOnly) {
				if (!param) {
					var obj = typeof options === 'object' && options,
						overlapping = obj && obj.overlapping,
						inside = obj && obj.inside,
						bounds = overlapping || inside,
						rect = bounds && Rectangle.read([bounds]);
					param = {
						items: [],
						recursive: obj && obj.recursive !== false,
						inside: !!inside,
						overlapping: !!overlapping,
						rect: rect,
						path: overlapping && new Path.Rectangle({
							rectangle: rect,
							insert: false
						})
					};
					if (obj) {
						options = Base.filter({}, options, {
							recursive: true, inside: true, overlapping: true
						});
					}
				}
				var children = item._children,
					items = param.items,
					rect = param.rect;
				matrix = rect && (matrix || new Matrix());
				for (var i = 0, l = children && children.length; i < l; i++) {
					var child = children[i],
						childMatrix = matrix && matrix.appended(child._matrix),
						add = true;
					if (rect) {
						var bounds = child.getBounds(childMatrix);
						if (!rect.intersects(bounds))
							continue;
						if (!(rect.contains(bounds)
								|| param.overlapping && (bounds.contains(rect)
									|| param.path.intersects(child, childMatrix))))
							add = false;
					}
					if (add && child.matches(options)) {
						items.push(child);
						if (firstOnly)
							break;
					}
					if (param.recursive !== false) {
						_getItems(child, options, childMatrix, param, firstOnly);
					}
					if (firstOnly && items.length > 0)
						break;
				}
				return items;
			}
		}
	}, {
	
		importJSON: function(json) {
			var res = Base.importJSON(json, this);
			return res !== this ? this.addChild(res) : res;
		},
	
		addChild: function(item, _preserve) {
			return this.insertChild(undefined, item, _preserve);
		},
	
		insertChild: function(index, item, _preserve) {
			var res = item ? this.insertChildren(index, [item], _preserve) : null;
			return res && res[0];
		},
	
		addChildren: function(items, _preserve) {
			return this.insertChildren(this._children.length, items, _preserve);
		},
	
		insertChildren: function(index, items, _preserve, _proto) {
			var children = this._children;
			if (children && items && items.length > 0) {
				items = Array.prototype.slice.apply(items);
				for (var i = items.length - 1; i >= 0; i--) {
					var item = items[i];
					if (_proto && !(item instanceof _proto)) {
						items.splice(i, 1);
					} else {
						var owner = item._getOwner(),
							shift = owner === this && item._index < index;
						if (owner && item._remove(false, true) && shift)
							index--;
					}
				}
				Base.splice(children, items, index, 0);
				var project = this._project,
					notifySelf = project && project._changes;
				for (var i = 0, l = items.length; i < l; i++) {
					var item = items[i],
						name = item._name;
					item._parent = this;
					item._setProject(this._project, true);
					if (name)
						item.setName(name);
					if (notifySelf)
						this._changed(5);
				}
				this._changed(11);
			} else {
				items = null;
			}
			return items;
		},
	
		_insertItem: '#insertChild',
	
		insertAbove: function(item, _preserve) {
			var owner = item && item._getOwner();
			return owner ? owner._insertItem(item._index + 1, this, _preserve)
					: null;
		},
	
		insertBelow: function(item, _preserve) {
			var owner = item && item._getOwner();
			return owner ? owner._insertItem(item._index, this, _preserve) : null;
		},
	
		sendToBack: function() {
			var owner = this._getOwner();
			return owner ? owner._insertItem(0, this) : null;
		},
	
		bringToFront: function() {
			var owner = this._getOwner();
			return owner ? owner._insertItem(undefined, this) : null;
		},
	
		appendTop: '#addChild',
	
		appendBottom: function(item) {
			return this.insertChild(0, item);
		},
	
		moveAbove: '#insertAbove',
	
		moveBelow: '#insertBelow',
	
		copyTo: function(owner) {
			return owner._insertItem(undefined, this.clone(false));
		},
	
		reduce: function(options) {
			var children = this._children;
			if (children && children.length === 1) {
				var child = children[0].reduce(options);
				if (this._parent) {
					child.insertAbove(this);
					this.remove();
				} else {
					child.remove();
				}
				return child;
			}
			return this;
		},
	
		_removeNamed: function() {
			var owner = this._getOwner();
			if (owner) {
				var children = owner._children,
					namedChildren = owner._namedChildren,
					name = this._name,
					namedArray = namedChildren[name],
					index = namedArray ? namedArray.indexOf(this) : -1;
				if (index !== -1) {
					if (children[name] == this)
						delete children[name];
					namedArray.splice(index, 1);
					if (namedArray.length) {
						children[name] = namedArray[0];
					} else {
						delete namedChildren[name];
					}
				}
			}
		},
	
		_remove: function(notifySelf, notifyParent) {
			var owner = this._getOwner(),
				project = this._project,
				index = this._index;
			if (owner) {
				if (index != null) {
					if (project._activeLayer === this)
						project._activeLayer = this.getNextSibling()
								|| this.getPreviousSibling();
					Base.splice(owner._children, null, index, 1);
				}
				if (this._name)
					this._removeNamed();
				this._installEvents(false);
				if (notifySelf && project._changes)
					this._changed(5);
				if (notifyParent)
					owner._changed(11, this);
				this._parent = null;
				return true;
			}
			return false;
		},
	
		remove: function() {
			return this._remove(true, true);
		},
	
		replaceWith: function(item) {
			var ok = item && item.insertBelow(this);
			if (ok)
				this.remove();
			return ok;
		},
	
		removeChildren: function(start, end) {
			if (!this._children)
				return null;
			start = start || 0;
			end = Base.pick(end, this._children.length);
			var removed = Base.splice(this._children, null, start, end - start);
			for (var i = removed.length - 1; i >= 0; i--) {
				removed[i]._remove(true, false);
			}
			if (removed.length > 0)
				this._changed(11);
			return removed;
		},
	
		clear: '#removeChildren',
	
		reverseChildren: function() {
			if (this._children) {
				this._children.reverse();
				for (var i = 0, l = this._children.length; i < l; i++)
					this._children[i]._index = i;
				this._changed(11);
			}
		},
	
		isEmpty: function() {
			return !this._children || this._children.length === 0;
		},
	
		isEditable: function() {
			var item = this;
			while (item) {
				if (!item._visible || item._locked)
					return false;
				item = item._parent;
			}
			return true;
		},
	
		hasFill: function() {
			return this.getStyle().hasFill();
		},
	
		hasStroke: function() {
			return this.getStyle().hasStroke();
		},
	
		hasShadow: function() {
			return this.getStyle().hasShadow();
		},
	
		_getOrder: function(item) {
			function getList(item) {
				var list = [];
				do {
					list.unshift(item);
				} while (item = item._parent);
				return list;
			}
			var list1 = getList(this),
				list2 = getList(item);
			for (var i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
				if (list1[i] != list2[i]) {
					return list1[i]._index < list2[i]._index ? 1 : -1;
				}
			}
			return 0;
		},
	
		hasChildren: function() {
			return this._children && this._children.length > 0;
		},
	
		isInserted: function() {
			return this._parent ? this._parent.isInserted() : false;
		},
	
		isAbove: function(item) {
			return this._getOrder(item) === -1;
		},
	
		isBelow: function(item) {
			return this._getOrder(item) === 1;
		},
	
		isParent: function(item) {
			return this._parent === item;
		},
	
		isChild: function(item) {
			return item && item._parent === this;
		},
	
		isDescendant: function(item) {
			var parent = this;
			while (parent = parent._parent) {
				if (parent === item)
					return true;
			}
			return false;
		},
	
		isAncestor: function(item) {
			return item ? item.isDescendant(this) : false;
		},
	
		isSibling: function(item) {
			return this._parent === item._parent;
		},
	
		isGroupedWith: function(item) {
			var parent = this._parent;
			while (parent) {
				if (parent._parent
					&& /^(Group|Layer|CompoundPath)$/.test(parent._class)
					&& item.isDescendant(parent))
						return true;
				parent = parent._parent;
			}
			return false;
		},
	
	}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
		var rotate = key === 'rotate';
		this[key] = function() {
			var value = (rotate ? Base : Point).read(arguments),
				center = Point.read(arguments, 0, { readNull: true });
			return this.transform(new Matrix()[key](value,
					center || this.getPosition(true)));
		};
	}, {
		translate: function() {
			var mx = new Matrix();
			return this.transform(mx.translate.apply(mx, arguments));
		},
	
		transform: function(matrix, _applyMatrix, _applyRecursively,
				_setApplyMatrix) {
			if (matrix && matrix.isIdentity())
				matrix = null;
			var _matrix = this._matrix,
				applyMatrix = (_applyMatrix || this._applyMatrix)
						&& ((!_matrix.isIdentity() || matrix)
							|| _applyMatrix && _applyRecursively && this._children);
			if (!matrix && !applyMatrix)
				return this;
			if (matrix) {
				if (!matrix.isInvertible() && _matrix.isInvertible())
					_matrix._backup = _matrix.getValues();
				_matrix.prepend(matrix);
			}
			if (applyMatrix = applyMatrix && this._transformContent(_matrix,
						_applyRecursively, _setApplyMatrix)) {
				var pivot = this._pivot,
					style = this._style,
					fillColor = style.getFillColor(true),
					strokeColor = style.getStrokeColor(true);
				if (pivot)
					_matrix._transformPoint(pivot, pivot, true);
				if (fillColor)
					fillColor.transform(_matrix);
				if (strokeColor)
					strokeColor.transform(_matrix);
				_matrix.reset(true);
				if (_setApplyMatrix && this._canApplyMatrix)
					this._applyMatrix = true;
			}
			var bounds = this._bounds,
				position = this._position;
			this._changed(9);
			var decomp = bounds && matrix && matrix.decompose();
			if (decomp && !decomp.shearing && decomp.rotation % 90 === 0) {
				for (var key in bounds) {
					var cache = bounds[key];
					if (applyMatrix || !cache.internal) {
						var rect = cache.rect;
						matrix._transformBounds(rect, rect);
					}
				}
				var getter = this._boundsGetter,
					rect = bounds[getter && getter.getBounds || getter || 'getBounds'];
				if (rect)
					this._position = rect.getCenter(true);
				this._bounds = bounds;
			} else if (matrix && position) {
				this._position = matrix._transformPoint(position, position);
			}
			return this;
		},
	
		_transformContent: function(matrix, applyRecursively, setApplyMatrix) {
			var children = this._children;
			if (children) {
				for (var i = 0, l = children.length; i < l; i++)
					children[i].transform(matrix, true, applyRecursively,
							setApplyMatrix);
				return true;
			}
		},
	
		globalToLocal: function() {
			return this.getGlobalMatrix(true)._inverseTransform(
					Point.read(arguments));
		},
	
		localToGlobal: function() {
			return this.getGlobalMatrix(true)._transformPoint(
					Point.read(arguments));
		},
	
		parentToLocal: function() {
			return this._matrix._inverseTransform(Point.read(arguments));
		},
	
		localToParent: function() {
			return this._matrix._transformPoint(Point.read(arguments));
		},
	
		fitBounds: function(rectangle, fill) {
			rectangle = Rectangle.read(arguments);
			var bounds = this.getBounds(),
				itemRatio = bounds.height / bounds.width,
				rectRatio = rectangle.height / rectangle.width,
				scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
						? rectangle.width / bounds.width
						: rectangle.height / bounds.height,
				newBounds = new Rectangle(new Point(),
						new Size(bounds.width * scale, bounds.height * scale));
			newBounds.setCenter(rectangle.getCenter());
			this.setBounds(newBounds);
		}
	}), {
	
		_setStyles: function(ctx, param, viewMatrix) {
			var style = this._style;
			if (style.hasFill()) {
				ctx.fillStyle = style.getFillColor().toCanvasStyle(ctx);
			}
			if (style.hasStroke()) {
				ctx.strokeStyle = style.getStrokeColor().toCanvasStyle(ctx);
				ctx.lineWidth = style.getStrokeWidth();
				var strokeJoin = style.getStrokeJoin(),
					strokeCap = style.getStrokeCap(),
					miterLimit = style.getMiterLimit();
				if (strokeJoin)
					ctx.lineJoin = strokeJoin;
				if (strokeCap)
					ctx.lineCap = strokeCap;
				if (miterLimit)
					ctx.miterLimit = miterLimit;
				if (paper.support.nativeDash) {
					var dashArray = style.getDashArray(),
						dashOffset = style.getDashOffset();
					if (dashArray && dashArray.length) {
						if ('setLineDash' in ctx) {
							ctx.setLineDash(dashArray);
							ctx.lineDashOffset = dashOffset;
						} else {
							ctx.mozDash = dashArray;
							ctx.mozDashOffset = dashOffset;
						}
					}
				}
			}
			if (style.hasShadow()) {
				var pixelRatio = param.pixelRatio || 1,
					mx = viewMatrix._shiftless().prepend(
						new Matrix().scale(pixelRatio, pixelRatio)),
					blur = mx.transform(new Point(style.getShadowBlur(), 0)),
					offset = mx.transform(this.getShadowOffset());
				ctx.shadowColor =  style.getShadowColor().toCanvasStyle(ctx);
				ctx.shadowBlur = blur.getLength();
				ctx.shadowOffsetX = offset.x;
				ctx.shadowOffsetY = offset.y;
			}
		},
	
		draw: function(ctx, param, parentStrokeMatrix) {
			var updateVersion = this._updateVersion = this._project._updateVersion;
			if (!this._visible || this._opacity === 0)
				return;
			var matrices = param.matrices,
				viewMatrix = param.viewMatrix,
				matrix = this._matrix,
				globalMatrix = matrices[matrices.length - 1].appended(matrix);
			if (!globalMatrix.isInvertible())
				return;
	
			viewMatrix = viewMatrix ? viewMatrix.appended(globalMatrix)
					: globalMatrix;
	
			matrices.push(globalMatrix);
			if (param.updateMatrix) {
				globalMatrix._updateVersion = updateVersion;
				this._globalMatrix = globalMatrix;
			}
	
			var blendMode = this._blendMode,
				opacity = this._opacity,
				normalBlend = blendMode === 'normal',
				nativeBlend = BlendMode.nativeModes[blendMode],
				direct = normalBlend && opacity === 1
						|| param.dontStart
						|| param.clip
						|| (nativeBlend || normalBlend && opacity < 1)
							&& this._canComposite(),
				pixelRatio = param.pixelRatio || 1,
				mainCtx, itemOffset, prevOffset;
			if (!direct) {
				var bounds = this.getStrokeBounds(viewMatrix);
				if (!bounds.width || !bounds.height)
					return;
				prevOffset = param.offset;
				itemOffset = param.offset = bounds.getTopLeft().floor();
				mainCtx = ctx;
				ctx = CanvasProvider.getContext(bounds.getSize().ceil().add(1)
						.multiply(pixelRatio));
				if (pixelRatio !== 1)
					ctx.scale(pixelRatio, pixelRatio);
			}
			ctx.save();
			var strokeMatrix = parentStrokeMatrix
					? parentStrokeMatrix.appended(matrix)
					: this._canScaleStroke && !this.getStrokeScaling(true)
						&& viewMatrix,
				clip = !direct && param.clipItem,
				transform = !strokeMatrix || clip;
			if (direct) {
				ctx.globalAlpha = opacity;
				if (nativeBlend)
					ctx.globalCompositeOperation = blendMode;
			} else if (transform) {
				ctx.translate(-itemOffset.x, -itemOffset.y);
			}
			if (transform) {
				(direct ? matrix : viewMatrix).applyToContext(ctx);
			}
			if (clip) {
				param.clipItem.draw(ctx, param.extend({ clip: true }));
			}
			if (strokeMatrix) {
				ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
				var offset = param.offset;
				if (offset)
					ctx.translate(-offset.x, -offset.y);
			}
			this._draw(ctx, param, viewMatrix, strokeMatrix);
			ctx.restore();
			matrices.pop();
			if (param.clip && !param.dontFinish)
				ctx.clip();
			if (!direct) {
				BlendMode.process(blendMode, ctx, mainCtx, opacity,
						itemOffset.subtract(prevOffset).multiply(pixelRatio));
				CanvasProvider.release(ctx);
				param.offset = prevOffset;
			}
		},
	
		_isUpdated: function(updateVersion) {
			var parent = this._parent;
			if (parent instanceof CompoundPath)
				return parent._isUpdated(updateVersion);
			var updated = this._updateVersion === updateVersion;
			if (!updated && parent && parent._visible
					&& parent._isUpdated(updateVersion)) {
				this._updateVersion = updateVersion;
				updated = true;
			}
			return updated;
		},
	
		_drawSelection: function(ctx, matrix, size, selectionItems, updateVersion) {
			var selection = this._selection,
				itemSelected = selection & 1,
				boundsSelected = selection & 2
						|| itemSelected && this._selectBounds,
				positionSelected = selection & 4;
			if (!this._drawSelected)
				itemSelected = false;
			if ((itemSelected || boundsSelected || positionSelected)
					&& this._isUpdated(updateVersion)) {
				var layer,
					color = this.getSelectedColor(true) || (layer = this.getLayer())
						&& layer.getSelectedColor(true),
					mx = matrix.appended(this.getGlobalMatrix(true)),
					half = size / 2;
				ctx.strokeStyle = ctx.fillStyle = color
						? color.toCanvasStyle(ctx) : '#009dec';
				if (itemSelected)
					this._drawSelected(ctx, mx, selectionItems);
				if (positionSelected) {
					var point = this.getPosition(true),
						x = point.x,
						y = point.y;
					ctx.beginPath();
					ctx.arc(x, y, half, 0, Math.PI * 2, true);
					ctx.stroke();
					var deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]],
						start = half,
						end = size + 1;
					for (var i = 0; i < 4; i++) {
						var delta = deltas[i],
							dx = delta[0],
							dy = delta[1];
						ctx.moveTo(x + dx * start, y + dy * start);
						ctx.lineTo(x + dx * end, y + dy * end);
						ctx.stroke();
					}
				}
				if (boundsSelected) {
					var coords = mx._transformCorners(this.getInternalBounds());
					ctx.beginPath();
					for (var i = 0; i < 8; i++) {
						ctx[i === 0 ? 'moveTo' : 'lineTo'](coords[i], coords[++i]);
					}
					ctx.closePath();
					ctx.stroke();
					for (var i = 0; i < 8; i++) {
						ctx.fillRect(coords[i] - half, coords[++i] - half,
								size, size);
					}
				}
			}
		},
	
		_canComposite: function() {
			return false;
		}
	}, Base.each(['down', 'drag', 'up', 'move'], function(key) {
		this['removeOn' + Base.capitalize(key)] = function() {
			var hash = {};
			hash[key] = true;
			return this.removeOn(hash);
		};
	}, {
	
		removeOn: function(obj) {
			for (var name in obj) {
				if (obj[name]) {
					var key = 'mouse' + name,
						project = this._project,
						sets = project._removeSets = project._removeSets || {};
					sets[key] = sets[key] || {};
					sets[key][this._id] = this;
				}
			}
			return this;
		}
	}));
	
	var Group = Item.extend({
		_class: 'Group',
		_selectBounds: false,
		_selectChildren: true,
		_serializeFields: {
			children: []
		},
	
		initialize: function Group(arg) {
			this._children = [];
			this._namedChildren = {};
			if (!this._initialize(arg))
				this.addChildren(Array.isArray(arg) ? arg : arguments);
		},
	
		_changed: function _changed(flags) {
			_changed.base.call(this, flags);
			if (flags & 1026) {
				this._clipItem = undefined;
			}
		},
	
		_getClipItem: function() {
			var clipItem = this._clipItem;
			if (clipItem === undefined) {
				clipItem = null;
				var children = this._children;
				for (var i = 0, l = children.length; i < l; i++) {
					if (children[i]._clipMask) {
						clipItem = children[i];
						break;
					}
				}
				this._clipItem = clipItem;
			}
			return clipItem;
		},
	
		isClipped: function() {
			return !!this._getClipItem();
		},
	
		setClipped: function(clipped) {
			var child = this.getFirstChild();
			if (child)
				child.setClipMask(clipped);
		},
	
		_getBounds: function _getBounds(matrix, options) {
			var clipItem = this._getClipItem();
			return clipItem
				? clipItem._getCachedBounds(
					matrix && matrix.appended(clipItem._matrix),
					Base.set({}, options, { stroke: false }))
				: _getBounds.base.call(this, matrix, options);
		},
	
		_hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
			var clipItem = this._getClipItem();
			return (!clipItem || clipItem.contains(point))
					&& _hitTestChildren.base.call(this, point, options, viewMatrix,
						clipItem);
		},
	
		_draw: function(ctx, param) {
			var clip = param.clip,
				clipItem = !clip && this._getClipItem();
			param = param.extend({ clipItem: clipItem, clip: false });
			if (clip) {
				ctx.beginPath();
				param.dontStart = param.dontFinish = true;
			} else if (clipItem) {
				clipItem.draw(ctx, param.extend({ clip: true }));
			}
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++) {
				var item = children[i];
				if (item !== clipItem)
					item.draw(ctx, param);
			}
		}
	});
	
	var Layer = Group.extend({
		_class: 'Layer',
	
		initialize: function Layer() {
			Group.apply(this, arguments);
		},
	
		_getOwner: function() {
			return this._parent || this._index != null && this._project;
		},
	
		isInserted: function isInserted() {
			return this._parent ? isInserted.base.call(this) : this._index != null;
		},
	
		activate: function() {
			this._project._activeLayer = this;
		},
	
		_hitTestSelf: function() {
		}
	});
	
	var Shape = Item.extend({
		_class: 'Shape',
		_applyMatrix: false,
		_canApplyMatrix: false,
		_canScaleStroke: true,
		_serializeFields: {
			type: null,
			size: null,
			radius: null
		},
	
		initialize: function Shape(props) {
			this._initialize(props);
		},
	
		_equals: function(item) {
			return this._type === item._type
				&& this._size.equals(item._size)
				&& Base.equals(this._radius, item._radius);
		},
	
		copyContent: function(source) {
			this.setType(source._type);
			this.setSize(source._size);
			this.setRadius(source._radius);
		},
	
		getType: function() {
			return this._type;
		},
	
		setType: function(type) {
			this._type = type;
		},
	
		getShape: '#getType',
		setShape: '#setType',
	
		getSize: function() {
			var size = this._size;
			return new LinkedSize(size.width, size.height, this, 'setSize');
		},
	
		setSize: function() {
			var size = Size.read(arguments);
			if (!this._size) {
				this._size = size.clone();
			} else if (!this._size.equals(size)) {
				var type = this._type,
					width = size.width,
					height = size.height;
				if (type === 'rectangle') {
					var radius = Size.min(this._radius, size.divide(2));
					this._radius.set(radius.width, radius.height);
				} else if (type === 'circle') {
					width = height = (width + height) / 2;
					this._radius = width / 2;
				} else if (type === 'ellipse') {
					this._radius.set(width / 2, height / 2);
				}
				this._size.set(width, height);
				this._changed(9);
			}
		},
	
		getRadius: function() {
			var rad = this._radius;
			return this._type === 'circle'
					? rad
					: new LinkedSize(rad.width, rad.height, this, 'setRadius');
		},
	
		setRadius: function(radius) {
			var type = this._type;
			if (type === 'circle') {
				if (radius === this._radius)
					return;
				var size = radius * 2;
				this._radius = radius;
				this._size.set(size, size);
			} else {
				radius = Size.read(arguments);
				if (!this._radius) {
					this._radius = radius.clone();
				} else {
					if (this._radius.equals(radius))
						return;
					this._radius.set(radius.width, radius.height);
					if (type === 'rectangle') {
						var size = Size.max(this._size, radius.multiply(2));
						this._size.set(size.width, size.height);
					} else if (type === 'ellipse') {
						this._size.set(radius.width * 2, radius.height * 2);
					}
				}
			}
			this._changed(9);
		},
	
		isEmpty: function() {
			return false;
		},
	
		toPath: function(insert) {
			var path = new Path[Base.capitalize(this._type)]({
				center: new Point(),
				size: this._size,
				radius: this._radius,
				insert: false
			});
			path.copyAttributes(this);
			if (paper.settings.applyMatrix)
				path.setApplyMatrix(true);
			if (insert === undefined || insert)
				path.insertAbove(this);
			return path;
		},
	
		toShape: '#clone',
	
		_draw: function(ctx, param, viewMatrix, strokeMatrix) {
			var style = this._style,
				hasFill = style.hasFill(),
				hasStroke = style.hasStroke(),
				dontPaint = param.dontFinish || param.clip,
				untransformed = !strokeMatrix;
			if (hasFill || hasStroke || dontPaint) {
				var type = this._type,
					radius = this._radius,
					isCircle = type === 'circle';
				if (!param.dontStart)
					ctx.beginPath();
				if (untransformed && isCircle) {
					ctx.arc(0, 0, radius, 0, Math.PI * 2, true);
				} else {
					var rx = isCircle ? radius : radius.width,
						ry = isCircle ? radius : radius.height,
						size = this._size,
						width = size.width,
						height = size.height;
					if (untransformed && type === 'rectangle' && rx === 0 && ry === 0) {
						ctx.rect(-width / 2, -height / 2, width, height);
					} else {
						var x = width / 2,
							y = height / 2,
							kappa = 1 - 0.5522847498307936,
							cx = rx * kappa,
							cy = ry * kappa,
							c = [
								-x, -y + ry,
								-x, -y + cy,
								-x + cx, -y,
								-x + rx, -y,
								x - rx, -y,
								x - cx, -y,
								x, -y + cy,
								x, -y + ry,
								x, y - ry,
								x, y - cy,
								x - cx, y,
								x - rx, y,
								-x + rx, y,
								-x + cx, y,
								-x, y - cy,
								-x, y - ry
							];
						if (strokeMatrix)
							strokeMatrix.transform(c, c, 32);
						ctx.moveTo(c[0], c[1]);
						ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
						if (x !== rx)
							ctx.lineTo(c[8], c[9]);
						ctx.bezierCurveTo(c[10], c[11], c[12], c[13], c[14], c[15]);
						if (y !== ry)
							ctx.lineTo(c[16], c[17]);
						ctx.bezierCurveTo(c[18], c[19], c[20], c[21], c[22], c[23]);
						if (x !== rx)
							ctx.lineTo(c[24], c[25]);
						ctx.bezierCurveTo(c[26], c[27], c[28], c[29], c[30], c[31]);
					}
				}
				ctx.closePath();
			}
			if (!dontPaint && (hasFill || hasStroke)) {
				this._setStyles(ctx, param, viewMatrix);
				if (hasFill) {
					ctx.fill(style.getFillRule());
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}
				if (hasStroke)
					ctx.stroke();
			}
		},
	
		_canComposite: function() {
			return !(this.hasFill() && this.hasStroke());
		},
	
		_getBounds: function(matrix, options) {
			var rect = new Rectangle(this._size).setCenter(0, 0),
				style = this._style,
				strokeWidth = options.stroke && style.hasStroke()
						&& style.getStrokeWidth();
			if (matrix)
				rect = matrix._transformBounds(rect);
			return strokeWidth
					? rect.expand(Path._getStrokePadding(strokeWidth,
						this._getStrokeMatrix(matrix, options)))
					: rect;
		}
	},
	new function() {
		function getCornerCenter(that, point, expand) {
			var radius = that._radius;
			if (!radius.isZero()) {
				var halfSize = that._size.divide(2);
				for (var i = 0; i < 4; i++) {
					var dir = new Point(i & 1 ? 1 : -1, i > 1 ? 1 : -1),
						corner = dir.multiply(halfSize),
						center = corner.subtract(dir.multiply(radius)),
						rect = new Rectangle(corner, center);
					if ((expand ? rect.expand(expand) : rect).contains(point))
						return center;
				}
			}
		}
	
		function isOnEllipseStroke(point, radius, padding, quadrant) {
			var vector = point.divide(radius);
			return (!quadrant || vector.quadrant === quadrant) &&
					vector.subtract(vector.normalize()).multiply(radius)
						.divide(padding).length <= 1;
		}
	
		return {
			_contains: function _contains(point) {
				if (this._type === 'rectangle') {
					var center = getCornerCenter(this, point);
					return center
							? point.subtract(center).divide(this._radius)
								.getLength() <= 1
							: _contains.base.call(this, point);
				} else {
					return point.divide(this.size).getLength() <= 0.5;
				}
			},
	
			_hitTestSelf: function _hitTestSelf(point, options, viewMatrix,
					strokeMatrix) {
				var hit = false,
					style = this._style,
					hitStroke = options.stroke && style.hasStroke(),
					hitFill = options.fill && style.hasFill();
				if (hitStroke || hitFill) {
					var type = this._type,
						radius = this._radius,
						strokeRadius = hitStroke ? style.getStrokeWidth() / 2 : 0,
						strokePadding = options._tolerancePadding.add(
							Path._getStrokePadding(strokeRadius,
								!style.getStrokeScaling() && strokeMatrix));
					if (type === 'rectangle') {
						var padding = strokePadding.multiply(2),
							center = getCornerCenter(this, point, padding);
						if (center) {
							hit = isOnEllipseStroke(point.subtract(center), radius,
									strokePadding, center.getQuadrant());
						} else {
							var rect = new Rectangle(this._size).setCenter(0, 0),
								outer = rect.expand(padding),
								inner = rect.expand(padding.negate());
							hit = outer._containsPoint(point)
									&& !inner._containsPoint(point);
						}
					} else {
						hit = isOnEllipseStroke(point, radius, strokePadding);
					}
				}
				return hit ? new HitResult(hitStroke ? 'stroke' : 'fill', this)
						: _hitTestSelf.base.apply(this, arguments);
			}
		};
	}, {
	
	statics: new function() {
		function createShape(type, point, size, radius, args) {
			var item = new Shape(Base.getNamed(args));
			item._type = type;
			item._size = size;
			item._radius = radius;
			return item.translate(point);
		}
	
		return {
			Circle: function() {
				var center = Point.readNamed(arguments, 'center'),
					radius = Base.readNamed(arguments, 'radius');
				return createShape('circle', center, new Size(radius * 2), radius,
						arguments);
			},
	
			Rectangle: function() {
				var rect = Rectangle.readNamed(arguments, 'rectangle'),
					radius = Size.min(Size.readNamed(arguments, 'radius'),
							rect.getSize(true).divide(2));
				return createShape('rectangle', rect.getCenter(true),
						rect.getSize(true), radius, arguments);
			},
	
			Ellipse: function() {
				var ellipse = Shape._readEllipse(arguments),
					radius = ellipse.radius;
				return createShape('ellipse', ellipse.center, radius.multiply(2),
						radius, arguments);
			},
	
			_readEllipse: function(args) {
				var center,
					radius;
				if (Base.hasNamed(args, 'radius')) {
					center = Point.readNamed(args, 'center');
					radius = Size.readNamed(args, 'radius');
				} else {
					var rect = Rectangle.readNamed(args, 'rectangle');
					center = rect.getCenter(true);
					radius = rect.getSize(true).divide(2);
				}
				return { center: center, radius: radius };
			}
		};
	}});
	
	var Raster = Item.extend({
		_class: 'Raster',
		_applyMatrix: false,
		_canApplyMatrix: false,
		_boundsOptions: { stroke: false, handle: false },
		_serializeFields: {
			crossOrigin: null,
			source: null
		},
	
		initialize: function Raster(object, position) {
			if (!this._initialize(object,
					position !== undefined && Point.read(arguments, 1))) {
				if (typeof object === 'string') {
					this.setSource(object);
				} else {
					this.setImage(object);
				}
			}
			if (!this._size) {
				this._size = new Size();
				this._loaded = false;
			}
		},
	
		_equals: function(item) {
			return this.getSource() === item.getSource();
		},
	
		copyContent: function(source) {
			var image = source._image,
				canvas = source._canvas;
			if (image) {
				this._setImage(image);
			} else if (canvas) {
				var copyCanvas = CanvasProvider.getCanvas(source._size);
				copyCanvas.getContext('2d').drawImage(canvas, 0, 0);
				this._setImage(copyCanvas);
			}
			this._crossOrigin = source._crossOrigin;
		},
	
		getSize: function() {
			var size = this._size;
			return new LinkedSize(size ? size.width : 0, size ? size.height : 0,
					this, 'setSize');
		},
	
		setSize: function() {
			var size = Size.read(arguments);
			if (!size.equals(this._size)) {
				if (size.width > 0 && size.height > 0) {
					var element = this.getElement();
					this._setImage(CanvasProvider.getCanvas(size));
					if (element)
						this.getContext(true).drawImage(element, 0, 0,
								size.width, size.height);
				} else {
					if (this._canvas)
						CanvasProvider.release(this._canvas);
					this._size = size.clone();
				}
			}
		},
	
		getWidth: function() {
			return this._size ? this._size.width : 0;
		},
	
		setWidth: function(width) {
			this.setSize(width, this.getHeight());
		},
	
		getHeight: function() {
			return this._size ? this._size.height : 0;
		},
	
		setHeight: function(height) {
			this.setSize(this.getWidth(), height);
		},
	
		isEmpty: function() {
			var size = this._size;
			return !size || size.width === 0 && size.height === 0;
		},
	
		getResolution: function() {
			var matrix = this._matrix,
				orig = new Point(0, 0).transform(matrix),
				u = new Point(1, 0).transform(matrix).subtract(orig),
				v = new Point(0, 1).transform(matrix).subtract(orig);
			return new Size(
				72 / u.getLength(),
				72 / v.getLength()
			);
		},
	
		getPpi: '#getResolution',
	
		getImage: function() {
			return this._image;
		},
	
		setImage: function(image) {
			var that = this;
	
			function emit(event) {
				var view = that.getView(),
					type = event && event.type || 'load';
				if (view && that.responds(type)) {
					paper = view._scope;
					that.emit(type, new Event(event));
				}
			}
	
			this._setImage(image);
			if (this._loaded) {
				setTimeout(emit, 0);
			} else if (image) {
				DomEvent.add(image, {
					load: function(event) {
						that._setImage(image);
						emit(event);
					},
					error: emit
				});
			}
		},
	
		_setImage: function(image) {
			if (this._canvas)
				CanvasProvider.release(this._canvas);
			if (image && image.getContext) {
				this._image = null;
				this._canvas = image;
				this._loaded = true;
			} else {
				this._image = image;
				this._canvas = null;
				this._loaded = !!(image && image.src && image.complete);
			}
			this._size = new Size(
					image ? image.naturalWidth || image.width : 0,
					image ? image.naturalHeight || image.height : 0);
			this._context = null;
			this._changed(521);
		},
	
		getCanvas: function() {
			if (!this._canvas) {
				var ctx = CanvasProvider.getContext(this._size);
				try {
					if (this._image)
						ctx.drawImage(this._image, 0, 0);
					this._canvas = ctx.canvas;
				} catch (e) {
					CanvasProvider.release(ctx);
				}
			}
			return this._canvas;
		},
	
		setCanvas: '#setImage',
	
		getContext: function(modify) {
			if (!this._context)
				this._context = this.getCanvas().getContext('2d');
			if (modify) {
				this._image = null;
				this._changed(513);
			}
			return this._context;
		},
	
		setContext: function(context) {
			this._context = context;
		},
	
		getSource: function() {
			var image = this._image;
			return image && image.src || this.toDataURL();
		},
	
		setSource: function(src) {
			var crossOrigin = this._crossOrigin,
				image = document.getElementById(src) || new window.Image();
			if (crossOrigin)
				image.crossOrigin = crossOrigin;
			if (!image.src)
				image.src = src;
			this.setImage(image);
		},
	
		getCrossOrigin: function() {
			return this._image && this._image.crossOrigin || this._crossOrigin || '';
		},
	
		setCrossOrigin: function(crossOrigin) {
			this._crossOrigin = crossOrigin;
			if (this._image)
				this._image.crossOrigin = crossOrigin;
		},
	
		getElement: function() {
			return this._canvas || this._loaded && this._image;
		}
	}, {
		beans: false,
	
		getSubCanvas: function() {
			var rect = Rectangle.read(arguments),
				ctx = CanvasProvider.getContext(rect.getSize());
			ctx.drawImage(this.getCanvas(), rect.x, rect.y,
					rect.width, rect.height, 0, 0, rect.width, rect.height);
			return ctx.canvas;
		},
	
		getSubRaster: function() {
			var rect = Rectangle.read(arguments),
				raster = new Raster(Item.NO_INSERT);
			raster._setImage(this.getSubCanvas(rect));
			raster.translate(rect.getCenter().subtract(this.getSize().divide(2)));
			raster._matrix.prepend(this._matrix);
			raster.insertAbove(this);
			return raster;
		},
	
		toDataURL: function() {
			var image = this._image,
				src = image && image.src;
			if (/^data:/.test(src))
				return src;
			var canvas = this.getCanvas();
			return canvas ? canvas.toDataURL.apply(canvas, arguments) : null;
		},
	
		drawImage: function(image ) {
			var point = Point.read(arguments, 1);
			this.getContext(true).drawImage(image, point.x, point.y);
		},
	
		getAverageColor: function(object) {
			var bounds, path;
			if (!object) {
				bounds = this.getBounds();
			} else if (object instanceof PathItem) {
				path = object;
				bounds = object.getBounds();
			} else if (object.width) {
				bounds = new Rectangle(object);
			} else if (object.x) {
				bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1);
			}
			var sampleSize = 32,
				width = Math.min(bounds.width, sampleSize),
				height = Math.min(bounds.height, sampleSize);
			var ctx = Raster._sampleContext;
			if (!ctx) {
				ctx = Raster._sampleContext = CanvasProvider.getContext(
						new Size(sampleSize));
			} else {
				ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1);
			}
			ctx.save();
			var matrix = new Matrix()
					.scale(width / bounds.width, height / bounds.height)
					.translate(-bounds.x, -bounds.y);
			matrix.applyToContext(ctx);
			if (path)
				path.draw(ctx, new Base({ clip: true, matrices: [matrix] }));
			this._matrix.applyToContext(ctx);
			var element = this.getElement(),
				size = this._size;
			if (element)
				ctx.drawImage(element, -size.width / 2, -size.height / 2);
			ctx.restore();
			var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
					Math.ceil(height)).data,
				channels = [0, 0, 0],
				total = 0;
			for (var i = 0, l = pixels.length; i < l; i += 4) {
				var alpha = pixels[i + 3];
				total += alpha;
				alpha /= 255;
				channels[0] += pixels[i] * alpha;
				channels[1] += pixels[i + 1] * alpha;
				channels[2] += pixels[i + 2] * alpha;
			}
			for (var i = 0; i < 3; i++)
				channels[i] /= total;
			return total ? Color.read(channels) : null;
		},
	
		getPixel: function() {
			var point = Point.read(arguments);
			var data = this.getContext().getImageData(point.x, point.y, 1, 1).data;
			return new Color('rgb', [data[0] / 255, data[1] / 255, data[2] / 255],
					data[3] / 255);
		},
	
		setPixel: function() {
			var point = Point.read(arguments),
				color = Color.read(arguments),
				components = color._convert('rgb'),
				alpha = color._alpha,
				ctx = this.getContext(true),
				imageData = ctx.createImageData(1, 1),
				data = imageData.data;
			data[0] = components[0] * 255;
			data[1] = components[1] * 255;
			data[2] = components[2] * 255;
			data[3] = alpha != null ? alpha * 255 : 255;
			ctx.putImageData(imageData, point.x, point.y);
		},
	
		createImageData: function() {
			var size = Size.read(arguments);
			return this.getContext().createImageData(size.width, size.height);
		},
	
		getImageData: function() {
			var rect = Rectangle.read(arguments);
			if (rect.isEmpty())
				rect = new Rectangle(this._size);
			return this.getContext().getImageData(rect.x, rect.y,
					rect.width, rect.height);
		},
	
		setImageData: function(data ) {
			var point = Point.read(arguments, 1);
			this.getContext(true).putImageData(data, point.x, point.y);
		},
	
		_getBounds: function(matrix, options) {
			var rect = new Rectangle(this._size).setCenter(0, 0);
			return matrix ? matrix._transformBounds(rect) : rect;
		},
	
		_hitTestSelf: function(point) {
			if (this._contains(point)) {
				var that = this;
				return new HitResult('pixel', that, {
					offset: point.add(that._size.divide(2)).round(),
					color: {
						get: function() {
							return that.getPixel(this.offset);
						}
					}
				});
			}
		},
	
		_draw: function(ctx) {
			var element = this.getElement();
			if (element) {
				ctx.globalAlpha = this._opacity;
				ctx.drawImage(element,
						-this._size.width / 2, -this._size.height / 2);
			}
		},
	
		_canComposite: function() {
			return true;
		}
	});
	
	var SymbolItem = Item.extend({
		_class: 'SymbolItem',
		_applyMatrix: false,
		_canApplyMatrix: false,
		_boundsOptions: { stroke: true },
		_serializeFields: {
			symbol: null
		},
	
		initialize: function SymbolItem(arg0, arg1) {
			if (!this._initialize(arg0,
					arg1 !== undefined && Point.read(arguments, 1)))
				this.setDefinition(arg0 instanceof SymbolDefinition ?
						arg0 : new SymbolDefinition(arg0));
		},
	
		_equals: function(item) {
			return this._definition === item._definition;
		},
	
		copyContent: function(source) {
			this.setDefinition(source._definition);
		},
	
		getDefinition: function() {
			return this._definition;
		},
	
		setDefinition: function(definition) {
			this._definition = definition;
			this._changed(9);
		},
	
		getSymbol: '#getDefinition',
		setSymbol: '#setDefinition',
	
		isEmpty: function() {
			return this._definition._item.isEmpty();
		},
	
		_getBounds: function(matrix, options) {
			var item = this._definition._item;
			return item._getCachedBounds(matrix && matrix.appended(item._matrix),
					options);
		},
	
		_hitTestSelf: function(point, options, viewMatrix, strokeMatrix) {
			var res = this._definition._item._hitTest(point, options, viewMatrix);
			if (res)
				res.item = this;
			return res;
		},
	
		_draw: function(ctx, param) {
			this._definition._item.draw(ctx, param);
		}
	
	});
	
	var SymbolDefinition = Base.extend({
		_class: 'SymbolDefinition',
	
		initialize: function SymbolDefinition(item, dontCenter) {
			this._id = UID.get();
			this.project = paper.project;
			if (item)
				this.setItem(item, dontCenter);
		},
	
		_serialize: function(options, dictionary) {
			return dictionary.add(this, function() {
				return Base.serialize([this._class, this._item],
						options, false, dictionary);
			});
		},
	
		_changed: function(flags) {
			if (flags & 8)
				Item._clearBoundsCache(this);
			if (flags & 1)
				this.project._changed(flags);
		},
	
		getItem: function() {
			return this._item;
		},
	
		setItem: function(item, _dontCenter) {
			if (item._parentSymbol)
				item = item.clone();
			if (this._item)
				this._item._parentSymbol = null;
			this._item = item;
			item.remove();
			item.setSelected(false);
			if (!_dontCenter)
				item.setPosition(new Point());
			item._parentSymbol = this;
			this._changed(9);
		},
	
		getDefinition: '#getItem',
		setDefinition: '#setItem',
	
		place: function(position) {
			return new SymbolItem(this, position);
		},
	
		clone: function() {
			return new SymbolDefinition(this._item.clone(false));
		},
	
		equals: function(symbol) {
			return symbol === this
					|| symbol && this._item.equals(symbol._item)
					|| false;
		}
	});
	
	var HitResult = Base.extend({
		_class: 'HitResult',
	
		initialize: function HitResult(type, item, values) {
			this.type = type;
			this.item = item;
			if (values) {
				values.enumerable = true;
				this.inject(values);
			}
		},
	
		statics: {
			getOptions: function(args) {
				var options = args && Base.read(args);
				return Base.set({
					type: null,
					tolerance: paper.settings.hitTolerance,
					fill: !options,
					stroke: !options,
					segments: !options,
					handles: false,
					ends: false,
					center: false,
					bounds: false,
					guides: false,
					selected: false
				}, options);
			}
		}
	});
	
	var Segment = Base.extend({
		_class: 'Segment',
		beans: true,
		_selection: 0,
	
		initialize: function Segment(arg0, arg1, arg2, arg3, arg4, arg5) {
			var count = arguments.length,
				point, handleIn, handleOut,
				selection;
			if (count === 0) {
			} else if (count === 1) {
				if (arg0 && 'point' in arg0) {
					point = arg0.point;
					handleIn = arg0.handleIn;
					handleOut = arg0.handleOut;
					selection = arg0.selection;
				} else {
					point = arg0;
				}
			} else if (typeof arg0 === 'object') {
				point = arg0;
				handleIn = arg1;
				handleOut = arg2;
				selection = arg3;
			} else {
				point = arg0 !== undefined ? [ arg0, arg1 ] : null;
				handleIn = arg2 !== undefined ? [ arg2, arg3 ] : null;
				handleOut = arg4 !== undefined ? [ arg4, arg5 ] : null;
			}
			new SegmentPoint(point, this, '_point');
			new SegmentPoint(handleIn, this, '_handleIn');
			new SegmentPoint(handleOut, this, '_handleOut');
			if (selection)
				this.setSelection(selection);
		},
	
		_serialize: function(options) {
			var point = this._point,
				selection = this._selection,
				obj = selection || this.hasHandles()
						? [point, this._handleIn, this._handleOut]
						: point;
			if (selection)
				obj.push(selection);
			return Base.serialize(obj, options, true);
		},
	
		_changed: function(point) {
			var path = this._path;
			if (!path)
				return;
			var curves = path._curves,
				index = this._index,
				curve;
			if (curves) {
				if ((!point || point === this._point || point === this._handleIn)
						&& (curve = index > 0 ? curves[index - 1] : path._closed
							? curves[curves.length - 1] : null))
					curve._changed();
				if ((!point || point === this._point || point === this._handleOut)
						&& (curve = curves[index]))
					curve._changed();
			}
			path._changed(25);
		},
	
		getPoint: function() {
			return this._point;
		},
	
		setPoint: function() {
			var point = Point.read(arguments);
			this._point.set(point.x, point.y);
		},
	
		getHandleIn: function() {
			return this._handleIn;
		},
	
		setHandleIn: function() {
			var point = Point.read(arguments);
			this._handleIn.set(point.x, point.y);
		},
	
		getHandleOut: function() {
			return this._handleOut;
		},
	
		setHandleOut: function() {
			var point = Point.read(arguments);
			this._handleOut.set(point.x, point.y);
		},
	
		hasHandles: function() {
			return !this._handleIn.isZero() || !this._handleOut.isZero();
		},
	
		clearHandles: function() {
			this._handleIn.set(0, 0);
			this._handleOut.set(0, 0);
		},
	
		getSelection: function() {
			return this._selection;
		},
	
		setSelection: function(selection) {
			var oldSelection = this._selection,
				path = this._path;
			this._selection = selection = selection || 0;
			if (path && selection !== oldSelection) {
				path._updateSelection(this, oldSelection, selection);
				path._changed(129);
			}
		},
	
		changeSelection: function(flag, selected) {
			var selection = this._selection;
			this.setSelection(selected ? selection | flag : selection & ~flag);
		},
	
		isSelected: function() {
			return !!(this._selection & 7);
		},
	
		setSelected: function(selected) {
			this.changeSelection(7, selected);
		},
	
		getIndex: function() {
			return this._index !== undefined ? this._index : null;
		},
	
		getPath: function() {
			return this._path || null;
		},
	
		getCurve: function() {
			var path = this._path,
				index = this._index;
			if (path) {
				if (index > 0 && !path._closed
						&& index === path._segments.length - 1)
					index--;
				return path.getCurves()[index] || null;
			}
			return null;
		},
	
		getLocation: function() {
			var curve = this.getCurve();
			return curve
					? new CurveLocation(curve, this === curve._segment1 ? 0 : 1)
					: null;
		},
	
		getNext: function() {
			var segments = this._path && this._path._segments;
			return segments && (segments[this._index + 1]
					|| this._path._closed && segments[0]) || null;
		},
	
		smooth: function(options, _first, _last) {
			var opts = options || {},
				type = opts.type,
				factor = opts.factor,
				prev = this.getPrevious(),
				next = this.getNext(),
				p0 = (prev || this)._point,
				p1 = this._point,
				p2 = (next || this)._point,
				d1 = p0.getDistance(p1),
				d2 = p1.getDistance(p2);
			if (!type || type === 'catmull-rom') {
				var a = factor === undefined ? 0.5 : factor,
					d1_a = Math.pow(d1, a),
					d1_2a = d1_a * d1_a,
					d2_a = Math.pow(d2, a),
					d2_2a = d2_a * d2_a;
				if (!_first && prev) {
					var A = 2 * d2_2a + 3 * d2_a * d1_a + d1_2a,
						N = 3 * d2_a * (d2_a + d1_a);
					this.setHandleIn(N !== 0
						? new Point(
							(d2_2a * p0._x + A * p1._x - d1_2a * p2._x) / N - p1._x,
							(d2_2a * p0._y + A * p1._y - d1_2a * p2._y) / N - p1._y)
						: new Point());
				}
				if (!_last && next) {
					var A = 2 * d1_2a + 3 * d1_a * d2_a + d2_2a,
						N = 3 * d1_a * (d1_a + d2_a);
					this.setHandleOut(N !== 0
						? new Point(
							(d1_2a * p2._x + A * p1._x - d2_2a * p0._x) / N - p1._x,
							(d1_2a * p2._y + A * p1._y - d2_2a * p0._y) / N - p1._y)
						: new Point());
				}
			} else if (type === 'geometric') {
				if (prev && next) {
					var vector = p0.subtract(p2),
						t = factor === undefined ? 0.4 : factor,
						k = t * d1 / (d1 + d2);
					if (!_first)
						this.setHandleIn(vector.multiply(k));
					if (!_last)
						this.setHandleOut(vector.multiply(k - t));
				}
			} else {
				throw new Error('Smoothing method \'' + type + '\' not supported.');
			}
		},
	
		getPrevious: function() {
			var segments = this._path && this._path._segments;
			return segments && (segments[this._index - 1]
					|| this._path._closed && segments[segments.length - 1]) || null;
		},
	
		isFirst: function() {
			return this._index === 0;
		},
	
		isLast: function() {
			var path = this._path;
			return path && this._index === path._segments.length - 1 || false;
		},
	
		reverse: function() {
			var handleIn = this._handleIn,
				handleOut = this._handleOut,
				inX = handleIn._x,
				inY = handleIn._y;
			handleIn.set(handleOut._x, handleOut._y);
			handleOut.set(inX, inY);
		},
	
		reversed: function() {
			return new Segment(this._point, this._handleOut, this._handleIn);
		},
	
		remove: function() {
			return this._path ? !!this._path.removeSegment(this._index) : false;
		},
	
		clone: function() {
			return new Segment(this._point, this._handleIn, this._handleOut);
		},
	
		equals: function(segment) {
			return segment === this || segment && this._class === segment._class
					&& this._point.equals(segment._point)
					&& this._handleIn.equals(segment._handleIn)
					&& this._handleOut.equals(segment._handleOut)
					|| false;
		},
	
		toString: function() {
			var parts = [ 'point: ' + this._point ];
			if (!this._handleIn.isZero())
				parts.push('handleIn: ' + this._handleIn);
			if (!this._handleOut.isZero())
				parts.push('handleOut: ' + this._handleOut);
			return '{ ' + parts.join(', ') + ' }';
		},
	
		transform: function(matrix) {
			this._transformCoordinates(matrix, new Array(6), true);
			this._changed();
		},
	
		interpolate: function(from, to, factor) {
			var u = 1 - factor,
				v = factor,
				point1 = from._point,
				point2 = to._point,
				handleIn1 = from._handleIn,
				handleIn2 = to._handleIn,
				handleOut2 = to._handleOut,
				handleOut1 = from._handleOut;
			this._point.set(
					u * point1._x + v * point2._x,
					u * point1._y + v * point2._y, true);
			this._handleIn.set(
					u * handleIn1._x + v * handleIn2._x,
					u * handleIn1._y + v * handleIn2._y, true);
			this._handleOut.set(
					u * handleOut1._x + v * handleOut2._x,
					u * handleOut1._y + v * handleOut2._y, true);
			this._changed();
		},
	
		_transformCoordinates: function(matrix, coords, change) {
			var point = this._point,
				handleIn = !change || !this._handleIn.isZero()
						? this._handleIn : null,
				handleOut = !change || !this._handleOut.isZero()
						? this._handleOut : null,
				x = point._x,
				y = point._y,
				i = 2;
			coords[0] = x;
			coords[1] = y;
			if (handleIn) {
				coords[i++] = handleIn._x + x;
				coords[i++] = handleIn._y + y;
			}
			if (handleOut) {
				coords[i++] = handleOut._x + x;
				coords[i++] = handleOut._y + y;
			}
			if (matrix) {
				matrix._transformCoordinates(coords, coords, i / 2);
				x = coords[0];
				y = coords[1];
				if (change) {
					point._x = x;
					point._y = y;
					i  = 2;
					if (handleIn) {
						handleIn._x = coords[i++] - x;
						handleIn._y = coords[i++] - y;
					}
					if (handleOut) {
						handleOut._x = coords[i++] - x;
						handleOut._y = coords[i++] - y;
					}
				} else {
					if (!handleIn) {
						coords[i++] = x;
						coords[i++] = y;
					}
					if (!handleOut) {
						coords[i++] = x;
						coords[i++] = y;
					}
				}
			}
			return coords;
		}
	});
	
	var SegmentPoint = Point.extend({
		initialize: function SegmentPoint(point, owner, key) {
			var x, y,
				selected;
			if (!point) {
				x = y = 0;
			} else if ((x = point[0]) !== undefined) {
				y = point[1];
			} else {
				var pt = point;
				if ((x = pt.x) === undefined) {
					pt = Point.read(arguments);
					x = pt.x;
				}
				y = pt.y;
				selected = pt.selected;
			}
			this._x = x;
			this._y = y;
			this._owner = owner;
			owner[key] = this;
			if (selected)
				this.setSelected(true);
		},
	
		set: function(x, y) {
			this._x = x;
			this._y = y;
			this._owner._changed(this);
			return this;
		},
	
		getX: function() {
			return this._x;
		},
	
		setX: function(x) {
			this._x = x;
			this._owner._changed(this);
		},
	
		getY: function() {
			return this._y;
		},
	
		setY: function(y) {
			this._y = y;
			this._owner._changed(this);
		},
	
		isZero: function() {
			return Numerical.isZero(this._x) && Numerical.isZero(this._y);
		},
	
		isSelected: function() {
			return !!(this._owner._selection & this._getSelection());
		},
	
		setSelected: function(selected) {
			this._owner.changeSelection(this._getSelection(), selected);
		},
	
		_getSelection: function() {
			var owner = this._owner;
			return this === owner._point ? 1
				: this === owner._handleIn ? 2
				: this === owner._handleOut ? 4
				: 0;
		}
	});
	
	var Curve = Base.extend({
		_class: 'Curve',
	
		initialize: function Curve(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
			var count = arguments.length,
				seg1, seg2,
				point1, point2,
				handle1, handle2;
			if (count === 3) {
				this._path = arg0;
				seg1 = arg1;
				seg2 = arg2;
			} else if (count === 0) {
				seg1 = new Segment();
				seg2 = new Segment();
			} else if (count === 1) {
				if ('segment1' in arg0) {
					seg1 = new Segment(arg0.segment1);
					seg2 = new Segment(arg0.segment2);
				} else if ('point1' in arg0) {
					point1 = arg0.point1;
					handle1 = arg0.handle1;
					handle2 = arg0.handle2;
					point2 = arg0.point2;
				} else if (Array.isArray(arg0)) {
					point1 = [arg0[0], arg0[1]];
					point2 = [arg0[6], arg0[7]];
					handle1 = [arg0[2] - arg0[0], arg0[3] - arg0[1]];
					handle2 = [arg0[4] - arg0[6], arg0[5] - arg0[7]];
				}
			} else if (count === 2) {
				seg1 = new Segment(arg0);
				seg2 = new Segment(arg1);
			} else if (count === 4) {
				point1 = arg0;
				handle1 = arg1;
				handle2 = arg2;
				point2 = arg3;
			} else if (count === 8) {
				point1 = [arg0, arg1];
				point2 = [arg6, arg7];
				handle1 = [arg2 - arg0, arg3 - arg1];
				handle2 = [arg4 - arg6, arg5 - arg7];
			}
			this._segment1 = seg1 || new Segment(point1, null, handle1);
			this._segment2 = seg2 || new Segment(point2, handle2, null);
		},
	
		_serialize: function(options) {
			return Base.serialize(this.hasHandles()
					? [this.getPoint1(), this.getHandle1(), this.getHandle2(),
						this.getPoint2()]
					: [this.getPoint1(), this.getPoint2()],
					options, true);
		},
	
		_changed: function() {
			this._length = this._bounds = undefined;
		},
	
		clone: function() {
			return new Curve(this._segment1, this._segment2);
		},
	
		toString: function() {
			var parts = [ 'point1: ' + this._segment1._point ];
			if (!this._segment1._handleOut.isZero())
				parts.push('handle1: ' + this._segment1._handleOut);
			if (!this._segment2._handleIn.isZero())
				parts.push('handle2: ' + this._segment2._handleIn);
			parts.push('point2: ' + this._segment2._point);
			return '{ ' + parts.join(', ') + ' }';
		},
	
		remove: function() {
			var removed = false;
			if (this._path) {
				var segment2 = this._segment2,
					handleOut = segment2._handleOut;
				removed = segment2.remove();
				if (removed)
					this._segment1._handleOut.set(handleOut.x, handleOut.y);
			}
			return removed;
		},
	
		getPoint1: function() {
			return this._segment1._point;
		},
	
		setPoint1: function() {
			var point = Point.read(arguments);
			this._segment1._point.set(point.x, point.y);
		},
	
		getPoint2: function() {
			return this._segment2._point;
		},
	
		setPoint2: function() {
			var point = Point.read(arguments);
			this._segment2._point.set(point.x, point.y);
		},
	
		getHandle1: function() {
			return this._segment1._handleOut;
		},
	
		setHandle1: function() {
			var point = Point.read(arguments);
			this._segment1._handleOut.set(point.x, point.y);
		},
	
		getHandle2: function() {
			return this._segment2._handleIn;
		},
	
		setHandle2: function() {
			var point = Point.read(arguments);
			this._segment2._handleIn.set(point.x, point.y);
		},
	
		getSegment1: function() {
			return this._segment1;
		},
	
		getSegment2: function() {
			return this._segment2;
		},
	
		getPath: function() {
			return this._path;
		},
	
		getIndex: function() {
			return this._segment1._index;
		},
	
		getNext: function() {
			var curves = this._path && this._path._curves;
			return curves && (curves[this._segment1._index + 1]
					|| this._path._closed && curves[0]) || null;
		},
	
		getPrevious: function() {
			var curves = this._path && this._path._curves;
			return curves && (curves[this._segment1._index - 1]
					|| this._path._closed && curves[curves.length - 1]) || null;
		},
	
		isFirst: function() {
			return this._segment1._index === 0;
		},
	
		isLast: function() {
			var path = this._path;
			return path && this._segment1._index === path._curves.length - 1
					|| false;
		},
	
		isSelected: function() {
			return this.getPoint1().isSelected()
					&& this.getHandle2().isSelected()
					&& this.getHandle2().isSelected()
					&& this.getPoint2().isSelected();
		},
	
		setSelected: function(selected) {
			this.getPoint1().setSelected(selected);
			this.getHandle1().setSelected(selected);
			this.getHandle2().setSelected(selected);
			this.getPoint2().setSelected(selected);
		},
	
		getValues: function(matrix) {
			return Curve.getValues(this._segment1, this._segment2, matrix);
		},
	
		getPoints: function() {
			var coords = this.getValues(),
				points = [];
			for (var i = 0; i < 8; i += 2)
				points.push(new Point(coords[i], coords[i + 1]));
			return points;
		},
	
		getLength: function() {
			if (this._length == null)
				this._length = Curve.getLength(this.getValues(), 0, 1);
			return this._length;
		},
	
		getArea: function() {
			return Curve.getArea(this.getValues());
		},
	
		getLine: function() {
			return new Line(this._segment1._point, this._segment2._point);
		},
	
		getPart: function(from, to) {
			return new Curve(Curve.getPart(this.getValues(), from, to));
		},
	
		getPartLength: function(from, to) {
			return Curve.getLength(this.getValues(), from, to);
		},
	
		getIntersections: function(curve) {
			return Curve._getIntersections(this.getValues(),
					curve && curve !== this ? curve.getValues() : null,
					this, curve, [], {});
		},
	
		divideAt: function(location) {
			return this.divideAtTime(location && location.curve === this
					? location.time : location);
		},
	
		divideAtTime: function(time, _setHandles) {
			var tMin = 4e-7,
				tMax = 1 - tMin,
				res = null;
			if (time >= tMin && time <= tMax) {
				var parts = Curve.subdivide(this.getValues(), time),
					left = parts[0],
					right = parts[1],
					setHandles = _setHandles || this.hasHandles(),
					segment1 = this._segment1,
					segment2 = this._segment2,
					path = this._path;
				if (setHandles) {
					segment1._handleOut.set(left[2] - left[0], left[3] - left[1]);
					segment2._handleIn.set(right[4] - right[6],right[5] - right[7]);
				}
				var x = left[6], y = left[7],
					segment = new Segment(new Point(x, y),
							setHandles && new Point(left[4] - x, left[5] - y),
							setHandles && new Point(right[2] - x, right[3] - y));
				if (path) {
					path.insert(segment1._index + 1, segment);
					res = this.getNext();
				} else {
					this._segment2 = segment;
					res = new Curve(segment, segment2);
				}
			}
			return res;
		},
	
		splitAt: function(location) {
			return this._path ? this._path.splitAt(location) : null;
		},
	
		splitAtTime: function(t) {
			return this.splitAt(this.getLocationAtTime(t));
		},
	
		divide: function(offset, isTime) {
			return this.divideAtTime(offset === undefined ? 0.5 : isTime ? offset
					: this.getTimeAt(offset));
		},
	
		split: function(offset, isTime) {
			return this.splitAtTime(offset === undefined ? 0.5 : isTime ? offset
					: this.getTimeAt(offset));
		},
	
		reversed: function() {
			return new Curve(this._segment2.reversed(), this._segment1.reversed());
		},
	
		clearHandles: function() {
			this._segment1._handleOut.set(0, 0);
			this._segment2._handleIn.set(0, 0);
		},
	
	statics: {
		getValues: function(segment1, segment2, matrix) {
			var p1 = segment1._point,
				h1 = segment1._handleOut,
				h2 = segment2._handleIn,
				p2 = segment2._point,
				values = [
					p1._x, p1._y,
					p1._x + h1._x, p1._y + h1._y,
					p2._x + h2._x, p2._y + h2._y,
					p2._x, p2._y
				];
			if (matrix)
				matrix._transformCoordinates(values, values, 4);
			return values;
		},
	
		subdivide: function(v, t) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7];
			if (t === undefined)
				t = 0.5;
			var u = 1 - t,
				p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
				p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
				p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
				p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
				p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
				p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
			return [
				[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y],
				[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y]
			];
		},
	
		solveCubic: function (v, coord, val, roots, min, max) {
			var p1 = v[coord],
				c1 = v[coord + 2],
				c2 = v[coord + 4],
				p2 = v[coord + 6],
				c = 3 * (c1 - p1),
				b = 3 * (c2 - c1) - c,
				a = p2 - p1 - c - b;
			return Numerical.solveCubic(a, b, c, p1 - val, roots, min, max);
		},
	
		getTimeOf: function(v, point) {
			var p1 = new Point(v[0], v[1]),
				p2 = new Point(v[6], v[7]),
				epsilon = 1e-12,
				t = point.isClose(p1, epsilon) ? 0
				  : point.isClose(p2, epsilon) ? 1
				  : null;
			if (t !== null)
				return t;
			var coords = [point.x, point.y],
				roots = [],
				geomEpsilon = 2e-7;
			for (var c = 0; c < 2; c++) {
				var count = Curve.solveCubic(v, c, coords[c], roots, 0, 1);
				for (var i = 0; i < count; i++) {
					t = roots[i];
					if (point.isClose(Curve.getPoint(v, t), geomEpsilon))
						return t;
				}
			}
			return point.isClose(p1, geomEpsilon) ? 0
				 : point.isClose(p2, geomEpsilon) ? 1
				 : null;
		},
	
		getNearestTime: function(v, point) {
			if (Curve.isStraight(v)) {
				var p1x = v[0], p1y = v[1],
					p2x = v[6], p2y = v[7],
					vx = p2x - p1x, vy = p2y - p1y,
					det = vx * vx + vy * vy;
				if (det === 0)
					return 0;
				var u = ((point.x - p1x) * vx + (point.y - p1y) * vy) / det;
				return u < 1e-12 ? 0
					 : u > 0.999999999999 ? 1
					 : Curve.getTimeOf(v,
						new Point(p1x + u * vx, p1y + u * vy));
			}
	
			var count = 100,
				minDist = Infinity,
				minT = 0;
	
			function refine(t) {
				if (t >= 0 && t <= 1) {
					var dist = point.getDistance(Curve.getPoint(v, t), true);
					if (dist < minDist) {
						minDist = dist;
						minT = t;
						return true;
					}
				}
			}
	
			for (var i = 0; i <= count; i++)
				refine(i / count);
	
			var step = 1 / (count * 2);
			while (step > 4e-7) {
				if (!refine(minT - step) && !refine(minT + step))
					step /= 2;
			}
			return minT;
		},
	
		getPart: function(v, from, to) {
			var flip = from > to;
			if (flip) {
				var tmp = from;
				from = to;
				to = tmp;
			}
			if (from > 0)
				v = Curve.subdivide(v, from)[1];
			if (to < 1)
				v = Curve.subdivide(v, (to - from) / (1 - from))[0];
			return flip
					? [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]]
					: v;
		},
	
		isFlatEnough: function(v, flatness) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7],
				ux = 3 * c1x - 2 * p1x - p2x,
				uy = 3 * c1y - 2 * p1y - p2y,
				vx = 3 * c2x - 2 * p2x - p1x,
				vy = 3 * c2y - 2 * p2y - p1y;
			return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
					<= 16 * flatness * flatness;
		},
	
		getArea: function(v) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7];
			return (6 * (p1x*c1y-p1y*c1x+c2x*p2y-p2x*c2y) +
					3 * (c1x*p2y-c1y*p2x+p1x*c2y-c2x*p1y+c1x*c2y-c1y*c2x) +
					1 * (p1x*p2y-p1y*p2x)) / 20;
		},
	
		getBounds: function(v) {
			var min = v.slice(0, 2),
				max = min.slice(),
				roots = [0, 0];
			for (var i = 0; i < 2; i++)
				Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
						i, 0, min, max, roots);
			return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
		},
	
		_addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
			padding /= 2;
			function add(value, padding) {
				var left = value - padding,
					right = value + padding;
				if (left < min[coord])
					min[coord] = left;
				if (right > max[coord])
					max[coord] = right;
			}
			var a = 3 * (v1 - v2) - v0 + v3,
				b = 2 * (v0 + v2) - 4 * v1,
				c = v1 - v0,
				count = Numerical.solveQuadratic(a, b, c, roots),
				tMin = 4e-7,
				tMax = 1 - tMin;
			add(v3, 0);
			for (var i = 0; i < count; i++) {
				var t = roots[i],
					u = 1 - t;
				if (tMin < t && t < tMax)
					add(u * u * u * v0
						+ 3 * u * u * t * v1
						+ 3 * u * t * t * v2
						+ t * t * t * v3,
						padding);
			}
		}
	}}, Base.each(
		['getBounds', 'getStrokeBounds', 'getHandleBounds'],
		function(name) {
			this[name] = function() {
				if (!this._bounds)
					this._bounds = {};
				var bounds = this._bounds[name];
				if (!bounds) {
					bounds = this._bounds[name] = Path[name](
							[this._segment1, this._segment2], false, this._path);
				}
				return bounds.clone();
			};
		},
	{
	
	}), Base.each({
		isStraight: function(l, h1, h2) {
			if (h1.isZero() && h2.isZero()) {
				return true;
			} else if (l.isZero()) {
				return false;
			} else if (h1.isCollinear(l) && h2.isCollinear(l)) {
				var div = l.dot(l),
					p1 = l.dot(h1) / div,
					p2 = l.dot(h2) / div;
				return p1 >= 0 && p1 <= 1 && p2 <= 0 && p2 >= -1;
			}
			return false;
		},
	
		isLinear: function(l, h1, h2) {
			var third = l.divide(3);
			return h1.equals(third) && h2.negate().equals(third);
		}
	}, function(test, name) {
		this[name] = function() {
			var seg1 = this._segment1,
				seg2 = this._segment2;
			return test(seg2._point.subtract(seg1._point),
					seg1._handleOut, seg2._handleIn);
		};
	
		this.statics[name] = function(v) {
			var p1x = v[0], p1y = v[1],
				p2x = v[6], p2y = v[7];
			return test(new Point(p2x - p1x, p2y - p1y),
					new Point(v[2] - p1x, v[3] - p1y),
					new Point(v[4] - p2x, v[5] - p2y));
		};
	}, {
		statics: {},
	
		hasHandles: function() {
			return !this._segment1._handleOut.isZero()
					|| !this._segment2._handleIn.isZero();
		},
	
		isCollinear: function(curve) {
			return curve && this.isStraight() && curve.isStraight()
					&& this.getLine().isCollinear(curve.getLine());
		},
	
		isHorizontal: function() {
			return this.isStraight() && Math.abs(this.getTangentAtTime(0.5).y)
					< 1e-7;
		},
	
		isVertical: function() {
			return this.isStraight() && Math.abs(this.getTangentAtTime(0.5).x)
					< 1e-7;
		}
	}), {
		beans: false,
	
		getLocationAt: function(offset, _isTime) {
			return this.getLocationAtTime(
					_isTime ? offset : this.getTimeAt(offset));
		},
	
		getLocationAtTime: function(t) {
			return t != null && t >= 0 && t <= 1
					? new CurveLocation(this, t)
					: null;
		},
	
		getTimeAt: function(offset, start) {
			return Curve.getTimeAt(this.getValues(), offset, start);
		},
	
		getParameterAt: '#getTimeAt',
	
		getLocationOf: function() {
			return this.getLocationAtTime(this.getTimeOf(Point.read(arguments)));
		},
	
		getOffsetOf: function() {
			var loc = this.getLocationOf.apply(this, arguments);
			return loc ? loc.getOffset() : null;
		},
	
		getTimeOf: function() {
			return Curve.getTimeOf(this.getValues(), Point.read(arguments));
		},
	
		getParameterOf: '#getTimeOf',
	
		getNearestLocation: function() {
			var point = Point.read(arguments),
				values = this.getValues(),
				t = Curve.getNearestTime(values, point),
				pt = Curve.getPoint(values, t);
			return new CurveLocation(this, t, pt, null, point.getDistance(pt));
		},
	
		getNearestPoint: function() {
			var loc = this.getNearestLocation.apply(this, arguments);
			return loc ? loc.getPoint() : loc;
		}
	
	},
	new function() {
		var methods = ['getPoint', 'getTangent', 'getNormal', 'getWeightedTangent',
			'getWeightedNormal', 'getCurvature'];
		return Base.each(methods,
			function(name) {
				this[name + 'At'] = function(location, _isTime) {
					var values = this.getValues();
					return Curve[name](values, _isTime ? location
							: Curve.getTimeAt(values, location, 0));
				};
	
				this[name + 'AtTime'] = function(time) {
					return Curve[name](this.getValues(), time);
				};
			}, {
				statics: {
					_evaluateMethods: methods
				}
			}
		);
	},
	new function() {
	
		function getLengthIntegrand(v) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7],
	
				ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
				bx = 6 * (p1x + c2x) - 12 * c1x,
				cx = 3 * (c1x - p1x),
	
				ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
				by = 6 * (p1y + c2y) - 12 * c1y,
				cy = 3 * (c1y - p1y);
	
			return function(t) {
				var dx = (ax * t + bx) * t + cx,
					dy = (ay * t + by) * t + cy;
				return Math.sqrt(dx * dx + dy * dy);
			};
		}
	
		function getIterations(a, b) {
			return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
		}
	
		function evaluate(v, t, type, normalized) {
			if (t == null || t < 0 || t > 1)
				return null;
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7],
				isZero = Numerical.isZero;
			if (isZero(c1x - p1x) && isZero(c1y - p1y)) {
				c1x = p1x;
				c1y = p1y;
			}
			if (isZero(c2x - p2x) && isZero(c2y - p2y)) {
				c2x = p2x;
				c2y = p2y;
			}
			var cx = 3 * (c1x - p1x),
				bx = 3 * (c2x - c1x) - cx,
				ax = p2x - p1x - cx - bx,
				cy = 3 * (c1y - p1y),
				by = 3 * (c2y - c1y) - cy,
				ay = p2y - p1y - cy - by,
				x, y;
			if (type === 0) {
				x = t === 0 ? p1x : t === 1 ? p2x
						: ((ax * t + bx) * t + cx) * t + p1x;
				y = t === 0 ? p1y : t === 1 ? p2y
						: ((ay * t + by) * t + cy) * t + p1y;
			} else {
				var tMin = 4e-7,
					tMax = 1 - tMin;
				if (t < tMin) {
					x = cx;
					y = cy;
				} else if (t > tMax) {
					x = 3 * (p2x - c2x);
					y = 3 * (p2y - c2y);
				} else {
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
				}
				if (normalized) {
					if (x === 0 && y === 0 && (t < tMin || t > tMax)) {
						x = c2x - c1x;
						y = c2y - c1y;
					}
					var len = Math.sqrt(x * x + y * y);
					if (len) {
						x /= len;
						y /= len;
					}
				}
				if (type === 3) {
					var x2 = 6 * ax * t + 2 * bx,
						y2 = 6 * ay * t + 2 * by,
						d = Math.pow(x * x + y * y, 3 / 2);
					x = d !== 0 ? (x * y2 - y * x2) / d : 0;
					y = 0;
				}
			}
			return type === 2 ? new Point(y, -x) : new Point(x, y);
		}
	
		return { statics: {
	
			getLength: function(v, a, b, ds) {
				if (a === undefined)
					a = 0;
				if (b === undefined)
					b = 1;
				if (Curve.isStraight(v)) {
					var c = v;
					if (b < 1) {
						c = Curve.subdivide(c, b)[0];
						a /= b;
					}
					if (a > 0) {
						c = Curve.subdivide(c, a)[1];
					}
					var dx = c[6] - c[0],
						dy = c[7] - c[1];
					return Math.sqrt(dx * dx + dy * dy);
				}
				return Numerical.integrate(ds || getLengthIntegrand(v), a, b,
						getIterations(a, b));
			},
	
			getTimeAt: function(v, offset, start) {
				if (start === undefined)
					start = offset < 0 ? 1 : 0;
				if (offset === 0)
					return start;
				var abs = Math.abs,
					epsilon = 1e-12,
					forward = offset > 0,
					a = forward ? start : 0,
					b = forward ? 1 : start,
					ds = getLengthIntegrand(v),
					rangeLength = Curve.getLength(v, a, b, ds),
					diff = abs(offset) - rangeLength;
				if (abs(diff) < epsilon) {
					return forward ? b : a;
				} else if (diff > epsilon) {
					return null;
				}
				var guess = offset / rangeLength,
					length = 0;
				function f(t) {
					length += Numerical.integrate(ds, start, t,
							getIterations(start, t));
					start = t;
					return length - offset;
				}
				return Numerical.findRoot(f, ds, start + guess, a, b, 32,
						1e-12);
			},
	
			getPoint: function(v, t) {
				return evaluate(v, t, 0, false);
			},
	
			getTangent: function(v, t) {
				return evaluate(v, t, 1, true);
			},
	
			getWeightedTangent: function(v, t) {
				return evaluate(v, t, 1, false);
			},
	
			getNormal: function(v, t) {
				return evaluate(v, t, 2, true);
			},
	
			getWeightedNormal: function(v, t) {
				return evaluate(v, t, 2, false);
			},
	
			getCurvature: function(v, t) {
				return evaluate(v, t, 3, false).x;
			}
		}};
	},
	new function() {
	
		function addLocation(locations, param, v1, c1, t1, p1, v2, c2, t2, p2,
				overlap) {
			var excludeStart = !overlap && param.excludeStart,
				excludeEnd = !overlap && param.excludeEnd,
				tMin = 4e-7,
				tMax = 1 - tMin;
			if (t1 == null)
				t1 = Curve.getTimeOf(v1, p1);
			if (t1 !== null && t1 >= (excludeStart ? tMin : 0) &&
				t1 <= (excludeEnd ? tMax : 1)) {
				if (t2 == null)
					t2 = Curve.getTimeOf(v2, p2);
				if (t2 !== null && t2 >= (excludeEnd ? tMin : 0) &&
					t2 <= (excludeStart ? tMax : 1)) {
					var renormalize = param.renormalize;
					if (renormalize) {
						var res = renormalize(t1, t2);
						t1 = res[0];
						t2 = res[1];
					}
					var loc1 = new CurveLocation(c1, t1,
							p1 || Curve.getPoint(v1, t1), overlap),
						loc2 = new CurveLocation(c2, t2,
							p2 || Curve.getPoint(v2, t2), overlap),
						flip = loc1.getPath() === loc2.getPath()
							&& loc1.getIndex() > loc2.getIndex(),
						loc = flip ? loc2 : loc1,
						include = param.include;
					loc1._intersection = loc2;
					loc2._intersection = loc1;
					if (!include || include(loc)) {
						CurveLocation.insert(locations, loc, true);
					}
				}
			}
		}
	
		function addCurveIntersections(v1, v2, c1, c2, locations, param, tMin, tMax,
				uMin, uMax, reverse, recursion) {
			if (++recursion >= 26)
				return;
			var q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7],
				getSignedDistance = Line.getSignedDistance,
				d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]),
				d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]),
				factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
				dMin = factor * Math.min(0, d1, d2),
				dMax = factor * Math.max(0, d1, d2),
				dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1]),
				dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3]),
				dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5]),
				dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7]),
				hull = getConvexHull(dp0, dp1, dp2, dp3),
				top = hull[0],
				bottom = hull[1],
				tMinClip,
				tMaxClip;
			if (d1 === 0 && d2 === 0
					&& dp0 === 0 && dp1 === 0 && dp2 === 0 && dp3 === 0
				|| (tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null
				|| (tMaxClip = clipConvexHull(top.reverse(), bottom.reverse(),
					dMin, dMax)) == null)
				return;
			var tMinNew = tMin + (tMax - tMin) * tMinClip,
				tMaxNew = tMin + (tMax - tMin) * tMaxClip;
			if (Math.max(uMax - uMin, tMaxNew - tMinNew)
					< 1e-9) {
				var t = (tMinNew + tMaxNew) / 2,
					u = (uMin + uMax) / 2;
				v1 = c1.getValues();
				v2 = c2.getValues();
				addLocation(locations, param,
					reverse ? v2 : v1, reverse ? c2 : c1, reverse ? u : t, null,
					reverse ? v1 : v2, reverse ? c1 : c2, reverse ? t : u, null);
			} else {
				v1 = Curve.getPart(v1, tMinClip, tMaxClip);
				if (tMaxClip - tMinClip > 0.8) {
					if (tMaxNew - tMinNew > uMax - uMin) {
						var parts = Curve.subdivide(v1, 0.5),
							t = (tMinNew + tMaxNew) / 2;
						addCurveIntersections(
								v2, parts[0], c2, c1, locations, param,
								uMin, uMax, tMinNew, t, !reverse, recursion);
						addCurveIntersections(
								v2, parts[1], c2, c1, locations, param,
								uMin, uMax, t, tMaxNew, !reverse, recursion);
					} else {
						var parts = Curve.subdivide(v2, 0.5),
							u = (uMin + uMax) / 2;
						addCurveIntersections(
								parts[0], v1, c2, c1, locations, param,
								uMin, u, tMinNew, tMaxNew, !reverse, recursion);
						addCurveIntersections(
								parts[1], v1, c2, c1, locations, param,
								u, uMax, tMinNew, tMaxNew, !reverse, recursion);
					}
				} else {
					addCurveIntersections(v2, v1, c2, c1, locations, param,
							uMin, uMax, tMinNew, tMaxNew, !reverse, recursion);
				}
			}
		}
	
		function getConvexHull(dq0, dq1, dq2, dq3) {
			var p0 = [ 0, dq0 ],
				p1 = [ 1 / 3, dq1 ],
				p2 = [ 2 / 3, dq2 ],
				p3 = [ 1, dq3 ],
				dist1 = dq1 - (2 * dq0 + dq3) / 3,
				dist2 = dq2 - (dq0 + 2 * dq3) / 3,
				hull;
			if (dist1 * dist2 < 0) {
				hull = [[p0, p1, p3], [p0, p2, p3]];
			} else {
				var distRatio = dist1 / dist2;
				hull = [
					distRatio >= 2 ? [p0, p1, p3]
					: distRatio <= 0.5 ? [p0, p2, p3]
					: [p0, p1, p2, p3],
					[p0, p3]
				];
			}
			return (dist1 || dist2) < 0 ? hull.reverse() : hull;
		}
	
		function clipConvexHull(hullTop, hullBottom, dMin, dMax) {
			if (hullTop[0][1] < dMin) {
				return clipConvexHullPart(hullTop, true, dMin);
			} else if (hullBottom[0][1] > dMax) {
				return clipConvexHullPart(hullBottom, false, dMax);
			} else {
				return hullTop[0][0];
			}
		}
	
		function clipConvexHullPart(part, top, threshold) {
			var px = part[0][0],
				py = part[0][1];
			for (var i = 1, l = part.length; i < l; i++) {
				var qx = part[i][0],
					qy = part[i][1];
				if (top ? qy >= threshold : qy <= threshold) {
					return qy === threshold ? qx
							: px + (threshold - py) * (qx - px) / (qy - py);
				}
				px = qx;
				py = qy;
			}
			return null;
		}
	
		function addCurveLineIntersections(v1, v2, c1, c2, locations, param) {
			var flip = Curve.isStraight(v1),
				vc = flip ? v2 : v1,
				vl = flip ? v1 : v2,
				lx1 = vl[0], ly1 = vl[1],
				lx2 = vl[6], ly2 = vl[7],
				ldx = lx2 - lx1,
				ldy = ly2 - ly1,
				angle = Math.atan2(-ldy, ldx),
				sin = Math.sin(angle),
				cos = Math.cos(angle),
				rvc = [];
			for(var i = 0; i < 8; i += 2) {
				var x = vc[i] - lx1,
					y = vc[i + 1] - ly1;
				rvc.push(
					x * cos - y * sin,
					x * sin + y * cos);
			}
			var roots = [],
				count = Curve.solveCubic(rvc, 1, 0, roots, 0, 1);
			for (var i = 0; i < count; i++) {
				var tc = roots[i],
					pc = Curve.getPoint(vc, tc),
					tl = Curve.getTimeOf(vl, pc);
				if (tl !== null) {
					var pl = Curve.getPoint(vl, tl),
						t1 = flip ? tl : tc,
						t2 = flip ? tc : tl;
					if (!param.excludeEnd || t2 > Numerical.CURVETIME_EPSILON) {
						addLocation(locations, param,
								v1, c1, t1, flip ? pl : pc,
								v2, c2, t2, flip ? pc : pl);
					}
				}
			}
		}
	
		function addLineIntersection(v1, v2, c1, c2, locations, param) {
			var pt = Line.intersect(
					v1[0], v1[1], v1[6], v1[7],
					v2[0], v2[1], v2[6], v2[7]);
			if (pt) {
				addLocation(locations, param, v1, c1, null, pt, v2, c2, null, pt);
			}
		}
	
		return { statics: {
			_getIntersections: function(v1, v2, c1, c2, locations, param) {
				if (!v2) {
					return Curve._getSelfIntersection(v1, c1, locations, param);
				}
				var epsilon = 2e-7,
					c1p1x = v1[0], c1p1y = v1[1],
					c1p2x = v1[6], c1p2y = v1[7],
					c2p1x = v2[0], c2p1y = v2[1],
					c2p2x = v2[6], c2p2y = v2[7],
					c1s1x = (3 * v1[2] + c1p1x) / 4,
					c1s1y = (3 * v1[3] + c1p1y) / 4,
					c1s2x = (3 * v1[4] + c1p2x) / 4,
					c1s2y = (3 * v1[5] + c1p2y) / 4,
					c2s1x = (3 * v2[2] + c2p1x) / 4,
					c2s1y = (3 * v2[3] + c2p1y) / 4,
					c2s2x = (3 * v2[4] + c2p2x) / 4,
					c2s2y = (3 * v2[5] + c2p2y) / 4,
					min = Math.min,
					max = Math.max;
				if (!(  max(c1p1x, c1s1x, c1s2x, c1p2x) + epsilon >
						min(c2p1x, c2s1x, c2s2x, c2p2x) &&
						min(c1p1x, c1s1x, c1s2x, c1p2x) - epsilon <
						max(c2p1x, c2s1x, c2s2x, c2p2x) &&
						max(c1p1y, c1s1y, c1s2y, c1p2y) + epsilon >
						min(c2p1y, c2s1y, c2s2y, c2p2y) &&
						min(c1p1y, c1s1y, c1s2y, c1p2y) - epsilon <
						max(c2p1y, c2s1y, c2s2y, c2p2y)))
					return locations;
				var overlaps = Curve.getOverlaps(v1, v2);
				if (overlaps) {
					for (var i = 0; i < 2; i++) {
						var overlap = overlaps[i];
						addLocation(locations, param,
							v1, c1, overlap[0], null,
							v2, c2, overlap[1], null, true);
					}
					return locations;
				}
	
				var straight1 = Curve.isStraight(v1),
					straight2 = Curve.isStraight(v2),
					straight = straight1 && straight2,
					before = locations.length;
				(straight
					? addLineIntersection
					: straight1 || straight2
						? addCurveLineIntersections
						: addCurveIntersections)(
							v1, v2, c1, c2, locations, param,
							0, 1, 0, 1, 0, 0);
				if (straight && locations.length > before)
					return locations;
				var c1p1 = new Point(c1p1x, c1p1y),
					c1p2 = new Point(c1p2x, c1p2y),
					c2p1 = new Point(c2p1x, c2p1y),
					c2p2 = new Point(c2p2x, c2p2y);
				if (c1p1.isClose(c2p1, epsilon))
					addLocation(locations, param, v1, c1, 0, c1p1, v2, c2, 0, c2p1);
				if (!param.excludeStart && c1p1.isClose(c2p2, epsilon))
					addLocation(locations, param, v1, c1, 0, c1p1, v2, c2, 1, c2p2);
				if (!param.excludeEnd && c1p2.isClose(c2p1, epsilon))
					addLocation(locations, param, v1, c1, 1, c1p2, v2, c2, 0, c2p1);
				if (c1p2.isClose(c2p2, epsilon))
					addLocation(locations, param, v1, c1, 1, c1p2, v2, c2, 1, c2p2);
				return locations;
			},
	
			_getSelfIntersection: function(v1, c1, locations, param) {
				var p1x = v1[0], p1y = v1[1],
					h1x = v1[2], h1y = v1[3],
					h2x = v1[4], h2y = v1[5],
					p2x = v1[6], p2y = v1[7];
				var line = new Line(p1x, p1y, p2x, p2y, false),
					side1 = line.getSide(new Point(h1x, h1y), true),
					side2 = line.getSide(new Point(h2x, h2y), true);
				if (side1 === side2) {
					var edgeSum = (p1x - h2x) * (h1y - p2y)
								+ (h1x - p2x) * (h2y - p1y);
					if (edgeSum * side1 > 0)
						return locations;
				}
				var ax = p2x - 3 * h2x + 3 * h1x - p1x,
					bx = h2x - 2 * h1x + p1x,
					cx = h1x - p1x,
					ay = p2y - 3 * h2y + 3 * h1y - p1y,
					by = h2y - 2 * h1y + p1y,
					cy = h1y - p1y,
					ac = ay * cx - ax * cy,
					ab = ay * bx - ax * by,
					bc = by * cx - bx * cy;
				if (ac * ac - 4 * ab * bc < 0) {
					var roots = [],
						tSplit,
						count = Numerical.solveCubic(
								ax * ax  + ay * ay,
								3 * (ax * bx + ay * by),
								2 * (bx * bx + by * by) + ax * cx + ay * cy,
								bx * cx + by * cy,
								roots, 0, 1);
					if (count > 0) {
						for (var i = 0, maxCurvature = 0; i < count; i++) {
							var curvature = Math.abs(
									c1.getCurvatureAtTime(roots[i]));
							if (curvature > maxCurvature) {
								maxCurvature = curvature;
								tSplit = roots[i];
							}
						}
						var parts = Curve.subdivide(v1, tSplit);
						param.excludeEnd = true;
						param.renormalize = function(t1, t2) {
							return [t1 * tSplit, t2 * (1 - tSplit) + tSplit];
						};
						Curve._getIntersections(parts[0], parts[1], c1, c1,
								locations, param);
					}
				}
				return locations;
			},
	
			getOverlaps: function(v1, v2) {
				var abs = Math.abs,
					timeEpsilon = 4e-7,
					geomEpsilon = 2e-7,
					straight1 = Curve.isStraight(v1),
					straight2 = Curve.isStraight(v2),
					straightBoth = straight1 && straight2;
	
				function getSquaredLineLength(v) {
					var x = v[6] - v[0],
						y = v[7] - v[1];
					return x * x + y * y;
				}
	
				var flip = getSquaredLineLength(v1) < getSquaredLineLength(v2),
					l1 = flip ? v2 : v1,
					l2 = flip ? v1 : v2,
					line = new Line(l1[0], l1[1], l1[6], l1[7]);
				if (line.getDistance(new Point(l2[0], l2[1])) < geomEpsilon &&
					line.getDistance(new Point(l2[6], l2[7])) < geomEpsilon) {
					if (!straightBoth &&
						line.getDistance(new Point(l1[2], l1[3])) < geomEpsilon &&
						line.getDistance(new Point(l1[4], l1[5])) < geomEpsilon &&
						line.getDistance(new Point(l2[2], l2[3])) < geomEpsilon &&
						line.getDistance(new Point(l2[4], l2[5])) < geomEpsilon) {
						straight1 = straight2 = straightBoth = true;
					}
				} else if (straightBoth) {
					return null;
				}
				if (straight1 ^ straight2) {
					return null;
				}
	
				var v = [v1, v2],
					pairs = [];
				for (var i = 0, t1 = 0;
						i < 2 && pairs.length < 2;
						i += t1 === 0 ? 0 : 1, t1 = t1 ^ 1) {
					var t2 = Curve.getTimeOf(v[i ^ 1], new Point(
							v[i][t1 === 0 ? 0 : 6],
							v[i][t1 === 0 ? 1 : 7]));
					if (t2 != null) {
						var pair = i === 0 ? [t1, t2] : [t2, t1];
						if (pairs.length === 0 ||
							abs(pair[0] - pairs[0][0]) > timeEpsilon &&
							abs(pair[1] - pairs[0][1]) > timeEpsilon)
							pairs.push(pair);
					}
					if (i === 1 && pairs.length === 0)
						break;
				}
				if (pairs.length !== 2) {
					pairs = null;
				} else if (!straightBoth) {
					var o1 = Curve.getPart(v1, pairs[0][0], pairs[1][0]),
						o2 = Curve.getPart(v2, pairs[0][1], pairs[1][1]);
					if (abs(o2[2] - o1[2]) > geomEpsilon ||
						abs(o2[3] - o1[3]) > geomEpsilon ||
						abs(o2[4] - o1[4]) > geomEpsilon ||
						abs(o2[5] - o1[5]) > geomEpsilon)
						pairs = null;
				}
				return pairs;
			}
		}};
	});
	
	var CurveLocation = Base.extend({
		_class: 'CurveLocation',
		beans: true,
	
		initialize: function CurveLocation(curve, time, point, _overlap, _distance) {
			if (time > 0.9999996) {
				var next = curve.getNext();
				if (next) {
					time = 0;
					curve = next;
				}
			}
			this._setCurve(curve);
			this._time = time;
			this._point = point || curve.getPointAtTime(time);
			this._overlap = _overlap;
			this._distance = _distance;
			this._intersection = this._next = this._previous = null;
		},
	
		_setCurve: function(curve) {
			var path = curve._path;
			this._path = path;
			this._version = path ? path._version : 0;
			this._curve = curve;
			this._segment = null;
			this._segment1 = curve._segment1;
			this._segment2 = curve._segment2;
		},
	
		_setSegment: function(segment) {
			this._setCurve(segment.getCurve());
			this._segment = segment;
			this._time = segment === this._segment1 ? 0 : 1;
			this._point = segment._point.clone();
		},
	
		getSegment: function() {
			var curve = this.getCurve(),
				segment = this._segment;
			if (!segment) {
				var time = this.getTime();
				if (time === 0) {
					segment = curve._segment1;
				} else if (time === 1) {
					segment = curve._segment2;
				} else if (time != null) {
					segment = curve.getPartLength(0, time)
						< curve.getPartLength(time, 1)
							? curve._segment1
							: curve._segment2;
				}
				this._segment = segment;
			}
			return segment;
		},
	
		getCurve: function() {
			var path = this._path,
				that = this;
			if (path && path._version !== this._version) {
				this._time = this._curve = this._offset = null;
			}
	
			function trySegment(segment) {
				var curve = segment && segment.getCurve();
				if (curve && (that._time = curve.getTimeOf(that._point))
						!= null) {
					that._setCurve(curve);
					that._segment = segment;
					return curve;
				}
			}
	
			return this._curve
				|| trySegment(this._segment)
				|| trySegment(this._segment1)
				|| trySegment(this._segment2.getPrevious());
		},
	
		getPath: function() {
			var curve = this.getCurve();
			return curve && curve._path;
		},
	
		getIndex: function() {
			var curve = this.getCurve();
			return curve && curve.getIndex();
		},
	
		getTime: function() {
			var curve = this.getCurve(),
				time = this._time;
			return curve && time == null
				? this._time = curve.getTimeOf(this._point)
				: time;
		},
	
		getParameter: '#getTime',
	
		getPoint: function() {
			return this._point;
		},
	
		getOffset: function() {
			var offset = this._offset;
			if (offset == null) {
				offset = 0;
				var path = this.getPath(),
					index = this.getIndex();
				if (path && index != null) {
					var curves = path.getCurves();
					for (var i = 0; i < index; i++)
						offset += curves[i].getLength();
				}
				this._offset = offset += this.getCurveOffset();
			}
			return offset;
		},
	
		getCurveOffset: function() {
			var curve = this.getCurve(),
				time = this.getTime();
			return time != null && curve && curve.getPartLength(0, time);
		},
	
		getIntersection: function() {
			return this._intersection;
		},
	
		getDistance: function() {
			return this._distance;
		},
	
		divide: function() {
			var curve = this.getCurve(),
				res = null;
			if (curve) {
				res = curve.divideAtTime(this.getTime());
				if (res)
					this._setSegment(res._segment1);
			}
			return res;
		},
	
		split: function() {
			var curve = this.getCurve();
			return curve ? curve.splitAtTime(this.getTime()) : null;
		},
	
		equals: function(loc, _ignoreOther) {
			var res = this === loc,
				epsilon = 2e-7;
			if (!res && loc instanceof CurveLocation
					&& this.getPath() === loc.getPath()
					&& this.getPoint().isClose(loc.getPoint(), epsilon)) {
				var c1 = this.getCurve(),
					c2 = loc.getCurve(),
					abs = Math.abs,
					diff = abs(
						((c1.isLast() && c2.isFirst() ? -1 : c1.getIndex())
								+ this.getTime()) -
						((c2.isLast() && c1.isFirst() ? -1 : c2.getIndex())
								+ loc.getTime()));
				res = (diff < 4e-7
					|| ((diff = abs(this.getOffset() - loc.getOffset())) < epsilon
						|| abs(this.getPath().getLength() - diff) < epsilon))
					&& (_ignoreOther
						|| (!this._intersection && !loc._intersection
							|| this._intersection && this._intersection.equals(
									loc._intersection, true)));
			}
			return res;
		},
	
		toString: function() {
			var parts = [],
				point = this.getPoint(),
				f = Formatter.instance;
			if (point)
				parts.push('point: ' + point);
			var index = this.getIndex();
			if (index != null)
				parts.push('index: ' + index);
			var time = this.getTime();
			if (time != null)
				parts.push('time: ' + f.number(time));
			if (this._distance != null)
				parts.push('distance: ' + f.number(this._distance));
			return '{ ' + parts.join(', ') + ' }';
		},
	
		isTouching: function() {
			var inter = this._intersection;
			if (inter && this.getTangent().isCollinear(inter.getTangent())) {
				var curve1 = this.getCurve(),
					curve2 = inter.getCurve();
				return !(curve1.isStraight() && curve2.isStraight()
						&& curve1.getLine().intersect(curve2.getLine()));
			}
			return false;
		},
	
		isCrossing: function() {
			var inter = this._intersection;
			if (!inter)
				return false;
			var t1 = this.getTime(),
				t2 = inter.getTime(),
				tMin = 4e-7,
				tMax = 1 - tMin,
				t1Inside = t1 > tMin && t1 < tMax,
				t2Inside = t2 > tMin && t2 < tMax;
			if (t1Inside && t2Inside)
				return !this.isTouching();
			var c2 = this.getCurve(),
				c1 = t1 <= tMin ? c2.getPrevious() : c2,
				c4 = inter.getCurve(),
				c3 = t2 <= tMin ? c4.getPrevious() : c4;
			if (t1 >= tMax)
				c2 = c2.getNext();
			if (t2 >= tMax)
				c4 = c4.getNext();
			if (!c1 || !c2 || !c3 || !c4)
				return false;
	
			function isInRange(angle, min, max) {
				return min < max
					? angle > min && angle < max
					: angle > min && angle <= 180 || angle >= -180 && angle < max;
			}
	
			var v2 = c2.getTangentAtTime(t1Inside ? t1 : tMin),
				v1 = (t1Inside ? v2 : c1.getTangentAtTime(tMax)).negate(),
				v4 = c4.getTangentAtTime(t2Inside ? t2 : tMin),
				v3 = (t2Inside ? v4 : c3.getTangentAtTime(tMax)).negate(),
				a1 = v1.getAngle(),
				a2 = v2.getAngle(),
				a3 = v3.getAngle(),
				a4 = v4.getAngle();
			return !!(t1Inside
					? (isInRange(a1, a3, a4) ^ isInRange(a2, a3, a4)) &&
					  (isInRange(a1, a4, a3) ^ isInRange(a2, a4, a3))
					: (isInRange(a3, a1, a2) ^ isInRange(a4, a1, a2)) &&
					  (isInRange(a3, a2, a1) ^ isInRange(a4, a2, a1)));
		},
	
		hasOverlap: function() {
			return !!this._overlap;
		}
	}, Base.each(Curve._evaluateMethods, function(name) {
		var get = name + 'At';
		this[name] = function() {
			var curve = this.getCurve(),
				time = this.getTime();
			return time != null && curve && curve[get](time, true);
		};
	}, {
		preserve: true
	}),
	new function() {
	
		function insert(locations, loc, merge) {
			var length = locations.length,
				l = 0,
				r = length - 1;
	
			function search(index, dir) {
				for (var i = index + dir; i >= -1 && i <= length; i += dir) {
					var loc2 = locations[((i % length) + length) % length];
					if (!loc.getPoint().isClose(loc2.getPoint(),
							2e-7))
						break;
					if (loc.equals(loc2))
						return loc2;
				}
				return null;
			}
	
			while (l <= r) {
				var m = (l + r) >>> 1,
					loc2 = locations[m],
					found;
				if (merge && (found = loc.equals(loc2) ? loc2
						: (search(m, -1) || search(m, 1)))) {
					if (loc._overlap) {
						found._overlap = found._intersection._overlap = true;
					}
					return found;
				}
			var path1 = loc.getPath(),
				path2 = loc2.getPath(),
				diff = path1 === path2
					? (loc.getIndex() + loc.getTime())
					- (loc2.getIndex() + loc2.getTime())
					: path1._id - path2._id;
				if (diff < 0) {
					r = m - 1;
				} else {
					l = m + 1;
				}
			}
			locations.splice(l, 0, loc);
			return loc;
		}
	
		return { statics: {
			insert: insert,
	
			expand: function(locations) {
				var expanded = locations.slice();
				for (var i = locations.length - 1; i >= 0; i--) {
					insert(expanded, locations[i]._intersection, false);
				}
				return expanded;
			}
		}};
	});
	
	var PathItem = Item.extend({
		_class: 'PathItem',
		_selectBounds: false,
		_canScaleStroke: true,
	
		initialize: function PathItem() {
		},
	
		statics: {
			create: function(pathData) {
				var ctor = (pathData && pathData.match(/m/gi) || []).length > 1
						|| /z\s*\S+/i.test(pathData) ? CompoundPath : Path;
				return new ctor(pathData);
			}
		},
	
		_asPathItem: function() {
			return this;
		},
	
		setPathData: function(data) {
	
			var parts = data && data.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/ig),
				coords,
				relative = false,
				previous,
				control,
				current = new Point(),
				start = new Point();
	
			function getCoord(index, coord) {
				var val = +coords[index];
				if (relative)
					val += current[coord];
				return val;
			}
	
			function getPoint(index) {
				return new Point(
					getCoord(index, 'x'),
					getCoord(index + 1, 'y')
				);
			}
	
			this.clear();
	
			for (var i = 0, l = parts && parts.length; i < l; i++) {
				var part = parts[i],
					command = part[0],
					lower = command.toLowerCase();
				coords = part.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g);
				var length = coords && coords.length;
				relative = command === lower;
				if (previous === 'z' && !/[mz]/.test(lower))
					this.moveTo(current = start);
				switch (lower) {
				case 'm':
				case 'l':
					var move = lower === 'm';
					for (var j = 0; j < length; j += 2)
						this[j === 0 && move ? 'moveTo' : 'lineTo'](
								current = getPoint(j));
					control = current;
					if (move)
						start = current;
					break;
				case 'h':
				case 'v':
					var coord = lower === 'h' ? 'x' : 'y';
					for (var j = 0; j < length; j++) {
						current[coord] = getCoord(j, coord);
						this.lineTo(current);
					}
					control = current;
					break;
				case 'c':
					for (var j = 0; j < length; j += 6) {
						this.cubicCurveTo(
								getPoint(j),
								control = getPoint(j + 2),
								current = getPoint(j + 4));
					}
					break;
				case 's':
					for (var j = 0; j < length; j += 4) {
						this.cubicCurveTo(
								/[cs]/.test(previous)
										? current.multiply(2).subtract(control)
										: current,
								control = getPoint(j),
								current = getPoint(j + 2));
						previous = lower;
					}
					break;
				case 'q':
					for (var j = 0; j < length; j += 4) {
						this.quadraticCurveTo(
								control = getPoint(j),
								current = getPoint(j + 2));
					}
					break;
				case 't':
					for (var j = 0; j < length; j += 2) {
						this.quadraticCurveTo(
								control = (/[qt]/.test(previous)
										? current.multiply(2).subtract(control)
										: current),
								current = getPoint(j));
						previous = lower;
					}
					break;
				case 'a':
					for (var j = 0; j < length; j += 7) {
						this.arcTo(current = getPoint(j + 5),
								new Size(+coords[j], +coords[j + 1]),
								+coords[j + 2], +coords[j + 4], +coords[j + 3]);
					}
					break;
				case 'z':
					this.closePath(true);
					break;
				}
				previous = lower;
			}
		},
	
		_canComposite: function() {
			return !(this.hasFill() && this.hasStroke());
		},
	
		_contains: function(point) {
			var winding = point.isInside(
					this.getBounds({ internal: true, handle: true }))
						&& this._getWinding(point);
			return !!(this.getFillRule() === 'evenodd' ? winding & 1 : winding);
		},
	
		getIntersections: function(path, include, _matrix, _returnFirst) {
			var self = this === path || !path,
				matrix1 = this._matrix._orNullIfIdentity(),
				matrix2 = self ? matrix1
					: (_matrix || path._matrix)._orNullIfIdentity();
			if (!self && !this.getBounds(matrix1).touches(path.getBounds(matrix2)))
				return [];
			var curves1 = this.getCurves(),
				curves2 = self ? curves1 : path.getCurves(),
				length1 = curves1.length,
				length2 = self ? length1 : curves2.length,
				values2 = [],
				arrays = [],
				locations,
				path;
			for (var i = 0; i < length2; i++)
				values2[i] = curves2[i].getValues(matrix2);
			for (var i = 0; i < length1; i++) {
				var curve1 = curves1[i],
					values1 = self ? values2[i] : curve1.getValues(matrix1),
					path1 = curve1.getPath();
				if (path1 !== path) {
					path = path1;
					locations = [];
					arrays.push(locations);
				}
				if (self) {
					Curve._getSelfIntersection(values1, curve1, locations, {
						include: include,
						excludeStart: length1 === 1 &&
								curve1.getPoint1().equals(curve1.getPoint2())
					});
				}
				for (var j = self ? i + 1 : 0; j < length2; j++) {
					if (_returnFirst && locations.length)
						return locations;
					var curve2 = curves2[j];
					Curve._getIntersections(
						values1, values2[j], curve1, curve2, locations,
						{
							include: include,
							excludeStart: self && curve1.getPrevious() === curve2,
							excludeEnd: self && curve1.getNext() === curve2
						}
					);
				}
			}
			locations = [];
			for (var i = 0, l = arrays.length; i < l; i++) {
				locations.push.apply(locations, arrays[i]);
			}
			return locations;
		},
	
		getCrossings: function(path) {
			return this.getIntersections(path, function(inter) {
				return inter._overlap || inter.isCrossing();
			});
		},
	
		getNearestLocation: function() {
			var point = Point.read(arguments),
				curves = this.getCurves(),
				minDist = Infinity,
				minLoc = null;
			for (var i = 0, l = curves.length; i < l; i++) {
				var loc = curves[i].getNearestLocation(point);
				if (loc._distance < minDist) {
					minDist = loc._distance;
					minLoc = loc;
				}
			}
			return minLoc;
		},
	
		getNearestPoint: function() {
			var loc = this.getNearestLocation.apply(this, arguments);
			return loc ? loc.getPoint() : loc;
		},
	
		interpolate: function(from, to, factor) {
			var isPath = !this._children,
				name = isPath ? '_segments' : '_children',
				itemsFrom = from[name],
				itemsTo = to[name],
				items = this[name];
			if (!itemsFrom || !itemsTo || itemsFrom.length !== itemsTo.length) {
				throw new Error('Invalid operands in interpolate() call: ' +
						from + ', ' + to);
			}
			var current = items.length,
				length = itemsTo.length;
			if (current < length) {
				var ctor = isPath ? Segment : Path;
				for (var i = current; i < length; i++) {
					this.add(new ctor());
				}
			} else if (current > length) {
				this[isPath ? 'removeSegments' : 'removeChildren'](length, current);
			}
			for (var i = 0; i < length; i++) {
				items[i].interpolate(itemsFrom[i], itemsTo[i], factor);
			}
			if (isPath) {
				this.setClosed(from._closed);
				this._changed(9);
			}
		},
	
	});
	
	var Path = PathItem.extend({
		_class: 'Path',
		_serializeFields: {
			segments: [],
			closed: false
		},
	
		initialize: function Path(arg) {
			this._closed = false;
			this._segments = [];
			this._version = 0;
			var segments = Array.isArray(arg)
				? typeof arg[0] === 'object'
					? arg
					: arguments
				: arg && (arg.size === undefined && (arg.x !== undefined
						|| arg.point !== undefined))
					? arguments
					: null;
			if (segments && segments.length > 0) {
				this.setSegments(segments);
			} else {
				this._curves = undefined;
				this._segmentSelection = 0;
				if (!segments && typeof arg === 'string') {
					this.setPathData(arg);
					arg = null;
				}
			}
			this._initialize(!segments && arg);
		},
	
		_equals: function(item) {
			return this._closed === item._closed
					&& Base.equals(this._segments, item._segments);
		},
	
		copyContent: function(source) {
			this.setSegments(source._segments);
			this._closed = source._closed;
			var clockwise = source._clockwise;
			if (clockwise !== undefined)
				this._clockwise = clockwise;
		},
	
		_changed: function _changed(flags) {
			_changed.base.call(this, flags);
			if (flags & 8) {
				this._length = this._area = this._clockwise = this._monoCurves =
						undefined;
				if (flags & 16) {
					this._version++;
				} else if (this._curves) {
				   for (var i = 0, l = this._curves.length; i < l; i++)
						this._curves[i]._changed();
				}
			} else if (flags & 32) {
				this._bounds = undefined;
			}
		},
	
		getStyle: function() {
			var parent = this._parent;
			return (parent instanceof CompoundPath ? parent : this)._style;
		},
	
		getSegments: function() {
			return this._segments;
		},
	
		setSegments: function(segments) {
			var fullySelected = this.isFullySelected();
			this._segments.length = 0;
			this._segmentSelection = 0;
			this._curves = undefined;
			if (segments && segments.length > 0)
				this._add(Segment.readAll(segments));
			if (fullySelected)
				this.setFullySelected(true);
		},
	
		getFirstSegment: function() {
			return this._segments[0];
		},
	
		getLastSegment: function() {
			return this._segments[this._segments.length - 1];
		},
	
		getCurves: function() {
			var curves = this._curves,
				segments = this._segments;
			if (!curves) {
				var length = this._countCurves();
				curves = this._curves = new Array(length);
				for (var i = 0; i < length; i++)
					curves[i] = new Curve(this, segments[i],
						segments[i + 1] || segments[0]);
			}
			return curves;
		},
	
		getFirstCurve: function() {
			return this.getCurves()[0];
		},
	
		getLastCurve: function() {
			var curves = this.getCurves();
			return curves[curves.length - 1];
		},
	
		isClosed: function() {
			return this._closed;
		},
	
		setClosed: function(closed) {
			if (this._closed != (closed = !!closed)) {
				this._closed = closed;
				if (this._curves) {
					var length = this._curves.length = this._countCurves();
					if (closed)
						this._curves[length - 1] = new Curve(this,
							this._segments[length - 1], this._segments[0]);
				}
				this._changed(25);
			}
		}
	}, {
		beans: true,
	
		getPathData: function(_matrix, _precision) {
			var segments = this._segments,
				length = segments.length,
				f = new Formatter(_precision),
				coords = new Array(6),
				first = true,
				curX, curY,
				prevX, prevY,
				inX, inY,
				outX, outY,
				parts = [];
	
			function addSegment(segment, skipLine) {
				segment._transformCoordinates(_matrix, coords);
				curX = coords[0];
				curY = coords[1];
				if (first) {
					parts.push('M' + f.pair(curX, curY));
					first = false;
				} else {
					inX = coords[2];
					inY = coords[3];
					if (inX === curX && inY === curY
							&& outX === prevX && outY === prevY) {
						if (!skipLine)
							parts.push('l' + f.pair(curX - prevX, curY - prevY));
					} else {
						parts.push('c' + f.pair(outX - prevX, outY - prevY)
								+ ' ' + f.pair(inX - prevX, inY - prevY)
								+ ' ' + f.pair(curX - prevX, curY - prevY));
					}
				}
				prevX = curX;
				prevY = curY;
				outX = coords[4];
				outY = coords[5];
			}
	
			if (length === 0)
				return '';
	
			for (var i = 0; i < length; i++)
				addSegment(segments[i]);
			if (this._closed && length > 0) {
				addSegment(segments[0], true);
				parts.push('z');
			}
			return parts.join('');
		}
	}, {
	
		isEmpty: function() {
			return this._segments.length === 0;
		},
	
		_transformContent: function(matrix) {
			var segments = this._segments,
				coords = new Array(6);
			for (var i = 0, l = segments.length; i < l; i++)
				segments[i]._transformCoordinates(matrix, coords, true);
			return true;
		},
	
		_add: function(segs, index) {
			var segments = this._segments,
				curves = this._curves,
				amount = segs.length,
				append = index == null,
				index = append ? segments.length : index;
			for (var i = 0; i < amount; i++) {
				var segment = segs[i];
				if (segment._path)
					segment = segs[i] = segment.clone();
				segment._path = this;
				segment._index = index + i;
				if (segment._selection)
					this._updateSelection(segment, 0, segment._selection);
			}
			if (append) {
				segments.push.apply(segments, segs);
			} else {
				segments.splice.apply(segments, [index, 0].concat(segs));
				for (var i = index + amount, l = segments.length; i < l; i++)
					segments[i]._index = i;
			}
			if (curves) {
				var total = this._countCurves(),
					start = index > 0 && index + amount - 1 === total ? index - 1
						: index,
					insert = start,
					end = Math.min(start + amount, total);
				if (segs._curves) {
					curves.splice.apply(curves, [start, 0].concat(segs._curves));
					insert += segs._curves.length;
				}
				for (var i = insert; i < end; i++)
					curves.splice(i, 0, new Curve(this, null, null));
				this._adjustCurves(start, end);
			}
			this._changed(25);
			return segs;
		},
	
		_adjustCurves: function(start, end) {
			var segments = this._segments,
				curves = this._curves,
				curve;
			for (var i = start; i < end; i++) {
				curve = curves[i];
				curve._path = this;
				curve._segment1 = segments[i];
				curve._segment2 = segments[i + 1] || segments[0];
				curve._changed();
			}
			if (curve = curves[this._closed && start === 0 ? segments.length - 1
					: start - 1]) {
				curve._segment2 = segments[start] || segments[0];
				curve._changed();
			}
			if (curve = curves[end]) {
				curve._segment1 = segments[end];
				curve._changed();
			}
		},
	
		_countCurves: function() {
			var length = this._segments.length;
			return !this._closed && length > 0 ? length - 1 : length;
		},
	
		add: function(segment1 ) {
			return arguments.length > 1 && typeof segment1 !== 'number'
				? this._add(Segment.readAll(arguments))
				: this._add([ Segment.read(arguments) ])[0];
		},
	
		insert: function(index, segment1 ) {
			return arguments.length > 2 && typeof segment1 !== 'number'
				? this._add(Segment.readAll(arguments, 1), index)
				: this._add([ Segment.read(arguments, 1) ], index)[0];
		},
	
		addSegment: function() {
			return this._add([ Segment.read(arguments) ])[0];
		},
	
		insertSegment: function(index ) {
			return this._add([ Segment.read(arguments, 1) ], index)[0];
		},
	
		addSegments: function(segments) {
			return this._add(Segment.readAll(segments));
		},
	
		insertSegments: function(index, segments) {
			return this._add(Segment.readAll(segments), index);
		},
	
		removeSegment: function(index) {
			return this.removeSegments(index, index + 1)[0] || null;
		},
	
		removeSegments: function(start, end, _includeCurves) {
			start = start || 0;
			end = Base.pick(end, this._segments.length);
			var segments = this._segments,
				curves = this._curves,
				count = segments.length,
				removed = segments.splice(start, end - start),
				amount = removed.length;
			if (!amount)
				return removed;
			for (var i = 0; i < amount; i++) {
				var segment = removed[i];
				if (segment._selection)
					this._updateSelection(segment, segment._selection, 0);
				segment._index = segment._path = null;
			}
			for (var i = start, l = segments.length; i < l; i++)
				segments[i]._index = i;
			if (curves) {
				var index = start > 0 && end === count + (this._closed ? 1 : 0)
						? start - 1
						: start,
					curves = curves.splice(index, amount);
				for (var i = curves.length - 1; i >= 0; i--)
					curves[i]._path = null;
				if (_includeCurves)
					removed._curves = curves.slice(1);
				this._adjustCurves(index, index);
			}
			this._changed(25);
			return removed;
		},
	
		clear: '#removeSegments',
	
		hasHandles: function() {
			var segments = this._segments;
			for (var i = 0, l = segments.length; i < l; i++) {
				if (segments[i].hasHandles())
					return true;
			}
			return false;
		},
	
		clearHandles: function() {
			var segments = this._segments;
			for (var i = 0, l = segments.length; i < l; i++)
				segments[i].clearHandles();
		},
	
		getLength: function() {
			if (this._length == null) {
				var curves = this.getCurves(),
					length = 0;
				for (var i = 0, l = curves.length; i < l; i++)
					length += curves[i].getLength();
				this._length = length;
			}
			return this._length;
		},
	
		getArea: function() {
			if (this._area == null) {
				var segments = this._segments,
					count = segments.length,
					last = count - 1,
					area = 0;
				for (var i = 0, l = this._closed ? count : last; i < l; i++) {
					area += Curve.getArea(Curve.getValues(
							segments[i], segments[i < last ? i + 1 : 0]));
				}
				this._area = area;
			}
			return this._area;
		},
	
		isClockwise: function() {
			if (this._clockwise !== undefined)
				return this._clockwise;
			return this.getArea() >= 0;
		},
	
		setClockwise: function(clockwise) {
			if (this.isClockwise() != (clockwise = !!clockwise))
				this.reverse();
			this._clockwise = clockwise;
		},
	
		isFullySelected: function() {
			var length = this._segments.length;
			return this.isSelected() && length > 0 && this._segmentSelection
					=== length * 7;
		},
	
		setFullySelected: function(selected) {
			if (selected)
				this._selectSegments(true);
			this.setSelected(selected);
		},
	
		setSelection: function setSelection(selection) {
			if (!(selection & 1))
				this._selectSegments(false);
			setSelection.base.call(this, selection);
		},
	
		_selectSegments: function(selected) {
			var segments = this._segments,
				length = segments.length,
				selection = selected ? 7 : 0;
			this._segmentSelection = selection * length;
			for (var i = 0; i < length; i++)
				segments[i]._selection = selection;
		},
	
		_updateSelection: function(segment, oldSelection, newSelection) {
			segment._selection = newSelection;
			var selection = this._segmentSelection += newSelection - oldSelection;
			if (selection > 0)
				this.setSelected(true);
		},
	
		splitAt: function(location) {
			var loc = typeof location === 'number'
					? this.getLocationAt(location) : location,
				index = loc && loc.index,
				time = loc && loc.time,
				tMin = 4e-7,
				tMax = 1 - tMin;
			if (time >= tMax) {
				index++;
				time = 0;
			}
			var curves = this.getCurves();
			if (index >= 0 && index < curves.length) {
				if (time >= tMin) {
					curves[index++].divideAtTime(time);
				}
				var segs = this.removeSegments(index, this._segments.length, true),
					path;
				if (this._closed) {
					this.setClosed(false);
					path = this;
				} else {
					path = new Path(Item.NO_INSERT);
					path.insertAbove(this, true);
					path.copyAttributes(this);
				}
				path._add(segs, 0);
				this.addSegment(segs[0]);
				return path;
			}
			return null;
		},
	
		split: function(index, time) {
			var curve,
				location = time === undefined ? index
					: (curve = this.getCurves()[index])
						&& curve.getLocationAtTime(time);
			return location != null ? this.splitAt(location) : null;
		},
	
		join: function(path) {
			if (path) {
				var segments = path._segments,
					last1 = this.getLastSegment(),
					last2 = path.getLastSegment();
				if (!last2)
					return this;
				if (last1 && last1._point.equals(last2._point))
					path.reverse();
				var first2 = path.getFirstSegment();
				if (last1 && last1._point.equals(first2._point)) {
					last1.setHandleOut(first2._handleOut);
					this._add(segments.slice(1));
				} else {
					var first1 = this.getFirstSegment();
					if (first1 && first1._point.equals(first2._point))
						path.reverse();
					last2 = path.getLastSegment();
					if (first1 && first1._point.equals(last2._point)) {
						first1.setHandleIn(last2._handleIn);
						this._add(segments.slice(0, segments.length - 1), 0);
					} else {
						this._add(segments.slice());
					}
				}
				if (path._closed)
					this._add([segments[0]]);
				path.remove();
			}
			var first = this.getFirstSegment(),
				last = this.getLastSegment();
			if (first !== last && first._point.equals(last._point)) {
				first.setHandleIn(last._handleIn);
				last.remove();
				this.setClosed(true);
			}
			return this;
		},
	
		reduce: function(options) {
			var curves = this.getCurves(),
				simplify = options && options.simplify,
				tolerance = simplify ? 2e-7 : 0;
			for (var i = curves.length - 1; i >= 0; i--) {
				var curve = curves[i];
				if (!curve.hasHandles() && (curve.getLength() < tolerance
						|| simplify && curve.isCollinear(curve.getNext())))
					curve.remove();
			}
			return this;
		},
	
		reverse: function() {
			this._segments.reverse();
			for (var i = 0, l = this._segments.length; i < l; i++) {
				var segment = this._segments[i];
				var handleIn = segment._handleIn;
				segment._handleIn = segment._handleOut;
				segment._handleOut = handleIn;
				segment._index = i;
			}
			this._curves = null;
			if (this._clockwise !== undefined)
				this._clockwise = !this._clockwise;
			this._changed(9);
		},
	
		flatten: function(flatness) {
			var iterator = new PathIterator(this, flatness || 0.25, 256, true),
				parts = iterator.parts,
				segments = [];
			for (var i = 0, l = parts.length; i < l; i++) {
				segments.push(new Segment(parts[i].curve.slice(0, 2)));
			}
			this.setSegments(segments);
		},
	
		simplify: function(tolerance) {
			var segments = new PathFitter(this).fit(tolerance || 2.5);
			if (segments)
				this.setSegments(segments);
			return !!segments;
		},
	
		smooth: function(options) {
			function getIndex(value, _default) {
				var index = value && value.index;
				if (index != null) {
					var path = value.path;
					if (path && path !== that)
						throw new Error(value._class + ' ' + index + ' of ' + path
								+ ' is not part of ' + that);
					if (_default && value instanceof Curve)
						index++;
				} else {
					index = typeof value === 'number' ? value : _default;
				}
				return Math.min(index < 0 && closed
						? index % length
						: index < 0 ? index + length : index, length - 1);
			}
	
			var that = this,
				opts = options || {},
				type = opts.type || 'asymmetric',
				segments = this._segments,
				length = segments.length,
				closed = this._closed,
				loop = closed && opts.from === undefined && opts.to === undefined,
				from = getIndex(opts.from, 0),
				to = getIndex(opts.to, length - 1);
			if (from > to) {
				if (closed) {
					from -= length;
				} else {
					var tmp = from;
					from = to;
					to = tmp;
				}
			}
			if (/^(?:asymmetric|continuous)$/.test(type)) {
				var asymmetric = type === 'asymmetric',
					min = Math.min,
					amount = to - from + 1,
					n = amount - 1,
					padding = loop ? min(amount, 4) : 1,
					paddingLeft = padding,
					paddingRight = padding,
					knots = [];
				if (!closed) {
					paddingLeft = min(1, from);
					paddingRight = min(1, length - to - 1);
				}
				n += paddingLeft + paddingRight;
				if (n <= 1)
					return;
				for (var i = 0, j = from - paddingLeft; i <= n; i++, j++) {
					knots[i] = segments[(j < 0 ? j + length : j) % length]._point;
				}
	
				var x = knots[0]._x + 2 * knots[1]._x,
					y = knots[0]._y + 2 * knots[1]._y,
					f = 2,
					n_1 = n - 1,
					rx = [x],
					ry = [y],
					rf = [f],
					px = [],
					py = [];
				for (var i = 1; i < n; i++) {
					var internal = i < n_1,
						a = internal ? 1 : asymmetric ? 1 : 2,
						b = internal ? 4 : asymmetric ? 2 : 7,
						u = internal ? 4 : asymmetric ? 3 : 8,
						v = internal ? 2 : asymmetric ? 0 : 1,
						m = a / f;
					f = rf[i] = b - m;
					x = rx[i] = u * knots[i]._x + v * knots[i + 1]._x - m * x;
					y = ry[i] = u * knots[i]._y + v * knots[i + 1]._y - m * y;
				}
	
				px[n_1] = rx[n_1] / rf[n_1];
				py[n_1] = ry[n_1] / rf[n_1];
				for (var i = n - 2; i >= 0; i--) {
					px[i] = (rx[i] - px[i + 1]) / rf[i];
					py[i] = (ry[i] - py[i + 1]) / rf[i];
				}
				px[n] = (3 * knots[n]._x - px[n_1]) / 2;
				py[n] = (3 * knots[n]._y - py[n_1]) / 2;
	
				for (var i = paddingLeft, max = n - paddingRight, j = from;
						i <= max; i++, j++) {
					var segment = segments[j < 0 ? j + length : j],
						pt = segment._point,
						hx = px[i] - pt._x,
						hy = py[i] - pt._y;
					if (loop || i < max)
						segment.setHandleOut(hx, hy);
					if (loop || i > paddingLeft)
						segment.setHandleIn(-hx, -hy);
				}
			} else {
				for (var i = from; i <= to; i++) {
					segments[i < 0 ? i + length : i].smooth(opts,
							!loop && i === from, !loop && i === to);
				}
			}
		},
	
		toShape: function(insert) {
			if (!this._closed)
				return null;
	
			var segments = this._segments,
				type,
				size,
				radius,
				topCenter;
	
			function isCollinear(i, j) {
				var seg1 = segments[i],
					seg2 = seg1.getNext(),
					seg3 = segments[j],
					seg4 = seg3.getNext();
				return seg1._handleOut.isZero() && seg2._handleIn.isZero()
						&& seg3._handleOut.isZero() && seg4._handleIn.isZero()
						&& seg2._point.subtract(seg1._point).isCollinear(
							seg4._point.subtract(seg3._point));
			}
	
			function isOrthogonal(i) {
				var seg2 = segments[i],
					seg1 = seg2.getPrevious(),
					seg3 = seg2.getNext();
				return seg1._handleOut.isZero() && seg2._handleIn.isZero()
						&& seg2._handleOut.isZero() && seg3._handleIn.isZero()
						&& seg2._point.subtract(seg1._point).isOrthogonal(
							seg3._point.subtract(seg2._point));
			}
	
			function isArc(i) {
				var seg1 = segments[i],
					seg2 = seg1.getNext(),
					handle1 = seg1._handleOut,
					handle2 = seg2._handleIn,
					kappa = 0.5522847498307936;
				if (handle1.isOrthogonal(handle2)) {
					var pt1 = seg1._point,
						pt2 = seg2._point,
						corner = new Line(pt1, handle1, true).intersect(
								new Line(pt2, handle2, true), true);
					return corner && Numerical.isZero(handle1.getLength() /
							corner.subtract(pt1).getLength() - kappa)
						&& Numerical.isZero(handle2.getLength() /
							corner.subtract(pt2).getLength() - kappa);
				}
				return false;
			}
	
			function getDistance(i, j) {
				return segments[i]._point.getDistance(segments[j]._point);
			}
	
			if (!this.hasHandles() && segments.length === 4
					&& isCollinear(0, 2) && isCollinear(1, 3) && isOrthogonal(1)) {
				type = Shape.Rectangle;
				size = new Size(getDistance(0, 3), getDistance(0, 1));
				topCenter = segments[1]._point.add(segments[2]._point).divide(2);
			} else if (segments.length === 8 && isArc(0) && isArc(2) && isArc(4)
					&& isArc(6) && isCollinear(1, 5) && isCollinear(3, 7)) {
				type = Shape.Rectangle;
				size = new Size(getDistance(1, 6), getDistance(0, 3));
				radius = size.subtract(new Size(getDistance(0, 7),
						getDistance(1, 2))).divide(2);
				topCenter = segments[3]._point.add(segments[4]._point).divide(2);
			} else if (segments.length === 4
					&& isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
				if (Numerical.isZero(getDistance(0, 2) - getDistance(1, 3))) {
					type = Shape.Circle;
					radius = getDistance(0, 2) / 2;
				} else {
					type = Shape.Ellipse;
					radius = new Size(getDistance(2, 0) / 2, getDistance(3, 1) / 2);
				}
				topCenter = segments[1]._point;
			}
	
			if (type) {
				var center = this.getPosition(true),
					shape = new type({
						center: center,
						size: size,
						radius: radius,
						insert: false
					});
				shape.copyAttributes(this, true);
				shape._matrix.prepend(this._matrix);
				shape.rotate(topCenter.subtract(center).getAngle() + 90);
				if (insert === undefined || insert)
					shape.insertAbove(this);
				return shape;
			}
			return null;
		},
	
		toPath: '#clone',
	
		_hitTestSelf: function(point, options, viewMatrix, strokeMatrix) {
			var that = this,
				style = this.getStyle(),
				segments = this._segments,
				numSegments = segments.length,
				closed = this._closed,
				tolerancePadding = options._tolerancePadding,
				strokePadding = tolerancePadding,
				join, cap, miterLimit,
				area, loc, res,
				hitStroke = options.stroke && style.hasStroke(),
				hitFill = options.fill && style.hasFill(),
				hitCurves = options.curves,
				strokeRadius = hitStroke
						? style.getStrokeWidth() / 2
						: hitFill && options.tolerance > 0 || hitCurves
							? 0 : null;
			if (strokeRadius !== null) {
				if (strokeRadius > 0) {
					join = style.getStrokeJoin();
					cap = style.getStrokeCap();
					miterLimit = strokeRadius * style.getMiterLimit();
					strokePadding = strokePadding.add(
						Path._getStrokePadding(strokeRadius,
							!style.getStrokeScaling() && strokeMatrix));
				} else {
					join = cap = 'round';
				}
			}
	
			function isCloseEnough(pt, padding) {
				return point.subtract(pt).divide(padding).length <= 1;
			}
	
			function checkSegmentPoint(seg, pt, name) {
				if (!options.selected || pt.isSelected()) {
					var anchor = seg._point;
					if (pt !== anchor)
						pt = pt.add(anchor);
					if (isCloseEnough(pt, strokePadding)) {
						return new HitResult(name, that, {
							segment: seg,
							point: pt
						});
					}
				}
			}
	
			function checkSegmentPoints(seg, ends) {
				return (ends || options.segments)
					&& checkSegmentPoint(seg, seg._point, 'segment')
					|| (!ends && options.handles) && (
						checkSegmentPoint(seg, seg._handleIn, 'handle-in') ||
						checkSegmentPoint(seg, seg._handleOut, 'handle-out'));
			}
	
			function addToArea(point) {
				area.add(point);
			}
	
			function checkSegmentStroke(segment) {
				if (join !== 'round' || cap !== 'round') {
					area = new Path({ internal: true, closed: true });
					if (closed || segment._index > 0
							&& segment._index < numSegments - 1) {
						if (join !== 'round' && (segment._handleIn.isZero()
								|| segment._handleOut.isZero()))
							Path._addBevelJoin(segment, join, strokeRadius,
								   miterLimit, addToArea, true);
					} else if (cap !== 'round') {
						Path._addSquareCap(segment, cap, strokeRadius, addToArea,
							  true);
					}
					if (!area.isEmpty()) {
						var loc;
						return area.contains(point)
							|| (loc = area.getNearestLocation(point))
								&& isCloseEnough(loc.getPoint(), tolerancePadding);
					}
				}
				return isCloseEnough(segment._point, strokePadding);
			}
	
			if (options.ends && !options.segments && !closed) {
				if (res = checkSegmentPoints(segments[0], true)
						|| checkSegmentPoints(segments[numSegments - 1], true))
					return res;
			} else if (options.segments || options.handles) {
				for (var i = 0; i < numSegments; i++)
					if (res = checkSegmentPoints(segments[i]))
						return res;
			}
			if (strokeRadius !== null) {
				loc = this.getNearestLocation(point);
				if (loc) {
					var time = loc.getTime();
					if (time === 0 || time === 1 && numSegments > 1) {
						if (!checkSegmentStroke(loc.getSegment()))
							loc = null;
					} else if (!isCloseEnough(loc.getPoint(), strokePadding)) {
						loc = null;
					}
				}
				if (!loc && join === 'miter' && numSegments > 1) {
					for (var i = 0; i < numSegments; i++) {
						var segment = segments[i];
						if (point.getDistance(segment._point) <= miterLimit
								&& checkSegmentStroke(segment)) {
							loc = segment.getLocation();
							break;
						}
					}
				}
			}
			return !loc && hitFill && this._contains(point)
					|| loc && !hitStroke && !hitCurves
						? new HitResult('fill', this)
						: loc
							? new HitResult(hitStroke ? 'stroke' : 'curve', this, {
								location: loc,
								point: loc.getPoint()
							})
							: null;
		}
	
	}, Base.each(Curve._evaluateMethods,
		function(name) {
			this[name + 'At'] = function(offset) {
				var loc = this.getLocationAt(offset);
				return loc && loc[name]();
			};
		},
	{
		beans: false,
	
		getLocationOf: function() {
			var point = Point.read(arguments),
				curves = this.getCurves();
			for (var i = 0, l = curves.length; i < l; i++) {
				var loc = curves[i].getLocationOf(point);
				if (loc)
					return loc;
			}
			return null;
		},
	
		getOffsetOf: function() {
			var loc = this.getLocationOf.apply(this, arguments);
			return loc ? loc.getOffset() : null;
		},
	
		getLocationAt: function(offset) {
			var curves = this.getCurves(),
				length = 0;
			for (var i = 0, l = curves.length; i < l; i++) {
				var start = length,
					curve = curves[i];
				length += curve.getLength();
				if (length > offset) {
					return curve.getLocationAt(offset - start);
				}
			}
			if (curves.length > 0 && offset <= this.getLength())
				return new CurveLocation(curves[curves.length - 1], 1);
			return null;
		}
	
	}),
	new function() {
	
		function drawHandles(ctx, segments, matrix, size) {
			var half = size / 2;
	
			function drawHandle(index) {
				var hX = coords[index],
					hY = coords[index + 1];
				if (pX != hX || pY != hY) {
					ctx.beginPath();
					ctx.moveTo(pX, pY);
					ctx.lineTo(hX, hY);
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(hX, hY, half, 0, Math.PI * 2, true);
					ctx.fill();
				}
			}
	
			var coords = new Array(6);
			for (var i = 0, l = segments.length; i < l; i++) {
				var segment = segments[i];
				segment._transformCoordinates(matrix, coords);
				var selection = segment._selection,
					pX = coords[0],
					pY = coords[1];
				if (selection & 2)
					drawHandle(2);
				if (selection & 4)
					drawHandle(4);
				ctx.fillRect(pX - half, pY - half, size, size);
				if (!(selection & 1)) {
					var fillStyle = ctx.fillStyle;
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(pX - half + 1, pY - half + 1, size - 2, size - 2);
					ctx.fillStyle = fillStyle;
				}
			}
		}
	
		function drawSegments(ctx, path, matrix) {
			var segments = path._segments,
				length = segments.length,
				coords = new Array(6),
				first = true,
				curX, curY,
				prevX, prevY,
				inX, inY,
				outX, outY;
	
			function drawSegment(segment) {
				if (matrix) {
					segment._transformCoordinates(matrix, coords);
					curX = coords[0];
					curY = coords[1];
				} else {
					var point = segment._point;
					curX = point._x;
					curY = point._y;
				}
				if (first) {
					ctx.moveTo(curX, curY);
					first = false;
				} else {
					if (matrix) {
						inX = coords[2];
						inY = coords[3];
					} else {
						var handle = segment._handleIn;
						inX = curX + handle._x;
						inY = curY + handle._y;
					}
					if (inX === curX && inY === curY
							&& outX === prevX && outY === prevY) {
						ctx.lineTo(curX, curY);
					} else {
						ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY);
					}
				}
				prevX = curX;
				prevY = curY;
				if (matrix) {
					outX = coords[4];
					outY = coords[5];
				} else {
					var handle = segment._handleOut;
					outX = prevX + handle._x;
					outY = prevY + handle._y;
				}
			}
	
			for (var i = 0; i < length; i++)
				drawSegment(segments[i]);
			if (path._closed && length > 0)
				drawSegment(segments[0]);
		}
	
		return {
			_draw: function(ctx, param, viewMatrix, strokeMatrix) {
				var dontStart = param.dontStart,
					dontPaint = param.dontFinish || param.clip,
					style = this.getStyle(),
					hasFill = style.hasFill(),
					hasStroke = style.hasStroke(),
					dashArray = style.getDashArray(),
					dashLength = !paper.support.nativeDash && hasStroke
							&& dashArray && dashArray.length;
	
				if (!dontStart)
					ctx.beginPath();
	
				if (hasFill || hasStroke && !dashLength || dontPaint) {
					drawSegments(ctx, this, strokeMatrix);
					if (this._closed)
						ctx.closePath();
				}
	
				function getOffset(i) {
					return dashArray[((i % dashLength) + dashLength) % dashLength];
				}
	
				if (!dontPaint && (hasFill || hasStroke)) {
					this._setStyles(ctx, param, viewMatrix);
					if (hasFill) {
						ctx.fill(style.getFillRule());
						ctx.shadowColor = 'rgba(0,0,0,0)';
					}
					if (hasStroke) {
						if (dashLength) {
							if (!dontStart)
								ctx.beginPath();
							var iterator = new PathIterator(this, 0.25, 32, false,
									strokeMatrix),
								length = iterator.length,
								from = -style.getDashOffset(), to,
								i = 0;
							from = from % length;
							while (from > 0) {
								from -= getOffset(i--) + getOffset(i--);
							}
							while (from < length) {
								to = from + getOffset(i++);
								if (from > 0 || to > 0)
									iterator.drawPart(ctx,
											Math.max(from, 0), Math.max(to, 0));
								from = to + getOffset(i++);
							}
						}
						ctx.stroke();
					}
				}
			},
	
			_drawSelected: function(ctx, matrix) {
				ctx.beginPath();
				drawSegments(ctx, this, matrix);
				ctx.stroke();
				drawHandles(ctx, this._segments, matrix, paper.settings.handleSize);
			}
		};
	},
	new function() {
		function getCurrentSegment(that) {
			var segments = that._segments;
			if (segments.length === 0)
				throw new Error('Use a moveTo() command first');
			return segments[segments.length - 1];
		}
	
		return {
			moveTo: function() {
				var segments = this._segments;
				if (segments.length === 1)
					this.removeSegment(0);
				if (!segments.length)
					this._add([ new Segment(Point.read(arguments)) ]);
			},
	
			moveBy: function() {
				throw new Error('moveBy() is unsupported on Path items.');
			},
	
			lineTo: function() {
				this._add([ new Segment(Point.read(arguments)) ]);
			},
	
			cubicCurveTo: function() {
				var handle1 = Point.read(arguments),
					handle2 = Point.read(arguments),
					to = Point.read(arguments),
					current = getCurrentSegment(this);
				current.setHandleOut(handle1.subtract(current._point));
				this._add([ new Segment(to, handle2.subtract(to)) ]);
			},
	
			quadraticCurveTo: function() {
				var handle = Point.read(arguments),
					to = Point.read(arguments),
					current = getCurrentSegment(this)._point;
				this.cubicCurveTo(
					handle.add(current.subtract(handle).multiply(1 / 3)),
					handle.add(to.subtract(handle).multiply(1 / 3)),
					to
				);
			},
	
			curveTo: function() {
				var through = Point.read(arguments),
					to = Point.read(arguments),
					t = Base.pick(Base.read(arguments), 0.5),
					t1 = 1 - t,
					current = getCurrentSegment(this)._point,
					handle = through.subtract(current.multiply(t1 * t1))
						.subtract(to.multiply(t * t)).divide(2 * t * t1);
				if (handle.isNaN())
					throw new Error(
						'Cannot put a curve through points with parameter = ' + t);
				this.quadraticCurveTo(handle, to);
			},
	
			arcTo: function() {
				var current = getCurrentSegment(this),
					from = current._point,
					to = Point.read(arguments),
					through,
					peek = Base.peek(arguments),
					clockwise = Base.pick(peek, true),
					center, extent, vector, matrix;
				if (typeof clockwise === 'boolean') {
					var middle = from.add(to).divide(2),
					through = middle.add(middle.subtract(from).rotate(
							clockwise ? -90 : 90));
				} else if (Base.remain(arguments) <= 2) {
					through = to;
					to = Point.read(arguments);
				} else {
					var radius = Size.read(arguments),
						isZero = Numerical.isZero;
					if (isZero(radius.width) || isZero(radius.height))
						return this.lineTo(to);
					var rotation = Base.read(arguments),
						clockwise = !!Base.read(arguments),
						large = !!Base.read(arguments),
						middle = from.add(to).divide(2),
						pt = from.subtract(middle).rotate(-rotation),
						x = pt.x,
						y = pt.y,
						abs = Math.abs,
						rx = abs(radius.width),
						ry = abs(radius.height),
						rxSq = rx * rx,
						rySq = ry * ry,
						xSq = x * x,
						ySq = y * y;
					var factor = Math.sqrt(xSq / rxSq + ySq / rySq);
					if (factor > 1) {
						rx *= factor;
						ry *= factor;
						rxSq = rx * rx;
						rySq = ry * ry;
					}
					factor = (rxSq * rySq - rxSq * ySq - rySq * xSq) /
							(rxSq * ySq + rySq * xSq);
					if (abs(factor) < 1e-12)
						factor = 0;
					if (factor < 0)
						throw new Error(
								'Cannot create an arc with the given arguments');
					center = new Point(rx * y / ry, -ry * x / rx)
							.multiply((large === clockwise ? -1 : 1)
								* Math.sqrt(factor))
							.rotate(rotation).add(middle);
					matrix = new Matrix().translate(center).rotate(rotation)
							.scale(rx, ry);
					vector = matrix._inverseTransform(from);
					extent = vector.getDirectedAngle(matrix._inverseTransform(to));
					if (!clockwise && extent > 0)
						extent -= 360;
					else if (clockwise && extent < 0)
						extent += 360;
				}
				if (through) {
					var l1 = new Line(from.add(through).divide(2),
								through.subtract(from).rotate(90), true),
						l2 = new Line(through.add(to).divide(2),
								to.subtract(through).rotate(90), true),
						line = new Line(from, to),
						throughSide = line.getSide(through);
					center = l1.intersect(l2, true);
					if (!center) {
						if (!throughSide)
							return this.lineTo(to);
						throw new Error(
								'Cannot create an arc with the given arguments');
					}
					vector = from.subtract(center);
					extent = vector.getDirectedAngle(to.subtract(center));
					var centerSide = line.getSide(center);
					if (centerSide === 0) {
						extent = throughSide * Math.abs(extent);
					} else if (throughSide === centerSide) {
						extent += extent < 0 ? 360 : -360;
					}
				}
				var ext = Math.abs(extent),
					count = ext >= 360 ? 4 : Math.ceil(ext / 90),
					inc = extent / count,
					half = inc * Math.PI / 360,
					z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
					segments = [];
				for (var i = 0; i <= count; i++) {
					var pt = to,
						out = null;
					if (i < count) {
						out = vector.rotate(90).multiply(z);
						if (matrix) {
							pt = matrix._transformPoint(vector);
							out = matrix._transformPoint(vector.add(out))
									.subtract(pt);
						} else {
							pt = center.add(vector);
						}
					}
					if (i === 0) {
						current.setHandleOut(out);
					} else {
						var _in = vector.rotate(-90).multiply(z);
						if (matrix) {
							_in = matrix._transformPoint(vector.add(_in))
									.subtract(pt);
						}
						segments.push(new Segment(pt, _in, out));
					}
					vector = vector.rotate(inc);
				}
				this._add(segments);
			},
	
			lineBy: function() {
				var to = Point.read(arguments),
					current = getCurrentSegment(this)._point;
				this.lineTo(current.add(to));
			},
	
			curveBy: function() {
				var through = Point.read(arguments),
					to = Point.read(arguments),
					parameter = Base.read(arguments),
					current = getCurrentSegment(this)._point;
				this.curveTo(current.add(through), current.add(to), parameter);
			},
	
			cubicCurveBy: function() {
				var handle1 = Point.read(arguments),
					handle2 = Point.read(arguments),
					to = Point.read(arguments),
					current = getCurrentSegment(this)._point;
				this.cubicCurveTo(current.add(handle1), current.add(handle2),
						current.add(to));
			},
	
			quadraticCurveBy: function() {
				var handle = Point.read(arguments),
					to = Point.read(arguments),
					current = getCurrentSegment(this)._point;
				this.quadraticCurveTo(current.add(handle), current.add(to));
			},
	
			arcBy: function() {
				var current = getCurrentSegment(this)._point,
					point = current.add(Point.read(arguments)),
					clockwise = Base.pick(Base.peek(arguments), true);
				if (typeof clockwise === 'boolean') {
					this.arcTo(point, clockwise);
				} else {
					this.arcTo(point, current.add(Point.read(arguments)));
				}
			},
	
			closePath: function(join) {
				this.setClosed(true);
				if (join)
					this.join();
			}
		};
	}, {
	
		_getBounds: function(matrix, options) {
			var method = options.handle
					? 'getHandleBounds'
					: options.stroke
					? 'getStrokeBounds'
					: 'getBounds';
			return Path[method](this._segments, this._closed, this, matrix, options);
		},
	
	statics: {
		getBounds: function(segments, closed, path, matrix, options, strokePadding) {
			var first = segments[0];
			if (!first)
				return new Rectangle();
			var coords = new Array(6),
				prevCoords = first._transformCoordinates(matrix, new Array(6)),
				min = prevCoords.slice(0, 2),
				max = min.slice(),
				roots = new Array(2);
	
			function processSegment(segment) {
				segment._transformCoordinates(matrix, coords);
				for (var i = 0; i < 2; i++) {
					Curve._addBounds(
						prevCoords[i],
						prevCoords[i + 4],
						coords[i + 2],
						coords[i],
						i, strokePadding ? strokePadding[i] : 0, min, max, roots);
				}
				var tmp = prevCoords;
				prevCoords = coords;
				coords = tmp;
			}
	
			for (var i = 1, l = segments.length; i < l; i++)
				processSegment(segments[i]);
			if (closed)
				processSegment(first);
			return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
		},
	
		getStrokeBounds: function(segments, closed, path, matrix, options) {
			var style = path._style,
				stroke = style.hasStroke(),
				strokeWidth = style.getStrokeWidth(),
				strokeMatrix = stroke && path._getStrokeMatrix(matrix, options),
				strokePadding = stroke && Path._getStrokePadding(strokeWidth,
					strokeMatrix),
				bounds = Path.getBounds(segments, closed, path, matrix, options,
					strokePadding);
			if (!stroke)
				return bounds;
			var strokeRadius = strokeWidth / 2,
				join = style.getStrokeJoin(),
				cap = style.getStrokeCap(),
				miterLimit = strokeRadius * style.getMiterLimit(),
				joinBounds = new Rectangle(new Size(strokePadding));
	
			function add(point) {
				bounds = bounds.include(strokeMatrix
					? strokeMatrix._transformPoint(point, point) : point);
			}
	
			function addRound(segment) {
				var point = segment._point;
				bounds = bounds.unite(joinBounds.setCenter(matrix
						? matrix._transformPoint(point) : point));
			}
	
			function addJoin(segment, join) {
				var handleIn = segment._handleIn,
					handleOut = segment._handleOut;
				if (join === 'round' || !handleIn.isZero() && !handleOut.isZero()
						&& handleIn.isCollinear(handleOut)) {
					addRound(segment);
				} else {
					Path._addBevelJoin(segment, join, strokeRadius, miterLimit, add);
				}
			}
	
			function addCap(segment, cap) {
				if (cap === 'round') {
					addRound(segment);
				} else {
					Path._addSquareCap(segment, cap, strokeRadius, add);
				}
			}
	
			var length = segments.length - (closed ? 0 : 1);
			for (var i = 1; i < length; i++)
				addJoin(segments[i], join);
			if (closed) {
				addJoin(segments[0], join);
			} else if (length > 0) {
				addCap(segments[0], cap);
				addCap(segments[segments.length - 1], cap);
			}
			return bounds;
		},
	
		_getStrokePadding: function(radius, matrix) {
			if (!matrix)
				return [radius, radius];
			var mx = matrix._shiftless(),
				hor = mx.transform(new Point(radius, 0)),
				ver = mx.transform(new Point(0, radius)),
				phi = hor.getAngleInRadians(),
				a = hor.getLength(),
				b = ver.getLength();
			var sin = Math.sin(phi),
				cos = Math.cos(phi),
				tan = Math.tan(phi),
				tx = Math.atan2(b * tan, a),
				ty = Math.atan2(b, tan * a);
			return [Math.abs(a * Math.cos(tx) * cos + b * Math.sin(tx) * sin),
					Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
		},
	
		_addBevelJoin: function(segment, join, radius, miterLimit, addPoint, area) {
			var curve2 = segment.getCurve(),
				curve1 = curve2.getPrevious(),
				point = curve2.getPointAtTime(0),
				normal1 = curve1.getNormalAtTime(1),
				normal2 = curve2.getNormalAtTime(0),
				step = normal1.getDirectedAngle(normal2) < 0 ? -radius : radius;
			normal1.setLength(step);
			normal2.setLength(step);
			if (area) {
				addPoint(point);
				addPoint(point.add(normal1));
			}
			if (join === 'miter') {
				var corner = new Line(
						point.add(normal1),
						new Point(-normal1.y, normal1.x), true
					).intersect(new Line(
						point.add(normal2),
						new Point(-normal2.y, normal2.x), true
					), true);
				if (corner && point.getDistance(corner) <= miterLimit) {
					addPoint(corner);
					if (!area)
						return;
				}
			}
			if (!area)
				addPoint(point.add(normal1));
			addPoint(point.add(normal2));
		},
	
		_addSquareCap: function(segment, cap, radius, addPoint, area) {
			var point = segment._point,
				loc = segment.getLocation(),
				normal = loc.getNormal().multiply(radius);
			if (area) {
				addPoint(point.subtract(normal));
				addPoint(point.add(normal));
			}
			if (cap === 'square')
				point = point.add(normal.rotate(
						loc.getTime() === 0 ? -90 : 90));
			addPoint(point.add(normal));
			addPoint(point.subtract(normal));
		},
	
		getHandleBounds: function(segments, closed, path, matrix, options) {
			var style = path._style,
				stroke = options.stroke && style.hasStroke(),
				strokePadding,
				joinPadding;
			if (stroke) {
				var strokeMatrix = path._getStrokeMatrix(matrix, options),
					strokeRadius = style.getStrokeWidth() / 2,
					joinRadius = strokeRadius;
				if (style.getStrokeJoin() === 'miter')
					joinRadius = strokeRadius * style.getMiterLimit();
				if (style.getStrokeCap() === 'square')
					joinRadius = Math.max(joinRadius, strokeRadius * Math.sqrt(2));
				strokePadding = Path._getStrokePadding(strokeRadius, strokeMatrix);
				joinPadding = Path._getStrokePadding(joinRadius, strokeMatrix);
			}
			var coords = new Array(6),
				x1 = Infinity,
				x2 = -x1,
				y1 = x1,
				y2 = x2;
			for (var i = 0, l = segments.length; i < l; i++) {
				var segment = segments[i];
				segment._transformCoordinates(matrix, coords);
				for (var j = 0; j < 6; j += 2) {
					var padding = j === 0 ? joinPadding : strokePadding,
						paddingX = padding ? padding[0] : 0,
						paddingY = padding ? padding[1] : 0,
						x = coords[j],
						y = coords[j + 1],
						xn = x - paddingX,
						xx = x + paddingX,
						yn = y - paddingY,
						yx = y + paddingY;
					if (xn < x1) x1 = xn;
					if (xx > x2) x2 = xx;
					if (yn < y1) y1 = yn;
					if (yx > y2) y2 = yx;
				}
			}
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		}
	}});
	
	Path.inject({ statics: new function() {
	
		var kappa = 0.5522847498307936,
			ellipseSegments = [
				new Segment([-1, 0], [0, kappa ], [0, -kappa]),
				new Segment([0, -1], [-kappa, 0], [kappa, 0 ]),
				new Segment([1, 0], [0, -kappa], [0, kappa ]),
				new Segment([0, 1], [kappa, 0 ], [-kappa, 0])
			];
	
		function createPath(segments, closed, args) {
			var props = Base.getNamed(args),
				path = new Path(props && props.insert === false && Item.NO_INSERT);
			path._add(segments);
			path._closed = closed;
			return path.set(props);
		}
	
		function createEllipse(center, radius, args) {
			var segments = new Array(4);
			for (var i = 0; i < 4; i++) {
				var segment = ellipseSegments[i];
				segments[i] = new Segment(
					segment._point.multiply(radius).add(center),
					segment._handleIn.multiply(radius),
					segment._handleOut.multiply(radius)
				);
			}
			return createPath(segments, true, args);
		}
	
		return {
			Line: function() {
				return createPath([
					new Segment(Point.readNamed(arguments, 'from')),
					new Segment(Point.readNamed(arguments, 'to'))
				], false, arguments);
			},
	
			Circle: function() {
				var center = Point.readNamed(arguments, 'center'),
					radius = Base.readNamed(arguments, 'radius');
				return createEllipse(center, new Size(radius), arguments);
			},
	
			Rectangle: function() {
				var rect = Rectangle.readNamed(arguments, 'rectangle'),
					radius = Size.readNamed(arguments, 'radius', 0,
							{ readNull: true }),
					bl = rect.getBottomLeft(true),
					tl = rect.getTopLeft(true),
					tr = rect.getTopRight(true),
					br = rect.getBottomRight(true),
					segments;
				if (!radius || radius.isZero()) {
					segments = [
						new Segment(bl),
						new Segment(tl),
						new Segment(tr),
						new Segment(br)
					];
				} else {
					radius = Size.min(radius, rect.getSize(true).divide(2));
					var rx = radius.width,
						ry = radius.height,
						hx = rx * kappa,
						hy = ry * kappa;
					segments = [
						new Segment(bl.add(rx, 0), null, [-hx, 0]),
						new Segment(bl.subtract(0, ry), [0, hy]),
						new Segment(tl.add(0, ry), null, [0, -hy]),
						new Segment(tl.add(rx, 0), [-hx, 0], null),
						new Segment(tr.subtract(rx, 0), null, [hx, 0]),
						new Segment(tr.add(0, ry), [0, -hy], null),
						new Segment(br.subtract(0, ry), null, [0, hy]),
						new Segment(br.subtract(rx, 0), [hx, 0])
					];
				}
				return createPath(segments, true, arguments);
			},
	
			RoundRectangle: '#Rectangle',
	
			Ellipse: function() {
				var ellipse = Shape._readEllipse(arguments);
				return createEllipse(ellipse.center, ellipse.radius, arguments);
			},
	
			Oval: '#Ellipse',
	
			Arc: function() {
				var from = Point.readNamed(arguments, 'from'),
					through = Point.readNamed(arguments, 'through'),
					to = Point.readNamed(arguments, 'to'),
					props = Base.getNamed(arguments),
					path = new Path(props && props.insert === false
							&& Item.NO_INSERT);
				path.moveTo(from);
				path.arcTo(through, to);
				return path.set(props);
			},
	
			RegularPolygon: function() {
				var center = Point.readNamed(arguments, 'center'),
					sides = Base.readNamed(arguments, 'sides'),
					radius = Base.readNamed(arguments, 'radius'),
					step = 360 / sides,
					three = sides % 3 === 0,
					vector = new Point(0, three ? -radius : radius),
					offset = three ? -1 : 0.5,
					segments = new Array(sides);
				for (var i = 0; i < sides; i++)
					segments[i] = new Segment(center.add(
						vector.rotate((i + offset) * step)));
				return createPath(segments, true, arguments);
			},
	
			Star: function() {
				var center = Point.readNamed(arguments, 'center'),
					points = Base.readNamed(arguments, 'points') * 2,
					radius1 = Base.readNamed(arguments, 'radius1'),
					radius2 = Base.readNamed(arguments, 'radius2'),
					step = 360 / points,
					vector = new Point(0, -1),
					segments = new Array(points);
				for (var i = 0; i < points; i++)
					segments[i] = new Segment(center.add(vector.rotate(step * i)
							.multiply(i % 2 ? radius2 : radius1)));
				return createPath(segments, true, arguments);
			}
		};
	}});
	
	var CompoundPath = PathItem.extend({
		_class: 'CompoundPath',
		_serializeFields: {
			children: []
		},
	
		initialize: function CompoundPath(arg) {
			this._children = [];
			this._namedChildren = {};
			if (!this._initialize(arg)) {
				if (typeof arg === 'string') {
					this.setPathData(arg);
				} else {
					this.addChildren(Array.isArray(arg) ? arg : arguments);
				}
			}
		},
	
		insertChildren: function insertChildren(index, items, _preserve) {
			for (var i = items.length - 1; i >= 0; i--) {
				var item = items[i];
				if (item instanceof CompoundPath) {
					items = items.slice();
					items.splice.apply(items, [i, 1].concat(item.removeChildren()));
					item.remove();
				}
			}
			items = insertChildren.base.call(this, index, items, _preserve, Path);
			for (var i = 0, l = !_preserve && items && items.length; i < l; i++) {
				var item = items[i];
				if (item._clockwise === undefined)
					item.setClockwise(item._index === 0);
			}
			return items;
		},
	
		reduce: function reduce(options) {
			var children = this._children;
			for (var i = children.length - 1; i >= 0; i--) {
				var path = children[i].reduce(options);
				if (path.isEmpty())
					path.remove();
			}
			if (children.length === 0) {
				var path = new Path(Item.NO_INSERT);
				path.copyAttributes(this);
				path.insertAbove(this);
				this.remove();
				return path;
			}
			return reduce.base.call(this);
		},
	
		isClockwise: function() {
			var child = this.getFirstChild();
			return child && child.isClockwise();
		},
	
		setClockwise: function(clockwise) {
			if (this.isClockwise() ^ !!clockwise)
				this.reverse();
		},
	
		getFirstSegment: function() {
			var first = this.getFirstChild();
			return first && first.getFirstSegment();
		},
	
		getLastSegment: function() {
			var last = this.getLastChild();
			return last && last.getLastSegment();
		},
	
		getCurves: function() {
			var children = this._children,
				curves = [];
			for (var i = 0, l = children.length; i < l; i++)
				curves.push.apply(curves, children[i].getCurves());
			return curves;
		},
	
		getFirstCurve: function() {
			var first = this.getFirstChild();
			return first && first.getFirstCurve();
		},
	
		getLastCurve: function() {
			var last = this.getLastChild();
			return last && last.getFirstCurve();
		},
	
		getArea: function() {
			var children = this._children,
				area = 0;
			for (var i = 0, l = children.length; i < l; i++)
				area += children[i].getArea();
			return area;
		}
	}, {
		beans: true,
	
		getPathData: function(_matrix, _precision) {
			var children = this._children,
				paths = [];
			for (var i = 0, l = children.length; i < l; i++) {
				var child = children[i],
					mx = child._matrix;
				paths.push(child.getPathData(_matrix && !mx.isIdentity()
						? _matrix.appended(mx) : _matrix, _precision));
			}
			return paths.join(' ');
		}
	}, {
		_hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
			return _hitTestChildren.base.call(this, point,
					options.class === Path || options.type === 'path' ? options
						: Base.set({}, options, { fill: false }),
					viewMatrix);
		},
	
		_draw: function(ctx, param, viewMatrix, strokeMatrix) {
			var children = this._children;
			if (children.length === 0)
				return;
	
			param = param.extend({ dontStart: true, dontFinish: true });
			ctx.beginPath();
			for (var i = 0, l = children.length; i < l; i++)
				children[i].draw(ctx, param, strokeMatrix);
	
			if (!param.clip) {
				this._setStyles(ctx, param, viewMatrix);
				var style = this._style;
				if (style.hasFill()) {
					ctx.fill(style.getFillRule());
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}
				if (style.hasStroke())
					ctx.stroke();
			}
		},
	
		_drawSelected: function(ctx, matrix, selectionItems) {
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++) {
				var child = children[i],
					mx = child._matrix;
				if (!selectionItems[child._id]) {
					child._drawSelected(ctx, mx.isIdentity() ? matrix
							: matrix.appended(mx));
				}
			}
		}
	},
	new function() {
		function getCurrentPath(that, check) {
			var children = that._children;
			if (check && children.length === 0)
				throw new Error('Use a moveTo() command first');
			return children[children.length - 1];
		}
	
		return Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
				'arcTo', 'lineBy', 'cubicCurveBy', 'quadraticCurveBy', 'curveBy',
				'arcBy'],
			function(key) {
				this[key] = function() {
					var path = getCurrentPath(this, true);
					path[key].apply(path, arguments);
				};
			}, {
				moveTo: function() {
					var current = getCurrentPath(this),
						path = current && current.isEmpty() ? current
								: new Path(Item.NO_INSERT);
					if (path !== current)
						this.addChild(path);
					path.moveTo.apply(path, arguments);
				},
	
				moveBy: function() {
					var current = getCurrentPath(this, true),
						last = current && current.getLastSegment(),
						point = Point.read(arguments);
					this.moveTo(last ? point.add(last._point) : point);
				},
	
				closePath: function(join) {
					getCurrentPath(this, true).closePath(join);
				}
			}
		);
	}, Base.each(['reverse', 'flatten', 'simplify', 'smooth'], function(key) {
		this[key] = function(param) {
			var children = this._children,
				res;
			for (var i = 0, l = children.length; i < l; i++) {
				res = children[i][key](param) || res;
			}
			return res;
		};
	}, {}));
	
	PathItem.inject(new function() {
		var operators = {
			unite:     { 0: true, 1: true },
			intersect: { 2: true },
			subtract:  { 1: true },
			exclude:   { 1: true }
		};
	
		function preparePath(path, resolve) {
			var res = path.clone(false).reduce({ simplify: true })
					.transform(null, true, true);
			return resolve ? res.resolveCrossings() : res;
		}
	
		function createResult(ctor, paths, reduce, path1, path2) {
			var result = new ctor(Item.NO_INSERT);
			result.addChildren(paths, true);
			if (reduce)
				result = result.reduce({ simplify: true });
			result.insertAbove(path2 && path1.isSibling(path2)
					&& path1.getIndex() < path2.getIndex() ? path2 : path1);
			result.copyAttributes(path1, true);
			return result;
		}
	
		function computeBoolean(path1, path2, operation) {
			var operator = operators[operation];
			operator[operation] = true;
			if (!path1._children && !path1._closed)
				return computeOpenBoolean(path1, path2, operator);
			var _path1 = preparePath(path1, true),
				_path2 = path2 && path1 !== path2 && preparePath(path2, true);
			if (_path2 && (operator.subtract || operator.exclude)
					^ (_path2.isClockwise() ^ _path1.isClockwise()))
				_path2.reverse();
			var crossings = divideLocations(
					CurveLocation.expand(_path1.getCrossings(_path2))),
				segments = [],
				monoCurves = [];
	
			function collect(paths) {
				for (var i = 0, l = paths.length; i < l; i++) {
					var path = paths[i];
					segments.push.apply(segments, path._segments);
					monoCurves.push.apply(monoCurves, path._getMonoCurves());
					path._overlapsOnly = path._validOverlapsOnly = true;
				}
			}
	
			collect(_path1._children || [_path1]);
			if (_path2)
				collect(_path2._children || [_path2]);
			for (var i = 0, l = crossings.length; i < l; i++) {
				propagateWinding(crossings[i]._segment, _path1, _path2, monoCurves,
						operator);
			}
			for (var i = 0, l = segments.length; i < l; i++) {
				var segment = segments[i],
					inter = segment._intersection;
				if (segment._winding == null) {
					propagateWinding(segment, _path1, _path2, monoCurves, operator);
				}
				if (!(inter && inter._overlap)) {
					var path = segment._path;
					path._overlapsOnly = false;
					if (operator[segment._winding])
						path._validOverlapsOnly = false;
				}
			}
			return createResult(CompoundPath, tracePaths(segments, operator), true,
						path1, path2);
		}
	
		function computeOpenBoolean(path1, path2, operator) {
			if (!path2 || !path2._children && !path2._closed
					|| !operator.subtract && !operator.intersect)
				return null;
			var _path1 = preparePath(path1, false),
				_path2 = preparePath(path2, false),
				crossings = _path1.getCrossings(_path2),
				sub = operator.subtract,
				paths = [];
	
			function addPath(path) {
				if (_path2.contains(path.getPointAt(path.getLength() / 2)) ^ sub) {
					paths.unshift(path);
					return true;
				}
			}
	
			for (var i = crossings.length - 1; i >= 0; i--) {
				var path = crossings[i].split();
				if (path) {
					if (addPath(path))
						path.getFirstSegment().setHandleIn(0, 0);
					_path1.getLastSegment().setHandleOut(0, 0);
				}
			}
			addPath(_path1);
			return createResult(Group, paths, false, path1, path2);
		}
	
		function linkIntersections(from, to) {
			var prev = from;
			while (prev) {
				if (prev === to)
					return;
				prev = prev._previous;
			}
			while (from._next && from._next !== to)
				from = from._next;
			if (!from._next) {
				while (to._previous)
					to = to._previous;
				from._next = to;
				to._previous = from;
			}
		}
	
		function divideLocations(locations, include) {
			var results = include && [],
				tMin = 4e-7,
				tMax = 1 - tMin,
				noHandles = false,
				clearCurves = [],
				prevCurve,
				prevTime;
	
			for (var i = locations.length - 1; i >= 0; i--) {
				var loc = locations[i];
				if (include) {
					if (!include(loc))
						continue;
					results.unshift(loc);
				}
				var curve = loc._curve,
					time = loc._time,
					origTime = time,
					segment;
				if (curve !== prevCurve) {
					noHandles = !curve.hasHandles();
				} else if (prevTime > 0) {
					time /= prevTime;
				}
				if (time < tMin) {
					segment = curve._segment1;
				} else if (time > tMax) {
					segment = curve._segment2;
				} else {
					var newCurve = curve.divideAtTime(time, true);
					if (noHandles)
						clearCurves.push(curve, newCurve);
					segment = newCurve._segment1;
				}
				loc._setSegment(segment);
				var inter = segment._intersection,
					dest = loc._intersection;
				if (inter) {
					linkIntersections(inter, dest);
					var other = inter;
					while (other) {
						linkIntersections(other._intersection, inter);
						other = other._next;
					}
				} else {
					segment._intersection = dest;
				}
				prevCurve = curve;
				prevTime = origTime;
			}
			for (var i = 0, l = clearCurves.length; i < l; i++) {
				clearCurves[i].clearHandles();
			}
			return results || locations;
		}
	
		function getWinding(point, curves, horizontal) {
			var epsilon = 2e-7,
				px = point.x,
				py = point.y,
				windLeft = 0,
				windRight = 0,
				length = curves.length,
				roots = [],
				abs = Math.abs;
			if (horizontal) {
				var yTop = -Infinity,
					yBottom = Infinity,
					yBefore = py - epsilon,
					yAfter = py + epsilon;
				for (var i = 0; i < length; i++) {
					var values = curves[i].values,
						count = Curve.solveCubic(values, 0, px, roots, 0, 1);
					for (var j = count - 1; j >= 0; j--) {
						var y = Curve.getPoint(values, roots[j]).y;
						if (y < yBefore && y > yTop) {
							yTop = y;
						} else if (y > yAfter && y < yBottom) {
							yBottom = y;
						}
					}
				}
				yTop = (yTop + py) / 2;
				yBottom = (yBottom + py) / 2;
				if (yTop > -Infinity)
					windLeft = getWinding(new Point(px, yTop), curves);
				if (yBottom < Infinity)
					windRight = getWinding(new Point(px, yBottom), curves);
			} else {
				var xBefore = px - epsilon,
					xAfter = px + epsilon,
					prevWinding,
					prevXEnd,
					windLeftOnCurve = 0,
					windRightOnCurve = 0,
					isOnCurve = false;
				for (var i = 0; i < length; i++) {
					var curve = curves[i],
						winding = curve.winding,
						values = curve.values,
						yStart = values[1],
						yEnd = values[7];
					if (curve.last) {
						prevWinding = curve.last.winding;
						prevXEnd = curve.last.values[6];
						isOnCurve = false;
					}
					if (py >= yStart && py <= yEnd || py >= yEnd && py <= yStart) {
						if (winding) {
							var x = py === yStart ? values[0]
								: py === yEnd ? values[6]
								: Curve.solveCubic(values, 1, py, roots, 0, 1) === 1
								? Curve.getPoint(values, roots[0]).x
								: null;
							if (x != null) {
								if (x >= xBefore && x <= xAfter) {
									isOnCurve = true;
								} else if (
									(py !== yStart || winding !== prevWinding)
									&& !(py === yStart
										&& (px - x) * (px - prevXEnd) < 0)) {
									if (x < xBefore) {
										windLeft += winding;
									} else if (x > xAfter) {
										windRight += winding;
									}
								}
							}
							prevWinding = winding;
							prevXEnd = values[6];
						} else if ((px - values[0]) * (px - values[6]) <= 0) {
							isOnCurve = true;
						}
					}
					if (isOnCurve && (i >= length - 1 || curves[i + 1].last)) {
						windLeftOnCurve += 1;
						windRightOnCurve -= 1;
					}
				}
				if (windLeft === 0 && windRight === 0) {
					windLeft = windLeftOnCurve;
					windRight = windRightOnCurve;
				}
			}
			return Math.max(abs(windLeft), abs(windRight));
		}
	
		function propagateWinding(segment, path1, path2, monoCurves, operator) {
			var chain = [],
				start = segment,
				totalLength = 0,
				windingSum = 0;
			do {
				var curve = segment.getCurve(),
					length = curve.getLength();
				chain.push({ segment: segment, curve: curve, length: length });
				totalLength += length;
				segment = segment.getNext();
			} while (segment && !segment._intersection && segment !== start);
			for (var i = 0; i < 3; i++) {
				var length = totalLength * (i + 1) / 4;
				for (var j = 0, l = chain.length; j < l; j++) {
					var entry = chain[j],
						curveLength = entry.length;
					if (length <= curveLength) {
						var curve = entry.curve,
							path = curve._path,
							parent = path._parent,
							t = curve.getTimeAt(length),
							pt = curve.getPointAtTime(t),
							hor = Math.abs(curve.getTangentAtTime(t).y)
									< 1e-7;
						if (parent instanceof CompoundPath)
							path = parent;
						if (!(operator.subtract && path2
								&& (path === path1 && path2._getWinding(pt, hor)
								|| path === path2 && !path1._getWinding(pt, hor))))
							windingSum += getWinding(pt, monoCurves, hor);
						break;
					}
					length -= curveLength;
				}
			}
			var winding = Math.round(windingSum / 3);
			for (var j = chain.length - 1; j >= 0; j--)
				chain[j].segment._winding = winding;
		}
	
		function tracePaths(segments, operator) {
			var paths = [],
				start,
				otherStart;
	
			function isValid(seg) {
				return !!(!seg._visited && (!operator || operator[seg._winding]));
			}
	
			function isStart(seg) {
				return seg === start || seg === otherStart;
			}
	
			function findBestIntersection(inter, exclude, strict) {
				if (!inter._next)
					return inter;
				while (inter) {
					var seg = inter._segment,
						nextSeg = seg && seg.getNext(),
						nextInter = nextSeg && nextSeg._intersection;
					if (seg !== exclude && (isStart(seg) || isStart(nextSeg)
						|| !seg._visited && !(nextSeg && nextSeg._visited)
						&& (!operator
							|| (!strict || isValid(seg))
							&& (!(strict && nextInter && nextInter._overlap)
								&& nextSeg && isValid(nextSeg)
								|| !strict && nextInter
								&& isValid(nextInter._segment))
						)))
						return inter;
					inter = inter._next;
				}
				return null;
			}
	
			for (var i = 0, l = segments.length; i < l; i++) {
				var path = null,
					finished = false,
					seg = segments[i],
					inter = seg._intersection,
					handleIn;
				if (!seg._visited && seg._path._overlapsOnly) {
					var path1 = seg._path,
						path2 = inter._segment._path,
						segments1 = path1._segments,
						segments2 = path2._segments;
					if (Base.equals(segments1, segments2)) {
						if ((operator.unite || operator.intersect)
								&& path1.getArea()) {
							paths.push(path1.clone(false));
						}
						for (var j = 0, k = segments1.length; j < k; j++) {
							segments1[j]._visited = segments2[j]._visited = true;
						}
					}
				}
				if (!isValid(seg) || !seg._path._validOverlapsOnly
						&& inter && seg._winding && inter._overlap)
					continue;
				start = otherStart = null;
				while (true) {
					inter = inter && (findBestIntersection(inter, seg, true)
							|| findBestIntersection(inter, seg, false)) || inter;
					var other = inter && inter._segment;
					if (isStart(seg)) {
						finished = true;
					} else if (other) {
						if (isStart(other)) {
							finished = true;
							seg = other;
						} else if (isValid(other)) {
							if (operator && inter._overlap
									&& (operator.intersect || operator.subtract)) {
								seg._visited = true;
							}
							seg = other;
						}
					}
					if (finished || seg._visited) {
						seg._visited = true;
						break;
					}
					if (!seg._path || (seg._path._validOverlapsOnly && !isValid(seg)))
						break;
					if (!path) {
						path = new Path(Item.NO_INSERT);
						start = seg;
						otherStart = other;
					}
					var next = seg.getNext();
					path.add(new Segment(seg._point, handleIn,
							next && seg._handleOut));
					seg._visited = true;
					seg = next || seg._path.getFirstSegment();
					handleIn = next && next._handleIn;
					inter = seg._intersection;
				}
				if (finished) {
					path.firstSegment.setHandleIn(handleIn);
					path.setClosed(true);
				} else if (path) {
					var length = path.getLength();
					if (length >= 2e-7) {
						console.error('Boolean operation resulted in open path',
								'segments =', path._segments.length,
								'length =', length);
					}
					path = null;
				}
				if (path && (path._segments.length > 8
						|| !Numerical.isZero(path.getArea()))) {
					paths.push(path);
					path = null;
				}
			}
			return paths;
		}
	
		return {
			_getWinding: function(point, horizontal) {
				return getWinding(point, this._getMonoCurves(), horizontal);
			},
	
			unite: function(path) {
				return computeBoolean(this, path, 'unite');
			},
	
			intersect: function(path) {
				return computeBoolean(this, path, 'intersect');
			},
	
			subtract: function(path) {
				return computeBoolean(this, path, 'subtract');
			},
	
			exclude: function(path) {
				return computeBoolean(this, path, 'exclude');
			},
	
			divide: function(path) {
				return createResult(Group, [this.subtract(path),
						this.intersect(path)], true, this, path);
			},
	
			resolveCrossings: function() {
				var children = this._children,
					paths = children || [this];
	
				function hasOverlap(seg) {
					var inter = seg && seg._intersection;
					return inter && inter._overlap;
				}
	
				var hasOverlaps = false,
					hasCrossings = false,
					intersections = this.getIntersections(null, function(inter) {
						return inter._overlap && (hasOverlaps = true)
								|| inter.isCrossing() && (hasCrossings = true);
					});
				intersections = CurveLocation.expand(intersections);
				if (hasOverlaps) {
					var overlaps = divideLocations(intersections, function(inter) {
						return inter._overlap;
					});
					for (var i = overlaps.length - 1; i >= 0; i--) {
						var seg = overlaps[i]._segment,
							prev = seg.getPrevious(),
							next = seg.getNext();
						if (seg._path && hasOverlap(prev) && hasOverlap(next)) {
							seg.remove();
							prev._handleOut.set(0, 0);
							next._handleIn.set(0, 0);
							var curve = prev.getCurve();
							if (curve.isStraight() && curve.getLength() === 0)
								prev.remove();
						}
					}
				}
				if (hasCrossings) {
					divideLocations(intersections, hasOverlaps && function(inter) {
						var curve1 = inter.getCurve(),
							curve2 = inter._intersection._curve,
							seg = inter._segment;
						if (curve1 && curve2 && curve1._path && curve2._path) {
							return true;
						} else if (seg) {
							seg._intersection = null;
						}
					});
					paths = tracePaths(Base.each(paths, function(path) {
						this.push.apply(this, path._segments);
					}, []));
				}
				var length = paths.length,
					item;
				if (length > 1) {
					paths = paths.slice().sort(function (a, b) {
						return b.getBounds().getArea() - a.getBounds().getArea();
					});
					var first = paths[0],
						items = [first],
						excluded = {},
						isNonZero = this.getFillRule() === 'nonzero',
						windings = isNonZero && Base.each(paths, function(path) {
							this.push(path.isClockwise() ? 1 : -1);
						}, []);
					for (var i = 1; i < length; i++) {
						var path = paths[i],
							point = path.getInteriorPoint(),
							isContained = false,
							container = null,
							exclude = false;
						for (var j = i - 1; j >= 0 && !container; j--) {
							if (paths[j].contains(point)) {
								if (isNonZero && !isContained) {
									windings[i] += windings[j];
									if (windings[i] && windings[j]) {
										exclude = excluded[i] = true;
										break;
									}
								}
								isContained = true;
								container = !excluded[j] && paths[j];
							}
						}
						if (!exclude) {
							path.setClockwise(container ? !container.isClockwise()
									: first.isClockwise());
							items.push(path);
						}
					}
					paths = items;
					length = items.length;
				}
				if (length > 1 && children) {
					if (paths !== children) {
						this.setChildren(paths, true);
					}
					item = this;
				} else if (length === 1 && !children) {
					if (paths[0] !== this)
						this.setSegments(paths[0].removeSegments());
					item = this;
				}
				if (!item) {
					item = new CompoundPath(Item.NO_INSERT);
					item.addChildren(paths, true);
					item = item.reduce();
					item.copyAttributes(this);
					this.replaceWith(item);
				}
				return item;
			}
		};
	});
	
	Path.inject({
		_getMonoCurves: function() {
			var monoCurves = this._monoCurves,
				last;
	
			function insertCurve(v) {
				var y0 = v[1],
					y1 = v[7],
					winding = Math.abs((y0 - y1) / (v[0] - v[6]))
							< 2e-7
						? 0
						: y0 > y1
							? -1
							: 1,
					curve = { values: v, winding: winding };
				monoCurves.push(curve);
				if (winding)
					last = curve;
			}
	
			function handleCurve(v) {
				if (Curve.getLength(v) === 0)
					return;
				var y0 = v[1],
					y1 = v[3],
					y2 = v[5],
					y3 = v[7];
				if (Curve.isStraight(v)
						|| y0 >= y1 === y1 >= y2 && y1 >= y2 === y2 >= y3) {
					insertCurve(v);
				} else {
					var a = 3 * (y1 - y2) - y0 + y3,
						b = 2 * (y0 + y2) - 4 * y1,
						c = y1 - y0,
						tMin = 4e-7,
						tMax = 1 - tMin,
						roots = [],
						n = Numerical.solveQuadratic(a, b, c, roots, tMin, tMax);
					if (n === 0) {
						insertCurve(v);
					} else {
						roots.sort();
						var t = roots[0],
							parts = Curve.subdivide(v, t);
						insertCurve(parts[0]);
						if (n > 1) {
							t = (roots[1] - t) / (1 - t);
							parts = Curve.subdivide(parts[1], t);
							insertCurve(parts[0]);
						}
						insertCurve(parts[1]);
					}
				}
			}
	
			if (!monoCurves) {
				monoCurves = this._monoCurves = [];
				var curves = this.getCurves(),
					segments = this._segments;
				for (var i = 0, l = curves.length; i < l; i++)
					handleCurve(curves[i].getValues());
				if (!this._closed && segments.length > 1) {
					var p1 = segments[segments.length - 1]._point,
						p2 = segments[0]._point,
						p1x = p1._x, p1y = p1._y,
						p2x = p2._x, p2y = p2._y;
					handleCurve([p1x, p1y, p1x, p1y, p2x, p2y, p2x, p2y]);
				}
				if (monoCurves.length > 0) {
					monoCurves[0].last = last;
				}
			}
			return monoCurves;
		},
	
		getInteriorPoint: function() {
			var bounds = this.getBounds(),
				point = bounds.getCenter(true);
			if (!this.contains(point)) {
				var curves = this._getMonoCurves(),
					roots = [],
					y = point.y,
					intercepts = [];
				for (var i = 0, l = curves.length; i < l; i++) {
					var values = curves[i].values;
					if ((curves[i].winding === 1
							&& y >= values[1] && y <= values[7]
							|| y >= values[7] && y <= values[1])) {
						var count = Curve.solveCubic(values, 1, y, roots, 0, 1);
						for (var j = count - 1; j >= 0; j--) {
							intercepts.push(Curve.getPoint(values, roots[j]).x);
						}
					}
					if (intercepts.length > 1)
						break;
				}
				point.x = (intercepts[0] + intercepts[1]) / 2;
			}
			return point;
		}
	});
	
	CompoundPath.inject({
		_getMonoCurves: function() {
			var children = this._children,
				monoCurves = [];
			for (var i = 0, l = children.length; i < l; i++)
				monoCurves.push.apply(monoCurves, children[i]._getMonoCurves());
			return monoCurves;
		}
	});
	
	var PathIterator = Base.extend({
		_class: 'PathIterator',
	
		initialize: function(path, flatness, maxRecursion, ignoreStraight, matrix) {
			var curves = [],
				parts = [],
				length = 0,
				minSpan = 1 / (maxRecursion || 32),
				segments = path._segments,
				segment1 = segments[0],
				segment2;
	
			function addCurve(segment1, segment2) {
				var curve = Curve.getValues(segment1, segment2, matrix);
				curves.push(curve);
				computeParts(curve, segment1._index, 0, 1);
			}
	
			function computeParts(curve, index, t1, t2) {
				if ((t2 - t1) > minSpan
						&& !(ignoreStraight && Curve.isStraight(curve))
						&& !Curve.isFlatEnough(curve, flatness || 0.25)) {
					var halves = Curve.subdivide(curve, 0.5),
						tMid = (t1 + t2) / 2;
					computeParts(halves[0], index, t1, tMid);
					computeParts(halves[1], index, tMid, t2);
				} else {
					var dx = curve[6] - curve[0],
						dy = curve[7] - curve[1],
						dist = Math.sqrt(dx * dx + dy * dy);
					if (dist > 0) {
						length += dist;
						parts.push({
							offset: length,
							curve: curve,
							index: index,
							time: t2,
						});
					}
				}
			}
	
			for (var i = 1, l = segments.length; i < l; i++) {
				segment2 = segments[i];
				addCurve(segment1, segment2);
				segment1 = segment2;
			}
			if (path._closed)
				addCurve(segment2, segments[0]);
			this.curves = curves;
			this.parts = parts;
			this.length = length;
			this.index = 0;
		},
	
		_get: function(offset) {
			var i, j = this.index;
			for (;;) {
				i = j;
				if (j === 0 || this.parts[--j].offset < offset)
					break;
			}
			for (var l = this.parts.length; i < l; i++) {
				var part = this.parts[i];
				if (part.offset >= offset) {
					this.index = i;
					var prev = this.parts[i - 1];
					var prevTime = prev && prev.index === part.index ? prev.time : 0,
						prevOffset = prev ? prev.offset : 0;
					return {
						index: part.index,
						time: prevTime + (part.time - prevTime)
							* (offset - prevOffset) / (part.offset - prevOffset)
					};
				}
			}
			var part = this.parts[this.parts.length - 1];
			return {
				index: part.index,
				time: 1
			};
		},
	
		drawPart: function(ctx, from, to) {
			var start = this._get(from),
				end = this._get(to);
			for (var i = start.index, l = end.index; i <= l; i++) {
				var curve = Curve.getPart(this.curves[i],
						i === start.index ? start.time : 0,
						i === end.index ? end.time : 1);
				if (i === start.index)
					ctx.moveTo(curve[0], curve[1]);
				ctx.bezierCurveTo.apply(ctx, curve.slice(2));
			}
		}
	}, Base.each(Curve._evaluateMethods,
		function(name) {
			this[name + 'At'] = function(offset) {
				var param = this._get(offset);
				return Curve[name](this.curves[param.index], param.time);
			};
		}, {})
	);
	
	var PathFitter = Base.extend({
		initialize: function(path) {
			var points = this.points = [],
				segments = path._segments,
				closed = path._closed;
			for (var i = 0, prev, l = segments.length; i < l; i++) {
				var point = segments[i].point;
				if (!prev || !prev.equals(point)) {
					points.push(prev = point.clone());
				}
			}
			if (closed) {
				points.unshift(points[points.length - 1]);
				points.push(points[1]);
			}
			this.closed = closed;
		},
	
		fit: function(error) {
			var points = this.points,
				length = points.length,
				segments = null;
			if (length > 0) {
				segments = [new Segment(points[0])];
				if (length > 1) {
					this.fitCubic(segments, error, 0, length - 1,
							points[1].subtract(points[0]),
							points[length - 2].subtract(points[length - 1]));
					if (this.closed) {
						segments.shift();
						segments.pop();
					}
				}
			}
			return segments;
		},
	
		fitCubic: function(segments, error, first, last, tan1, tan2) {
			var points = this.points;
			if (last - first === 1) {
				var pt1 = points[first],
					pt2 = points[last],
					dist = pt1.getDistance(pt2) / 3;
				this.addCurve(segments, [pt1, pt1.add(tan1.normalize(dist)),
						pt2.add(tan2.normalize(dist)), pt2]);
				return;
			}
			var uPrime = this.chordLengthParameterize(first, last),
				maxError = Math.max(error, error * error),
				split,
				parametersInOrder = true;
			for (var i = 0; i <= 4; i++) {
				var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
				var max = this.findMaxError(first, last, curve, uPrime);
				if (max.error < error && parametersInOrder) {
					this.addCurve(segments, curve);
					return;
				}
				split = max.index;
				if (max.error >= maxError)
					break;
				parametersInOrder = this.reparameterize(first, last, uPrime, curve);
				maxError = max.error;
			}
			var tanCenter = points[split - 1].subtract(points[split + 1]);
			this.fitCubic(segments, error, first, split, tan1, tanCenter);
			this.fitCubic(segments, error, split, last, tanCenter.negate(), tan2);
		},
	
		addCurve: function(segments, curve) {
			var prev = segments[segments.length - 1];
			prev.setHandleOut(curve[1].subtract(curve[0]));
			segments.push(new Segment(curve[3], curve[2].subtract(curve[3])));
		},
	
		generateBezier: function(first, last, uPrime, tan1, tan2) {
			var epsilon = 1e-12,
				abs = Math.abs,
				points = this.points,
				pt1 = points[first],
				pt2 = points[last],
				C = [[0, 0], [0, 0]],
				X = [0, 0];
	
			for (var i = 0, l = last - first + 1; i < l; i++) {
				var u = uPrime[i],
					t = 1 - u,
					b = 3 * u * t,
					b0 = t * t * t,
					b1 = b * t,
					b2 = b * u,
					b3 = u * u * u,
					a1 = tan1.normalize(b1),
					a2 = tan2.normalize(b2),
					tmp = points[first + i]
						.subtract(pt1.multiply(b0 + b1))
						.subtract(pt2.multiply(b2 + b3));
				C[0][0] += a1.dot(a1);
				C[0][1] += a1.dot(a2);
				C[1][0] = C[0][1];
				C[1][1] += a2.dot(a2);
				X[0] += a1.dot(tmp);
				X[1] += a2.dot(tmp);
			}
	
			var detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
				alpha1, alpha2;
			if (abs(detC0C1) > epsilon) {
				var detC0X  = C[0][0] * X[1]    - C[1][0] * X[0],
					detXC1  = X[0]    * C[1][1] - X[1]    * C[0][1];
				alpha1 = detXC1 / detC0C1;
				alpha2 = detC0X / detC0C1;
			} else {
				var c0 = C[0][0] + C[0][1],
					c1 = C[1][0] + C[1][1];
				if (abs(c0) > epsilon) {
					alpha1 = alpha2 = X[0] / c0;
				} else if (abs(c1) > epsilon) {
					alpha1 = alpha2 = X[1] / c1;
				} else {
					alpha1 = alpha2 = 0;
				}
			}
	
			var segLength = pt2.getDistance(pt1),
				eps = epsilon * segLength,
				handle1,
				handle2;
			if (alpha1 < eps || alpha2 < eps) {
				alpha1 = alpha2 = segLength / 3;
			} else {
				var line = pt2.subtract(pt1);
				handle1 = tan1.normalize(alpha1);
				handle2 = tan2.normalize(alpha2);
				if (handle1.dot(line) - handle2.dot(line) > segLength * segLength) {
					alpha1 = alpha2 = segLength / 3;
					handle1 = handle2 = null;
				}
			}
	
			return [pt1,
					pt1.add(handle1 || tan1.normalize(alpha1)),
					pt2.add(handle2 || tan2.normalize(alpha2)),
					pt2];
		},
	
		reparameterize: function(first, last, u, curve) {
			for (var i = first; i <= last; i++) {
				u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
			}
			for (var i = 1, l = u.length; i < l; i++) {
				if (u[i] <= u[i - 1])
					return false;
			}
			return true;
		},
	
		findRoot: function(curve, point, u) {
			var curve1 = [],
				curve2 = [];
			for (var i = 0; i <= 2; i++) {
				curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
			}
			for (var i = 0; i <= 1; i++) {
				curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
			}
			var pt = this.evaluate(3, curve, u),
				pt1 = this.evaluate(2, curve1, u),
				pt2 = this.evaluate(1, curve2, u),
				diff = pt.subtract(point),
				df = pt1.dot(pt1) + diff.dot(pt2);
			if (Math.abs(df) < 1e-6)
				return u;
			return u - diff.dot(pt1) / df;
		},
	
		evaluate: function(degree, curve, t) {
			var tmp = curve.slice();
			for (var i = 1; i <= degree; i++) {
				for (var j = 0; j <= degree - i; j++) {
					tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
				}
			}
			return tmp[0];
		},
	
		chordLengthParameterize: function(first, last) {
			var u = [0];
			for (var i = first + 1; i <= last; i++) {
				u[i - first] = u[i - first - 1]
						+ this.points[i].getDistance(this.points[i - 1]);
			}
			for (var i = 1, m = last - first; i <= m; i++) {
				u[i] /= u[m];
			}
			return u;
		},
	
		findMaxError: function(first, last, curve, u) {
			var index = Math.floor((last - first + 1) / 2),
				maxDist = 0;
			for (var i = first + 1; i < last; i++) {
				var P = this.evaluate(3, curve, u[i - first]);
				var v = P.subtract(this.points[i]);
				var dist = v.x * v.x + v.y * v.y;
				if (dist >= maxDist) {
					maxDist = dist;
					index = i;
				}
			}
			return {
				error: maxDist,
				index: index
			};
		}
	});
	
	var TextItem = Item.extend({
		_class: 'TextItem',
		_applyMatrix: false,
		_canApplyMatrix: false,
		_serializeFields: {
			content: null
		},
		_boundsOptions: { stroke: false, handle: false },
	
		initialize: function TextItem(arg) {
			this._content = '';
			this._lines = [];
			var hasProps = arg && Base.isPlainObject(arg)
					&& arg.x === undefined && arg.y === undefined;
			this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
		},
	
		_equals: function(item) {
			return this._content === item._content;
		},
	
		copyContent: function(source) {
			this.setContent(source._content);
		},
	
		getContent: function() {
			return this._content;
		},
	
		setContent: function(content) {
			this._content = '' + content;
			this._lines = this._content.split(/\r\n|\n|\r/mg);
			this._changed(265);
		},
	
		isEmpty: function() {
			return !this._content;
		},
	
		getCharacterStyle: '#getStyle',
		setCharacterStyle: '#setStyle',
	
		getParagraphStyle: '#getStyle',
		setParagraphStyle: '#setStyle'
	});
	
	var PointText = TextItem.extend({
		_class: 'PointText',
	
		initialize: function PointText() {
			TextItem.apply(this, arguments);
		},
	
		getPoint: function() {
			var point = this._matrix.getTranslation();
			return new LinkedPoint(point.x, point.y, this, 'setPoint');
		},
	
		setPoint: function() {
			var point = Point.read(arguments);
			this.translate(point.subtract(this._matrix.getTranslation()));
		},
	
		_draw: function(ctx, param, viewMatrix) {
			if (!this._content)
				return;
			this._setStyles(ctx, param, viewMatrix);
			var lines = this._lines,
				style = this._style,
				hasFill = style.hasFill(),
				hasStroke = style.hasStroke(),
				leading = style.getLeading(),
				shadowColor = ctx.shadowColor;
			ctx.font = style.getFontStyle();
			ctx.textAlign = style.getJustification();
			for (var i = 0, l = lines.length; i < l; i++) {
				ctx.shadowColor = shadowColor;
				var line = lines[i];
				if (hasFill) {
					ctx.fillText(line, 0, 0);
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}
				if (hasStroke)
					ctx.strokeText(line, 0, 0);
				ctx.translate(0, leading);
			}
		},
	
		_getBounds: function(matrix, options) {
			var style = this._style,
				lines = this._lines,
				numLines = lines.length,
				justification = style.getJustification(),
				leading = style.getLeading(),
				width = this.getView().getTextWidth(style.getFontStyle(), lines),
				x = 0;
			if (justification !== 'left')
				x -= width / (justification === 'center' ? 2: 1);
			var bounds = new Rectangle(x,
						numLines ? - 0.75 * leading : 0,
						width, numLines * leading);
			return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
		}
	});
	
	var Color = Base.extend(new function() {
		var types = {
			gray: ['gray'],
			rgb: ['red', 'green', 'blue'],
			hsb: ['hue', 'saturation', 'brightness'],
			hsl: ['hue', 'saturation', 'lightness'],
			gradient: ['gradient', 'origin', 'destination', 'highlight']
		};
	
		var componentParsers = {},
			colorCache = {},
			colorCtx;
	
		function fromCSS(string) {
			var match = string.match(/^#(\w{1,2})(\w{1,2})(\w{1,2})$/),
				components;
			if (match) {
				components = [0, 0, 0];
				for (var i = 0; i < 3; i++) {
					var value = match[i + 1];
					components[i] = parseInt(value.length == 1
							? value + value : value, 16) / 255;
				}
			} else if (match = string.match(/^rgba?\((.*)\)$/)) {
				components = match[1].split(',');
				for (var i = 0, l = components.length; i < l; i++) {
					var value = +components[i];
					components[i] = i < 3 ? value / 255 : value;
				}
			} else if (window) {
				var cached = colorCache[string];
				if (!cached) {
					if (!colorCtx) {
						colorCtx = CanvasProvider.getContext(1, 1);
						colorCtx.globalCompositeOperation = 'copy';
					}
					colorCtx.fillStyle = 'rgba(0,0,0,0)';
					colorCtx.fillStyle = string;
					colorCtx.fillRect(0, 0, 1, 1);
					var data = colorCtx.getImageData(0, 0, 1, 1).data;
					cached = colorCache[string] = [
						data[0] / 255,
						data[1] / 255,
						data[2] / 255
					];
				}
				components = cached.slice();
			} else {
				components = [0, 0, 0];
			}
			return components;
		}
	
		var hsbIndices = [
			[0, 3, 1],
			[2, 0, 1],
			[1, 0, 3],
			[1, 2, 0],
			[3, 1, 0],
			[0, 1, 2]
		];
	
		var converters = {
			'rgb-hsb': function(r, g, b) {
				var max = Math.max(r, g, b),
					min = Math.min(r, g, b),
					delta = max - min,
					h = delta === 0 ? 0
						:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
							: max == g ? (b - r) / delta + 2
							:            (r - g) / delta + 4) * 60;
				return [h, max === 0 ? 0 : delta / max, max];
			},
	
			'hsb-rgb': function(h, s, b) {
				h = (((h / 60) % 6) + 6) % 6;
				var i = Math.floor(h),
					f = h - i,
					i = hsbIndices[i],
					v = [
						b,
						b * (1 - s),
						b * (1 - s * f),
						b * (1 - s * (1 - f))
					];
				return [v[i[0]], v[i[1]], v[i[2]]];
			},
	
			'rgb-hsl': function(r, g, b) {
				var max = Math.max(r, g, b),
					min = Math.min(r, g, b),
					delta = max - min,
					achromatic = delta === 0,
					h = achromatic ? 0
						:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
							: max == g ? (b - r) / delta + 2
							:            (r - g) / delta + 4) * 60,
					l = (max + min) / 2,
					s = achromatic ? 0 : l < 0.5
							? delta / (max + min)
							: delta / (2 - max - min);
				return [h, s, l];
			},
	
			'hsl-rgb': function(h, s, l) {
				h = (((h / 360) % 1) + 1) % 1;
				if (s === 0)
					return [l, l, l];
				var t3s = [ h + 1 / 3, h, h - 1 / 3 ],
					t2 = l < 0.5 ? l * (1 + s) : l + s - l * s,
					t1 = 2 * l - t2,
					c = [];
				for (var i = 0; i < 3; i++) {
					var t3 = t3s[i];
					if (t3 < 0) t3 += 1;
					if (t3 > 1) t3 -= 1;
					c[i] = 6 * t3 < 1
						? t1 + (t2 - t1) * 6 * t3
						: 2 * t3 < 1
							? t2
							: 3 * t3 < 2
								? t1 + (t2 - t1) * ((2 / 3) - t3) * 6
								: t1;
				}
				return c;
			},
	
			'rgb-gray': function(r, g, b) {
				return [r * 0.2989 + g * 0.587 + b * 0.114];
			},
	
			'gray-rgb': function(g) {
				return [g, g, g];
			},
	
			'gray-hsb': function(g) {
				return [0, 0, g];
			},
	
			'gray-hsl': function(g) {
				return [0, 0, g];
			},
	
			'gradient-rgb': function() {
				return [];
			},
	
			'rgb-gradient': function() {
				return [];
			}
	
		};
	
		return Base.each(types, function(properties, type) {
			componentParsers[type] = [];
			Base.each(properties, function(name, index) {
				var part = Base.capitalize(name),
					hasOverlap = /^(hue|saturation)$/.test(name),
					parser = componentParsers[type][index] = name === 'gradient'
						? function(value) {
							var current = this._components[0];
							value = Gradient.read(Array.isArray(value) ? value
									: arguments, 0, { readNull: true });
							if (current !== value) {
								if (current)
									current._removeOwner(this);
								if (value)
									value._addOwner(this);
							}
							return value;
						}
						: type === 'gradient'
							? function() {
								return Point.read(arguments, 0, {
										readNull: name === 'highlight',
										clone: true
								});
							}
							: function(value) {
								return value == null || isNaN(value) ? 0 : value;
							};
	
				this['get' + part] = function() {
					return this._type === type
						|| hasOverlap && /^hs[bl]$/.test(this._type)
							? this._components[index]
							: this._convert(type)[index];
				};
	
				this['set' + part] = function(value) {
					if (this._type !== type
							&& !(hasOverlap && /^hs[bl]$/.test(this._type))) {
						this._components = this._convert(type);
						this._properties = types[type];
						this._type = type;
					}
					this._components[index] = parser.call(this, value);
					this._changed();
				};
			}, this);
		}, {
			_class: 'Color',
			_readIndex: true,
	
			initialize: function Color(arg) {
				var slice = Array.prototype.slice,
					args = arguments,
					read = 0,
					type,
					components,
					alpha,
					values;
				if (Array.isArray(arg)) {
					args = arg;
					arg = args[0];
				}
				var argType = arg != null && typeof arg;
				if (argType === 'string' && arg in types) {
					type = arg;
					arg = args[1];
					if (Array.isArray(arg)) {
						components = arg;
						alpha = args[2];
					} else {
						if (this.__read)
							read = 1;
						args = slice.call(args, 1);
						argType = typeof arg;
					}
				}
				if (!components) {
					values = argType === 'number'
							? args
							: argType === 'object' && arg.length != null
								? arg
								: null;
					if (values) {
						if (!type)
							type = values.length >= 3
									? 'rgb'
									: 'gray';
						var length = types[type].length;
						alpha = values[length];
						if (this.__read)
							read += values === arguments
								? length + (alpha != null ? 1 : 0)
								: 1;
						if (values.length > length)
							values = slice.call(values, 0, length);
					} else if (argType === 'string') {
						type = 'rgb';
						components = fromCSS(arg);
						if (components.length === 4) {
							alpha = components[3];
							components.length--;
						}
					} else if (argType === 'object') {
						if (arg.constructor === Color) {
							type = arg._type;
							components = arg._components.slice();
							alpha = arg._alpha;
							if (type === 'gradient') {
								for (var i = 1, l = components.length; i < l; i++) {
									var point = components[i];
									if (point)
										components[i] = point.clone();
								}
							}
						} else if (arg.constructor === Gradient) {
							type = 'gradient';
							values = args;
						} else {
							type = 'hue' in arg
								? 'lightness' in arg
									? 'hsl'
									: 'hsb'
								: 'gradient' in arg || 'stops' in arg
										|| 'radial' in arg
									? 'gradient'
									: 'gray' in arg
										? 'gray'
										: 'rgb';
							var properties = types[type],
								parsers = componentParsers[type];
							this._components = components = [];
							for (var i = 0, l = properties.length; i < l; i++) {
								var value = arg[properties[i]];
								if (value == null && i === 0 && type === 'gradient'
										&& 'stops' in arg) {
									value = {
										stops: arg.stops,
										radial: arg.radial
									};
								}
								value = parsers[i].call(this, value);
								if (value != null)
									components[i] = value;
							}
							alpha = arg.alpha;
						}
					}
					if (this.__read && type)
						read = 1;
				}
				this._type = type || 'rgb';
				this._id = UID.get(Color);
				if (!components) {
					this._components = components = [];
					var parsers = componentParsers[this._type];
					for (var i = 0, l = parsers.length; i < l; i++) {
						var value = parsers[i].call(this, values && values[i]);
						if (value != null)
							components[i] = value;
					}
				}
				this._components = components;
				this._properties = types[this._type];
				this._alpha = alpha;
				if (this.__read)
					this.__read = read;
			},
	
			_serialize: function(options, dictionary) {
				var components = this.getComponents();
				return Base.serialize(
						/^(gray|rgb)$/.test(this._type)
							? components
							: [this._type].concat(components),
						options, true, dictionary);
			},
	
			_changed: function() {
				this._canvasStyle = null;
				if (this._owner)
					this._owner._changed(65);
			},
	
			_convert: function(type) {
				var converter;
				return this._type === type
						? this._components.slice()
						: (converter = converters[this._type + '-' + type])
							? converter.apply(this, this._components)
							: converters['rgb-' + type].apply(this,
								converters[this._type + '-rgb'].apply(this,
									this._components));
			},
	
			convert: function(type) {
				return new Color(type, this._convert(type), this._alpha);
			},
	
			getType: function() {
				return this._type;
			},
	
			setType: function(type) {
				this._components = this._convert(type);
				this._properties = types[type];
				this._type = type;
			},
	
			getComponents: function() {
				var components = this._components.slice();
				if (this._alpha != null)
					components.push(this._alpha);
				return components;
			},
	
			getAlpha: function() {
				return this._alpha != null ? this._alpha : 1;
			},
	
			setAlpha: function(alpha) {
				this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
				this._changed();
			},
	
			hasAlpha: function() {
				return this._alpha != null;
			},
	
			equals: function(color) {
				var col = Base.isPlainValue(color, true)
						? Color.read(arguments)
						: color;
				return col === this || col && this._class === col._class
						&& this._type === col._type
						&& this._alpha === col._alpha
						&& Base.equals(this._components, col._components)
						|| false;
			},
	
			toString: function() {
				var properties = this._properties,
					parts = [],
					isGradient = this._type === 'gradient',
					f = Formatter.instance;
				for (var i = 0, l = properties.length; i < l; i++) {
					var value = this._components[i];
					if (value != null)
						parts.push(properties[i] + ': '
								+ (isGradient ? value : f.number(value)));
				}
				if (this._alpha != null)
					parts.push('alpha: ' + f.number(this._alpha));
				return '{ ' + parts.join(', ') + ' }';
			},
	
			toCSS: function(hex) {
				var components = this._convert('rgb'),
					alpha = hex || this._alpha == null ? 1 : this._alpha;
				function convert(val) {
					return Math.round((val < 0 ? 0 : val > 1 ? 1 : val) * 255);
				}
				components = [
					convert(components[0]),
					convert(components[1]),
					convert(components[2])
				];
				if (alpha < 1)
					components.push(alpha < 0 ? 0 : alpha);
				return hex
						? '#' + ((1 << 24) + (components[0] << 16)
							+ (components[1] << 8)
							+ components[2]).toString(16).slice(1)
						: (components.length == 4 ? 'rgba(' : 'rgb(')
							+ components.join(',') + ')';
			},
	
			toCanvasStyle: function(ctx) {
				if (this._canvasStyle)
					return this._canvasStyle;
				if (this._type !== 'gradient')
					return this._canvasStyle = this.toCSS();
				var components = this._components,
					gradient = components[0],
					stops = gradient._stops,
					origin = components[1],
					destination = components[2],
					canvasGradient;
				if (gradient._radial) {
					var radius = destination.getDistance(origin),
						highlight = components[3];
					if (highlight) {
						var vector = highlight.subtract(origin);
						if (vector.getLength() > radius)
							highlight = origin.add(vector.normalize(radius - 0.1));
					}
					var start = highlight || origin;
					canvasGradient = ctx.createRadialGradient(start.x, start.y,
							0, origin.x, origin.y, radius);
				} else {
					canvasGradient = ctx.createLinearGradient(origin.x, origin.y,
							destination.x, destination.y);
				}
				for (var i = 0, l = stops.length; i < l; i++) {
					var stop = stops[i];
					canvasGradient.addColorStop(stop._rampPoint || i / (l - 1),
							stop._color.toCanvasStyle());
				}
				return this._canvasStyle = canvasGradient;
			},
	
			transform: function(matrix) {
				if (this._type === 'gradient') {
					var components = this._components;
					for (var i = 1, l = components.length; i < l; i++) {
						var point = components[i];
						matrix._transformPoint(point, point, true);
					}
					this._changed();
				}
			},
	
			statics: {
				_types: types,
	
				random: function() {
					var random = Math.random;
					return new Color(random(), random(), random());
				}
			}
		});
	},
	new function() {
		var operators = {
			add: function(a, b) {
				return a + b;
			},
	
			subtract: function(a, b) {
				return a - b;
			},
	
			multiply: function(a, b) {
				return a * b;
			},
	
			divide: function(a, b) {
				return a / b;
			}
		};
	
		return Base.each(operators, function(operator, name) {
			this[name] = function(color) {
				color = Color.read(arguments);
				var type = this._type,
					components1 = this._components,
					components2 = color._convert(type);
				for (var i = 0, l = components1.length; i < l; i++)
					components2[i] = operator(components1[i], components2[i]);
				return new Color(type, components2,
						this._alpha != null
								? operator(this._alpha, color.getAlpha())
								: null);
			};
		}, {
		});
	});
	
	var Gradient = Base.extend({
		_class: 'Gradient',
	
		initialize: function Gradient(stops, radial) {
			this._id = UID.get();
			if (stops && this._set(stops))
				stops = radial = null;
			if (!this._stops)
				this.setStops(stops || ['white', 'black']);
			if (this._radial == null) {
				this.setRadial(typeof radial === 'string' && radial === 'radial'
						|| radial || false);
			}
		},
	
		_serialize: function(options, dictionary) {
			return dictionary.add(this, function() {
				return Base.serialize([this._stops, this._radial],
						options, true, dictionary);
			});
		},
	
		_changed: function() {
			for (var i = 0, l = this._owners && this._owners.length; i < l; i++) {
				this._owners[i]._changed();
			}
		},
	
		_addOwner: function(color) {
			if (!this._owners)
				this._owners = [];
			this._owners.push(color);
		},
	
		_removeOwner: function(color) {
			var index = this._owners ? this._owners.indexOf(color) : -1;
			if (index != -1) {
				this._owners.splice(index, 1);
				if (this._owners.length === 0)
					this._owners = undefined;
			}
		},
	
		clone: function() {
			var stops = [];
			for (var i = 0, l = this._stops.length; i < l; i++) {
				stops[i] = this._stops[i].clone();
			}
			return new Gradient(stops, this._radial);
		},
	
		getStops: function() {
			return this._stops;
		},
	
		setStops: function(stops) {
			if (stops.length < 2) {
				throw new Error(
						'Gradient stop list needs to contain at least two stops.');
			}
			var _stops = this._stops;
			if (_stops) {
				for (var i = 0, l = _stops.length; i < l; i++)
					_stops[i]._owner = undefined;
			}
			_stops = this._stops = GradientStop.readAll(stops, 0, { clone: true });
			for (var i = 0, l = _stops.length; i < l; i++)
				_stops[i]._owner = this;
			this._changed();
		},
	
		getRadial: function() {
			return this._radial;
		},
	
		setRadial: function(radial) {
			this._radial = radial;
			this._changed();
		},
	
		equals: function(gradient) {
			if (gradient === this)
				return true;
			if (gradient && this._class === gradient._class) {
				var stops1 = this._stops,
					stops2 = gradient._stops,
					length = stops1.length;
				if (length === stops2.length) {
					for (var i = 0; i < length; i++) {
						if (!stops1[i].equals(stops2[i]))
							return false;
					}
					return true;
				}
			}
			return false;
		}
	});
	
	var GradientStop = Base.extend({
		_class: 'GradientStop',
	
		initialize: function GradientStop(arg0, arg1) {
			var color = arg0,
				rampPoint = arg1;
			if (typeof arg0 === 'object' && arg1 === undefined) {
				if (Array.isArray(arg0) && typeof arg0[0] !== 'number') {
					color = arg0[0];
					rampPoint = arg0[1];
				} else if ('color' in arg0 || 'rampPoint' in arg0) {
					color = arg0.color;
					rampPoint = arg0.rampPoint;
				}
			}
			this.setColor(color);
			this.setRampPoint(rampPoint);
		},
	
		clone: function() {
			return new GradientStop(this._color.clone(), this._rampPoint);
		},
	
		_serialize: function(options, dictionary) {
			var color = this._color,
				rampPoint = this._rampPoint;
			return Base.serialize(rampPoint == null ? [color] : [color, rampPoint],
					options, true, dictionary);
		},
	
		_changed: function() {
			if (this._owner)
				this._owner._changed(65);
		},
	
		getRampPoint: function() {
			return this._rampPoint;
		},
	
		setRampPoint: function(rampPoint) {
			this._rampPoint = rampPoint;
			this._changed();
		},
	
		getColor: function() {
			return this._color;
		},
	
		setColor: function() {
			var color = Color.read(arguments, 0, { clone: true });
			if (color)
				color._owner = this;
			this._color = color;
			this._changed();
		},
	
		equals: function(stop) {
			return stop === this || stop && this._class === stop._class
					&& this._color.equals(stop._color)
					&& this._rampPoint == stop._rampPoint
					|| false;
		}
	});
	
	var Style = Base.extend(new function() {
		var itemDefaults = {
			fillColor: null,
			fillRule: 'nonzero',
			strokeColor: null,
			strokeWidth: 1,
			strokeCap: 'butt',
			strokeJoin: 'miter',
			strokeScaling: true,
			miterLimit: 10,
			dashOffset: 0,
			dashArray: [],
			shadowColor: null,
			shadowBlur: 0,
			shadowOffset: new Point(),
			selectedColor: null
		},
		groupDefaults = Base.set({}, itemDefaults, {
			fontFamily: 'sans-serif',
			fontWeight: 'normal',
			fontSize: 12,
			leading: null,
			justification: 'left'
		}),
		textDefaults = Base.set({}, groupDefaults, {
			fillColor: new Color()
		}),
		flags = {
			strokeWidth: 97,
			strokeCap: 97,
			strokeJoin: 97,
			strokeScaling: 105,
			miterLimit: 97,
			fontFamily: 9,
			fontWeight: 9,
			fontSize: 9,
			font: 9,
			leading: 9,
			justification: 9
		},
		item = {
			beans: true
		},
		fields = {
			_class: 'Style',
			beans: true,
	
			initialize: function Style(style, owner, project) {
				this._values = {};
				this._owner = owner;
				this._project = owner && owner._project || project || paper.project;
				this._defaults = !owner || owner instanceof Group ? groupDefaults
						: owner instanceof TextItem ? textDefaults
						: itemDefaults;
				if (style)
					this.set(style);
			}
		};
	
		Base.each(groupDefaults, function(value, key) {
			var isColor = /Color$/.test(key),
				isPoint = key === 'shadowOffset',
				part = Base.capitalize(key),
				flag = flags[key],
				set = 'set' + part,
				get = 'get' + part;
	
			fields[set] = function(value) {
				var owner = this._owner,
					children = owner && owner._children;
				if (children && children.length > 0
						&& !(owner instanceof CompoundPath)) {
					for (var i = 0, l = children.length; i < l; i++)
						children[i]._style[set](value);
				} else if (key in this._defaults) {
					var old = this._values[key];
					if (old !== value) {
						if (isColor) {
							if (old)
								old._owner = undefined;
							if (value && value.constructor === Color) {
								if (value._owner)
									value = value.clone();
								value._owner = owner;
							}
						}
						this._values[key] = value;
						if (owner)
							owner._changed(flag || 65);
					}
				}
			};
	
			fields[get] = function(_dontMerge) {
				var owner = this._owner,
					children = owner && owner._children,
					value;
				if (key in this._defaults && (!children || children.length === 0
						|| _dontMerge || owner instanceof CompoundPath)) {
					var value = this._values[key];
					if (value === undefined) {
						value = this._defaults[key];
						if (value && value.clone)
							value = value.clone();
					} else {
						var ctor = isColor ? Color : isPoint ? Point : null;
						if (ctor && !(value && value.constructor === ctor)) {
							this._values[key] = value = ctor.read([value], 0,
									{ readNull: true, clone: true });
							if (value && isColor)
								value._owner = owner;
						}
					}
				} else if (children) {
					for (var i = 0, l = children.length; i < l; i++) {
						var childValue = children[i]._style[get]();
						if (i === 0) {
							value = childValue;
						} else if (!Base.equals(value, childValue)) {
							return undefined;
						}
					}
				}
				return value;
			};
	
			item[get] = function(_dontMerge) {
				return this._style[get](_dontMerge);
			};
	
			item[set] = function(value) {
				this._style[set](value);
			};
		});
	
		Base.each({
			Font: 'FontFamily',
			WindingRule: 'FillRule'
		}, function(value, key) {
			var get = 'get' + key,
				set = 'set' + key;
			fields[get] = item[get] = '#get' + value;
			fields[set] = item[set] = '#set' + value;
		});
	
		Item.inject(item);
		return fields;
	}, {
		set: function(style) {
			var isStyle = style instanceof Style,
				values = isStyle ? style._values : style;
			if (values) {
				for (var key in values) {
					if (key in this._defaults) {
						var value = values[key];
						this[key] = value && isStyle && value.clone
								? value.clone() : value;
					}
				}
			}
		},
	
		equals: function(style) {
			return style === this || style && this._class === style._class
					&& Base.equals(this._values, style._values)
					|| false;
		},
	
		hasFill: function() {
			var color = this.getFillColor();
			return !!color && color.alpha > 0;
		},
	
		hasStroke: function() {
			var color = this.getStrokeColor();
			return !!color && color.alpha > 0 && this.getStrokeWidth() > 0;
		},
	
		hasShadow: function() {
			var color = this.getShadowColor();
			return !!color && color.alpha > 0 && (this.getShadowBlur() > 0
					|| !this.getShadowOffset().isZero());
		},
	
		getView: function() {
			return this._project._view;
		},
	
		getFontStyle: function() {
			var fontSize = this.getFontSize();
			return this.getFontWeight()
					+ ' ' + fontSize + (/[a-z]/i.test(fontSize + '') ? ' ' : 'px ')
					+ this.getFontFamily();
		},
	
		getFont: '#getFontFamily',
		setFont: '#setFontFamily',
	
		getLeading: function getLeading() {
			var leading = getLeading.base.call(this),
				fontSize = this.getFontSize();
			if (/pt|em|%|px/.test(fontSize))
				fontSize = this.getView().getPixelSize(fontSize);
			return leading != null ? leading : fontSize * 1.2;
		}
	
	});
	
	var DomElement = new function() {
		function handlePrefix(el, name, set, value) {
			var prefixes = ['', 'webkit', 'moz', 'Moz', 'ms', 'o'],
				suffix = name[0].toUpperCase() + name.substring(1);
			for (var i = 0; i < 6; i++) {
				var prefix = prefixes[i],
					key = prefix ? prefix + suffix : name;
				if (key in el) {
					if (set) {
						el[key] = value;
					} else {
						return el[key];
					}
					break;
				}
			}
		}
	
		return {
			getStyles: function(el) {
				var doc = el && el.nodeType !== 9 ? el.ownerDocument : el,
					view = doc && doc.defaultView;
				return view && view.getComputedStyle(el, '');
			},
	
			getBounds: function(el, viewport) {
				var doc = el.ownerDocument,
					body = doc.body,
					html = doc.documentElement,
					rect;
				try {
					rect = el.getBoundingClientRect();
				} catch (e) {
					rect = { left: 0, top: 0, width: 0, height: 0 };
				}
				var x = rect.left - (html.clientLeft || body.clientLeft || 0),
					y = rect.top - (html.clientTop || body.clientTop || 0);
				if (!viewport) {
					var view = doc.defaultView;
					x += view.pageXOffset || html.scrollLeft || body.scrollLeft;
					y += view.pageYOffset || html.scrollTop || body.scrollTop;
				}
				return new Rectangle(x, y, rect.width, rect.height);
			},
	
			getViewportBounds: function(el) {
				var doc = el.ownerDocument,
					view = doc.defaultView,
					html = doc.documentElement;
				return new Rectangle(0, 0,
					view.innerWidth || html.clientWidth,
					view.innerHeight || html.clientHeight
				);
			},
	
			getOffset: function(el, viewport) {
				return DomElement.getBounds(el, viewport).getPoint();
			},
	
			getSize: function(el) {
				return DomElement.getBounds(el, true).getSize();
			},
	
			isInvisible: function(el) {
				return DomElement.getSize(el).equals(new Size(0, 0));
			},
	
			isInView: function(el) {
				return !DomElement.isInvisible(el)
						&& DomElement.getViewportBounds(el).intersects(
							DomElement.getBounds(el, true));
			},
	
			isInserted: function(el) {
				return document.body.contains(el);
			},
	
			getPrefixed: function(el, name) {
				return el && handlePrefix(el, name);
			},
	
			setPrefixed: function(el, name, value) {
				if (typeof name === 'object') {
					for (var key in name)
						handlePrefix(el, key, true, name[key]);
				} else {
					handlePrefix(el, name, true, value);
				}
			}
		};
	};
	
	var DomEvent = {
		add: function(el, events) {
			if (el) {
				for (var type in events) {
					var func = events[type],
						parts = type.split(/[\s,]+/g);
					for (var i = 0, l = parts.length; i < l; i++)
						el.addEventListener(parts[i], func, false);
				}
			}
		},
	
		remove: function(el, events) {
			if (el) {
				for (var type in events) {
					var func = events[type],
						parts = type.split(/[\s,]+/g);
					for (var i = 0, l = parts.length; i < l; i++)
						el.removeEventListener(parts[i], func, false);
				}
			}
		},
	
		getPoint: function(event) {
			var pos = event.targetTouches
					? event.targetTouches.length
						? event.targetTouches[0]
						: event.changedTouches[0]
					: event;
			return new Point(
				pos.pageX || pos.clientX + document.documentElement.scrollLeft,
				pos.pageY || pos.clientY + document.documentElement.scrollTop
			);
		},
	
		getTarget: function(event) {
			return event.target || event.srcElement;
		},
	
		getRelatedTarget: function(event) {
			return event.relatedTarget || event.toElement;
		},
	
		getOffset: function(event, target) {
			return DomEvent.getPoint(event).subtract(DomElement.getOffset(
					target || DomEvent.getTarget(event)));
		}
	};
	
	DomEvent.requestAnimationFrame = new function() {
		var nativeRequest = DomElement.getPrefixed(window, 'requestAnimationFrame'),
			requested = false,
			callbacks = [],
			timer;
	
		function handleCallbacks() {
			var functions = callbacks;
			callbacks = [];
			for (var i = 0, l = functions.length; i < l; i++)
				functions[i]();
			requested = nativeRequest && callbacks.length;
			if (requested)
				nativeRequest(handleCallbacks);
		}
	
		return function(callback) {
			callbacks.push(callback);
			if (nativeRequest) {
				if (!requested) {
					nativeRequest(handleCallbacks);
					requested = true;
				}
			} else if (!timer) {
				timer = setInterval(handleCallbacks, 1000 / 60);
			}
		};
	};
	
	var View = Base.extend(Emitter, {
		_class: 'View',
	
		initialize: function View(project, element) {
	
			function getSize(name) {
				return element[name] || parseInt(element.getAttribute(name), 10);
			}
	
			function getCanvasSize() {
				var size = DomElement.getSize(element);
				return size.isNaN() || size.isZero()
						? new Size(getSize('width'), getSize('height'))
						: size;
			}
	
			var size;
			if (window && element) {
				this._id = element.getAttribute('id');
				if (this._id == null)
					element.setAttribute('id', this._id = 'view-' + View._id++);
				DomEvent.add(element, this._viewEvents);
				var none = 'none';
				DomElement.setPrefixed(element.style, {
					userDrag: none,
					userSelect: none,
					touchCallout: none,
					contentZooming: none,
					tapHighlightColor: 'rgba(0,0,0,0)'
				});
	
				if (PaperScope.hasAttribute(element, 'resize')) {
					var that = this;
					DomEvent.add(window, this._windowEvents = {
						resize: function() {
							that.setViewSize(getCanvasSize());
						}
					});
				}
	
				size = getCanvasSize();
	
				if (PaperScope.hasAttribute(element, 'stats')
						&& typeof Stats !== 'undefined') {
					this._stats = new Stats();
					var stats = this._stats.domElement,
						style = stats.style,
						offset = DomElement.getOffset(element);
					style.position = 'absolute';
					style.left = offset.x + 'px';
					style.top = offset.y + 'px';
					document.body.appendChild(stats);
				}
			} else {
				size = new Size(element);
				element = null;
			}
			this._project = project;
			this._scope = project._scope;
			this._element = element;
			if (!this._pixelRatio)
				this._pixelRatio = window && window.devicePixelRatio || 1;
			this._setElementSize(size.width, size.height);
			this._viewSize = size;
			View._views.push(this);
			View._viewsById[this._id] = this;
			(this._matrix = new Matrix())._owner = this;
			this._zoom = 1;
			if (!View._focused)
				View._focused = this;
			this._frameItems = {};
			this._frameItemCount = 0;
			this._itemEvents = { native: {}, virtual: {} };
			this._autoUpdate = !paper.agent.node;
			this._needsUpdate = false;
		},
	
		remove: function() {
			if (!this._project)
				return false;
			if (View._focused === this)
				View._focused = null;
			View._views.splice(View._views.indexOf(this), 1);
			delete View._viewsById[this._id];
			var project = this._project;
			if (project._view === this)
				project._view = null;
			DomEvent.remove(this._element, this._viewEvents);
			DomEvent.remove(window, this._windowEvents);
			this._element = this._project = null;
			this.off('frame');
			this._animate = false;
			this._frameItems = {};
			return true;
		},
	
		_events: Base.each(
			Item._itemHandlers.concat(['onResize', 'onKeyDown', 'onKeyUp']),
			function(name) {
				this[name] = {};
			}, {
				onFrame: {
					install: function() {
						this.play();
					},
	
					uninstall: function() {
						this.pause();
					}
				}
			}
		),
	
		_animate: false,
		_time: 0,
		_count: 0,
	
		getAutoUpdate: function() {
			return this._autoUpdate;
		},
	
		setAutoUpdate: function(autoUpdate) {
			this._autoUpdate = autoUpdate;
			if (autoUpdate)
				this.requestUpdate();
		},
	
		update: function() {
		},
	
		draw: function() {
			this.update();
		},
	
		requestUpdate: function() {
			if (!this._requested) {
				var that = this;
				DomEvent.requestAnimationFrame(function() {
					that._requested = false;
					if (that._animate) {
						that.requestUpdate();
						var element = that._element;
						if ((!DomElement.getPrefixed(document, 'hidden')
								|| PaperScope.getAttribute(element, 'keepalive')
									=== 'true') && DomElement.isInView(element)) {
							that._handleFrame();
						}
					}
					if (that._autoUpdate)
						that.update();
				});
				this._requested = true;
			}
		},
	
		play: function() {
			this._animate = true;
			this.requestUpdate();
		},
	
		pause: function() {
			this._animate = false;
		},
	
		_handleFrame: function() {
			paper = this._scope;
			var now = Date.now() / 1000,
				delta = this._last ? now - this._last : 0;
			this._last = now;
			this.emit('frame', new Base({
				delta: delta,
				time: this._time += delta,
				count: this._count++
			}));
			if (this._stats)
				this._stats.update();
		},
	
		_animateItem: function(item, animate) {
			var items = this._frameItems;
			if (animate) {
				items[item._id] = {
					item: item,
					time: 0,
					count: 0
				};
				if (++this._frameItemCount === 1)
					this.on('frame', this._handleFrameItems);
			} else {
				delete items[item._id];
				if (--this._frameItemCount === 0) {
					this.off('frame', this._handleFrameItems);
				}
			}
		},
	
		_handleFrameItems: function(event) {
			for (var i in this._frameItems) {
				var entry = this._frameItems[i];
				entry.item.emit('frame', new Base(event, {
					time: entry.time += event.delta,
					count: entry.count++
				}));
			}
		},
	
		_changed: function() {
			this._project._changed(2049);
			this._bounds = null;
		},
	
		getElement: function() {
			return this._element;
		},
	
		getPixelRatio: function() {
			return this._pixelRatio;
		},
	
		getResolution: function() {
			return this._pixelRatio * 72;
		},
	
		getViewSize: function() {
			var size = this._viewSize;
			return new LinkedSize(size.width, size.height, this, 'setViewSize');
		},
	
		setViewSize: function() {
			var size = Size.read(arguments),
				width = size.width,
				height = size.height,
				delta = size.subtract(this._viewSize);
			if (delta.isZero())
				return;
			this._setElementSize(width, height);
			this._viewSize.set(width, height);
			this.emit('resize', {
				size: size,
				delta: delta
			});
			this._changed();
			if (this._autoUpdate)
				this.requestUpdate();
		},
	
		_setElementSize: function(width, height) {
			var element = this._element;
			if (element) {
				if (element.width !== width)
					element.width = width;
				if (element.height !== height)
					element.height = height;
			}
		},
	
		getBounds: function() {
			if (!this._bounds)
				this._bounds = this._matrix.inverted()._transformBounds(
						new Rectangle(new Point(), this._viewSize));
			return this._bounds;
		},
	
		getSize: function() {
			return this.getBounds().getSize();
		},
	
		getCenter: function() {
			return this.getBounds().getCenter();
		},
	
		setCenter: function() {
			var center = Point.read(arguments);
			this.translate(this.getCenter().subtract(center));
		},
	
		getZoom: function() {
			return this._zoom;
		},
	
		setZoom: function(zoom) {
			this.transform(new Matrix().scale(zoom / this._zoom,
				this.getCenter()));
			this._zoom = zoom;
		},
	
		getMatrix: function() {
			return this._matrix;
		},
	
		setMatrix: function() {
			var matrix = this._matrix;
			matrix.initialize.apply(matrix, arguments);
		},
	
		isVisible: function() {
			return DomElement.isInView(this._element);
		},
	
		isInserted: function() {
			return DomElement.isInserted(this._element);
		},
	
		getPixelSize: function(size) {
			var element = this._element,
				pixels;
			if (element) {
				var parent = element.parentNode,
					temp = document.createElement('div');
				temp.style.fontSize = size;
				parent.appendChild(temp);
				pixels = parseFloat(DomElement.getStyles(temp).fontSize);
				parent.removeChild(temp);
			} else {
				pixels = parseFloat(pixels);
			}
			return pixels;
		},
	
		getTextWidth: function(font, lines) {
			return 0;
		}
	}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
		var rotate = key === 'rotate';
		this[key] = function() {
			var value = (rotate ? Base : Point).read(arguments),
				center = Point.read(arguments, 0, { readNull: true });
			return this.transform(new Matrix()[key](value,
					center || this.getCenter(true)));
		};
	}, {
		translate: function() {
			var mx = new Matrix();
			return this.transform(mx.translate.apply(mx, arguments));
		},
	
		transform: function(matrix) {
			this._matrix.append(matrix);
		},
	
		scrollBy: function() {
			this.translate(Point.read(arguments).negate());
		}
	}), {
	
		projectToView: function() {
			return this._matrix._transformPoint(Point.read(arguments));
		},
	
		viewToProject: function() {
			return this._matrix._inverseTransform(Point.read(arguments));
		},
	
		getEventPoint: function(event) {
			return this.viewToProject(DomEvent.getOffset(event, this._element));
		},
	
	}, {
		statics: {
			_views: [],
			_viewsById: {},
			_id: 0,
	
			create: function(project, element) {
				if (document && typeof element === 'string')
					element = document.getElementById(element);
				var ctor = window ? CanvasView : View;
				return new ctor(project, element);
			}
		}
	},
	new function() {
		if (!window)
			return;
		var prevFocus,
			tempFocus,
			dragging = false,
			mouseDown = false;
	
		function getView(event) {
			var target = DomEvent.getTarget(event);
			return target.getAttribute && View._viewsById[
					target.getAttribute('id')];
		}
	
		function updateFocus() {
			var view = View._focused;
			if (!view || !view.isVisible()) {
				for (var i = 0, l = View._views.length; i < l; i++) {
					if ((view = View._views[i]).isVisible()) {
						View._focused = tempFocus = view;
						break;
					}
				}
			}
		}
	
		function handleMouseMove(view, event, point) {
			view._handleMouseEvent('mousemove', event, point);
		}
	
		var navigator = window.navigator,
			mousedown, mousemove, mouseup;
		if (navigator.pointerEnabled || navigator.msPointerEnabled) {
			mousedown = 'pointerdown MSPointerDown';
			mousemove = 'pointermove MSPointerMove';
			mouseup = 'pointerup pointercancel MSPointerUp MSPointerCancel';
		} else {
			mousedown = 'touchstart';
			mousemove = 'touchmove';
			mouseup = 'touchend touchcancel';
			if (!('ontouchstart' in window && navigator.userAgent.match(
					/mobile|tablet|ip(ad|hone|od)|android|silk/i))) {
				mousedown += ' mousedown';
				mousemove += ' mousemove';
				mouseup += ' mouseup';
			}
		}
	
		var viewEvents = {},
			docEvents = {
				mouseout: function(event) {
					var view = View._focused,
						target = DomEvent.getRelatedTarget(event);
					if (view && (!target || target.nodeName === 'HTML')) {
						var offset = DomEvent.getOffset(event, view._element),
							x = offset.x,
							abs = Math.abs,
							ax = abs(x),
							max = 1 << 25,
							diff = ax - max;
						offset.x = abs(diff) < ax ? diff * (x < 0 ? -1 : 1) : x;
						handleMouseMove(view, event, view.viewToProject(offset));
					}
				},
	
				scroll: updateFocus
			};
	
		viewEvents[mousedown] = function(event) {
			var view = View._focused = getView(event);
			if (!dragging) {
				dragging = true;
				view._handleMouseEvent('mousedown', event);
			}
		};
	
		docEvents[mousemove] = function(event) {
			var view = View._focused;
			if (!mouseDown) {
				var target = getView(event);
				if (target) {
					if (view !== target) {
						if (view)
							handleMouseMove(view, event);
						if (!prevFocus)
							prevFocus = view;
						view = View._focused = tempFocus = target;
					}
				} else if (tempFocus && tempFocus === view) {
					if (prevFocus && !prevFocus.isInserted())
						prevFocus = null;
					view = View._focused = prevFocus;
					prevFocus = null;
					updateFocus();
				}
			}
			if (view)
				handleMouseMove(view, event);
		};
	
		docEvents[mousedown] = function() {
			mouseDown = true;
		};
	
		docEvents[mouseup] = function(event) {
			var view = View._focused;
			if (view && dragging)
				view._handleMouseEvent('mouseup', event);
			mouseDown = dragging = false;
		};
	
		DomEvent.add(document, docEvents);
	
		DomEvent.add(window, {
			load: updateFocus
		});
	
		var called = false,
			prevented = false,
			fallbacks = {
				doubleclick: 'click',
				mousedrag: 'mousemove'
			};
	
		function emitMouseEvent(obj, type, event, point, prevPoint, stopItem) {
			var target = obj,
				stopped = false,
				mouseEvent;
	
			function emit(obj, type) {
				if (obj.responds(type)) {
					if (!mouseEvent) {
						mouseEvent = new MouseEvent(type, event, point, target,
								prevPoint ? point.subtract(prevPoint) : null);
					}
					if (obj.emit(type, mouseEvent)) {
						called = true;
						if (mouseEvent.prevented)
							prevented = true;
						if (mouseEvent.stopped)
							return stopped = true;
					}
				} else {
					var fallback = fallbacks[type];
					if (fallback)
						return emit(obj, fallback);
				}
			}
	
			while (obj && obj !== stopItem) {
				if (emit(obj, type))
					break;
				obj = obj._parent;
			}
			return stopped;
		}
	
		function emitMouseEvents(view, item, type, event, point, prevPoint) {
			view._project.removeOn(type);
			prevented = called = false;
			return (dragItem && emitMouseEvent(dragItem, type, event, point,
						prevPoint)
				|| item && item !== dragItem && !item.isDescendant(dragItem)
					&& emitMouseEvent(item, fallbacks[type] || type, event, point,
						prevPoint, dragItem)
				|| emitMouseEvent(view, type, event, point, prevPoint));
		}
	
		var itemEventsMap = {
			mousedown: {
				mousedown: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mouseup: {
				mouseup: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mousemove: {
				mousedrag: 1,
				mousemove: 1,
				mouseenter: 1,
				mouseleave: 1
			}
		};
	
		var downPoint,
			lastPoint,
			downItem,
			overItem,
			dragItem,
			clickItem,
			clickTime,
			dblClick,
			overView,
			wasInView = false;
	
		return {
			_viewEvents: viewEvents,
	
			_handleMouseEvent: function(type, event, point) {
				var itemEvents = this._itemEvents,
					hitItems = itemEvents.native[type],
					tool = this._scope.tool,
					view = this;
	
				function responds(type) {
					return itemEvents.virtual[type] || view.responds(type)
							|| tool && tool.responds(type);
				}
	
				if (type === 'mousemove' && dragging && responds('mousedrag'))
					type = 'mousedrag';
				if (!point)
					point = this.getEventPoint(event);
	
				var inView = this.getBounds().contains(point),
					hit = inView && hitItems && this._project.hitTest(point, {
						tolerance: 0,
						fill: true,
						stroke: true
					}),
					item = hit && hit.item || undefined,
					handle = false,
					mouse = {};
				mouse[type.substr(5)] = true;
	
				var moveType = mouse.move || mouse.drag ? type : 'mousemove';
				if (item !== overItem) {
					if (overItem)
						emitMouseEvent(overItem, 'mouseleave', event, point);
					if (item)
						emitMouseEvent(item, 'mouseenter', event, point);
				}
				overItem = item;
				if (wasInView ^ inView) {
					emitMouseEvent(this, inView ? 'mouseenter' : 'mouseleave',
							event, point);
					overView = inView ? this : null;
					handle = true;
				}
				if ((inView || mouse.drag) && !point.equals(lastPoint)) {
					emitMouseEvents(this, item, moveType, event, point, lastPoint);
					handle = true;
				}
				wasInView = inView;
				if (mouse.down && inView || mouse.up && downPoint) {
					emitMouseEvents(this, item, type, event, point, downPoint);
					if (mouse.down) {
						dblClick = item === clickItem
							&& (Date.now() - clickTime < 300);
						downItem = clickItem = item;
						dragItem = !prevented && item;
						downPoint = point;
					} else if (mouse.up) {
						if (!prevented && item === downItem) {
							clickTime = Date.now();
							emitMouseEvents(this, item,
									dblClick ? 'doubleclick' : 'click',
									event, point, downPoint);
							dblClick = false;
						}
						downItem = dragItem = null;
					}
					wasInView = false;
					handle = true;
				}
				lastPoint = point;
				if (handle && tool) {
					called = tool._handleMouseEvent(type, event, point, mouse)
						|| called;
				}
	
				if (called && !mouse.move || mouse.down && responds('mouseup'))
					event.preventDefault();
			},
	
			_handleKeyEvent: function(type, event, key, character) {
				var scope = this._scope,
					tool = scope.tool,
					keyEvent;
	
				function emit(obj) {
					if (obj.responds(type)) {
						paper = scope;
						obj.emit(type, keyEvent = keyEvent
								|| new KeyEvent(type, event, key, character));
					}
				}
	
				if (this.isVisible()) {
					emit(this);
					if (tool && tool.responds(type))
						emit(tool);
				}
			},
	
			_countItemEvent: function(type, sign) {
				var itemEvents = this._itemEvents,
					native = itemEvents.native,
					virtual = itemEvents.virtual;
				for (var key in itemEventsMap) {
					native[key] = (native[key] || 0)
							+ (itemEventsMap[key][type] || 0) * sign;
				}
				virtual[type] = (virtual[type] || 0) + sign;
			},
	
			statics: {
				updateFocus: updateFocus
			}
		};
	});
	
	var CanvasView = View.extend({
		_class: 'CanvasView',
	
		initialize: function CanvasView(project, canvas) {
			if (!(canvas instanceof window.HTMLCanvasElement)) {
				var size = Size.read(arguments, 1);
				if (size.isZero())
					throw new Error(
							'Cannot create CanvasView with the provided argument: '
							+ [].slice.call(arguments, 1));
				canvas = CanvasProvider.getCanvas(size);
			}
			var ctx = this._context = canvas.getContext('2d');
			ctx.save();
			this._pixelRatio = 1;
			if (!/^off|false$/.test(PaperScope.getAttribute(canvas, 'hidpi'))) {
				var deviceRatio = window.devicePixelRatio || 1,
					backingStoreRatio = DomElement.getPrefixed(ctx,
							'backingStorePixelRatio') || 1;
				this._pixelRatio = deviceRatio / backingStoreRatio;
			}
			View.call(this, project, canvas);
			this._needsUpdate = true;
		},
	
		remove: function remove() {
			this._context.restore();
			return remove.base.call(this);
		},
	
		_setElementSize: function _setElementSize(width, height) {
			var pixelRatio = this._pixelRatio;
			_setElementSize.base.call(this, width * pixelRatio, height * pixelRatio);
			if (pixelRatio !== 1) {
				var element = this._element,
					ctx = this._context;
				if (!PaperScope.hasAttribute(element, 'resize')) {
					var style = element.style;
					style.width = width + 'px';
					style.height = height + 'px';
				}
				ctx.restore();
				ctx.save();
				ctx.scale(pixelRatio, pixelRatio);
			}
		},
	
		getPixelSize: function getPixelSize(size) {
			var agent = paper.agent,
				pixels;
			if (agent && agent.firefox) {
				pixels = getPixelSize.base.call(this, size);
			} else {
				var ctx = this._context,
					prevFont = ctx.font;
				ctx.font = size + ' serif';
				pixels = parseFloat(ctx.font);
				ctx.font = prevFont;
			}
			return pixels;
		},
	
		getTextWidth: function(font, lines) {
			var ctx = this._context,
				prevFont = ctx.font,
				width = 0;
			ctx.font = font;
			for (var i = 0, l = lines.length; i < l; i++)
				width = Math.max(width, ctx.measureText(lines[i]).width);
			ctx.font = prevFont;
			return width;
		},
	
		update: function() {
			if (!this._needsUpdate)
				return false;
			var project = this._project,
				ctx = this._context,
				size = this._viewSize;
			ctx.clearRect(0, 0, size.width + 1, size.height + 1);
			if (project)
				project.draw(ctx, this._matrix, this._pixelRatio);
			this._needsUpdate = false;
			return true;
		}
	});
	
	var Event = Base.extend({
		_class: 'Event',
	
		initialize: function Event(event) {
			this.event = event;
			this.type = event && event.type;
		},
	
		prevented: false,
		stopped: false,
	
		preventDefault: function() {
			this.prevented = true;
			this.event.preventDefault();
		},
	
		stopPropagation: function() {
			this.stopped = true;
			this.event.stopPropagation();
		},
	
		stop: function() {
			this.stopPropagation();
			this.preventDefault();
		},
	
		getTimeStamp: function() {
			return this.event.timeStamp;
		},
	
		getModifiers: function() {
			return Key.modifiers;
		}
	});
	
	var KeyEvent = Event.extend({
		_class: 'KeyEvent',
	
		initialize: function KeyEvent(type, event, key, character) {
			this.type = type;
			this.event = event;
			this.key = key;
			this.character = character;
		},
	
		toString: function() {
			return "{ type: '" + this.type
					+ "', key: '" + this.key
					+ "', character: '" + this.character
					+ "', modifiers: " + this.getModifiers()
					+ " }";
		}
	});
	
	var Key = new function() {
		var keyLookup = {
				'\t': 'tab',
				' ': 'space',
				'\b': 'backspace',
				'\x7f': 'delete',
				'Spacebar': 'space',
				'Del': 'delete',
				'Win': 'meta',
				'Esc': 'escape'
			},
	
			charLookup = {
				'tab': '\t',
				'space': ' ',
				'enter': '\r'
			},
	
			keyMap = {},
			charMap = {},
			metaFixMap,
			downKey;
	
			modifiers = new Base({
				shift: false,
				control: false,
				alt: false,
				meta: false,
				capsLock: false,
				space: false
			}).inject({
				option: {
					get: function() {
						return this.alt;
					}
				},
	
				command: {
					get: function() {
						var agent = paper && paper.agent;
						return agent && agent.mac ? this.meta : this.control;
					}
				}
			});
	
		function getKey(event) {
			var key = event.key || event.keyIdentifier;
			key = /^U\+/.test(key)
					? String.fromCharCode(parseInt(key.substr(2), 16))
					: /^Arrow[A-Z]/.test(key) ? key.substr(5)
					: key === 'Unidentified' ? String.fromCharCode(event.keyCode)
					: key;
			return keyLookup[key] ||
					(key.length > 1 ? Base.hyphenate(key) : key.toLowerCase());
		}
	
		function handleKey(down, key, character, event) {
			var type = down ? 'keydown' : 'keyup',
				view = View._focused,
				name;
			keyMap[key] = down;
			if (down) {
				charMap[key] = character;
			} else {
				delete charMap[key];
			}
			if (key.length > 1 && (name = Base.camelize(key)) in modifiers) {
				modifiers[name] = down;
				var agent = paper && paper.agent;
				if (name === 'meta' && agent && agent.mac) {
					if (down) {
						metaFixMap = {};
					} else {
						for (var k in metaFixMap) {
							if (k in charMap)
								handleKey(false, k, metaFixMap[k], event);
						}
						metaFixMap = null;
					}
				}
			} else if (down && metaFixMap) {
				metaFixMap[key] = character;
			}
			if (view) {
				view._handleKeyEvent(down ? 'keydown' : 'keyup', event, key,
						character);
			}
		}
	
		DomEvent.add(document, {
			keydown: function(event) {
				var key = getKey(event),
					agent = paper && paper.agent;
				if (key.length > 1 || agent && (agent.chrome && (event.altKey
							|| agent.mac && event.metaKey
							|| !agent.mac && event.ctrlKey))) {
					handleKey(true, key,
							charLookup[key] || (key.length > 1 ? '' : key), event);
				} else {
					downKey = key;
				}
			},
	
			keypress: function(event) {
				if (downKey) {
					var key = getKey(event),
						code = event.charCode,
						character = code >= 32 ? String.fromCharCode(code)
							: key.length > 1 ? '' : key;
					if (key !== downKey) {
						key = character.toLowerCase();
					}
					handleKey(true, key, character, event);
					downKey = null;
				}
			},
	
			keyup: function(event) {
				var key = getKey(event);
				if (key in charMap)
					handleKey(false, key, charMap[key], event);
			}
		});
	
		DomEvent.add(window, {
			blur: function(event) {
				for (var key in charMap)
					handleKey(false, key, charMap[key], event);
			}
		});
	
		return {
			modifiers: modifiers,
	
			isDown: function(key) {
				return !!keyMap[key];
			}
		};
	};
	
	var MouseEvent = Event.extend({
		_class: 'MouseEvent',
	
		initialize: function MouseEvent(type, event, point, target, delta) {
			this.type = type;
			this.event = event;
			this.point = point;
			this.target = target;
			this.delta = delta;
		},
	
		toString: function() {
			return "{ type: '" + this.type
					+ "', point: " + this.point
					+ ', target: ' + this.target
					+ (this.delta ? ', delta: ' + this.delta : '')
					+ ', modifiers: ' + this.getModifiers()
					+ ' }';
		}
	});
	
	var ToolEvent = Event.extend({
		_class: 'ToolEvent',
		_item: null,
	
		initialize: function ToolEvent(tool, type, event) {
			this.tool = tool;
			this.type = type;
			this.event = event;
		},
	
		_choosePoint: function(point, toolPoint) {
			return point ? point : toolPoint ? toolPoint.clone() : null;
		},
	
		getPoint: function() {
			return this._choosePoint(this._point, this.tool._point);
		},
	
		setPoint: function(point) {
			this._point = point;
		},
	
		getLastPoint: function() {
			return this._choosePoint(this._lastPoint, this.tool._lastPoint);
		},
	
		setLastPoint: function(lastPoint) {
			this._lastPoint = lastPoint;
		},
	
		getDownPoint: function() {
			return this._choosePoint(this._downPoint, this.tool._downPoint);
		},
	
		setDownPoint: function(downPoint) {
			this._downPoint = downPoint;
		},
	
		getMiddlePoint: function() {
			if (!this._middlePoint && this.tool._lastPoint) {
				return this.tool._point.add(this.tool._lastPoint).divide(2);
			}
			return this._middlePoint;
		},
	
		setMiddlePoint: function(middlePoint) {
			this._middlePoint = middlePoint;
		},
	
		getDelta: function() {
			return !this._delta && this.tool._lastPoint
					? this.tool._point.subtract(this.tool._lastPoint)
					: this._delta;
		},
	
		setDelta: function(delta) {
			this._delta = delta;
		},
	
		getCount: function() {
			return this.tool[/^mouse(down|up)$/.test(this.type)
					? '_downCount' : '_moveCount'];
		},
	
		setCount: function(count) {
			this.tool[/^mouse(down|up)$/.test(this.type) ? 'downCount' : 'count']
				= count;
		},
	
		getItem: function() {
			if (!this._item) {
				var result = this.tool._scope.project.hitTest(this.getPoint());
				if (result) {
					var item = result.item,
						parent = item._parent;
					while (/^(Group|CompoundPath)$/.test(parent._class)) {
						item = parent;
						parent = parent._parent;
					}
					this._item = item;
				}
			}
			return this._item;
		},
	
		setItem: function(item) {
			this._item = item;
		},
	
		toString: function() {
			return '{ type: ' + this.type
					+ ', point: ' + this.getPoint()
					+ ', count: ' + this.getCount()
					+ ', modifiers: ' + this.getModifiers()
					+ ' }';
		}
	});
	
	var Tool = PaperScopeItem.extend({
		_class: 'Tool',
		_list: 'tools',
		_reference: 'tool',
		_events: ['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
				'onActivate', 'onDeactivate', 'onEditOptions', 'onKeyDown',
				'onKeyUp'],
	
		initialize: function Tool(props) {
			PaperScopeItem.call(this);
			this._moveCount = -1;
			this._downCount = -1;
			this._set(props);
		},
	
		getMinDistance: function() {
			return this._minDistance;
		},
	
		setMinDistance: function(minDistance) {
			this._minDistance = minDistance;
			if (minDistance != null && this._maxDistance != null
					&& minDistance > this._maxDistance) {
				this._maxDistance = minDistance;
			}
		},
	
		getMaxDistance: function() {
			return this._maxDistance;
		},
	
		setMaxDistance: function(maxDistance) {
			this._maxDistance = maxDistance;
			if (this._minDistance != null && maxDistance != null
					&& maxDistance < this._minDistance) {
				this._minDistance = maxDistance;
			}
		},
	
		getFixedDistance: function() {
			return this._minDistance == this._maxDistance
				? this._minDistance : null;
		},
	
		setFixedDistance: function(distance) {
			this._minDistance = this._maxDistance = distance;
		},
	
		_handleMouseEvent: function(type, event, point, mouse) {
			paper = this._scope;
			if (mouse.drag && !this.responds(type))
				type = 'mousemove';
			var move = mouse.move || mouse.drag,
				responds = this.responds(type),
				minDistance = this.minDistance,
				maxDistance = this.maxDistance,
				called = false,
				tool = this;
			function update(minDistance, maxDistance) {
				var pt = point,
					toolPoint = move ? tool._point : tool._downPoint || pt;
				if (move) {
					if (tool._moveCount && pt.equals(toolPoint)) {
						return false;
					}
					if (minDistance != null || maxDistance != null) {
						var vector = pt.subtract(toolPoint),
							distance = vector.getLength();
						if (distance < (minDistance || 0))
							return false;
						if (maxDistance) {
							pt = toolPoint.add(vector.normalize(
									Math.min(distance, maxDistance)));
						}
					}
					tool._moveCount++;
				}
				tool._point = pt;
				tool._lastPoint = toolPoint;
				if (mouse.down) {
					tool._moveCount = -1;
					tool._downPoint = pt;
					tool._downCount++;
				}
				return true;
			}
	
			function emit() {
				if (responds) {
					called = tool.emit(type, new ToolEvent(tool, type, event))
							|| called;
				}
			}
	
			if (mouse.down) {
				update();
				emit();
			} else if (mouse.up) {
				update(null, maxDistance);
				emit();
			} else if (responds) {
				while (update(minDistance, maxDistance))
					emit();
			}
			return called;
		}
	
	});
	
	var Http = {
		request: function(options) {
			var xhr = new window.XMLHttpRequest();
			xhr.open((options.method || 'get').toUpperCase(), options.url,
					Base.pick(options.async, true));
			if (options.mimeType)
				xhr.overrideMimeType(options.mimeType);
			xhr.onload = function() {
				var status = xhr.status;
				if (status === 0 || status === 200) {
					if (options.onLoad) {
						options.onLoad.call(xhr, xhr.responseText);
					}
				} else {
					xhr.onerror();
				}
			};
			xhr.onerror = function() {
				var status = xhr.status,
					message = 'Could not load "' + options.url + '" (Status: '
							+ status + ')';
				if (options.onError) {
					options.onError(message, status);
				} else {
					throw new Error(message);
				}
			};
			return xhr.send(null);
		}
	};
	
	var CanvasProvider = {
		canvases: [],
	
		getCanvas: function(width, height) {
			if (!window)
				return null;
			var canvas,
				clear = true;
			if (typeof width === 'object') {
				height = width.height;
				width = width.width;
			}
			if (this.canvases.length) {
				canvas = this.canvases.pop();
			} else {
				canvas = document.createElement('canvas');
				clear = false;
			}
			var ctx = canvas.getContext('2d');
			if (!ctx) {
				throw new Error('Canvas ' + canvas +
						' is unable toprovide a 2D context.');
			}
			if (canvas.width === width && canvas.height === height) {
				if (clear)
					ctx.clearRect(0, 0, width + 1, height + 1);
			} else {
				canvas.width = width;
				canvas.height = height;
			}
			ctx.save();
			return canvas;
		},
	
		getContext: function(width, height) {
			var canvas = this.getCanvas(width, height);
			return canvas ? canvas.getContext('2d') : null;
		},
	
		release: function(obj) {
			var canvas = obj && obj.canvas ? obj.canvas : obj;
			if (canvas && canvas.getContext) {
				canvas.getContext('2d').restore();
				this.canvases.push(canvas);
			}
		}
	};
	
	var BlendMode = new function() {
		var min = Math.min,
			max = Math.max,
			abs = Math.abs,
			sr, sg, sb, sa,
			br, bg, bb, ba,
			dr, dg, db;
	
		function getLum(r, g, b) {
			return 0.2989 * r + 0.587 * g + 0.114 * b;
		}
	
		function setLum(r, g, b, l) {
			var d = l - getLum(r, g, b);
			dr = r + d;
			dg = g + d;
			db = b + d;
			var l = getLum(dr, dg, db),
				mn = min(dr, dg, db),
				mx = max(dr, dg, db);
			if (mn < 0) {
				var lmn = l - mn;
				dr = l + (dr - l) * l / lmn;
				dg = l + (dg - l) * l / lmn;
				db = l + (db - l) * l / lmn;
			}
			if (mx > 255) {
				var ln = 255 - l,
					mxl = mx - l;
				dr = l + (dr - l) * ln / mxl;
				dg = l + (dg - l) * ln / mxl;
				db = l + (db - l) * ln / mxl;
			}
		}
	
		function getSat(r, g, b) {
			return max(r, g, b) - min(r, g, b);
		}
	
		function setSat(r, g, b, s) {
			var col = [r, g, b],
				mx = max(r, g, b),
				mn = min(r, g, b),
				md;
			mn = mn === r ? 0 : mn === g ? 1 : 2;
			mx = mx === r ? 0 : mx === g ? 1 : 2;
			md = min(mn, mx) === 0 ? max(mn, mx) === 1 ? 2 : 1 : 0;
			if (col[mx] > col[mn]) {
				col[md] = (col[md] - col[mn]) * s / (col[mx] - col[mn]);
				col[mx] = s;
			} else {
				col[md] = col[mx] = 0;
			}
			col[mn] = 0;
			dr = col[0];
			dg = col[1];
			db = col[2];
		}
	
		var modes = {
			multiply: function() {
				dr = br * sr / 255;
				dg = bg * sg / 255;
				db = bb * sb / 255;
			},
	
			screen: function() {
				dr = br + sr - (br * sr / 255);
				dg = bg + sg - (bg * sg / 255);
				db = bb + sb - (bb * sb / 255);
			},
	
			overlay: function() {
				dr = br < 128 ? 2 * br * sr / 255 : 255 - 2 * (255 - br) * (255 - sr) / 255;
				dg = bg < 128 ? 2 * bg * sg / 255 : 255 - 2 * (255 - bg) * (255 - sg) / 255;
				db = bb < 128 ? 2 * bb * sb / 255 : 255 - 2 * (255 - bb) * (255 - sb) / 255;
			},
	
			'soft-light': function() {
				var t = sr * br / 255;
				dr = t + br * (255 - (255 - br) * (255 - sr) / 255 - t) / 255;
				t = sg * bg / 255;
				dg = t + bg * (255 - (255 - bg) * (255 - sg) / 255 - t) / 255;
				t = sb * bb / 255;
				db = t + bb * (255 - (255 - bb) * (255 - sb) / 255 - t) / 255;
			},
	
			'hard-light': function() {
				dr = sr < 128 ? 2 * sr * br / 255 : 255 - 2 * (255 - sr) * (255 - br) / 255;
				dg = sg < 128 ? 2 * sg * bg / 255 : 255 - 2 * (255 - sg) * (255 - bg) / 255;
				db = sb < 128 ? 2 * sb * bb / 255 : 255 - 2 * (255 - sb) * (255 - bb) / 255;
			},
	
			'color-dodge': function() {
				dr = br === 0 ? 0 : sr === 255 ? 255 : min(255, 255 * br / (255 - sr));
				dg = bg === 0 ? 0 : sg === 255 ? 255 : min(255, 255 * bg / (255 - sg));
				db = bb === 0 ? 0 : sb === 255 ? 255 : min(255, 255 * bb / (255 - sb));
			},
	
			'color-burn': function() {
				dr = br === 255 ? 255 : sr === 0 ? 0 : max(0, 255 - (255 - br) * 255 / sr);
				dg = bg === 255 ? 255 : sg === 0 ? 0 : max(0, 255 - (255 - bg) * 255 / sg);
				db = bb === 255 ? 255 : sb === 0 ? 0 : max(0, 255 - (255 - bb) * 255 / sb);
			},
	
			darken: function() {
				dr = br < sr ? br : sr;
				dg = bg < sg ? bg : sg;
				db = bb < sb ? bb : sb;
			},
	
			lighten: function() {
				dr = br > sr ? br : sr;
				dg = bg > sg ? bg : sg;
				db = bb > sb ? bb : sb;
			},
	
			difference: function() {
				dr = br - sr;
				if (dr < 0)
					dr = -dr;
				dg = bg - sg;
				if (dg < 0)
					dg = -dg;
				db = bb - sb;
				if (db < 0)
					db = -db;
			},
	
			exclusion: function() {
				dr = br + sr * (255 - br - br) / 255;
				dg = bg + sg * (255 - bg - bg) / 255;
				db = bb + sb * (255 - bb - bb) / 255;
			},
	
			hue: function() {
				setSat(sr, sg, sb, getSat(br, bg, bb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},
	
			saturation: function() {
				setSat(br, bg, bb, getSat(sr, sg, sb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},
	
			luminosity: function() {
				setLum(br, bg, bb, getLum(sr, sg, sb));
			},
	
			color: function() {
				setLum(sr, sg, sb, getLum(br, bg, bb));
			},
	
			add: function() {
				dr = min(br + sr, 255);
				dg = min(bg + sg, 255);
				db = min(bb + sb, 255);
			},
	
			subtract: function() {
				dr = max(br - sr, 0);
				dg = max(bg - sg, 0);
				db = max(bb - sb, 0);
			},
	
			average: function() {
				dr = (br + sr) / 2;
				dg = (bg + sg) / 2;
				db = (bb + sb) / 2;
			},
	
			negation: function() {
				dr = 255 - abs(255 - sr - br);
				dg = 255 - abs(255 - sg - bg);
				db = 255 - abs(255 - sb - bb);
			}
		};
	
		var nativeModes = this.nativeModes = Base.each([
			'source-over', 'source-in', 'source-out', 'source-atop',
			'destination-over', 'destination-in', 'destination-out',
			'destination-atop', 'lighter', 'darker', 'copy', 'xor'
		], function(mode) {
			this[mode] = true;
		}, {});
	
		var ctx = CanvasProvider.getContext(1, 1);
		if (ctx) {
			Base.each(modes, function(func, mode) {
				var darken = mode === 'darken',
					ok = false;
				ctx.save();
				try {
					ctx.fillStyle = darken ? '#300' : '#a00';
					ctx.fillRect(0, 0, 1, 1);
					ctx.globalCompositeOperation = mode;
					if (ctx.globalCompositeOperation === mode) {
						ctx.fillStyle = darken ? '#a00' : '#300';
						ctx.fillRect(0, 0, 1, 1);
						ok = ctx.getImageData(0, 0, 1, 1).data[0] !== darken
								? 170 : 51;
					}
				} catch (e) {}
				ctx.restore();
				nativeModes[mode] = ok;
			});
			CanvasProvider.release(ctx);
		}
	
		this.process = function(mode, srcContext, dstContext, alpha, offset) {
			var srcCanvas = srcContext.canvas,
				normal = mode === 'normal';
			if (normal || nativeModes[mode]) {
				dstContext.save();
				dstContext.setTransform(1, 0, 0, 1, 0, 0);
				dstContext.globalAlpha = alpha;
				if (!normal)
					dstContext.globalCompositeOperation = mode;
				dstContext.drawImage(srcCanvas, offset.x, offset.y);
				dstContext.restore();
			} else {
				var process = modes[mode];
				if (!process)
					return;
				var dstData = dstContext.getImageData(offset.x, offset.y,
						srcCanvas.width, srcCanvas.height),
					dst = dstData.data,
					src = srcContext.getImageData(0, 0,
						srcCanvas.width, srcCanvas.height).data;
				for (var i = 0, l = dst.length; i < l; i += 4) {
					sr = src[i];
					br = dst[i];
					sg = src[i + 1];
					bg = dst[i + 1];
					sb = src[i + 2];
					bb = dst[i + 2];
					sa = src[i + 3];
					ba = dst[i + 3];
					process();
					var a1 = sa * alpha / 255,
						a2 = 1 - a1;
					dst[i] = a1 * dr + a2 * br;
					dst[i + 1] = a1 * dg + a2 * bg;
					dst[i + 2] = a1 * db + a2 * bb;
					dst[i + 3] = sa * alpha + a2 * ba;
				}
				dstContext.putImageData(dstData, offset.x, offset.y);
			}
		};
	};
	
	var SvgElement = new function() {
		var svg = 'http://www.w3.org/2000/svg',
			xmlns = 'http://www.w3.org/2000/xmlns',
			xlink = 'http://www.w3.org/1999/xlink',
			attributeNamespace = {
				href: xlink,
				xlink: xmlns,
				xmlns: xmlns + '/',
				'xmlns:xlink': xmlns + '/'
			};
	
		function create(tag, attributes, formatter) {
			return set(document.createElementNS(svg, tag), attributes, formatter);
		}
	
		function get(node, name) {
			var namespace = attributeNamespace[name],
				value = namespace
					? node.getAttributeNS(namespace, name)
					: node.getAttribute(name);
			return value === 'null' ? null : value;
		}
	
		function set(node, attributes, formatter) {
			for (var name in attributes) {
				var value = attributes[name],
					namespace = attributeNamespace[name];
				if (typeof value === 'number' && formatter)
					value = formatter.number(value);
				if (namespace) {
					node.setAttributeNS(namespace, name, value);
				} else {
					node.setAttribute(name, value);
				}
			}
			return node;
		}
	
		return {
			svg: svg,
			xmlns: xmlns,
			xlink: xlink,
	
			create: create,
			get: get,
			set: set
		};
	};
	
	var SvgStyles = Base.each({
		fillColor: ['fill', 'color'],
		fillRule: ['fill-rule', 'string'],
		strokeColor: ['stroke', 'color'],
		strokeWidth: ['stroke-width', 'number'],
		strokeCap: ['stroke-linecap', 'string'],
		strokeJoin: ['stroke-linejoin', 'string'],
		strokeScaling: ['vector-effect', 'lookup', {
			true: 'none',
			false: 'non-scaling-stroke'
		}, function(item, value) {
			return !value
					&& (item instanceof PathItem
						|| item instanceof Shape
						|| item instanceof TextItem);
		}],
		miterLimit: ['stroke-miterlimit', 'number'],
		dashArray: ['stroke-dasharray', 'array'],
		dashOffset: ['stroke-dashoffset', 'number'],
		fontFamily: ['font-family', 'string'],
		fontWeight: ['font-weight', 'string'],
		fontSize: ['font-size', 'number'],
		justification: ['text-anchor', 'lookup', {
			left: 'start',
			center: 'middle',
			right: 'end'
		}],
		opacity: ['opacity', 'number'],
		blendMode: ['mix-blend-mode', 'style']
	}, function(entry, key) {
		var part = Base.capitalize(key),
			lookup = entry[2];
		this[key] = {
			type: entry[1],
			property: key,
			attribute: entry[0],
			toSVG: lookup,
			fromSVG: lookup && Base.each(lookup, function(value, name) {
				this[value] = name;
			}, {}),
			exportFilter: entry[3],
			get: 'get' + part,
			set: 'set' + part
		};
	}, {});
	
	new function() {
		var formatter;
	
		function getTransform(matrix, coordinates, center) {
			var attrs = new Base(),
				trans = matrix.getTranslation();
			if (coordinates) {
				matrix = matrix._shiftless();
				var point = matrix._inverseTransform(trans);
				attrs[center ? 'cx' : 'x'] = point.x;
				attrs[center ? 'cy' : 'y'] = point.y;
				trans = null;
			}
			if (!matrix.isIdentity()) {
				var decomposed = matrix.decompose();
				if (decomposed) {
					var parts = [],
						angle = decomposed.rotation,
						scale = decomposed.scaling,
						skew = decomposed.skewing;
					if (trans && !trans.isZero())
						parts.push('translate(' + formatter.point(trans) + ')');
					if (angle)
						parts.push('rotate(' + formatter.number(angle) + ')');
					if (!Numerical.isZero(scale.x - 1)
							|| !Numerical.isZero(scale.y - 1))
						parts.push('scale(' + formatter.point(scale) +')');
					if (skew && skew.x)
						parts.push('skewX(' + formatter.number(skew.x) + ')');
					if (skew && skew.y)
						parts.push('skewY(' + formatter.number(skew.y) + ')');
					attrs.transform = parts.join(' ');
				} else {
					attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
				}
			}
			return attrs;
		}
	
		function exportGroup(item, options) {
			var attrs = getTransform(item._matrix),
				children = item._children;
			var node = SvgElement.create('g', attrs, formatter);
			for (var i = 0, l = children.length; i < l; i++) {
				var child = children[i];
				var childNode = exportSVG(child, options);
				if (childNode) {
					if (child.isClipMask()) {
						var clip = SvgElement.create('clipPath');
						clip.appendChild(childNode);
						setDefinition(child, clip, 'clip');
						SvgElement.set(node, {
							'clip-path': 'url(#' + clip.id + ')'
						});
					} else {
						node.appendChild(childNode);
					}
				}
			}
			return node;
		}
	
		function exportRaster(item, options) {
			var attrs = getTransform(item._matrix, true),
				size = item.getSize(),
				image = item.getImage();
			attrs.x -= size.width / 2;
			attrs.y -= size.height / 2;
			attrs.width = size.width;
			attrs.height = size.height;
			attrs.href = options.embedImages === false && image && image.src
					|| item.toDataURL();
			return SvgElement.create('image', attrs, formatter);
		}
	
		function exportPath(item, options) {
			var matchShapes = options.matchShapes;
			if (matchShapes) {
				var shape = item.toShape(false);
				if (shape)
					return exportShape(shape, options);
			}
			var segments = item._segments,
				length = segments.length,
				type,
				attrs = getTransform(item._matrix);
			if (matchShapes && length >= 2 && !item.hasHandles()) {
				if (length > 2) {
					type = item._closed ? 'polygon' : 'polyline';
					var parts = [];
					for(var i = 0; i < length; i++)
						parts.push(formatter.point(segments[i]._point));
					attrs.points = parts.join(' ');
				} else {
					type = 'line';
					var start = segments[0]._point,
						end = segments[1]._point;
					attrs.set({
						x1: start.x,
						y1: start.y,
						x2: end.x,
						y2: end.y
					});
				}
			} else {
				type = 'path';
				attrs.d = item.getPathData(null, options.precision);
			}
			return SvgElement.create(type, attrs, formatter);
		}
	
		function exportShape(item) {
			var type = item._type,
				radius = item._radius,
				attrs = getTransform(item._matrix, true, type !== 'rectangle');
			if (type === 'rectangle') {
				type = 'rect';
				var size = item._size,
					width = size.width,
					height = size.height;
				attrs.x -= width / 2;
				attrs.y -= height / 2;
				attrs.width = width;
				attrs.height = height;
				if (radius.isZero())
					radius = null;
			}
			if (radius) {
				if (type === 'circle') {
					attrs.r = radius;
				} else {
					attrs.rx = radius.width;
					attrs.ry = radius.height;
				}
			}
			return SvgElement.create(type, attrs, formatter);
		}
	
		function exportCompoundPath(item, options) {
			var attrs = getTransform(item._matrix);
			var data = item.getPathData(null, options.precision);
			if (data)
				attrs.d = data;
			return SvgElement.create('path', attrs, formatter);
		}
	
		function exportSymbolItem(item, options) {
			var attrs = getTransform(item._matrix, true),
				definition = item._definition,
				node = getDefinition(definition, 'symbol'),
				definitionItem = definition._item,
				bounds = definitionItem.getBounds();
			if (!node) {
				node = SvgElement.create('symbol', {
					viewBox: formatter.rectangle(bounds)
				});
				node.appendChild(exportSVG(definitionItem, options));
				setDefinition(definition, node, 'symbol');
			}
			attrs.href = '#' + node.id;
			attrs.x += bounds.x;
			attrs.y += bounds.y;
			attrs.width = bounds.width;
			attrs.height = bounds.height;
			attrs.overflow = 'visible';
			return SvgElement.create('use', attrs, formatter);
		}
	
		function exportGradient(color) {
			var gradientNode = getDefinition(color, 'color');
			if (!gradientNode) {
				var gradient = color.getGradient(),
					radial = gradient._radial,
					origin = color.getOrigin(),
					destination = color.getDestination(),
					attrs;
				if (radial) {
					attrs = {
						cx: origin.x,
						cy: origin.y,
						r: origin.getDistance(destination)
					};
					var highlight = color.getHighlight();
					if (highlight) {
						attrs.fx = highlight.x;
						attrs.fy = highlight.y;
					}
				} else {
					attrs = {
						x1: origin.x,
						y1: origin.y,
						x2: destination.x,
						y2: destination.y
					};
				}
				attrs.gradientUnits = 'userSpaceOnUse';
				gradientNode = SvgElement.create((radial ? 'radial' : 'linear')
						+ 'Gradient', attrs, formatter);
				var stops = gradient._stops;
				for (var i = 0, l = stops.length; i < l; i++) {
					var stop = stops[i],
						offset = stop._rampPoint,
						stopColor = stop._color,
						alpha = stopColor.getAlpha();
					attrs = {};
					if (offset != null)
						attrs.offset = offset;
					if (stopColor)
						attrs['stop-color'] = stopColor.toCSS(true);
					if (alpha < 1)
						attrs['stop-opacity'] = alpha;
					gradientNode.appendChild(
							SvgElement.create('stop', attrs, formatter));
				}
				setDefinition(color, gradientNode, 'color');
			}
			return 'url(#' + gradientNode.id + ')';
		}
	
		function exportText(item) {
			var node = SvgElement.create('text', getTransform(item._matrix, true),
					formatter);
			node.textContent = item._content;
			return node;
		}
	
		var exporters = {
			Group: exportGroup,
			Layer: exportGroup,
			Raster: exportRaster,
			Path: exportPath,
			Shape: exportShape,
			CompoundPath: exportCompoundPath,
			SymbolItem: exportSymbolItem,
			PointText: exportText
		};
	
		function applyStyle(item, node, isRoot) {
			var attrs = {},
				parent = !isRoot && item.getParent(),
				style = [];
	
			if (item._name != null)
				attrs.id = item._name;
	
			Base.each(SvgStyles, function(entry) {
				var get = entry.get,
					type = entry.type,
					value = item[get]();
				if (entry.exportFilter
						? entry.exportFilter(item, value)
						: !parent || !Base.equals(parent[get](), value)) {
					if (type === 'color' && value != null) {
						var alpha = value.getAlpha();
						if (alpha < 1)
							attrs[entry.attribute + '-opacity'] = alpha;
					}
					if (type === 'style') {
						style.push(entry.attribute + ': ' + value);
					} else {
						attrs[entry.attribute] = value == null ? 'none'
								: type === 'color' ? value.gradient
									? exportGradient(value, item)
									: value.toCSS(true)
								: type === 'array' ? value.join(',')
								: type === 'lookup' ? entry.toSVG[value]
								: value;
					}
				}
			});
	
			if (style.length)
				attrs.style = style.join(';');
	
			if (attrs.opacity === 1)
				delete attrs.opacity;
	
			if (!item._visible)
				attrs.visibility = 'hidden';
	
			return SvgElement.set(node, attrs, formatter);
		}
	
		var definitions;
		function getDefinition(item, type) {
			if (!definitions)
				definitions = { ids: {}, svgs: {} };
			return item && definitions.svgs[type + '-' + item._id];
		}
	
		function setDefinition(item, node, type) {
			if (!definitions)
				getDefinition();
			var id = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
			node.id = type + '-' + id;
			definitions.svgs[type + '-' + item._id] = node;
		}
	
		function exportDefinitions(node, options) {
			var svg = node,
				defs = null;
			if (definitions) {
				svg = node.nodeName.toLowerCase() === 'svg' && node;
				for (var i in definitions.svgs) {
					if (!defs) {
						if (!svg) {
							svg = SvgElement.create('svg');
							svg.appendChild(node);
						}
						defs = svg.insertBefore(SvgElement.create('defs'),
								svg.firstChild);
					}
					defs.appendChild(definitions.svgs[i]);
				}
				definitions = null;
			}
			return options.asString
					? new window.XMLSerializer().serializeToString(svg)
					: svg;
		}
	
		function exportSVG(item, options, isRoot) {
			var exporter = exporters[item._class],
				node = exporter && exporter(item, options);
			if (node) {
				var onExport = options.onExport;
				if (onExport)
					node = onExport(item, node, options) || node;
				var data = JSON.stringify(item._data);
				if (data && data !== '{}' && data !== 'null')
					node.setAttribute('data-paper-data', data);
			}
			return node && applyStyle(item, node, isRoot);
		}
	
		function setOptions(options) {
			if (!options)
				options = {};
			formatter = new Formatter(options.precision);
			return options;
		}
	
		Item.inject({
			exportSVG: function(options) {
				options = setOptions(options);
				return exportDefinitions(exportSVG(this, options, true), options);
			}
		});
	
		Project.inject({
			exportSVG: function(options) {
				options = setOptions(options);
				var children = this._children,
					view = this.getView(),
					bounds = Base.pick(options.bounds, 'view'),
					mx = options.matrix || bounds === 'view' && view._matrix,
					matrix = mx && Matrix.read([mx]),
					rect = bounds === 'view'
						? new Rectangle([0, 0], view.getViewSize())
						: bounds === 'content'
							? Item._getBounds(children, matrix, { stroke: true })
							: Rectangle.read([bounds], 0, { readNull: true }),
					attrs = {
						version: '1.1',
						xmlns: SvgElement.svg,
						'xmlns:xlink': SvgElement.xlink,
					};
				if (rect) {
					attrs.width = rect.width;
					attrs.height = rect.height;
					if (rect.x || rect.y)
						attrs.viewBox = formatter.rectangle(rect);
				}
				var node = SvgElement.create('svg', attrs, formatter),
					parent = node;
				if (matrix && !matrix.isIdentity()) {
					parent = node.appendChild(SvgElement.create('g',
							getTransform(matrix), formatter));
				}
				for (var i = 0, l = children.length; i < l; i++) {
					parent.appendChild(exportSVG(children[i], options, true));
				}
				return exportDefinitions(node, options);
			}
		});
	};
	
	new function() {
	
		var rootSize;
	
		function getValue(node, name, isString, allowNull, allowPercent) {
			var value = SvgElement.get(node, name),
				res = value == null
					? allowNull
						? null
						: isString ? '' : 0
					: isString
						? value
						: parseFloat(value);
			return /%\s*$/.test(value)
				? (res / 100) * (allowPercent ? 1
					: rootSize[/x|^width/.test(name) ? 'width' : 'height'])
				: res;
		}
	
		function getPoint(node, x, y, allowNull, allowPercent) {
			x = getValue(node, x || 'x', false, allowNull, allowPercent);
			y = getValue(node, y || 'y', false, allowNull, allowPercent);
			return allowNull && (x == null || y == null) ? null
					: new Point(x, y);
		}
	
		function getSize(node, w, h, allowNull, allowPercent) {
			w = getValue(node, w || 'width', false, allowNull, allowPercent);
			h = getValue(node, h || 'height', false, allowNull, allowPercent);
			return allowNull && (w == null || h == null) ? null
					: new Size(w, h);
		}
	
		function convertValue(value, type, lookup) {
			return value === 'none' ? null
					: type === 'number' ? parseFloat(value)
					: type === 'array' ?
						value ? value.split(/[\s,]+/g).map(parseFloat) : []
					: type === 'color' ? getDefinition(value) || value
					: type === 'lookup' ? lookup[value]
					: value;
		}
	
		function importGroup(node, type, options, isRoot) {
			var nodes = node.childNodes,
				isClip = type === 'clippath',
				isDefs = type === 'defs',
				item = new Group(),
				project = item._project,
				currentStyle = project._currentStyle,
				children = [];
			if (!isClip && !isDefs) {
				item = applyAttributes(item, node, isRoot);
				project._currentStyle = item._style.clone();
			}
			if (isRoot) {
				var defs = node.querySelectorAll('defs');
				for (var i = 0, l = defs.length; i < l; i++) {
					importNode(defs[i], options, false);
				}
			}
			for (var i = 0, l = nodes.length; i < l; i++) {
				var childNode = nodes[i],
					child;
				if (childNode.nodeType === 1
						&& !/^defs$/i.test(childNode.nodeName)
						&& (child = importNode(childNode, options, false))
						&& !(child instanceof SymbolDefinition))
					children.push(child);
			}
			item.addChildren(children);
			if (isClip)
				item = applyAttributes(item.reduce(), node, isRoot);
			project._currentStyle = currentStyle;
			if (isClip || isDefs) {
				item.remove();
				item = null;
			}
			return item;
		}
	
		function importPoly(node, type) {
			var coords = node.getAttribute('points').match(
						/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g),
				points = [];
			for (var i = 0, l = coords.length; i < l; i += 2)
				points.push(new Point(
						parseFloat(coords[i]),
						parseFloat(coords[i + 1])));
			var path = new Path(points);
			if (type === 'polygon')
				path.closePath();
			return path;
		}
	
		function importPath(node) {
			return PathItem.create(node.getAttribute('d'));
		}
	
		function importGradient(node, type) {
			var id = (getValue(node, 'href', true) || '').substring(1),
				radial = type === 'radialgradient',
				gradient;
			if (id) {
				gradient = definitions[id].getGradient();
				if (gradient._radial ^ radial) {
					gradient = gradient.clone();
					gradient._radial = radial;
				}
			} else {
				var nodes = node.childNodes,
					stops = [];
				for (var i = 0, l = nodes.length; i < l; i++) {
					var child = nodes[i];
					if (child.nodeType === 1)
						stops.push(applyAttributes(new GradientStop(), child));
				}
				gradient = new Gradient(stops, radial);
			}
			var origin, destination, highlight,
				scaleToBounds = getValue(node, 'gradientUnits', true) !==
					'userSpaceOnUse';
			if (radial) {
				origin = getPoint(node, 'cx', 'cy', false, scaleToBounds);
				destination = origin.add(
						getValue(node, 'r', false, false, scaleToBounds), 0);
				highlight = getPoint(node, 'fx', 'fy', true, scaleToBounds);
			} else {
				origin = getPoint(node, 'x1', 'y1', false, scaleToBounds);
				destination = getPoint(node, 'x2', 'y2', false, scaleToBounds);
			}
			var color = applyAttributes(
					new Color(gradient, origin, destination, highlight), node);
			color._scaleToBounds = scaleToBounds;
			return null;
		}
	
		var importers = {
			'#document': function (node, type, options, isRoot) {
				var nodes = node.childNodes;
				for (var i = 0, l = nodes.length; i < l; i++) {
					var child = nodes[i];
					if (child.nodeType === 1)
						return importNode(child, options, isRoot);
				}
			},
			g: importGroup,
			svg: importGroup,
			clippath: importGroup,
			polygon: importPoly,
			polyline: importPoly,
			path: importPath,
			lineargradient: importGradient,
			radialgradient: importGradient,
	
			image: function (node) {
				var raster = new Raster(getValue(node, 'href', true));
				raster.on('load', function() {
					var size = getSize(node);
					this.setSize(size);
					var center = this._matrix._transformPoint(
							getPoint(node).add(size.divide(2)));
					this.translate(center);
				});
				return raster;
			},
	
			symbol: function(node, type, options, isRoot) {
				return new SymbolDefinition(
						importGroup(node, type, options, isRoot), true);
			},
	
			defs: importGroup,
	
			use: function(node) {
				var id = (getValue(node, 'href', true) || '').substring(1),
					definition = definitions[id],
					point = getPoint(node);
				return definition
						? definition instanceof SymbolDefinition
							? definition.place(point)
							: definition.clone().translate(point)
						: null;
			},
	
			circle: function(node) {
				return new Shape.Circle(
						getPoint(node, 'cx', 'cy'),
						getValue(node, 'r'));
			},
	
			ellipse: function(node) {
				return new Shape.Ellipse({
					center: getPoint(node, 'cx', 'cy'),
					radius: getSize(node, 'rx', 'ry')
				});
			},
	
			rect: function(node) {
				return new Shape.Rectangle(new Rectangle(
							getPoint(node),
							getSize(node)
						), getSize(node, 'rx', 'ry'));
				},
	
			line: function(node) {
				return new Path.Line(
						getPoint(node, 'x1', 'y1'),
						getPoint(node, 'x2', 'y2'));
			},
	
			text: function(node) {
				var text = new PointText(getPoint(node).add(
						getPoint(node, 'dx', 'dy')));
				text.setContent(node.textContent.trim() || '');
				return text;
			}
		};
	
		function applyTransform(item, value, name, node) {
			if (item.transform) {
				var transforms = (node.getAttribute(name) || '').split(/\)\s*/g),
					matrix = new Matrix();
				for (var i = 0, l = transforms.length; i < l; i++) {
					var transform = transforms[i];
					if (!transform)
						break;
					var parts = transform.split(/\(\s*/),
						command = parts[0],
						v = parts[1].split(/[\s,]+/g);
					for (var j = 0, m = v.length; j < m; j++)
						v[j] = parseFloat(v[j]);
					switch (command) {
					case 'matrix':
						matrix.append(
								new Matrix(v[0], v[1], v[2], v[3], v[4], v[5]));
						break;
					case 'rotate':
						matrix.rotate(v[0], v[1], v[2]);
						break;
					case 'translate':
						matrix.translate(v[0], v[1]);
						break;
					case 'scale':
						matrix.scale(v);
						break;
					case 'skewX':
						matrix.skew(v[0], 0);
						break;
					case 'skewY':
						matrix.skew(0, v[0]);
						break;
					}
				}
				item.transform(matrix);
			}
		}
	
		function applyOpacity(item, value, name) {
			var key = name === 'fill-opacity' ? 'getFillColor' : 'getStrokeColor',
				color = item[key] && item[key]();
			if (color)
				color.setAlpha(parseFloat(value));
		}
	
		var attributes = Base.set(Base.each(SvgStyles, function(entry) {
			this[entry.attribute] = function(item, value) {
				if (item[entry.set]) {
					item[entry.set](convertValue(value, entry.type, entry.fromSVG));
					if (entry.type === 'color') {
						var color = item[entry.get]();
						if (color) {
							if (color._scaleToBounds) {
								var bounds = item.getBounds();
								color.transform(new Matrix()
									.translate(bounds.getPoint())
									.scale(bounds.getSize()));
							}
							if (item instanceof Shape) {
								color.transform(new Matrix().translate(
									item.getPosition(true).negate()));
							}
						}
					}
				}
			};
		}, {}), {
			id: function(item, value) {
				definitions[value] = item;
				if (item.setName)
					item.setName(value);
			},
	
			'clip-path': function(item, value) {
				var clip = getDefinition(value);
				if (clip) {
					clip = clip.clone();
					clip.setClipMask(true);
					if (item instanceof Group) {
						item.insertChild(0, clip);
					} else {
						return new Group(clip, item);
					}
				}
			},
	
			gradientTransform: applyTransform,
			transform: applyTransform,
	
			'fill-opacity': applyOpacity,
			'stroke-opacity': applyOpacity,
	
			visibility: function(item, value) {
				if (item.setVisible)
					item.setVisible(value === 'visible');
			},
	
			display: function(item, value) {
				if (item.setVisible)
					item.setVisible(value !== null);
			},
	
			'stop-color': function(item, value) {
				if (item.setColor)
					item.setColor(value);
			},
	
			'stop-opacity': function(item, value) {
				if (item._color)
					item._color.setAlpha(parseFloat(value));
			},
	
			offset: function(item, value) {
				if (item.setRampPoint) {
					var percentage = value.match(/(.*)%$/);
					item.setRampPoint(percentage ? percentage[1] / 100
							: parseFloat(value));
				}
			},
	
			viewBox: function(item, value, name, node, styles) {
				var rect = new Rectangle(convertValue(value, 'array')),
					size = getSize(node, null, null, true),
					group,
					matrix;
				if (item instanceof Group) {
					var scale = size ? size.divide(rect.getSize()) : 1,
					matrix = new Matrix().scale(scale)
							.translate(rect.getPoint().negate());
					group = item;
				} else if (item instanceof SymbolDefinition) {
					if (size)
						rect.setSize(size);
					group = item._item;
				}
				if (group)  {
					if (getAttribute(node, 'overflow', styles) !== 'visible') {
						var clip = new Shape.Rectangle(rect);
						clip.setClipMask(true);
						group.addChild(clip);
					}
					if (matrix)
						group.transform(matrix);
				}
			}
		});
	
		function getAttribute(node, name, styles) {
			var attr = node.attributes[name],
				value = attr && attr.value;
			if (!value) {
				var style = Base.camelize(name);
				value = node.style[style];
				if (!value && styles.node[style] !== styles.parent[style])
					value = styles.node[style];
			}
			return !value ? undefined
					: value === 'none' ? null
					: value;
		}
	
		function applyAttributes(item, node, isRoot) {
			var parent = node.parentNode,
				styles = {
					node: DomElement.getStyles(node) || {},
					parent: !isRoot && !/^defs$/i.test(parent.tagName)
							&& DomElement.getStyles(parent) || {}
				};
			Base.each(attributes, function(apply, name) {
				var value = getAttribute(node, name, styles);
				item = value !== undefined && apply(item, value, name, node, styles)
						|| item;
			});
			return item;
		}
	
		var definitions = {};
		function getDefinition(value) {
			var match = value && value.match(/\((?:["'#]*)([^"')]+)/),
				res = match && definitions[match[1]
					.replace(window.location.href.split('#')[0] + '#', '')];
			if (res && res._scaleToBounds) {
				res = res.clone();
				res._scaleToBounds = true;
			}
			return res;
		}
	
		function importNode(node, options, isRoot) {
			var type = node.nodeName.toLowerCase(),
				isElement = type !== '#document',
				body = document.body,
				container,
				parent,
				next;
			if (isRoot && isElement) {
				rootSize = getSize(node, null, null, true)
						|| paper.getView().getSize();
				container = SvgElement.create('svg', {
					style: 'stroke-width: 1px; stroke-miterlimit: 10'
				});
				parent = node.parentNode;
				next = node.nextSibling;
				container.appendChild(node);
				body.appendChild(container);
			}
			var settings = paper.settings,
				applyMatrix = settings.applyMatrix,
				insertItems = settings.insertItems;
			settings.applyMatrix = false;
			settings.insertItems = false;
			var importer = importers[type],
				item = importer && importer(node, type, options, isRoot) || null;
			settings.insertItems = insertItems;
			settings.applyMatrix = applyMatrix;
			if (item) {
				if (isElement && !(item instanceof Group))
					item = applyAttributes(item, node, isRoot);
				var onImport = options.onImport,
					data = isElement && node.getAttribute('data-paper-data');
				if (onImport)
					item = onImport(node, item, options) || item;
				if (options.expandShapes && item instanceof Shape) {
					item.remove();
					item = item.toPath();
				}
				if (data)
					item._data = JSON.parse(data);
			}
			if (container) {
				body.removeChild(container);
				if (parent) {
					if (next) {
						parent.insertBefore(node, next);
					} else {
						parent.appendChild(node);
					}
				}
			}
			if (isRoot) {
				definitions = {};
				if (item && Base.pick(options.applyMatrix, applyMatrix))
					item.matrix.apply(true, true);
			}
			return item;
		}
	
		function importSVG(source, options, owner) {
			if (!source)
				return null;
			options = typeof options === 'function' ? { onLoad: options }
					: options || {};
			var scope = paper,
				item = null;
	
			function onLoad(svg) {
				try {
					var node = typeof svg === 'object' ? svg : new window.DOMParser()
							.parseFromString(svg, 'image/svg+xml');
					if (!node.nodeName) {
						node = null;
						throw new Error('Unsupported SVG source: ' + source);
					}
					paper = scope;
					item = importNode(node, options, true);
					if (!options || options.insert !== false) {
						owner._insertItem(undefined, item);
					}
					var onLoad = options.onLoad;
					if (onLoad)
						onLoad(item, svg);
				} catch (e) {
					onError(e);
				}
			}
	
			function onError(message, status) {
				var onError = options.onError;
				if (onError) {
					onError(message, status);
				} else {
					throw new Error(message);
				}
			}
	
			if (typeof source === 'string' && !/^.*</.test(source)) {
				var node = document.getElementById(source);
				if (node) {
					onLoad(node);
				} else {
					Http.request({
						url: source,
						async: true,
						onLoad: onLoad,
						onError: onError
					});
				}
			} else if (typeof File !== 'undefined' && source instanceof File) {
				var reader = new FileReader();
				reader.onload = function() {
					onLoad(reader.result);
				};
				reader.onerror = function() {
					onError(reader.error);
				};
				return reader.readAsText(source);
			} else {
				onLoad(source);
			}
	
			return item;
		}
	
		Item.inject({
			importSVG: function(node, options) {
				return importSVG(node, options, this);
			}
		});
	
		Project.inject({
			importSVG: function(node, options) {
				this.activate();
				return importSVG(node, options, this);
			}
		});
	};
	
	paper = new (PaperScope.inject(Base.exports, {
		enumerable: true,
		Base: Base,
		Numerical: Numerical,
		Key: Key,
		DomEvent: DomEvent,
		DomElement: DomElement,
		document: document,
		window: window,
		Symbol: SymbolDefinition,
		PlacedSymbol: SymbolItem
	}))();
	
	if (paper.agent.node)
		__webpack_require__(34)(paper);
	
	if (true) {
		!(__WEBPACK_AMD_DEFINE_FACTORY__ = (paper), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else if (typeof module === 'object' && module) {
		module.exports = paper;
	}
	
	return paper;
	}(typeof self === 'object' ? self : null);


/***/ },
/* 33 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_33__;

/***/ },
/* 34 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_34__;

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	var opentype = __webpack_require__(2),
		paper = __webpack_require__(32),
		Glyph = __webpack_require__(36),
		assign = __webpack_require__(38).assign;
	
	function Font( args ) {
		paper.Group.prototype.constructor.apply( this );
	
		args = assign({
			familyName: 'Default familyName',
			styleName: 'Regular',
			ascender: 1,
			descender: -1,
			unitsPerEm: 1024
		}, args);
	
		this.fontinfo = this.ot = new opentype.Font( args );
	
		this.glyphMap = {};
		this.charMap = {};
		this.altMap = {};
		this._subset = false;
		this.fontMap = {};
	
		this.addGlyph(new Glyph({
			name: '.notdef',
			unicode: 0,
			advanceWidth: 650
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
	// TODO: handle unicode updates
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
			if ( !this._subset ) {
				this._subset = this.normalizeSubset( false );
			}
			return this._subset;
		},
		set: function( set ) {
			this._subset = this.normalizeSubset( set );
		}
	});
	
	Font.prototype.normalizeSubset = function( _set ) {
		var set;
	
		// two cases where _set isn't an array
		// false set = all glyphs in the charMap
		if ( _set === false ) {
			set = Object.keys( this.charMap ).map(function( unicode ) {
				return this.charMap[unicode];
			}.bind(this));
	
		// convert string to array of chars
		} else if ( typeof _set === 'string' ) {
			set = _set.split('').map(function(e) {
				return e.charCodeAt(0);
			});
	
		} else {
			set = _set;
		}
	
		// convert array of number to array of glyphs
		if ( Array.isArray( set ) && typeof set[0] === 'number' ) {
			set = set.map(function( unicode ) {
				return this.charMap[ unicode ];
			}.bind(this));
		}
	
		// always include .undef
		if ( set.indexOf( this.glyphMap['.notdef'] ) === -1 ) {
			set.unshift( this.glyphMap['.notdef'] );
		}
	
		// when encountering diacritics, include their base-glyph in the subset
		set.forEach(function( glyph ) {
			if ( glyph && glyph.base !== undefined ) {
				var base = this.charMap[ glyph.base ];
				if ( set.indexOf( base ) === -1 ) {
					set.unshift( base );
				}
			}
		}, this);
	
		// remove undefined glyphs, dedupe the set and move diacritics at the end
		return set.filter(function(e, i, arr) {
			return e && arr.lastIndexOf(e) === i;
		});
	};
	
	Font.prototype.getGlyphSubset = function( _set ) {
		return _set !== undefined ? this.normalizeSubset( _set ) : this.subset;
	};
	
	Font.prototype.setAlternateFor = function( unicode, glyphName ) {
		this.charMap[ unicode ] = this.glyphMap[ glyphName ];
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
	
	Font.prototype.updateOTCommands = function( set, shouldMerge ) {
		return this.updateOT({
			set: set,
			shouldUpdateCommands: true,
			shouldMerge: shouldMerge
		});
	};
	
	Font.prototype.updateOT = function( args ) {
		if ( args && args.shouldUpdateCommands ) {
			// the following is required so that the globalMatrix of glyphs
			// is taken into account on each update. I assume this is done in the
			// main thread when calling view.update();
			this._project._updateVersion++;
		}
	
		this.ot.glyphs.glyphs = (
			this.getGlyphSubset( args && args.set ).reduce(function(o, glyph, i) {
				if ( args && args.shouldUpdateCommands ) {
					o[i] = args.shouldMerge ?
						glyph.combineOTCommands( null ) :
						glyph.updateOTCommands( null );
				} else {
					o[i] = glyph.ot;
				}
	
				return o;
			}, {})
		);
		this.ot.glyphs.length = Object.keys(this.ot.glyphs.glyphs).length;
		return this;
	};
	
	Font.prototype.toArrayBuffer = function() {
		// rewrite the postScriptName to remove invalid characters
		// TODO: this should be fixed in opentype.js
		this.ot.names.postScriptName.en = (
			this.ot.names.postScriptName.en.replace(/[^A-z]/g, '_')
		);
	
		return this.ot.toArrayBuffer();
	}
	
	Font.prototype.importOT = function( otFont ) {
		this.ot = otFont;
	
		for ( var i = 0; i < otFont.glyphs.length; ++i ) {
			var otGlyph = otFont.glyphs.get(i);
			var glyph = new Glyph({
					name: otGlyph.name,
					unicode: otGlyph.unicode
				});
	
			this.addGlyph( glyph );
			glyph.importOT( otGlyph );
		}
	
		return this;
	};
	
	if ( typeof window === 'object' && window.document ) {
	
		var _URL = window.URL || window.webkitURL;
		Font.prototype.addToFonts = document.fonts ?
			// CSS font loading, lightning fast
			function( buffer, enFamilyName ) {
				if ( !enFamilyName ) {
					enFamilyName = this.ot.getEnglishName('fontFamily');
				}
	
				if ( this.fontMap[ enFamilyName ] ) {
					document.fonts.delete( this.fontMap[ enFamilyName ] );
				}
	
				var fontface = this.fontMap[ enFamilyName ] = (
					new window.FontFace(
						enFamilyName,
						buffer || this.toArrayBuffer()
					)
				);
	
				if ( fontface.status === 'error' ) {
					throw new Error('Fontface is invalid and cannot be displayed');
				}
	
				document.fonts.add( fontface );
	
				return this;
			} :
			function( buffer, enFamilyName ) {
				if ( !enFamilyName ) {
					enFamilyName = this.ot.getEnglishName('fontFamily');
				}
	
				var url = _URL.createObjectURL(
						new Blob(
							[ new DataView( buffer || this.toArrayBuffer() ) ],
							{ type: 'font/opentype' }
						)
					);
	
				if ( this.fontObjectURL ) {
					_URL.revokeObjectURL( this.fontObjectURL );
					this.styleSheet.deleteRule(0);
				}
	
				this.styleSheet.insertRule(
					'@font-face { font-family: "' + enFamilyName + '";' +
					'src: url(' + url + '); }',
					0
				);
				this.fontObjectURL = url;
	
				return this;
			};
	
		var a = document.createElement('a');
	
		var triggerDownload = function( font, arrayBuffer, filename ) {
			var reader = new FileReader();
			var enFamilyName = filename || font.ot.getEnglishName('fontFamily');
	
			reader.onloadend = function() {
				a.download = enFamilyName + '.otf';
				a.href = reader.result;
				a.dispatchEvent(new MouseEvent('click'));
	
				setTimeout(function() {
					a.href = '#';
					_URL.revokeObjectURL( reader.result );
				}, 100);
			};
	
			reader.readAsDataURL(new Blob(
				[ new DataView( arrayBuffer || font.toArrayBuffer() ) ],
				{ type: 'font/opentype' }
			));
		};
	
		Font.prototype.download = function( arrayBuffer, merged, name, user ) {
			if ( merged ) {
				// TODO: replace that with client-side font merging
				fetch('https://merge.prototypo.io/' +
					name.family + '/' +
					name.style + '/' + user, {
						method: 'POST',
						headers: { 'Content-Type': 'application/otf' },
						body: arrayBuffer
				})
				.then(function( response ) {
					return response.arrayBuffer();
				})
				.then(function( bufferToDownload ) {
					triggerDownload( this, bufferToDownload );
				}.bind(this));
	
			} else {
				triggerDownload(
					this, arrayBuffer, name && ( name.family + ' ' + name.style ) );
			}
	
			return this;
		};
	
	}
	
	module.exports = Font;


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	var opentype = __webpack_require__(2),
		paper = __webpack_require__(32),
		Outline = __webpack_require__(37);
	
	function Glyph( args ) {
		paper.Group.prototype.constructor.apply( this );
	
		if ( args && typeof args.unicode === 'string' ) {
			args.unicode = args.unicode.charCodeAt(0);
		}
	
		this.ot = new opentype.Glyph( args );
		this.ot.path = new opentype.Path();
	
		this.name = args.name;
		// workaround opentype 'unicode === 0' bug
		this.ot.unicode = args.unicode;
	
		this.addChild( new Outline() );
		// the second child will hold all components
		this.addChild( new paper.Group() );
		// Should all anchors and parentAnchors also leave in child groups?
		this.anchors = ( args && args.anchors ) || [];
		this.parentAnchors = ( args && args.parentAnchors ) || [];
	
		// each individual glyph must be explicitely made visible
		this.visible = false;
		// default colors required to display the glyph in a canvas
		this.fillColor = new paper.Color(0, 0, 0);
		// stroke won't be displayed unless strokeWidth is set to 1
		this.strokeColor = new paper.Color(0, 0, 0);
		this.strokeScaling = false;
	}
	
	Glyph.prototype = Object.create(paper.Group.prototype);
	Glyph.prototype.constructor = Glyph;
	
	// Todo: handle unicode updates
	Object.defineProperty(Glyph.prototype, 'unicode', {
		set: function( code ) {
			this.ot.unicode = typeof code === 'string' ?
				code.charCodeAt(0) :
				code;
		},
		get: function() {
			return this.ot.unicode;
		}
	});
	
	Object.defineProperty(Glyph.prototype, 'base', {
		set: function( code ) {
			this._base = typeof code === 'string' ?
				code.charCodeAt(0) :
				code;
		},
		get: function() {
			return this._base;
		}
	});
	
	// alias .advanceWidth to .ot.advanceWidth
	Object.defineProperty(Glyph.prototype, 'advanceWidth', {
		set: function( value ) {
			this.ot.advanceWidth = value;
		},
		get: function() {
			return this.ot.advanceWidth;
		}
	});
	
	// proxy .contours to .children[0]
	Object.defineProperty( Glyph.prototype, 'contours', {
		get: function() {
			return this.children[0].children;
		}
	});
	
	// proxy .components to .children[1]
	Object.defineProperty( Glyph.prototype, 'components', {
		get: function() {
			return this.children[1].children;
		}
	});
	
	// proxy ...Contour[s] methods to children[0]...Child[ren] methods
	// and proxy ...Component[s] methods to children[1]...Child[ren] methods
	Object.getOwnPropertyNames( paper.Item.prototype ).forEach(function(name) {
		var proto = this;
	
		// exclude getters and non-methods
		if ( Object.getOwnPropertyDescriptor(proto, name).get ||
				typeof proto[name] !== 'function' ) {
			return;
		}
	
		if ( name.indexOf('Children') !== -1 ) {
			proto[name.replace('Children', 'Contours')] = function() {
				proto[name].apply( this.children[0], arguments );
			};
	
			proto[name.replace('Children', 'Components')] = function() {
				proto[name].apply( this.children[1], arguments );
			};
	
		} else if ( name.indexOf('Child') !== -1 ) {
			proto[name.replace('Child', 'Contour')] = function() {
				proto[name].apply( this.children[0], arguments );
			};
	
			proto[name.replace('Child', 'Component')] = function() {
				proto[name].apply( this.children[1], arguments );
			};
		}
	
	}, paper.Item.prototype);
	
	Glyph.prototype.addAnchor = function( item ) {
		this.anchors.push( item );
		return item;
	};
	
	Glyph.prototype.addAnchors = function( anchors ) {
		return anchors.forEach(function(anchor) {
			this.addAnchor(anchor);
		}, this);
	};
	
	Glyph.prototype.addParentAnchor = function( item ) {
		this.parentAnchors.push( item );
		return item;
	};
	
	Glyph.prototype.addUnicode = function( code ) {
		this.ot.addUnicode( code );
	
		return this;
	};
	
	Glyph.prototype.interpolate = function( glyph0, glyph1, coef ) {
		// If we added an interpolate method to Group, we'd be able to just
		// interpolate all this.children directly.
		// instead we interpolate the outline first
		this.children[0].interpolate(
			glyph0.children[0], glyph1.children[0], coef
		);
		// and then the components
		this.children[1].children.forEach(function(component, j) {
			component.interpolate(
				glyph0.children[1].children[j], glyph1.children[1].children[j], coef
			);
		});
	
		this.ot.advanceWidth =
			glyph0.ot.advanceWidth +
			( glyph1.ot.advanceWidth - glyph0.ot.advanceWidth ) * coef;
		this.ot.leftSideBearing =
			glyph0.ot.leftSideBearing +
			( glyph1.ot.leftSideBearing - glyph0.ot.leftSideBearing ) * coef;
		this.ot.xMax =
			glyph0.ot.xMax + ( glyph1.ot.xMax - glyph0.ot.xMax ) * coef;
		this.ot.xMin =
			glyph0.ot.xMin + ( glyph1.ot.xMin - glyph0.ot.xMin ) * coef;
		this.ot.yMax =
			glyph0.ot.yMax + ( glyph1.ot.yMax - glyph0.ot.yMax ) * coef;
		this.ot.yMin =
			glyph0.ot.yMin + ( glyph1.ot.yMin - glyph0.ot.yMin ) * coef;
	
		return this;
	};
	
	Glyph.prototype.updateSVGData = function( path ) {
		if ( !path ) {
			this.svgData = [];
			path = this.svgData;
		}
	
		this.children[0].updateSVGData( path );
	
		this.children[1].children.forEach(function( component ) {
			component.updateSVGData( path );
		});
	
		return this.svgData;
	};
	
	Glyph.prototype.updateOTCommands = function( path ) {
		if ( !path ) {
			this.ot.path.commands = [];
			path = this.ot.path;
		}
	
		this.children[0].updateOTCommands( path );
	
		this.children[1].children.forEach(function( component ) {
			component.updateOTCommands( path );
		});
	
		return this.ot;
	};
	
	Glyph.prototype.combineOTCommands = function( path ) {
		if ( !path ) {
			this.ot.path.commands = [];
			path = this.ot.path;
		}
	
		var combined = this.combineTo( new Outline() );
	
		if ( combined ) {
			// prototypo.js will make all contours clockwise without this
			combined.isPrepared = true;
			combined.updateOTCommands( path );
		}
	
		return this.ot;
	};
	
	Glyph.prototype.combineTo = function( outline ) {
		if ( !outline ) {
			outline = new Outline();
		}
	
		outline = this.children[0].combineTo( outline );
	
		return this.children[1].children.reduce(function( outline, component ) {
			// and then combine it to the rest of the glyph
			return component.combineTo( outline );
		}, outline);
	};
	
	Glyph.prototype.importOT = function( otGlyph ) {
		var current;
		this.ot = otGlyph;
	
		if ( !otGlyph.path || !otGlyph.path.commands ) {
			return this;
		}
	
		this.ot.path.commands.forEach(function(command) {
			switch ( command.type ) {
				case 'M':
					current = new paper.Path();
					this.children[0].addChild( current );
	
					current.moveTo( command );
					break;
				case 'L':
					current.lineTo( command );
					break;
				case 'C':
					current.cubicCurveTo(
						[ command.x1, command.y1 ],
						[ command.x2, command.y2 ],
						command
					);
					break;
				case 'Q':
					current.quadraticCurveTo(
						[ command.x1, command.y1 ],
						command
					);
					break;
				case 'Z':
					// When the glyph has no contour,
					// they contain a single Z command in
					// opentype.js.
					// TODO: see how we should handle that
					if ( current ) {
						current.closePath();
					}
					break;
			}
		}.bind(this));
	
		return this;
	};
	
	module.exports = Glyph;


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	var paper = __webpack_require__(32);
	
	var Outline = paper.CompoundPath;
	
	// function Outline() {
	// 	paper.CompoundPath.prototype.constructor.apply( this, arguments );
	// }
	//
	// // inehrit CompoundPath
	// Outline.prototype = Object.create(paper.CompoundPath.prototype);
	// Outline.prototype.constructor = Outline;
	
	// Fix two problems with CompoundPath#insertChildren:
	// - it arbitrarily changes the direction of paths
	// - it seems that it doesn't handle CompoundPath arguments
	Outline.prototype.insertChildren = function(index, items, _preserve) {
		if ( Array.isArray( items ) ) {
			// flatten items to handle CompoundPath children
			items = [].concat.apply([], items.map(function(item) {
				return item instanceof paper.Path ? item : item.children;
			}));
		}
	
		return paper.Item.prototype.insertChildren.call(
			this, index, items, _preserve, paper.Path
		);
	};
	
	Outline.fromPath = function( path ) {
		var result = new Outline();
		return path._clone( result, false );
	};
	
	Outline.prototype.interpolate = function( outline0, outline1, coef ) {
		for (var i = 0, l = this.children.length; i < l; i++) {
			// The number of children should be the same everywhere,
			// but we're going to try our best anyway
			if ( !outline0.children[i] || !outline1.children[i] ) {
				break;
			}
	
			this.children[i].interpolate(
				outline0.children[i],
				outline1.children[i],
				coef
			);
		}
	
		return this;
	};
	
	Outline.prototype.updateSVGData = function( path ) {
		if ( !path ) {
			this.svgData = [];
			path = this.svgData;
		}
	
		this.children.forEach(function( contour ) {
			contour.updateSVGData( path );
		}, this);
	
		return this.svgData;
	};
	
	Outline.prototype.updateOTCommands = function( path ) {
		if ( !path ) {
			this.ot.path.commands = [];
			path = this.ot.path;
		}
	
		this.children.forEach(function( contour ) {
			contour.updateOTCommands( path );
		}.bind(this));
	
		return this.ot;
	};
	
	Outline.prototype.combineTo = function( outline ) {
		return this.children.reduce(function( reducing, path ) {
			// ignore empty and open paths
			if ( path.curves.length === 0 || !path.closed ) {
				return reducing;
			}
	
			var tmp = ( reducing == undefined  ?
				// when the initial value doesn't exist, use the first path
				// (clone it otherwise it's removed from this.children)
				path.clone( false ) :
				reducing[
					path.clockwise === !(path.exportReversed) ? 'unite' : 'subtract'
				]( path )
			);
	
			return ( tmp.constructor === paper.Path ?
				new paper.CompoundPath({ children: [ tmp ] }) :
				tmp
			);
	
		}, outline);
	};
	
	module.exports = Outline;


/***/ },
/* 38 */
/***/ function(module, exports) {

	/**
	 * Code refactored from Mozilla Developer Network:
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
	 */
	
	'use strict';
	
	function assign(target, firstSource) {
	  if (target === undefined || target === null) {
	    throw new TypeError('Cannot convert first argument to object');
	  }
	
	  var to = Object(target);
	  for (var i = 1; i < arguments.length; i++) {
	    var nextSource = arguments[i];
	    if (nextSource === undefined || nextSource === null) {
	      continue;
	    }
	
	    var keysArray = Object.keys(Object(nextSource));
	    for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
	      var nextKey = keysArray[nextIndex];
	      var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
	      if (desc !== undefined && desc.enumerable) {
	        to[nextKey] = nextSource[nextKey];
	      }
	    }
	  }
	  return to;
	}
	
	function polyfill() {
	  if (!Object.assign) {
	    Object.defineProperty(Object, 'assign', {
	      enumerable: false,
	      configurable: true,
	      writable: true,
	      value: assign
	    });
	  }
	}
	
	module.exports = {
	  assign: assign,
	  polyfill: polyfill
	};


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	/* Extend the Path prototype to add OpenType conversion
	 * and alias *segments methods and properties to *nodes
	 */
	var paper = __webpack_require__(32);
	
	var proto = paper.PaperScope.prototype.Path.prototype;
	
	// alias *Segments methods to *Nodes equivalents
	[ 'add', 'insert', 'remove' ].forEach(function(name) {
		proto[name + 'Nodes'] =
			proto[name + 'Segments'];
	});
	
	// alias .segments to .nodes
	Object.defineProperties(proto, {
		nodes: Object.getOwnPropertyDescriptor( proto, 'segments' ),
		firstNode: Object.getOwnPropertyDescriptor( proto, 'firstSegment' ),
		lastNode: Object.getOwnPropertyDescriptor( proto, 'lastSegment' )
	});
	
	proto._updateData = function( data, pushSimple, pushBezier ) {
		if ( this.visible === false || this.curves.length === 0) {
			return data;
		}
	
		// prototypo needs to be able to change the direction of the updated data.
		var reverse = this.exportReversed,
			curves = this.curves,
			length = curves.length,
			matrix = this.globalMatrix,
			start =
				curves[ reverse ? length - 1 : 0 ][ 'point' + ( reverse ? 2 : 1 ) ]
					.transform( matrix );
	
		pushSimple(
			'M',
			Math.round( start.x ) || 0,
			Math.round( start.y ) || 0
		);
	
		for ( var i = -1, l = curves.length; ++i < l; ) {
			var curve = curves[ reverse ? l - 1 - i : i ],
				end = curve['point' + ( reverse ? 1 : 2 ) ].transform( matrix );
	
			if ( curve.isStraight() ) {
				pushSimple(
					'L',
					Math.round( end.x ) || 0,
					Math.round( end.y ) || 0
				);
	
			} else {
				var ctrl1 = new paper.Point(
						curve.point1.x + curve.handle1.x,
						curve.point1.y + curve.handle1.y
					).transform( matrix ),
					ctrl2 = new paper.Point(
						curve.point2.x + curve.handle2.x,
						curve.point2.y + curve.handle2.y
					).transform( matrix );
	
				if ( reverse ) {
					pushBezier(
						'C',
						Math.round( ctrl2.x ) || 0,
						Math.round( ctrl2.y ) || 0,
						Math.round( ctrl1.x ) || 0,
						Math.round( ctrl1.y ) || 0,
						Math.round( end.x ) || 0,
						Math.round( end.y ) || 0
					);
				} else {
					pushBezier(
						'C',
						Math.round( ctrl1.x ) || 0,
						Math.round( ctrl1.y ) || 0,
						Math.round( ctrl2.x ) || 0,
						Math.round( ctrl2.y ) || 0,
						Math.round( end.x ) || 0,
						Math.round( end.y ) || 0
					);
				}
			}
		}
	
		if ( this.closed ) {
			pushSimple('Z');
		}
	
		return data;
	};
	
	proto.updateOTCommands = function( data ) {
		return this._updateData(
			data,
			function pushSimple() {
				data.commands.push({
					type: arguments[0],
					x: arguments[1],
					y: arguments[2]
				});
			},
			function pushBezier() {
				data.commands.push({
					type: arguments[0],
					x1: arguments[1],
					y1: arguments[2],
					x2: arguments[3],
					y2: arguments[4],
					x: arguments[5],
					y: arguments[6]
				});
			}
		);
	};
	
	proto.updateSVGData = function( data ) {
		return this._updateData(
			data,
			function pushSimple() {
				data.push.apply( data, arguments );
			},
			function pushBezier() {
				data.push.apply( data, arguments );
			}
		);
	};
	
	module.exports = paper.Path;


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	var paper = __webpack_require__(32);
	
	Object.defineProperty( paper.Segment.prototype, 'x', {
		get: function() {
			return this.point.x;
		},
		set: function( value ) {
			this.point.x = value;
		}
	});
	
	Object.defineProperty( paper.Segment.prototype, 'y', {
		get: function() {
			return this.point.y;
		},
		set: function( value ) {
			this.point.y = value;
		}
	});
	
	module.exports = paper.Segment;


/***/ }
/******/ ])
});
;
//# sourceMappingURL=plumin.js.map