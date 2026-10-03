// electric.js — Synthesises the Mage's lightning sounds into assets/audio/sfx/*.wav.
// Pure code, no samples: the output is ours outright (free for commercial use, no credit).
// Seeded, so running it again gives the same files.
//
//   node tools/sfx-gen/electric.js
//
// Each sound is built from three ingredients:
//   buzz    - a harsh, clipped sawtooth hum whose pitch wobbles (mains-hum "electric" tone)
//   crackle - sparse random clicks, high-passed, in bursts (sparks jumping)
//   snap    - a very fast downward pitch sweep + noise burst (the "tsss-ZAK" of a strike)

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../assets/audio/sfx');

// mulberry32: small seeded random
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buf = (sec) => new Float32Array(Math.round(sec * RATE));
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));

function highpass(x, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff), dt = 1 / RATE, a = rc / (rc + dt);
  let py = 0, px = 0;
  for (let i = 0; i < x.length; i++) { const y = a * (py + x[i] - px); px = x[i]; py = y; x[i] = y; }
  return x;
}

function lowpass(x, cutoff) {
  const dt = 1 / RATE, a = dt / (1 / (2 * Math.PI * cutoff) + dt);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; }
  return x;
}

// A clipped saw hum. pitch(t) in Hz; amp(t) the envelope.
function buzz(out, { pitch, amp, drive = 3, wobble = 6, r }) {
  let ph = 0, ph2 = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const f = pitch(t) * (1 + 0.04 * Math.sin(2 * Math.PI * wobble * t) + 0.02 * (r() - 0.5));
    ph = (ph + f / RATE) % 1;
    ph2 = (ph2 + (f * 1.503) / RATE) % 1; // a detuned fifth-ish partner: rougher
    const saw = (2 * ph - 1) * 0.7 + (2 * ph2 - 1) * 0.3;
    out[i] += Math.tanh(saw * drive) * amp(t);
  }
  return out;
}

// Sparse clicks in bursts; density(t) = clicks per second.
function crackle(out, { density, amp, r, decayMs = [0.4, 3] }) {
  const tmp = new Float32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    if (r() < density(t) / RATE) {
      const len = Math.round(RATE * (decayMs[0] + r() * (decayMs[1] - decayMs[0])) / 1000);
      const a = (0.4 + r() * 0.6) * (r() < 0.5 ? -1 : 1);
      for (let k = 0; k < len * 4 && i + k < out.length; k++) tmp[i + k] += a * (r() * 2 - 1) * Math.exp(-k / len);
    }
  }
  highpass(tmp, 1800);
  for (let i = 0; i < out.length; i++) out[i] += tmp[i] * amp(i / RATE);
  return out;
}

// The strike itself: a downward chirp and a white-noise burst.
function snap(out, { at = 0, from = 4200, to = 180, len = 0.09, gain = 1, r }) {
  const start = Math.round(at * RATE), n = Math.round(len * 3 * RATE);
  let ph = 0;
  for (let k = 0; k < n && start + k < out.length; k++) {
    const t = k / RATE;
    const f = to + (from - to) * Math.exp(-t / (len * 0.35));
    ph += (2 * Math.PI * f) / RATE;
    const e = Math.exp(-t / len);
    out[start + k] += gain * e * (Math.sign(Math.sin(ph)) * 0.45 + (r() * 2 - 1) * 0.75 * Math.exp(-t / (len * 0.4)));
  }
  return out;
}

// Low rumble for the big one: filtered noise.
function rumble(out, { at = 0, len = 1, gain = 1, cutoff = 140, r }) {
  const tmp = new Float32Array(out.length);
  const start = Math.round(at * RATE);
  for (let i = start; i < out.length; i++) tmp[i] = r() * 2 - 1;
  lowpass(lowpass(tmp, cutoff), cutoff);
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / RATE;
    out[i] += tmp[i] * gain * 6 * env(t, 0.02, len * 0.4) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 7 * t));
  }
  return out;
}

