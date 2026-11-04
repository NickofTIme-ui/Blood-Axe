// rogue.js — Synthesises Vexa's own sounds into assets/audio/sfx/rogue-*.wav (2026-11-04:
// until now she borrowed pitched copies of the sword and kick samples). Pure code, no
// samples: the output is ours outright. Seeded, so running it again gives the same files.
//
//   node tools/sfx-gen/rogue.js
//
// Ingredients: filtered noise (whooshes, hiss, smoke), ringing inharmonic partials (steel),
// short sine blips (the mine's mechanism) and low thumps (blades going in).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../assets/audio/sfx');

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

// A band-pass whose centre can move: f(t) in Hz, q the sharpness. (A state-variable filter.)
function bandNoise(out, { f, q = 2, amp, r, at = 0 }) {
  let low = 0, band = 0;
  const s = Math.round(at * RATE);
  for (let i = s; i < out.length; i++) {
    const t = (i - s) / RATE;
    const k = 2 * Math.sin(Math.PI * Math.min(f(t), RATE / 6) / RATE);
    const x = r() * 2 - 1;
    low += k * band;
    const high = x - low - band / q;
    band += k * high;
    out[i] += band * amp(t);
  }
  return out;
}

// Steel: a few inharmonic partials ringing down (a blade, a star, a catch).
function ring(out, { at = 0, base = 2400, ratios = [1, 1.47, 2.09, 2.76, 3.9], decay = 0.08, gain = 0.5, r }) {
  const s = Math.round(at * RATE);
  const ph = ratios.map(() => r() * Math.PI * 2);
  for (let i = s; i < out.length; i++) {
    const t = (i - s) / RATE;
    let v = 0;
    ratios.forEach((k, j) => { v += Math.sin(ph[j] + 2 * Math.PI * base * k * t) * Math.exp(-t / (decay / (1 + j * 0.4))) / (1 + j * 0.6); });
    out[i] += v * gain;
  }
  return out;
}

// A sine blip (the mine's mechanism), with an optional pitch glide.
function blip(out, { at = 0, f0 = 1800, f1 = f0, len = 0.05, gain = 0.5 }) {
  const s = Math.round(at * RATE), n = Math.round(len * RATE);
  let ph = 0;
  for (let k = 0; k < n && s + k < out.length; k++) {
    const t = k / n;
    ph += 2 * Math.PI * (f0 + (f1 - f0) * t) / RATE;
    out[s + k] += Math.sin(ph) * gain * Math.min(1, k / 40) * (1 - t) ** 1.5;
  }
  return out;
}

// A low body thump (a blade going in, a heel landing), pitch dropping.
function thump(out, { at = 0, f0 = 160, f1 = 60, len = 0.14, gain = 0.8 }) {
  const s = Math.round(at * RATE), n = Math.round(len * RATE);
  let ph = 0;
  for (let k = 0; k < n && s + k < out.length; k++) {
    const t = k / n;
    ph += 2 * Math.PI * (f0 + (f1 - f0) * t) / RATE;
    out[s + k] += Math.sin(ph) * gain * Math.exp(-t * 5);
  }
  return out;
}

// A sharp click: a few samples of noise, high and dry.
function click(out, { at = 0, gain = 0.8, r }) {
  const s = Math.round(at * RATE);
  for (let k = 0; k < 220 && s + k < out.length; k++) out[s + k] += (r() * 2 - 1) * gain * Math.exp(-k / 30);
  return out;
}

function highpass(x, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff), dt = 1 / RATE, a = rc / (rc + dt);
  let py = 0, px = 0;
  for (let i = 0; i < x.length; i++) { const y = a * (py + x[i] - px); px = x[i]; py = y; x[i] = y; }
  return x;
}

