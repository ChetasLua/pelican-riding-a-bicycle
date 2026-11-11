// ───────────────────────── audio: the whole soundtrack, synthesised sample by sample from the event log ─────────────────────────
// renderAudio(events, tracks, sr) -> { L, R, sr }   (pure, deterministic, no files, no libraries)
// Everything else lives inside A_AUDIO.  Sync is by construction: every sound is placed from an event's frame, never a guessed time.
function renderAudio(events, tracks, sr, opts) { return A_AUDIO.render(events, tracks, sr || 48000, opts || {}); }
const A_AUDIO = (function () {
  'use strict';
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const nname = m => NN[m % 12] + (Math.floor(m / 12) - 1);
  const TN = 2048;
  let FS, N, bL, bR, sL, sR, scA, scB, SCN, tables, mg = 1;

  // relative levels of every source (the master stage normalises the sum to -16 LUFS)
  const G = {
    music: 1.25, foley: 3.6, piano: .30, cel: .095, pizz: .27, pah: .11, reed: .23, str: .07,
    sea: .42, foam: .06, wind: .085, grass: .020, cic: .0035, tyre: .05, hum: .07, scrape: .012,
    pedal: 1, clunk: 1, chirp: 1, plop: 1, bell: .23,
  };

  // ───────────── mixing primitives
  function mixOut(sc, n, i0, gain, pan, send) {
    const a = (clamp(pan, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(a) * gain * mg, gr = Math.sin(a) * gain * mg, wl = gl * send, wr = gr * send;
    const s = i0 < 0 ? -i0 : 0, e = Math.min(n, N - i0);
    for (let i = s; i < e; i++) { const v = sc[i], j = i0 + i; bL[j] += v * gl; bR[j] += v * gr; sL[j] += v * wl; sR[j] += v * wr; }
  }
  // bank of damped sinusoids (struck / plucked things). y = A r^n sin(w n): starts at zero, attack is at t0 exactly.
  function modal(t0, F, A, T, o) {
    const i0 = Math.round(t0 * FS), hold = o.hold === undefined ? 1e9 : o.hold, rel = o.rel || .2;
    let maxT = 0; for (let k = 0; k < F.length; k++) if (T[k] > maxT) maxT = T[k];
    let n = Math.ceil(Math.min(maxT * 1.05, hold + rel * 7) * FS); if (n > SCN) n = SCN; if (n < 2) return;
    const sc = scA; sc.fill(0, 0, n);
    for (let k = 0; k < F.length; k++) { const f = F[k]; if (f >= FS * .45 || A[k] === 0) continue;
      const w = 2 * Math.PI * f / FS, r = Math.pow(10, -3 / (T[k] * FS)), c = 2 * r * Math.cos(w), r2 = r * r, nk = Math.min(n, Math.ceil(T[k] * 1.05 * FS));
      let y2 = 0, y1 = A[k] * r * Math.sin(w); sc[1] += y1;
      for (let i = 2; i < nk; i++) { const y = c * y1 - r2 * y2; y2 = y1; y1 = y; sc[i] += y; } }
    const na = Math.min(n, Math.round((o.att || .001) * FS));
    for (let i = 0; i < na; i++) sc[i] *= .5 - .5 * Math.cos(Math.PI * i / na);
    if (hold < 1e8) { const ih = Math.round(hold * FS), q = Math.exp(-1 / (rel * FS)); let g = 1; for (let i = ih; i < n; i++) { g *= q; sc[i] *= g; } }
    mixOut(sc, n, i0, o.gain, o.pan || 0, o.send || 0);
  }
  // band-limited single-cycle tables for the sustained instruments
  function table(kind, m) {
    const key = kind + m; if (tables[key]) return tables[key];
    const f0 = mtof(m), K = Math.max(1, Math.min(48, Math.floor((kind === 'reed' ? 6500 : 5500) / f0))), tb = new Float32Array(TN + 1);
    for (let k = 1; k <= K; k++) { const f = k * f0; let a;
      if (kind === 'reed') a = Math.pow(k, -.95) * (k & 1 ? 1 : .72) * (1 + 1.1 * Math.exp(-Math.pow((f - 1050) / 620, 2))) / (1 + Math.pow(f / 3000, 4));
      else a = Math.pow(k, -1.2) * (1 + .7 * Math.exp(-Math.pow((f - 650) / 420, 2))) / (1 + Math.pow(f / 2400, 3));
      const ph = 2 * Math.PI * hash2(k, m), w = 2 * Math.PI * k / TN;
      for (let i = 0; i < TN; i++) tb[i] += a * Math.sin(w * i + ph); }
    let e = 0; for (let i = 0; i < TN; i++) e += tb[i] * tb[i]; const g = .25 / Math.sqrt(e / TN);
    for (let i = 0; i < TN; i++) tb[i] *= g; tb[TN] = tb[0]; return tables[key] = tb;
  }
  // sustained voice: a few detuned copies of one table with slow vibrato, soft attack, optional expression curve
  function sus(kind, m, t0, dur, o) {
    const tb = table(kind, m), f0 = mtof(m), i0 = Math.round(t0 * FS), att = o.att || .06, rel = o.rel || .15;
    let n = Math.ceil((dur + rel) * FS); if (n > SCN) n = SCN; if (n < 8) return;
    scA.fill(0, 0, n); scB.fill(0, 0, n);
    const cents = o.cents, nv = cents.length, vib = o.vib || 0;
    for (let v = 0; v < nv; v++) { const buf = v & 1 ? scB : scA, inc = f0 * Math.pow(2, cents[v] / 1200) / FS;
      let ph = hash2(m * 7 + v, i0), p0 = 2 * Math.PI * hash2(v + 3, m + i0), ls = Math.sin(p0), lc = Math.cos(p0);
      const dw = 2 * Math.PI * (o.vr || 5.4) * (1 + .16 * (hash2(v, m) - .5)) / FS, cd = Math.cos(dw), sd = Math.sin(dw);
      for (let i = 0; i < n; i++) { ph += inc * (1 + vib * ls); if (ph >= 1) ph -= 1; const x = ph * TN, j = x | 0; buf[i] += tb[j] + (tb[j + 1] - tb[j]) * (x - j);
        const t = ls * cd + lc * sd; lc = lc * cd - ls * sd; ls = t; } }
    const na = att * FS, nd = dur * FS, nr = rel * FS, ex = o.expr; let e0 = ex ? ex(0) : 1, e1 = e0;
    for (let i = 0; i < n; i++) { if ((i & 63) === 0) { e0 = e1; e1 = ex ? ex((i + 64) / FS) : 1; }
      let e = e0 + (e1 - e0) * (i & 63) / 64; if (i < na) { const u = i / na; e *= u * u * (3 - 2 * u); } if (i > nd) { const u = Math.min(1, (i - nd) / nr), q = 1 - u * u * (3 - 2 * u); e *= q; }
      scA[i] *= e; scB[i] *= e; }
    const g = o.gain / Math.sqrt(Math.max(1, nv / 2)), wd = o.width || 0;
    mixOut(scA, n, i0, g, (o.pan || 0) - wd, o.send || 0); if (nv > 1) mixOut(scB, n, i0, g, (o.pan || 0) + wd, o.send || 0);
  }
  // filtered-noise burst (type 0 low-pass, 1 band-pass, 2 high-pass), level-normalised so `gain` is roughly its rms
  function burst(t0, dur, o) {
    const i0 = Math.round(t0 * FS); let n = Math.ceil(dur * FS); if (n > SCN) n = SCN; if (n < 2) return;
    const sc = scA, type = o.type, f0 = o.f, f1 = o.f1 || o.f, q = o.q || .7, k = 1 / q, na = Math.max(1, Math.round((o.att || .0005) * FS)), dq = Math.exp(-1 / ((o.dec || dur) * FS));
    const fm = Math.sqrt(f0 * f1), norm = type === 1 ? 1 / Math.sqrt(Math.PI * q * fm / FS) : type === 0 ? 1 / Math.sqrt(2 * fm / FS) : 1 / Math.sqrt(Math.max(.08, 1 - 2 * fm / FS));
    let s = (Math.imul(i0 + 977, 2654435761) ^ (o.seed | 0) ^ 0x9e3779b9) | 0, ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0, e = 1; const nt = Math.max(1, n * .12);
    for (let i = 0; i < n; i++) {
      if ((i & 31) === 0) { const ff = f0 * Math.pow(f1 / f0, i / n), g = Math.tan(Math.PI * Math.min(ff, FS * .45) / FS); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
      s = (Math.imul(s, 1664525) + 1013904223) | 0; const x = s * 4.656612873e-10;
      const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      const y = type === 0 ? v2 : type === 1 ? v1 : x - k * v1 - v2;
      let en; if (i < na) en = i / na; else { e *= dq; en = e; } if (n - i < nt) en *= (n - i) / nt;
      sc[i] = y * en; }
    mixOut(sc, n, i0, o.gain * norm, o.pan || 0, o.send || 0);
  }
  // gliding tone with up to three harmonics (plops, toy chirps, squeaks, gulls)
  function tone(t0, dur, fFn, aFn, h2, h3, o) {
    const i0 = Math.round(t0 * FS); let n = Math.ceil(dur * FS); if (n > SCN) n = SCN; const sc = scA;
    let ph = 0, f = fFn(0), a = aFn(0), fN = f, aN = a; const w = 2 * Math.PI / FS;
    for (let i = 0; i < n; i++) { if ((i & 15) === 0) { f = fN; a = aN; const t = (i + 16) / FS; fN = fFn(t); aN = t >= dur ? 0 : aFn(t); }
      const u = (i & 15) / 16, ff = f + (fN - f) * u, aa = a + (aN - a) * u; ph += w * ff;
      sc[i] = aa * (Math.sin(ph) + h2 * Math.sin(2 * ph) + h3 * Math.sin(3 * ph)); }
    mixOut(sc, n, i0, o.gain, o.pan || 0, o.send || 0);
  }

  // ───────────── instruments
  function piano(m, t0, dur, vel, pan) { // felt piano: soft hammer, quick roll-off of upper partials, two strings beating slowly
    const f0 = mtof(m), B = .00025 * Math.pow(2, (m - 60) / 10), K = clamp(Math.floor(4500 / f0), 3, 14), T0 = .62 * clamp(7 - (m - 33) * .085, 1.2, 7), F = [], A = [], T = [];
    for (let k = 1; k <= K; k++) { const fk = k * f0 * Math.sqrt(1 + B * k * k), a = Math.exp(-(k - 1) * (.78 - .36 * vel)) * (.75 + .25 * Math.abs(Math.sin(k * Math.PI / 7.3))), t = T0 / (1 + .3 * (k - 1));
      if (k <= 2) { F.push(fk * 1.00035, fk * .99965); A.push(a * .5, a * .5); T.push(t, t * .93); } else { F.push(fk); A.push(a); T.push(t); } }
    modal(t0, F, A, T, { gain: G.piano * vel * (1 + (60 - m) * .008), pan, send: .32, att: .005 + .005 * (1 - vel), hold: dur, rel: .22 });
    burst(t0, .03, { type: 0, f: 320, att: .002, dec: .008, gain: G.piano * vel * .035, pan, send: .2, seed: m });
  }
  function celesta(m, t0, vel, pan) { const f = mtof(m), T1 = clamp(2.4 - (m - 72) * .04, .8, 2.4);
    modal(t0, [f, 2 * f * 1.001, 4.03 * f, 6.27 * f], [1, .2, .05, .06], [T1, T1 * .55, .25, .07], { gain: G.cel * vel, pan: pan === undefined ? .22 : pan, send: .45, att: .0015 }); }
  function pizz(m, t0, vel, pan) { const f = mtof(m), bass = m < 53, K = Math.min(bass ? 9 : 7, Math.floor((bass ? 3000 : 4500) / f)), F = [], A = [], T = [];
    for (let k = 1; k <= K; k++) { F.push(k * f * (1 + .0003 * k * k)); A.push(Math.pow(k, -1.1) * (k & 1 ? 1 : .75)); T.push((bass ? 1.0 : .4) / Math.pow(k, .8)); }
    modal(t0, F, A, T, { gain: (bass ? G.pizz : G.pah) * vel, pan: pan === undefined ? (bass ? .18 : -.2) : pan, send: .3, att: .003 });
    if (bass) burst(t0, .04, { type: 0, f: 190, att: .002, dec: .01, gain: G.pizz * vel * .05, pan: .18, send: .2, seed: m }); }
  function bell(t0, gain, pan, choke) { // brass bicycle bell: split (beating) cup modes, long shimmer.  choke (s): the ring is damped from there on, as when the hammer comes back for a re-strike
    const f = 1760, o = { gain: G.bell * gain, pan, send: .38, att: .0004 }; if (choke) { o.hold = choke; o.rel = .09; }
    modal(t0, [f, f * 1.0043, f * 2.711, f * 2.722, f * 5.2, f * 6.98], [1, .8, .45, .35, .16, .06], [3.6, 3.2, 1.7, 1.5, .6, .3], o);
    burst(t0, .008, { type: 2, f: 5200, att: .0002, dec: .0016, gain: G.bell * gain * .16, pan, send: .2, seed: 7 }); }

  // ring bell i of the list: a strike that is re-struck within 2/3 s is lighter and choked well before the next one lands; the re-strike is harder and rings free
  function ringBell(bells, i) { const e = bells[i], nx = bells[i + 1], pv = bells[i - 1], gapN = nx ? (nx.f - e.f) / FPS : 9, gapP = pv ? (e.f - pv.f) / FPS : 9, dbl = .67;
    bell(e.f / FPS, gapN < dbl ? .9 : gapP < dbl ? 1.15 : 1, .08, gapN < dbl ? gapN * .4 : 0); }

  // ───────────── the score (built from the event log; returns note lists so they can be printed and checked)
  const CH = {
    D: { bass: 38, trip: [57, 62, 66], close: [57, 62, 66], wide: [50, 57, 62, 66, 74] },
    Bm: { bass: 47, trip: [59, 62, 66], close: [59, 62, 66], wide: [47, 54, 59, 62, 66, 71] },
    G: { bass: 43, trip: [59, 62, 67], close: [59, 62, 67], wide: [43, 55, 59, 62, 67, 71] },
    A7: { bass: 45, trip: [57, 61, 67], close: [57, 61, 64, 67], wide: [45, 52, 57, 61, 64, 67, 73] },
    Em: { bass: 40, trip: [59, 64, 67], close: [59, 64, 67], wide: [40, 52, 59, 64, 67] },
    'D/F#': { bass: 42, trip: [57, 62, 66], close: [57, 62, 66], wide: [42, 57, 62, 66, 74] },
  };
  // the theme: 8 bars of 3/4 in D major, [midi, start frame, length frames]; its top note A5 opens bar 5
  const THEME = [[66, 0, 16], [69, 16, 8], [74, 24, 24], [71, 48, 16], [74, 64, 8], [76, 72, 16], [78, 88, 8], [81, 96, 24], [79, 120, 16], [78, 136, 8], [76, 144, 16], [73, 160, 8], [74, 168, 24]];
  const THCH = ['D', 'Bm', 'G', 'A7', 'D', 'G', 'A7', 'D'];
  function buildScore(events) {
    const S = { piano: [], cel: [], reed: [], str: [], pizz: [], theme: [], peak: null, musicEnd: null, key: 'D major' };
    const cut = {}; for (const e of events) if (e.type === 'cut' && e.major) cut[e.shot] = e.f;
    const first = t => events.find(e => e.type === t), all = t => events.filter(e => e.type === t);
    const P = (m, f, d, v) => S.piano.push({ m, f, d, v }), C = (m, f, v) => S.cel.push({ m, f, v }), Z = (m, f, v) => S.pizz.push({ m, f, v });
    const R = (m, f, d, v, x) => S.reed.push(Object.assign({ m, f, d, v }, x)), ST = (m, f, d, v, x) => S.str.push(Object.assign({ m, f, d, v }, x));
    const lands = all('land').map(e => e.f).sort((a, b) => a - b);
    const c1 = cut[1], c2 = cut[2], c3 = cut[3], c4 = cut[4], c5 = cut[5], c6 = cut[6], c7 = cut[7];
    // 1 ── solo felt piano, sparse: the first half of the theme, then it sinks back, tired
    if (c1 !== undefined && c2 !== undefined) { const b = c1, lim = c2 - 10;
      [[66, 24, 16], [69, 40, 8], [74, 48, 22], [71, 72, 16], [74, 88, 8], [76, 96, 24], [74, 120, 16], [71, 136, 8], [69, 144, 24]].forEach(([m, f, d]) => { if (b + f < lim) P(m, b + f, d + 8, .5); });
      const bs = [50, 47, 43, 45, 43, 45], md = [57, 54, 50, 55, 50, 52];
      for (let i = 0; i < 6; i++) { const f = b + 24 * (i + 1); if (f >= lim) break; P(bs[i], f, 30, .34); P(md[i], f + 8, 16, .24); if (i === 5) P(55, f + 16, 10, .2); } }
    // 2 ── the reed joins, weary: theme an octave down at half speed, a sighing appoggiatura E->D on the sigh
    if (c2 !== undefined && c3 !== undefined) { const r = c2, sg = events.find(e => e.type === 'sigh' && e.f > r + 50 && e.f < r + 92), res = sg ? sg.f : r + 60;
      let notes = [[54, r, 32, .5], [57, r + 32, 16, .52], [64, r + 48, res - (r + 48), .6], [62, res, r + 94 - res, .46], [59, r + 96, 32, .5], [62, r + 128, 16, .52], [64, r + 144, 42, .5]];
      const fl = first('flinch'); if (fl) notes = notes.flatMap(n => (fl.f - n[1] >= 4 && n[1] + n[2] - fl.f >= 9) ? [[n[0], n[1], fl.f - n[1], n[3]], [n[0], fl.f + 3, n[1] + n[2] - fl.f - 3, n[3] * .9]] : [n]);
      for (const [m, f, d, v] of notes) R(m, f, d, v, { weary: true });
      const bs = [38, 47, 43, 45], md = [[57, 62], [54, 59], [55, 59], [55, 61]];
      for (let i = 0; i < 8; i++) { const f = r + 24 * i, k = i >> 1; if (f + 24 > c3) break; if (!(i & 1)) { P(bs[k], f, 40, .32); P(md[k][0], f + 8, 16, .22); } else P(md[k][1], f + 8, 16, .22); }
      // the first follower has landed: pizzicato bass starts stepping with the square-wheel clunks
      const L0 = lands.find(f => f > r && f < c3); if (L0 !== undefined) { for (let f = r + 24 * Math.ceil((L0 - r + 1) / 24); f + 24 <= c3; f += 24) { Z(45, f, .5); if (f + 48 > c3) { Z(47, f + 8, .42); Z(49, f + 16, .46); } } } }
    // 3 ── comic broken parade: oom-pah-pah that gets busier with every landing, a stumble on each one
    if (c3 !== undefined && c4 !== undefined) { const b0 = c3, nb = Math.floor((c4 - c3) / 24), chs = ['D', 'Bm', 'G', 'A7', 'D', 'Bm', 'Em', 'A7', 'G', 'D/F#', 'Em', 'A7'];
      const mel = [[66, 0, 16], [69, 16, 8], [74, 24, 24], [71, 48, 16], [74, 64, 8], [76, 72, 16], [78, 88, 8], [66, 96, 16], [69, 112, 8], [74, 120, 24], [67, 144, 16], [71, 160, 8], [76, 168, 24], [74, 192, 16], [71, 208, 8], [69, 216, 24], [67, 240, 16], [66, 256, 8], [64, 264, 34]];
      const lv = f => { let n = 0; for (const l of lands) if (l <= f) n++; return Math.max(1, n); };
      mel.forEach(([m, f, d], i) => { if (b0 + f >= c4) return; const last = i === mel.length - 1, n = lv(b0 + 24 * Math.floor(f / 24)); R(m, b0 + f, last ? d : Math.max(6, Math.round(d * .72)), last ? .5 : .62, { att: .03, comic: !last, fade: last }); if (n >= 3 && !last) C(m + 12, b0 + f, .5); });
      const near = f => lands.some(l => Math.abs(l - f) <= 2);
      for (let i = 0; i < nb; i++) { const b = b0 + 24 * i, ch = CH[chs[i % 12]], n = lv(b), last = i === nb - 1; Z(ch.bass, b, .52 + .05 * n); if (last) continue;
        if (n === 1) { P(ch.trip[0], b + 8, 12, .26); P(ch.trip[1], b + 8, 12, .24); }
        else for (const o of [8, 16]) { if (near(b + o)) continue; const tr = n >= 3 ? ch.trip : ch.trip.slice(0, 2); for (const m of tr) Z(m, b + o, .3 + .05 * n); }
        if (n >= 3) P(ch.bass + 12, b, 20, .34);
        if (n >= 4 && i + 1 < nb) { Z(ch.bass + 7, b + 16, .4); Z(CH[chs[(i + 1) % 12]].bass - 1, b + 20, .46); } }
      for (const l of lands) if (l >= c3 && l < c4) { const ch = CH[chs[Math.floor((l - b0) / 24) % 12]]; Z(ch.bass + 13, l, .62); Z(ch.bass + 12, l + 4, .5); P(ch.bass + 12, l, 5, .34); P(ch.bass + 13, l, 5, .34); C(ch.trip[2] + 13, l + 2, .32); C(ch.trip[2] + 12, l + 5, .3); } }
    // 4 ── nearly nothing: one held high string note, very quiet; it carries through until the celesta has begun
    const holds = all('hold'), h5 = holds.find(e => c5 !== undefined && e.f >= c5) || null;
    if (c4 !== undefined && c5 !== undefined) { const a = c4 + 18, b = h5 ? h5.f + 48 : c5; ST(81, a, b - a, .5, { att: 3, rel: 2.2, thin: true }); }
    // 5 ── the theme returns on celesta as his eye changes; a few strings warm in underneath
    if (h5) { const h = h5.f, hEnd = h5.until || h + 96, nbh = Math.min(4, Math.floor((hEnd - h) / 24));
      // the swell is keyed to the 'tender' event (his eye turning tender): 0 before it, opening across it, full at its end
      const tdE = events.find(e => e.type === 'tender' && e.f >= h - 24 && e.f < hEnd), td0 = tdE ? tdE.f : h + 24, td1 = td0 + (tdE ? tdE.dur : 48), warm = f => smooth(clamp((f - td0) / (td1 - td0))); S.tender = [td0, td1];
      [[78, 0, .36], [81, 16, .36], [86, 24, .4], [83, 48, .44], [86, 64, .44], [88, 72, .5]].forEach(([m, f, v]) => { if (f >= nbh * 24) return; const w = warm(h + f); C(m, h + f, v * (.86 + .4 * w)); if (w > .15) C(m - 12, h + f, v * .55 * w, .05); });
      const pads = [[57, 66], [59, 66], [59, 67], [57, 61, 67]], Lt = f => (.26 + .58 * warm(f)) * (1 - .25 * smooth(clamp((f - td1) / 30)));
      for (let i = 0; i < nbh; i++) for (const m of pads[i]) ST(m, h + 24 * i + (i ? 0 : 6), i ? 24 : 18, 1, { att: i ? .5 : 1.2, rel: .7, lvl: Lt });
      if (tdE) { const a = Math.max(h, td0), b = Math.min(hEnd - 4, td1 + 10); if (b - a > 12) for (const m of [50, 62, 69]) ST(m, a, b - a, .5, { att: .6, rel: .9, lvl: f => warm(f) * (1 - .3 * smooth(clamp((f - td1) / 14))) }); }
      if (nbh > 2) P(43, h + 48, 30, .24); if (nbh > 3) { P(45, h + 72, 30, .26); P(52, h + 80, 14, .2); } }
    // 6+7 ── strings bloom on the wheel, the theme climbs to its top note exactly on the peak, tutti, then thins to nothing
    const pkE = first('peak'), pk = pkE ? pkE.f : c7; S.peak = pk;
    if (c6 !== undefined && pk !== undefined) { const th0 = pk - 96, blooms = all('bloom'), fadeE = first('fade'), roll = first('roll_smooth');
      const mEnd = fadeE ? fadeE.f - 14 : pk + 154; S.musicEnd = mEnd;
      const chAt = f => { const k = Math.floor((f - th0) / 24); return k < 0 ? ['D', 'Bm', 'G', 'A7'][((k % 4) + 4) % 4] : k < 8 ? THCH[k] : 'D'; }; S.chAt = chAt;
      // string level: nothing, then each bloom opens it further, full at the peak, gone before the fade
      const K = [[c6, 0]]; let lv = 0; blooms.forEach((e, i) => { if (e.f >= pk) return; K.push([e.f, lv]); lv = i === 0 ? .5 : Math.min(.85, lv + .3); K.push([e.f + e.dur, lv]); });
      if (!blooms.length) K.push([th0, .4]); K.push([pk - 1, 1], [pk, 1.18], [pk + 24, 1], [pk + 72, .88], [pk + 96, .6], [mEnd - 6, 0]);
      const Ls = f => { if (f <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (f < K[i][0]) { const a = K[i - 1], b = K[i]; return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (f - a[0]) / (b[0] - a[0]); } return 0; };
      const sStart = blooms.length ? blooms[0].f : th0, wideFrom = blooms.length > 1 ? blooms[1].f : th0 + 24;
      for (let b = c6 + 24 * Math.floor((sStart - c6) / 24); b < mEnd; b += 24) { const a = Math.max(b, sStart), ch = CH[chAt(b)], v = a >= wideFrom ? ch.wide : ch.close;
        for (const m of v) ST(m, a, b + 24 - a, .8, { att: a === sStart ? .35 : .2, rel: .4, lvl: Ls }); }
      // piano waltz from the top of the shot
      for (let b = c6; b < pk; b += 24) { const ch = CH[chAt(b)], u = clamp((b - c6) / (pk - c6)), v = .26 + .26 * u; P(ch.bass + (b < th0 ? 12 : 0), b, 30, v + .06); P(ch.trip[0], b + 8, 14, v * .8); P(ch.trip[1], b + 8, 14, v * .8); P(ch.trip[2], b + 16, 12, v * .75); }
      // theme bars 1-4: reed + celesta, crescendo
      for (const [m, f, d] of THEME) { const tutti = f >= 96, ff = th0 + f; S.theme.push({ m, f: ff, d, name: nname(m), bar: 1 + Math.floor(f / 24) });
        if (!tutti) { const u = f / 96; R(m, ff, d, .42 + .3 * u, {}); C(m + 12, ff, .36 + .2 * u); if (f >= 72) ST(m, ff, d, .9, { att: .12, rel: .25, lvl: Ls, mel: true }); }
        else { const dv = f === 96 ? 1.12 : 1 - .05 * Math.floor((f - 96) / 24); R(m, ff, d, .95 * dv, {}); ST(m, ff, d, 1.25, { att: .07, rel: .3, lvl: Ls, mel: true }); ST(m - 12, ff, d, 1.0, { att: .07, rel: .3, lvl: Ls, mel: true }); C(m + 12, ff, .7 * dv); P(m, ff, d, .66 * dv); } }
      // a small celesta run up into the peak
      [[81, -8], [85, -6], [88, -4], [91, -2]].forEach(([m, o]) => C(m, pk + o, .3));
      // pizzicato bass from the first smooth roll, then full oom-pah-pah under the tutti
      const pz0 = roll ? th0 + 24 * Math.floor((roll.f - th0) / 24) : th0 + 48;
      for (let b = Math.max(pz0, c6); b < pk; b += 24) Z(CH[chAt(b)].bass, b, .55);
      for (let b = pk; b < pk + 96; b += 24) { const ch = CH[chAt(b)], lastBar = b + 24 >= pk + 96; const top = b === pk; Z(ch.bass, b, top ? 1.05 : .82); P(ch.bass, b, 30, top ? .78 : .56); P(ch.bass + 12, b, 30, top ? .62 : .46); if (top) for (const m of [57, 62, 66]) P(m, b, 20, .5);
        for (const o of [8, 16]) { if (lastBar && o === 16) continue; for (const m of ch.trip) { Z(m, b + o, .5); P(m, b + o, 10, .4); } } }
      // coda: a falling goodbye on celesta, piano settles
      const cd = pk + 96; [[81, 0, .44], [78, 16, .38], [74, 24, .34]].forEach(([m, f, v]) => { if (cd + f < mEnd - 12) C(m, cd + f, v); });
      [[50, 0, .36], [57, 8, .28], [66, 16, .26], [38, 24, .32], [57, 32, .22], [62, 40, .2]].forEach(([m, f, v]) => { if (cd + f < mEnd - 12) P(m, cd + f, Math.max(6, mEnd - 8 - cd - f), v); });
      Z(38, cd, .5);
      // celesta arpeggios that rise through each bloom, and three notes when the wheel first rolls
      const arp = (f0, dur, n, m0, v) => { let m = m0; for (let i = 0; i < n; i++) { const f = f0 + dur * i / n, pcs = CH[chAt(f)].trip.map(x => x % 12); while (!pcs.includes(m % 12)) m++; C(m, f, v * (.8 + .4 * i / n), -.1); m++; } };
      blooms.forEach((e, i) => { if (e.f < pk) arp(e.f + 1, e.dur, Math.max(3, Math.round(e.dur / 7)), 69 + 2 * i, .34); });
      if (roll && roll.f < pk) arp(roll.f, 9, 3, 86, .3);
    }
    return S;
  }
  function playScore(S) {
    for (const n of S.piano) piano(n.m, n.f / FPS, n.d / FPS, n.v, clamp((n.m - 62) * .012, -.4, .4));
    for (const n of S.cel) celesta(n.m, n.f / FPS, n.v, n.pan);
    for (const n of S.pizz) pizz(n.m, n.f / FPS, n.v);
    for (const n of S.reed) { const d = n.d / FPS;
      const ex = n.fade ? t => 1 - .8 * clamp(t / d) : n.weary ? t => .72 + .28 * Math.sin(Math.PI * clamp(t / d) * .85 + .2) : t => .84 + .16 * Math.sin(Math.PI * clamp(t / d));
      sus('reed', n.m, n.f / FPS, d, { gain: G.reed * n.v, pan: -.08, send: .3, att: n.att || (n.weary ? .11 : .055), rel: n.fade ? .5 : .12, cents: [-4, 4], vib: n.weary ? .0008 : .0014, vr: 5.1, width: .12, expr: ex }); }
    for (const n of S.str) { const f0 = n.f, lvl = n.lvl;
      sus('str', n.m, f0 / FPS, n.d / FPS, { gain: G.str * n.v * (n.thin ? .22 : 1), pan: clamp((64 - n.m) * .028, -.55, .55), send: .5, att: n.att, rel: n.rel, cents: n.thin ? [-3, 4] : n.mel ? [-7, -2, 3, 8] : [-6, 1, 7],
        vib: n.thin ? .0012 : .003, vr: 5.6, width: n.thin ? .3 : .22, expr: lvl ? (t => lvl(f0 + t * FPS)) : n.thin ? (t => .75 + .25 * Math.sin(t * .9)) : null }); }
  }

  // ───────────── foley, one small synth per event type; every attack sits AT e.f/FPS
  const WHOPAN = [-.34, -.48, -.6, -.7, -.78], WHOHZ = [880, 1174.7, 1480, 1318.5, 987.8], WHOPLOP = [1, 1.12, .9, 1.26, 1.06];
  function foley(e, k, tr) {
    const t = e.f / FPS, hill = tr.ambience[clamp(e.f | 0, 0, tr.ambience.length - 1)] === 'hill', dh = hill ? .5 : 1, g = e.gain === undefined ? 1 : e.gain, who = e.who || 0;
    switch (e.type) {
      case 'pedal': { const gg = g * G.pedal, climb = e.where === 'climb' ? 1.5 : 1;
        burst(t, .03, { type: 1, f: 3400, q: 3, att: .0004, dec: .006, gain: .05 * gg, pan: .05, send: .15, seed: k });
        modal(t, [620, 1480, 2350], [.5, .3, .2], [.05, .03, .02], { gain: .07 * gg, pan: .05, send: .15, att: .0004 });
        for (let j = 1; j <= 4; j++) burst(t + .031 * j + .006 * hash2(k, j), .015, { type: 1, f: 4200, q: 4, dec: .003, gain: .018 * gg * (1 - j / 5), pan: .05, send: .1, seed: k * 9 + j });
        burst(t + .004, .13, { type: 1, f: 175, f1: 120, q: 4, att: .02, dec: .04, gain: .018 * gg * climb, pan: .05, send: .1, seed: k + 50 }); break; }
      case 'sigh': { const d = e.dur / FPS;
        if (e.slump) { const D = d * 1.35 + .5; // he gives up: a longer, lower, emptied-out breath with a faint voiced sag under it
          burst(t, D + .4, { type: 1, f: 1050, f1: 380, q: .8, att: .2, dec: D * .5, gain: .017, pan: .05, send: .25, seed: k });
          burst(t, D, { type: 2, f: 3000, att: .16, dec: D * .28, gain: .0025, pan: .05, send: .2, seed: k + 3 });
          tone(t + .06, D * .8, x => 205 - 80 * clamp(x / (D * .8)) + 3 * Math.sin(31 * x), x => Math.pow(Math.sin(Math.PI * clamp(x / (D * .8))), 1.6), .3, .12, { gain: .0045, pan: .05, send: .25 }); break; }
        burst(t, d + .35, { type: 1, f: 1500, f1: 650, q: .9, att: .13, dec: d * .42, gain: e.soft ? .011 : .024, pan: .05, send: .25, seed: k });
        burst(t, d + .2, { type: 2, f: 3800, att: .1, dec: d * .3, gain: e.soft ? .002 : .005, pan: .05, send: .2, seed: k + 3 }); break; }
      case 'flinch': modal(t, [2100, 3300], [.4, .3], [.04, .03], { gain: .03, pan: .05, send: .2, att: .0004 }); modal(t + .07, [2300, 3500], [.4, .3], [.04, .03], { gain: .022, pan: .05, send: .2, att: .0004 });
        tone(t, .09, x => 900 + 4500 * x, x => Math.sin(Math.PI * clamp(x / .09)), .2, 0, { gain: .008, pan: .05, send: .2 }); break;
      case 'launch': tone(t, .5, x => 42 + 46 * Math.exp(-x / .07), x => Math.min(1, x / .005) * Math.exp(-x / .15), .15, 0, { gain: .11, pan: .6, send: .7 });
        burst(t, .3, { type: 0, f: 620, f1: 180, att: .003, dec: .06, gain: .035, pan: .6, send: .7, seed: k }); break;
      case 'banner_pop': burst(t, .06, { type: 1, f: 1300, q: 1.2, att: .0006, dec: .013, gain: .045, pan: .55, send: .5, seed: k });
        for (let j = 0; j < 7; j++) burst(t + .02 + .034 * j, .02, { type: 1, f: 3000 + 250 * j, q: 2, dec: .006, gain: .013 * (1 - j / 9), pan: .55, send: .45, seed: k * 5 + j });
        for (let j = 0; j < 14; j++) { const h = hash2(k * 31 + j, 5); burst(t + .12 + .7 * hash2(k * 17 + j, 2), .012, { type: 1, f: 5000 + 4000 * h, q: 4, dec: .002, gain: .008 * (.4 + .6 * h), pan: .3 + .4 * hash2(j, k), send: .4, seed: k * 77 + j }); } break;
      case 'land': { const pm = WHOPLOP[who % 5], pan = WHOPAN[who % 5], gg = G.plop; // flat comic plop: a dry downward bloop and a pat
        tone(t, .17, x => pm * (150 + 330 * Math.exp(-x / .022) + 180 * clamp((x - .06) / .1)), x => Math.min(1, x / .002) * Math.exp(-x / .05), .2, .05, { gain: .13 * gg, pan, send: .06 });
        burst(t, .04, { type: 1, f: 900, q: 1, att: .0004, dec: .009, gain: .035 * gg, pan, send: .06, seed: k }); burst(t, .07, { type: 0, f: 230, att: .001, dec: .02, gain: .04 * gg, pan, send: .05, seed: k + 9 }); break; }
      case 'clunk': { const gg = g * dh * G.clunk, p = (k & 1 ? 1.06 : .97); // wooden square wheel
        modal(t, [172 * p, 418 * p, 655 * p, 1130 * p], [1, .6, .35, hill ? .06 : .2], [.09, .06, .04, .025], { gain: .075 * gg, pan: WHOPAN[0], send: hill ? .4 : .1, att: .0005 });
        burst(t, .02, { type: 1, f: 1900, q: 1.5, att: .0003, dec: .004, gain: .02 * gg * (hill ? .5 : 1), pan: WHOPAN[0], send: .1, seed: k }); break; }
      case 'chirp': { const b = WHOHZ[who % 5], pan = WHOPAN[who % 5], gg = g * G.chirp; // thin, dry toy voice
        if (e.astonished) { tone(t, .075, x => b * (1 + .12 * x / .075), x => Math.sin(Math.PI * clamp(x / .075)), .35, .2, { gain: .04 * gg, pan, send: .1 });
          tone(t + .12, .3, x => b * (.92 + .75 * Math.pow(clamp(x / .3), 1.6)), x => Math.sin(Math.PI * Math.pow(clamp(x / .3), .7)), .35, .2, { gain: .042 * gg, pan, send: .12 }); }
        else tone(t, .11, x => b * (1 + .2 * Math.sin(Math.PI * clamp(x / .11))), x => Math.min(1, x / .003) * Math.sin(Math.PI * Math.pow(clamp(x / .11), .6)), .35, .2, { gain: .03 * gg, pan, send: .06 }); break; }
      case 'tip': burst(t, .12, { type: 0, f: 190, att: .001, dec: .03, gain: .06 * dh, pan: WHOPAN[0], send: .2, seed: k }); modal(t, [240, 610], [.6, .3], [.07, .04], { gain: .05 * dh, pan: WHOPAN[0], send: .25, att: .0005 });
        for (let j = 0; j < 6; j++) burst(t + .05 + .042 * j + .012 * hash2(k, j), .012, { type: 1, f: 2300 + 700 * hash2(j, k), q: 3, dec: .003, gain: .02 * dh * (1 - j / 7), pan: WHOPAN[0], send: .2, seed: k * 3 + j }); break;
      case 'getup': modal(t, [300, 720], [.6, .3], [.06, .035], { gain: .045 * dh, pan: WHOPAN[0], send: .25, att: .0005 }); modal(t + .09, [340, 800], [.6, .3], [.06, .035], { gain: .035 * dh, pan: WHOPAN[0], send: .25, att: .0005 });
        tone(t + .02, .12, x => 800 * (1 + .45 * clamp(x / .12)), x => Math.sin(Math.PI * clamp(x / .12)), .35, .2, { gain: .016 * dh, pan: WHOPAN[0], send: .1 }); break;
      case 'brake': tone(t, .2, x => 2500 - 1300 * x, x => Math.min(1, x / .003) * (1 - clamp((x - .1) / .1)) * (.75 + .25 * Math.sin(2 * Math.PI * 85 * x)), .3, .1, { gain: .014, pan: .05, send: .25 });
        burst(t, .012, { type: 1, f: 2500, q: 2, att: .0003, dec: .003, gain: .012, pan: .05, send: .2, seed: k }); break;
      case 'sit': burst(t, .09, { type: 0, f: 240, att: .001, dec: .025, gain: .04, pan: .1, send: .25, seed: k }); modal(t, [410, 980], [.5, .25], [.05, .03], { gain: .028, pan: .1, send: .25, att: .0005 });
        tone(t + .03, .24, x => 300 - 200 * x + 14 * Math.sin(90 * x), x => Math.sin(Math.PI * clamp(x / .24)) * (.6 + .4 * Math.sin(2 * Math.PI * 38 * x)), .5, .4, { gain: .009, pan: .1, send: .3 }); break;
      case 'footstep': { const pan = (k & 1 ? .08 : -.04), p = k & 1 ? 1.08 : .95; // webbed slap in grass
        burst(t, .05, { type: 1, f: 520 * p, q: .8, att: .0006, dec: .012, gain: .04 * g, pan, send: .15, seed: k }); burst(t, .06, { type: 0, f: 170, att: .001, dec: .02, gain: .035 * g, pan, send: .1, seed: k + 5 });
        burst(t + .004, .15, { type: 2, f: 3800, att: .012, dec: .035, gain: .008 * g, pan, send: .1, seed: k + 11 }); break; }
      case 'fall': { const d = (e.dur || 12) / FPS, b = WHOHZ[who % 5], pan = WHOPAN[who % 5], sun = tr.ambience[clamp(e.f | 0, 0, tr.ambience.length - 1)] === 'sun', gg = g * (sun ? .3 : 1); // toy slide-whistle: glides down for exactly dur frames and stops AT the land
        const fq = x => { const u = clamp(x / d); return b * (2.25 - 1.3 * Math.pow(u, .8)) * (1 + .012 * Math.sin(2 * Math.PI * 11 * x) * u); }, am = x => { const u = clamp(x / d); return Math.min(1, x / .035) * (.45 + .55 * u) * Math.min(1, (1 - u) * d / .012); };
        tone(t, d, fq, am, .1, .03, { gain: .011 * gg, pan: pan * .6, send: .1 });
        burst(t, d, { type: 1, f: b * 4.4, f1: b * 1.9, q: 2.2, att: .04, dec: d * 2, gain: .0022 * gg, pan: pan * .6, send: .1, seed: k + 21 }); break; }
      case 'lean': { // bicycle laid against the bark: a small dull wooden knock, a tick of the frame after it
        modal(t, [265, 610, 1180], [1, .5, .18], [.07, .045, .025], { gain: .02 * g, pan: -.12, send: .3, att: .0015 }); burst(t, .03, { type: 0, f: 420, att: .0015, dec: .008, gain: .008 * g, pan: -.12, send: .2, seed: k });
        modal(t + .055, [2140, 3390], [.6, .3], [.16, .09], { gain: .0035 * g, pan: -.1, send: .4, att: .001 }); break; }
      case 'rustle': { const gg = g * (e.soft ? .5 : 1), d = e.soft ? .2 : .26; // feathers: a soft brush of air, two overlapping strokes
        burst(t, d, { type: 1, f: 2300, f1: 4600, q: .7, att: .035, dec: d * .3, gain: .011 * gg, pan: .02, send: .2, seed: k * 13 + 1 });
        burst(t + .07, d * .8, { type: 2, f: 5200, att: .03, dec: d * .22, gain: .0035 * gg, pan: .1, send: .2, seed: k * 13 + 2 }); break; }
      case 'glint': { const d = (e.dur || 24) / FPS, ms = [98, 93, 102, 90, 97, 105, 93, 100, 86]; // glass / celesta shimmer across the glint
        for (let j = 0; j < 9; j++) { const f = mtof(ms[j]); modal(t + d * (j + .5 * hash2(j, 3)) / 9.5, [f, f * 2.71, f * 5.2], [1, .25, .08], [.9, .4, .15], { gain: .013 * (.6 + .5 * hash2(j, 8)), pan: .15 + .3 * hash2(j, 4), send: .6, att: .001 }); } break; }
      case 'touch': { modal(t, [950, 2100], [.5, .25], [.03, .02], { gain: .045, pan: -.3, send: .3, att: .0004 }); burst(t, .01, { type: 1, f: 2600, q: 2, att: .0003, dec: .002, gain: .012, pan: -.3, send: .2, seed: k });
        const f = mtof(e.wheel === 2 ? 90 : 86); modal(t, [f, f * 2.002, f * 4.03], [1, .2, .05], [1.6, .8, .25], { gain: .04, pan: -.3, send: .5, att: .0012 }); break; }
      case 'bloom': { const d = e.dur / FPS; burst(t, d + .6, { type: 1, f: 1700, f1: 6500, q: 2.5, att: d * .7, dec: .3, gain: .006, pan: -.3, send: .6, seed: k }); break; }
      case 'roll_smooth': burst(t, .9, { type: 1, f: 280, f1: 520, q: 3, att: .3, dec: .3, gain: .016, pan: WHOPAN[0], send: .3, seed: k }); break;
      case 'tram_bell': for (let j = 0; j < 2; j++) modal(t + .42 * j, [640, 1532, 2490], [1, .4, .15], [1.3, .7, .3], { gain: .05 * g, pan: -.7, send: .9, att: .003 }); break;
      case 'gust': { const s = e.strength || .4; burst(t - .8, 2.3, { type: 1, f: 380, f1: 800, q: .8, att: .8, dec: .55, gain: .012 * s, pan: -.55, send: .1, seed: k }); burst(t - .62, 2.3, { type: 1, f: 420, f1: 850, q: .8, att: .8, dec: .55, gain: .012 * s, pan: .55, send: .1, seed: k + 99 }); break; }
    }
  }

  // ───────────── ambience: sea, wind, grass, cicadas, tyre hum, the fixed wheel's hum, the saddle scrape
  function ambience(tr, bellF) {
    const nf = tr.wind.length, spf = N / nf, A = tr.ambience;
    let wR = A[0] === 'road' ? 1 : 0, wH = A[0] === 'hill' ? 1 : 0, wS = A[0] === 'sun' ? 1 : 0;
    let s1 = 0x1f123bb5 | 0, s2 = 0x5f356495 | 0, s3 = 0x2c9277b5 | 0, s4 = 0x7a4f0cd1 | 0;
    let aL1 = 0, aL2 = 0, aR1 = 0, aR2 = 0, fL = 0, fR = 0, fL2 = 0, fR2 = 0, gLs = 0, gRs = 0, gLs2 = 0, gRs2 = 0;
    let wl1 = 0, wl2 = 0, wr1 = 0, wr2 = 0, ty1 = 0, ty2 = 0, hm1 = 0, hm2 = 0, sp1 = 0, sp2 = 0;
    const swell = (t, per, off) => { const p = (t / per + off) % 1; return p < .42 ? Math.pow(smooth(p / .42), 2) : Math.pow(1 - smooth((p - .42) / .58), 1.4); };
    const svf = (f, q) => { const g = Math.tan(Math.PI * f / FS), k = 1 / q, a1 = 1 / (1 + g * (g + k)); return [a1, g * a1, g * g * a1]; };
    const tyC = svf(210, .9), hmC = svf(236, 6), spC = svf(2400, 1.2), cF = 1 - Math.exp(-2 * Math.PI * 2200 / FS), cF2 = 1 - Math.exp(-2 * Math.PI * 7000 / FS), cG = 1 - Math.exp(-2 * Math.PI * 4200 / FS), cG2 = 1 - Math.exp(-2 * Math.PI * 9000 / FS);
    // cicadas: two buzzers, each three close sine partials under a fast pulse
    const CF = [[4080, 4290, 4610], [3720, 3950, 4180]], CR = [57, 46], CT = [3.3, 4.7];
    const co = CF.map(fs => fs.map(f => { const w = 2 * Math.PI * f / FS; return { c: 2 * Math.cos(w), y1: Math.sin(w), y2: 0 }; })), cp = CR.map(r => { const w = 2 * Math.PI * r / FS; return { c: Math.cos(w), s: Math.sin(w), x: 1, y: 0 }; });
    let P = null; // previous frame's control values
    for (let f = 0; f < nf; f++) { const t = f / FPS, a = A[f], kz = .1; wR += ((a === 'road' ? 1 : 0) - wR) * kz; wH += ((a === 'hill' ? 1 : 0) - wH) * kz; wS += ((a === 'sun' ? 1 : 0) - wS) * kz;
      const eL = .22 + .78 * Math.max(swell(t, 7.3, .3), .8 * swell(t, 11.9, .62)), eR = .22 + .78 * Math.max(swell(t, 7.3, .37), .8 * swell(t, 11.9, .7));
      const seaG = G.sea * (wR + .45 * wH + 1.05 * wS), w = tr.wind[f], wl = tr.wind[Math.min(nf - 1, f + 2)], wr = tr.wind[Math.max(0, f - 2)], em = tr.emotion[f];
      const C = { seaL: seaG * eL * .92, seaR: seaG * eR * 1.08, cL: 1 - Math.exp(-2 * Math.PI * (300 + 850 * eL * (1 - .65 * wH)) / FS), cR: 1 - Math.exp(-2 * Math.PI * (300 + 850 * eR * (1 - .65 * wH)) / FS),
        foL: G.foam * seaG * eL * eL * (1 - .9 * wH), foR: G.foam * seaG * eR * eR * (1 - .9 * wH),
        wdL: G.wind * Math.pow(wl, 1.5) * (1 + .25 * vnoise(f * .21, 3)) * (1 - .35 * wH), wdR: G.wind * Math.pow(wr, 1.5) * (1 + .25 * vnoise(f * .21, 4)) * (1 - .35 * wH), wc: svf(250 + 620 * w, 1.1),
        grL: G.grass * wl * wl * (wH + .45 * wR + .6 * wS) * (.7 + .3 * vnoise(f * .4, 5)), grR: G.grass * wr * wr * (wH + .45 * wR + .6 * wS) * (.7 + .3 * vnoise(f * .4, 6)),
        ci0: G.cic * wH * (1 - .5 * em) * (.3 + .7 * smooth(.5 + .5 * Math.sin(2 * Math.PI * t / CT[0] + 1))), ci1: G.cic * wH * (1 - .5 * em) * (.3 + .7 * smooth(.5 + .5 * Math.sin(2 * Math.PI * t / CT[1] + 4))),
        ty: G.tyre * (tr.heroSpeed[f] / 12.5) * (1 + .12 * Math.sin(t * 9.4)), hm: G.hum * tr.swHum[f], sp: G.scrape * tr.scrape[f] * (.45 + .55 * Math.abs(vnoise(f * .9, 9))) };
      if (!P) P = C; const i0 = Math.round(f * spf), i1 = Math.round((f + 1) * spf), inv = 1 / (i1 - i0);
      const dSeaL = (C.seaL - P.seaL) * inv, dSeaR = (C.seaR - P.seaR) * inv, dFoL = (C.foL - P.foL) * inv, dFoR = (C.foR - P.foR) * inv, dWdL = (C.wdL - P.wdL) * inv, dWdR = (C.wdR - P.wdR) * inv, dGrL = (C.grL - P.grL) * inv, dGrR = (C.grR - P.grR) * inv;
      const dCi0 = (C.ci0 - P.ci0) * inv, dCi1 = (C.ci1 - P.ci1) * inv, dTy = (C.ty - P.ty) * inv, dHm = (C.hm - P.hm) * inv, dSp = (C.sp - P.sp) * inv;
      let seaL = P.seaL, seaR = P.seaR, foL = P.foL, foR = P.foR, wdL = P.wdL, wdR = P.wdR, grL = P.grL, grR = P.grR, ci0 = P.ci0, ci1 = P.ci1, ty = P.ty, hm = P.hm, sp = P.sp;
      const cL = C.cL, cR = C.cR, w1 = C.wc[0], w2 = C.wc[1], w3 = C.wc[2], kw = 1 / 1.1;
      const doC = C.ci0 + P.ci0 + C.ci1 + P.ci1 > 1e-7, doT = C.ty + P.ty > 1e-7, doH = C.hm + P.hm > 1e-7, doS = C.sp + P.sp > 1e-7, doG = C.grL + P.grL + C.grR + P.grR > 1e-7;
      for (let i = i0; i < i1; i++) {
        s1 = (Math.imul(s1, 1664525) + 1013904223) | 0; s2 = (Math.imul(s2, 1664525) + 1013904223) | 0; s3 = (Math.imul(s3, 1664525) + 1013904223) | 0; s4 = (Math.imul(s4, 1664525) + 1013904223) | 0;
        const n1 = s1 * 4.656612873e-10, n2 = s2 * 4.656612873e-10, n3 = s3 * 4.656612873e-10, n4 = s4 * 4.656612873e-10;
        // sea: dark swell + foam hiss on the crest
        aL1 += (n1 - aL1) * cL; aL2 += (aL1 - aL2) * cL; aR1 += (n2 - aR1) * cR; aR2 += (aR1 - aR2) * cR;
        fL += (n1 - fL) * cF; fL2 += (n1 - fL - fL2) * cF2; fR += (n2 - fR) * cF; fR2 += (n2 - fR - fR2) * cF2;
        let l = aL2 * seaL + fL2 * foL, r = aR2 * seaR + fR2 * foR;
        // wind: band-passed air that brightens as it rises
        let v3 = n3 - wl2, v1 = w1 * wl1 + w2 * v3, v2 = wl2 + w2 * wl1 + w3 * v3; wl1 = 2 * v1 - wl1; wl2 = 2 * v2 - wl2; l += v1 * wdL;
        v3 = n4 - wr2; v1 = w1 * wr1 + w2 * v3; v2 = wr2 + w2 * wr1 + w3 * v3; wr1 = 2 * v1 - wr1; wr2 = 2 * v2 - wr2; r += v1 * wdR;
        if (doG) { gLs += (n3 - gLs) * cG; gLs2 += (n3 - gLs - gLs2) * cG2; gRs += (n4 - gRs) * cG; gRs2 += (n4 - gRs - gRs2) * cG2; l += gLs2 * grL; r += gRs2 * grR; }
        if (doC) { for (let j = 0; j < 2; j++) { const o = co[j], p = cp[j]; let sgn = 0; for (let q = 0; q < 3; q++) { const u = o[q], y = u.c * u.y1 - u.y2; u.y2 = u.y1; u.y1 = y; sgn += y; }
            const x = p.x * p.c - p.y * p.s; p.y = p.y * p.c + p.x * p.s; p.x = x; const am = .5 + .5 * x, v = sgn * am * am * (j ? ci1 : ci0); if (j) { l += v * .35; r += v; } else { l += v; r += v * .3; } } }
        if (doT) { v3 = n2 - ty2; v1 = tyC[0] * ty1 + tyC[1] * v3; v2 = ty2 + tyC[1] * ty1 + tyC[2] * v3; ty1 = 2 * v1 - ty1; ty2 = 2 * v2 - ty2; const y = v1 * ty; l += y; r += y; }
        if (doH) { v3 = n1 - hm2; v1 = hmC[0] * hm1 + hmC[1] * v3; v2 = hm2 + hmC[1] * hm1 + hmC[2] * v3; hm1 = 2 * v1 - hm1; hm2 = 2 * v2 - hm2; const y = v1 * hm; l += y * 1.2; r += y * .6; }
        if (doS) { v3 = n4 - sp2; v1 = spC[0] * sp1 + spC[1] * v3; v2 = sp2 + spC[1] * sp1 + spC[2] * v3; sp1 = 2 * v1 - sp1; sp2 = 2 * v2 - sp2; const y = v1 * sp; l += y * 1.25; r += y * .5; }
        bL[i] += l; bR[i] += r;
        seaL += dSeaL; seaR += dSeaR; foL += dFoL; foR += dFoR; wdL += dWdL; wdR += dWdR; grL += dGrL; grR += dGrR; ci0 += dCi0; ci1 += dCi1; ty += dTy; hm += dHm; sp += dSp; }
      P = C; }
    // distant gulls over the water, now and then (never near a bell)
    const rg = RNG(4242); let f = 14 + rg.int(0, 20);
    while (f < nf - 30) { const z = A[f], clear = !bellF.some(b => f > b - 30 && f < b + 60);
      if (z !== 'hill' && clear) { const n = rg.int(2, 4), pan = rg.range(-.2, .85), far = rg.range(.5, 1), base = rg.range(1250, 1550);
        for (let j = 0; j < n; j++) { const d = j === n - 1 ? .34 : .2, t0 = f / FPS + j * .27, b = base * (1 - .04 * j);
          tone(t0, d, x => b * (1 + .32 * Math.sin(Math.PI * Math.pow(clamp(x / d), .45)) - .22 * clamp(x / d)), x => Math.pow(Math.sin(Math.PI * clamp(x / d)), 1.3), .45, .2, { gain: .009 * far, pan, send: .9 }); } }
      f += rg.int(150, 260); }
    // one evening cicada (higurashi) calling far off on the hill: kana-kana-kana, quickening and sinking
    const hs = A.indexOf('hill'); if (hs >= 0) for (const f0 of [hs + 60, hs + 262]) { if (A[Math.min(nf - 1, f0 + 80)] !== 'hill') continue; let tt = f0 / FPS, gap = .26, j = 0;
      while (j < 15) { const fq = 3650 - 28 * j, am = .0032 * Math.sin(Math.PI * (j + 1) / 16.5); tone(tt, .1, x => fq - 500 * x, x => Math.pow(Math.sin(Math.PI * clamp(x / .1)), 1.5), .12, 0, { gain: am, pan: f0 === hs + 60 ? .55 : -.5, send: 1 }); tt += gap; gap = Math.max(.105, gap * .9); j++; } }
    // freewheel: faint ticking while he coasts down the sunset road
    let lastPedal = -99; const ped = tr._pedals || [];
    for (let ff = 0; ff < nf; ff += 1.6) { const fi = ff | 0; if (A[fi] !== 'sun' || tr.heroSpeed[fi] <= .2) continue; while (ped.length && ped[0] <= ff) lastPedal = ped.shift(); if (ff - lastPedal < 9) continue;
      burst(ff / FPS, .008, { type: 1, f: 3600, q: 3, att: .0003, dec: .0015, gain: .0065 * (tr.heroSpeed[fi] / 5.5), pan: .05, send: .1, seed: fi }); }
  }

  // ───────────── room: one small stereo Schroeder reverb shared by everything
  function reverb(wet) {
    const k = FS / 44100, CL = [1116, 1188, 1277, 1356, 1491, 1617], AP = [556, 441, 341], fb = .87, damp = .3, pd = Math.round(.018 * FS), acc = new Float32Array(N);
    for (let ch = 0; ch < 2; ch++) { const a = ch ? sR : sL, b = ch ? sL : sR, out = ch ? bR : bL; acc.fill(0);
      for (let c = 0; c < CL.length; c++) { const len = Math.round((CL[c] + ch * 23) * k), buf = new Float32Array(len); let p = 0, flt = 0;
        for (let i = pd; i < N; i++) { const y = buf[p]; flt = y * (1 - damp) + flt * damp; buf[p] = a[i - pd] + .3 * b[i - pd] + flt * fb; acc[i] += y; if (++p === len) p = 0; } }
      for (let c = 0; c < AP.length; c++) { const len = Math.round((AP[c] + ch * 23) * k), buf = new Float32Array(len); let p = 0;
        for (let i = 0; i < N; i++) { const x = acc[i], y = buf[p]; buf[p] = x + y * .5; acc[i] = y - x; if (++p === len) p = 0; } }
      const cl = 1 - Math.exp(-2 * Math.PI * 5500 / FS), chp = 1 - Math.exp(-2 * Math.PI * 160 / FS); let lp = 0, hp = 0;
      for (let i = 0; i < N; i++) { lp += (acc[i] - lp) * cl; hp += (lp - hp) * chp; out[i] += (lp - hp) * wet; } }
  }

  // ───────────── loudness (BS.1770 K-weighting, gated) and a look-ahead peak limiter
  function kcoef(fs) { let K = Math.tan(Math.PI * 1681.9744509555319 / fs), Q = .7071752369554193; const Vh = Math.pow(10, 3.99984385397 / 20), Vb = Math.pow(Vh, .499666774155); let a0 = 1 + K / Q + K * K;
    const s = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
    K = Math.tan(Math.PI * 38.13547087613982 / fs); Q = .5003270373253953; a0 = 1 + K / Q + K * K; return [s, [1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]]; }
  function lufs(Lb, Rb, fs) { const [s, h] = kcoef(fs), n = Lb.length, blk = Math.round(.4 * fs), hop = Math.round(.1 * fs), nh = Math.floor(n / hop), E = new Float64Array(nh);
    for (const x of [Lb, Rb]) { let a1 = 0, a2 = 0, b1 = 0, b2 = 0, c1 = 0, c2 = 0, d1 = 0, d2 = 0;
      for (let i = 0; i < n; i++) { const v = x[i], y = s[0] * v + s[1] * a1 + s[2] * a2 - s[3] * b1 - s[4] * b2; a2 = a1; a1 = v; b2 = b1; b1 = y;
        const z = y - 2 * c1 + c2 - h[3] * d1 - h[4] * d2; c2 = c1; c1 = y; d2 = d1; d1 = z; const j = (i / hop) | 0; if (j < nh) E[j] += z * z; } }
    const B = []; for (let j = 0; j + 4 <= nh; j++) B.push((E[j] + E[j + 1] + E[j + 2] + E[j + 3]) / blk);
    const lk = e => -0.691 + 10 * Math.log10(e + 1e-30); let g = B.filter(e => lk(e) > -70); if (!g.length) return -Infinity;
    const rel = lk(g.reduce((a, b) => a + b, 0) / g.length) - 10; g = g.filter(e => lk(e) > rel); return lk(g.reduce((a, b) => a + b, 0) / g.length); }
  function limit(ceil) { const la = Math.round(.004 * FS), up = 1 / la, rel = 1 / (.12 * FS); let need = false;
    for (let i = 0; i < N; i++) if (Math.abs(bL[i]) > ceil || Math.abs(bR[i]) > ceil) { need = true; break; } if (!need) return 0;
    const g = new Float32Array(N); let m = 1, cnt = 0;
    for (let i = N - 1; i >= 0; i--) { const p = Math.max(Math.abs(bL[i]), Math.abs(bR[i])), w = p > ceil ? ceil / p : 1; if (w < 1) cnt++; m = Math.min(w, m + up); g[i] = m; }
    m = 1; for (let i = 0; i < N; i++) { m = Math.min(g[i], m + rel); bL[i] *= m; bR[i] *= m; } return cnt; }

  // ───────────── render
  function render(events, tracks, sr, opts) {
    FS = sr; const nf = tracks.wind.length, spf = Math.round(FS / FPS); N = nf * spf; // 1440 frames -> exactly 60 s
    bL = new Float32Array(N); bR = new Float32Array(N); sL = new Float32Array(N); sR = new Float32Array(N); SCN = Math.round(FS * 20); scA = new Float32Array(SCN); scB = new Float32Array(SCN); tables = {};
    const only = opts.only, stem = opts.stem, on = s => !only && (!stem || stem === s), meta = {};
    const bells = events.filter(e => e.type === 'bell'), bellF = bells.map(e => e.f), fadeE = events.find(e => e.type === 'fade');
    if (only) { mg = G.foley; let k = 0; for (const e of events) if (e.type === only) { if (opts.index === undefined || opts.index === k) { if (only === 'bell') ringBell(bells, k); else foley(e, k, tracks); } k++; } mg = 1; return { L: bL, R: bR, sr: FS, meta }; }
    // 1. music, then its own exit: nothing of it is left once the picture starts to whiten
    const S = buildScore(events); meta.score = S;
    if (on('music')) { mg = G.music; playScore(S); mg = 1; if (S.musicEnd != null) { const a = Math.round((S.musicEnd - 26) * spf), b = Math.round(S.musicEnd * spf);
        for (let i = Math.max(0, a); i < N; i++) { const u = i >= b ? 0 : 1 - smooth((i - a) / (b - a)); bL[i] *= u; bR[i] *= u; sL[i] *= u; sR[i] *= u; } } }
    // 2. foley and ambience
    if (on('foley')) { mg = G.foley; const cnt = {}; for (const e of events) { const k = cnt[e.type] = (cnt[e.type] || 0) + 1; if (e.type !== 'bell') foley(e, k - 1, tracks); } mg = 1; }
    if (on('amb')) { const tr = Object.assign({}, tracks, { _pedals: events.filter(e => e.type === 'pedal').map(e => e.f) }); ambience(tr, bellF); }
    // 3. ride the bed with the emotion curve and duck it under each bell (the bell itself is added afterwards, untouched)
    { const em = tracks.emotion, duck = new Float32Array(N).fill(1), dAmt = .47, pre = Math.round(.03 * FS), holdN = Math.round(.42 * FS), relN = Math.round(.75 * FS);
      for (const bf of bellF) { const c = Math.round(bf * spf); for (let i = Math.max(0, c - pre); i < Math.min(N, c + holdN + relN); i++) { const d = i < c ? 1 - (1 - dAmt) * smooth((i - (c - pre)) / pre) : i < c + holdN ? dAmt : dAmt + (1 - dAmt) * smooth((i - c - holdN) / relN); if (d < duck[i]) duck[i] = d; } }
      const ride = e => .62 + .38 * Math.pow(e, .8);
      for (let f = 0; f < nf; f++) { const r0 = ride(em[f]), r1 = ride(em[Math.min(nf - 1, f + 1)]), i0 = f * spf; for (let j = 0; j < spf; j++) { const i = i0 + j, g = (r0 + (r1 - r0) * j / spf) * duck[i]; bL[i] *= g; bR[i] *= g; sL[i] *= g; sR[i] *= g; } } }
    // 4. the brass bell, never masked
    if (on('bell')) for (let i = 0; i < bells.length; i++) ringBell(bells, i);
    // 5. room, DC block, fade with the picture
    reverb(.02);
    { const q = 1 - 2 * Math.PI * 22 / FS; let xl = 0, yl = 0, xr = 0, yr = 0; for (let i = 0; i < N; i++) { const l = bL[i], r = bR[i]; yl = l - xl + q * yl; xl = l; yr = r - xr + q * yr; xr = r; bL[i] = yl; bR[i] = yr; } }
    { const nIn = Math.round(.02 * FS); for (let i = 0; i < nIn; i++) { const u = smooth(i / nIn); bL[i] *= u; bR[i] *= u; }
      const fa = fadeE ? fadeE.f : nf - 24, fb = fadeE ? fadeE.f + fadeE.dur : nf, a = Math.round(fa * spf), b = Math.min(N, Math.round(fb * spf));
      for (let i = a; i < N; i++) { const u = i >= b - 1 ? 0 : Math.pow(1 - smooth((i - a) / (b - 1 - a)), 1.5); bL[i] *= u; bR[i] *= u; } }
    // 6. master: normalise to -16 LUFS, keep peaks under -1 dBTP
    let gain = opts.fixedGain; if (gain === undefined) { const l0 = lufs(bL, bR, FS); gain = isFinite(l0) ? Math.pow(10, (-16 - l0) / 20) : 1; meta.preLufs = l0; }
    for (let i = 0; i < N; i++) { bL[i] *= gain; bR[i] *= gain; }
    if (opts.fixedGain === undefined) { meta.limited = limit(Math.pow(10, -1.6 / 20));
      if (meta.limited) { const l1 = lufs(bL, bR, FS), g2 = Math.min(1.06, Math.pow(10, (-16 - l1) / 20)); if (g2 > 1.003) { for (let i = 0; i < N; i++) { bL[i] *= g2; bR[i] *= g2; } gain *= g2; limit(Math.pow(10, -1.6 / 20)); } } }
    meta.gain = gain; const out = { L: bL, R: bR, sr: FS, meta };
    bL = bR = sL = sR = scA = scB = null; tables = null; return out;
  }
  return { render, buildScore, lufs, nname };
})();
