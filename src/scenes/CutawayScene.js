// CutawayScene.js — THE BLACK KEEP: the king's five scenes between the campaign's levels
// (docs/campaign/plan.md, "The king's arc"; docs/black-keep-scenes.md). They are one story
// told in five parts, and every part is built the same way, so they read as a set:
//
//   1. THE KEEP FROM OUTSIDE: the painted Keep under its storm (assets/env/keep/sky.png,
//      far.png), the chapter's number and name. Each time there is more fire on the horizon:
//      the war coming up the road towards it.
//   2. THE THRONE ROOM: King Vaurath before his throne (his painted art), Malgor at the foot
//      of the dais, a soldier come with the news (the Ashen grunt's painted strips), the
//      king's guard along the hall. The hall REMEMBERS: the throne arm he cracked stays
//      cracked, the war map he threw stays on the floor, the captain he burned stays a pile
//      of ash, and every scene there are fewer guards (the last scene: none). The camera
//      moves to whoever speaks.
//   3. THE OATH: a cut to black, the three Oath Keepers' faces, and their oath, one line more
//      each scene, until in the fifth it is whole.
//   4. THE WAR MAP, last, as its own part with its own music (Nick, 23 Nov: "after each scene
//      then have the map progression scene, I will provide music for it"; 'warmap' in
//      core/Music.js, silence until his track is in). The Oath Keepers' red token moves one
//      place along the road and knocks down the king's black marker there; the roads left to
//      the Black Keep are counted down (four, three, two, one, none); the next place rings.
//
// The king himself comes apart scene by scene: confidence (he shows his power), irritation
// (he cracks the throne), frustration (he throws the map), unease (he burns his own captain),
// fear (the fire in his hand goes out; then the doors boom and he lights it again: "Let them
// come."). The tension is a number, 0 to 4 (TENSION below): it sets the guards, the fires,
// the light, the ash and embers in the air and, from the fourth scene, a heartbeat.
//
// SPACE / ENTER / J (pad A) or a click: next line (a line waits for it; the king's acts
// play out by themselves).  ESC (pad B or Start): skip the scene. Skipping changes nothing:
// the scene is only shown, and its outcome is the level's (already saved).
//
// Art: everything here is painted except the war map, its table, the helm and the stand-ins
// used when a painted piece fails to load. Prompts for those: docs/black-keep-scenes.md.

import { SETTINGS } from '../config/settings.js';
import { FONT, epicFill } from '../view/fonts.js';
import { playSfx } from '../core/Sfx.js';
import { playMusic, playCue, stopMusic } from '../core/Music.js';
import { DialogueBox } from '../view/DialogueBox.js';
import { torchFlame } from '../view/TorchFlame.js';

export const CUTAWAYS = {
  learns: {
    chapter: 0, numeral: 'I', title: 'THE VILLAGE STANDS',
    beats: [
      { act: 'enter' },
      { who: 'MESSENGER', text: 'My king. The village stands. Varek is dead, and every man he led.' },
      { who: 'VAURATH', text: 'Who.' },
      { who: 'MESSENGER', text: 'Three of them, my king. Hakon\'s son, Rurik, and the two who ride with him.' },
      { who: 'MESSENGER', text: 'Oath Keepers, my king. And now our men are saying the name.' },
      { who: 'MALGOR', text: 'Let me ride, my king. I\'ll bring you their heads.' },
      { who: 'VAURATH', text: 'No. Varek was careless. I am not.' },
      { act: 'ember' }, // his power, shown: ember-fire gathered in one hand, then a wave of ash that puts out every torch
      { who: 'VAURATH', text: 'An oath is only words, Marshal. Words burn like everything else.' },
      { who: 'VAURATH', text: 'Close the wood road. Hang whoever they try to free, and make them watch.' },
    ],
  },
  convoy: {
    chapter: 1, numeral: 'II', title: 'THE CAGES ARE EMPTY',
    beats: [
      { act: 'enter', run: true },
      { who: 'MESSENGER', text: 'My king... the Houndmaster is dead. His hounds with him. The cages are empty.' },
      { who: 'MESSENGER', text: 'They came out of the rain, and the wood went quiet. Every prisoner walked free.' },
      { who: 'VAURATH', text: 'Empty.' },
      { act: 'strike' }, // irritation: his fist on the arm of the throne; the stone cracks (and stays cracked)
      { who: 'MALGOR', text: 'Give me the mountain road. They won\'t pass me.' },
      { who: 'VAURATH', text: 'Patience, Marshal. The pass is buried. Let them crawl into the mine after their people.' },
      { who: 'VAURATH', text: 'Work the captives harder. If the Oath Keepers want them, let them dig.' },
    ],
  },
  collapse: {
    chapter: 2, numeral: 'III', title: 'THE MOUNTAIN COULD NOT HOLD THEM',
    beats: [
      { act: 'enter' },
      { who: 'MESSENGER', text: 'We brought the mountain down on them, my king. They walked out the far side. With the miners.' },
      { who: 'VAURATH', text: 'With the miners.' },
      { who: 'MALGOR', text: 'The Crusher is scrap. The Chain Warden is in the river.' },
      { who: 'MALGOR', text: 'And my men have started saying their names.' },
      { act: 'hurl' }, // frustration: the war map and its markers flung off the table across the hall (and left there)
      { who: 'VAURATH', text: 'Every road I close, they open. Every wall I build, they climb.' },
      { who: 'VAURATH', text: 'Send for Orsk. Burn the ascent. Leave them nothing to stand on.' },
    ],
  },
  retreat: {
    chapter: 3, numeral: 'IV', title: 'THE ARMY RUNS',
    beats: [
      { act: 'horns' }, // the retreat sounding across the Keep: long, low horns; the torches shiver
      { act: 'enter', run: true },
      { who: 'CAPTAIN', text: 'My king... Orsk is dead. The ascent is lost. The men are running for the gates.' },
      { who: 'VAURATH', text: 'Running.' },
      { who: 'MALGOR', text: 'Give me the Iron Gates, my king. Nothing passes me.' },
      { who: 'VAURATH', text: 'Take them. Every man behind the iron. Let the Oath Keepers break themselves on it.' },
      { who: 'CAPTAIN', text: 'My king, the men are afraid. They say the Oath Keepers cannot be killed...' },
      { act: 'kill' }, // unease, turned on his own: an ember bolt from his hand; the captain burns to ash where he stands
      { who: 'VAURATH', text: 'Now they have something else to be afraid of.' },
    ],
  },
  fear: {
    chapter: 4, numeral: 'V', title: 'THE GATES HAVE FALLEN',
    noMalgor: true, // (he died at the gates)
    beats: [
      { act: 'enter', run: true },
      { who: 'MESSENGER', text: 'My king... the gates are open. The Marshal...' },
      { act: 'helm' }, // the Iron Marshal's helm, dented and split, rolled across the floor to the foot of the dais
      { who: 'VAURATH', text: 'Three times he asked me. Three times I told him no.' },
      { act: 'gutter' }, // fear: the ember-fire gathers in his hand, shakes, and gutters out
      { who: 'MESSENGER', text: 'The town is burning, my king. The people are going over to them.' },
      { who: 'VAURATH', text: 'Then burn the prison wing. Every cell. Every soul.' },
      { who: 'MESSENGER', text: 'My king... those are the prisoners they came for...' },
      { who: 'VAURATH', text: 'Yes. Let them climb my walls for ashes.' },
      { act: 'doors' }, // the Keep's doors boom; the messenger runs; the fire comes back into his hand
      { who: 'VAURATH', text: 'Let them come.' },
    ],
  },
};

// The Oath Keepers' oath, one line more at the end of each scene (Rurik's words)
export const OATH = [
  'By my father\'s blood, I swear it.',
  'Every soul he chains, we set free.',
  'Every wall he raises, we break.',
  'Every man he sends, we bury.',
  'And the king on his black throne answers for all of it.',
];

// The war map: the road from the village to the Keep. The Oath Keepers' token stands on the
// place they have just won (the scene's chapter); what's left is counted down.
const ROUTE = [
  { name: 'THE VILLAGE', glyph: 'house', x: 175, y: 352 },
  { name: 'GALLOWS WOOD', glyph: 'trees', x: 292, y: 238 },
  { name: 'HOLLOW MOUNTAIN', glyph: 'mountain', x: 420, y: 330 },
  { name: 'THE ASCENT', glyph: 'cliff', x: 540, y: 200 },
  { name: 'THE IRON GATES', glyph: 'gate', x: 660, y: 300 },
  { name: 'THE BLACK KEEP', glyph: 'keep', x: 790, y: 178 },
];
// where the places are on the painted map (assets/cinematics/keep-war-map.jpg, ChatGPT 23 Nov:
// 1536x1024 shown 960 wide, 50 px cropped off the top): measured off the painting
const PAINTED_AT = [{ x: 133, y: 371 }, { x: 275, y: 250 }, { x: 433, y: 358 }, { x: 566, y: 184 }, { x: 684, y: 275 }, { x: 804, y: 91 }];
// the roads between the places on the painted map, along its own dotted roads (one per
// level: from place i to place i+1); the first is how they came into the village
const PAINTED_ROADS = [
  [[133, 371], [176, 377], [205, 362], [218, 338], [234, 312], [252, 302], [266, 284], [275, 250]],
  [[275, 250], [262, 282], [262, 300], [288, 304], [312, 318], [332, 336], [348, 346], [380, 362], [410, 364], [433, 358]],
  [[433, 358], [462, 340], [484, 318], [488, 292], [496, 268], [518, 252], [538, 228], [552, 204], [566, 184]],
  [[566, 184], [571, 214], [577, 246], [583, 282], [598, 312], [628, 328], [660, 324], [680, 306], [684, 275]],
  [[684, 275], [712, 262], [744, 252], [760, 240], [758, 212], [772, 192], [806, 178], [836, 160], [826, 138], [812, 114], [804, 91]],
];
const INTO_VILLAGE = [[40, 420], [70, 400], [100, 392], [133, 371]];
// a road as evenly spaced points (every `step` px), each with its heading
const roadPoints = (pts, step = 7) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]; const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay); const ang = Math.atan2(by - ay, bx - ax);
    for (let d = 0; d < len; d += step) out.push({ x: ax + (bx - ax) * d / len, y: ay + (by - ay) * d / len, ang });
  }
  const [lx, ly] = pts[pts.length - 1];
  out.push({ x: lx, y: ly, ang: out.length ? out[out.length - 1].ang : 0 });
  return out;
};
const ROADS = ['FOUR ROADS TO THE BLACK KEEP', 'THREE ROADS TO THE BLACK KEEP', 'TWO ROADS TO THE BLACK KEEP', 'ONE ROAD TO THE BLACK KEEP', 'NO ROADS LEFT'];

