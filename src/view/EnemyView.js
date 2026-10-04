// EnemyView.js — Draws an enemy as a posed pixel-art "paper doll" (see enemyArt.js).
//
// Same job as FighterView (update() + destroy()), but every body part is a separate
// image. Each frame we build a POSE (torso lean, arm angles, crouch, feet...) from the
// fighter's state and move frame data, place the legs with 2-bone IK, and simulate
// flail chains. Because parts are separate, the gore system can take the doll apart:
// snapshot() hands it every part's exact on-screen transform, sever() pops an arm off.
//
// Angles are degrees, clockwise, in the doll's own (facing right) space:
//   limbs are drawn hanging DOWN, so arm 0 = hanging, -90 = pointing forward, -180 = up.
//   weapons are drawn pointing UP; weapon angle = arm + 90 + wrist (wF / wB).

import { DEPTH } from './depths.js';
import { movePhase } from '../combat/MoveRunner.js';
import { ENEMY_ART, P } from './enemyArt.js';
import { woundTex } from '../effects/goreArt.js';
import { FONT } from './fonts.js';

const D2R = Math.PI / 180;
const ATTACKS = ['light1', 'light2', 'light3', 'heavy', 'special1', 'special2', 'airAttack'];
const BACK_TINT = 0x8c8078;

// Key poses for each attack animation: `wind` = end of startup, `hit` = active.
const ANIMS = {
  slash:      { wind: { aF: -165, wF: -30, lean: -8, aB: 25, crouch: 1 },            hit: { aF: -62, wF: 60, lean: 14, step: 4, aB: -15, crouch: 2 } },
  backslash:  { wind: { aF: -10, wF: 100, lean: 6, aB: -25, crouch: 1 },             hit: { aF: -135, wF: -20, lean: -4, step: 3, aB: 20 } },
  chop:       { wind: { aF: -178, wF: -75, lean: -12, aB: -150 },                    hit: { aF: -38, wF: 62, lean: 24, crouch: 4, step: 6, aB: -40 } },
  uppercut:   { wind: { aF: 20, wF: 110, crouch: 5, lean: 14, aB: -20 },             hit: { aF: -172, wF: -20, lean: -8, step: 3 } },
  stab:       { wind: { aF: -12, wF: 12, lean: -6, bodyX: -2 },                      hit: { aF: -88, wF: -2, lean: 12, bodyX: 3, step: 6 } },
  stabB:      { wind: { aB: -12, wB: 12, lean: -6, bodyX: -2, aF: -10 },             hit: { aB: -88, wB: -2, lean: 14, step: 6, bodyX: 3, aF: 15 } },
  thrust:     { wind: { aF: -15, wF: 15, aB: -15, wB: 15, lean: -10, bodyX: -3, crouch: 3 }, hit: { aF: -90, wF: 0, aB: -80, wB: -10, lean: 28, bodyX: 5, step: 9, crouch: 5 } },
  swingChain: { wind: { aF: -155, wF: 0, lean: -10, aB: 20 },                        hit: { aF: -80, wF: 10, lean: 14, step: 4 }, chain: 'swing' },
  slamChain:  { wind: { aF: -178, wF: 0, lean: -14, aB: -150 },                      hit: { aF: -45, wF: 60, lean: 26, crouch: 5, step: 6, aB: -40 }, chain: 'slam' },
  spin:       { wind: { aF: -120, wF: 0, aB: 60, crouch: 3, lean: -4 },              hit: { aF: -95, wF: 0, aB: 90, crouch: 3 }, chain: 'spin', spin: true },
  hook:       { wind: { aB: -168, wB: 0, lean: -8, aF: -20 },                        hit: { aB: -88, wB: 0, lean: 12, step: 4 }, hook: true },
  bash:       { wind: { aB: -40, wB: -50, lean: -6, crouch: 2 },                     hit: { aB: -85, wB: -5, lean: 18, step: 6, bodyX: 4, crouch: 3 }, run: true },
  charge:     { wind: { lean: 18, crouch: 5, aF: -30, aB: -40 },                     hit: { lean: 34, crouch: 4, aF: -70, aB: -60 }, run: true },
};

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

