![Plumin.js logo](http://byte-foundry.github.io/plumin.js/plumin.png)

[![Dependency Status](https://david-dm.org/byte-foundry/plumin.js.svg?theme=shields.io)](https://david-dm.org/byte-foundry/plumin.js)
[![devDependency Status](https://david-dm.org/byte-foundry/plumin.js/dev-status.svg?theme=shields.io)](https://david-dm.org/byte-foundry/plumin.js#info=devDependencies)
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/byte-foundry/prototypo?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# What is this?

It's a tool to **create and manipulate fonts using javascript**.

We hope that the interactive, connected, hackable nature of the web
will bring more type-design enthusiasts to font-scripting,
while enabling new ways to design and use fonts.

If you're into analogies and technical details, it intends to be an alternative
to [RoboFab](http://robofab.org/): it's a ***font-oriented 2D API and scene-graph with OpenType export capabilities***.
It's built on top of [paper.js](http://paperjs.org)
and [opentype.js](https://github.com/nodebox/opentype.js).
It can run in the browser (in a [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) for optimal performances)
or in [node.js](http://nodejs.org/).

## Status

Plumin.js is a work in progress and should be considered in alpha state
(it still lacks UFO support and proper documentation).
It's a Free and Open-Source Software, MIT licensed and hosted on [Github](https://github.com/byte-foundry/plumin.js)
(a cozy place where free-range code thrives, and [bugs are hunted down](https://github.com/byte-foundry/plumin.js/issues)).

It's developped in parallel with [Prototypo](http://prototypo.io),
an online app that uses parametric typefaces to design fonts faster.
You can expect frequent updates and improvements in Plumin.js and upstream projects it uses.

# Docs

## Getting started

Try Plumin.js [in your browser](http://plnkr.co/edit/gist:6fcfaa9c968fd6392fb3?p=preview),
then [download it](https://github.com/byte-foundry/plumin.js/archive/master.zip)
or install it using [NPM](https://docs.npmjs.com/getting-started/what-is-npm).

## API Reference

**We need help getting Font and Glyph types merged into Paper.js and properly documented.**
[Get in touch](mailto:contact@prototypo.io) if you want to give a hand!

In the meantime, use the existing [Paper.js reference](http://paperjs.org/reference),
read [Plumin.js sources](https://github.com/byte-foundry/plumin.js/tree/master/src)
and the demos we've built
(using [requestAnimationFrame and WebWorker](http://byte-foundry.github.io/plumin.js/index.html),
using [Node.js](https://github.com/byte-foundry/plumin.js/blob/master/index.js)</a>,
using [interpolation](http://byte-foundry.github.io/plumin.js/interpolate.html)).

# License

MIT licensed, see LICENSE file.