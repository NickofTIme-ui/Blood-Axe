// gates-drums.js — THE IRON GATES' own music (level 5, data/stageGates.js `music: 'gates'`):
// a siege march of war drums under a low brass drone, an anvil ringing from the forges
// behind the wall. Pure code, no samples: ours outright (the level identity playbook asked
// for a war-drum track, project files level-polish-plan/). Seeded, so it comes out the same.
//
//   node tools/sfx-gen/gates-drums.js     -> assets/audio/iron-gates.wav (+ .mp3 via ffmpeg)
//
// 96 bpm, 16 bars (40 s), loops seamlessly: the drone's chord walks D, D, Bb, C, four bars
// each; the great drums on the downbeats, a war-tom roll into every fourth bar, horn calls
// on the chord changes, a frame drum on the backbeat once the march is going.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RATE = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../assets/audio');
const BPM = 96;
const BEAT = 60 / BPM;
const BARS = 16;
const LEN = BARS * 4 * BEAT;
const N = Math.round(LEN * RATE);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(1205);
const L = new Float32Array(N);
const Rt = new Float32Array(N);

// add a mono voice into the stereo mix at `at` seconds (wraps round: the loop is seamless)
function mix(x, at, gain = 1, pan = 0) {
  const s = Math.round(at * RATE);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < x.length; i++) { const k = (s + i) % N; L[k] += x[i] * gl; Rt[k] += x[i] * gr; }
}
function lowpass(x, cutoff) { const dt = 1 / RATE, a = dt / (1 / (2 * Math.PI * cutoff) + dt); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; } return x; }
function bandpass(x, f, q) {
  const w = 2 * Math.PI * f / RATE, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
  return x;
}

// the great war drum: a pitched body that drops, a skin slap, a long boom
function bigDrum(v = 1) {
  const n = Math.round(1.4 * RATE), x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = 46 + 70 * Math.exp(-t / 0.05);
    ph += 2 * Math.PI * f / RATE;
    x[i] = Math.sin(ph) * Math.exp(-t / 0.42) * (t < 0.004 ? t / 0.004 : 1);
  }
  const slap = new Float32Array(Math.round(0.08 * RATE));
  for (let i = 0; i < slap.length; i++) slap[i] = (R() * 2 - 1) * Math.exp(-i / RATE / 0.012);
  lowpass(slap, 1800);
  for (let i = 0; i < slap.length; i++) x[i] += slap[i] * 0.5;
  for (let i = 0; i < n; i++) x[i] *= v;
  return x;
}
// a war tom (higher, shorter): the rolls
function tom(f0, v = 1) {
  const n = Math.round(0.5 * RATE), x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    ph += 2 * Math.PI * (f0 + f0 * 0.8 * Math.exp(-t / 0.03)) / RATE;
    x[i] = (Math.sin(ph) * 0.9 + (R() * 2 - 1) * 0.15 * Math.exp(-t / 0.02)) * Math.exp(-t / 0.16) * v;
  }
  return x;
}
// a frame drum on the backbeat: a dry, skinny crack
function frame(v = 1) {
  const n = Math.round(0.25 * RATE), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = (R() * 2 - 1) * Math.exp(-i / RATE / 0.05);
  bandpass(x, 900, 1.2);
  for (let i = 0; i < n; i++) x[i] *= v * 1.6;
  return x;
}
// the anvil: inharmonic ringing partials
function anvil(v = 1) {
  const n = Math.round(1.2 * RATE), x = new Float32Array(n);
  const parts = [[1180, 1], [2010, 0.6], [2875, 0.45], [3720, 0.3], [5130, 0.2]];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let s = 0;
    for (const [f, a] of parts) s += Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t / (0.5 / (1 + f / 3000)));
    x[i] = s * v * 0.25 * (t < 0.002 ? t / 0.002 : 1);
  }
  return x;
}
// a brass horn (a stack of detuned saws, opened up and closed by a filter): a call
function horn(freqs, dur, v = 1) {
  const n = Math.round((dur + 0.6) * RATE), x = new Float32Array(n);
  const phs = freqs.flatMap((f) => [[f, 0], [f * 1.004, 0.3], [f * 0.996, 0.6]]);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let s = 0;
    for (const p of phs) { p[1] = (p[1] + p[0] / RATE) % 1; s += p[1] * 2 - 1; }
    s /= phs.length;
    const amp = t < 0.12 ? t / 0.12 : t < dur ? 1 : Math.exp(-(t - dur) / 0.18);
    const cut = 300 + 1400 * amp * (t < 0.3 ? t / 0.3 : 1);
    const a = (1 / RATE) / (1 / (2 * Math.PI * cut) + 1 / RATE);
    y += a * (s - y);
    x[i] = y * amp * v;
  }
  return x;
}

