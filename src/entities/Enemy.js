// Enemy.js — Enemy creation + a simple AI "brain".
//
// The brain is a Controller, just like the keyboard: each frame it decides which
// "buttons" to press. So enemies use the exact same states, frame data, cancels and
// combat rules as the player — no special-case enemy combat code.
//
// Behaviour: line up with the player in depth, walk into range, attack (sometimes a
// combo or a heavy), occasionally block when the player swings, and hang back if
// too many allies are already crowding the player.

import { Controller } from '../core/Controller.js';
import { Fighter } from './Fighter.js';
import { ENEMIES } from '../data/enemies.js';
import { usable } from './fighterStates.js';
import { SETTINGS } from '../config/settings.js';

// Enemies never pop into view: a new one is placed just past the edge of anything a
// hero's screen can show, and walks on (his brain's 'entering' leg, below). Placement
// reads only the simulation (heroes, bounds), never a camera, so both machines of an
// online game put him in the same spot.
export const ENTER = {
  halfView: SETTINGS.width / 2, // a screen is centred on its hero (or between two)
  camPad: 30,    // the camera shows at most this far past the locked bounds
  margin: 140,   // + his half-width and the camera's lag behind a running hero
  stagger: 45,   // each next man in a wave a step further back
  onScreen: 400, // he's arrived once he's this close to a hero (and inside the bounds)
};

// Where to put the k-th man of a wave coming from this side (+1 right, -1 left).
export function offscreenX(world, heroes, side, k = 0) {
  const b = world.bounds;
  const xs = heroes.length ? heroes.map((p) => p.x) : [(b.minX + b.maxX) / 2];
  // a screen is centred on its hero, but stops at the bounds (+ camPad); it always
  // shows a full screen, so a room narrower than that shows past its far end
  const W = ENTER.halfView * 2;
  const camL = b.minX - ENTER.camPad;
  const camR = Math.max(b.maxX + ENTER.camPad, camL + W);
  const left = (x) => Math.max(camL, Math.min(camR - W, x - ENTER.halfView));
  const edge = side > 0 ? Math.max(...xs.map(left)) + W : Math.min(...xs.map(left));
  return edge + side * (ENTER.margin + k * ENTER.stagger);
}

const ATTACK_STATES = ['light1', 'light2', 'light3', 'light4', 'heavy', 'kick', 'viper', 'sweep', 'bolt', 'force'];
const COMBO_STATES = ['light1', 'light2'];

export class EnemyBrain extends Controller {
  constructor(ai) {
    super();
    this.ai = ai;
    this.fighter = null;
    this.world = null;
    this.cooldown = ai.attackCooldown[0]; // (rolled properly in createEnemy, once he's in a world)
    this.blockTimer = 0;
    this.lastThreatSeen = -1;
    this.comboLeft = 0;
    this.specialTimer = ai.specialEvery ?? 30;
  }

  // His dice: the world's repeatable rolls (core/World.js roll()), one stream per
  // question (salt), so a fight plays out the same on both machines of an online game.
  roll(salt) { return this.world ? this.world.roll(this.fighter.id, salt) : Math.random(); }
  randInt([min, max], salt) { return min + Math.floor(this.roll(salt) * (max - min + 1)); }

  // Can this press start something right now? (missing arm, no stamina...)
  canUse(press) {
    const f = this.fighter;
    const moves = f.stats.moves;
    if (press === 'heavy') return usable(f, moves.heavy);
    if (press === 'magic') return !!f.stats.spell && usable(f, f.stats.spell) && f.mana >= f.stats.spell.cost;
    return usable(f, moves[press]) && !(f.cool[press] > 0);
  }

