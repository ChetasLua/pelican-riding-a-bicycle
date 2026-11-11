// ───────────────────────── story: the single timeline. Picture AND sound read from here. ─────────────────────────
const CUTS = [0, 168, 360, 648, 864, 1056, 1248, 1440];
const SUBS = [
  { k: '1', a: 0, b: 168, shot: 1, set: 'road' }, { k: '2', a: 168, b: 360, shot: 2, set: 'road' },
  { k: '3a', a: 360, b: 432, shot: 3, set: 'road' }, { k: '3b', a: 432, b: 480, shot: 3, set: 'road' }, { k: '3c', a: 480, b: 528, shot: 3, set: 'road' },
  { k: '3d', a: 528, b: 564, shot: 3, set: 'road' }, { k: '3e', a: 564, b: 612, shot: 3, set: 'road' }, { k: '3f', a: 612, b: 648, shot: 3, set: 'road' },
  { k: '4a', a: 648, b: 720, shot: 4, set: 'hill' }, { k: '4b', a: 720, b: 864, shot: 4, set: 'hill' },
  { k: '5a', a: 864, b: 936, shot: 5, set: 'hill' }, { k: '5b', a: 936, b: 954, shot: 5, set: 'hill' }, { k: '5c', a: 954, b: 1056, shot: 5, set: 'hill' },
  { k: '6', a: 1056, b: 1248, shot: 6, set: 'hill' }, { k: '7', a: 1248, b: 1440, shot: 7, set: 'sun' }];
const subAt = f => { for (const s of SUBS) if (f < s.b) return s; return SUBS[SUBS.length - 1]; };
const DISSOLVE = [648, 660];            // shot 3 keeps running under shot 4 for 12 frames
const FADE = [1416, 1440];
// key story frames (all picture acting and all sound cues derive from these)
const T = {
  sigh: { a: 216, peak: 228, b: 258 },
  launches: [ // tower fires -> banner pops & confetti -> a new pelican lands
    { launch: 264, pop: 272, land: 304, who: 0 },   // SQUARE-WHEELS
    { launch: 361, pop: 368, land: 392, who: 1 },   // UPSIDE-DOWN
    { launch: 441, pop: 448, land: 464, who: 2 },   // BACK-BEAK
    { launch: 530, pop: 536, land: 544, who: 3 },   // NOODLE
    { launch: 1296, pop: 1304, land: 1368, who: 4 }], // the newcomer, welcomed
  flinch: 274, glanceBack: [320, 344], sideGlance: [400, 424], eyeRoll: [484, 522], defeated: 568,
  climbStop: 708, sitA: 720, sitB: 746, hold4: [756, 864],
  swTip: [784, 844], swUp: [812, 948],
  shaft: [868, 900], glint: [880, 912], rackBell: [900, 924], lookPlate: [912, 930], lookDown: [926, 936],
  notice: [954, 962], tender: [990, 1040], hold5: [960, 1056],
  walk: [1056, 1104], steps: [1062, 1074, 1086, 1098], bend: [1104, 1128],
  touch1: 1128, bloom1: [1128, 1172], bloom2: [1166, 1198], roll: [1200, 1244],
  bells: [1224, 1336, 1344], text: [1356, 1386], peak: 1248,
};
const GUSTS = [[30, .6], [118, .5], [205, .45], [330, .4], [420, .35], [505, .4], [590, .4], [672, .55], [776, .6], [838, .35], [905, .3], [1010, .35], [1090, .4], [1190, .45], [1270, .6], [1400, .5]];
function windAt(f) { let w = .16 + .05 * Math.sin(f * .021) + .03 * Math.sin(f * .057 + 1); for (const [g, s] of GUSTS) w += s * bump(f, g - 18, g, g + 40); return clamp(w, 0, 1); }
// wind as a travelling wave: strength felt at world x (waves move left -> right)
function windAtX(f, x) { return windAt(f - x * .012) * (.8 + .2 * Math.sin(x * .004 + f * .13)); }
const EMO = [[0, .25], [168, .3], [360, .45], [600, .62], [648, .5], [672, .12], [864, .1], [960, .18], [1056, .42], [1128, .5], [1176, .75], [1248, 1], [1340, .85], [1400, .45], [1440, 0]];
const emotionAt = f => kf(f, EMO, 'lin');

