// ascent.js — THE SHATTERED ASCENT's own sounds (level 4): the wind off the peaks, the
// catapults on the heights and their stones. Pure code, no samples: ours outright (free for
// commercial use, no credit). Seeded, so running it again gives the same files.
//
//   node tools/sfx-gen/ascent.js     -> assets/audio/sfx/ascent-*.wav
//
//   ascent-wind.wav   a 24 s bed of mountain wind that loops seamlessly (howl in the rocks)
//   ascent-gust.wav   a gust coming: a rising roar of air with a whistle in it, then away
//   ascent-launch.wav a catapult on the heights letting go: the creak, the arm's thud
//   ascent-whistle.wav a stone falling toward you: a falling whoosh, low and growing

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

// a resonant band-pass (state-variable filter) whose centre can move: wind whistling in rock
function bandSweep(x, centre, q, r) {
  let low = 0, band = 0; const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(0.24, centre(i / RATE) / RATE));
    low += f * band; const high = x[i] - low - q * band; band += f * high;
    out[i] = band;
  }
  return out;
}
function lowpass(x, cutoff) {
  const dt = 1 / RATE; let y = 0;
  for (let i = 0; i < x.length; i++) { const c = typeof cutoff === 'function' ? cutoff(i / RATE) : cutoff; const a = dt / (1 / (2 * Math.PI * c) + dt); y += a * (x[i] - y); x[i] = y; }
  return x;
}
const noise = (n, r) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };
// slow smooth random wobble (sum of a few sines), the same at both ends of a loop of `len`
const wobble = (len, r, k = 4) => { const p = Array.from({ length: k }, (_, i) => [Math.ceil(1 + r() * 3) * (i + 1), r() * 6.28, 0.5 / (i + 1)]); return (t) => p.reduce((s, [n, ph, a]) => s + a * Math.sin(2 * Math.PI * n * t / len + ph), 0); };
const norm = (x, peak) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); for (let i = 0; i < x.length; i++) x[i] *= peak / (m || 1); return x; };

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
  'ascent-wind.wav': () => {
    const L = 24, r = rng(4), n = Math.round(L * RATE);
    const body = lowpass(noise(n, r), 520);
    const swell = wobble(L, r), pitch = wobble(L, r), pitch2 = wobble(L, r);
    const howl = bandSweep(noise(n, r), (t) => 420 + 160 * pitch(t), 0.05, r);
    const howl2 = bandSweep(noise(n, r), (t) => 760 + 240 * pitch2(t), 0.07, r);
    const x = buf(L);
    for (let i = 0; i < n; i++) {
      const t = i / RATE; const s = 0.6 + 0.4 * swell(t);
      x[i] = body[i] * 1.4 * s + howl[i] * 0.22 * Math.max(0, s - 0.3) + howl2[i] * 0.1 * Math.max(0, s - 0.5);
    }
    // seamless: cross-fade the last second into the first
    const F = RATE;
    for (let i = 0; i < F; i++) { const a = i / F; x[i] = x[i] * a + x[n - F + i] * (1 - a); }
    return norm(x.subarray(0, n - F), 0.55);
  },
  'ascent-gust.wav': () => {
    const L = 3.2, r = rng(9), n = Math.round(L * RATE);
    const e = (t) => (t < 1.3 ? Math.pow(t / 1.3, 2) : Math.exp(-(t - 1.3) / 0.75));
    const body = lowpass(noise(n, r), (t) => 300 + 1500 * e(t));
    const whistle = bandSweep(noise(n, r), (t) => 600 + 700 * e(t), 0.03, r);
    const x = buf(L);
    for (let i = 0; i < n; i++) { const t = i / RATE; x[i] = (body[i] * 1.2 + whistle[i] * 0.35) * e(t); }
    return norm(x, 0.8);
  },
  'ascent-launch.wav': () => {
    const L = 1.4, r = rng(21), x = buf(L);
    // the windlass's ratchet and the rope's creak
    for (let k = 0; k < 7; k++) {
      const at = Math.round((0.02 + k * 0.045) * RATE);
      for (let j = 0; j < 900; j++) x[at + j] += (r() * 2 - 1) * Math.exp(-j / 140) * 0.5;
    }
    let ph = 0;
    for (let i = 0; i < 0.5 * RATE; i++) { const t = i / RATE; ph += (180 + 90 * Math.sin(t * 9)) / RATE; x[i] += Math.sin(2 * Math.PI * ph) * Math.sign(Math.sin(2 * Math.PI * ph * 0.5)) * 0.12 * Math.exp(-t * 3); }
    // the arm slams the crossbar: a deep timber thud
    const at = Math.round(0.36 * RATE);
    const thud = lowpass(noise(Math.round(0.6 * RATE), r), 260);
    for (let j = 0; j < thud.length; j++) { const t = j / RATE; x[at + j] += thud[j] * 3 * Math.exp(-t / 0.12) + Math.sin(2 * Math.PI * (62 - 20 * t) * t) * 0.8 * Math.exp(-t / 0.18); }
    // the stone's whoosh going up
    const up = lowpass(noise(Math.round(0.7 * RATE), r), 900);
    for (let j = 0; j < up.length; j++) { const t = j / RATE; x[at + 2000 + j] += up[j] * 0.5 * Math.sin(Math.PI * t / 0.7); }
    return norm(x, 0.85);
  },
  'ascent-whistle.wav': () => {
    const L = 1.6, r = rng(33), n = Math.round(L * RATE);
    const air = bandSweep(noise(n, r), (t) => 1100 - 650 * (t / L), 0.08, r);
    const body = lowpass(noise(n, r), (t) => 400 + 500 * (t / L));
    const x = buf(L);
    for (let i = 0; i < n; i++) { const t = i / RATE; const e = Math.pow(t / L, 1.6) * (t > L - 0.06 ? (L - t) / 0.06 : 1); x[i] = (air[i] * 0.6 + body[i]) * e; }
    return norm(x, 0.6);
  },
};

for (const [name, make] of Object.entries(SOUNDS)) wav(name, make());
