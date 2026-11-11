// PAUSE TEST contact sheet → contact_sheet.png ; also a strip of every Nth frame for the spotter/listener
const fs = require('fs'), load = require('./load.js'); const { createCanvas } = load; load(); bakeAll();
const mode = process.argv[2] || 'pause', cv = createCanvas(W, H), ctx = cv.getContext('2d');
function sheet(frames, tw, cols, out, labels) { const th = Math.round(tw * H / W), rows = Math.ceil(frames.length / cols), lab = labels ? 30 : 0, S = createCanvas(cols * tw, rows * (th + lab)), sx = S.getContext('2d'); sx.fillStyle = '#17151b'; sx.fillRect(0, 0, S.width, S.height); sx.imageSmoothingQuality = 'high';
  frames.forEach((f, i) => { drawFrame(ctx, f); const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + lab); sx.drawImage(cv, x, y + lab, tw, th); if (labels) { sx.fillStyle = '#efe6cf'; sx.font = (lab > 20 ? 18 : 11) + 'px Menlo'; sx.fillText(labels(f), x + 8, y + lab - 9); } });
  fs.writeFileSync(out, S.toBuffer(out.endsWith('.jpg') ? 'image/jpeg' : 'image/png')); console.log('wrote', out, S.width + 'x' + S.height); }
const NOTE = { 60: 'landscape, six depth layers', 250: 'hero WEARY, bicycle correct', 430: 'benchmark pelicans: other art style', 600: 'the broken parade', 760: 'ALONE, cooler light', 880: 'the plate, eye before', 960: 'FABLE 5.2 legible, eye changed', 1150: 'wheel mid-bloom', 1380: 'sunset parade' };
if (mode === 'pause') sheet([60, 250, 430, 600, 760, 880, 960, 1150, 1380], 960, 3, 'contact_sheet.png', f => 'frame ' + f + '  —  ' + NOTE[f]);
else { const a = +process.argv[3], b = +process.argv[4], st = +(process.argv[5] || 2), fr = []; for (let f = a; f < b; f += st) fr.push(f); sheet(fr, +(process.argv[7] || 320), +(process.argv[6] || 8), `out/strip_${a}_${b}.jpg`, f => 'f' + f); }
