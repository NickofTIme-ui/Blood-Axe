// wood.js — Synthesises Gallows Wood's sounds into assets/audio/sfx/wood-*.wav (level 2,
// data/stageWood.js; Nick's review list, 2026-11-05). Pure code, no samples: ours outright.
// Seeded, so running it again gives the same files.
//
//   node tools/sfx-gen/wood.js
//
//   wood-howl     a war hound baying out of the trees (the ambush cue, the kennels)
//   wood-horn     a hunting horn: the hornblower calling the next wave, the Houndmaster's pack
//   wood-whistle  the Houndmaster's two-note whistle: his hounds lunge on it
//   wood-crows    crows bursting from the branches: wings and caws (the ambush tell)
//   wood-creak    a bough creaking under weight (men about to drop; the swinging log)
//   wood-chop     an axe biting into a notched pine
//   wood-fall     the pine going: the crack, the long tear, the crash across the stream
//   wood-logs     the log pile let go: trunks thundering down the bank
//   wood-snare    a snare springing: the bent sapling's whip and the rope cinching
//   wood-net      a weighted net thrown: a heavy whoosh
//   wood-whip     a whip's crack (the Wagonmaster)
//   wood-rain     a ten-second bed of rain in the pines, drips and wind (loops seamlessly)

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
const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
const smooth = (t) => t * t * (3 - 2 * t);
function lowpass(x, cutoff) { const dt = 1 / RATE, a = dt / (1 / (2 * Math.PI * cutoff) + dt); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; } return x; }
function highpass(x, cutoff) { const rc = 1 / (2 * Math.PI * cutoff), dt = 1 / RATE, a = rc / (rc + dt); let py = 0, px = 0; for (let i = 0; i < x.length; i++) { const y = a * (py + x[i] - px); px = x[i]; py = y; x[i] = y; } return x; }
// a two-pole resonant band (a formant)
function band(x, f, q = 6) {
  const out = new Float32Array(x.length);
  const w = 2 * Math.PI * f / RATE, r = Math.exp(-w / (2 * q));
  const a1 = 2 * r * Math.cos(w), a2 = -r * r; let y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (1 - r) * x[i] + a1 * y1 + a2 * y2; y2 = y1; y1 = y; out[i] = y; }
  return out;
}
const noise = (n, r) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };
const mix = (out, x, g = 1, at = 0) => { const s = Math.round(at * RATE); for (let i = 0; i < x.length && s + i < out.length; i++) out[s + i] += x[i] * g; return out; };

// A voiced tone: a pitch curve, harmonics rolled off, a breathy edge, vibrato
function voice(len, { pitch, amp, harm = [1, 0.5, 0.3, 0.18, 0.1, 0.06], vib = 5, vibAmt = 0.012, breath = 0.15, r }) {
  const x = buf(len); let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / RATE;
    const f = pitch(t) * (1 + vibAmt * Math.sin(2 * Math.PI * vib * t) + 0.004 * (r() - 0.5));
    ph += f / RATE;
    let s = 0;
    for (let h = 0; h < harm.length; h++) s += harm[h] * Math.sin(2 * Math.PI * ph * (h + 1));
    x[i] = (s + breath * (r() * 2 - 1)) * amp(t);
  }
  return x;
}

