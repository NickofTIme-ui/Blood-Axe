// Rogue.js — The Rogue's kit, as game logic (no drawing: effects/RogueFX.js shows it).
// Her buttons map to these states through stats.states (fighterStates.js stateFor):
//
//   heavy        -> viper   VIPER STRIKE: tiny crouch, burst through the enemy, strike in passing
//   kick         -> rkick   crescent kick; down+kick = low sweep; nobody in reach = KNIFE throw
//   magic        -> mine    drop a WIDOW MINE without breaking stride (combat/Mine.js)
//   jump at an ally        VAULT off his shoulder, far higher than a jump
//   in the air: magic -> fan   SHURIKEN FAN (DEATH FROM ABOVE near the top of a vault)
//               heavy -> dive  FALLING VIPER onto a man below
//
// EXPOSED and the SHADOW WINDOW (perfect dodge) live in combat/CombatSystem.js, which reads
// stats.kit.expose / stats.kit.shadow.
//
// Behind runners, her finishers (ROGUE_FINISHERS): attack PHANTOM REQUIEM, heavy BLACK
// LOTUS, kick SCARLET SKY — each for one, two or three runners.
//
// Every outcome uses the world's dice or none, so online games stay in step.

const kitOf = (f) => f.stats.kit;
const clampX = (w, x) => Math.max(w.bounds.minX, Math.min(w.bounds.maxX, x));
const clampZ = (w, z) => Math.max(w.bounds.minZ, Math.min(w.bounds.maxZ, z));
const BAD = ['knockdown', 'getup', 'dead', 'executed', 'execute', 'blink', 'burning'];

function foes(f) {
  return f.world.fighters.filter((e) => e.team !== f.team && e.alive && !e.removeMe && !['executed', 'dead'].includes(e.state));
}

// A projectile from her hand toward a point (x, z, h), at `speed`.
function throwAt(f, data, from, to, speed) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dh = to.h - from.h;
  const d = Math.hypot(dx, dz, dh) || 1;
  return f.world.spawnProjectile(f, data, {
    x: from.x, z: from.z, h: from.h,
    vx: dx / d * speed, vz: dz / d * speed, vh: dh / d * speed,
  });
}

// ---------------------------------------------------------------- ally vault

// The teammate she can vault off right now, or null: close, in front of her, standing,
// and she's moving toward him. (No ally — or a bad angle — and jump is just a jump.)
export function vaultTarget(f) {
  const V = kitOf(f)?.vault;
  if (!V || !f.grounded || !f.world) return null;
  const toward = f.vx * f.facing;
  if (toward < V.approach * f.stats.walkSpeed) return null;
  const now = f.world.frame;
  let best = null;
  for (const a of f.world.fighters) {
    if (a === f || a.team !== f.team || !a.alive || !a.grounded || BAD.includes(a.state)) continue;
    const dx = (a.x - f.x) * f.facing;
    if (dx < 6 || dx > V.range || Math.abs(a.z - f.z) > V.depth) continue;
    if ((f.vaultCool?.[a.id] ?? -1e9) > now) continue;
    if (!best || dx < (best.x - f.x) * f.facing) best = a;
  }
  return best;
}

// ---------------------------------------------------------------- the states