// ── bicycle constants (shared by picture and sound)
const BK = { R: 62, wb: 190, gear: 1.54 };
// ── ground profiles (y positive = down the screen)
const roadY = x => 14 * Math.sin(x / 640 + .7) + 8 * Math.sin(x / 290 + 2.1);
const hillY = x => 420 * (1 - smooth((x - 500) / 2000));
const sunY = x => .13 * (x - 1500) + 16 * Math.sin(x / 520);
const GROUND = { road: roadY, hill: hillY, sun: sunY };
const slopeOf = (g, x) => (g(x + 30) - g(x - 30)) / 60;

// ── hero motion tables
const HX = new Float64Array(700), HCR = new Float64Array(700);
(function () { let x = -158, a = 0; for (let f = 0; f < 700; f++) { HX[f] = x; HCR[f] = a;
  const v = 12.5 * (1 - .2 * bump(f, 214, 238, 262)) * (1 - .1 * bump(f, 272, 278, 292)); x += v; a += v / (BK.R * BK.gear); } })();
const CLX = f => kf(f, [[648, 2080], [708, 2760, 'out'], [720, 2760]]);
const CLCR = new Float64Array(80); (function () { let a = .4; for (let i = 0; i < 80; i++) { CLCR[i] = a; a += (CLX(648 + i + 1) - CLX(648 + i)) / (BK.R * 1.02); } })();
const SUNV = 11;
function heroRoad(f) { const i = clamp(f, 0, 699) | 0, off = f >= 360 ? -3200 : 0; return { x: HX[i] + off, crank: HCR[2 * (i >> 1)], speed: HX[Math.min(699, i + 1)] - HX[i] }; }
function heroHill(f) { // returns pose descriptor for the hill set
  if (f < 720) { const i = clamp(f - 648, 0, 79) | 0; return { x: CLX(f), crank: CLCR[2 * (i >> 1)], speed: CLX(f + 1) - CLX(f), pose: f < T.climbStop ? 'climb' : 'stopped', face: 1 }; }
  if (f < 1056) return { x: 3120, crank: 0, speed: 0, pose: 'sit', face: -1 };
  const x = kf(f, [[1056, 2735], [1104, 2520, 'out']]); return { x, crank: 0, speed: 0, pose: 'walk', face: -1 };
}
function heroSun(f) { const x = 1500 + SUNV * (f - 1248), f2 = 2 * (f >> 1); return { x, crank: 1.2 + (f2 - 1248) * PI / 48, speed: SUNV }; }

// ── benchmark pelicans.  All of their motion is quantised to fours.
const BN = ['SQUARE-WHEELS', 'UPSIDE-DOWN', 'BACK-BEAK', 'NOODLE', 'NEWCOMER'];
const SLOT = [370, 670, 950, 1210];
const q4 = f => 4 * Math.floor(f / 4);
function dropY(f4, land) { const d = f4 - land; return d <= -16 ? null : d === -12 ? -720 : d === -8 ? -400 : d === -4 ? -130 : d === 4 ? -16 : 0; }
function benchRoad(i, f) { const L = T.launches[i], f4 = q4(f), dy = dropY(f4, L.land); if (dy === null) return null;
  const x = heroRoad(f4).x - SLOT[i]; return { x, dy, rollX: HX[clamp(f4, 0, 699)] - SLOT[i], landed: f4 >= L.land }; }
