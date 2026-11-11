// ───────────────────────── paint: gouache toolkit, lettering, set compositor ─────────────────────────
const _sprites = new Map();
function softSprite(c) { c = _C(c); const k = ((c[0] >> 3) << 10) | ((c[1] >> 3) << 5) | (c[2] >> 3); let s = _sprites.get(k); if (s) return s;
  s = mk(48, 48); const x = ctxOf(s), g = x.createRadialGradient(24, 24, 0, 24, 24, 24), q = `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
  g.addColorStop(0, `rgba(${q},1)`); g.addColorStop(.45, `rgba(${q},.62)`); g.addColorStop(.75, `rgba(${q},.2)`); g.addColorStop(1, `rgba(${q},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 48, 48); _sprites.set(k, s); return s; }
// soft round/elliptic blot (wet wash, glaze, cloud body)
function softDab(ctx, x, y, rx, ry, rot, col, a) { const s = softSprite(col); ctx.globalAlpha = a;
  if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(s, -rx, -ry, rx * 2, ry * 2); ctx.restore(); } else ctx.drawImage(s, x - rx, y - ry, rx * 2, ry * 2); }
// a loaded-brush mark with round ends and a slight curve
function dab(ctx, x, y, len, wid, ang, col, a) { const dx = Math.cos(ang) * len * .5, dy = Math.sin(ang) * len * .5; ctx.globalAlpha = a; ctx.strokeStyle = typeof col === 'string' ? col : css(col); ctx.lineWidth = wid;
  ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.quadraticCurveTo(x + dy * .3, y - dx * .3, x + dx, y + dy); ctx.stroke(); }
// dry brush: a few thin broken bristle lines
function dryDab(ctx, x, y, len, wid, ang, col, a, r) { const n = 2 + (r() * 3 | 0), px = -Math.sin(ang), py = Math.cos(ang); ctx.strokeStyle = typeof col === 'string' ? col : css(col);
  for (let i = 0; i < n; i++) { const o = (i / (n - 1 || 1) - .5) * wid, l = len * (.5 + .5 * r()), s = (r() - .5) * len * .3; ctx.globalAlpha = a * (.5 + .5 * r()); ctx.lineWidth = Math.max(.6, wid / n * .7);
    ctx.beginPath(); ctx.moveTo(x + px * o - Math.cos(ang) * (l / 2 - s), y + py * o - Math.sin(ang) * (l / 2 - s)); ctx.lineTo(x + px * o + Math.cos(ang) * (l / 2 + s), y + py * o + Math.sin(ang) * (l / 2 + s)); ctx.stroke(); } }
