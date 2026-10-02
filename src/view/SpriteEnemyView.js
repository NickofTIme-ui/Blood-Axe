// SpriteEnemyView.js — Draws a named enemy with hand-animated sprite strips
// (data/enemyStrips.js), the same way SpriteFighterView draws Ulric: attack frames are
// synced to the move's frame data, so the strike pose is on screen exactly while the
// hitbox is out.
//
// The paper doll (EnemyView) keeps running underneath, hidden. It does three jobs:
//   - the gore system takes IT apart (snapshot / sever / hideAll), so kills still gib
//   - once an arm is cut off, the doll takes over drawing (the strips have both arms)
//   - its shadow, and its hook maths for chain throws
//
// Frames are imported at res 2 (twice the detail) and drawn at half scale.

import { EnemyView } from './EnemyView.js';
import { movePhase } from '../combat/MoveRunner.js';
import { P as ART_PX } from './enemyArt.js';
import { drawSmear, smearSparks } from './Smear.js';
import { ImpaledRig } from './ImpaledRig.js';
import { depthScale } from './depths.js';
import { Heading, headingAnim } from './Heading.js';
import { applyBurn } from '../effects/Burn.js';
import { IMPALE } from '../combat/Finisher.js';

const ATTACKS = ['light1', 'light2', 'light3', 'heavy', 'special1', 'special2', 'airAttack'];

// Swing smears by pose set, sized for a 108px-tall body (scaled to each enemy).
// Pokes, charges and chain throws get none — only real arcs smear.
const SMEARS = {
  slash:     { arc: [-80, 150], r: 70, cx: 6, cy: 70, w: 26 },
  backslash: { arc: [150, -40], r: 70, cx: 6, cy: 70, w: 26 },
  chop:      { arc: [-120, 95], r: 84, cx: 10, cy: 72, w: 36, heavy: true },
  uppercut:  { arc: [110, -95], r: 74, cx: 8, cy: 64, w: 28 },
};
const smearCache = new WeakMap();
function enemySmearMove(move, bodyH) {
  if (!SMEARS[move.anim] || move.chain) return null;
  let m = smearCache.get(move);
  if (!m) {
    const b = SMEARS[move.anim];
    const k = bodyH / 108;
    m = { ...move, smear: { ...b, r: b.r * k, cy: b.cy * k, cx: b.cx * k, w: b.w * k, enemy: true } };
    smearCache.set(move, m);
  }
  return m;
}

function spread(list, t) {
  return list[Math.min(list.length - 1, Math.max(0, Math.floor(t * list.length)))];
}
const lerp = (a, b, t) => a + (b - a) * t;

export class SpriteEnemyView {
  constructor(scene, fighter, sheet) {
    this.scene = scene;
    this.f = fighter;
    this.sheet = sheet; // { key, anims, scared, res }
    this.A = sheet.anims; // the animation set being drawn (see animSet())
    this.puppet = new EnemyView(scene, fighter);
    this.puppet.root.setVisible(false);
    this.res = sheet.res;
    this.sprite = scene.add.image(fighter.x, fighter.z, `${sheet.key}-walk`, 'f0')
      .setOrigin(sheet.ax / sheet.fw, sheet.ay / sheet.fh);
    this.chain = scene.add.graphics();
    this.smear = scene.add.graphics().setBlendMode(Phaser.BlendModes.NORMAL);
    this.hook = null;
    const hookDef = this.puppet.parts.hookItem?.def ?? (this.puppet.art.rig.offHangs ? this.puppet.parts.off?.def : null);
    if (hookDef) this.hook = scene.add.image(0, 0, hookDef.key).setOrigin(hookDef.ox / hookDef.w, hookDef.oy / hookDef.h).setVisible(false);
    this.hookDef = hookDef;
    this.lastRef = null;
    this.heading = new Heading();
  }

  get hidden() { return this.puppet.hidden; }

  anim(name) {
    return this.A[name] ?? null;
  }

