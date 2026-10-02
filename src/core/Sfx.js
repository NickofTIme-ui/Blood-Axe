// Sfx.js — Sound effects. Each effect is listed in SFX and loaded by BootScene.
// playSfx() varies pitch and volume a little every time so repeats don't sound robotic,
// and rate-limits each sound so a pile-up of hits doesn't turn into noise.
// Volume: SETTINGS.audio.sfx (M mutes music only).

import { SETTINGS } from '../config/settings.js';

export const SFX = {
  block: 'assets/audio/sfx/block-clash.mp3', // sword on armour / shield: blocks, parries, guard breaks
  clash: 'assets/audio/sfx/sword-clash.mp3', // ambient: mixed low, now and then when the fight is busy
  whiff: 'assets/audio/sfx/swing-miss.mp3',  // a light swing that hits nothing
  swingAlt: 'assets/audio/sfx/swing-alt.mp3',      // extra swing sound, mixed in at random
  roll: 'assets/audio/sfx/roll.mp3',               // body hitting the ground mid dodge-roll
  jump: 'assets/audio/sfx/jump.mp3',               // jumping: soft on take-off, full on landing
  kick: 'assets/audio/sfx/kick-impact.wav',        // Sparta kick landing (and bodies bowled over)
  fireWhoosh: 'assets/audio/sfx/fire-whoosh.mp3',  // Firebolt cast (plays with the lava loop)
  fireLoop: 'assets/audio/sfx/fire-lava-loop.mp3', // Firebolt in flight: loops until it lands
  second: 'assets/audio/sfx/combo-second.mp3',     // 2nd swing of the light combo (the return)
  finisher: 'assets/audio/sfx/combo-finisher.mp3', // 3rd swing of the light combo (the overhand)
  heavySwing: 'assets/audio/sfx/heavy-swing.mp3',  // heavy two-handed swing (on the button press)
};

const lastPlayed = {};

// A looping sound tied to something (a projectile in flight). Returns a handle with
// stop(fadeMs) — always call it, e.g. from the owner's destroy().
export function startLoop(scene, key, { volume = 1, fadeInMs = 80 } = {}) {
  if (!scene.cache.audio.exists(key) || scene.sound.locked) return { stop() {} };
  const target = (SETTINGS.audio.sfx ?? 0.8) * volume;
  const snd = scene.sound.add(key, { loop: true, volume: 0 });
  snd.play();
  scene.tweens.add({ targets: snd, volume: target, duration: fadeInMs });
  let stopped = false;
  return {
    stop(fadeMs = 250) {
      if (stopped) return;
      stopped = true;
      scene.tweens.killTweensOf(snd);
      if (!scene.sys.isActive() || fadeMs <= 0) { snd.stop(); snd.destroy(); return; }
      scene.tweens.add({ targets: snd, volume: 0, duration: fadeMs, onComplete: () => snd.destroy() });
      // belt and braces: never let a loop outlive its fade
      scene.time.delayedCall(fadeMs + 100, () => { if (snd.isPlaying) { snd.stop(); snd.destroy(); } });
    },
  };
}

// key can be a list of [key, weight] pairs to pick one at random (variations).
export function playSfx(scene, key, { volume = 1, pitch = 0, spread = 150, minGapMs = 45 } = {}) {
  if (Array.isArray(key)) {
    const total = key.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    key = key.find(([, w]) => (r -= w) <= 0)?.[0] ?? key[0][0];
  }
  if (!scene.cache.audio.exists(key) || scene.sound.locked) return;
  const now = performance.now();
  if (now - (lastPlayed[key] ?? 0) < minGapMs) return;
  lastPlayed[key] = now;
  scene.sound.play(key, {
    volume: (SETTINGS.audio.sfx ?? 0.8) * volume * (0.85 + Math.random() * 0.3),
    detune: pitch + (Math.random() - 0.5) * 2 * spread,
  });
}