function finish(x, { peak = 0.85, fadeMs = 12 } = {}) {
  highpass(x, 40);
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m ? peak / m : 1, fade = Math.round((fadeMs / 1000) * RATE);
  for (let i = 0; i < x.length; i++) {
    x[i] = Math.tanh(x[i] * g * 1.1) / Math.tanh(1.1);
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

// a dagger cut through the air: a fast rising-then-falling hiss, tight and thin
const swish = (seed, f0, f1, len) => () => {
  const r = rng(seed), x = buf(len);
  bandNoise(x, { r, q: 3, f: (t) => f0 + (f1 - f0) * Math.sin(Math.PI * Math.min(1, t / len)), amp: (t) => env(t, len * 0.35, len * 0.18) });
  return finish(x, { peak: 0.8 });
};

const SOUNDS = {
  'rogue-swish-1.wav': swish(1, 1400, 5200, 0.16),
  'rogue-swish-2.wav': swish(2, 1800, 6200, 0.14),
  'rogue-swish-3.wav': swish(3, 1100, 4400, 0.2),
  // the rising double-dagger strike / the heavy flourish: a longer swish with steel in it
  'rogue-flourish.wav': () => {
    const r = rng(4), x = buf(0.32);
    bandNoise(x, { r, q: 2.5, f: (t) => 900 + 5200 * Math.min(1, t / 0.18), amp: (t) => env(t, 0.12, 0.07) });
    ring(x, { r, at: 0.12, base: 3100, decay: 0.06, gain: 0.18 });
    return finish(x, { peak: 0.82 });
  },
  // a dagger biting: a short wet thump with a thin steel catch on top
  'rogue-stab.wav': () => {
    const r = rng(5), x = buf(0.26);
    thump(x, { f0: 190, f1: 70, len: 0.16, gain: 0.9 });
    bandNoise(x, { r, q: 1.2, f: () => 900, amp: (t) => 0.6 * env(t, 0.003, 0.03) });
    ring(x, { r, base: 2900, decay: 0.03, gain: 0.15 });
    return finish(x, { peak: 0.85 });
  },
  // steel on steel as she parries / blocks: bright, short
  'rogue-guard.wav': () => {
    const r = rng(6), x = buf(0.35);
    click(x, { r, gain: 0.9 });
    ring(x, { r, base: 2200, decay: 0.12, gain: 0.6 });
    return finish(x, { peak: 0.8 });
  },
  // a shuriken leaving her hand: a fluttering whirr that falls away
  'rogue-star-throw.wav': () => {
    const r = rng(7), x = buf(0.3);
    bandNoise(x, { r, q: 4, f: (t) => 3200 - 1400 * t / 0.3, amp: (t) => env(t, 0.01, 0.1) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 46 * t)) });
    return finish(x, { peak: 0.7 });
  },
  // a star biting in: a tick of steel and a small thud
  'rogue-star-hit.wav': () => {
    const r = rng(8), x = buf(0.16);
    click(x, { r, gain: 0.7 });
    ring(x, { r, base: 4200, decay: 0.025, gain: 0.35 });
    thump(x, { f0: 240, f1: 110, len: 0.07, gain: 0.5 });
    return finish(x, { peak: 0.7 });
  },
  // the mine set down: two clicks of its mechanism
  'rogue-mine-set.wav': () => {
    const r = rng(9), x = buf(0.16);
    click(x, { r, gain: 0.8 });
    click(x, { r, at: 0.06, gain: 0.6 });
    thump(x, { f0: 300, f1: 160, len: 0.05, gain: 0.3 });
    return finish(x, { peak: 0.65 });
  },
  // armed: a tick and a tiny rising tone
  'rogue-mine-arm.wav': () => {
    const r = rng(10), x = buf(0.2);
    click(x, { r, gain: 0.5 });
    blip(x, { at: 0.03, f0: 1400, f1: 2100, len: 0.12, gain: 0.4 });
    return finish(x, { peak: 0.55 });
  },
  // a man close enough: the warning, two quick high beeps
  'rogue-mine-beep.wav': () => {
    const x = buf(0.22);
    blip(x, { f0: 2300, len: 0.06, gain: 0.6 });
    blip(x, { at: 0.1, f0: 2300, len: 0.06, gain: 0.6 });
    return finish(x, { peak: 0.6 });
  },
  // gone: a soft inward rush (BACKSTAB vanishing, NIGHT FALLS between cuts)
  'rogue-vanish.wav': () => {
    const r = rng(12), x = buf(0.3);
    bandNoise(x, { r, q: 1.5, f: (t) => 600 + 2600 * t / 0.3, amp: (t) => (t / 0.3) ** 2 * (t > 0.27 ? (0.3 - t) / 0.03 : 1) });
    return finish(x, { peak: 0.6 });
  },
  // the smoke bomb: a pop, then a long hiss of smoke
  'rogue-smoke.wav': () => {
    const r = rng(13), x = buf(1.0);
    thump(x, { f0: 140, f1: 50, len: 0.18, gain: 1 });
    bandNoise(x, { r, q: 0.8, f: () => 1800, amp: (t) => 0.9 * env(t, 0.004, 0.06) });
    bandNoise(x, { r, q: 0.7, f: (t) => 4200 - 1600 * t, amp: (t) => 0.35 * env(t, 0.05, 0.35) });
    return finish(x, { peak: 0.75 });
  },
  // night falls: a low swell and a hush coming down over everything
  'rogue-night.wav': () => {
    const r = rng(14), x = buf(1.3);
    for (let i = 0; i < x.length; i++) {
      const t = i / RATE;
      x[i] += (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 82.5 * t)) * 0.5 * Math.min(1, t / 0.5) * Math.exp(-Math.max(0, t - 0.6) / 0.3);
    }
    bandNoise(x, { r, q: 0.9, f: (t) => 3000 - 2200 * Math.min(1, t / 0.8), amp: (t) => 0.4 * Math.min(1, t / 0.4) * Math.exp(-Math.max(0, t - 0.6) / 0.25) });
    return finish(x, { peak: 0.7, fadeMs: 80 });
  },
};

for (const [name, make] of Object.entries(SOUNDS)) wav(name, make());
