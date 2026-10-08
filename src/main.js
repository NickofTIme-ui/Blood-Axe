// main.js — Entry point. Creates the Phaser game and lists the scenes.
// Launch: UFO Technologies logo -> opening cinematic (Boot makes textures meanwhile) -> Title (cover art)
// -> Select (pick a hero) -> Arena (+ HUD on top).
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
import { SkillScene } from './scenes/SkillScene.js';
import { CutawayScene } from './scenes/CutawayScene.js';
import { loadFonts } from './view/fonts.js';
import { playStartupIntro } from './core/StartupIntro.js';

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
  scene: [BootScene, TitleScene, SelectScene, ArenaScene, HUDScene, SkillScene, CutawayScene],
};

document.title = SETTINGS.title;

// Controllers: say when one is picked up, and say plainly when the page won't let the
// game see controllers at all (an embedding page can block them).
function padNotice(text, ms = 3500) {
  let el = document.getElementById('pad-notice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pad-notice';
    el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);padding:8px 16px;background:rgba(20,6,6,.88);color:#e8d0b0;font:15px Georgia,serif;border:1px solid #6a2a20;border-radius:4px;z-index:10;pointer-events:none;transition:opacity .4s';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el.hide);
  if (ms) el.hide = setTimeout(() => { el.style.opacity = '0'; }, ms);
}
try {
  navigator.getGamepads?.();
  window.addEventListener('gamepadconnected', (e) => padNotice(`Controller connected: ${e.gamepad.id.replace(/\s*\(.*$/, '').slice(0, 40)}`));
  window.addEventListener('gamepaddisconnected', () => padNotice('Controller disconnected'));
} catch {
  padNotice('This page is blocking controllers. Open the game full screen or in its own window to use one.', 0);
}
// fonts first (view/fonts.js), so no text is drawn in a fallback face and never redrawn
// Fonts can load during the logo. The engine starts once the logo ends and loads during
// the cinematic; BootScene holds the title screen until the cinematic hands over.
Promise.all([loadFonts(), playStartupIntro()]).then(() => {
  window.game = new Phaser.Game(config); // exposed for poking around in the browser console
  // ?mute=1 starts the game silent (used when testing, so nothing blares)
  if (new URLSearchParams(location.search).has('mute')) window.game.sound.mute = true;
});