function mix(a, b, t) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (typeof b[k] === 'number') out[k] = lerp(a[k] ?? 0, b[k], t);
    else if (t >= 0.5) out[k] = b[k];
  }
  return out;
}

// Direction of a limb drawn hanging down, rotated by `deg`.
function dir(deg) {
  const r = deg * D2R;
  return { x: -Math.sin(r), y: Math.cos(r) };
}
function rot(p, deg) {
  const r = deg * D2R;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}
// 2-bone IK: thigh length a, shin length b, knee bends forward (+x).
function solveLeg(hip, foot, a, b) {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const L = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(-dx, dy);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (a * a + L * L - b * b) / (2 * a * L))));
  const t1 = base - alpha;
  const knee = { x: hip.x - Math.sin(t1) * a, y: hip.y + Math.cos(t1) * a };
  const t2 = Math.atan2(-(foot.x - knee.x), foot.y - knee.y);
  return { thigh: t1 / D2R, shin: t2 / D2R, knee };
}

export class EnemyView {
  constructor(scene, fighter) {
    this.scene = scene;
    this.f = fighter;
    this.art = ENEMY_ART[fighter.stats.art];
    const A = this.art;
    const rig = A.rig;
    this.rest = { lean: 0, head: 0, aF: -20, wF: 20, aB: 10, wB: 0, crouch: rig.crouch ?? 0, bodyX: 0, step: 0, ...rig.rest };
    this.hidden = false;
    this.age = 0;
    this.visFacing = fighter.facing;

    this.shadow = scene.add.ellipse(fighter.x, fighter.z, fighter.stats.body.w * 1.5, 14, 0x000000, 0.4).setDepth(DEPTH.shadows);
    this.root = scene.add.container(fighter.x, fighter.z);
    this.parts = {};

    const img = (name, part, back = false) => {
      const def = A.parts[part];
      if (!def) return null;
      const i = scene.add.image(0, 0, def.key).setOrigin(def.ox / def.w, def.oy / def.h).setScale(P * (def.scale ?? 1));
      i.baseTint = back ? BACK_TINT : 0xffffff;
      i.def = def;
      this.parts[name] = i;
      this.root.add(i);
      return i;
    };
    const gfx = (name) => {
      const g = scene.add.graphics();
      this.root.add(g);
      this[name] = g;
    };

    // Draw order (back to front).
    if (A.parts.off && !rig.offFront) { gfx('chainB'); img('off', 'off', true); }
    if (A.parts.hookItem && !A.parts.off) gfx('chainB');
    img('armB', A.parts.armB ? 'armB' : 'arm', true);
    img('thighB', 'thigh', true);
    img('shinB', 'shin', true);
    img('torso', 'torso');
    img('thighF', 'thigh');
    img('shinF', 'shin');
    img('skirt', 'skirt');
    img('head', 'head');
    if (A.parts.off && rig.offFront) { gfx('chainB'); img('off', 'off'); }
    if (A.parts.hookItem) img('hookItem', 'hookItem');
    img('weapon', 'weapon');
    img('armF', 'arm');
    if (A.parts.chainEnd) { gfx('chainF'); img('chainEnd', 'chainEnd'); }

    // Stumps for arms lost while still alive.
    this.stumps = {};
    const skinRamp = A.gore?.skin;
    const skin = Array.isArray(skinRamp) ? skinRamp[3] ?? skinRamp[0] : '#b06a48';
    for (const k of ['armF', 'armB']) {
      const wt = woundTex(scene, { widthU: 12, part: 'upperArm', kind: 'clean', variant: fighter.id + (k === 'armB' ? 1 : 0), skin });
      const s = scene.add.image(0, 0, wt.key).setOrigin(wt.ox / wt.w, wt.oy / wt.h).setScale(wt.scale).setVisible(false);
      this.root.add(s);
      this.stumps[k] = s;
    }
    this.severed = {};

    // Flail chain simulation (art-pixel points in doll space).
    this.chainPts = null;
    if (rig.chain) {
      this.chainPts = [];
      for (let i = 0; i <= rig.chain.links; i++) this.chainPts.push({ x: 0, y: i * 2, px: 0, py: i * 2 });
      this.chainSeg = rig.chain.len / rig.chain.links;
    }

    // Name + health bar
    this.nameText = scene.add.text(0, 0, fighter.stats.name, {
      fontFamily: FONT.ui, fontSize: '12px', color: '#e8d0b0', fontStyle: 'normal',
    }).setOrigin(0.5, 1).setStroke('#000000', 3);
    this.hpBg = scene.add.rectangle(0, 0, 52, 5, 0x000000, 0.75).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(0, 0, 50, 3, 0xc0282d).setOrigin(0, 0.5);
  }

