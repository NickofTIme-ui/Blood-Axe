// Music.js — One music track at a time, looped, with a short crossfade between them.
// Tracks are listed in MUSIC and loaded by BootScene. Volume lives in settings.js.
//
// Browsers block sound until the player presses a key or clicks. If that hasn't
// happened yet, the track starts the moment it does.

import { SETTINGS } from '../config/settings.js';

export const MUSIC = {
  title: 'assets/audio/title-the-battle.mp3',       // title + character select
  battle: 'assets/audio/gameplay-battle-field.mp3', // arena
  boss: 'assets/audio/boss-theme.mp3',              // the Warlord (until the file is added, the battle track plays on)
  wilderness: 'assets/audio/wilderness.mp3',        // Gallows Wood (a stage's `music` picks its track)
  caves: 'assets/audio/caves.mp3',                  // the Hollow Mountain ("Fiends Path")
};

// Per-track level, so every stage sits as loud as the battle track (measured RMS:
// battle -18.5 dB, wilderness -11.0 dB, caves -11.6 dB)
const GAIN = { wilderness: 0.42, caves: 0.45 };

let current = null; // { key, sound }

function volume(key = current?.key) {
  return SETTINGS.audio.muted ? 0 : SETTINGS.audio.music * (GAIN[key] ?? 1);
}

export function playMusic(scene, key) {
  if (current?.key === key) return;
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
