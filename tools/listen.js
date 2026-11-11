// listen: the LISTENER.  Renders the soundtrack, hears it by measurement, draws what it heard, and writes sync_report.md.
//   node tools/listen.js            -> out/film.wav, out/listen_mel.png, sync_report.md   (exit code 1 if any check fails)
// Independent of the meters inside src/audio.js: its own FFT, K-weighting, gating, true-peak interpolator and onset detectors.
const fs = require('fs'), path = require('path');
const load = require('./load.js'); load(['core', 'story', 'cams', 'audio']);
const { createCanvas } = load;
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'out'); fs.mkdirSync(OUT, { recursive: true });
const SR = 48000, SPF = SR / FPS;                       // 2000 samples per picture frame
const events = buildEvents(), tracks = buildTracks();
const MAJOR = events.filter(e => e.type === 'cut' && e.major).map(e => e.f), SHOTS = MAJOR.map((a, i) => [a, MAJOR[i + 1] === undefined ? NF : MAJOR[i + 1]]);
const TRANSIENT = ['pedal', 'clunk', 'land', 'banner_pop', 'launch', 'footstep', 'bell', 'tip', 'getup', 'touch', 'chirp', 'brake', 'sit'];
const SOFT = ['sigh', 'flinch', 'glint', 'bloom', 'roll_smooth', 'tram_bell', 'gust', 'fall', 'rustle', 'lean'];   // sounding but not percussive: measured, not judged
const dB = x => 20 * Math.log10(Math.abs(x) + 1e-12), p10 = x => 10 * Math.log10(x + 1e-30), fx = (x, d = 2) => (x >= 0 ? '+' : '') + x.toFixed(d);
const T0 = performance.now(), log = s => console.log(s);

// ───────────── render
const mix = renderAudio(events, tracks, SR), L = mix.L, R = mix.R, N = L.length;
const music = renderAudio(events, tracks, SR, { stem: 'music', fixedGain: mix.meta.gain });
log(`rendered ${N} samples (${(N / SR).toFixed(3)} s) + music stem in ${((performance.now() - T0) / 1000).toFixed(1)} s`);

// ───────────── wav (16-bit stereo 48 k)
let clipped = 0, q16clip = 0;
{ const b = Buffer.alloc(44 + N * 4); b.write('RIFF', 0); b.writeUInt32LE(36 + N * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { for (const [x, o] of [[L[i], 44], [R[i], 46]]) { if (Math.abs(x) >= .9999) clipped++; let v = Math.round(x * 32767); if (v > 32767 || v < -32768) { q16clip++; v = Math.max(-32768, Math.min(32767, v)); } b.writeInt16LE(v, o + i * 4); } }
  fs.writeFileSync(path.join(OUT, 'film.wav'), b); log(`wrote out/film.wav ${(b.length / 1e6).toFixed(1)} MB`); }

// ───────────── DSP kit
function fft(re, im) { const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < h; k++) { const a = i + k, b = a + h, vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr; re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
// STFT magnitudes; column j is centred on sample j*hop.  cb(j, mag) with mag normalised so a full-scale sine reads 1.
function stft(x, nfft, hop, cb) { const w = new Float64Array(nfft); let ws = 0; for (let i = 0; i < nfft; i++) { w[i] = .5 - .5 * Math.cos(2 * Math.PI * i / nfft); ws += w[i]; }
  const re = new Float64Array(nfft), im = new Float64Array(nfft), mag = new Float64Array(nfft / 2), cols = Math.floor(x.length / hop), h = nfft / 2, g = 2 / ws;
  for (let j = 0; j < cols; j++) { const c = j * hop; for (let i = 0; i < nfft; i++) { const k = c - h + i; re[i] = k >= 0 && k < x.length ? x[k] * w[i] : 0; im[i] = 0; } fft(re, im);
    for (let i = 0; i < h; i++) mag[i] = Math.hypot(re[i], im[i]) * g; cb(j, mag); } return cols; }
function biquad(x, b0, b1, b2, a1, a2) { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = x[i], o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o; } return y; }
function rbj(type, f, q) { const w = 2 * Math.PI * f / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al; return type === 'hp' ? [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - al) / a0] : [(1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - al) / a0]; }
const filt = (x, type, f, order2 = 2) => { let y = x; for (let i = 0; i < order2; i++) y = biquad(y, ...rbj(type, f, Math.SQRT1_2)); return y; };
// BS.1770-4 K-weighting, published 48 kHz coefficients
const kw = x => biquad(biquad(x, 1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585), 1, -2, 1, -1.99004745483398, 0.99007225036621);
const lk = z => -0.691 + p10(z);
function prefix(a, b) { const P = new Float64Array(a.length + 1); for (let i = 0; i < a.length; i++) P[i + 1] = P[i] + a[i] * a[i] + (b ? b[i] * b[i] : 0); return P; }
const KP = prefix(kw(L), kw(R)), RP = prefix(L, R);
const kms = (a, b) => { a = Math.max(0, Math.round(a)); b = Math.min(N, Math.round(b)); return (KP[b] - KP[a]) / Math.max(1, b - a); };
const kLU = (fa, fb) => lk(kms(fa * SPF, fb * SPF)), rmsDB = (fa, fb) => { const a = Math.round(fa * SPF), b = Math.round(fb * SPF); return p10((RP[b] - RP[a]) / (2 * (b - a))); };

// ───────────── (g) integrated loudness, gated
function integrated() { const blk = .4 * SR, hop = .1 * SR, B = []; for (let a = 0; a + blk <= N; a += hop) B.push(kms(a, a + blk));
  let g = B.filter(z => lk(z) > -70); const rel = lk(g.reduce((x, y) => x + y, 0) / g.length) - 10; g = g.filter(z => lk(z) > rel); return { I: lk(g.reduce((x, y) => x + y, 0) / g.length), rel, blocks: B.length, kept: g.length }; }
const INT = integrated();

