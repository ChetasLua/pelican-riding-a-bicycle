// rig test on a blank paper background
const fs = require('fs'), load = require('./load.js'); const { createCanvas } = load; load(['core', 'story', 'cams', 'paint', 'hero', 'bench', 'acting']); buildFX();
const cv = createCanvas(1920, 1080), ctx = cv.getContext('2d'); ctx.fillStyle = '#e9e2c9'; ctx.fillRect(0, 0, 1920, 1080);
const E0 = { lidU: .55, lidL: .1, px: .1, py: .45, ps: .9, brow: -.6, gape: 0, smile: -.25, pouch: .75, neckC: .35, crest: -.3 };
const exprs = [E0, { lidU: .2, lidL: 0, px: -.2, py: .1, ps: 1.3, brow: .7, smile: 0, pouch: .5, crest: .5 }, { lidU: .3, lidL: .45, ps: 1.15, brow: .25, smile: .9, pouch: .4, crest: .15 }, { lidU: .8, lidL: .15, py: .6, brow: -.8, smile: -.4, pouch: .9, crest: -.6 }];
exprs.forEach((E, i) => { ctx.save(); ctx.translate(260 + i * 460, 520); const a = i * 1.1; const P = { hip: [-30, -172], bodyRot: -.06, head: i === 3 ? [78, -246] : [62, -372 + (i === 0 ? 14 : 0)], headRot: i === 3 ? .5 : i === 1 ? -.17 : .05, beakAng: i === 3 ? .9 : .26, feet: [pedalPos(a, true), pedalPos(a, false)], hand: BG.grip, expr: E, f2: i * 2, f: i * 5, wind: .3, bike: { crank: a, wheelRot: a * 1.5 } };
  ctx.fillStyle = 'rgba(60,50,110,.25)'; ctx.beginPath(); ctx.ellipse(-10, 4, 150, 12, 0, 0, 6.3); ctx.fill(); drawRider(ctx, P, HPAL); ctx.restore(); });
// close-up of head
ctx.save(); ctx.translate(360, 1000); ctx.scale(2.6, 2.6); drawBird(ctx, { hip: [-30, -40], head: [62, -150], headRot: -.1, beakAng: .2, expr: exprs[2], f2: 3, detail: 1 }, HPAL, 'body'); ctx.restore();
ctx.save(); ctx.translate(1300, 1010); ctx.scale(2.2, 2.2); drawBikeAll(ctx, { crank: .6, wheelRot: 1, glint: .4 }, HPAL); ctx.restore();
fs.writeFileSync('out/rig.jpg', cv.toBuffer('image/jpeg')); console.log('ok');
