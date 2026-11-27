// GatesArmor.js — the Iron Gates garrison's defences (data/gatesEnemies.js): the Gate
// Warden's pavise and the Iron Guard's plate. Asked by CombatSystem.resolve for every blow
// that lands on one of them, before the usual parry / block / clean hit.
//
//   shieldCheck  -> 'blocked' (the blow rings off the shield: nothing more happens),
//                   'opened'  (it knocked the shield aside: it lands, and he's open), or
//                   null      (no shield in the way: carry on)
//   plateCheck   -> { mult, glance } for the damage: a light blow glances off plate (a
//                   quarter of it, and he doesn't flinch); a heavy one cracks a plate off.

const ABOVE = 46;       // an attacker this far above his feet comes down over the rim
const LIFT = 560;       // a blow that throws a man this high lifts him off his feet, shield and all

// Did this blow come at him the hard way (the answers listed in data/gatesEnemies.js)?
function heavyBlow(attacker, def, move, ctx) {
  if (move.breaksGuard || move.bowl || move.unblockable || move.sunder) return true;
  if ((move.knockback?.y ?? 0) >= LIFT) return true;               // launcher, updraft
  if (attacker && attacker.state === 'sweep') return true;         // Vexa's sweep: under the rim
  return false;
}

export function shieldCheck(world, attacker, def, move, ctx, facingSource) {
  const P = def.stats.pavise;
  if (!P || !def.alive || def.team !== 'enemy') return null;
  if ((def.shieldOpen ?? -1) > world.frame) return null;           // knocked aside: he's open
  if (def.isDowned || def.state === 'knockdown' || def.state === 'guardBreak' || !def.grounded) return null;
  if (!facingSource) return null;                                   // from behind: no shield there
  if (attacker && !attacker.grounded && (attacker.h ?? 0) - (def.h ?? 0) > ABOVE) return null; // over the rim
  if (heavyBlow(attacker, def, move, ctx)) {
    def.shieldOpen = world.frame + P.open;
    world.events.emit('shieldBreak', { defender: def, attacker, x: def.x + def.facing * 30, z: def.z });
    return 'opened';
  }
  // it rings off the iron: no damage, no flinch; a melee attacker is jarred back a step
  def.hitstop = 5;
  if (ctx.kind === 'melee' && attacker) {
    attacker.hitstop = Math.max(attacker.hitstop ?? 0, 7);
    attacker.vx = -ctx.dir * 140;
  } else if (ctx.projectile) {
    ctx.projectile.alive = false;
  }
  world.events.emit('shieldBlock', { defender: def, attacker, x: def.x + def.facing * 30, z: def.z, h: ctx.contact?.h ?? 60 });
  return 'blocked';
}

export function plateCheck(world, attacker, def, move, ctx, { crit = false, superCrit = false } = {}) {
  const max = def.stats.plates;
  if (!max || def.team !== 'enemy') return null;
  def.plates ??= max;
  if (def.plates <= 0) return { mult: 1.15, glance: false };        // bare: the iron's off him
  const big = heavyBlow(attacker, def, move, ctx) || crit || superCrit
    || (move.damage ?? 0) >= 18 || move.cut === 'fire' || move.cut === 'shock';
  if (!big) {
    world.events.emit('plateGlance', { defender: def, attacker, x: ctx.contact?.x ?? def.x, z: def.z, h: ctx.contact?.h ?? 70 });
    return { mult: 0.25, glance: true };
  }
  def.plates--;
  world.events.emit('plateBreak', { defender: def, attacker, left: def.plates, x: ctx.contact?.x ?? def.x, z: def.z, h: ctx.contact?.h ?? 70, dir: ctx.dir });
  return { mult: 0.6, glance: false };
}