// ───────────── (f) peaks: sample peak and 4x oversampled true peak (24-tap-per-phase Hann-windowed sinc, every sample)
let pk = 0, pkAt = 0; for (let i = 0; i < N; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) { pk = a; pkAt = i; } }
function truePeak() { const T = 12, ph = [1, 2, 3].map(p => { const h = new Float64Array(2 * T); let s = 0; for (let k = -T; k < T; k++) { const u = k + p / 4, v = Math.sin(Math.PI * u) / (Math.PI * u) * (.5 + .5 * Math.cos(Math.PI * u / T)); h[k + T] = v; s += v; } for (let i = 0; i < 2 * T; i++) h[i] /= s; return h; });
  let tp = pk, at = pkAt; for (const x of [L, R]) for (let i = T; i < N - T; i++) for (const h of ph) { let s = 0; for (let k = -T; k < T; k++) s += x[i - k] * h[k + T]; if (s < 0) s = -s; if (s > tp) { tp = s; at = i; } } return { tp, at }; }
const TP = truePeak();

// ───────────── short-term (3 s) and momentary (0.4 s) loudness, one value per picture frame (window centred on the frame)
const ST = new Float64Array(NF), MO = new Float64Array(NF);
for (let f = 0; f < NF; f++) { ST[f] = lk(kms((f - 36) * SPF, (f + 36) * SPF)); MO[f] = lk(kms((f - 4.8) * SPF, (f + 4.8) * SPF)); }
function pearson(a, b) { const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (a[i] - ma) * (b[i] - mb); sxx += (a[i] - ma) ** 2; syy += (b[i] - mb) ** 2; } return sxy / Math.sqrt(sxx * syy); }
// (c) full 3 s windows only (centres 1.5 s .. 58.5 s), every 6 frames; emotion averaged over the same 3 s the meter integrates
const EMW = new Float64Array(NF); for (let f = 0; f < NF; f++) { let s = 0, n = 0; for (let g = Math.max(0, f - 36); g < Math.min(NF, f + 36); g++) { s += tracks.emotion[g]; n++; } EMW[f] = s / n; }
const cs = [], ce = [], cp = []; for (let f = 36; f <= NF - 36; f += 6) { cs.push(ST[f]); ce.push(EMW[f]); cp.push(tracks.emotion[f]); }
const rEmo = pearson(cs, ce), rEmoPoint = pearson(cs, cp);

// ───────────── (d) per-shot loudness
const shotRows = SHOTS.map(([a, b], i) => ({ shot: i + 1, a, b, lu: kLU(a, b), rms: rmsDB(a, b), stMin: Math.min(...ST.slice(a, b)), stMax: Math.max(...ST.slice(a, b)), mus: null }));
{ const MP = prefix(kw(music.L), kw(music.R)); for (const r of shotRows) r.mus = lk((MP[r.b * SPF] - MP[r.a * SPF]) / ((r.b - r.a) * SPF)); }
const pkF = (events.find(e => e.type === 'peak') || { f: 1248 }).f, s7 = { lu: kLU(pkF, 1400), rms: rmsDB(pkF, 1400) };
const cmp = shotRows.map(r => r.shot === 7 ? s7.lu : r.lu), quietest = cmp.indexOf(Math.min(...cmp)) + 1, loudest = cmp.indexOf(Math.max(...cmp)) + 1;

// ───────────── onset detection by spectral flux (log-compressed magnitudes, 1024-pt FFT, hop 250 = 8 per picture frame)
const OH = 250, OW = 1024, HFBIN = Math.ceil(2500 / (SR / OW));
function fluxOf(x) { const cols = Math.floor(x.length / OH), full = new Float64Array(cols), hi = new Float64Array(cols), hist = [new Float64Array(OW / 2), new Float64Array(OW / 2)], y = new Float64Array(OW / 2);
  stft(x, OW, OH, (j, m) => { const prev = hist[j & 1]; let a = 0, b = 0; for (let i = 1; i < OW / 2; i++) { y[i] = Math.log1p(2000 * m[i]); if (j >= 2) { const d = y[i] - prev[i]; if (d > 0) { a += d; if (i >= HFBIN) b += d; } } } prev.set(y); full[j] = a; hi[j] = b; });   // prev = column j-2 (10 ms lag)
  return { full, hi, cols }; }
// peak-pick the flux (local max within ±0.75 frame, above the running ±12-frame median by delta x the global spread), then time the onset at the
// LEADING EDGE of that peak: walk back (at most 1.5 frames) to where the flux first rose through 30 % of the peak's height.  A struck note and a
// blown note are then both timed where they begin, not where their flux happens to crest; onsets closer than 0.6 frame merge (strongest wins).
function pick(fl, delta, bias) { const n = fl.length, raw = [], W = 6, M = 96;
  const sorted = Array.from(fl).sort((a, b) => a - b), spread = sorted[Math.floor(n * .9)] - sorted[Math.floor(n * .5)] + 1e-9;
  for (let j = 2; j < n - 2; j++) { const v = fl[j]; let mx = true; for (let k = Math.max(0, j - W); k <= Math.min(n - 1, j + W); k++) if (fl[k] > v) { mx = false; break; } if (!mx) continue;
    const seg = Array.from(fl.subarray(Math.max(0, j - M), Math.min(n, j + M))).sort((a, b) => a - b), med = seg[seg.length >> 1]; if (v - med < delta * spread) continue;
    const thr = med + .3 * (v - med); let k = j, pos = j; while (k > 0 && j - k < 12) { if (fl[k - 1] < thr) { pos = k - 1 + (thr - fl[k - 1]) / (fl[k] - fl[k - 1]); break; } k--; }
    raw.push({ f: (pos * OH - bias) / SPF, s: (v - med) / spread }); }
  const on = []; for (const o of raw) { const p = on[on.length - 1]; if (p && o.f - p.f < .6) { if (o.s > p.s) p.s = o.s; } else on.push(o); } return on; }
