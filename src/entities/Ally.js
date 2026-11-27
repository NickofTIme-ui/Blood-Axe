// Ally.js — THE OATH KEEPERS FIGHT TOGETHER (level 6, the Black Keep: a level's `allies`).
//
// The two heroes nobody is playing come along as real fighters in the world, on the heroes'
// team, with their whole kit and the save's skills (or the level's veteran build): Rurik's
// combo, Whirlwind Cleave and Kingsfire, Oryn's bolts, lightning, blink and Stone Spikes,
// Vexa's combo, Shadow Rush, smoke and shuriken. They execute the broken men (and get the
// 20% back like anyone: combat/Executions.js), break crates, take hazards.
//
// Like an enemy, an ally is driven by a brain that is just a Controller pressing buttons, so
// he uses the same states, frame data and rules as a player. The brain reads only the
// simulation and the world's dice (world.roll), never Math.random or a camera, so both
// machines of an online game see the same allies.
//
// What an ally is NOT: one of the scene's `players`. Story beats, checkpoints, the camera,
// the HUD, waves and game over only ever look at the players; allies never trigger any of it.
// They can't die (`immortal`): beaten down to their last, they get up, fall back behind the
// hero to get their breath (a while untouchable), and come back in.

import { Controller } from '../core/Controller.js';
import { createPlayer } from './Player.js';

export const ALLY = {
  follow: 150,     // how far behind the hero they keep when there's no fight (each one further)
  sprintAt: 320,   // further than this from where they should be: they sprint
  warpAt: 1100,    // further than this (a fall, a lift left behind): brought up behind the hero
  engage: 520,     // an enemy this close to the hero (or to them) is fair game
  breath: 240,     // frames spent falling back after being beaten down
  breathGuard: 120, // ...of which untouchable
  breathHealth: 0.4, // back up with this share of their health
};

// What each hero reaches for (ranges in px; the brain presses these buttons)
const KITS = {
  warrior: { range: 66, combo: 3, heavy: 0.25, kick: 0.12, spin: 'padDown', spinCrowd: 2, magicHold: true, magicCost: 40, rush: 0.2 },
  rogue: { range: 58, combo: 4, heavy: 0.2, kick: 0.15, spin: 'padDown', spinCrowd: 3, magicHold: false, magicCost: 12, rush: 0.35 },
  mage: { range: 190, combo: 2, heavy: 0.35, kick: 0.1, spin: 'padDown', spinCrowd: 2, magicHold: false, magicCost: 10, keepAway: 120, rush: 0 },
};

export class AllyBrain extends Controller {
  constructor(world, leaderOf, slot) {
    super();
    this.world = world;
    this.leaderOf = leaderOf; // () => the hero they follow (the first living player)
    this.slot = slot;         // 0 or 1: where in the line they keep
    this.t = 0;
    this.plan = null;         // { button, every, left } a string of presses under way
    this.breath = 0;
  }

  get me() { return this.fighter; }

  roll(salt) { return this.world.roll(this.fighter.id, salt + this.t * 7); }

