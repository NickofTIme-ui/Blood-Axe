// fighterStates.js — Every state a fighter (player OR enemy) can be in.
//
//   idle, walk, jump, airAttack, light1, light2, light3, heavy,
//   block, parry, dodge, cast, hitstun, stagger, guardBreak,
//   knockdown, getup, dead
//
// States read the fighter's controller (keyboard or AI) and decide what happens.
// To add a new move: add its frame data to data/characters.js, then register a
// state here with makeAttackState('yourMoveKey').

import { SETTINGS } from '../config/settings.js';
import { movePhase, totalFrames, inWindow } from '../combat/MoveRunner.js';
import { FINISH, FINISHERS, CHAIN, IMPALE, impalePin, impalePierce, planFinisher, chainTimes } from '../combat/Finisher.js';
import { mageStates, isMageFinisher, mageFinisherStart, runMageFinisher } from '../combat/Mage.js';
import { rogueStates, isRogueFinisher, rogueFinisherStart, runRogueFinisher, vaultTarget } from '../combat/Rogue.js';

const FEEL = SETTINGS.feel;

// ---------------------------------------------------------------- helpers

function stopMoving(f) {
  f.vx = 0;
  f.vz = 0;
}

function friction(f, k) {
  f.vx *= k;
  f.vz *= k;
  if (Math.abs(f.vx) < 1) f.vx = 0;
  if (Math.abs(f.vz) < 1) f.vz = 0;
}

// Turn to face the way the stick/keys point (or where the AI wants to look).
function faceInput(f) {
  const c = f.controller;
  if (c.facingHint) f.facing = c.facingHint;
  else if (c.moveX) f.facing = Math.sign(c.moveX);
}

// While guarding, a left/right press whips the guard round to face that way.
// (Players only: enemies keep facing their target via facingHint.)
function guardTurn(f) {
  if (f.team !== 'player') return;
  const mx = f.controller.moveX;
  if (Math.abs(mx) > 0.5 && Math.sign(mx) !== f.facing) {
    f.facing = Math.sign(mx);
    f.guardSwap = 9; // frames of the swap animation (view)
    f.world?.events.emit('guardSwap', { fighter: f });
  }
}

// Coyote time: you may still jump for a few frames after leaving the ground
// without jumping. (The flat test arena has no ledges yet, but this is ready
// for pits and platforms.)
export function canJump(f) {
  if (f.grounded) return true;
  return !f.jumpedSinceGrounded && f.framesSinceGrounded <= FEEL.coyoteFrames;
}

export function startJump(f, isAirJump = false) {
  const c = f.controller;
  f.vh = f.stats.jumpStrength * (isAirJump ? 0.9 : 1);
  f.h = Math.max(f.h, 0.01); // leave the ground
  f.jumpedSinceGrounded = true;
  f.flipFrom = isAirJump ? f.world?.frame ?? 0 : null; // (view: the second jump is an acrobatic flip)
  f.world?.events.emit('jump', { fighter: f, airJump: isAirJump });
  f.vx = c.moveX * f.stats.walkSpeed;
  f.vz = c.moveZ * f.stats.depthSpeed;
  faceInput(f);
  f.fsm.change('jump');
}

// A move (or spell) that needs an arm the fighter has lost can't be used.
export function usable(f, move) {
  return !!move && !(move.needs && f.maimed?.[move.needs]);
}

// The state a button starts for this fighter: a hero's kit can replace the usual ones
// (stats.states — the Mage blinks instead of rolling, casts lightning as his heavy...).
export const stateFor = (f, name) => f.stats.states?.[name] ?? name;

// Enough stamina and mana for a move, and not cooling down (stats.states' kits use the
// cooldowns: f.cool[state] frames left).
export function ready(f, move, state) {
  return f.stamina >= (move.staminaCost ?? 0) && f.mana >= (move.manaCost ?? 0) && !(f.cool?.[state] > 0);
}

