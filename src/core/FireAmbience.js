// FireAmbience.js — The crackle of burning, under everything else. One looped sound per
// arena (assets/audio/sfx/fire-ambience.mp3), never stacked: its level follows how much
// is burning around the camera.
//
//   the bed      a level (or one section of it) that is on fire throughout sets `fireBed`
//                (0..1) in its data: the Burning Village everywhere, the Lower Town of
//                the Iron Gates. It plays low the whole time you are there.
//   near fire    fire grates and burning carts (hazard 'fire'), a burning beam pinning a
//                door (prop 'wreckage'), a body or a part on fire (effects/Burn.js), a
//                wall of fire: each one near the middle of the screen lifts it a little.
//
// Kept well under the music and the fight (see BED / NEAR) and it follows the effects
// volume, SETTINGS.audio.sfx. View only: nothing here touches the simulation.

import { SETTINGS } from '../config/settings.js';

const KEY = 'fireAmbience';
const BED = 0.16;  // the bed's share of the effects volume (the file sits about as loud as the music)
const NEAR = 0.3;  // the most that fire on screen can bring it up to
const EASE = 0.6;  // seconds to settle on a new level

export class FireAmbience {
  constructor(scene) {
    this.scene = scene;
    this.level = 0;
    this.snd = null;
    if (!scene.cache.audio.exists(KEY)) return;
    this.snd = scene.sound.add(KEY, { loop: true, volume: 0 });
    const start = () => { if (this.snd) this.snd.play(); };
    if (scene.sound.locked) scene.sound.once('unlocked', start);
    else start();
    scene.events.once('shutdown', () => this.destroy());
  }

  // 0..1: how much is burning near the middle of the screen
  presence() {
    const { scene } = this;
    const view = scene.cameras.main.worldView;
    const mid = view.centerX;
    const half = view.width / 2;
    // full strength on screen, fading out over most of a screen beyond its edge
    const near = (x) => Math.max(0, Math.min(1, 1 - (Math.abs(x - mid) - half) / (half * 1.5)));
    const stage = scene.stage;
    let sum = 0;
    for (const hz of stage?.hazards ?? []) {
      if (hz.type !== 'fire' || !stage.beamLive(hz)) continue;
      const phase = stage.firePhase(hz);
      // a cart burns all the time and flares; a grate only glows until it erupts
      const w = phase === 'burst' ? 0.7 : phase === 'warn' ? 0.45 : hz.look === 'cart' ? 0.35 : 0.1;
      sum += w * near(hz.x);
    }
    for (const pr of stage?.props ?? []) {
      if (pr.kind === 'wreckage' && !pr.broken) sum += 0.3 * near(pr.x);
    }
    for (const [thing, b] of scene.burning?.recs ?? []) {
      if (b.lit && !b.done) sum += 0.25 * near(thing.x);
    }
    for (const r of scene.world?.barriers?.fireRegions?.() ?? []) sum += 0.7 * near(r.x);
    return Math.min(1, sum);
  }

  // The bed for where you are: the section's own, else the level's.
  bed() {
    const data = this.scene.stageData ?? {};
    const sec = data.sections?.[this.scene.stage?.index ?? 0];
    return sec?.fireBed ?? data.fireBed ?? 0;
  }

  update(delta) {
    if (!this.snd) return;
    const target = this.scene.leaving ? 0 : Math.max(BED * this.bed(), NEAR * this.presence());
    const k = Math.min(1, Math.min(delta, 100) / 1000 / EASE);
    this.level += (target - this.level) * k;
    try { this.snd.setVolume((SETTINGS.audio.sfx ?? 0.8) * this.level); } catch { this.snd = null; }
  }

  destroy() {
    this.snd?.stop();
    this.snd?.destroy();
    this.snd = null;
  }
}
