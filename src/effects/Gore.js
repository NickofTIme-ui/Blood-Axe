// Gore.js — Stylized blood: particle bursts on hit, splatter that stays on the floor,
// bigger "finisher" effects on kills, and non-gory sparks for blocks/parries.
//
// Gore level comes from SETTINGS.gore.level (0 OFF, 1 LOW, 2 FULL; G cycles it in game).
// Floor decals are painted onto one big RenderTexture, so thousands of splats cost
// no more than one image.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from '../view/depths.js';
import { Dismember } from './Dismember.js';
import { landDebris } from './Physics.js';

const BLOOD = [0x8a0303, 0xa10a0a, 0x6e0202, 0xb3120f];
const DECAL = [0x5a0000, 0x6b0505, 0x4a0000];
const GRAVITY = 1400;

const rand = (a, b) => a + Math.random() * (b - a);

// 'soft': a round puff that fades to nothing at its edge (mist, smoke, fire), painted once.
export function softTex(scene) {
  if (scene.textures.exists('soft')) return;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  scene.textures.addCanvas('soft', c);
}
// widest strip of the floor's blood layer (one RenderTexture each)
const DECAL_TILE = 2048;
const DECAL_REACH = 320; // (half the widest stamp, with room to spare)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Gore {
  constructor(scene) {
    this.scene = scene;
    if(scene.textures.exists('blood-ink-sheet')) {
      const tex=scene.textures.get('blood-ink-sheet'),src=tex.getSourceImage();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      const w=Math.floor(src.width/2),h=Math.floor(src.height/2);
      for(let i=0;i<4;i++)if(!tex.has(`ink-${i}`))tex.add(`ink-${i}`,0,(i%2)*w,Math.floor(i/2)*h,w,h);
      this.bloodArt=true;
    }
    this.drops = []; // flying blood, gibs and sparks
    const W = SETTINGS.world;
    this.rtY = W.floorTop - 60;
    // (the whole stage, not the test arena's 5600: a campaign level runs to 9400 and more,
    // and past the old edge blood stopped staining the floor. In strips, so no texture
    // is wider than a GPU will take)
    const width = scene.stageWidth ?? W.width;
    this.decalTiles = [];
    for (let x0 = 0; x0 < width; x0 += DECAL_TILE) {
      const rt = scene.add.renderTexture(x0, this.rtY, Math.min(DECAL_TILE, width - x0), SETTINGS.height - this.rtY)
        .setOrigin(0, 0).setDepth(DEPTH.decals);
      this.decalTiles.push({ x0, x1: x0 + rt.width, rt });
    }
    this.stamp = scene.make.image({ key: 'dot', add: false });
    // (stamps are queued and painted together once a frame: drawing into a strip costs a
    // copy of the whole strip, so one copy per frame instead of one per drop of blood)
    this.decalQueue = [];
    scene.events?.on('postupdate', this.flushDecals, this);
    scene.events?.once('shutdown', () => scene.events.off('postupdate', this.flushDecals, this));
    this.dismemberer = new Dismember(this);
    this.dismemberer.minZ = W.floorTop;
    this.dismemberer.maxZ = W.floorBottom;
    this.dismemberer.minX = W.edgePadding;
    this.dismemberer.maxX = width - W.edgePadding;
    this.puffs = [];
    softTex(scene);
  }

  get decalsLive() { return this.decalTiles[0]?.rt.active ?? false; }

  // Stamp `this.stamp` onto the floor at world x (y is already relative to rtY): into every
  // strip it might overlap, so a splat on a seam isn't cut in half. Queued as the stamp
  // looks now; painted at the end of the frame's update (flushDecals).
  drawDecal(x, y) {
    const st = this.stamp;
    for (const t of this.decalTiles) {
      if (x + DECAL_REACH < t.x0 || x - DECAL_REACH > t.x1) continue;
      this.decalQueue.push({ t, x: x - t.x0, y, key: st.texture.key, frame: st.frame.name, tint: st.tintTopLeft, sx: st.scaleX, sy: st.scaleY, rot: st.rotation, alpha: st.alpha });
    }
  }

  flushDecals() {
    const Q = this.decalQueue;
    if (!Q.length) return;
    this.decalQueue = [];
    const st = this.stamp;
    const keep = { key: st.texture.key, frame: st.frame.name, tint: st.tintTopLeft, sx: st.scaleX, sy: st.scaleY, rot: st.rotation, alpha: st.alpha, x: st.x, y: st.y };
    const look = (e) => {
      if (st.texture.key !== e.key || st.frame.name !== e.frame) st.setTexture(e.key, e.frame);
      st.setTint(e.tint).setScale(e.sx, e.sy).setRotation(e.rot).setAlpha(e.alpha).setPosition(e.x, e.y);
    };
    for (const t of this.decalTiles) {
      let open = false;
      for (const e of Q) {
        if (e.t !== t) continue;
        if (!t.rt.active) break;
        if (!open) { t.rt.beginDraw(); open = true; }
        look(e);
        t.rt.batchDraw(st);
      }
      if (open) t.rt.endDraw();
    }
    look(keep);
  }

  get level() { return SETTINGS.gore.level; }
  get amount() { return [0, 0.35, 2.7][this.level] ?? 2.7; }

  // ------------------------------------------------------------ spawning

  spawn({ x, z, h, vx, vz, vh, tint, scale, texture = 'dot', decal = true, life = 999, spin = 0, material = null }) {
    if (this.drops.length >= SETTINGS.gore.maxDrops) {
      const old = this.drops.shift();
      old.img.destroy();
    }
    const blood=this.bloodArt&&texture==='dot'&&decal&&!material;
    const streak=blood&&Math.hypot(vx,vh)>230;
    const img = this.scene.add.image(x, z - h, blood?'blood-ink-sheet':texture,blood?`ink-${streak?1:0}`:undefined).setTint(blood?0xffffff:tint).setScale(scale);
    const bloodWidth=blood?(streak?rand(30,52):rand(10,18))*scale:0;
    // Broaden fast painted jets across their direction of travel; keep their
    // length, artwork, motion, droplet count and floor splashes unchanged.
    if(blood)img.setDisplaySize(bloodWidth,rand(8,14)*scale*(streak?1.8:1)).setRotation(Math.atan2(vz-vh,vx));
    this.drops.push({ img, x, z, h, vx, vz, vh, scale, decal, life, spin, material,blood,bloodWidth });
  }

  // A spray of blood. dir = direction the hit was travelling (-1/1).
  burst(x, z, h, dir, count, power = 1) {
    for (let i = 0; i < count; i++) {
      this.spawn({
        x, z: z + rand(-4, 4), h,
        vx: dir * rand(40, 280) * power + rand(-40, 40),
        vz: rand(-50, 50),
        vh: rand(40, 320) * power,
        tint: pick(BLOOD),
        scale: rand(0.3, 0.9) * (this.level === 1 ? 0.8 : 1),
      });
    }
  }

  // Non-gory impact sparks (shown even with gore OFF).
  spark(x, z, h, color = 0xfff2a0, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(120, 380);
      this.spawn({
        x, z, h, vx: Math.cos(a) * s, vz: 0, vh: Math.sin(a) * s,
        tint: color, scale: rand(0.25, 0.5), decal: false, life: Math.floor(rand(8, 16)),
      });
    }
  }

  // ------------------------------------------------------------ reactions

  onHit(e) {
    if (this.level === 0) return this.spark(e.x, e.z, e.h, 0xffffff, 6);
    const count = Math.round(Math.min(40, 4 + e.damage * 1.3) * this.amount);
    this.burst(e.x, e.z, e.h, e.dir, count, e.move.hitstop >= 8 ? 1.4 : 1);
    this.splat(e.defender.x + e.dir * rand(5, 30), e.z + rand(-4, 4), rand(0.8, 1.6));
  }

  // view: the victim's view. Rigged enemies (EnemyView) can be taken apart.
  // Returns true if the body came apart (so the caller can shout about it).
  onKill(e, view) {
    if (this.level === 0) return this.spark(e.x, e.z, e.h, 0xffffff, 16), false;
    const victim = e.defender;
    this.burst(e.x, e.z, e.h, e.dir, Math.round(70 * this.amount), 1.7);

    // an enemy drawn with painted strips comes apart as that painting (effects/SpriteCut.js),
    // never as the old paper doll underneath it
    if (e.fatality && e.fatality !== 'none' && this.cutSprite(e.fatality, view, e)) return true;

    if (view?.snapshot && e.fatality && e.fatality !== 'none') {
      const snap = view.snapshot();
      view.hideAll();
      return this.dismember(e.fatality, snap, e);
    }

    if (this.level >= 2) {
      // Painted flesh replaces the old solid square kill particles.
      this.dismemberer.bits(e.x,e.z-e.h,e.z,['meat1','meat2'],2,.65,e.dir);
    }
    // A pool spreads under the body once it lands.
    const pool = () => {
      if (!this.decalsLive) return;
      for (let i = 0; i < 6; i++) this.splat(victim.x + rand(-30, 30), victim.z + rand(-5, 5), rand(2.5, 4.5), 0.6);
    };
    this.scene.time.delayedCall(700, pool);
    return false;
  }

  // A killing blow on a painted enemy (view/SpriteEnemyView.js): the frame on screen is
  // divided along the cut and the pieces thrown. Returns false if this view can't be cut
  // that way (no painted sprite showing), so the caller falls back to the doll.
  //   decap / headPop  the head comes off at the neck (flung, or popped straight up)
  //   halfH            cut through at the waist, the top half thrown clear
  //   halfV            lengthwise through the body; both sides tumble independently
  //   limbs            the legs taken at the knee, the body dropping where it stood
  //   explode          torn to pieces (blowApart), in a storm of meat
  cutSprite(type, view, e) {
    const cuts = this.scene.cuts;
    view?.prepareCut?.(); // (down as a ragdoll: back to his painted lying pose to be cut)
    if (!cuts || !view?.sheet || !view.sprite?.visible || view.cutAway) return false;
    const dir = e.dir || view.f.facing;
    const cut = { decap: 'neck', headPop: 'neck', halfH: 'waist', halfV: 'vertical', limbs: 'legs', explode: 'waist' }[type];
    if (!cut) return false;
    const f = view.f;
    const mid = f.h + f.stats.body.h * 0.5;
    // a mine doesn't cut a man in two: there are no halves, only what's left of him
    if (type === 'explode' && e.move?.fx === 'mine') return this.blowApart(view, e, { pieces: 15, power: 1.15 });
    if (type === 'explode' && e.move?.fx === 'trample') return this.blowApart(view,e,{pieces:14,power:1.15,push:dir*260});
    // anything else that blows a man up (a lotus, a rupture, a crushing crit) tears him
    // into fewer, bigger pieces, thrown the way the blow was going
    if (type === 'explode') return this.blowApart(view, e, { pieces: 9, power: 0.95, push: dir * 140 });
    if (e.sentence && cut === 'neck' && e.body) return this.sentenceCut(view, e, type, dir);
    const { upper, lower } = cuts.split(view, cut, dir, {
      impact:Number.isFinite(e.h)?Math.max(0,Math.min(1,(e.h-f.h)/f.stats.body.h)):null,
      impactSide:Number.isFinite(e.x)?(e.x-f.x)/f.stats.body.w*(Math.sign(view.sprite.scaleX)||1):0,
      // The blow supplies the broad direction; variation stays within the torso band.
      tilt: e.move?.cut === 'chop' ? rand(0.65, 1) : rand(0.15, 0.65),
    });
    view.cutAway = true;
    view.hideAll();
    if (type === 'decap') cuts.launch(upper, dir * rand(180, 420), rand(380, 520), dir * rand(9, 16));
    else if (type === 'headPop') cuts.launch(upper, dir * rand(-40, 60), rand(620, 760), dir * rand(4, 9));
    else if (type === 'halfH') cuts.launch(upper, dir * rand(160, 320), rand(260, 380), dir * rand(5, 9));
    else if (type === 'halfV') {
      const face=Math.sign(view.sprite.scaleX)||f.facing;
      const spread=e.attachedSplit?rand(35,55):rand(85,150);
      cuts.launch(upper, -face*spread+dir*35,rand(140,220),-face*rand(2,4));
      cuts.launch(lower, face*spread+dir*35,rand(110,190),face*rand(2,4));
      if(e.attachedSplit)cuts.attachSplit(upper,lower);
      // Spill from the opened abdomen, rather than dropping unrelated limb art.
      const D=this.dismemberer,belly=f.z-f.h-f.stats.body.h*.42;
      const skin=f.stats.look.skin;
      D.skin=typeof skin==='number'?`#${skin.toString(16).padStart(6,'0')}`:(skin??'#b06a48');
      D.bits(f.x,belly,f.z,['organ','gut'],2,.4,0);
      D.rope({x:f.x-5,y:belly},f.z,{chunk:upper,lenU:42,dir:-face,power:.3,copies:1});
    }
    else if (type === 'limbs') cuts.launch(upper, dir * rand(20, 70), rand(120, 180), dir * rand(1, 2.5));
    view.ragdollCut?.(type, upper, lower); // (what's left of him flops: view/Ragdoll.js)
    this.burst(f.x, f.z, mid, dir, Math.round(60 * this.amount), 1.6);
    return true;
  }

  // A sentenced man's head (stage/Sentence.js HOW HE GOES): the head goes the way the
  // blow rolled (e.head; the staff's blow always pops it) and the kneeling body after it
  // (e.body). `face` is the way he was kneeling (toward his executioner), `dir` the blade's.
  sentenceCut(view, e, type, dir) {
    const cuts = this.scene.cuts;
    const f = view.f;
    const { upper, lower } = cuts.split(view, 'neck', dir);
    view.cutAway = true;
    view.hideAll();
    const face = upper.face;
    const head = type === 'headPop' ? 'pop' : e.head;
    if (head === 'roll') { cuts.launch(upper, -dir * rand(80, 120), rand(220, 280), -dir * rand(4, 7)); upper.roll = 0.975; } // (back to the executioner's feet)
    else if (head === 'pop') cuts.launch(upper, dir * rand(-15, 25), rand(660, 740), rand(-6, 6));
    else if (head === 'drop') { cuts.launch(upper, face * rand(25, 45), rand(70, 120), face * rand(2, 3.5)); upper.roll = 0.93; } // (tips off in front of his knees)
    else if (head === 'skid') { cuts.launch(upper, dir * rand(360, 440), rand(110, 160), dir * rand(12, 18)); upper.roll = 0.985; }
    else cuts.launch(upper, dir * rand(240, 360), rand(470, 560), dir * rand(9, 14)); // fly
    // the body: how long it stays kneeling, which way and how far it goes over, how fast
    const B = {
      slump: { stand: 46, speed: 0.003, fall: face, to: 0.5, limp: { push: 45, spin: 1.1 } },
      linger: { stand: 120, speed: 0.0045, fall: face, to: 1.35, sway: true, limp: { push: 60, spin: 1.5 } },
      back: { stand: 30, speed: 0.004, fall: -face, to: 1.3, limp: { push: 50, spin: 1.6 } },
      blown: { stand: 6, speed: 0.02, fall: dir, to: Math.PI / 2 * 0.96, vx: dir * 110, limp: { push: 90, lift: 90, spin: 2.6 } },
      shudder: { stand: 64, speed: 0.014, fall: face, to: 1.45, shudder: true, limp: { push: 70, spin: 2 } },
    }[e.body] ?? { stand: 46, speed: 0.003, fall: face, to: 0.5 };
    Object.assign(lower, { stand: B.stand, toppleSpeed: B.speed, fallDir: B.fall, toppleTo: B.to, sway: B.sway, shudder: B.shudder, vx: B.vx ?? 0, bleed: 320, limpLaunch: B.limp });
    this.burst(f.x, f.z, f.h + f.stats.body.h * 0.5, dir, Math.round(60 * this.amount), 1.6);
    return true;
  }

  // A painted enemy blown to pieces: his picture torn into jagged fragments of armour,
  // cloth and skin (effects/SpriteCut.js shatter), painted meat, organs, gut, bone,
  // skull and an eye thrown out with them (effects/goreArt.js, the same pieces the doll
  // fatalities use), a heavy spray and a hanging red mist, a scorched ring of blood
  // below. push: extra sideways throw (the way the blow was travelling).
  blowApart(view, e, { pieces = 12, power = 1, push = 0 } = {}) {
    const f = view.f;
    const mid = f.h + f.stats.body.h * 0.5;
    const dir = e.dir || f.facing;
    // the blast's centre: a little below his middle, toward where it came from
    const bx = f.x - push * 0.05;
    const bh = f.h + f.stats.body.h * 0.4;
    const frags = this.scene.cuts.shatter(view, Math.round(pieces * (this.level === 1 ? 0.7 : 1)), bx, bh, power);
    if (push) for (const p of frags) p.vx += push * rand(0.5, 1.2);
    view.cutAway = true;
    view.hideAll();
    // what was inside him
    const D = this.dismemberer;
    const skin = f.stats.look.skin;
    D.skin = typeof skin === 'number' ? `#${skin.toString(16).padStart(6, '0')}` : (skin ?? '#b06a48');
    const y = f.z - mid;
    D.bits(f.x, y, f.z, ['meat1', 'meat2', 'meat3', 'organ', 'organ', 'gut'], 8, 1.25 * power, Math.sign(push));
    D.bits(f.x, y - 6, f.z, ['bone', 'bone', 'sinew'], 4, 1.1 * power, Math.sign(push));
    D.bits(f.x, f.z - f.h - f.stats.body.h * 0.85, f.z, ['skullBit', 'skullBit', 'eyeball'], 3, 1.3 * power, Math.sign(push));
    // blood: one heavy spray all round, a fan of it up, and a fine mist that hangs
    for (let i = 0; i < Math.round(70 * this.amount); i++) {
      const a = rand(-Math.PI, 0) + rand(-0.4, 0.4);
      const sp = rand(120, 620) * power;
      this.spawn({
        x: f.x + rand(-10, 10), z: f.z + rand(-6, 6), h: mid + rand(-24, 24),
        vx: Math.cos(a) * sp + push * 0.6, vz: rand(-80, 80), vh: -Math.sin(a) * sp + 80,
        tint: pick(BLOOD), scale: rand(0.25, 0.75),
      });
    }
    this.burst(f.x, f.z, mid, dir, Math.round(40 * this.amount), 1.5);
    this.mist(f.x, f.z, mid, 18);
    this.scorch(f.x, f.z);
    // the pool he leaves behind spreads as the last of it rains down
    this.scene.time.delayedCall(450, () => {
      if (!this.decalsLive) return;
      for (let i = 0; i < 8; i++) this.splat(f.x + rand(-50, 50), f.z + rand(-7, 7), rand(1.6, 3.6), 0.7);
    });
    return true;
  }

  // Take a rigged body apart (see effects/Dismember.js).
  dismember(type, snap, e) {
    return this.dismemberer.run(type, snap, e);
  }

  // An arm cut off a living enemy.
  onMaim(e, view) {
    if (this.level === 0 || !view?.sever) return;
    // a painted enemy: his scared one-armed art takes over; what flies off is meat and
    // blood, not the doll's arm
    if (view.sheet && view.sprite) {
      const f = view.f;
      const h = f.h + f.stats.body.h * 0.68;
      const dir = e.dir || f.facing;
      this.burst(f.x, f.z, h, dir, Math.round(46 * this.amount), 1.5);
      // Preserve the wound spray without spawning unrelated generic arm artwork.
      this.dismemberer.bits(f.x,f.z-h,f.z,['meat1','sinew'],2,.6,dir);
      return;
    }
    this.dismemberer.maim(view.sever(e.limb), e);
  }

  // Red mist that hangs in the air after something bursts.
  mist(x, z, h, count) {
    if (this.level === 0) return;
    for (let i = 0; i < count; i++) {
      const img = this.scene.add.image(x + rand(-18, 18), z - h + rand(-18, 12), 'soft')
        .setTint(pick([0x6e0202, 0x8a0303, 0x4a0000, 0x5a0408])).setScale(rand(0.5, 1.1)).setAlpha(rand(0.22, 0.42)).setDepth(z + 2);
      this.scene.tweens.add({
        targets: img, alpha: 0, scale: img.scale * 2, y: img.y + rand(-6, 26), x: img.x + rand(-28, 28),
        duration: rand(700, 1500), ease: 'Sine.easeOut', onComplete: () => img.destroy(),
      });
    }
  }

  // Black burn mark + a wide blood ring (explosions).
  scorch(x, z, fire = false) {
    if (this.level === 0) return;
    // (back to the small soft dot first: a splat may have left a 627-px blood-ink frame on the
    // stamp, and at 9x that's a dark smear over the whole floor, which the stampede piles up)
    this.stamp.setTexture('dot').setRotation(0).setScale(9, 3.2).setTint(fire ? 0x120a06 : 0x2a0000).setAlpha(0.7);
    this.drawDecal(x, z - this.rtY);
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(20, 70);
      this.splat(x + Math.cos(a) * d, z + Math.sin(a) * d * 0.3, rand(1, 2.4));
    }
  }

  // ------------------------------------------------------------ decals

  splat(x, z, size, alpha = 0.85) {
    if (this.level === 0) return;
    if(this.bloodArt) {
      this.stamp.setTexture('blood-ink-sheet',`ink-${Math.random()<.5?2:3}`)
        .setTint(0xffffff).setDisplaySize(size*rand(28,44),size*rand(12,20))
        .setRotation(rand(-.2,.2)).setAlpha(this.level===1?alpha*.6:alpha);
      this.drawDecal(x,z-this.rtY);return;
    }
    this.stamp.setTexture('dot').setRotation(0)
      .setScale(size * rand(1, 1.8), size * rand(0.45, 0.7))
      .setTint(pick(DECAL))
      .setAlpha(this.level === 1 ? alpha * 0.6 : alpha);
    this.drawDecal(x, z - this.rtY);
  }

  clearDecals() {
    this.decalQueue = [];
    for (const t of this.decalTiles) t.rt.clear();
    this.dismemberer.clear();
  }

  // ------------------------------------------------------------ per frame (60fps)

  update() {
    const dt = 1 / 60;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.vh -= GRAVITY * dt;
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      d.h += d.vh * dt;
      d.life--;
      if (d.spin) d.img.rotation += d.spin * dt;
      if(d.blood)d.img.setRotation(Math.atan2(d.vz-d.vh,d.vx));

      // (on a stage with ledges it lands on whatever is under it; the floor's stains are
      // only for the floor: a drop that lands on a ledge just soaks in)
      const T = this.scene.world?.terrain;
      const ground = T ? T.groundAt(d.x, d.z) : 0;
      if (d.material && ground >= 0 && d.h <= ground && d.life > 0) {
        landDebris(d, ground, d.material);
        d.img.setAlpha(Math.min(1, d.life / 30));
      } else if (d.h <= ground || d.life <= 0) {
        if (d.decal && d.h <= ground && ground === 0) this.splat(d.x, d.z, d.scale * (d.spin ? 1.2 : 0.8));
        d.img.destroy();
        this.drops.splice(i, 1);
        continue;
      }
      d.img.setPosition(d.x, d.z - d.h).setDepth(d.z + 1);
    }
    this.dismemberer.update();
  }
}