// calibrate the detector's timing bias on synthetic bursts (a struck mode + noise tick over a noise bed), at 3 levels
function calibrate() { const n = SR * 4, x = new Float64Array(n); let s = 12345; const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) | 0) * 4.656612873e-10);
  for (let i = 0; i < n; i++) x[i] = .004 * rnd(); const at = [.5, 1.5, 2.5, 3.5].map(t => Math.round(t * SR) + 137), lev = [.02, .06, .15, .3];
  at.forEach((a, k) => { for (let i = 0; i < 4000; i++) x[a + i] += lev[k] * (Math.exp(-i / 900) * Math.sin(2 * Math.PI * 880 * i / SR) + .5 * Math.exp(-i / 120) * rnd()); });
  const res = {}; for (const band of ['full', 'hi']) { const on = pick(fluxOf(x)[band], 1.2, 0), e = at.map(a => { let best = null; for (const o of on) if (best === null || Math.abs(o.f * SPF - a) < Math.abs(best - a)) best = o.f * SPF; return best - a; });
    res[band] = { bias: e.reduce((p, q) => p + q, 0) / e.length, spread: Math.max(...e) - Math.min(...e) }; } return res; }
const CAL = calibrate();
const mono = new Float64Array(N); for (let i = 0; i < N; i++) mono[i] = .5 * (L[i] + R[i]);
const FLm = fluxOf(mono), ONfull = pick(FLm.full, 1.0, CAL.full.bias), ONhi = pick(FLm.hi, 1.0, CAL.hi.bias);
const mmono = new Float64Array(N); for (let i = 0; i < N; i++) mmono[i] = .5 * (music.L[i] + music.R[i]);
const FLmu = fluxOf(mmono), ONmusic = pick(FLmu.full, 1.3, CAL.full.bias), ONmusicSoft = pick(FLmu.full, .6, CAL.full.bias);   // strict list for the grid statistic; sensitive list to find soft downbeats at the cuts
const nearest = (list, f, tol) => { let b = null; for (const o of list) if (Math.abs(o.f - f) <= tol && (b === null || Math.abs(o.f - f) < Math.abs(b.f - f))) b = o; return b; };

// ───────────── (a) every cue: isolated render of its own event -> onset = first sample reaching 10 % of its local peak
const cueRows = [], cnt = {}; let worst = { err: 0 }, nTrans = 0, nFail = 0, nMixSeen = 0;
for (const e of events) { const k = cnt[e.type] = (cnt[e.type] || 0) + 1, det = Object.keys(e).filter(q => q !== 'f' && q !== 'type').map(q => `${q}=${typeof e[q] === 'number' ? +e[q].toFixed(2) : e[q]}`).join(' ');
  const row = { f: e.f, type: e.type, det, on: null, err: null, mix: null, verdict: '—', kind: TRANSIENT.includes(e.type) ? 'transient' : SOFT.includes(e.type) ? 'soft' : 'mark' };
  if (row.kind !== 'mark') { const r = renderAudio(events, tracks, SR, { only: e.type, index: k - 1 }), c = Math.round(e.f * SPF), a = Math.max(0, c - 4 * SPF), b = Math.min(N, c + 4 * SPF); let p = 0, pre = 0;
    for (let i = a; i < b; i++) { const v = Math.abs(r.L[i]) + Math.abs(r.R[i]); if (v > p) p = v; }
    if (p > 1e-7) { let on = b; for (let i = a; i < b; i++) if (Math.abs(r.L[i]) + Math.abs(r.R[i]) >= .1 * p) { on = i; break; } for (let i = a; i < c - SPF; i++) pre = Math.max(pre, Math.abs(r.L[i]) + Math.abs(r.R[i]));
      row.on = on / SPF; row.err = row.on - e.f; row.pre = pre / p; row.peak = p; } else row.silent = true; }
  if (row.kind === 'transient') { nTrans++; const m1 = nearest(ONfull, e.f, 1.5), m2 = nearest(ONhi, e.f, 1.5), m = m1 && m2 ? (Math.abs(m1.f - e.f) <= Math.abs(m2.f - e.f) ? m1 : m2) : (m1 || m2); if (m) { row.mix = m.f; nMixSeen++; }
    const ok = row.err !== null && Math.abs(row.err) <= 1; row.verdict = ok ? 'PASS' : 'FAIL'; if (!ok) nFail++; if (row.err === null) row.silent = true; else if (Math.abs(row.err) > Math.abs(worst.err)) worst = row; }
  else if (row.kind === 'soft') row.verdict = 'info';
  cueRows.push(row); }
const byType = {}; for (const r of cueRows) if (r.kind === 'transient') { const t = byType[r.type] = byType[r.type] || { n: 0, worst: 0, sum: 0, mix: 0, fail: 0, mixErr: [] }; t.n++; if (r.err !== null) { t.sum += r.err; if (Math.abs(r.err) > Math.abs(t.worst)) t.worst = r.err; } if (r.mix !== null) { t.mix++; t.mixErr.push(r.mix - r.f); } if (r.verdict === 'FAIL') t.fail++; }
const missingTypes = TRANSIENT.filter(t => !byType[t]);
log(`isolated onsets measured for ${nTrans} transient cues (${((performance.now() - T0) / 1000).toFixed(1)} s)`);

