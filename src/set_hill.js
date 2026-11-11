// ───────────────────────── SET 2: THE HILLTOP (shots 4–6) — six in the evening, the gold draining; low sun off screen RIGHT ─────────────────────────
// p=1 plane: ground at y = hillY(x). The old camphor stands at x=3000 on the plateau, the bench under its right flank, the sea away to the left.
// (helpers are prefixed H_hill_ : hero.js also uses the H_ prefix)
const HILL = { hz: 80, trunkX: 3000, trunkL: 2885, trunkR: 3140, splitY: -260, pathEnd: 2750, leanX: 2840,
  bench: { x0: 3085, x1: 3165, seatY: -95, backY: -200, board: [3088, -88, 3166, -62] }, patch: [2780, -540, 3360, 40],
  towerX: -600, towerTip: [-600, -112], canopy: [2250, -1170, 3780, -385],
  greens: ['#12303a', '#1c474a', '#2f644e', '#567a50', '#8c9458', '#c8b078'],
  leafSh: ['#0a2030', '#0f2e38', '#163f40', '#215446', '#31684c', '#467a52'], leafLt: ['#1b3c36', '#2c5a3c', '#527e40', '#8ca246', '#c8bc5a', '#f2d68a'],
  bark: ['#1d1a30', '#2f2940', '#463a48', '#63504e', '#86705a', '#ae926c', '#e6bc86'], moss: ['#16323a', '#224a40', '#386a46', '#5e8a4e', '#8ea45c'],
  sea: ['#c6d3cc', '#9fbec4', '#6fa1b8', '#4b84a6', '#386c92', '#2d577e'], far: ['#7c9bb0', '#90aeb6', '#a8c2b8', '#c3d3b8', '#e0dcb8'],
  cloud: { deep: '#5c6aa0', shadow: '#828ab8', mid: '#bfb0c8', light: '#f0c8a8', hi: '#fbdcb8' } };
const H_hill_xl = y => 3000 - (72 + 28 * Math.pow(clamp(1 + y / 260), 1.5) + 15 * Math.exp(Math.min(0, y) / 24)) + 4 * vnoise(y / 37, 61);
const H_hill_xr = y => 3000 + (76 + 34 * Math.pow(clamp(1 + y / 260), 1.5) + 30 * Math.exp(Math.min(0, y) / 30)) + 4 * vnoise(y / 41, 67);
const H_hill_rampMix = (A, B, t) => A.map((c, i) => cmix(c, B[i], t));
// the camphor's long evening shadow on the ground (0 = sun, 1 = shade): the round shadow of the crown thrown down the slope, joined to the foot of
// the trunk by the trunk's own stripe.  body = the mass, shade = the mass broken by sun flecks.
function H_hill_body(x, y) { if (x < 900 || x > 3080) return 0; const d = y - hillY(x), n = fbm2(x / 230, y / 150, 91, 2), ex = (x - 1960 + .5 * (d - 150)) / 800, ed = (d - 150) / 430;
  const crown = 1 - ss(.66, 1.14, ex * ex + ed * ed + .42 * n), tr = x > 2250 ? .92 * Math.exp(-Math.pow((d - 14 - (3000 - x) * .14) / (26 + (3000 - x) * .07), 2)) * (1 - ss(2990, 3050, x)) : 0; return Math.max(crown, tr); }
const H_hill_cool = x => clamp((hillY(x - 30) - hillY(x + 30)) / 18);   // the seaward slope turns its back on the low sun
function H_hill_shade(x, y) { const b = H_hill_body(x, y), cl = x > 3300 ? .6 * ss(3420, 3900, x + .5 * (y - hillY(x)) + 220 * fbm2(x / 300, y / 200, 93, 2)) : .5 * H_hill_cool(x); if (b <= 0) return cl; return Math.max(cl, clamp(b * (1 - .82 * ss(.16, .34, fbm2(x / 120, y / 44, 97, 2)) * (.4 + .6 * ss(1.25, .5, b + .25))))); }
// leaf mass with a crisp leafy edge (no airbrushed halo): dark → mid → sunlit passes of short leaf dabs
function H_hill_clump(c, cx, cy, rx, ry, ramp, seed, n, o = {}) { const r = RNG(seed), lx = o.lx == null ? .85 : o.lx, ly = o.ly == null ? -.5 : o.ly, dl = o.dab || Math.max(4, Math.min(rx, ry) * .12);
  softDab(c, cx, cy + ry * .06, rx * .9, ry * .88, 0, cramp(ramp, .1), .95); c.fillStyle = css(cramp(ramp, .09)); c.globalAlpha = .97;
  for (let i = 0; i < 13; i++) { const a = i / 13 * TAU + r() * .5, d = .5 + .32 * r(), s = .24 + .2 * r(); c.beginPath(); c.ellipse(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rx * s, ry * s * .85, r() * PI, 0, TAU); c.fill(); }
  for (let ps = 0; ps < 3; ps++) for (let i = 0; i < n / 3; i++) { const a = r() * TAU, d = Math.sqrt(r()) * (ps === 0 ? 1.1 : .97), nx = Math.cos(a) * d, ny = Math.sin(a) * d;
      let v = .4 + .44 * (nx * lx + ny * ly) + .3 * fbm2(cx * .01 + nx * 2.2, cy * .01 + ny * 2.2, seed, 2) + (r() - .5) * .16; if (ps === 1 && v < .38) continue; if (ps === 2 && v < .6) continue;
      v = clamp(v + (ps - 1) * .14); const s = dl * (.7 + .7 * r()) * (ps === 2 ? .8 : 1); dab(c, cx + nx * rx, cy + ny * ry, s * 1.7, s, r() * PI, cjit(cramp(ramp, v), r, o.jit || 7), .9); } }
function H_hill_daisy(c, x, y, s, col, cen, rot) { c.globalAlpha = .95; c.fillStyle = css(col); for (let q = 0; q < 6; q++) { const a = rot + q * TAU / 6; c.beginPath(); c.ellipse(x + Math.cos(a) * s * .62, y + Math.sin(a) * s * .5, s * .55, s * .3, a, 0, TAU); c.fill(); }
  c.fillStyle = css(cen); c.beginPath(); c.arc(x, y, s * .34, 0, TAU); c.fill(); }
// a dandelion clock: stem (x,y)→(tx,ty) and a soft, see-through seed ball
function H_hill_clock(c, x, y, tx, ty, s, sh) { c.lineCap = 'round'; c.globalAlpha = .9; c.strokeStyle = css(cmix('#9db36a', '#2c4a4c', .6 * sh)); c.lineWidth = 1.3 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (tx - x) * .2, y + (ty - y) * .6, tx, ty); c.stroke();
  const col = cmix('#f6f0e2', '#8794c4', .55 * sh), R = 6 * s; softDab(c, tx, ty, R * 1.45, R * 1.45, 0, col, .62); softDab(c, tx + R * .25, ty - R * .25, R * .8, R * .8, 0, cmix(col, '#ffe9c4', .5 * (1 - sh)), .4);
  c.strokeStyle = css(col); c.lineWidth = Math.max(.4, .5 * s); c.globalAlpha = .38; c.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + x; c.moveTo(tx + Math.cos(a) * 1.5 * s, ty + Math.sin(a) * 1.5 * s); c.lineTo(tx + Math.cos(a) * R, ty + Math.sin(a) * R); } c.stroke();
  c.fillStyle = css(cmix('#bfae84', '#4a4a6a', .5 * sh)); c.globalAlpha = .9; c.beginPath(); c.arc(tx, ty, 1.3 * s, 0, TAU); c.fill(); }
function H_hill_flowers(c, o) { const r = RNG(o.seed); begin(c); for (let i = 0; i < o.n; i++) { const x = o.x0 + r() * (o.x1 - o.x0), d = Math.pow(r(), o.bias || 1), y = o.y(x) + d * o.depth - 8 * r(), s = (o.size ? o.size(d) : 1) * (o.s || 4) * (.6 + .8 * r()), col0 = r.pick(o.cols), rot = r() * TAU, q = r();
    if (o.clusterSc && fbm2(x / o.clusterSc, y / 80, o.seed, 2) < (o.thresh || 0)) continue; const sh = H_hill_shade(x, y); if (s <= 3.2 && q > 1 - .6 * sh) continue; const col = cjit(cmix(col0, '#44548e', .78 * sh), r, 8);
    if (s > 3.2) H_hill_daisy(c, x, y, s, col, cmix(o.centre || '#e2aa3c', '#5a5070', .6 * sh), rot); else { c.globalAlpha = .95; c.fillStyle = css(col); c.beginPath(); c.ellipse(x, y, s, s * .8, rot, 0, TAU); c.fill(); if (q < .5) { c.beginPath(); c.ellipse(x + s * .9, y - s * .4, s * .7, s * .55, rot, 0, TAU); c.fill(); } } }
  end(c); }
// live, wind-driven grass like liveGrass(), but every blade takes its value from the tree-shadow field and may carry a daisy or a dandelion clock
function H_hill_grass(ctx, f, o) { const sp = o.spacing, k0 = Math.floor(o.xa / sp) - 1, k1 = Math.ceil(o.xb / sp) + 1, rows = o.rows || 1, sd = o.seed || 0, ramp = o.ramp, ws = o.windScale || 1, shK = o.shK == null ? .46 : o.shK; ctx.lineCap = 'round';
  for (let k = k0; k <= k1; k++) for (let j = 0; j < rows; j++) { const h1 = hash2(k, 11 + j * 7 + sd), h2 = hash2(k, 23 + j * 5 + sd), h3 = hash2(k, 37 + j * 3 + sd), x = (k + h1) * sp;
    if (o.gap && h3 < (typeof o.gap === 'function' ? o.gap(x) : o.gap)) continue; const d = (j + h2) / rows, y = o.y(x) + d * (o.depth || 0), s = o.size ? o.size(d, x) : 1, h = o.h * s * (.55 + .7 * h2), sh = o.sh ? o.sh(x, y) : 0;
    const w = windAtX(f, x / (o.px || 1)) * ws, lean = (.12 + (h1 - .5) * .5) + w * (1 + .5 * h3) + .1 * w * Math.sin(f * .5 + k * 1.7), tx = x + Math.sin(lean) * h, ty = y - Math.cos(lean * .8) * h, h4 = hash2(k, 53 + j * 9 + sd);
    if (o.clocks && h4 > 1 - o.clocks) { const cs = (o.clockS || 1) * s, l2 = lean * .55; H_hill_clock(ctx, x, y, x + Math.sin(l2) * h * 1.15, y - Math.cos(l2 * .8) * h * 1.15, cs, sh); ctx.lineCap = 'round'; continue; }
    ctx.globalAlpha = o.alpha || 1; ctx.strokeStyle = css(cramp(ramp, clamp((o.baseT || .4) + (h3 - .5) * .7 + (o.tipLight || 0) * w * (1 - sh) - shK * sh))); ctx.lineWidth = (o.wid || 3) * s * (.6 + .8 * h1);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(lean * .3) * h * .5, y - h * .55, tx, ty); ctx.stroke();
    if (o.heads && h3 > 1 - o.heads) { ctx.fillStyle = css(cmix(o.headCol || '#e0d49c', '#4c5e92', .6 * sh)); ctx.beginPath(); ctx.ellipse(tx, ty, 3.2 * s * (o.headS || 1), 7 * s * (o.headS || 1), lean, 0, TAU); ctx.fill(); }
    else if (o.flowers && h4 < o.flowers) { const col = cmix(o.flowerCols[(h1 * 97 | 0) % o.flowerCols.length], '#4c5c96', .62 * sh); H_hill_daisy(ctx, tx, ty, (o.flowerS || 6) * s, col, cmix('#e2aa3c', '#5a5070', .6 * sh), k + lean); } }
  ctx.globalAlpha = 1; }
