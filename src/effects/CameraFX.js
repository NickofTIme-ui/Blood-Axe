// CameraFX.js — Screen shake (and a home for future camera effects like zoom punches).

import { SETTINGS } from '../config/settings.js';

export class CameraFX {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.until = 0; // when the current shake ends (scene time, ms)
    this.cur = 0;   // its strength
  }

  // strength: pixels of shake; frames: duration at 60fps.
  // A weaker shake never cuts a stronger one short (a body landing during an explosion
  // used to stop the explosion's shake dead): it only takes over once the strong one is
  // nearly spent.
  shake(strength, frames = 8) {
    if (!SETTINGS.shake.enabled || strength <= 0) return;
    const now = this.scene.time.now;
    const left = Math.max(0, this.until - now);
    const ms = (frames * 1000) / 60;
    if (left > 0 && strength < this.cur * (left > ms ? 1 : 0.5)) return;
    const px = strength * SETTINGS.shake.scale;
    this.cam.shake(ms, px / this.cam.width, true);
    this.until = now + ms;
    this.cur = strength;
  }
}