function begin(ctx) { ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
function end(ctx) { ctx.globalAlpha = 1; ctx.restore(); }
// blotchy base wash over a rect: colour comes from colFn(u,v) (0..1), broken by soft blots and long glaze strokes
function wash(ctx, x, y, w, h, colFn, o = {}) { const r = RNG(o.seed || 1), cell = o.cell || 60; begin(ctx);
  for (let j = 0; j * cell < h + cell; j++) for (let i = 0; i * cell < w + cell; i++) { const u = clamp((i + .5) * cell / w), v = clamp((j + .5) * cell / h); ctx.globalAlpha = 1; ctx.fillStyle = css(colFn(u, v)); ctx.fillRect(x + i * cell - 1, y + j * cell - 1, cell + 2, cell + 2); }
  const nb = o.blots == null ? Math.round(w * h / 9000) : o.blots, jit = o.jit == null ? 9 : o.jit;
  for (let i = 0; i < nb; i++) { const u = r(), v = r(), s = (o.blotSize || 150) * (.5 + r()); softDab(ctx, x + u * w, y + v * h, s * (1 + r()), s * (.45 + .4 * r()), (r() - .5) * .5, cjit(colFn(u, v), r, jit), .5 + .3 * r()); }
  const ns = o.strokes == null ? Math.round(w * h / 2600) : o.strokes;
  for (let i = 0; i < ns; i++) { const u = r(), v = r(); dab(ctx, x + u * w, y + v * h, (o.len || 70) * (.5 + r()), (o.wid || 9) * (.5 + r()), (o.ang || 0) + (r() - .5) * .35, cjit(colFn(u, v), r, jit * .8), .25 + .3 * r()); }
  end(ctx); }
// a painted land/sea/foliage mass bounded by top(x) .. bot(x): base fill, blots, then form-following dabs chosen from a value ramp
function paintMass(ctx, o) { const r = RNG(o.seed || 7), x0 = o.x0, x1 = o.x1, top = o.top, bot = typeof o.bot === 'function' ? o.bot : () => o.bot, ramp = o.ramp, baseT = o.baseT == null ? .45 : o.baseT;
  begin(ctx); const st = o.step || 10; ctx.beginPath(); ctx.moveTo(x0, bot(x0)); for (let x = x0; x <= x1; x += st) ctx.lineTo(x, top(x)); ctx.lineTo(x1, top(x1)); for (let x = x1; x >= x0; x -= st * 4) ctx.lineTo(x, bot(x)); ctx.closePath();
  ctx.globalAlpha = 1; ctx.fillStyle = css(cramp(ramp, baseT)); ctx.fill();
  const sc = o.sc || 160, nz = o.nz == null ? .55 : o.nz, light = o.light || (() => 0), jit = o.jit == null ? 8 : o.jit, dir = typeof o.dir === 'function' ? o.dir : () => (o.dir || 0);
  const val = (x, y) => baseT + nz * fbm2(x / sc, y / sc, o.seed || 7, 3) + light(x, y);
  const area = (x, tries = 6) => { for (let k = 0; k < tries; k++) { const xx = x0 + r() * (x1 - x0), t = top(xx), b = bot(xx); if (b - t < 2) continue; return [xx, t + Math.pow(r(), o.bias || 1) * (b - t), t, b]; } return null; };
  const nb = o.blots == null ? Math.round((x1 - x0) / 14) : o.blots;
  for (let i = 0; i < nb; i++) { const p = area(); if (!p) continue; const s = (o.blotSize || 90) * (.5 + r()); if (p[1] - s * .3 < p[2]) p[1] = p[2] + s * .3; softDab(ctx, p[0], p[1], s * 1.6, s * .6, 0, cjit(cramp(ramp, val(p[0], p[1]) + (r() - .5) * .2), r, jit), .55); }
  const n = o.n || 4000, len = o.len || 22, wid = o.wid || 7, sz = o.size || (() => 1), al = o.alpha || .85, passes = o.passes || 3;
  for (let ps = 0; ps < passes; ps++) { const lo = ps / passes - .15; // dark first, lights last
    for (let i = 0; i < n / passes; i++) { const p = area(); if (!p) continue; let v = val(p[0], p[1]) + (r() - .5) * .25; if (ps && v < lo + .12) { if (r() < .7) continue; }
      v = clamp(v + (ps - (passes - 1) / 2) * (o.spread || .12)); const s = sz(p[0], p[1]) * (.6 + .8 * r()); const a = dir(p[0], p[1]) + (r() - .5) * (o.wobble == null ? .5 : o.wobble);
      dab(ctx, p[0], p[1], len * s, wid * s, a, cjit(cramp(ramp, v), r, jit), al * (.7 + .3 * r())); } }
  if (o.edge !== 0) { const ne = Math.round((x1 - x0) / (o.edgeStep || 9)); for (let i = 0; i < ne; i++) { const x = x0 + r() * (x1 - x0), y = top(x) + (r() - .35) * (o.edgeH || 8); const s = sz(x, y);
      dryDab(ctx, x, y, len * s * (.6 + r()), wid * s, dir(x, y) + (r() - .5) * .6, cjit(cramp(ramp, val(x, y) + .1), r, jit), .7, r); } }
  end(ctx); }
// leaf / bush / canopy clump: elliptical, lit from (lx,ly), dark → mid → light passes of short leaf dabs
function clump(ctx, cx, cy, rx, ry, ramp, seed, n, o = {}) { const r = RNG(seed), lx = o.lx == null ? .6 : o.lx, ly = o.ly == null ? -.75 : o.ly, dl = o.dab || Math.max(4, Math.min(rx, ry) * .13); begin(ctx);
  softDab(ctx, cx, cy + ry * .1, rx * 1.05, ry * 1.02, 0, cramp(ramp, .12), .95); softDab(ctx, cx - rx * .1, cy + ry * .25, rx * .8, ry * .7, 0, cramp(ramp, .05), .7);
  for (let ps = 0; ps < 3; ps++) for (let i = 0; i < n / 3; i++) { const a = r() * TAU, d = Math.sqrt(r()) * (ps === 0 ? 1 : .97), nx = Math.cos(a) * d, ny = Math.sin(a) * d;
      let v = .42 + .42 * (nx * lx + ny * ly) + .3 * fbm2(cx * .01 + nx * 2.2, cy * .01 + ny * 2.2, seed, 2) + (r() - .5) * .16; if (ps === 1 && v < .38) continue; if (ps === 2 && v < .6) continue;
      v = clamp(v + (ps - 1) * .14); const s = dl * (.7 + .7 * r()) * (ps === 2 ? .8 : 1);
      dab(ctx, cx + nx * rx, cy + ny * ry, s * 1.7, s, r() * PI, cjit(cramp(ramp, v), r, o.jit || 8), .9); }
  end(ctx); }
// towering cumulus: billowing lobes painted one by one (far/top first) so each lit crown overlaps the shadowed belly behind it.
// `variant` only re-seeds the dab jitter and breathes the radii, so two bakes can cross-fade ("boil").
function cumulus(ctx, cx, base, w, h, pal, seed, variant = 0, o = {}) { const r = RNG(seed), lobes = [], lx = o.lx == null ? .62 : o.lx, ly = o.ly == null ? -.78 : o.ly;
  const tall = h / w, N = Math.round((o.lobes || 1) * (10 + 16 * Math.min(2, tall) + w / 90)), drift = (r() - .5) * w * .5, R0 = Math.min(w * .2, h * .2);
  const hw = t => w / 2 * (1 - .78 * Math.pow(t, 1.5)) * (1 + .22 * Math.sin(t * 7 + seed)) , cxt = t => cx + drift * t * t + w * .09 * Math.sin(t * 4.2 + seed * 1.3);
  for (let i = 0; i < N; i++) { const t = Math.pow(r(), .85) * .93, R = R0 * lerp(1.15, .62, t) * (.7 + .65 * r()); lobes.push({ x: cxt(t) + (r() * 2 - 1) * Math.max(0, hw(t) - R * .55), y: base - R * .35 - t * (h - R), R, g: 0 }); }
  for (let i = 0; i < 7; i++) { const u = (i + .5) / 7; lobes.push({ x: cx + (u - .5) * w * .98, y: base - R0 * .55, R: R0 * (1 + .3 * r()), g: 0 }); }
  const g0 = lobes.length; for (let i = 0; i < g0; i++) { const L = lobes[i], m = 2 + (r() * 3 | 0); for (let k = 0; k < m; k++) { const a = -PI * (.02 + .96 * r()), R = L.R * (.3 + .3 * r()); lobes.push({ x: L.x + Math.cos(a) * L.R * .82, y: L.y + Math.sin(a) * L.R * .82, R, g: 1 }); } }
  const g1 = lobes.length; for (let i = g0; i < g1; i++) if (r() < .6) { const L = lobes[i], a = -PI * (.05 + .9 * r()), R = L.R * (.4 + .3 * r()); lobes.push({ x: L.x + Math.cos(a) * L.R * .8, y: L.y + Math.sin(a) * L.R * .8, R, g: 2 }); }
  lobes.sort((a, b) => (a.y - a.R * .3) - (b.y - b.R * .3));
  const rv = RNG(seed * 31 + variant * 977 + 5), bo = variant ? 1 : 0; begin(ctx); const R5 = [pal.deep, pal.shadow, pal.mid, pal.light, pal.hi], dn = o.density || 1;
  for (const L of lobes) { if (L.y - L.R > base) continue; const RR = L.R * (1 + bo * .07 * Math.sin(L.x * .013 + L.y * .02)), tH = clamp((base - L.y) / h), n = Math.round(dn * (16 + RR * .5));
    softDab(ctx, L.x, Math.min(L.y, base - RR * .3), RR * 1.12, RR * 1.08, 0, cramp(R5, .26 + .16 * tH), .9);
    for (let i = 0; i < n; i++) { const a = rv() * TAU, d = Math.sqrt(rv()) * .96, nx = Math.cos(a) * d, ny = Math.sin(a) * d, x = L.x + nx * RR, y = L.y + ny * RR; if (y > base + 2) continue;
      const under = clamp((y - (base - h * .2)) / (h * .2)); let v = .54 + .5 * (nx * lx + ny * ly) + .2 * tH - under * .42 + .16 * fbm2(x / (h * .16), y / (h * .16), seed, 2) + (rv() - .5) * .1; v = clamp(v);
      const s = RR * (v > .7 ? .2 : .32) * (.6 + .8 * rv());
      if (v > .74 && rv() < .5) dab(ctx, x, y, s * 1.5, s * .8, a + PI / 2 + (rv() - .5), cjit(cramp(R5, v), rv, 3), .7); else softDab(ctx, x, y, s * (1.1 + .5 * rv()), s * (.8 + .3 * rv()), rv() * PI, cjit(cramp(R5, v), rv, 4), .78); }
    // crisp sunlit crown, dry-brushed
    const ne = Math.round(dn * RR * (L.g ? .3 : .16)), a0 = Math.atan2(ly, lx); for (let i = 0; i < ne; i++) { const a = a0 + (rv() - .5) * 2.0, x = L.x + Math.cos(a) * RR * (.86 + .14 * rv()), y = L.y + Math.sin(a) * RR * (.86 + .14 * rv()); if (y > base - 8) continue;
      dab(ctx, x, y, RR * .26 * (.5 + rv()), RR * .1 * (.5 + rv()), a + PI / 2 + (rv() - .5) * .5, cjit(pal.hi, rv, 3), .6 + .3 * rv()); } }
  const nb = Math.round(w / 14); for (let i = 0; i < nb; i++) { const x = cx + (rv() - .5) * w * 1.05, y = base - rv() * rv() * h * .12; softDab(ctx, x, y, h * .12 * (.5 + rv()) + 30, h * .02 + 5, 0, cjit(rv() < .6 ? pal.deep : pal.shadow, rv, 5), .4); }
  end(ctx); return lobes; }
// grass: thousands of blades growing from a line, leaning with a static breeze
function blades(ctx, o) { const r = RNG(o.seed || 3); begin(ctx); const n = o.n, ramp = o.ramp;
  for (let i = 0; i < n; i++) { const x = o.x0 + r() * (o.x1 - o.x0), d = Math.pow(r(), o.bias || 1), y = o.y(x) + d * (o.depth || 0), s = (o.size ? o.size(x, y, d) : 1), h = (o.h || 26) * s * (.5 + r()), lean = (o.lean == null ? .25 : o.lean) + (r() - .5) * .7;
    const v = clamp((o.baseT || .45) + .5 * fbm2(x / (o.sc || 120), y / 60, o.seed || 3, 2) + (r() - .5) * .35 + (o.light ? o.light(x, y) : 0)); ctx.globalAlpha = .9; ctx.strokeStyle = css(cjit(cramp(ramp, v), r, 9)); ctx.lineWidth = (o.wid || 2.4) * s * (.6 + .7 * r());
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * h * .25, y - h * .6, x + lean * h, y - h); ctx.stroke(); }
  end(ctx); }