// a smooth tapering body through pts; wf(t) = full width at t
function H_hill_tube(c, pts, wf, col, grow = 0) { const n = pts.length, Lp = [], Rp = []; for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1, w = wf(i / (n - 1)) * .5 + grow; dx /= l; dy /= l; Lp.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rp.push([pts[i][0] + dy * w, pts[i][1] - dx * w]); }
  c.fillStyle = typeof col === 'string' ? col : css(col); c.beginPath(); c.moveTo(Lp[0][0], Lp[0][1]); for (let i = 1; i < n; i++) c.lineTo(Lp[i][0], Lp[i][1]); for (let i = n - 1; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]); c.closePath(); c.fill(); }
// the camphor's skeleton and its leaf masses, built once (pure functions of fixed seeds)
function H_hill_build() { if (HILL.limbs) return; const r = RNG(301), out = []; let id = 0;
  const add = (P, w0, w1, lvl) => { const pts = bez(P[0], P[1], P[2], P[3], lvl ? 14 : 44), k = id++, amp = lvl ? 7 : 15; for (let i = 1; i < pts.length; i++) { const t = i / (pts.length - 1), a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, o = amp * smooth(t / .3) * (vnoise(t * 3.4 + k * 5.1, 31) + .4 * vnoise(t * 9 + k, 33)); pts[i] = [b[0] - (b[1] - a[1]) / l * o, b[1] + (b[0] - a[0]) / l * o]; } let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, len = 0; pts.forEach((p, i) => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); });
    const wf = lvl ? t => lerp(w0, w1, t) * (1 + .05 * Math.sin(t * 8 + k)) : t => lerp(w0, w1, Math.pow(t, .8)) * (.34 + .66 * smooth(t / .2)) * (1 + .05 * Math.sin(t * 9 + k * 2));
    const lb = { id: k, pts, w0, w1, wf, lvl, len, bb: [x0 - w0, y0 - w0, x1 + w0, y1 + w0] }; out.push(lb); return lb; };
  const at = (lb, t) => { t = clamp(t); const n = lb.pts.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), a = lb.pts[i], b = lb.pts[i + 1], u = f - i, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return { x: a[0] + dx * u, y: a[1] + dy * u, tx: dx / l, ty: dy / l, w: lb.wf(t) }; };
  HILL.limbAt = at;
  const grow = (lb, lvl) => { const n = lvl === 1 ? 4 : 2; for (let k = 0; k < n; k++) { const t = Math.min(.94, lvl === 1 ? .36 + .16 * k + r() * .06 : .4 + .35 * k + r() * .1), P = at(lb, t), side = (k & 1 ? 1 : -1) * (r() < .85 ? 1 : -1), ang = Math.atan2(P.ty, P.tx) + side * (.55 + r() * .5), L = (lvl === 1 ? 300 : 150) * (1 - .35 * t) * (.75 + .5 * r());
      let dx = Math.cos(ang), dy = Math.sin(ang) - .4; const l = Math.hypot(dx, dy); dx /= l; dy /= l; const e = [P.x + dx * L, Math.min(-500, P.y + dy * L)];
      const sb = add([[P.x, P.y], [P.x + dx * L * .35 + (r() - .5) * 30, P.y + dy * L * .3], [P.x + dx * L * .7 + (r() - .5) * 40, Math.min(-490, P.y + dy * L * .75 - L * .12)], e], P.w * (lvl === 1 ? .6 : .5), lvl === 1 ? 9 : 3.5, lvl); if (lvl === 1) grow(sb, 2); } };
  for (const [P, w0, w1] of [[[[2948, -120], [2912, -360], [2700, -470], [2430, -560]], 108, 32], [[[2974, -120], [2960, -420], [2830, -640], [2700, -880]], 96, 24], [[[3002, -120], [2996, -440], [3070, -700], [3010, -990]], 90, 20],
    [[[3030, -120], [3052, -400], [3250, -600], [3390, -860]], 94, 22], [[[3056, -120], [3086, -350], [3340, -420], [3630, -550]], 106, 30]]) grow(add(P, w0, w1, 0), 1);
  out.sort((a, b) => b.lvl - a.lvl); HILL.limbs = out;
  // leaf masses: cloud-like boughs, each a cluster of small clumps with a lit crown and a dark belly, stacked into one great dome
  const BG = [[2420, -560, 150, 80], [2600, -640, 210, 105], [2520, -800, 190, 100], [2700, -930, 200, 105], [2800, -760, 220, 110], [2760, -560, 170, 78], [2960, -1040, 230, 105], [3180, -1060, 210, 95], [3000, -850, 230, 115], [3040, -670, 250, 110], [3010, -505, 170, 64], [2860, -508, 150, 62], [3250, -448, 190, 72], [3490, -432, 170, 66], [3700, -482, 90, 60],
    [3380, -960, 210, 105], [3260, -780, 230, 115], [3520, -800, 190, 100], [3620, -640, 160, 95], [3420, -600, 230, 105], [3330, -475, 200, 70], [3650, -505, 110, 70]];
  const rc = RNG(311), boughs = [], leaves = [];
  for (const [cx, cy, rx, ry] of BG) { const lit0 = clamp(.5 + .5 * ((cx - 3020) / 740 * .9 - (cy + 770) / 400 * .4)), subs = [];
    for (let k = 0; k < 5; k++) { const rr = rx * (.22 + .1 * rc()); subs.push({ x: cx + (k / 4 - .5) * rx * 1.3 + (rc() - .5) * 30, y: cy + ry * (.1 + .22 * rc()), rx: rr, ry: rr * .5, lit: lit0 * .22, under: 1, seed: 6000 + boughs.length * 40 + k }); }
    const tops = []; for (let k = 0; k < 14; k++) { const a = PI + (k + rc()) / 14 * PI, dd = .25 + .62 * rc(), rr = rx * (.23 + .15 * rc()), q = { x: cx + Math.cos(a) * rx * dd, y: cy + Math.sin(a) * ry * dd - ry * .05, rx: rr, ry: rr * (.62 + .18 * rc()), seed: 6010 + boughs.length * 40 + k };
      q.lit = clamp(lit0 + .34 * Math.cos(a) * dd - .3 * Math.sin(a) * dd - .16 + .14 * (rc() - .5)); tops.push(q); }
    tops.sort((a, b) => a.lit - b.lit); for (const q of subs.concat(tops)) { if (q.x < 3060 && q.y + q.ry > -432) q.y = -432 - q.ry; if (q.y - q.ry < -1166) q.y = -1166 + q.ry; }
    for (const q of tops) for (let k = 0; k < 2; k++) { const a = -PI * .2 + (rc() - .5) * 2.2, d = .8 + .32 * rc(); leaves.push({ x: q.x + Math.cos(a) * q.rx * d, y: q.y + Math.sin(a) * q.ry * d, lit: clamp(q.lit + .1 + .3 * rc()), s: .8 + .6 * rc(), ph: rc() * TAU, a: rc() * PI }); }
    for (const q of subs) { const a = PI * .5 + (rc() - .5) * 1.6; leaves.push({ x: q.x + Math.cos(a) * q.rx, y: q.y + Math.sin(a) * q.ry, lit: .1 * rc(), s: .9 + .7 * rc(), ph: rc() * TAU, a: rc() * PI }); }
    boughs.push({ cx, cy, rx, ry, lit: lit0, subs: subs.concat(tops) }); }
  boughs.sort((a, b) => a.cy - b.cy); HILL.boughs = boughs; HILL.leaves = leaves; }
// one limb: dark body, form-following bark dabs and fissures, warm rim where it faces the low sun, moss on the upper side of the great limbs
function H_hill_limb(c, lb, fine) { const r = RNG(4000 + lb.id * 13), BK = HILL.bark, at = HILL.limbAt, Lx = .9, Ly = -.32;
  c.globalAlpha = 1; H_hill_tube(c, lb.pts, lb.wf, '#1c1930', 1.3); H_hill_tube(c, lb.pts, lb.wf, cramp(BK, .22));
  const wa = (lb.w0 + lb.w1) / 2, m = Math.round(lb.len * wa / (fine ? 15 : 34));
  for (let i = 0; i < m; i++) { const t = r(), P = at(lb, t), a = r() * 2 - 1, nx = -P.ty, ny = P.tx, k = nx * Lx + ny * Ly, s = .5 + .5 * a * (k >= 0 ? 1 : -1), x = P.x + nx * a * P.w * .46, y = P.y + ny * a * P.w * .46;   // s: 0 = shadow edge … 1 = sun edge
    const v = .15 + .09 * Math.exp(-Math.pow(s / .08, 2)) + (.14 + .3 * Math.abs(k)) * smooth((s - .2) / .7) + .15 * fbm2(x / 26, y / 26, 9, 2) - .07 * ss(-520, -820, y) + (r() - .5) * .1;
    dab(c, x, y, (9 + r() * 18) * (fine ? .75 : 1), fine ? 1.2 + r() * 2.2 : 2.4 + r() * 3, Math.atan2(P.ty, P.tx) + (r() - .5) * .22, cjit(cramp(BK, clamp(v, 0, .8)), r, 5), .82); }
  if (fine && lb.lvl === 0) { const rq = RNG(4300 + lb.id); for (let i = 0; i < m * 1.6; i++) { const t = rq() * .7, P = at(lb, t), a = rq() * 2 - 1, k = -P.ty * Lx + P.tx * Ly, s = .5 + .5 * a * (k >= 0 ? 1 : -1), x = P.x - P.ty * a * P.w * .46, y = P.y + P.tx * a * P.w * .46, v = .17 + (.14 + .3 * Math.abs(k)) * smooth((s - .2) / .7) + (rq() < .5 ? .15 : -.1);
      dab(c, x, y, 6 + rq() * 18, .5 + rq() * .8, Math.atan2(P.ty, P.tx) + (rq() - .5) * .2, cjit(cramp(BK, clamp(v, 0, .82)), rq, 5), .5 + .3 * rq()); } }
  const mf = Math.round(lb.len * Math.sqrt(wa) / (fine ? 26 : 70)) + (lb.lvl ? 0 : fine ? 150 : 70); for (let i = 0; i < mf; i++) { const t = lb.lvl === 0 && i % 2 ? r() * .3 : r() * .9, a = (r() * 2 - 1) * .8, L = 3 + (r() * 4 | 0), pts = []; for (let q = 0; q <= L; q++) { const P = at(lb, t + q * .028); pts.push([P.x - P.ty * a * P.w * .46 + 1.4 * vnoise(q * 1.7 + i, 7), P.y + P.tx * a * P.w * .46 + 1.4 * vnoise(q * 1.3 + i, 9)]); }
    ribbon(c, pts, .8, (fine ? 1.6 : 2.4) * Math.min(1, wa / 40 + .3), '#17142a', i, .4, .4 + .3 * r()); }
  const m2 = Math.round(lb.len / (fine ? 4 : 8)); for (let i = 0; i < m2; i++) { const t = r(), P = at(lb, t), nx = -P.ty, ny = P.tx, k = nx * Lx + ny * Ly, s0 = k > 0 ? 1 : -1; if (Math.abs(k) < .22 || vnoise(t * 16 + lb.id * 3.1, 5) < -.1) continue;
    const e = P.w * .47 - r() * Math.min(3, P.w * .08); dab(c, P.x + nx * s0 * e, P.y + ny * s0 * e, 7 + r() * 11, ((fine ? .8 : 1.3) + r() * 1.5) * Math.min(1, P.w / 30 + .4), Math.atan2(P.ty, P.tx), cjit('#f0b878', r, 8), (.35 + .4 * r()) * Math.min(1, Math.abs(k) * 1.4)); }
  if (lb.lvl === 0) { const m3 = Math.round(lb.len / (fine ? 2.4 : 6)); for (let i = 0; i < m3; i++) { const t = .2 + r() * .75, P = at(lb, t), nx = -P.ty, ny = P.tx, s0 = ny < 0 ? 1 : -1, a = s0 * (.6 + .42 * r()); if (Math.abs(ny) < .4 || fbm2(P.x / 60, P.y / 60, 83, 2) < .02) continue;
      dab(c, P.x + nx * a * P.w * .46, P.y + ny * a * P.w * .46, 3 + r() * 5, fine ? 1.3 + r() * 1.6 : 2.2 + r() * 2, r() * PI, cjit(cramp(HILL.moss, .1 + .7 * r()), r, 6), .8); } } }