  // ------------------------------------------------------------ pose

  buildPose() {
    const f = this.f;
    const st = f.state;
    const fr = f.fsm.frame;
    const rest = this.rest;
    let pose = { ...rest };
    this.anim = null;
    this.phase = null;
    this.phaseT = 0;
    this.spinning = false;
    this.running = false;
    this.walking = false;

    // idle breathing
    pose.crouch += Math.sin(this.age * 0.07) * 0.5;
    pose.aF += Math.sin(this.age * 0.07 + 1) * 2;
    pose.aB += Math.sin(this.age * 0.07 + 2) * 2;

    if (ATTACKS.includes(st) && f.move) {
      const m = f.move;
      const anim = ANIMS[m.anim] ?? ANIMS.slash;
      this.anim = anim;
      const phase = movePhase(m, fr);
      this.phase = phase;
      const wind = { ...rest, ...anim.wind };
      const hit = { ...rest, ...anim.hit };
      if (phase === 'startup') {
        this.phaseT = fr / m.startup;
        pose = mix(rest, wind, easeOut(clamp01(this.phaseT)));
        if (anim.run && m.lunge > 150) this.running = true;
      } else if (phase === 'active') {
        this.phaseT = (fr - m.startup) / m.active;
        pose = mix(wind, hit, clamp01((fr - m.startup) / Math.min(3, m.active)));
        this.spinning = !!anim.spin;
        this.running = !!anim.run;
      } else {
        this.phaseT = (fr - m.startup - m.active) / Math.max(1, m.recovery);
        pose = mix(hit, rest, easeInOut(clamp01(this.phaseT)));
      }
      if (anim.spin && phase !== 'recovery') pose.aF += Math.sin(fr * 0.6) * 20;
    } else if (st === 'walk') {
      this.walking = true;
    } else if (st === 'block' || st === 'parry') {
      pose = mix(pose, { aF: -75, wF: -15, lean: -4, crouch: rest.crouch + 1.5 }, 1);
      if (this.art.rig.offFront) { pose.aB = -80; pose.wB = -10; }
    } else if (st === 'hitstun') {
      const k = Math.max(0, 1 - fr / 14);
      pose = mix(pose, { lean: -18, head: -18, aF: rest.aF + 30, aB: rest.aB + 30, bodyX: -2 }, k);
    } else if (st === 'stagger' || st === 'guardBreak') {
      pose = mix(pose, { lean: Math.sin(fr * 0.35) * 10 - 8, head: Math.sin(fr * 0.5) * 10, aF: 15, wF: 70, aB: 35, crouch: rest.crouch + 3 }, 1);
    } else if (st === 'knockdown' || st === 'dead' || st === 'getup') {
      pose = mix(pose, { lean: -6, head: -20, aF: -150, aB: -130, wF: 40, crouch: 0 }, 1);
    } else if (st === 'jump' || st === 'airAttack') {
      pose = mix(pose, { crouch: -1, aF: rest.aF - 20 }, 1);
    }
    return pose;
  }

