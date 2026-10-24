// Music.js — One music track at a time, looped, with a short crossfade between them.
// Tracks are listed in MUSIC and loaded by BootScene. Volume lives in settings.js.
//
// Browsers block sound until the player presses a key or clicks. If that hasn't
// happened yet, the track starts the moment it does.

import { SETTINGS } from '../config/settings.js';

export const MUSIC = {
  title: 'assets/audio/title-the-battle.mp3',       // "02 The Battle": opening cinematic (from the boot stomp, 12.33 s), title + character select
  sanctuary: 'assets/audio/safety-in-the-sanctuary.mp3', // Hakon approach through the end of the village
  battle: 'assets/audio/gameplay-battle-field.mp3', // arena
  boss: 'assets/audio/boss-theme.mp3',              // the Warlord (until the file is added, the battle track plays on)
  wilderness: 'assets/audio/wilderness.mp3',        // Gallows Wood (a stage's `music` picks its track)
  caves: 'assets/audio/caves.mp3',                  // the Hollow Mountain ("Fiends Path")
  cliffs: 'assets/audio/cliffs.mp3',                // the Shattered Ascent, the cliff roads ("Turtle Village II")
  showdown: 'assets/audio/showdown.mp3',            // the Black Keep and King Vaurath, the finale ("12 Showdown", Nick 2026-10-17)
  clear: 'assets/audio/stage-clear.mp3',            // a level beaten, played once ("06 Stage Clear", Nick 2026-10-17)
  sentence: 'assets/audio/sentence.mp3',            // a beaten boss's execution, played once ("Black Cell": stage/Sentence.js)
};

// Per-track level, so every track sits as loud as the battle track (measured RMS:
// battle -18.5 dB, wilderness -11.0 dB, caves -11.6 dB, cliffs -13.1 dB, showdown and clear -11.7 dB;
// title is 5.3 dB hotter than battle)
const GAIN = { wilderness: 0.42, caves: 0.45, cliffs: 0.54, showdown: 0.46, clear: 0.6, title: 0.55, sentence: 0.85 }; // (sentence: -15.7 dB, left a touch hot)

let current = null; // { key, sound }
let early = null;   // the title theme the opening cinematic started, before Phaser exists (see startTitleTheme)

function volume(key = current?.key) {
  return SETTINGS.audio.muted ? 0 : SETTINGS.audio.music * (GAIN[key] ?? 1);
}

// The title theme for the opening cinematic (core/StartupIntro.js), before Phaser exists.
// prepareTitleTheme downloads and decodes it while the film rolls. scheduleTitleTheme then
// books its start on the audio clock a moment ahead, so the first beat lands on the boot
// stomp even when the page is busy (Phaser loads during the film and can stall the page for
// a quarter second). startTitleTheme starts it now: on the stomp if nothing was booked, or
// when the film is skipped; called again from a key press or click it retries a play the
// browser blocked. Without Web Audio, or before the decode is done, a plain <audio>
// element plays it instead. The title screen adopts either, so the track carries on
// without restarting. ?mute=1 leaves it to Phaser.
const muteFlag = () => new URLSearchParams(location.search).has('mute');
let ctx = null;      // the cinematic's AudioContext
let buffer = null;   // the decoded title theme
let booked = null;   // { src, gain, at }: a start on the audio clock

export function prepareTitleTheme() {
  if (muteFlag() || ctx || current) return;
  try { ctx = new AudioContext(); } catch { return; }
  fetch(MUSIC.title)
    .then((r) => r.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((b) => { buffer = b; })
    .catch(() => {});
  const wake = () => { if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {}); };
  for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, wake); // (a blocked context)
  document.addEventListener('visibilitychange', () => {
    if (ctx.state === 'closed') return;
    if (document.hidden) ctx.suspend().catch(() => {}); else wake();
  });
}

// Start the theme `delay` seconds from now. False when it cannot be booked yet.
export function scheduleTitleTheme(delay) {
  if (early || current || !buffer || ctx.state !== 'running') return false;
  cancelTitleTheme();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.loop = true;
  gain.gain.value = volume('title');
  src.connect(gain).connect(ctx.destination);
  const lag = ctx.outputLatency || ctx.baseLatency || 0; // (the speakers are a little behind the clock)
  const at = ctx.currentTime + Math.max(0, delay - lag);
  src.start(at);
  booked = { src, gain, at };
  return true;
}

