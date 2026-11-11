// audio_test: render the soundtrack, write out/film.wav, and LISTEN BY MEASUREMENT.
//   node tools/audio_test.js [--quick]     (--quick skips the per-event onset renders and the stems)
const fs = require('fs'), path = require('path');
require('./load.js')(['core', 'story', 'audio']);
const quick = process.argv.includes('--quick'), SR = 48000;
const events = buildEvents(), tracks = buildTracks(), spf = SR / FPS;
const dB = x => 20 * Math.log10(x + 1e-12), pad = (s, n) => String(s).padEnd(n), fx = (x, d = 1) => (x >= 0 ? ' ' : '') + x.toFixed(d);

// ── render (timed)
let t0 = performance.now(); const out = renderAudio(events, tracks, SR); const tCold = performance.now() - t0;
t0 = performance.now(); const out2 = renderAudio(events, tracks, SR); const tWarm = performance.now() - t0;
const { L, R } = out, N = L.length;
let same = true; for (let i = 0; i < N; i += 97) if (L[i] !== out2.L[i] || R[i] !== out2.R[i]) { same = false; break; }
console.log(`render: ${(tCold / 1000).toFixed(2)} s cold, ${(tWarm / 1000).toFixed(2)} s warm   samples ${N} (${(N / SR).toFixed(3)} s)   deterministic: ${same}`);

// ── wav
(function () { const b = Buffer.alloc(44 + N * 4); b.write('RIFF', 0); b.writeUInt32LE(36 + N * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  const p = path.join(__dirname, '..', 'out', 'film.wav'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, b); console.log('wrote', p, (b.length / 1e6).toFixed(1) + ' MB'); })();

// ── independent BS.1770 meter (published 48 kHz coefficients; cross-checks the one inside audio.js)
function kweight(x) { const y = new Float64Array(x.length); let a1 = 0, a2 = 0, b1 = 0, b2 = 0, c1 = 0, c2 = 0, d1 = 0, d2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], s = 1.53512485958697 * v - 2.69169618940638 * a1 + 1.19839281085285 * a2 + 1.69065929318241 * b1 - 0.73248077421585 * b2; a2 = a1; a1 = v; b2 = b1; b1 = s;
    const z = s - 2 * c1 + c2 + 1.99004745483398 * d1 - 0.99007225036621 * d2; c2 = c1; c1 = s; d2 = d1; d1 = z; y[i] = z; } return y; }
const kL = kweight(L), kR = kweight(R), lk = e => -0.691 + 10 * Math.log10(e + 1e-30);
function msq(a, b) { let s = 0; a = Math.max(0, a); b = Math.min(N, b); for (let i = a; i < b; i++) s += kL[i] * kL[i] + kR[i] * kR[i]; return s / Math.max(1, b - a); }
function integrated() { const blk = .4 * SR, hop = .1 * SR, B = []; for (let a = 0; a + blk <= N; a += hop) B.push(msq(a, a + blk)); let g = B.filter(e => lk(e) > -70); const rel = lk(g.reduce((x, y) => x + y, 0) / g.length) - 10; g = g.filter(e => lk(e) > rel); return lk(g.reduce((x, y) => x + y, 0) / g.length); }
const I = integrated();

// ── peaks, true peak (4x windowed-sinc), DC, clicks
let pk = 0, pkAt = 0, dc = 0, jump = 0, jumpAt = 0, clipped = 0;
for (let i = 0; i < N; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) { pk = a; pkAt = i; } if (a >= .9999) clipped++; dc += L[i] + R[i];
  if (i) { const j = Math.max(Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1])); if (j > jump) { jump = j; jumpAt = i; } } }
function truePeak() { const T = 24, tp = { v: 0 }; const taps = [1, 2, 3].map(ph => { const h = []; for (let k = -T; k < T; k++) { const x = k + 1 - ph / 4 - 1 + 1e-12, w = .5 + .5 * Math.cos(Math.PI * (k + .5 - ph / 4 + .5) / T); h.push(Math.sin(Math.PI * (k - ph / 4 + 1e-12)) / (Math.PI * (k - ph / 4 + 1e-12)) * Math.max(0, w)); } return h; });
  for (const x of [L, R]) for (let i = T; i < N - T; i++) { if (Math.abs(x[i]) < pk * .6 && Math.abs(x[i + 1]) < pk * .6) continue; for (const h of taps) { let s = 0; for (let k = -T; k < T; k++) s += x[i - k] * h[k + T]; if (Math.abs(s) > tp.v) tp.v = Math.abs(s); } } return Math.max(tp.v, pk); }
