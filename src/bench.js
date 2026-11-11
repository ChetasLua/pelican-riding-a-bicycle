// ───────────────────────── the BENCHMARK PELICANS: deliberately bad vector clip-art. Flat fills, uniform black outline, on fours. ─────────────────────────
// drawBench(ctx, i, o) — local space: origin on the ground, facing right. o = { f4, roll (distance for wheel pose), tip (0..1), look:[x,y], wow (0..1 astonished), bloom:[b1,b2] (0..1 each wheel), tint:[col,amt], solid: colour (rim pass), smooth }
const BCOL = { k: '#000000', w: '#ffffff', beak: '#ff9a00', blue: '#1554ff', yel: '#ffe600', red: '#ff1f1f', grn: '#00c853', pur: '#a100ff', mag: '#ff2bd6', gry: '#9fb4c8', cyan: '#00d5ff' };
function drawBench(ctx, i, o = {}) { const f4 = o.f4 || 0, tint = o.tint, solid = o.solid, C = k => solid ? css(solid) : tint ? css(cmix(BCOL[k], tint[0], tint[1])) : BCOL[k], LW = 3.2;
  ctx.save(); ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.lineWidth = LW; ctx.strokeStyle = C('k'); ctx.globalAlpha = 1;
  const fs = (k) => { ctx.fillStyle = C(k); ctx.fill(); ctx.stroke(); };
  const ell = (x, y, rx, ry, k, r = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r, 0, TAU); fs(k); };
  const poly = (pts, k) => { ctx.beginPath(); pts.forEach((p, j) => j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); fs(k); };
  const line = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  const eye = (x, y, r = 6) => { const wow = o.wow || 0, lk = o.look || [.4, 0], rr = r * (1 + wow * .7); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); fs('w'); ctx.fillStyle = C('k'); ctx.beginPath(); ctx.arc(x + lk[0] * rr * .45, y + lk[1] * rr * .45, rr * (.42 - wow * .14), 0, TAU); ctx.fill(); };
  // the stock clip-art bird
  const bird = (x, y, beak = true) => { line([x - 10, y + 26], [x - 14, y + 62]); line([x + 6, y + 26], [x + 12, y + 62]); poly([[x - 52, y - 4], [x - 74, y - 16], [x - 70, y + 8]], 'w'); ell(x, y, 50, 32, 'w'); ell(x - 8, y + 2, 28, 15, 'gry', -.15);
    ctx.beginPath(); ctx.rect(x + 22, y - 62, 15, 50); fs('w'); ell(x + 32, y - 66, 17, 16, 'w');
    if (beak) { const g = (o.wow || 0) * 9; poly([[x + 44, y - 74], [x + 112, y - 62 - g * .3], [x + 44, y - 60]], 'beak'); poly([[x + 44, y - 60], [x + 104, y - 58 + g], [x + 60, y - 44 + g], [x + 44, y - 52]], 'yel'); }
    eye(x + 35, y - 70, 5.5); if (!o.wow) { ctx.beginPath(); ctx.arc(x + 46, y - 57, 6, .5, 2.2); ctx.stroke(); } };
  if (i === 0) { // SQUARE-WHEELS (after the fix: painted round wheels — only the wheels change)
    const k = sqK(o.roll || 0), b = o.bloom || [0, 0], done = b[0] >= 1 && b[1] >= 1, corner = !done && !o.smooth && (k & 1), lift = corner ? -20 : 0, ang = o.smooth ? (o.roll || 0) / 50 : k * PI / 4, tp = o.tip || 0;
    ctx.translate(-70, 0); ctx.rotate(-tp * PI / 2 * .98); ctx.translate(70, tp ? -6 * tp : 0); ctx.translate(0, lift * (1 - Math.min(b[0], b[1])));
    for (const [wi, hx] of [[1, -70], [0, 70]]) { const bb = b[wi === 1 ? 1 : 0], hy = -50, tx = wi === 0 ? hx + 50 : hx + 50, ty = -100; // bloom spreads from the touched corner
      const sq = () => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.beginPath(); ctx.rect(-50, -50, 100, 100); fs('yel'); line([-50, -50], [50, 50]); line([50, -50], [-50, 50]); ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); fs('red'); ctx.restore(); };
      if (bb <= 0) sq(); else { const cx = wi === 0 ? 120 : hx + 50, cy = -100, rad = bb * 175; // mask circle around the touch point (front wheel) / the arriving wave (rear)
        if (bb < 1) { ctx.save(); ctx.beginPath(); ctx.rect(-400, -400, 800, 800); ctx.arc(cx, cy, rad, 0, TAU, true); ctx.clip('evenodd'); sq(); ctx.restore(); }
        ctx.save(); if (bb < 1) { ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.clip(); } paintedWheel(ctx, hx, hy, 51, (o.roll || 0) / 51 + wi, o.pal || HPAL, f4 + wi * 5); ctx.restore();
        if (bb < 1 && !solid) bloomEdge(ctx, cx, cy, rad, f4 + wi * 9, hx, hy); } }
    ctx.lineWidth = LW; ctx.strokeStyle = C('k'); ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
    ctx.lineWidth = 7; ctx.strokeStyle = C('blue'); line([-70, -50], [-10, -50]); line([-10, -50], [-30, -112]); line([-30, -112], [48, -112]); line([48, -112], [-10, -50]); line([48, -112], [70, -50]); line([-30, -112], [-70, -50]); line([48, -112], [44, -138]); line([30, -140], [58, -138]); ctx.lineWidth = LW; ctx.strokeStyle = C('k');
    ctx.beginPath(); ctx.rect(-48, -124, 36, 9); fs('k'); bird(-12, -156); }
  else if (i === 1) { // UPSIDE-DOWN: bicycle inverted, saddle scraping the road, wheels spinning in the air
    const ang = (o.roll || 0) / 30; ctx.lineWidth = 7; ctx.strokeStyle = C('grn'); line([-84, -112], [-6, -100]); line([-6, -100], [-30, -26]); line([-30, -26], [52, -34]); line([52, -34], [-6, -100]); line([52, -34], [84, -112]); line([-30, -26], [-84, -112]); line([52, -34], [50, -8]); line([30, -5], [70, -9]); line([-6, -100], [-6, -128]); line([-18, -128], [8, -128]); ctx.lineWidth = LW; ctx.strokeStyle = C('k');
    ctx.beginPath(); ctx.rect(-52, -12, 44, 11); fs('k');
    for (const hx of [-84, 84]) { ctx.save(); ctx.translate(hx, -112); ctx.rotate(ang); ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); fs('w'); ctx.lineWidth = 9; ctx.strokeStyle = C('red'); ctx.beginPath(); ctx.arc(0, 0, 41, 0, TAU); ctx.stroke(); ctx.lineWidth = LW; ctx.strokeStyle = C('k'); ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.stroke(); for (let s = 0; s < 4; s++) line([0, 0], [Math.cos(s * PI / 2) * 37, Math.sin(s * PI / 2) * 37]); ctx.restore(); }
    if (!solid && o.sparks) { for (let s = 0; s < 3; s++) { const h = hash2(f4, s); ctx.beginPath(); ctx.rect(-60 - h * 34, -6 - hash2(f4, s + 9) * 16, 6, 6); fs('yel'); } }
    bird(0, -170 + ((f4 >> 2) & 1) * 3); }
  else if (i === 2) { // BACK-BEAK: beak attached to its back; three wheels joined to nothing, floating nearby
    const bobs = [0, 1, 2].map(s => Math.round(Math.sin(f4 * .22 + s * 2.1) * 2) * 5);
    for (const [s, x, y] of [[0, -62, -40], [1, 40, -34], [2, 96, -128]]) { ctx.beginPath(); ctx.arc(x, y + bobs[s], 34, 0, TAU); fs('pur'); ctx.beginPath(); ctx.arc(x, y + bobs[s], 20, 0, TAU); fs('cyan'); ctx.beginPath(); ctx.arc(x, y + bobs[s], 5, 0, TAU); fs('k'); }
    const y0 = -150 + ((f4 >> 2) & 1) * 4; poly([[-22, y0 - 26], [-60, y0 - 110], [0, y0 - 30]], 'beak'); bird(-6, y0, false); }
  else if (i === 3) { // NOODLE: a white oval with legs like cooked noodles, beside a bicycle made of one triangle
    const ph = (f4 >> 2), y0 = -112 + (ph & 1) * 6; ctx.lineWidth = 6; ctx.strokeStyle = C('beak'); for (const sx of [-16, 14]) { ctx.beginPath(); ctx.moveTo(sx, y0 + 34); for (let t = 1; t <= 6; t++) ctx.lineTo(sx + Math.sin(t * 1.5 + ph * 1.7 + sx) * 13, y0 + 34 + t * (-y0 - 34) / 6); ctx.stroke(); } ctx.lineWidth = LW; ctx.strokeStyle = C('k');
    ell(0, y0, 46, 37, 'w'); eye(14, y0 - 10, 5); eye(30, y0 - 8, 5); poly([[40, y0 - 2], [62, y0 + 6], [40, y0 + 12]], 'beak');
    poly([[78, -4], [130, -96 - (ph & 1) * 4], [176, -4]], 'mag'); ctx.beginPath(); ctx.arc(78, -6, 9, 0, TAU); fs('k'); ctx.beginPath(); ctx.arc(176, -6, 9, 0, TAU); fs('k'); }
  else { // NEWCOMER: wheels stacked one on top of the other
    for (const [y, k2] of [[-34, 'cyan'], [-100, 'yel']]) { ctx.beginPath(); ctx.arc(0, y, 33, 0, TAU); fs(k2); ctx.beginPath(); ctx.arc(0, y, 6, 0, TAU); fs('k'); } ctx.lineWidth = 7; ctx.strokeStyle = C('red'); line([0, -34], [0, -140]); line([-30, -140], [34, -140]); ctx.lineWidth = LW; ctx.strokeStyle = C('k'); bird(-2, -176 + ((f4 >> 2) & 1) * 3); }
  ctx.restore(); }