export function rogueStates({ tryActions, stopMoving, friction, faceInput, makeAttackState }) {
  const kick = makeAttackState('kick');
  const sweep = makeAttackState('sweep');
  return {
    // VIPER STRIKE: a crouch of a few frames, then she bursts THROUGH him (she isn't
    // pushed aside by the bodies she passes), the blades crossing as she goes, up to
    // kit.viper.maxTargets men in a line. Not a teleport: she covers the ground.
    viper: {
      enter(f) {
        stopMoving(f);
        faceInput(f);
        f.startMove({ ...f.stats.moves.heavy, maxTargets: kitOf(f).viper.maxTargets });
        f.world.events.emit('attackStart', { fighter: f, state: 'viper', move: f.move });
      },
      update(f, frame) {
        const m = f.move;
        const ph = frame <= m.startup ? 'startup' : frame <= m.startup + m.active ? 'active' : 'recovery';
        if (ph === 'startup') f.vx = 0;
        else if (ph === 'active') f.vx = f.facing * m.lunge;
        else friction(f, 0.6);
        f.vz = 0;
        f.activeAttack = ph === 'active' ? f.attackInfo : null;
        if (frame === m.startup + 1) f.world.events.emit('swing', { fighter: f, move: m });
        for (const win of m.cancels ?? []) {
          if (frame >= win.from && frame <= win.to && tryActions(f, win.into)) return;
        }
        if (frame >= m.startup + m.active + m.recovery) f.fsm.change('idle');
      },
      exit(f) { f.activeAttack = null; },
    },

    // KICK button: down = low sweep; an enemy in reach ahead = crescent kick; nobody in
    // reach but someone in range = a throwing knife; otherwise the kick anyway.
    rkick: {
      enter(f) {
        const K = kitOf(f).knife;
        const c = f.controller;
        if (c.moveZ > 0.5) return f.fsm.change('sweep');
        faceInput(f);
        const ahead = foes(f).map((e) => ({ e, dx: (e.x - f.x) * f.facing, dz: Math.abs(e.z - f.z) }));
        const close = ahead.some((o) => o.dx > -10 && o.dx < K.kickReach && o.dz < 30);
        const far = ahead.filter((o) => o.dx >= K.kickReach && o.dx <= K.range && o.dz < 80).sort((a, b) => a.dx - b.dx)[0];
        if (!close && far && !(f.cool.knife > 0)) return f.fsm.change('knife', { target: far.e });
        f.fsm.change('kick');
      },
    },
    kick,
    sweep,

    // KNIFE: a quick draw from the thigh, the arm snaps, the blade spins away.
    knife: {
      enter(f, p) {
        stopMoving(f);
        f.knifeTarget = p.target ?? null;
        if (f.knifeTarget) f.facing = Math.sign(f.knifeTarget.x - f.x) || f.facing;
        f.cool.knife = kitOf(f).knife.cooldown;
        f.world.events.emit('attackStart', { fighter: f, state: 'knife' });
      },
      update(f, frame) {
        const K = kitOf(f).knife;
        friction(f, 0.7);
        if (frame === K.startup) {
          const t = f.knifeTarget;
          const from = { x: f.x + f.facing * 20, z: f.z, h: K.projectile.y };
          const to = t?.alive ? { x: t.x, z: t.z, h: t.h + t.stats.body.h * 0.55 } : { x: f.x + f.facing * K.range, z: f.z, h: K.projectile.y };
          throwAt(f, K.projectile, from, to, K.projectile.speed);
          f.world.events.emit('knifeThrow', { fighter: f });
        }
        if (frame > K.startup && tryActions(f, ['dodge', 'jump'])) return;
        if (frame >= K.startup + K.recovery) f.fsm.change('idle');
      },
    },

    // WIDOW MINE: dropped at her feet on the move — she never stops. (One tick in this
    // state, then straight back to running or standing.)
    mine: {
      enter(f) {
        const K = kitOf(f).mine;
        f.cool.mine = K.cooldown;
        f.mineDropAt = f.world.frame;
        f.world.mines.drop(f, clampX(f.world, f.x - f.facing * 6), f.z, K);
      },
      update(f) {
        f.fsm.change(f.controller.moveX || f.controller.moveZ ? 'walk' : 'idle');
      },
    },

    // ALLY VAULT: a foot on his shoulder for a few frames, then launched far above a
    // normal jump. The ally feels nothing: he isn't moved, hit or interrupted.
    vault: {
      enter(f, p) {
        const V = kitOf(f).vault;
        const a = p.ally;
        f.vaultAlly = a;
        f.vaultFrom = { x: f.x, z: f.z };
        f.vaultCool = { ...(f.vaultCool ?? {}), [a.id]: f.world.frame + V.cooldown };
        f.vaultDir = Math.sign(a.x - f.x) || f.facing;
        f.facing = f.vaultDir;
        stopMoving(f);
        f.world.events.emit('vaultPlant', { fighter: f, ally: a });
      },
      update(f, frame) {
        const V = kitOf(f).vault;
        const a = f.vaultAlly;
        f.invincible = true;
        f.vx = 0; f.vz = 0;
        const t = Math.min(1, frame / V.plant);
        // up onto his shoulder (wherever he is now: he may be moving)
        f.x = f.vaultFrom.x + (a.x - f.vaultDir * 12 - f.vaultFrom.x) * t;
        f.z = f.vaultFrom.z + (a.z - f.vaultFrom.z) * t;
        f.h = Math.max(f.h, a.stats.body.h * 0.72 * t);
        f.vh = f.stats.gravity / 60; // (held there: cancel this step's gravity)
        if (frame >= V.plant) {
          f.vh = V.launch;
          f.vx = f.vaultDir * V.forward;
          f.jumpedSinceGrounded = true;
          f.vaultApexAt = f.world.frame + Math.round((V.launch / f.stats.gravity) * 60);
          f.world.events.emit('vaultLaunch', { fighter: f, ally: a });
          f.fsm.change('jump');
        }
      },
    },

    // SHURIKEN FAN: she hangs a moment, turns, and whips a fan of stars down at the men
    // below — or, at the top of a vault, DEATH FROM ABOVE: twice as many, twice as wide.
    fan: {
      enter(f) {
        const K = kitOf(f).fan;
        const V = kitOf(f).vault;
        f.cool.fan = K.cooldown;
        f.fanUsed = true;
        f.fanDFA = !!f.vaultApexAt && Math.abs(f.world.frame - f.vaultApexAt) <= V.apex;
        f.vh = f.fanDFA ? 140 : Math.max(f.vh * K.hang, 60); // hang in the air
        f.vx *= 0.4;
        f.vz = 0;
        f.world.events.emit('attackStart', { fighter: f, state: 'fan', dfa: f.fanDFA });
      },
      update(f, frame) {
        const K = kitOf(f).fan;
        if (frame === K.startup) {
          const n = f.fanDFA ? K.dfaCount : K.count;
          const spread = f.fanDFA ? K.dfaSpread : K.spread;
          const from = { x: f.x + f.facing * 8, z: f.z, h: f.h + 50 };
          // men below and ahead, nearest first; each star picks one (the dice scatter
          // them a little — no robot homing), spare stars fan out over the floor
          const targets = foes(f)
            .map((e) => ({ e, d: Math.hypot(e.x - f.x, e.z - f.z) }))
            .filter((o) => (o.e.x - f.x) * f.facing > -spread && o.d <= K.range + f.h)
            .sort((a, b) => a.d - b.d || a.e.id - b.e.id);
          for (let i = 0; i < n; i++) {
            const r = (k) => f.world.roll(f.id, 300 + i * 7 + k) - 0.5;
            let to;
            if (targets.length && i < targets.length * 2) {
              const t = targets[i % targets.length].e;
              to = { x: t.x + r(0) * 18, z: t.z + r(1) * 10, h: t.h + t.stats.body.h * 0.5 };
            } else {
              const u = n > 1 ? i / (n - 1) - 0.5 : 0;
              to = { x: f.x + f.facing * (spread * 0.6 + r(2) * 30) + u * spread * 0.8, z: clampZ(f.world, f.z + u * spread * 0.9), h: 0 };
            }
            throwAt(f, K.projectile, from, to, K.projectile.speed);
          }
          f.world.events.emit('fanThrow', { fighter: f, dfa: f.fanDFA, count: n });
        }
        if (f.grounded && frame > 1) { f.world.events.emit('jumpLand', { fighter: f }); return f.fsm.change('idle'); }
        if (frame >= K.startup + K.recovery) f.fsm.change('jump');
      },
    },

    // FALLING VIPER: pick the man below, angle down, dive with both daggers; land in a
    // crouch with a small shove of the men round him. High damage to one, no big area.
    dive: {
      enter(f) {
        const K = kitOf(f).dive;
        f.startMove(f.stats.moves.dive);
        const t = foes(f)
          .map((e) => ({ e, dx: (e.x - f.x) * f.facing, dz: Math.abs(e.z - f.z) }))
          .filter((o) => o.dx > -30 && o.dx < K.range && o.dz < K.depth)
          .sort((a, b) => (a.dx + a.dz) - (b.dx + b.dz) || a.e.id - b.e.id)[0]?.e;
        const T = Math.max(6, (f.h / K.speed) * 60);
        f.diveTarget = t ?? null;
        f.vx = t ? Math.max(-700, Math.min(700, (t.x - f.x) / (T / 60))) : f.facing * 220;
        f.vz = t ? Math.max(-400, Math.min(400, (t.z - f.z) / (T / 60))) : 0;
        if (t) f.facing = Math.sign(t.x - f.x) || f.facing;
        f.vh = -K.speed;
        f.diveLanded = 0;
        f.world.events.emit('attackStart', { fighter: f, state: 'dive' });
      },
      update(f, frame) {
        const K = kitOf(f).dive;
        if (!f.diveLanded) {
          f.vh = -K.speed;
          f.activeAttack = f.attackInfo;
          if (f.grounded || f.h <= 0.5) {
            f.diveLanded = frame;
            f.activeAttack = null;
            stopMoving(f);
            // the impact staggers the men round where she lands (not the one she struck)
            for (const e of foes(f)) {
              if (f.attackInfo.hitList.has(e.id) || e.invincible) continue;
              const d = Math.hypot(e.x - f.x, (e.z - f.z) * 1.4);
              if (d > K.stagger) continue;
              e.fsm.change('hitstun', { frames: K.staggerFrames });
              e.vx = (Math.sign(e.x - f.x) || 1) * 140;
            }
            f.world.events.emit('diveLand', { fighter: f, x: f.x, z: f.z });
          }
          return;
        }
        stopMoving(f);
        const since = frame - f.diveLanded;
        if (since >= K.land - 4 && tryActions(f, ['attack', 'dodge', 'heavy', 'kick'])) return;
        if (since >= K.land) f.fsm.change('idle');
      },
      exit(f) { f.activeAttack = null; },
    },
  };
}

