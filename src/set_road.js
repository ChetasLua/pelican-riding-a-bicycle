// ───────────────────────── SET 1: BENCHMARK ROAD (shots 1–3) — high golden afternoon, sun upper right ─────────────────────────
const ROAD = { horizon: -96, towerX: 600, townX: 1500, shelterX: 2230, wallX: [4230, 4640], catX: 4420,
  greens: ['#1c4a34', '#2c6a3c', '#4d8f40', '#7fb347', '#b9d257', '#e6e27a'], far: ['#7ea9a4', '#93bcae', '#aecfb6', '#cbe0bd', '#e3ecc6'],
  sea: ['#8fd0c8', '#5cb7b6', '#2f9ca6', '#1f8597', '#1a6f8a'], cloud: { deep: '#7f8fc6', shadow: '#a9b4de', mid: '#dcd9e6', light: '#fbf0d6', hi: '#fffaf0' } };
ROAD.posts = ['1', '1.3', '2', '2.1', '3', '3.5', '3.7', '4', '4.1', '4.5', '4.6', '4.7', '5', '5.1'].map((n, i) => ({ n, x: 330 + i * 490 + (hash(i * 7 + 3) - .5) * 60, age: 1 - i / 13 }));
SETS.road = { name: 'road', ground: roadY, layers: [], bake(step = () => {}) { const S = this, R = ROAD, G = R.greens; S.layers = [];
  // ── 0 sky
  { const L = newLayer('sky', 0, -1350, -1660, 1350, 780, .5), c = L.ctx; const ramp = ['#2468b4', '#2f7cc6', '#4a98d6', '#77b9e0', '#aad8e6', '#d3ead9', '#ece8c8', '#f3e7c2'];
    wash(c, -1350, -1660, 2700, 2440, (u, v) => cjit(cramp(ramp, Math.pow(clamp(v * 2400 / 1700), 1.25)), () => .5, 0), { seed: 11, cell: 40, blots: 420, blotSize: 190, strokes: 1700, len: 160, wid: 18, jit: 6 });
    begin(c); const r = RNG(12); for (let i = 0; i < 420; i++) { const x = -1350 + r() * 2700, y = -1560 + r() * 1200; softDab(c, x, y, 140 + r() * 260, 7 + r() * 12, -.1 + (r() - .5) * .08, cjit(r() < .6 ? '#cfe6f0' : '#f1f1e4', r, 6), .1 + .16 * r()); }
    for (let i = 0; i < 60; i++) { const x = 300 + r() * 1000, y = -300 + r() * 260; softDab(c, x, y, 260 + r() * 200, 60 + r() * 50, 0, '#fff1c4', .12); } end(c); S.layers.push(L); } step();
  // ── 1 clouds (two bakes, cross-faded: the cumulus slowly boils)
  { const mkC = v => { const L = newLayer('clouds', .05, -1400, -1500, 1700, 60, .75), c = L.ctx, P = R.cloud; const far = { deep: '#a7b6d6', shadow: '#c2cde6', mid: '#e4e4ea', light: '#f6efdc', hi: '#fbf5e6' };
      const r = RNG(21); for (let i = 0; i < 16; i++) cumulus(c, -1350 + i * 200 + r() * 90, -78 - r() * 12, 190 + r() * 200, 70 + r() * 90, far, 300 + i, v, { density: .8 });
      cumulus(c, -820, -70, 780, 640, P, 31, v); cumulus(c, 1260, -66, 620, 470, P, 33, v); cumulus(c, -230, -72, 420, 300, far, 35, v);
      cumulus(c, 330, -60, 980, 1120, P, 37, v, { density: 1.15 }); cumulus(c, 760, -64, 460, 380, P, 39, v);
      begin(c); for (let i = 0; i < 70; i++) { const x = -1400 + r() * 3100; softDab(c, x, -62 + r() * 40, 150 + r() * 160, 20 + r() * 16, 0, '#e9eede', .35); } end(c); return L; };
    const A = mkC(0), B = mkC(1); A.alt = B.cv; A.boil = .07; S.layers.push(A); } step();
  // ── 2 far: sea, headland, Launch Tower
  { const L = newLayer('far', .1, -1400, -420, 2000, 300, .75), c = L.ctx, hz = R.horizon;
    paintMass(c, { x0: -1400, x1: 2000, top: () => hz, bot: 300, ramp: R.sea, baseT: .5, seed: 41, n: 9000, len: 34, wid: 5, dir: 0, wobble: .12, sc: 240, nz: .35, light: (x, y) => (y - hz) / 400 * .9 - .42 + .25 * Math.exp(-Math.pow((x - 1000) / 420, 2)) * Math.exp(-(y - hz) / 140), size: (x, y) => .35 + (y - hz) / 160, edge: 0, blots: 200, blotSize: 110, jit: 6 });
    begin(c); const r = RNG(42); for (let i = 0; i < 500; i++) { const y = hz + 2 + Math.pow(r(), 2) * 120, x = 1000 + (r() - .5) * (500 + (y - hz) * 5); dab(c, x, y, 8 + (y - hz) * .22, 1.2 + (y - hz) * .014, 0, '#fff4cf', .5 * r() + .15); }
    for (let i = 0; i < 300; i++) softDab(c, -1400 + r() * 3400, hz + 3 + r() * 8, 60 + r() * 80, 5, 0, '#d6efe6', .3); end(c);
    // islet far left + distant shore
    const isl = x => hz - 3 - 34 * Math.exp(-Math.pow((x + 760) / 150, 2)) - 12 * Math.exp(-Math.pow((x + 560) / 70, 2)) + 2 * vnoise(x / 22, 3);
    paintMass(c, { x0: -1100, x1: -380, top: isl, bot: hz + 1, ramp: ['#9db9cc', '#a9c6cc', '#bdd4cf'], seed: 43, n: 500, len: 12, wid: 4, edge: 0 });
    const head = x => hz + 4 - 150 * smooth((x - 120) / 420) * (1 - .25 * smooth((x - 900) / 500)) - 70 * smooth((x - 1150) / 500) + 9 * fbm(x / 90, 5) - 28 * Math.exp(-Math.pow((x - 600) / 90, 2));
    L.headY = head; const hr = ['#6f9c9a', '#86b3a2', '#a3c9a6', '#c6dcae', '#e6e7b8'];
    paintMass(c, { x0: 100, x1: 2000, top: head, bot: hz + 8, ramp: hr, seed: 44, n: 5200, len: 15, wid: 5, sc: 130, dir: (x, y) => -.25, light: (x, y) => .2 * (1 - (y - head(x)) / 90), jit: 6, edgeStep: 5 });
    // cream cliff faces dropping to the water
    begin(c); for (let i = 0; i < 900; i++) { const x = 130 + r() * 1870, t = head(x), y = hz + 6 - r() * Math.min(46, (hz - t) * .5); if (y < t + 6) continue; dab(c, x, y, 5 + r() * 12, 3 + r() * 3, PI / 2 + (r() - .5) * .3, cjit(r() < .2 ? '#cbbfd0' : '#ecdfc4', r, 5), .6); }
    for (let i = 0; i < 260; i++) softDab(c, 130 + r() * 1870, hz + 7 + r() * 3, 14 + r() * 26, 2.5, 0, '#f4f6ea', .7); end(c);
    for (let i = 0; i < 18; i++) { const x = 360 + r() * 1500, y = head(x) + 4 + r() * 18; clump(c, x, y - 8, 12 + r() * 16, 8 + r() * 8, ['#4f7f78', '#5f927e', '#7fae86', '#a9c98f'], 440 + i, 60); }
    // the Launch Tower
    const tx = R.towerX, tb = head(tx) + 4, th = 136; R.towerTip = [tx, tb - th - 22]; begin(c);
    c.fillStyle = '#e9dfd0'; c.beginPath(); c.moveTo(tx - 12, tb); c.lineTo(tx - 7, tb - th); c.lineTo(tx + 7, tb - th); c.lineTo(tx + 12, tb); c.fill();
    for (let i = 0; i < 260; i++) { const v = r(), u = r(), w = lerp(12, 7, v), x = tx + (u * 2 - 1) * w, y = tb - v * th; dab(c, x, y, 5 + r() * 6, 2.6, PI / 2 + (r() - .5) * .2, cjit(cramp(['#a9a6cf', '#cfc8de', '#f4ead6', '#fff8e6'], u * .9 + .1 * r()), r, 5), .85); }
    for (const v of [.3, .62]) { c.globalAlpha = .85; c.fillStyle = '#c9553e'; c.fillRect(tx - lerp(12, 7, v) - .5, tb - v * th - 5, lerp(12, 7, v) * 2 + 1, 9); }
    c.globalAlpha = 1; c.fillStyle = '#4a4668'; c.fillRect(tx - 11, tb - th - 3, 22, 3.5); c.fillStyle = '#f3e6bf'; c.fillRect(tx - 6, tb - th - 15, 12, 12); c.fillStyle = '#7fb4c4'; c.fillRect(tx - 4, tb - th - 13, 3, 9); c.fillRect(tx + 1, tb - th - 13, 3, 9);
    c.fillStyle = '#c9553e'; c.beginPath(); c.moveTo(tx - 9, tb - th - 15); c.lineTo(tx, tb - th - 26); c.lineTo(tx + 9, tb - th - 15); c.fill(); ribbon(c, [[tx, tb - th - 26], [tx, tb - th - 33]], 1.4, 1, '#4a4668');
    c.fillStyle = '#5b5a80'; for (const v of [.18, .47, .8]) c.fillRect(tx - 1.5, tb - v * th - 4, 3, 5);
    c.fillStyle = '#efe4cc'; c.fillRect(tx - 34, tb - 14, 20, 12); c.fillStyle = '#c9553e'; c.beginPath(); c.moveTo(tx - 37, tb - 14); c.lineTo(tx - 24, tb - 22); c.lineTo(tx - 11, tb - 14); c.fill(); end(c);
    // sails
    begin(c); for (const [x, y, s] of [[-420, hz + 26, 1], [60, hz + 12, .6], [-900, hz + 44, 1.4], [1380, hz + 60, 1.7]]) { c.globalAlpha = .95; c.fillStyle = '#fbf3df'; c.beginPath(); c.moveTo(x, y - 20 * s); c.lineTo(x + 9 * s, y - 2 * s); c.lineTo(x - 1 * s, y - 2 * s); c.fill(); c.fillStyle = '#d9cfe0'; c.beginPath(); c.moveTo(x - 2 * s, y - 16 * s); c.lineTo(x - 2 * s, y - 2 * s); c.lineTo(x - 8 * s, y - 2 * s); c.fill(); c.fillStyle = '#7a5a48'; c.fillRect(x - 9 * s, y - 2 * s, 20 * s, 3 * s); softDab(c, x, y + 4 * s, 16 * s, 2.5 * s, 0, '#e9f6ee', .6); } end(c);
    L.live = (ctx, f, env) => { liveGlints(ctx, f, { n: 320, x0: 250, x1: 1750, y0: hz + 3, y1: hz + 210, seed: 1, alpha: .75, w: (x, y) => Math.exp(-Math.pow((x - 1000) / (260 + (y - hz) * 2.2), 2)) + .12 }); liveGlints(ctx, f, { n: 160, x0: -1400, x1: 2000, y0: hz + 4, y1: hz + 300, seed: 7, alpha: .35 });
      liveGulls(ctx, f, { n: 7, x: 300, y: hz - 150, w: 900, h: 160, s: .9 }); drawLaunches(ctx, f, R.towerTip[0], R.towerTip[1], 1.15, env.launch || {}); };
    S.layers.push(L); } step();
  // ── 3 far hills (pale, blue-green: atmospheric perspective)
  { const L = newLayer('hills', .22, -1300, -360, 2700, 420, .75, { ground: { y: 0, h: 260, shadow: .7, wind: 0, seed: 3 } }), c = L.ctx;
    const t1 = x => 70 - 250 * Math.pow(clamp(.5 + .9 * fbm(x / 1100 + 3.3, 2, 3)), 1.5) + 7 * fbm(x / 60, 8);
    paintMass(c, { x0: -1300, x1: 2700, top: t1, bot: 420, ramp: R.far, seed: 51, n: 16000, len: 18, wid: 6, sc: 200, dir: (x, y) => .12 * Math.sin(x / 300), light: (x, y) => .28 * clamp(1 - (y - t1(x)) / 150) - .12, jit: 6 });
    const r = RNG(52); begin(c); for (let i = 0; i < 60; i++) { const x = -1300 + r() * 4000, y = t1(x) + 30 + r() * 150, w = 50 + r() * 90; c.save(); c.translate(x, y); c.transform(1, 0, -.5, .35, 0, 0); c.globalAlpha = .5; c.fillStyle = css(cjit(r.pick(['#d9e3b0', '#b9d3a4', '#e6dfae', '#a4c8ae']), r, 6)); c.fillRect(-w / 2, -w / 3, w, w * .66); c.restore(); } end(c);
    for (let i = 0; i < 150; i++) { const x = -1300 + r() * 4000, y = t1(x) + 2 + r() * r() * 150, s = .5 + (y - t1(x)) / 180; clump(c, x, y - 9 * s, (10 + r() * 14) * s, (8 + r() * 8) * s, ['#5e8f8a', '#74a591', '#93bd9a', '#b7d3a4'], 520 + i, 46); }
    S.layers.push(L); } step();
  // ── 4 the town stepping down to its harbour
  { const L = newLayer('town', .35, -1200, -330, 3400, 430, .8, { ground: { y: 40, h: 300, shadow: .8, wind: 0, seed: 5 } }), c = L.ctx, tx = R.townX; const r = RNG(61);
    const th = x => 120 - 260 * Math.exp(-Math.pow((x - tx - 60) / 420, 2)) - 90 * Math.exp(-Math.pow((x - 300) / 500, 2)) - 120 * Math.exp(-Math.pow((x - 2900) / 600, 2)) + 10 * fbm(x / 80, 6);
    L.townY = th; const ramp = ['#3f7a5c', '#5a9665', '#7db36c', '#a9cc76', '#d5dd8a'];
    paintMass(c, { x0: -1200, x1: 3400, top: th, bot: 430, ramp, seed: 62, n: 15000, len: 17, wid: 6, sc: 170, dir: (x, y) => .15 * Math.sin(x / 200), light: (x, y) => .25 * clamp(1 - (y - th(x)) / 130) - .1, jit: 7 });
    for (let i = 0; i < 90; i++) { const x = -1200 + r() * 4600; if (Math.abs(x - tx) < 470) continue; const y = th(x) + 4 + r() * r() * 140, s = .6 + (y - th(x)) / 200; if (r() < .25) clump(c, x, y - 26 * s, 7 * s, 26 * s, ['#234f44', '#2f6649', '#3f7d4f', '#5b9a58'], 610 + i, 70, { dab: 3.4 }); else clump(c, x, y - 12 * s, (14 + r() * 16) * s, (11 + r() * 9) * s, ['#2f6a4c', '#458656', '#6aa65e', '#9cc66e'], 610 + i, 60); }
    // harbour water notch + quay on the seaward (left) side of the town
    begin(c); const qx0 = tx - 560, qx1 = tx - 250, qy = 96; c.fillStyle = '#3e9aa6'; c.fillRect(qx0 - 60, qy, 380, 60); for (let i = 0; i < 500; i++) dab(c, qx0 - 60 + r() * 380, qy + 3 + r() * 55, 10 + r() * 14, 2.4, 0, cjit(r() < .25 ? '#d9f0e6' : cramp(['#2f8a9b', '#4fa9ae', '#7cc4bd'], r()), r, 6), .8);
    c.globalAlpha = 1; c.fillStyle = '#e4d6b6'; c.fillRect(qx0 + 40, qy - 7, 300, 9); c.fillRect(qx0 - 20, qy - 3, 64, 5); for (let i = 0; i < 220; i++) dab(c, qx0 - 20 + r() * 360, qy - 4 + r() * 6, 7, 2.5, 0, cjit(r() < .4 ? '#b8a8c0' : '#efe2c4', r, 7), .8);
    for (let i = 0; i < 7; i++) { const x = qx0 + 10 + i * 42 + r() * 14, y = qy + 12 + r() * 26, s = .8 + r() * .5; c.globalAlpha = 1; c.fillStyle = css(r.pick(['#c9553e', '#f1e6cc', '#2f6f8f', '#e3a53c', '#f4efe2'])); c.beginPath(); c.moveTo(x - 12 * s, y - 3 * s); c.lineTo(x + 13 * s, y - 3 * s); c.lineTo(x + 9 * s, y + 3 * s); c.lineTo(x - 9 * s, y + 3 * s); c.fill(); ribbon(c, [[x, y - 3 * s], [x + 1, y - 20 * s]], 1.3, .8, '#6a5446'); softDab(c, x, y + 5 * s, 16 * s, 2.4 * s, 0, '#e3f4ec', .6); } end(c);
    // houses, back to front
    const hs = []; for (let i = 0; i < 74; i++) { const u = r(), x = tx - 300 + (u - .35) * 720 + (r() - .5) * 60, lvl = r(), y = lerp(th(x) + 16, 96 - 8, Math.pow(lvl, .85)); if (y < th(x) + 10 || x < tx - 250 && y > 60) continue; hs.push({ x, y, w: 26 + r() * 30, h: 20 + r() * 24, k: r(), q: r(), s: .78 + (y - th(x)) / 520 }); }
    hs.push({ x: tx + 30, y: th(tx + 30) + 26, w: 20, h: 82, k: .02, q: .5, s: 1, tower: 1 }); hs.sort((a, b) => a.y - b.y);
    R.windows = []; begin(c); for (const h of hs) { const w = h.w * h.s, hh = h.h * h.s, x = h.x, y = h.y, wall = cjit(r.pick(['#f3e7c8', '#efdcb8', '#f6efd9', '#ecd3ae', '#f0e0d0']), r, 6), roofC = h.k < .68 ? r.pick(['#c2523a', '#b8482f', '#cf6a44', '#a8462f']) : r.pick(['#d9a13e', '#c98f38', '#e0b455']);
        c.globalAlpha = 1; c.fillStyle = css(wall); c.fillRect(x - w / 2, y - hh, w, hh); c.fillStyle = css(cmix(wall, '#9a8fc0', .5)); c.fillRect(x - w / 2, y - hh, w * .34, hh);
        for (let i = 0; i < 26; i++) { const u = r(), v = r(); dab(c, x - w / 2 + u * w, y - hh + v * hh, 5, 2.4, PI / 2, cjit(u < .34 ? cmix(wall, '#9a8fc0', .5) : cmix(wall, '#fff6dc', v < .3 ? .0 : .3), r, 7), .7); }
        const rh = (h.tower ? 16 : 8 + h.q * 9) * h.s, ov = 3 * h.s; c.globalAlpha = 1; c.fillStyle = css(roofC); c.beginPath(); if (h.tower || h.q < .5) { c.moveTo(x - w / 2 - ov, y - hh); c.lineTo(x, y - hh - rh * 1.4); c.lineTo(x + w / 2 + ov, y - hh); } else { c.moveTo(x - w / 2 - ov, y - hh); c.lineTo(x - w / 2 + rh * .7, y - hh - rh); c.lineTo(x + w / 2 - rh * .2, y - hh - rh); c.lineTo(x + w / 2 + ov, y - hh); } c.fill();
        for (let i = 0; i < 18; i++) { const u = r(), v = r() * .9; const xx = x - w / 2 + u * w, yy = y - hh - v * rh * (1 - Math.abs(u - .5) * (h.q < .5 ? 2 : .6)); dab(c, xx, yy, 4.5, 2, .1, cjit(cmix(roofC, u > .5 ? '#f6c98a' : '#6a3550', .3 * r()), r, 9), .85); }
        softDab(c, x, y + 1, w * .7, 3, 0, '#4a3d6a', .35);
        const nw = h.tower ? 1 : Math.max(1, Math.round(w / 15)); for (let i = 0; i < nw; i++) { const wx = x - w / 2 + (i + .5) * w / nw, wy = y - hh * (h.tower ? .78 : .58); c.globalAlpha = .9; c.fillStyle = '#56597e'; c.fillRect(wx - 2.2 * h.s, wy - 3.4 * h.s, 4.4 * h.s, 6.8 * h.s); R.windows.push([wx, wy, h.s]); if (r() < .35) { c.fillStyle = css(r.pick(['#5f9a7a', '#c9553e', '#3f7fa0'])); c.fillRect(wx - 4.6 * h.s, wy - 3.4 * h.s, 2 * h.s, 6.8 * h.s); c.fillRect(wx + 2.6 * h.s, wy - 3.4 * h.s, 2 * h.s, 6.8 * h.s); } } }
    // laundry lines + street trees
    for (let i = 0; i < 9; i++) { const a = r.pick(hs), x0 = a.x + 6, y0 = a.y - a.h * a.s * .8, x1 = x0 + 34 + r() * 30, y1 = y0 + (r() - .5) * 10; const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * PI) * 5]); } ribbon(c, pts, .8, .8, '#6d6480', 3, 0, .8);
      for (let k = 1; k < 8; k++) if (r() < .75) { c.globalAlpha = .95; c.fillStyle = css(r.pick(['#fbf6ea', '#e9624a', '#7fb7d6', '#f2c14e', '#f4efe0', '#e58fb0'])); c.fillRect(pts[k][0] - 2.4, pts[k][1], 4.8, 5 + r() * 4); } }
    end(c); for (let i = 0; i < 46; i++) { const a = r.pick(hs), x = a.x + (r() - .5) * 70, y = a.y + 2 + r() * 8; clump(c, x, y - 9, 8 + r() * 8, 8 + r() * 6, ['#245a44', '#37774c', '#5b9a55', '#93bf62'], 640 + i, 44, { dab: 3 }); }
    // the tram street
    R.tram = { x0: tx - 190, x1: tx + 330, y: 58 }; begin(c); const tp = []; for (let i = 0; i <= 20; i++) tp.push([lerp(R.tram.x0, R.tram.x1, i / 20), R.tram.y + 2]); ribbon(c, tp, 5, 5, '#e9dcbc', 2, .6, .95); ribbon(c, tp.map(p => [p[0], p[1] - 17]), .7, .7, '#54506e', 3, 0, .7); end(c);
    L.live = (ctx, f) => { const u = .5 - .5 * Math.cos(f * .0042 + .9), x = lerp(R.tram.x0 + 20, R.tram.x1 - 20, u), y = R.tram.y; ctx.fillStyle = '#f2e3bd'; ctx.fillRect(x - 13, y - 12, 26, 12); ctx.fillStyle = '#c4523a'; ctx.fillRect(x - 13, y - 6, 26, 6); ctx.fillStyle = '#5b6c8e'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 11 + i * 6, y - 10.5, 4, 3.6); ctx.fillStyle = '#e9d9b0'; ctx.fillRect(x - 14, y - 13.5, 28, 2); ctx.fillStyle = '#54506e'; ctx.fillRect(x - .5, y - 17, 1, 4); };
    S.layers.push(L); } step();
  // ── 5 mid hills with trees
  { const L = newLayer('mid', .6, -1200, -340, 5000, 430, .8, { ground: { y: 60, h: 320, shadow: 1, wind: .7, wy: 120, wh: 110, seed: 7 } }), c = L.ctx; const r = RNG(71);
    const mt = x => 150 - 250 * Math.pow(clamp(.5 + .8 * fbm(x / 900 + 7.7, 4, 3)), 1.4) * (1 - .92 * Math.exp(-Math.pow((x - 2560) / 430, 2))) * (1 - .7 * Math.exp(-Math.pow((x - 1560) / 330, 2))) + 6 * fbm(x / 50, 9);
    L.midY = mt; paintMass(c, { x0: -1200, x1: 5000, top: mt, bot: 430, ramp: G, baseT: .42, seed: 72, n: 26000, len: 19, wid: 6.5, sc: 190, dir: (x, y) => -1.2 + .2 * Math.sin(x / 130), light: (x, y) => .3 * clamp(1 - (y - mt(x)) / 120) - .1 - .12 * clamp((y - 150) / 250), jit: 8, wobble: .8 });
    blades(c, { seed: 73, n: 9000, x0: -1200, x1: 5000, y: mt, depth: 280, h: 15, wid: 1.8, ramp: G, baseT: .55, sc: 150, size: (x, y, d) => .6 + d * .9 });
    flowers(c, { seed: 74, n: 2600, x0: -1200, x1: 5000, y: x => mt(x) + 20, depth: 260, cols: ['#fbf4de', '#f4d868', '#fbf4de', '#e98f9f'], s: 2.2, clusterSc: 240, thresh: .08, size: (x, y, d) => .6 + d });
    for (let i = 0; i < 120; i++) { const x = -1200 + r() * 6200, t = mt(x); if (t > 105) continue; const y = t + 4 + r() * r() * 120, s = .65 + (y - t) / 160;
      if (r() < .2) { ribbon(c, [[x, y], [x, y - 20 * s]], 3 * s, 2 * s, '#3a2f3f'); clump(c, x, y - 44 * s, 9 * s, 34 * s, ['#16402f', '#215a3a', '#2f7444', '#4e9550'], 710 + i, 110, { dab: 3.6 * s }); }
      else { const R0 = (22 + r() * 22) * s; ribbon(c, [[x, y], [x - 2, y - R0 * .9]], 5 * s, 3 * s, '#4a3540'); softDab(c, x - R0 * .5, y + 2, R0 * 1.3, R0 * .22, 0, '#243a55', .4); const m = 3 + (r() * 3 | 0); for (let k = 0; k < m; k++) clump(c, x + (r() - .5) * R0 * 1.3, y - R0 * (.9 + r() * .8), R0 * (.6 + r() * .4), R0 * (.5 + r() * .3), G.slice(0, 5), 7100 + i * 9 + k, 90, { dab: 4 * s }); } }
    for (const [x, s] of [[900, 1], [3700, 1.1], [4500, .9]]) { const y = mt(x) + 22; begin(c); c.fillStyle = '#f4ead0'; c.fillRect(x - 17 * s, y - 20 * s, 34 * s, 20 * s); c.fillStyle = '#b9a9c9'; c.fillRect(x - 17 * s, y - 20 * s, 11 * s, 20 * s); c.fillStyle = '#c4523a'; c.beginPath(); c.moveTo(x - 21 * s, y - 20 * s); c.lineTo(x - 6 * s, y - 33 * s); c.lineTo(x + 12 * s, y - 33 * s); c.lineTo(x + 21 * s, y - 20 * s); c.fill(); c.fillStyle = '#4f5578'; c.fillRect(x + 2 * s, y - 14 * s, 5 * s, 7 * s); for (let i = 0; i < 30; i++) dab(c, x - 20 * s + r() * 40 * s, y - 33 * s + r() * 33 * s, 5, 2, r() * PI, cjit(r() < .5 ? '#c96a48' : '#f6efd8', r, 8), .5); end(c); clump(c, x + 30 * s, y - 14 * s, 18 * s, 15 * s, G.slice(0, 5), 760 + x, 80); }
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * .6 * zl)) / zl, xb = xa + W / zl; liveGrass(ctx, f, { xa, xb, spacing: 9, y: x => mt(x) + 6, depth: 200, rows: 5, h: 15, wid: 1.9, ramp: G, baseT: .62, px: .6, seed: 4, size: d => .6 + d, tipLight: .5, gap: .25 }); };
    S.layers.push(L); } step();
  // ── 6 the road plane: cliff verge, fence, mileposts, shelter, wall, the worn cream road, near verge
  { const L = newLayer('main', 1, -420, -430, 6900, 700, 1, { ground: { y: 170, h: 420, shadow: 1, wind: 1, wy: 260, wh: 150, seed: 9 } }), c = L.ctx; const r = RNG(81), gy = roadY, X0 = -420, X1 = 6900;
    const vt = x => gy(x) - 64 - 14 * Math.abs(fbm(x / 70, 12, 3)) - 5 * vnoise(x / 13, 4);
    paintMass(c, { x0: X0, x1: X1, top: vt, bot: x => gy(x) - 20, ramp: G, baseT: .36, seed: 82, n: 9000, len: 15, wid: 5, sc: 120, dir: -1.35, wobble: .7, light: (x, y) => .25 * clamp(1 - (y - vt(x)) / 30), jit: 9 });
    blades(c, { seed: 83, n: 9000, x0: X0, x1: X1, y: x => vt(x) + 6, depth: 34, h: 24, wid: 2.1, ramp: G, baseT: .5, sc: 110 });
    // road surface
    const rt = x => gy(x) - 26 + 2 * vnoise(x / 40, 6), rb = x => gy(x) + 56 + 3 * vnoise(x / 55, 8), cream = ['#c9b08f', '#e6d2a2', '#f4e4b6', '#faeec8', '#fff6da'];
    paintMass(c, { x0: X0, x1: X1, top: rt, bot: rb, ramp: cream, baseT: .58, seed: 84, n: 15000, len: 30, wid: 5, sc: 220, nz: .3, dir: (x) => slopeOf(gy, x), wobble: .1, light: (x, y) => { const v = (y - rt(x)) / 82; return .14 * Math.exp(-Math.pow((v - .5) / .22, 2)) - .1 * (v > .86 ? 1 : 0); }, jit: 6, edge: 0, blots: 500, blotSize: 80 });
    begin(c); for (let i = 0; i < 2600; i++) { const x = X0 + r() * (X1 - X0), y = gy(x) + 12 + (r() - .5) * 40, l = 60 + r() * 160, a = slopeOf(gy, x); dab(c, x, y, l, 1.2 + r() * 2.2, a, r() < .7 ? cjit('#fbf5dc', r, 5) : cjit('#cdb994', r, 6), .22 + .25 * r()); }
    for (let i = 0; i < 2600; i++) { const x = X0 + r() * (X1 - X0), y = lerp(rt(x) + 3, rb(x) - 3, r()); c.globalAlpha = .55; c.fillStyle = css(cjit(r() < .5 ? '#a8957f' : '#fff9e6', r, 10)); c.beginPath(); c.ellipse(x, y, 1 + r() * 2.2, .8 + r() * 1.2, 0, 0, TAU); c.fill(); } end(c);
    blades(c, { seed: 85, n: 5200, x0: X0, x1: X1, y: x => rt(x) + 3, depth: 4, h: 10, wid: 1.7, ramp: G, baseT: .5 });
    // fence (low, white, a little tired) with violet cast shadows on the road
    const fb = x => gy(x) - 27, wallA = R.wallX[0], wallB = R.wallX[1], sh0 = R.shelterX - 95, sh1 = R.shelterX + 95; const postsX = [];
    for (let x = X0 + 20; x < X1; x += 86 + (hash(x | 0) - .5) * 10) { if (x > wallA - 30 && x < wallB + 30) continue; if (x > sh0 - 6 && x < sh1 + 6) continue; postsX.push(x); }
    begin(c); for (const x of postsX) softDab(c, x - 26, gy(x) - 16, 34, 6, .18, '#6f66a4', .5);
    for (let i = 0; i < postsX.length - 1; i++) { const a = postsX[i], b = postsX[i + 1]; if (b - a > 130) continue; const miss = hash(i * 13 + 5) < .06; for (const [h, wv] of [[34, 5], [17, 4.4]]) { if (miss && h === 17) continue; const pts = []; for (let k = 0; k <= 6; k++) { const x = lerp(a, b, k / 6); pts.push([x, fb(x) - h + Math.sin(k) * .8 + (hash(i * 3 + h) - .5) * 5 * (k / 6)]); } ribbon(c, pts.map(p => [p[0], p[1] + 2.2]), wv, wv, '#a59bc8', i + h, .6); ribbon(c, pts, wv, wv, '#f6efdc', i * 7 + h, .9); } }
    for (const x of postsX) { const lean = (hash(x * 3 | 0) - .5) * .12, h = 46 + hash(x * 5 | 0) * 6, y = fb(x) + 4; const p = [[x, y], [x + lean * h * .5, y - h * .5], [x + lean * h, y - h]]; ribbon(c, p.map(q => [q[0] - 2.4, q[1]]), 8, 7, '#a59bc8', x, .7); ribbon(c, p, 7.5, 6.5, '#f8f1de', x + 1, .9); ribbon(c, p.map(q => [q[0] + 2.2, q[1]]), 1.8, 1.4, '#fffaf0', x + 2, .4, .9); }
    for (let i = 0; i < 900; i++) { const x = r.pick(postsX) + (r() - .5) * 8, y = fb(x) - r() * 46; dab(c, x, y, 4, 1.4, PI / 2, cjit(r() < .5 ? '#d9cfc0' : '#bdb2d2', r, 8), .5); } end(c);
    // stone wall where the cat sleeps
    { begin(c); const wy = x => gy(x) - 24, wh = 74; softDab(c, (wallA + wallB) / 2 - 40, gy(wallA + 200) - 12, (wallB - wallA) * .56, 12, 0, '#6a61a0', .5);
      c.fillStyle = '#e6d8b8'; c.beginPath(); c.moveTo(wallA, wy(wallA) + 6); for (let x = wallA; x <= wallB; x += 20) c.lineTo(x, wy(x) - wh + 3 * vnoise(x / 30, 2)); c.lineTo(wallB, wy(wallB) + 6); c.fill();
      for (let i = 0; i < 520; i++) { const x = wallA + 6 + r() * (wallB - wallA - 12), v = r(), y = wy(x) + 2 - v * (wh - 6), w = 14 + r() * 20; c.globalAlpha = .9; c.fillStyle = css(cjit(cramp(['#b7a6c0', '#d9c6a4', '#efe0bd', '#f8eecf'], .25 + .6 * v + (r() - .5) * .4), r, 9)); c.beginPath(); c.ellipse(x, y, w * .5, 5 + r() * 4, (r() - .5) * .2, 0, TAU); c.fill(); }
      for (let i = 0; i < 40; i++) { const x = wallA + r() * (wallB - wallA); clump(c, x, wy(x) - wh + 2 + r() * 10, 10 + r() * 12, 5 + r() * 5, ['#3f6f4a', '#5f9552', '#8fb85a'], 880 + i, 26, { dab: 3 }); }
      const cap = []; for (let x = wallA - 6; x <= wallB + 6; x += 16) cap.push([x, wy(x) - wh - 1 + 2 * vnoise(x / 30, 2)]); ribbon(c, cap, 9, 9, '#f6ecd2', 3, 1); ribbon(c, cap.map(p => [p[0], p[1] + 5]), 3, 3, '#a898bc', 4, .6, .8); R.wallTop = x => wy(x) - wh - 6; end(c); }
    // bus shelter with the faded poster: a child's crayon drawing of a pelican on a bike
    { const x = R.shelterX, y = gy(x) - 24; begin(c); softDab(c, x - 50, y + 10, 120, 12, .1, '#6a61a0', .5);
      c.fillStyle = '#8d6f58'; c.fillRect(x - 84, y - 150, 168, 150); for (let i = 0; i < 420; i++) { const u = r(), v = r(); dab(c, x - 84 + u * 168, y - 150 + v * 150, 22, 3, PI / 2, cjit(cramp(['#6a5148', '#8d6f58', '#a98a68', '#c4a57a'], .3 + .5 * u + (r() - .5) * .3), r, 8), .7); }
      c.globalAlpha = 1; c.fillStyle = '#efe6cf'; c.fillRect(x - 46, y - 132, 92, 96); for (let i = 0; i < 160; i++) softDab(c, x - 46 + r() * 92, y - 132 + r() * 96, 12, 8, 0, r() < .5 ? '#f6f0dc' : '#dfd3b6', .4);
      // the drawing (crayon)
      const cr = (pts, col, w = 2.6) => ribbon(c, chaikin(pts.map(p => [x + p[0], y - 84 + p[1]]), 2), w, w, col, 5 + pts.length, 1.6, .75);
      cr([[-22, 22], [-30, 22], [-30, 14], [-22, 14], [-22, 22], [-14, 22], [-14, 30]], '#5f7fb4', 2.4); c.globalAlpha = .75; c.strokeStyle = '#5f7fb4'; c.lineWidth = 2.6; c.beginPath(); c.arc(x - 20, y - 84 + 24, 11, 0, TAU); c.stroke(); c.beginPath(); c.arc(x + 16, y - 84 + 24, 11, 0, TAU); c.stroke();
      cr([[-20, 24], [-6, 6], [14, 6], [16, 24]], '#c9553e'); cr([[-6, 6], [0, 22], [-20, 24]], '#c9553e'); cr([[-8, 4], [-12, -10], [2, -18], [14, -10], [8, 2], [-8, 4]], '#8a8a96', 2.8); cr([[8, -12], [12, -28], [18, -32]], '#8a8a96', 2.8); cr([[18, -34], [38, -27], [20, -27]], '#e39a3c', 3); cr([[-30, -36], [-34, -30]], '#f2c14e', 3); c.globalAlpha = .7; c.strokeStyle = '#f2c14e'; c.lineWidth = 3; c.beginPath(); c.arc(-28 + x, y - 84 - 34, 6, 0, TAU); c.stroke();
      c.globalAlpha = 1; c.fillStyle = '#f7efd8'; softDab(c, x + 10, y - 100, 60, 50, 0, '#fbf6e6', .28); // sun-faded
      const roof = [[x - 104, y - 150], [x - 40, y - 166], [x + 40, y - 168], [x + 106, y - 152]]; ribbon(c, roof, 15, 15, '#b8482f', 2, 1); ribbon(c, roof.map(p => [p[0], p[1] + 8]), 4, 4, '#6a3550', 3, .6, .7); ribbon(c, roof.map(p => [p[0], p[1] - 5]), 3, 3, '#e58a5a', 4, .6, .8);
      for (const px of [-84, 84]) ribbon(c, [[x + px, y + 4], [x + px, y - 150]], 9, 8, '#5f4a44', px, .8); ribbon(c, [[x - 78, y - 36], [x + 78, y - 36]], 9, 9, '#a98a68', 8, .8); ribbon(c, [[x - 78, y - 31], [x + 78, y - 31]], 3, 3, '#5f4a44', 9, .5, .7); end(c); }
    // mileposts carved with fading version numbers; the old ones are mossy and lean
    for (const P of R.posts) { const x = P.x, y = gy(x) - 22, lean = (hash(x | 0) - .5) * .26 * (.3 + P.age * 1.4), h = 84, w = 52; c.save(); c.translate(x, y); c.rotate(lean); begin(c); softDab(c, -24, 4, 34, 7, .1, '#5f58a0', .5);
      c.fillStyle = css(cmix('#d9d2c4', '#a9a696', P.age * .6)); c.beginPath(); c.moveTo(-w / 2, 4); c.lineTo(-w / 2, -h + 14); c.quadraticCurveTo(-w / 2, -h, 0, -h - 2); c.quadraticCurveTo(w / 2, -h, w / 2, -h + 14); c.lineTo(w / 2, 4); c.fill();
      for (let i = 0; i < 260; i++) { const u = r(), v = r(), xx = (u - .5) * w * .92, yy = 2 - v * (h - 4); if (v > .82 && Math.abs(u - .5) > .36) continue; dab(c, xx, yy, 6 + r() * 5, 3, PI / 2 + (r() - .5), cjit(cramp(['#8f89a8', '#b9b3b4', '#dcd6c6', '#f1ecd9'], .15 + .7 * u + (r() - .5) * .35), r, 7), .7); }
      const tw = letterWidth(P.n, 19, 1); lettering(c, P.n, -tw / 2, -h + 22, 19, { col: cmix('#4f4760', '#aaa3a8', P.age * .6), wt: 3.2, seed: x | 0, wob: 1, track: 1 }); lettering(c, P.n, -tw / 2 + 1.4, -h + 23.2, 19, { col: '#f8f3e4', wt: 1.1, seed: x | 0, wob: 1, track: 1, alpha: .55 });
      const nm = Math.round(P.age * 130); for (let i = 0; i < nm; i++) { const u = r(), v = Math.pow(r(), 1.6); dab(c, (u - .5) * w, 2 - v * h * .9 * (P.age), 5, 3, r() * PI, cjit(cramp(['#3f6f4a', '#5f9552', '#9cbd5a'], r()), r, 8), .8); } end(c); c.restore(); blades(c, { seed: x | 0, n: 50, x0: x - 26, x1: x + 26, y: () => y + 4, depth: 3, h: 16, wid: 2, ramp: G, baseT: .5 }); }
    // near verge: deep grass and wildflowers, growing larger toward the lens
    const ft = x => rb(x) - 5; const nv = (x, y) => .12 + clamp((y - ft(x)) / 620) * 1.0;
    paintMass(c, { x0: X0, x1: X1, top: ft, bot: 700, ramp: G, baseT: .38, seed: 86, n: 52000, len: 44, wid: 9, sc: 260, nz: .6, dir: -1.25, wobble: .8, size: (x, y) => .35 + nv(x, y), light: (x, y) => .2 * clamp(1 - (y - ft(x)) / 200) - .22 * clamp((y - 250) / 450), jit: 9, edgeStep: 4, edgeH: 6 });
    blades(c, { seed: 87, n: 60000, x0: X0, x1: X1, y: ft, depth: 640, bias: 1.5, h: 60, wid: 3.2, ramp: G, baseT: .52, sc: 200, size: (x, y, d) => .3 + d * 1.3, light: (x, y) => -.2 * clamp((y - 300) / 400) });
    flowers(c, { seed: 88, n: 9000, x0: X0, x1: X1, y: x => ft(x) + 14, depth: 560, cols: ['#fbf6e4', '#fbf6e4', '#f6dc6a', '#f1b83c', '#e9718a', '#d9483a', '#c4a6e0'], s: 3.4, clusterSc: 300, thresh: .02, centre: '#e9b23c', size: (x, y, d) => .5 + d * 1.6 });
    blades(c, { seed: 89, n: 9000, x0: X0, x1: X1, y: x => ft(x) + 30, depth: 620, bias: 1.2, h: 70, wid: 2.6, ramp: G.slice(2), baseT: .6, size: (x, y, d) => .3 + d * 1.2 });
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * zl)) / zl, xb = xa + W / zl; liveGrass(ctx, f, { xa, xb, spacing: 11, y: ft, depth: 420, rows: 7, h: 54, wid: 3, ramp: G, baseT: .55, seed: 2, size: d => .35 + d * 1.25, tipLight: .5, heads: .12, flowers: .05, flowerCols: ['#fbf6e4', '#f6dc6a', '#e9718a'], gap: .2 }); };
    L.under = null; S.layers.push(L); } step();
  // ── 7 foreground: big soft grass close to the lens (all of it alive)
  { const L = newLayer('fg', 1.6, 0, -40, 10200, 320, .25, { hidden: (f, env) => env.noFg }), c = L.ctx;
    paintMass(c, { x0: 0, x1: 10200, top: x => 90 + 30 * fbm(x / 200, 3), bot: 320, ramp: G.slice(0, 4), baseT: .2, seed: 91, n: 9000, len: 90, wid: 24, dir: -1.3, sc: 300, jit: 8, edgeH: 30 });
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * 1.6 * zl)) / zl, xb = xa + W / zl; ctx.save(); liveGrass(ctx, f, { xa, xb, spacing: 26, y: x => 170 + 20 * vnoise(x / 90, 2), depth: 60, rows: 3, h: 250, wid: 10, ramp: G.slice(0, 5), baseT: .34, px: 1.6, seed: 9, size: d => .7 + d * .5, tipLight: .4, heads: .2, headS: 2.4, flowers: .07, flowerS: 17, flowerCols: ['#fbf6e4', '#f6dc6a', '#e9718a'], windScale: 1.15 }); ctx.restore(); };
    S.layers.push(L); } step();
  for (const L of S.layers) delete L.ctx; } };
