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
import { EpilogueScene } from './scenes/EpilogueScene.js';
import { BirthrightScene } from './scenes/BirthrightScene.js';
import { loadFonts } from './view/fonts.js';
import { playStartupIntro } from './core/StartupIntro.js';

Error.stackTraceLimit = 30; // (a crash box shows where it came from, not just Phaser's insides)
const RS = SETTINGS.renderScale ?? 1;

// Text is rasterised at render resolution too, so it's crisp under the zoom.
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function text(x, y, t, style) {
  return addText.call(this, x, y, t, { resolution: RS, ...style });
};

// Phaser 3.90 bug: its gamepad list has holes when a controller sits at index 1+ with none
// at 0 (Nick's PC: several pads/virtual pads), and closing ANY scene then throws on the
// hole ("reading 'removeAllListeners'"), which killed the scene change: stuck on the
// loading bar, or black after picking a champion (Nick, 2026-11-16). Skip the holes.
const PadPlugin = Phaser.Input?.Gamepad?.GamepadPlugin?.prototype;
if (PadPlugin?.stopListeners) {
  PadPlugin.stopListeners = function stopListeners() {
    this.target?.removeEventListener('gamepadconnected', this.onGamepadHandler);
    this.target?.removeEventListener('gamepaddisconnected', this.onGamepadHandler);
    this.sceneInputPlugin?.pluginEvents?.off(Phaser.Input.Events.UPDATE, this.update);
    for (const pad of this.gamepads ?? []) pad?.removeAllListeners();
  };
}
if (PadPlugin?.disconnectAll) {
  PadPlugin.disconnectAll = function disconnectAll() {
    for (const pad of this.gamepads ?? []) if (pad?.pad) pad.pad.connected = false;
  };
}

// A text that's already been thrown away (its scene closed under it) can still be told to
// re-letter itself by a late timer or event; Phaser then reaches for its freed picture and
// throws ("reading 'drawImage'", Nick, 2026-11-16, level 1 as Vexa). A dead text has
// nothing to draw: let it be.
const TextProto = Phaser.GameObjects.Text?.prototype;
if (TextProto?.updateText) {
  const updateText = TextProto.updateText;
  TextProto.updateText = function guardedUpdateText(...args) {
    if (!this.canvas || !this.context || !this.frame?.data || !this.scene) return this;
    return updateText.apply(this, args);
  };
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: SETTINGS.width * RS,
  height: SETTINGS.height * RS,
  backgroundColor: '#0b0606',
  input: { gamepad: true },
  // (a laptop with two graphics chips: ask for the strong one, not the power-saving one)
  render: { powerPreference: 'high-performance' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, SelectScene, ArenaScene, HUDScene, SkillScene, CutawayScene, BirthrightScene, EpilogueScene],
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
  watchGraphics(window.game);
});

// A black screen should never be silent (Nick, 2026-11-16: picked Vexa, the screen went
// black, nothing said why). Any crash is written on screen, so a screenshot shows it.
function crashNotice(text) {
  let el = document.getElementById('crash-notice');
  if (el) return; // (the first one is the one that matters)
  el = document.createElement('div');
  el.id = 'crash-notice';
  el.style.cssText = 'position:fixed;left:12px;top:12px;max-width:60%;padding:10px 14px;background:rgba(30,6,6,.92);color:#ffd8c0;font:13px/1.4 monospace;border:1px solid #a03020;border-radius:4px;z-index:200;white-space:pre-wrap;cursor:pointer';
  el.title = 'Click to hide';
  el.textContent = `Something broke. Send Claude a screenshot of this:\n${text}`.slice(0, 1800);
  el.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
}
window.addEventListener('error', (e) => crashNotice(`${e.message}\n${(e.error?.stack ?? `${e.filename}:${e.lineno}`).split('\n').slice(0, 12).join('\n')}`));
window.addEventListener('unhandledrejection', (e) => crashNotice(`(promise) ${e.reason?.stack ?? e.reason}`.split('\n').slice(0, 12).join('\n')));

// The graphics card can drop the game's picture (WebGL "context lost": the card ran short,
// or its driver reset), which leaves the canvas black while the game plays on. Phaser
// rebuilds everything when the browser hands the picture back; if that doesn't come
// within a few seconds, reload (the campaign is saved, so Continue picks it up).
function watchGraphics(game) {
  const canvas = game.canvas;
  if (!canvas) return;
  let timer = 0;
  canvas.addEventListener('webglcontextlost', () => {
    padNotice('The graphics card dropped the picture. Getting it back…', 0);
    clearTimeout(timer);
    timer = setTimeout(() => location.reload(), 5000);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    clearTimeout(timer);
    padNotice('Picture restored', 2000);
  });
}
