// CombatSystem.js — Checks hitboxes against hurtboxes each frame and decides what
// happens: parry, block, guard break or a clean hit (damage, hitstun, knockdown,
// hitstop). It emits events ('hit', 'kill', 'block', 'parry', 'guardBreak') that
// the effects/HUD layers listen to — this file never draws anything.
// A move marked `unblockable` skips parry and block and always lands as a clean hit.

import { SETTINGS } from '../config/settings.js';
import { toWorldBox, overlaps, contactPoint } from './Boxes.js';
import { movePhase } from './MoveRunner.js';
import { chooseFatality, chooseMaim } from './Fatality.js';
import { furyArmor } from './Skills.js';
import { juggles, juggleHit } from './Juggle.js';

const FEEL = SETTINGS.feel;
const ATTACK_STATES = ['light1', 'light2', 'light3', 'launcher', 'heavy', 'special1', 'special2'];

// RIPOSTE: a hero who parries a blow has a moment to answer it. His next hit on the man
// he parried is a riposte: a sure critical, harder still, with a long freeze.
export const RIPOSTE = { window: 50, mult: 1.6, hitstop: 8 };

// A fighter who lost their weapon arm hits with a bloody stump.
const armMult = (f) => (f.maimed?.armF ? 0.4 : 1);

// Moves with superArmor can't be interrupted during startup/active.
function hasSuperArmor(f) {
  if (furyArmor(f)) return true; // (Rurik's OATH OF FURY, low on health: combat/Skills.js)
  if (f.stats.machine) return true; // (a war machine: iron doesn't flinch; the Ore Crusher)
  return !!f.move?.superArmor && ATTACK_STATES.includes(f.state) &&
    movePhase(f.move, f.fsm.frame) !== 'recovery';
}

export class CombatSystem {
  constructor(world) {
    this.world = world;
  }

  canBeHit(def, attackerTeam, hitList) {
    return def.team !== attackerTeam && def.alive && !def.invincible && !hitList.has(def.id);
  }

  update() {
    const fighters = this.world.fighters;

    // Melee hitboxes
    for (const atk of fighters) {
      const info = atk.activeAttack;
      if (!info) continue;
      const hb = info.hitbox ?? info.move.hitbox; // a move can grow its hitbox (thrust)
      const hitbox = toWorldBox(atk, hb);
      const tol = hb.depth ?? FEEL.depthTolerance;
      for (const def of fighters) {
        if (def === atk) continue;
        if (info.move.maxTargets && info.hitList.size >= info.move.maxTargets) break; // (a lunge's limit)
        if (this.shadowCheck(atk, def, info, hitbox, tol)) continue;
        if (!this.canBeHit(def, atk.team, info.hitList)) continue;
        if (this.world.barriers?.blocks(atk, def)) continue; // a Mage's wall between them
        const hurt = toWorldBox(def, def.hurtbox);
        if (!overlaps(hitbox, hurt, tol)) continue;
        info.hitList.add(def.id);
        this.resolve(atk, def, info.move, {
          kind: 'melee',
          fromX: atk.x,
          dir: Math.sign(def.x - atk.x) || atk.facing,
          contact: contactPoint(hitbox, hurt),
          nth: info.hitList.size, // 1 = first body the blade meets, 2+ = run through the next
        });
      }
    }

    // Projectiles
    for (const p of this.world.projectiles) {
      if (!p.alive) continue;
      const box = p.box;
      for (const def of fighters) {
        if (!p.alive || !this.canBeHit(def, p.team, p.hitList)) continue;
        const hurt = toWorldBox(def, def.hurtbox);
        if (!overlaps(box, hurt, p.data.depth ?? FEEL.depthTolerance)) continue;
        p.hitList.add(def.id);
        this.resolve(p.owner, def, p.data, {
          kind: 'magic',
          fromX: p.x - p.dir * 10,
          dir: p.dir,
          contact: contactPoint(box, hurt),
          projectile: p,
        });
        if (!p.data.pierce) p.alive = false;
      }
    }
  }