function flowers(ctx, o) { const r = RNG(o.seed || 5); begin(ctx); for (let i = 0; i < o.n; i++) { const x = o.x0 + r() * (o.x1 - o.x0), d = r(), y = o.y(x) + d * (o.depth || 0) - (o.lift || 8) * r(), s = (o.size ? o.size(x, y, d) : 1) * (o.s || 4) * (.6 + .8 * r()), c = r.pick(o.cols);
    if (o.clusterSc && fbm2(x / o.clusterSc, y / 80, o.seed, 2) < (o.thresh || 0)) continue;
    ctx.globalAlpha = .95; ctx.fillStyle = css(cjit(c, r, 10)); ctx.beginPath(); ctx.ellipse(x, y, s, s * .8, r() * PI, 0, TAU); ctx.fill(); if (r() < .5) { ctx.fillStyle = css(cjit(c, r, 10)); ctx.beginPath(); ctx.ellipse(x + s * .9, y - s * .4, s * .7, s * .55, r() * PI, 0, TAU); ctx.fill(); }
    if (o.centre && r() < .6) { ctx.fillStyle = css(o.centre); ctx.beginPath(); ctx.arc(x + s * .2, y - s * .1, s * .32, 0, TAU); ctx.fill(); } }
  end(ctx); }
// one wobbly painted line through points (tapered ribbon); used for trunks, fences, wires, lettering …
function ribbon(ctx, pts, w0, w1, col, seed = 1, wob = 1, alpha = 1) { const n = pts.length; if (n < 2) return; const L = [], Rr = [];
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const t = i / (n - 1);
    const w = lerp(w0, w1, t) * (1 + .22 * wob * vnoise(i * .9 + seed * 7.3, seed)) * .5, jx = wob * .5 * vnoise(i * .7 + seed * 3.1, seed + 9), jy = wob * .5 * vnoise(i * .7 + seed * 5.7, seed + 19);
    L.push([pts[i][0] + jx - dy * w, pts[i][1] + jy + dx * w]); Rr.push([pts[i][0] + jx + dy * w, pts[i][1] + jy - dx * w]); }
  ctx.globalAlpha = alpha; ctx.fillStyle = typeof col === 'string' ? col : css(col); ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]); for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