// SQUARE-WHEELS on the hill
const SWX = [[648, 1700], [716, 1880], [720, 1900], [776, 2140], [780, 2140], [792, 2085], [812, 2085], [836, 2160], [840, 2160], [852, 2100], [948, 2100], [1040, 2150], [1200, 2150], [1216, 2222], [1232, 2186], [1248, 2230]];
const SWTIP = [[776, 0], [784, 1], [800, 1], [812, 0], [836, 0], [844, 1], [936, 1], [948, 0]];
function swHill(f) { const smoothRoll = f >= T.roll[0]; const ff = smoothRoll ? f : q4(f); return { x: kf(ff, SWX, smoothRoll ? 'io' : 'lin'), tip: kf(ff, SWTIP, 'lin'), smoothRoll }; }
const HILLWAIT = [null, 1540, 1330, 1150];   // where the others give up at the foot of the hill
function benchSun(i, f) { // i: 0..4 following the hero down the sunset road
  if (i === 4) { const f4 = q4(f), dy = dropY(f4, T.launches[4].land); if (dy === null) return null; return { x: heroSun(f4).x - 1560, dy }; }
  const ff = i === 0 ? f : q4(f); return { x: heroSun(ff).x - 330 * (i + 1) - (i ? 20 : 0), dy: 0 }; }
// square wheel pose index from distance (each 50 px = 45°); even = flat
const sqK = x => Math.round(x / 50);

