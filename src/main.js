// main.js — Entry point. Creates the Phaser game and lists the scenes.
// Scene order: Boot (make textures) -> Title (cover art) -> Select (pick a hero) -> Arena (+ HUD on top).
//
// The world is SETTINGS.width x SETTINGS.height units (960 x 540), but the canvas is
// SETTINGS.renderScale times bigger (1920 x 1080) and every scene's camera zooms in by that
// much — so everything is drawn at full screen resolution instead of being stretched.

import { SETTINGS } from './config/settings.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { ArenaScene } from './scenes/ArenaScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { loadFonts } from './view/fonts.js';

const RS = SETTINGS.renderScale ?? 1;

// Text is rasterised at render resolution too, so it's crisp under the zoom.
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function text(x, y, t, style) {
  return addText.call(this, x, y, t, { resolution: RS, ...style });
};

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: SETTINGS.width * RS,
  height: SETTINGS.height * RS,
  backgroundColor: '#0b0606',
  input: { gamepad: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, SelectScene, ArenaScene, HUDScene],
};

document.title = SETTINGS.title;
// fonts first (view/fonts.js), so no text is drawn in a fallback face and never redrawn
loadFonts().then(() => {
  window.game = new Phaser.Game(config); // exposed for poking around in the browser console
  // ?mute=1 starts the game silent (used when testing, so nothing blares)
  if (new URLSearchParams(location.search).has('mute')) window.game.sound.mute = true;
});