// ───────────── (b) the beat grid: music-stem onsets against the 8-frame beat, and a downbeat on every major cut where music plays
const S = mix.meta.score, BEATF = 8, BARF = 24;
const gridDev = f => { const m = ((f % BEATF) + BEATF) % BEATF; return m > BEATF / 2 ? m - BEATF : m; };
const musDev = ONmusic.map(o => gridDev(o.f)), onGrid = musDev.filter(d => Math.abs(d) <= 1).length, gridFrac = onGrid / Math.max(1, musDev.length);
const barOn = ONmusic.filter(o => { const m = ((o.f % BARF) + BARF) % BARF; return m <= 1 || m >= BARF - 1; }).length;
const written = [].concat(S.piano, S.cel, S.reed, S.pizz).map(n => n.f), writtenGrid = written.filter(f => Math.abs(gridDev(f)) < 1e-6).length / written.length;
const CUTCHK = [168, 360, 648, 1056, 1248].filter(c => MAJOR.includes(c));
const MPm = prefix(kw(music.L), kw(music.R)), musLU = (fa, fb) => lk((MPm[Math.round(fb * SPF)] - MPm[Math.round(fa * SPF)]) / ((fb - fa) * SPF));
const cutRows = CUTCHK.map(c => { const before = musLU(c - 12, c), after = musLU(c, c + 12), nextNote = Math.min(...written.filter(f => f >= c - 1)), playing = after > -45 && nextNote - c <= 1;
  const m = nearest(ONmusicSoft, c, 1), mx = nearest(ONfull, c, 1) || nearest(ONhi, c, 1); return { c, before, after, playing, nextNote, on: m ? m.f : null, mixOn: mx ? mx.f : null, bar: c % BARF === 0, ok: !playing || !!m }; });
const cutsOK = cutRows.every(r => r.ok && r.bar), gridOK = gridFrac >= .7;

// ───────────── (e) bells: 1.5-6 kHz energy, 150 ms after vs 150 ms before, in the full mix
const bandM = filt(filt(mono, 'hp', 1500), 'lp', 6000), BP = prefix(bandM), bandDB = (a, b) => p10((BP[Math.round(b)] - BP[Math.round(a)]) / (b - a));
// diagnosis only: the bell stem alone at the mix gain, so a failing bell can be told apart (masked by the bed, or by the previous bell's own ring)
const bellStem = renderAudio(events, tracks, SR, { stem: 'bell', fixedGain: mix.meta.gain }), bmono = new Float64Array(N), bedmono = new Float64Array(N);
for (let i = 0; i < N; i++) { bmono[i] = .5 * (bellStem.L[i] + bellStem.R[i]); bedmono[i] = mono[i] - bmono[i]; }
const bandOf = x => { const P = prefix(filt(filt(x, 'hp', 1500), 'lp', 6000)); return (a, b) => p10((P[Math.round(b)] - P[Math.round(a)]) / (b - a)); }, bellBand = bandOf(bmono), bedBand = bandOf(bedmono);
const bellRows = events.filter(e => e.type === 'bell').map(e => { const c = e.f * SPF, w = .15 * SR, before = bandDB(c - w, c), after = bandDB(c, c + w);
  return { f: e.f, before, after, rise: after - before, ok: after - before >= 6, ringBefore: bellBand(c - w, c), bedBefore: bedBand(c - w, c), bedAfter: bedBand(c, c + w) }; });

// ───────────── (h) the tail
let tailPk = 0; for (let i = 1436 * SPF; i < N; i++) tailPk = Math.max(tailPk, Math.abs(L[i]), Math.abs(R[i]));
const tail = { pk: dB(tailPk), rms: rmsDB(1436, 1440), last: Math.max(Math.abs(L[N - 1]), Math.abs(R[N - 1])), lastQ: Math.round(L[N - 1] * 32767) === 0 && Math.round(R[N - 1] * 32767) === 0 };
let below50 = NF; for (let f = NF - 1; f >= 0; f--) { let p = 0; for (let i = f * SPF; i < (f + 1) * SPF; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i])); if (dB(p) > -50) break; below50 = f; }

// ───────────── the cue log on disk agrees with the timeline?
let cuesNote = 'cues.json not found'; try { const cj = JSON.parse(fs.readFileSync(path.join(ROOT, 'cues.json'), 'utf8')), ce2 = cj.events || cj.cues || []; const key = e => e.f + ':' + e.type, A = events.map(key).sort().join('|'), B = ce2.map(key).sort().join('|');
  cuesNote = A === B ? `cues.json matches buildEvents() (${ce2.length} events, same frame:type multiset)` : `cues.json DIFFERS from buildEvents() (${ce2.length} vs ${events.length} events) — re-export with tools/cues.js`; } catch (e) { cuesNote = 'cues.json unreadable: ' + e.message; }

// ───────────── checks
const CHK = [
  ['a', 'every transient cue onset within ±1 frame (isolated render)', nFail === 0 && missingTypes.length === 0, `${nTrans - nFail}/${nTrans} cues pass; worst ${fx(worst.err || 0, 3)} fr (${worst.type || '-'} @${worst.f === undefined ? '-' : worst.f})${missingTypes.length ? '; NO EVENTS of type ' + missingTypes.join(', ') : ''}`, 'composer/foley (src/audio.js)'],
  ['b', 'barlines on cuts, notes on the 8-frame beat grid', gridOK && cutsOK, `${onGrid}/${musDev.length} music onsets (${(100 * gridFrac).toFixed(0)} %) within ±1 fr of a beat (need ≥ 70 %); cuts ${cutRows.map(r => r.c + (r.playing ? (r.on !== null ? ' ✓' : ' ✗') : ' (tacet)')).join(', ')}`, 'composer (src/audio.js buildScore)'],
  ['c', 'short-term loudness follows the emotion curve', rEmo >= .75, `Pearson r = ${rEmo.toFixed(3)} (need ≥ 0.75)`, 'composer (src/audio.js mix ride / orchestration)'],
  ['d', 'shot 4 quietest, shot 7 (1248-1400) loudest', quietest === 4 && loudest === 7, `quietest = shot ${quietest} (${cmp[quietest - 1].toFixed(1)} LUFS), loudest = shot ${loudest} (${cmp[loudest - 1].toFixed(1)} LUFS)`, 'composer (src/audio.js)'],
  ['e', 'bells unmasked: 1.5-6 kHz +6 dB, 150 ms after vs before', bellRows.length === 3 && bellRows.every(r => r.ok), bellRows.map(r => `@${r.f} ${fx(r.rise, 1)} dB`).join(', ') + (bellRows.length !== 3 ? ` (expected 3 bells, found ${bellRows.length})` : ''), 'composer/foley (src/audio.js bell + duck)'],
  ['f', 'no clipping, true peak ≤ −1 dBFS', clipped === 0 && q16clip === 0 && dB(TP.tp) <= -1, `true peak ${dB(TP.tp).toFixed(2)} dBTP @ f${(TP.at / SPF).toFixed(1)}, sample peak ${dB(pk).toFixed(2)} dBFS, clipped samples ${clipped}`, 'composer (src/audio.js master)'],
  ['g', 'integrated loudness −16 ±1 LUFS', Math.abs(INT.I + 16) <= 1, `${INT.I.toFixed(2)} LUFS (gated; relative gate ${INT.rel.toFixed(1)} LUFS, ${INT.kept}/${INT.blocks} blocks)`, 'composer (src/audio.js master)'],
  ['h', 'tail: below −50 dBFS by frame 1436, last sample silent', tail.pk < -50 && tail.last === 0, `peak over frames 1436-1440 ${tail.pk.toFixed(1)} dBFS (RMS ${tail.rms.toFixed(1)}), stays under −50 dBFS from frame ${below50}, last sample ${tail.last === 0 ? '0' : tail.last.toExponential(1)}`, 'composer (src/audio.js fade)'],
];
const PASS = CHK.every(c => c[2]);

