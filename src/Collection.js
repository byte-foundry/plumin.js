var paper = require('../node_modules/paper/dist/paper-core.js');

function Collection( args ) {
	// already a Collection? Job's done
	if ( arguments.length === 1 && args instanceof Collection ) {
		return args;

	} else if ( arguments.length > 1 || !Array.isArray( args ) ) {
		args = [].slice.call( arguments, 0 );
	}

	this.length = 0;

	args.forEach(function( arg ) {
		// unwrap any collection
		if ( arg instanceof Collection ) {
			for ( var i = -1; ++i < arg.length; ) {
				this[this.length++] = arg[i];
			}

		} else {
			this[this.length++] = arg;
		}

	}, this);

	return this;
}

Collection.prototype.forEach = function(cb, scope) {
	for ( var i = -1; ++i < this.length; ) {
		cb.call(scope || this[i], this[i], i, this);
	}

	return this;
};

Collection.prototype.prop = function(name, val) {
	var i;

	// object setter
	if ( typeof name === 'object' ) {
		for ( i = -1; ++i < this.length; ) {
			this[i].set( name );
		}

		return this;
	}

	// getter
	if ( val === undefined ) {
		return this[0][name];
	}

	// simple setter
	for ( i = -1; ++i < this.length; ) {
		this[i][name] = val;
	}

	return this;
};

function wrapConstructor( constructor, prototype, useConstructed ) {
	return function wrapper() {
		var c,
			tmp,
			arr = [];

		// constructor used with new
		if ( this instanceof wrapper ) {
			// proxy to paper native constructor
			c = Object.create(prototype);
			tmp = constructor.apply(c, arguments);
			return useConstructed ?
				tmp:
				c;

		// without new, build a collection
		} else {
			if ( Array.isArray( arguments[0] ) ) {
				arguments[0].forEach(function(params, i) {
					arr.push( Object.create(prototype) );
					c = constructor.call( arr[i], params );
					if ( useConstructed ) {
						arr[i] = c;
					}
				});

			} else {
				arr.push( Object.create(prototype) );
				c = constructor.apply( arr[0], arguments );
				if ( useConstructed ) {
					arr[0] = c;
				}
			}

			return new Collection( arr );
		}
	};
}

var rconstructor = /(^|\.)[A-Z][a-z]+$/;
function constructorFilter( name ) {
	return typeof this[name] === 'function' && rconstructor.test(name);
}

// unwrap a collection or array of collection
function unwrapArg( arr, id, isPlural ) {
	// unwrap a single collection
	if ( arr && arr[id] instanceof Collection ) {
		arr[id] = isPlural ?
			[].slice.call( arr[id], 0 ):
			arr[id][0];

	// unwrap an array of collection
	} else if ( arr && arr[id].length && arr[id][0] instanceof Collection ) {
		for ( i = -1; ++i < arr[id].length; ) {
			arr[id][i] = arr[id][i][0];
		}
	}
}

function unwrapArgs() {
	var isPlural = this.isPlural,
		args = [].slice.call( arguments, 0 ),
		arr,
		id,
		i;

	// first arg is an object and might have a collection or array of collection
	// Todo: objects should be unwrapped recursively
	if ( args[0] && args[0].constructor === Object ) {
		if ( 'children' in args[0] ) {
			id = 'children';

		} else if ( 'segments' in args[0] ) {
			id = 'segments';

		} else if ( 'nodes' in args[0] ) {
			id = 'nodes';
		}

		unwrapArg( args[0], id, true );

	// otherwise unwrap each arg
	} else {
		for ( i = -1; ++i < args.length; ) {
			// if the method is plural (addChildren) and we're unwrapping
			// the last argument, we want to keep it in an array
			unwrapArg( args, i, i === args.length -1 && isPlural );
		}
	}

	return args;
}

