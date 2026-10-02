// CameraFX.js — Screen shake (and a home for future camera effects like zoom punches).

import { SETTINGS } from '../config/settings.js';

export class CameraFX {
  constructor(scene) {
    this.cam = scene.cameras.main;
  }

  // strength: pixels of shake; frames: duration at 60fps
  shake(strength, frames = 8) {
    if (!SETTINGS.shake.enabled || strength <= 0) return;
    const px = strength * SETTINGS.shake.scale;
    this.cam.shake((frames * 1000) / 60, px / this.cam.width, true);
  }
}