  // SHADOW WINDOW (the Rogue's perfect dodge): a blow that would have landed in the first
  // frames of her dodge. She gets a moment to answer it — her next hit on that man
  // EXPOSES him (see resolve). Returns true if this was one (the blow is spent on air).
  shadowCheck(atk, def, info, hitbox, tol) {
    const K = def.stats.kit?.shadow;
    if (!K || def.state !== 'dodge' || def.fsm.frame > K.window || def.team === atk.team || info.hitList.has(def.id)) return false;
    if (!overlaps(hitbox, toWorldBox(def, def.hurtbox), tol)) return false;
    info.hitList.add(def.id);
    def.shadowTarget = atk;
    // (her window to answer starts once the dodge is over)
    const d = def.stats.dodge;
    def.shadowUntil = this.world.frame + Math.max(0, d.duration + d.recovery - def.fsm.frame) + K.counter;
    this.world.events.emit('shadowWindow', { fighter: def, attacker: atk });
    return true;
  }

  // EXPOSED: the Rogue's precision opens a man up; every player hits him harder for a while.
  expose(by, def) {
    const K = by.stats.kit?.expose;
    if (!K || !def.alive || def.team === by.team) return;
    if (def.stats.boss && !K.bosses) return;
    if (def.stats.maxHealth < (K.minHealth ?? 0)) return;
    if (def.exposeCool > 0) return;
    if (def.exposed > 0 && !K.refresh) return;
    const fresh = !(def.exposed > 0);
    def.exposed = K.duration;
    def.exposedBonus = K.bonus;
    def.exposedBy = by;
    def.exposedCrit = K.crit ?? 1;
    def.exposedConsumes = K.critConsumes !== false;
    def.exposeCoolFrames = K.cooldown ?? 0;
    this.world.events.emit('exposed', { defender: def, by, fresh });
  }