// the drone under it all: the chord's root and fifth, low, breathing
const CHORDS = [[73.42, 110.0], [73.42, 110.0], [58.27, 87.31], [65.41, 98.0]]; // D, D, Bb, C
{
  const bar = 4 * BEAT;
  const phase = [0, 0, 0, 0];
  let y = 0;
  for (let i = 0; i < N; i++) {
    const t = i / RATE;
    const ci = Math.floor(t / (bar * 4)) % 4;
    const [r, f] = CHORDS[ci];
    const fs = [r, r * 1.003, f, r / 2];
    let s = 0;
    for (let k = 0; k < 4; k++) { phase[k] = (phase[k] + fs[k] / RATE) % 1; s += (phase[k] * 2 - 1) * [0.5, 0.5, 0.35, 0.4][k]; }
    const breathe = 0.75 + 0.25 * Math.sin(2 * Math.PI * t / (bar * 2));
    y += 0.02 * (s - y); // (a low, dark filter)
    const v = y * 0.55 * breathe;
    L[i] += v; Rt[i] += v;
  }
}

// the march
const at16 = (b, k) => (b * 16 + k) * BEAT / 4;
for (let b = 0; b < BARS; b++) {
  // the great drum: X . . . | . . X . | X . . . | X . X .   (16ths)
  for (const [k, v] of [[0, 1], [6, 0.7], [8, 0.95], [12, 0.8], [14, 0.65]]) mix(bigDrum(v), at16(b, k), 0.9, (k % 8 ? 0.15 : -0.1));
  // the frame drum on 2 and 4, once the first four bars have set the march going
  if (b >= 4) for (const k of [4, 12]) mix(frame(0.8 + 0.2 * R()), at16(b, k), 0.45, 0.35);
  // ghost toms
  if (b >= 2) for (const k of [3, 10, 15]) if (R() < 0.6) mix(tom(150 + R() * 30, 0.35), at16(b, k), 0.5, -0.4);
  // the roll into every fourth bar: sixteenths, rising
  if (b % 4 === 3) for (let k = 8; k < 16; k++) mix(tom(110 + (k - 8) * 12, 0.45 + (k - 8) * 0.06), at16(b, k), 0.6, (k % 2 ? -0.3 : 0.3));
  // the anvil from the forges, now and then on the offbeat
  if (b % 2 === 1) mix(anvil(0.7), at16(b, 7), 0.35, 0.6);
  // the horn calls on each change of chord, and an answer two bars after
  if (b % 4 === 0) {
    const [r, f] = CHORDS[Math.floor(b / 4) % 4];
    mix(horn([r * 2, f * 2], BEAT * 3), at16(b, 0), 0.5, -0.2);
    mix(horn([f * 2, r * 4], BEAT * 1.5), at16(b + 2, 8), 0.32, 0.25);
  }
}

// a stone hall's reverb: a few feedback taps
for (const [ch, taps] of [[L, [0.071, 0.113, 0.167]], [Rt, [0.083, 0.127, 0.181]]]) {
  const dry = Float32Array.from(ch);
  for (const d of taps) {
    const k = Math.round(d * RATE);
    for (let i = 0; i < N; i++) ch[i] += dry[(i - k + N) % N] * 0.18;
  }
}

// level: peak at -1 dBFS
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rt[i]));
const g = 0.89 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Rt[i] * g)) * 32767), 46 + i * 4);
}
const wav = join(OUT, 'iron-gates.wav');
writeFileSync(wav, pcm);
try {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-b:a', '160k', join(OUT, 'iron-gates.mp3')]);
  console.log('wrote assets/audio/iron-gates.mp3');
} catch { console.log('wrote assets/audio/iron-gates.wav (no ffmpeg for the mp3)'); }
