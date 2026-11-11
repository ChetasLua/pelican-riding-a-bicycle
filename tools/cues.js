// SPOTTER output: the event log exported from the picture's own functions + per-shot emotion curves (+ notes from tools/spotter_notes.json if present)
const fs = require('fs'), load = require('./load.js'); load(['core', 'story', 'cams']);
const E = buildEvents(), Tr = buildTracks(), notes = fs.existsSync('tools/spotter_notes.json') ? JSON.parse(fs.readFileSync('tools/spotter_notes.json', 'utf8')) : [];
const shots = CUTS.slice(0, -1).map((a, i) => { const b = CUTS[i + 1], em = Tr.emotion.slice(a, b); return { shot: i + 1, from: a, to: b, seconds: [a / FPS, b / FPS], bars: [a / BAR, b / BAR], emotion_mean: +(em.reduce((x, y) => x + y, 0) / em.length).toFixed(3), emotion_curve_every_12f: em.filter((_, k) => k % 12 === 0) }; });
const out = { title: 'a pelican riding a bicycle', fps: FPS, frames: NF, seconds: NF / FPS, tempo: { meter: '3/4', bar_frames: BAR, beat_frames: BEAT, bpm: 180, note: 'constant; every cut lies on a barline or half-bar; melody peak at frame ' + T.peak },
  cuts: CUTS, sub_shots: SUBS, dissolve: DISSOLVE, fade: FADE, shots, events: E.map(e => Object.assign({ t: +(e.f / FPS).toFixed(4) }, e)), spotter_notes: notes,
  tracks_per_frame: Tr };
fs.writeFileSync('cues.json', JSON.stringify(out)); console.log('cues.json', E.length, 'events', notes.length, 'spotter notes');
