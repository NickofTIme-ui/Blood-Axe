// Mage.js — The Mage's kit, as game logic (no drawing; view/MageView.js and
// effects/MageFX.js turn the events into the show). His buttons map to these states
// through stats.states (fighterStates.js stateFor):
//
//   dodge  -> blink   teleport the dodge distance: gone in sparks, re-formed at the far end
//   heavy  -> bolt    CHAIN LIGHTNING: a bolt off the staff that leaps from body to body
//                     (hold heavy to overcharge it)
//   kick   -> force   FORCE BLAST: a cone of invisible force that hurls men backwards
//   magic  -> ward    ARCANE BARRIER: tap = Infernal Wall, hold = Earthen Bulwark
//                     (combat/Barrier.js)
//
// Behind a runner, his finishers (MAGE_FINISHERS) take the place of Ulric's:
//   attack STORM JUDGMENT   heavy ARCANE RUPTURE   kick GATE OF EMBERS
// — each for one, two or three runners at once.
//
// Everything that decides an outcome uses the world's dice (World.roll) or none at all,
// so both machines of an online game play it the same.

const kitOf = (f) => f.stats.kit;
const clampX = (w, x) => Math.max(w.bounds.minX, Math.min(w.bounds.maxX, x));
const clampZ = (w, z) => Math.max(w.bounds.minZ, Math.min(w.bounds.maxZ, z));

// Living, hittable enemies of f (not someone already being executed).
function foes(f) {
  return f.world.fighters.filter((e) => e.team !== f.team && e.alive && !e.removeMe &&
    !['executed', 'dead'].includes(e.state));
}

// ---------------------------------------------------------------- chain lightning

// Who the bolt strikes and how it travels. The first strike is the nearest man ahead of
// the staff; from every body struck it jumps on to the next — first to anyone TOUCHING
// him, then anyone extremely close, then the nearest within reach — and a body can fork
// into more than one jump, so a packed crowd lights up as a web. Every jump starts from
// the body before it (`from`). Returns { hits: [{ t, from, gen, damage }], end }.
export function planChainLightning(f, K, charged = false, level = 0) {
  const all = foes(f);
  const C = K.charge;
  const ahead = all
    .map((e) => ({ e, dx: (e.x - f.x) * f.facing, dz: Math.abs(e.z - f.z) }))
    .filter((o) => o.dx >= -8 && o.dx <= K.range && o.dz <= K.depth + Math.max(0, o.dx) * 0.12)
    .sort((a, b) => (a.dx + a.dz * 2) - (b.dx + b.dz * 2) || a.e.id - b.e.id);
  const end = { x: f.x + f.facing * K.range * 0.7, z: f.z, h: 58 };
  if (!ahead.length) return { hits: [], end };
  const mult = charged ? C.damage : 1 + (C.damage - 1) * 0.5 * level;
  const first = ahead[0].e;
  const hits = [{ t: first, from: null, gen: 0, damage: K.damage * mult }];
  const used = new Set([first.id]);
  const queue = [hits[0]];
  let left = K.maxJumps + (charged ? C.jumps : 0);
  const forks = charged ? C.branches : K.branches;
  while (queue.length && left > 0) {
    const cur = queue.shift();
    const src = cur.t;
    const cands = all
      .filter((e) => !used.has(e.id))
      .map((e) => {
        const dx = e.x - src.x;
        const dz = e.z - src.z;
        const dist = Math.hypot(dx, dz * 1.6);
        const gap = Math.abs(dx) - (e.stats.body.w + src.stats.body.w) / 2;
        const tier = gap <= K.touch && Math.abs(dz) <= 22 ? 0 : dist <= K.close ? 1 : 2;
        return { e, dist, tier };
      })
      .filter((o) => o.dist <= K.radius)
      .sort((a, b) => a.tier - b.tier || a.dist - b.dist || a.e.id - b.e.id);
    for (const o of cands.slice(0, Math.min(forks, left))) {
      const gen = cur.gen + 1;
      const h = { t: o.e, from: src, gen, damage: K.chainDamage * K.falloff ** (gen - 1) * mult };
      hits.push(h);
      queue.push(h);
      used.add(o.e.id);
      left--;
    }
  }
  return { hits, end };
}