const tp = truePeak();
console.log(`integrated loudness: ${I.toFixed(2)} LUFS (internal meter ${A_AUDIO.lufs(L, R, SR).toFixed(2)})   sample peak ${dB(pk).toFixed(2)} dBFS @ f${(pkAt / spf).toFixed(1)}   true peak ${dB(tp).toFixed(2)} dBTP   clipped samples ${clipped}   limiter touched ${out.meta.limited} samples`);
console.log(`DC ${(dc / (2 * N)).toExponential(2)}   max sample-to-sample jump ${jump.toFixed(4)} @ f${(jumpAt / spf).toFixed(2)}   last sample ${Math.abs(L[N - 1]).toExponential(1)} / first ${Math.abs(L[0]).toExponential(1)}`);

// ── per-shot levels
const cuts = events.filter(e => e.type === 'cut' && e.major).map(e => e.f).concat([NF]); const rows = [];
for (let s = 0; s + 1 < cuts.length; s++) { const a = cuts[s] * spf, b = cuts[s + 1] * spf; let e = 0; for (let i = a; i < b; i++) e += L[i] * L[i] + R[i] * R[i]; rows.push({ shot: s + 1, a: cuts[s], b: cuts[s + 1], rms: 10 * Math.log10(e / (2 * (b - a)) + 1e-30), lu: lk(msq(a, b)) }); }
console.log('\nshot  frames        RMS dBFS   K-weighted LUFS');
for (const r of rows) console.log(`  ${r.shot}   ${pad(r.a + '-' + r.b, 11)}  ${fx(r.rms)}     ${fx(r.lu)}`);
const pkE = events.find(e => e.type === 'peak').f, tut = { a: pkE, b: 1400 }; { const a = tut.a * spf, b = tut.b * spf; let e = 0; for (let i = a; i < b; i++) e += L[i] * L[i] + R[i] * R[i]; console.log(`  7*  ${pad(tut.a + '-' + tut.b, 11)}  ${fx(10 * Math.log10(e / (2 * (b - a))))}     ${fx(lk(msq(a, b)))}`); }
const q = rows.reduce((m, r) => r.lu < m.lu ? r : m), ld = rows.reduce((m, r) => r.lu > m.lu ? r : m), qr = rows.reduce((m, r) => r.rms < m.rms ? r : m), lr = rows.reduce((m, r) => r.rms > m.rms ? r : m);
console.log(`quietest shot: ${q.shot} (LUFS) / ${qr.shot} (RMS)   loudest shot: ${ld.shot} (LUFS) / ${lr.shot} (RMS)`);

// ── short-term loudness (3 s window, 1 s hop) against the emotion curve
{ const st = [], em = []; let line = ''; for (let c = 1.5; c <= 58.5; c += 1) { const v = lk(msq((c - 1.5) * SR, (c + 1.5) * SR)); st.push(v); let m = 0; for (let f = Math.round((c - 1.5) * FPS); f < Math.round((c + 1.5) * FPS); f++) m += tracks.emotion[f]; em.push(m / 72); }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length, ms = mean(st), me = mean(em); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < st.length; i++) { sxy += (st[i] - ms) * (em[i] - me); sxx += (st[i] - ms) ** 2; syy += (em[i] - me) ** 2; }
  console.log(`\nshort-term loudness vs emotion: r = ${(sxy / Math.sqrt(sxx * syy)).toFixed(3)}   range ${Math.min(...st).toFixed(1)} .. ${Math.max(...st).toFixed(1)} LUFS (max at ${(st.indexOf(Math.max(...st)) + 1.5)} s, min at ${(st.indexOf(Math.min(...st)) + 1.5)} s)`);
  for (let i = 0; i < st.length; i += 3) line += `${(i + 1.5).toFixed(0)}s:${st[i].toFixed(0)}/${em[i].toFixed(2)}  `; console.log('  t:LUFS/emotion  ' + line);
  let mx = -99, mxAt = 0; for (let f = 0; f + 10 < NF; f += 2) { const v = lk(msq(f * spf, (f + 10) * spf)); if (v > mx) { mx = v; mxAt = f; } } console.log(`  loudest 0.4 s window starts at frame ${mxAt} (${mx.toFixed(1)} LUFS)`); }

