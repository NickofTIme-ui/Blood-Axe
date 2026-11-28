// The Shattered Ascent's sound (level 4; tools/sfx-gen/ascent.js): a bed of mountain wind
// under the whole climb, loudest out on the causeway and quietest in Orsk's camp; the howl
// of each gust as it comes (stage/AscentWind.js); the catapults' creak and thud as they
// throw, and each stone's falling whistle as it comes down near you. View only.
import { playSfx, startLoop } from '../core/Sfx.js';

// the wind bed's level per section (road, cut road, shelter, causeway, battery, camp, pass)
const BED = [0.32, 0.3, 0.22, 0.42, 0.34, 0.16, 0.38];

export class AscentAudio {
  constructor(scene, stage) {
    this.scene = scene; this.stage = stage; this.sec = -1;
    const ev = stage.world.events;
    ev.on('ascentWind', ({ state }) => {
      if (state === 'warn') playSfx(scene, 'ascentGust', { volume: 0.75, spread: 60, minGapMs: 0 });
    });
    ev.on('shellLaunch', ({ hazard }) => {
      if (hazard.look === 'arrows' || hazard.visualOnly) return;
      if (Math.abs(scene.player.x - (stage.section?.x0 ?? 0)) < 2400) playSfx(scene, 'ascentLaunch', { volume: 0.55, spread: 80, minGapMs: 120 });
    });
    scene.events.once('shutdown', () => { this.bed?.stop(0); this.bed = null; });
  }

  update() {
    const s = this.scene; const st = this.stage;
    if (!this.bed && s.sound && !s.sound.locked) this.bed = startLoop(s, 'ascentWind', { volume: BED[st.index] ?? 0.3, fadeInMs: 2500 });
    if (this.bed && st.index !== this.sec) { this.sec = st.index; this.bed.setVolume(BED[st.index] ?? 0.3, 2500); }
    // each stone's whistle, timed to end as it lands (1.6 s), for the ones coming down near you
    for (const hz of st.hazards) {
      if (hz.type !== 'bombard' || hz.look === 'arrows' || !hz.shells?.length) continue;
      for (const sh of hz.shells) {
        if (sh.whistled || sh.land - hz.t > 96) continue;
        sh.whistled = true;
        if (Math.abs(s.player.x - sh.x) < 700) playSfx(s, 'ascentWhistle', { volume: 0.5, spread: 120, minGapMs: 60 });
      }
    }
  }
}
