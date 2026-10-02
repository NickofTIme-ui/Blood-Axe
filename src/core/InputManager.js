// InputManager.js — Reads keyboard + gamepad and turns them into abstract actions
// (attack, heavy, block, dodge, magic, jump, ...), using the bindings in
// config/controls.js. This is the only file that touches real input devices.

import { CONTROLS } from '../config/controls.js';
import { Controller } from './Controller.js';

// Extra key names Phaser may not know, mapped to browser key codes.
const EXTRA_KEYS = { BACKTICK: 192 };

function resolveKeyCode(name) {
  if (typeof name === 'number') return name;
  const codes = Phaser.Input.Keyboard.KeyCodes;
  if (codes[name] !== undefined) return codes[name];
  if (EXTRA_KEYS[name] !== undefined) return EXTRA_KEYS[name];
  console.warn(`[controls] Unknown key name "${name}" — check src/config/controls.js`);
  return null;
}

export class InputManager extends Controller {
  // opts.pad: which gamepad this reads — 'any' (first connected, the default), a slot
  // number (0 = first connected pad, 1 = second...), or null for none.
  // opts.keyboard: false = ignore the keyboard (a pad-only second player).
  constructor(scene, bindings = CONTROLS, opts = {}) {
    super();
    this.scene = scene;
    this.bindings = bindings;
    this.keys = {};          // action -> [Phaser Key objects]
    this.codeToActions = {}; // keyCode -> [actions]
    this.pending = new Set(); // presses seen since last frame
    this.padPrev = {};
    this.padSlot = opts.pad === undefined ? 'any' : opts.pad;
    this.useKeyboard = opts.keyboard !== false;
    this.lastPresses = [];   // what read() saw pressed since the read before

    const kb = scene.input.keyboard;
    for (const [action, names] of Object.entries(bindings.keyboard)) {
      this.keys[action] = [];
      for (const name of this.useKeyboard ? names : []) {
        const code = resolveKeyCode(name);
        if (code == null) continue;
        this.keys[action].push(kb.addKey(code, true)); // true = stop browser scrolling etc.
        (this.codeToActions[code] ??= []).push(action);
      }
    }

    // Catch presses via events so even a super-quick tap is never missed.
    this.onKeyDown = (event) => {
      if (event.repeat) return;
      for (const a of this.codeToActions[event.keyCode] ?? []) this.pending.add(a);
    };
    kb.on('keydown', this.onKeyDown);
    scene.events.once('shutdown', () => kb.off('keydown', this.onKeyDown));
  }

  getPad() {
    const gp = this.scene.input.gamepad;
    if (!gp || !gp.total || this.padSlot === null) return null;
    const pads = gp.gamepads.filter((p) => p && p.connected);
    return (this.padSlot === 'any' ? pads[0] : pads[this.padSlot]) ?? null;
  }

  // Read the devices now, as a plain sampler (core/TickInput.js capture()): ages this
  // manager's own press buffer too, so local-only keys (mute, gore, debug) still work
  // through consume().
  read() { this.tick(false); }

  tick(frozen = false) {
    this.reading = true;
    this.lastPresses = [];
    super.tick(frozen);
    for (const a of this.pending) this.registerPress(a); // (anything sample() didn't pick up itself)
    this.pending.clear();
    this.reading = false;
  }

  // A press made from outside a read (a test, a bot) waits for the next read, like a key.
  registerPress(action) {
    if (!this.reading) { this.pending.add(action); return; }
    super.registerPress(action);
    this.lastPresses.push(action);
  }

  sample() {
    const pad = this.getPad();
    const dz = this.bindings.stickDeadzone;
    const sx = pad?.axes[0]?.getValue() ?? 0;
    const sy = pad?.axes[1]?.getValue() ?? 0;
    const stick = { left: sx < -0.5, right: sx > 0.5, up: sy < -0.5, down: sy > 0.5 };

    for (const action of Object.keys(this.keys)) {
      const keyDown = this.keys[action].some((k) => k.isDown);
      let padDown = false;
      if (pad) {
        padDown = (this.bindings.gamepad[action] ?? []).some((i) => pad.buttons[i]?.pressed);
        if (stick[action]) padDown = true;
      }
      if (padDown && !this.padPrev[action]) this.pending.add(action);
      this.padPrev[action] = padDown;
      this.held[action] = keyDown || padDown;
    }

    for (const a of this.pending) this.registerPress(a);
    this.pending.clear();

    // Movement axes: digital keys, overridden by the analog stick when pushed.
    let mx = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
    let mz = (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0);
    if (Math.abs(sx) > dz) mx = sx;
    if (Math.abs(sy) > dz) mz = sy;
    this.moveX = Math.max(-1, Math.min(1, mx));
    this.moveZ = Math.max(-1, Math.min(1, mz));
  }
}