// resample a polyline / smooth it (Chaikin) so ribbons are supple
function chaikin(pts, it = 2, closed = false) { for (let k = 0; k < it; k++) { const o = []; const n = pts.length; if (!closed) o.push(pts[0]); for (let i = 0; i < (closed ? n : n - 1); i++) { const a = pts[i], b = pts[(i + 1) % n]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } if (!closed) o.push(pts[n - 1]); pts = o; } return pts; }
function bez(p0, p1, p2, p3, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }

// ── hand lettering (stroke font drawn with the ribbon brush; no system fonts anywhere)
const GLY = { A: [4, '0,6 2,0 4,6|.8,3.9 3.2,3.9'], B: [3.9, '0,0 0,6|0,0 2.4,0 3.3,.8 3.3,2.2 2.4,3 0,3|2.4,3 3.7,3.8 3.7,5.2 2.7,6 0,6'], D: [3.8, '0,0 0,6|0,0 1.9,0 3.6,1.5 3.6,4.5 1.9,6 0,6'], E: [3.4, '3.3,0 0,0 0,6 3.4,6|0,3 2.5,3'], F: [3.3, '3.3,0 0,0 0,6|0,3 2.5,3'],
  L: [3.2, '0,0 0,6 3.2,6'], M: [5, '0,6 0,0 2.5,4.2 5,0 5,6'], N: [4, '0,6 0,0 4,6 4,0'], O: [4, '2,0 .6,.8 0,3 .6,5.2 2,6 3.4,5.2 4,3 3.4,.8 2,0'], W: [5.2, '0,0 1.3,6 2.6,2 3.9,6 5.2,0'], V: [4, '0,0 2,6 4,0'], K: [3.6, '0,0 0,6|3.4,0 0,3.4|1.2,2.4 3.6,6'],
  0: [3.4, '1.7,0 .3,1.2 .3,4.8 1.7,6 3.1,4.8 3.1,1.2 1.7,0'], 1: [2.6, '.5,1.4 1.8,0 1.8,6'], 2: [3.4, '.3,1.4 1.2,.1 2.4,.1 3.1,1.3 2.6,2.8 .2,6 3.3,6'], 3: [3.3, '.3,.9 1.5,0 2.8,.6 2.8,2.2 1.4,2.9|1.4,2.9 3,3.6 3,5.2 1.6,6 .2,5.1'],
  4: [3.5, '2.5,6 2.5,0 .1,4.2 3.4,4.2'], 5: [3.4, '3,0 .6,0 .4,2.6 1.8,2.2 3.1,3.2 3.1,4.9 1.7,6 .3,5.2'], 6: [3.3, '2.8,.4 1.4,.2 .4,2 .3,4.6 1.6,6 3,5 3,3.5 1.7,2.7 .4,3.6'], 7: [3.3, '.2,0 3.2,0 1.3,6'],
  8: [3.4, '1.7,2.8 .5,2 .6,.6 1.7,0 2.8,.6 2.9,2 1.7,2.8 .3,4 .4,5.4 1.7,6 3,5.4 3.1,4 1.7,2.8'], 9: [3.3, '3,2.4 1.7,3.3 .4,2.5 .4,1 1.7,0 3,1 3,4 2,5.8 .6,5.8'],
  '.': [1.3, '.5,5.5 .8,5.9'], '+': [3, '0,3.2 3,3.2|1.5,1.7 1.5,4.7'], ' ': [2.2, ''], '"': [2, '.4,0 .3,1.4|1.4,0 1.3,1.4'],
  a: [3, '2.6,3 1.4,2.5 .3,3.4 .3,5.1 1.3,6 2.6,5.2|2.6,2.5 2.6,6'], b: [3, '.3,0 .3,6|.3,3.4 1.5,2.5 2.7,3.4 2.7,5.1 1.5,6 .3,5.2'], c: [2.8, '2.6,3.1 1.5,2.5 .3,3.4 .3,5.1 1.5,6 2.6,5.4'], d: [3, '2.6,0 2.6,6|2.6,3.4 1.4,2.5 .3,3.4 .3,5.1 1.4,6 2.6,5.2'],
  e: [3, '.3,4.2 2.7,4.2 2.6,3.2 1.5,2.5 .3,3.4 .3,5.1 1.5,6 2.6,5.4'], g: [3, '2.6,3.4 1.4,2.5 .3,3.4 .3,5 1.4,5.8 2.6,5|2.6,2.5 2.6,7.2 1.5,8 .4,7.4'], i: [1.2, '.6,2.6 .6,6|.5,1.2 .7,1.5'], l: [1.2, '.6,0 .6,6'],
  n: [3, '.3,2.5 .3,6|.3,3.5 1.5,2.5 2.6,3.2 2.6,6'], p: [3, '.3,2.5 .3,8|.3,3.4 1.5,2.5 2.7,3.4 2.7,5.1 1.5,6 .3,5.2'], r: [2.3, '.3,2.5 .3,6|.3,3.6 1.3,2.6 2.2,2.8'], y: [3, '.2,2.5 1.5,6|2.8,2.5 1.5,6 .9,7.6 .1,8'] };