// ── the event log, derived only from the functions above
let EVENTS = null;
function buildEvents() { const E = []; const ev = (f, type, o = {}) => E.push(Object.assign({ f, type }, o));
  for (const s of SUBS) ev(s.a, 'cut', { sub: s.k, shot: s.shot, major: CUTS.includes(s.a) });
  ev(DISSOLVE[0], 'dissolve', { dur: DISSOLVE[1] - DISSOLVE[0] }); ev(FADE[0], 'fade', { dur: FADE[1] - FADE[0] });
  // pedal down-strokes (hero is animated on twos, so strokes land on even frames)
  const strokes = (a, b, crankOf, tag, gainOf) => { for (let f = Math.max(2, a + (a & 1)); f < b; f += 2) { const k0 = Math.floor(crankOf(f - 2) / PI), k1 = Math.floor(crankOf(f) / PI); if (k1 > k0) ev(f, 'pedal', { foot: k1 & 1 ? 'L' : 'R', where: tag, gain: gainOf(f) }); } };
  strokes(46, 648, f => heroRoad(f).crank, 'road', f => f < 168 ? .35 + .3 * ss(60, 168, f) : (subAt(f).k.match(/3[bd]/) ? .55 : 1));
  strokes(648, T.climbStop, f => heroHill(f).crank, 'climb', () => .45);
  strokes(1248, 1420, f => heroSun(f).crank, 'coast', () => .4);
  ev(T.sigh.peak, 'sigh', { dur: T.sigh.b - T.sigh.peak }); ev(T.eyeRoll[0] + 14, 'sigh', { dur: 22, soft: true }); ev(T.sitB - 2, 'sigh', { dur: 26, soft: true });
  ev(T.flinch, 'flinch'); ev(T.defeated + 8, 'sigh', { dur: 30, soft: true, slump: true }); ev(716, 'footstep', { gain: .6 }); ev(722, 'lean');
  for (const L of T.launches) ev(L.land - 12, 'fall', { who: L.who, dur: 12 }); ev(1196, 'rustle'); ev(1208, 'rustle', { soft: true });
  for (const L of T.launches) { ev(L.launch, 'launch', { who: L.who }); ev(L.pop, 'banner_pop', { who: L.who }); ev(L.land, 'land', { who: L.who, name: BN[L.who] }); }
  // square-wheel clunks on the road
  for (let f = T.launches[0].land + 4; f < DISSOLVE[1]; f += 4) { const a = benchRoad(0, f - 4), b = benchRoad(0, f); const k0 = sqK(a.rollX), k1 = sqK(b.rollX); if (k1 !== k0 && (k1 % 2 === 0 || k1 - k0 > 1)) ev(f, 'clunk', { who: 0, gain: f < 360 ? 1 : .8 }); }
  // … and on the hill (only while upright and moving)
  for (let f = 652; f < T.touch1; f += 4) { const a = swHill(f - 4), b = swHill(f); if (a.tip > 0 || b.tip > 0) continue; const k0 = sqK(a.x), k1 = sqK(b.x); if (k1 !== k0) ev(f, 'clunk', { who: 0, gain: f < 720 ? .35 : f < 864 ? .5 : .6 }); }
  for (const f of T.swTip) ev(f, 'tip', { who: 0 }); for (const f of T.swUp) ev(f, 'getup', { who: 0 });
  // toy chirps of the broken parade
  for (let i = 0; i < 4; i++) { let f = T.launches[i].land + 12 + i * 4; while (f < 644) { ev(f, 'chirp', { who: i }); f += 8 * (3 + ((hash2(f, i) * 3) | 0)); } }
  [662, 690, 706].forEach((f, j) => ev(f, 'chirp', { who: j + 1, gain: .35 }));
  ev(1204, 'chirp', { who: 0, astonished: true });
  for (let i = 0; i < 4; i++) for (let f = 1264 + i * 16; f < 1390; f += 64) ev(f, 'chirp', { who: i, gain: .5 });
  ev(T.climbStop, 'brake'); ev(T.sitB - 6, 'sit');
  for (const f of T.steps) ev(f, 'footstep');
  ev(T.glint[0], 'glint', { dur: T.glint[1] - T.glint[0] });
  ev(T.hold4[0], 'hold', { until: T.hold4[1], name: 'ALONE' }); ev(T.hold5[0], 'hold', { until: T.hold5[1], name: 'NOTICING>TENDER' });
  ev(T.touch1, 'touch', { wheel: 1 }); ev(T.bloom1[0], 'bloom', { dur: T.bloom1[1] - T.bloom1[0], wheel: 1 });
  ev(T.tender[0], 'tender', { dur: T.tender[1] - T.tender[0] }); ev(T.bloom2[0], 'bloom', { dur: T.bloom2[1] - T.bloom2[0], wheel: 2 });
  ev(T.roll[0], 'roll_smooth', { who: 0 });
  for (const f of T.bells) ev(f, 'bell');
  ev(T.peak, 'peak'); ev(T.text[0], 'text', { dur: T.text[1] - T.text[0] });
  for (const [g, s] of GUSTS) ev(g, 'gust', { strength: s });
  ev(630, 'tram_bell', { gain: .25 }); ev(1284, 'tram_bell', { gain: .3 });
  E.sort((a, b) => a.f - b.f || (a.type < b.type ? -1 : 1)); return E; }
function buildTracks() { const sp = [], wd = [], em = [], amb = [], hum = [], scrape = [];
  for (let f = 0; f < NF; f++) { const s = subAt(f); let v = 0;
    if (s.set === 'road') v = heroRoad(f).speed * (f < 46 ? 0 : f < 168 ? .3 + .4 * ss(46, 168, f) : s.k.match(/3[bdf]/) ? .6 : 1);
    else if (s.k === '4a') v = heroHill(f).speed * .5; else if (s.set === 'sun') v = SUNV * .5 * (1 - ss(1400, 1440, f));
    sp.push(+v.toFixed(2)); wd.push(+windAt(f).toFixed(3)); em.push(+emotionAt(f).toFixed(3)); amb.push(s.set);
    hum.push(f >= T.roll[0] ? (f < 1248 ? (f < T.roll[1] ? .7 : 0) : .4 * (1 - ss(1400, 1440, f))) : 0);
    scrape.push(f >= T.launches[1].land && f < 648 ? (s.k.match(/3[abde]/) ? .6 : .35) : s.set === 'sun' ? .2 * (1 - ss(1400, 1440, f)) : 0); }
  return { heroSpeed: sp, wind: wd, emotion: em, ambience: amb, swHum: hum, scrape }; }