// what the tension sets, scene by scene (index: the chapter, 0-4)
const TENSION = {
  guards: [6, 4, 3, 2, 0], // the king's guard along the hall (they desert)
  fires: [0, 3, 6, 9, 14], // fires on the horizon outside
  dark: [0, 0.06, 0.12, 0.18, 0.26], // the hall's light going
  red: [0, 0.015, 0.03, 0.05, 0.08], // and going red
  embers: [0, 0, 0.25, 0.45, 0.7], // how much of what drifts in the air is burning
};

// the king's art (assets/enemies/king_vaurath_stand.png, cut at 419x830 from the concept
// sheet): his height on screen, and his eye and the hands on his sword's pommel, where the
// ember-fire gathers, in source pixels before the flip
const KING_ART = { srcW: 419, srcH: 830, height: 250, eye: [283, 100], hand: [350, 330] };
// his acts (ChatGPT, 23 Nov: assets/enemies/king_vaurath_<pose>.png, already facing left):
// body = crown to feet in px, feetX = where his feet are, pt = the hand that does the act
const KING_POSES = {
  rage: { body: 519, feetX: 203, pt: [75, 177] }, // the fist brought down on the throne
  hurl: { body: 520, feetX: 175, pt: [364, 71] }, // the backhand that throws the map
  cast: { body: 540, feetX: 227, pt: [35, 92] }, // the open palm that burns the captain
  defy: { body: 535, feetX: 171, pt: [245, 261] }, // the sword raised: "Let them come."
};

// where everyone stands in the hall (960 x 540)
const SPOT = {
  king: [793.8, 364], // his feet, before the throne
  malgor: [598, 388],
  kneel: [330, 430], // the bearer of the news
  table: [672, 396], // the war table at the foot of the dais (scenes 1-3)
  ash: [300, 436], // where the captain burned (scene 4, and still there in 5)
};
// where the camera looks for each shot: [x, y, zoom]
const SHOTS = {
  wide: [480, 270, 1],
  king: [778, 222, 1.62],
  kneel: [390, 360, 1.42],
  malgor: [600, 300, 1.42],
  two: [560, 300, 1.16],
  hall: [240, 330, 1.3],
};
// the king's guard along the back of the hall, in desertion order (the first ones stay
// longest): which painted sheet, which pose, where, how big, which way he faces, how lit
const GUARD_POSTS = [ // (Nick: lined up facing the player, by rank: the lowest at the hall's
  // far end, the highest nearest the throne; the lowest desert first, so this list is highest first)
  { id: 'gladiator', strip: 'walkD', frame: 0, x: 452, y: 368, scale: 0.84, flip: false, tint: 0x9088a8 },
  { id: 'butcher', strip: 'walkD', frame: 0, x: 382, y: 368, scale: 0.82, flip: false, tint: 0x9088a8 },
  { id: 'berserker', strip: 'walkD', frame: 0, x: 312, y: 368, scale: 0.8, flip: false, tint: 0x9088a8 },
  { id: 'stalker', strip: 'walkD', frame: 0, x: 244, y: 368, scale: 0.76, flip: false, tint: 0x9088a8 },
  { id: 'penitent', strip: 'walkD', frame: 0, x: 174, y: 368, scale: 0.76, flip: false, tint: 0x9088a8 },
  { id: 'grunt', strip: 'walkD', frame: 0, x: 104, y: 368, scale: 0.74, flip: false, tint: 0x9088a8 },
];
const SHOT_OF = { VAURATH: 'king', MESSENGER: 'kneel', CAPTAIN: 'kneel', MALGOR: 'malgor', VOICE: 'wide' };

export class CutawayScene extends Phaser.Scene {
  constructor() { super('Cutaway'); }

  init(data) {
    this.def = CUTAWAYS[data.kind] ?? CUTAWAYS.learns;
    this.t = Phaser.Math.Clamp(this.def.chapter ?? 0, 0, 4);
    this.onDone = data.onDone;
    this.step = -1;
    this.finished = false;
    this.busy = false;
    this.endWait = false;
    this.mapWait = false;
    this.crackDone = false;
  }

  create() {
    const W = SETTINGS.width;
    const H = SETTINGS.height;
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1);
    this.makeTextures();
    // the hall (it moves: the camera), the war map insert, and the frame over both
    this.root = this.add.container(0, 0).setAlpha(0);
    this.drawRoom(W, H);
    this.grade = this.add.container(0, 0);
    this.grade.add(this.add.rectangle(0, 0, W, H, 0x000000, TENSION.dark[this.t]).setOrigin(0));
    this.redWash = this.add.rectangle(0, 0, W, H, 0xff2010, TENSION.red[this.t]).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    this.grade.add([this.redWash, this.add.image(W / 2, H / 2, 'cut-vignette').setDisplaySize(W, H).setAlpha(0.7 + this.t * 0.05)]);
    this.grade.setAlpha(0);
    this.insert = this.add.container(0, 0);
    this.ui = this.add.container(0, 0);
    // letterbox, caption, the line
    this.ui.add(this.add.rectangle(0, 0, W, 54, 0x000000).setOrigin(0));
    this.ui.add(this.add.rectangle(0, H, W, 54, 0x000000).setOrigin(0, 1));
    const cap = this.add.text(W / 2, 27, 'THE BLACK KEEP', { fontFamily: FONT.display, fontSize: '22px' }).setOrigin(0.5).setStroke('#000000', 5);
    cap.setLetterSpacing?.(6);
    epicFill(cap, ['#e8e0ff', '#a890e0', '#40306a']);
    this.ui.add(cap);
    // the line: the story's framed box, with the speaker's portrait (view/DialogueBox.js)
    this.box = new DialogueBox(this);
    this.ui.add(this.box.root);
    this.oathLayer = this.add.container(0, 0); // (the oath, over everything)
    this.mapLayer = this.add.container(0, 0); // (and the war map after it)

    const k = this.input.keyboard;
    k?.on('keydown', (e) => {
      if (['Escape', 'Backspace'].includes(e.key)) this.finish();
      else if ([' ', 'Enter', 'j', 'J'].includes(e.key)) this.next();
    });
    this.input.gamepad?.on('down', (pad, button) => {
      if (button.index === 0) this.next();
      else if ([1, 8, 9].includes(button.index)) this.finish();
    });
    this.input.on('pointerdown', () => this.next());

