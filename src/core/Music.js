// Music.js — One music track at a time, looped, with a short crossfade between them.
// Tracks are listed in MUSIC and loaded by BootScene. Volume lives in settings.js.
//
// Browsers block sound until the player presses a key or clicks. If that hasn't
// happened yet, the track starts the moment it does.

import { SETTINGS } from '../config/settings.js';

export const MUSIC = {
  title: 'assets/audio/title-the-battle.mp3',       // "02 The Battle": opening cinematic (from 7 s), title + character select
  battle: 'assets/audio/gameplay-battle-field.mp3', // arena
  boss: 'assets/audio/boss-theme.mp3',              // the Warlord (until the file is added, the battle track plays on)
  wilderness: 'assets/audio/wilderness.mp3',        // Gallows Wood (a stage's `music` picks its track)
  caves: 'assets/audio/caves.mp3',                  // the Hollow Mountain ("Fiends Path")
  cliffs: 'assets/audio/cliffs.mp3',                // the Shattered Ascent, the cliff roads ("Turtle Village II")
};

// Per-track level, so every track sits as loud as the battle track (measured RMS:
// battle -18.5 dB, wilderness -11.0 dB, caves -11.6 dB, cliffs -13.1 dB; title is
// 5.3 dB hotter than battle)
const GAIN = { wilderness: 0.42, caves: 0.45, cliffs: 0.54, title: 0.55 };

let current = null; // { key, sound }
let early = null;   // the title theme the opening cinematic started, before Phaser exists

function volume(key = current?.key) {
  return SETTINGS.audio.muted ? 0 : SETTINGS.audio.music * (GAIN[key] ?? 1);
}

// Called by the opening cinematic (core/StartupIntro.js) 7 s in, or when it is skipped
// sooner. A plain <audio> element, since Phaser does not exist yet; the title screen
// adopts it, so the track carries on without restarting. Calling it again from a key
// press or click retries a play the browser blocked. ?mute=1 leaves it to Phaser.
export function startTitleTheme() {
  if (new URLSearchParams(location.search).has('mute')) return;
  if (!early && !current) {
    const el = new Audio(MUSIC.title);
    el.loop = true;
    el.volume = volume('title');
    early = el;
    const retry = () => { if (el.paused && el.src) el.play().catch(() => {}); };
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, retry);
    document.addEventListener('visibilitychange', () => {
      if (!el.src) return;
      if (document.hidden) el.pause(); else retry();
    });
  }
  if (early?.paused) early.play().catch(() => {}); // blocked until the first key or click
}

export function playMusic(scene, key) {
  if (current?.key === key) return;
  if (key === 'title' && early) {
    const el = early;
    early = null;
    current = {
      key,
      sound: { // what the crossfade and toggleMute need from a Phaser sound
        get volume() { return el.volume; },
        set volume(v) { el.volume = Math.min(1, Math.max(0, v)); },
        destroy() { el.pause(); el.removeAttribute('src'); el.load(); },
      },
    };
    current.sound.volume = volume();
    return;
  }
  if (!scene.cache.audio.exists(key)) return;
  const sound = scene.sound;

  const start = () => {
    if (current?.key !== key) return;
    const s = current.sound;
    s.play({ loop: true, volume: 0 });
    // fade in on whichever scene is still running (the one that asked may have closed
    // already — e.g. the very first click both unlocks sound and leaves the title screen)
    const live = [scene, ...scene.game.scene.getScenes(true)].find((sc) => sc.sys.isActive());
    if (live) live.tweens.add({ targets: s, volume: volume(), duration: 900 });
    else s.setVolume(volume());
  };

  if (current) {
    const old = current.sound;
    scene.tweens.add({ targets: old, volume: 0, duration: 500, onComplete: () => old.destroy() });
  }
  current = { key, sound: sound.add(key) };
  if (sound.locked) sound.once('unlocked', start);
  else start();
}

export function toggleMute() {
  SETTINGS.audio.muted = !SETTINGS.audio.muted;
  if (current?.sound) current.sound.volume = volume();
  return SETTINGS.audio.muted;
}