// ---------------------------------------------------------------- finishers

export const ROGUE_FINISHERS = {
  // a tiny pause, then raw speed: she crosses between the runners (round and round a lone
  // one), lands beyond them in a crouch, stands — and they fall apart together behind her
  phantom: { total: 100, crouch: 9, seg: 6, passes: 3, land: 10, reap: 14 },
  // a mine thrown into their path arms at once; she races past and shoves them into it,
  // dives clear — the blast takes them all
  lotus: { total: 104, throw: 3, armed: 12, dash: 12, shove: 26, shoveFrames: 10, dive: 36, blast: 46 },
  // a huge leap over them, a storm of stars at the top stops them dead, she dives onto the last
  scarlet: { total: 96, run: 8, leap: 26, apex: 30, step: 3, dive: 40, impact: 50 },
};
export const isRogueFinisher = (kind) => !!ROGUE_FINISHERS[kind];

function rogueKill(f, v, kind, dir, fatality = 'none') {
  const e = {
    attacker: f, defender: v, dir, kind: 'melee', finisher: kind,
    move: { cut: kind === 'lotus' ? 'explosive' : 'slash', damage: v.stats.maxHealth, hitstop: 8 },
    x: v.x, z: v.z, h: v.h + v.stats.body.h * 0.6, damage: v.stats.maxHealth, fatality,
  };
  v.fatality = fatality;
  f.world.events.emit('kill', e);
}

