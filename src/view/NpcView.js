// NpcView.js — Draws a campaign level's people who aren't in the fight: the villagers
// (stage/Story.js states), the dead, and the other Oath Keepers when they are with you.
// View only: nothing here changes the game.
//
// THE VILLAGERS ARE TEMPORARY ART (code-drawn figures in plain homespun colours, no faces):
// the painted strips they need are listed in docs/cloud-handoff.md. Readability first:
// someone to save has a pale pulsing light behind him and acts it out (waving from a roof,
// cowering at the well); the saved stand up, then run; the dead lie still and grey.
//
// THE OATH KEEPERS travel together. Whoever isn't being played is drawn beside you at the
// start (they split up to search the village when the opening ends) and waits at the north
// gate. Rurik is always one of the three, so he is there for the vow whoever you play.
// They are real hero views (the game's own art) on stand-in fighters in a world of their
// own that never runs: the fight can't touch them.

import { DEPTH, depthScale } from './depths.js';
import { NPC, GUIDE } from '../stage/Story.js';
import { FONT } from './fonts.js';
import { World } from '../core/World.js';
import { Controller } from '../core/Controller.js';
import { createPlayer } from '../entities/Player.js';
import { SPRITES } from './levelArt.js';
import { keyLayer, cutPieces } from './envArt.js';
import { drawVincent, hideVincent } from './VincentView.js';
import { StableMasterView } from './StableMasterView.js';

const TUNIC = [0x5a6a5a, 0x6a5a48, 0x4a5468, 0x6a4a4a, 0x5a5048, 0x58586a];
const SKIN = 0xc8a080;
const HEROES = ['warrior', 'mage', 'rogue'];
// A companion out of sight: everything of him goes, the Mage's floor circle and motes too
// (views that draw more than a sprite and a shadow have a hide() of their own).
const hideView = (v) => {
  if (v.hide) v.hide();
  else { v.sprite?.setVisible(false); v.shadow?.setVisible(false); }
};

// The painted cage (assets/env/cage.png: shut on the left, broken open on the right, on
// magenta): cut out once into 'cage-shut' and 'cage-open', each trimmed to its bars.
const CAGE_H = 118; // drawn this tall (at depth scale 1): three men crouch in it
const BODY_W = 112; // a painted fallen villager is drawn this long
function paintedCage(scene) {
  const T = scene.textures;
  if (T.exists('cage-shut')) return true;
  if (!T.exists('cage-src')) return false;
  const img = T.get('cage-src').getSourceImage();
  const half = Math.floor(img.width / 2);
  for (const [name, x0] of [['cage-shut', 0], ['cage-open', half]]) {
    const c = document.createElement('canvas'); c.width = half; c.height = img.height;
    c.getContext('2d').drawImage(img, x0, 0, half, img.height, 0, 0, half, img.height);
    const cut = keyLayer(c, 'magenta');
    const px = cut.getContext('2d').getImageData(0, 0, half, img.height).data;
    let l = half; let r = 0; let t = img.height; let b = 0;
    for (let y = 0; y < img.height; y++) for (let x = 0; x < half; x++) {
      if (px[(y * half + x) * 4 + 3] > 40) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
    }
    const out = document.createElement('canvas'); out.width = r - l + 1; out.height = b - t + 1;
    out.getContext('2d').drawImage(cut, l, t, out.width, out.height, 0, 0, out.width, out.height);
    T.addCanvas(name, out);
  }
  return true;
}
// the painted villagers (data/levelArt.js SPRITE_SHEETS): each pose's cell in its sheet
// (run: the cells it cycles through); a pose a sheet lacks falls back to standing.
// The three painted run poses (one foot down, legs passing, the other foot down) play as a
// four-beat cycle through the passing pose twice, sinking on each footfall (RUN_BOB).
const RUN = [3, 4, 5, 4];
const RUN_BOB = [1.5, -1, 1.5, -1];
const CELLS = {
  villager: { stand: 0, cower: 1, wave: 2, run: RUN, sit: 6, kneel: 7 },
  mother: { stand: 0, cower: 1, wave: 2, run: RUN },
  boy: { stand: 0, cower: 1, wave: 2, run: RUN },
  elder: { stand: 0, sit: 1, wave: 2, kneel: 3, cower: 1 },
  // the wood's captives: bound on the rope, hanging, in the cage, at its bars, limping
  captive: { bound: 0, hang: 1, cower: 2, grip: 3, limp: [4, 5], stand: 4, run: [4, 5] },
  // Nicholas, the guide: the villager's order (wave: he points the way on; cower: braced),
  // and a ninth: lying dead
  nicholas: { stand: 0, cower: 1, wave: 2, run: RUN, sit: 6, kneel: 7, lie: 8 },
  // Irvolino, the miller: the villager's order
  irvolino: { stand: 0, cower: 1, wave: 2, run: RUN, leap: 3, sit: 6, kneel: 7 },
  // ...and cut free on the gallows (stage/MillRescue.js FREED)
  'irvolino-freed': { bound: 0, shed: 1, noose: 2, kneel: 3, thanks: 4, rise: 5, stand: 6, stride: 7 },
  elsbeth: {stand:0,cower:1,wave:2,run:[3,4,5,4],sit:6,kneel:6},
  // ...and his own walk, a full cycle, once it's painted (data/levelArt.js 'nicholas-walk')
  'nicholas-walk': { run: [0, 1, 2, 3, 4, 5, 6, 7], stand: 0 },
};
// the mine's prisoners: the same sheets cut bigger (data/levelArt.js); the old man has no
// run, so he hobbles on his standing pose (sinking on each step, like the run)
const HOBBLE = [0, 0, 0, 0];
const GUIDE_STEP = 24; // px of road a beat of the guide's walk covers (at depth scale 1)
const RUN_STEP = 26;  // px of ground a beat of a sprinter's run covers (stage/Story.js `sprint`)
const WALK_STEP = 16;  // ...a frame of his own eight-frame walk (a full stride: 128 px)
CELLS.miner = CELLS.villager;
CELLS['miner-old'] = { stand: 0, sit: 1, wave: 2, kneel: 3, run: HOBBLE };
CELLS.elder.run = HOBBLE; // (the barn's old man, running out: data/stageVillage.js crowd)
const PRISONER = { kneel: 0, wave: 1, cower: 2, run: RUN, stand: 6, bound: 0 };
for (const id of ['tobin', 'hilde', 'bram', 'a', 'b', 'c']) CELLS[`prisoner-${id}`] = PRISONER;