// ───────────── the picture of the sound: out/listen_mel.png, 2 px per picture frame
(function draw() { const MW = 2048, MH = 500, NB = 80, BH = 5, PW = 2 * NF, cols = Math.floor(N / MH);
  const mel = f => 2595 * Math.log10(1 + f / 700), imel = m => 700 * (Math.pow(10, m / 2595) - 1), lo = mel(40), hi = mel(16000), edges = []; for (let b = 0; b <= NB + 1; b++) edges.push(imel(lo + (hi - lo) * b / (NB + 1)));
  const bins = []; for (let b = 0; b < NB; b++) { const w = []; for (let i = 1; i < MW / 2; i++) { const f = i * SR / MW; let v = 0; if (f > edges[b] && f <= edges[b + 1]) v = (f - edges[b]) / (edges[b + 1] - edges[b]); else if (f > edges[b + 1] && f < edges[b + 2]) v = (edges[b + 2] - f) / (edges[b + 2] - edges[b + 1]); if (v > 0) w.push([i, v]); } if (!w.length) { const i = Math.max(1, Math.round((edges[b + 1]) * MW / SR)); w.push([i, 1]); } bins.push(w); }
  const M = new Float32Array(cols * NB); stft(mono, MW, MH, (j, m) => { for (let b = 0; b < NB; b++) { let s = 0; for (const [i, v] of bins[b]) s += v * m[i] * m[i]; M[j * NB + b] = s; } });
  let top = -200; const D = new Float32Array(PW * NB); for (let x = 0; x < PW; x++) for (let b = 0; b < NB; b++) { const v = p10(.5 * (M[(2 * x) * NB + b] + M[Math.min(cols - 1, 2 * x + 1) * NB + b])); D[x * NB + b] = v; if (v > top) top = v; }
  const floor = top - 80, HEAD = 64, Y0 = HEAD, Y1 = Y0 + NB * BH, LP = 250, Y2 = Y1 + 18, Y3 = Y2 + LP, FP = 90, Y4 = Y3 + 16, H = Y4 + FP + 8, cv = createCanvas(PW, H), g = cv.getContext('2d');
  g.fillStyle = '#0c0b10'; g.fillRect(0, 0, PW, H);
  const stops = [[0, 0, 0, 4], [.2, 40, 11, 84], [.4, 101, 21, 110], [.6, 183, 55, 121], [.78, 252, 137, 97], [.92, 254, 206, 145], [1, 252, 253, 191]];
  const img = g.createImageData(PW, NB * BH), px = img.data;
  for (let x = 0; x < PW; x++) for (let b = 0; b < NB; b++) { const u = Math.max(0, Math.min(1, (D[x * NB + b] - floor) / (top - floor))); let k = 1; while (k < stops.length - 1 && stops[k][0] < u) k++; const a = stops[k - 1], c = stops[k], t = (u - a[0]) / (c[0] - a[0]);
    const r = a[1] + (c[1] - a[1]) * t, gg = a[2] + (c[2] - a[2]) * t, bb = a[3] + (c[3] - a[3]) * t; for (let y = 0; y < BH; y++) { const o = 4 * (((NB - 1 - b) * BH + y) * PW + x); px[o] = r; px[o + 1] = gg; px[o + 2] = bb; px[o + 3] = 255; } }
  g.putImageData(img, 0, Y0);
  const X = f => 2 * f; g.font = '13px Menlo'; g.textBaseline = 'middle';
  // seconds ruler
  for (let s = 0; s <= 60; s++) { g.fillStyle = s % 5 ? '#55505f' : '#a39cb0'; g.fillRect(X(s * 24), 0, 1, s % 5 ? 6 : 12); if (s % 5 === 0 && s < 60) { g.fillStyle = '#a39cb0'; g.fillText(s + ' s  f' + s * 24, X(s * 24) + 4, 8); } }
  // cue lanes
  const LANES = [['land', '#ff5d5d'], ['banner_pop', '#ffb347'], ['launch', '#ffe66d'], ['bell', '#7dfffb'], ['clunk', '#b98b5e'], ['pedal', '#7c8a99'], ['chirp', '#9be36b'], ['tip', '#e07be0'], ['getup', '#e07be0'], ['footstep', '#d0d0d0'], ['touch', '#ffffff'], ['brake', '#ff9ecb'], ['sit', '#ff9ecb'], ['bloom', '#6fa8ff'], ['sigh', '#8d86a8'], ['glint', '#c8f7ff']];
  const laneY = { land: 20, banner_pop: 20, launch: 20, bell: 20, touch: 20, tip: 30, getup: 30, footstep: 30, brake: 30, sit: 30, bloom: 30, sigh: 30, glint: 30, clunk: 40, chirp: 50, pedal: 58 }, colOf = Object.fromEntries(LANES);
  for (const e of events) if (colOf[e.type]) { g.fillStyle = colOf[e.type]; const big = ['land', 'banner_pop', 'launch', 'bell', 'touch'].includes(e.type); g.fillRect(X(e.f), laneY[e.type] - (big ? 4 : 3), e.dur ? Math.max(2, 2 * e.dur) : 2, big ? 9 : 5);
    if (big || ['tip', 'brake', 'sit', 'bloom', 'glint'].includes(e.type)) { g.font = '10px Menlo'; g.fillText(e.type === 'banner_pop' ? 'pop' : e.type, X(e.f) + (e.dur ? 2 * e.dur : 2) + 2, laneY[e.type]); } }
  g.font = '10px Menlo'; g.fillStyle = colOf.clunk; g.fillText('clunk', 2, 40); g.fillStyle = colOf.chirp; g.fillText('chirp', 2, 50); g.fillStyle = colOf.pedal; g.fillText('pedal', 2, 58);
  // mel axis labels
  g.font = '11px Menlo'; for (const hz of [100, 250, 500, 1000, 2000, 4000, 8000]) { const y = Y1 - (mel(hz) - lo) / (hi - lo) * NB * BH; g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < PW; x += 480) { g.fillRect(x, y, 8, 1); g.fillText(hz >= 1000 ? hz / 1000 + 'k' : hz + '', x + 10, y); } }
  // loudness / emotion panel
  g.fillStyle = '#14121a'; g.fillRect(0, Y2, PW, LP); const LMIN = -54, LMAX = -6, yL = v => Y3 - (Math.max(LMIN, Math.min(LMAX, v)) - LMIN) / (LMAX - LMIN) * LP, yE = v => Y3 - 6 - v * (LP - 12);
  for (let v = -50; v <= -10; v += 10) { g.fillStyle = v === -20 ? '#3a3546' : '#27232f'; g.fillRect(0, yL(v), PW, 1); g.fillStyle = '#7d768c'; for (let x = 0; x < PW; x += 480) g.fillText(v + ' LUFS', x + 4, yL(v) - 7); }
  g.fillStyle = '#4d4860'; g.fillRect(0, yL(-16), PW, 1);
  const line = (fn, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let f = 0; f < NF; f++) { const y = fn(f); if (f) g.lineTo(X(f) + 1, y); else g.moveTo(X(f) + 1, y); } g.stroke(); };
  line(f => yL(MO[f]), 'rgba(120,200,255,.45)', 1); line(f => yE(tracks.emotion[f]), '#ffb347', 2); line(f => yL(ST[f]), '#ffffff', 2.5);
  g.font = '13px Menlo'; g.fillStyle = '#ffffff'; g.fillText('━ short-term loudness (K-weighted, 3 s)', 60, Y2 + 12); g.fillStyle = 'rgba(120,200,255,.8)'; g.fillText('─ momentary (0.4 s)', 400, Y2 + 12); g.fillStyle = '#ffb347'; g.fillText(`━ emotion curve (0..1)    r = ${rEmo.toFixed(3)}`, 580, Y2 + 12);
  // onset flux panel
  g.fillStyle = '#14121a'; g.fillRect(0, Y4, PW, FP); const fm = Math.max(...FLm.full), hm = Math.max(...FLm.hi);
  for (let x = 0; x < PW; x++) { let a = 0, b = 0; for (let j = 4 * x; j < 4 * x + 4 && j < FLm.cols; j++) { a = Math.max(a, FLm.full[j]); b = Math.max(b, FLm.hi[j]); } g.fillStyle = '#6d6880'; const h1 = Math.sqrt(a / fm) * FP; g.fillRect(x, Y4 + FP - h1, 1, h1); g.fillStyle = '#ffd86b'; const h2 = Math.sqrt(b / hm) * FP * .6; g.fillRect(x, Y4 + FP - h2, 1, h2); }
  for (const o of ONfull) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(X(o.f)), Y4, 1, 6); } for (const o of ONhi) { g.fillStyle = '#ffd86b'; g.fillRect(Math.round(X(o.f)), Y4 + 7, 1, 5); }
  g.fillStyle = '#a39cb0'; g.font = '11px Menlo'; g.fillText('spectral flux: grey = full band, yellow = above 2.5 kHz; ticks = detected onsets', 60, Y4 + 20);
  // shot cuts (major: solid; sub-shots: faint) over everything
  for (const e of events) if (e.type === 'cut') { g.fillStyle = e.major ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.22)'; g.fillRect(X(e.f), e.major ? 14 : Y0, e.major ? 2 : 1, H - (e.major ? 14 : Y0)); }
  const NAMES = ['1 wide coast', '2 weary riding', '3 broken parade', '4 hilltop, ALONE', '5 close-up: the eye changes', '6 the wheel blooms', '7 sunset parade']; g.font = 'bold 15px Menlo';
  SHOTS.forEach(([a], i) => { const t = `SHOT ${NAMES[i] || i + 1}`; g.fillStyle = 'rgba(12,11,16,.7)'; g.fillRect(X(a) + 4, Y0 + 4, g.measureText(t).width + 10, 20); g.fillStyle = '#fff'; g.fillText(t, X(a) + 9, Y0 + 15); });
  { const x = X(pkF); g.fillStyle = '#7dfffb'; g.font = '11px Menlo'; g.fillText('PEAK', x + 6, Y0 + 36); }
  fs.writeFileSync(path.join(OUT, 'listen_mel.png'), cv.toBuffer('image/png')); log(`wrote out/listen_mel.png ${PW}x${H}  (mel ${NB} bands, ${MW}-pt FFT, hop ${MH}; ${top.toFixed(0)} dB top, 80 dB range)`); })();