  // Which animation set to draw: the normal one, or — once he's lost an arm and is
  // running for his life — the scared set for that arm (null = no art, use the doll).
  animSet() {
    const m = this.f.maimed ?? {};
    if (!m.armF && !m.armB) return this.sheet.anims;
    const side = m.armF && m.armB ? 'N' : m.armB ? 'B' : 'F';
    // art for this exact wound not in yet: the nearest scared set, else the normal new
    // sprite (stumps still bleed) — never the old low-res doll
    const sc = this.sheet.scared ?? {};
    return sc[side] ?? sc.B ?? sc.F ?? sc.N ?? this.sheet.anims;
  }

  frameFor() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const A = this.A;
    const loop = (a) => a.frames[Math.floor((fr * a.fps) / 60) % a.frames.length];

    if (ATTACKS.includes(st) && f.move) {
      const atk = this.anim(st);
      if (atk) {
        const m = f.move;
        const ph = atk.phases;
        const phase = movePhase(m, fr);
        if (phase === 'startup') return spread(ph.startup, (fr - 1) / m.startup);
        if (phase === 'active') return spread(ph.active, (fr - m.startup - 1) / Math.max(1, m.active));
        return spread(ph.recovery, (fr - m.startup - m.active - 1) / Math.max(1, m.recovery));
      }
      return A.idle.frames[0];
    }
    // just stopped walking: finish the step instead of snapping to the idle pose
    if (st === 'idle' && this.walkHold > 0 && this.lastWalkRef) return this.lastWalkRef;
    switch (st) {
      case 'walk': {
        this.lastWalkRef = this.walkFrame();
        this.walkHold = 7;
        return this.lastWalkRef;
      }
      case 'dodge': return loop({ ...A.walk, fps: 20 });
      case 'block':
      case 'parry': return A.block.frames[0];
      case 'hitstun': return fr < 10 ? A.hit.frames[0] : A.idle.frames[0];
      case 'stagger':
      case 'burning':
      case 'guardBreak': return A.hit.frames[0];
      case 'knockdown': return f.lyingSince === null ? A.air.frames[0] : A.lying.frames[0];
      case 'getup': return spread(A.getup.frames, fr / f.stats.getupFrames);
      case 'dead': return A.lying.frames[0];
      case 'jump': return A.air.frames[0];
      // held by an executioner: struggling in his grip / run through / frozen in terror
      case 'executed':
        // caught, but still running: a few more stumbling strides before he's stopped
        if (f.execRun && f.health > 0) return A.walk.frames[Math.floor((fr * (A.walk.fps ?? 12)) / 60) % A.walk.frames.length];
        return f.execBy?.exec?.kind === 'chain' && f.health > 0 ? A.idle.frames[0] : A.hit.frames[0];
      default: return loop(A.idle);
    }
  }

  // Walk cycle, advanced once per GAME tick (not per screen refresh) at a rate that
  // follows how fast the enemy is really moving, eased so stop-start AI movement doesn't
  // make the legs stutter. Backing away plays the cycle backwards.
  walkFrame() {
    const f = this.f;
    const tick = f.world?.frame ?? 0;
    const steps = Math.max(0, Math.min(5, tick - (this.walkTick ?? tick)));
    this.walkTick = tick;
    // back / front / three-quarter view by where he's heading (view/Heading.js)
    if (steps > 0) this.heading.update(f.vx, f.vz);
    const a = headingAnim(this.A, this.heading.dir);
    const speed = Math.hypot(f.vx, f.vz) / Math.max(1, f.stats.walkSpeed);
    this.walkRate = lerp(this.walkRate ?? 0.6, Math.max(0.35, Math.min(1.15, speed)), 0.12);
    const back = f.vx * f.facing < -5 ? -1 : 1;
    this.walkT = (this.walkT ?? 0) + steps * (a.fps / 60) * this.walkRate * back;
    const n = a.frames.length;
    this.walkIdx = ((Math.floor(this.walkT) % n) + n) % n;
    return a.frames[this.walkIdx];
  }

  setFrameRef(ref) {
    if (ref === this.lastRef) return;
    this.lastRef = ref;
    const [strip, i] = ref.split(':');
    this.sprite.setTexture(`${this.sheet.key}-${strip}`, `f${i}`);
  }

  // A finisher cut him in pieces: the pieces take over from the sprite
  // (effects/SpriteCut.js). Called by the arena on the game tick it happens (the pieces
  // are part of the fight — they knock men down — so it can't wait for a screen refresh).
  applyCut() {
    const f = this.f;
    if (this.cutAway || !f.execCut || !this.scene.cuts || this.puppet.hidden) return;
    // (cut the pose he was struck in — exactly what was on screen — not whatever his
    // state has moved on to: he may already count as dead, and that pose is lying down)
    this.pieces = this.scene.cuts.split(this, f.execCut, f.execBy?.facing ?? f.facing);
    this.scene.world.events.emit('finisherSplit', { victim: f, cut: f.execCut, pieces: this.pieces, view: this });
    this.cutAway = true;
    this.sprite.setVisible(false);
    this.puppet.root.setVisible(false);
  }

  update() {
    const f = this.f;
    const P = this.puppet;
    P.update();
    this.chain.clear();
    this.smear.clear();
    this.hook?.setVisible(false);
    this.applyCut();
    if (P.hidden || this.cutAway) { this.sprite.setVisible(false); this.rig?.hide(); return; }

    // lost an arm: the scared one-armed art — or, without it, the doll (shows the stump)
    const A = this.animSet();
    const doll = !A;
    P.root.setVisible(doll);
    this.sprite.setVisible(!doll);
    if (doll) return;
    if (A !== this.A) { this.A = A; this.lastWalkRef = null; this.walkHold = 0; }
    // scared = lost an arm (drawn with the scared art if it exists, else the normal art)
    const scared = !!(f.maimed?.armF || f.maimed?.armB);

    const st = f.state;
    const fr = f.fsm.frame;
    const tick = f.world?.frame ?? 0;
    const dt = Math.max(0, tick - (this.lastTick ?? tick));
    this.lastTick = tick;
    if (st !== 'walk' && this.walkHold > 0) this.walkHold -= dt;
    if (st !== 'walk' && st !== 'idle') this.walkHold = 0;
    this.setFrameRef(this.frameFor());

    // run through and hoisted on the blade: he hangs from it in pieces (view/ImpaledRig.js)
    const by = f.execBy;
    if (st === 'executed' && f.health <= 0 && by?.state === 'execute' && by.exec?.kind === 'impale' && !by.exec.fired.has('kick')) {
      this.rig = this.rig ?? new ImpaledRig(this.scene, this.sheet);
      this.sprite.setVisible(false);
      this.rig.draw(f, by, A.hit.frames[0], P.visFacing, A.lying?.frames[0]);
      this.rig.tint(f.hitstop > 0 && by.fsm.frame <= IMPALE.stab + 1 && f.hitstop > IMPALE.hitstop - 2);
      return;
    }
    this.rig?.hide();

    // same whole-body tint language as the doll: hit flash, wind-up telegraph, stagger
    const s = this.sprite;
    const m = f.move;
    s.clearTint();
    if (f.flash > 0) {
      if (f.flash === 6 && this.prevFlash !== 6) this.flashAge = 0;
      this.flashAge = (this.flashAge ?? 0) + 1;
      if (this.flashAge <= 4 || (f.hitstop === 0 && P.age % 4 < 2)) s.setTintFill(0xffffff);
      else s.setTint(0xff8a7a);
    } else if (ATTACKS.includes(st) && m && (st === 'heavy' || m.superArmor || m.chain) && fr <= m.startup && Math.floor(fr / 3) % 2 === 0) {
      s.setTint(0xffa060);
    } else if ((st === 'stagger' || st === 'guardBreak') && Math.floor(fr / 4) % 2 === 0) {
      s.setTint(0xffe080);
    }
    this.prevFlash = f.flash;
    // scorched / roasting / charred (effects/Burn.js): his own art, darkened in stages,
    // from the side that's in the fire
    if (f.burn && !(f.flash > 0)) applyBurn(s, f.burn);

    // a little life on top of the frames: recoil shove on hits, wobble when staggered
    let dx = 0;
    let dy = 0;
    let angle = 0;
    // lumbering weight: the body sinks onto each planted foot and rises through the
    // passing pose, with a slow side-to-side roll of the shoulders (bigger brutes more)
    const walking = st === 'walk' || (st === 'idle' && this.walkHold > 0);
    if (walking && A.walk?.lumber) {
      const n = A.walk.frames.length;
      const c = ((((this.walkT ?? 0) % n) + n) % n) / n; // 0..1 through the cycle (2 steps)
      const step = (c * 2) % 1;
      const mass = Math.min(1.4, f.stats.body.h / 108);
      dy = Math.max(0, Math.cos((step - 0.18) * Math.PI * 2)) * 1.8 * mass;
      angle = Math.sin(c * Math.PI * 2) * 1.3 * mass;
    }
    if (scared) {
      // shaking with terror while he cowers; a frantic, off-balance lurch while running
      if (st === 'idle' && !(this.walkHold > 0)) { dx = (Math.random() - 0.5) * 1.6; dy = (Math.random() - 0.5) * 0.8; }
      if (walking) angle = Math.sin((this.walkT ?? 0) * 1.7) * 3;
      // the stump keeps bleeding
      const gore = this.scene.gore;
      if (gore?.level > 0 && f.alive && P.age % 5 === 0) {
        const back = f.maimed?.armB;
        const sx = f.x + f.facing * (back ? -6 : 8);
        const sy = f.z - f.h - f.stats.body.h * 0.74;
        gore.spawn({
          x: sx, z: f.z + (Math.random() - 0.5) * 3, h: f.z - sy,
          vx: -f.facing * (20 + Math.random() * 60), vz: (Math.random() - 0.5) * 20, vh: 40 + Math.random() * 80,
          tint: 0x8a0303, scale: 0.3 + Math.random() * 0.3,
        });
      }
    }
    // idle breathing: a slow, eased rise and fall of the chest (a hair of vertical
    // stretch from the feet up), a small bob and a gentle weight shift. Each enemy on
    // his own rhythm so a crowd doesn't breathe in step.
    let breathe = 0;
    if (st === 'idle' && !walking && A.idle?.breathe) {
      this.breathPhase = this.breathPhase ?? Math.random() * Math.PI * 2;
      this.breathRate = this.breathRate ?? 0.045 + Math.random() * 0.015;
      const b = Math.sin(this.breathPhase + tick * this.breathRate);
      const eased = b * Math.abs(b) ** 0.3; // lingers a moment at full in / full out
      breathe = eased;
      dy += -eased * 0.6;
      angle += Math.sin(this.breathPhase * 0.7 + tick * this.breathRate * 0.5) * 0.35;
    }
    if (st === 'hitstun') dx = -Math.max(0, 6 - fr) * 1.2;
    if (st === 'executed') {
      // shaking in the grip; once the blade's in him his head goes back and he jerks
      const kind = f.execBy?.exec?.kind;
      dx = (Math.random() - 0.5) * (f.health > 0 ? 1.6 : 2.6);
      dy = (Math.random() - 0.5) * 0.8;
      if (kind === 'chain') {
        dx = 0; dy = 0;
        const hit = f.execStruck;
        if (hit) {
          // the blade is through him: his body goes with it for an instant — shoulders
          // dragged down a falling cut, snatched up by a rising one, wrenched round by
          // the flat one — before he comes apart
          this.struckAge = (this.struckAge ?? 0) + 1;
          const a = Math.min(1, this.struckAge / 3);
          const same = hit.dir === f.facing ? 1 : -1;
          angle = (hit.style === 'down' ? -9 : hit.style === 'up' ? 8 : 5) * a * same;
          dx = (hit.style === 'down' ? -2 : 3) * a * same;
          dy = hit.style === 'down' ? 2 * a : hit.style === 'up' ? -2 * a : 0;
        } else this.struckAge = 0;
      } else if (f.health <= 0 && kind === 'throat') angle = -9 - Math.sin(fr * 0.9) * 2.5;
      else if (f.health <= 0 && kind === 'impale') angle = -5 - Math.sin(fr * 0.7) * 2;
    }
    if (st === 'stagger' || st === 'guardBreak') angle = Math.sin(fr * 0.35) * 4;
    if (st === 'burning') {
      // alight: jerks back from the heat, then thrashes — arms and head going, no control
      angle = (fr < 10 ? -8 : Math.sin(fr * 0.8) * 9 + Math.sin(fr * 2.3) * 3);
      dx = (Math.random() - 0.5) * 3;
      dy = Math.abs(Math.sin(fr * 0.6)) * -3;
    }
    let alpha = 1;
    if (st === 'dead') {
      const age = f.deadAge ?? fr; // (stops counting while the body is still burning)
      alpha = Math.max(0, 1 - Math.max(0, age - (f.burn?.heat > 0.3 ? 370 : 100)) / 50);
    }
    if (st === 'getup') alpha = fr % 4 < 2 ? 0.7 : 1;

    const face = P.visFacing; // flips back and forth during spins
    const k = depthScale(f.z) / this.res;
    s.setPosition(f.x + dx * f.facing, f.z - f.h + dy).setDepth(f.z);
    s.setScale(k * face * (1 - breathe * 0.006), k * (1 + breathe * 0.014));
    s.angle = angle * face;
    s.setAlpha(alpha);

    this.drawHook();

    // swing smear (cold steel + blood) and sparks off the edge
    this.smear.clear().setDepth(f.z + 0.5);
    const sm = ATTACKS.includes(st) && m ? enemySmearMove(m, f.stats.body.h) : null;
    if (sm && st !== 'dead') {
      drawSmear(this.smear, f, sm, fr);
      if (fr !== this.sparkFrame || st !== this.sparkState) {
        this.sparkFrame = fr;
        this.sparkState = st;
        if (f.hitstop === 0) smearSparks(this.scene.gore, f, sm, fr);
      }
    }
  }

  // Chain throws (meat hook, sickle): the thrown item flies out on a chain from the
  // throwing hand to the end of the hitbox, then reels back in (doll's timing).
  drawHook() {
    const f = this.f;
    const P = this.puppet;
    const out = P.hookOut ?? 0;
    if (!this.hook || out <= 0.02 || !f.move) return;
    const hb = f.move.hitbox;
    const hand = { x: f.x + f.facing * 26, y: f.z - f.h - f.stats.body.h * 0.62 };
    const tip = { x: f.x + f.facing * (hb.x + hb.w), y: f.z - f.h - (hb.y + hb.h / 2) };
    const p = { x: lerp(hand.x, tip.x, out), y: lerp(hand.y, tip.y, out) };
    const g = this.chain.setDepth(f.z + 0.4);
    const n = Math.max(4, Math.round(Math.hypot(p.x - hand.x, p.y - hand.y) / 5));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(hand.x, p.x, t);
      const y = lerp(hand.y, p.y, t) + Math.sin(t * Math.PI) * (1 - out) * 14;
      g.fillStyle(0x1a1a1e, 1).fillRect(x - 2, y - 2, 4, 4);
      g.fillStyle(i % 2 ? 0x9a9aa2 : 0x5a5a62, 1).fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    const P2 = ART_PX;
    this.hook.setVisible(true).setPosition(p.x, p.y).setDepth(f.z + 0.5)
      .setScale(P2 * (this.hookDef.scale ?? 1) * f.facing, P2 * (this.hookDef.scale ?? 1));
    this.hook.rotation = (((this.hookDef.hookRot ?? -90) + Math.sin(P.age * 0.9) * 25) * Math.PI / 180) * f.facing;
  }

  // ---- gore hand-off: the doll is what comes apart
  snapshot() { return this.puppet.snapshot(); }
  sever(limb) { return this.puppet.sever(limb); }
  hideAll() {
    this.puppet.hideAll();
    this.sprite.setVisible(false);
    this.chain.clear();
    this.hook?.setVisible(false);
  }

  destroy() {
    this.puppet.destroy();
    this.sprite.destroy();
    this.chain.destroy();
    this.smear.destroy();
    this.hook?.destroy();
    this.rig?.destroy();
  }
}
