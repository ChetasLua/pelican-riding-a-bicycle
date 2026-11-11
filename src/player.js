// ───────────────────────── player: bake, play button, audio-clock-driven playback, seeking ─────────────────────────
(function () { if (typeof document === 'undefined') return; const cv = document.getElementById('film'), ctx = cv.getContext('2d'), ui = document.getElementById('play'), ux = ui.getContext('2d'), bar = document.querySelector('#bar i');
  let ready = false, playing = false, ac = null, buf = null, src = null, t0 = 0, off = 0, last = -1, audio = null;
  // the play button is drawn, not typed
  function drawUI(p, label) { ux.clearRect(0, 0, 360, 360); ux.save(); ux.translate(180, 180); ux.lineCap = 'round'; ux.lineJoin = 'round'; ux.fillStyle = 'rgba(246,238,216,.94)'; ux.beginPath(); ux.arc(0, 0, 120, 0, TAU); ux.fill();
    ux.strokeStyle = '#c8402f'; ux.lineWidth = 10; ux.beginPath(); ux.arc(0, 0, 134, -PI / 2, -PI / 2 + TAU * clamp(p)); ux.stroke();
    if (label === 'play') { ribbon(ux, chaikin([[-34, -58], [62, 0], [-34, 58], [-34, -58], [62, 0]], 1), 13, 13, '#4a3226', 3, 2); ux.fillStyle = '#c8402f'; ux.beginPath(); ux.moveTo(-30, -50); ux.lineTo(54, 0); ux.lineTo(-30, 50); ux.closePath(); ux.fill(); }
    else { for (let i = 0; i < 3; i++) { ux.fillStyle = i / 3 < p ? '#c8402f' : '#cdbfa0'; ux.beginPath(); ux.arc(-44 + i * 44, 0, 12, 0, TAU); ux.fill(); } } ux.restore(); }
  window.__renderFrame = f => { drawFrame(ctx, f); return true; };
  window.__exportAudio = () => audio;
  const steps = 26; let n = 0; drawUI(0, 'load');
  function boot() { const it = (function* () { buildFX(); FX.dis = mk(W, H); yield; for (const k of ['road', 'hill', 'sun']) if (SETS[k]) { const q = []; SETS[k].bake(() => q.push(1)); SETS[k].hookId = 'main'; n += 8; yield; }
      EVENTS = buildEvents(); if (typeof renderAudio === 'function') audio = renderAudio(EVENTS, buildTracks(), 48000); n = steps; yield; })();
    (function tick() { const r = it.next(); drawUI(n / steps, 'load'); if (!r.done) setTimeout(tick, 30); else { ready = true; window.__READY = true; drawFrame(ctx, +(new URLSearchParams(location.search).get('f') || 0)); drawUI(1, 'play'); } })(); }
  setTimeout(boot, 60);
  function start(from) { if (!ready) return; if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 }); if (audio) { buf = ac.createBuffer(2, audio.L.length, audio.sr); buf.copyToChannel(audio.L, 0); buf.copyToChannel(audio.R, 1); } }
    ac.resume(); stop(); off = from; if (buf) { src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.start(0, off); } t0 = ac.currentTime; playing = true; ui.style.display = 'none'; requestAnimationFrame(loop); }
  function stop() { if (src) { try { src.stop(); } catch (e) { } src = null; } playing = false; }
  function loop() { if (!playing) return; const t = off + ac.currentTime - t0, f = Math.floor(t * FPS); if (f >= NF) { stop(); drawFrame(ctx, NF - 1); bar.style.width = '100%'; drawUI(1, 'play'); ui.style.display = 'block'; return; }
    if (f !== last) { drawFrame(ctx, f); last = f; bar.style.width = (f / NF * 100) + '%'; } requestAnimationFrame(loop); }
  ui.addEventListener('click', () => start(0)); cv.addEventListener('click', () => { if (!ready) return; if (playing) { off += ac.currentTime - t0; stop(); ui.style.display = 'block'; drawUI(off / 60, 'play'); } else start(off >= 59.9 ? 0 : off); });
  document.getElementById('bar').parentNode.addEventListener('keydown', () => { });
  window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); cv.click(); } else if (e.key === 'r' || e.key === 'R') start(0); else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const d = e.key === 'ArrowRight' ? 1 : -1; if (playing) start(clamp(off + ac.currentTime - t0 + d * 2, 0, 59.9)); else { off = clamp(off + d / FPS, 0, 59.95); drawFrame(ctx, Math.round(off * FPS)); bar.style.width = (off / 60 * 100) + '%'; } } });
})();