// ───────────── report
const tm = f => (f / FPS).toFixed(3), V = b => b ? 'PASS' : 'FAIL';
let md = `# Sync report — the listener, round 1\n\n`;
md += `Measured by \`node tools/listen.js\` on \`renderAudio(buildEvents(), buildTracks(), 48000)\` → \`out/film.wav\` (${N} samples, ${(N / SR).toFixed(3)} s, 16-bit stereo 48 kHz). Spectrogram: \`out/listen_mel.png\` (2 px per picture frame).\n\n`;
md += `**Overall: ${PASS ? 'PASS' : 'FAIL'}** — ${CHK.filter(c => c[2]).length} of ${CHK.length} checks pass.\n\n## Global measurements\n\n| | |\n|---|---|\n`;
md += `| Integrated loudness (BS.1770, gated) | ${INT.I.toFixed(2)} LUFS |\n| True peak (4× oversampled) | ${dB(TP.tp).toFixed(2)} dBTP at frame ${(TP.at / SPF).toFixed(1)} |\n| Sample peak | ${dB(pk).toFixed(2)} dBFS at frame ${(pkAt / SPF).toFixed(1)} |\n| Clipped samples | ${clipped} (16-bit overs: ${q16clip}) |\n`;
md += `| Short-term loudness range | ${Math.min(...cs).toFixed(1)} … ${Math.max(...cs).toFixed(1)} LUFS (max at frame ${36 + 6 * cs.indexOf(Math.max(...cs))}, min at frame ${36 + 6 * cs.indexOf(Math.min(...cs))}) |\n| Loudness vs emotion | r = ${rEmo.toFixed(3)} (emotion averaged over the meter's 3 s window; r = ${rEmoPoint.toFixed(3)} against the un-averaged curve) |\n`;
md += `| Onsets detected in the full mix | ${ONfull.length} full-band, ${ONhi.length} above 2.5 kHz |\n| Onset detector timing (synthetic bursts) | bias ${(CAL.full.bias / SPF).toFixed(3)} fr full / ${(CAL.hi.bias / SPF).toFixed(3)} fr high band (removed), spread ${(CAL.full.spread / SPF).toFixed(3)} / ${(CAL.hi.spread / SPF).toFixed(3)} fr |\n| Event log | ${events.length} events, ${nTrans} transient cues; ${cuesNote} |\n\n`;
md += `## Checks\n\n| | check | result | measured |\n|---|---|---|---|\n` + CHK.map(c => `| ${c[0]} | ${c[1]} | **${V(c[2])}** | ${c[3]} |`).join('\n') + '\n\n';
const fails = CHK.filter(c => !c[2]); if (fails.length) md += `### Failures and who owns them\n\n` + fails.map(c => `- **(${c[0]}) ${c[1]}** — ${c[3]}. Responsible: ${c[4]}.`).join('\n') + '\n\n';
md += `### (a) transient cues by type\n\nOnset = first sample reaching 10 % of the cue's own peak, in a dry isolated render of that single event. "Heard in mix" = a spectral-flux onset (either band) of the full mix within ±1.5 frames of the cue.\n\n| type | n | worst error (fr) | mean error (fr) | heard in mix | median mix error (fr) | result |\n|---|---|---|---|---|---|---|\n`;
for (const t of TRANSIENT) { const b = byType[t]; if (!b) { md += `| ${t} | 0 | — | — | — | — | **FAIL** (no events) |\n`; continue; } const me = b.mixErr.slice().sort((x, y) => x - y); md += `| ${t} | ${b.n} | ${fx(b.worst, 3)} | ${fx(b.sum / b.n, 3)} | ${b.mix}/${b.n} | ${me.length ? fx(me[me.length >> 1], 2) : '—'} | ${V(b.fail === 0)} |\n`; }
md += `\n### (b) beat grid and cuts\n\nTempo: bar = ${BARF} frames, beat = ${BEATF} frames (180 bpm, 3/4). Music-stem onsets detected: ${ONmusic.length}; ${onGrid} (${(100 * gridFrac).toFixed(0)} %) lie within ±1 frame of a beat, ${barOn} on a barline. A uniformly random onset would hit that window 25 % of the time. Written score: ${written.length} struck/blown notes, ${(100 * writtenGrid).toFixed(0)} % exactly on the beat grid.\n\n`;
{ const hist = {}; for (const d of musDev) { const k = Math.round(d); hist[k] = (hist[k] || 0) + 1; } md += `Deviation of music onsets from the nearest beat (frames → count): ` + [-4, -3, -2, -1, 0, 1, 2, 3, 4].filter(k => hist[k]).map(k => `${fx(k, 0)}: ${hist[k]}`).join(', ') + '\n\n'; }
md += `| cut | on a barline | music before / after (LUFS, 0.5 s) | music playing | downbeat onset (music stem) | error (fr) | onset in full mix | result |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of cutRows) md += `| ${r.c} | ${r.bar ? 'yes (bar ' + r.c / BARF + ')' : 'NO'} | ${r.before.toFixed(1)} / ${r.after.toFixed(1)} | ${r.playing ? 'yes' : 'no — nothing is struck here (next note at ' + r.nextNote + ')'} | ${r.on !== null ? r.on.toFixed(2) : '—'} | ${r.on !== null ? fx(r.on - r.c, 2) : '—'} | ${r.mixOn !== null ? r.mixOn.toFixed(2) : 'not separable'} | ${r.playing ? V(r.ok && r.bar) : 'n/a'} |\n`;
md += `\n### (e) bells\n\nThe last two columns split the "before" window into the bell's own earlier ring (bell stem alone) and everything else (mix minus bell stem; approximate, the limiter is not linear).\n\n| bell frame | 1.5–6 kHz, 150 ms before (dB) | 150 ms after (dB) | rise (dB) | result | earlier bell ring in the before-window (dB) | bed without bells, before / after (dB) |\n|---|---|---|---|---|---|---|\n` + bellRows.map(r => `| ${r.f} | ${r.before.toFixed(1)} | ${r.after.toFixed(1)} | ${fx(r.rise, 1)} | ${V(r.ok)} | ${r.ringBefore < -120 ? 'none' : r.ringBefore.toFixed(1)} | ${r.bedBefore.toFixed(1)} / ${r.bedAfter.toFixed(1)} |`).join('\n') + '\n\n';
for (const r of bellRows) if (!r.ok) md += r.ringBefore > r.bedBefore ? `Bell @${r.f} fails because of the bell before it, not the bed: the previous strike is still ringing at ${r.ringBefore.toFixed(1)} dB in this band when the new one lands (the bed alone is at ${r.bedBefore.toFixed(1)} dB, and the new strike stands ${fx(r.after - r.bedAfter, 1)} dB over the bed). The second ring of the double "ting-ting" therefore reads as a swell of the first, not as a clearly new strike. Fix in src/audio.js: choke/damp the previous strike's 1.5–6 kHz partials when the next one lands (as a hammer re-striking a bell does), shorten the decay of those partials, or strike the second ring harder.\n\n` : `Bell @${r.f} is masked by the bed (${r.bedBefore.toFixed(1)} dB in this band before the strike): deepen the duck or thin the 1.5–6 kHz content of music/foley around it.\n\n`;
md += `## Per-shot loudness\n\n| shot | frames | K-weighted LUFS | RMS dBFS | short-term min … max (LUFS) | music stem (LUFS) | mean emotion |\n|---|---|---|---|---|---|---|\n`;
for (const r of shotRows) { let m = 0; for (let f = r.a; f < r.b; f++) m += tracks.emotion[f]; md += `| ${r.shot} | ${r.a}–${r.b} | ${r.lu.toFixed(1)} | ${r.rms.toFixed(1)} | ${r.stMin.toFixed(1)} … ${r.stMax.toFixed(1)} | ${r.mus < -90 ? 'silent' : r.mus.toFixed(1)} | ${(m / (r.b - r.a)).toFixed(2)} |\n`; }
md += `| 7* | ${pkF}–1400 | ${s7.lu.toFixed(1)} | ${s7.rms.toFixed(1)} | | | |\n\nQuietest: shot ${quietest}. Loudest: shot ${loudest} (shot 7 judged on ${pkF}–1400, before the fade).\n\n`;
md += `## Every cue\n\nAll ${events.length} events of the log. Transient cues are judged (±1 frame); soft cues (sigh, glint, bloom, gust …) are measured for information only — a gust is built to swell in before its frame; marks (cut, hold, peak …) make no sound of their own. Onset and error are in picture frames (1 frame = 41.67 ms).\n\n| frame | time (s) | type | detail | measured onset (frame) | error (fr) | onset in full mix | result |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of cueRows) md += `| ${r.f} | ${tm(r.f)} | ${r.type} | ${r.det || ''} | ${r.on !== null ? r.on.toFixed(3) : r.silent ? 'silent' : '—'} | ${r.err !== null ? fx(r.err, 3) : '—'} | ${r.kind === 'transient' ? (r.mix !== null ? r.mix.toFixed(2) : 'masked') : '—'} | ${r.verdict} |\n`;
md += `\n## Notes\n\n@@NOTES@@\n`;
const notes = [];
notes.push(`Method: every number above is measured from rendered samples; nothing is read back from the composer's intentions except the frame each cue is *supposed* to be on (the event log).`);
notes.push(`${nMixSeen} of ${nTrans} transient cues also show up as a separable spectral-flux onset in the full mix within ±1.5 frames. Cues listed as "masked" are present in the mix but not separable from the bed/music by flux alone (quiet pedal ticks under the waltz, mostly); that is a level observation, not a sync error.`);
{ const pre = cueRows.filter(r => r.kind === 'transient' && r.pre > .05); notes.push(pre.length ? `Pre-roll: ${pre.length} transient cue(s) carry more than 5 % of their peak earlier than one frame before the cue: ${pre.slice(0, 8).map(r => r.type + '@' + r.f).join(', ')}.` : `Pre-roll: no transient cue has more than 5 % of its peak earlier than one frame before its cue frame — nothing anticipates the picture.`); }
{ const late = cueRows.filter(r => r.kind === 'soft' && r.err !== null).map(r => `${r.type}@${r.f} ${fx(r.err, 2)}`); notes.push(`Soft cues (not judged), isolated onset error in frames: ${late.join(', ')}.`); }
fs.writeFileSync(path.join(ROOT, 'sync_report.md'), md.replace('@@NOTES@@', notes.map(n => '- ' + n).join('\n')));

// ───────────── console
log('');
for (const c of CHK) log(`(${c[0]}) ${V(c[2])}  ${c[1]}\n        ${c[3]}`);
log(`\nper type (worst isolated error fr | heard in mix): ` + TRANSIENT.map(t => byType[t] ? `${t} ${fx(byType[t].worst, 2)} ${byType[t].mix}/${byType[t].n}` : `${t} NONE`).join('  '));
log(`cuts: ` + cutRows.map(r => `${r.c}: music ${r.before.toFixed(0)}/${r.after.toFixed(0)} LUFS ${r.playing ? 'onset ' + (r.on !== null ? r.on.toFixed(2) : 'MISSING') : 'tacet (next note ' + r.nextNote + ')'}`).join('   '));
log(`shots: ` + shotRows.map(r => `${r.shot}: ${r.lu.toFixed(1)}`).join('  ') + `  7*: ${s7.lu.toFixed(1)} LUFS`);
log(`\n${PASS ? 'ALL CHECKS PASS' : 'FAILED: ' + CHK.filter(c => !c[2]).map(c => c[0]).join(', ')}   wrote sync_report.md   (${((performance.now() - T0) / 1000).toFixed(1)} s)`);
process.exitCode = PASS ? 0 : 1;
