// Fighter.js — The shared base for every combatant (players and enemies).
// Holds position, physics, meters and the state machine. Contains NO drawing code
// (that's view/FighterView.js) and NO input code (that's the controller).
//
// Coordinates (2.5D):
//   x  left/right in the arena
//   z  depth on the floor lane (bigger z = closer to the camera = lower on screen)
//   h  height above the ground (jumping); 0 = standing on the floor
// On screen, a fighter is drawn at (x, z - h).

import { StateMachine } from '../core/StateMachine.js';
import { FIGHTER_STATES } from './fighterStates.js';

let nextId = 1;

export class Fighter {
  constructor({ stats, team, x, z, controller }) {
    this.id = nextId++;
    this.stats = stats;
    this.team = team;          // 'player' or 'enemy' — no friendly fire
    this.controller = controller;
    this.world = null;         // set by World.addFighter()

    // Position & velocity (px, px/second)
    this.x = x; this.z = z; this.h = 0;
    this.vx = 0; this.vz = 0; this.vh = 0;
    this.facing = 1;           // 1 = right, -1 = left

    // Meters
    this.health = stats.maxHealth;
    this.stamina = stats.maxStamina;
    this.mana = stats.maxMana;
    this.staminaDelay = 0;

    // Combat flags (most are refreshed by the current state every frame)
    this.hitstop = 0;          // freeze frames remaining
    this.invincible = false;
    this.guarding = false;
    this.parryActive = false;
    this.blockstun = 0;
    this.flash = 0;            // white hit-flash frames (visual only)
    this.dead = false;
    this.removeMe = false;

    // Current move (set by startMove)
    this.move = null;
    this.attackInfo = null;    // { move, hitList } for the current swing
    this.activeAttack = null;  // = attackInfo only during active frames

    // Jump bookkeeping
    this.framesSinceGrounded = 0;
    this.jumpedSinceGrounded = false;
    this.airJumpsLeft = stats.airJumps ?? 0;
    this.justLanded = false;

    // Cooldowns, frames left per state (the Mage's force blast, barrier...)
    this.cool = {};
    this.shock = 0;            // frames left seizing from lightning (visual; set by combat/Mage.js)

    this.fsm = new StateMachine(this, FIGHTER_STATES);
    this.fsm.change('idle');
  }

  get state() { return this.fsm.name; }
  get grounded() { return this.h <= 0 && this.vh <= 0; }
  get alive() { return this.health > 0; }

  // Hurtbox: the area that can be hit, relative to the feet (see combat/Boxes.js).
  get hurtbox() {
    const { w, h } = this.stats.body;
    // lying on the floor: a long, low body you can still stab and hack at
    if (this.isDowned) return { x: -h * 0.5, y: 0, w: h, h: w * 0.6 };
    return { x: -w / 2, y: 0, w, h };
  }

  // Flat on the floor after a knockdown (not flying, not getting up).
  get isDowned() {
    return this.state === 'knockdown' && this.lyingSince !== null && this.lyingSince !== undefined;
  }

  // Called by attack states when a move begins.
  startMove(move) {
    this.move = move;
    this.attackInfo = { move, hitList: new Set() }; // hitList: each move hits a target once
    this.activeAttack = null;
    if (move.staminaCost) this.spendStamina(move.staminaCost);
  }

  spendStamina(amount) {
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaDelay = this.stats.staminaRegenDelay;
  }

  faceToward(x) {
    if (x !== this.x) this.facing = Math.sign(x - this.x);
  }

  // One fixed 1/60 s step. Called by World.tick().
  update() {
    const frozen = this.hitstop > 0;
    this.controller.tick(frozen);
    if (frozen) {
      this.hitstop--;
      return; // hitstop: fully frozen this frame
    }

    this.invincible = false;
    this.guarding = false;
    for (const k in this.cool) if (this.cool[k] > 0) this.cool[k]--;
    if (this.shock > 0 && this.shock < 999) this.shock--;
    this.fsm.update();
    this.justLanded = false;
    this.integrate();
    this.regen();
    if (this.flash > 0) this.flash--;
  }

  integrate() {
    const dt = 1 / 60;
    const b = this.world.bounds;

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    if (this.h > 0 || this.vh > 0) {
      this.vh -= this.stats.gravity * dt;
      this.h += this.vh * dt;
      if (this.h <= 0) {
        this.h = 0;
        this.vh = 0;
        this.justLanded = true;
      }
    }

    this.x = Math.max(b.minX, Math.min(b.maxX, this.x));
    this.z = Math.max(b.minZ, Math.min(b.maxZ, this.z));

    if (this.grounded) {
      this.framesSinceGrounded = 0;
      this.jumpedSinceGrounded = false;
      this.airJumpsLeft = this.stats.airJumps ?? 0;
    } else {
      this.framesSinceGrounded++;
    }
  }

  regen() {
    const s = this.stats;
    const dt = 1 / 60;
    if (this.staminaDelay > 0) this.staminaDelay--;
    else if (!this.guarding && this.state !== 'dodge') {
      this.stamina = Math.min(s.maxStamina, this.stamina + s.staminaRegen * dt);
    }
    if (this.alive) this.mana = Math.min(s.maxMana, this.mana + s.manaRegen * dt);
  }
}
