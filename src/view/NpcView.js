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
import { FOLK, FOLK_CELLS } from '../data/folk.js';
import { SPRITES, artKey } from './levelArt.js';
import { boughPoint } from '../data/hangingTree.js';
import { PROP_LIGHT, lightProp } from './propGround.js';
import { keyLayer, cutPieces } from './envArt.js';
import { drawVincent, hideVincent } from './VincentView.js';
import { StableMasterView } from './StableMasterView.js';
import { ShoutPlate } from './ShoutPlate.js';

// the hanging tree's dead (drawHanged): the rope's x in each picture (a fraction of its width)
// and where the shroud starts under it (picture px); the body's height in the world at depth 1,
// and how far his feet hang clear of the mud
// (round 5, 2026-11-24, repainted finer: `strand` is a stretch of the painted rope, picture px
// [x0, x1, height of one twist], tiled to carry the rope on up to the bough)
const HANGED_FIT = {
  hanged_1: { rope: 0.566, head: 72, strand: [62, 76, 36] },
  hanged_2: { rope: 0.528, head: 70, strand: [60, 74, 35] },
  hanged_3: { rope: 0.538, head: 75, strand: [86, 101, 39] },
};
const HANGED = { body: 100, clear: 16 };
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
  // the well (stage/WellRescue.js): Mira apart from her boy, the boy at the end of the
  // butcher's arm, and the butcher's hold (h0 up, h1 shaking him, h2 lowered)
  mira: { stand: 0, cower: 1, wave: 2, scream: 3, shove: 4, run: [2, 3], kneel: 1, sit: 1 },
  'boy-held': { h0: 0, h1: 1, h2: 2, wave: 0, cower: 2, stand: 2 },
  'butcher-hold': { h0: 0, h1: 1, h2: 2, stand: 0 },
  // ...and the boy trapped up on a roof (Tam; drawStranded): clinging, waving (two beats),
  // calling, flinching from the sparks, reaching down to a hero, relieved, climbing down
  'boy-roof': { cling: 0, wave: [1, 2], call: 3, flinch: 4, reach: 5, relief: 6, climb: 7, stand: 6 },
  'pip-roof': { cling: 0, wave: [1, 2], call: 3, flinch: 4, reach: 5, relief: 6, climb: 7, stand: 6 },
  pip: { stand: 0, cower: 1, wave: 2, run: RUN },
  elder: { stand: 0, sit: 1, wave: 2, kneel: 3, cower: 1 },
  // Hale the smith (stage/SmithLife.js): his walk is the run's four beats; grieving at the
  // vigil (kneel/sit), his hand over his eyes
  hale: { stand: 0, look: 1, wave: 2, run: RUN, point: 6, wipe: 7, cower: 1, kneel: 7, sit: 7 },
  // the wood's captives: bound on the rope, hanging, in the cage, at its bars, limping
  captive: { bound: 0, hang: 1, cower: 2, grip: 3, limp: [4, 5], stand: 4, run: [4, 5] },
  // Joren, strung up by his wrists on the hanging tree (drawTreed; his own sheet, Nick 2026-11-24:
  // "heavily upgrade this guy"): hanging, kicking, dropped to one knee, standing, a four-beat run.
  // The two hanging cells sit with his wrists at the top of the cell (the rope is drawn to them)
  joren: { hang: 0, kick: [0, 1], cower: 2, kneel: 2, sit: 2, stand: 3, wave: 3, run: [4, 5, 6, 7] },
  // Ansel, with his splinted leg and crutch painted in
  ansel: { stand: 0, wave: 1, cower: 2, limp: [3, 4, 5, 6], run: [3, 4, 5, 6], kneel: 2, sit: 2 },
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
  // the villager Varek kills in the opening (drawKneeling)
  'villager-death': { beg: 0, struck: 1, fall: 2, lie: 3, stand: 0 },
};
// the opening's villager-death cut (drawKneeling), at depth scale 1
const DEATH_SHIFT = 44; const DEATH_HEAD = 112;
// the mine's prisoners: the same sheets cut bigger (data/levelArt.js); the old man has no
// run, so he hobbles on his standing pose (sinking on each step, like the run)
const HOBBLE = [0, 0, 0, 0];
const GUIDE_STEP = 24; // px of road a beat of the guide's walk covers (at depth scale 1)
const SMITH_STEP = 15; // ...and a beat of Hale's walk (stage/SmithLife.js: an unhurried big man)
// the well's painted hold (stage/WellRescue.js): where the butcher's fist is in each of his
// three poses, and where the boy's collar is in each of his, as fractions of the trimmed cell
// (tools/bake-pose-row.py, measured off assets/sprites/npc/butcher_hold.png and boy_held.png);
// tint: the butcher graded down a little to sit with the enemy strips
const WELL_ART = {
  fist: [[0.943, 0.166], [0.964, 0.166], [0.861, 0.328]],
  collar: [[0.701, 0.085], [0.648, 0.056], [0.522, 0.067]],
  tint: 0xf2e6dc,
};
const RUN_STEP = 26;  // px of ground a beat of a sprinter's run covers (stage/Story.js `sprint`)
const STRANDED_RELIEF = 0.45; // the part of his time freed (stage/Story.js freeFor) he stands relieved, before he climbs down
const STRANDED_REACH = 230; // a hero this near (x), the stranded child leans down to him
const WALK_STEP = 16;  // ...a frame of his own eight-frame walk (a full stride: 128 px)
CELLS.miner = CELLS.villager;
for (const id of ['villager-woman', 'villager-tanner', 'villager-burner']) CELLS[id] = CELLS.villager; // (the wood's captives: the villager's order)
CELLS['miner-old'] = { stand: 0, sit: 1, wave: 2, kneel: 3, run: HOBBLE };
CELLS.elder.run = HOBBLE; // (the barn's old man, running out: data/stageVillage.js crowd)
const PRISONER = { kneel: 0, wave: 1, cower: 2, run: RUN, stand: 6, bound: 0 };
// the common folk a hero frees (data/folk.js), each on a sheet of their own: a six-pose run
// with the legs swapping, sinking as a foot strikes and lifting in flight (FOLK_BOB)
const FOLK_RUN = FOLK_CELLS.run;
const FOLK_BOB = [1.6, 0, -2.2, 1.6, 0, -2.2];
const FOLK_BY_ID = Object.fromEntries(FOLK.map((F) => [F.id, F]));
for (const F of FOLK) CELLS[F.id] = FOLK_CELLS;
const FOLK_STEP = 30;   // (measured off the painted farmer: a planted foot travels ~110 of 407 art px a pose) px of ground a pose of a folk runner's cycle covers (at depth scale and size 1)
const HOBBLE_STEP = 12; // ...and an old one's hobble (shorter steps, falling behind)
// ...and the convoy's prisoners out of the wrecked wagon (crowdHead): sim frames after the
// wreck the first jumps, frames between each, frames in the air; how high its bed is and
// the hop above it (px, depth scale 1); how far behind its back they land, and apart
const SPILL = { first: 10, every: 13, jump: 16, bed: 46, hop: 22, out: 30, gap: 38 };
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
// The wood's rescued (data/stageWood.js), each one their own person, not seven copies of the
// villager (Nick's review, 2026-11-05): a painted sheet each, a tint and a size; a group takes
// one look per head. Until each has a sheet of their own (ChatGPT art list, A7).
const WOOD_LOOKS = {
  joren: [{ who: 'joren', s: 1 }],
  // (each head's own painted villager where there's one: ChatGPT, 2026-11-18)
  tanners: [{ who: 'boy', tint: 0xdccab4, s: 1.05 }, { who: 'boy', tint: 0xc4ccd6, s: 0.94 }, { who: 'villager-tanner', s: 0.98 }],
  wenna: [{ who: 'mother', tint: 0xbab6b4, s: 0.9 }],
  ansel: [{ who: 'elder', tint: 0xe0d2bc, s: 1 }],
  convoy: [{ who: 'villager-burner', s: 1 }, { who: 'villager-woman', s: 0.96 }, { who: 'prisoner-a', s: 1 }, { who: 'prisoner-b', tint: 0xd6ccc4, s: 0.97 }, { who: 'mother', tint: 0xcabcb0, s: 0.95 }],
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
    this.fieldWords=scene.add.text(0,0,'',{fontFamily:FONT.ui,fontSize:'16px',color:'#fff0d8',align:'center',fontStyle:'bold',wordWrap:{width:260}}).setOrigin(.5,1).setDepth(DEPTH.popups).setVisible(false);
    // (on parchment, kept on screen and clear of the HUD: view/ShoutPlate.js)
    this.fieldShout=new ShoutPlate(scene,this.fieldWords);
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
    if (c === FOLK_RUN) y += FOLK_BOB[beat % 6] * k;
    let img = v.imgs[this.curN];
    if (!img) v.imgs.push(img = this.scene.add.image(x, y, S.key, 'f0').setOrigin(0.5, 1));
    this.curN++;
    // alive, not a picture: a breath, and a little sway (more on the rope, a shiver when
    // cowering), each man on his own beat
    const now = this.scene.time.now; const ph = (v.seed ?? 0) * 0.9 + this.curN * 1.7;
    const walk = c === RUN || c === FOLK_RUN || pose === 'look' || (this.smooth && Array.isArray(c));
    const br = walk ? 0 : Math.sin(now * 0.0026 + ph);
    const sway = walk ? 0 : c === HOBBLE ? 4 + 2 * (beat % 2) : pose === 'hang' ? 3.5 * Math.sin(now * 0.0017 + ph) : pose === 'cower' || pose === 'cling' ? 0.9 * Math.sin(now * 0.021 + ph) : 1.1 * Math.sin(now * 0.0011 + ph);
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
    // (the wood's rescued: whoever this head is, his own look; WOOD_LOOKS)
    if (!who && this.looks) {
      const L = this.looks[this.curN % this.looks.length];
      if (SPRITES[L.who] && CELLS[L.who]) {
        who = L.who; k *= L.s ?? 1;
        const tint = this.tint; this.tint = L.tint;
        const ok = this.sprite(g, x, y, k, pose, t, dir, who);
        this.tint = tint;
        if (ok) return true;
      }
      who = undefined;
    }
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

  // A child stranded up high till a hero gets to him (rescue 'reach': Tam on the burning
  // roofs), on his own painted sheet ('boy-roof'), acting it out. Waiting, he waves and
  // shouts for help, clings on and flinches from the sparks, by turns, facing the nearest
  // hero; a hero close by, he leans down to him; reached, he's relieved, then turns and
  // climbs down the back of the roof, sinking out of sight as he fades (stage/Story.js free)
  drawStranded(n, g, y, k, t) {
    const sheet = n.art && SPRITES[`${n.art}-roof`] ? `${n.art}-roof` : 'boy-roof'; // (Pip on his own sheet)
    if (!SPRITES[sheet] || (n.state !== 'trapped' && n.state !== 'free')) return false;
    let pose; let dy = 0; let tt = t;
    let dir = n.dir ?? -1;
    if (n.state === 'free') {
      const f = n.t / (n.freeFor ?? 50);
      pose = f < STRANDED_RELIEF ? 'relief' : 'climb';
      const c = Math.max(0, (f - STRANDED_RELIEF) / (1 - STRANDED_RELIEF));
      dy = 18 * c * k;
      g.setAlpha(1 - c); // (he stays in full view while he's relieved, fading only as he goes)
    } else {
      let near = null; let best = Infinity;
      for (const p of this.stage.players ?? []) {
        if (!p.alive) continue;
        const d = Math.abs(p.x - n.x) + Math.abs(p.z - n.z) * 0.5;
        if (d < best) { best = d; near = p; }
      }
      if (near) dir = Math.sign(near.x - n.x) || dir;
      if (near && Math.abs(near.x - n.x) < STRANDED_REACH && Math.abs(near.z - n.z) < 140) pose = 'reach';
      else {
        // (his own beat, so two stranded children don't move as one)
        const ph = (t + (this.cur?.seed ?? 0) * 37) % 330;
        pose = ph < 130 ? 'wave' : ph < 190 ? 'call' : ph < 280 || ph >= 310 ? 'cling' : 'flinch';
        tt = t * 0.5; // (a wave beat every 14 frames, not the run's 7)
      }
    }
    this.figure(g, n.x, y + dy, k, pose, tt, 0, dir, sheet);
    return true;
  }

  drawNpc(n, v) {
    const g = v.g.clear();
    this.cur = v; this.curN = 0;
    this.looks = this.stage.data.theme === 'wood' ? WOOD_LOOKS[n.id] ?? null : null;
    for (const img of v.imgs) img.setVisible(false);
    if(n.millCaptive){v.g.setVisible(false);v.halo.setVisible(false);v.shadow.setVisible(false);v.tip.setVisible(false);v.meter.clear();return;}
    v.father?.setVisible(false);
    v.guideDeath?.setVisible(false);
    v.shadow.setScale(1);
    if(n.stableMaster){
      v.halo.setVisible(false);v.tip.setVisible(false);v.meter.clear();
      v.worker??=new StableMasterView(this.scene,v);v.worker.draw(n);return;
    }
    v.fg?.clear();
    const t = this.scene.time.now / 16.7;
    this.drawPrompt(n, v);
    if (n.pose === 'noose' || n.pose === 'cage') { this.drawCaptive(n, v, t); return; }
    if (n.pose === 'treed') { this.drawTreed(n, v, t); return; }
    if (n.pose === 'hanged') { this.drawHanged(n, v, t); return; }
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
    // (a talker's is small and faint: five of them stood together at the north gate made one
    // big yellow block of light; Nick's second level 1 review, 2026-11-03)
    v.halo.setVisible(needs || talks).setPosition(n.x, n.z - n.h - 58).setDepth(n.z - 0.6).setTint(needs ? 0xdfe8ff : 0xffd890)
      .setScale(needs ? 3 : 1.8, needs ? 4 : 2.4)
      .setAlpha(needs ? 0.25 + 0.2 * Math.sin(t * 0.12) : talks ? 0.1 + 0.05 * Math.sin(t * 0.12) : 0);
    if (!show) return;
    const y = n.z - n.h;
    const k = depthScale(n.z);
    if(n.id==='hakon' && this.scene.textures.exists('hakon-dying')) {
      v.father ??= this.scene.add.image(n.x,y,'hakon-dying').setOrigin(0.5,0.96);
      const dead=n.state==='dead';
      const deadArt=dead&&this.scene.textures.exists('hakon-dead');
      v.father.setTexture(deadArt?'hakon-dead':'hakon-dying');
      const breath=dead?0:Math.sin(this.scene.time.now*0.002)*0.004;
      // (a little bigger than his son, no more: Nick, 2026-11-05; was 180 / 95, a giant on the steps)
      const size=deadArt?135*k/v.father.frame.width:70*k/v.father.frame.height;
      v.father.setPosition(n.x,y).setScale(size,size*(1+breath))
        .setDepth(n.z+0.01).setTint(0xffffff).setAlpha(n.carried?(n.carrierBlend??0):1).setVisible(!n.insideChurch);
      // the Oath King's crown, fallen on the church steps by his hand (ChatGPT, docs/king-hakon/):
      // it stays there when they carry him in
      if(this.scene.textures.exists('king-crown')){
        v.crown ??= this.scene.add.image(0,0,'king-crown').setOrigin(0.5,0.9);
        v.crown.setPosition(n.x-(n.crownAt??46)*k,y-2).setScale(24*k/v.crown.frame.width).setDepth(n.z+0.02).setVisible(true);
      }
      return;
    }
    const dir = n.dir ?? -1;
    v.shadow.setPosition(n.x, n.z - (n.shadowH ?? n.h)).setDepth(n.h > 0 ? n.z - 0.4 : DEPTH.shadows);
    g.setDepth(n.z);
    const tun = (i) => TUNIC[(v.seed + i) % TUNIC.length];
    // (n.act: a pose the stage plays for a moment, stage/MillRescue.js jumpDown)
    const pose = n.act ?? ((n.state === 'idle' && n.lifePose) || (n.state === 'fleeing' || n.gatherMoving ? 'run' : n.mourning ? (n.pose==='family'||n.pose==='child'?'cower':'kneel') : n.state === 'threatened' || n.cower ? 'cower' : n.state === 'trapped' ? 'wave' : 'stand'));
    if(n.guide && ['dying','dead'].includes(n.state) && this.drawGuideDeath(n,v,y,k))return;
    if (n.state === 'dead' && SPRITES.nicholas && n.art === 'nicholas') { this.figure(g, n.x, y, k, 'lie', t, 0, 1, 'nicholas'); return; }
    if (n.pose === 'captive-kneel' && this.drawKneeling(n, v, g, y, k, t)) return;
    if (n.state === 'lost' || n.state === 'dead') { this.fallen(g, n.x, y, k, tun(0)); return; }
    if (n.guide) { this.drawGuide(n, v, g, y, k, t, dir); return; }
    if (n.pose === 'wounded') return this.figure(g, n.x, y, k, 'sit', t, tun(0), 1, n.art);
    if (n.pose === 'lame') {
      // limping on a crutch (a stick under one arm), slow
      const p = n.state === 'escort' && n.moving ? 'run' : pose;
      // (his own painted sheet, crutch and splint and all: Nick, 2026-11-24)
      const who = SPRITES[n.id] && CELLS[n.id] ? n.id : SPRITES.captive ? 'captive' : n.art;
      if (this.figure(g, n.x, y, k, p === 'run' ? 'limp' : p, t * 0.5, tun(5), dir, who)) return;
      g.lineStyle(3 * k, 0x6a5038, 1).lineBetween(n.x + 10 * k * dir, y, n.x + 6 * k * dir, y - 44 * k);
      return;
    }
    if (n.pose === 'child' && n.rescue === 'reach' && this.drawStranded(n, g, y, k, t)) return;
    if (n.pose === 'child') { const own = n.art && SPRITES[n.art] ? n.art : 'boy'; return this.figure(g, n.x, y, k * 0.7 / (SPRITES[own] ? 0.7 : 1), pose, t, tun(1), dir, own); }
    if (n.pose === 'family' && n.split) {
      // torn apart at the well (stage/WellRescue.js): Mira on her own, and her boy wherever
      // he is (at the end of the butcher's arm, on the stones, down the well). Her own sheet
      // without him once it's painted ('mira'), till then the village woman's
      this.tilt = n.tilt;
      this.figure(g, n.x, y, k, pose, t, tun(2), dir, SPRITES.mira ? 'mira' : 'villager-woman');
      this.tilt = undefined;
      const b = n.boy;
      // held out by the butcher, both painted: him in his hold, the boy hanging from his fist
      if (b?.shown && b.held && b.holder?.alive && SPRITES['boy-held'] && SPRITES['butcher-hold']) {
        this.drawWellHold(g, b, t);
        g.setDepth(n.z);
        return;
      }
      if (b?.shown) {
        const bk = depthScale(b.z), by = b.z - b.h;
        g.setDepth(b.z);
        const sm = this.smooth; this.tilt = b.tilt; this.smooth = b.pose === 'run';
        this.figure(g, b.x, by, bk * 0.7 / (SPRITES.boy ? 0.7 : 1), b.pose, b.pose === 'run' ? ((b.stride ?? 0) / (RUN_STEP * bk)) * 7 : t, tun(1), b.dir ?? 1, SPRITES['boy-held'] && b.pose === 'wave' && b.h > 20 ? 'boy-held' : 'boy');
        this.tilt = undefined; this.smooth = sm;
        g.setDepth(n.z);
      }
      return;
    }
    if (n.pose === 'family') {
      // (the painted mother carries her child; the drawn one has him at her side)
      if (!this.figure(g, n.x, y, k, pose, t, tun(2), dir, 'mother')) this.figure(g, n.x + 22 * dir * -1, y + 4, k * 0.68, pose, t + 7, tun(3), dir);
      return;
    }
    if (n.pose === 'chained') { this.drawChained(n, v, g, y, k, t, pose, dir); return; }
    if (n.pose === 'group' || n.pose === 'convoy') {
      // (the barn's group is the miller's people: Irvolino leads them, data/speakers.js MILLER)
      const heads = n.people ?? 3;
      for (let i = 0; i < heads; i++) {
        const first=this.curN;
        // (each their own person, data/folk.js; or crowd: a sheet for each of the three,
        // data/stageVillage.js; otherwise all three on the villager sheet, the middle one smaller)
        const H = this.crowdHead(n, i, heads, k, t, pose, dir);
        if (H.hide) continue; // (still inside the wreck)
        const who = H.who ?? n.crowd?.[i] ?? (i === 0 && n.id === 'barn' ? 'irvolino' : undefined);
        this.tilt = H.tilt;
        this.figure(g, n.x + H.dx, y + H.dz - (H.up ?? 0), k * (H.s ?? (n.crowd || i !== 1 ? 1 : 0.75)), H.pose, H.tt, tun(i + 4), H.dir, who);
        this.tilt = undefined;
        if(i===0&&n.carrier)for(const img of v.imgs.slice(first,this.curN))img.setAlpha(g.alpha*(n.carrierBlend??0));
      }
      return;
    }
    // (a sprinter's legs keep pace with the ground he covers, one beat per RUN_STEP px)
    const tt = n.sprint && pose === 'run' ? ((n.stride ?? 0) / (RUN_STEP * k)) * 7
      : n.life && pose === 'run' && n.moving ? ((n.stride ?? 0) / (SMITH_STEP * k)) * 7 : t;
    this.tilt = n.tilt; this.squash = n.squash;
    this.figure(g, n.x, y, k, pose, tt, tun(0), dir, n.actArt ?? n.art);
    this.tilt = this.squash = undefined;
  }

  // THE WELL (stage/WellRescue.js): the butcher in his painted hold over the well, and the boy
  // hanging by the collar from his fist (their sheets: data/levelArt.js 'butcher-hold' and
  // 'boy-held'; the fist and the collar: WELL_ART, in fractions of each sheet's cell)
  drawWellHold(g, b, t) {
    const f = b.holder, fr = b.frame ?? 0, face = f.facing || -1;
    const fk = depthScale(f.z), B = SPRITES['butcher-hold'], C = SPRITES['boy-held'];
    const fist = WELL_ART.fist[fr], col = WELL_ART.collar[fr];
    const fy = f.z - f.h;
    g.setDepth(f.z);
    const tint = this.tint; this.tint = WELL_ART.tint;
    this.sprite(g, f.x, fy, fk, `h${fr}`, t, face, 'butcher-hold');
    this.tint = tint;
    const hx = f.x + face * (fist[0] - 0.5) * B.fw * 0.5 * fk, hy = fy - (1 - fist[1]) * B.fh * 0.5 * fk;
    const bx = hx - face * (col[0] - 0.5) * C.fw * 0.5 * fk, by = hy + (1 - col[1]) * C.fh * 0.5 * fk;
    g.setDepth(f.z + 0.5);
    this.tilt = b.tilt * 0.4;
    this.sprite(g, bx, by, fk, `h${fr}`, t, face, 'boy-held');
    this.tilt = undefined;
  }

  // Who the i-th of a freed crowd is (data/folk.js): dealt from the pool the first time
  // they're drawn, nobody twice in a level, the crowd's own wishes first (`folk`: the
  // tanner's boys are boys). Undefined if nobody's painted yet, or a crowd keeps its own.
  folkFor(n, i) {
    if (!(n.pose === 'group' || n.pose === 'convoy' || n.group)) return undefined;
    const key = `${n.id}:${i}`;
    const deal = (this.folkDeal ??= new Map());
    if (deal.has(key)) return deal.get(key);
    const used = new Set(deal.values());
    const free = (id) => SPRITES[id] && !used.has(id);
    let who = (n.folk ?? []).find(free);
    if (!who) {
      // (each level starts the deal at its own place in the pool, so level 2's first
      // freed aren't level 1's first again)
      const id = this.stage.data.id ?? '';
      let at = 0; for (const ch of id) at = (at * 31 + ch.charCodeAt(0)) % FOLK.length;
      for (let j = 0; j < FOLK.length && !who; j++) if (free(FOLK[(at + j) % FOLK.length].id)) who = FOLK[(at + j) % FOLK.length].id;
    }
    // (more freed than painted: a face again, though never two together in one crowd)
    if (!who) who = FOLK.map((F) => F.id).find((id) => SPRITES[id] && ![0, 1, 2, 3].some((j) => deal.get(`${n.id}:${j}`) === id));
    if (who) deal.set(key, who);
    return who;
  }

  // The i-th of a freed crowd this frame: who, where (dx, dz off the crowd's spot), in what
  // pose, at what beat (tt), facing which way, leaning how far. Freed, they flinch from the
  // crash, then straighten and look to the hero who freed them (one or two raise a hand),
  // not all at once. Running, they don't move as one block: they string out (the young in
  // front, the old falling behind, hobbling), spread over the road, each on their own
  // stride, the feet keeping pace with the ground they cover, now and then one glancing
  // back over a shoulder (Nick, 2026-11-20).
  crowdHead(n, i, heads, k, t, pose, dir, gap = 42) {
    const who = this.folkFor(n, i);
    const F = who && FOLK_BY_ID[who];
    const seed = ((this.cur?.seed ?? 0) * 31 + i * 17) % 97;
    // (out of the convoy's wagon: they land in a ragged line behind its back door, SPILL)
    const wagon = n.pose === 'convoy' && (n.state === 'free' || n.state === 'fleeing') ? this.wagonOf(n) : null;
    const home = wagon ? -wagon.w * 0.5 - SPILL.out - i * SPILL.gap : (i - (heads - 1) / 2) * gap;
    const H = { who, s: F?.s, dx: home, dz: wagon ? ((i * 37) % 5 - 2) * 10 : (i % 2) * 6, pose, tt: t + i * 5, dir, tilt: undefined };
    if (n.state === 'free' && wagon) {
      // one by one out of the smashed back of the wagon: a jump down from its bed, an arc
      // through the air, a stumble on landing (a crouch), then up, looking to the hero
      const f = n.t - SPILL.first - i * SPILL.every;
      if (f < 0) { H.hide = true; return H; }
      const door = -wagon.w * 0.42;
      const j = Math.min(1, f / SPILL.jump);
      H.dx = door + (home - door) * j;
      H.up = j < 1 ? SPILL.bed * k * (1 - j) + Math.sin(j * Math.PI) * SPILL.hop * k : 0;
      H.dir = -1;
      H.pose = j < 1 ? 'run' : f < SPILL.jump + 12 ? 'cower' : (i % 2 ? 'wave' : 'stand');
      H.tt = (f * 0.6) * 7 / 4;
      return H;
    }
    if (n.state === 'free' && F) {
      const f = n.t - i * 5; // (not all at once)
      H.pose = f < 16 ? 'cower' : f > 24 && (i === heads - 1 || seed % 3 === 0) ? 'wave' : 'stand';
      let near = null; let best = Infinity;
      for (const p of this.stage.players ?? []) {
        if (!p.alive) continue;
        const d = Math.abs(p.x - n.x - home);
        if (d < best) { best = d; near = p; }
      }
      if (near && f >= 16) H.dir = Math.sign(near.x - n.x - home) || dir;
    } else if (n.state === 'fleeing') {
      const hobble = F?.gait === 'hobble';
      // (how far behind the front they end up, taken slowly enough that nobody runs backwards
      // while they drop back; the old ones keep falling behind, at their own pace)
      const far = (F?.lag ?? i * 24) + i * 8;
      const s = Math.min(1, n.t / Math.max(70, far / 0.7)); const ease = s * (2 - s);
      const lag = far * ease + (hobble ? n.t * 0.55 : 0);
      H.dx = (wagon ? home : home * (1 - 0.5 * ease)) - dir * lag;
      H.dz += ((seed % 5) - 2) * 9 * ease;
      const ground = Math.max(0, (n.stride ?? 0) - lag) + seed * 3;
      if (F) {
        H.tt = (ground / ((hobble ? HOBBLE_STEP : FOLK_STEP) * k * F.s)) * 7;
        const glance = n.t > 40 && !hobble && (n.t + seed * 11) % 150 < 20;
        H.pose = glance ? 'look' : 'run';
        H.tilt = glance ? 0 : hobble ? 2 : 5;
      } else H.tt = (ground / (RUN_STEP * k)) * 7;
    }
    return H;
  }

  // the convoy's wagon a crowd rides in (stage/Story.js 'convoy': the prop with its tag)
  wagonOf(n) {
    return (this.wagons ??= new Map()).get(n.id) ?? this.wagons.set(n.id, this.stage.props.find((q) => q.kind === 'wagon' && q.tag === n.tag) ?? null).get(n.id);
  }

  // The guide (Nicholas, stage/Story.js `guide`): walking on ahead, or waiting, looking on
  // up the road and now and then pointing the way; braced while a fight is on; struck down,
  // he sits against the rock. Where he goes round by his own way he fades out, and back in.
  // His steps keep pace with the ground he covers (one beat per GUIDE_STEP px), so his feet
  // don't skate, and he sinks gently on each footfall.
  drawGuideDeath(n,v,y,k){
    const S=SPRITES['nicholas-death'];if(!S)return false;
    const moment=n.farewellMoment,age=n.t-(n.farewellAt??0);
    let frame=n.t<18?0:n.t<58?1:2;
    if(moment==='nicholasReach')frame=3;
    if(moment==='nicholasFade')frame=4;
    const dead=n.state==='dead'||moment==='nicholasDies';
    if(dead)frame=age<50&&n.state!=='dead'?4:5;
    const settling=frame<2?Math.sin(n.t*.13)*1.4:0;
    const breath=dead?0:Math.sin(this.scene.time.now*.003)*.003;
    v.guideDeath??=this.scene.add.image(0,0,S.key,'f0').setOrigin(.5,1);
    v.guideDeath.setTexture(S.key,'f'+frame).setPosition(n.x+settling,y)
      .setScale(k*.5,k*.5*(1+breath)).setAngle(frame===0?-3:0)
      .setAlpha(v.g.alpha).setTint(0xffffff).setDepth(n.z+.02).setVisible(true);
    v.shadow.setScale(frame<2?1:1.45,1).setAlpha(.3);
    v.halo.setVisible(false);return true;
  }

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
  // The villager on his knees at Varek's feet in the opening (stage/VillageOpening.js).
  // Painted death strip (data/levelArt.js 'villager-death': begging, struck, pitching
  // forward, face down) when it's in: he shakes, harder as the mace goes up; on the hit
  // he jolts in the struck pose through the freeze, pitches forward and lands with a
  // little bounce, the blood spreading from his head. Without it the old kneeling pose
  // tips over.
  drawKneeling(n, v, g, y, k, t) {
    const dead = n.state === 'dead';
    if (SPRITES['villager-death']) {
      const d = dead ? n.t : -1;
      const F = n.freeze ?? 9;
      const pose = !dead ? 'beg' : d < F + 5 ? 'struck' : d < F + 14 ? 'fall' : 'lie';
      const shake = !dead ? (n.dread ?? 0.25) * 1.4 * Math.sin(t * 2.3) : d < F ? 3 * (1 - d / F) * (d % 2 ? 1 : -1) : 0;
      const land = pose === 'lie' ? Math.max(0, 1 - (d - F - 14) / 8) : 0;
      const dy = -4 * k * Math.sin(land * Math.PI); // (the body comes down, bounces once, lies still)
      // (the cut is as wide as the man lying stretched out, boots at its left edge: the
      // kneeling man is DEATH_SHIFT px off its middle, his head when he's down DEATH_HEAD)
      if (!this.figure(g, n.x - DEATH_SHIFT * k + shake * k, y + dy, k, pose, 0, 0, -1, 'villager-death')) return false;
      const img = v.imgs[this.curN - 1];
      img.setAngle(0).setScale(k * 0.5);
      if (dead && d < 2) img.setTintFill(0xffffff); // (the flash of the hit)
      if (dead) {
        const pool = Math.min(1, Math.max(0, d - F - 14) / 180);
        if (pose === 'lie') g.fillStyle(0x4a0606, 0.8).fillEllipse(n.x - DEATH_HEAD * k, y + 1, (14 + 80 * pool) * k, (4 + 10 * pool) * k);
      }
      return true;
    }
    if (!this.figure(g, n.x, y, k, 'kneel', t, 0, -1, 'villager')) return false;
    const img = v.imgs[this.curN - 1];
    if (!dead) return true;
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
        for (let i = 0; i < many; i++) {
          const H = this.crowdHead(n, i, many, k, t, p, dir, 40);
          this.tilt = H.tilt;
          this.figure(g, n.x + H.dx, y + H.dz, k * (H.s ?? (many > 1 && i === 1 ? 0.85 : 1)), H.pose, H.tt, tun(i), H.dir, H.who);
          this.tilt = undefined;
        }
      }
      if (this.scene.textures.exists('cagecart')) {
        // the wood's painted cage cart (assets/env/wood/cage_cart.png): its cage locked, or
        // its door hanging open; the prisoners crouch inside, behind its bars
        const cw = (n.group ? 250 : 220) * ck;
        // (in the wood's own light, dark at the wheels, on a soft pool of shadow: it was drawn
        // bright and flat and looked pasted on the mud, Nick 2026-11-26)
        if (!v.cage) {
          v.cage = this.scene.add.image(0, 0, 'cagecart').setOrigin(0.5, 0.97);
          lightProp(v.cage, PROP_LIGHT.gallowsWood, 1.4);
          v.cageShadow = this.scene.add.image(0, 0, 'glow').setTint(0x000000).setAlpha(0.7);
        }
        v.cage.setTexture(open ? 'cagecart-broken' : 'cagecart').setPosition(cx, cz + 8).setDepth(cz + 0.5).setVisible(true);
        v.cage.setScale(cw / v.cage.frame.width);
        v.cageShadow.setPosition(cx, cz + 4).setDisplaySize(cw * 1.15, 30).setDepth(DEPTH.shadows).setVisible(true);
        v.cageH = v.cage.displayHeight * 0.3 - 34; // (the prisoners crouch on its floor, over the wheels)
        return;
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

  // A man hanging by his hands up the hangman's rope, hounds leaping at his feet (rescue
  // 'treed', Gallows Wood's Joren: he slipped his noose and climbed the rope out of reach).
  // The bough is the painted tree's (view/WoodView.js); he's the captive sheet's hanging pose,
  // legs kicking while the hounds are at him, his grip meter over his hands. Saved, he drops
  // down and runs; lost, he lies under the bough.
  drawTreed(n, v, t) {
    const g = v.g;
    const k = depthScale(n.home.z);
    const bx = n.home.x; const by = n.home.z - n.h;
    // (`hold`: how far under the rope line his hands are: on the painted bough's lower limb)
    // (his rope is tied under the bough's tip, data/hangingTree.js: it used to start in the sky)
    const ropeTop = this.stage.data.gallows ? boughPoint(this.stage.data.gallows, 'tip').y : by - 200;
    const bough = ropeTop + (n.hold ?? 0); // (where his hands are: up his own rope, the noose slipped)
    const own = !!SPRITES.joren;
    // (the hanging pose: his feet this far under his hands; his own sheet's hanging cells have
    // his wrists at the cell's top, so the whole cell)
    const hands = own ? SPRITES.joren.fh * 0.5 * k : 92 * k;
    const tun = TUNIC[v.seed % TUNIC.length];
    const who = own ? 'joren' : SPRITES.captive ? 'captive' : undefined;
    const needs = n.state === 'threatened';
    v.halo.setVisible(needs).setPosition(bx, bough + hands * 0.5).setDepth(n.home.z - 0.6).setAlpha(needs ? 0.25 + 0.2 * Math.sin(t * 0.12) : 0);
    v.shadow.setVisible(false);
    g.setVisible(true).setAlpha(1).setDepth(n.home.z);
    if (n.state === 'lost') { v.rope?.setVisible(false); this.fallen(g, bx, by, k, tun); return; }
    if (n.state === 'threatened') {
      const kick = n.cower ? Math.sin(t * 0.45) * 3 : Math.sin(t * 0.03) * 1.5;
      if (!this.treedRope(v, bx, ropeTop, bx + kick * 0.6, bough + 4, n.home.z)) g.lineStyle(2, 0x6a5a40, 1).lineBetween(bx, ropeTop, bx + kick * 0.6, bough + 4); // the rope he's tied by
      this.figure(g, bx + kick, bough + hands, k, own && n.cower ? 'kick' : who ? 'hang' : 'cower', t, tun, -1, who);
      const frac = Math.max(0, Math.min(1, n.nerve / (n.hp ?? NPC.nerve)));
      if (frac < 1) {
        const my = bough - 22;
        v.meter.fillStyle(0x000000, 0.7).fillRect(bx - 31, my, 62, 7);
        v.meter.fillStyle(n.cower ? 0xff7050 : 0xd8b04a, 1).fillRect(bx - 30, my + 1, 60 * frac, 5);
      }
      return;
    }
    if (n.state === 'free') {
      // he lets go and drops, then gets up
      // (the cut rope's end left hanging from the bough)
      if (!this.treedRope(v, bx, ropeTop, bx, ropeTop + (bough - ropeTop) * 0.7, n.home.z)) g.lineStyle(2, 0x6a5a40, 1).lineBetween(bx, ropeTop, bx, bough);
      const d = Math.min(1, n.t / 14);
      const y = bough + hands + (by - bough - hands) * d * d;
      this.figure(g, bx, y, k, d < 1 && who ? 'hang' : 'cower', t, tun, -1, who);
      return;
    }
    if (n.state === 'safe' || n.state === 'gone') { g.setVisible(false); v.rope?.setVisible(false); return; }
    v.rope?.setVisible(false);
    g.setDepth(n.z);
    this.figure(g, n.x, n.z - n.h, depthScale(n.z), n.state === 'fleeing' ? 'run' : 'stand', t, tun, n.dir ?? -1, n.state === 'fleeing' ? who : undefined);
  }

  // Joren's rope, from the bough down to his wrists: the hanged dead's painted hemp (a twist of
  // it tiled, drawHanged's strand), not a drawn line. False if that painting isn't loaded.
  treedRope(v, x0, y0, x1, y1, z) {
    const s = this.scene;
    const key = artKey('wood', 'hanged_1');
    if (!s.textures.exists(key)) return false;
    const st = HANGED_FIT.hanged_1.strand;
    const tex = s.textures.get(key);
    if (!tex.has('strand')) tex.add('strand', 0, st[0], 0, st[1] - st[0], st[2]);
    if (!v.rope) { v.rope = s.add.tileSprite(0, 0, st[1] - st[0], st[2], key, 'strand').setOrigin(0.5, 0); lightProp(v.rope, PROP_LIGHT.gallowsWood, 0.92); }
    const sc = 0.2; const len = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
    v.rope.setSize(st[1] - st[0], len / sc).setTilePosition(0, -len / sc).setPosition(x0, y0).setScale(sc)
      .setAngle(-Phaser.Math.RadToDeg(Math.atan2(x1 - x0, y1 - y0))).setDepth(z - 0.01).setVisible(true);
    return true;
  }

  // The dead on the hanging tree (Gallows Wood): left there by the hangmen, turning slowly.
  // View only (no rescue). Painted (ChatGPT, 2026-11-20: three shrouded dead, assets/env/wood/
  // hanged_1..3.png, the rope running out of each picture's top), each rope tied under a real
  // bough of the painted tree (data/hangingTree.js), lit like the wood's props, swaying and
  // turning a little, a soft shadow on the mud under it. (Nick, 2026-11-20: "at the hanging tree
  // must fix the guys hanging it looks bad": they were the captive's hanging-by-the-hands pose,
  // on a line from the sky.) Code-drawn rope and figure only if the paintings are missing.
  drawHanged(n, v, t) {
    const g = v.g;
    const s = this.scene;
    const G = this.stage.data.gallows;
    v.halo.setVisible(false); v.shadow.setVisible(false);
    const key = artKey('wood', n.art ?? 'hanged_1');
    if (!G || !s.textures.exists(key)) {
      const k = depthScale(n.z);
      const bough = G ? G.z - 214 : n.z - n.h - 200;
      g.setVisible(true).setAlpha(1).setDepth(n.z - 1);
      const sway = Math.sin(t * 0.03 + v.seed) * 2.5;
      const drop = n.drop ?? 70;
      g.lineStyle(2, 0x6a5a40, 1).lineBetween(n.x, bough, n.x + sway * 0.5, bough + drop);
      this.figure(g, n.x + sway, bough + drop + 92 * k, k * 0.95, SPRITES.captive ? 'hang' : 'stand', 0, 0x3a3630, 1, SPRITES.captive ? 'captive' : undefined);
      return;
    }
    g.setVisible(true).setAlpha(1).setDepth(G.z + 0.5);
    const tie = boughPoint(G, n.bough);
    const fit = HANGED_FIT[n.art] ?? HANGED_FIT.hanged_1;
    if (!v.hanged) { v.hanged = s.add.image(0, 0, key).setOrigin(fit.rope, 0); lightProp(v.hanged, PROP_LIGHT.gallowsWood, 0.92); }
    const img = v.hanged;
    const H = img.frame.realHeight ?? img.frame.height;
    const bodyPx = H - fit.head; // (the shroud, head to foot, in the picture)
    const sc = (HANGED.body * depthScale(n.z)) / bodyPx;
    // the rope between the bough and his head: as long as it has to be for his feet to hang
    // clear of the mud; the painted rope is cut short, or drawn on up to the bough
    const ropeLen = Math.max(8, (n.z - HANGED.clear) - tie.y - bodyPx * sc);
    const painted = fit.head * sc;
    const cut = Math.max(0, (painted - ropeLen) / sc);
    img.setCrop(0, cut, img.frame.width, H - cut);
    // (slow and heavy: a sway from the knot and a slow turn on the rope, each its own pace)
    const ph = t * 0.022 + (v.seed ?? 0) * 1.7;
    const ang = Math.sin(ph) * 1.6 + Math.sin(ph * 0.37) * 0.8;
    const turn = 1 - 0.12 * (0.5 + 0.5 * Math.sin(t * 0.009 + (v.seed ?? 0)));
    const extra = Math.max(0, ropeLen - painted); // (rope drawn on above the painting)
    const rad = Phaser.Math.DegToRad(ang);
    const topX = tie.x - Math.sin(rad) * extra; const topY = tie.y + Math.cos(rad) * extra;
    // (the painted rope itself, a twist of it repeated, so the rope up to the bough is the same
    // hemp as the rope in the painting, not a drawn line)
    const st = fit.strand;
    const tex = s.textures.get(key);
    if (st && !tex.has('strand')) tex.add('strand', 0, st[0], 0, st[1] - st[0], st[2]);
    if (st && !v.strand) { v.strand = s.add.tileSprite(0, 0, st[1] - st[0], st[2], key, 'strand').setOrigin(0.5, 0); lightProp(v.strand, PROP_LIGHT.gallowsWood, 0.92); }
    if (v.strand) {
      // (from the bough down to the painting's top; the picture's rope x lines up with the strand's middle)
      v.strand.setSize(st[1] - st[0], Math.max(1, extra / sc)).setTilePosition(0, -extra / sc)
        .setPosition(tie.x, tie.y).setScale(sc * turn, sc).setAngle(ang).setDepth(G.z + 0.6).setVisible(extra > 0);
    } else if (extra > 0) {
      g.lineStyle(10 * sc, 0x2c241a, 1).lineBetween(tie.x, tie.y, topX, topY);
      g.lineStyle(4 * sc, 0x6e5e44, 0.9).lineBetween(tie.x - 0.6, tie.y, topX - 0.6, topY);
    }
    // a twist of rope round the bough where it's tied
    g.fillStyle(0x3a3022, 1).fillEllipse(tie.x, tie.y - 1, 9, 5);
    g.lineStyle(1, 0x7a6a4c, 0.8).strokeEllipse(tie.x, tie.y - 1, 9, 5);
    // (the cropped picture keeps its origin at the original top: move it up by the cut)
    img.setPosition(topX + Math.sin(rad) * cut * sc, topY - Math.cos(rad) * cut * sc)
      .setScale(sc * turn, sc).setAngle(ang).setDepth(G.z + 0.6).setVisible(true).setFlipX(!!n.flip);
    // his shadow on the mud under him, moving with him
    const foot = tie.x - Math.sin(rad) * (ropeLen + bodyPx * sc);
    const sh = v.hangShadow ??= s.add.image(0, 0, 'glow').setTint(0x000000).setDepth(DEPTH.shadows);
    sh.setPosition(foot, n.z + 4).setDisplaySize(46 * depthScale(n.z), 12).setAlpha(0.32).setVisible(true);
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
    v.tip.setVisible(!!text).setText(text).setPosition(n.x, y - (q?.kind === 'talk' ? 163 : 128));
    // (a colour change redraws the words and sends them to the graphics card: only when it changes)
    const col = q?.kind === 'busy' ? '#ff9a7a' : '#f0e6d0';
    if (v.tip.style.color !== col) v.tip.setColor(col);
    const bar = (frac, col) => {
      m.fillStyle(0x000000, 0.7).fillRect(n.x - 31, y - 122, 62, 7);
      m.fillStyle(col, 1).fillRect(n.x - 30, y - 121, 60 * Math.max(0, Math.min(1, frac)), 5);
    };
    // someone with something to say, before a hero is near enough for the prompt: a speech
    // bubble bobbing over his head, so he's seen from across the street
    if (!n.act && this.hasWord(n)) {
      const by = y - 140 + 4 * Math.sin(this.scene.time.now * 0.004);
      // (a scrap of old parchment, not a white cartoon bubble: Nick's level 1 review,
      // 2026-11-03) dark ink edge, aged paper with a shaded lower half, ink dots
      m.fillStyle(0x1a0f08, 0.8).fillRoundedRect(n.x - 20, by - 14, 40, 24, 4).fillTriangle(n.x - 7, by + 8, n.x + 4, by + 8, n.x - 5, by + 17);
      m.fillStyle(0xc9b083, 1).fillRoundedRect(n.x - 18, by - 12, 36, 20, 3).fillTriangle(n.x - 5, by + 6, n.x + 2, by + 6, n.x - 4, by + 13);
      m.fillStyle(0xa88c60, 1).fillRect(n.x - 18, by + 2, 36, 5);
      m.fillStyle(0xe2cfa3, 1).fillRect(n.x - 16, by - 11, 32, 2);
      m.fillStyle(0x3a2414, 1);
      for (let i = -1; i <= 1; i++) m.fillEllipse(n.x + i * 9, by - 2, 4.6, 3.6);
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
    // (and three more, so the same three don't lie all down the street: bodies2.png)
    const kinds = painted && cutPieces(s, 'bodies2-src', ['body-3', 'body-4', 'body-5']) ? 6 : 3;
    for (const b of list) {
      const g = s.add.graphics().setDepth(DEPTH.decals + 1);
      g.fillStyle(0x4a0606, 0.6).fillEllipse(b.x + 6, b.z + 2, 60, 12); // dried blood
      if (painted) {
        const img = s.add.image(b.x, b.z + 4, `body-${b.pose % kinds}`).setOrigin(0.5, 1).setDepth(DEPTH.decals + 1.1);
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
        f.z=380+c.i*95;f.facing=1;f.vx=moving?300:0;f.vz=0;f.sprinting=moving&&!st.opening.walk; // (the wood's: a walk in)
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
      const farewell=this.scene.ascentFarewell;
      if(farewell?.active){
        const n=farewell.npc;
        target={x:n.x+(c.id==='warrior'?88:185+c.i*48),z:n.z+(c.id==='warrior'?22:50+c.i*20),face:-1};
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
    this.fieldShout.setVisible(!!n&&(!!field||!this.story?.holding));
    if(n){this.fieldWords.setText(field?.text??n.helpText);this.fieldShout.place(n.x,n.z-(n.h??0)-125);}
  }
}