// Try to start an action from the controller's (buffered) input.
// `allowed` limits which actions may start — used for cancel windows.
// Order = priority when several buttons are buffered at once.
export function tryActions(f, allowed = null) {
  const ok = (a) => !allowed || allowed.includes(a);
  const c = f.controller;
  const s = f.stats;

  if (ok('dodge') && c.peek('dodge') && f.stamina >= s.dodge.cost && !(f.cool?.[stateFor(f, 'dodge')] > 0)) {
    c.consume('dodge');
    f.fsm.change(stateFor(f, 'dodge'));
    return true;
  }
  if (ok('block')) {
    if (c.consume('block')) { f.fsm.change('parry'); return true; } // fresh press = parry attempt
    if (c.isDown('block')) { f.fsm.change('block'); return true; }  // already held = plain block
  }
  if (ok('magic') && s.spell && c.peek('magic') && f.mana >= s.spell.cost && !(f.cool?.[stateFor(f, 'cast')] > 0)) {
    c.consume('magic');
    f.fsm.change(stateFor(f, 'cast'));
    return true;
  }
  // Behind a runner who's lost the will to fight: attack / heavy executes him instead
  // (combat/Finisher.js). No stamina cost — he's not fighting back.
  if (f.team === 'player' && f.world) {
    for (const button of ['heavy', 'attack', 'kick']) { // kick = the single passing slash
      if (!ok(button) || !c.peek(button)) continue;
      const plan = planFinisher(f, f.world.fighters, button);
      if (!plan) break;
      c.consume(button);
      f.fsm.change('execute', plan);
      return true;
    }
  }
  if (ok('heavy') && usable(f, s.moves.heavy) && c.peek('heavy') && ready(f, s.moves.heavy, stateFor(f, 'heavy'))) {
    c.consume('heavy');
    f.fsm.change(stateFor(f, 'heavy'));
    return true;
  }
  if (ok('kick') && usable(f, s.moves.kick) && ready(f, s.moves.kick, stateFor(f, 'kick')) && c.consume('kick')) {
    f.fsm.change(stateFor(f, 'kick'));
    return true;
  }
  // Enemy-only extra moves (hooks, charges, spins). Players have no button for these.
  for (const sp of ['special1', 'special2']) {
    if (ok(sp) && usable(f, s.moves[sp]) && c.peek(sp)) {
      c.consume(sp);
      f.fsm.change(sp);
      return true;
    }
  }
  if (ok('attack') && c.consume('attack')) {
    // Lost the arm that throws the opener? Skip straight to the next hit.
    f.fsm.change(usable(f, s.moves.light1) || !s.moves.light2 ? 'light1' : 'light2');
    return true;
  }
  if (ok('jump') && canJump(f) && c.consume('jump', FEEL.jumpBufferFrames)) {
    // the Rogue running at a teammate vaults off him instead (combat/Rogue.js)
    const ally = f.stats.kit?.vault ? vaultTarget(f) : null;
    if (ally) f.fsm.change('vault', { ally });
    else startJump(f);
    return true;
  }
  return false;
}

// Builds a ground attack state from a move's frame data.
function makeAttackState(moveKey) {
  return {
    enter(f) {
      stopMoving(f);
      faceInput(f);
      f.chargeHeld = 0;
      f.startMove(f.stats.moves[moveKey]);
      f.world.events.emit('attackStart', { fighter: f, state: moveKey, move: f.move }); // sound on the button press
    },
    update(f, frame) {
      const m = f.move;
      const c = f.controller;
      const phase = movePhase(m, frame);

      // Roll cancel (stats.rollCancel): a roll interrupts a sword swing at ANY point —
      // wind-up, strike or recovery — for the usual stamina. Not the kick (a commitment).
      if (f.stats.rollCancel && moveKey !== 'kick' && tryActions(f, ['dodge'])) return;

      // HOLD attack (players with a charge move): the tap slash always fires at once,
      // untouched. Keep the button held through it (stats.charge.holdFrames) and once
      // the slash has swung he flows straight into the two-handed charge.
      const ch = f.stats.charge;
      if (ch && moveKey === 'light1' && f.team === 'player') {
        if (c.isDown('attack')) f.chargeHeld = (f.chargeHeld ?? 0) + 1;
        else f.chargeHeld = -999; // let go: this press was a tap
        if (f.chargeHeld >= ch.holdFrames && phase === 'recovery') { f.fsm.change('charge'); return; }
      }

      // Step forward during the swing, then slide to a stop.
      // `recoil` = rock back during the wind-up, then the lunge fires on the active frames
      // (a push from behind, like the Sparta kick).
      if (m.recoil && phase === 'startup') f.vx = -f.facing * m.recoil;
      else if (m.recoil && phase === 'active') f.vx = f.facing * m.lunge;
      else if (!m.recoil && phase !== 'recovery' && m.lunge) f.vx = f.facing * m.lunge;
      else friction(f, 0.7);

      // The hitbox only exists during active frames.
      f.activeAttack = phase === 'active' ? f.attackInfo : null;
      if (frame === m.startup + 1) f.world.events.emit('swing', { fighter: f, move: m });
      // swung and hit nothing
      if (frame === m.startup + m.active + 1 && f.attackInfo.hitList.size === 0) {
        f.world.events.emit('whiff', { fighter: f, move: m, state: f.state });
      }

      // Combo chains (e.g. light1 -> light2 -> light3).
      for (const ch of m.chains ?? []) {
        if (!inWindow(ch, frame)) continue;
        const next = f.stats.moves[ch.next];
        const into = stateFor(f, ch.next);
        if (usable(f, next) && ready(f, next, into) && c.consume(ch.button)) {
          f.fsm.change(into);
          return;
        }
      }

      // Cancel windows (e.g. dodge out of recovery).
      for (const win of m.cancels ?? []) {
        if (inWindow(win, frame) && tryActions(f, win.into)) return;
      }

      if (frame >= totalFrames(m)) f.fsm.change('idle');
    },
    exit(f) {
      f.activeAttack = null;
    },
  };
}

