// RogueMoves.js — Vexa's second set of moves (Nick, 2026-11-04: "the same amount of moves
// as Rurik but unique to their own build... Assassin = quick, in and out, fast"). Each
// answers one of Rurik's button slots her own way (data in data/characters.js, look in
// view/StripHeroView.js and effects/RogueFX.js):
//
//   SHADOW RUSH    sprint + attack ('rush')       <- his Shoulder Smash
//   BACKSTAB       hold attack ('backstab')        <- his charged thrust
//   THOUSAND CUTS  4th hit launches, then heavy ('cuts')  <- his Rising Cleave + Sunder
//   FADE           jump + away out of any attack ('fade')  (hers alone: in and out)
//   SMOKE BOMB     D-pad down, skill tree ('smoke')        <- his Whirlwind Cleave
//   NIGHT FALLS    D-pad down with the mana, skill tree ('nightfall')  <- his King's Wrath
//
// And the skill tree's behaviours that answer to events (installRogue): SPREADING MARK,
// KILLING RHYTHM, FALLING STAR. Every choice uses the world's dice or none, so online
// games stay in step.

const kitOf = (f) => f.stats.kit;
const clampX = (w, x) => Math.max(w.bounds.minX, Math.min(w.bounds.maxX, x));
const clampZ = (w, z) => Math.max(w.bounds.minZ, Math.min(w.bounds.maxZ, z));

function foes(f) {
  return f.world.fighters.filter((e) => e.team !== f.team && e.alive && !e.removeMe && !['executed', 'dead', 'execute'].includes(e.state));
}

// The states she can FADE out of (jump + away during their cancel windows)
export const FADE_FROM = new Set(['light1', 'light2', 'light3', 'light4', 'viper', 'kick', 'sweep', 'knife', 'rush', 'backstab']);

// Jump pressed in one of her attacks with the stick held away from the way she faces.
export function wantsFade(f) {
  return !!kitOf(f)?.fade && FADE_FROM.has(f.state) && f.grounded && f.controller.moveX * f.facing < -0.5 &&
    f.stamina >= kitOf(f).fade.cost;
}

// D-pad down with THE NIGHTBLADE: Night Falls when she has the mana for it, else the smoke.
export function nightbladeState(f) {
  const S = f.stats.skills;
  const K = kitOf(f);
  if (!S?.smoke || !f.grounded) return null;
  if (S.nightfall && f.mana >= K.nightfall.cost && !(f.cool.nightfall > 0)) return 'nightfall';
  if (f.mana >= K.smoke.cost && !(f.cool.smoke > 0)) return 'smoke';
  return null;
}

// Who the backstab goes for: the nearest man ahead in reach, else the nearest anywhere.
export function backstabTarget(f) {
  const K = kitOf(f).backstab;
  const near = foes(f)
    .filter((e) => !e.stats.machine && Math.abs(e.x - f.x) <= K.range && Math.abs(e.z - f.z) <= K.depth)
    .map((e) => ({ e, ahead: (e.x - f.x) * f.facing > 0, d: Math.hypot(e.x - f.x, (e.z - f.z) * 1.4) }))
    .sort((a, b) => (b.ahead - a.ahead) || a.d - b.d || a.e.id - b.e.id);
  return near[0]?.e ?? null;
}