function finish(x, { peak = 0.9, fadeMs = 15 } = {}) {
  highpass(x, 35);
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m ? peak / m : 1, fade = Math.round((fadeMs / 1000) * RATE);
  for (let i = 0; i < x.length; i++) {
    x[i] = Math.tanh(x[i] * g * 1.2) / Math.tanh(1.2);
    if (i > x.length - fade) x[i] *= (x.length - i) / fade;
  }
  return x;
}

function wav(name, x) {
  const data = Buffer.alloc(44 + x.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + x.length * 2, 4); data.write('WAVE', 8);
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(RATE, 24); data.writeUInt32LE(RATE * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), data);
  console.log(`${name}  ${(x.length / RATE).toFixed(2)}s`);
}

const SOUNDS = {
  // building charge in the lantern: a hum rising in pitch, sparks thickening
  'elec-charge.wav': () => {
    const r = rng(11), x = buf(0.9);
    buzz(x, { r, pitch: (t) => 70 + 110 * t, amp: (t) => 0.35 * Math.min(1, t / 0.5) * (t > 0.8 ? (0.9 - t) / 0.1 : 1), drive: 4 });
    crackle(x, { r, density: (t) => 40 + 500 * t, amp: (t) => 0.6 * Math.min(1, t / 0.3) });
    return finish(x, { peak: 0.75 });
  },
  // the bolt leaving the staff: a hard snap, then a short buzzing tail
  'elec-zap.wav': () => {
    const r = rng(23), x = buf(0.45);
    snap(x, { r, from: 5200, to: 220, len: 0.07, gain: 1.2 });
    snap(x, { r, at: 0.035, from: 3000, to: 160, len: 0.05, gain: 0.6 });
    buzz(x, { r, pitch: () => 118, amp: (t) => 0.55 * env(t, 0.004, 0.11), drive: 5, wobble: 23 });
    crackle(x, { r, density: (t) => 900 * Math.exp(-t / 0.12), amp: () => 0.8 });
    return finish(x);
  },
  // the bolt biting into a body: crackle and a juddering buzz, like he's being fried
  'elec-shock.wav': () => {
    const r = rng(37), x = buf(0.7);
    snap(x, { r, from: 3800, to: 140, len: 0.06, gain: 1 });
    // the buzz stutters: gated on and off, as the current jolts through him
    const gate = (t) => (Math.sin(2 * Math.PI * 17 * t + 2 * Math.sin(2 * Math.PI * 5 * t)) > -0.2 ? 1 : 0.15);
    buzz(x, { r, pitch: (t) => 96 - 30 * t, amp: (t) => 0.8 * env(t, 0.006, 0.22) * gate(t), drive: 6, wobble: 31 });
    crackle(x, { r, density: (t) => 1400 * Math.exp(-t / 0.2), amp: () => 0.9, decayMs: [0.3, 2] });
    return finish(x);
  },
  // a fork jumping on to the next body: short and bright
  'elec-jump.wav': () => {
    const r = rng(41), x = buf(0.22);
    snap(x, { r, from: 6500, to: 600, len: 0.04, gain: 1 });
    buzz(x, { r, pitch: () => 190, amp: (t) => 0.35 * env(t, 0.002, 0.05), drive: 5 });
    crackle(x, { r, density: (t) => 1200 * Math.exp(-t / 0.05), amp: () => 0.7 });
    return finish(x, { peak: 0.8 });
  },
  // Storm Judgment / the third chain hit: a thunderclap with a rolling tail
  'elec-thunder.wav': () => {
    const r = rng(53), x = buf(1.8);
    snap(x, { r, from: 7000, to: 120, len: 0.12, gain: 1.4 });
    snap(x, { r, at: 0.05, from: 4000, to: 90, len: 0.1, gain: 0.9 });
    buzz(x, { r, pitch: () => 62, amp: (t) => 0.6 * env(t, 0.005, 0.25), drive: 7, wobble: 13 });
    crackle(x, { r, density: (t) => 2000 * Math.exp(-t / 0.3), amp: () => 1 });
    rumble(x, { r, at: 0.02, len: 1.7, gain: 1.3, cutoff: 110 });
    return finish(x, { peak: 0.95, fadeMs: 200 });
  },
};

for (const [name, make] of Object.entries(SOUNDS)) wav(name, make());