function strikeWithLightning(f, hit, K, charged, stage = 1) {
  const t = hit.t;
  if (!t.alive || t.removeMe || t.state === 'executed') return;
  const src = hit.from ?? f;
  const dir = Math.sign(t.x - src.x) || f.facing;
  const C = K.combo;
  const i = stage - 1;
  const down = (charged && K.charge.knockdown) || C.knockdown[i];
  const move = {
    cut: 'shock', fx: 'lightning', noBlood: true, stage,
    maims: stage >= 2 && hit.gen === 0, // (the heavier strikes can blow an arm off: a runner to finish)
    damage: hit.damage * C.damage[i],
    hitstun: K.hitstun + i * 6,
    hitstop: Math.round((hit.gen === 0 ? C.hitstop[i] : C.hitstop[i] * 0.5) + (charged ? 3 : 0)),
    shake: hit.gen === 0 ? C.shake[i] + (charged ? 3 : 0) : Math.round(C.shake[i] * 0.3),
    knockback: { x: K.knockback * C.knockback[i] * (charged ? 1.4 : 1) * (hit.gen ? 0.6 : 1), y: down ? 300 : 0 },
    knockdown: down,
    breaksGuard: charged || stage === 3,
    guardDamage: 26 + i * 14,
  };
  const before = t.health;
  f.world.combat.resolve(f, t, move, {
    kind: 'magic', fromX: src.x, dir,
    contact: { x: t.x, h: t.h + t.stats.body.h * 0.62 },
  });
  if (t.health < before || !t.alive) t.shock = (charged ? 34 : 24) + i * 10; // he seizes (view)
  f.world.events.emit('lightningArc', {
    caster: f, from: src === f ? null : src, to: t, gen: hit.gen, charged, index: hit.gen, stage,
  });
}

// ---------------------------------------------------------------- force blast

// Enemies inside the cone in front of him, nearest first.
export function forceTargets(f, K) {
  const half = (K.angle / 2) * Math.PI / 180;
  return foes(f)
    .map((e) => {
      const dx = (e.x - f.x) * f.facing;
      const dz = e.z - f.z;
      return { e, dx, dz, dist: Math.hypot(dx, dz * 1.4) };
    })
    .filter((o) => o.dx >= -12 && o.dist <= K.radius && Math.abs(o.dz) <= Math.tan(half) * Math.max(0, o.dx) + 24 && o.e.air < 130)
    .sort((a, b) => a.dist - b.dist || a.e.id - b.e.id);
}

function releaseForce(f, level = 0) {
  const K0 = kitOf(f).force;
  const C = K0.charge;
  const lerp = (a, b) => a + (b - a) * level;
  // charged: harder, further, wider (level 0 = a tap, 1 = fully held)
  const K = { ...K0, damage: K0.damage * lerp(1, C.damage), knockback: K0.knockback * lerp(1, C.knockback), radius: K0.radius * lerp(1, C.radius) };
  const w = f.world;
  const targets = forceTargets(f, K);
  w.events.emit('forceBlast', { fighter: f, x: f.x, z: f.z, dir: f.facing, radius: K.radius, angle: K.angle, count: targets.length, level });
  for (const { e, dist } of targets) {
    const near = 1 - 0.45 * Math.min(1, dist / K.radius);
    const heavy = (e.stats.boss || e.stats.maxHealth >= K.heavyHealth) && !(level >= 1 && C.floorsBrutes && !e.stats.boss);
    const move = {
      cut: 'crush', fx: 'force', noBlood: true,
      damage: K.damage, hitstun: heavy ? K.staggerFrames : 30, hitstop: Math.round(7 + level * 6), shake: Math.round(6 + level * 6),
      knockback: { x: (heavy ? K.heavyKnockback : K.knockback) * near, y: heavy ? 0 : K.lift * near * lerp(1, 1.3) },
      knockdown: !heavy, bowl: !heavy, breaksGuard: true, guardDamage: 60,
    };
    w.combat.resolve(f, e, move, {
      kind: 'magic', fromX: f.x, dir: f.facing,
      contact: { x: e.x - f.facing * e.stats.body.w * 0.3, h: e.h + e.stats.body.h * 0.55 },
    });
    if (heavy && e.alive && e.state === 'hitstun') e.vx = f.facing * K.heavyKnockback * near;
  }
  // crates and barrels in the cone go too (stage/Stage.js reads propStrike)
  const left = f.facing > 0 ? f.x : f.x - K.radius;
  f.propStrike = { box: { left, right: left + K.radius, bottom: 0, top: 120, z: f.z }, depth: 60, smash: 2, id: w.frame };
}

