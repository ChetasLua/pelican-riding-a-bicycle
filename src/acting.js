// ───────────────────────── acting: the expression sheet, blinks, breath, and pose builders for every beat ─────────────────────────
const EXPR = {
  WEARY: { lidU: .55, lidL: .1, px: .1, py: .45, ps: .9, hl: 1, brow: -.6, gape: 0, smile: -.25, pouch: .75, tilt: 6, neckC: .35, crest: -.3, br: .3, bd: 1 },
  DEFEATED: { lidU: .8, lidL: .15, px: .1, py: .6, ps: .9, hl: .8, brow: -.8, gape: 0, smile: -.4, pouch: .9, tilt: 10, neckC: .5, crest: -.6, br: .25, bd: .8 },
  ALONE: { lidU: .42, lidL: .05, px: .55, py: -.05, ps: 1.1, hl: .6, brow: -.35, gape: 0, smile: -.15, pouch: .5, tilt: 2, neckC: .25, crest: 0, br: .22, bd: .6 },
  NOTICING: { lidU: .2, lidL: 0, px: .9, py: .3, ps: 1.32, hl: 1, brow: .7, gape: .04, smile: 0, pouch: .45, tilt: -10, neckC: -.1, crest: .5, br: .22, bd: 0 },
  TENDER: { lidU: .3, lidL: .45, px: .8, py: .3, ps: 1.15, hl: 1, brow: .25, gape: 0, smile: .9, pouch: .4, tilt: -4, neckC: 0, crest: .15, br: .25, bd: .8 },
  PROUD: { lidU: .5, lidL: .3, px: .3, py: 0, ps: 1, hl: 1, brow: .1, gape: 0, smile: .6, pouch: .5, tilt: -3, neckC: .05, crest: .2, br: .25, bd: .7 } };
