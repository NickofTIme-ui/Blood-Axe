// WoodMusic.js — Gallows Wood's quiet, then its storm (level 2, data/stageWood.js `quietMusic`).
// Nick, 2026-11-14: the level opens in silence, just the rain in the pines (louder than it
// was); then the sudden attack, and BOOM, the track kicks in hard as the first man drops out
// of the trees, and from there it keeps playing, no more dropping out between fights.
// The bed of rain and wind (tools/sfx-gen/wood.js) runs the whole level under everything,
// eased back once the music is in. A boss's own track, the sentence and the stage's end keep
// their music (ArenaScene).

import { playMusic, stopMusic, currentMusic } from './Music.js';
import { startLoop, playSfx } from './Sfx.js';

export const WOOD_MUSIC = {
  rain: 0.62,       // the rain bed's level in the opening quiet (of the sfx volume)
  rainUnder: 0.4,   // ...and under the music once it's in
  punch: 1.6,       // the track comes in this much louder than its level...
  settle: 3500,     // ...and settles to it over this many ms
  shake: [6, 22],   // the screen jolts with the boom (strength, frames)
};

// Is a fight on in the wood right now? (men up, or more still to come in this section's fight)
export function woodFighting(st) {
  if (!st || st.phase !== 'fight' || !st.fightOn) return false;
  if (st.livingFoes().length) return true;
  const sec = st.section;
  return st.waveIndex < (sec?.waves?.length ?? 0);
}

// The moment of the attack: a man of the fight is in it (not still up in the branches
// waiting on the crows: an ambush kicks in as the first of them drops)
export function woodAttackLanded(st) {
  if (!woodFighting(st)) return false;
  return st.livingFoes().some((f) => !(f.hang > 0));
}

// The music's boom: the track at once and hot, a thunderclap and a hit under it, a jolt.
export function woodKickIn(scene, track, play = playMusic) {
  play(scene, track, { fadeIn: 0, punch: WOOD_MUSIC.punch, settle: WOOD_MUSIC.settle });
  playSfx(scene, 'lightningStrike', { volume: 0.9, pitch: -500, spread: 0, minGapMs: 0 });
  playSfx(scene, 'kick', { volume: 1, pitch: -900, spread: 0, minGapMs: 0 });
  scene.fx?.shake?.(...WOOD_MUSIC.shake);
  scene.woodRain?.setVolume?.(WOOD_MUSIC.rainUnder, 2500);
}

export function syncWoodMusic(scene, play = playMusic, stop = stopMusic) {
  const st = scene.stage;
  if (!st?.data?.quietMusic || scene.leaving) return false;
  if (!scene.woodRain && scene.sound && !scene.sound.locked) {
    scene.woodRain = startLoop(scene, 'woodRain', { volume: scene.woodKicked ? WOOD_MUSIC.rainUnder : WOOD_MUSIC.rain, fadeInMs: 1500 });
    scene.events.once('shutdown', () => { scene.woodRain?.stop(0); scene.woodRain = null; });
  }
  // (the boss's fight, his sentence, the level's end: their own music)
  if (st.bossSpawned || st.sentence?.running || st.phase === 'won') return false;
  const track = st.data.music ?? 'battle';
  if (!scene.woodKicked) {
    if (!woodAttackLanded(st)) {
      if (currentMusic()) stop(scene, 2600); // (the quiet: rain only; a track carried in from the menu goes)
      return true;
    }
    scene.woodKicked = true;
    woodKickIn(scene, track, play);
    return true;
  }
  if (currentMusic() !== track) play(scene, track); // (and it stays on from here)
  return true;
}
