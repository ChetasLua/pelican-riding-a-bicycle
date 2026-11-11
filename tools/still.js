// node tools/still.js set <name> "x,y,z,tilt[,f]" [...more cams] --out file.png [--w 960]
// node tools/still.js frames 60 250 430 ... --out file.png [--w 640] [--cols 4]
const fs = require('fs'), load = require('./load.js'); const { createCanvas } = load;
const a = process.argv.slice(2), mode = a.shift(); const opt = {}; const pos = []; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) opt[a[i].slice(2)] = a[++i]; else pos.push(a[i]); }
load(); buildFX(); const t0 = performance.now(); const cv = createCanvas(W, H), ctx = cv.getContext('2d'); const tiles = [];
if (mode === 'set') { const name = pos.shift(); SETS[name].bake(); console.log('bake ms', (performance.now() - t0) | 0);
  for (const p of pos) { const v = p.split(',').map(Number), cam = { x: v[0], y: v[1], z: v[2], tilt: v[3] || 0 }, f = v[4] || 0; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#f0e8d0'; ctx.fillRect(0, 0, W, H); drawSet(ctx, SETS[name], cam, f, {}, {}); finish(ctx, f); tiles.push([p, snap()]); } }
else { bakeAll(); console.log('bake ms', (performance.now() - t0) | 0); for (const p of pos) { const f = +p, t1 = performance.now(); drawFrame(ctx, f); tiles.push(['f' + f + '  ' + ((performance.now() - t1) | 0) + 'ms', snap()]); } }
function snap() { const w = +(opt.w || 960), h = Math.round(w * H / W), c = createCanvas(w, h), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, w, h); return c; }
const cols = +(opt.cols || (tiles.length > 3 ? 2 : 1)), tw = tiles[0][1].width, th = tiles[0][1].height, rows = Math.ceil(tiles.length / cols), sheet = createCanvas(cols * tw, rows * (th + 26)), sx = sheet.getContext('2d'); sx.fillStyle = '#1b1a20'; sx.fillRect(0, 0, sheet.width, sheet.height);
tiles.forEach(([lab, c], i) => { const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + 26); sx.drawImage(c, x, y + 26); sx.fillStyle = '#eee'; sx.font = '16px Menlo'; sx.fillText(lab, x + 8, y + 18); });
fs.writeFileSync(opt.out || 'out/still.png', sheet.toBuffer(opt.out && opt.out.endsWith('.jpg') ? 'image/jpeg' : 'image/png')); console.log('wrote', opt.out, 'total ms', (performance.now() - t0) | 0);