const ETL = { road: [[0, 'WEARY'], [562, 'WEARY'], [586, 'DEFEATED'], [700, 'DEFEATED']], hill: [[640, 'WEARY'], [730, 'WEARY'], [752, 'ALONE'], [954, 'ALONE'], [962, 'NOTICING'], [990, 'NOTICING'], [1040, 'TENDER'], [1260, 'TENDER']], sun: [[1240, 'PROUD'], [1440, 'PROUD']] };
const BLINKS = { road: [84, 150, 196, 352, 398, 478, 556, 630], hill: [690, 742, 800, 896, 908, 926, 1058, 1100, 1196, 1216], sun: [1262, 1330, 1392] };
function exprBase(track, f) { const K = ETL[track]; let i = 1; while (i < K.length - 1 && K[i][0] < f) i++; const a = K[i - 1], b = K[i], t = smoother(unlerp(a[0], b[0], f)), A = EXPR[a[1]], B = EXPR[b[1]], o = {}; for (const k in A) o[k] = lerp(A[k], B[k], t); return o; }
const BREATH = {}; (function () { for (const tr in ETL) { const a = new Float32Array(NF + 8); let ph = 0; for (let f = 0; f < NF + 8; f++) { const e = exprBase(tr, f); ph += TAU * e.br / FPS; a[f] = Math.sin(ph) * e.bd; } BREATH[tr] = a; } })();
const plateau = (f, a, b, c, d) => f <= a || f >= d ? 0 : f < b ? smoother((f - a) / (b - a)) : f <= c ? 1 : 1 - smoother((f - c) / (d - c));
// full acting state at (track, frame): expression + overlays (sigh, flinch, glances, eye-roll, looks) + blinks
function act(track, f) { const E = exprBase(track, f), X = { sink: 0, headDy: 0, headRot: 0, drop: 0, jolt: 0, breath: BREATH[track][clamp(f, 0, NF)] }; const mixTo = (o, g) => { for (const k in o) E[k] = lerp(E[k], o[k], g); };
  if (track === 'road') {
    const S = T.sigh, inh = ss(S.a, S.peak, f) * (1 - ss(S.peak, S.peak + 10, f)), exh = bump(f, S.peak, S.peak + 14, S.b + 8); E.neckC -= .22 * inh; X.sink += 8 * exh - 3 * inh; X.headDy += 12 * exh - 5 * inh; E.pouch = lerp(E.pouch, .28, exh); E.gape += .2 * bump(f, S.peak - 2, S.peak + 6, S.b); E.lidU = lerp(E.lidU, .82, bump(f, S.peak, S.peak + 10, S.b));
    { const jb = bump(f, T.flinch - 1, T.flinch + 1, T.flinch + 12); X.jolt = jb; X.sink -= 13 * jb; X.headRot -= .22 * jb; }
    if (f >= T.flinch && f < T.flinch + 2) mixTo({ lidU: .2, lidL: 0, ps: .62, brow: 1, crest: 1.6, neckC: 1.25, gape: .12 }, 1); else if (f >= T.flinch + 2) { const d = 1 - ss(T.flinch + 2, T.flinch + 18, f); E.crest += 1.5 * d; E.neckC += .8 * d + .13 * (f < 360 ? 1 : 0); E.lidU = lerp(E.lidU, .3, d); E.ps = lerp(E.ps, .7, d); E.brow -= .2 * (f < 360 ? 1 : 0); X.headDy += f < 360 ? 5 : 0; }
    mixTo({ px: -.95, py: .15, lidU: .5 }, plateau(f, T.glanceBack[0], T.glanceBack[0] + 6, T.glanceBack[1] - 6, T.glanceBack[1]));
    mixTo({ px: -.95, py: .1, lidU: .5, brow: -.85 }, plateau(f, T.sideGlance[0], T.sideGlance[0] + 5, T.sideGlance[1] - 6, T.sideGlance[1]));
    { const a = T.eyeRoll[0], b = T.eyeRoll[1], g = plateau(f, a, a + 4, b - 12, b), th = PI * smoother(unlerp(a, b - 10, f)); mixTo({ px: Math.cos(th) * .92, py: -Math.sin(th) * .95 + .08, lidU: .5 - .26 * Math.sin(th), brow: -.3 + .5 * Math.sin(th) }, g); X.headRot -= .1 * Math.sin(th) * g; E.gape += .14 * bump(f, a + 12, a + 22, b + 6); X.sink += 5 * bump(f, a + 12, a + 26, b + 10); }
    X.drop = smoother(unlerp(T.defeated, T.defeated + 22, f));
  } else if (track === 'hill') {
    mixTo({ px: .8, py: .85, lidU: .5 }, plateau(f, T.lookPlate[0], T.lookPlate[0] + 6, T.lookDown[0], T.lookDown[0] + 4));
    { const g = plateau(f, T.lookDown[0] + 2, T.lookDown[1], 953, 962); mixTo({ px: .95, py: .42 }, g); X.headRot += .1 * g; }
    if (f >= 1056) { mixTo({ px: .75, py: .5 }, plateau(f, 1056, 1060, T.bend[0], T.bend[0] + 8)); mixTo({ px: .55, py: .9, lidU: .42, smile: .6 }, plateau(f, T.bend[0], T.bend[1], 1188, 1204)); }
  } else { const g = plateau(f, 1308, 1314, 1324, 1332); mixTo({ px: .55, py: -.55, brow: .3, lidU: .4 }, g); E.smile += .25 * ss(1326, 1344, f); }
  for (const b of BLINKS[track]) { const d = f - b; if (d >= 0 && d < 8) { const a = d < 3 ? (d + 1) / 3 : d < 4 ? 1 : 1 - (d - 3) / 4; E.lidU = lerp(E.lidU, 1, a); E.lidL = lerp(E.lidL, .25, a); } }
  return { E, X }; }
const rad = d => d * PI / 180;
const bobRoad = g => -Math.cos(2 * HCR[clamp(g, 0, 699) | 0]) * 3;
// ── pose builders. Each returns { x, y, rot, face, P, bike?, ride? } in the set's main plane.
function poseRoad(f) { const f2 = 2 * (f >> 1), st = heroRoad(f), A = act('road', f2), E = A.E, X = A.X, bob = bobRoad(f2), lag = bobRoad(f2 - 4) - bob, lag2 = bobRoad(f2 - 8) - bob, nc = E.neckC, d = X.drop;
  const hip = [-30, -172 + bob + X.sink + X.breath * -1.2]; let head = [64 + 12 * nc, -372 + 46 * nc + X.headDy + bob * .6]; head = [lerp(head[0], 116, d), lerp(head[1], -246, d)];
  const P = { hip, bodyRot: -.06 + .02 * nc + .1 * d, head, headRot: rad(E.tilt) + d * .38 + X.headRot, beakAng: .24 + .14 * nc + d * .55, feet: [pedalPos(st.crank, true), pedalPos(st.crank, false)], hand: BG.grip, expr: E, breath: X.breath, lag, lag2, wind: windAtX(f, st.x + 3200), f, f2, bike: { crank: st.crank, wheelRot: st.x / BK.R, spin: st.speed / BK.R } };
  if (X.jolt) { P.hand = [BG.grip[0] - 3 * X.jolt, BG.grip[1] - 2 * X.jolt]; P.bodyRot -= .1 * X.jolt; P.head[0] -= 16 * X.jolt; } if (d > 0) { P.head[1] += d * 3 * Math.sin(st.crank * 2); P.headRot += d * .04 * Math.sin(st.crank * 2 + 1); }
  const y = roadY(st.x) + 14; return { x: st.x, y, rot: Math.atan(slopeOf(roadY, st.x)) + .035 * Math.sin(f * 2.2) * X.jolt, face: 1, P, ride: true }; }