    // the king's theme (the Keep's and his own: core/Music.js 'showdown') under all five
    playMusic(this, 'showdown', { fadeIn: 2200 });
    this.events.once('shutdown', () => { this.heart?.remove(); });
    this.exterior(() => {
      this.tweens.add({ targets: [this.root, this.grade], alpha: 1, duration: 900 });
      this.frame('hall', 0);
      this.frame('wide', 2600);
      if (this.t >= 3) this.heartbeat();
      this.time.delayedCall(700, () => this.next());
    });
  }

  // the little textures this scene draws with, made once
  makeTextures() {
    const tex = (key, w, h, draw) => {
      if (this.textures.exists(key)) return;
      const c = this.textures.createCanvas(key, w, h);
      draw(c.getContext(), w, h);
      c.refresh();
    };
    tex('glow', 64, 64, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    tex('cut-vignette', 480, 270, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    tex('cut-mote', 8, 8, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
  }

  // ------------------------------------------------------------ 1. the Keep, from outside

  exterior(done) {
    const W = SETTINGS.width; const H = SETTINGS.height;
    const out = this.add.container(W / 2, H / 2).setDepth(-1);
    const T = this.textures;
    const sky = ['lvl-keep-sky', 'lvlsrc-keep-sky'].find((k) => T.exists(k));
    const far = ['lvl-keep-far', 'lvlsrc-keep-far-cut'].find((k) => T.exists(k));
    out.add(this.add.rectangle(0, 0, W, H, 0x0a0812));
    if (sky) {
      const s = this.add.image(0, 0, sky);
      s.setScale(Math.max(W / s.width, H / s.height) * 1.05);
      out.add(s);
      this.tweens.add({ targets: s, x: -30, duration: 5000 });
    }
    if (far) {
      // (the painting repeats sideways: a strip of it as wide as the screen, the Keep in the middle)
      // (side by side copies, not a TileSprite: that crashed the browser's renderer)
      const src = this.textures.get(far).getSourceImage();
      const s = 0.6;
      for (const dx of [-1, 0, 1]) out.add(this.add.image(dx * (src.width * s - 1), H / 2 + 90, far).setOrigin(0.5, 1).setScale(s));
    }
    // fires along the horizon: more of them, and nearer, every scene
    const fires = TENSION.fires[this.t];
    for (let i = 0; i < fires; i++) {
      const fx = -W / 2 + 30 + (i * 67) % (W * 0.55) + Math.random() * 20;
      const fy = H / 2 - 120 + Math.random() * 30 + (i % 3) * 14;
      const f = this.add.image(fx, fy, 'glow').setScale(0.6 + Math.random() * 0.8, 0.4 + Math.random() * 0.4).setTint(0xff6a20).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
      this.tweens.add({ targets: f, alpha: 0.35, duration: 200 + Math.random() * 300, yoyo: true, repeat: -1 });
      out.add(f);
    }
    if (this.t >= 4) { // the town under the Keep burning: a red glow along the whole foot of the picture
      const band = this.add.image(0, H / 2 - 20, 'glow').setScale(18, 2.4).setTint(0xff3010).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55);
      this.tweens.add({ targets: band, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
      out.add(band);
    }
    // the storm: a flash, then thunder
    const flash = this.add.rectangle(0, 0, W, H, 0xe0d8ff, 0);
    out.add(flash);
    this.time.delayedCall(900, () => {
      flash.setAlpha(0.55);
      this.tweens.add({ targets: flash, alpha: 0, duration: 500, ease: 'Quad.easeOut' });
      playSfx(this, 'lightningStrike', { volume: 0.35, pitch: -700, minGapMs: 0 });
    });
    if (this.t <= 1) playSfx(this, 'woodCrows', { volume: 0.3, pitch: -200, minGapMs: 0 });
    else playSfx(this, 'fireWhoosh', { volume: 0.2 + this.t * 0.08, pitch: -1400, minGapMs: 0 });
    // the chapter
    const num = this.add.text(0, 108, this.def.numeral ?? '', { fontFamily: FONT.display, fontSize: '58px' }).setOrigin(0.5).setStroke('#000000', 6).setAlpha(0);
    epicFill(num, ['#ffd2a0', '#d0602a', '#4a0a04']);
    const name = this.add.text(0, 158, this.def.title ?? '', { fontFamily: FONT.display, fontSize: '22px' }).setOrigin(0.5).setStroke('#000000', 5).setAlpha(0);
    name.setLetterSpacing?.(5);
    epicFill(name, ['#f0e6ff', '#b8a0e8', '#40306a']);
    out.add([num, name]);
    this.tweens.add({ targets: [num, name], alpha: 1, duration: 800, delay: 1200 });
    this.tweens.add({ targets: out, scale: 1.07, duration: 4600, ease: 'Sine.easeInOut' });
    // the bars and the caption are already up
    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: out, alpha: 0, duration: 800, onComplete: () => out.destroy() });
      done();
    });
  }

  // ------------------------------------------------------------ 2. the throne room

  // a dark hall of black stone in violet torchlight (the painting, assets/env/keep_hall.png);
  // the throne on its dais; the king before it; Malgor; the guard; the war table
  drawRoom(W, H) {
    const t = this.t;
    const g = this.add.graphics();
    const painted = this.textures.exists('keep-hall');
    if (painted) { this.root.add(this.add.image(0, 0, 'keep-hall').setOrigin(0).setDisplaySize(W, H)); g.setVisible(false); }
    // (the painting failed to load: the hall in code)
    g.fillGradientStyle(0x0a0812, 0x0a0812, 0x1a1428, 0x1a1428, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 180; const w = 46;
      g.fillStyle(0x0e0c16, 1).fillRect(x, 40, w, H - 150);
      g.fillStyle(0x221c34, 1).fillRect(x + w - 6, 40, 6, H - 150);
    }
    g.fillStyle(0x100e18, 1).fillRect(0, H - 150, W, 150);
    g.lineStyle(1, 0x1e1a2a, 1);
    for (let y = H - 150; y < H; y += 20) g.lineBetween(0, y, W, y);
    const tx = W * 0.78 + 65;
    g.fillStyle(0x18142a, 1).fillRect(W * 0.58, H - 176, W * 0.42, 30);
    g.fillStyle(0x241c38, 1).fillRect(tx - 100, H - 400, 200, 230);
    g.fillTriangle(tx - 100, H - 400, tx + 100, H - 400, tx, H - 470);
    g.fillStyle(0x1a1430, 1).fillRect(tx - 100, H - 250, 26, 80).fillRect(tx + 74, H - 250, 26, 80);
    g.fillStyle(0x6a50b0, 1).fillRect(tx - 5, H - 440, 10, 10);
    this.root.add(g);
    // violet torches (over the painting: on its own flames, the chandelier, a sconce and the
    // dais brazier); dimmer every scene
    this.torches = [];
    this.torchLevel = 0.5 - t * 0.06;
    const lights = painted ? [[442, 70], [29, 119], [720, 254], [178, 280], [331, 270]] : [[130, 120], [490, 120], [850, 120]];
    for (const [x, y] of lights) {
      const glow = this.add.image(x, y, 'glow').setScale(3).setTint(t >= 4 ? 0xc070ff : 0x9070ff).setAlpha(this.torchLevel).setBlendMode(Phaser.BlendModes.ADD);
      const fl = torchFlame(this, x, y + 8, { height: 44, tint: 0xb090ff }).setVisible(!painted);
      this.tweens.add({ targets: glow, alpha: { from: this.torchLevel * 0.7, to: this.torchLevel * 1.3 }, duration: 300 + x % 200, yoyo: true, repeat: -1 });
      this.root.add([glow, fl]);
      this.torches.push(glow, fl);
    }
    // the floor remembers: the scattered war map and markers (from the third scene on: he
    // threw it), the captain's ash (the fourth scene on)
    if (t >= 3) this.leftovers(W, H);
    // the king's guard, along the back of the hall, facing the throne; fewer every scene
    this.guards = [];
    // (a mixed guard in a line, facing out of the hall, ranked: GUARD_POSTS)
    for (let i = 0; i < TENSION.guards[t]; i++) {
      const g = GUARD_POSTS[i];
      const gd = this.figure(g.id, g.strip, g.frame, g.x, g.y, g.scale, g.flip)
        || this.figure(g.id, 'walk', 0, g.x, g.y, g.scale, g.flip) // (no front view loaded: side on)
        || this.figure('grunt', 'walk', 0, g.x, g.y, 0.78, g.flip);
      if (!gd) break;
      gd.setTint(g.tint);
      this.guards.push(gd);
      this.root.add(gd);
      // they shift on their feet, each in his own time
      this.tweens.add({ targets: gd, y: gd.y - 1.5, duration: 1400 + i * 230, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 170 });
    }
    // the war table at the foot of the dais, the map on it (until he throws it)
    if (t <= 2) this.drawTable();
    // Warlord Malgor, his champion, at the foot of the dais: his own painted strips
    const sheet = this.registry.get('enemySprites')?.warlord;
    if (!this.def.noMalgor && sheet && this.textures.exists(`${sheet.key}-react`)) {
      this.malgor = this.add.image(SPOT.malgor[0], SPOT.malgor[1], `${sheet.key}-react`, 'f0').setOrigin(sheet.ax / sheet.fw, sheet.ay / sheet.fh)
        .setScale(-0.8 / sheet.res, 0.8 / sheet.res);
      this.root.add(this.malgor);
      this.tweens.add({ targets: this.malgor, scaleY: this.malgor.scaleY * 1.008, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // the bearer of the news: off stage until he comes in ('enter')
    this.messenger = this.figure('grunt', 'walk', 0, -80, SPOT.kneel[1], 1.1);
    if (!this.messenger) {
      const m = this.add.graphics(); // (no painted soldier: a stand-in figure, on his knees)
      m.fillStyle(0x3a3434, 1).fillRect(-14, -36, 28, 26).fillRect(-18, -12, 40, 12);
      m.fillStyle(0x5a5050, 1).fillCircle(12, -40, 8);
      m.setPosition(-80, SPOT.kneel[1]);
      this.messenger = m;
    }
    this.root.add(this.messenger);
    // KING VAURATH before his throne, facing the hall
    this.drawKing(W, H);
    // the throne arm he cracked in the second scene stays cracked
    if (t >= 2) this.crack(false);
    // ash and embers in the air: the more there is burning, the more of it glows
    this.motes(W, H);
  }

  // a painted enemy's frame as a figure in the hall (null: his strips aren't in)
  figure(id, strip, frame, x, y, scale = 1, flip = false) {
    const sheet = this.registry.get('enemySprites')?.[id];
    const key = sheet && `${sheet.key}-${strip}`;
    if (!key || !this.textures.exists(key)) return null;
    const f = this.add.image(x, y, key, `f${frame}`).setOrigin(sheet.ax / sheet.fw, sheet.ay / sheet.fh);
    f.setScale((flip ? -scale : scale) / sheet.res, scale / sheet.res);
    f.sheet = sheet;
    return f;
  }

  // a figure's pose: a frame of one of its strips (a stand-in figure has none)
  pose(f, strip, frame) {
    if (!f?.sheet) return;
    const key = `${f.sheet.key}-${strip}`;
    if (this.textures.exists(key)) f.setTexture(key, `f${frame}`);
  }

  // he moves: the standing king is swapped for one of his painted acts (and back with
  // pose null); his eyes hide while he's in one, the ember-light follows his hand
  kingPose(name) {
    const king = this.king; if (!king) return null;
    const [kx, ky] = SPOT.king;
    const P = KING_POSES[name];
    if (!P || !this.textures.exists(`king-${name}`)) {
      king.setTexture('king-vaurath').setFlipX(true).setOrigin(0.5, 1).setScale(KING_ART.height / king.height);
      this.eyes?.setVisible(true);
      this.breath?.resume();
      return null;
    }
    this.breath?.pause();
    king.setTexture(`king-${name}`).setFlipX(false);
    const sc = KING_ART.height / P.body;
    king.setScale(sc).setOrigin(P.feetX / king.width, 1).setPosition(kx, ky);
    this.eyes?.setVisible(false);
    return [kx + (P.pt[0] - P.feetX) * sc, ky - (king.height - P.pt[1]) * sc];
  }

  drawKing(W, H) {
    const [kx, ky] = SPOT.king;
    if (this.textures.exists('king-vaurath')) {
      const K = KING_ART; const s = K.height / K.srcH;
      const at = ([x, y]) => [kx + ((K.srcW - x) - K.srcW / 2) * s, ky - (K.srcH - y) * s];
      const king = this.add.image(kx, ky, 'king-vaurath').setOrigin(0.5, 1).setFlipX(true);
      king.setScale(K.height / king.height);
      this.king = king;
      const [ex, ey] = at(K.eye); const [hx, hy] = at(K.hand);
      // a cold rim of light behind him, and the ember-light under him that grows with his anger
      const back = this.add.image(kx, ky - 120, 'glow').setScale(4, 7).setTint(0x7050ff).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);
      this.kingLight = this.add.image(kx - 10, ky - 40, 'glow').setScale(3, 2).setTint(0xff6a20).setAlpha(0.06 + this.t * 0.04).setBlendMode(Phaser.BlendModes.ADD);
      this.eyes = this.add.rectangle(ex, ey, 6, 2, 0xffa040).setBlendMode(Phaser.BlendModes.ADD);
      this.hand = this.add.image(hx, hy, 'glow').setScale(0).setTint(0xff8a30).setBlendMode(Phaser.BlendModes.ADD);
      this.root.add([back, king, this.kingLight, this.eyes, this.hand]);
      // he breathes, slowly (paused while he's in one of his acts: kingPose)
      this.breath = this.tweens.add({ targets: king, scaleY: king.scaleY * 1.006, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      // (the art failed to load: a code-drawn stand-in, tall, crowned, a long cape, ember eyes)
      const k = this.add.graphics();
      k.fillStyle(0x4a0e14, 1).fillTriangle(kx - 40, ky, kx + 40, ky, kx, ky - 150);
      k.fillStyle(0x0c0a0e, 1).fillRect(kx - 22, ky - 120, 44, 92).fillRect(kx - 26, ky - 34, 20, 34).fillRect(kx + 6, ky - 34, 20, 34);
      k.fillStyle(0x0c0a0e, 1).fillRect(kx - 13, ky - 146, 26, 28);
      k.fillStyle(0x2a2210, 1);
      for (let i = -3; i <= 3; i++) k.fillTriangle(kx + i * 4 - 3, ky - 146, kx + i * 4 + 3, ky - 146, kx + i * 4, ky - 160 - (i % 2 ? 0 : 6));
      k.fillStyle(0xa08040, 1).fillRect(kx - 14, ky - 148, 28, 3);
      k.fillStyle(0x806030, 1).fillRect(kx - 34, ky - 70, 8, 70);
      this.eyes = this.add.rectangle(kx, ky - 134, 16, 3, 0xffa040);
      this.hand = this.add.image(kx - 30, ky - 84, 'glow').setScale(0).setTint(0xff8a30).setBlendMode(Phaser.BlendModes.ADD);
      this.root.add([k, this.eyes, this.hand]);
    }
    this.tweens.add({ targets: this.eyes, alpha: { from: 0.6, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
  }

  // the war table, the map spread on it and the little markers standing on the map
  drawTable() {
    const [x, y] = SPOT.table;
    const c = this.add.container(x, y).setScale(1.35);
    const g = this.add.graphics();
    g.fillStyle(0x140c08, 1).fillRect(-52, -40, 7, 40).fillRect(45, -40, 7, 40).fillRect(-40, -40, 5, 34);
    g.fillStyle(0x2a1a10, 1).fillRect(-60, -46, 120, 8);
    g.fillStyle(0x3a2416, 1).fillRect(-60, -46, 120, 2);
    c.add(g);
    const map = this.add.container(0, -48);
    const m = this.add.graphics();
    m.fillStyle(0xa48a5c, 1).fillRect(-52, -4, 104, 5);
    m.fillStyle(0x6a1010, 1).fillRect(-34, -9, 3, 6);
    for (let i = 0; i < 5; i++) m.fillStyle(0x101014, 1).fillRect(-18 + i * 13, -11, 2, 8).fillTriangle(-16 + i * 13, -11, -16 + i * 13, -7, -11 + i * 13, -9);
    map.add(m);
    c.add(map);
    this.table = c; this.tableMap = map;
    this.root.add(c);
  }

  // what's been left on the floor since the third scene: the thrown map, its markers, and
  // (from the fourth) the captain's ash
  leftovers(W, H) {
    const g = this.add.graphics();
    g.fillStyle(0x7a6440, 0.9).fillTriangle(380, 470, 458, 462, 446, 486).fillTriangle(380, 470, 446, 486, 372, 488);
    g.fillStyle(0x2a1a0c, 0.6).fillCircle(430, 476, 5);
    const rnd = new Phaser.Math.RandomDataGenerator(['keep-floor']);
    for (let i = 0; i < 9; i++) g.fillStyle(i % 3 ? 0x101014 : 0x6a1010, 1).fillRect(rnd.between(300, 640), rnd.between(440, 496), 5, 3);
    this.root.add(g);
    if (this.t >= 4) {
      const [ax, ay] = SPOT.ash;
      const ash = this.add.graphics();
      ash.fillStyle(0x24201c, 1).fillEllipse(ax, ay, 52, 9);
      ash.fillStyle(0x3a342e, 1).fillEllipse(ax - 6, ay - 2, 30, 5);
      ash.fillStyle(0x5a2a10, 1).fillRect(ax + 10, ay - 2, 3, 2);
      this.root.add(ash);
    }
  }

  // ash drifting down through the hall; from the third scene embers too
  motes(W, H) {
    if (!this.add.particles) return;
    const hot = TENSION.embers[this.t];
    const ash = this.add.particles(0, 0, 'cut-mote', {
      x: { min: 0, max: W }, y: { min: -20, max: H * 0.6 }, lifespan: 7000,
      speedY: { min: 6, max: 18 }, speedX: { min: -8, max: 8 }, scale: { min: 0.25, max: 0.6 },
      alpha: { start: 0.5, end: 0 }, tint: 0x8a8090, frequency: 260, quantity: 1,
    });
    this.root.add(ash);
    if (hot > 0) {
      const em = this.add.particles(0, 0, 'cut-mote', {
        x: { min: 0, max: W }, y: H - 60, lifespan: 5000,
        speedY: { min: -40, max: -14 }, speedX: { min: -12, max: 12 }, scale: { min: 0.2, max: 0.55 },
        alpha: { start: 0.9, end: 0 }, tint: [0xff8a30, 0xffb060, 0xff5a20], blendMode: 'ADD',
        frequency: Math.round(400 - hot * 330), quantity: 1,
      });
      this.root.add(em);
    }
  }

  // From the fourth scene: a heartbeat under everything, and the red in the hall pulsing with it
  heartbeat() {
    const every = this.t >= 4 ? 1150 : 1500;
    const beat = () => {
      if (this.finished) return;
      playSfx(this, 'kick', { volume: 0.16, pitch: -2700, spread: 0, minGapMs: 0 });
      this.time.delayedCall(180, () => !this.finished && playSfx(this, 'kick', { volume: 0.1, pitch: -2900, spread: 0, minGapMs: 0 }));
      this.tweens.add({ targets: this.redWash, alpha: TENSION.red[this.t] * 2.2, duration: 120, yoyo: true });
    };
    this.heart = this.time.addEvent({ delay: every, loop: true, callback: beat });
  }

  // the camera: a shot (SHOTS) eased into over ms, then a slow push in while it holds
  frame(shot, ms = 900) {
    const W = SETTINGS.width; const H = SETTINGS.height;
    const [fx, fy, s] = SHOTS[shot] ?? SHOTS.wide;
    const place = (z) => ({
      x: Phaser.Math.Clamp(W / 2 - fx * z, W - W * z, 0),
      y: Phaser.Math.Clamp(H / 2 - fy * z, H - H * z, 0),
      scale: z,
    });
    // (only the camera's own tweens are stopped: the hall's fade in and out stay)
    for (const tw of this.camTweens ?? []) tw.remove();
    const a = place(s);
    const b = place(s * 1.035);
    if (ms <= 0) this.root.setPosition(a.x, a.y).setScale(a.scale);
    this.camTweens = [this.tweens.add({
      targets: this.root, ...a, duration: Math.max(1, ms), ease: 'Sine.easeInOut',
      onComplete: () => { this.camTweens.push(this.tweens.add({ targets: this.root, ...b, duration: 7000, ease: 'Sine.easeOut' })); },
    })];
    this.shot = shot;
  }

  update(time) {
    this.box?.update(time);
    if (this.mapBeats && !this.finished) this.mapClock();
  }

  // a line in the box (who null: the box goes)
  say(who, text = '', hint = 'CLICK / SPACE  next      ESC  skip') {
    this.tweens.killTweensOf(this.box.root);
    if (!who) { this.box.setAlpha(0); return; }
    // the kneeling messenger looks up, afraid, to speak, and bows his head again to listen
    const m = this.messenger;
    if (m?.sheet && m.alpha > 0 && m.frame?.texture?.key === `${m.sheet.key}-kneel` && (who === 'MESSENGER' || who === 'VAURATH')) this.pose(m, 'kneel', who === 'MESSENGER' ? 2 : 1);
    this.box.show(who, text, 'full', hint).setAlpha(0);
    this.tweens.add({ targets: this.box.root, alpha: 1, duration: 250 });
  }

  next() {
    if (this.finished || this.busy || this.root.alpha < 0.5) return;
    if (this.mapWait) { this.finish(); return; }
    if (this.endWait) { this.endWait = false; this.map(); return; }
    this.step++;
    const b = this.def.beats[this.step];
    if (!b) { this.oath(); return; }
    const acts = {
      enter: () => this.enter(b), ember: () => this.ember(), strike: () => this.strike(), hurl: () => this.hurl(),
      horns: () => this.horns(), kill: () => this.kill(), helm: () => this.helm(), gutter: () => this.gutter(),
      doors: () => this.doors(),
    };
    if (b.act) { acts[b.act]?.(); if (!acts[b.act]) this.next(); return; }
    // (a line waits for a press: it never moves on by itself)
    const shot = b.shot ?? SHOT_OF[b.who] ?? 'wide';
    if (shot !== this.shot) this.frame(shot, 700);
    this.say(b.who, b.text);
  }

  // an act plays out by itself, then the scene moves on
  act(ms, fn) {
    this.busy = true;
    this.say(null);
    fn?.();
    this.time.delayedCall(ms, () => { this.busy = false; this.next(); });
  }

  // ------------------------------------------------------------ the king's acts

  // the bearer of the news comes in down the hall (running, when the news is bad) and stops
  // before the dais; until a painted kneel is in (enemy-grunt-kneel), he stands
  enter(b) {
    const m = this.messenger;
    const [x] = SPOT.kneel;
    const ms = b.run ? 1300 : 2100;
    this.frame('two', 1200);
    this.act(ms + 500, () => {
      if (m.sheet) {
        let i = 0;
        const walk = this.time.addEvent({ delay: b.run ? 60 : 95, loop: true, callback: () => this.pose(m, 'walk', (i = (i + 1) % 8)) });
        this.time.delayedCall(ms, () => {
          walk.remove();
          if (this.textures.exists(`${m.sheet.key}-kneel`)) {
            this.pose(m, 'kneel', 0);
            this.time.delayedCall(160, () => this.pose(m, 'kneel', 1));
          } else this.pose(m, 'walk', 0);
        });
      }
      for (let s = 0; s < (b.run ? 9 : 6); s++) this.time.delayedCall(s * (ms / (b.run ? 9 : 6)), () => playSfx(this, 'stoneStep', { volume: 0.35, minGapMs: 0 }));
      this.tweens.add({ targets: m, x, duration: ms, ease: 'Sine.easeOut' });
    });
  }

  // his power, shown: ember-fire gathers in his open hand; he closes it, and a wave of ash
  // and embers rolls down the hall, puts out every torch and throws the messenger back
  ember() {
    const W = SETTINGS.width; const H = SETTINGS.height;
    this.frame('king', 600);
    this.act(3400, () => {
      this.tweens.add({ targets: this.hand, scale: 2.6, alpha: 1, duration: 1200, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this.kingLight, alpha: 0.45, duration: 1200 });
      playSfx(this, 'fireWhoosh', { volume: 0.5, pitch: -600, minGapMs: 0 });
      this.time.delayedCall(1400, () => {
        this.frame('wide', 250);
        this.hand.setScale(0);
        this.tweens.add({ targets: this.kingLight, alpha: 0.06, duration: 900 });
        this.cameras.main.shake(450, 0.012);
        playSfx(this, 'kick', { volume: 1, pitch: -1800, minGapMs: 0 });
        playSfx(this, 'fireWhoosh', { volume: 0.9, pitch: -300, minGapMs: 0 });
        // the wave of ash
        const wave = this.add.image(W * 0.8, H - 200, 'glow').setScale(2, 6).setTint(0xff7a2a).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
        const ash = this.add.rectangle(W * 0.8, H / 2, 40, H, 0x2a2420, 0.7);
        this.root.add([ash, wave]);
        this.tweens.add({ targets: [wave, ash], x: -100, duration: 700, ease: 'Quad.easeIn', onComplete: () => { wave.destroy(); ash.destroy(); } });
        // the torches go out; the messenger is thrown back; the guards flinch
        this.time.delayedCall(350, () => {
          for (const t of this.torches) { this.tweens.killTweensOf(t); t.setAlpha(0.05); }
          this.stagger(this.messenger, 30);
          for (const gd of this.guards) this.tweens.add({ targets: gd, x: gd.x - 6, duration: 120, yoyo: true });
        });
      });
      this.time.delayedCall(3000, () => this.relight());
    });
  }

  // the torches come back up
  relight() {
    for (const t of this.torches) {
      this.tweens.killTweensOf(t);
      this.tweens.add({ targets: t, alpha: this.torchLevel, duration: 900 });
    }
  }

  // the bearer of the news flinches back from the king (his hit pose, a moment)
  stagger(m, by) {
    this.pose(m, 'react', 3);
    this.tweens.add({ targets: m, x: m.x - by, duration: 200, ease: 'Quad.easeOut' });
    this.time.delayedCall(420, () => this.pose(m, m.sheet && this.textures.exists(`${m.sheet.key}-kneel`) ? 'kneel' : 'walk', m.sheet && this.textures.exists(`${m.sheet.key}-kneel`) ? 1 : 0));
  }

  // a crack down the throne's arm (shown: dust; or already there, from an earlier scene)
  crack(fresh = true) {
    const W = SETTINGS.width; const H = SETTINGS.height;
    const ax = W * 0.78 + 65 + 86; const ay = H - 248; // the throne's arm, beside him
    const crack = this.add.graphics().lineStyle(2, 0x0a0810, 1);
    crack.beginPath(); crack.moveTo(ax, ay); crack.lineTo(ax - 8, ay + 18); crack.lineTo(ax - 3, ay + 30); crack.lineTo(ax - 12, ay + 52); crack.strokePath();
    crack.lineStyle(1, 0x0a0810, 1).lineBetween(ax - 8, ay + 18, ax + 4, ay + 26);
    this.root.add(crack);
    if (!fresh) return;
    const dust = this.add.image(ax, ay, 'glow').setScale(1.2).setTint(0x8a7a6a).setAlpha(0.6);
    this.root.add(dust);
    this.tweens.add({ targets: dust, alpha: 0, scale: 2.4, duration: 600 });
    for (let i = 0; i < 6; i++) {
      const c = this.add.rectangle(ax - 4, ay + 10, 3, 3, 0x2a2430);
      this.root.add(c);
      this.tweens.add({ targets: c, x: ax - 20 + Math.random() * 30, y: H - 170 + Math.random() * 10, angle: 360, duration: 500 + Math.random() * 300, ease: 'Quad.easeIn' });
    }
  }

  // his patience, shown: a fist brought down on the arm of the throne; the stone cracks,
  // the hall shakes, the messenger flinches back
  strike() {
    this.frame('king', 500);
    this.act(1900, () => {
      this.time.delayedCall(470, () => this.kingPose('rage'));
      this.time.delayedCall(1750, () => this.kingPose(null));
      this.time.delayedCall(600, () => {
        this.cameras.main.shake(300, 0.012);
        playSfx(this, 'kick', { volume: 1, pitch: -2000, minGapMs: 0 });
        playSfx(this, 'dkSlam', { volume: 0.8, pitch: -900, minGapMs: 0 });
        this.crack(true);
        this.stagger(this.messenger, 14);
        this.eyes.setAlpha(1).setFillStyle(0xffd080);
        this.tweens.add({ targets: this.kingLight, alpha: 0.3, duration: 120, yoyo: true });
      });
    });
  }

  // his frustration, shown: he sweeps the war map off its table, and the map and its
  // markers scatter down the hall past the messenger (they stay there, scenes 4 and 5)
  hurl() {
    const H = SETTINGS.height;
    this.frame('two', 400);
    this.act(2200, () => {
      if (!this.table) return;
      const [tx, ty] = SPOT.table;
      this.time.delayedCall(330, () => this.kingPose('hurl'));
      this.time.delayedCall(2050, () => this.kingPose(null));
      this.time.delayedCall(450, () => {
        this.cameras.main.shake(300, 0.01);
        playSfx(this, 'kick', { volume: 0.9, pitch: -1200, minGapMs: 0 });
        playSfx(this, 'dkWhooshLong1', { volume: 0.7, pitch: -400, minGapMs: 0 });
        this.tweens.add({ targets: this.tableMap, x: -290, y: 74, angle: -170, duration: 650, ease: 'Quad.easeOut' });
        for (let i = 0; i < 9; i++) {
          const m = this.add.rectangle(tx + (i - 4) * 9, ty - 56, 4, 8, i % 3 ? 0x101014 : 0x6a1010);
          this.root.add(m);
          this.tweens.add({ targets: m, x: tx - 120 - Math.random() * 320, y: H - 60 - Math.random() * 46, angle: Math.random() * 720, duration: 500 + Math.random() * 400, ease: 'Quad.easeOut' });
        }
        // the table goes over
        this.tweens.add({ targets: this.table, angle: -78, x: tx - 30, y: ty + 4, duration: 380, ease: 'Quad.easeIn', onComplete: () => { playSfx(this, 'woodFall', { volume: 0.35, pitch: 300, minGapMs: 0 }); this.cameras.main.shake(160, 0.006); } });
        this.stagger(this.messenger, 20);
        this.eyes.setAlpha(1).setFillStyle(0xffd080);
      });
    });
  }

  // the retreat, heard in the hall: long low horns from the walls, three times; the torches
  // shiver with each; the king's eyes narrow
  horns() {
    this.frame('hall', 600);
    this.act(3200, () => {
      this.say('VOICE', '(horns, long and low, from the walls: the retreat)');
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(200 + i * 900, () => {
          playSfx(this, 'woodHorn', { volume: 0.55, pitch: -500 - i * 150, minGapMs: 0 });
          this.cameras.main.shake(500, 0.002);
          for (const t of this.torches) this.tweens.add({ targets: t, alpha: 0.12, duration: 180, yoyo: true });
        });
      }
      this.time.delayedCall(1400, () => { this.frame('king', 900); this.eyes.setFillStyle(0xff7a30); });
    });
  }

  // the captain who brought the news: an ember bolt from the king's hand; he burns where he
  // stands and there is only ash left
  kill() {
    const H = SETTINGS.height;
    const m = this.messenger;
    this.frame('two', 400);
    this.act(3000, () => {
      const mx = m.x; const my = m.y - 60;
      const home = [this.hand.x, this.hand.y];
      const palm = this.kingPose('cast');
      if (palm) this.hand.setPosition(...palm);
      this.time.delayedCall(2700, () => { this.kingPose(null); this.hand.setPosition(...home); });
      this.tweens.add({ targets: this.hand, scale: 1.6, alpha: 1, duration: 500, ease: 'Sine.easeIn' });
      playSfx(this, 'fireWhoosh', { volume: 0.6, pitch: -400, minGapMs: 0 });
      this.time.delayedCall(600, () => {
        this.tweens.killTweensOf(this.hand);
        this.hand.setScale(0);
        const bolt = this.add.image(this.hand.x, this.hand.y, 'glow').setScale(1.4).setTint(0xff8a30).setBlendMode(Phaser.BlendModes.ADD);
        this.root.add(bolt);
        this.tweens.add({
          targets: bolt, x: mx, y: my, duration: 260, ease: 'Quad.easeIn',
          onComplete: () => {
            bolt.destroy();
            this.cameras.main.flash(160, 255, 140, 60);
            this.cameras.main.shake(260, 0.008);
            playSfx(this, 'kick', { volume: 0.9, pitch: -1400, minGapMs: 0 });
            playSfx(this, 'fireImpact', { volume: 1, pitch: -200, minGapMs: 0 });
            playSfx(this, 'fallScream1', { volume: 0.5, pitch: -300, minGapMs: 0 });
            const burn = this.add.image(mx, my, 'glow').setScale(3).setTint(0xff6a20).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD);
            this.root.add(burn);
            this.tweens.add({ targets: burn, alpha: 0, scale: 4, duration: 1100, onComplete: () => burn.destroy() });
            // he burns: thrown back, black, and gone
            this.pose(m, 'react', 3);
            m.setTint?.(0xff7a30);
            this.time.delayedCall(250, () => { this.pose(m, 'react', 4); m.setTint?.(0x3a2016); });
            this.tweens.add({ targets: m, alpha: 0, duration: 900, delay: 350 });
            for (const gd of this.guards) this.tweens.add({ targets: gd, x: gd.x - 10, duration: 260, ease: 'Quad.easeOut' });
            // the ash left on the floor, and a little of it rising
            const ash = this.add.ellipse(mx, H - 108, 46, 8, 0x2a2622, 1).setAlpha(0);
            this.root.add(ash);
            this.tweens.add({ targets: ash, alpha: 1, duration: 600, delay: 300 });
            for (let i = 0; i < 16; i++) {
              const a = this.add.rectangle(mx + (Math.random() - 0.5) * 30, my + Math.random() * 50, 3, 3, i % 3 ? 0x5a524a : 0xff8a40);
              this.root.add(a);
              this.tweens.add({ targets: a, y: a.y - 60 - Math.random() * 80, x: a.x + (Math.random() - 0.5) * 40, alpha: 0, duration: 1200 + Math.random() * 600, onComplete: () => a.destroy() });
            }
          },
        });
      });
    });
  }

  // the Iron Marshal's helm: dented, split, rolled across the floor past the messenger to
  // the foot of the dais, where it rocks and stops; the hall goes still
  helm() {
    const W = SETTINGS.width; const H = SETTINGS.height;
    this.frame('wide', 500);
    this.act(2800, () => {
      this.say('VOICE', '(a helm rolls across the floor)');
      // his painted helm (ChatGPT, 23 Nov), split and bloodied; the code-drawn one if it didn't load
      const painted = this.textures.exists('malgor-helm');
      const h = painted ? this.add.image(0, 0, 'malgor-helm') : this.add.graphics();
      if (painted) h.setScale(76 / h.width);
      else h.fillStyle(0x2a2a30, 1).fillCircle(0, 0, 16).fillRect(-16, 0, 32, 10);
      if (!painted) {
        h.fillStyle(0x6a5a3a, 1).fillRect(-16, -2, 32, 3); // the gold band
        h.fillStyle(0x0a0a0c, 1).fillRect(-8, -4, 16, 3); // the eye slit
        h.fillStyle(0x4a0a08, 1).fillCircle(-6, 6, 3).fillCircle(5, 8, 2); // his blood on it
        h.lineStyle(2, 0x0a0a0c, 1).lineBetween(4, -16, -2, 2); // the split
      }
      h.setPosition(-30, H - 100);
      this.root.add(h);
      playSfx(this, 'block', { volume: 0.6, pitch: -1400, minGapMs: 0 });
      this.tweens.add({
        targets: h, x: W * 0.68, angle: 450, duration: 1500, ease: 'Quad.easeOut',
        onComplete: () => {
          playSfx(this, 'block', { volume: 0.4, pitch: -1800, minGapMs: 0 });
          this.tweens.add({ targets: h, angle: 435, duration: 180, yoyo: true, repeat: 1 }); // comes to rest on its side
        },
      });
      this.time.delayedCall(1000, () => this.stagger(this.messenger, 16));
      this.time.delayedCall(1700, () => this.frame('king', 900));
    });
  }

  // fear: the ember-fire gathers in his open hand as it always has; it shakes, sputters and
  // goes out, and the torches with it, one by one; only his eyes are left
  gutter() {
    this.frame('king', 500);
    this.act(3400, () => {
      this.tweens.add({ targets: this.hand, scale: 1.8, alpha: 1, duration: 900, ease: 'Sine.easeIn' });
      playSfx(this, 'fireWhoosh', { volume: 0.4, pitch: -900, minGapMs: 0 });
      this.time.delayedCall(950, () => {
        this.tweens.killTweensOf(this.hand);
        this.tweens.add({ targets: this.hand, x: this.hand.x + 3, duration: 50, yoyo: true, repeat: 8 });
        this.tweens.add({ targets: this.hand, scale: 0, alpha: 0, duration: 900, delay: 400, ease: 'Quad.easeIn' });
      });
      this.time.delayedCall(1500, () => {
        this.torches.forEach((t, i) => this.time.delayedCall(i * 140, () => { this.tweens.killTweensOf(t); this.tweens.add({ targets: t, alpha: 0.08, duration: 300 }); }));
        this.tweens.add({ targets: this.kingLight, alpha: 0, duration: 600 });
        this.eyes.setFillStyle(0xff5a20);
      });
    });
  }

  // the last scene's end: the Keep's doors boom, three times, each nearer; dust comes down,
  // the messenger runs; and the fire comes back into the king's hand, bigger than ever
  doors() {
    const W = SETTINGS.width;
    this.frame('wide', 500);
    this.act(5600, () => {
      this.say('VOICE', '(the doors of the Keep: something is hammering at them)');
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(300 + i * 1000, () => {
          playSfx(this, 'dkSlam', { volume: 0.7 + i * 0.15, pitch: -1600 + i * 200, minGapMs: 0 });
          playSfx(this, 'kick', { volume: 0.6 + i * 0.2, pitch: -2400, minGapMs: 0 });
          this.cameras.main.shake(380, 0.006 + i * 0.004);
          for (let d = 0; d < 10; d++) {
            const p = this.add.rectangle(Math.random() * W, 40 + Math.random() * 40, 2, 2, 0x7a7068);
            this.root.add(p);
            this.tweens.add({ targets: p, y: 420 + Math.random() * 60, alpha: 0, duration: 900 + Math.random() * 500, ease: 'Quad.easeIn', onComplete: () => p.destroy() });
          }
        });
      }
      // the messenger has had enough: he runs
      this.time.delayedCall(1500, () => {
        const m = this.messenger;
        if (m.sheet) { m.setScale(-Math.abs(m.scaleX), m.scaleY); let i = 0; this.time.addEvent({ delay: 60, repeat: 20, callback: () => this.pose(m, 'walk', (i = (i + 1) % 8)) }); }
        this.tweens.add({ targets: m, x: -120, duration: 1300, ease: 'Quad.easeIn' });
      });
      // and he lights his hand again: not fear now
      this.time.delayedCall(3600, () => {
        this.say(null);
        this.frame('king', 700);
        const fist = this.kingPose('defy');
        if (fist) this.hand.setPosition(...fist);
        this.hand.setAlpha(1);
        this.tweens.add({ targets: this.hand, scale: 3.4, duration: 900, ease: 'Back.easeOut' });
        this.tweens.add({ targets: this.kingLight, alpha: 0.6, duration: 900 });
        this.eyes.setFillStyle(0xffd080).setAlpha(1);
        playSfx(this, 'fireWhoosh', { volume: 1, pitch: -500, minGapMs: 0 });
        this.relight();
      });
    });
  }

  // ------------------------------------------------------------ 3. the war map

  // The war map, timed to its music (Nick's "14 Ending", MUSIC.warmap: 23 s; its accents fall
  // every 4 s, at 4.0, 8.15, 12.2 and 16.3, the last hit at 18.45, and it dies away by 20.5).
  // The beats below are seconds into the track; update() fires them by the track's own clock
  // (its seek), so they stay on the music even if it starts late. Without the track: the
  // scene's clock. A press skips the rest.
  map() {
    const W = SETTINGS.width; const H = SETTINGS.height;
    const t = this.t;
    this.say(null);
    this.tweens.add({ targets: this.oathLayer, alpha: 0, duration: 900 });
    const c = this.mapLayer;
    c.setAlpha(1);
    c.add(this.add.rectangle(-60, -60, W + 120, H + 120, 0x000000, 1).setOrigin(0));
    const m = this.add.container(0, 0); // (the map itself: the camera pushes in on it)
    c.add(m);
    // the painted map when it's in (its places where the painting has them); else drawn in code
    const painted = this.textures.exists('keep-war-map');
    const R = painted ? ROUTE.map((r, i) => ({ ...r, ...PAINTED_AT[i] })) : ROUTE;
    const art = painted ? this.add.image(0, -50, 'keep-war-map').setOrigin(0).setDisplaySize(W, W / 1.5).setAlpha(0) : null;
    if (art) m.add(art);
    // the parchment (scorched and torn from the fourth scene: it was thrown, and trodden on)
    const p = this.add.graphics().setAlpha(0);
    const x0 = 96; const y0 = 76; const pw = W - 192; const ph = H - 150;
    p.fillStyle(0x6a5232, 1).fillRect(x0 - 4, y0 - 4, pw + 8, ph + 8);
    p.fillStyle(0xb39a6a, 1).fillRect(x0, y0, pw, ph);
    p.fillStyle(0xc6ae7c, 1).fillRect(x0 + 18, y0 + 16, pw - 36, ph - 32);
    const rnd = new Phaser.Math.RandomDataGenerator(['war-map']);
    for (let i = 0; i < 40; i++) p.fillStyle(0x6a5030, 0.06 + rnd.frac() * 0.08).fillCircle(rnd.between(x0, x0 + pw), rnd.between(y0, y0 + ph), rnd.between(6, 40));
    p.lineStyle(1.5, 0x5a4024, 0.5);
    for (let i = 0; i < 14; i++) { const mx = rnd.between(x0 + 30, x0 + pw - 30); const my = rnd.between(y0 + 30, y0 + ph - 40); p.lineBetween(mx - 10, my + 6, mx, my - 6); p.lineBetween(mx, my - 6, mx + 10, my + 6); }
    p.lineStyle(2, 0x4a5a6a, 0.45).beginPath(); p.moveTo(x0 + 10, y0 + 280); p.lineTo(x0 + 140, y0 + 240); p.lineTo(x0 + 260, y0 + 300); p.lineTo(x0 + 400, y0 + 250); p.strokePath();
    if (t >= 3) { // burned and torn
      p.fillStyle(0x000000, 1).fillTriangle(x0 + pw - 120, y0 - 6, x0 + pw + 6, y0 - 6, x0 + pw + 6, y0 + 110);
      p.lineStyle(3, 0xff6a20, 0.7).lineBetween(x0 + pw - 120, y0 - 4, x0 + pw + 4, y0 + 110);
      p.fillStyle(0x000000, 1).fillTriangle(x0 - 6, y0 + ph + 6, x0 + 90, y0 + ph + 6, x0 - 6, y0 + ph - 70);
    }
    if (painted) { // (the painting is the parchment: from the fourth scene, only its burned corner)
      p.clear();
      if (t >= 3) {
        p.fillStyle(0x000000, 1).fillTriangle(0, 0, 150, 0, 0, 170);
        p.lineStyle(3, 0xff6a20, 0.75).lineBetween(150, 0, 0, 170);
      }
    }
    m.add(p);
    // the road: what they've won already in red, the rest dashed ink
    const road = this.add.graphics().setAlpha(0);
    for (let i = 0; i < R.length - 1; i++) {
      const a = R[i]; const b = R[i + 1];
      const won = i < t - 1;
      if (painted) continue; // (the painting has its own road, and the won ones are painted in red: PAINTED_ROADS)
      for (let k = 0; k < 12; k += won ? 1 : 2) {
        road.lineStyle(won ? 4 : 2, won ? 0x8a1010 : 0x4a3420, won ? 0.9 : 0.7);
        road.lineBetween(a.x + (b.x - a.x) * k / 12, a.y + (b.y - a.y) * k / 12, a.x + (b.x - a.x) * (k + 1) / 12, a.y + (b.y - a.y) * (k + 1) / 12);
      }
    }
    m.add(road);
    const trail = this.add.graphics(); // (the road they take this time, inked red behind the token)
    m.add(trail);
    // on the painted map the road is painted too: a stroke of blood-red ink laid down a dab at
    // a time (ChatGPT's brush marks, 'map-path'), every road they've already won, and this
    // time's road growing behind the token as it marches
    const pathLayer = this.add.container(0, 0).setAlpha(0);
    m.add(pathLayer);
    const dab = (pt, n) => {
      if (this.textures.exists('map-path')) {
        const d = this.add.image(pt.x, pt.y, 'map-path', n % 8).setRotation(pt.ang + (((n * 37) % 11) - 5) * 0.03);
        d.setScale(20 / d.width * (0.9 + ((n * 13) % 5) * 0.05));
        pathLayer.add(d);
        return d;
      }
      const d = this.add.circle(pt.x, pt.y, 3.2, 0x8a1010, 0.92);
      pathLayer.add(d);
      return d;
    };
    if (painted) PAINTED_ROADS.slice(0, Math.max(0, t)).forEach((r) => roadPoints(r).forEach((pt, n) => dab(pt, n)));
    const march = painted ? roadPoints(t > 0 ? PAINTED_ROADS[t - 1] : INTO_VILLAGE) : null;
    // the places, and the king's black marker on every one he still holds
    const places = []; const flags = [];
    R.forEach((r, i) => {
      const last = i === R.length - 1;
      let g;
      if (!painted) g = this.glyph(r.glyph, r.x, r.y, last);
      else if (last) { // (the painted Keep: a light in it that won't stop)
        g = this.add.image(r.x, r.y, 'glow').setScale(2.6).setTint(t >= 4 ? 0xff3020 : 0x9070ff).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: g, scale: 3.2, duration: t >= 4 ? 420 : 900, yoyo: true, repeat: -1 });
      } else g = this.add.container(0, 0);
      const label = painted
        ? this.add.text(r.x, r.y + 30, r.name, { fontFamily: FONT.display, fontSize: '13px', color: '#f4e4c4' }).setOrigin(0.5, 0).setStroke('#140a04', 4)
        : this.add.text(r.x, r.y + 26, r.name, { fontFamily: FONT.display, fontSize: '12px', color: '#3a2410' }).setOrigin(0.5, 0);
      const set = [g, label];
      if (!last) {
        const f = this.flag(r.x + 18, r.y - 4);
        if (i < t) { f.setAngle(84); f.y += 10; f.setAlpha(0.8); } // (knocked down in an earlier scene)
        flags[i] = f;
        set.push(f);
      }
      for (const o of set) o.setAlpha(0);
      m.add(set);
      places.push(set);
    });
    // the Oath Keepers' token: from where it was to where they are now
    const from = t > 0 ? R[t - 1] : painted ? { x: INTO_VILLAGE[0][0], y: INTO_VILLAGE[0][1] } : { x: R[0].x - 90, y: R[0].y + 40 };
    const to = R[t];
    const tok = this.token(from.x, from.y).setAlpha(0);
    m.add(tok);
    const roads = this.add.text(W / 2, painted ? H - 80 : y0 + ph - 34, ROADS[t], { fontFamily: FONT.display, fontSize: '22px' }).setOrigin(0.5).setAlpha(0);
    roads.setLetterSpacing?.(4);
    epicFill(roads, ['#c03020', '#7a0a08', '#300402']);
    m.add(roads);
    if (painted) roads.setStroke('#140a04', 6);
    const nx = R[t + 1];
    const keep = R[R.length - 1];
    const burst = (x, y, tint, s = 3) => {
      const b = this.add.image(x, y, 'glow').setScale(s * 0.4).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
      m.add(b);
      this.tweens.add({ targets: b, scale: s, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => b.destroy() });
    };
    const beats = [
      // the parchment comes up; the road and its places are inked in one by one
      [0.0, () => this.tweens.add({ targets: [p, art].filter(Boolean), alpha: 1, duration: 1200 })],
      // (the hall is gone behind the map: when the map fades out with the music, it's to black)
      [0.2, () => { for (const o of [this.root, this.grade, this.insert, this.ui]) o.setVisible(false); }],
      [0.6, () => this.tweens.add({ targets: [road, pathLayer], alpha: 1, duration: 1400 })],
      ...R.map((r, i) => [1.0 + i * 0.5, () => this.tweens.add({ targets: places[i], alpha: (o) => (flags.includes(o) && i < t ? 0.8 : 1), duration: 500 })]),
      // the first accent: the Oath Keepers' token is set down
      [3.9, () => {
        tok.setScale(2.2).setAlpha(1);
        this.tweens.add({ targets: tok, scale: 1, duration: 260, ease: 'Quad.easeIn' });
        this.time.delayedCall(260, () => { burst(from.x, from.y, 0xff3020); this.cameras.main.shake(160, 0.004); });
      }],
      // it marches up the road to the next accent, inking it red behind it
      [4.25, () => {
        if (march) { // (along the painted road, painting it as it goes)
          let laid = 0; const step = { u: 0 };
          this.tweens.add({
            targets: step, u: 1, duration: 3800, ease: 'Sine.easeInOut',
            onUpdate: () => {
              const k = Math.min(march.length - 1, Math.round(step.u * (march.length - 1)));
              tok.setPosition(march[k].x, march[k].y);
              for (; laid <= k; laid++) { const d = dab(march[laid], laid + 3); d.setScale(d.scaleX * 1.25); this.tweens.add({ targets: d, scale: d.scaleX / 1.25, duration: 220 }); }
            },
          });
          return;
        }
        this.tweens.add({
          targets: tok, x: to.x, y: to.y, duration: 3800, ease: 'Sine.easeInOut',
          onUpdate: () => { trail.clear().lineStyle(4, 0x8a1010, 0.9).lineBetween(from.x, from.y, tok.x, tok.y); },
        });
      }],
      // the second: it lands; the king's marker goes down
      [8.15, () => {
        burst(to.x, to.y, 0xff3020, 4);
        this.cameras.main.shake(260, 0.008);
        playSfx(this, 'dkSlam', { volume: 0.6, pitch: -700, minGapMs: 0 });
        const f = flags[t];
        if (f) this.tweens.add({ targets: f, angle: 84, y: f.y + 10, duration: 300, ease: 'Bounce.easeOut' });
        this.tweens.add({ targets: tok, scale: 1.3, duration: 140, yoyo: true });
      }],
      // the count
      [10.2, () => { roads.setScale(1.4); this.tweens.add({ targets: roads, alpha: 1, scale: 1, duration: 600, ease: 'Quad.easeOut' }); }],
      // the third: where the road goes next
      [12.2, () => {
        const ring = this.add.circle(nx.x, nx.y - 4, 30).setStrokeStyle(3, 0xb01010, 0.9);
        m.add(ring);
        this.tweens.add({ targets: ring, scale: { from: 0.6, to: 1.3 }, alpha: { from: 1, to: 0.2 }, duration: 1000, repeat: -1 });
        if (painted) c.add(this.add.rectangle(0, H - 50, W, 50, 0x000000, 0.65).setOrigin(0));
        const nextName = this.add.text(W / 2, H - 27, `NEXT  ·  ${nx.name}`, { fontFamily: FONT.display, fontSize: '20px' }).setOrigin(0.5).setStroke('#000000', 5).setAlpha(0).setScale(1.4);
        nextName.setLetterSpacing?.(5);
        epicFill(nextName, ['#ffe0b0', '#d08040', '#4a1004']);
        c.add(nextName);
        this.tweens.add({ targets: nextName, alpha: 1, scale: 1, duration: 400, ease: 'Quad.easeOut' });
      }],
      // the fourth, the loudest: in on the Black Keep, and it flares
      [16.3, () => {
        const z = 1.16;
        this.tweens.add({ targets: m, scale: z, x: (W / 2 - keep.x * z) * 0.5, y: (H / 2 - keep.y * z) * 0.5, duration: 2600, ease: 'Sine.easeInOut' });
        burst(keep.x, keep.y - 8, t >= 4 ? 0xff2010 : 0x9070ff, 6);
        this.cameras.main.shake(300, 0.006);
      }],
      [18.45, () => burst(keep.x, keep.y - 8, 0xff2010, 5)],
      // the music dies away: so does the map
      [19.0, () => this.tweens.add({ targets: c, alpha: 0, duration: 1500 })],
      [20.6, () => this.finish()],
    ];
    this.mapBeats = beats.sort((a, b) => a[0] - b[0]);
    this.mapSound = playCue(this, 'warmap', 0);
    this.mapStart = this.time.now;
    this.mapAt = -1;
    // (a press from here on skips the rest)
    this.busy = false;
    this.mapWait = true;
  }

  // the map's clock: the track's own position while it plays, else the scene's
  mapClock() {
    const s = this.mapSound;
    const own = (this.time.now - this.mapStart) / 1000;
    const at = s?.isPlaying ? s.seek : own;
    this.mapAt = Math.max(this.mapAt, at);
    while (this.mapBeats.length && this.mapBeats[0][0] <= this.mapAt) this.mapBeats.shift()[1]();
  }

  // a place on the map, inked: the village's houses, the wood, the mountain, the cliffs, the
  // gates, and the Keep itself (black, with a light in it that won't stop)
  glyph(kind, x, y, last) {
    const g = this.add.graphics();
    const ink = 0x3a2410;
    g.lineStyle(2, ink, 1);
    if (kind === 'house') {
      for (const dx of [-12, 6]) { g.fillStyle(0x8a6a40, 1).fillRect(x + dx - 7, y - 4, 14, 12); g.strokeRect(x + dx - 7, y - 4, 14, 12); g.fillStyle(ink, 1).fillTriangle(x + dx - 9, y - 4, x + dx + 9, y - 4, x + dx, y - 14); }
    } else if (kind === 'trees') {
      for (const dx of [-14, 0, 14]) g.fillStyle(0x2a3a1a, 1).fillTriangle(x + dx - 8, y + 8, x + dx + 8, y + 8, x + dx, y - 16 + Math.abs(dx) / 2);
    } else if (kind === 'mountain') {
      g.fillStyle(0x5a4a3a, 1).fillTriangle(x - 24, y + 10, x + 24, y + 10, x, y - 20);
      g.fillStyle(0x1a1410, 1).fillRect(x - 5, y, 10, 10).fillCircle(x, y, 5);
    } else if (kind === 'cliff') {
      g.fillStyle(0x5a4a3a, 1).fillRect(x - 6, y - 20, 22, 30);
      g.beginPath(); g.moveTo(x - 20, y + 10); g.lineTo(x - 12, y); g.lineTo(x - 6, y - 4); g.lineTo(x - 6, y - 20); g.strokePath();
    } else if (kind === 'gate') {
      g.fillStyle(0x2a2a2a, 1).fillRect(x - 22, y - 18, 10, 28).fillRect(x + 12, y - 18, 10, 28);
      g.lineStyle(2, 0x1a1a1a, 1);
      for (let i = -9; i <= 9; i += 6) g.lineBetween(x + i, y - 12, x + i, y + 10);
      g.lineBetween(x - 12, y - 4, x + 12, y - 4);
    } else if (kind === 'keep') {
      g.fillStyle(0x0c0a10, 1).fillRect(x - 22, y - 30, 44, 44).fillRect(x - 30, y - 10, 60, 24);
      for (const dx of [-26, -10, 6, 22]) g.fillTriangle(x + dx - 5, y - 10 - (Math.abs(dx) < 12 ? 20 : 0), x + dx + 5, y - 10 - (Math.abs(dx) < 12 ? 20 : 0), x + dx, y - 30 - (Math.abs(dx) < 12 ? 24 : 0));
    }
    if (!last) return g;
    const c = this.add.container(0, 0, [g]);
    const light = this.add.image(x, y - 8, 'glow').setScale(1.4).setTint(this.t >= 4 ? 0xff3020 : 0x9070ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
    this.tweens.add({ targets: light, alpha: 0.2, duration: this.t >= 4 ? 420 : 900, yoyo: true, repeat: -1 });
    c.add(light);
    return c;
  }

  // the king's marker: a black pennant on a pin
  flag(x, y) {
    const g = this.add.graphics();
    g.fillStyle(0x101014, 1).fillRect(-1, -22, 2, 24);
    g.fillTriangle(1, -22, 1, -12, 14, -17);
    g.fillStyle(0x6a50b0, 1).fillCircle(7, -17, 1.5);
    g.setPosition(x, y);
    return g;
  }

  // the Oath Keepers' token: a red shield with three white marks (the three), on a gold rim
  token(x, y) {
    const c = this.add.container(x, y);
    const glow = this.add.image(0, 0, 'glow').setScale(1.3).setTint(0xff3020).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
    this.tweens.add({ targets: glow, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    const g = this.add.graphics();
    g.fillStyle(0xc8a040, 1).fillCircle(0, 0, 14);
    g.fillStyle(0x9a1010, 1).fillCircle(0, 0, 11);
    g.fillStyle(0xf0e0c0, 1);
    for (const dx of [-5, 0, 5]) g.fillRect(dx - 1, -6, 2, 12);
    c.add([glow, g]);
    return c;
  }

  // ------------------------------------------------------------ 4. the oath

  // a cut to black; the three Oath Keepers; their oath, one line more each scene (what they
  // have sworn before, dim; this scene's line, bright); the last scene's ends it. Then it
  // waits for a press.
  oath() {
    const W = SETTINGS.width; const H = SETTINGS.height;
    const t = this.t;
    this.busy = true;
    this.say(null);
    this.heart?.remove();
    const L = this.oathLayer;
    const black = this.add.rectangle(-60, -60, W + 120, H + 120, 0x000000, 1).setOrigin(0); // (wider than the screen: the shakes)
    L.add(black);
    stopMusic(this, 300);
    playSfx(this, 'dkSlam', { volume: 1, pitch: -1200, minGapMs: 0 });
    playSfx(this, 'kick', { volume: 1, pitch: -2600, minGapMs: 0 });
    this.cameras.main.shake(220, 0.006);
    // the three, slammed in one by one: Oryn, Vexa, then Rurik in the middle
    const faces = [['oryn', W / 2 - 170, 118, 104], ['vexa', W / 2 + 170, 118, 104], ['rurik', W / 2, 112, 132]];
    faces.forEach(([id, x, y, s], i) => {
      this.time.delayedCall(350 + i * 380, () => {
        const red = this.add.image(x, y, 'glow').setScale(s / 22).setTint(0xb01010).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
        const fr = this.add.rectangle(x, y, s + 8, s + 8, 0x2a0606).setStrokeStyle(2, 0xb08030);
        L.add([red, fr]);
        if (this.textures.exists(`portrait-${id}`)) L.add(this.add.image(x, y, `portrait-${id}`).setDisplaySize(s, s));
        else L.add(this.add.text(x, y, id[0].toUpperCase(), { fontFamily: FONT.display, fontSize: `${Math.round(s / 2)}px`, color: '#d0a060' }).setOrigin(0.5));
        const nm = this.add.text(x, y + s / 2 + 12, id.toUpperCase(), { fontFamily: FONT.display, fontSize: '14px' }).setOrigin(0.5).setStroke('#000000', 4);
        nm.setLetterSpacing?.(4);
        epicFill(nm, ['#ffe0b0', '#d08040', '#4a1004']);
        L.add(nm);
        const all = L.list.slice(-4);
        for (const o of all) { const sx = o.scaleX; const sy = o.scaleY; o.setScale(sx * 1.35, sy * 1.35).setAlpha(0); this.tweens.add({ targets: o, scaleX: sx, scaleY: sy, alpha: o === red ? 0.5 : 1, duration: 220, ease: 'Quad.easeOut' }); }
        playSfx(this, 'dkSlam', { volume: 0.7, pitch: -800 - i * 200, minGapMs: 0 });
      });
    });
    // the oath so far, and this scene's line
    const top = 256;
    const lines = OATH.slice(0, t + 1);
    this.time.delayedCall(1700, () => {
      lines.forEach((s, i) => {
        const now = i === t;
        const tx = this.add.text(W / 2, top + i * 30, now ? `"${s}"` : s, { fontFamily: FONT.body, fontSize: now ? '24px' : '19px', fontStyle: now ? 'italic 700' : 'italic 600', color: now ? '#ffffff' : '#9a8a7a' })
          .setOrigin(0.5).setStroke('#000000', 4).setAlpha(0);
        if (now) epicFill(tx, ['#fff0d0', '#e09050', '#7a1a08']);
        L.add(tx);
        this.tweens.add({ targets: tx, alpha: now ? 1 : 0.6, duration: now ? 900 : 400, delay: now ? 500 : i * 120 });
      });
      this.time.delayedCall(500, () => playSfx(this, 'heavySwing', { volume: 0.5, pitch: -600, minGapMs: 0 }));
    });
    let end = 3400;
    if (t >= 4) { // the oath is whole
      end = 5200;
      this.time.delayedCall(3600, () => {
        const big = this.add.text(W / 2, H - 92, 'THE OATH WILL BE KEPT', { fontFamily: FONT.display, fontSize: '34px' }).setOrigin(0.5).setStroke('#000000', 6).setScale(1.6).setAlpha(0);
        big.setLetterSpacing?.(6);
        epicFill(big, ['#ffd0a0', '#e03a1a', '#4a0402']);
        L.add(big);
        this.tweens.add({ targets: big, scale: 1, alpha: 1, duration: 260, ease: 'Quad.easeOut' });
        this.cameras.main.flash(200, 200, 40, 20);
        this.cameras.main.shake(400, 0.012);
        playSfx(this, 'lightningStrike', { volume: 0.5, pitch: -900, minGapMs: 0 });
        playSfx(this, 'dkSlam', { volume: 1, pitch: -1500, minGapMs: 0 });
      });
    }
    this.time.delayedCall(end, () => {
      this.busy = false;
      this.endWait = true;
      const hint = this.add.text(W - 24, H - 20, 'CLICK / SPACE  continue', { fontFamily: FONT.ui, fontSize: '12px', color: '#a89880' }).setOrigin(1, 0.5).setAlpha(0);
      L.add(hint);
      this.tweens.add({ targets: hint, alpha: { from: 0.4, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
    });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.heart?.remove();
    stopMusic(this, 600);
    this.tweens.add({
      targets: [this.root, this.grade, this.insert, this.ui, this.oathLayer, this.mapLayer], alpha: 0, duration: 500,
      onComplete: () => { const done = this.onDone; this.scene.stop(); done?.(); },
    });
  }
}