function beat(f, ex, type, v, extra = {}) {
  f.world.events.emit('finisherBeat', { attacker: f, victim: v, kind: ex.kind, type, dir: f.facing, targets: ex.targets, index: ex.targets.indexOf(v), ...extra });
}
function once(ex, key, frame, at, fn) {
  if (frame >= at && !ex.fired.has(key)) { ex.fired.add(key); fn(); }
}
function runOn(f, ex, frame, until) {
  const b = f.world.bounds;
  for (const v of ex.targets) {
    v.execRun = false;
    if (frame < until && v.health > 0 && v.execVx && !v.execStopped) {
      v.x = Math.max(b.minX, Math.min(b.maxX, v.x + (v.execVx / 60) * Math.max(0.3, 1 - frame / (until * 1.5))));
      v.execRun = true;
    }
  }
}
// her height during a finisher (the execute state holds her: gravity is cancelled)
function setH(f, h) { f.h = Math.max(0, h); f.vh = f.h > 0 ? f.stats.gravity / 60 : 0; }
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export function rogueFinisherStart(f, ex) {
  const F = ROGUE_FINISHERS[ex.kind];
  const w = f.world;
  ex.total = F.total;
  ex.rogue = true;
  f.facing = Math.sign(ex.targets[0].x - f.x) || f.facing;
  if (ex.kind === 'phantom') {
    // her path: to each runner in turn (a lone one: crossing him back and forth)
    const T = ex.targets;
    const stops = [];
    if (T.length === 1) for (let i = 0; i < F.passes; i++) stops.push({ v: T[0], side: i % 2 ? -1 : 1 });
    else for (const v of T) stops.push({ v, side: 1 });
    ex.stops = stops;
    ex.times = stops.map((_, i) => F.crouch + (i + 1) * F.seg);
    ex.endAt = ex.times[ex.times.length - 1] + F.land;
    ex.reapAt = ex.endAt + F.reap;
  }
  if (ex.kind === 'lotus') {
    const v = ex.targets[0];
    const run = Math.sign(v.execVx) || v.facing;
    ex.spot = { x: clampX(w, v.x + run * 120), z: v.z };
  }
}

