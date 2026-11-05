// WoodMusic.js — Gallows Wood's quiet (level 2, data/stageWood.js `quietMusic`; Nick's review
// list, 2026-11-05). The village is frantic; the wood is tense. Its track (wilderness) plays
// only while a fight is on, and drops away a few seconds after the last man falls: the walks
// between are rain in the pines and whatever is moving out there. The bed of rain and wind
// (tools/sfx-gen/wood.js) runs the whole level under everything. A boss's own track, the
// sentence and the stage's end keep their music (ArenaScene).

import { playMusic, stopMusic, currentMusic } from './Music.js';
import { startLoop } from './Sfx.js';

export const WOOD_MUSIC = {
  quietAfter: 150, // frames of no fight before the track drops out
  fadeOut: 2600,   // ms it takes to go
  rain: 0.34,      // the rain bed's level (of the sfx volume)
};

// Is a fight on in the wood right now? (men up, or more still to come in this section's fight)
export function woodFighting(st) {
  if (!st || st.phase !== 'fight' || !st.fightOn) return false;
  if (st.livingFoes().length) return true;
  const sec = st.section;
  return st.waveIndex < (sec?.waves?.length ?? 0);
}

export function syncWoodMusic(scene, play = playMusic, stop = stopMusic) {
  const st = scene.stage;
  if (!st?.data?.quietMusic || scene.leaving) return false;
  if (!scene.woodRain && scene.sound && !scene.sound.locked) {
    scene.woodRain = startLoop(scene, 'woodRain', { volume: WOOD_MUSIC.rain, fadeInMs: 1500 });
    scene.events.once('shutdown', () => { scene.woodRain?.stop(0); scene.woodRain = null; });
  }
  // (the boss's fight, his sentence, the level's end: their own music)
  if (st.bossSpawned || st.sentence?.running || st.phase === 'won') return false;
  const track = st.data.music ?? 'battle';
  if (woodFighting(st)) {
    scene.woodQuiet = 0;
    play(scene, track);
    return true;
  }
  scene.woodQuiet = (scene.woodQuiet ?? WOOD_MUSIC.quietAfter) + 1;
  if (scene.woodQuiet >= WOOD_MUSIC.quietAfter && currentMusic()) stop(scene, WOOD_MUSIC.fadeOut); // (whatever was playing: the track, or one carried in from the menu)
  return true;
}
