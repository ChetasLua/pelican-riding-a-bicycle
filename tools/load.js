// node loader: evaluates the film source in this context with a Skia canvas shim
const fs = require('fs'), path = require('path'), vm = require('vm');
const { createCanvas, Path2D, ImageData } = require('@napi-rs/canvas');
globalThis.__mkCanvas = (w, h) => createCanvas(w, h); globalThis.Path2D = Path2D; globalThis.ImageData = ImageData;
globalThis.performance = globalThis.performance || require('perf_hooks').performance;
const ORDER = ['core', 'story', 'cams', 'paint', 'set_road', 'set_hill', 'set_sun', 'hero', 'bench', 'acting', 'shots', 'audio'];
module.exports = function load(only) { const root = path.join(__dirname, '..', 'src'); let n = [];
  for (const m of (only || ORDER)) { const p = path.join(root, m + '.js'); if (!fs.existsSync(p)) continue; vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p }); n.push(m); } return n; };
module.exports.ORDER = ORDER; module.exports.createCanvas = createCanvas;