  sample(frozen) {
    this.held = {};
    this.moveX = 0;
    this.moveZ = 0;
    const f = this.fighter;
    if (frozen || !f || !f.alive) return;

    const target = this.pickTarget();
    if (!target) { this.facingHint = null; return; }

    // Still walking on from off-screen: nothing but the walk (no specials or shots
    // from where nobody can see him), until he's inside the bounds and in view.
    if (f.entering) {
      const b = this.world.bounds;
      const inside = f.x >= b.minX && f.x <= b.maxX;
      const near = this.world.fighters.some((o) => o.team === 'player' && Math.abs(o.x - f.x) < ENTER.onScreen);
      if (!inside || !near) {
        const dir = Math.sign(target.x - f.x) || -f.facing;
        this.facingHint = dir;
        if (f.state === 'idle' || f.state === 'walk') { this.moveX = dir; this.terrainSteer(target); }
        return;
      }
      f.entering = false;
      f.unbounded = false;
    }

    // Lost an arm: the fight has gone out of him — he tries to run.
    if (f.maimed?.armF || f.maimed?.armB) return this.panic(target);

    const ai = this.ai;
    const dx = target.x - f.x;
    const dz = target.z - f.z;
    const adx = Math.abs(dx);
    this.facingHint = Math.sign(dx) || f.facing;
    if (this.cooldown > 0) this.cooldown--;

    // 1) Keep holding block for a while once we decide to.
    if (this.blockTimer > 0) {
      this.blockTimer--;
      this.held.block = true;
      return;
    }

    const canAct = f.state === 'idle' || f.state === 'walk';

    // 1b) A Mage's wall between him and his man: wait at it, don't grind into it.
    const wall = this.world.barriers?.between(f, target.x);
    if (wall) { if (canAct) this.atWall(wall, target); return; }

    // 2) React to the player starting an attack nearby (one roll per swing).
    const swinging = ATTACK_STATES.includes(target.state) && target.move &&
      target.fsm.frame <= target.move.startup;
    if (swinging && target.fsm.enterCount !== this.lastThreatSeen &&
        adx < ai.threatRange && Math.abs(dz) < 30) {
      this.lastThreatSeen = target.fsm.enterCount;
      // Lost an arm? Can't hold a guard up any more.
      const canGuard = !f.maimed?.armB && !f.maimed?.armF;
      if (canAct && canGuard && this.roll(1) < ai.blockChance) {
        this.blockTimer = this.randInt(ai.blockHold, 2);
        this.held.block = true;
        return;
      }
    }

    // 3) Continue a combo we decided on.
    if (COMBO_STATES.includes(f.state) && this.comboLeft > 0) {
      const chain = f.move.chains?.[0];
      if (chain && f.fsm.frame >= chain.from - 2) {
        this.registerPress('attack');
        this.comboLeft--;
      }
      return;
    }

    if (!canAct) return;

    // 3b) Specials from range: hooks, charges, lunges, spins. Rolled every so often.
    if (ai.specials && --this.specialTimer <= 0) {
      this.specialTimer = ai.specialEvery ?? 30;
      if (target.alive && !target.invincible && Math.abs(dz) <= ai.alignZ * 1.6) {
        for (const sp of ai.specials) {
          if (adx < sp.min || adx > sp.max || !this.canUse(sp.press)) continue;
          if (this.roll(3 + ai.specials.indexOf(sp)) < sp.chance) {
            this.registerPress(sp.press);
            this.comboLeft = 0;
            this.cooldown = this.randInt(ai.attackCooldown, 8);
            return;
          }
        }
      }
    }

    // 4) Pick a spot: in attack range, or further back if others are crowding.
    const crowd = this.world.fighters.filter((o) =>
      o !== f && o.team === f.team && o.alive && !o.controller?.scared && Math.abs(o.x - target.x) < ai.attackRange + 25).length;
    const range = crowd >= ai.maxCrowd ? ai.waitRange : ai.attackRange;
    const side = Math.sign(dx) || 1;
    const wantX = target.x - side * range * 0.85;

    const inRange = adx <= ai.attackRange && adx >= ai.minRange;
    const aligned = Math.abs(dz) <= ai.alignZ;

    if (inRange && aligned && range === ai.attackRange) {
      if (this.cooldown <= 0 && target.alive && !target.invincible) {
        if (this.roll(9) < ai.heavyChance && this.canUse('heavy')) {
          this.registerPress('heavy');
          this.comboLeft = 0;
        } else {
          this.registerPress('attack');
          this.comboLeft = this.roll(10) < ai.comboChance ? (ai.comboLength ?? 1) : 0;
        }
        this.cooldown = this.randInt(ai.attackCooldown, 11);
      }
      return; // hold position
    }

    // 5) Walk toward the chosen spot.
    if (adx < ai.minRange) this.moveX = -side;
    else if (Math.abs(wantX - f.x) > 6) this.moveX = Math.sign(wantX - f.x);
    if (Math.abs(dz) > ai.alignZ * 0.5) this.moveZ = Math.sign(dz);
    this.terrainSteer(target);
  }