Collection.proxy = function( paper ) {
	var plumin = this;

	plumin.paper = paper;

	var methodNames = {};
	Object.getOwnPropertyNames( paper.PaperScope.prototype )
		.filter( constructorFilter, paper.PaperScope.prototype )
		.forEach(function(name, i) {
			plumin[name] = wrapConstructor( this[name], this[name].prototype );

			// we don't want to proxy methods of Collection
			if ( name === 'Collection' ) {
				return;
			}

			Object.getOwnPropertyNames( this[name].prototype ).forEach(function(name, i) {
				// collect unique method names (first test avoids getters)
				if ( !Object.getOwnPropertyDescriptor(this, name).get &&
						typeof this[name] === 'function' ) {

					methodNames[name] = true;
				}

			}, this[name].prototype);

		}, paper.PaperScope.prototype);

	Object.keys( paper.PaperScope.prototype.Path )
		.filter( constructorFilter, paper.PaperScope.prototype.Path )
		.forEach(function(name) {
			plumin.Path[name] = wrapConstructor( this[name], this.prototype, true );

		}, paper.PaperScope.prototype.Path );

	Object.keys( paper.PaperScope.prototype.Shape )
		.filter( constructorFilter, paper.PaperScope.prototype.Shape )
		.forEach(function(name) {
			plumin.Shape[name] = wrapConstructor( this[name], this.prototype, true );

		}, paper.PaperScope.prototype.Shape );

	// proxy the most commonly used method of paper
	// do it only after proxying constructors otherwise it's overwritten
	plumin.setup = paper.setup.bind(paper);

	// proxy all methods from every constructor
	// by default methods aren't chainable
	Object.keys( methodNames ).sort().forEach(function(name) {
		// please oh please, don't overwrite my constructor, I need it.
		if ( name === 'constructor' ) {
			return;
		}

		Collection.prototype[name] = function() {
			var args = unwrapArgs.apply(null, arguments),
				i,
				result;

			for ( i = -1; ++i < this.length; ) {
				result = this[i][name].apply(this[i], args);
			}

			// by default methods aren't chainable
			// return the last result
			return result;
		};
	});

		// addChild( item ) and other methods with similar signatures
		// that we want to turn to addChild([constructor, ] item) and make chainable
	var chain = [
			'set',
			'setX',
			'setY',
			'insertAbove',
			'insertBelow',
			'sendToBack',
			'bringToFront',
			'remove',
			'removeChildren',
			'reverseChildren',

			'translate',
			'rotate',
			'scale',
			'shear',
			'skew',
			'transform',
			'fitBounds',
			'emit',

			'activate',

			'setPixel',

			'smooth',
			'moveTo',
			'lineTo',
			'cubicCurveTo',
			'quadraticCurveTo',
			'curveTo',
			'arcTo',
			'closePath',
			'moveBy',
			'lineBy',
			'cubicCurveBy',
			'quadraticCurveBy',
			'curveBy',
			'arcBy',

			'removeSegments',
			'simplify',
			'reverse',

			// Rectangle
			'include',
			'expand',
			'scale',
		// ],
		// createAndChain = [
			'addChild',
			'insertChild',
			'addChildren',
			'insertChildren',
			'replaceWith',

			'appendTop',
			'appendBottom',

			'add',
			'insert',
			'addSegments',
			'insertSegments',
			'addNode',
			'addNodes',
			'insertNodes',

			'addGlyph',
			'addGlyphs',

			'addAnchor',
			'addAnchors',
			'addContour',
			'addContours',
			'addComponent',
			'addComponents',

			'addUnicode',
			'prepareOt',
			'addToFonts',
			'download'
		],
		plural = [
			'addChildren',
			'insertChildren',
			'addSegments',
			'insertSegments',
			'addNodes',
			'insertNodes',
			'addGlyphs',
			'addAnchors',
			'addContours',
			'addComponents'
		],
		mathPoinFn = [
			'round',
			'ceil',
			'floor',
			'abs'
		],
		booleanPathOp = [
			'unite',
			'intersect',
			'subtract',
			'exclude',
			'divide'
		];

	chain.forEach(function(name) {
		Collection.prototype[name] = function() {
			var args = unwrapArgs.apply(
					{ isPlural: plural.indexOf(name) !== -1 },
					arguments
				),
				i;

			for ( i = -1; ++i < this.length; ) {
				this[i][name].apply(this[i], args);
			}

			// make method chainable
			return this;
		};
	});

	// singular chainable method
};

module.exports = Collection;