const _glyC = {}; function glyph(ch) { if (_glyC[ch]) return _glyC[ch]; const g = GLY[ch] || GLY[' ']; const st = g[1] ? g[1].split('|').map(s => chaikin(s.trim().split(/\s+/).map(p => p.split(',').map(Number)), 2)) : []; return _glyC[ch] = { w: g[0], st }; }
function letterWidth(text, size, track = .9) { let w = 0; for (const ch of text) w += (glyph(ch).w + track) * size / 6; return w - track * size / 6; }
// draw text with cap-height `size`, top-left at x,y. o: {col, wt, seed, wob, alpha, track, align}
function lettering(ctx, text, x, y, size, o = {}) { const k = size / 6, tr = o.track == null ? .9 : o.track; let cx = x; if (o.align === 'center') cx -= letterWidth(text, size, tr) / 2;
  let i = 0; for (const ch of text) { const g = glyph(ch); for (const s of g.st) { const pts = s.map(p => [cx + p[0] * k, y + p[1] * k]); ribbon(ctx, pts, (o.wt || size * .13), (o.wt || size * .13) * .8, o.col || '#3a2a20', (o.seed || 1) + i * 13, (o.wob == null ? 1 : o.wob) * size * .035, o.alpha == null ? 1 : o.alpha); i++; } cx += (g.w + tr) * k; } return cx; }

// ── the Launch Tower's banner (shared by every set). Drawn in the far layer's coordinates.
// (tx,ty) = tower tip, s = scale. Each launch: a paper roll shoots up, pops, unrolls to read NEW MODEL, confetti, then drifts away.
function drawLaunches(ctx, f, tx, ty, s, o = {}) { for (const L of T.launches) { const t = f - L.launch; if (t < 0 || t > 150) continue; const nx = T.launches.find(q => q.launch > L.launch), retire = nx ? 1 - ss(nx.launch - 14, nx.launch - 3, f) : 1, pt = f - L.pop, r = RNG(L.launch * 7 + 3), ax = tx + (o.dx || -190) * s, ay = ty - (o.rise == null ? 44 : o.rise) * s;
    begin(ctx);
    if (t < 12) { softDab(ctx, tx, ty + 10 * s, 46 * s * (1 + t * .12), 40 * s * (1 + t * .12), 0, o.flash || '#fff6c8', .95 * (1 - t / 12)); softDab(ctx, tx, ty + 10 * s, 14 * s, 14 * s, 0, '#fffdf0', 1 - t / 12); }
    if (t < 26) { for (let i = 0; i < 9; i++) softDab(ctx, tx + (r() - .5) * 26 * s + t * (r() - .5) * 1.2 * s, ty - 4 * s - t * (.6 + r()) * 1.5 * s, (9 + t * .9) * s * (.6 + r()), (8 + t * .8) * s * (.6 + r()), 0, o.smoke || '#f4ead8', .5 * (1 - t / 26)); }
    if (pt >= 0 && pt < 10) ribbon(ctx, [[tx, ty], [lerp(tx, ax, .5), lerp(ty, ay, .5) - 6 * s], [ax, ay + 20 * s]], 1 * s, 2 * s, o.paper || '#f6ecd2', 3, 0, .7 * (1 - pt / 10));
    if (pt < 0) { const u = easeOut(t / (L.pop - L.launch)), x = lerp(tx, ax, u), y = lerp(ty, ay, u) - Math.sin(u * PI) * 26 * s; ribbon(ctx, [[tx, ty], [lerp(tx, x, .5), lerp(ty, y, .5) - 8 * s], [x, y]], 1.2 * s, 5.5 * s, o.paper || '#f6ecd2', 3, 0, .9); }
    else { const un = easeOut(pt / 9), fade = (1 - ss(84, 118, pt)) * retire, bw = 210 * s * un, bh = 46 * s, drift = pt * .32 * s, sway = Math.sin(pt * .11) * 5 * s, x0 = ax - bw / 2 + drift, y0 = ay + sway * .4 + pt * .12 * s;
      if (fade > 0) { ctx.globalAlpha = fade; const top = [], botm = []; for (let i = 0; i <= 12; i++) { const u = i / 12, wv = Math.sin(u * 5 + pt * .16) * 4 * s * un + Math.sin(u * 2.2 - pt * .07) * 5 * s; top.push([x0 + u * bw, y0 + wv]); botm.push([x0 + u * bw, y0 + bh + wv * 1.15]); }
        ctx.fillStyle = css(o.shade || '#cdb9c6'); ctx.beginPath(); top.forEach((p, i) => i ? ctx.lineTo(p[0] + 2 * s, p[1] + 3 * s) : ctx.moveTo(p[0] + 2 * s, p[1] + 3 * s)); for (let i = 12; i >= 0; i--) ctx.lineTo(botm[i][0] + 2 * s, botm[i][1] + 3 * s); ctx.fill();
        ctx.fillStyle = css(o.paper || '#f6ecd2'); ctx.beginPath(); top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = 12; i >= 0; i--) ctx.lineTo(botm[i][0], botm[i][1]); ctx.fill();
        for (let i = 0; i < 14; i++) { const u = r(), v = r(); softDab(ctx, x0 + u * bw, y0 + v * bh, 16 * s, 8 * s, 0, r() < .5 ? '#fff6dc' : '#e6d6b8', .35 * fade); }
        ribbon(ctx, top.map(p => [p[0], p[1] + 4 * s]), 3 * s, 3 * s, o.trim || '#c9523a', 5, .5, fade); ribbon(ctx, botm.map(p => [p[0], p[1] - 4 * s]), 3 * s, 3 * s, o.trim || '#c9523a', 6, .5, fade);
        // rolled ends
        for (const e of [0, 12]) { ctx.globalAlpha = fade; ctx.fillStyle = css(o.roll || '#e4d2ae'); ctx.beginPath(); ctx.ellipse(top[e][0], (top[e][1] + botm[e][1]) / 2, 5 * s, bh * .56, 0, 0, TAU); ctx.fill(); }
        if (un > .5) { const ts = 22 * s, tw = letterWidth('NEW MODEL', ts, 1.1); ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 - 20 * s, bw, bh + 40 * s); ctx.clip(); const mid = top[6][1] - y0;
          lettering(ctx, 'NEW MODEL', x0 + bw / 2 - tw / 2 * 1, y0 + 12 * s + mid, ts, { col: o.ink || '#3a2f4a', wt: 3.6 * s, seed: 4, wob: .6, alpha: fade, track: 1.1 }); ctx.restore(); } }
      // confetti
      const cols = o.confetti || ['#e9624a', '#f2c14e', '#5fb7c9', '#f4efe0', '#e58fb0', '#7fb069']; for (let i = 0; i < 46; i++) { const a = r() * TAU, sp = (2 + r() * 5) * s, life = 44 + r() * 40; if (pt > life) { r(); r(); continue; }
        const x = ax + Math.cos(a) * sp * pt * (1 - pt / 260) * 1.3 + Math.sin(pt * .2 + i) * 5 * s, y = ay + bh / 2 + Math.sin(a) * sp * pt * .7 + .045 * pt * pt * s, c = cols[i % cols.length], rot = pt * (.2 + r() * .3) + i;
        ctx.globalAlpha = clamp(1.4 - pt / life * 1.4); ctx.fillStyle = css(c); ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillRect(-2.6 * s, -1.6 * s * Math.abs(Math.cos(rot * 1.3)) - .4, 5.2 * s, 3.2 * s * Math.abs(Math.cos(rot * 1.3)) + .8); ctx.restore(); } }
    end(ctx); } }