function finish(x, { peak = 0.8, fadeMs = 20, hp = 40 } = {}) {
  highpass(x, hp);
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m ? peak / m : 1, fade = Math.round((fadeMs / 1000) * RATE);
  for (let i = 0; i < x.length; i++) {
    x[i] = Math.tanh(x[i] * g * 1.1) / Math.tanh(1.1);
    if (i > x.length - fade) x[i] *= (x.length - i) / fade;
    if (i < 64) x[i] *= i / 64;
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

// a far-off room: a few quiet, low-passed echoes (the wood swallowing the sound)
function echo(x, taps = [[0.13, 0.32], [0.29, 0.2], [0.47, 0.12], [0.71, 0.07]], cut = 1800) {
  const wet = new Float32Array(x.length);
  for (const [d, g] of taps) mix(wet, x, g, d);
  lowpass(wet, cut);
  for (let i = 0; i < x.length; i++) x[i] += wet[i];
  return x;
}

const SOUNDS = {
  // two hounds baying, the second answering: a rise, a long held wail sliding down, a break
  'wood-howl.wav': () => {
    const r = rng(5), x = buf(3.2);
    const howl = (len, f0, peakF, endF, gain, at) => {
      const v = voice(len, {
        r, vib: 5.5, vibAmt: 0.018, breath: 0.22, harm: [1, 0.55, 0.22, 0.12, 0.05],
        pitch: (t) => { const u = t / len; return u < 0.18 ? f0 + (peakF - f0) * smooth(u / 0.18) : peakF + (endF - peakF) * smooth((u - 0.18) / 0.82) ** 1.6; },
        amp: (t) => { const u = t / len; return (u < 0.08 ? u / 0.08 : 1) * (u > 0.7 ? Math.max(0, (1 - u) / 0.3) : 1) * (0.85 + 0.15 * Math.sin(t * 9)); },
      });
      // the throat: a vowel formant on top of the voice ("oooo")
      const f = band(v, 700, 3); for (let i = 0; i < v.length; i++) v[i] = v[i] * 0.6 + f[i] * 1.8;
      mix(x, v, gain, at);
    };
    howl(2.1, 330, 560, 380, 1, 0);
    howl(1.8, 300, 500, 340, 0.55, 1.1);
    echo(x, [[0.17, 0.35], [0.38, 0.22], [0.66, 0.12]], 1400);
    return finish(x, { peak: 0.7 });
  },
  // a hunting horn: a long rising blast and two short ones, brassy and rough
  'wood-horn.wav': () => {
    const r = rng(9), x = buf(3.0);
    const blast = (len, f0, f1, at, gain) => {
      const v = voice(len, {
        r, vib: 4, vibAmt: 0.006, breath: 0.08, harm: [1, 0.8, 0.65, 0.5, 0.38, 0.28, 0.2, 0.14, 0.1],
        pitch: (t) => f0 + (f1 - f0) * smooth(Math.min(1, t / 0.25)),
        amp: (t) => env(t, 0.06, 99) * (t > len - 0.12 ? Math.max(0, (len - t) / 0.12) : 1),
      });
      for (let i = 0; i < v.length; i++) v[i] = Math.tanh(v[i] * 1.8);
      mix(x, lowpass(v, 2600), gain, at);
    };
    blast(1.25, 150, 196, 0, 1);
    blast(0.28, 180, 196, 1.42, 0.85);
    blast(0.55, 180, 196, 1.8, 0.9);
    echo(x, [[0.21, 0.4], [0.45, 0.25], [0.8, 0.14]], 1200);
    return finish(x, { peak: 0.72 });
  },
  // two sharp notes through the teeth, up then down
  'wood-whistle.wav': () => {
    const r = rng(3), x = buf(0.9);
    const note = (len, f0, f1, at) => mix(x, voice(len, { r, vib: 0, vibAmt: 0, breath: 0.35, harm: [1, 0.05], pitch: (t) => f0 + (f1 - f0) * (t / len), amp: (t) => env(t, 0.015, 99) * (t > len - 0.04 ? (len - t) / 0.04 : 1) }), 1, at);
    note(0.22, 2100, 2650, 0);
    note(0.3, 2650, 1900, 0.3);
    echo(x, [[0.12, 0.2], [0.27, 0.1]], 3000);
    return finish(x, { peak: 0.55, hp: 600 });
  },
  // crows bursting up: a flurry of wingbeats, then harsh caws, overlapping
  'wood-crows.wav': () => {
    const r = rng(17), x = buf(2.2);
    // wingbeats: soft broadband thumps, many birds, thinning out
    for (let k = 0; k < 46; k++) {
      const at = r() * 0.9 * (r() < 0.7 ? 0.6 : 1); const n = noise(Math.round(0.05 * RATE), r);
      lowpass(n, 900 + r() * 700);
      for (let i = 0; i < n.length; i++) n[i] *= env(i / RATE, 0.006, 0.02);
      mix(x, n, 0.5 + r() * 0.5, at);
    }
    // caws: a nasal buzzing voice in a harsh band, pitch dropping
    const caw = (at, f, len, g) => {
      const v = voice(len, { r, vib: 30, vibAmt: 0.05, breath: 0.6, harm: [1, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4], pitch: (t) => f * (1 - 0.25 * (t / len)), amp: (t) => env(t, 0.012, len * 0.5) });
      const f1 = band(v, 1400, 4), f2 = band(v, 2400, 5);
      for (let i = 0; i < v.length; i++) v[i] = Math.tanh((f1[i] * 2 + f2[i] * 1.4) * 2);
      mix(x, v, g, at);
    };
    for (let k = 0; k < 7; k++) caw(0.25 + k * 0.22 + r() * 0.1, 420 + r() * 200, 0.22 + r() * 0.1, 0.9 - k * 0.08);
    echo(x, [[0.15, 0.3], [0.33, 0.18], [0.6, 0.1]], 2000);
    return finish(x, { peak: 0.62 });
  },
  // a bough creaking: stick-slip pulses, slowing then quickening
  'wood-creak.wav': () => {
    const r = rng(21), x = buf(1.3);
    let t = 0.05;
    while (t < 1.2) {
      const u = t / 1.2; const gap = 0.006 + 0.012 * Math.sin(u * Math.PI);
      const n = Math.round(0.004 * RATE); const s = Math.round(t * RATE);
      for (let i = 0; i < n && s + i < x.length; i++) x[s + i] += (r() * 2 - 1) * Math.exp(-i / (n * 0.3)) * Math.sin(u * Math.PI);
      t += gap * (0.8 + r() * 0.4);
    }
    const body = band(x, 320, 8), body2 = band(x, 760, 6);
    for (let i = 0; i < x.length; i++) x[i] = body[i] * 3 + body2[i] * 1.5 + x[i] * 0.2;
    return finish(x, { peak: 0.6, hp: 120 });
  },
  // an axe into green wood: the bite (a click and a thud), chips
  'wood-chop.wav': () => {
    const r = rng(29), x = buf(0.5);
    const click = noise(Math.round(0.02 * RATE), r); highpass(click, 2000);
    for (let i = 0; i < click.length; i++) click[i] *= Math.exp(-i / (0.003 * RATE));
    mix(x, click, 0.9);
    const thud = voice(0.3, { r, harm: [1, 0.4, 0.2], breath: 0.4, vib: 0, vibAmt: 0, pitch: (t) => 140 - 60 * t, amp: (t) => env(t, 0.002, 0.06) });
    mix(x, band(thud, 420, 3), 3);
    mix(x, thud, 0.9);
    return finish(x, { peak: 0.85 });
  },
  // the pine going over: a crack, a long tearing groan as it leans, a whoosh, the crash
  'wood-fall.wav': () => {
    const r = rng(33), x = buf(3.4);
    const crack = noise(Math.round(0.12 * RATE), r); highpass(crack, 900);
    for (let i = 0; i < crack.length; i++) crack[i] *= Math.exp(-i / (0.02 * RATE));
    mix(x, crack, 1.2, 0);
    // the tear: dense creaking fibres, rising in rate
    let t = 0.1;
    while (t < 1.7) { const s = Math.round(t * RATE); const n = Math.round(0.006 * RATE); for (let i = 0; i < n && s + i < x.length; i++) x[s + i] += (r() * 2 - 1) * Math.exp(-i / (n * 0.3)) * 0.6; t += 0.004 + 0.02 * (1 - t / 1.7) * r(); }
    const fib = band(x, 520, 5); for (let i = 0; i < x.length; i++) x[i] += fib[i] * 2;
    // the whoosh through the branches as it comes down
    const w = noise(Math.round(0.9 * RATE), r); lowpass(w, 1200); highpass(w, 200);
    for (let i = 0; i < w.length; i++) w[i] *= Math.sin(Math.PI * i / w.length) ** 2 * 0.8;
    mix(x, w, 1, 1.4);
    // the crash: a deep thud, splintering, the branches settling
    const boom = voice(1.2, { r, harm: [1, 0.5, 0.25], breath: 0.6, vib: 0, vibAmt: 0, pitch: (q) => 60 - 25 * q, amp: (q) => env(q, 0.004, 0.25) });
    mix(x, lowpass(boom, 300), 2.2, 2.2);
    const spl = noise(Math.round(0.9 * RATE), r); highpass(spl, 1200);
    for (let i = 0; i < spl.length; i++) spl[i] *= env(i / RATE, 0.003, 0.18) * (r() < 0.3 ? 1 : 0.4);
    mix(x, spl, 0.8, 2.2);
    echo(x, [[0.19, 0.3], [0.41, 0.18]], 900);
    return finish(x, { peak: 0.9 });
  },
  // the log pile let go: a heavy, rolling thunder of trunks with knocks in it
  'wood-logs.wav': () => {
    const r = rng(41), x = buf(2.6);
    const rum = noise(x.length, r); lowpass(lowpass(rum, 160), 160);
    for (let i = 0; i < x.length; i++) { const t = i / RATE; x[i] += rum[i] * 9 * env(t, 0.15, 0.9) * (0.75 + 0.25 * Math.sin(t * 2 * Math.PI * 6)); }
    for (let k = 0; k < 22; k++) {
      const at = 0.05 + r() * 1.6; const v = voice(0.25, { r, harm: [1, 0.6, 0.3], breath: 0.5, vib: 0, vibAmt: 0, pitch: (t) => 90 + r() * 60 - 40 * t, amp: (t) => env(t, 0.002, 0.05) });
      mix(x, band(v, 300 + r() * 300, 3), 2.5 * (1 - at / 2), at);
    }
    return finish(x, { peak: 0.9 });
  },
  // the snare: a sapling whipping up (a fast swish), then the rope cinching tight
  'wood-snare.wav': () => {
    const r = rng(45), x = buf(0.7);
    const sw = noise(Math.round(0.18 * RATE), r);
    const swf = band(sw, 1800, 2); for (let i = 0; i < swf.length; i++) swf[i] *= Math.sin(Math.PI * i / swf.length) ** 3;
    mix(x, swf, 3, 0);
    const twang = voice(0.35, { r, harm: [1, 0.4, 0.2, 0.1], breath: 0.1, vib: 0, vibAmt: 0, pitch: () => 210, amp: (t) => env(t, 0.002, 0.07) });
    mix(x, twang, 0.8, 0.16);
    let t = 0.2; while (t < 0.55) { const s = Math.round(t * RATE); for (let i = 0; i < 90 && s + i < x.length; i++) x[s + i] += (r() * 2 - 1) * Math.exp(-i / 25) * 0.5; t += 0.012 + r() * 0.01; }
    return finish(x, { peak: 0.75 });
  },
  // a weighted net flung: a heavy airy whoosh with a rattle of its weights
  'wood-net.wav': () => {
    const r = rng(51), x = buf(0.6);
    const w = noise(x.length, r); lowpass(w, 1400); highpass(w, 150);
    for (let i = 0; i < x.length; i++) { const u = i / x.length; x[i] = w[i] * Math.sin(Math.PI * u) ** 2 * 1.4; }
    for (let k = 0; k < 8; k++) { const s = Math.round((0.1 + r() * 0.35) * RATE); for (let i = 0; i < 120 && s + i < x.length; i++) x[s + i] += (r() * 2 - 1) * Math.exp(-i / 30) * 0.25; }
    return finish(x, { peak: 0.6 });
  },
  // a whip: the swish, then the crack
  'wood-whip.wav': () => {
    const r = rng(57), x = buf(0.6);
    const sw = noise(Math.round(0.2 * RATE), r); const swf = band(sw, 2400, 2);
    for (let i = 0; i < swf.length; i++) swf[i] *= (i / swf.length) ** 2;
    mix(x, swf, 2, 0);
    const cr = noise(Math.round(0.05 * RATE), r); highpass(cr, 1500);
    for (let i = 0; i < cr.length; i++) cr[i] *= Math.exp(-i / (0.004 * RATE));
    mix(x, cr, 2, 0.2);
    echo(x, [[0.09, 0.3], [0.2, 0.15]], 3000);
    return finish(x, { peak: 0.8 });
  },
  // rain on the pines, drips off the boughs, a low wind: ten seconds, its ends matched so it loops
  'wood-rain.wav': () => {
    const r = rng(63), L = 10, n = Math.round(L * RATE), x = new Float32Array(n);
    const hiss = noise(n, r); highpass(hiss, 1500); lowpass(hiss, 6000);
    const low = noise(n, r); lowpass(low, 500); highpass(low, 120);
    const wind = noise(n, r); lowpass(lowpass(wind, 260), 260);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const gust = 0.6 + 0.4 * Math.sin(2 * Math.PI * t / L) * Math.sin(2 * Math.PI * 3 * t / L + 1);
      x[i] = hiss[i] * 0.35 + low[i] * 0.5 + wind[i] * 5 * gust;
    }
    // drops: little bright plinks and soft taps
    for (let k = 0; k < 260; k++) {
      const at = r() * (L - 0.05); const f = 1800 + r() * 2600; const s = Math.round(at * RATE); const g = 0.04 + r() * 0.12;
      for (let i = 0; i < 0.03 * RATE && s + i < n; i++) x[s + i] += Math.sin(2 * Math.PI * f * i / RATE * (1 + i / RATE * 8)) * Math.exp(-i / (0.004 * RATE)) * g;
    }
    // match the ends: a short crossfade of the tail into the head
    const xf = Math.round(0.5 * RATE);
    for (let i = 0; i < xf; i++) { const a = i / xf; x[i] = x[i] * a + x[n - xf + i] * (1 - a); }
    const out = x.slice(0, n - xf);
    highpass(out, 60);
    let m = 0; for (const v of out) m = Math.max(m, Math.abs(v));
    for (let i = 0; i < out.length; i++) out[i] = out[i] / m * 0.5;
    return out;
  },
};

for (const [name, make] of Object.entries(SOUNDS)) wav(name, make());