// limbs + trunk. `fine` adds the hairline work for the close-up patch; the coarse pass is identical in both bakes so the patch has no seam.
function H_hill_wood(c, fine, clip) { const BK = HILL.bark, MS = HILL.moss, xl = H_hill_xl, xr = H_hill_xr; begin(c); const hit = lb => !clip || !(lb.bb[0] > clip[2] || lb.bb[2] < clip[0] || lb.bb[1] > clip[3] || lb.bb[3] < clip[1]);
  for (const lb of HILL.limbs) if (lb.lvl && hit(lb)) H_hill_limb(c, lb, fine);
  const r = RNG(4500), rf = RNG(4600), X = (u, y) => lerp(xl(y), xr(y), u), flow = (u, y) => Math.atan2(8, X(u, y + 4) - X(u, y - 4)) + .1 * Math.sin(y / 70 + u * 4);
  const tv = (u, y, x) => .15 + .1 * Math.exp(-Math.pow(u / .06, 2)) + .36 * smooth((u - .24) / .66) + .16 * fbm2(x / 40, y / 70, 5, 2) - .08 * ss(-110, -260, y);
  // roots gripping the plateau (their feet disappear into the main-layer grass)
  c.globalAlpha = 1; for (const [P, w0, w1, lit] of [[[[3104, -56], [3150, -30], [3176, 2], [3232, 16]], 46, 8, .36], [[[2992, -64], [2984, -30], [2972, 0], [2958, 30]], 52, 24, .2], [[[3050, -54], [3066, -24], [3084, 4], [3100, 30]], 38, 14, .3]]) { const pts = bez(P[0], P[1], P[2], P[3], 12), wf = t => lerp(w0, w1, t); H_hill_tube(c, pts, wf, '#1c1930', 1.2); H_hill_tube(c, pts, wf, cramp(BK, lit)); }
  c.fillStyle = css(cramp(BK, .24)); c.beginPath(); c.moveTo(xl(34), 34); for (let y = 34; y >= -244; y -= 6) c.lineTo(xl(y), y); c.lineTo(3000, -262); for (let y = -244; y <= 34; y += 6) c.lineTo(xr(y), y); c.closePath(); c.fill();
  // broad form: a cylinder in soft evening shade, light creeping round from the right
  for (let i = 0; i < 1900; i++) { const u = r(), y = 34 - r() * 290; if (y < -160 && r() < (-160 - y) / 110) continue; const x = X(u, y); dab(c, x, y, 16 + r() * 26, 4 + r() * 6, flow(u, y) + (r() - .5) * .2, cjit(cramp(BK, clamp(tv(u, y, x) + (r() - .5) * .14, 0, .78)), r, 6), .8); }
  // the great limbs rise out of the trunk as fused stems
  for (const lb of HILL.limbs) if (!lb.lvl && hit(lb)) H_hill_limb(c, lb, fine);
  // plates of bark standing proud, deep fissures with a lit shoulder on their right, short cross-cracks
  for (let i = 0; i < 520; i++) { const u = .03 + r() * .94, y = 30 - Math.pow(r(), 1.3) * 255, x = X(u, y); dab(c, x, y, 18 + r() * 34, 2 + r() * 2.6, flow(u, y) + (r() - .5) * .12, cjit(cramp(BK, clamp(tv(u, y, x) + .1 + .08 * r(), 0, .8)), r, 5), .5); }
  for (let i = 0; i < 360; i++) { const u = .02 + r() * .96, y0 = 30 - Math.pow(r(), 1.4) * 250, len = (36 + r() * 100) * (y0 < -120 ? .6 : 1), pts = [], thin = r(); if (y0 < -40 && thin < (-40 - y0) / 260) continue; let uu = u; for (let k = 0; k <= 6; k++) { const y = y0 - len * k / 6; uu += (r() - .5) * .028; pts.push([X(uu, y) + 1.5 * vnoise(y / 9 + i, 3), y]); } const w = 1.4 + r() * 2.6;
    ribbon(c, pts, w * .5, w, '#17142a', i, .6, (.5 + .3 * r()) * (y0 < -150 ? .6 : 1)); if (u > .22) ribbon(c, pts.map(p => [p[0] + w * .9 + .8, p[1]]), .8, 1.5, cramp(BK, clamp(tv(u, y0, pts[0][0]) + .22, 0, .9)), i + 500, .5, .5); }
  for (let i = 0; i < 420; i++) { const u = r(), y = 30 - Math.pow(r(), 1.7) * 250, x = X(u, y); dab(c, x, y, 4 + r() * 7, 1 + r() * .9, (r() - .5) * .8, '#1b1830', (.35 + .25 * r()) * clamp(1.2 + y / 220, .3, 1)); }
  if (fine) { for (let i = 0; i < 4200; i++) { const u = rf(), y = 34 - rf() * 250; if (y < -40 && rf() < (-40 - y) / 170) continue; const x = X(u, y), up = rf() < .5; dab(c, x, y, 6 + rf() * 20, .5 + rf() * .8, flow(u, y) + (rf() - .5) * .25, cjit(cramp(BK, clamp(tv(u, y, x) + (up ? .14 : -.13), 0, .85)), rf, 5), .5 + .3 * rf()); }
    for (let i = 0; i < 1500; i++) { const u = rf(), y = 34 - Math.pow(rf(), 1.5) * 240, x = X(u, y); c.globalAlpha = .4 + .3 * rf(); c.fillStyle = css(cjit(cramp(BK, clamp(tv(u, y, x) + (rf() - .5) * .5, 0, .85)), rf, 6)); c.beginPath(); c.ellipse(x, y, .5 + rf() * 1.1, .8 + rf() * 1.8, 0, 0, TAU); c.fill(); } }
  // an old burl and a healed branch scar
  for (const [bx, by, br, sd] of [[2966, -166, 24, 1], [3046, -84, 13, 2]]) { softDab(c, bx - 2, by + 2, br * 1.25, br * 1.05, 0, cramp(BK, .1), .5); c.lineWidth = fine ? 1.1 : 1.8; for (let k = 0; k < (fine ? 8 : 4); k++) { const q = (k + 1.5) / (fine ? 9.5 : 5.5); c.globalAlpha = .5; c.strokeStyle = css(cramp(BK, k & 1 ? .12 : .46)); c.beginPath(); c.ellipse(bx + 2 * vnoise(k + sd, 2), by + 2 * vnoise(k + sd, 4), br * q, br * q * .78, .3 * sd, 0, TAU); c.stroke(); }
    c.globalAlpha = .85; c.fillStyle = '#141226'; c.beginPath(); c.ellipse(bx, by, br * .2, br * .26, .3, 0, TAU); c.fill(); softDab(c, bx + br * .5, by - br * .4, br * .5, br * .4, 0, cramp(BK, .62), .28); }
  // moss on the cool seaward side and round the foot; a little lichen
  const nm = fine ? 2600 : 900; for (let i = 0; i < nm; i++) { const rr = fine ? rf : r, foot = rr() < .34, u = foot ? rr() : Math.pow(rr(), 1.5) * .62, y = foot ? 30 - Math.pow(rr(), 1.6) * 60 : 24 - Math.pow(rr(), 1.5) * 235, x = X(u, y);
    if (rr() > (foot ? 1 : (1 - u / .66) * (1 + y / 250) * 1.5) || fbm2(x / 30, y / 44, 77, 2) < (foot ? -.2 : .04)) continue;
    dab(c, x, y, (fine ? 2.2 : 3.6) + rr() * 5, fine ? 1.1 + rr() * 1.6 : 2.2 + rr() * 2.2, rr() * PI, cjit(cramp(MS, clamp(.06 + .5 * u + .4 * rr() + .25 * fbm2(x / 12, y / 12, 3, 2))), rr, 6), .78); }
  for (let i = 0; i < 22; i++) { const u = .2 + r() * .7, y = -20 - r() * 220, x = X(u, y), s = 4 + r() * 8; softDab(c, x, y, s * 1.3, s, r(), '#8696a0', .14); for (let k = 0; k < (fine ? 7 : 2); k++) { c.globalAlpha = .2; c.fillStyle = css(cjit('#929e9c', r, 9)); c.beginPath(); c.ellipse(x + (r() - .5) * s * 1.6, y + (r() - .5) * s * 1.2, .7 + r() * 1.3, .6 + r(), r(), 0, TAU); c.fill(); } }
  // sun flecks falling through the leaves, the hot rim on the right-hand edge, a breath of sky on the left
  for (let i = 0; i < 14; i++) { const u = .45 + r() * .5, y = 10 - r() * 200; softDab(c, X(u, y), y, 6 + r() * 8, 10 + r() * 16, .1, '#d8a878', .08 + .1 * r()); }
  for (let y = 30; y > -236; y -= fine ? 1.8 : 3.2) { const k = vnoise(y / 19, 3) + .5 * vnoise(y / 5, 6), q = r(), q2 = r(), q3 = r(); if (k < -.12) continue; const x = xr(y); softDab(c, x - 7, y, 9, 7, 0, '#c07c50', .1); dab(c, x - 1.2 - q * 3.4, y, 5 + q2 * 9, (fine ? .7 : 1.2) + q3 * 1.3, flow(1, y), cjit('#f2b876', r, 8), .35 + .45 * q2); }
  for (let y = 30; y > -240; y -= 5) dab(c, xl(y) + 2 + r() * 3, y, 9 + r() * 8, 2 + r() * 1.5, flow(0, y), '#5868a0', .14 + .16 * r());
  end(c); }
