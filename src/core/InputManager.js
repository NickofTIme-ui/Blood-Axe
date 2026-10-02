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

// Connected pads straight from the browser, real controllers first (see getPads).
// (Not through Phaser's gamepad wrappers: they skip a pad whose timestamp is older than
// the wrapper, and some browsers — and embedded pages like itch.io's — report those
// timestamps on another clock, so the buttons were silently never read.)
export function realPads(list) {
  let raw = list;
  if (raw === undefined) {
    try { raw = navigator.getGamepads?.() ?? []; } catch { raw = []; } // (a page may block them)
  }
  const pads = Array.from(raw ?? []).filter((p) => p && p.connected);
  const real = (p) => p.mapping === 'standard' || (p.buttons?.length ?? 0) >= 10;
  return [...pads.filter(real), ...pads.filter((p) => !real(p))];
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

  // The pads this manager reads. Windows often lists other devices as "gamepads" too
  // (headsets, wheels, Steam's virtual pads), sometimes FIRST — so real controllers
  // (the browser's 'standard' layout, or plenty of buttons) come before them, and 'any'
  // reads every one of them at once: whichever you pick up just works.
  getPads() {
    if (this.padSlot === null) return [];
    const pads = realPads();
    if (this.padSlot === 'any') return pads;
    return pads[this.padSlot] ? [pads[this.padSlot]] : [];
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
    const pads = this.getPads();
    const dz = this.bindings.stickDeadzone;
    // the stick: whichever pad's stick is pushed furthest
    let sx = 0; let sy = 0;
    for (const p of pads) {
      const x = p.axes[0] ?? 0;
      const y = p.axes[1] ?? 0;
      if (Math.hypot(x, y) > Math.hypot(sx, sy)) { sx = x; sy = y; }
    }
    const stick = { left: sx < -0.5, right: sx > 0.5, up: sy < -0.5, down: sy > 0.5 };

    for (const action of Object.keys(this.keys)) {
      const keyDown = this.keys[action].some((k) => k.isDown);
      let padDown = false;
      if (pads.length) {
        padDown = pads.some((pad) => (this.bindings.gamepad[action] ?? []).some((i) => pad.buttons[i]?.pressed || (pad.buttons[i]?.value ?? 0) > 0.5));
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
