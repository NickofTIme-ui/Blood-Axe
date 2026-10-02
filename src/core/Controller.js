// Controller.js — The "abstract controller" every fighter reads from.
//
// Fighters never look at the keyboard directly. They ask their controller questions
// like "is block held?" or "was attack pressed recently?". This means:
//   - The player's controller reads keyboard/gamepad (see InputManager.js)
//   - An enemy's controller is its AI brain (see entities/Enemy.js)
// ...and both drive the exact same state machine.
//
// INPUT BUFFERING lives here: every press is remembered for a few frames, so a
// button pressed slightly too early still triggers once the fighter can act.

import { SETTINGS } from '../config/settings.js';

export class Controller {
  constructor() {
    this.held = {};        // action -> true while held
    this.pressAge = {};    // action -> frames since last press (Infinity = none)
    this.moveX = 0;        // -1..1 left/right
    this.moveZ = 0;        // -1..1 up/down on the floor lane (depth)
    this.facingHint = null; // AI can ask to face a direction while strafing
  }

  // Called once per frame by the fighter. While `frozen` (hitstop), buffered
  // presses don't age, so they aren't lost during a hit-freeze.
  tick(frozen = false) {
    if (!frozen) for (const a in this.pressAge) this.pressAge[a]++;
    this.sample(frozen);
  }

  // Subclasses fill in `held`, `moveX`, `moveZ` and call registerPress().
  sample(_frozen) {}

  registerPress(action) {
    this.pressAge[action] = 0;
  }

  isDown(action) {
    return !!this.held[action];
  }

  // Was `action` pressed within the last `window` frames (and not used yet)?
  peek(action, window = SETTINGS.feel.inputBufferFrames) {
    return (this.pressAge[action] ?? Infinity) <= window;
  }

  // Like peek(), but uses up the press so it only triggers one thing.
  consume(action, window) {
    if (this.peek(action, window)) {
      this.pressAge[action] = Infinity;
      return true;
    }
    return false;
  }

  // For the debug overlay: which presses are currently buffered.
  bufferedList() {
    const w = SETTINGS.feel.inputBufferFrames;
    return Object.entries(this.pressAge)
      .filter(([, age]) => age <= w)
      .map(([a, age]) => `${a}(${age})`);
  }
}