  // Where feet go this frame.
  feet(pose) {
    const f = this.f;
    const rig = this.art.rig;
    const st = f.state;
    const ankle = 3.4;
    let F = { x: rig.stance[0] + pose.step, y: -ankle };
    let B = { x: rig.stance[1], y: -ankle };
    const moving = st === 'walk' || this.running;
    if (moving) {
      const speed = Math.hypot(f.vx, f.vz);
      const backwards = f.vx * f.facing < -5 ? -1 : 1;
      this.walkPhase = (this.walkPhase ?? 0) + (0.12 + speed / 1400) * backwards;
      const stride = this.running ? 7 : 5;
      const ph = this.walkPhase;
      F = { x: (rig.stance[0] + rig.stance[1]) / 2 + Math.sin(ph) * stride + 1, y: -ankle - Math.max(0, Math.cos(ph)) * 3 };
      B = { x: (rig.stance[0] + rig.stance[1]) / 2 - Math.sin(ph) * stride - 1, y: -ankle - Math.max(0, -Math.cos(ph)) * 3 };
      pose.crouch += Math.abs(Math.sin(ph * 2)) * 0.8;
      pose.aF += Math.sin(ph) * -12;
      pose.aB += Math.sin(ph) * 12;
      if (this.running) pose.lean = Math.max(pose.lean, 16);
    }
    if (f.air > 0 && st !== 'knockdown') { F.y -= 2; B.y -= 3; F.x -= 1; }
    return { F, B };
  }

  // ------------------------------------------------------------ per frame