// A simple "stunned for N frames" state (hitstun, stagger, guard break).
function makeStunState() {
  return {
    enter(f, p) {
      f.stunFrames = p.frames ?? 20;
    },
    update(f, frame) {
      friction(f, 0.85);
      if (frame >= f.stunFrames) f.fsm.change('idle');
    },
  };
}

// ---------------------------------------------------------------- executions

// A kill event for an execution (same shape as CombatSystem's, so kill counters and
// effects hear it) — `finisher` tells the gore layer it's handled elsewhere.
function executionKill(f, v, kind, dir) {
  const e = {
    attacker: f, defender: v, dir, kind: 'melee', finisher: kind,
    move: { cut: 'slash', damage: v.stats.maxHealth, hitstop: 10 },
    x: v.x, z: v.z, h: v.h + v.stats.body.h * 0.6, damage: v.stats.maxHealth, fatality: 'none',
  };
  v.fatality = 'none';
  f.world.events.emit('kill', e);
}

// One beat of a finisher's timeline (see FINISHERS in combat/Finisher.js).
function finisherBeat(f, ex, type, v) {
  const dir = f.facing;
  const ev = { attacker: f, victim: v, kind: ex.kind, type, dir };
  switch (type) {
    case 'slit':  // the blade opens his throat — he's dead on his feet, held a moment longer
      v.health = 0;
      f.hitstop = v.hitstop = 8;
      break;
    case 'stab':  // run through from behind: a short, hard freeze at the deepest point
      v.health = 0;
      v.execRun = false;
      f.hitstop = v.hitstop = IMPALE.hitstop;
      break;
    case 'sever': // cut in half at the waist; the top half stays sitting on the legs
      v.health = 0;  //   (the view splits him: effects/SpriteCut.js)
      v.execCut = 'waistPerch';
      f.hitstop = v.hitstop = 8;
      break;
    case 'drop':
      v.execRelease = { vx: dir * 30, vh: 70 };
      executionKill(f, v, ex.kind, dir);
      break;
    case 'kick':  // booted off the blade into whoever's in front of him
      v.execRelease = { vx: dir * 480, vh: 230, bowl: true };
      f.hitstop = 6;
      executionKill(f, v, ex.kind, dir);
      break;
    case 'boot':  // the top half gets punted off the legs; the fighter himself is done
      v.execRelease = { dead: true };
      f.hitstop = 6;
      executionKill(f, v, ex.kind, dir);
      break;
    case 'chainHit': { // the blade connects: he's dead, struck, still in one piece — a short freeze
      const i = ex.targets.indexOf(v);
      const last = i === ex.targets.length - 1;
      ev.style = ex.times.styles[i];
      ev.index = i;
      ev.last = last;
      ev.count = ex.targets.length;
      v.health = 0;
      v.execRun = false;
      v.execStruck = { style: ev.style, dir };
      f.hitstop = v.hitstop = last && ex.targets.length > 2 ? CHAIN.hitstopLast : CHAIN.hitstop;
      break;
    }
    case 'chainCut': { // ...and only now, the blade through and gone, does he come apart
      const i = ex.targets.indexOf(v);
      ev.style = ex.times.styles[i];
      v.execStyle = ev.style;
      v.execCut = CHAIN.cut[ev.style];
      v.execRelease = { dead: true };
      executionKill(f, v, 'chain', dir);
      break;
    }
  }
  f.world.events.emit('finisherBeat', ev);
}

