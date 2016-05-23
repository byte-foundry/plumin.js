var fs = require('fs'),
	p = require('./dist/plumin');

p.setup({
	width: 1024,
	height: 1024
});

var demo = p.Font({ familyName: 'Demo' }),
	glyph_p = p.Glyph({
		name: 'p',
		unicode: 'p',
		advanceWidth: 450
	});

glyph_p.addContours([
	p.Path.Rectangle({
		point: [0, -255],
		size: [100, 800]
	}),
	p.Path.Ellipse({
		point: [50, 0],
		size: [400, 550]
	}),
	p.Path.Ellipse({
		point: [100, 100],
		size: [250, 350]
	}).reverse()
]);

demo.addGlyph(glyph_p)
	.updateOTCommands();

// mkdir if not exist
fs.mkdir('.tmp', function(err) {
	if ( err && err.code !== 'EEXIST' ) {
		return console.log(err);
	}

	fs.open('.tmp/Demo.otf', 'w', function(err, fd) {
		if (err) {
			return console.log(err);
		}

		// ArrayBuffer to nodejs buffer
		var buffer = new Buffer( new Uint8Array( demo[0].ot.toBuffer() ) );
		fs.write(fd, buffer, 0, buffer.length, null, function(err) {
			if (err) {
				return console.log(err);
			}

			console.log('font saved to .tmp/Demo.otf');
		});
	});
});