// ── grain / paper / vignette (built once)
const FX = {};
function buildFX() { const mkNoise = (w, h, fn) => { const c = mk(w, h), x = ctxOf(c), id = x.createImageData(w, h), d = id.data; for (let j = 0, k = 0; j < h; j++) for (let i = 0; i < w; i++, k += 4) { const v = fn(i, j); d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = v[3] == null ? 255 : v[3]; } x.putImageData(id, 0, 0); return c; };
  // static paper: fine tooth + soft mottling + a few fibres, drawn with multiply
  const pr = RNG(99); const half = mkNoise(W / 2, H / 2, (i, j) => { const t = 240 + 9 * fbm2(i / 90, j / 90, 5, 3) + (pr() - .5) * 16 + 5 * vnoise2(i / 3, j / 3, 9); return [clamp(t + 4, 0, 255), clamp(t + 1, 0, 255), clamp(t - 8, 0, 255)]; });
  FX.paper = mk(W, H); const px = ctxOf(FX.paper); px.drawImage(half, 0, 0, W, H); begin(px); for (let i = 0; i < 900; i++) { const x = pr() * W, y = pr() * H, a = pr() * PI; px.globalAlpha = .1 + .12 * pr(); px.strokeStyle = pr() < .5 ? '#fff9ea' : '#b9ab90'; px.lineWidth = .7 + pr(); px.beginPath(); px.moveTo(x, y); px.quadraticCurveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12 + 5, x + Math.cos(a) * (18 + pr() * 22), y + Math.sin(a) * (18 + pr() * 22)); px.stroke(); } end(px);
  FX.grain = []; for (let k = 0; k < 4; k++) { const gr = RNG(500 + k); FX.grain.push(mkNoise(480, 270, () => { const v = 128 + (gr() + gr() + gr() - 1.5) * 46; return [v, v, v]; })); }
  FX.vig = mk(W / 4, H / 4); const vx = ctxOf(FX.vig), g = vx.createRadialGradient(W / 8, H / 8 * .96, H / 8 * .62, W / 8, H / 8, H / 4 * 1.12); g.addColorStop(0, 'rgba(40,24,50,0)'); g.addColorStop(.6, 'rgba(40,24,50,.12)'); g.addColorStop(1, 'rgba(34,20,46,.42)'); vx.fillStyle = g; vx.fillRect(0, 0, W / 4, H / 4);
  FX.small = mk(W / 8, H / 8); FX.small2 = mk(W / 8, H / 8); FX.tmp = mk(W, H); FX.tmp2 = mk(W, H); }