// ── spectrum (radix-2 FFT, Hann, averaged)
function bands(xl, xr, a, b) { const n = 8192, re = new Float64Array(n), im = new Float64Array(n), acc = new Float64Array(n / 2); let cnt = 0;
  for (let s = a; s + n <= b; s += n / 2) { for (let i = 0; i < n; i++) { re[i] = (xl[s + i] + xr[s + i]) * .5 * (.5 - .5 * Math.cos(2 * Math.PI * i / n)); im[i] = 0; }
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
    for (let i = 0; i < n / 2; i++) acc[i] += re[i] * re[i] + im[i] * im[i]; cnt++; }
  const edges = [0, 100, 250, 1000, 4000, 8000, 24000], e = edges.slice(1).map(() => 0); let tot = 0; for (let i = 1; i < n / 2; i++) { const f = i * SR / n; for (let k = 0; k < e.length; k++) if (f >= edges[k] && f < edges[k + 1]) e[k] += acc[i]; tot += acc[i]; }
  return e.map(v => 100 * v / tot); }
const bfmt = b => `<100 ${b[0].toFixed(1)}%  100-250 ${b[1].toFixed(1)}%  250-1k ${b[2].toFixed(1)}%  1k-4k ${b[3].toFixed(1)}%  4k-8k ${b[4].toFixed(1)}%  >8k ${b[5].toFixed(1)}%   [100 Hz-4 kHz: ${(b[1] + b[2] + b[3]).toFixed(1)}%]`;
console.log('\nspectral balance, full mix : ' + bfmt(bands(L, R, 0, N)));

// ── the theme
{ const S = out.meta.score; console.log(`\ntheme (${S.key}, 3/4, bar = ${BAR} frames), tutti statement, peak event at frame ${S.peak}:`);
  const byBar = {}; for (const n of S.theme) (byBar[n.bar] = byBar[n.bar] || []).push(`${n.name}(${n.d / BEAT} beat${n.d / BEAT > 1 ? 's' : ''})@${n.f}`); for (const b in byBar) console.log(`  bar ${b}: ${byBar[b].join('  ')}`);
  const top = Math.max(...S.theme.map(n => n.m)), tops = S.theme.filter(n => n.m === top); console.log(`  highest theme note ${tops[0].name} at frame(s) ${tops.map(n => n.f)} -> ${tops.length === 1 && tops[0].f === S.peak ? 'ON the peak' : 'NOT on the peak'}`);
  const rtop = Math.max(...S.reed.map(n => n.m)), rt = S.reed.filter(n => n.m === rtop); console.log(`  highest reed note in the whole film: ${A_AUDIO.nname(rtop)} at frame(s) ${rt.map(n => n.f)}   music ends by frame ${S.musicEnd}`);
  console.log(`  notes: piano ${S.piano.length}, celesta ${S.cel.length}, reed ${S.reed.length}, strings ${S.str.length}, pizzicato ${S.pizz.length}`); }