// the bench, seen from its end: weathered sea-green paint flaking to silver wood, A + L cut into the side board
function H_hill_bench(c, fine) { const r = RNG(351), teal = ['#324c5c', '#507682', '#769e96', '#a2c2ae', '#d6dcbe'], wood = ['#42394a', '#6e5f68', '#9e8c7c', '#c8b592', '#ead8ae']; begin(c);
  const plank = (ax, ay, bx, by, w, sd, lit) => { const L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax), nx = -Math.sin(ang), ny = Math.cos(ang), m = Math.max(2, Math.round(L / 12)), pts = []; for (let i = 0; i <= m; i++) pts.push([lerp(ax, bx, i / m), lerp(ay, by, i / m)]);
    ribbon(c, pts.map(p => [p[0] - 1.4, p[1] + 1.4]), w + 1.4, w + 1.4, '#262340', sd, .3, .85); ribbon(c, pts, w, w, cramp(teal, lit), sd + 1, .3);
    const n = Math.round(L * w / (fine ? 3 : 11)); for (let i = 0; i < n; i++) { const t = r(), a = r() * 2 - 1, x = lerp(ax, bx, t) + nx * a * w * .44, y = lerp(ay, by, t) + ny * a * w * .44, bare = fbm2(x / 8, y / 8, sd, 2) > .1, side = a * (nx * .9 - ny * .3);
      dab(c, x, y, 3 + r() * 8, fine ? .7 + r() * 1.3 : 1.6 + r() * 1.6, ang + (r() - .5) * .16, cjit(cramp(bare ? wood : teal, clamp(lit + .34 * side + (r() - .5) * .3)), r, 7), .78); } };
  const slat = (x, y, w, h, rot, sd) => { c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = 1; c.fillStyle = '#262340'; c.fillRect(-w / 2 - 1.1, -h / 2 - .4, w + 1.9, h + 1.9); c.fillStyle = css(cramp(wood, .5)); c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = css(cramp(teal, .72)); c.fillRect(-w / 2, -h / 2, w, Math.min(1.8, h * .25));
    c.lineWidth = fine ? .6 : 1; for (let k = 0; k < (fine ? 5 : 2); k++) { c.globalAlpha = .5; c.strokeStyle = css(cramp(wood, k & 1 ? .22 : .78)); c.beginPath(); c.ellipse((hash(sd + k) - .5) * w * .3, h * .9, w * (.2 + .13 * k), h * (.5 + .2 * k), 0, PI, TAU); c.stroke(); }
    for (let k = 0; k < (fine ? 26 : 8); k++) { c.globalAlpha = .55; c.fillStyle = css(cjit(cramp(r() < .3 ? teal : wood, .3 + .6 * r()), r, 8)); c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1 + r() * 2, .7 + r()); }
    c.globalAlpha = .7; c.fillStyle = '#f0cc98'; c.fillRect(w / 2 - 1.2, -h / 2, 1.2, h); c.restore(); };
  softDab(c, 3112, 4, 74, 9, 0, '#34366e', .5);
  for (let i = 0; i < 3; i++) { const t = .6 + i * .155, x = lerp(3165, 3181, t) - 9.2, y = lerp(4, -203, t); slat(x, y, 5.2, 24, .078, 40 + i * 5); }   // backrest slats, end on
  plank(3165, 4, 3181, -205, 11.5, 11, .56); plank(3095, 4, 3092, -90, 11.5, 21, .44); plank(3098, -27, 3166, -27, 6.5, 31, .4); plank(3089, -75, 3167, -75, 26, 41, .5);
  for (let i = 0; i < 4; i++) slat(3094 + i * 20.6, -91.5 + (hash(i + 9) - .5) * 1.2, 18.4, 7.4, (hash(i + 3) - .5) * .05, i * 5);
  // the initials
  const [bx0, by0, bx1, by1] = HILL.bench.board, tw = letterWidth('A + L', 13, .9), tx = (bx0 + bx1) / 2 - tw / 2, ty = (by0 + by1) / 2 - 6.5;
  lettering(c, 'A + L', tx, ty, 13, { col: '#262340', wt: 2.3, seed: 7, wob: 1.1, track: .9, alpha: .92 }); lettering(c, 'A + L', tx + 1, ty + 1, 13, { col: '#efe3c6', wt: .8, seed: 7, wob: 1.1, track: .9, alpha: .6 });
  if (fine) for (const [x, y] of [[3093, -84], [3093, -66], [3163, -84], [3163, -66], [3098, -27], [3168, -27]]) { c.globalAlpha = .85; c.fillStyle = '#262340'; c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill(); dab(c, x + .3, y + 4, 6, .9, PI / 2, '#8a5a48', .45); c.globalAlpha = .7; c.fillStyle = '#d9c8b0'; c.beginPath(); c.arc(x + .4, y - .4, .45, 0, TAU); c.fill(); }
  for (let y = 0; y > -203; y -= 3) { if (vnoise(y / 17, 8) < -.2) continue; const x = lerp(3165, 3181, -y / 209) + 5; dab(c, x, y, 5 + r() * 5, 1 + r() * .8, PI / 2 - .08, '#f6cc94', .55 + .3 * r()); }
  end(c); }