  // Ledges and pits (stage/Terrain.js): he never walks into a pit, never steps off a drop
  // unless the man he wants is down there, and hops up a ledge he can clear when the man
  // is up on it (or past it). One he can't clear, he waits at its foot.
  terrainSteer(target) {
    const T = this.world.terrain;
    const f = this.fighter;
    if (!T || !f.grounded) return;
    const look = 26;
    const s = f.stats;
    const apex = (s.jumpStrength ** 2) / (2 * s.gravity);
    const reach = s.walkSpeed * (2 * s.jumpStrength / s.gravity) * 0.9; // a running jump's length
    const pit = (x, z) => T.groundAt(x, z) < -1;
    const risky = (x, z) => {
      if (pit(x, z)) return true;
      const drop = f.floor - T.groundAt(x, z);
      return drop > 45 && !(target.floor < f.floor - 30); // a drop he has no reason for (the man he wants is not down there)
    };
    const dir = this.moveX || Math.sign(target.x - f.x);
    // a gap he can clear, with the man beyond it: he jumps it
    if (this.moveX && pit(f.x + dir * look, f.z) && !(this.hopCool > 0) && Math.sign(target.x - f.x) === dir) {
      for (let d = 30; d <= reach; d += 10) {
        const g = T.groundAt(f.x + dir * d, f.z);
        if (g < -1) continue;
        if (Math.abs(g - f.floor) <= 20 && d <= reach) {
          this.registerPress('jump');
          this.hopCool = 40;
          return;
        }
        break;
      }
    }
    if (this.moveX && risky(f.x + this.moveX * look, f.z)) this.moveX = 0;
    if (this.moveZ && risky(f.x, f.z + this.moveZ * look * 0.6)) this.moveZ = 0;
    if (this.hopCool > 0) { this.hopCool--; return; }
    const wall = T.wallAt(f.x + dir * 14, f.z, f.h);
    const wantsUp = target.floor > f.floor + 12 || (wall && Math.abs(target.x - f.x) > 40);
    if (wall && wantsUp && wall.top - f.h < apex * 0.92 && !risky(f.x + dir * 50, f.z)) {
      this.moveX = dir;
      this.registerPress('jump');
      this.hopCool = 40;
    }
  }


  // Scared: never attacks or blocks again. Runs from the player in a panicked zig-zag,
  // but can't get away — he stumbles and falls, the arena walls trap him, and once
  // he's put some distance between them he's too terrified to keep going and cowers,
  // until the player closes in and he bolts again.
  panic(target) {
    const f = this.fighter;
    const dx = target.x - f.x;
    const away = -(Math.sign(dx) || f.facing);
    this.facingHint = away;          // faces where he's running (the art looks back)
    this.comboLeft = 0;
    this.blockTimer = 0;
    this.scared = true;
    if (f.state !== 'idle' && f.state !== 'walk') return;

    const b = this.world.bounds;
    const wall = this.world.barriers?.between(f, f.x + away * 40);
    const cornered = (away < 0 && f.x <= b.minX + 14) || (away > 0 && f.x >= b.maxX - 14) || !!wall;
    const dist = Math.abs(dx);
    // too far to feel safe? no — too spent to keep running: cower until the killer comes
    if (this.cowering) this.cowering = dist > 170;
    else this.cowering = cornered || dist > 300;
    if (this.cowering) return;

    // run, zig-zagging in depth
    this.zigTimer = (this.zigTimer ?? 0) - 1;
    if (this.zigTimer <= 0) {
      this.zig = this.roll(12) < 0.5 ? -1 : 1;
      this.zigTimer = 18 + Math.floor(this.roll(13) * 40);
    }
    const bz = f.z + this.zig * 6;
    if (bz < b.minZ + 4 || bz > b.maxZ - 4) this.zig = -this.zig;
    // wounded and hobbling: well under half his speed, so he can't outrun anyone
    this.moveX = away * 0.4;
    this.moveZ = this.zig * 0.3;

    // ...and now and then he stumbles and goes down — rarely (once every ~20 s on
    // average), and never with you right on his heels, so a trip can't steal your finisher
    if (f.grounded !== false && dist > 220 && this.roll(14) < 0.0008) {
      f.fsm.change('knockdown', { vx: away * 150, vh: 170 });
    }
  }