  update() {
    const f = this.f;
    if (this.hidden) return;
    this.age++;
    const A = this.art;
    const rig = A.rig;
    const st = f.state;
    const fr = f.fsm.frame;
    const pose = this.buildPose();
    const { F: footF, B: footB } = this.feet(pose);

    // Legs: hip height from leg length, minus crouch.
    const ankle = 3.4;
    const hipY = -(ankle + rig.thigh + rig.shin - 1.2) + pose.crouch;
    const hip = { x: pose.bodyX, y: hipY };
    const hipF = { x: hip.x + rig.hipF.x, y: hip.y + rig.hipF.y };
    const hipB = { x: hip.x + rig.hipB.x, y: hip.y + rig.hipB.y };
    const legF = solveLeg(hipF, footF, rig.thigh, rig.shin);
    const legB = solveLeg(hipB, footB, rig.thigh, rig.shin);

    // Torso chain
    const lean = pose.lean;
    const neck = { x: hip.x + rot(rig.neck, lean).x, y: hip.y + rot(rig.neck, lean).y };
    const shF = rot(rig.shoulderF, lean);
    const shB = rot(rig.shoulderB, lean);
    const shoulderF = { x: hip.x + shF.x, y: hip.y + shF.y };
    const shoulderB = { x: hip.x + shB.x, y: hip.y + shB.y };
    const armLen = rig.armLen;
    const dF = dir(pose.aF);
    const dB = dir(pose.aB);
    const handF = { x: shoulderF.x + dF.x * armLen, y: shoulderF.y + dF.y * armLen };
    const handB = { x: shoulderB.x + dB.x * armLen, y: shoulderB.y + dB.y * armLen };
    const wAngF = pose.aF + 90 + pose.wF;
    const wAngB = pose.aB + 90 + pose.wB;

    const place = (name, p, deg) => {
      const i = this.parts[name];
      if (!i) return;
      i.setPosition(p.x * P, p.y * P);
      i.rotation = deg * D2R;
    };
    place('thighF', hipF, legF.thigh);
    place('shinF', legF.knee, legF.shin);
    place('thighB', hipB, legB.thigh);
    place('shinB', legB.knee, legB.shin);
    place('torso', hip, lean);
    place('skirt', { x: hip.x + 0.5, y: hip.y - 1.5 }, lean * 0.5 + (this.walking ? Math.sin((this.walkPhase ?? 0) * 2) * 4 : 0));
    place('head', neck, lean * 0.6 + pose.head);
    place('armF', shoulderF, pose.aF);
    place('armB', shoulderB, pose.aB);
    place('weapon', handF, wAngF);
    if (rig.offHangs) place('off', { x: handB.x, y: handB.y }, Math.sin(this.age * 0.08) * 8 - f.vx * f.facing * 0.05);
    else place('off', handB, wAngB);

    // Hook / sickle thrown on a chain from the back hand.
    this.updateHook(handB);
    // Flail chain from the handle tip.
    this.updateChain(handF, wAngF, pose);

    // Lost arms: hide the arm (and what it held), show a stump.
    for (const k of ['armF', 'armB']) {
      const lost = f.maimed?.[k];
      const s = this.stumps[k];
      if (!lost) continue;
      const sh = k === 'armF' ? shoulderF : shoulderB;
      const a = k === 'armF' ? pose.aF : pose.aB;
      const d = dir(a);
      s.setVisible(true).setPosition((sh.x + d.x * 2) * P, (sh.y + d.y * 2) * P);
      s.rotation = a * D2R;
      if (f.alive && this.age % 3 === 0) this.spurt(sh.x + d.x * 2, sh.y + d.y * 2, a, 0.7);
    }
    this.parts.armF?.setVisible(!f.maimed?.armF);
    this.parts.weapon?.setVisible(!f.maimed?.armF);
    this.parts.chainEnd?.setVisible(!f.maimed?.armF);
    this.chainF?.setVisible(!f.maimed?.armF);
    this.parts.armB?.setVisible(!f.maimed?.armB);
    this.parts.off?.setVisible(!f.maimed?.armB && !(this.hookOut > 0 && !A.parts.hookItem));
    this.chainB?.setVisible(!f.maimed?.armB);

    // Whole body: falls, spins and fades.
    let angle = 0;
    let alpha = 1;
    let lift = 0;
    if (st === 'knockdown') angle = f.lyingSince === null ? -55 - Math.min(35, fr * 3) : -90;
    else if (st === 'dead') { angle = -90; alpha = Math.max(0, 1 - Math.max(0, fr - 100) / 50); }
    else if (st === 'getup') { angle = -90 * (1 - fr / f.stats.getupFrames); alpha = fr % 4 < 2 ? 0.7 : 1; }
    if (angle <= -85) lift = -4;
    this.visFacing = this.spinning ? (Math.floor(fr / 3) % 2 ? -f.facing : f.facing) : f.facing;
    this.root.setPosition(f.x, f.z - f.h + lift).setDepth(f.z);
    this.root.setScale(this.visFacing, 1);
    this.root.rotation = angle * D2R * this.visFacing;
    this.root.alpha = alpha;

    // Tints: hit flash, heavy wind-up telegraph, stagger, parry glint.
    let tint = null;
    let fill = false;
    const m = f.move;
    if (f.flash > 0) {
      // flicker instead of a solid white silhouette (long hitstops read as a white blob)
      // one bright pop on impact, then a red flicker (the flash timer doesn't run during hitstop)
      if (f.flash === 6 && this.prevFlash !== 6) this.flashAge = 0; // a new hit landed
      this.flashAge = (this.flashAge ?? 0) + 1;
      const early = this.flashAge <= 4;
      if (early || (f.hitstop === 0 && this.age % 4 < 2)) { tint = 0xffffff; fill = true; }
      else tint = 0xff8a7a;
    }
    else if (ATTACKS.includes(st) && m && (st === 'heavy' || m.superArmor || m.chain) && fr <= m.startup && Math.floor(fr / 3) % 2 === 0) tint = 0xffa060;
    else if ((st === 'stagger' || st === 'guardBreak') && Math.floor(fr / 4) % 2 === 0) tint = 0xffe080;
    else if (f.parryActive) tint = 0xcfe6ff;
    this.prevFlash = f.flash;
    for (const i of Object.values(this.parts)) {
      if (fill) i.setTintFill(tint);
      else if (tint) i.setTint(tint);
      else if (i.baseTint !== 0xffffff) i.setTint(i.baseTint);
      else i.clearTint();
    }

    const shadowScale = 1 - Math.min(f.h / 300, 0.5);
    this.shadow.setPosition(f.x + (angle <= -85 ? -f.facing * 30 : 0), f.z).setScale(shadowScale * (angle <= -85 ? 1.8 : 1), 1).setAlpha(0.4 * alpha);

    // Names and health live in the HUD's bottom strip now — nothing drawn over the action.
    const show = false;
    const top = f.z - f.h - f.stats.body.h - 16;
    this.nameText.setVisible(show).setPosition(f.x, top - 4).setDepth(DEPTH.popups - 1)
      .setAlpha(this.age < 150 ? 1 : 0.8);
    this.hpBg.setVisible(show && f.health < f.stats.maxHealth).setPosition(f.x - 26, top).setDepth(DEPTH.popups - 1);
    this.hpFill.setVisible(show && f.health < f.stats.maxHealth).setPosition(f.x - 25, top).setDepth(DEPTH.popups - 1);
    this.hpFill.scaleX = Math.max(0, f.health / f.stats.maxHealth);
  }