SETS.hill = { name: 'hill', ground: hillY, layers: [], bake(step = () => {}) { const S = this, HH = HILL, G = HH.greens, gy = hillY, hz = HH.hz, sunL = { lx: .7, ly: -.72 }, shade = H_hill_shade; S.layers = []; H_hill_build();
  // ── 0 sky: still blue overhead, peach at the horizon, the glow gathering low on the right
  { const L = newLayer('sky', 0, -1300, -760, 1300, 760, .5), c = L.ctx, ramp = ['#30528a', '#39619c', '#4c7aae', '#6c97be', '#96b4ca', '#bccacb', '#dad3c2', '#ecccac', '#f2c19c', '#efb795'];
    wash(c, -1300, -760, 2600, 1520, (u, v) => { const t = Math.pow(clamp(v * 1520 / 900), 1.2); return cmix(cramp(ramp, t), '#ffd7a2', .26 * clamp(u * 1.5 - .55) * clamp(t * 1.6 - .5)); }, { seed: 211, cell: 40, blots: 420, blotSize: 190, strokes: 1700, len: 160, wid: 18, jit: 5 });
    begin(c); const r = RNG(212); for (let i = 0; i < 150; i++) { const x = -1300 + r() * 2600, y = -640 + r() * r() * 520, warm = r() < .3 + .4 * (x + 1300) / 2600; softDab(c, x, y, 160 + r() * 300, 4 + r() * 8, -.07 + (r() - .5) * .04, cjit(warm ? '#f2d6c6' : '#cbdcea', r, 6), .06 + .1 * r()); }
    for (let i = 0; i < 70; i++) softDab(c, 500 + r() * 800, -80 + r() * 260, 260 + r() * 220, 60 + r() * 60, 0, '#ffdcaa', .11);
    for (let i = 0; i < 200; i++) softDab(c, -1300 + r() * 2600, 70 + r() * 60, 160 + r() * 200, 9 + r() * 10, 0, cjit('#f6cfae', r, 6), .12); end(c); S.layers.push(L); } step();
  // ── 1 clouds: one towering cumulus over the sea, lit peach from the right, blue-violet on its seaward side (two bakes, cross-faded)
  { const far = { deep: '#93a2c8', shadow: '#b1bad8', mid: '#dad2dc', light: '#f4dfc8', hi: '#fbe8d2' }, P = HH.cloud;
    const mkC = v => { const L = newLayer('clouds', .05, -1250, -640, 1550, 170, .7), c = L.ctx, r = RNG(221);
      for (let i = 0; i < 13; i++) cumulus(c, -1220 + i * 220 + r() * 90, 101 - r() * 8, 170 + r() * 190, 46 + r() * 66, far, 2300 + i, v, { density: .8, lx: .7, ly: -.72 });
      cumulus(c, -880, 100, 400, 270, far, 233, v, sunL); cumulus(c, -450, 98, 700, 640, P, 231, v, { lx: .7, ly: -.72, density: 1.12 }); cumulus(c, 190, 100, 360, 210, far, 235, v, sunL); cumulus(c, 1130, 100, 600, 400, P, 237, v, sunL);
      begin(c); for (let i = 0; i < 70; i++) softDab(c, -1250 + r() * 2800, 104 + r() * 36, 150 + r() * 160, 18 + r() * 14, 0, '#efd6c2', .34); end(c); return L; };
    const A = mkC(0), B = mkC(1); A.alt = B.cv; A.boil = .06; S.layers.push(A); } step();
  // ── 2 far: the evening sea, the cape and the small white Launch Tower
  { const L = newLayer('far', .1, -1100, -330, 1600, 520, .75), c = L.ctx, r = RNG(242);
    paintMass(c, { x0: -1100, x1: 1600, top: () => hz, bot: 520, ramp: HH.sea, baseT: .5, seed: 241, n: 8500, len: 34, wid: 5, dir: 0, wobble: .12, sc: 240, nz: .32, light: (x, y) => (y - hz) / 440 * .9 - .44, size: (x, y) => .35 + (y - hz) / 170, edge: 0, blots: 200, blotSize: 110, jit: 5 });
    begin(c); for (let i = 0; i < 700; i++) { const y = hz + 2 + Math.pow(r(), 1.8) * 200, x = 1180 + (r() - .5) * (520 + (y - hz) * 5); dab(c, x, y, 9 + (y - hz) * .2, 1.2 + (y - hz) * .014, 0, cjit(r() < .6 ? '#fbd9ae' : '#ffeccc', r, 6), .22 + .4 * r()); }
    for (let i = 0; i < 300; i++) softDab(c, -1100 + r() * 2700, hz + 3 + r() * 9, 60 + r() * 90, 5, 0, cjit('#ecdccc', r, 5), .32);
    for (let i = 0; i < 260; i++) { const y = hz + 20 + r() * 380; dab(c, -1100 + r() * 2700, y, 40 + r() * 90, 1.4 + (y - hz) * .008, 0, cjit('#31557c', r, 6), .2); } end(c);
    // a pale shore far across the water and two blue islets
    const sh2 = x => hz - 2 - 44 * smooth((x - 620) / 700) - 16 * Math.exp(-Math.pow((x - 1250) / 160, 2)) + 3 * fbm(x / 60, 5);
    paintMass(c, { x0: 560, x1: 1600, top: sh2, bot: hz + 2, ramp: ['#a4b6cc', '#b6c4cf', '#cdd2cc', '#e6d8c2'], seed: 243, n: 900, len: 13, wid: 4, light: (x, y) => .2, jit: 4 });
    const isl = x => hz - 2 - 22 * Math.exp(-Math.pow((x - 150) / 90, 2)) - 9 * Math.exp(-Math.pow((x - 300) / 40, 2)) + 1.5 * vnoise(x / 18, 3);
    paintMass(c, { x0: 20, x1: 380, top: isl, bot: hz + 1, ramp: ['#92a8c2', '#a6bac8', '#c0cec8'], seed: 244, n: 300, len: 10, wid: 3.5, edge: 0 });
    // the cape, running in from the left
    const head = x => hz + 5 - (92 * smooth((-330 - x) / 430) + 26 * Math.exp(-Math.pow((x + 600) / 120, 2))) * (1 - .2 * smooth((-700 - x) / 400)) + 7 * fbm(x / 80, 5);
    L.headY = head; paintMass(c, { x0: -1100, x1: -290, top: head, bot: hz + 9, ramp: ['#6a879e', '#819fa6', '#9db8a8', '#c0cdac', '#e4d8b2'], seed: 245, n: 4200, len: 14, wid: 5, sc: 120, dir: () => .2, light: (x, y) => .22 * (1 - (y - head(x)) / 80) + .1 * smooth((x + 800) / 500), jit: 5, edgeStep: 5 });
    begin(c); for (let i = 0; i < 700; i++) { const x = -1100 + r() * 800, t = head(x), y = hz + 7 - r() * Math.min(40, (hz - t) * .5); if (y < t + 6) continue; dab(c, x, y, 5 + r() * 11, 3 + r() * 3, PI / 2 + (r() - .5) * .3, cjit(r() < .3 ? '#bcb2cc' : '#ead8c0', r, 5), .6); }
    for (let i = 0; i < 160; i++) softDab(c, -1100 + r() * 820, hz + 8 + r() * 3, 14 + r() * 26, 2.4, 0, '#f2f0e4', .65); end(c);
    for (let i = 0; i < 16; i++) { const x = -1080 + r() * 700, y = head(x) + 4 + r() * 16; if (Math.abs(x - HH.towerX) < 40) continue; H_hill_clump(c, x, y - 7, 10 + r() * 15, 7 + r() * 7, ['#486f80', '#58837e', '#779f86', '#a3bd92', '#c6cf9e'], 2440 + i, 54, { dab: 3 }); }
    // the Launch Tower (far away now: small, slim, white against the cloud's blue flank)
    { const tx = HH.towerX, tb = head(tx) + 4, th = 96; HH.towerTip = [tx, tb - th - 16]; begin(c);
      c.fillStyle = '#e6dbd0'; c.beginPath(); c.moveTo(tx - 8.5, tb); c.lineTo(tx - 5, tb - th); c.lineTo(tx + 5, tb - th); c.lineTo(tx + 8.5, tb); c.fill();
      for (let i = 0; i < 200; i++) { const v = r(), u = r(), w = lerp(8.5, 5, v); dab(c, tx + (u * 2 - 1) * w, tb - v * th, 4 + r() * 4, 2, PI / 2 + (r() - .5) * .2, cjit(cramp(['#a09ecb', '#c6c0dc', '#f2e2d0', '#ffefd8'], u * .9 + .1 * r()), r, 5), .85); }
      for (const v of [.3, .62]) { c.globalAlpha = .85; c.fillStyle = '#c05540'; c.fillRect(tx - lerp(8.5, 5, v) - .4, tb - v * th - 3.5, lerp(8.5, 5, v) * 2 + .8, 6.5); }
      c.globalAlpha = 1; c.fillStyle = '#4a4668'; c.fillRect(tx - 8, tb - th - 2, 16, 2.6); c.fillStyle = '#f0e0bc'; c.fillRect(tx - 4.2, tb - th - 10.5, 8.4, 8.6); c.fillStyle = '#86b0c6'; c.fillRect(tx - 2.8, tb - th - 9, 2.1, 6.2); c.fillRect(tx + .7, tb - th - 9, 2.1, 6.2);
      c.fillStyle = '#c05540'; c.beginPath(); c.moveTo(tx - 6.4, tb - th - 10.5); c.lineTo(tx, tb - th - 18); c.lineTo(tx + 6.4, tb - th - 10.5); c.fill(); ribbon(c, [[tx, tb - th - 18], [tx, tb - th - 23]], 1, .8, '#4a4668');
      c.fillStyle = '#5b5a80'; for (const v of [.18, .47, .8]) c.fillRect(tx - 1, tb - v * th - 3, 2, 3.6);
      c.fillStyle = '#eadfca'; c.fillRect(tx + 10, tb - 9, 14, 8.5); c.fillStyle = '#c05540'; c.beginPath(); c.moveTo(tx + 8, tb - 9); c.lineTo(tx + 17, tb - 15); c.lineTo(tx + 26, tb - 9); c.fill(); dab(c, tx + 7.4, tb - th * .5, th * .9, 1.3, PI / 2 + .036, '#ffe6c0', .8); end(c); }
    begin(c); for (const [x, y, s] of [[-140, hz + 30, .9], [420, hz + 14, .55], [900, hz + 70, 1.5]]) { c.globalAlpha = .95; c.fillStyle = '#f8e6cc'; c.beginPath(); c.moveTo(x, y - 20 * s); c.lineTo(x + 9 * s, y - 2 * s); c.lineTo(x - 1 * s, y - 2 * s); c.fill(); c.fillStyle = '#c4bcd8'; c.beginPath(); c.moveTo(x - 2 * s, y - 16 * s); c.lineTo(x - 2 * s, y - 2 * s); c.lineTo(x - 8 * s, y - 2 * s); c.fill(); c.fillStyle = '#6a5048'; c.fillRect(x - 9 * s, y - 2 * s, 20 * s, 3 * s); softDab(c, x, y + 4 * s, 16 * s, 2.5 * s, 0, '#e6ece6', .55); } end(c);
    L.live = (ctx, f, env) => { liveGlints(ctx, f, { n: 300, x0: 500, x1: 1600, y0: hz + 3, y1: hz + 230, seed: 21, alpha: .7, col: '#ffe9c4', w: (x, y) => Math.exp(-Math.pow((x - 1180) / (250 + (y - hz) * 2.2), 2)) + .1 }); liveGlints(ctx, f, { n: 170, x0: -1100, x1: 1600, y0: hz + 4, y1: hz + 320, seed: 27, alpha: .32, col: '#f6ead8' });
      liveGulls(ctx, f, { n: 6, x: -300, y: hz - 120, w: 760, h: 150, s: .8, col: '#f8ecdc' }); drawLaunches(ctx, f, HH.towerTip[0], HH.towerTip[1], .8, env.launch || {}); };
    S.layers.push(L); } step();
  // ── 3 far hills: low coast on the left, pale inland ridges climbing to the right
  { const L = newLayer('hills', .22, -950, -200, 1950, 700, .75), c = L.ctx, r = RNG(252);
    const ht = x => 168 - 215 * smooth((x - 60) / 1500) + 26 * fbm(x / 420 + 1.3, 2, 3) + 6 * fbm(x / 55, 8);
    paintMass(c, { x0: -950, x1: 1950, top: ht, bot: 700, ramp: HH.far, seed: 251, n: 16000, len: 18, wid: 6, sc: 200, dir: (x, y) => .12 * Math.sin(x / 300), light: (x, y) => .26 * clamp(1 - (y - ht(x)) / 150) - .14 + .1 * smooth((x - 600) / 900), jit: 5 });
    begin(c); for (let i = 0; i < 90; i++) { const x = -950 + r() * 2900, y = ht(x) + 26 + r() * 190, w = 46 + r() * 100; c.save(); c.translate(x, y); c.transform(1, 0, -.5, .35, 0, 0); c.globalAlpha = .4; c.fillStyle = css(cjit(r.pick(['#d6d8ae', '#b4cba6', '#e2d6ac', '#a2bfb0', '#c9c2b8']), r, 6)); c.fillRect(-w / 2, -w / 3, w, w * .66); c.restore(); }
    for (let i = 0; i < 9; i++) { const x = -950 + r() * 2900, y = ht(x) + 22 + r() * 120, s = .6 + r() * .4; c.globalAlpha = .8; c.fillStyle = '#eadcc8'; c.fillRect(x - 5 * s, y - 6 * s, 10 * s, 6 * s); c.fillStyle = '#a79cc4'; c.fillRect(x - 5 * s, y - 6 * s, 3.4 * s, 6 * s); c.fillStyle = '#b06c5c'; c.beginPath(); c.moveTo(x - 6 * s, y - 6 * s); c.lineTo(x, y - 10.5 * s); c.lineTo(x + 6 * s, y - 6 * s); c.fill(); } end(c);
    // woods and hedgerows: small, soft, kept close in value (far things do not shout)
    for (let i = 0; i < 34; i++) { const x0 = -950 + r() * 2900, y0 = ht(x0) + 6 + r() * r() * 180, n = 3 + (r() * 7 | 0), sl = (r() - .5) * .5; for (let k = 0; k < n; k++) { const x = x0 + k * (9 + r() * 6), y = y0 + k * sl * 8 + (r() - .5) * 4, s = .5 + (y - ht(x)) / 240; if (y < ht(x) + 3) continue; H_hill_clump(c, x, y - 6 * s, (7 + r() * 8) * s, (6 + r() * 5) * s, ['#7896a6', '#86a6a8', '#9ab6aa', '#b4c6ae', '#cad2b2'], 2520 + i * 11 + k, 22, { dab: 3 * s }); } }
    S.layers.push(L); } step();
  // ── 4 the town, far below now, by its little harbour
  { const L = newLayer('town', .35, -750, 60, 2300, 780, .8), c = L.ctx, r = RNG(261), WL = 236, TX = 70;
    paintMass(c, { x0: -750, x1: 60, top: () => WL, bot: 420, ramp: HH.sea, baseT: .4, seed: 262, n: 1500, len: 22, wid: 3.4, dir: 0, wobble: .1, light: (x, y) => (y - WL) / 200 - .2, edge: 0, jit: 5 });
    const tt = x => 168 + 110 * (1 - Math.exp(-Math.pow((x - TX) / 330, 2))) + (x < TX - 250 ? 70 * smooth((TX - 250 - x) / 180) : 0) + 8 * fbm(x / 80, 6), ramp = ['#35685e', '#4c8468', '#6ea070', '#9bba7c', '#c8cf90'];
    paintMass(c, { x0: -750, x1: 2300, top: tt, bot: 780, ramp, seed: 263, n: 13000, len: 17, wid: 6, sc: 170, dir: (x, y) => .15 * Math.sin(x / 200), light: (x, y) => .24 * clamp(1 - (y - tt(x)) / 130) - .1, jit: 6 });
    begin(c); c.fillStyle = '#e0d0b6'; c.globalAlpha = 1; c.fillRect(TX - 470, WL - 5, 230, 7); for (let i = 0; i < 150; i++) dab(c, TX - 470 + r() * 230, WL - 3 + r() * 5, 6, 2.2, 0, cjit(r() < .4 ? '#b0a2c0' : '#ecdcc0', r, 6), .8);
    for (let i = 0; i < 6; i++) { const x = TX - 660 + i * 62 + r() * 20, y = WL + 12 + r() * 30, s = .6 + r() * .4; c.globalAlpha = 1; c.fillStyle = css(r.pick(['#c05540', '#efe2c8', '#2f6888', '#d99c40', '#f0eadc'])); c.beginPath(); c.moveTo(x - 12 * s, y - 3 * s); c.lineTo(x + 13 * s, y - 3 * s); c.lineTo(x + 9 * s, y + 3 * s); c.lineTo(x - 9 * s, y + 3 * s); c.fill(); ribbon(c, [[x, y - 3 * s], [x + 1, y - 19 * s]], 1.2, .8, '#5f4c48'); softDab(c, x, y + 5 * s, 15 * s, 2.2 * s, 0, '#dfeae4', .5); }
    const hs = []; for (let i = 0; i < 70; i++) { const x = TX - 230 + r() * 520 + (r() - .5) * 60, lvl = r(), y = tt(x) + 12 + Math.pow(lvl, .85) * 110; hs.push({ x, y, w: 20 + r() * 22, h: 15 + r() * 18, k: r(), q: r(), s: .7 + lvl * .3 }); }
    hs.push({ x: TX - 20, y: tt(TX - 20) + 24, w: 15, h: 62, k: .02, q: .2, s: 1, tower: 1 }); hs.sort((a, b) => a.y - b.y);
    for (const h of hs) { const w = h.w * h.s, hh = h.h * h.s, x = h.x, y = h.y, wall = cjit(r.pick(['#f0dfc2', '#ecd4b4', '#f3e8d2', '#e8cba8', '#ecd8ca']), r, 6), roofC = h.k < .7 ? r.pick(['#b85440', '#ae4a36', '#c4684a', '#a04836']) : r.pick(['#cc9a44', '#bd8a3c']);
      c.globalAlpha = 1; c.fillStyle = css(wall); c.fillRect(x - w / 2, y - hh, w, hh); c.fillStyle = css(cmix(wall, '#8f88c0', .55)); c.fillRect(x - w / 2, y - hh, w * .42, hh);
      for (let i = 0; i < 18; i++) { const u = r(), v = r(); dab(c, x - w / 2 + u * w, y - hh + v * hh, 4.5, 2.2, PI / 2, cjit(u < .42 ? cmix(wall, '#8f88c0', .55) : cmix(wall, '#ffe9c0', .35), r, 6), .7); }
      const rh = (h.tower ? 13 : 6 + h.q * 7) * h.s, ov = 2.4 * h.s; c.globalAlpha = 1; c.fillStyle = css(roofC); c.beginPath(); if (h.tower || h.q < .5) { c.moveTo(x - w / 2 - ov, y - hh); c.lineTo(x, y - hh - rh * 1.4); c.lineTo(x + w / 2 + ov, y - hh); } else { c.moveTo(x - w / 2 - ov, y - hh); c.lineTo(x - w / 2 + rh * .7, y - hh - rh); c.lineTo(x + w / 2 - rh * .2, y - hh - rh); c.lineTo(x + w / 2 + ov, y - hh); } c.fill();
      for (let i = 0; i < 12; i++) { const u = r(), v = r() * .9; dab(c, x - w / 2 + u * w, y - hh - v * rh * (1 - Math.abs(u - .5) * (h.q < .5 ? 2 : .6)), 4, 1.8, .1, cjit(cmix(roofC, u > .5 ? '#f4c690' : '#5f3558', .34 * r()), r, 8), .85); }
      softDab(c, x - w * .3, y + 1, w * .8, 3, 0, '#3f3a70', .4); const nw = h.tower ? 1 : Math.max(1, Math.round(w / 13)); for (let i = 0; i < nw; i++) { c.globalAlpha = .85; c.fillStyle = '#52557c'; c.fillRect(x - w / 2 + (i + .5) * w / nw - 1.6 * h.s, y - hh * (h.tower ? .78 : .58) - 2.6 * h.s, 3.2 * h.s, 5.2 * h.s); } }
    end(c); for (let i = 0; i < 44; i++) { const a = r.pick(hs), x = a.x + (r() - .5) * 64, y = a.y + 2 + r() * 8; H_hill_clump(c, x, y - 8, 7 + r() * 8, 7 + r() * 6, ['#20524a', '#306e52', '#52905a', '#88b468', '#b6c878'], 2640 + i, 40, { dab: 2.8 }); }
    for (let i = 0; i < 110; i++) { const x = -750 + r() * 3050; if (x > TX - 250 && x < TX + 310) continue; const y = tt(x) + 4 + r() * r() * 150, s = .6 + (y - tt(x)) / 200; if (r() < .22) H_hill_clump(c, x, y - 24 * s, 6.5 * s, 24 * s, ['#1e4844', '#285c4a', '#387250', '#538c5a', '#74a064'], 2700 + i, 60, { dab: 3.2 }); else H_hill_clump(c, x, y - 12 * s, (14 + r() * 16) * s, (11 + r() * 9) * s, ['#27604e', '#3c7c58', '#609c62', '#92ba70', '#bccc82'], 2700 + i, 54); }
    S.layers.push(L); } step();
  // ── 5 mid: the wooded shoulder of the hill, falling away seaward
  { const L = newLayer('mid', .6, -300, 20, 3100, 800, .8, { ground: { y: 320, h: 320, shadow: .9, wind: .6, wy: 280, wh: 110, seed: 17 } }), c = L.ctx, r = RNG(271), M = G.map(q => cmix(q, '#86a8be', .3));
    const mt = x => 345 - 240 * smooth((x + 300) / 1800) + 22 * fbm(x / 360 + 5.1, 4, 3) + 5 * fbm(x / 50, 9); L.midY = mt;
    paintMass(c, { x0: -300, x1: 3100, top: mt, bot: 800, ramp: M, baseT: .42, seed: 272, n: 20000, len: 19, wid: 6.5, sc: 190, dir: (x, y) => -1.2 + .2 * Math.sin(x / 130), light: (x, y) => .28 * clamp(1 - (y - mt(x)) / 120) - .1 - .12 * clamp((y - mt(x) - 150) / 250), jit: 7, wobble: .8 });
    blades(c, { seed: 273, n: 7000, x0: -300, x1: 3100, y: mt, depth: 300, h: 15, wid: 1.8, ramp: M, baseT: .55, sc: 150, size: (x, y, d) => .6 + d * .9 });
    flowers(c, { seed: 274, n: 1500, x0: -300, x1: 3100, y: x => mt(x) + 20, depth: 280, cols: ['#f4eedc', '#ead47a', '#f4eedc', '#d9a0b0'], s: 2, clusterSc: 240, thresh: .1, size: (x, y, d) => .6 + d });
    const T1 = ['#1b4850', '#27605a', '#3f7c62', '#6a9c6c', '#9cb87a', '#c8cc8c'], T2 = ['#173e4c', '#1f5252', '#2c6858', '#448060', '#62966a', '#86a874'];
    for (let i = 0; i < 190; i++) { const x = -300 + r() * 3400, t = mt(x), y = t + 2 + r() * r() * 190, s = .7 + (y - t) / 210;
      if (r() < .2) { ribbon(c, [[x, y], [x, y - 20 * s]], 3 * s, 2 * s, '#352c44'); H_hill_clump(c, x, y - 46 * s, 9 * s, 36 * s, T2, 2710 + i, 110, { dab: 3.6 * s }); }
      else { const R0 = (22 + r() * 24) * s; ribbon(c, [[x, y], [x - 2, y - R0 * .9]], 5 * s, 3 * s, '#433448'); softDab(c, x - R0 * .9, y + 2, R0 * 1.5, R0 * .22, 0, '#27365e', .4); const m = 3 + (r() * 3 | 0); for (let k = 0; k < m; k++) H_hill_clump(c, x + (r() - .5) * R0 * 1.3, y - R0 * (.9 + r() * .8), R0 * (.6 + r() * .4), R0 * (.5 + r() * .3), T1, 27100 + i * 9 + k, 84, { dab: 4 * s }); } }
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * .6 * zl)) / zl, xb = xa + W / zl; liveGrass(ctx, f, { xa, xb, spacing: 10, y: x => mt(x) + 6, depth: 200, rows: 4, h: 15, wid: 1.9, ramp: M, baseT: .6, px: .6, seed: 14, size: d => .6 + d, tipLight: .4, gap: .3 }); };
    S.layers.push(L); } step();
  // ── 6 back: the far lip of the hilltop — a quiet swell of paler grass against the sky
  { const L = newLayer('back', .85, 150, -220, 3900, 720, .8, { ground: { y: 80, h: 300, shadow: .8, wind: .8, wy: 20, wh: 90, seed: 23 } }), c = L.ctx, r = RNG(275), Bk = G.map(q => cmix(q, '#8ea8bc', .2));
    const bt = x => .92 * hillY(x / .85 + 60) - 28 + 7 * fbm(x / 150, 5, 3) + 3 * vnoise(x / 30, 2) - 24 * Math.exp(-Math.pow((x - 3380) / 280, 2)); L.backY = bt;
    paintMass(c, { x0: 150, x1: 3900, top: bt, bot: 720, ramp: Bk, baseT: .42, seed: 276, n: 22000, len: 22, wid: 6.5, sc: 180, dir: -1.25, wobble: .8, light: (x, y) => .3 * clamp(1 - (y - bt(x)) / 70) - .08 - .16 * clamp((y - bt(x) - 80) / 300) + .08 * smooth((x - 2900) / 500) - .3 * smooth((x - 3100) / 450), jit: 7, edgeStep: 5 });
    blades(c, { seed: 277, n: 15000, x0: 150, x1: 3900, y: x => bt(x) + 2, depth: 330, bias: 1.6, h: 30, wid: 2, ramp: Bk, baseT: .54, sc: 140, size: (x, y, d) => .7 + d * .8, light: (x, y) => -.3 * smooth((x - 3100) / 450) });
    blades(c, { seed: 278, n: 3200, x0: 150, x1: 3250, y: x => bt(x) + 1, depth: 6, h: 26, wid: 1.6, ramp: ['#9cb074', '#cdc68e', '#ead9a2'], baseT: .6 });
    flowers(c, { seed: 279, n: 2200, x0: 150, x1: 3900, y: x => bt(x) + 12, depth: 300, cols: ['#f0ead8', '#f0ead8', '#e4ce78', '#d898a6', '#b4a0d4'], s: 2.4, clusterSc: 260, thresh: .08, size: (x, y, d) => .6 + d });
    for (const [x, s, k] of [[640, .9, 0], [1180, 1.1, 0], [1520, .8, 0], [2360, .8, 0], [3330, 1.15, 1], [3560, 1.5, 2], [3760, 1, 0], [2060, .7, 0]]) { const y = bt(x) + 10, T1 = ['#1a444c', '#265c54', '#3c785a', '#689860', '#a0b66e', '#d2cc86'];
      softDab(c, x - 60 * s, y + 4, 80 * s, 9 * s, 0, '#2c3a6c', .42);
      if (k === 2) { ribbon(c, bez([x, y], [x - 4, y - 30], [x - 16, y - 54], [x - 26, y - 84], 8), 9 * s, 4 * s, '#3a3048', 5, 1); ribbon(c, bez([x - 8, y - 40], [x + 6, y - 56], [x + 18, y - 64], [x + 34, y - 78], 6), 5 * s, 2 * s, '#3a3048', 6, 1); for (const [dx, dy, rx] of [[-40, -96, 46], [8, -104, 40], [-74, -78, 34], [40, -84, 30], [-16, -124, 34]]) H_hill_clump(c, x + dx * s, y + dy * s, rx * s, rx * .66 * s, T1, 2790 + dx, 90, { dab: 4.2 }); }
      else { const m = k ? 4 : 3; for (let q = 0; q < m; q++) H_hill_clump(c, x + (q - m / 2 + .5) * 24 * s + (r() - .5) * 10, y - (12 + r() * 12) * s, (22 + r() * 12) * s, (15 + r() * 8) * s, T1, 2780 + x + q, 80, { dab: 3.8 }); } }
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * .85 * zl)) / zl, xb = xa + W / zl; liveGrass(ctx, f, { xa, xb, spacing: 9, y: x => bt(x) + 5, depth: 120, rows: 4, h: 30, wid: 2.1, ramp: Bk, baseT: .58, px: .85, seed: 24, size: d => .7 + d * .6, tipLight: .45, gap: .25, heads: .08 }); };
    S.layers.push(L); } step();
  // shared ground geometry of the p=1 plane
  const wj = x => ss(600, 780, x), pe = x => 1 - ss(2540, 2760, x), pt = x => gy(x) - lerp(26, 9, wj(x)) + 2 * vnoise(x / 40, 6), pb = x => pt(x) + lerp(82, 40, wj(x)) * pe(x) + 3 * vnoise(x / 55, 8) * pe(x);
  const nearTop = x => Math.max(pb(x) - 3, gy(x) + 2), vt = x => gy(x) - 36 - 12 * Math.abs(fbm(x / 70, 12, 3)) - 5 * vnoise(x / 13, 4), shG = x => shade(x, gy(x) + 6), SK = .5;
  HH.pathTop = pt; HH.pathBot = pb;
  // ── 7 verge: knee-high grass standing BEHIND the path, the hero and the trunk
  { const L = newLayer('verge', 1, 380, -130, 4320, 470, 1), c = L.ctx, r = RNG(281), X0 = 380, X1 = 4320;
    paintMass(c, { x0: X0, x1: X1, top: vt, bot: x => gy(x) + 4, ramp: G, baseT: .4, seed: 282, n: 9000, len: 15, wid: 5, sc: 120, dir: -1.35, wobble: .7, light: (x, y) => .24 * clamp(1 - (y - vt(x)) / 30) - SK * shG(x), jit: 8 });
    blades(c, { seed: 283, n: 12000, x0: X0, x1: X1, y: x => vt(x) + 8, depth: 34, h: 34, wid: 2.2, ramp: G, baseT: .52, sc: 110, light: (x, y) => -SK * shG(x) });
    blades(c, { seed: 284, n: 2600, x0: X0, x1: X1, y: x => vt(x) + 5, depth: 8, h: 38, wid: 1.7, ramp: ['#5e8c54', '#96ab62', '#cbc384', '#ecd898'], baseT: .62, light: (x, y) => -.7 * shG(x) });
    H_hill_flowers(c, { seed: 285, n: 1700, x0: X0, x1: X1, y: x => vt(x) + 4, depth: 34, cols: ['#f2ecda', '#f2ecda', '#e8cc68', '#de96a2', '#b8a2da'], s: 3, clusterSc: 220, thresh: .04 });
    begin(c); for (let i = 0; i < 16; i++) { const x = X0 + r() * (X1 - X0), y = vt(x) + 16 + r() * 16, h = 46 + r() * 26; H_hill_clock(c, x, y, x + (.1 + r() * .2) * h, y - h, .9 + r() * .4, shG(x)); }
    for (let i = 0; i < 500; i++) { const x = X0 + r() * (X1 - X0), y = vt(x) + 10 + r() * 20, h = 40 + r() * 34, sh = shG(x), tx = x + (.15 + r() * .25) * h; c.globalAlpha = .9; c.strokeStyle = css(cmix('#b4ba78', '#34525c', .66 * sh)); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - h * .6, tx, y - h); c.stroke(); c.fillStyle = css(cmix('#e2d49e', '#4e6096', .62 * sh)); c.beginPath(); c.ellipse(tx, y - h, 2.4, 6, .3, 0, TAU); c.fill(); } end(c);
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * zl)) / zl, xb = xa + W / zl; H_hill_grass(ctx, f, { xa, xb, spacing: 8, y: x => vt(x) + 14, depth: 22, rows: 2, h: 52, wid: 2.3, ramp: G, baseT: .58, seed: 31, tipLight: .45, heads: .09, flowers: .045, flowerS: 4, flowerCols: ['#f2ecda', '#e8cc68', '#de96a2'], clocks: .006, sh: (x, y) => shG(x), gap: .25 }); };
    S.layers.push(L); } step();
  // ── 8 tree: the shadowed heart of the canopy, the great limbs, the trunk
  { const L = newLayer('tree', 1, 2200, -1220, 3850, 40, 1), c = L.ctx, DK = ['#0b2230', '#102e36', '#163e3c', '#205042', '#2e6448', '#40784e'], r = RNG(291); begin(c);
    for (const b of HH.boughs) { H_hill_clump(c, b.cx, b.cy + b.ry * .06, b.rx * .9, b.ry * .7, DK, 5000 + b.cx, 96, { lx: .85, ly: -.3, dab: 6.5 }); for (let k = 0; k < 3; k++) H_hill_clump(c, b.cx + (k - 1) * b.rx * .55, b.cy + b.ry * (-.12 + .2 * r()), b.rx * .4, b.ry * .42, DK, 5100 + b.cx + k, 50, { lx: .85, ly: -.3, dab: 6 }); }
    for (const [x, y, rx, ry] of [[2900, -700, 230, 130], [3180, -720, 240, 150], [3120, -900, 260, 120], [2760, -830, 160, 100], [3440, -730, 150, 110], [2620, -720, 120, 80], [3130, -560, 190, 70], [2840, -610, 170, 70]]) H_hill_clump(c, x, y, rx, ry, DK, 5200 + x, 110, { lx: .85, ly: -.3, dab: 6.5 });
    for (let i = 0; i < 260; i++) { const b = r.pick(HH.boughs), a = r() * TAU; softDab(c, b.cx + Math.cos(a) * b.rx * .5, b.cy + b.ry * .2 + Math.sin(a) * b.ry * .4, 30 + r() * 50, 22 + r() * 34, 0, r() < .5 ? '#0a1e2e' : '#183856', .22); } end(c);
    H_hill_wood(c, false, null); S.layers.push(L); } step();
  // ── 9 bark: the close-up patch — trunk, limb bases and bench repainted fine at 2.5×
  { const P = HH.patch, L = newLayer('bark', 1, P[0], P[1], P[2], P[3], 2.5), c = L.ctx; H_hill_wood(c, true, P); H_hill_bench(c, true); S.layers.push(L); } step();
  // ── 10 main: the slope and the plateau — road, worn path, deep grass, the long violet shadow
  { const L = newLayer('main', 1, 380, -120, 4320, 790, 1, { ground: { y: 220, h: 480, shadow: .7, wind: 1, wy: 150, wh: 150, seed: 19 } }), c = L.ctx, r = RNG(301), X0 = 380, X1 = 4320, PE = 2760;
    const gTop = x => x < PE ? pb(x) - 5 : gy(x) - 8 + 2 * vnoise(x / 40, 6), dep = (x, y) => clamp((y - gy(x)) / 620);
    paintMass(c, { x0: X0, x1: X1, top: gTop, bot: 790, ramp: G, baseT: .4, seed: 302, n: 46000, len: 42, wid: 8.5, sc: 260, nz: .5, dir: -1.25, wobble: .8, size: (x, y) => .42 + dep(x, y) * 1.05, light: (x, y) => .16 * clamp(1 - (y - gy(x)) / 200) - .2 * clamp((y - gy(x) - 240) / 420) - SK * shade(x, y) + .08 * smooth((x - 3050) / 300), jit: 8, edgeStep: 4, edgeH: 6, step: 8 });
    // the cream road at the foot and the bicycle path climbing from it
    const cream = ['#77759f', '#9d949e', '#c8b89c', '#e2d2ac', '#f2e4c0', '#faeed0'], pl = (x, y) => -.5 * shade(x, gy(x) + 8);
    paintMass(c, { x0: X0, x1: PE, top: pt, bot: pb, ramp: cream, baseT: .66, seed: 303, n: 12000, len: 28, wid: 4.6, sc: 200, nz: .26, dir: x => slopeOf(gy, x), wobble: .1, light: (x, y) => { const v = (y - pt(x)) / Math.max(8, pb(x) - pt(x)); return .12 * Math.exp(-Math.pow((v - .5) / .22, 2)) - .1 * (v > .84 ? 1 : 0) + pl(x, y); }, jit: 5, edge: 0, blots: 300, blotSize: 60, step: 6 });
    begin(c); for (let i = 0; i < 2300; i++) { const x = X0 + r() * (PE - X0), w = pb(x) - pt(x); if (w < 8) continue; const y = pt(x) + w * (.25 + .5 * r()), sh = shade(x, gy(x) + 8), a = slopeOf(gy, x); dab(c, x, y, 40 + r() * 130, 1 + r() * 2, Math.atan(a), r() < .65 ? cjit(cmix('#fbf2d8', '#9a98c0', .7 * sh), r, 5) : cjit(cmix('#c2ac8c', '#5f5c8c', .7 * sh), r, 6), .2 + .25 * r()); }
    for (let i = 0; i < 2000; i++) { const x = X0 + r() * (PE - X0), w = pb(x) - pt(x); if (w < 6) continue; const y = pt(x) + 2 + (w - 4) * r(), sh = shade(x, y); c.globalAlpha = .5; c.fillStyle = css(cjit(cmix(r() < .5 ? '#a08e7c' : '#fff6e0', '#6a6a9c', .6 * sh), r, 9)); c.beginPath(); c.ellipse(x, y, 1 + r() * 2, .7 + r() * 1.1, 0, 0, TAU); c.fill(); }
    // trodden earth round the foot of the tree and under the bench; a root or two breaking the ground
    for (let i = 0; i < 1500; i++) { const x = 2640 + r() * 640, y = gy(x) - 8 + Math.pow(r(), 1.6) * 52, k = Math.exp(-Math.pow((x - 3010) / 230, 2)) * (1 - (y - gy(x) + 8) / 56); if (r() > k * 1.3) continue; const sh = shade(x, y); dab(c, x, y, 12 + r() * 26, 2.4 + r() * 3.4, (r() - .5) * .3, cjit(cmix(cramp(['#8f7c6e', '#b49e84', '#d2bc98'], r()), '#4a4878', .62 * sh), r, 6), .5 + .3 * r()); }
    c.globalAlpha = 1; for (const [P, w0, w1, lit] of [[[[3170, -4], [3200, 2], [3232, 12], [3276, 12]], 13, 3, .5], [[[2962, 2], [2940, 12], [2900, 22], [2852, 22]], 15, 3, .26]]) { const pts = bez(P[0], P[1], P[2], P[3], 9), wf = t => lerp(w0, w1, t); c.globalAlpha = .6; H_hill_tube(c, pts.map(p => [p[0] - 2, p[1] + 3]), wf, '#2a2848', 1.5); c.globalAlpha = 1; H_hill_tube(c, pts, wf, cramp(HH.bark, lit)); for (let i = 0; i < 40; i++) { const p = pts[1 + (r() * 8 | 0)]; dab(c, p[0] + (r() - .5) * 8, p[1] + (r() - .5) * w0 * .5, 8 + r() * 8, 1.4 + r(), .12, cjit(cramp(HH.bark, lit - .14 + .4 * r()), r, 6), .7); } }
    softDab(c, 3086, 7, 86, 10, 0, '#33346c', .5); softDab(c, 2960, 12, 150, 16, .03, '#2a2c64', .42); end(c);
    blades(c, { seed: 304, n: 3800, x0: X0, x1: PE, y: x => pt(x) + 3, depth: 4, h: 12, wid: 1.7, ramp: G, baseT: .5, light: (x, y) => -SK * shG(x) });
    // the low white fence of Benchmark Road, a little tired, ending where the path turns off
    { const fb = x => gy(x) - 27, postsX = []; for (let x = X0 + 14; x < 612; x += 86 + (hash(x | 0) - .5) * 10) postsX.push(x); begin(c); for (const x of postsX) softDab(c, x - 30, gy(x) - 15, 40, 6, .14, '#5d5aa0', .5);
      for (let i = 0; i < postsX.length - 1; i++) { const a = postsX[i], b = postsX[i + 1]; for (const [h, wv] of [[34, 5], [17, 4.4]]) { const pts = []; for (let k = 0; k <= 6; k++) { const x = lerp(a, b, k / 6); pts.push([x, fb(x) - h + Math.sin(k) * .8 + (hash(i * 3 + h) - .5) * 5 * (k / 6)]); } ribbon(c, pts.map(p => [p[0], p[1] + 2.2]), wv, wv, '#9a94c6', i + h, .6); ribbon(c, pts, wv, wv, '#f2e6d4', i * 7 + h, .9); } }
      for (const x of postsX) { const lean = (hash(x * 3 | 0) - .5) * .12, h = 46 + hash(x * 5 | 0) * 6, y = fb(x) + 4, p = [[x, y], [x + lean * h * .5, y - h * .5], [x + lean * h, y - h]]; ribbon(c, p.map(q => [q[0] - 2.4, q[1]]), 8, 7, '#9a94c6', x, .7); ribbon(c, p, 7.5, 6.5, '#f3e8d6', x + 1, .9); ribbon(c, p.map(q => [q[0] + 2.4, q[1]]), 1.8, 1.4, '#ffe6c0', x + 2, .4, .9); }
      for (let i = 0; i < 160; i++) { const x = r.pick(postsX) + (r() - .5) * 8, y = fb(x) - r() * 46; dab(c, x, y, 4, 1.4, PI / 2, cjit(r() < .5 ? '#d6cabc' : '#b4aad0', r, 8), .5); } end(c); }
    // violet glaze of the shadow, and warm flecks where the sun still finds a way through
    begin(c); for (let i = 0; i < 5200; i++) { const x = 1000 + r() * 2100, y = gy(x) - 6 + Math.pow(r(), 1.2) * 760, s = shade(x, y); if (s < .4 || y > 790) continue; const k = .5 + dep(x, y) * 1.4; softDab(c, x, y, (50 + r() * 80) * k, (9 + r() * 14) * k, -.04, r() < .55 ? '#262c70' : '#1c3866', .13 * s); }
    HH.dapples = []; for (let i = 0; i < 7000; i++) { const x = 1100 + r() * 1960, y = gy(x) - 4 + Math.pow(r(), 1.3) * 700, b = H_hill_body(x, y); if (b < .5 || y > 790) continue; const s = shade(x, y); if (s > .4) continue; const k = .45 + dep(x, y) * 1.5; softDab(c, x, y, (22 + r() * 34) * k, (5 + r() * 7) * k, -.04, cjit('#d8c878', r, 8), .2 + .2 * r()); if (HH.dapples.length < 170 && r() < .1 && y - gy(x) < 330) HH.dapples.push([x, y, (26 + r() * 30) * k, (6 + r() * 7) * k, r() * TAU]); } end(c);
    begin(c); for (let i = 0; i < 700; i++) { const x = 2900 + r() * 1420, y = gy(x) - 6 + Math.pow(r(), 1.2) * 500; if (shade(x, y) > .2) continue; softDab(c, x, y, 90 + r() * 120, 16 + r() * 20, -.04, '#e6b866', .085); } end(c);
    // deep grass, growing larger toward the lens
    const bl = (x, y) => -SK * shade(x, y) - .16 * clamp((y - gy(x) - 260) / 400);
    blades(c, { seed: 305, n: 56000, x0: X0, x1: X1, y: nearTop, depth: 720, bias: 1.55, h: 58, wid: 3.1, ramp: G, baseT: .52, sc: 200, size: (x, y, d) => .62 + d * 1.5, light: bl });
    H_hill_flowers(c, { seed: 306, n: 5600, x0: X0, x1: X1, y: x => nearTop(x) + 12, depth: 600, cols: ['#f2ecda', '#f2ecda', '#e8cc68', '#e0a844', '#de96a2', '#c85a4a', '#b8a2da'], s: 3.3, clusterSc: 300, thresh: .05, size: d => .55 + d * 1.7 });
    H_hill_flowers(c, { seed: 307, n: 1500, x0: 1850, x1: 2700, y: x => nearTop(x) + 8, depth: 300, bias: 1.2, cols: ['#f4eedc', '#f4eedc', '#e8cc68', '#de96a2', '#b8a2da', '#9cb0e2'], s: 4.2, clusterSc: 110, thresh: .1, size: d => .7 + d * 1.3 });
    blades(c, { seed: 308, n: 9000, x0: X0, x1: X1, y: x => nearTop(x) + 26, depth: 660, bias: 1.2, h: 68, wid: 2.5, ramp: G.slice(2), baseT: .56, size: (x, y, d) => .5 + d * 1.3, light: (x, y) => -.75 * shade(x, y) });
    begin(c); for (let i = 0; i < 60; i++) { const sp6 = i < 22, x = sp6 ? 1900 + r() * 760 : X0 + r() * (X1 - X0), d = Math.pow(r(), 1.5), y = nearTop(x) + 14 + d * (sp6 ? 250 : 520), s = .9 + d * 1.8, h = (44 + r() * 30) * (.7 + d); H_hill_clock(c, x, y, x + (.08 + r() * .22) * h, y - h, s, shade(x, y)); }
    for (let i = 0; i < 900; i++) { const x = X0 + r() * (X1 - X0), d = Math.pow(r(), 1.5), y = nearTop(x) + 10 + d * 560, s = .7 + d * 1.5, h = (48 + r() * 34) * s, sh = shade(x, y), tx = x + (.15 + r() * .25) * h; c.globalAlpha = .9; c.strokeStyle = css(cmix('#b4ba78', '#34525c', .66 * sh)); c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - h * .6, tx, y - h); c.stroke(); c.fillStyle = css(cmix('#e2d49e', '#4e6096', .62 * sh)); c.beginPath(); c.ellipse(tx, y - h, 2.4 * s, 6 * s, .3, 0, TAU); c.fill(); } end(c);
    begin(c); for (let i = 0; i < 9000; i++) { const x = 1100 + r() * 1960, y = gy(x) + Math.pow(r(), 1.3) * 640, b = H_hill_body(x, y); if (b < .5 || y > 790) continue; const s = shade(x, y); if (s > .3) continue; const k = .5 + dep(x, y) * 1.4; if (r() < .4) softDab(c, x, y - 8 * k, (24 + r() * 30) * k, (6 + r() * 7) * k, -.04, '#e2cc7a', .12 + .1 * r()); else dab(c, x, y, (16 + r() * 22) * k, (1.6 + r() * 1.6) * k, -1.25 + (r() - .5) * .7, cjit('#c8c078', r, 10), .5); } end(c);
    // flower patches in the grass where shot 6 is played: each patch one kind, the way they really grow
    begin(c); for (let p = 0; p < 16; p++) { const px = 1960 + r() * 640, pd = 16 + r() * r() * 250, col0 = r.pick(['#f6f0de', '#f6f0de', '#ecd066', '#e29aa8', '#a8b4ea', '#bca4de']), n = 10 + (r() * 16 | 0); for (let i = 0; i < n; i++) { const x = px + r.gauss() * 46, d = clamp((pd + r.gauss() * 16) / 300, .02, 1), y = nearTop(x) + d * 300, sh = shade(x, y), s = (4.4 + r() * 3.2) * (.7 + d * 1.2), h = (20 + r() * 26) * (.7 + d);
        c.globalAlpha = .9; c.strokeStyle = css(cmix('#86a460', '#244a4c', .7 * sh)); c.lineWidth = 1.2 * (.7 + d); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - h * .6, x + 5, y - h); c.stroke(); H_hill_daisy(c, x + 5, y - h, s, cjit(cmix(col0, '#44548e', .7 * sh), r, 8), cmix('#e2aa3c', '#5a5070', .6 * sh), r() * TAU); } } end(c);
    // short worn tufts at the foot of the trunk and bench (kept low: the bicycle leans here)
    blades(c, { seed: 309, n: 900, x0: 2700, x1: 3300, y: x => gy(x) + 1, depth: 10, h: 17, wid: 1.9, ramp: G, baseT: .46, light: (x, y) => -SK * shG(x) });
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * zl)) / zl, xb = xa + W / zl;
      H_hill_grass(ctx, f, { xa, xb, spacing: 11, y: x => nearTop(x) + 6, depth: 430, rows: 7, h: 58, wid: 3, ramp: G, baseT: .56, seed: 22, size: d => .62 + d * 1.25, tipLight: .45, heads: .1, flowers: .06, flowerS: 5, flowerCols: ['#f2ecda', '#e8cc68', '#de96a2', '#f2ecda'], clocks: .005, clockS: 1.1, sh: shade, gap: .22 });
      for (const d of HH.dapples) { if (d[0] < xa - 80 || d[0] > xb + 80) continue; const w = windAtX(f, d[0]); softDab(ctx, d[0] + Math.sin(f * .21 + d[4]) * 6 * w, d[1], d[2], d[3], -.04, '#ecd684', .15 + .11 * Math.sin(f * .17 + d[4] * 3) * (.4 + w)); } ctx.globalAlpha = 1; };
    S.layers.push(L); } step();
  // ── 11 front: live grass and flowers over the feet and wheels (thin along the worn path, so wheels stay readable)
  S.layers.push({ id: 'front', p: 1, live: (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * zl)) / zl, xb = xa + W / zl;
    H_hill_grass(ctx, f, { xa, xb, spacing: 9, y: x => nearTop(x) + 8, depth: 30, rows: 3, h: 70, wid: 2.7, ramp: G, baseT: .54, seed: 41, size: d => .9 + d * .25, tipLight: .5, heads: .1, flowers: .16, flowerS: 5.6, flowerCols: ['#f4eedc', '#e8cc68', '#f4eedc', '#de96a2', '#b8a2da'], clocks: .012, clockS: 1.1, sh: shade, gap: x => x < 2640 ? .72 : x < 3260 ? .8 : .3 }); } });
  // ── 12 canopy: the sunlit leaf masses in front of the limbs; a few hundred leaves that never keep still
  { const L = newLayer('canopy', 1, 2200, -1220, 3850, -340, 1), c = L.ctx, r = RNG(311); begin(c);
    for (const b of HH.boughs) { for (const q of b.subs) { const ramp = H_hill_rampMix(HH.leafSh, HH.leafLt, q.lit); H_hill_clump(c, q.x, q.y, q.rx, q.ry, ramp, q.seed, 64 + q.rx * 1.2, { lx: .85, ly: -.5, dab: 5.4 });
        if (q.under) continue; if (q.lit > .5) for (let i = 0; i < 22 * q.lit; i++) { const a = -.5 + (r() - .5) * 1.8, d = .68 + .34 * r(); dab(c, q.x + Math.cos(a) * q.rx * d, q.y + Math.sin(a) * q.ry * d, 6 + r() * 5, 2.6 + r() * 2, r() * PI, cjit(r() < .4 ? '#f2dc98' : '#d2c86e', r, 8), .85); }
        else for (let i = 0; i < 6; i++) { const a = -2.2 + (r() - .5) * 1.4, d = .6 + .35 * r(); dab(c, q.x + Math.cos(a) * q.rx * d, q.y + Math.sin(a) * q.ry * d, 6 + r() * 5, 2.6 + r() * 2, r() * PI, cjit('#4a8086', r, 8), .5); } }
      // the belly of each bough in cool shade, a breath of warm light on its crown
      softDab(c, b.cx - b.rx * .08, b.cy + b.ry * .5, b.rx * .86, b.ry * .42, 0, '#0c2234', .36); softDab(c, b.cx + b.rx * .25, b.cy - b.ry * .45, b.rx * .6, b.ry * .4, 0, '#e8cc7a', .1 * b.lit); }
    end(c);
    L.live = (ctx, f, env, cam, zl) => { const xa = (0 - (W / 2 - cam.x * zl)) / zl - 20, xb = xa + W / zl + 40, SH = HH.leafSh, LT = HH.leafLt;
      for (const q of HH.leaves) { if (q.x < xa || q.x > xb) continue; const w = windAtX(f, q.x), sw = Math.sin(f * (.31 + .1 * q.s) + q.ph), fl = Math.sin(f * .83 + q.ph * 2.3), x = q.x + (3 + 12 * w) * sw * q.s + 9 * w, y = q.y + (1.5 + 5 * w) * fl * .6, t = clamp(q.lit * .8 + .2 * w * fl);
        ctx.globalAlpha = .95; ctx.fillStyle = css(cmix(cramp(SH, .35 + .6 * t), cramp(LT, .3 + .7 * t), t)); ctx.beginPath(); ctx.ellipse(x, y, 6.5 * q.s, 2.8 * q.s * (.55 + .45 * Math.abs(fl)), q.a + .5 * sw * (.3 + w), 0, TAU); ctx.fill(); }
      // a leaf or two let go on the gusts, drifting seaward
      for (let i = 0; i < 7; i++) { const P = 150 + 60 * hash(i * 11 + 5), t0 = (f + 400 * hash(i * 7 + 2)) % P, cyc = Math.floor((f + 400 * hash(i * 7 + 2)) / P), u = t0 / P, sx = 2330 + 520 * hash2(cyc, i), x = sx - u * (260 + 200 * hash2(cyc, i + 9)) + 26 * Math.sin(u * 11 + i), y = -470 + u * 470 + 16 * Math.sin(u * 17 + i * 2); if (x < xa || x > xb || u > .96) continue;
        ctx.globalAlpha = .9 * bump(u, 0, .08, 1); ctx.fillStyle = css(i & 1 ? '#c2bc66' : '#789a50'); ctx.beginPath(); ctx.ellipse(x, y, 6.5, 2.8 * Math.abs(Math.sin(u * 23 + i)) + .7, u * 14 + i, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; };
    S.layers.push(L); } step();
  // ── 13 foreground: big soft blades close to the lens (hidden in the close-ups of shot 5; its height is set per shot)
  { const F = newLayer('fgStrip', 1.6, 1400, 0, 6300, 330, .25), c = F.ctx, Gd = ['#0f2a36', '#173e40', '#24584a', '#3c7650', '#5f9054'];
    paintMass(c, { x0: 1400, x1: 6300, top: x => 62 + 30 * fbm(x / 200, 3), bot: 330, ramp: Gd, baseT: .22, seed: 321, n: 5200, len: 90, wid: 24, dir: -1.3, sc: 300, jit: 7, edgeH: 30 }); delete F.ctx;
    const base = f => f < 720 ? 514 : f < 864 ? 110 : 0;
    S.layers.push({ id: 'fg', p: 1.6, hidden: (f, env) => env.noFg || (f >= 864 && f < 1056), live: (ctx, f, env, cam, zl) => { const B = base(f), xa = (0 - (W / 2 - cam.x * 1.6 * zl)) / zl, xb = xa + W / zl; ctx.globalAlpha = 1; ctx.drawImage(F.cv, F.ox, F.oy + B, F.cv.width / F.res, F.cv.height / F.res);
      H_hill_grass(ctx, f, { xa, xb, spacing: 22, y: x => B + 96 + 20 * vnoise(x / 90, 2), depth: 60, rows: 3, h: 172, wid: 7.5, ramp: Gd, baseT: .36, px: 1.6, seed: 49, size: d => .7 + d * .5, tipLight: .35, heads: .16, headS: 2.3, headCol: '#c6c08c', flowers: .06, flowerS: 15, flowerCols: ['#e4dfd2', '#d2be66', '#cc8898'], clocks: .012, clockS: 3, windScale: 1.15, shK: 0 }); } }); } step();
  for (const L of S.layers) delete L.ctx; } };