export function rogueMoveStates({ tryActions, stopMoving, friction, faceInput }) {
  return {
    // SHADOW RUSH: a blur through the whole line, every man cut once in passing; she
    // skids to a stop behind them and turns back to face them.
    rush: {
      enter(f) {
        faceInput(f);
        f.startMove(f.stats.moves.rush);
        f.sprinting = false;
        f.world.events.emit('attackStart', { fighter: f, state: 'rush', move: f.move });
      },
      update(f, frame) {
        const m = f.move;
        const ph = frame <= m.startup ? 'startup' : frame <= m.startup + m.active ? 'active' : 'recovery';
        f.vz = 0;
        if (ph === 'startup') f.vx = f.facing * 300;
        else if (ph === 'active') { f.vx = f.facing * m.lunge; f.invincible = true; }
        else friction(f, 0.78);
        f.activeAttack = ph === 'active' ? f.attackInfo : null;
        if (frame === m.startup + 1) f.world.events.emit('swing', { fighter: f, move: m });
        // through them: the skid turns her round to face the men she just cut
        if (frame === m.startup + m.active + 1) {
          f.facing = -f.facing;
          f.world.events.emit('rushTurn', { fighter: f, hits: f.attackInfo.hitList.size });
        }
        for (const win of m.cancels ?? []) {
          if (frame >= win.from && frame <= win.to && tryActions(f, win.into)) return;
        }
        if (frame >= m.startup + m.active + m.recovery) f.fsm.change('idle');
      },
      exit(f) { f.activeAttack = null; },
    },

    // BACKSTAB: smoke, gone, and out behind the nearest man with the dagger going in.
    // With nobody in reach she steps out of the smoke a little way ahead and stabs the air.
    backstab: {
      enter(f) {
        const K = kitOf(f).backstab;
        stopMoving(f);
        faceInput(f);
        f.stabTarget = backstabTarget(f);
        f.stabAt = 0;
        f.hidden = true;
        f.cool.backstab = K.cooldown;
        f.move = null;
        f.activeAttack = null;
        f.world.events.emit('backstabVanish', { fighter: f, x: f.x, z: f.z, h: f.h });
      },
      update(f, frame) {
        const K = kitOf(f).backstab;
        stopMoving(f);
        if (!f.stabAt) {
          f.invincible = true;
          if (frame < K.vanish) return;
          const t = f.stabTarget;
          if (t?.alive && !['executed', 'dead'].includes(t.state)) {
            const side = -(t.facing || 1); // behind him: the side he isn't looking at
            let x = clampX(f.world, t.x + side * K.behind);
            if (x === t.x) x = clampX(f.world, t.x - side * K.behind);
            f.x = x;
            f.z = t.z;
            f.facing = Math.sign(t.x - f.x) || f.facing;
          } else {
            f.x = clampX(f.world, f.x + f.facing * K.step);
          }
          f.hidden = false;
          f.stabAt = frame;
          f.startMove(f.stats.moves.backstab);
          f.world.events.emit('backstabAppear', { fighter: f, x: f.x, z: f.z, h: f.h, target: f.stabTarget });
          f.world.events.emit('attackStart', { fighter: f, state: 'backstab', move: f.move });
        }
        const m = f.move;
        const fr = frame - f.stabAt;
        const ph = fr < m.startup ? 'startup' : fr < m.startup + m.active ? 'active' : 'recovery';
        f.activeAttack = ph === 'active' ? f.attackInfo : null;
        if (fr === m.startup) f.world.events.emit('swing', { fighter: f, move: m });
        for (const win of m.cancels ?? []) {
          if (fr >= win.from && fr <= win.to && tryActions(f, win.into)) return;
        }
        if (fr >= m.startup + m.active + m.recovery) f.fsm.change('idle');
      },
      exit(f) { f.activeAttack = null; f.hidden = false; },
    },

    // THOUSAND CUTS: out of the 4th hit that launched him, she springs up after him, a
    // flurry of slashes holds him up there, and a heel drives him into the dirt (the spike:
    // he bounces once, combat/Juggle.js). She drops after him.
    cuts: {
      enter(f) {
        const launched = f.attackInfo?.hitList ?? new Set(); // (still the 4th hit's swing)
        const t = f.world.fighters
          .filter((v) => launched.has(v.id) && v.alive && !v.grounded && v.team !== f.team)
          .sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
        f.cutsTarget = t ?? null;
        f.cutsN = 0;
        f.cutsDrop = 0;
        f.cutsLand = 0;
        f.cutsFrom = { x: f.x, z: f.z, h: f.h };
        if (t) f.facing = Math.sign(t.x - f.x) || f.facing;
        f.spendStamina(f.stats.moves.cuts.staminaCost ?? 0);
        f.world.events.emit('attackStart', { fighter: f, state: 'cuts' });
        f.world.events.emit('cutsStart', { fighter: f, target: t });
      },
      update(f, frame) {
        const K = kitOf(f).cuts;
        const t = f.cutsTarget;
        // landing after the spike (or when there was nobody to go up after)
        if (f.cutsLand) {
          stopMoving(f);
          f.activeAttack = null;
          const since = frame - f.cutsLand;
          if (since >= K.land - 4 && tryActions(f, ['attack', 'dodge', 'heavy', 'kick', 'jump'])) return;
          if (since >= K.land) f.fsm.change('idle');
          return;
        }
        if (!t || f.cutsDrop) {
          // dropping back down
          f.activeAttack = frame - (f.cutsDrop || frame) < 3 ? f.activeAttack : null;
          f.vx = 0; f.vz = 0;
          f.vh = -K.drop;
          if (!t && !f.cutsDrop) f.cutsDrop = frame;
          if (f.grounded || f.air <= 0.5) {
            f.cutsLand = frame;
            f.world.events.emit('jumpLand', { fighter: f });
          }
          return;
        }
        // up there with him: held at his height, just in front of him (and he hangs there
        // under the blades instead of being knocked on up out of reach)
        f.vx = 0; f.vz = 0;
        if (frame > K.rise) t.vh = Math.min(t.vh, 40);
        f.vh = f.stats.gravity / 60; // (cancel this step's gravity)
        const k = Math.min(1, frame / K.rise);
        const tx = clampX(f.world, t.x - f.facing * K.offset);
        const th = Math.max(t.h - 6, 24);
        f.x = f.cutsFrom.x + (tx - f.cutsFrom.x) * k;
        f.z = f.cutsFrom.z + (t.z - f.cutsFrom.z) * k;
        f.h = f.cutsFrom.h + (th - f.cutsFrom.h) * k;
        // the slashes, then the heel
        const at = frame - K.rise;
        if (at >= 0 && at % K.every === 0 && f.cutsN <= K.hits) {
          const spike = f.cutsN === K.hits;
          f.startMove(spike ? f.stats.moves.cutsSpike : { ...f.stats.moves.cuts, staminaCost: 0 });
          f.cutsN++;
          f.world.events.emit('swing', { fighter: f, move: f.move });
          f.world.events.emit(spike ? 'cutsSpike' : 'cutsSlash', { fighter: f, n: f.cutsN });
          if (spike) f.cutsDrop = frame;
        }
        f.activeAttack = at >= 0 && at % K.every < (f.move?.active ?? 2) ? f.attackInfo : null;
        // he died, or slipped out of reach: down she comes
        if (!t.alive || t.grounded || t.state !== 'knockdown') f.cutsDrop = frame;
      },
      exit(f) {
        f.activeAttack = null;
        f.cutsTarget = null;
      },
    },

    // FADE: a low back-flip out of reach, untouchable most of the way; an attack can come
    // out of it the moment she lands (in, cut, out, in again).
    fade: {
      enter(f) {
        const K = kitOf(f).fade;
        f.activeAttack = null;
        f.move = null;
        f.spendStamina(K.cost);
        f.vx = -f.facing * K.speed;
        f.vz = f.controller.moveZ * f.stats.depthSpeed * 0.5;
        f.vh = K.hop;
        f.h = Math.max(f.h, 0.01);
        f.jumpedSinceGrounded = true;
        f.world.events.emit('fade', { fighter: f });
      },
      update(f, frame) {
        const K = kitOf(f).fade;
        f.invincible = frame <= K.iframes;
        if (frame >= K.from && f.grounded) {
          friction(f, 0.5);
          if (tryActions(f, ['attack', 'heavy', 'kick', 'magic', 'dodge', 'jump'])) return;
          if (frame >= K.from + 6) f.fsm.change('idle');
        }
        if (frame > 60) f.fsm.change(f.grounded ? 'idle' : 'jump');
      },
    },

    // SMOKE BOMB (skill tree): a crack of smoke at her feet; every man in it reels, blind,
    // and she's a shadow in it for a while: blows pass through her, and her first cut out
    // of it EXPOSES the man it lands on.
    smoke: {
      enter(f) {
        const K = kitOf(f).smoke;
        stopMoving(f);
        f.mana = Math.max(0, f.mana - K.cost);
        f.cool.smoke = K.cooldown;
        f.veil = K.veil;
        f.veilExpose = true;
        for (const e of foes(f)) {
          if (e.invincible || e.stats.machine) continue;
          if (Math.hypot(e.x - f.x, (e.z - f.z) * 1.4) > K.radius) continue;
          if (e.stats.boss) { e.fsm.change('hitstun', { frames: Math.round(K.daze / 3) }); continue; }
          e.fsm.change('stagger', { frames: K.daze });
        }
        f.world.events.emit('smokeBomb', { fighter: f, x: f.x, z: f.z, radius: K.radius });
      },
      update(f, frame) {
        stopMoving(f);
        if (frame >= 4 && tryActions(f)) return;
        if (frame >= 12) f.fsm.change('idle');
      },
    },

    // NIGHT FALLS (skill tree, the top of THE NIGHTBLADE): the light goes out of the
    // world, and she is everywhere: behind each of up to six men in turn, one cut each, and
    // then back where she stood, sheathing. Nothing touches her while it lasts.
    nightfall: {
      enter(f) {
        const K = kitOf(f).nightfall;
        stopMoving(f);
        f.mana = Math.max(0, f.mana - K.cost);
        f.cool.nightfall = K.cooldown;
        f.nightFrom = { x: f.x, z: f.z, facing: f.facing };
        f.nightTargets = foes(f)
          .filter((e) => !e.stats.machine && Math.abs(e.x - f.x) <= K.range && Math.abs(e.z - f.z) <= K.depth)
          .sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x) || a.id - b.id)
          .slice(0, K.targets);
        f.nightDone = 0;
        f.move = null;
        f.activeAttack = null;
        f.world.events.emit('nightFalls', { fighter: f, targets: f.nightTargets });
      },
      update(f, frame) {
        const K = kitOf(f).nightfall;
        f.invincible = true;
        stopMoving(f);
        const lead = 18; // the dark coming down
        const n = f.nightTargets.length;
        const i = Math.floor((frame - lead) / K.every);
        f.hidden = frame >= lead && (frame - lead) % K.every < 4 && i < n; // (gone between the cuts)
        if (frame >= lead && (frame - lead) % K.every === 4 && i < n) {
          const v = f.nightTargets[i];
          if (v.alive && !['executed', 'dead'].includes(v.state)) {
            const side = -(v.facing || 1);
            f.x = clampX(f.world, v.x + side * K.behind);
            f.z = clampZ(f.world, v.z);
            f.facing = Math.sign(v.x - f.x) || f.facing;
            const move = {
              cut: 'slash', fx: 'dagger', markCash: true, unblockable: true,
              damage: K.damage * (v.stats.boss ? K.boss : 1), hitstun: 40, hitstop: 7, shake: 3,
              knockback: { x: 180, y: 140 }, knockdown: true, guardDamage: 60,
            };
            f.world.combat.resolve(f, v, move, { kind: 'melee', fromX: f.x, dir: f.facing, contact: { x: v.x - f.facing * 6, h: v.h + v.stats.body.h * 0.6 } });
            f.hitstop = Math.min(f.hitstop, 3); // (she doesn't stop on each one: the ultimate keeps its pace)
            f.nightDone++;
            f.world.events.emit('nightCut', { fighter: f, victim: v, index: i, last: i === n - 1 });
          }
        }
        const end = lead + n * K.every + 6;
        if (frame === end) {
          f.x = f.nightFrom.x; f.z = f.nightFrom.z; f.facing = f.nightFrom.facing;
          f.hidden = false;
          f.world.events.emit('nightLifts', { fighter: f, cut: f.nightDone });
        }
        if (frame >= end + 14) f.fsm.change('idle');
      },
      exit(f) { f.hidden = false; f.nightTargets = []; },
    },
  };
}

