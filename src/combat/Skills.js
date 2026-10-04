// Skills.js — What the skill tree's behaviours DO in a fight (data/skills.js lists them,
// progression/Progress.js applies the number changes to a hero's stats). Everything here
// reads stats.skills / stats.kit, so a hero without the skill is untouched.
//
//   LEAP SMASH (state 'plunge'): heavy in the air drives him straight down; landing,
//     everyone close is knocked down. SKYFALL: wider, launches them, and he bounces up.
//   BLOODRUSH: a kill gives back stamina and health
//   IRON WALL: a parry hits back and breaks the man's guard
//   BERSERK: no blocking; every blow gives back stamina (the damage is in meleeMult)
//   OATH OF FURY: low on health, blows don't stagger him (CombatSystem's super armor
//     asks furyArmor) and his damage heals him

// Low on health with the Oath of Fury: he shrugs blows off.
export function furyArmor(f) {
  const F = f.stats.skills?.fury;
  return !!F && f.alive && f.health < f.stats.maxHealth * F.below;
}

// The states the skills add (merged into FIGHTER_STATES by fighterStates.js).
export function skillStates() {
  return {
    plunge: {
      enter(f) {
        const K = f.stats.kit.plunge;
        f.vx = 0; f.vz = 0;
        f.vh = -K.speed;
        f.move = null;
        f.activeAttack = null;
        f.world.events.emit('plungeStart', { fighter: f });
      },
      update(f, frame) {
        const K = f.stats.kit.plunge;
        f.vx = 0; f.vz = 0;
        if (f.landedAt) {
          // on one knee in the crater for a moment
          if (frame - f.landedAt >= 12) { f.landedAt = 0; f.fsm.change('idle'); }
          return;
        }
        if (!f.grounded) { f.vh = Math.min(f.vh, -K.speed); return; }
        smash(f, K);
        if (K.bounce && !f.plungeBounced) {
          // SKYFALL: back up off the crater, ready to come down again
          f.plungeBounced = true;
          f.vh = K.bounce;
          f.h = f.floor + 0.01;
          f.jumpHeld = false;
          f.airAttackUsed = false;
          return f.fsm.change('jump');
        }
        f.landedAt = frame;
      },
      exit(f) { f.landedAt = 0; },
    },
  };
}

// The crater: everyone within the radius on his level is hit and floored.
function smash(f, K) {
  const w = f.world;
  const move = {
    cut: 'blunt', fx: 'quake', damage: K.damage, hitstun: 30, hitstop: 7, shake: 8,
    knockback: { x: 220, y: K.launch || 260 }, knockdown: true, guardDamage: 80, breaksGuard: true,
  };
  for (const e of w.fighters) {
    if (e.team === f.team || !e.alive || e.invincible) continue;
    const dx = e.x - f.x;
    if (Math.abs(dx) > K.radius || Math.abs(e.z - f.z) > K.depth || Math.abs(e.h - f.h) > 60) continue;
    w.combat.resolve(f, e, move, { kind: 'magic', fromX: f.x, dir: Math.sign(dx) || f.facing, contact: { x: e.x, h: e.h + 40 } });
  }
  w.events.emit('leapSmash', { fighter: f, x: f.x, z: f.z, h: f.h, radius: K.radius, launch: !!K.launch });
}

// The skills that answer to events. Once per world.
export function installSkills(world) {
  const ev = world.events;
  ev.on('kill', (e) => {
    const a = e.attacker;
    const B = a?.stats?.skills?.bloodrush;
    if (!B || !a.alive || e.defender?.team === a.team) return;
    a.stamina = Math.min(a.stats.maxStamina, a.stamina + B.stamina);
    a.health = Math.min(a.stats.maxHealth, a.health + B.health);
    ev.emit('skillProc', { fighter: a, skill: 'bloodrush' });
  });
  ev.on('hit', (e) => {
    const a = e.attacker;
    const S = a?.stats?.skills;
    if (!S || !a.alive || e.defender?.team === a.team || !(e.damage > 0)) return;
    if (S.berserk) a.stamina = Math.min(a.stats.maxStamina, a.stamina + 6);
    if (furyArmor(a)) {
      a.health = Math.min(a.stats.maxHealth, a.health + e.damage * S.fury.leech);
      ev.emit('skillProc', { fighter: a, skill: 'fury' });
    }
  });
  ev.on('parry', (e) => {
    const me = e.defender;
    const W = me?.stats?.skills?.ironWall;
    const them = e.attacker;
    if (!W || !them?.alive || e.kind !== 'melee') return;
    const move = {
      cut: 'slash', damage: W.damage, hitstun: 34, hitstop: 8, shake: 5,
      knockback: { x: 180, y: 0 }, guardDamage: 999, breaksGuard: true, unblockable: true,
    };
    // (after the parry has finished with him: he's staggered, then the riposte lands)
    world.combat.resolve(me, them, move, { kind: 'magic', fromX: me.x, dir: Math.sign(them.x - me.x) || me.facing, contact: { x: them.x, h: them.h + 50 } });
    ev.emit('skillProc', { fighter: me, skill: 'ironWall' });
  });
}