// Chain execution: dash to each runner in turn, cut him down, spin 360 into the next.
function runChain(f, ex, frame) {
  const { starts, cuts } = ex.times;
  let i = 0;
  while (i < cuts.length - 1 && frame >= starts[i + 1]) i++;
  const v = ex.targets[i];
  if (!ex.seg || ex.seg.i !== i) {
    const side = Math.sign(v.x - f.x) || f.facing;
    ex.seg = { i, x: f.x, z: f.z, side };
  }
  // the men he hasn't reached yet are still running for their lives (where they really
  // are is where he goes: nobody is moved into place for him)
  const b = f.world.bounds;
  ex.targets.forEach((r, k) => {
    r.execRun = false;
    if (r.health > 0 && r.execVx && frame < cuts[k]) {
      r.x = Math.max(b.minX, Math.min(b.maxX, r.x + (r.execVx / 60) * 0.45));
      r.execRun = true;
    }
  });
  const s = ex.seg;
  if (frame >= starts[i] && frame <= cuts[i]) {
    const t = Math.min(1, (frame - starts[i]) / Math.max(1, cuts[i] - starts[i]));
    // first dash and the last lunge arrive hard; the spin accelerates out of the turn
    const e = i === 1 ? t * t * (3 - 2 * t) : 1 - (1 - t) ** 2;
    f.facing = s.side;
    f.x = s.x + (v.x - s.side * CHAIN.gap - s.x) * e;
    f.z = s.z + (v.z - s.z) * e;
  } else if (frame > cuts[i] && frame <= cuts[i] + 8) {
    f.x += f.facing * (8 - (frame - cuts[i])) * 0.5; // the stroke carries him on through
  }
  for (let k = 0; k < cuts.length; k++) {
    if (frame >= cuts[k] && !ex.fired.has(`hit${k}`)) { ex.fired.add(`hit${k}`); finisherBeat(f, ex, 'chainHit', ex.targets[k]); }
    if (frame >= cuts[k] + CHAIN.split && !ex.fired.has(`cut${k}`)) { ex.fired.add(`cut${k}`); finisherBeat(f, ex, 'chainCut', ex.targets[k]); }
  }
  ex.chainIndex = i;
  if (frame >= ex.total) f.fsm.change('idle');
}

// ---------------------------------------------------------------- states

