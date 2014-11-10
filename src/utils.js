// Object.mixin polyfill for IE9+
if ( !global.Object.mixin ) {
	global.Object.mixin = function( target, source ) {
		var props = Object.getOwnPropertyNames(source),
			p,
			descriptor,
			length = props.length;

		for (p = 0; p < length; p++) {
			descriptor = Object.getOwnPropertyDescriptor(source, props[p]);
			Object.defineProperty(target, props[p], descriptor);
		}

		return target;
	};
}

module.exports.mixin = global.Object.mixin;