function poseClimb(f) { const f2 = 2 * (f >> 1), st = heroHill(f), A = act('hill', f2), E = A.E, X = A.X, cr = st.crank, up = 1 - ss(T.climbStop, T.climbStop + 8, f), sw = Math.sin(cr), bob = -Math.cos(2 * cr) * 5 * up;
  const hip = [lerp(-30, -14 + 8 * sw, up), lerp(-172, -203 + bob, up)], head = [lerp(64, 88 + 5 * sw, up) + 10 * E.neckC, lerp(-372, -384 + bob * .6, up) + 40 * E.neckC];
  const P = { hip, bodyRot: lerp(-.06, .12 + .05 * sw, up), head, headRot: rad(E.tilt) + .1 * up, beakAng: .3 + .1 * up, feet: [pedalPos(cr, true), up < .5 ? [-6, -6, 0] : pedalPos(cr, false)], hand: BG.grip, expr: E, breath: X.breath, lag: bob * .5, lag2: bob, wind: windAtX(f, st.x), f, f2, bike: { crank: cr, wheelRot: st.x / BK.R, spin: st.speed / BK.R } };
  return { x: st.x, y: hillY(st.x), rot: Math.atan(slopeOf(hillY, st.x)) + .045 * sw * up, face: 1, P, ride: true }; }
function poseSit(f) { const f2 = 2 * (f >> 1), A = act('hill', f2), E = A.E, X = A.X, s = smoother(unlerp(T.sitA - 4, T.sitB - 2, f)), settle = 4 * bump(f, T.sitB - 4, T.sitB + 2, T.sitB + 12), nc = E.neckC;
  const hold = ss(756, 864, f) * (f < 954 ? 1 : 1 - ss(954, 964, f)), tipLook = bump(f, 786, 794, 812) + bump(f, 846, 854, 872), wv = windAtX(f, 3120);
  E.px = lerp(E.px, .92, tipLook * .7); E.py = lerp(E.py, .4, tipLook * .7); E.neckC += .12 * hold;
  const hip = [-4, lerp(-136, -101, s) + settle - X.breath * 2.6], head = [hip[0] + 58 + nc * 8 + wv * 3 + Math.sin(f2 * .045) * 2, hip[1] - 198 + nc * 42 + settle * 1.5 + (1 - s) * 16 + hold * 8 + X.breath * 1.2];
  const sw1 = Math.sin(f2 * .07) * 3 * (1 - .6 * hold), P = { hip, bodyRot: lerp(.24, -.03, s) + .012 * X.breath, head, headRot: rad(E.tilt) + X.headRot + .12 * (1 - s) + .05 * hold + .05 * tipLook, beakAng: .26 + .12 * nc + .06 * hold, feet: [[lerp(40, 88 + sw1, s), lerp(-2, -40, s), .5 * s], [lerp(56, 100 - sw1, s), lerp(-2, -46, s), .45 * s]], l1: 84, l2: 60, hand: null, expr: E, breath: X.breath, lag: -settle * .6, lag2: -settle * 1.5, wind: windAtX(f, 3120), f, f2 };
  return { x: 3120, y: 0, rot: 0, face: -1, P }; }