export function runRogueFinisher(f, ex, frame) {
  const F = ROGUE_FINISHERS[ex.kind];
  const T = ex.targets;
  const w = f.world;
  f.invincible = true;
  f.vx = 0; f.vz = 0;

  if (ex.kind === 'phantom') {
    runOn(f, ex, frame, ex.times[0]);
    if (frame <= F.crouch) { setH(f, 0); }
    ex.stops.forEach((s, i) => {
      const t0 = i === 0 ? F.crouch : ex.times[i - 1];
      const t1 = ex.times[i];
      if (frame > t0 && frame <= t1) {
        if (!ex.leg || ex.leg.i !== i) ex.leg = { i, x: f.x, z: f.z };
        const dir = s.side * (Math.sign(s.v.x - ex.leg.x) || f.facing);
        const k = ease((frame - t0) / (t1 - t0));
        f.x = clampX(w, ex.leg.x + (s.v.x + dir * 30 - ex.leg.x) * k);
        f.z = ex.leg.z + (s.v.z - ex.leg.z) * k;
        f.facing = Math.sign(s.v.x - ex.leg.x) || f.facing;
      }
      once(ex, `slash${i}`, frame, t1, () => {
        s.v.execStopped = true;
        s.v.execRun = false;
        beat(f, ex, 'phantomSlash', s.v, { n: i, from: { x: ex.leg?.x ?? f.x, z: ex.leg?.z ?? f.z } });
      });
    });
    const last = ex.times[ex.times.length - 1];
    if (frame > last && frame <= ex.endAt) {
      if (!ex.out) ex.out = { x: f.x, z: f.z, to: clampX(w, f.x + f.facing * 70) };
      f.x = ex.out.x + (ex.out.to - ex.out.x) * ease((frame - last) / F.land);
    }
    once(ex, 'land', frame, ex.endAt, () => beat(f, ex, 'phantomLand', T[0]));
    once(ex, 'reap', frame, ex.reapAt, () => {
      const cuts = ['diagDown', 'diagUp', 'waist'];
      T.forEach((v, i) => {
        v.health = 0;
        v.execStyle = ['down', 'up', 'finish'][i % 3];
        v.execCut = cuts[i % 3];
        v.execRelease = { dead: true };
        rogueKill(f, v, 'phantom', Math.sign(v.x - f.x) || f.facing);
      });
      f.hitstop = 5;
      beat(f, ex, 'phantomReap', T[0]);
    });
  } else if (ex.kind === 'lotus') {
    runOn(f, ex, frame, F.shove);
    once(ex, 'throw', frame, F.throw, () => {
      ex.mine = w.mines.drop(f, ex.spot.x, ex.spot.z, kitOf(f).mine, { fastArm: F.armed - F.throw, special: true });
      beat(f, ex, 'lotusThrow', T[0], { spot: ex.spot });
    });
    // she races past them toward the mine...
    if (frame > F.dash && frame <= F.shove) {
      if (!ex.dash) ex.dash = { x: f.x, z: f.z };
      const k = ease((frame - F.dash) / (F.shove - F.dash));
      const to = ex.spot.x - (Math.sign(ex.spot.x - f.x) || 1) * 40;
      f.x = clampX(w, ex.dash.x + (to - ex.dash.x) * k);
      f.z = ex.dash.z + (ex.spot.z - ex.dash.z) * k;
    }
    // ...and shoves each of them in, round it, inside its reach
    once(ex, 'shove', frame, F.shove, () => {
      ex.shoveFrom = T.map((v) => ({ x: v.x, z: v.z }));
      for (const v of T) { v.execStopped = true; v.execRun = false; }
      beat(f, ex, 'lotusShove', T[0]);
    });
    if (ex.shoveFrom && frame <= F.shove + F.shoveFrames) {
      const k = ease((frame - F.shove) / F.shoveFrames);
      T.forEach((v, i) => {
        const a = (i / T.length) * Math.PI * 2;
        const tx = ex.spot.x + Math.cos(a) * 18;
        const tz = clampZ(w, ex.spot.z + Math.sin(a) * 12);
        v.x = ex.shoveFrom[i].x + (tx - ex.shoveFrom[i].x) * k;
        v.z = ex.shoveFrom[i].z + (tz - ex.shoveFrom[i].z) * k;
      });
    }
    // ...and dives clear, flat to the floor
    if (frame > F.dive && frame <= F.blast + 4) {
      if (!ex.clear) ex.clear = { x: f.x, to: clampX(w, f.x - (Math.sign(ex.spot.x - f.x) || 1) * 120) };
      f.x = ex.clear.x + (ex.clear.to - ex.clear.x) * ease((frame - F.dive) / (F.blast + 4 - F.dive));
      f.facing = Math.sign(ex.clear.to - ex.clear.x) || f.facing;
    }
    once(ex, 'blast', frame, F.blast, () => {
      w.mines.blast(ex.mine); // (anyone else near it gets it too)
      T.forEach((v) => {
        v.health = 0;
        v.execRelease = { dead: true };
        rogueKill(f, v, 'lotus', Math.sign(v.x - ex.spot.x) || 1, 'explode');
      });
      f.hitstop = 4;
      beat(f, ex, 'lotusBlast', T[0], { spot: ex.spot });
    });
  } else if (ex.kind === 'scarlet') {
    const last = T[T.length - 1];
    runOn(f, ex, frame, F.apex);
    if (!ex.start) ex.start = { x: f.x, z: f.z };
    if (frame <= F.run) {
      f.x = clampX(w, ex.start.x + (T[0].x - f.facing * 50 - ex.start.x) * ease(frame / F.run));
    } else if (frame <= F.dive) {
      // the leap: up and over them to above the last
      if (!ex.leap) ex.leap = { x: f.x, z: f.z };
      const k = Math.min(1, (frame - F.run) / (F.apex - F.run));
      const over = { x: last.x - f.facing * 30, z: last.z };
      f.x = clampX(w, ex.leap.x + (over.x - ex.leap.x) * ease(k));
      f.z = ex.leap.z + (over.z - ex.leap.z) * ease(k);
      setH(f, 160 * Math.sin(Math.min(1, k) * Math.PI / 2));
    }
    once(ex, 'leap', frame, F.run, () => beat(f, ex, 'scarletLeap', T[0]));
    once(ex, 'storm', frame, F.apex, () => {
      for (const v of T) { v.execStopped = true; v.execRun = false; }
      beat(f, ex, 'scarletStorm', T[0], { x: f.x, z: f.z, h: f.h });
    });
    // the stars take the outer ones down
    T.slice(0, -1).forEach((v, i) => once(ex, `star${i}`, frame, F.apex + 2 + i * F.step, () => {
      v.health = 0;
      v.execRelease = { vx: (Math.sign(v.x - f.x) || 1) * 80, vh: 120 };
      rogueKill(f, v, 'scarlet', Math.sign(v.x - f.x) || 1);
      beat(f, ex, 'scarletStar', v);
    }));
    if (frame > F.dive && frame <= F.impact) {
      if (!ex.drop) ex.drop = { x: f.x, z: f.z, h: f.h };
      const k = ease((frame - F.dive) / (F.impact - F.dive));
      f.x = ex.drop.x + (last.x - f.facing * 14 - ex.drop.x) * k;
      f.z = ex.drop.z + (last.z - ex.drop.z) * k;
      setH(f, ex.drop.h * (1 - k));
    }
    once(ex, 'impact', frame, F.impact, () => {
      setH(f, 0);
      last.health = 0;
      last.execRelease = { vx: f.facing * 60, vh: 90 };
      rogueKill(f, last, 'scarlet', f.facing);
      f.hitstop = 7;
      beat(f, ex, 'scarletImpact', last);
    });
    if (frame > F.impact) setH(f, 0);
  }
  if (frame >= ex.total) { setH(f, f.h); f.fsm.change('idle'); }
}