  // Cut off by a barrier (combat/Barrier.js): stop a sensible way short of it — further
  // from fire — and pace there along its face, eyes on the man behind it, spread out so
  // the crowd doesn't stack. Brutes batter at a stone wall. The moment it's down his
  // normal brain takes over again (between() finds no wall).
  atWall(wall, target) {
    const f = this.fighter;
    const ai = this.ai;
    const side = wall.sides.get(f.id) ?? (Math.sign(f.x - wall.x) || 1);
    const fire = wall.kind === 'fire';
    const spread = (f.id % 4) * 16;
    const stand = wall.half + (fire ? 62 : 34) + spread;
    const t = this.world.frame;
    const pace = Math.sin(t * 0.025 + f.id * 1.7) * 12;
    const wantX = wall.x + side * (stand + pace);
    const wantZ = target.z + ((f.id % 5) - 2) * 26;
    this.facingHint = -side; // facing the wall and whoever's behind it
    this.comboLeft = 0;
    // a stone wall: everyone tries to smash it down (a few at a time, in turn — the rest
    // wait their go, spread along it)
    const reach = Math.abs(f.x - wall.x) - wall.half;
    if (!fire && wall.maxHp > 0) {
      const batterers = this.world.fighters.filter((o) => o.team === f.team && o.alive && o !== f &&
        Math.abs(o.x - wall.x) - wall.half <= ai.attackRange * 0.9 && (wall.sides.get(o.id) ?? 0) === side).length;
      const myTurn = batterers < 3 || reach <= ai.attackRange * 0.9;
      if (myTurn && reach <= ai.attackRange * 0.8) {
        if (Math.abs(target.z - f.z) > 40) this.moveZ = Math.sign(wantZ - f.z) * 0.3;
        if (this.cooldown <= 0) {
          this.registerPress(this.roll(30) < ai.heavyChance && this.canUse('heavy') ? 'heavy' : 'attack');
          this.cooldown = this.randInt(ai.attackCooldown, 31);
        }
        return;
      }
      if (myTurn && this.cooldown <= 0) { this.moveX = -side; return; } // close in to batter it
    }
    if (Math.abs(wantX - f.x) > 8) this.moveX = Math.sign(wantX - f.x) * 0.6;
    if (Math.abs(wantZ - f.z) > 10) this.moveZ = Math.sign(wantZ - f.z) * 0.5;
  }

  pickTarget() {
    const f = this.fighter;
    let best = null;
    let bestDist = Infinity;
    for (const p of this.world.livingPlayers()) {
      // (a hero he can actually reach comes before one behind a Mage's wall)
      const d = Math.abs(p.x - f.x) + Math.abs(p.z - f.z) + (this.world.barriers?.between(f, p.x) ? 5000 : 0);
      if (d < bestDist) { best = p; bestDist = d; }
    }
    return best;
  }
}

// opts.entering: he starts off-screen (offscreenX) and walks on before he fights.
export function createEnemy(world, typeId, x, z, opts = {}) {
  const stats = ENEMIES[typeId];
  const brain = new EnemyBrain(stats.ai);
  const f = new Fighter({ stats, team: 'enemy', x, z, controller: brain });
  brain.fighter = f;
  brain.world = world;
  f.facing = -1;
  if (opts.entering) {
    f.entering = true;
    f.unbounded = true; // (the bounds would snap him on-screen)
    f.facing = Math.sign(world.bounds.minX + world.bounds.maxX - 2 * x) || -1;
  }
  world.addFighter(f);
  brain.cooldown = brain.randInt(stats.ai.attackCooldown, 15);
  return f;
}