// Who is chained at the ore face (stageMine.js / stageAscent.js npcs with pose 'chained'),
// one look per man: his sheet, a tint (soot, torchlight, a pale one who hasn't seen the
// sun in a year), his size, and the two poses he moves between while he's chained (each
// on his own beat). `art`: his own painted sheet, used (untinted, full size) once it's in
// the folder. Anyone not listed gets the first miner's look.
const PRISONERS = {
  tobin: [{ art: 'prisoner-tobin', who: 'miner-old', tint: 0xd8d0c4, s: 0.97, poses: ['kneel', 'wave'] }],
  hilde: [{ art: 'prisoner-hilde', who: 'captive', tint: 0xe6d6c4, s: 0.94, poses: ['bound', 'cower'] }],
  bram: [{ art: 'prisoner-bram', who: 'captive', tint: 0xd0c8c0, s: 1.02, poses: ['bound', 'cower'] }],
  miners: [
    { art: 'prisoner-a', who: 'miner', tint: 0xc8bcae, s: 1.04, poses: ['wave', 'stand'], dz: 0 },
    { art: 'prisoner-b', who: 'captive', tint: 0xbab6bc, s: 0.96, poses: ['cower', 'bound'], dz: 6 },
    { art: 'prisoner-c', who: 'miner', tint: 0xe2d2bc, s: 0.92, poses: ['kneel', 'cower'], dz: -4 },
  ],
};
const IRON = 0x5e5e66;
const IRON_LIT = 0x9a9aa4;