// ---------------------------------------------------------------- the states

// api: helpers from entities/fighterStates.js (handed over, so neither file imports the
// other). Returns the states to add to FIGHTER_STATES.
export function mageStates({ tryActions, stopMoving, friction, faceInput, aimTurn }) {
  return {
    // BLINK: the body breaks into sparks, is gone, and re-forms the dodge distance away
    // in the input direction. Invulnerable for the dodge's i-frames.
    blink: {
      enter(f) {
        const c = f.controller;
        const d = f.stats.dodge;
        const B = kitOf(f).blink;
        f.spendStamina(d.cost);
        let dx = c.moveX;
        let dz = c.moveZ;
        if (!dx && !dz) dx = f.facing; // no direction held: forward
        const len = Math.hypot(dx, dz);
        const ux = dx / len;
        const uz = dz / len;
        if (Math.abs(ux) > 0.2) f.facing = Math.sign(ux);
        f.blinkFrom = { x: f.x, z: f.z };
        f.blinkTo = { x: clampX(f.world, f.x + ux * B.distance), z: clampZ(f.world, f.z + uz * B.distance * 0.6) };
        // never into a wall: pulled back along the line until he fits (stage/Terrain.js).
        // Over a pit or up onto a ledge he can clear from where he is, he goes.
        const T = f.world.terrain;
        if (T) {
          const from = { x: f.x, z: f.z };
          const to = { ...f.blinkTo };
          for (let k = 1; k <= 12 && T.wallAt(f.blinkTo.x, f.blinkTo.z, f.h); k++) {
            f.blinkTo = { x: to.x + (from.x - to.x) * (k / 12), z: to.z + (from.z - to.z) * (k / 12) };
          }
        }
        f.blinkDir = Math.abs(uz) > Math.abs(ux) * 1.2 ? (uz < 0 ? 'up' : 'down') : 'side';
        f.blinkGone = false;
        f.blinkAir = !f.grounded; // blinked out of a jump: he stays at that height through it
        f.invincible = true;
        stopMoving(f);
        f.world.events.emit('blinkOut', { fighter: f, x: f.x, z: f.z, to: f.blinkTo });
      },
      update(f, frame) {
        const d = f.stats.dodge;
        const B = kitOf(f).blink;
        stopMoving(f);
        if (f.blinkAir && f.air > 0) f.vh = f.stats.gravity / 60; // (held at that height: no fall while blinking)
        f.invincible = frame <= d.iframes;
        if (frame === B.vanishAt) f.blinkGone = true;
        if (frame === B.arriveAt) {
          f.x = f.blinkTo.x;
          f.z = f.blinkTo.z;
          f.blinkGone = false;
          f.world.events.emit('blinkIn', { fighter: f, x: f.x, z: f.z, from: f.blinkFrom });
        }
        if (f.blinkAir && f.air > 0) {
          // in the air: re-formed, he drops again (an air chop is the only thing he can do up there)
          if (frame >= B.actFrom && f.controller.consume('attack') && f.stats.moves.air) { f.vh = 0; return f.fsm.change('airAttack'); }
          if (frame >= d.duration + d.recovery) { f.vh = 0; f.airBlinked = true; f.fsm.change('jump'); }
          return;
        }
        if (frame >= B.actFrom && tryActions(f, ['attack', 'heavy', 'kick', 'magic', 'block', 'jump'])) return;
        if (frame >= d.duration + d.recovery) f.fsm.change('idle');
      },
      exit(f) {
        // cut short before he re-formed (a hit can't land on him, but a finisher or a
        // stage reset can end it): he arrives anyway, never left invisible
        if (f.blinkGone && f.blinkTo) { f.x = f.blinkTo.x; f.z = f.blinkTo.z; }
        f.blinkGone = false;
        const B = kitOf(f).blink;
        if (B.cooldown) f.cool.blink = B.cooldown;
      },
    },

    // CHAIN LIGHTNING. The staff is raised and charged through the cast's startup; if
    // heavy is still held when it's ready he keeps charging (the overcharge) until it's
    // released or full. Then the bolt fires and leaps on through the crowd, one
    // generation of jumps every few frames.
    bolt: {
      enter(f, p) {
        stopMoving(f);
        faceInput(f);
        const K = kitOf(f).bolt;
        f.boltStage = p?.stage ?? 1;
        const base = f.stats.moves.heavy;
        // a follow-up strike comes out quicker (the staff is already up)
        const m = f.boltStage > 1 ? { ...base, startup: K.combo.startup } : base;
        f.startMove(m);
        // the cast pays the full cost; each follow-up strike pays its combo cost
        const cost = f.boltStage === 1 ? (m.manaCost ?? 0) : (K.combo.manaCost?.[f.boltStage - 1] ?? 0);
        f.mana = Math.max(0, f.mana - cost);
        f.boltHeld = true;
        f.boltCharge = 0;
        f.boltFired = 0;
        f.bolt = null;
        f.world.events.emit('attackStart', { fighter: f, state: 'bolt', move: m });
      },
      update(f, frame) {
        const m = f.move;
        const K = kitOf(f).bolt;
        const c = f.controller;
        friction(f, 0.7);
        if (!f.boltFired) {
          aimTurn(f); // (turn to aim it until it goes off)
          if (!c.isDown('heavy')) f.boltHeld = false;
          for (const win of m.cancels ?? []) {
            if (frame <= m.startup && frame >= win.from && frame <= win.to && tryActions(f, win.into)) return;
          }
          if (frame < m.startup) return;
          // overcharge: still holding when the cast is ready
          if (f.boltHeld && f.boltCharge < K.charge.maxFrames) {
            if (f.boltCharge === 0) f.world.events.emit('boltCharge', { fighter: f });
            f.boltCharge++;
            if (f.boltCharge === K.charge.fullFrames) f.world.events.emit('boltChargeFull', { fighter: f });
            return;
          }
          const level = Math.min(1, f.boltCharge / K.charge.fullFrames);
          const charged = level >= 1;
          const plan = planChainLightning(f, K, charged, level);
          f.bolt = { plan, charged, at: frame, done: new Set() };
          f.boltFired = frame;
          f.world.events.emit('boltCast', { fighter: f, charged, level, plan, end: plan.end, stage: f.boltStage });
          // THUNDERHEAD (Stormcaller): a full overcharge calls a strike down on its first man
          if (charged && plan.hits.length && f.stats.skills?.thunderhead) f.world.storms.thunder(f, plan.hits[0].t, f.stats.skills.thunderhead);
          if (plan.hits.length) f.hitstop = (charged ? 6 : 3) + f.boltStage; // the kick of the release
        }
        // each generation of jumps a few frames after the last
        const b = f.bolt;
        for (const h of b.plan.hits) {
          if (b.done.has(h) || frame < b.at + h.gen * K.jumpFrames) continue;
          b.done.add(h);
          strikeWithLightning(f, h, K, b.charged, f.boltStage);
          // STATIC CHARGE (Stormcaller): the combo's 3rd strike leaves a field where it hit
          if (f.boltStage === 3 && h.gen === 0 && f.stats.skills?.staticCharge) f.world.storms.field(f, h.t.x, h.t.z, f.stats.skills.staticCharge);
        }
        const since = frame - f.boltFired;
        // the next strike of the three
        const W = K.combo.window;
        if (f.boltStage < 3 && since >= W[0] && since <= W[1] && f.mana >= (K.combo.manaCost?.[f.boltStage] ?? 0) && c.consume('heavy')) return f.fsm.change('bolt', { stage: f.boltStage + 1 });
        if (since >= m.recovery - 10 && tryActions(f, ['dodge'])) return;
        if (since >= m.recovery) f.fsm.change('idle');
      },
      exit(f) { f.activeAttack = null; },
    },

    // FORCE BLAST: coil, then a violent shove of the open hand; the cone in front erupts.
    force: {
      enter(f) {
        stopMoving(f);
        faceInput(f);
        f.startMove(f.stats.moves.kick);
        f.mana = Math.max(0, f.mana - (f.move.manaCost ?? 0));
        f.cool.force = kitOf(f).force.cooldown;
        f.world.events.emit('attackStart', { fighter: f, state: 'force', move: f.move });
      },
      update(f, frame) {
        const m = f.move;
        const C = kitOf(f).force.charge;
        friction(f, 0.7);
        f.propStrike = null;
        if (frame === 1) { f.forceHeld = true; f.forceCharge = 0; f.forceAt = 0; }
        if (!f.forceAt) aimTurn(f); // (turn to aim it while it winds up and charges)
        if (!f.controller.isDown('kick')) f.forceHeld = false;
        if (!f.forceAt) {
          if (frame < m.startup) { f.vx = -f.facing * 40; return; } // settles back into the push
          // still holding: building it up (released, or full = it goes)
          if (f.forceHeld && f.forceCharge < C.maxFrames) {
            if (f.forceCharge === 0) f.world.events.emit('forceCharge', { fighter: f });
            f.forceCharge++;
            if (f.forceCharge === C.fullFrames) f.world.events.emit('forceChargeFull', { fighter: f });
            return;
          }
          f.forceAt = frame;
          releaseForce(f, Math.min(1, f.forceCharge / C.fullFrames));
        }
        const since = frame - f.forceAt + m.startup + 1; // (frame numbers as if it had gone at once)
        for (const win of m.cancels ?? []) {
          if (since >= win.from && since <= win.to && tryActions(f, win.into)) return;
        }
        if (since >= m.startup + m.active + m.recovery) f.fsm.change('idle');
      },
      exit(f) { f.propStrike = null; },
    },

    // ARCANE BARRIER: tap magic = the Infernal Wall, hold it = the Earthen Bulwark. The
    // staff comes up while he chooses, then slams down and the wall erupts.
    ward: {
      enter(f) {
        stopMoving(f);
        faceInput(f);
        f.mana = Math.max(0, f.mana - f.stats.spell.cost);
        f.wardKind = null;
        f.wardAt = 0;
        f.wardPlaced = 0;
        f.world.events.emit('wardStart', { fighter: f });
      },
      update(f, frame) {
        const B = kitOf(f).barrier;
        friction(f, 0.7);
        if (!f.wardKind) {
          f.wardKind = B.kind ?? 'earth';
          f.wardAt = frame;
          f.world.events.emit('wardChoose', { fighter: f, kind: f.wardKind });
        }
        if (!f.wardPlaced) aimTurn(f); // (which side the wall goes up on, until it erupts)
        if (!f.wardPlaced && frame >= f.wardAt + B.castAt) {
          f.world.barriers.place(f, f.wardKind, B);
          f.cool.ward = B.cooldown;
          f.wardPlaced = frame;
          f.world.events.emit('wardSlam', { fighter: f, kind: f.wardKind });
        }
        if (f.wardPlaced) {
          if (frame >= f.wardPlaced + 6 && tryActions(f, ['dodge'])) return;
          if (frame >= f.wardPlaced + B.recovery) f.fsm.change('idle');
        }
      },
    },
  };
}