// SKULL STEP (skill tree): her extra jump in the air, taken over a man's head, springs off
// it: he staggers under the boot.
export function skullStep(f) {
  const v = foes(f)
    .filter((e) => !e.stats.boss && !e.stats.machine && Math.abs(e.x - f.x) < 34 && Math.abs(e.z - f.z) < 26 &&
      f.h - e.h > e.stats.body.h * 0.55 && f.h - e.h < e.stats.body.h + 70)
    .sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x) || a.id - b.id)[0];
  if (!v) return null;
  v.fsm.change('stagger', { frames: f.stats.skills.skullStep.stagger });
  f.world.events.emit('skullStep', { fighter: f, victim: v });
  return v;
}

// The skill tree's behaviours that answer to events. Once per world.
export function installRogue(world) {
  const ev = world.events;
  ev.on('kill', (e) => {
    const a = e.attacker;
    const S = a?.stats?.skills;
    if (!S || !a.alive || e.defender?.team === a.team) return;
    // KILLING RHYTHM: every kill gives back breath and mana
    if (S.rhythm) {
      a.stamina = Math.min(a.stats.maxStamina, a.stamina + S.rhythm.stamina);
      a.mana = Math.min(a.stats.maxMana, a.mana + S.rhythm.mana);
      ev.emit('skillProc', { fighter: a, skill: 'rhythm' });
    }
    // FALLING STAR: a Falling Viper kill throws her back up for another dive
    if (S.fallingStar && a.state === 'dive') a.diveStar = true;
  });
  // SPREADING MARK: a man she marked dies, and the mark jumps to the nearest man to him
  ev.on('kill', (e) => {
    const d = e.defender;
    const by = d?.exposedBy;
    const R = by?.stats?.skills?.spreadMark;
    if (!R || !(d.exposed > 0) || !by.alive) return;
    const next = world.fighters
      .filter((o) => o !== d && o.team === d.team && o.alive && !o.removeMe && !['executed', 'dead'].includes(o.state) && !(o.exposed > 0))
      .map((o) => ({ o, dist: Math.hypot(o.x - d.x, (o.z - d.z) * 1.4) }))
      .filter((q) => q.dist <= R.range)
      .sort((a, b) => a.dist - b.dist || a.o.id - b.o.id)[0]?.o;
    d.exposed = 0;
    if (next) {
      world.combat.expose(by, next);
      ev.emit('markSpread', { from: d, to: next, by });
    }
  });
  // the smoke's first cut exposes
  ev.on('hit', (e) => {
    const a = e.attacker;
    if (!a?.veilExpose || e.kind !== 'melee' || e.defender?.team === a.team) return;
    a.veilExpose = false;
    a.veil = 0;
    if (e.defender.health > 0) world.combat.expose(a, e.defender);
  });
}