  sample(frozen) {
    this.held = {}; this.moveX = 0; this.moveZ = 0;
    if (frozen) return;
    this.t++;
    const f = this.me;
    const lead = this.leaderOf();
    if (!f || !lead) return;
    f.safe = lead.safe ?? f.safe; // (a pit puts him back where the hero last stood firm)
    // beaten down: up again, and a breather behind the hero
    if (f.health <= 1 && this.breath <= 0) {
      this.breath = ALLY.breath;
      f.health = Math.max(f.health, f.stats.maxHealth * ALLY.breathHealth);
      this.world.events.emit('allyDown', { fighter: f });
    }
    if (this.breath > 0) {
      this.breath--;
      f.invincible = this.breath > ALLY.breath - ALLY.breathGuard;
      if (this.breath === 0) f.invincible = false;
      return this.go(lead.x - 220 - this.slot * 60, lead.z + (this.slot ? 40 : -40), true);
    }
    // left far behind (a fall, a lift): brought up behind the hero, out of the way
    if (Math.abs(f.x - lead.x) > ALLY.warpAt && f.grounded) {
      f.x = (lead.safe?.x ?? lead.x) - 60 - this.slot * 40; f.z = lead.safe?.z ?? lead.z; f.vx = f.vz = f.vh = 0;
      f.h = lead.h; f.floor = lead.floor;
    }
    const foe = this.pickFoe(lead);
    if (foe) return this.fight(foe);
    this.plan = null;
    // no fight: keep with the hero, a step behind and to the side
    const side = lead.facing || 1;
    const x = lead.x - side * (ALLY.follow + this.slot * 70);
    const z = Math.max(this.world.bounds.minZ + 10, Math.min(this.world.bounds.maxZ - 10, lead.z + (this.slot ? 46 : -46)));
    this.go(x, z, false, 30);
  }

  // walk (or sprint) toward a spot; true once there
  go(x, z, hurry, near = 14) {
    const f = this.me;
    const dx = x - f.x; const dz = z - f.z;
    if (Math.abs(dx) <= near && Math.abs(dz) <= 8) return true;
    this.moveX = Math.abs(dx) > near ? Math.sign(dx) : 0;
    this.moveZ = Math.abs(dz) > 8 ? Math.sign(dz) * Math.min(1, Math.abs(dz) / 30) : 0;
    // sprint is a click that lasts until he stops: on when far, off when close
    const far = hurry || Math.hypot(dx, dz) > ALLY.sprintAt;
    if (f.stats.sprint && far !== !!f.sprinting && f.state === 'walk' && this.t % 10 === 0) this.registerPress('sprint');
    if (this.moveX < 0) this.held.left = true; if (this.moveX > 0) this.held.right = true;
    if (this.moveZ < 0) this.held.up = true; if (this.moveZ > 0) this.held.down = true;
    // a wall or a gap in the way (walking but not getting anywhere): jump it like a player
    this.stuck = this.moveX && Math.abs(f.x - (this.lastX ?? f.x)) < 0.4 ? (this.stuck ?? 0) + 1 : 0;
    this.lastX = f.x;
    if (f.grounded && this.stuck > 12) { this.registerPress('jump'); this.held.jump = true; this.stuck = 0; }
    return false;
  }