// ---------------------------------------------------------------- finishers

// Timelines in game frames. `at` beats per victim run i frames apart (`step`).
export const MAGE_FINISHERS = {
  // the runner is seized by lightning where he stands, the storm gathers on the staff
  // and a colossal bolt falls on him — then forks through every other marked runner
  storm: { total: 108, lock: 5, gather: 20, strike: 52, step: 4, release: 82 },
  // pulled back through the air, held in a cage of runes, crushed, and burst
  rupture: { total: 132, pull: 6, pullFrames: 16, cage: 30, crush: 54, burst: 92, step: 6 },
  // he blinks into their path, slams the staff, sigils open under them, and the gate burns
  embers: { total: 116, vanish: 3, arrive: 10, slam: 22, erupt: 42, step: 4, release: 80 },
};
export const isMageFinisher = (kind) => !!MAGE_FINISHERS[kind];

function mageKill(f, v, kind, dir, fatality = 'none') {
  const e = {
    attacker: f, defender: v, dir, kind: 'magic', finisher: kind,
    move: { cut: kind === 'storm' ? 'shock' : kind === 'embers' ? 'fire' : 'crush', damage: v.stats.maxHealth, hitstop: 10 },
    x: v.x, z: v.z, h: v.h + v.stats.body.h * 0.6, damage: v.stats.maxHealth, fatality,
  };
  v.fatality = fatality;
  f.world.events.emit('kill', e);
}

