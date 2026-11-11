'use strict';
// ───────────────────────── core: constants, math, rng, colour, canvas ─────────────────────────
const FPS = 24, NF = 1440, W = 1920, H = 1080, BAR = 24, BEAT = 8;
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const unlerp = (a, b, x) => clamp((x - a) / (b - a));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const smoother = t => { t = clamp(t); return t * t * t * (t * (6 * t - 15) + 10); };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = t => Math.pow(clamp(t), 3);
const easeIO = smoother;
const ss = (a, b, x) => smooth(unlerp(a, b, x));
const sso = (a, b, x) => smoother(unlerp(a, b, x));
const bump = (x, a, pk, b) => x <= a || x >= b ? 0 : x < pk ? smooth((x - a) / (pk - a)) : 1 - smooth((x - pk) / (b - pk));
const mix = lerp;
function hash(n) { n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
const hash2 = (a, b) => hash((a * 73856093) ^ (b * 19349663) ^ 0x5bd1e995);
function RNG(seed) { let s = seed >>> 0 || 1; const r = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r(); r.int = (a, b) => Math.floor(a + (b - a + 1) * r()); r.pick = a => a[Math.floor(r() * a.length)];
  r.gauss = () => (r() + r() + r() + r() - 2) / 1.0; r.sign = () => r() < .5 ? -1 : 1; return r; }
// value noise (1D / 2D), smooth, deterministic
function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash2(i, seed), hash2(i + 1, seed), u) * 2 - 1; }
function vnoise2(x, y, seed = 0) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix + seed * 131, iy), b = hash2(ix + 1 + seed * 131, iy), c = hash2(ix + seed * 131, iy + 1), d = hash2(ix + 1 + seed * 131, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1; }
function fbm(x, seed = 0, oct = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, seed + i * 17); a *= .5; f *= 2.03; } return s; }
function fbm2(x, y, seed = 0, oct = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise2(x * f, y * f, seed + i * 17); a *= .5; f *= 2.03; } return s; }
// keyframes: K = [[frame, value, easeName?], ...]  value number or array; ease applies to the segment ENDING at that key
const EASES = { lin: t => t, io: smoother, s: smooth, out: easeOut, in: easeIn, hold: t => t < 1 ? 0 : 1 };
function kf(f, K, def = 'io') { if (f <= K[0][0]) return K[0][1]; const n = K.length; if (f >= K[n - 1][0]) return K[n - 1][1];
  let i = 1; while (K[i][0] < f) i++; const a = K[i - 1], b = K[i], t = EASES[b[2] || def]((f - a[0]) / (b[0] - a[0]));
  if (typeof a[1] === 'number') return a[1] + (b[1] - a[1]) * t; return a[1].map((v, j) => v + (b[1][j] - v) * t); }
// colour
function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const _C = c => typeof c === 'string' ? hex(c) : c;
function cmix(a, b, t) { a = _C(a); b = _C(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function css(c, a = 1) { c = _C(c); return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`; }
function cjit(c, r, amt = 10, warm = 0) { c = _C(c); const v = (r() - .5) * 2 * amt, h = (r() - .5) * amt * .6; return [clamp(c[0] + v + h + warm, 0, 255), clamp(c[1] + v, 0, 255), clamp(c[2] + v - h - warm, 0, 255)]; }
function cramp(stops, t) { t = clamp(t); const n = stops.length - 1, x = t * n, i = Math.min(n - 1, Math.floor(x)); return cmix(stops[i], stops[i + 1], x - i); }
// canvas factory (browser or node shim)
function mk(w, h) { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); let c;
  if (typeof globalThis.__mkCanvas === 'function') c = globalThis.__mkCanvas(w, h); else { c = document.createElement('canvas'); c.width = w; c.height = h; }
  return c; }
const ctxOf = c => c.getContext('2d');