// a gouache wheel (what a square wheel becomes): dark tyre with dabs, cream rim, hand-inked spokes
function paintedWheel(ctx, x, y, R, rot, pal, seed) { const r = RNG(91); begin(ctx); ctx.strokeStyle = css(pal.line); ctx.lineWidth = 11; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, R - 5, 0, TAU); ctx.stroke(); ctx.strokeStyle = css(pal.tyre); ctx.lineWidth = 7.4; ctx.beginPath(); ctx.arc(x, y, R - 5, 0, TAU); ctx.stroke();
  for (let i = 0; i < 46; i++) { const a = r() * TAU + rot; dab(ctx, x + Math.cos(a) * (R - 5 + (r() - .5) * 4), y + Math.sin(a) * (R - 5 + (r() - .5) * 4), 9, 2.4, a + PI / 2, cjit(Math.sin(a - rot * 0 + .9) < -.2 ? pal.tyreHi : cmix(pal.tyre, pal.line, r() * .6), r, 8), .7); }
  ctx.globalAlpha = 1; ctx.strokeStyle = css(pal.metal); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(x, y, R - 11, 0, TAU); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = rot + i * TAU / 12; ribbon(ctx, [[x + Math.cos(a + .2) * 5, y + Math.sin(a + .2) * 5], [x + Math.cos(a) * (R - 12), y + Math.sin(a) * (R - 12)]], 1.5, 1.1, pal.spoke, seed + i, .5, .95); }
  ctx.fillStyle = css(pal.line); ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill(); ctx.fillStyle = css(pal.brass); ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill(); end(ctx); }
// the wet edge of the bloom: pigment gathering on an expanding ring, near the wheel only
function bloomEdge(ctx, cx, cy, rad, seed, hx, hy) { const r = RNG(seed * 13 + 7); begin(ctx); for (let i = 0; i < 70; i++) { const a = r() * TAU, rr = rad + (r() - .6) * 14, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, d = Math.hypot(x - hx, y - hy); if (d > 78) continue;
    softDab(ctx, x, y, 7 + r() * 9, 5 + r() * 7, a, r.pick(['#fff6d8', '#f6d98a', '#f2a56f', '#fffaf0', '#e9c7d9']), .55 * (1 - d / 90)); if (r() < .35) dab(ctx, x, y, 8 + r() * 8, 2.2, a + PI / 2, r.pick(['#fffaf0', '#f8cd92', '#c8402f']), .7); } end(ctx); }