if (!quick) {
  // ── stems at the mix gain (no limiter): who is loud where
  const g = out.meta.gain, stems = {}; console.log('\nstems, K-weighted LUFS per shot (at mix gain):      1      2      3      4      5      6      7');
  for (const s of ['music', 'amb', 'foley', 'bell']) { const r = renderAudio(events, tracks, SR, { stem: s, fixedGain: g }); stems[s] = r; const a = kweight(r.L), b = kweight(r.R); let line = '';
    for (let k = 0; k + 1 < cuts.length; k++) { let e = 0; const i0 = cuts[k] * spf, i1 = cuts[k + 1] * spf; for (let i = i0; i < i1; i++) e += a[i] * a[i] + b[i] * b[i]; line += fx(lk(e / (i1 - i0))).padStart(7); } console.log(`  ${pad(s, 46)}${line}`); }
  console.log('spectral balance, music stem: ' + bfmt(bands(stems.music.L, stems.music.R, 0, N)));
  // ── bells against the bed: level of the bell stem vs everything else in the 0.4 s after each ring
  { const bed = ['music', 'amb', 'foley'], bl = stems.bell; for (const e of events.filter(e => e.type === 'bell')) { const a = e.f * spf, b = a + .4 * SR; let eb = 0, eo = 0, ep = 0;
      for (let i = a; i < b; i++) { let l = 0, r = 0; for (const s of bed) { l += stems[s].L[i]; r += stems[s].R[i]; } eo += l * l + r * r; eb += bl.L[i] * bl.L[i] + bl.R[i] * bl.R[i]; }
      for (let i = a - .4 * SR; i < a - .05 * SR; i++) { let l = 0, r = 0; for (const s of bed) { l += stems[s].L[i]; r += stems[s].R[i]; } ep += l * l + r * r; }
      console.log(`  bell @${e.f}: bell ${(10 * Math.log10(eb / (.8 * SR))).toFixed(1)} dB, bed under it ${(10 * Math.log10(eo / (.8 * SR))).toFixed(1)} dB (bed just before ${(10 * Math.log10(ep / (.7 * SR))).toFixed(1)} dB) -> bell is ${(10 * Math.log10(eb / eo)).toFixed(1)} dB over the bed`); } }
  // ── onset accuracy: every transient event rendered alone; onset = first sample reaching 10 % of its local peak
  console.log('\nonset error per transient type (isolated render of each event; frames, + = late):');
  const TT = ['pedal', 'clunk', 'land', 'banner_pop', 'launch', 'footstep', 'bell', 'tip', 'getup', 'touch', 'chirp', 'brake', 'sit']; let worstAll = 0;
  for (const type of TT) { const evs = events.filter(e => e.type === type); let worst = 0, sum = 0, pre = 0;
    evs.forEach((e, k) => { const r = renderAudio(events, tracks, SR, { only: type, index: k }), c = Math.round(e.f * spf), a = Math.max(0, c - 4 * spf), b = Math.min(N, c + 4 * spf); let p = 0;
      for (let i = a; i < b; i++) { const v = Math.abs(r.L[i]) + Math.abs(r.R[i]); if (v > p) p = v; } let on = b; for (let i = a; i < b; i++) if (Math.abs(r.L[i]) + Math.abs(r.R[i]) >= .1 * p) { on = i; break; }
      let pr = 0; for (let i = a; i < c - 1; i++) pr = Math.max(pr, Math.abs(r.L[i]) + Math.abs(r.R[i])); pre = Math.max(pre, pr / (p || 1));
      const err = (on - c) / spf; sum += err; if (Math.abs(err) > Math.abs(worst)) worst = err; });
    worstAll = Math.max(worstAll, Math.abs(worst)); console.log(`  ${pad(type, 11)} n=${pad(evs.length, 3)} worst ${fx(worst, 3)} fr (${fx(worst * 1000 / FPS, 1)} ms)   mean ${fx(sum / evs.length, 3)} fr   pre-roll ${(pre * 100).toFixed(1)}%   ${Math.abs(worst) <= 1 ? 'ok' : 'FAIL'}`); }
  // ── and in the full mix: how much the 1 kHz+ energy rises in the frame after each cue vs the frame before (masking check)
  { const hp = new Float32Array(N); let x1 = 0, y1 = 0; const qq = Math.exp(-2 * Math.PI * 1000 / SR); for (let i = 0; i < N; i++) { const x = (L[i] + R[i]) * .5; y1 = qq * (y1 + x - x1); x1 = x; hp[i] = y1; }
    const en = (a, b) => { let s = 0; for (let i = Math.max(0, a); i < Math.min(N, b); i++) s += hp[i] * hp[i]; return s / (b - a) + 1e-14; }; let line = '';
    for (const type of TT) { const v = events.filter(e => e.type === type).map(e => 10 * Math.log10(en(e.f * spf, e.f * spf + spf) / en(e.f * spf - spf, e.f * spf))).sort((a, b) => a - b); line += `${type} ${v[v.length >> 1].toFixed(0)}/${v[0].toFixed(0)}  `; }
    console.log('full-mix rise above 1 kHz at the cue, dB (median/min): ' + line); }
  console.log(`\nSUMMARY  LUFS ${I.toFixed(2)} (${Math.abs(I + 16) <= 1 ? 'ok' : 'FAIL'})  true peak ${dB(tp).toFixed(2)} dBTP (${dB(tp) < -1 ? 'ok' : 'FAIL'})  quietest ${q.shot} (${q.shot === 4 ? 'ok' : 'FAIL'})  loudest ${ld.shot} (${ld.shot === 7 ? 'ok' : 'FAIL'})  worst onset ${worstAll.toFixed(3)} fr (${worstAll <= 1 ? 'ok' : 'FAIL'})  render ${(tWarm / 1000).toFixed(2)} s`);
}
