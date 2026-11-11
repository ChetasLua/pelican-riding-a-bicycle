// ───────────────────────── cameras: one eased camera per sub-shot. cam = {x, y, z, tilt} (see paint.js for the mapping) ─────────────────────────
function camAt(f, sub) { const s = sub || subAt(f), k = s.k, K = (a, b, e) => kf(f, [[s.a, a], [s.b, b]], e || 'io');
  switch (k) {
    case '1': { const z = K(.42, .6); return { x: K(2600, 2375), y: -260 / z, z, tilt: kf(f, [[0, 640], [104, 0]]) }; }
    case '2': { const h = heroRoad(f).x; return { x: h + kf(f, [[168, 270], [276, 270], [332, -190]]), y: -262, z: K(1, 1.05, 'lin'), tilt: 0 }; }
    case '3a': return { x: heroRoad(f).x - 290, y: -312, z: K(.8, .84, 'lin'), tilt: 0 };
    case '3b': return { x: heroRoad(f).x - 560, y: -236, z: K(.72, .75, 'lin'), tilt: 0 };
    case '3c': return { x: heroRoad(f).x + 40, y: -285, z: K(1.12, 1.17, 'lin'), tilt: 0 };
    case '3d': return { x: heroRoad(f).x - 690, y: -238, z: K(.7, .73, 'lin'), tilt: 0 };
    case '3e': return { x: heroRoad(f).x - 420, y: -330, z: K(.75, .78, 'lin'), tilt: 0 };
    case '3f': return { x: kf(f, [[612, 4440], [660, 4480]], 'lin'), y: -262, z: 1, tilt: 0 };
    case '4a': return { x: K(2350, 2450), y: K(-320, -300), z: K(.5, .56), tilt: 0 };
    case '4b': return { x: K(2700, 2780), y: K(-236, -228), z: K(.98, 1.1), tilt: 0 };
    case '5a': return { x: kf(f, [[864, 2905], [900, 2900], [932, 2890]]), y: kf(f, [[864, -188], [900, -192], [932, -213]]), z: kf(f, [[864, 2.6], [900, 2.75], [932, 6.4]]), tilt: 0 };
    case '5b': return { x: 2040, y: -150, z: K(1.1, 1.14, 'lin'), tilt: 0 };
    case '5c': return { x: K(2985, 3045), y: K(-248, -292), z: K(2.6, 3.7), tilt: 0 };
    case '6': return { x: K(2335, 2300), y: K(-205, -215), z: K(1.12, 1.25), tilt: 0 };
    default: { const x = K(1750, 3250); return { x, y: sunY(x) + K(-300, -560), z: K(.52, .45), tilt: 0 }; } } }
