// node tools/cover.js <set> <fromFrame> <toFrame> [step]  — bakes one set, composites it at camAt(f) over magenta and reports unpainted pixels + ms/frame
const load = require('./load.js'); const { createCanvas } = load; const [name, a, b, st] = process.argv.slice(2);
load(['core', 'story', 'cams', 'paint', 'set_' + name]); buildFX(); const t0 = performance.now(); SETS[name].bake(); console.log('bake ms', (performance.now() - t0) | 0);
const cv = createCanvas(W, H), ctx = cv.getContext('2d'); let worst = 0, tot = 0, n = 0;
for (let f = +a; f <= +b; f += +(st || 12)) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, W, H); const t1 = performance.now(); drawSet(ctx, SETS[name], camAt(f), f, {}, {}); tot += performance.now() - t1; n++;
  const d = ctx.getImageData(0, 0, W, H).data; let bad = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 235 && d[i + 1] < 40 && d[i + 2] > 235) bad++; if (bad) console.log('frame', f, 'unpainted samples', bad, JSON.stringify(camAt(f))); worst = Math.max(worst, bad); }
console.log(worst ? 'COVERAGE FAIL' : 'coverage ok', 'avg ms/frame', (tot / n).toFixed(1));