  // attacker: who is responsible; def: who got touched; move: frame data
  resolve(attacker, def, move, ctx) {
    const bus = this.world.events;
    const dir = ctx.dir;
    const facingSource = ctx.fromX === def.x || Math.sign(ctx.fromX - def.x) === def.facing;
    const event = {
      attacker, defender: def, move, kind: ctx.kind, dir,
      x: ctx.contact.x, z: def.z, h: ctx.contact.h,
    };
    const melee = ctx.kind === 'melee';
    // an unblockable blow (the Warlord's Earthbreaker): no parry, no guard — it lands
    const guarded = !move.unblockable;

    // ---- PARRY: block tapped just in time, facing the attack
    if (guarded && facingSource && def.parryActive) {
      def.hitstop = FEEL.parryHitstop;
      if (melee) {
        attacker.hitstop = FEEL.parryHitstop;
        attacker.fsm.change('stagger', { frames: attacker.stats.staggerFrames });
        attacker.vx = -dir * 150;
      } else if (ctx.projectile) {
        ctx.projectile.alive = false;
      }
      def.stamina = Math.min(def.stats.maxStamina, def.stamina + 10);
      if (melee && def.team === 'player') def.riposte = { target: attacker, until: this.world.frame + RIPOSTE.window };
      def.fsm.change(def.controller.isDown('block') ? 'block' : 'idle');
      bus.emit('parry', event);
      return;
    }

    // ---- KICK INTO A GUARD: smashes the guard open and lands as a full hit (launch + bowl)
    if (guarded && facingSource && def.state === 'block' && move.bowl) {
      def.stamina = 0;
      def.staminaDelay = def.stats.staminaRegenDelay;
      bus.emit('guardBreak', event);
      // fall through to the clean hit below
    } else if (guarded && facingSource && def.state === 'block') {
      // ---- BLOCK (or guard break)
      const guardDamage = (move.guardDamage ?? 10) * def.stats.guardEfficiency;
      const chip = move.damage * (melee ? attacker.stats.meleeMult : attacker.stats.magicMult) *
        armMult(attacker) * (1 - def.stats.blockReduction);
      def.health = Math.max(1, def.health - chip); // chip damage can't kill

      if (move.breaksGuard || def.stamina - guardDamage <= 0) {
        def.stamina = 0;
        def.staminaDelay = def.stats.staminaRegenDelay;
        def.fsm.change('guardBreak', { frames: FEEL.guardBreakFrames });
        def.vx = dir * 120;
        def.hitstop = Math.min(FEEL.maxHitstop, (move.hitstop ?? 4) + 2);
        if (melee) attacker.hitstop = def.hitstop;
        bus.emit('guardBreak', event);
        return;
      }

      def.spendStamina(guardDamage);
      def.blockstun = Math.round((move.hitstun ?? 20) * 0.6);
      def.vx = dir * (move.knockback?.x ?? 60) * 0.5;
      def.hitstop = Math.round((move.hitstop ?? 4) * 0.6);
      if (melee) attacker.hitstop = def.hitstop;
      bus.emit('block', event);
      return;
    }

    // ---- CLEAN HIT
    // answering a perfect dodge (the Rogue's shadow window): a counter, and it EXPOSES him
    const shadow = attacker?.shadowTarget === def && this.world.frame <= (attacker.shadowUntil ?? -1);
    if (shadow) attacker.shadowTarget = null;
    const counter = def.state === 'stagger' || def.state === 'guardBreak' || shadow;
    const mult = (melee ? attacker.stats.meleeMult : attacker.stats.magicMult) * armMult(attacker);
    // the Rogue's mark: her own hits +bonus; ANOTHER player's hit is a SUPER CRITICAL
    const marked = def.exposed > 0 && attacker?.team === 'player';
    const superCrit = marked && attacker !== def.exposedBy && (def.exposedCrit ?? 1) > 1;
    const exposed = !marked ? 1 : superCrit ? def.exposedCrit : 1 + (def.exposedBonus ?? 0);
    if (superCrit && def.exposedConsumes) def.exposed = 0;
    // heroes' clean hits can land CRITICAL (rolled from the world's dice, so online stays in step)
    const riposte = melee && attacker?.riposte?.target === def && this.world.frame <= attacker.riposte.until;
    if (riposte) attacker.riposte = null;
    const critChance = attacker?.team === 'player' && !superCrit ? (attacker.stats.critChance ?? FEEL.critChance) : 0;
    const crit = riposte || (critChance > 0 && this.world.roll(def.id, 2300 + attacker.id) < critChance);
    // (a juggle hit: the Hangman's Hood trophy pays more for it — data/trophies.js)
    const juggleMult = juggles(attacker, def) ? (attacker.stats.juggleMult ?? 1) : 1;
    const damage = move.damage * mult * (counter ? FEEL.counterMultiplier : 1) * exposed *
      (crit ? FEEL.critMultiplier : 1) * juggleMult * (riposte ? RIPOSTE.mult : 1);
    const healthBefore = def.health;
    def.health = Math.max(def.spare || def.immortal ? 1 : 0, def.health - damage); // (spare: a boss beaten to his knees, not killed: stage/Sequence.js; immortal: config/testMode.js)
    def.flash = 6;
    if (attacker) def.lastAttacker = attacker; // (a kick off a ledge into a pit is his kill)
    // the Mage's staff refills him: mana equal to the health his melee blow took (data/characters.js manaOnMelee)
    if (melee && attacker?.stats.manaOnMelee && attacker.alive) {
      attacker.mana = Math.min(attacker.stats.maxMana, attacker.mana + (healthBefore - def.health) * attacker.stats.manaOnMelee);
    }
    const armored = hasSuperArmor(def);
    if (!armored) def.faceToward(ctx.fromX);
    event.damage = damage;
    event.counter = counter;
    event.exposed = exposed > 1;
    event.superCrit = superCrit;
    event.crit = crit;
    event.riposte = riposte;
    if ((move.expose || shadow) && !(def.health <= 0)) this.expose(attacker, def);

    const kb = move.knockback ?? { x: 0, y: 0 };
    const lethal = def.health <= 0;
    let hitstop = Math.min(FEEL.maxHitstop, (move.hitstop ?? 4) + (counter ? 3 : 0) + (superCrit ? 8 : crit ? 3 : 0) + (riposte ? RIPOSTE.hitstop : 0));
    if (lethal) hitstop = FEEL.killHitstop;
    def.hitstop = hitstop;
    // a piercing blade already buried in someone keeps driving: later victims only
    // cost the attacker a short catch, so the thrust stays one continuous motion
    if (melee) {
      attacker.hitstop = move.pierce && (ctx.nth ?? 1) > 1
        ? Math.max(attacker.hitstop, Math.round(hitstop * 0.35))
        : hitstop;
    }
    event.nth = ctx.nth ?? 1;

    // Kicked bodies go bowling into whoever is behind them (see World.bowling()).
    if (move.bowl) def.bowl = { frames: 36, dir, hit: new Set([def.id]) };

    if (lethal) {
      // a kill gives back health (the Warden's Chain trophy)
      if (attacker?.stats.killHeal && attacker.alive) attacker.health = Math.min(attacker.stats.maxHealth, attacker.health + attacker.stats.killHeal);
      // How do they come apart? (only rigged enemies can be dismembered)
      if (def.stats.art && superCrit) event.fatality = 'explode'; // heavy carnage
      else if (def.stats.art && move.fatality) event.fatality = move.fatality; // (a mine says how)
      else if (def.stats.art) {
        event.fatality = chooseFatality({
          cut: move.cut,
          damage,
          overkill: damage - healthBefore,
          counter,
          rel: (ctx.contact.h - def.h) / def.stats.body.h,
        }, this.world.rngFor(def.id, 21));
      }
      def.fatality = event.fatality ?? 'none';
      // a runner skewered from behind crumples where he stood instead of flying off
      if (move.impale && def.controller?.scared) def.fsm.change('knockdown', { vx: dir * 50, vh: 140 });
      else def.fsm.change('knockdown', { vx: dir * Math.max(kb.x, 220), vh: Math.max(kb.y, 380) });
      bus.emit('hit', event);
      bus.emit('kill', event);
      return;
    }

    // Hard blade hits can take an arm clean off.
    // (not the boss: he doesn't lose an arm, lose his nerve and get executed like fodder —
    // he's fought to the end)
    if (def.stats.art && !def.stats.boss) {
      const limb = chooseMaim({
        cut: move.cut, damage, counter, maxHealth: def.stats.maxHealth, maimed: def.maimed, maims: !!move.maims,
      }, this.world.rngFor(def.id, 22));
      if (limb) {
        def.maimed = { ...def.maimed, [limb]: true };
        event.limb = limb;
        bus.emit('maim', event);
      }
    }

    // Super armor: takes the damage, keeps swinging.
    if (armored) {
      def.hitstop = Math.min(def.hitstop, 4);
      bus.emit('hit', event);
      return;
    }
    if (def.isDowned) {
      // hitting a man who's down: he stays down (twitches from the blow), no juggling
      def.vx = dir * 30;
      def.hitstop = Math.min(def.hitstop, 6);
    } else if (move.impale && def.controller?.scared && def.grounded) {
      // the power thrust stops a fleeing man dead: pinned on the blade, going nowhere
      def.fsm.change('hitstun', { frames: 48 });
      def.vx = 0;
      def.vz = 0;
    } else if (juggles(attacker, def) && juggleHit(def, attacker, move, dir, melee)) {
      // AIR JUGGLE: a hero's hit on a man in the air keeps him up (combat/Juggle.js)
      event.juggle = def.juggles;
    } else if (move.knockdown || !def.grounded) {
      def.fsm.change('knockdown', { vx: dir * kb.x, vh: kb.y || 250 });
    } else {
      def.fsm.change('hitstun', { frames: move.hitstun ?? 20 });
      def.vx = dir * kb.x;
    }
    bus.emit('hit', event);
  }
}