  // Hook/sickle flies out along the move's hitbox, then reels back in.
  updateHook(handB) {
    const f = this.f;
    const g = this.chainB;
    g?.clear();
    const item = this.parts.hookItem ?? (this.art.rig.offHangs ? this.parts.off : null);
    if (!item) return;
    let out = 0;
    const m = f.move;
    if (this.anim?.hook && m) {
      if (this.phase === 'active') out = easeOut(clamp01(this.phaseT * 1.6));
      else if (this.phase === 'recovery') out = 1 - easeInOut(clamp01(this.phaseT * 1.3));
    }
    this.hookOut = out;
    const isHookItem = item === this.parts.hookItem;
    if (isHookItem) item.setVisible(out > 0.02 && !f.maimed?.armB);
    if (out <= 0.02) return;
    const hb = m.hitbox;
    const target = { x: (hb.x + hb.w) / P, y: -(hb.y + hb.h / 2) / P };
    const p = { x: lerp(handB.x, target.x, out), y: lerp(handB.y, target.y, out) };
    item.setPosition(p.x * P, p.y * P);
    item.rotation = ((item.def.hookRot ?? -90) + Math.sin(this.age * 0.9) * 25) * D2R;
    // chain with a little sag
    const n = Math.max(4, Math.round(Math.hypot(p.x - handB.x, p.y - handB.y) / 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(handB.x, p.x, t);
      const y = lerp(handB.y, p.y, t) + Math.sin(t * Math.PI) * (1 - out) * 6;
      g.fillStyle(i % 2 ? 0x8a8a90 : 0x44444c, 1).fillRect(x * P - 1, y * P - 1, P, P);
    }
  }

  // Verlet chain from the flail handle tip to the ball; attacks fling the ball.
  updateChain(handF, wAng, pose) {
    const pts = this.chainPts;
    if (!pts) return;
    const f = this.f;
    const def = this.art.parts.weapon;
    const tipLen = (def.oy - (def.tip?.[1] ?? 0)) * (def.scale ?? 1) - 0.5; // art px
    const wd = dir(wAng + 180); // weapon points "up" = opposite of hanging
    const anchor = { x: handF.x + wd.x * tipLen, y: handF.y + wd.y * tipLen };

    // Gravity in doll space (world-down, undone by the doll's flip and rotation).
    const R = -this.root.rotation * this.visFacing;
    const g = rot({ x: 0, y: 0.45 }, R / D2R);
    const n = pts.length - 1;
    const len = this.chainSeg * n;

    // Where the attack wants the ball.
    let target = null;
    const m = f.move;
    const mode = this.anim?.chain;
    if (mode && m) {
      const hb = m.hitbox;
      const reachX = (hb.x + hb.w - 6) / P;
      const midY = -(hb.y + hb.h / 2) / P;
      const ph = this.phase;
      const t = this.phaseT;
      if (mode === 'spin' && ph !== 'recovery') {
        const a = this.age * 0.45;
        target = { x: anchor.x + Math.cos(a) * len, y: anchor.y + Math.sin(a) * len * 0.35 };
      } else if (ph === 'startup') {
        const a = -Math.PI / 2 - t * m.startup * 0.43;            // whirl overhead (same speed however long the wind-up)
        target = { x: anchor.x + Math.cos(a) * len * 0.9, y: anchor.y + Math.sin(a) * len * 0.6 - 4 };
      } else if (ph === 'active') {
        target = mode === 'slam' ? { x: reachX, y: -2 } : { x: reachX, y: midY };
      }
    }

    pts[0].x = anchor.x; pts[0].y = anchor.y;
    pts[0].px = anchor.x; pts[0].py = anchor.y;
    for (let i = 1; i <= n; i++) {
      const p = pts[i];
      const vx = (p.x - p.px) * 0.94;
      const vy = (p.y - p.py) * 0.94;
      p.px = p.x; p.py = p.y;
      p.x += vx + g.x;
      p.y += vy + g.y;
      if (p.y > -1 && Math.abs(this.root.rotation) < 0.3) { p.y = -1; p.px = p.x - vx * 0.6; } // floor
    }
    if (target) {
      const e = pts[n];
      e.x += (target.x - e.x) * 0.5;
      e.y += (target.y - e.y) * 0.5;
    }
    for (let k = 0; k < 6; k++) {
      for (let i = 1; i <= n; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const diff = (d - this.chainSeg) / d;
        if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    }

    const gfx = this.chainF;
    gfx.clear();
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (let s = 0; s < 2; s++) {
        const x = lerp(a.x, b.x, s / 2);
        const y = lerp(a.y, b.y, s / 2);
        gfx.fillStyle((i * 2 + s) % 2 ? 0x9a9aa2 : 0x3e3e46, 1).fillRect(x * P - 1, y * P - 1, P + 1, P + 1);
      }
    }
    const end = pts[n];
    const prev = pts[n - 1];
    const ball = this.parts.chainEnd;
    ball.setPosition(end.x * P, end.y * P);
    ball.rotation = Math.atan2(end.y - prev.y, end.x - prev.x) + this.age * (mode ? 0.3 : 0.02);
  }

  // A few drops of blood from a point in doll space, sprayed along a limb angle.
  spurt(lx, ly, limbDeg, power = 1) {
    const gore = this.scene.gore;
    if (!gore || gore.level === 0) return;
    const w = this.toWorld(lx, ly);
    const d = dir(limbDeg + 180);
    const s = 120 + Math.random() * 140 * power;
    gore.spawn({
      x: w.x, z: this.f.z + (Math.random() - 0.5) * 4, h: this.f.z - w.y,
      vx: d.x * s * this.visFacing + (Math.random() - 0.5) * 40, vz: (Math.random() - 0.5) * 20,
      vh: -d.y * s + 60, tint: 0x8a0303, scale: 0.35 + Math.random() * 0.3,
    });
  }

  // ------------------------------------------------------------ gore hand-off

  // Doll-space art pixels -> world (screen) pixels.
  toWorld(lx, ly) {
    const c = Math.cos(this.root.rotation);
    const s = Math.sin(this.root.rotation);
    const x = lx * P * this.visFacing;
    const y = ly * P;
    return { x: this.root.x + x * c - y * s, y: this.root.y + x * s + y * c };
  }

  // Every visible part's exact on-screen transform, for building gibs.
  snapshot() {
    const snaps = {};
    for (const [name, i] of Object.entries(this.parts)) {
      if (!i.visible) continue;
      const w = this.toWorld(i.x / P, i.y / P);
      snaps[name] = {
        name, key: i.def.key, def: i.def, ox: i.def.ox, oy: i.def.oy,
        x: w.x, y: w.y,
        rot: this.root.rotation + this.visFacing * i.rotation,
        sx: this.visFacing * i.scaleX, sy: i.scaleY,
        tint: i.baseTint,
      };
    }
    // flail chain points (world) so the chain can drop with the body
    if (this.chainPts && this.chainF?.visible) snaps.chainPts = this.chainPts.map((p) => this.toWorld(p.x, p.y));
    return { parts: snaps, art: this.art, facing: this.visFacing, z: this.f.z, x: this.root.x, y: this.root.y };
  }

  // Take the doll apart: the gore system now owns the pieces.
  hideAll() {
    this.hidden = true;
    this.root.setVisible(false);
    this.shadow.setVisible(false);
    this.nameText.setVisible(false);
    this.hpBg.setVisible(false);
    this.hpFill.setVisible(false);
  }

  // An arm comes off a living enemy. Returns the snapshot of what flies away.
  sever(limb) {
    const snap = this.snapshot();
    const names = limb === 'armF' ? ['armF', 'weapon', 'chainEnd'] : ['armB', 'off'];
    const parts = {};
    for (const n of names) if (snap.parts[n]) parts[n] = snap.parts[n];
    if (limb === 'armF' && snap.parts.chainPts) parts.chainPts = snap.parts.chainPts;
    return { ...snap, parts };
  }

  destroy() {
    this.root.destroy();
    this.shadow.destroy();
    this.nameText.destroy();
    this.hpBg.destroy();
    this.hpFill.destroy();
  }
}