// finishing pass on a finished frame: bloom, vignette, paper, boiling film grain
function finish(ctx, f, o = {}) { const s = ctxOf(FX.small), s2 = ctxOf(FX.small2), cv = ctx.canvas; s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1; s.imageSmoothingEnabled = true; s.drawImage(cv, 0, 0, W / 8, H / 8);
  s2.globalCompositeOperation = 'source-over'; s2.drawImage(FX.small, 0, 0); s2.globalCompositeOperation = 'multiply'; s2.drawImage(FX.small, 0, 0); s2.drawImage(FX.small, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = o.bloom == null ? .3 : o.bloom; ctx.drawImage(FX.small2, -6, -6, W + 12, H + 12);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = o.vig == null ? 1 : o.vig; ctx.drawImage(FX.vig, 0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .75; ctx.drawImage(FX.paper, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.grain == null ? .1 : o.grain; const g = FX.grain[f & 3], ox = -(hash(f * 3 + 1) * 200 | 0), oy = -(hash(f * 7 + 2) * 120 | 0); ctx.drawImage(g, ox, oy, 480 * 4.5, 270 * 4.5);
  ctx.restore(); }

// ── sets and the multiplane compositor
// layer: { id, cv, p, ox, oy, res, ground?, live?(ctx,f,env), under?(ctx,f,env) }  canvas px = ((lx-ox)*res, (ly-oy)*res)
// screen:  sx = W/2 + (lx - cam.x*p)*zl ;  sy = H/2 + (ly - cam.y*p)*zl + cam.tilt ;  zl = cam.z ^ (0.35 + 0.65*min(p,1.3))
const SETS = {};
const layerZoom = (cam, p) => Math.pow(cam.z, .35 + .65 * Math.min(p, 1.3));
function layerXf(cam, p) { const zl = layerZoom(cam, p); return [zl, W / 2 - cam.x * p * zl, H / 2 - cam.y * p * zl + (cam.tilt || 0)]; }
function newLayer(id, p, x0, y0, x1, y1, res = 1, extra = {}) { const cv = mk((x1 - x0) * res, (y1 - y0) * res), c = ctxOf(cv); c.setTransform(res, 0, 0, res, -x0 * res, -y0 * res); return Object.assign({ id, p, ox: x0, oy: y0, x1, y1, res, cv, ctx: c }, extra); }
function drawSet(ctx, set, cam, f, hooks = {}, env = {}) { ctx.imageSmoothingEnabled = true;
  for (const L of set.layers) { if (L.hidden && L.hidden(f, env)) continue; const [zl, tx, ty] = layerXf(cam, L.p), k = zl / L.res, dx = tx + L.ox * zl, dy = ty + L.oy * zl; let cv = L.cv;
    if (!cv) { }
    else if (L.alt) { // cross-fade two bakes (boiling clouds)
      const u = .5 + .5 * Math.sin(f * (L.boil || .08)); ctx.globalAlpha = 1; ctx.drawImage(L.cv, dx, dy, L.cv.width * k, L.cv.height * k); ctx.globalAlpha = u; ctx.drawImage(L.alt, dx + Math.sin(f * .05) * 1.5, dy, L.cv.width * k, L.cv.height * k); ctx.globalAlpha = 1; }
    else if (L.ground && !env.noGroundFx) { const t = ctxOf(FX.tmp); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.clearRect(0, 0, W, H); t.drawImage(cv, dx, dy, cv.width * k, cv.height * k);
      t.globalCompositeOperation = 'source-atop'; t.setTransform(zl, 0, 0, zl, tx, ty); groundFx(t, L, cam, f, zl, tx, env); t.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(FX.tmp, 0, 0); }
    else { ctx.globalAlpha = L.alpha ? L.alpha(f, env) : 1; ctx.drawImage(cv, dx, dy, cv.width * k, cv.height * k); ctx.globalAlpha = 1; }
    if (L.live || hooks[L.id]) { ctx.save(); ctx.setTransform(zl, 0, 0, zl, tx, ty); if (L.live) L.live(ctx, f, env, cam, zl); if (hooks[L.id]) hooks[L.id](ctx, zl, L); ctx.restore(); } } }
// drifting cloud shadows + wind bands, painted only where the layer already has paint
function groundFx(t, L, cam, f, zl, tx, env) { const xa = (0 - tx) / zl, xb = (W - tx) / zl, p = L.p, g = L.ground, yc = g.y == null ? 0 : g.y, hh = g.h || 300;
  const span = 2100 * Math.max(.35, p), shCol = env.shadowCol || '#39356e', sa = (env.shadowA == null ? .2 : env.shadowA) * (g.shadow == null ? 1 : g.shadow);
  if (sa > 0) for (let k = Math.floor((xa - span) / span); k <= Math.ceil(xb / span); k++) { const hx = hash2(k, 77 + (g.seed || 0)), x = k * span + hx * span * .6 + f * 1.5 * p, w = span * (.32 + .2 * hash2(k, 5)); softDab(t, x, yc + (hash2(k, 9) - .5) * hh * .4, w, hh * (.55 + .3 * hx), -.06, shCol, sa); }
  const wa = (env.windA == null ? .26 : env.windA) * (g.wind == null ? 1 : g.wind); if (wa > 0) for (const [gf, s] of GUSTS) { const d = f - gf; if (d < -40 || d > 70) continue; const x = (cam.x + d * 30) * p + (g.windOff || 0), a = wa * s * bump(d, -40, 0, 70); if (x < xa - 500 || x > xb + 500) continue;
      for (let i = 0; i < 3; i++) softDab(t, x - i * 150 * p, (g.wy == null ? yc : g.wy) + i * 14, 260 * Math.max(.5, p), (g.wh || hh * .5), -.5, env.windCol || '#f6f0a8', a * (1 - i * .28)); }
  t.globalAlpha = 1; }
// ── live, wind-driven grass (drawn every frame in a layer's coordinates). Each blade is a pure function of its index.
function liveGrass(ctx, f, o) { const sp = o.spacing, k0 = Math.floor(o.xa / sp) - 1, k1 = Math.ceil(o.xb / sp) + 1, ws = o.windScale || 1, ramp = o.ramp; ctx.lineCap = 'round';
  for (let k = k0; k <= k1; k++) for (let j = 0; j < (o.rows || 1); j++) { const h1 = hash2(k, 11 + j * 7 + (o.seed || 0)), h2 = hash2(k, 23 + j * 5 + (o.seed || 0)), h3 = hash2(k, 37 + j * 3 + (o.seed || 0));
    if (o.gap && h3 < o.gap) continue; const x = (k + h1) * sp, d = (j + h2) / (o.rows || 1), y = o.y(x) + d * (o.depth || 0), s = (o.size ? o.size(d) : 1), h = o.h * s * (.55 + .7 * h2);
    const w = windAtX(f, x / (o.px || 1)) * ws, lean = (.12 + (h1 - .5) * .5) + w * (1.0 + .5 * h3) + .1 * w * Math.sin(f * .5 + k * 1.7), tx = x + Math.sin(lean) * h, ty = y - Math.cos(lean * .8) * h;
    ctx.globalAlpha = o.alpha || 1; ctx.strokeStyle = css(cramp(ramp, clamp((o.baseT || .4) + (h3 - .5) * .7 + (o.tipLight || 0) * w))); ctx.lineWidth = (o.wid || 3) * s * (.6 + .8 * h1);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(lean * .3) * h * .5, y - h * .55, tx, ty); ctx.stroke();
    if (o.heads && h3 > 1 - o.heads) { ctx.fillStyle = css(o.headCol || '#e9dfa0'); ctx.beginPath(); ctx.ellipse(tx, ty, 3.2 * s * (o.headS || 1), 7 * s * (o.headS || 1), lean, 0, TAU); ctx.fill(); }
    if (o.flowers && h3 < o.flowers) { const c = o.flowerCols[(h1 * 97 | 0) % o.flowerCols.length], r = (o.flowerS || 6) * s; ctx.fillStyle = css(c); for (let q = 0; q < 5; q++) { const a = q * TAU / 5 + k; ctx.beginPath(); ctx.ellipse(tx + Math.cos(a) * r * .7, ty + Math.sin(a) * r * .6, r * .55, r * .42, a, 0, TAU); ctx.fill(); } ctx.fillStyle = css(o.flowerC || '#e9b23c'); ctx.beginPath(); ctx.arc(tx, ty, r * .38, 0, TAU); ctx.fill(); } }
  ctx.globalAlpha = 1; }
function liveGlints(ctx, f, o) { ctx.lineCap = 'round'; const col = css(o.col || '#fff6d8'); ctx.strokeStyle = col; for (let i = 0; i < o.n; i++) { const u = hash2(i, 3 + (o.seed || 0)), v = Math.pow(hash2(i, 5 + (o.seed || 0)), o.bias || 1.6), ph = hash2(i, 9) * TAU, a = Math.sin(f * (.22 + .2 * hash2(i, 13)) + ph); if (a < .25) continue;
    const x = o.x0 + u * (o.x1 - o.x0) + Math.sin(f * .04 + ph) * 6, y = o.y0 + v * (o.y1 - o.y0), s = .5 + v * 1.6; ctx.globalAlpha = (o.alpha || .8) * (a - .25) / .75 * (o.w ? o.w(x, y) : 1); ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.moveTo(x - 7 * s, y); ctx.lineTo(x + 7 * s, y + .6); ctx.stroke(); } ctx.globalAlpha = 1; }
// far gulls turning on slow circles
function liveGulls(ctx, f, o) { ctx.lineCap = 'round'; for (let i = 0; i < o.n; i++) { const cx = o.x + (hash2(i, 41) - .5) * o.w, cy = o.y + (hash2(i, 43) - .5) * o.h, R = 40 + 60 * hash2(i, 47), a = f * (.018 + .01 * hash2(i, 49)) * (i & 1 ? 1 : -1) + hash2(i, 51) * TAU, x = cx + Math.cos(a) * R * 1.6, y = cy + Math.sin(a) * R * .45, s = (o.s || 1) * (.7 + .6 * hash2(i, 53)) * (1 + .25 * Math.sin(a)), fl = Math.sin(f * .45 + i * 2) * .45 * (Math.sin(f * .05 + i) > .3 ? 1 : .15), dir = Math.cos(a) > 0 ? -1 : 1;
    ctx.globalAlpha = o.alpha || .9; ctx.strokeStyle = css(o.col || '#fbf6ea'); ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.moveTo(x - 9 * s, y - 3 * s * fl * 2 - 1); ctx.quadraticCurveTo(x - 4 * s, y - 4 * s * (.4 + fl), x, y); ctx.quadraticCurveTo(x + 4 * s, y - 4 * s * (.4 + fl), x + 9 * s, y - 3 * s * fl * 2 - 1); ctx.stroke();
    ctx.strokeStyle = css(o.col2 || '#59608a'); ctx.lineWidth = 1 * s; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(x - 2 * s * dir, y + 1.2 * s); ctx.lineTo(x + 3 * s * dir, y + 1.2 * s); ctx.stroke(); } ctx.globalAlpha = 1; }

// a small painted dust puff where something lands (t = frames since impact)
function dustPuff(ctx, x, y, t, s = 1, col = '#f4e8c8') { if (t < 0 || t > 16) return; const r = RNG((x | 0) * 3 + 11), u = t / 16; for (let i = 0; i < 12; i++) { const a = PI + r() * PI, d = (20 + r() * 60) * s * easeOut(u), sz = (10 + r() * 16) * s * (.6 + u); softDab(ctx, x + Math.cos(a) * d * 1.4, y + Math.sin(a) * d * .35 - 4, sz * 1.3, sz, 0, col, .6 * (1 - u)); } ctx.globalAlpha = 1; }