export const FIGHTER_STATES = {
  idle: {
    enter(f) { stopMoving(f); },
    update(f) {
      if (!f.grounded) return f.fsm.change('jump');
      if (f.controller.facingHint) f.facing = f.controller.facingHint;
      if (tryActions(f)) return;
      if (f.controller.moveX || f.controller.moveZ) f.fsm.change('walk');
    },
  },

  walk: {
    update(f) {
      const c = f.controller;
      if (!f.grounded) return f.fsm.change('jump');
      if (tryActions(f)) return;
      if (!c.moveX && !c.moveZ) return f.fsm.change('idle');
      f.vx = c.moveX * f.stats.walkSpeed;
      f.vz = c.moveZ * f.stats.depthSpeed;
      faceInput(f);
    },
  },

  jump: {
    enter(f) { f.airAttackUsed = false; },
    update(f) {
      const c = f.controller;
      const s = f.stats;
      if (f.grounded) {
        f.world.events.emit('jumpLand', { fighter: f });
        return f.fsm.change('idle'); // landed (buffered jump fires from idle)
      }

      // Air steering: holding a direction pulls him that way (and turns him to face it), so
      // a jump can be bent back the way it came; hands off, he keeps the speed he left with
      if (c.moveX) {
        f.vx += (c.moveX * s.walkSpeed - f.vx) * s.airControl;
        f.facing = Math.sign(c.moveX);
      }
      if (c.moveZ) f.vz += (c.moveZ * s.depthSpeed - f.vz) * s.airControl;

      if (canJump(f) && c.consume('jump', FEEL.jumpBufferFrames)) return startJump(f); // coyote jump
      if (f.airJumpsLeft > 0 && c.consume('jump')) {                                   // double jump
        f.airJumpsLeft--;
        return startJump(f, true);
      }
      // the Mage blinks out of a jump (once per time in the air)
      if (s.states?.dodge === 'blink' && !f.airBlinked && f.stamina >= s.dodge.cost && c.consume('dodge')) return f.fsm.change('blink');
      // a hero kit's air moves (the Rogue: magic = shuriken fan, heavy = falling viper)
      const am = s.states?.airMagic;
      if (am && !f.fanUsed && !(f.cool[am] > 0) && c.consume('magic')) return f.fsm.change(am);
      const ah = s.states?.airHeavy;
      if (ah && f.h >= (s.kit?.dive?.minHeight ?? 0) && c.consume('heavy')) return f.fsm.change(ah);
      if (!f.airAttackUsed && s.moves.air && c.consume('attack')) f.fsm.change('airAttack');
    },
  },

  airAttack: {
    enter(f) {
      f.startMove(f.stats.moves.air);
      f.world.events.emit('attackStart', { fighter: f, state: 'airAttack', move: f.move });
    },
    update(f, frame) {
      const m = f.move;
      if (f.grounded) {
        f.world.events.emit('jumpLand', { fighter: f });
        return f.fsm.change('idle');
      }
      f.activeAttack = movePhase(m, frame) === 'active' ? f.attackInfo : null;
      // the Rogue can still dive out of an air slash
      const ah = f.stats.states?.airHeavy;
      if (ah && f.h >= (f.stats.kit?.dive?.minHeight ?? 0) && f.controller.consume('heavy')) f.fsm.change(ah);
    },
    exit(f) {
      f.activeAttack = null;
      f.airAttackUsed = true;
    },
  },

  light1: makeAttackState('light1'),
  light2: makeAttackState('light2'),
  light3: makeAttackState('light3'),
  light4: makeAttackState('light4'), // (the Rogue's fourth hit)
  heavy: makeAttackState('heavy'),
  kick: makeAttackState('kick'),
  special1: makeAttackState('special1'),
  special2: makeAttackState('special2'),

  // Loading the power thrust: both hands on the hilt, coiling back. Full power after
  // stats.charge.fullFrames; releasing the button fires the thrust (weaker if early).
  // Dodge and block can still bail out of it.
  charge: {
    enter(f) {
      stopMoving(f);
      faceInput(f);
      f.chargeFull = false;
      f.move = null;
      f.activeAttack = null;
      f.world.events.emit('chargeStart', { fighter: f });
    },
    update(f, frame) {
      const ch = f.stats.charge;
      // he can inch forward while loading it (to close on a runner) — a slow, planted creep
      const c = f.controller;
      f.vx = c.moveX * f.stats.walkSpeed * 0.3;
      f.vz = c.moveZ * f.stats.depthSpeed * 0.3;
      f.chargeT = frame;
      if (!f.chargeFull && frame >= ch.fullFrames) {
        f.chargeFull = true;
        f.world.events.emit('chargeFull', { fighter: f });
      }
      if (tryActions(f, ['dodge', 'block'])) return;
      if (!f.controller.isDown('attack')) {
        const level = Math.max(ch.minLevel, Math.min(1, frame / ch.fullFrames));
        f.fsm.change('thrust', { level });
      }
    },
  },

  // The impaling power thrust. A copy of the move scaled by charge level; the hitbox
  // grows forward as the blade drives out, so enemies in a line are run through in turn.
  thrust: (() => {
    const base = makeAttackState('thrust');
    return {
      ...base,
      enter(f, p) {
        stopMoving(f);
        const lv = p.level ?? 1;
        const src = f.stats.moves.thrust;
        const m = {
          ...src,
          level: lv,
          damage: Math.round(src.damage * (0.45 + 0.55 * lv)),
          hitstop: Math.round(src.hitstop * (0.6 + 0.4 * lv)),
          lunge: src.lunge * (0.6 + 0.4 * lv),
          knockback: { ...src.knockback, x: src.knockback.x * (0.5 + 0.5 * lv) },
          knockdown: lv >= 1,
          breaksGuard: lv >= 1 && src.breaksGuard,
          hitbox: { ...src.hitbox, w: src.hitbox.w * (0.72 + 0.28 * lv) },
        };
        f.startMove(m);
        f.world.events.emit('attackStart', { fighter: f, state: 'thrust', move: m, level: lv });
      },
      update(f, frame) {
        const m = f.move;
        const hb = m.hitbox;
        if (hb.grow && f.attackInfo) {
          // the blade's reach runs out over the first part of the active frames
          const t = Math.max(0, Math.min(1, (frame - m.startup) / Math.max(1, m.active * 0.6)));
          f.attackInfo.hitbox = { ...hb, w: hb.w * (hb.grow + (1 - hb.grow) * t) };
        }
        base.update(f, frame);
      },
    };
  })(),

  // ---- Executions (combat/Finisher.js). The executioner drives the whole thing: he
  // moves into place, fires the timeline's beats, and tells the victims what to do.
  execute: {
    enter(f, plan) {
      stopMoving(f);
      // (the gap starts at where he really is, so nobody snaps into place)
      const d0 = plan.kind === 'chain' ? 32 : Math.max(24, Math.min(FINISH.reach, Math.abs(plan.targets[0].x - f.x)));
      const ex = { kind: plan.kind, targets: plan.targets, fired: new Set(), from: { x: f.x, z: f.z }, gap: d0 };
      if (ex.kind === 'chain') {
        ex.times = chainTimes(ex.targets.length);
        ex.total = ex.times.total;
      } else if (isMageFinisher(ex.kind)) {
        mageFinisherStart(f, ex); // (combat/Mage.js)
      } else if (isRogueFinisher(ex.kind)) {
        rogueFinisherStart(f, ex); // (combat/Rogue.js)
      } else {
        ex.total = FINISHERS[ex.kind === 'pending' ? 'throat' : ex.kind].total;
        f.facing = ex.targets[0].facing; // right behind him, looking the way he's running
      }
      f.exec = ex;
      f.activeAttack = null;
      f.move = null;
      ex.targets.forEach((v, i) => v.fsm.change('executed', { by: f, index: i }));
      f.world.events.emit('finisherStart', { attacker: f, kind: ex.kind, targets: ex.targets });
    },
    update(f, frame) {
      const ex = f.exec;
      f.invincible = true;
      f.vx = 0; f.vz = 0;
      if (ex.kind === 'chain') return runChain(f, ex, frame);
      if (ex.mage) return runMageFinisher(f, ex, frame);
      if (ex.rogue) return runRogueFinisher(f, ex, frame);

      // tapped or held? (decided while he closes in)
      if (ex.kind === 'pending') {
        if (!f.controller.isDown('attack')) ex.kind = 'throat';
        else if (frame >= FINISH.holdFrames) ex.kind = 'impale';
        if (ex.kind !== 'pending') {
          ex.total = FINISHERS[ex.kind].total;
          f.world.events.emit('finisherKind', { attacker: f, kind: ex.kind });
        }
      }
      const F = FINISHERS[ex.kind === 'pending' ? 'throat' : ex.kind];
      const v = ex.targets[0];
      const dir = f.facing;
      const impale = ex.kind === 'impale';
      const stabbed = impale && ex.fired.has('stab');
      // He's still RUNNING when you catch him: he carries on a few stumbling strides,
      // slowing, until the grab (throat) or the blade (impale) stops him.
      v.execRun = false;
      if ((ex.kind === 'pending' || (impale && !stabbed)) && v.execVx) {
        const k = Math.max(0.3, 1 - frame / IMPALE.stab);
        const b = f.world.bounds;
        v.x = Math.max(b.minX, Math.min(b.maxX, v.x + (v.execVx / 60) * k));
        v.execRun = true;
      }
      // impale: sword arm drawn back a pace behind him, then the whole body drives in
      const want = ex.kind === 'pending' ? 60 : impale ? (frame < IMPALE.stab - 4 ? 104 : F.gap) : F.gap;
      ex.gap += (want - ex.gap) * (impale && frame >= IMPALE.stab - 4 ? 0.6 : 0.35);
      const held = !ex.fired.has('drop') && !ex.fired.has('kick') && !ex.fired.has('boot');
      if (held && !stabbed) {
        const t = Math.min(1, frame / F.approach);
        const e = 1 - (1 - t) ** 3;
        f.x = ex.from.x + (v.x - dir * ex.gap - ex.from.x) * e;
        f.z = ex.from.z + (v.z - ex.from.z) * e;
      }
      // impale: from the stab to the boot he is locked to the blade — Ulric's feet are
      // planted and the body goes exactly where the sword takes it (never the reverse)
      if (stabbed && !ex.fired.has('kick')) {
        const pin = impalePin(frame);
        v.x = f.x + dir * pin.x;
        v.z = f.z;
        v.liftH = Math.max(0, pin.y - impalePierce(v));
      }
      if (ex.kind !== 'pending') {
        for (const b of F.beats) {
          if (frame >= b.at && !ex.fired.has(b.type)) { ex.fired.add(b.type); finisherBeat(f, ex, b.type, v); }
        }
      }
      if (frame >= ex.total) f.fsm.change('idle');
    },
    exit(f) {
      // cut short somehow: let go of anyone still held
      for (const v of f.exec?.targets ?? []) {
        if (v.state === 'executed') v.execRelease = v.health > 0 ? { vx: 0, vh: 0, free: true } : { dead: true };
      }
      f.exec = null;
      f.blinkGone = false;
    },
  },

  // Held by an executioner: frozen, can't be touched by anything else, and does
  // whatever the executioner's beats say (lifted on the blade, dropped, kicked...).
  executed: {
    enter(f, p) {
      // how fast he was fleeing (the executioner lets him run on a few strides)
      f.execVx = f.vx * f.facing > 0 ? Math.sign(f.vx) * Math.min(Math.abs(f.vx), 260) : 0;
      f.execRun = false;
      f.execStruck = null;
      f.execStyle = null;
      stopMoving(f);
      f.execBy = p.by;
      f.execIndex = p.index ?? 0;
      f.liftH = 0;
      f.execRelease = null;
      f.execCut = null;
      f.execFlinch = false;
      f.execStopped = false;
      f.ruptureCrush = 0;
      f.activeAttack = null;
    },
    update(f) {
      f.invincible = true;
      f.vx = 0; f.vz = 0;
      f.h = f.liftH ?? 0;
      f.vh = f.h > 0 ? f.stats.gravity / 60 : 0; // held up: cancel this step's gravity
      const r = f.execRelease;
      if (r) {
        f.execRelease = null;
        if (r.dead) return f.fsm.change('dead');
        if (r.free) return f.fsm.change('idle');
        if (r.burn) return f.fsm.change('burning', { dir: r.dir ?? f.facing }); // (the Mage's Gate of Embers)
        f.fsm.change('knockdown', { vx: r.vx, vh: r.vh });
        if (r.bowl) f.bowl = { frames: 40, dir: Math.sign(r.vx), hit: new Set([f.id]) };
        return;
      }
      if (f.execBy?.state !== 'execute') f.fsm.change(f.health > 0 ? 'idle' : 'dead');
    },
    exit(f) { f.liftH = 0; f.shock = 0; },
  },

  // Holding block. Hits from the front deal reduced damage and drain stamina.
  // Pressing left/right while blocking swings the guard round to that side.
  block: {
    enter(f) {
      stopMoving(f);
      if (f.controller.facingHint) f.facing = f.controller.facingHint;
      f.guardSwap = 0;
    },
    update(f) {
      f.guarding = true;
      friction(f, 0.8);
      if (f.guardSwap > 0) f.guardSwap--;
      guardTurn(f);
      if (f.blockstun > 0) { f.blockstun--; return; } // can't let go mid-impact
      if (tryActions(f, ['dodge', 'kick'])) return;
      if (!f.controller.isDown('block')) f.fsm.change('idle');
    },
  },

  // The first few frames of a fresh block press. A hit landing now is PARRIED.
  parry: {
    enter(f) {
      stopMoving(f);
      f.parryActive = true;
      if (f.controller.facingHint) f.facing = f.controller.facingHint;
    },
    update(f, frame) {
      const s = f.stats;
      f.guarding = true;
      if (f.guardSwap > 0) f.guardSwap--;
      guardTurn(f);
      f.parryActive = frame <= s.parryWindow;
      if (f.parryActive) return;
      if (f.controller.isDown('block')) return f.fsm.change('block');
      // Tapped block and nothing came: short vulnerable recovery (stops parry spam).
      if (frame > s.parryWindow + s.parryWhiffRecovery) f.fsm.change('idle');
    },
    exit(f) { f.parryActive = false; },
  },

  dodge: {
    enter(f) {
      const c = f.controller;
      const d = f.stats.dodge;
      f.spendStamina(d.cost);
      let dx = c.moveX;
      let dz = c.moveZ;
      if (!dx && !dz) dx = f.facing; // no direction held: roll forward
      const len = Math.hypot(dx, dz);
      f.vx = (dx / len) * d.speed;
      f.vz = (dz / len) * d.speed * 0.75;
      // which roll animation: up the screen (away), down (toward us) or sideways
      f.dodgeDir = Math.abs(dz) > Math.abs(dx) * 1.2 ? (dz < 0 ? 'up' : 'down') : 'side';
      if (f.dodgeDir === 'side' && dx) f.facing = Math.sign(dx);
      f.invincible = true;
    },
    update(f, frame) {
      const d = f.stats.dodge;
      f.invincible = frame <= d.iframes;
      if (frame === 4) f.world.events.emit('roll', { fighter: f }); // shoulder hits the floor
      if (frame >= d.duration) stopMoving(f);
      if (frame >= d.duration + d.recovery) f.fsm.change('idle');
    },
  },

  cast: {
    enter(f) {
      stopMoving(f);
      faceInput(f);
      f.mana -= f.stats.spell.cost;
    },
    update(f, frame) {
      const sp = f.stats.spell;
      if (frame === sp.startup) f.world.spawnSpell(f, sp);
      for (const win of sp.cancels ?? []) {
        if (inWindow(win, frame) && tryActions(f, win.into)) return;
      }
      if (frame >= sp.startup + sp.recovery) f.fsm.change('idle');
    },
  },

  hitstun: makeStunState(),
  stagger: makeStunState(),    // after being parried: open to a counter-hit
  guardBreak: makeStunState(), // block broken: open to a counter-hit

  knockdown: {
    enter(f, p) {
      f.vx = p.vx ?? 0;
      f.vz = 0;
      f.vh = p.vh ?? 250;
      f.h = Math.max(f.h, 0.01);
      f.lyingSince = null;
    },
    update(f, frame) {
      if (f.lyingSince === null) {
        // Still flying through the air.
        if (f.grounded && frame > 1) {
          f.lyingSince = frame;
          f.world.events.emit('landHard', { fighter: f });
          if (f.health <= 0) return f.fsm.change('dead');
        }
        return;
      }
      // Lying on the ground: players can't be hit while down; enemies CAN (finish them).
      f.invincible = f.team === 'player';
      friction(f, 0.8);
      if (frame - f.lyingSince >= f.stats.knockdownFrames) f.fsm.change('getup');
    },
  },

  getup: {
    enter(f) { stopMoving(f); },
    update(f, frame) {
      f.invincible = true;
      if (frame >= f.stats.getupFrames) f.fsm.change('idle');
    },
  },

  // Killed by fire: alight and on his feet for a moment — recoiling from the heat,
  // staggering, convulsing — then he goes down and the body keeps burning
  // (effects/Burn.js does the charring; this is only how he dies).
  burning: {
    enter(f, p) {
      stopMoving(f);
      f.activeAttack = null;
      f.move = null;
      f.burnDir = p?.dir ?? f.facing;
    },
    update(f, frame) {
      f.invincible = true;
      f.vz = 0;
      // recoil away from the flames, then lurching about
      f.vx = frame < 10 ? f.burnDir * 90 : Math.sin(frame * 0.42) * 55;
      if (frame >= 50) f.fsm.change('knockdown', { vx: f.burnDir * 40, vh: 110 });
    },
  },

  dead: {
    enter(f) {
      stopMoving(f);
      f.dead = true;
      f.activeAttack = null;
      f.deadAge = 0;
    },
    update(f) {
      f.invincible = true;
      // a corpse that's alight stays until it has burnt out; a charred one lingers longer
      if (!(f.burn && (f.burn.lit || f.burn.cool > 0))) f.deadAge++;
      if (f.team === 'enemy' && f.deadAge > (f.burn?.heat > 0.3 ? 420 : 150)) f.removeMe = true; // corpse fades, then removed
    },
  },
};

// The Mage's own states (combat/Mage.js), handed the helpers they share with these.
Object.assign(FIGHTER_STATES, mageStates({ tryActions, stopMoving, friction, faceInput }));
// ...and the Rogue's (combat/Rogue.js)
Object.assign(FIGHTER_STATES, rogueStates({ tryActions, stopMoving, friction, faceInput, makeAttackState }));
