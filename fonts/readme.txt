Coelacanth typeface version 0.003
=================================

Author, copyright and license details are in the font files themselves.

These fonts are a work in progress. There are currently 9 master fonts, from which the other fonts are interpolated.
These are combinations of Wireframe, Regular and Heavy in the weight axis and 4pt, 14pt and 60pt in the optical size axis.
The 14pt fonts are the most complete, especially 14pt Regular. 60pt Wireframe and Heavy are virtually at square-one, and
are really just placeholders. They need a lot more work.

To produce the different weights I started from regular and produced a wireframe version with all nodes shifted to produce
as close as possible to zero-width strokes. I then interpolated (extrapolated, really) from the wireframe past the regular
by 200%, to produce a 'heavy' font (which needs a fair bit of clean-up).

'Thin' fonts are interpolated 25% from Wireframe to Regular. This is not a very useful weight.
'Light' fonts are 60% from Thin to Regular.
'Bold' are 50% from Heavy to Regular.
'Semibold' are 60% from Bold to Regular.

6pt is 32.3% from 4pt to 14pt.
8pt is 66.3% from 4pt to 14pt.
24pt is 50% from 60pt to 14pt.

There's also an italic that needs a lot of work.

So far, proper kerning and font features only work in some of the 14pt fonts.
The semibold, bold and heavy fonts currently have precisely the same spacing as the regular fonts, and are consequently a
little squashed or extended in places; this is most obvious in the heavy fonts. When I get around to modifying this the
easiest way may be to create another wireframe that follows the desired proportions of the heavy type, and then do some
interpolation trickery to apply these changes at all point sizes. (Interpolate the heavy halfway towards the adjusted
wireframe, then interpolate the result of that -100% from the original wireframe.)

And small and petite caps need proper kerning. And currency symbols need vertical shifting when using lining numerals.
And so on and so on. Lots to do.

The first goal should probably be getting 14pt regular, bold and italic working well together; the rest can follow.

Offers of expert help are greatly appreciated; email me at ben.whitmore0@gmail.com.
Keep up-to-date at benwhitmore.altervista.com.
Thanks and enjoy!