export class NpcView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.story = stage.story;
    this.views = new Map();
    for (const n of this.story?.npcs ?? []) this.views.set(n.id, this.makeNpc(n));
    this.drawBodies(stage.data.bodies ?? []);
    this.makeCompanions();
    this.fieldWords=scene.add.text(0,0,'',{fontFamily:FONT.ui,fontSize:'16px',color:'#fff0d8',align:'center',wordWrap:{width:260}}).setOrigin(.5,1).setStroke('#160f0b',4).setDepth(DEPTH.popups).setVisible(false);
  }

  // ------------------------------------------------------------ villagers

  makeNpc(n) {
    const s = this.scene;
    const g = s.add.graphics();
    const halo = s.add.image(n.x, n.z, 'glow').setScale(3, 4).setTint(0xdfe8ff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const shadow = s.add.ellipse(n.x, n.z, 40, 9, 0x000000, 0.3);
    // the prompt over him when a hero can do something (stage/Story.js prompts), and a
    // meter under it: a lock giving, a rope tightening, an escort's nerve
    const tip = s.add.text(n.x, n.z, '', { fontFamily: FONT.ui, fontSize: '13px', color: '#f0e6d0', align: 'center' })
      .setOrigin(0.5, 1).setStroke('#000000', 4).setDepth(DEPTH.popups - 1).setVisible(false);
    const meter = s.add.graphics().setDepth(DEPTH.popups - 1);
    return { g, halo, shadow, tip, meter, imgs: [], seed: n.id.length * 7 + n.id.charCodeAt(0) };
  }

  // one painted figure, from the NPC's pool of images; false if that sheet isn't painted
  sprite(g, x, y, k, pose, t, dir, who) {
    const S = SPRITES[who];
    const v = this.cur;
    if (!S || !v) return false;
    const c = CELLS[who][pose] ?? CELLS[who].stand;
    const beat = Math.floor(t / 7);
    const i = Array.isArray(c) ? c[beat % c.length] : c;
    if ((c === RUN || c === HOBBLE) && !this.smooth) y += RUN_BOB[beat % 4] * k;
    let img = v.imgs[this.curN];
    if (!img) v.imgs.push(img = this.scene.add.image(x, y, S.key, 'f0').setOrigin(0.5, 1));
    this.curN++;
    // alive, not a picture: a breath, and a little sway (more on the rope, a shiver when
    // cowering), each man on his own beat
    const now = this.scene.time.now; const ph = (v.seed ?? 0) * 0.9 + this.curN * 1.7;
    const walk = c === RUN || (this.smooth && Array.isArray(c));
    const br = walk ? 0 : Math.sin(now * 0.0026 + ph);
    const sway = walk ? 0 : c === HOBBLE ? 4 + 2 * (beat % 2) : pose === 'hang' ? 3.5 * Math.sin(now * 0.0017 + ph) : pose === 'cower' ? 0.9 * Math.sin(now * 0.021 + ph) : 1.1 * Math.sin(now * 0.0011 + ph);
    // (tilt, squash: a lean and a give at the knees the stage asks for, stage/MillRescue.js)
    const sq = this.squash ?? 0; const lean = sway + (this.tilt ?? 0);
    img.setTexture(S.key, `f${Math.min(i, S.count - 1)}`).setPosition(x, y).setScale(k * 0.5 * (1 - 0.008 * br) * (1 + sq * 0.5), k * 0.5 * (1 + 0.018 * br) * (1 - sq))
      .setAngle(dir < 0 ? -lean : lean)
      .setFlipX(dir < 0).setDepth(g.depth + 0.01 * this.curN).setAlpha(g.alpha).setTint(this.tint ?? 0xffffff).setVisible(true);
    return true;
  }

  // one peasant: w/h body size, pose 'stand' | 'cower' | 'sit' | 'wave' | 'run'
  // (who: the painted sheet to use when there is one: villager, mother, boy, elder; a
  // level's NPC can name its own with `art`)
  figure(g, x, y, k, pose, t, tunic, dir = 1, who) {
    who ??= 'villager';
    if ((who === 'nicholas' || who === 'irvolino') && !SPRITES[who]) who = 'villager'; // (until his sheet is painted)
    if (this.sprite(g, x, y, k, pose, t, dir, who)) return true;
    const sc = k;
    const bob = pose === 'run' ? Math.abs(Math.sin(t * 0.4)) * 3 : pose === 'cower' ? Math.sin(t * 0.25) * 1 : 0;
    const H = (pose === 'cower' ? 40 : pose === 'sit' ? 30 : 56) * sc;
    const W = 18 * sc;
    const yb = y - bob;
    if (pose === 'sit') {
      // against the wall, legs out, a hand pressed to his side
      g.fillStyle(0x3a3028, 1).fillRect(x, yb - 7 * sc, 26 * sc * dir, 7 * sc);
      g.fillStyle(tunic, 1).fillRect(x - W / 2, yb - H, W, H - 4 * sc);
      g.fillStyle(0x7a1010, 0.9).fillRect(x - 2 * sc, yb - H * 0.5, 8 * sc, 8 * sc);
      g.fillStyle(SKIN, 1).fillCircle(x, yb - H - 7 * sc, 7 * sc);
      return;
    }
    // legs
    const stride = pose === 'run' ? Math.sin(t * 0.4) * 8 * sc : 0;
    g.fillStyle(0x3a3028, 1);
    g.fillRect(x - 6 * sc + stride, yb - 20 * sc, 5 * sc, 20 * sc).fillRect(x + 1 * sc - stride, yb - 20 * sc, 5 * sc, 20 * sc);
    // body, leaning in when cowering or running
    const lean = pose === 'cower' ? -6 * sc * dir : pose === 'run' ? 5 * sc * dir : 0;
    g.fillStyle(tunic, 1);
    g.fillTriangle(x - W / 2, yb - 18 * sc, x + W / 2, yb - 18 * sc, x + lean, yb - H);
    g.fillRect(x - W / 2 + lean / 2, yb - H + 6 * sc, W, H - 24 * sc);
    // arms
    g.lineStyle(4 * sc, tunic, 1);
    if (pose === 'wave') {
      const a = Math.sin(t * 0.3) * 0.5;
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean + Math.sin(a) * 14 * sc, yb - H - 14 * sc);
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean - Math.sin(a + 1) * 12 * sc, yb - H - 12 * sc);
    } else if (pose === 'cower') {
      g.lineBetween(x + lean, yb - H + 8 * sc, x + lean + 8 * sc * dir, yb - H - 2 * sc); // arms over the head
    } else {
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean - 6 * sc * dir - stride * 0.5, yb - H + 28 * sc);
      g.lineBetween(x + lean, yb - H + 10 * sc, x + lean + 6 * sc * dir + stride * 0.5, yb - H + 28 * sc);
    }
    g.fillStyle(SKIN, 1).fillCircle(x + lean, yb - H - 6 * sc, 6.5 * sc);
    g.fillStyle(0x2a2018, 1).fillRect(x + lean - 6 * sc, yb - H - 13 * sc, 12 * sc, 5 * sc); // hair
  }

  drawNpc(n, v) {
    const g = v.g.clear();
    this.cur = v; this.curN = 0;
    for (const img of v.imgs) img.setVisible(false);
    if(n.millCaptive){v.g.setVisible(false);v.halo.setVisible(false);v.shadow.setVisible(false);v.tip.setVisible(false);v.meter.clear();return;}
    v.father?.setVisible(false);
    if(n.stableMaster){
      v.halo.setVisible(false);v.tip.setVisible(false);v.meter.clear();
      v.worker??=new StableMasterView(this.scene,v);v.worker.draw(n);return;
    }
    v.fg?.clear();
    const t = this.scene.time.now / 16.7;
    this.drawPrompt(n, v);
    if (n.pose === 'noose' || n.pose === 'cage') { this.drawCaptive(n, v, t); return; }
    if (n.pose === 'gatewright') { this.drawGatewright(n, v, t); return; }
    // (the horses are drawn in their stable, view/VillageView.js; the group is inside the barn)
    const show = !['safe', 'gone'].includes(n.state) && !(n.pose === 'group' && n.state === 'trapped') && n.pose !== 'horses'
      && !(n.pose === 'convoy' && (n.state === 'trapped' || n.state === 'lost')); // (inside the wagon, or carried off in it)
    const fadeOut = (n.state === 'free' && !n.flee ? Math.max(0, 1 - n.t / 50) : 1)*(n.processionAlpha??1)*(n.carrier?(n.carrierBlend??1):1);
    g.setVisible(show).setAlpha(fadeOut);
    v.shadow.setVisible(show);
    // someone to save: a pale light behind him, pulsing
    // ...and someone with something to say: a warm one (with the bubble over him, drawPrompt)
    const needs = n.state === 'trapped' || n.state === 'threatened';
    const talks = !n.act && this.hasWord(n);
    v.halo.setVisible(needs || talks).setPosition(n.x, n.z - n.h - 58).setDepth(n.z - 0.6).setTint(needs ? 0xdfe8ff : 0xffd890)
      .setAlpha(needs || talks ? 0.25 + 0.2 * Math.sin(t * 0.12) : 0);
    if (!show) return;
    const y = n.z - n.h;
    const k = depthScale(n.z);
    if(n.id==='hakon' && this.scene.textures.exists('hakon-dying')) {
      v.father ??= this.scene.add.image(n.x,y,'hakon-dying').setOrigin(0.5,0.96);
      const dead=n.state==='dead';
      const deadArt=dead&&this.scene.textures.exists('hakon-dead');
      v.father.setTexture(deadArt?'hakon-dead':'hakon-dying');
      const breath=dead?0:Math.sin(this.scene.time.now*0.002)*0.004;
      const size=deadArt?180*k/v.father.frame.width:95*k/v.father.frame.height;
      v.father.setPosition(n.x,y).setScale(size,size*(1+breath))
        .setDepth(n.z+0.01).setTint(0xffffff).setAlpha(n.carried?(n.carrierBlend??0):1).setVisible(!n.insideChurch);
      return;
    }
    const dir = n.dir ?? -1;
    v.shadow.setPosition(n.x, n.z - (n.shadowH ?? n.h)).setDepth(n.h > 0 ? n.z - 0.4 : DEPTH.shadows);
    g.setDepth(n.z);
    const tun = (i) => TUNIC[(v.seed + i) % TUNIC.length];
    // (n.act: a pose the stage plays for a moment, stage/MillRescue.js jumpDown)
    const pose = n.act ?? (n.state === 'fleeing' || n.gatherMoving ? 'run' : n.mourning ? (n.pose==='family'||n.pose==='child'?'cower':'kneel') : n.state === 'threatened' || n.cower ? 'cower' : n.state === 'trapped' ? 'wave' : 'stand');
    if (n.state === 'dead' && SPRITES.nicholas && n.art === 'nicholas') { this.figure(g, n.x, y, k, 'lie', t, 0, 1, 'nicholas'); return; }
    if (n.pose === 'captive-kneel' && this.drawKneeling(n, v, g, y, k, t)) return;
    if (n.state === 'lost' || n.state === 'dead') { this.fallen(g, n.x, y, k, tun(0)); return; }
    if (n.guide) { this.drawGuide(n, v, g, y, k, t, dir); return; }
    if (n.pose === 'wounded') return this.figure(g, n.x, y, k, 'sit', t, tun(0), 1, n.art);
    if (n.pose === 'lame') {
      // limping on a crutch (a stick under one arm), slow
      const p = n.state === 'escort' && n.moving ? 'run' : pose;
      if (this.figure(g, n.x, y, k, p === 'run' ? 'limp' : p, t * 0.5, tun(5), dir, SPRITES.captive ? 'captive' : n.art)) return;
      g.lineStyle(3 * k, 0x6a5038, 1).lineBetween(n.x + 10 * k * dir, y, n.x + 6 * k * dir, y - 44 * k);
      return;
    }
    if (n.pose === 'child') return this.figure(g, n.x, y, k * 0.7 / (SPRITES.boy ? 0.7 : 1), pose, t, tun(1), dir, 'boy');
    if (n.pose === 'family') {
      // (the painted mother carries her child; the drawn one has him at her side)
      if (!this.figure(g, n.x, y, k, pose, t, tun(2), dir, 'mother')) this.figure(g, n.x + 22 * dir * -1, y + 4, k * 0.68, pose, t + 7, tun(3), dir);
      return;
    }
    if (n.pose === 'chained') { this.drawChained(n, v, g, y, k, t, pose, dir); return; }
    if (n.pose === 'group' || n.pose === 'convoy') {
      // (the barn's group is the miller's people: Irvolino leads them, data/speakers.js MILLER)
      for (let i = 0; i < 3; i++) {
        const first=this.curN;
        // (crowd: a sheet for each of the three, data/stageVillage.js; otherwise all three
        // on the villager sheet, the middle one smaller)
        const who = n.crowd?.[i] ?? (i === 0 && n.id === 'barn' ? 'irvolino' : undefined);
        this.figure(g, n.x - 44 + i * 42, y + (i % 2) * 6, k * (n.crowd || i !== 1 ? 1 : 0.75), pose, t + i * 5, tun(i + 4), dir, who);
        if(i===0&&n.carrier)for(const img of v.imgs.slice(first,this.curN))img.setAlpha(g.alpha*(n.carrierBlend??0));
      }
      return;
    }
    // (a sprinter's legs keep pace with the ground he covers, one beat per RUN_STEP px)
    const tt = n.sprint && pose === 'run' ? ((n.stride ?? 0) / (RUN_STEP * k)) * 7 : t;
    this.tilt = n.tilt; this.squash = n.squash;
    this.figure(g, n.x, y, k, pose, tt, tun(0), dir, n.actArt ?? n.art);
    this.tilt = this.squash = undefined;
  }

  // The guide (Nicholas, stage/Story.js `guide`): walking on ahead, or waiting, looking on
  // up the road and now and then pointing the way; braced while a fight is on; struck down,
  // he sits against the rock. Where he goes round by his own way he fades out, and back in.
  // His steps keep pace with the ground he covers (one beat per GUIDE_STEP px), so his feet
  // don't skate, and he sinks gently on each footfall.
  drawGuide(n, v, g, y, k, t, dir) {
    const who = SPRITES.nicholas ? 'nicholas' : SPRITES.miner ? 'miner' : 'villager'; // (the stand-in: the villager cut at the heroes' height)
    const point = n.pointing && Math.floor((t + v.seed * 40) / 170) % 3 === 2;
    const pose = n.state === 'dying' ? 'sit' : n.moving ? 'run' : n.braced ? 'cower' : point ? 'wave' : 'stand';
    g.setAlpha(n.going > 0 ? n.going / GUIDE.fade : 1 - (n.fade ?? 0) / GUIDE.fade);
    // (his own walk cycle, eight frames to the stride, four to a step)
    const cycle = n.moving && who === 'nicholas' && SPRITES['nicholas-walk'] ? 'nicholas-walk' : who;
    const own = cycle === 'nicholas-walk';
    const beat = (n.stride ?? 0) / ((own ? WALK_STEP : GUIDE_STEP) * k);
    const sink = n.moving ? Math.abs(Math.cos(beat * Math.PI / (own ? 4 : 2))) * 2.2 * k : 0; // (a footfall every 4 / 2 beats)
    this.smooth = true;
    this.figure(g, n.x, y + sink, k, pose, n.moving ? beat * 7 : t, 0x7a3a30, pose === 'sit' ? 1 : dir, cycle);
    this.smooth = false;
  }

  // At the ore face, chained by the ankle to a post (the shackle prop): each man in his own
  // look (PRISONERS), moving between his two poses (on his knees, pulling at the chain,
  // pleading) until the post is broken; then up and away like the rest.
  drawChained(n, v, g, y, k, t, pose, dir) {
    const looks = PRISONERS[n.id] ?? PRISONERS.miners.slice(0, n.group ? 3 : 1);
    const fg = (v.fg ??= this.scene.add.graphics()).setDepth(n.z + 0.5).setAlpha(g.alpha); // (the chains, over his feet)
    const chained = n.state === 'trapped';
    const now = this.scene.time.now;
    looks.forEach((L, i) => {
      const fx = (chained ? n.x + 34 : n.x) + i * 46 - (chained ? 0 : (looks.length - 1) * 23);
      const fy = y + (L.dz ?? 0);
      const own = !!SPRITES[L.art];
      const sheet = own ? L.art : SPRITES[L.who] ? L.who : SPRITES.captive ? 'captive' : undefined;
      // (a slow beat of his own: some seconds on his knees, some pulling and calling out)
      const beat = Math.floor((now / 2600) + v.seed * 0.37 + i * 1.3);
      const p = chained ? L.poses[beat % L.poses.length] : pose === 'cower' || pose === 'wave' ? 'stand' : pose;
      this.tint = own ? undefined : L.tint;
      const drawn = this.figure(g, fx, fy, k * (own ? 1 : L.s), p, t + i * 6, TUNIC[(v.seed + i + 2) % TUNIC.length], chained ? -1 : dir, sheet);
      this.tint = undefined;
      if (chained) this.chain(fg, fx + (drawn ? 6 : -3) * k, fy - 4 * k, n.x + 6 * k, y - 34 * k, k, p === 'wave' || p === 'stand');
    });
  }

  // an iron chain from a man's ankle to the post: a cuff, then links, alternately face-on
  // and edge-on, hanging slack (taut while he pulls on it)
  chain(g, ax, ay, px, py, k, taut) {
    const sag = (taut ? 3 : 9) * k;
    const d = Math.hypot(px - ax, py - ay);
    const n = Math.max(3, Math.round(d / (7 * k)));
    const at = (u) => [ax + (px - ax) * u, ay + (py - ay) * u + sag * 4 * u * (1 - u)];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = at(i / n); const [x1, y1] = at((i + 1) / n);
      const mx = (x0 + x1) / 2; const my = (y0 + y1) / 2;
      if (i % 2 === 0) {
        g.lineStyle(2.2 * k, IRON, 1).strokeEllipse(mx, my, 8 * k, 5 * k);
        g.lineStyle(1 * k, IRON_LIT, 0.8).beginPath().arc(mx, my - 0.6 * k, 3.2 * k, Math.PI * 1.1, Math.PI * 1.9).strokePath();
      } else {
        g.lineStyle(2.4 * k, IRON, 1).lineBetween(x0 + (x1 - x0) * 0.15, y0 + (y1 - y0) * 0.15, x1 - (x1 - x0) * 0.15, y1 - (y1 - y0) * 0.15);
      }
    }
    // the cuff round his ankle
    g.fillStyle(0x3e3e44, 1).fillRoundedRect(ax - 5 * k, ay - 3 * k, 10 * k, 6 * k, 2 * k);
    g.fillStyle(IRON_LIT, 0.7).fillRect(ax - 4 * k, ay - 3 * k, 8 * k, 1.2 * k);
  }

  // someone who didn't make it: on the ground, still
  // The villager on his knees before Varek in the opening (stage/VillageOpening.js), facing
  // the heroes; struck down, he pitches forward onto his face and the blood spreads under
  // him. false: the villager sheet isn't painted (the stand-ins draw him).
  drawKneeling(n, v, g, y, k, t) {
    if (!this.figure(g, n.x, y, k, 'kneel', t, 0, -1, 'villager')) return false;
    const img = v.imgs[this.curN - 1];
    if (n.state !== 'dead') return true;
    const f = Math.min(1, n.t / 16); // (sim frames since the blow)
    const fall = f * f;
    const pool = Math.min(1, n.t / 150);
    g.fillStyle(0x4a0606, 0.75).fillEllipse(n.x - 44 * k, y + 1, (30 + 70 * pool) * k, (6 + 9 * pool) * k);
    img.setAngle(-84 * fall).setPosition(n.x + 6 * k * fall, y + 6 * k * fall).setTint(0xd8ccc4);
    return true;
  }

  fallen(g, x, y, k, tunic) {
    g.fillStyle(0x4a0606, 0.5).fillEllipse(x + 4, y + 2, 56 * k, 10 * k);
    g.fillStyle(tunic, 1).fillRoundedRect(x - 22 * k, y - 9 * k, 40 * k, 10 * k, 4);
    g.fillStyle(SKIN, 0.8).fillCircle(x + 22 * k, y - 5 * k, 5 * k);
  }

  // A captive in a cage on a cart, or on the hanging tree's rope.
  drawCaptive(n, v, t) {
    const g = v.g;
    const k = depthScale(n.z);
    const y = n.z - n.h;
    const tun = (i) => TUNIC[(v.seed + i) % TUNIC.length];
    const needs = n.state === 'trapped' || n.state === 'threatened';
    v.halo.setVisible(needs).setPosition(n.x, y - 60).setDepth(n.z - 0.6).setAlpha(needs ? 0.25 + 0.2 * Math.sin(t * 0.12) : 0);
    v.shadow.setVisible(false);
    g.setVisible(true).setAlpha(1).setDepth(n.z);
    if (n.pose === 'cage') {
      // the cage stays on its cart where it stood (home); only the prisoners run
      const cx = n.home.x; const cz = n.home.z;
      const cy = cz - (v.cageH ??= n.h);
      const ck = depthScale(cz);
      const open = !['trapped'].includes(n.state);
      const many = n.group ? 3 : 1;
      // the prisoners inside (cowering), then the bars in front; open: the door swung wide
      if (!open) {
        for (let i = 0; i < many; i++) this.figure(g, cx - (many - 1) * 12 + i * 24, cy - 26, ck * 0.85, i === many - 1 && SPRITES.captive ? 'grip' : 'cower', t + i * 5, tun(i), -1, SPRITES.captive ? 'captive' : undefined);
      } else if (n.state === 'free') {
        for (let i = 0; i < many; i++) this.figure(g, cx + 52 + i * 38, cy + (i % 2) * 6, ck, 'stand', t + i * 5, tun(i), 1);
      } else if (n.state === 'fleeing' || n.state === 'gathered') {
        const p = n.state === 'fleeing' ? 'run' : 'stand';
        const dir = n.state === 'fleeing' ? n.dir ?? -1 : -1;
        for (let i = 0; i < many; i++) this.figure(g, n.x - (many - 1) * 20 + i * 40, y + (i % 2) * 6, k * (many > 1 && i === 1 ? 0.85 : 1), p, t + i * 5, tun(i), dir);
      }
      if (paintedCage(this.scene)) {
        // the painted cage (its bars in front; the shut one, or broken open)
        v.cage ??= this.scene.add.image(0, 0, 'cage-shut').setOrigin(0.5, 1);
        v.cage.setTexture(open ? 'cage-open' : 'cage-shut').setPosition(cx, cy - 20).setDepth(cz + 0.5).setVisible(true);
        v.cage.setScale((CAGE_H * ck * (n.group ? 1 : 0.85)) / v.cage.frame.height);
        return;
      }
      const w = (n.group ? 96 : 64) * ck; const h = 70 * ck;
      g.fillStyle(0x2a2016, 1).fillRect(cx - w / 2 - 4, cy - 28, w + 8, 6); // its floor, on the cart
      g.lineStyle(3, 0x4a4a52, 1).strokeRect(cx - w / 2, cy - 28 - h, w, h);
      for (let x = cx - w / 2 + 10; x < cx + w / 2; x += 11) {
        if (open && x > cx - 6 && x < cx + 22) continue; // (the door)
        g.lineBetween(x, cy - 28 - h, x, cy - 28);
      }
      if (open) g.lineBetween(cx - 6, cy - 28 - h, cx - 30, cy - 34 - h * 0.6).lineBetween(cx - 30, cy - 34 - h * 0.6, cx - 30, cy - 34 + h * 0.3);
      else g.fillStyle(0xb08a4a, 1).fillRect(cx + 2, cy - 28 - h * 0.5, 8, 10); // the lock
      return;
    }
    // the noose: the rope from the tree's bough; he stands on a cart's tail with his hands
    // bound; lost, he hangs; saved, the rope is cut and he's on his knees, then away
    const bough = this.stage.data.gallows ? this.stage.data.gallows.z - 214 : y - 200;
    if (n.state === 'lost') {
      g.lineStyle(2, 0x8a7a5a, 1).lineBetween(n.x, bough, n.x, y - 92);
      const sway = Math.sin(t * 0.04) * 2;
      this.figure(g, n.x + sway, y - 30, k, SPRITES.captive ? 'hang' : 'stand', 0, tun(0), 1, SPRITES.captive ? 'captive' : undefined);
      return;
    }
    if (n.state === 'threatened') {
      g.fillStyle(0x2a2016, 1).fillRect(n.x - 26, y - 4, 52, 8);
      g.lineStyle(2, 0x8a7a5a, 1).lineBetween(n.x, bough, n.x, y - 62 * k);
      g.strokeCircle(n.x, y - 62 * k - 2, 5);
      this.figure(g, n.x, y - 4, k, SPRITES.captive ? 'bound' : 'stand', 0, tun(0), 1, SPRITES.captive ? 'captive' : undefined);
      return;
    }
    g.lineStyle(2, 0x8a7a5a, 1).lineBetween(n.x, bough, n.x, bough + 30); // (cut)
    if (n.state === 'safe' || n.state === 'gone') { g.setVisible(false); return; }
    if (n.state === 'gathered') { this.figure(g, n.x, y, k, 'stand', t, tun(0), -1); return; }
    this.figure(g, n.x, y, k, n.state === 'fleeing' ? 'run' : 'cower', t, tun(0), n.dir ?? -1);
  }

  // Vincent, the Gatewright (the Iron Gates): in his cage on the guardroom landing, gripping
  // the bars; freed, he stands by it a moment and is off to the gate tower; at his scorpion
  // in the yards he's drawn with it (view/VincentView.js); at the Keep road he waits.
  drawGatewright(n, v, t) {
    const g = v.g;
    const s = this.scene;
    const k = depthScale(n.z);
    const y = n.z - n.h;
    const caged = n.state === 'trapped';
    const atEngine = this.stage.hazards.some((hz) => hz.type === 'ballista' && hz.crew === n.id && hz.manned);
    const show = !['safe', 'gone', 'lost'].includes(n.state) && !atEngine;
    v.halo.setVisible(caged).setPosition(n.home.x, y - 60).setDepth(n.z - 0.6).setAlpha(caged ? 0.25 + 0.2 * Math.sin(t * 0.12) : 0);
    v.shadow.setVisible(show && !caged).setPosition(n.x, y).setDepth(n.h > 0 ? n.z - 0.4 : DEPTH.shadows);
    g.setVisible(true).setAlpha(n.state === 'free' ? Math.max(0, 1 - Math.max(0, n.t - 30) / 20) : 1).setDepth(n.z);
    const inCage = caged || n.state === 'free';
    if (inCage) {
      // the cage (painted, or iron bars drawn) where he was held
      const cx = n.home.x;
      const open = !caged;
      if (paintedCage(s)) {
        v.cage ??= s.add.image(0, 0, 'cage-shut').setOrigin(0.5, 1);
        // (behind him: its back panel is solid; the bars in front of him are drawn below)
        v.cage.setTexture(open ? 'cage-open' : 'cage-shut').setPosition(cx, y + 4).setDepth(n.z - 0.3).setVisible(true);
        v.cage.setScale((CAGE_H * k * 1.25) / v.cage.frame.height);
        if (caged) {
          const fg = (v.fg ??= s.add.graphics()).setDepth(n.z + 0.5);
          const w = v.cage.displayWidth * 0.62; const h = v.cage.displayHeight * 0.72;
          for (let x = cx - w / 2; x <= cx + w / 2 + 1; x += w / 5) {
            fg.lineStyle(3.2, 0x3a3a42, 0.95).lineBetween(x, y - h, x, y - 4);
            fg.lineStyle(1, 0x8a8a96, 0.7).lineBetween(x - 1, y - h, x - 1, y - 4);
          }
          fg.lineStyle(4, 0x3a3a42, 1).lineBetween(cx - w / 2, y - h * 0.55, cx + w / 2, y - h * 0.55);
        }
      } else {
        const w = 90 * k; const h = 130 * k;
        const fg = (v.fg ??= s.add.graphics()).setDepth(n.z + 0.5);
        fg.lineStyle(3, 0x4a4a52, 1).strokeRect(cx - w / 2, y - h, w, h);
        for (let x = cx - w / 2 + 9; x < cx + w / 2; x += 10) {
          if (open && x > cx - 6 && x < cx + 18) continue;
          fg.lineBetween(x, y - h, x, y);
        }
        if (!open) fg.fillStyle(0xb08a4a, 1).fillRect(cx + 2, y - h * 0.5, 8, 10);
      }
    } else v.cage?.setVisible(false);
    if (!show) { hideVincent(v); return; }
    const pose = caged ? 'grip' : n.state === 'free' ? 'wave' : 'stand';
    const x = caged ? n.home.x : n.state === 'free' ? n.home.x + 70 : n.x;
    drawVincent(s, v, g, x, y, k, pose, t, caged ? -1 : n.state === 'free' ? 1 : -1, n.z + 0.1);
  }

  // has he something to say that no one has heard yet? (stage/Story.js updateTalk)
  hasWord(n) {
    return !n.mourning&&!this.story.holding&&!!this.story.talkBeat(n);
  }

  // What a hero near him can do now, and the meter that goes with it.
  drawPrompt(n, v) {
    const S = this.story;
    const m = v.meter.clear();
    const q = S.prompts.find((p) => p.npc === n);
    const y = n.z - n.h;
    const text = !q ? '' : q.kind === 'talk' ? 'E  /  D-PAD ▲   TALK' : q.kind === 'open' ? 'HOLD  E  /  D-PAD ▲   OPEN' : 'KILL THEM FIRST';
    v.tip.setVisible(!!text).setText(text).setPosition(n.x, y - (q?.kind === 'talk' ? 163 : 128)).setColor(q?.kind === 'busy' ? '#ff9a7a' : '#f0e6d0');
    const bar = (frac, col) => {
      m.fillStyle(0x000000, 0.7).fillRect(n.x - 31, y - 122, 62, 7);
      m.fillStyle(col, 1).fillRect(n.x - 30, y - 121, 60 * Math.max(0, Math.min(1, frac)), 5);
    };
    // someone with something to say, before a hero is near enough for the prompt: a speech
    // bubble bobbing over his head, so he's seen from across the street
    if (!n.act && this.hasWord(n)) {
      const by = y - 140 + 4 * Math.sin(this.scene.time.now * 0.004);
      m.fillStyle(0x000000, 0.85).fillRoundedRect(n.x - 21, by - 15, 42, 26, 9).fillTriangle(n.x - 7, by + 9, n.x + 5, by + 9, n.x - 4, by + 19);
      m.fillStyle(0xf6ead0, 1).fillRoundedRect(n.x - 18, by - 12, 36, 20, 7).fillTriangle(n.x - 5, by + 6, n.x + 3, by + 6, n.x - 3, by + 14);
      m.fillStyle(0x2a2018, 1);
      for (let i = -1; i <= 1; i++) m.fillCircle(n.x + i * 9, by - 2, 2.6);
    }
    if (q?.kind === 'open' && n.pick > 0) bar(n.pick / (n.hold ?? NPC.pick), 0xd8b04a);
    else if (n.rescue === 'execution' && n.state === 'threatened' && n.clock > 0) bar(1 - n.clock / (n.time ?? 900), 0xd04030); // the rope
    else if (n.state === 'escort') bar(n.nerve / (n.hp ?? NPC.nerve), n.cower ? 0xff7050 : 0x9ad0ff);         // his nerve
  }

  // ------------------------------------------------------------ the dead

  drawBodies(list) {
    const s = this.scene;
    // painted (assets/env/bodies.png: three fallen villagers, on magenta), when it's in
    const painted = cutPieces(s, 'bodies-src', ['body-0', 'body-1', 'body-2']);
    for (const b of list) {
      const g = s.add.graphics().setDepth(DEPTH.decals + 1);
      g.fillStyle(0x4a0606, 0.6).fillEllipse(b.x + 6, b.z + 2, 60, 12); // dried blood
      if (painted) {
        const img = s.add.image(b.x, b.z + 4, `body-${b.pose % 3}`).setOrigin(0.5, 1).setDepth(DEPTH.decals + 1.1);
        img.setScale(BODY_W / img.width).setFlipX(b.x % 2 === 1);
        continue;
      }
      const c = [0x3a3a3a, 0x40382e, 0x34343e][b.pose % 3];
      g.fillStyle(c, 1).fillRoundedRect(b.x - 24, b.z - 8, 44, 10, 4);
      g.fillStyle(0x6a5a50, 1).fillCircle(b.x + 24, b.z - 4, 5);
      g.fillStyle(0x2a241e, 1).fillRect(b.x - 30, b.z - 5, 8, 4);
      if (b.pose === 1) g.fillStyle(0x2a2420, 0.9).fillRect(b.x - 28, b.z - 11, 58, 7); // a cloak thrown over him
    }
  }

  // ------------------------------------------------------------ the other Oath Keepers

  makeCompanions() {
    this.companions = [];
    const played = new Set(this.scene.heroIds ?? []);
    const ids = HEROES.filter((h) => !played.has(h));
    if (!ids.length || !this.story) return;
    this.puppets = new World({ seed: 1 });
    const at = this.stage.section?.spawn ?? { x: 150, z: 440 };
    ids.forEach((id, i) => {
      const f = createPlayer(this.puppets, new Controller(), id, at.x + 70 + i * 55, at.z + (i ? 50 : -60));
      f.facing = 1;
      // (as the save has them: Rurik with his old sword until Oathkeeper is his)
      if (this.scene.progress) f.stats = this.scene.progress.statsFor(id, f.stats);
      const view = this.scene.makeView(f);
      this.companions.push({ id, f, view, mode: 'start', i });
    });
  }

  // where they are: with you at the start; off searching; at the gate for the vow; gone
  // through the gate after it
  updateCompanions() {
    if (!this.companions.length) return;
    this.puppets.frame++;
    const st = this.stage;
    const gate = st.sections[st.sections.length - 1];
    const gx = st.data.exit?.x ?? gate.x1 - 100;
    // (a level's `companions`: the beat after which they go ahead, where they wait, and the
    // beat after which they leave with you; the village's are the defaults)
    const C = { leaveAfter: 'opening', meet: gate.x0 - 200, farewell: st.data.church ? 'churchFarewell' : 'vow', ...st.data.companions };
    const cam = this.scene.cameras.main.worldView;
    for (const c of this.companions) {
      const f = c.f;
      if(st.opening?.active) {
        const moving=st.opening.progress<1;
        f.x=-280+360*st.opening.progress-c.i*55;
        f.z=380+c.i*95;f.facing=1;f.vx=moving?300:0;f.vz=0;f.sprinting=moving;
        if(f.state!==(moving?'walk':'idle'))f.fsm.change(moving?'walk':'idle');
        f.fsm.frame++;
        c.view.sprite?.setVisible(true);c.view.shadow?.setVisible(true);c.view.update();
        continue;
      }
      let target = null;
      if (st.phase === 'won' || st.story.done.has(C.farewell)) target = { x: gx + 260, z: 380 + c.i * 50, leave: true };
      else if (st.index >= st.sections.length - 1 || this.scene.player.x > C.meet) {
        const father=st.data.id==='village'?st.story.npc('hakon'):null;
        target=father?{x:father.x+(c.id==='warrior'?-75:c.id==='mage'?110:-150),z:father.z+(c.id==='warrior'?75:c.id==='mage'?125:25),face:-1}
          :{x:gx-260+c.i*70,z:340+c.i*90,face:-1};
      }
      else if (st.story.done.has(C.leaveAfter)) {
        // they split off down the lanes between the houses: away up the street into the
        // dark at the back, fading as they go, not running on ahead along the road
        c.away ??= { x: f.x + 60 + c.i * 90, z: st.world.bounds.minZ - 50 };
        target = { ...c.away, leave: true, away: true };
      }
      // (picked up from a checkpoint past the start: they went ahead long ago)
      if (c.mode === 'start' && !c.ticked && st.index > 0) c.mode = 'gone';
      c.ticked = true;
      // gone ahead to search: once out of sight they stay out of sight (no catching them up
      // on the road), until the meeting place
      if (c.mode === 'gone' && !target?.face && target?.leave && !(st.phase === 'won' || st.story.done.has(C.farewell))) {
        hideView(c.view);
        continue;
      }
      if (target?.face === -1 && c.mode !== 'gate') {
        // (they were waiting there; if that spot is already in view they walk in from ahead,
        // they don't appear out of thin air)
        c.mode = 'gate';
        f.x = Math.max(target.x, cam.right + 80 + c.i * 60); f.z = target.z;
      }
      if (target) {
        const dx = target.x - f.x; const dz = target.z - f.z;
        const d = Math.hypot(dx, dz);
        const sp = (f.stats.walkSpeed ?? 160) / 60 * (c.mode === 'start' && target.leave ? 2 : 1); // (they run off to search)
        if (d > sp) {
          if (f.state !== 'walk') f.fsm.change('walk');
          f.vx = (dx / d) * sp * 60; f.vz = (dz / d) * sp * 60;
          f.x += (dx / d) * sp; f.z += (dz / d) * sp;
          f.facing = Math.sign(dx) || f.facing;
        } else {
          f.vx = f.vz = 0;
          if (f.state !== 'idle') f.fsm.change('idle');
          if (target.face) f.facing = target.face;
          if(st.data.id==='village'&&c.mode==='gate')f.facing=Math.sign((st.story.npc('hakon')?.x??f.x)-f.x)||-1;
        }
      }
      f.fsm.frame++;
      // gone off-screen to search: hidden until the gate
      let hidden = target?.leave && (f.x > cam.right + 120);
      // (fading into the dark at the back as they go)
      const fade = target?.away ? Math.max(0, Math.min(1, (f.z - target.z) / 70)) : 1;
      if (fade <= 0.04) hidden = true;
      if (hidden && c.mode === 'start') c.mode = 'gone';
      if (hidden) hideView(c.view);
      else {
        c.view.sprite?.setVisible(true); c.view.shadow?.setVisible(true);
        c.view.fade = fade; // (so the Mage's circle fades with him, not after him)
        c.view.update();
      }
      if (target?.away) { c.view.sprite?.setAlpha(fade); c.view.shadow?.setAlpha?.(fade * 0.35); }
    }
  }

  update() {
    for (const n of this.story?.npcs ?? []) this.drawNpc(n, this.views.get(n.id));
    this.updateCompanions();
    const help=this.story?.npcs.find(n=>n.helpAge>0&&['threatened','trapped','bound'].includes(n.state));
    const field=this.story?.fieldLine;
    const n=field?.npc??help;
    // (a held scene: only a villager's own shout-out, no help cries)
    this.fieldWords.setVisible(!!field||(!!n&&!this.story?.holding));
    if(n)this.fieldWords.setText(field?.text??n.helpText).setPosition(n.x,n.z-(n.h??0)-125);
  }
}