const HR_BIKE_OFF = -22;
function poseWalk(f) { const f2 = 2 * (f >> 1), A = act('hill', f2), E = A.E, X = A.X, hx = g => heroHill(g).x, x = hx(f), g = smoother(unlerp(T.bend[0], T.bend[1] - 2, f2)) * (1 - smoother(unlerp(1188, 1206, f2)));
  const feet = [0, 1].map(i => { const lands = T.steps.filter((_, k) => (k & 1) === i); let prev = null, next = null; for (const Lf of lands) { if (Lf <= f2) prev = Lf; else if (next === null) next = Lf; }
    const planted = prev === null ? hx(1056) - (i ? -14 : 10) : hx(prev) - 26, loc = x - planted; if (next !== null && f2 >= next - 10) { const u = (f2 - (next - 10)) / 10, from = hx(next - 10) - planted - (hx(next - 10) - x) * 0; return [lerp(x - planted, 26, smooth(u)), -Math.sin(u * PI) * 17, .5 * Math.sin(u * PI) - .25 * u]; } return [loc, 0, 0]; });
  const stepPh = Math.min(...T.steps.map(s => Math.abs(f2 - s))), bob = f < T.walk[1] + 4 ? 2.5 - Math.min(stepPh, 6) * .8 : 0, nc = E.neckC;
  const post = ss(1204, 1214, f2), hip = [10 * g, -124 + bob + 10 * g - X.breath * 1.6], bodyRot = .04 + .2 * g + .02 * Math.sin(f2 * .5) * g; let head = [hip[0] + 58 + nc * 8, hip[1] - 196 + nc * 40], hr = rad(E.tilt), beakAng = .26;
  if (g > 0) { // reach: solve the head so the beak tip rests on the wheel and traces its new curve
    const sw = swHill(1150), sx = sw.x, sy = hillY(sx), u = unlerp(T.bloom1[0], T.bloom1[1], f), stroke = Math.sin(clamp(u, 0, 1.25) * PI * 3.5) * (f2 < 1186 ? 1 : 0), tipW = [sx + 118 - 14 * smooth(u) - 17 * stroke, sy - 99 + 8 * smooth(u) + 9 * Math.abs(stroke)], tip = [x - tipW[0], tipW[1] - hillY(x)], be = .8 + .06 * stroke, hr2 = .14, rt = HR_rot([17, 3], hr2), rh = [tip[0] - rt[0] - Math.cos(be) * 135, tip[1] - rt[1] - Math.sin(be) * 135];
    head = [lerp(head[0], rh[0], g), lerp(head[1], rh[1], g)]; hr = lerp(hr, hr2, g); beakAng = lerp(beakAng, be, g); }
  const ringK = (f - T.bells[0]) / 22, bell = [HR_BIKE_OFF + BG.bell[0] - 5, BG.bell[1] + 9], grip = [HR_BIKE_OFF + BG.grip[0], BG.grip[1]], hb = plateau(f, T.bells[0] - 8, T.bells[0] - 1, T.bells[0] + 3, T.bells[0] + 14);
  if (post > 0 && g <= 0) { E.px = lerp(E.px, .9, post); E.py = lerp(E.py, .55, post); E.smile = lerp(E.smile, 1.05, post); E.lidL = lerp(E.lidL, .55, post); hr += .1 * post + .03 * Math.sin(f2 * .2); head[0] += 6 * post; head[1] += 5 * post; }
  const P = { hip, bodyRot, head, headRot: hr, beakAng, feet, hand: [lerp(grip[0], bell[0], hb) + 8 * g, lerp(grip[1], bell[1], hb) + 6 * g], expr: E, breath: X.breath, lag: -bob * .5, lag2: -bob, wind: windAtX(f, x), f, f2 };
  return { x, y: hillY(x), rot: Math.atan(slopeOf(hillY, x)), face: -1, P, bikeOff: HR_BIKE_OFF, bike: { crank: 1.9, wheelRot: -x / BK.R, spin: 0, flip: true, ring: ringK > 0 && ringK < 1 ? ringK : 0 } }; }
function poseSun(f) { const f2 = 2 * (f >> 1), st = heroSun(f), A = act('sun', f2), E = A.E, X = A.X, bob = -Math.cos(2 * st.crank) * 1.6, nc = E.neckC;
  const hb = Math.max(plateau(f, T.bells[1] - 8, T.bells[1] - 1, T.bells[2] + 3, T.bells[2] + 14)), k1 = (f - T.bells[1]) / 8, k2 = (f - T.bells[2]) / 22, ring = k2 > 0 ? (k2 < 1 ? k2 : 0) : (k1 > 0 && k1 < 1 ? k1 * .4 : 0);
  const P = { hip: [-30, -172 + bob - X.breath * 1.2], bodyRot: -.1, head: [60 + 12 * nc, -378 + 46 * nc + bob * .6], headRot: rad(E.tilt) - .1, beakAng: .14, feet: [pedalPos(st.crank, true), pedalPos(st.crank, false)], hand: [lerp(BG.grip[0], BG.bell[0] - 6, hb), lerp(BG.grip[1], BG.bell[1] + 8, hb)], expr: E, breath: X.breath, lag: 0, lag2: bob, wind: windAtX(f, st.x) + .25, f, f2, bike: { crank: st.crank, wheelRot: st.x / BK.R, spin: SUNV / BK.R, ring } };
  return { x: st.x, y: sunY(st.x), rot: Math.atan(slopeOf(sunY, st.x)), face: 1, P, ride: true }; }