// The film stalled before the stomp: take the booking back.
export function cancelTitleTheme() {
  if (!booked || early) return;
  booked.src.stop();
  booked.src.disconnect();
  booked = null;
}

export function startTitleTheme() {
  if (muteFlag() || current) return;
  if (booked && !early) {
    if (booked.at - ctx.currentTime > 0.1) scheduleTitleTheme(0); // (skipped before the stomp)
    const { src, gain } = booked;
    early = {
      get volume() { return gain.gain.value; },
      set volume(v) { gain.gain.value = Math.min(1, Math.max(0, v)); },
      destroy() { src.stop(); ctx.close(); },
      retry() { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    };
    return;
  }
  if (!early) {
    const el = new Audio(MUSIC.title); // (from the cache: prepareTitleTheme fetched it)
    el.loop = true;
    el.volume = volume('title');
    const retry = () => { if (el.paused && el.src) el.play().catch(() => {}); };
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, retry);
    document.addEventListener('visibilitychange', () => {
      if (!el.src) return;
      if (document.hidden) el.pause(); else retry();
    });
    early = {
      get volume() { return el.volume; },
      set volume(v) { el.volume = Math.min(1, Math.max(0, v)); },
      destroy() { el.pause(); el.removeAttribute('src'); el.load(); },
      retry,
    };
  }
  early.retry(); // blocked until the first key or click
}

// Fades run on the game's own step, not on a scene's tweens or a timer: a scene's tweens
// die with it, and the scene asking is often mid-change (a level restarting into the next
// one, the title closing); a timer gets starved while a heavy level loads and draws, which
// left the new track sitting at volume 0. The game steps every frame whatever the scenes do.
function fade(game, snd, to, ms, done) {
  snd.stopFade?.();
  // (a Phaser sound's `volume` reads the audio thread, which lags; its config is what was set)
  const from = snd.currentConfig?.volume ?? snd.volume;
  const t0 = performance.now();
  const step = () => {
    let t = Math.min(1, (performance.now() - t0) / ms);
    try { snd.volume = from + (to - from) * t; } catch { t = 1; } // (destroyed under us)
    if (t >= 1) { snd.stopFade(); done?.(); }
  };
  snd.stopFade = () => { game.events.off('step', step); snd.stopFade = null; };
  game.events.on('step', step);
}

export function playMusic(scene, key) {
  if (current?.key === key) return;
  if (key === 'title' && early) {
    current = { key, sound: early }; // (it has what the crossfade and toggleMute need from a Phaser sound)
    early = null;
    current.sound.volume = volume();
    return;
  }
  if (!scene.cache.audio.exists(key)) return;
  const sound = scene.sound;

  const start = () => {
    if (current?.key !== key) return;
    const s = current.sound;
    s.play({ loop: true, volume: 0 });
    fade(scene.game, s, volume(), 900);
  };

  if (current) {
    const old = current.sound;
    fade(scene.game, old, 0, 500, () => old.destroy());
  }
  current = { key, sound: sound.add(key) };
  if (sound.locked) sound.once('unlocked', start);
  else start();
}

// The looped track fades out (a silence, before a cue).
export function stopMusic(scene, ms = 500) {
  if (!current) return;
  const old = current.sound;
  current = null;
  fade(scene.game, old, 0, ms, () => old.destroy());
}

// A cue played once from `at` seconds in (the sentence's music), in place of the looped
// track; the caller keeps it on time with its setSeek. onEnd when it has played out.
export function playCue(scene, key, at = 0, onEnd) {
  if (!scene.cache.audio.exists(key)) return null;
  stopMusic(scene, 250);
  const s = scene.sound.add(key);
  current = { key, sound: s };
  s.once('complete', () => { if (current?.sound === s) onEnd?.(); });
  s.play({ loop: false, volume: volume(key), seek: at });
  return s;
}

export function toggleMute() {
  SETTINGS.audio.muted = !SETTINGS.audio.muted;
  if (current?.sound) { current.sound.stopFade?.(); current.sound.volume = volume(); }
  return SETTINGS.audio.muted;
}
