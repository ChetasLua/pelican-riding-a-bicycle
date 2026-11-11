// node build.js  → film.html (one self-contained file: picture + sound + player)
const fs = require('fs'), path = require('path'); const ORDER = require('./tools/load.js').ORDER.concat(['player']);
let js = ''; for (const m of ORDER) { const p = path.join(__dirname, 'src', m + '.js'); if (fs.existsSync(p)) js += '\n// ════ ' + m + '.js ════\n' + fs.readFileSync(p, 'utf8').replace(/^'use strict';\n/, ''); }
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>a pelican riding a bicycle</title>
<style>html,body{margin:0;height:100%;background:#17151b;overflow:hidden}#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}canvas#film{width:min(100vw,177.78vh);height:min(56.25vw,100vh);background:#efe6cf;display:block;cursor:pointer}
#ui{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}#play{pointer-events:auto;cursor:pointer;display:block}#bar{position:fixed;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.08)}#bar i{display:block;height:100%;width:0;background:#e9c98a}</style></head>
<body><div id="stage"><canvas id="film" width="1920" height="1080"></canvas></div><div id="ui"><canvas id="play" width="360" height="360" style="width:180px;height:180px"></canvas></div><div id="bar"><i></i></div>
<script>'use strict';${js}\n</script></body></html>`;
fs.writeFileSync(path.join(__dirname, 'film.html'), html); console.log('film.html', (html.length / 1024 | 0) + ' KB');