function beat(f, ex, type, v, extra = {}) {
  f.world.events.emit('finisherBeat', { attacker: f, victim: v, kind: ex.kind, type, dir: f.facing, targets: ex.targets, index: ex.targets.indexOf(v), ...extra });
}

// Fire each beat once.
function once(ex, key, frame, at, fn) {
  if (frame >= at && !ex.fired.has(key)) { ex.fired.add(key); fn(); }
}

// Runners keep stumbling on (slowing) until the mage stops them.
function runOn(f, ex, frame, until) {
  const b = f.world.bounds;
  for (const v of ex.targets) {
    v.execRun = false;
    if (frame < until && v.health > 0 && v.execVx) {
      const k = Math.max(0.25, 1 - frame / until);
      v.x = Math.max(b.minX, Math.min(b.maxX, v.x + (v.execVx / 60) * k));
      v.execRun = true;
    }
  }
}

export function mageFinisherStart(f, ex) {
  const F = MAGE_FINISHERS[ex.kind];
  ex.total = F.total;
  f.facing = Math.sign(ex.targets[0].x - f.x) || f.facing;
  ex.mage = true;
}

export function runMageFinisher(f, ex, frame) {
  const F = MAGE_FINISHERS[ex.kind];
  const T = ex.targets;
  const w = f.world;
  f.invincible = true;
  f.vx = 0; f.vz = 0;

  if (ex.kind === 'storm') {
    runOn(f, ex, frame, F.lock);
    once(ex, 'lock', frame, F.lock, () => {
      for (const v of T) { v.execRun = false; v.shock = 999; }
      beat(f, ex, 'stormLock', T[0]);
    });
    if (frame >= F.lock) {
      // held up off his heels by the current, trembling
      for (const v of T) if (v.state === 'executed' && !ex.fired.has(`strike${T.indexOf(v)}`)) v.liftH = Math.min(7, (frame - F.lock) * 0.4);
    }
    once(ex, 'gather', frame, F.gather, () => beat(f, ex, 'stormGather', T[0]));
    T.forEach((v, i) => once(ex, `strike${i}`, frame, F.strike + i * F.step, () => {
      v.health = 0;
      v.liftH = 0;
      f.hitstop = v.hitstop = i === 0 ? 7 : 3;
      beat(f, ex, 'stormStrike', v, { from: i === 0 ? null : T[i - 1], main: i === 0 });
      mageKill(f, v, 'storm', Math.sign(v.x - f.x) || f.facing);
    }));
    once(ex, 'release', frame, F.release, () => {
      for (const v of T) { v.shock = 0; v.execRelease = { vx: (Math.sign(v.x - f.x) || f.facing) * 60, vh: 160 }; }
      beat(f, ex, 'stormRelease', T[0]);
    });
  } else if (ex.kind === 'rupture') {
    once(ex, 'pull', frame, F.pull, () => {
      ex.spots = T.map((v, i) => {
        // clearly apart: the first straight ahead, the others above and below him
        const off = [[96, 0], [150, -34], [150, 34]][i] ?? [150 + i * 20, 0];
        return { from: { x: v.x, z: v.z }, x: clampX(w, f.x + f.facing * off[0]), z: clampZ(w, f.z + off[1]), lift: 46 + i * 10 };
      });
      for (const v of T) v.execRun = false;
      beat(f, ex, 'rupturePull', T[0]);
    });
    if (ex.spots && frame >= F.pull) {
      const t = Math.min(1, (frame - F.pull) / F.pullFrames);
      const e = 1 - (1 - t) ** 3; // yanked: fast, then caught dead in the air
      T.forEach((v, i) => {
        if (v.state !== 'executed' || ex.fired.has(`burst${i}`)) return;
        const s = ex.spots[i];
        v.x = s.from.x + (s.x - s.from.x) * e;
        v.z = s.from.z + (s.z - s.from.z) * e;
        // a little bob in the cage, held tighter as it closes
        const crush = frame >= F.crush ? Math.min(1, (frame - F.crush) / (F.burst - F.crush)) : 0;
        v.liftH = s.lift * e + Math.sin(frame * 0.18 + i) * 2 * (1 - crush);
        v.ruptureCrush = crush;
      });
    } else runOn(f, ex, frame, F.pull);
    once(ex, 'cage', frame, F.cage, () => beat(f, ex, 'ruptureCage', T[0]));
    once(ex, 'crush', frame, F.crush, () => beat(f, ex, 'ruptureCrush', T[0]));
    T.forEach((v, i) => once(ex, `burst${i}`, frame, F.burst + i * F.step, () => {
      v.health = 0;
      f.hitstop = i === T.length - 1 ? 6 : 2;
      beat(f, ex, 'ruptureBurst', v, { last: i === T.length - 1 });
      mageKill(f, v, 'rupture', Math.sign(v.x - f.x) || f.facing, 'explode');
      v.execRelease = { dead: true };
    }));
  } else if (ex.kind === 'embers') {
    runOn(f, ex, frame, F.slam);
    once(ex, 'vanish', frame, F.vanish, () => {
      f.blinkGone = true;
      beat(f, ex, 'embersVanish', T[0], { x: f.x, z: f.z });
    });
    once(ex, 'arrive', frame, F.arrive, () => {
      // right in the lead runner's path, facing him
      const v = T[0];
      const run = Math.sign(v.execVx) || v.facing;
      const from = { x: f.x, z: f.z };
      f.x = clampX(w, v.x + run * 84);
      if (Math.abs(f.x - v.x) < 50) f.x = clampX(w, v.x - run * 84); // a wall in the way: the other side
      f.z = v.z;
      f.facing = Math.sign(v.x - f.x) || -run;
      f.blinkGone = false;
      beat(f, ex, 'embersArrive', v, { x: f.x, z: f.z, from });
    });
    once(ex, 'slam', frame, F.slam, () => {
      for (const v of T) { v.execRun = false; v.execFlinch = true; }
      beat(f, ex, 'embersSlam', T[0]);
    });
    T.forEach((v, i) => once(ex, `erupt${i}`, frame, F.erupt + i * F.step, () => {
      v.health = 0;
      v.execFlinch = false;
      f.hitstop = i === 0 ? 4 : 0;
      beat(f, ex, 'embersErupt', v, { main: i === 0 });
      mageKill(f, v, 'embers', Math.sign(v.x - f.x) || f.facing);
    }));
    once(ex, 'release', frame, F.release, () => {
      for (const v of T) v.execRelease = { burn: true, dir: Math.sign(v.x - f.x) || f.facing };
      beat(f, ex, 'embersRelease', T[0]);
    });
  }
  if (frame >= ex.total) f.fsm.change('idle');
}
