var paper = require('../node_modules/paper/dist/paper-core.js');

function Collection() {
	var constructor,
		paramsArray;

	// already a Collection? Job's done
	if ( arguments[0] instanceof Collection ) {
		return arguments[0];

	// the first argument is a constructor function, use it to build the collection
	} else if ( typeof arguments[0] === 'function' ) {
		constructor = arguments[0];

		if ( Array.isArray( arguments[1] ) ) {
			arguments[1].forEach(function(params, i) {
				this[i] = Object.create(constructor.prototype);
				constructor.call(this[i], params);
			}, this);
			this.length = arguments[1].length;

		} else {
			this[0] = Object.create(constructor.prototype);
			constructor.apply(this[0], [].slice.call(arguments, 1));
			this.length = 1;
		}

	// The first argument is an array of already created instances,
	// turn them into a collection.
	} else if ( Array.isArray( arguments[0] ) ) {
		arguments[0].forEach(function(item, i) {
			this[i] = item;
		});
		this.length = arguments[0].length;

	// the first argument is an instance already created,
	// turn it into a collection
	} else {
		this[0] = arguments[0];
		this.length = 1;
	}

	return this;
}

Collection.prototype.forEach = function(cb, scope) {
	var i;

	for ( i = -1; ++i < this.length; ) {
		cb.apply(scope || null, this[i], i, Collection);
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

function unwrapArgs() {
	var args = [].slice.call( arguments, 0 ),
		arr,
		id,
		i;

	// first arg is an object and might have a collection or array of collection
	if ( args.length && args[0].constructor === Object ) {
		if ( 'children' in args[0] ) {
			arr = args[0];
			id = 'children';

		} else if ( 'segments' in args[0] ) {
			arr = args[0];
			id = 'segments';

		} else if ( 'nodes' in args[0] ) {
			arr = args[0];
			id = 'nodes';
		}

	// last element is a collection or an array of collection
	} else if ( args.length && args[args.length -1] instanceof Collection ||
			( typeof args[args.length -1] === 'object' &&
			args[args.length -1][0] instanceof Collection ) ) {

		arr = args;
		id = args.length -1;

	// otherwise unwrap each arg
	} else {
		for ( i = -1; ++i < args.length; ) {
			if ( args[i] instanceof Collection ) {
				args[i] = [].slice.call(args[i], 0);
			}
		}

		return args;
	}

	// unwrap a single collection
	if ( arr && arr[id] instanceof Collection ) {
		arr[id] = [].slice.call( arr[id], 0 );

	// unwrap an array of collection
	} else if ( arr && arr[id].length && arr[id][0] instanceof Collection ) {
		for ( i = -1; ++i < arr[id].length; ) {
			arr[id][i] = arr[id][i][0];
		}
	}

	return args;
}

Collection.proxy = function( paper ) {
	var plumin = this;
	plumin.paper = paper;

	var methodNames = {};
	Object.getOwnPropertyNames( paper.PaperScope.prototype ).forEach(function(name, i) {
		// proxy constructors
		if ( ( typeof this[name] ) === 'function' ) {
			plumin[name] = this[name];

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
		}

	}, paper.PaperScope.prototype);

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
			'scale'
		],
		createAndChain = [
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
			'addNodes',
			'insertNodes',

			'addGlyph',
			'addGlyphs',

			'addAnchor',
			'addAnchors',
			'addContour',
			'addContours',
			'addComponent',
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
			var args = unwrapArgs.apply(null, arguments),
				i;

			for ( i = -1; ++i < this.length; ) {
				this[i][name].apply(this[i], args);
			}

			// make method chainable
			return this;
		};
	});

	createAndChain.forEach(function(name) {
		Collection.prototype[name] = function() {
			var args = [].slice.call(arguments, 0),
				c,
				i;

			// penultimate argument is a constructor
			if ( args.length > 1 && typeof args[args.length - 2] === 'function' ) {
				// replace the last two arguments with the resulting collection
				c = Object.create(Collection.prototype);
				Collection.apply(c, args.splice(args.length -2));
				args.push( c );
			}

			// unwrap last argument if it's a collection
			if ( args.length && args[args.length -1] instanceof Collection ) {
				args[args.length -1] = /s$/.test(name) ?
					// if the method name finishes with an 's',
					// convert the collection to an array
					[].slice.call(args[args.length -1], 0):
					// otherwise use the first instance of the collection
					args[args.length -1][0];

			// otherwise if the last argument is an Array, we might be dealing
			// with an array of collections
			} else if ( args.length && /s$/.test(name) &&
					Array.isArray( args[args.length -1] ) &&
					args[args.length -1].length &&
					args[args.length -1][0] instanceof Collection ) {

				for ( i = -1; ++i < args[args.length -1].length; ) {
					args[args.length -1][i] = args[args.length -1][i][0];
				}
			}

			for ( i = -1; ++i < this.length; ) {
				this[i][name].apply(this[i], args);
			}

			return this;
		};
	});
};

module.exports = Collection;