  // the man to fight: near the hero or near him, on his floor, not one somebody else is on
  pickFoe(lead) {
    const f = this.me;
    let best = null; let bestD = Infinity;
    for (const e of this.world.fighters) {
      if (e.team !== 'enemy' || !e.alive || e.entering || e.invincible || e.removeMe || e.dummy) continue;
      if (Math.abs(e.x - lead.x) > ALLY.engage && Math.abs(e.x - f.x) > ALLY.engage * 0.6) continue;
      if (Math.abs((e.floor ?? 0) - (f.floor ?? 0)) > 45) continue;
      let d = Math.abs(e.x - f.x) + Math.abs(e.z - f.z) * 2;
      // spread out: a man another hero is already on counts as further away
      for (const o of this.world.fighters) {
        if (o === f || o.team !== 'player' || !o.alive) continue;
        if (Math.abs(o.x - e.x) < 90 && Math.abs(o.z - e.z) < 30) d += 140;
      }
      if (e.stats.boss) d -= 60; // (and the man that matters most)
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  fight(e) {
    const f = this.me;
    const kit = KITS[f.stats.id] ?? KITS.warrior;
    const dx = e.x - f.x; const adx = Math.abs(dx); const adz = Math.abs(e.z - f.z);
    // a press string under way (the combo): keep pressing on its beat, facing him
    if (this.plan && this.plan.left > 0) {
      this.face(dx);
      if (this.t % this.plan.every === 0) { this.registerPress(this.plan.button); this.plan.left--; }
      return;
    }
    this.plan = null;
    // his blow is coming: parry it, or get out of the way
    const swinging = this.threat(e);
    if (swinging && adx < 130 && adz < 30) {
      const r = this.roll(11);
      if (r < 0.3) { this.face(dx); this.registerPress('block'); return; }
      if (r < 0.45) { this.held[dx > 0 ? 'left' : 'right'] = true; this.moveX = dx > 0 ? -1 : 1; this.registerPress('dodge'); return; }
    }
    // a crowd round him: the wide move (cleave, spikes, smoke)
    const crowd = this.world.fighters.filter((o) => o.team === 'enemy' && o.alive && !o.entering && Math.abs(o.x - f.x) < 130 && Math.abs(o.z - f.z) < 40).length;
    if (crowd >= kit.spinCrowd && f.stamina > 30 && this.t % 30 === 0 && this.roll(12) < 0.5) {
      this.registerPress(kit.spin);
      return;
    }
    // the spell: Kingsfire held down a line of them, a bolt or a shuriken at range
    if (f.stats.spell && f.mana >= kit.magicCost && adz < 16 && adx > 90 && adx < 420 && this.t % 20 === 0 && this.roll(13) < 0.4) {
      this.face(dx);
      this.registerPress('magic');
      this.holdMagic = kit.magicHold ? 40 : 0;
      return;
    }
    if (this.holdMagic > 0) { this.holdMagic--; this.held.magic = true; }
    // the mage keeps his distance
    if (kit.keepAway && adx < kit.keepAway && adz < 40) {
      if (this.roll(14) < 0.05) { this.registerPress('dodge'); return; }
      this.go(e.x - Math.sign(dx || 1) * kit.range, e.z, false, 20);
      return;
    }
    // a run-in from far off: Shoulder Smash / Shadow Rush
    if (kit.rush && adx > 200 && adx < 320 && adz < 14 && this.roll(15) < kit.rush * 0.1) {
      this.go(e.x, e.z, true);
      this.registerPress('attack');
      return;
    }
    // into reach, lined up with him
    const at = e.x - Math.sign(dx || 1) * kit.range;
    if (Math.abs(f.x - at) > 24 || adz > 10) { this.go(at, e.z, adx > 360, 20); return; }
    this.face(dx);
    // in reach: a string of blows, a heavy, a kick (the finisher comes by itself when he breaks)
    const r = this.roll(16);
    if (r < kit.heavy) this.registerPress('heavy');
    else if (r < kit.heavy + kit.kick) this.registerPress('kick');
    else { this.plan = { button: 'attack', every: 11, left: kit.combo }; }
  }

  face(dx) {
    const f = this.me;
    const want = Math.sign(dx) || f.facing;
    if (want !== f.facing) { this.moveX = want * 0.01; this.held[want > 0 ? 'right' : 'left'] = true; }
  }

  // is he winding up (or in) a blow aimed this way?
  threat(e) {
    const m = e.move;
    if (!m || !e.state || ['idle', 'walk', 'block', 'hit', 'knockdown', 'getup', 'dead'].includes(e.state)) return false;
    return Math.sign(this.me.x - e.x) === (e.facing || 1);
  }
}

// Bring the level's allies in: the heroes nobody plays, next to the first hero.
// `statsFor(id, base)`: the save's picks (or the level's build) for each.
export function addAllies(world, players, ids, statsFor) {
  const lead = () => players.find((p) => p.alive) ?? players[0];
  const at = lead();
  return ids.map((id, i) => {
    const brain = new AllyBrain(world, lead, i);
    const f = createPlayer(world, brain, id, at.x - 90 - i * 60, at.z + (i ? 50 : -50));
    brain.fighter = f;
    if (statsFor) { f.stats = statsFor(id, f.stats); f.health = f.stats.maxHealth; f.mana = f.stats.maxMana ?? f.mana; f.stamina = f.stats.maxStamina ?? f.stamina; }
    f.ally = true;
    f.immortal = true;
    f.facing = 1;
    return f;
  });
}
