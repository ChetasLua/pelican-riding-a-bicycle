# Sync report — the listener, round 1

Measured by `node tools/listen.js` on `renderAudio(buildEvents(), buildTracks(), 48000)` → `out/film.wav` (2880000 samples, 60.000 s, 16-bit stereo 48 kHz). Spectrogram: `out/listen_mel.png` (2 px per picture frame).

**Overall: PASS** — 8 of 8 checks pass.

## Global measurements

| | |
|---|---|
| Integrated loudness (BS.1770, gated) | -16.05 LUFS |
| True peak (4× oversampled) | -1.46 dBTP at frame 1344.0 |
| Sample peak | -1.60 dBFS at frame 1224.2 |
| Clipped samples | 0 (16-bit overs: 0) |
| Short-term loudness range | -36.5 … -9.5 LUFS (max at frame 1284, min at frame 948) |
| Loudness vs emotion | r = 0.902 (emotion averaged over the meter's 3 s window; r = 0.902 against the un-averaged curve) |
| Onsets detected in the full mix | 133 full-band, 114 above 2.5 kHz |
| Onset detector timing (synthetic bursts) | bias -0.159 fr full / -0.148 fr high band (removed), spread 0.017 / 0.020 fr |
| Event log | 210 events, 153 transient cues; cues.json matches buildEvents() (210 events, same frame:type multiset) |

## Checks

| | check | result | measured |
|---|---|---|---|
| a | every transient cue onset within ±1 frame (isolated render) | **PASS** | 153/153 cues pass; worst +0.058 fr (chirp @1204) |
| b | barlines on cuts, notes on the 8-frame beat grid | **PASS** | 106/125 music onsets (85 %) within ±1 fr of a beat (need ≥ 70 %); cuts 168 ✓, 360 ✓, 648 (tacet), 1056 ✓, 1248 ✓ |
| c | short-term loudness follows the emotion curve | **PASS** | Pearson r = 0.902 (need ≥ 0.75) |
| d | shot 4 quietest, shot 7 (1248-1400) loudest | **PASS** | quietest = shot 4 (-33.2 LUFS), loudest = shot 7 (-10.9 LUFS) |
| e | bells unmasked: 1.5-6 kHz +6 dB, 150 ms after vs before | **PASS** | @1224 +21.0 dB, @1336 +16.5 dB, @1344 +17.0 dB |
| f | no clipping, true peak ≤ −1 dBFS | **PASS** | true peak -1.46 dBTP @ f1344.0, sample peak -1.60 dBFS, clipped samples 0 |
| g | integrated loudness −16 ±1 LUFS | **PASS** | -16.05 LUFS (gated; relative gate -27.4 LUFS, 439/597 blocks) |
| h | tail: below −50 dBFS by frame 1436, last sample silent | **PASS** | peak over frames 1436-1440 -52.5 dBFS (RMS -69.6), stays under −50 dBFS from frame 1436, last sample 0 |

### (a) transient cues by type

Onset = first sample reaching 10 % of the cue's own peak, in a dry isolated render of that single event. "Heard in mix" = a spectral-flux onset (either band) of the full mix within ±1.5 frames of the cue.

| type | n | worst error (fr) | mean error (fr) | heard in mix | median mix error (fr) | result |
|---|---|---|---|---|---|---|
| pedal | 31 | +0.005 | +0.003 | 31/31 | +0.02 | PASS |
| clunk | 55 | +0.005 | +0.004 | 43/55 | +0.04 | PASS |
| land | 5 | +0.006 | +0.005 | 5/5 | +0.04 | PASS |
| banner_pop | 5 | +0.005 | +0.004 | 5/5 | +0.04 | PASS |
| launch | 5 | +0.040 | +0.027 | 3/5 | +0.09 | PASS |
| footstep | 5 | +0.005 | +0.003 | 5/5 | +0.03 | PASS |
| bell | 3 | +0.004 | +0.003 | 3/3 | -0.02 | PASS |
| tip | 2 | +0.005 | +0.005 | 0/2 | — | PASS |
| getup | 2 | +0.004 | +0.004 | 0/2 | — | PASS |
| touch | 1 | +0.003 | +0.003 | 1/1 | +0.01 | PASS |
| chirp | 37 | +0.058 | +0.039 | 14/37 | +0.05 | PASS |
| brake | 1 | +0.003 | +0.003 | 1/1 | +0.01 | PASS |
| sit | 1 | +0.005 | +0.005 | 1/1 | +0.03 | PASS |

### (b) beat grid and cuts

Tempo: bar = 24 frames, beat = 8 frames (180 bpm, 3/4). Music-stem onsets detected: 125; 106 (85 %) lie within ±1 frame of a beat, 40 on a barline. A uniformly random onset would hit that window 25 % of the time. Written score: 326 struck/blown notes, 91 % exactly on the beat grid.

Deviation of music onsets from the nearest beat (frames → count): -4: 7, -3: 1, -2: 5, -1: 1, +0: 104, +1: 1, +2: 4, +3: 1, +4: 1

| cut | on a barline | music before / after (LUFS, 0.5 s) | music playing | downbeat onset (music stem) | error (fr) | onset in full mix | result |
|---|---|---|---|---|---|---|---|
| 168 | yes (bar 7) | -25.8 / -22.0 | yes | 168.77 | +0.77 | 168.02 | PASS |
| 360 | yes (bar 15) | -23.8 / -19.4 | yes | 360.13 | +0.13 | not separable | PASS |
| 648 | yes (bar 27) | -29.5 / -34.5 | no — nothing is struck here (next note at 960) | — | — | 648.04 | n/a |
| 1056 | yes (bar 44) | -24.2 / -21.2 | yes | 1056.20 | +0.20 | not separable | PASS |
| 1248 | yes (bar 52) | -18.0 / -4.8 | yes | 1248.04 | +0.04 | 1248.06 | PASS |

### (e) bells

The last two columns split the "before" window into the bell's own earlier ring (bell stem alone) and everything else (mix minus bell stem; approximate, the limiter is not linear).

| bell frame | 1.5–6 kHz, 150 ms before (dB) | 150 ms after (dB) | rise (dB) | result | earlier bell ring in the before-window (dB) | bed without bells, before / after (dB) |
|---|---|---|---|---|---|---|
| 1224 | -37.7 | -16.7 | +21.0 | PASS | none | -37.7 / -42.6 |
| 1336 | -34.0 | -17.5 | +16.5 | PASS | none | -34.0 / -41.5 |
| 1344 | -32.6 | -15.6 | +17.0 | PASS | -31.9 | -42.1 / -40.7 |

## Per-shot loudness

| shot | frames | K-weighted LUFS | RMS dBFS | short-term min … max (LUFS) | music stem (LUFS) | mean emotion |
|---|---|---|---|---|---|---|
| 1 | 0–168 | -20.8 | -23.1 | -21.4 … -20.0 | -21.8 | 0.27 |
| 2 | 168–360 | -19.8 | -22.0 | -20.7 … -17.5 | -22.4 | 0.37 |
| 3 | 360–648 | -17.0 | -19.2 | -23.0 … -15.6 | -19.3 | 0.54 |
| 4 | 648–864 | -33.2 | -36.1 | -36.2 … -23.1 | -45.8 | 0.13 |
| 5 | 864–1056 | -28.2 | -30.6 | -36.5 … -22.5 | -29.2 | 0.22 |
| 6 | 1056–1248 | -16.6 | -19.4 | -22.4 … -10.4 | -18.4 | 0.66 |
| 7 | 1248–1440 | -11.9 | -14.4 | -25.0 … -9.5 | -11.7 | 0.70 |
| 7* | 1248–1400 | -10.9 | -13.4 | | | |

Quietest: shot 4. Loudest: shot 7 (shot 7 judged on 1248–1400, before the fade).

## Every cue

All 210 events of the log. Transient cues are judged (±1 frame); soft cues (sigh, glint, bloom, gust …) are measured for information only — a gust is built to swell in before its frame; marks (cut, hold, peak …) make no sound of their own. Onset and error are in picture frames (1 frame = 41.67 ms).

| frame | time (s) | type | detail | measured onset (frame) | error (fr) | onset in full mix | result |
|---|---|---|---|---|---|---|---|
| 0 | 0.000 | cut | sub=1 shot=1 major=true | — | — | — | — |
| 30 | 1.250 | gust | strength=0.6 | 26.000 | -4.000 | — | info |
| 48 | 2.000 | pedal | foot=R where=road gain=0.35 | 48.005 | +0.005 | 48.03 | PASS |
| 72 | 3.000 | pedal | foot=L where=road gain=0.36 | 72.002 | +0.002 | 72.00 | PASS |
| 96 | 4.000 | pedal | foot=R where=road gain=0.43 | 96.003 | +0.003 | 96.00 | PASS |
| 118 | 4.917 | gust | strength=0.5 | 114.000 | -4.000 | — | info |
| 120 | 5.000 | pedal | foot=L where=road gain=0.52 | 120.002 | +0.002 | 120.02 | PASS |
| 144 | 6.000 | pedal | foot=R where=road gain=0.61 | 144.004 | +0.004 | 144.00 | PASS |
| 168 | 7.000 | cut | sub=2 shot=2 major=true | — | — | — | — |
| 168 | 7.000 | pedal | foot=L where=road gain=1 | 168.002 | +0.002 | 168.00 | PASS |
| 192 | 8.000 | pedal | foot=R where=road gain=1 | 192.002 | +0.002 | 192.03 | PASS |
| 205 | 8.542 | gust | strength=0.45 | 201.001 | -3.999 | — | info |
| 216 | 9.000 | pedal | foot=L where=road gain=1 | 216.002 | +0.002 | 216.01 | PASS |
| 228 | 9.500 | sigh | dur=30 | 228.375 | +0.375 | — | info |
| 244 | 10.167 | pedal | foot=R where=road gain=1 | 244.002 | +0.002 | 244.03 | PASS |
| 264 | 11.000 | launch | who=0 | 264.026 | +0.026 | 264.14 | PASS |
| 270 | 11.250 | pedal | foot=L where=road gain=1 | 270.003 | +0.003 | 270.00 | PASS |
| 272 | 11.333 | banner_pop | who=0 | 272.005 | +0.005 | 272.05 | PASS |
| 274 | 11.417 | flinch |  | 274.002 | +0.002 | — | info |
| 292 | 12.167 | fall | who=0 dur=12 | 292.142 | +0.142 | — | info |
| 294 | 12.250 | pedal | foot=R where=road gain=1 | 294.003 | +0.003 | 294.01 | PASS |
| 304 | 12.667 | land | who=0 name=SQUARE-WHEELS | 304.005 | +0.005 | 304.03 | PASS |
| 312 | 13.000 | clunk | who=0 gain=1 | 312.003 | +0.003 | 312.02 | PASS |
| 316 | 13.167 | chirp | who=0 | 316.046 | +0.046 | masked | PASS |
| 318 | 13.250 | pedal | foot=L where=road gain=1 | 318.002 | +0.002 | 318.00 | PASS |
| 320 | 13.333 | clunk | who=0 gain=1 | 320.003 | +0.003 | 320.06 | PASS |
| 328 | 13.667 | clunk | who=0 gain=1 | 328.004 | +0.004 | 328.04 | PASS |
| 330 | 13.750 | gust | strength=0.4 | 326.000 | -4.000 | — | info |
| 336 | 14.000 | clunk | who=0 gain=1 | 336.003 | +0.003 | 336.05 | PASS |
| 342 | 14.250 | pedal | foot=R where=road gain=1 | 342.003 | +0.003 | 342.02 | PASS |
| 344 | 14.333 | clunk | who=0 gain=1 | 344.003 | +0.003 | 344.07 | PASS |
| 348 | 14.500 | chirp | who=0 | 348.046 | +0.046 | masked | PASS |
| 352 | 14.667 | clunk | who=0 gain=1 | 352.003 | +0.003 | 352.03 | PASS |
| 360 | 15.000 | clunk | who=0 gain=0.8 | 360.003 | +0.003 | masked | PASS |
| 360 | 15.000 | cut | sub=3a shot=3 major=true | — | — | — | — |
| 361 | 15.042 | launch | who=1 | 361.040 | +0.040 | masked | PASS |
| 366 | 15.250 | pedal | foot=L where=road gain=1 | 366.002 | +0.002 | 366.03 | PASS |
| 368 | 15.333 | banner_pop | who=1 | 368.005 | +0.005 | 368.06 | PASS |
| 368 | 15.333 | clunk | who=0 gain=0.8 | 368.005 | +0.005 | 368.06 | PASS |
| 372 | 15.500 | chirp | who=0 | 372.046 | +0.046 | masked | PASS |
| 376 | 15.667 | clunk | who=0 gain=0.8 | 376.003 | +0.003 | 375.99 | PASS |
| 380 | 15.833 | fall | who=1 dur=12 | 380.130 | +0.130 | — | info |
| 384 | 16.000 | clunk | who=0 gain=0.8 | 384.003 | +0.003 | 384.02 | PASS |
| 390 | 16.250 | pedal | foot=R where=road gain=1 | 390.003 | +0.003 | 390.03 | PASS |
| 392 | 16.333 | clunk | who=0 gain=0.8 | 392.005 | +0.005 | 392.06 | PASS |
| 392 | 16.333 | land | who=1 name=UPSIDE-DOWN | 392.004 | +0.004 | 392.06 | PASS |
| 400 | 16.667 | clunk | who=0 gain=0.8 | 400.004 | +0.004 | 400.06 | PASS |
| 408 | 17.000 | chirp | who=1 | 408.036 | +0.036 | 408.03 | PASS |
| 408 | 17.000 | clunk | who=0 gain=0.8 | 408.004 | +0.004 | 408.03 | PASS |
| 412 | 17.167 | chirp | who=0 | 412.046 | +0.046 | masked | PASS |
| 414 | 17.250 | pedal | foot=L where=road gain=1 | 414.003 | +0.003 | 414.03 | PASS |
| 416 | 17.333 | clunk | who=0 gain=0.8 | 416.003 | +0.003 | 416.08 | PASS |
| 420 | 17.500 | gust | strength=0.35 | 416.000 | -4.000 | — | info |
| 424 | 17.667 | clunk | who=0 gain=0.8 | 424.004 | +0.004 | 424.04 | PASS |
| 432 | 18.000 | clunk | who=0 gain=0.8 | 432.003 | +0.003 | 432.04 | PASS |
| 432 | 18.000 | cut | sub=3b shot=3 major=false | — | — | — | — |
| 438 | 18.250 | pedal | foot=R where=road gain=0.55 | 438.002 | +0.002 | 438.02 | PASS |
| 440 | 18.333 | clunk | who=0 gain=0.8 | 440.003 | +0.003 | 440.06 | PASS |
| 441 | 18.375 | launch | who=2 | 441.018 | +0.018 | 441.09 | PASS |
| 448 | 18.667 | banner_pop | who=2 | 448.005 | +0.005 | 448.03 | PASS |
| 448 | 18.667 | chirp | who=1 | 448.036 | +0.036 | 448.03 | PASS |
| 448 | 18.667 | clunk | who=0 gain=0.8 | 448.004 | +0.004 | 448.03 | PASS |
| 452 | 18.833 | chirp | who=0 | 452.046 | +0.046 | 452.51 | PASS |
| 452 | 18.833 | fall | who=2 dur=12 | 452.144 | +0.144 | — | info |
| 456 | 19.000 | clunk | who=0 gain=0.8 | 456.005 | +0.005 | 456.04 | PASS |
| 462 | 19.250 | pedal | foot=L where=road gain=0.55 | 462.002 | +0.002 | 462.03 | PASS |
| 464 | 19.333 | clunk | who=0 gain=0.8 | 464.004 | +0.004 | 464.05 | PASS |
| 464 | 19.333 | land | who=2 name=BACK-BEAK | 464.006 | +0.006 | 464.05 | PASS |
| 472 | 19.667 | clunk | who=0 gain=0.8 | 472.005 | +0.005 | 472.04 | PASS |
| 480 | 20.000 | chirp | who=1 | 480.036 | +0.036 | 480.04 | PASS |
| 480 | 20.000 | clunk | who=0 gain=0.8 | 480.003 | +0.003 | 480.04 | PASS |
| 480 | 20.000 | cut | sub=3c shot=3 major=false | — | — | — | — |
| 484 | 20.167 | chirp | who=2 | 484.034 | +0.034 | masked | PASS |
| 486 | 20.250 | pedal | foot=R where=road gain=1 | 486.003 | +0.003 | 486.01 | PASS |
| 488 | 20.333 | clunk | who=0 gain=0.8 | 488.004 | +0.004 | 487.55 | PASS |
| 492 | 20.500 | chirp | who=0 | 492.046 | +0.046 | masked | PASS |
| 496 | 20.667 | clunk | who=0 gain=0.8 | 496.004 | +0.004 | 496.06 | PASS |
| 498 | 20.750 | sigh | dur=22 soft=true | 498.464 | +0.464 | — | info |
| 504 | 21.000 | clunk | who=0 gain=0.8 | 504.005 | +0.005 | masked | PASS |
| 505 | 21.042 | gust | strength=0.4 | 501.000 | -4.000 | — | info |
| 510 | 21.250 | pedal | foot=L where=road gain=1 | 510.003 | +0.003 | 510.03 | PASS |
| 512 | 21.333 | chirp | who=1 | 512.037 | +0.037 | 512.08 | PASS |
| 512 | 21.333 | clunk | who=0 gain=0.8 | 512.003 | +0.003 | 512.08 | PASS |
| 516 | 21.500 | chirp | who=0 | 516.047 | +0.047 | masked | PASS |
| 520 | 21.667 | clunk | who=0 gain=0.8 | 520.005 | +0.005 | 520.05 | PASS |
| 524 | 21.833 | chirp | who=2 | 524.034 | +0.034 | masked | PASS |
| 528 | 22.000 | clunk | who=0 gain=0.8 | 528.003 | +0.003 | 528.07 | PASS |
| 528 | 22.000 | cut | sub=3d shot=3 major=false | — | — | — | — |
| 530 | 22.083 | launch | who=3 | 530.037 | +0.037 | masked | PASS |
| 532 | 22.167 | fall | who=3 dur=12 | 532.124 | +0.124 | — | info |
| 534 | 22.250 | pedal | foot=R where=road gain=0.55 | 534.003 | +0.003 | 534.05 | PASS |
| 536 | 22.333 | banner_pop | who=3 | 536.004 | +0.004 | 536.04 | PASS |
| 536 | 22.333 | clunk | who=0 gain=0.8 | 536.005 | +0.005 | 536.04 | PASS |
| 544 | 22.667 | chirp | who=1 | 544.037 | +0.037 | 544.04 | PASS |
| 544 | 22.667 | clunk | who=0 gain=0.8 | 544.003 | +0.003 | 544.04 | PASS |
| 544 | 22.667 | land | who=3 name=NOODLE | 544.006 | +0.006 | 544.04 | PASS |
| 548 | 22.833 | chirp | who=0 | 548.047 | +0.047 | masked | PASS |
| 548 | 22.833 | chirp | who=2 | 548.034 | +0.034 | masked | PASS |
| 552 | 23.000 | clunk | who=0 gain=0.8 | 552.004 | +0.004 | 552.03 | PASS |
| 558 | 23.250 | pedal | foot=L where=road gain=0.55 | 558.003 | +0.003 | 558.04 | PASS |
| 560 | 23.333 | clunk | who=0 gain=0.8 | 560.004 | +0.004 | 560.06 | PASS |
| 564 | 23.500 | cut | sub=3e shot=3 major=false | — | — | — | — |
| 568 | 23.667 | chirp | who=3 | 568.033 | +0.033 | 568.05 | PASS |
| 568 | 23.667 | clunk | who=0 gain=0.8 | 568.004 | +0.004 | 568.05 | PASS |
| 572 | 23.833 | chirp | who=0 | 572.047 | +0.047 | masked | PASS |
| 572 | 23.833 | chirp | who=2 | 572.034 | +0.034 | masked | PASS |
| 576 | 24.000 | chirp | who=1 | 576.037 | +0.037 | 576.07 | PASS |
| 576 | 24.000 | clunk | who=0 gain=0.8 | 576.004 | +0.004 | 576.07 | PASS |
| 576 | 24.000 | sigh | dur=30 soft=true slump=true | 576.486 | +0.486 | — | info |
| 582 | 24.250 | pedal | foot=R where=road gain=1 | 582.004 | +0.004 | 582.03 | PASS |
| 584 | 24.333 | clunk | who=0 gain=0.8 | 584.005 | +0.005 | masked | PASS |
| 590 | 24.583 | gust | strength=0.4 | 586.000 | -4.000 | — | info |
| 592 | 24.667 | clunk | who=0 gain=0.8 | 592.004 | +0.004 | masked | PASS |
| 600 | 25.000 | clunk | who=0 gain=0.8 | 600.004 | +0.004 | 600.05 | PASS |
| 604 | 25.167 | chirp | who=0 | 604.047 | +0.047 | masked | PASS |
| 604 | 25.167 | chirp | who=2 | 604.034 | +0.034 | masked | PASS |
| 606 | 25.250 | pedal | foot=L where=road gain=1 | 606.003 | +0.003 | 606.04 | PASS |
| 608 | 25.333 | chirp | who=3 | 608.033 | +0.033 | 608.07 | PASS |
| 608 | 25.333 | clunk | who=0 gain=0.8 | 608.004 | +0.004 | 608.07 | PASS |
| 612 | 25.500 | cut | sub=3f shot=3 major=false | — | — | — | — |
| 616 | 25.667 | chirp | who=1 | 616.037 | +0.037 | 616.03 | PASS |
| 616 | 25.667 | clunk | who=0 gain=0.8 | 616.004 | +0.004 | 616.03 | PASS |
| 624 | 26.000 | clunk | who=0 gain=0.8 | 624.004 | +0.004 | 624.05 | PASS |
| 630 | 26.250 | pedal | foot=R where=road gain=1 | 630.003 | +0.003 | 630.00 | PASS |
| 630 | 26.250 | tram_bell | gain=0.25 | 630.024 | +0.024 | — | info |
| 632 | 26.333 | clunk | who=0 gain=0.8 | 632.005 | +0.005 | 631.66 | PASS |
| 636 | 26.500 | chirp | who=2 | 636.034 | +0.034 | masked | PASS |
| 640 | 26.667 | clunk | who=0 gain=0.8 | 640.004 | +0.004 | 640.02 | PASS |
| 648 | 27.000 | clunk | who=0 gain=0.8 | 648.004 | +0.004 | 648.04 | PASS |
| 648 | 27.000 | cut | sub=4a shot=4 major=true | — | — | — | — |
| 648 | 27.000 | dissolve | dur=12 | — | — | — | — |
| 654 | 27.250 | pedal | foot=L where=climb gain=0.45 | 654.003 | +0.003 | 654.02 | PASS |
| 656 | 27.333 | clunk | who=0 gain=0.8 | 656.004 | +0.004 | 656.06 | PASS |
| 660 | 27.500 | clunk | who=0 gain=0.35 | 660.004 | +0.004 | masked | PASS |
| 662 | 27.583 | chirp | who=1 gain=0.35 | 662.037 | +0.037 | 662.02 | PASS |
| 662 | 27.583 | pedal | foot=R where=climb gain=0.45 | 662.004 | +0.004 | 662.02 | PASS |
| 672 | 28.000 | gust | strength=0.55 | 668.000 | -4.000 | — | info |
| 676 | 28.167 | pedal | foot=L where=climb gain=0.45 | 676.003 | +0.003 | 676.04 | PASS |
| 680 | 28.333 | clunk | who=0 gain=0.35 | 680.004 | +0.004 | masked | PASS |
| 690 | 28.750 | chirp | who=2 gain=0.35 | 690.034 | +0.034 | masked | PASS |
| 696 | 29.000 | clunk | who=0 gain=0.35 | 696.004 | +0.004 | masked | PASS |
| 706 | 29.417 | chirp | who=3 gain=0.35 | 706.033 | +0.033 | masked | PASS |
| 708 | 29.500 | brake |  | 708.003 | +0.003 | 708.01 | PASS |
| 716 | 29.833 | clunk | who=0 gain=0.35 | 716.004 | +0.004 | 716.03 | PASS |
| 716 | 29.833 | footstep | gain=0.6 | 716.005 | +0.005 | 716.03 | PASS |
| 720 | 30.000 | cut | sub=4b shot=4 major=false | — | — | — | — |
| 722 | 30.083 | lean |  | 722.008 | +0.008 | — | info |
| 728 | 30.333 | clunk | who=0 gain=0.5 | 728.004 | +0.004 | masked | PASS |
| 740 | 30.833 | clunk | who=0 gain=0.5 | 740.004 | +0.004 | 740.03 | PASS |
| 740 | 30.833 | sit |  | 740.005 | +0.005 | 740.03 | PASS |
| 744 | 31.000 | sigh | dur=26 soft=true | 744.308 | +0.308 | — | info |
| 752 | 31.333 | clunk | who=0 gain=0.5 | 752.004 | +0.004 | masked | PASS |
| 756 | 31.500 | hold | until=864 name=ALONE | — | — | — | — |
| 764 | 31.833 | clunk | who=0 gain=0.5 | 764.004 | +0.004 | masked | PASS |
| 776 | 32.333 | clunk | who=0 gain=0.5 | 776.004 | +0.004 | masked | PASS |
| 776 | 32.333 | gust | strength=0.6 | 772.000 | -4.000 | — | info |
| 784 | 32.667 | tip | who=0 | 784.005 | +0.005 | masked | PASS |
| 812 | 33.833 | getup | who=0 | 812.004 | +0.004 | masked | PASS |
| 828 | 34.500 | clunk | who=0 gain=0.5 | 828.004 | +0.004 | masked | PASS |
| 838 | 34.917 | gust | strength=0.35 | 834.000 | -4.000 | — | info |
| 844 | 35.167 | tip | who=0 | 844.005 | +0.005 | masked | PASS |
| 864 | 36.000 | cut | sub=5a shot=5 major=true | — | — | — | — |
| 880 | 36.667 | glint | dur=32 | 881.336 | +1.336 | — | info |
| 905 | 37.708 | gust | strength=0.3 | 901.000 | -4.000 | — | info |
| 936 | 39.000 | cut | sub=5b shot=5 major=false | — | — | — | — |
| 948 | 39.500 | getup | who=0 | 948.004 | +0.004 | masked | PASS |
| 954 | 39.750 | cut | sub=5c shot=5 major=false | — | — | — | — |
| 960 | 40.000 | hold | until=1056 name=NOTICING>TENDER | — | — | — | — |
| 990 | 41.250 | tender | dur=50 | — | — | — | — |
| 996 | 41.500 | clunk | who=0 gain=0.6 | 996.004 | +0.004 | 996.05 | PASS |
| 1010 | 42.083 | gust | strength=0.35 | 1006.000 | -4.000 | — | info |
| 1056 | 44.000 | cut | sub=6 shot=6 major=true | — | — | — | — |
| 1062 | 44.250 | footstep |  | 1062.003 | +0.003 | 1062.02 | PASS |
| 1074 | 44.750 | footstep |  | 1074.003 | +0.003 | 1074.03 | PASS |
| 1086 | 45.250 | footstep |  | 1086.003 | +0.003 | 1086.04 | PASS |
| 1090 | 45.417 | gust | strength=0.4 | 1086.005 | -3.995 | — | info |
| 1098 | 45.750 | footstep |  | 1098.004 | +0.004 | 1098.05 | PASS |
| 1128 | 47.000 | bloom | dur=44 wheel=1 | 1128.567 | +0.567 | — | info |
| 1128 | 47.000 | touch | wheel=1 | 1128.003 | +0.003 | 1128.01 | PASS |
| 1166 | 48.583 | bloom | dur=32 wheel=2 | 1166.643 | +0.643 | — | info |
| 1190 | 49.583 | gust | strength=0.45 | 1186.001 | -3.999 | — | info |
| 1196 | 49.833 | rustle |  | 1196.162 | +0.162 | — | info |
| 1200 | 50.000 | roll_smooth | who=0 | 1200.499 | +0.499 | — | info |
| 1204 | 50.167 | chirp | who=0 astonished=true | 1204.058 | +0.058 | masked | PASS |
| 1208 | 50.333 | rustle | soft=true | 1208.109 | +0.109 | — | info |
| 1224 | 51.000 | bell |  | 1224.003 | +0.003 | 1223.98 | PASS |
| 1248 | 52.000 | cut | sub=7 shot=7 major=true | — | — | — | — |
| 1248 | 52.000 | peak |  | — | — | — | — |
| 1264 | 52.667 | chirp | who=0 gain=0.5 | 1264.046 | +0.046 | masked | PASS |
| 1270 | 52.917 | gust | strength=0.6 | 1266.000 | -4.000 | — | info |
| 1278 | 53.250 | pedal | foot=L where=coast gain=0.4 | 1278.004 | +0.004 | 1278.02 | PASS |
| 1280 | 53.333 | chirp | who=1 gain=0.5 | 1280.036 | +0.036 | masked | PASS |
| 1284 | 53.500 | tram_bell | gain=0.3 | 1284.024 | +0.024 | — | info |
| 1296 | 54.000 | chirp | who=2 gain=0.5 | 1296.034 | +0.034 | 1296.05 | PASS |
| 1296 | 54.000 | launch | who=4 | 1296.016 | +0.016 | 1296.05 | PASS |
| 1304 | 54.333 | banner_pop | who=4 | 1304.003 | +0.003 | 1304.02 | PASS |
| 1312 | 54.667 | chirp | who=3 gain=0.5 | 1312.033 | +0.033 | 1312.10 | PASS |
| 1326 | 55.250 | pedal | foot=R where=coast gain=0.4 | 1326.003 | +0.003 | 1326.03 | PASS |
| 1328 | 55.333 | chirp | who=0 gain=0.5 | 1328.046 | +0.046 | masked | PASS |
| 1336 | 55.667 | bell |  | 1336.004 | +0.004 | 1336.00 | PASS |
| 1344 | 56.000 | bell |  | 1344.003 | +0.003 | 1343.98 | PASS |
| 1344 | 56.000 | chirp | who=1 gain=0.5 | 1344.036 | +0.036 | 1343.98 | PASS |
| 1356 | 56.500 | fall | who=4 dur=12 | 1356.144 | +0.144 | — | info |
| 1356 | 56.500 | text | dur=30 | — | — | — | — |
| 1360 | 56.667 | chirp | who=2 gain=0.5 | 1360.034 | +0.034 | masked | PASS |
| 1368 | 57.000 | land | who=4 name=NEWCOMER | 1368.005 | +0.005 | 1368.03 | PASS |
| 1374 | 57.250 | pedal | foot=L where=coast gain=0.4 | 1374.004 | +0.004 | 1374.02 | PASS |
| 1376 | 57.333 | chirp | who=3 gain=0.5 | 1376.033 | +0.033 | masked | PASS |
| 1400 | 58.333 | gust | strength=0.5 | 1396.000 | -4.000 | — | info |
| 1416 | 59.000 | fade | dur=24 | — | — | — | — |

## Notes

- Method: every number above is measured from rendered samples; nothing is read back from the composer's intentions except the frame each cue is *supposed* to be on (the event log).
- 112 of 153 transient cues also show up as a separable spectral-flux onset in the full mix within ±1.5 frames. Cues listed as "masked" are present in the mix but not separable from the bed/music by flux alone (quiet pedal ticks under the waltz, mostly); that is a level observation, not a sync error.
- Pre-roll: no transient cue has more than 5 % of its peak earlier than one frame before its cue frame — nothing anticipates the picture.
- Soft cues (not judged), isolated onset error in frames: gust@30 -4.00, gust@118 -4.00, gust@205 -4.00, sigh@228 +0.38, flinch@274 +0.00, fall@292 +0.14, gust@330 -4.00, fall@380 +0.13, gust@420 -4.00, fall@452 +0.14, sigh@498 +0.46, gust@505 -4.00, fall@532 +0.12, sigh@576 +0.49, gust@590 -4.00, tram_bell@630 +0.02, gust@672 -4.00, lean@722 +0.01, sigh@744 +0.31, gust@776 -4.00, gust@838 -4.00, glint@880 +1.34, gust@905 -4.00, gust@1010 -4.00, gust@1090 -4.00, bloom@1128 +0.57, bloom@1166 +0.64, gust@1190 -4.00, rustle@1196 +0.16, roll_smooth@1200 +0.50, rustle@1208 +0.11, gust@1270 -4.00, tram_bell@1284 +0.02, fall@1356 +0.14, gust@1400 -4.00.
