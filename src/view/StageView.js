// StageView.js — Draws THE OATH ROAD's moving parts (stage/Stage.js): each section's
// floor and light, the breakable props, pickups, fire grates and pendulum blades, and
// reacts to the stage's events with debris, flames, sparks and sound.
//
// Props and pickups are painted here as small canvas textures (pixel art at 2x), so the
// stage works with no extra image files.

import { SETTINGS } from '../config/settings.js';
import { PHYSICS } from '../effects/Physics.js';
import { drawStampedeTrail } from './StampedeTrail.js';
import { DEPTH } from './depths.js';
import { PICKUPS, PROPS, PROP_LOOKS } from '../data/stage.js';
import { playSfx } from '../core/Sfx.js';
import { buildPropSheet, PROP_HD, PICKUP_HD, PICKUP_PAINTED, PICKUP_SCALE } from './propSheet.js';
import { FX } from './stripImporter.js';
import { BladeChain } from './BladeChain.js';
import { DANGER } from './dangerCue.js';
import { cutPieces, keyLayer } from './envArt.js';
import { drawScorpion, listenScorpion } from './VincentView.js';
import { SiegeAnim } from './SiegeAnim.js';
import { PropShatter, SHATTER, LAMP_ART } from './PropShatter.js';
import { propLight, lightProp, rimGlow, groundUnder, moveGround } from './propGround.js';

const rand = (a, b) => a + Math.random() * (b - a);
// a colour darkened (k < 1) or lightened
const shade = (c, k) => (Math.min(255, ((c >> 16) & 255) * k) << 16) | (Math.min(255, ((c >> 8) & 255) * k) << 8) | Math.min(255, (c & 255) * k);
// A catapult's stone in the air (drawStone): its radius on screen
const SIEGE_STONE = { radius: 21 };
// An arrow volley (Stage bombard `look: 'arrows'`): arrows a volley; how far through the
// warning they're loosed (they fly the rest); the arrow texture's size (drawn at 2x) and its
// scale on screen, its length there; how long (ms) the spent ones stay standing in the ground
const ARROWS = { perVolley: 7, loose: 0.2, texW: 160, texH: 26, scale: 0.36, arc: 230, seen: 760, len: 160 * 0.9, linger: 3200 };
// Arrows that feather a man (hazardHit 'arrow'): how many stick in him, how long (ms) they
// ride along before they fade, the fade itself (game frames: they wait out a pause), and the scale they're drawn at (a little
// under the ones in the ground: they're buried deeper)
const PINNED = { min: 1, max: 2, linger: 210, fade: 36, scale: 0.42 };

// The pendulum blades' chain (world px): one link's outer length and width, the round
// bar it's forged from, the spacing of the links (a link's length less the two bars that
// interlock), and its rusted-iron colours (matched to the painted blade's own chain).
const CHAIN = {
  length: 12, width: 7.5, wire: 2, pitch: 8,
  dark: 0x140e0b, shade: 0x3a2e28, iron: 0x5e4d42, light: 0xc09c80, glint: 0xf0dcc8, rust: 0x8a4424, rustDark: 0x5a2814,
};

// the shared, painted-once props that take each level's light (view/propGround.js)
// the lamp-and-cart painting (view/propArt.js lampcart): where in a frame the post's foot
// stands (shares of the frame), and how big it's drawn (world px per px of a 256-wide frame)
const PAIR = { postX: 0.195, groundY: 0.895, scale: 0.85 };
const LIT_PROPS = new Set(['barrel', 'crate', 'urn', 'chest', 'bell', 'fence', 'stall', 'trestle', 'rack', 'handcart']);
// the painted kinds of each (view/propArt.js), one picked per prop
const VARIANTS = {
  barrel: ['barrel-v0', 'barrel-v1', 'barrel-v2', 'barrel-v3', 'barrel-v4', 'barrel-v5', 'barrel-v6', 'barrel-grey', 'barrel-tar'],
  crate: ['crate-v0', 'crate-v1', 'crate-v2', 'crate-v3', 'crate-v4', 'crate-v5', 'crate-v6', 'crate-blue', 'crate-fish'],
};
// the big pieces a break throws (view/propArt.js chunks)
const CHUNKS = {
  barrel: ['chk-staves', 'chk-head-0', 'chk-head-1', 'chk-hoop-0', 'chk-hoop-1', 'chk-stave-long'],
  crate: ['chk-panel-grey', 'chk-lid-pine', 'chk-panel-bone', 'chk-bracket', 'chk-nails', 'chk-plank'],
  chest: ['chk-panel-tar', 'chk-hinge', 'chk-padlock', 'chk-bracket'],
  fence: ['chk-plank', 'chk-post', 'chk-nails'],
  haycart: ['chk-wheel', 'chk-hub', 'chk-plank', 'chk-post'],
  handcart: ['chk-wheel', 'chk-hub', 'chk-plank'],
  stall: ['chk-awning', 'chk-post', 'chk-plank', 'chk-trestle-leg'],
  trestle: ['chk-trestle-leg', 'chk-plank', 'chk-plank'],
  rack: ['chk-post', 'chk-plank', 'chk-bracket'],
};
// the loose bits each kind throws off (view/propArt.js debris)
const SPLINTERS = ['deb-splinter-0', 'deb-splinter-1', 'deb-splinter-2', 'deb-splinter-3'];
const PLANKS = ['deb-plank-2', 'deb-plank-3', 'deb-plank-4', 'deb-plank-5'];
const DEBRIS = {
  barrel: ['deb-stave-0', 'deb-stave-1', 'deb-stave-3', ...SPLINTERS],
  crate: [...PLANKS, ...SPLINTERS], chest: [...PLANKS, ...SPLINTERS], fence: ['deb-plank-0', 'deb-plank-1', ...PLANKS, ...SPLINTERS],
  stall: ['deb-plank-0', ...PLANKS, ...SPLINTERS], trestle: [...PLANKS, ...SPLINTERS], rack: [...PLANKS, ...SPLINTERS], handcart: [...PLANKS, ...SPLINTERS],
  urn: ['deb-shard-0', 'deb-shard-1', 'deb-shard-2'],
  haycart: [...PLANKS, ...SPLINTERS, 'deb-straw-0', 'deb-straw-1'],
  lamppost: [...SPLINTERS, 'deb-glass-0', 'deb-glass-1'],
};

export class StageView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.makeTextures();
    this.buildSections();
    this.propSprites = new Map();
    this.siege = new SiegeAnim(this); // (the archer posts and catapults: view/SiegeAnim.js)
    this.shatter = new PropShatter(this); // (props bursting into pieces of themselves: view/PropShatter.js)
    for (const pr of stage.props) {
      const v = this.makeProp(pr);
      this.vary(pr, v);
      if (pr.under !== undefined) v.ground?.forEach((g) => g.setVisible(false)); // (stacked: its shadow is the crate under it)
      this.propSprites.set(pr.id, v);
    }
    this.makePairs();
    this.pickupSprites = new Map();
    this.listen();
  }

  // ------------------------------------------------------------ textures

  canvasTex(key, w, h, draw) {
    if (this.scene.textures.exists(key)) return key;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    draw(c, w, h);
    this.scene.textures.addCanvas(key, cv);
    return key;
  }

  makeTextures() {
    // the painted sheet first (view/propSheet.js); anything it doesn't supply is painted
    // here instead (canvasTex leaves an existing texture alone)
    this.painted = buildPropSheet(this.scene);
    this.art2 = this.scene.registry.get('propArt') ?? new Set(); // (the second repaint: view/propArt.js)
    this.hd = buildPropSheet(this.scene, 'props-hd-src', PROP_HD, 3, 2, true); // (replaces the old breakables)
    // the pickups at full detail (drawn at 1 / PICKUP_SCALE): the repainted sheet where it exists
    this.pickupHd = buildPropSheet(this.scene, 'props-src', PICKUP_HD, 4, 4, true);
    for (const k of buildPropSheet(this.scene, 'pickups-hd-src', PICKUP_PAINTED, 3, 2, true)) this.pickupHd.add(k);
    // not painted yet: the health jar is the mana jar turned green, the ring and the rune the chalice
    if (!this.scene.textures.exists('pk-health') && this.scene.textures.exists('pk-mana')) {
      const src = this.scene.textures.get('pk-mana').getSourceImage();
      const cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height;
      const ctx = cv.getContext('2d');
      ctx.filter = 'hue-rotate(-105deg) saturate(1.2)';
      ctx.drawImage(src, 0, 0);
      this.scene.textures.addCanvas('pk-health', cv).setFilter(Phaser.Textures.FilterMode.LINEAR);
      if (this.pickupHd.has('pk-mana')) this.pickupHd.add('pk-health');
    }
    // chest: iron-bound, brass lock (fallback)
    this.canvasTex('prop-chest', 92, 76, (c, w, h) => {
      c.fillStyle = '#4a2a14'; c.fillRect(2, 22, w - 4, h - 24);
      c.fillStyle = '#6a3e1e'; c.beginPath(); c.ellipse(w / 2, 24, w / 2 - 2, 20, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#3a3a42'; for (const x of [4, w / 2 - 5, w - 14]) c.fillRect(x, 6, 10, h - 8);
      c.fillStyle = '#c8a040'; c.fillRect(w / 2 - 7, 30, 14, 16); c.fillStyle = '#2a1a08'; c.fillRect(w / 2 - 2, 36, 4, 6);
    });
    // bell: an iron bell on a gallows post (ring it: an optional fight)
    this.canvasTex('prop-bell', 68, 140, (c, w, h) => {
      c.fillStyle = '#2a1e16'; c.fillRect(w / 2 - 4, 0, 8, h); c.fillRect(6, 4, w - 12, 8);
      c.fillStyle = '#5a5e64'; c.beginPath(); c.moveTo(w / 2 - 10, 18); c.lineTo(w / 2 + 10, 18); c.lineTo(w / 2 + 22, 62); c.lineTo(w / 2 - 22, 62); c.closePath(); c.fill();
      c.fillStyle = '#a4502a'; c.fillRect(w / 2 - 22, 58, 44, 5);
      c.fillStyle = '#c8ccd2'; c.fillRect(w / 2 - 6, 22, 3, 34);
      c.fillStyle = '#1a1a1e'; c.fillRect(w / 2 - 3, 62, 6, 8);
    });
    // barrel: banded oak
    this.canvasTex('prop-barrel', 68, 92, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#2a160a'); g.addColorStop(0.3, '#7a4a24'); g.addColorStop(0.55, '#9a6232'); g.addColorStop(1, '#2a160a');
      c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); c.fill();
      c.fillRect(4, 8, w - 8, h - 16);
      c.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 12; x < w - 8; x += 11) c.fillRect(x, 6, 2, h - 12);
      for (const y of [16, h / 2 - 3, h - 22]) { c.fillStyle = '#3a3a40'; c.fillRect(3, y, w - 6, 7); c.fillStyle = '#7a7a84'; c.fillRect(3, y, w - 6, 2); }
      c.fillStyle = '#5a3418'; c.beginPath(); c.ellipse(w / 2, 9, w / 2 - 6, 6, 0, 0, Math.PI * 2); c.fill();
    });
    // crate: planks and iron corners
    this.canvasTex('prop-crate', 84, 80, (c, w, h) => {
      c.fillStyle = '#6a4220'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? '#7a4e28' : '#5e3a1c'; c.fillRect(2, y + 2, w - 4, 13); }
      c.strokeStyle = '#3a2210'; c.lineWidth = 6; c.beginPath(); c.moveTo(6, 6); c.lineTo(w - 6, h - 6); c.stroke();
      c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#5a5a62'; for (const [x, y] of [[0, 0], [w - 12, 0], [0, h - 12], [w - 12, h - 12]]) c.fillRect(x, y, 12, 12);
    });
    // urn: clay funerary urn
    this.canvasTex('prop-urn', 48, 72, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#3a1e14'); g.addColorStop(0.4, '#9a5a3a'); g.addColorStop(1, '#2a140c');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(14, 4); c.lineTo(34, 4); c.lineTo(32, 14); c.bezierCurveTo(52, 26, 50, 58, 36, h - 4); c.lineTo(12, h - 4); c.bezierCurveTo(-2, 58, -4, 26, 16, 14); c.closePath(); c.fill();
      c.fillStyle = '#d8b080'; c.fillRect(8, 34, 32, 3); c.fillStyle = '#2a140c'; c.fillRect(14, 2, 20, 4);
    });
    // the cracked section of back wall (hides the shrine)
    this.canvasTex('prop-wall', 180, 260, (c, w, h) => {
      // old dressed stone: every block its own tone, lit from the upper left (pale top
      // and left edge, dark bottom and right), pitted, with soot gathering low down
      c.fillStyle = '#16110e'; c.fillRect(0, 0, w, h); // mortar
      const tones = [[0x5a, 0x50, 0x48], [0x4c, 0x44, 0x3e], [0x66, 0x5a, 0x50], [0x52, 0x4a, 0x46]];
      for (let y = 0; y < h; y += 26) {
        for (let x = (y / 26) % 2 ? -30 : 0; x < w; x += 60) {
          const t = tones[Math.floor(rand(0, tones.length))];
          const dim = 1 - (y / h) * 0.35 + rand(-0.06, 0.06);
          const col = (k) => `rgb(${Math.round(t[0] * dim * k)},${Math.round(t[1] * dim * k)},${Math.round(t[2] * dim * k)})`;
          c.fillStyle = col(1); c.fillRect(x + 2, y + 2, 56, 22);
          c.fillStyle = col(1.3); c.fillRect(x + 2, y + 2, 56, 2); c.fillRect(x + 2, y + 2, 2, 22);
          c.fillStyle = col(0.6); c.fillRect(x + 2, y + 22, 56, 2); c.fillRect(x + 56, y + 2, 2, 22);
          for (let i = 0; i < 7; i++) { c.fillStyle = col(rand(0.7, 0.9)); c.fillRect(x + rand(5, 52), y + rand(5, 19), rand(1, 3), 1); }
          if (Math.random() < 0.3) { c.fillStyle = '#16110e'; c.fillRect(x + (Math.random() < 0.5 ? 2 : 52), y + 2, 6, 5); } // chipped corner
        }
      }
      // the crack: a branching fault with a pale broken edge, loose blocks and dust — it
      // plainly wants hitting
      const crack = (x0, y0, len, wid, drift) => {
        let x = x0;
        const pts = [[x, y0]];
        for (let y = y0; y < y0 + len; y += 14) { x += rand(-12, 12) + drift; pts.push([x, y + 14]); }
        for (const [col, lw, off] of [['#c8b090', wid + 2, -1], ['#0a0605', wid, 0]]) {
          c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
          pts.forEach(([px, py], i) => (i ? c.lineTo(px + off, py) : c.moveTo(px + off, py)));
          c.stroke();
        }
        return pts;
      };
      const main = crack(w * 0.5, 8, h - 30, 5, 0);
      crack(main[4][0], main[4][1], 70, 2, 3.5);
      crack(main[9][0], main[9][1], 60, 2, -3.5);
      c.fillStyle = 'rgba(200,176,144,0.5)';
      for (let i = 0; i < 40; i++) { const [px, py] = main[Math.floor(rand(1, main.length))]; c.fillRect(px + rand(-14, 14), py + rand(-8, 8), 2, 1); }
      // a red glow leaking through from whatever is behind it
      const leak = c.createRadialGradient(w / 2, h * 0.55, 2, w / 2, h * 0.55, 46);
      leak.addColorStop(0, 'rgba(255,60,30,0.35)'); leak.addColorStop(1, 'rgba(255,60,30,0)');
      c.fillStyle = leak; c.fillRect(0, 0, w, h);
    });
    this.canvasTex('alcove', 180, 260, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w * 0.7);
      g.addColorStop(0, '#5a1010'); g.addColorStop(0.6, '#1a0606'); g.addColorStop(1, '#0a0303');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2a201c'; c.fillRect(0, 0, 8, h); c.fillRect(w - 8, 0, 8, h);
    });
    // pickups
    this.canvasTex('pk-mana', 22, 36, (c) => {
      c.fillStyle = '#c8c8d0'; c.fillRect(8, 0, 6, 9); c.fillStyle = '#1a3aaa'; c.beginPath(); c.arc(11, 23, 11, 0, 7); c.fill();
      c.fillStyle = '#6a9aff'; c.beginPath(); c.arc(8, 20, 4, 0, 7); c.fill();
    });
    this.canvasTex('pk-relic', 30, 36, (c) => {
      c.fillStyle = '#b08020'; c.beginPath(); c.moveTo(3, 2); c.lineTo(27, 2); c.lineTo(20, 18); c.lineTo(10, 18); c.closePath(); c.fill();
      c.fillRect(13, 18, 4, 10); c.fillRect(7, 28, 16, 5);
      c.fillStyle = '#ffe080'; c.fillRect(6, 4, 5, 8); c.fillStyle = '#c0161c'; c.fillRect(13, 8, 4, 4);
    });
    // a boss's trophy (data/trophies.js): a gilded reliquary with a blood-red stone
    // (a stand-in until the painted one arrives: docs/campaign art prompts)
    this.canvasTex('pk-trophy', 34, 40, (c, w, h) => {
      c.fillStyle = '#5a3a10'; c.fillRect(5, h - 8, w - 10, 6);
      c.fillStyle = '#c89028'; c.beginPath(); c.moveTo(4, 10); c.lineTo(w - 4, 10); c.lineTo(w - 8, h - 8); c.lineTo(8, h - 8); c.closePath(); c.fill();
      c.fillStyle = '#ffd870'; c.fillRect(7, 12, 4, h - 22);
      c.fillStyle = '#e0b040'; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w - 6, 10); c.lineTo(6, 10); c.closePath(); c.fill();
      c.fillStyle = '#c0161c'; c.beginPath(); c.arc(w / 2, 21, 6, 0, 7); c.fill();
      c.fillStyle = '#ff8a8a'; c.fillRect(w / 2 - 3, 17, 2, 3);
    });
    this.canvasTex('pk-shrine', 70, 80, (c, w, h) => {
      c.fillStyle = '#3a302a'; c.fillRect(8, 40, w - 16, h - 40); c.fillStyle = '#5a4a40'; c.fillRect(4, 36, w - 8, 8);
      c.fillStyle = '#8a0a0a'; c.beginPath(); c.ellipse(w / 2, 36, 22, 7, 0, 0, 7); c.fill();
      c.fillStyle = '#ff3a2a'; c.beginPath(); c.ellipse(w / 2, 35, 14, 4, 0, 0, 7); c.fill();
      c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(w / 2, 18, 11, 0, 7); c.fill();
      c.fillStyle = '#1a0a0a'; c.fillRect(w / 2 - 6, 15, 4, 4); c.fillRect(w / 2 + 2, 15, 4, 4);
    });
    // fire grate (floor), a soft flame lick, a round glow
    this.canvasTex('grate', 128, 64, (c, w, h) => {
      c.fillStyle = '#120a08'; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, 7); c.fill();
      c.strokeStyle = '#4a4248'; c.lineWidth = 4; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, 7); c.stroke();
      c.lineWidth = 3; for (let x = 18; x < w - 12; x += 13) { c.beginPath(); c.moveTo(x, 8); c.lineTo(x, h - 8); c.stroke(); }
      c.fillStyle = 'rgba(255,90,20,0.35)'; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 12, 0, 0, 7); c.fill();
    });
    // (the village) a burning cart: what its fires erupt from, instead of an iron grate
    this.canvasTex('cartwreck', 128, 64, (c, w, h) => {
      c.fillStyle = '#140c08'; c.beginPath(); c.ellipse(w / 2, h / 2 + 6, w / 2 - 4, h / 2 - 10, 0, 0, 7); c.fill();
      c.fillStyle = '#3a2416'; c.fillRect(12, 18, w - 24, 22);
      c.fillStyle = '#1a100a'; for (let x = 16; x < w - 16; x += 14) c.fillRect(x, 18, 3, 22);
      c.strokeStyle = '#2a1a10'; c.lineWidth = 5; c.beginPath(); c.arc(28, 44, 14, 0, 7); c.stroke(); c.beginPath(); c.arc(w - 28, 44, 14, 0, 7); c.stroke();
      c.fillStyle = 'rgba(255,110,30,0.45)'; c.fillRect(16, 22, w - 32, 4);
    });
    // (the village) a fallen burning beam across a door: smash it (PROPS.wreckage)
    this.canvasTex('prop-wreckage', 176, 112, (c, w, h) => {
      const beam = (x0, y0, x1, y1, t) => {
        c.save(); c.translate(x0, y0); c.rotate(Math.atan2(y1 - y0, x1 - x0));
        const L = Math.hypot(x1 - x0, y1 - y0);
        c.fillStyle = '#2a1a10'; c.fillRect(0, -t / 2, L, t);
        c.fillStyle = '#120a06'; c.fillRect(0, -t / 2, L, 4);
        c.fillStyle = 'rgba(255,120,40,0.85)'; for (let x = 10; x < L - 6; x += 23) c.fillRect(x, -t / 2 + 6, 9, 3);
        c.fillStyle = 'rgba(255,200,120,0.7)'; for (let x = 22; x < L - 6; x += 37) c.fillRect(x, 1, 5, 2);
        c.restore();
      };
      beam(4, h - 20, w - 6, 26, 26);
      beam(10, 30, w - 14, h - 14, 22);
      c.fillStyle = '#1a120c'; c.fillRect(0, h - 14, w, 14);
    });
    // (the village barn) planks nailed across a doorway, two posts and the boards between,
    // scorched at the ends; broken: the posts' stumps, a board hanging by a nail, the rest
    // down in the dirt (PROPS.barricade). Drawn at twice its size, like the others.
    const barricade = (c, w, h, broken) => {
      const board = (x, y, L, t, ang, seed) => {
        c.save(); c.translate(x, y); c.rotate(ang);
        const g = c.createLinearGradient(0, -t / 2, 0, t / 2);
        g.addColorStop(0, '#6a4a2c'); g.addColorStop(0.45, '#4e3420'); g.addColorStop(1, '#2a1a0e');
        c.fillStyle = g; c.fillRect(-L / 2, -t / 2, L, t);
        c.fillStyle = 'rgba(20,10,4,0.45)'; // grain
        for (let i = 0; i < 4; i++) c.fillRect(-L / 2 + 6, -t / 2 + 4 + i * (t - 8) / 3, L - 12, 1.5);
        c.fillStyle = 'rgba(160,120,80,0.25)'; c.fillRect(-L / 2, -t / 2, L, 2); // the lit top edge
        // charred, glowing ends (the barn's burning)
        for (const e of [-1, 1]) {
          const cg = c.createLinearGradient(e * L / 2, 0, e * (L / 2 - 26), 0);
          cg.addColorStop(0, '#0e0806'); cg.addColorStop(1, 'rgba(14,8,6,0)');
          c.fillStyle = cg; c.fillRect(e > 0 ? L / 2 - 26 : -L / 2, -t / 2, 26, t);
        }
        if (seed % 2) { c.fillStyle = 'rgba(255,110,30,0.7)'; c.fillRect(L / 2 - 12, -t / 2 + 4, 6, 2); }
        c.fillStyle = '#1a1612'; for (const nx of [-L / 2 + 12, L / 2 - 14]) { c.beginPath(); c.arc(nx, 0, 3, 0, 7); c.fill(); } // nails
        c.restore();
      };
      const post = (x, top) => {
        const g = c.createLinearGradient(x - 9, 0, x + 9, 0);
        g.addColorStop(0, '#22160c'); g.addColorStop(0.5, '#4a3220'); g.addColorStop(1, '#1a1008');
        c.fillStyle = g; c.fillRect(x - 9, top, 18, h - top);
        c.fillStyle = '#0e0806'; c.beginPath(); c.moveTo(x - 9, top); c.lineTo(x - 2, top - 8); c.lineTo(x + 4, top + 2); c.lineTo(x + 9, top - 4); c.lineTo(x + 9, top + 6); c.lineTo(x - 9, top + 6); c.fill();
      };
      if (!broken) {
        post(14, 10); post(w - 14, 14);
        board(w / 2, h * 0.24, w - 8, 24, -0.05, 1);
        board(w / 2, h * 0.5, w + 4, 26, 0.04, 2);
        board(w / 2, h * 0.76, w - 14, 24, -0.02, 3);
        board(w / 2, h * 0.5, Math.hypot(w, h) * 0.86, 22, Math.atan2(h * 0.7, w), 5); // the brace, corner to corner
      } else {
        post(14, h * 0.62); post(w - 14, h * 0.7);
        board(w - 30, h * 0.6, w * 0.5, 22, 1.1, 1); // hanging off the right post by a nail
        board(w * 0.42, h - 12, w * 0.8, 20, 0.06, 2);
        board(w * 0.6, h - 26, w * 0.6, 18, -0.18, 3);
      }
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, h - 6, w, 6);
    };
    const B = PROPS.barricade;
    this.canvasTex('prop-barricade', B.w * 2, B.h * 2, (c, w, h) => barricade(c, w, h, false));
    this.canvasTex('prop-barricade-broken', B.w * 2, B.h * 2, (c, w, h) => barricade(c, w, h, true));
    // (the wood) the convoy's prisoner wagon: black iron plates, barred windows with faces
    // at them, the king's black and crimson banner; and the same wrecked (PROPS.wagon)
    const wagon = (c, w, h, wrecked) => {
      c.save();
      if (wrecked) { c.translate(w / 2, h); c.rotate(-0.12); c.translate(-w / 2, -h); }
      const bed = h - 70;
      c.fillStyle = '#18161a'; c.fillRect(22, 40, w - 44, bed - 40); // the box
      c.fillStyle = '#26232a'; for (let x = 30; x < w - 40; x += 58) c.fillRect(x, 46, 50, bed - 52); // plates
      c.fillStyle = '#0c0b0e'; for (let x = 30; x < w - 40; x += 58) for (const y of [52, bed - 18]) c.fillRect(x + 4, y, 3, 3); // rivets
      // barred windows: dark, faces pressed to them while it rolls
      for (let x = 70; x < w - 90; x += 110) {
        c.fillStyle = wrecked ? '#000000' : '#2a1a14'; c.fillRect(x, 70, 54, 40);
        if (!wrecked) { c.fillStyle = '#8a6a50'; c.beginPath(); c.arc(x + 18, 92, 9, 0, 7); c.fill(); c.beginPath(); c.arc(x + 38, 94, 8, 0, 7); c.fill(); }
        c.fillStyle = '#4a4650'; for (let b = x + 6; b < x + 54; b += 12) c.fillRect(b, 70, 4, 40);
      }
      c.fillStyle = '#100e12'; c.fillRect(12, 30, w - 24, 14); c.fillRect(12, bed - 6, w - 24, 14); // roof rim and bed
      // the banner on its pole at the front
      c.fillStyle = '#2a1a10'; c.fillRect(w - 40, 0, 6, bed);
      c.fillStyle = '#5a0a12'; c.fillRect(w - 76, 6, 36, 50); c.fillStyle = '#0a0808'; c.fillRect(w - 76, 22, 36, 10);
      c.restore();
      // the wheels (one smashed when wrecked)
      const wheel = (x, broken) => {
        c.strokeStyle = '#2a1e14'; c.lineWidth = 9; c.beginPath();
        if (broken) c.arc(x, h - 30, 28, 0.6, 3.6); else c.arc(x, h - 30, 28, 0, 7);
        c.stroke();
        c.lineWidth = 4; for (let a = 0; a < (broken ? 3 : 8); a++) { c.beginPath(); c.moveTo(x, h - 30); c.lineTo(x + Math.cos(a * 0.8) * 26, h - 30 + Math.sin(a * 0.8) * 26); c.stroke(); }
        c.fillStyle = '#4a4650'; c.beginPath(); c.arc(x, h - 30, 7, 0, 7); c.fill();
      };
      wheel(70, false); wheel(w - 80, wrecked);
      if (wrecked) { c.fillStyle = '#000000'; c.fillRect(24, 48, 40, bed - 56); } // the back door hanging open
    };
    // (the mine) a post with a captive's chain on it; the stump once broken (PROPS.shackle)
    this.canvasTex('prop-shackle', 80, 180, (c, w, h) => {
      c.fillStyle = '#3a2616'; c.fillRect(w / 2 - 10, 10, 20, h - 10);
      c.fillStyle = '#5a3c22'; c.fillRect(w / 2 + 4, 10, 4, h - 10);
      c.fillStyle = '#6a6a72'; c.fillRect(w / 2 - 14, h - 70, 28, 10); // the iron band
      c.strokeStyle = '#8a8a92'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(w / 2 + 14 + i * 8, h - 60 + i * 9, 5, 3, 0.6, 0, 7); c.stroke(); }
    });
    this.canvasTex('prop-shackle-broken', 80, 180, (c, w, h) => {
      c.fillStyle = '#3a2616'; c.beginPath(); c.moveTo(w / 2 - 10, h); c.lineTo(w / 2 - 10, h - 50); c.lineTo(w / 2, h - 40); c.lineTo(w / 2 + 10, h - 58); c.lineTo(w / 2 + 10, h); c.fill();
      c.fillStyle = '#6a6a72'; c.fillRect(w / 2 + 14, h - 8, 26, 6);
    });
    // (the mine) the counterweight: a dressed stone hung on a chain that runs up over a
    // wheel to the portcullis; broken: the chain snapped, the stone dropped and split
    this.canvasTex('prop-counterweight', 160, 260, (c, w, h) => {
      c.fillStyle = '#7a7a82'; c.fillRect(w / 2 - 3, 0, 6, h - 120);
      c.fillStyle = '#45464c'; c.fillRect(20, h - 130, w - 40, 120);
      c.fillStyle = '#5a5b62'; c.fillRect(24, h - 126, w - 48, 10);
      c.fillStyle = '#2a2b30'; for (let y = h - 100; y < h - 14; y += 30) c.fillRect(20, y, w - 40, 3);
      c.fillStyle = '#8a8a92'; c.fillRect(w / 2 - 14, h - 140, 28, 14);
    });
    this.canvasTex('prop-counterweight-broken', 160, 260, (c, w, h) => {
      c.fillStyle = '#45464c'; c.fillRect(10, h - 60, w / 2 - 14, 60); c.fillRect(w / 2 + 4, h - 50, w / 2 - 14, 50);
      c.fillStyle = '#7a7a82'; c.fillRect(w / 2 - 2, h - 90, 4, 40);
    });
    // (the mine) a fall of rock in front of a passage; dug out: a few stones left
    const rubble = (c, w, h, n, hi) => {
      let k = 77; const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
      for (let i = 0; i < n; i++) {
        const x = 20 + r() * (w - 40); const y = h - r() * hi; const rad = 12 + r() * 26;
        c.fillStyle = r() < 0.5 ? '#3a3c42' : '#55565c'; c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.4, 0, 7); c.fill();
      }
    };
    this.canvasTex('prop-rubble', 240, 190, (c, w, h) => rubble(c, w, h, 26, 150));
    this.canvasTex('prop-rubble-broken', 240, 190, (c, w, h) => rubble(c, w, h, 8, 30));
    // (the Shattered Ascent) a siege catapult: a timber frame on wheels, the throwing arm
    // cocked back, a sling with a stone in it; wrecked: the frame split, the arm snapped
    const catapult = (c, w, h, wrecked) => {
      const base = h - 30;
      c.fillStyle = '#3a2616';
      if (!wrecked) {
        c.fillRect(20, base - 16, w - 40, 16); // the bed
        c.save(); c.translate(w * 0.42, base - 90); c.rotate(-0.15); c.fillRect(-10, 0, 20, 90); c.restore(); // the uprights
        c.fillRect(w * 0.62, base - 80, 18, 80);
        c.fillStyle = '#4a3220'; c.fillRect(w * 0.3, base - 96, w * 0.42, 12); // the crossbar
        c.save(); c.translate(w * 0.56, base - 30); c.rotate(-1.05); // the arm, cocked back
        c.fillStyle = '#5a3c22'; c.fillRect(-6, -150, 12, 170);
        c.fillStyle = '#2a1c12'; c.beginPath(); c.ellipse(0, -156, 18, 10, 0, 0, 7); c.fill(); // the sling
        c.fillStyle = '#6a6a72'; c.beginPath(); c.arc(0, -162, 13, 0, 7); c.fill(); // the stone in it
        c.restore();
        c.strokeStyle = '#8a7a60'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.3, base - 16); c.lineTo(w * 0.5, base - 40); c.stroke(); // the winch rope
      } else {
        c.fillRect(14, base - 10, w * 0.4, 12); c.fillRect(w * 0.52, base - 6, w * 0.4, 10);
        c.save(); c.translate(w * 0.3, base - 14); c.rotate(-0.4); c.fillRect(0, -6, 110, 10); c.restore(); // the snapped arm
        c.fillStyle = '#4a3220'; c.fillRect(w * 0.6, base - 40, 14, 34);
        c.fillStyle = '#6a6a72'; c.beginPath(); c.arc(w * 0.82, base - 6, 12, 0, 7); c.fill();
      }
      const wheel = (x) => { c.fillStyle = '#2a1c12'; c.beginPath(); c.arc(x, base + 6, 22, 0, 7); c.fill(); c.fillStyle = '#4a3220'; c.beginPath(); c.arc(x, base + 6, 7, 0, 7); c.fill(); };
      wheel(48); if (!wrecked) wheel(w - 52);
    };
    this.canvasTex('prop-catapult', 300, 260, (c, w, h) => catapult(c, w, h, false));
    this.canvasTex('prop-catapult-broken', 300, 260, (c, w, h) => catapult(c, w, h, true));
    // an Ashen war arrow, its head to the right (drawn at 2x, shown at ARROWS.scale): an ash
    // shaft lit along its top, a long iron bodkin bound on with sinew, three feathers (two
    // grey goose, the cock feather dyed Ashen red) with their barbs, a horn nock
    this.canvasTex('arrow-fly', ARROWS.texW, ARROWS.texH, (c, w, h) => {
      // the painted arrow when it's in (assets/fx/arrow.png, ChatGPT): fitted to the width,
      // its head at the right edge like the drawn one
      if (this.scene.textures.exists('arrow-src')) {
        const img = this.scene.textures.get('arrow-src').getSourceImage();
        const ah = Math.min(h, (w * img.height) / img.width);
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
        c.drawImage(img, 0, (h - ah) / 2, w, ah);
        return;
      }
      const m = h / 2;
      const sg = c.createLinearGradient(0, m - 3, 0, m + 3);
      sg.addColorStop(0, '#e2bd84'); sg.addColorStop(0.45, '#a8773f'); sg.addColorStop(1, '#4e3018');
      c.fillStyle = sg; c.fillRect(10, m - 2.5, 118, 5); // the shaft
      c.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 30; x < 120; x += 23) c.fillRect(x, m - 1, 6, 1); // its grain
      // the head: a long four-sided bodkin, dark iron, a cold edge of light along it
      const hg = c.createLinearGradient(0, m - 6, 0, m + 6);
      hg.addColorStop(0, '#c8ced8'); hg.addColorStop(0.35, '#6a707c'); hg.addColorStop(1, '#22242a');
      c.fillStyle = hg; c.beginPath(); c.moveTo(124, m - 5); c.lineTo(146, m - 3); c.lineTo(159, m); c.lineTo(146, m + 3); c.lineTo(124, m + 5); c.closePath(); c.fill();
      c.strokeStyle = '#eef2f8'; c.lineWidth = 1; c.beginPath(); c.moveTo(127, m - 4); c.lineTo(156, m - 0.5); c.stroke();
      c.fillStyle = '#3a2416'; c.fillRect(118, m - 3.5, 8, 7); // the sinew binding
      c.strokeStyle = '#6a4a30'; c.beginPath(); for (let x = 119; x < 126; x += 2) { c.moveTo(x, m - 3.5); c.lineTo(x + 1, m + 3.5); } c.stroke();
      // the fletching: swept-back vanes, barbs drawn in
      const vane = (dir, col, dark) => {
        c.fillStyle = col; c.beginPath();
        c.moveTo(52, m - dir * 2); c.quadraticCurveTo(30, m - dir * 4, 14, m - dir * 11);
        c.quadraticCurveTo(10, m - dir * 7, 9, m - dir * 2); c.closePath(); c.fill();
        c.strokeStyle = dark; c.lineWidth = 1; c.beginPath();
        for (let x = 14; x < 50; x += 4) { const t = (x - 9) / 43; c.moveTo(x, m - dir * 2); c.lineTo(x - 5, m - dir * (2 + 8 * (1 - t))); }
        c.stroke();
      };
      vane(1, '#c9c0ae', 'rgba(70,60,50,0.5)');
      vane(-1, '#8e1e16', 'rgba(30,6,4,0.6)');
      c.fillStyle = '#d8cfbd'; c.fillRect(12, m - 1.5, 38, 3); // the third feather, edge-on
      c.fillStyle = '#e8dcc0'; c.fillRect(2, m - 3, 8, 6); c.fillStyle = '#2a1a10'; c.fillRect(2, m - 1, 4, 2); // the horn nock
    });
    // an Ashen archer post: a timber hoarding on four legs, a plank mantlet across its front,
    // three bowmen behind it (hooded heads, bows drawn, arrows nocked) and a scorched red
    // pennant; wrecked: the legs kicked out, the mantlet down in splinters, the bows dropped
    const archers = (c, w, h, wrecked) => {
      const base = h - 12;
      const plank = (x, y, pw, ph, tone) => { c.fillStyle = tone; c.fillRect(x, y, pw, ph); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + ph - 3, pw, 3); };
      if (!wrecked) {
        const deck = base - 92;
        c.fillStyle = '#2e1e12';
        for (const x of [w * 0.16, w * 0.38, w * 0.62, w * 0.84]) c.fillRect(x - 6, deck, 12, base - deck); // the legs
        c.strokeStyle = '#3a2616'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.16, base - 6); c.lineTo(w * 0.62, deck + 10); c.moveTo(w * 0.84, base - 6); c.lineTo(w * 0.38, deck + 10); c.stroke(); // the braces
        // the bowmen, behind the mantlet: a hooded head and shoulders, a bow drawn up and out
        for (const [i, x] of [w * 0.24, w * 0.5, w * 0.76].entries()) {
          const y = deck - 52 - (i % 2) * 6;
          c.fillStyle = '#5a4a3a'; c.beginPath(); c.ellipse(x, y + 30, 20, 18, 0, 0, 7); c.fill(); // leather shoulders
          c.fillStyle = '#7a1c14'; c.fillRect(x - 18, y + 22, 36, 6); // the Ashen red sash
          c.fillStyle = '#6a6a72'; c.beginPath(); c.arc(x, y + 8, 12, Math.PI, 0); c.fill(); c.fillRect(x - 14, y + 7, 28, 3); // the iron cap
          c.fillStyle = '#c08a66'; c.fillRect(x - 7, y + 10, 14, 10); // the face under it
          c.fillStyle = '#1a1210'; c.fillRect(x - 5, y + 13, 3, 2); // an eye, sighting down the arrow
          c.strokeStyle = '#6a4a26'; c.lineWidth = 4; c.beginPath(); c.arc(x - 26, y + 6, 30, -0.95, 0.95); c.stroke(); // the bow
          c.strokeStyle = '#d8d0c0'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 26 + 30 * Math.cos(-0.95), y + 6 + 30 * Math.sin(-0.95)); c.lineTo(x - 2, y + 14); c.lineTo(x - 26 + 30 * Math.cos(0.95), y + 6 + 30 * Math.sin(0.95)); c.stroke(); // the string, drawn
          c.strokeStyle = '#8a6a40'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 2, y + 14); c.lineTo(x - 62, y + 2); c.stroke(); // the arrow
          c.fillStyle = '#4a4a50'; c.beginPath(); c.moveTo(x - 68, y + 1); c.lineTo(x - 58, y - 3); c.lineTo(x - 59, y + 5); c.fill();
        }
        plank(8, deck - 34, w - 16, 14, '#5a3c22'); // the mantlet: rail and planks
        for (let x = 10; x < w - 10; x += 22) plank(x, deck - 22, 20, 30, x % 44 ? '#4a3220' : '#53381f');
        plank(0, deck + 6, w, 12, '#3a2616'); // the deck's edge
        c.fillStyle = '#2a1c12'; c.fillRect(w - 18, deck - 120, 5, 90); // the pennant
        c.fillStyle = '#7a1c14'; c.beginPath(); c.moveTo(w - 13, deck - 118); c.lineTo(w + 0 - 52, deck - 106); c.lineTo(w - 13, deck - 92); c.fill();
      } else {
        c.fillStyle = '#2e1e12';
        c.save(); c.translate(w * 0.2, base); c.rotate(-1.2); c.fillRect(0, -6, 80, 11); c.restore(); // a leg, kicked out
        c.fillRect(w * 0.7, base - 40, 11, 40);
        c.save(); c.translate(w * 0.05, base - 18); c.rotate(0.12); plank(0, 0, w * 0.55, 14, '#4a3220'); c.restore(); // the mantlet, down
        c.save(); c.translate(w * 0.45, base - 30); c.rotate(-0.25); plank(0, 0, w * 0.5, 12, '#3a2616'); c.restore();
        for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#5a3c22' : '#3a2616'; c.save(); c.translate(20 + i * 28, base - 6 - (i % 3) * 5); c.rotate((i % 4) - 1.5); c.fillRect(0, 0, 22, 5); c.restore(); } // splinters
        c.strokeStyle = '#6a4a26'; c.lineWidth = 4; c.beginPath(); c.arc(w * 0.6, base - 6, 28, Math.PI + 0.4, Math.PI * 2 - 0.4); c.stroke(); // a dropped bow
        c.fillStyle = '#7a1c14'; c.fillRect(w * 0.78, base - 8, 34, 8); // the pennant in the dirt
      }
    };
    // (drawn at 280 x 270, scaled up: the bowmen must read from across the yard)
    this.canvasTex('prop-archers', 364, 351, (c) => { c.scale(1.3, 1.3); archers(c, 280, 270, false); });
    this.canvasTex('prop-archers-broken', 364, 351, (c) => { c.scale(1.3, 1.3); archers(c, 280, 270, true); });
    // (the Iron Gates) the gate winch: an iron-bound drum on a timber frame, the gate chain
    // wound on it and running up out of sight; broken: the frame split, the chain gone slack
    const winch = (c, w, h, broken) => {
      const base = h - 10;
      c.fillStyle = '#3a2616';
      if (!broken) {
        c.fillRect(14, base - 110, 16, 110); c.fillRect(w - 30, base - 110, 16, 110); // the frame
        c.fillRect(8, base - 12, w - 16, 12);
        c.fillStyle = '#2a2a30'; c.fillRect(22, base - 96, w - 44, 50); // the drum
        c.fillStyle = '#5a5a62'; for (let x = 26; x < w - 26; x += 8) c.fillRect(x, base - 94, 4, 46); // the chain wound on it
        c.fillStyle = '#7a7a82'; c.fillRect(w / 2 - 4, 0, 8, base - 96); // the chain, taut, running up
        c.fillStyle = '#8a8a92'; for (let y = 4; y < base - 96; y += 14) c.fillRect(w / 2 - 6, y, 12, 6);
        c.fillStyle = '#4a3220'; c.fillRect(w - 26, base - 76, 34, 8); // the crank
      } else {
        c.fillRect(10, base - 40, 16, 40); c.save(); c.translate(w - 30, base); c.rotate(0.5); c.fillRect(0, -70, 16, 70); c.restore();
        c.fillRect(8, base - 10, w * 0.5, 10);
        c.fillStyle = '#2a2a30'; c.fillRect(30, base - 40, w - 70, 34);
        c.strokeStyle = '#6a6a72'; c.lineWidth = 4; c.beginPath(); c.moveTo(w * 0.3, base - 4); c.quadraticCurveTo(w * 0.6, base - 30, w * 0.9, base - 2); c.stroke(); // the slack chain
      }
    };
    this.canvasTex('prop-winch', 220, 300, (c, w, h) => winch(c, w, h, false));
    this.canvasTex('prop-winch-broken', 220, 300, (c, w, h) => winch(c, w, h, true));
    this.canvasTex('prop-wagon', 420, 240, (c, w, h) => wagon(c, w, h, false));
    this.canvasTex('prop-wagon-broken', 420, 240, (c, w, h) => wagon(c, w, h, true));
    // (the Black Keep) the Ash Mill's drive pins: an iron pin through the hub's gearing, its
    // gear teeth round it; broken: snapped off, the gear tilted
    const pin = (c, w, h, broken) => {
      const base = h - 8;
      c.fillStyle = '#2a2a30';
      if (!broken) {
        c.fillRect(w / 2 - 12, base - 170, 24, 170); // the pin
        c.fillStyle = '#5a5a62'; c.fillRect(w / 2 - 6, base - 168, 5, 166);
        c.fillStyle = '#3a3a42'; c.beginPath(); c.arc(w / 2, base - 60, 46, 0, 7); c.fill(); // the gear
        c.fillStyle = '#2a2a30'; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; c.fillRect(w / 2 + Math.cos(a) * 46 - 7, base - 60 + Math.sin(a) * 46 - 7, 14, 14); }
        c.fillStyle = '#ff7a30'; c.beginPath(); c.arc(w / 2, base - 60, 8, 0, 7); c.fill(); // forge-hot at the axle
      } else {
        c.fillRect(w / 2 - 12, base - 50, 24, 50);
        c.save(); c.translate(w / 2 + 30, base - 10); c.rotate(1.2); c.fillRect(0, -12, 110, 24); c.restore(); // the snapped pin
        c.fillStyle = '#3a3a42'; c.beginPath(); c.ellipse(w / 2, base - 14, 50, 16, 0, 0, 7); c.fill();
      }
    };
    this.canvasTex('prop-pin', 160, 200, (c, w, h) => pin(c, w, h, false));
    this.canvasTex('prop-pin-broken', 160, 200, (c, w, h) => pin(c, w, h, true));
    // (the Black Keep) an ember conduit: a black iron pillar running with forge fire, feeding it
    // up to the King; broken: split open, the fire guttering out
    const conduit = (c, w, h, broken) => {
      const base = h - 8;
      if (!broken) {
        c.fillStyle = '#1a1618'; c.fillRect(w / 2 - 26, 10, 52, base - 10);
        const g = c.createLinearGradient(0, 10, 0, base); g.addColorStop(0, '#ffd080'); g.addColorStop(0.5, '#ff6a20'); g.addColorStop(1, '#8a1a08');
        c.fillStyle = g; c.fillRect(w / 2 - 10, 14, 20, base - 20); // the fire inside, through its slot
        c.fillStyle = '#3a3a42'; for (let y = 30; y < base; y += 60) c.fillRect(w / 2 - 30, y, 60, 10); // its bands
      } else {
        c.fillStyle = '#1a1618'; c.fillRect(w / 2 - 26, base - 80, 52, 80);
        c.save(); c.translate(w / 2 + 20, base - 20); c.rotate(1.3); c.fillRect(0, -24, 150, 48); c.restore();
        c.fillStyle = '#ff6a20'; c.fillRect(w / 2 - 8, base - 70, 16, 10);
      }
    };
    this.canvasTex('prop-conduit', 140, 380, (c, w, h) => conduit(c, w, h, false));
    this.canvasTex('prop-conduit-broken', 140, 380, (c, w, h) => conduit(c, w, h, true));
    // (the Black Keep) a spire of the colossus's crown: black stone, gold-veined, ember at its
    // root; broken: the stump and the fallen point
    const spire = (c, w, h, broken) => {
      const base = h - 8;
      if (!broken) {
        c.fillStyle = '#16121a'; c.beginPath(); c.moveTo(w / 2 - 34, base); c.lineTo(w / 2 + 34, base); c.lineTo(w / 2, 6); c.fill();
        c.strokeStyle = '#c8a040'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2 - 10, base - 20); c.lineTo(w / 2, 40); c.lineTo(w / 2 + 12, base - 30); c.stroke();
        c.fillStyle = '#ff7a30'; c.fillRect(w / 2 - 30, base - 12, 60, 8);
      } else {
        c.fillStyle = '#16121a'; c.beginPath(); c.moveTo(w / 2 - 34, base); c.lineTo(w / 2 + 34, base); c.lineTo(w / 2 + 10, base - 60); c.lineTo(w / 2 - 14, base - 50); c.fill();
        c.save(); c.translate(w / 2 + 40, base - 6); c.rotate(1.4); c.beginPath(); c.moveTo(-20, 0); c.lineTo(20, 0); c.lineTo(0, -120); c.fill(); c.restore();
      }
    };
    this.canvasTex('prop-spire', 160, 320, (c, w, h) => spire(c, w, h, false));
    this.canvasTex('prop-spire-broken', 160, 320, (c, w, h) => spire(c, w, h, true));
    this.canvasTex('flame', 32, 64, (c, w, h) => {
      const g = c.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.35, 'rgba(255,150,40,0.95)'); g.addColorStop(0.75, 'rgba(220,40,10,0.6)'); g.addColorStop(1, 'rgba(120,10,0,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(w / 2, 0); c.bezierCurveTo(w, h * 0.5, w * 0.9, h, w / 2, h); c.bezierCurveTo(w * 0.1, h, 0, h * 0.5, w / 2, 0); c.fill();
    });
    this.canvasTex('glow', 64, 64, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
  }

  // ------------------------------------------------------------ sections

  // A section's own paving, tiled from x0 to x1 and faded out over `fade` px at each end
  // (drawn once into a canvas at the game's render scale, so it costs one image)
  fadedGround(key, src, x0, x1, top, h, s, fade, tint) {
    const R = SETTINGS.renderScale ?? 1;
    const w = x1 - x0 + fade * 2;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * R); cv.height = Math.ceil(h * R);
    const c = cv.getContext('2d');
    const tw = src.width * s * R; const th = cv.height;
    for (let x = -((x0 - fade) * R % tw); x < cv.width; x += tw) c.drawImage(src, Math.floor(x), 0, Math.ceil(tw) + 1, th);
    c.globalCompositeOperation = 'destination-in';
    const g = c.createLinearGradient(0, 0, cv.width, 0);
    const f = (fade * 2) / w;
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, 'rgba(0,0,0,1)');
    g.addColorStop(1 - f, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
    const tex = `${key}-fade-${x0}`;
    if (this.scene.textures.exists(tex)) this.scene.textures.remove(tex);
    this.scene.textures.addCanvas(tex, cv);
    return this.scene.add.image(x0 - fade, top, tex).setOrigin(0).setScale(1 / R).setDepth(DEPTH.floor + 0.4).setTint(tint);
  }

  // Each section gets its own floor art, a darkness wash (deeper the further in you go)
  // and pools of coloured light, so the five read as different places.
  buildSections() {
    const scene = this.scene;
    const W = SETTINGS.world;
    const H = SETTINGS.height;
    const grounds = scene.registry.get('grounds') ?? [];
    const top = W.floorTop - 50;
    for (const sec of this.stage.sections) {
      const width = sec.x1 - sec.x0;
      if (grounds.includes(sec.ground)) {
        const key = `ground-${sec.ground}`;
        const src = scene.textures.get(key).getSourceImage();
        const s = (H - top) / src.height;
        const b = Math.round(255 * (SETTINGS.ground.brightness ?? 1));
        const tint = Phaser.Display.Color.GetColor(b, b, b);
        // `groundFade`: its own paving melts into the level's street at both ends instead of
        // starting on a ruled line (the village's sections: Nick's level 1 review, 2026-11-03)
        if (sec.groundFade) this.fadedGround(key, src, sec.x0, sec.x1, top, H - top, s, sec.groundFade, tint);
        else scene.add.tileSprite(sec.x0, top, width, H - top, key).setOrigin(0).setDepth(DEPTH.floor + 1.5)
          .setTileScale(s, s).setTint(tint);
      }
      // darkness over the back wall and floor (not the fighters)
      // (it stops short of the next section: the two moods are blended across the join below,
      // so no hard vertical edge shows against the sky)
      const BLEND = 160;
      const i = this.stage.sections.indexOf(sec);
      const next = this.stage.sections[i + 1];
      const mood = sec.mood ?? 0.15;
      const from = sec.x0 + (i > 0 ? BLEND : 0);
      const to = sec.x1 - (next ? BLEND : 0);
      scene.add.rectangle(from, -40, to - from, H + 80, 0x000000, mood).setOrigin(0).setDepth(DEPTH.floor + 3);
      if (next) {
        const g = scene.add.graphics().setDepth(DEPTH.floor + 3);
        const n = 40;
        const w = (BLEND * 2) / n;
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          const e = t * t * (3 - 2 * t);
          g.fillStyle(0x000000, mood + ((next.mood ?? 0.15) - mood) * e).fillRect(sec.x1 - BLEND + k * w, -40, w, H + 80);
        }
      }
      // the section's light: big soft pools along the back wall
      for (let x = sec.x0 + 160; x < sec.x1; x += 420) {
        scene.add.image(x, W.floorTop - 70, 'glow').setScale(7, 5).setTint(sec.light ?? 0xffa060).setAlpha(0.22)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor + 3.2);
      }
      // soot over the floor where one paving gives way to the next: darkest on the join,
      // fading to nothing either side (floor only: over the sky it read as a grey bar)
      if (sec.x0 > 0) {
        const seam = scene.add.graphics().setDepth(DEPTH.floor + 3.1);
        const half = 110;
        for (let k = -half; k < half; k += 2) {
          const t = 1 - Math.abs(k + 1) / half;
          seam.fillStyle(0x000000, 0.55 * t * t * (3 - 2 * t)).fillRect(sec.x0 + k, top, 2, H + 80 - top);
        }
      }
    }
  }

  // ------------------------------------------------------------ props

  makeProp(pr) {
    // (the wood's notched pine and log pile: drawn by view/WoodTrapsView.js)
    if (pr.kind === 'pine' || pr.kind === 'logpile') return { img: this.scene.add.image(pr.x, pr.z, '__DEFAULT').setVisible(false), s: 1, own: true };
    if (pr.kind === 'lamppost' || pr.kind === 'haycart') return this.makeStreetProp(pr);
    const key = this.propKey(pr);
    // (a level's painted prop, data/levelArt.js: sized to the prop, whatever size it was painted)
    const lvl = (this.scene.registry.get('levelArt') ?? []).includes(key);
    // (a painted look: drawn exactly as tall as the game holds it, data/stage.js PROP_LOOKS)
    const fit = !lvl && PROP_LOOKS[pr.look] && key === `prop-${pr.look}` ? pr.h : 0;
    const s = lvl ? (pr.w * 1.3) / this.scene.textures.get(key).getSourceImage().width
      : fit ? fit / this.scene.textures.get(key).getSourceImage().height
      : this.hd.has(key) || this.art2.has(key) ? 0.25 : 0.5 * (pr.size ?? 1);
    if (pr.kind === 'wall') {
      // set into the back wall: the alcove waits behind it
      const y = SETTINGS.world.floorTop - 4;
      const alcove = this.scene.add.image(pr.x, y, 'alcove').setOrigin(0.5, 1).setScale(s).setDepth(DEPTH.floor + 2.5).setVisible(false);
      const img = this.scene.add.image(pr.x, y, key).setOrigin(0.5, 1).setScale(s).setDepth(DEPTH.floor + 2.6);
      return { img, alcove, s };
    }
    // (y: up on a ledge, it's drawn on the ledge; its shadow too, just over the ledge's top.
    // `lift`: drawn higher than it's struck, on a doorway painted on the back wall)
    const y = (pr.y ?? 0) + (pr.lift ?? 0);
    const img = this.scene.add.image(pr.x, pr.z - y, key).setOrigin(0.5, 1).setScale(s).setDepth(pr.z);
    const shadow = this.scene.add.ellipse(pr.x, pr.z - y, pr.w * 1.2, 10, 0x000000, 0.35).setDepth(y ? pr.z - 0.3 : DEPTH.shadows).setVisible(!pr.lift);
    const v = { img, shadow, s };
    // sat into the street, not stuck on it (view/propGround.js): the shared crates, barrels
    // and chests in the level's own light, the fire's glow on one side; under everything that
    // stands on the ground, a soft pool of shadow and some grit in place of the flat ring
    if (!pr.lift) {
      if (LIT_PROPS.has(pr.kind)) {
        v.light = propLight(this.stage.data?.id, this.stage.sections[pr.section]?.light);
        lightProp(img, v.light);
        v.rim = rimGlow(this.scene, v.light, pr.x, pr.z - y, img.displayWidth, img.displayHeight, pr.z);
      }
      v.ground = groundUnder(this.scene, pr.x, pr.z - y, Math.min(img.displayWidth, pr.w * 1.4), pr.z, { seed: pr.id });
      shadow.setVisible(false);
    }
    this.siege.setup(pr, v, lvl);
    v.key = key;
    return v;
  }

  // Which painting: the repainted barrels and crates come in several kinds (view/propArt.js),
  // one picked by the prop's id (or named in the level: `look: 'sack'`, 'keg')
  propKey(pr) {
    const base = `prop-${pr.kind}`;
    if ((this.scene.registry.get('levelArt') ?? []).includes(base)) return base; // (a level's own painting of it)
    if (pr.look && this.art2.has(`prop-${pr.look}`)) return `prop-${pr.look}`;
    const kinds = (VARIANTS[pr.kind] ?? []).map((k) => `prop-${k}`).filter((k) => this.art2.has(k));
    return kinds.length ? kinds[(pr.id * 7 + (pr.x >> 4)) % kinds.length] : base;
  }

  // A lamp post with a hay cart just past it (the market square's): drawn together as one
  // painting, ChatGPT's eight frames of the lamp going over onto the cart and the cart burning
  // (view/propArt.js lampcart), so the fall and the fire are painted, not the post turned in code
  makePairs() {
    if (!this.art2.has('lampcart-0')) return;
    for (const L of this.stage.props) {
      if (L.kind !== 'lamppost') continue;
      const C = this.stage.props.find((q) => q.kind === 'haycart' && q.x - L.x > 50 && q.x - L.x < 180 && Math.abs(q.z - L.z) < 30);
      if (!C) continue;
      const lv = this.propSprites.get(L.id); const cv = this.propSprites.get(C.id);
      const T = this.scene.textures.get('lampcart-0').getSourceImage();
      // (the frame's post foot at the lamp's foot, its cart standing on the cart's line)
      const img = this.scene.add.image(L.x + 5, C.z, 'lampcart-0').setOrigin(PAIR.postX, PAIR.groundY).setScale(PAIR.scale * 256 / T.width).setDepth(C.z);
      if (cv.light) lightProp(img, cv.light); // (in the street's light, as the cart alone is)
      const pair = { img, lamp: L, cart: C, lv, cv, state: 'standing' };
      lv.pair = pair; cv.pair = pair;
      lv.img.setVisible(false); cv.img.setVisible(false);
    }
  }

  pairFrame(pair, i) {
    if (pair.img.active) pair.img.setTexture(`lampcart-${i}`);
  }

  // back to two separate things (the cart smashed first, or the lamp knocked the other way)
  unpair(pair) {
    if (!pair.img.active) return;
    pair.img.destroy();
    pair.lv.pair = null; pair.cv.pair = null;
    if (!pair.lamp.broken) pair.lv.img.setVisible(true);
    else this.shatter.lampLands(pair.lamp, pair.lv, false, true);
    pair.cv.img.setVisible(true);
  }

  // the cart alight: catching, roaring (two frames, flickering), dying down; then burnt out
  syncPairs() {
    for (const pr of this.stage.props) {
      const pair = pr.kind === 'haycart' ? this.propSprites.get(pr.id)?.pair : null;
      if (!pair || pair.state !== 'burning' || !pair.img.active) continue;
      const t = this.scene.time.now - pair.lit;
      const b = this.stage.blazes.find((q) => q.cart === pr);
      const left = b?.left ?? 0;
      const f = t < 350 ? 3 : t < 800 ? 4 : left < 100 ? 6 : 4 + (Math.floor(t / 260) % 2);
      this.pairFrame(pair, f);
      if (pair.img.isTinted && f !== 6) pair.img.clearTint(); // (its own fire lights it)
      if (Math.random() < 0.12) this.scene.gore.spawn({ x: pr.x + rand(-50, 50), z: pr.z, h: rand(40, 110), vx: rand(-15, 15), vz: 0, vh: rand(60, 140), tint: 0xffa040, scale: rand(0.3, 0.6), decal: false, life: rand(25, 45) });
    }
  }

  // big painted pieces thrown off a break: a lid, a panel, a hoop, a wheel (view/propArt.js chunks)
  chunks(pr, dir, power) {
    const keys = (CHUNKS[pr.kind] ?? []).filter((k) => this.art2.has(k));
    if (!keys.length) return;
    const n = Math.min(4, 1 + Math.floor(power / 1.5) + (pr.w > 90 ? 1 : 0));
    for (let i = 0; i < n; i++) {
      this.scene.gore.spawn({
        x: pr.x + rand(-pr.w / 3, pr.w / 3), z: pr.z + rand(-3, 6), h: (pr.y ?? 0) + rand(pr.h * 0.3, pr.h * 0.9),
        vx: dir * rand(60, 200) * (0.7 + power * 0.2) + rand(-60, 60), vz: rand(-30, 40), vh: rand(160, 360),
        tint: 0xffffff, texture: keys[Math.floor(Math.random() * keys.length)], scale: rand(0.27, 0.36), decal: false, life: rand(420, 600), spin: rand(-9, 9), material: PHYSICS.wood,
      });
    }
  }

  // No two alike (Nick, 2026-11-02: "the barrels and crates feel copy and pasted"): each
  // barrel and crate a little bigger or smaller, turned the other way, set a touch askew,
  // weathered lighter or darker. Fixed by its id, so it's the same every time you play.
  vary(pr, v) {
    if (!['barrel', 'crate', 'urn'].includes(pr.kind) || !v?.img) return;
    let h = (pr.id * 2654435761) >>> 0;
    const next = () => { h = (h ^ (h >>> 15)) * 2246822519 >>> 0; return (h & 0xffff) / 0xffff; };
    next(); // (its size is the game's: data/stage.js PROP_LOOKS, stage/Stage.js fitLooks)
    if (next() < 0.5) v.img.setFlipX(true);
    // (set a touch askew, standing on its own: not one with things on it, nor one up on another)
    const bearing = this.stage.props.some((q) => q.under === pr.id);
    v.tilt = bearing || pr.under != null ? 0 : (next() - 0.5) * (pr.kind === 'crate' ? 4 : 2);
    v.img.setAngle(v.tilt);
    if (v.light) {
      const k = 0.8 + next() * 0.22;
      v.light = { ...v.light, top: shade(v.light.top, k), low: shade(v.light.low, k) };
      lightProp(v.img, v.light);
    }
  }

  // The village's lamp posts and hay carts: their paintings are the street clutter's
  // (assets/env/village/decor_lantern.png, the whole half of prop_cart.png)
  makeStreetProp(pr) {
    const lamp = pr.kind === 'lamppost';
    const key = lamp ? 'lvl-village-decor_lantern' : 'cartwreck';
    const T = this.scene.textures;
    const src = T.exists(key) ? T.get(key).getSourceImage() : null;
    const drawW = lamp ? 92 : pr.w * 1.45; // (a lamp post taller than a man: 92 wide, about 185 tall)
    const y = pr.y ?? 0;
    const img = this.scene.add.image(pr.x, pr.z - y, key).setOrigin(0.5, 1).setDepth(pr.z);
    const s = src ? drawW / src.width : 1;
    img.setScale(s);
    if (pr.flip) img.setFlipX(true);
    const v = { img, s };
    v.ground = groundUnder(this.scene, pr.x, pr.z - y - 2, lamp ? drawW * 0.45 : drawW * 0.75, pr.z - 1, { seed: pr.id });
    // (the hay cart in the level's light like the crates and barrels: untinted it stood out
    // bright and clean against the night street; Nick's level 1 review, 2026-11-03)
    if (!lamp) { v.light = propLight(this.stage.data?.id, this.stage.sections[pr.section]?.light); lightProp(img, v.light); }
    if (lamp) {
      // (its flame lights the street round it, flickering, as the street clutter's did)
      const L = this.shatter.lanternAt(v);
      v.glow = this.scene.add.image(L.x, L.y, 'glow').setScale(1.6).setTint(0xff8a30).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(pr.z + 0.1);
      this.scene.tweens.add({ targets: v.glow, alpha: { from: 0.28, to: 0.5 }, duration: 240 + (pr.x % 180), yoyo: true, repeat: -1 });
    }
    return v;
  }

  propHit(pr, dir) {
    const v = this.propSprites.get(pr.id);
    if (v?.own) return;
    // worn down a blow at a time: the painted cracked stage, where there is one (view/propArt.js stages)
    if (v?.key && !pr.tipped && this.art2.has(`${v.key}-cracked`) && v.img.texture.key !== `${v.key}-cracked`) v.img.setTexture(`${v.key}-cracked`);
    if (v?.pair && pr.kind === 'lamppost') this.scene.tweens.add({ targets: v.pair.img, angle: dir * 1.5, duration: 70, yoyo: true });
    if (SHATTER[pr.kind]) {
      // knocked: it rocks on its foot and settles back, a crack of wood
      const base = pr.tipped ? (v.tipped?.dir ?? 1) * 90 : v.spun ?? v.tilt ?? 0;
      v.img.setAngle(base);
      if (!pr.fall && !pr.tumble) this.scene.tweens.add({ targets: v.img, angle: base + dir * (pr.kind === 'lamppost' ? 4 : pr.kind === 'haycart' ? 2 : 7), duration: 70, yoyo: true, ease: 'Quad.easeOut' });
      if (pr.kind === 'lamppost' || pr.kind === 'haycart') {
        playSfx(this.scene, 'doorClose2', { volume: 0.6, pitch: -400 + Math.random() * 300, minGapMs: 0 });
        this.chips(pr, 8, dir);
        return;
      }
    }
    if (pr.kind === 'archers' || pr.kind === 'catapult') this.siege.hit(pr, dir);
    playSfx(this.scene, pr.kind === 'wall' ? 'block' : 'kick', { volume: 0.5, pitch: pr.kind === 'wall' ? -600 : -200, minGapMs: 0 });
    this.scene.tweens.add({ targets: v.img, x: pr.x + dir * 4, duration: 40, yoyo: true, repeat: 1 });
    this.chips(pr, 6, dir);
    if (pr.kind !== 'wall') { if (v.light) lightProp(v.img, v.light, 0.85); else v.img.setTint(0xd8c8b8); } // knocked about: duller, dustier
    if (pr.kind === 'wall') v.img.setTint(0xffffff - 0x101010 * (5 - pr.hp));
  }

  propBreak(pr, dir, blast = false, power = 1) {
    const v = this.propSprites.get(pr.id);
    if (v?.own) return;
    if (pr.kind === 'lamppost') {
      this.chips(pr, 10, dir);
      v.ground?.forEach((g) => g.setAlpha(g.alpha * 0.5));
      // beside its hay cart, struck toward it: the painted fall onto the cart plays (pairFrame)
      if (v.pair && dir > 0 && !v.pair.cart.broken) { v.pair.state = 'falling'; this.pairFrame(v.pair, 1); playSfx(this.scene, 'doorOpen1', { volume: 0.7, pitch: -700, minGapMs: 0 }); return; }
      if (v.pair) this.unpair(v.pair);
      this.shatter.topple(pr, v, dir, 30);
      return;
    }
    if (SHATTER[pr.kind] && v.img?.active) this.chunks(pr, dir, blast ? 3 : power);
    if (pr.kind === 'haycart' && v.pair) this.unpair(v.pair);
    // it bursts into pieces of its own painting, flying the way it was driven (view/PropShatter.js)
    const shard = SHATTER[pr.kind] && v.img?.active && !pr.fly;
    if (shard) {
      v.img.setAngle(0).setOrigin(0.5, 1).setPosition(pr.x, pr.z - (pr.y ?? 0) - (pr.lift ?? 0));
      this.shatter.burst(pr, v.img, dir || 1, blast ? 3 : Math.max(1, power));
      if (power >= 3 || blast) this.scene.fx?.shake(5, 12);
      if (pr.kind === 'haycart') {
        // what's left: the smashed cart, or (alight, or burnt out) the charred one (view/propArt.js street)
        const left = pr.burning || pr.burnt ? 'haycart-burnt' : 'haycart-smashed';
        v.glow?.destroy();
        if (this.art2.has(left)) {
          const w = v.img.displayWidth;
          v.img.setTexture(left).clearTint().setScale(w / this.scene.textures.get(left).getSourceImage().width).setDepth(pr.z - 0.2);
          if (pr.burnt) v.img.setTint(0xb0a090);
          v.img.setScale(v.img.scaleX * 1.15, v.img.scaleY * 0.7);
          this.scene.tweens.add({ targets: v.img, scaleY: v.img.scaleX / 1.15, scaleX: v.img.scaleX / 1.15, duration: 180, ease: 'Back.easeOut' });
        } else v.img.destroy();
        v.ground?.slice(0, 2).forEach((g) => g.setAlpha(g.alpha * 0.4));
        return;
      }
    } else if (SHATTER[pr.kind]) this.shatter.burst(pr, v.img, dir || 1, 3);
    if (pr.kind === 'archers' || pr.kind === 'catapult') this.siege.burst(pr, dir); // (before the wreck goes in: it cuts the chunks from the piece as it stood)
    if (!SHATTER[pr.kind]) playSfx(this.scene, 'kick', { volume: blast ? 1 : 0.8, pitch: blast ? -700 : -400, minGapMs: 0 });
    this.scene.fx?.shake(pr.kind === 'wall' || blast ? 6 : 3, blast ? 14 : 10);
    this.chips(pr, pr.kind === 'wall' ? 40 : blast ? 46 : SHATTER[pr.kind] ? 10 : 18, dir);
    v.img.setAngle(0);
    if (blast) {
      // burst on an enemy: splinters both ways, a ring of dust, a hard flash
      this.chips(pr, 30, -dir);
      this.scene.gore.spark(pr.x, pr.z - pr.h / 2, 26, 0xffd9a0, 22);
      const ring = this.scene.add.ellipse(pr.x, pr.z, 30, 10).setStrokeStyle(3, 0xe8d8c0, 0.8).setDepth(DEPTH.shadows + 0.1);
      this.scene.tweens.add({ targets: ring, scaleX: 6, scaleY: 6, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    // what's left of it stays where it stood: the smashed barrel, the shards, the chest
    // thrown open (painted states from the prop sheet) — not just a vanished object
    const wreck = pr.kind === 'chest' ? 'prop-chest-open' : this.scene.textures.exists(`${v.key}-broken`) ? `${v.key}-broken`
      : pr.kind === 'barrel' && v.key?.includes('tar') ? 'prop-barrel-tar-broken'
      : this.art2.has(`prop-${pr.kind}-v0-broken`) && v.key !== `prop-${pr.kind}` ? `prop-${pr.kind}-v0-broken` : `prop-${pr.kind}-broken`;
    if (this.scene.textures.exists(wreck)) {
      v.img.setTexture(wreck).setOrigin(0.5, 1).setPosition(pr.x, pr.z - (pr.y ?? 0) - (pr.lift ?? 0)).setDepth(pr.z - 0.2).clearTint();
      if (v.light) lightProp(v.img, v.light, 0.9); // (what's left of it, in the same light)
      moveGround(v.ground, pr.x, pr.z - (pr.y ?? 0));
      v.ground?.slice(0, 2).forEach((g) => g.setAlpha(g.alpha * 0.6)); // (lower now: less shadow)
      v.rim?.setPosition(pr.x - v.img.displayWidth * 0.32, pr.z - (pr.y ?? 0) - v.img.displayHeight * 0.4).setAlpha(0.25);
      v.img.setScale(v.s * 1.25, v.s * 0.6);
      this.scene.tweens.add({ targets: v.img, scaleX: v.s, scaleY: v.s, duration: 160, ease: 'Back.easeOut' });
      v.shadow?.setAlpha(0.2);
    } else {
      v.img.destroy();
      v.shadow?.destroy();
      v.rim?.destroy();
    }
    if (v.alcove) {
      v.alcove.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: v.alcove, alpha: 1, duration: 500 });
      this.scene.callout('A HIDDEN SHRINE!', '#ffd24a', 24);
    }
  }

  chips(pr, n, dir) {
    // the painted loose bits (view/propArt.js debris): staves and hoops off a barrel, boards and
    // splinters off a crate or a fence, shards off a pot, glass off a lantern
    const bits = DEBRIS[pr.kind]?.filter((k) => this.art2.has(k));
    if (bits?.length) {
      const gore = this.scene.gore;
      for (let i = 0; i < Math.ceil(n * 0.6); i++) {
        const key = bits[Math.floor(Math.random() * bits.length)];
        gore.spawn({
          x: pr.x + rand(-pr.w / 2, pr.w / 2), z: pr.z + rand(-4, 6), h: (pr.y ?? 0) + rand(8, pr.h),
          vx: dir * rand(40, 240) + rand(-80, 80), vz: rand(-40, 40), vh: rand(120, 360),
          tint: 0xffffff, texture: key, scale: rand(0.17, 0.27), decal: false, life: rand(240, 420), spin: rand(-12, 12),
          material: PHYSICS[pr.kind === 'urn' ? 'pottery' : 'wood'],
        });
      }
      return;
    }
    const colors = pr.kind === 'wall' ? [0x5a524a, 0x3e3732, 0x8a8070] : pr.kind === 'urn' ? [0x9a5a3a, 0x3a1e14]
      : pr.kind === 'chest' ? [0x5a3418, 0x3a3a42, 0xc8a040] : [0x7a4a24, 0x3a2210, 0x5a5a62];
    const gore = this.scene.gore;
    for (let i = 0; i < n; i++) {
      gore.spawn({
        x: pr.x + rand(-pr.w / 2, pr.w / 2), z: pr.z + rand(-4, 4), h: (pr.y ?? 0) + rand(8, pr.h),
        vx: dir * rand(40, 260) + rand(-80, 80), vz: rand(-40, 40), vh: rand(120, 380),
        tint: colors[i % colors.length], texture: 'px', scale: rand(0.8, 2), decal: false, life: rand(180, 300), spin: rand(-10, 10),
        material: PHYSICS[pr.kind === 'wall' ? 'stone' : pr.kind === 'urn' ? 'pottery' : 'wood'],
      });
    }
  }

  // ------------------------------------------------------------ pickups

  syncPickups() {
    const live = new Set(this.stage.pickups);
    for (const pk of this.stage.pickups) {
      if (this.pickupSprites.has(pk)) continue;
      let key = `pk-${pk.kind}`;
      if (!this.scene.textures.exists(key)) key = 'pk-relic'; // (a secret treasure not painted yet)
      const img = this.scene.add.image(pk.x, pk.z, key).setOrigin(0.5, 1)
        .setScale((pk.kind === 'shrine' ? 0.7 : pk.kind === 'trophy' ? 1 : 0.75) / (this.pickupHd.has(key) ? PICKUP_SCALE : 1));
      const glow = this.scene.add.image(pk.x, pk.z - 12, 'glow').setScale(pk.kind === 'trophy' ? 2.6 : 1.4).setTint(PICKUPS[pk.kind].color).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
      this.pickupSprites.set(pk, { img, glow });
    }
    for (const [pk, v] of this.pickupSprites) {
      if (!live.has(pk)) { v.img.destroy(); v.glow.destroy(); this.pickupSprites.delete(pk); continue; }
      // pops out, then bobs and glows so it's obvious it's there to take
      const pop = Math.max(0, 1 - pk.age / 20);
      const bob = pk.kind === 'shrine' ? 0 : Math.sin(pk.age * 0.08) * 3 + 4 + pop * 30 * Math.sin(pop * Math.PI);
      const y = pk.y ?? 0; // (dropped up on a ledge)
      v.img.setPosition(pk.x, pk.z - y - bob).setDepth(pk.z);
      v.glow.setPosition(pk.x, pk.z - y - bob - 10).setDepth(pk.z - 0.1).setAlpha(0.35 + 0.25 * Math.sin(pk.age * 0.12));
    }
  }

  pickup({ pickup: pk, def }) {
    if (def.trophy) { this.scene.gore.spark(pk.x, pk.z, 20, def.color, 30); return; } // (ArenaScene names the trophy)
    playSfx(this.scene, 'block', { volume: 0.4, pitch: 900, minGapMs: 0 });
    this.scene.gore.spark(pk.x, pk.z, 20, def.color, 14);
    const what = def.heal && def.mana ? 'FULLY RESTORED' : def.heal ? `+HEALTH  (${def.label})` : def.mana ? '+MANA' : def.label;
    this.scene.callout(what, def.score ? '#ffd24a' : '#e0c080', 22);
  }

  // ------------------------------------------------------------ hazards

  drawHazards() {
    const cam = this.scene.cameras.main.worldView;
    this.drawStuckArrows();
    for (const hz of this.stage.hazards) {
      if (hz.type === 'stampede') { this.drawStampede(hz, cam); continue; }
      if (hz.type === 'collapse') { this.drawCollapse(hz, cam); continue; }
      if (hz.type === 'bombard') { this.drawBombard(hz); continue; }
      if (hz.type === 'ballista') { drawScorpion(this, hz); continue; }
      if (hz.x < cam.x - 200 || hz.x > cam.right + 200) {
        hz.view?.setVisible(false);
        hz.hot?.setVisible(false);
        hz.bladeImg?.setVisible(false);
        hz.glow?.setVisible(false);
        hz.g?.setVisible(false);
        hz.log?.setVisible(false); hz.logGlow?.setVisible(false);
        continue;
      }
      if (hz.type === 'fire') this.drawFire(hz);
      else if (hz.type === 'beam') this.drawBeam(hz);
      else if (hz.look === 'log') {
        hz.g = hz.g ?? this.scene.add.graphics();
        this.drawSwingLog(hz.g.clear().setVisible(true), hz);
      } else {
        hz.g = hz.g ?? this.scene.add.graphics();
        this.drawBlade(hz.g.clear().setVisible(true), hz);
      }
    }
  }

  drawFire(hz) {
    if (!hz.view) {
      // Restore the original stone-rimmed firepit from props.png, including the
      // matching ember-lit artwork. Legacy look:'cart' mustn't cover this trap.
      hz.view = this.scene.add.image(hz.x, hz.z, 'grate')
        .setDisplaySize(hz.w, hz.d * 0.75).setDepth(DEPTH.floor + 4);
      hz.hot = this.painted.has('grate-hot')
        ? this.scene.add.image(hz.x, hz.z, 'grate-hot').setDisplaySize(hz.w, hz.d * 0.75).setDepth(DEPTH.floor + 4.05).setAlpha(0)
        : this.scene.add.ellipse(hz.x, hz.z, hz.w * 0.82, hz.d * 0.52, 0xc4420e, 1).setDepth(DEPTH.floor + 4.05).setAlpha(0);
      hz.glow = this.scene.add.image(hz.x, hz.z, 'glow').setDisplaySize(hz.w * 1.6, hz.d * 1.4).setTint(0xff6020)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floor + 4.1);
      hz.flames = Array.from({ length: 7 }, () => this.scene.add.image(hz.x, hz.z, 'flame').setOrigin(0.5, 1)
        .setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
      // the painted blaze (FX.firepit), when its strip is in: three roaring columns, each
      // drawn twice (solid, then a brighter additive pass so it glows)
      if (FX.firepit) {
        hz.blaze = [0, 1, 2].map(() => [0, 1].map((glow) => this.scene.add.image(hz.x, hz.z, FX.firepit.key, 'f0').setOrigin(0.5, 0.97)
          .setBlendMode(glow ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setVisible(false)));
      }
    }
    hz.view.setVisible(true);
    const phase = this.stage.firePhase(hz);
    const t = hz.t % 210;
    // warning: the opening glows hotter and embers rise before the eruption
    const warm = phase === 'warn' ? (t - 110) / 50 : phase === 'burst' ? 1 : 0.15;
    hz.hot?.setVisible(true).setAlpha(Math.max(0, Math.min(1, warm)));
    hz.glow.setVisible(true).setAlpha(0.25 + 0.6 * warm + (phase === 'warn' ? Math.sin(t * 0.6) * 0.15 : 0));
    if (phase === 'warn' && t % 3 === 0) {
      this.scene.gore.spawn({ x: hz.x + rand(-hz.w / 2, hz.w / 2), z: hz.z + rand(-hz.d / 3, hz.d / 3), h: 2, vx: rand(-10, 10), vz: 0, vh: rand(60, 140), tint: 0xffa040, scale: rand(0.3, 0.6), decal: false, life: 30 });
    }
    hz.blaze?.forEach((pair, i) => {
      const on = phase === 'burst';
      for (const fl of pair) fl.setVisible(on);
      if (!on) return;
      const F = FX.firepit;
      const age = t - 160;             // 0..50 through the eruption
      // slams up in a few frames, roars, then gutters out
      const rise = Math.min(1, age / 5);
      const fall = Math.max(0, 1 - Math.max(0, age - 38) / 12);
      // (sized to the grate: the middle column fills its opening, the two beside it are
      // smaller and stand well inside the rim, so nothing spills over the stonework)
      const fit = Math.min(1, (hz.w * 0.46) / (F.fw * 0.5));
      const size = fit * (0.5 + 0.5 * rise) * (0.35 + 0.65 * fall) * (i === 1 ? 1 : 0.62);
      const frame = `f${(Math.floor((hz.t * F.fps) / 60) + i * 3) % F.count}`;
      const fx = hz.x + (i - 1) * hz.w * 0.19;
      const fz = hz.z + (i === 1 ? hz.d * 0.04 : -hz.d * 0.06); // (the side ones a little behind)
      const flick = 1 + Math.sin(hz.t * 0.9 + i * 2.1) * 0.04;
      pair.forEach((fl, glow) => fl.setFrame(frame).setPosition(fx, fz).setScale(0.5 * size * (i === 2 ? -1 : 1), 0.5 * size * flick)
        .setDepth(fz + 0.5 + glow * 0.01).setAlpha(glow ? 0.45 : 1));
    });
    hz.flames.forEach((fl, i) => {
      const on = phase === 'burst' && !hz.blaze;
      fl.setVisible(on);
      if (!on) return;
      const u = (i + 0.5) / hz.flames.length;
      const fx = hz.x - hz.w / 2 + u * hz.w;
      const fz = hz.z + Math.sin(i * 2.3) * hz.d * 0.25;
      const life = (t - 160) / 50;
      const hgt = (1 - life * 0.6) * (60 + Math.sin(t * 0.7 + i * 1.3) * 16);
      fl.setPosition(fx, fz).setDisplaySize(26 + Math.sin(t * 0.9 + i) * 6, hgt).setDepth(fz + 0.5).setAlpha(0.95);
    });
  }

  // A burning beam about to fall (Stage 'beam'): while it creaks, its shadow grows on the
  // ground under it, embers fall, and a ring marks how far it reaches; then it crashes
  // and lies there burning for a moment. Readable well before it lands.
  drawBeam(hz) {
    const g = hz.g = hz.g ?? this.scene.add.graphics();
    g.clear().setVisible(true);
    const live = this.stage.beamLive(hz);
    const y = Math.max(0, this.stage.terrain?.groundAt(hz.x, hz.z) ?? 0);
    const gy = hz.z - y;
    g.setDepth(hz.z - 1);
    hz.log?.setVisible(false); hz.logGlow?.setVisible(false); hz.slab?.setVisible(false); hz.heap?.setVisible(false);
    if (!live) return;
    const { phase, warnT, since } = this.stage.beamPhase(hz);
    if (hz.look === 'rock') { this.drawRockfall(g, hz, gy, y, phase, warnT, since); return; }
    const log = this.beamLog(hz);
    if (phase === 'warn') {
      // where it will land: a shadow growing and darkening, and a pulsing ring round its reach
      g.fillStyle(0x000000, 0.2 + 0.45 * warnT).fillEllipse(hz.x, gy, hz.w * (0.6 + 0.6 * warnT), hz.d * 0.5 * (0.6 + 0.6 * warnT));
      g.lineStyle(3, 0xff5a20, 0.4 + 0.5 * warnT * (0.75 + 0.25 * Math.sin(hz.t * 0.5))).strokeEllipse(hz.x, gy, hz.w * 1.2, hz.d * 0.6);
      // the burning beam overhead, shaking loose; in the last fifth of the warning it drops,
      // landing on the frame it strikes (Stage.updateBeam)
      const shake = Math.sin(hz.t * 1.3) * 3 * Math.min(warnT, 0.8);
      const hang = gy - 175 + Math.min(warnT, 0.8) * 25;
      const f = Math.max(0, (warnT - 0.8) / 0.2);
      const by = hang + (gy - 12 - hang) * f * f;
      if (log) {
        log.setPosition(hz.x + shake * (1 - f), by).setRotation(Math.sin(hz.t * 0.21) * 0.08 * (1 - f)).setAlpha(1).setVisible(true);
        hz.logGlow.setPosition(hz.x, by).setAlpha(0.75 + Math.sin(hz.t * 0.7) * 0.2).setVisible(true);
      } else {
        g.fillStyle(0x2a1a10, 1).fillRect(hz.x - hz.w / 2 + shake, by, hz.w, 14);
        g.fillStyle(0xff7a2a, 0.9).fillRect(hz.x - hz.w / 2 + 6 + shake, by + 4, hz.w - 12, 3);
      }
      if (hz.t % 4 === 0 && f === 0) {
        this.scene.gore.spawn({ x: hz.x + rand(-hz.w / 2, hz.w / 2), z: hz.z, h: gy - by + y - 10, vx: rand(-10, 10), vz: 0, vh: -rand(10, 60), tint: 0xffa040, scale: rand(0.25, 0.5), decal: false, life: 50 });
      }
    } else if (since < 70) {
      // down: it lies across the ground, burning out
      const a = 1 - since / 70;
      if (log) {
        log.setPosition(hz.x, gy - 12).setRotation(0.04).setAlpha(a).setVisible(true);
        hz.logGlow.setPosition(hz.x, gy - 12).setAlpha(0.5 * a).setVisible(true);
      } else {
        g.fillStyle(0x2a1a10, a).fillRect(hz.x - hz.w / 2 - 8, gy - 10, hz.w + 16, 12);
        g.fillStyle(0xff7a2a, a * 0.9).fillRect(hz.x - hz.w / 2, gy - 7, hz.w, 3);
      }
    }
  }

  // The falling beam, painted: one charred, iron-strapped log cut from the burnt-out half of
  // the village's wreckage (prop_wreckage.png), with a fire glow round it. Null if unpainted.
  beamLog(hz) {
    if (hz.log) return hz.log;
    const T = this.scene.textures;
    if (!T.exists('prop-wreckage-broken')) return null;
    const tex = T.get('prop-wreckage-broken');
    const src = tex.getSourceImage();
    if (src.width < 400) return null;
    const k = src.width / 887; // (the crop measured on the 887 px half)
    if (!tex.has('beamlog')) tex.add('beamlog', 0, 116 * k, 432 * k, 355 * k, 140 * k);
    hz.log = this.scene.add.image(hz.x, hz.z, 'prop-wreckage-broken', 'beamlog').setOrigin(0.5, 0.6).setDepth(hz.z + 0.5);
    hz.log.setScale((hz.w * 1.5) / hz.log.frame.width);
    hz.logGlow = this.scene.add.image(hz.x, hz.z, 'glow').setDisplaySize(hz.w * 2.2, hz.w * 1.2).setTint(0xff6020)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(hz.z + 0.4);
    return hz.log;
  }

  // The mine's version of a falling beam (look 'rock'): grit trickling from a crack in the
  // roof and a shadow spreading under it, then a slab of rock that shatters where it lands.
  drawRockfall(g, hz, gy, y, phase, warnT, since) {
    if (this.paintedRockfall(g, hz, gy, y, phase, warnT, since)) return;
    if (phase === 'warn') {
      g.fillStyle(0x000000, 0.2 + 0.5 * warnT).fillEllipse(hz.x, gy, hz.w * (0.6 + 0.6 * warnT), hz.d * 0.5 * (0.6 + 0.6 * warnT));
      g.lineStyle(2, 0xc8b8a0, 0.3 + 0.5 * warnT).strokeEllipse(hz.x, gy, hz.w * 1.2, hz.d * 0.6);
      // the slab working loose overhead
      const shake = Math.sin(hz.t * 1.7) * 3 * warnT;
      const by = gy - 250 + warnT * 26;
      g.fillStyle(0x2a2a30, 1).fillTriangle(hz.x - hz.w / 2 + shake, by, hz.x + hz.w / 2 + shake, by - 6, hz.x + shake + 8, by + 34);
      g.fillStyle(0x4a4650, 1).fillTriangle(hz.x - hz.w / 2 + shake, by, hz.x + shake, by - 4, hz.x + shake - 6, by + 18);
      if (hz.t % 3 === 0) {
        this.scene.gore.spawn({ x: hz.x + rand(-hz.w / 3, hz.w / 3), z: hz.z, h: y + 230, vx: rand(-6, 6), vz: 0, vh: -rand(20, 80), tint: 0x8a8070, texture: 'px', scale: rand(0.5, 1), decal: false, life: 50 });
      }
    } else if (since < 80) {
      // down: broken rock in a heap, the dust settling
      const a = 1 - since / 80;
      g.fillStyle(0x2a2a30, a);
      for (let i = 0; i < 5; i++) {
        const rx = hz.x - hz.w / 2 + (i + 0.5) * (hz.w / 5);
        const rh = 10 + ((i * 7) % 4) * 5;
        g.fillTriangle(rx - 16, gy, rx + 16, gy, rx + (i % 2 ? 4 : -4), gy - rh);
      }
      g.fillStyle(0x8a8070, a * 0.25).fillEllipse(hz.x, gy - 14, hz.w * 1.4, 40);
    }
  }

  // The falling rock, painted (assets/env/mine/rockfall.png, on magenta: the slab of roof
  // working loose, then the same rock smashed into a heap): the slab shakes overhead while
  // its shadow grows, drops in the warning's last fifth, and lies broken while the dust
  // settles. False (the code drawing) until the picture exists.
  paintedRockfall(g, hz, gy, y, phase, warnT, since) {
    if (!cutPieces(this.scene, 'rockfall-src', ['rockfall-slab', 'rockfall-heap'])) return false;
    const s = this.scene;
    hz.slab ??= s.add.image(0, 0, 'rockfall-slab').setOrigin(0.5, 1);
    hz.heap ??= s.add.image(0, 0, 'rockfall-heap').setOrigin(0.5, 1);
    const fit = (img, w) => img.setScale(w / img.frame.width);
    if (phase === 'warn') {
      g.fillStyle(0x000000, 0.2 + 0.5 * warnT).fillEllipse(hz.x, gy, hz.w * (0.6 + 0.6 * warnT), hz.d * 0.5 * (0.6 + 0.6 * warnT));
      g.lineStyle(2, 0xc8b8a0, 0.3 + 0.5 * warnT).strokeEllipse(hz.x, gy, hz.w * 1.2, hz.d * 0.6);
      const f = Math.max(0, (warnT - 0.8) / 0.2);
      const shake = Math.sin(hz.t * 1.7) * 3 * Math.min(warnT, 0.8) * (1 - f);
      const hang = gy - 220 + Math.min(warnT, 0.8) * 26;
      fit(hz.slab, hz.w * 1.1).setPosition(hz.x + shake, hang + (gy - hang) * f * f).setDepth(hz.z + 1).setVisible(true);
      if (hz.t % 3 === 0 && f === 0) {
        s.gore.spawn({ x: hz.x + rand(-hz.w / 3, hz.w / 3), z: hz.z, h: y + 200, vx: rand(-6, 6), vz: 0, vh: -rand(20, 80), tint: 0x8a8070, texture: 'px', scale: rand(0.5, 1), decal: false, life: 50 });
      }
    } else if (since < 80) {
      const a = 1 - since / 80;
      fit(hz.heap, hz.w * 1.3).setPosition(hz.x, gy + 6).setDepth(hz.z - 0.5).setAlpha(Math.min(1, a * 2)).setVisible(true);
      g.fillStyle(0x8a8070, a * 0.25).fillEllipse(hz.x, gy - 14, hz.w * 1.4, 40);
    }
    return true;
  }

  // The catapults' stones (Stage 'bombard'): where each will land, a shadow spreading on the
  // ground and a red ring round its reach, then the stone itself, burning, dropping out of
  // the sky onto the middle of it.
  drawBombard(hz) {
    const g = hz.g = hz.g ?? this.scene.add.graphics();
    g.clear();
    const shells = hz.shells ?? [];
    g.setVisible(shells.length > 0);
    if (shells.length) g.setDepth(Math.min(...shells.map((q) => q.z)) - 1); // (over a ledge's top, under the men on it)
    if (!hz.stones) hz.stones = this.scene.add.graphics();
    const st = hz.stones.clear();
    hz.fire?.clear();
    for (const q of hz.stoneImgs ?? []) q.used = false;
    for (const s of shells) {
      s.gy ??= this.stage.terrain ? Math.max(0, this.stage.terrain.groundAt(s.x, s.z)) : 0;
      const k = Math.max(0, Math.min(1, (hz.t - s.from) / Math.max(1, s.land - s.from)));
      const gy = s.z - s.gy;
      const R = hz.radius ?? 64;
      g.fillStyle(0x000000, 0.15 + 0.5 * k).fillEllipse(s.x, gy, R * (0.5 + 1.1 * k), R * 0.38 * (0.5 + 1.1 * k));
      g.lineStyle(2, hz.friendly ? 0xd8e8ff : 0xff5a3a, 0.25 + 0.55 * k).strokeEllipse(s.x, gy, R * 2, R * 0.75);
      if (hz.look === 'arrows') { if (k >= ARROWS.loose) this.drawArrows(st, s, gy, (k - ARROWS.loose) / (1 - ARROWS.loose), hz); continue; }
      if (k < 0.45) continue;
      if (hz.friendly) {
        // (your own people's: plain sling stones, thrown from behind you, a flat arc)
        const f = (k - 0.45) / 0.55;
        const sx = s.x - 260 * (1 - f); const sy = gy - 260 * (1 - f) * f * 4 * 0.5 - 10;
        st.setDepth(s.z + 1);
        for (let i = 0; i < 3; i++) st.fillStyle(0x6a6a72, 1).fillCircle(sx + (i - 1) * 16, sy + (i % 2) * 8, 6);
        continue;
      }
      // the stone: the last half of its flight, falling steeply onto the mark
      const f = (k - 0.45) / 0.55;
      const sy = gy - 720 * (1 - f) * (1 - f) - 12;
      const side = this.siege.sideOf(hz, s.x); // (it comes in from the catapult's side)
      const sx = s.x + side * 140 * (1 - f);
      st.setDepth(s.z + 1);
      if (this.drawStone(hz, s, sx, sy, f, side)) continue;
      // (a pitch-soaked stone, burning: it reads against the sky and the Keep alike)
      for (let k2 = 1; k2 <= 4; k2++) st.fillStyle(k2 < 3 ? 0xff7a30 : 0x6a6460, 0.35 - k2 * 0.06).fillCircle(sx - 26 * k2 * (1 - f * 0.6), sy - 60 * k2 * (1 - f * 0.6), 11 - k2);
      st.fillStyle(0xffb050, 1).fillCircle(sx, sy, 17);
      st.fillStyle(0x2a2420, 1).fillCircle(sx + 2, sy + 2, 13);
      st.fillStyle(0xff8a30, 1).fillCircle(sx - 5, sy - 5, 5);
    }
    for (const im of hz.stoneImgs ?? []) if (!im.used) im.setVisible(false);
    hz.fire?.setVisible(shells.length > 0);
  }

  // A catapult's stone in the air: the painted stone out of the catapult's sling (cut from
  // prop_catapult.png, view/SiegeAnim.js), pitch-soaked and burning, tumbling as it falls,
  // a tail of fire and smoke streaming up behind it, embers shed on the way. False when the
  // painted catapult isn't in (the drawn stone stands in).
  drawStone(hz, s, sx, sy, f, side) {
    const key = this.siege.stoneKey();
    if (!key) return false;
    hz.stoneImgs ??= [];
    const i = hz.shells.indexOf(s);
    const im = hz.stoneImgs[i] ??= this.scene.add.image(0, 0, key);
    im.used = true;
    const R = SIEGE_STONE.radius;
    im.setTexture(key).setDisplaySize(R * 2, R * 2).setPosition(sx, sy).setRotation(f * 9 + i).setDepth(s.z + 1.2).setVisible(true)
      .setTint(0xffffff, 0xffffff, 0xffb070, 0xff9050); // (lit from below by its own fire)
    // the fire: a glow round it, a tail of flame streaming back up its path, smoke above
    const g = hz.fire ??= this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    g.setDepth(s.z + 1.1).setVisible(true);
    const t = this.scene.time.now / 60;
    // back along its path (up, and toward the catapult)
    const vx = -side * 140; const vy = 1440 * (1 - f) + 40; const m = Math.hypot(vx, vy);
    const back = (n) => ({ x: sx - (vx / m) * n * 11, y: sy - (vy / m) * n * 11 });
    for (let n = 9; n >= 1; n--) {
      const p = back(n);
      const flick = Math.sin(t + n * 1.7 + i) * 4;
      const a = 0.5 * (1 - n / 10);
      g.fillStyle(n < 4 ? 0xffc060 : n < 7 ? 0xff7a28 : 0xc03a10, a).fillCircle(p.x + flick, p.y, R * (1.05 - n * 0.07));
    }
    g.fillStyle(0xffa040, 0.35).fillCircle(sx, sy, R * 1.6);
    g.fillStyle(0xfff0c0, 0.25).fillCircle(sx - R * 0.2, sy + R * 0.3, R * 0.8);
    // smoke behind the fire (normal blend: on the stones' own graphics)
    const sm = hz.stones;
    for (let n = 10; n <= 16; n++) {
      const p = back(n);
      sm.fillStyle(0x2a2624, 0.16 * (1 - (n - 10) / 7)).fillCircle(p.x + Math.sin(t * 0.7 + n) * 6, p.y, R * (0.5 + (n - 10) * 0.12));
    }
    if (Math.random() < 0.35) this.scene.gore.spawn({ x: sx + rand(-8, 8), z: s.z, h: s.z - sy, vx: rand(-60, 60), vz: 0, vh: rand(20, 120), tint: Math.random() < 0.5 ? 0xffb050 : 0xff6a20, texture: 'px', scale: rand(0.5, 1), decal: false, life: rand(14, 26) });
    return true;
  }

  // An arrow volley (bombard `look: 'arrows'`): each arrow is loosed from the archers' post
  // (or, while the post is still far ahead, from high off the screen on its side) and flies
  // a real arc onto its spot round the mark, turning nose-down as it falls, its shaft
  // fluttering a little, a faint streak behind it; not all loosed at once. f: 0..1 from the
  // loosing to the landing. (Each arrow's spot and arc come from the mark: steady.)
  drawArrows(g, s, gy, f, hz) {
    const R = hz.radius ?? 64;
    for (let i = 0; i < ARROWS.perVolley; i++) {
      const A = this.arrowPath(s, gy, i, R, hz);
      const ff = Math.max(0, Math.min(1, (f - A.lag) / (1 - A.lag)));
      if (ff <= 0) continue;
      const p = A.at(ff);
      const img = this.arrowImg(this.flyPool ??= [], this.flyUsed++);
      img.setPosition(p.x, p.y).setRotation(p.angle + Math.sin(ff * 17 + i * 1.7) * 0.07 * (1 - ff)).setScale(A.scale)
        .setDepth(ff < 0.85 ? DEPTH.popups - 10 : A.z + 1).setAlpha(Math.min(1, ff * 6)).setVisible(true);
      // the streak it leaves in the air (fades as it comes down)
      const back = 16 + 46 * (1 - ff);
      const ux = Math.cos(p.angle); const uy = Math.sin(p.angle);
      const tx = p.x - ux * ARROWS.len * A.scale * 1.1; const ty = p.y - uy * ARROWS.len * A.scale * 1.1;
      g.lineStyle(2, 0xf0e6d0, 0.16 * (1 - ff * 0.6)).lineBetween(tx, ty, tx - ux * back, ty - uy * back);
      g.lineStyle(1, 0xffffff, 0.1).lineBetween(tx, ty, tx - ux * back * 0.5, ty - uy * back * 0.5);
    }
    g.setDepth(DEPTH.popups - 11);
  }

  // One arrow of a volley: where it lands round the mark, where it's loosed from, its arc.
  arrowPath(s, gy, i, R, hz) {
    const n = ARROWS.perVolley;
    const a = (i * 2.399 + s.x * 0.013) % (Math.PI * 2); // (golden-angle scatter)
    const r = R * 0.85 * Math.sqrt((i + 0.5) / n);
    const tx = s.x + Math.cos(a) * r; const ty = gy + Math.sin(a) * r * 0.36;
    // loosed from the nearest post still standing, else from high on the archers' side
    let post = null;
    for (const pr of this.stage.props) {
      if (pr.kind !== 'archers' || pr.broken || (hz.silence && pr.tag !== hz.silence)) continue;
      if (!post || Math.abs(pr.x - tx) < Math.abs(post.x - tx)) post = pr;
    }
    const near = post && Math.abs(post.x - tx) < ARROWS.seen; // (a post off the screen: they drop in from high over its side instead, so the flight is seen)
    const side = post ? Math.sign(post.x - tx) || 1 : 1;
    const sx = near ? post.x - side * 30 + (i - 3) * 8 : tx + side * (420 + (i % 3) * 50);
    const sy = near ? post.z - (post.y ?? 0) - 150 - (i % 2) * 14 : ty - 560 - (i % 4) * 30;
    const dx = tx - sx; const dy = ty - sy;
    // how high it climbs over the straight line (kept low enough that the arc stays on the
    // screen: you see it come all the way in, not just its last few frames)
    const H = Math.min(ARROWS.arc, 110 + Math.abs(dx) * 0.14) + (i % 3) * 26;
    const jit = ((i * 37) % 11 - 5) * 0.025; // (each lands a little crooked)
    return {
      lag: (i % 4) * 0.07, scale: ARROWS.scale * (0.9 + (i % 3) * 0.08), z: s.z + Math.sin(a) * r * 0.36, tx, ty, jit,
      at: (u) => ({
        x: sx + dx * u,
        y: sy + dy * u - H * 4 * u * (1 - u),
        angle: Math.atan2(dy - H * 4 * (1 - 2 * u), dx) + (u > 0.9 ? jit * (u - 0.9) * 10 : 0),
      }),
    };
  }

  // A pooled arrow image (the painted-in-code arrow, its head at the right).
  arrowImg(pool, k) {
    if (!pool[k]) pool[k] = this.scene.add.image(0, 0, 'arrow-fly').setOrigin(0.9, 0.5).setVisible(false);
    return pool[k];
  }

  // The arrows of a volley that just landed: stuck in the ground round the mark at the
  // angle they came down, head buried, quivering as they hit; they fade after a while.
  // The view's own: nothing in the game touches them.
  plantArrows(hz, s) {
    const y = s.y ?? 0;
    const gy = s.z - y;
    const now = this.scene.time.now;
    for (let i = 0; i < ARROWS.perVolley; i++) {
      const A = this.arrowPath(s, gy, i, hz.radius ?? 64, hz);
      const end = A.at(1);
      const img = this.scene.add.image(A.tx, A.ty, 'arrow-fly').setOrigin(0.76, 0.5).setScale(A.scale)
        .setCrop(0, 0, ARROWS.texW * 0.76, ARROWS.texH).setDepth(A.z + 0.5);
      const ang = Phaser.Math.RadToDeg(end.angle);
      img.setAngle(ang + 9 * (i % 2 ? 1 : -1));
      this.scene.tweens.add({ targets: img, angle: ang, duration: 520, ease: 'Elastic.easeOut', easeParams: [1.6, 0.18] });
      // a puff of dirt where it bit
      this.scene.gore.spawn({ x: A.tx, z: A.z, h: y + 2, vx: rand(-40, 40), vz: 0, vh: rand(40, 90), tint: 0x6a5a48, texture: 'px', scale: rand(0.6, 1.1), decal: false, life: rand(14, 24) });
      (this.stuckArrows ??= []).push({ img, at: now });
    }
  }

  // An arrow volley feathering a man: one or two shafts stuck in him, head buried, nocks out
  // behind, at the slant they came down at. Each is held as a spot on his body (across it,
  // as a share of his width, on his facing side or his back; up it, as a share of his
  // height), so it rides along as he staggers, turns or is thrown down (drawPinnedArrows).
  // The view's own: nothing in the game touches them.
  pinArrows(f) {
    const n = PINNED.min + Math.floor(Math.random() * (PINNED.max - PINNED.min + 1));
    const now = this.scene.world.frame;
    for (let i = 0; i < n; i++) {
      const img = this.scene.add.image(0, 0, 'arrow-fly').setOrigin(0.7, 0.5).setScale(PINNED.scale)
        .setCrop(0, 0, ARROWS.texW * 0.7, ARROWS.texH);
      (this.pinned ??= []).push({
        f, img, at: now + i * 4,
        across: rand(-0.3, 0.3), up: rand(0.45, 0.85),
        // its slant in his facing (0 = level, pointing the way he faces; down-and-in: it fell on him),
        // and whether it went in from the front (so its fletching shows ahead of him) or the back
        tilt: rand(0.55, 1.15), front: Math.random() < 0.5,
      });
      img.setVisible(false);
    }
  }

  // The arrows stuck in men: follow each to his body, fade after a while, and are let go
  // when he leaves the field. Lying down (knocked flat, dead) his height runs along the
  // ground behind him (he goes over on his back), so the arrows lie along it too.
  drawPinnedArrows() {
    if (!this.pinned?.length) return;
    const now = this.scene.world.frame;
    const on = this.scene.world?.fighters;
    this.pinned = this.pinned.filter((a) => {
      const f = a.f;
      const left = PINNED.linger - (now - a.at);
      if (left <= 0 || (on && !on.includes(f))) { a.img.destroy(); return false; }
      if (now < a.at) return true; // (the second shaft bites a beat after the first)
      const { w, h } = f.stats.body;
      const face = f.facing || 1;
      const flat = f.state === 'dead' || (f.state === 'knockdown' && f.lyingSince != null);
      const side = a.front ? 1 : -1; // (the end you see sticks out the way it went in from)
      let x; let y; let ang;
      if (flat) {
        x = f.x - face * h * a.up * 0.85;
        y = f.z - f.h - 10 - w * 0.15 * (a.across + 0.3);
        ang = Math.PI / 2 + (a.tilt - 0.85) * 0.6 * side; // (head down into his chest, the shaft standing up out of him)
      } else {
        x = f.x + face * w * a.across;
        y = f.z - f.h - h * a.up;
        ang = a.tilt; // (pointing down and forward, in his facing)
      }
      // the image's head is at its right: an arrow that came in from the front points back into him
      const dir = face * side * -1;
      const rot = flat ? ang : dir > 0 ? ang : Math.PI - ang;
      a.img.setPosition(x, y).setRotation(rot).setFlipY(!flat && dir < 0)
        .setDepth(f.z + (a.front ? 0.3 : -0.3)).setAlpha(Math.min(1, left / PINNED.fade)).setVisible(true);
      return true;
    });
  }

  // stuck arrows fade out after a while (and are let go)
  drawStuckArrows() {
    this.drawPinnedArrows();
    for (const im of this.flyPool ?? []) im.setVisible(false); // (the volleys in the air redraw theirs each frame)
    this.flyUsed = 0;
    const now = this.scene.time.now;
    this.stuckArrows = (this.stuckArrows ?? []).filter((a) => {
      const left = ARROWS.linger - (now - a.at);
      if (left <= 0) { a.img.destroy(); return false; }
      a.img.setAlpha(Math.min(1, left / 700));
      return true;
    });
  }

  // The mine coming down behind you (Stage 'collapse'): a wall of falling rock at the front,
  // its face bristling with spikes of broken rock, boulders tumbling out of the roof, a fog of
  // dust, and nothing but black behind it. When it surges the spikes thrust out and glow hot
  // at the tips and the ground shakes harder; when it's at a hero's heels the edge of the
  // screen behind him pulses red.
  drawCollapse(hz, cam) {
    const g = hz.g = hz.g ?? this.scene.add.graphics();
    g.clear();
    const on = hz.front != null && hz.front > cam.x - 300;
    g.setVisible(on);
    this.drawCollapseWarning(hz, cam, on);
    if (!on) { hz.wallArt?.setVisible(false); for (const sp of hz.spikes ?? []) sp.setVisible(false); return; }
    const t = this.scene.time.now / 16.7;
    const fx = hz.front;
    const moving = fx < hz.to;
    const surge = moving && hz.surging;
    g.setDepth(DEPTH.floor + 900); // (in front of the lane: it's the mountain falling)
    const top = cam.y - 50; const bot = cam.bottom + 50;
    // behind the front: dark, filled with rubble
    g.fillStyle(0x050506, 0.96).fillRect(Math.min(cam.x - 50, fx - 2000), top, fx - 40 - Math.min(cam.x - 50, fx - 2000), bot - top);
    // the dust cloud rolling ahead of it (under the spikes)
    g.fillStyle(0x8a8070, surge ? 0.24 : 0.16).fillRect(fx + 10, top, 90, bot - top);
    g.fillStyle(0x8a8070, surge ? 0.12 : 0.07).fillRect(fx + 100, top, 90, bot - top);
    // the face of the fall: a ragged wall of rock bristling with spikes, long and short, each
    // its own length (they don't move as one), thrusting out further while it surges. Each
    // spike a shard: a lit upper facet, a dark lower one.
    const thrust = surge ? 1.45 : 1;
    if (this.paintedCollapse(hz, fx, top, bot, t, moving, surge, thrust)) {
      // (painted: assets/env/mine/collapse_wall.png and collapse_spikes.png)
    } else {
    g.fillStyle(0x121216, 1).fillRect(fx - 44, top, 40, bot - top);
    for (let y = top - 10, i = 0; y < bot; y += 30, i++) {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const r = seed - Math.floor(seed);
      const len = (38 + r * 62) * thrust + Math.sin(i * 1.7 + t * (moving ? 0.25 : 0.03)) * 9;
      const half = 13 + r * 8;
      const mid = y + (r - 0.5) * 10;
      const tipX = fx + len; const tipY = mid + (r - 0.5) * 12;
      g.fillStyle(0x4a4450, 1).fillTriangle(fx - 10, mid - half, tipX, tipY, fx - 10, mid);          // lit facet
      g.fillStyle(0x1e1d22, 1).fillTriangle(fx - 10, mid, tipX, tipY, fx - 10, mid + half);          // shadowed facet
      g.lineStyle(2, 0x7a7280, 0.9).lineBetween(fx - 6, mid - half + 2, tipX, tipY);                  // its sharp upper edge
      if (surge) g.fillStyle(0xff6a20, 0.6 + 0.3 * Math.sin(t * 0.8 + i)).fillCircle(tipX - 4, tipY, 3.5);
    }
    }
    // boulders falling through the front
    if (moving) {
      for (let i = 0; i < 6; i++) {
        const ph = ((t * (surge ? 0.035 : 0.02) + i * 0.37) % 1);
        const bx = fx - 20 + Math.sin(i * 4.1) * 24;
        const byy = top + ph * (bot - top);
        const r = 10 + (i % 3) * 7;
        g.fillStyle(0x3a3640, 1).fillCircle(bx, byy, r);
        g.fillStyle(0x56505a, 1).fillCircle(bx - r * 0.3, byy - r * 0.3, r * 0.45);
      }
      if (Math.floor(t) % (surge ? 1 : 2) === 0) {
        const z = rand(SETTINGS.world.floorTop, SETTINGS.world.floorBottom);
        this.scene.gore.spawn({ x: fx + rand(0, 30), z, h: rand(0, 60), vx: rand(40, surge ? 260 : 160), vz: 0, vh: rand(20, 120), tint: 0x6a6258, scale: rand(0.8, 1.6), decal: false, life: 40 });
      }
      const near = Math.abs(this.scene.player.x - fx) < 800;
      if (surge && !hz.wasSurging && near) {
        playSfx(this.scene, 'kick', { volume: 0.9, pitch: -2600, minGapMs: 0 });
        this.scene.fx?.shake(6, 30);
      } else if (Math.floor(t) % (surge ? 6 : 20) === 0 && near) this.scene.fx?.shake(surge ? 4 : 2, 10);
    }
    hz.wasSurging = surge;
  }

  // The wall of the collapse, painted: the rock face (collapse_wall.png, on magenta, a tall
  // picture whose top and bottom join, its ragged right edge the front) repeated down the
  // screen, and the spikes (collapse_spikes.png, six shards side by side on magenta,
  // pointing right) set along it in rows, each its own length, thrusting out further while
  // it surges, a hot glow at their tips. False (the code drawing) until both pictures exist.
  paintedCollapse(hz, fx, top, bot, t, moving, surge, thrust) {
    const s = this.scene; const T = s.textures;
    const names = [0, 1, 2, 3, 4, 5].map((i) => `collapse-spike-${i}`);
    if (!T.exists('collapse-wall-src') || !cutPieces(s, 'collapse-spikes-src', names)) {
      hz.wallArt?.setVisible(false); for (const sp of hz.spikes ?? []) sp.setVisible(false);
      return false;
    }
    if (!T.exists('collapse-wall')) T.addCanvas('collapse-wall', keyLayer(T.get('collapse-wall-src').getSourceImage(), 'magenta'));
    const WIDE = 240; // (px of wall face shown in front of the dark)
    const fr = T.get('collapse-wall').getSourceImage();
    const k = WIDE / fr.width;
    hz.wallArt ??= s.add.tileSprite(0, 0, WIDE, bot - top, 'collapse-wall').setOrigin(1, 0).setTileScale(k, k);
    if (hz.wallArt.height !== bot - top) hz.wallArt.setSize(WIDE, bot - top);
    hz.wallArt.setPosition(fx + 10, top).setTilePosition(0, moving ? -t * 1.2 / k : 0).setDepth(DEPTH.floor + 900.2).setVisible(true); // (the rock pouring down)
    hz.spikes ??= [];
    let i = 0;
    for (let y = top - 10; y < bot; y += 44, i++) {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const r = seed - Math.floor(seed);
      const sp = hz.spikes[i] ??= s.add.image(0, 0, names[Math.floor(r * 6)]).setOrigin(0, 0.5);
      const len = (60 + r * 70) * thrust + Math.sin(i * 1.7 + t * (moving ? 0.25 : 0.03)) * 9;
      sp.setScale(len / sp.frame.width).setPosition(fx - 30, y + (r - 0.5) * 14).setDepth(DEPTH.floor + 900.4).setVisible(true)
        .setTint(surge ? 0xffc8a0 : 0xffffff);
    }
    for (; i < hz.spikes.length; i++) hz.spikes[i].setVisible(false);
    return true;
  }

  // The red at the screen's edge while the collapse is close behind a hero (along the
  // camera's left edge, under the HUD): stronger the closer it is, pulsing faster when it's on him.
  drawCollapseWarning(hz, cam, on) {
    const w = hz.warnG = hz.warnG ?? this.scene.add.graphics().setDepth(DEPTH.floor + 905);
    w.clear();
    if (!on || hz.front >= hz.to) return;
    const heroes = this.scene.players ?? [this.scene.player];
    const gap = Math.min(...heroes.filter((p) => p?.alive).map((p) => p.x - hz.front));
    const k = Math.max(0, Math.min(1, 1 - (gap - 40) / 220));
    if (k <= 0) return;
    const t = this.scene.time.now / 16.7;
    const a = k * (0.35 + 0.25 * Math.sin(t * (0.15 + k * 0.25)));
    const W = cam.width; const H = cam.height;
    for (let i = 0; i < 6; i++) w.fillStyle(0xc01808, a * (1 - i / 6)).fillRect(cam.x + i * W * 0.03, cam.y, W * 0.03, H);
  }

  // The stables' stampede (Stage 'stampede'): first its whole path lights up on the ground,
  // out of the stable door and along the lane, as scuffed earth and worn hoof marks
  // pulsing in the herd's direction, with dust boiling out of the doorway; horses come out of
  // the dark of the door, growing as they come down the yard, and run it. The path stays
  // lit, dimmer, while they're on it. Painted gallop frames (assets/fx/horse_gallop.png)
  // when they exist; drawn here until then.
  drawStampede(hz, cam) {
    const g = hz.g = hz.g ?? this.scene.add.graphics().setDepth(DEPTH.decals + 2);
    const hg = hz.hg = hz.hg ?? this.scene.add.graphics();
    g.clear(); hg.clear();
    const S = this.stage.stampedeState(hz);
    const P = S.path;
    const xs = P.pts.map((q) => q.x);
    const on = S.phase !== 'idle' && Math.max(...xs) > cam.x - 200 && Math.min(...xs) < cam.right + 200;
    g.setVisible(on); hg.setVisible(on);
    for (const sp of hz.horseImgs ?? []) sp.setVisible(false);
    if (!on) return;
    const t = this.scene.time.now / 16.7;
    const dir = S.dir;
    const door = P.pts[0];
    const warn = S.phase === 'warn';
    const w = warn ? S.warnT : 1;
    drawStampedeTrail(g, this.stage, P, S, hz.d, t);
    if (warn) {
      // dust boiling out of the doorway, thicker as they come
      if (Math.floor(t) % 2 === 0) {
        this.scene.gore.spawn({ x: door.x + rand(-40, 40), z: door.z + rand(0, 20), h: rand(0, 40), vx: dir * rand(10, 80), vz: rand(10, 60), vh: rand(10, 50), tint: 0x8a7a64, scale: rand(0.6, 1.2) * (0.5 + w), decal: false, life: 40 });
      }
      return;
    }
    const tex = this.scene.textures.exists('horse-gallop-0');
    hz.horseImgs ??= [];
    S.heads.forEach((hd, i) => {
      // out of the dark of the door: small and shadowed on the threshold, full size and
      // firelit once they're out in the yard
      const emerge = Math.min(1, hd.out / 90);
      const k = (1 + (hd.z - 400) / 900) * (0.62 + 0.38 * emerge);
      if (tex) {
        const sp = hz.horseImgs[i] ??= this.scene.add.image(0, 0, 'horse-gallop-0').setOrigin(0.5, 0.97);
        const shade = Math.round(0x50 + (0xff - 0x50) * emerge);
        sp.setTexture(`horse-gallop-${Math.floor(t * 0.35 + i * 2) % 6}`).setPosition(hd.x, hd.z).setFlipX(dir < 0)
          .setScale((140 * k) / sp.frame.height).setDepth(hd.z).setTint((shade << 16) | (shade << 8) | shade).setVisible(true);
      } else this.horse(hg, hd.x, hd.z, k, dir, t * 0.45 + i * 1.7);
      g.fillStyle(0x000000, 0.35 * emerge + 0.1).fillEllipse(hd.x, hd.z, 150 * k, 18 * k);
      if (Math.floor(t + i) % 2 === 0) {
        this.scene.gore.spawn({ x: hd.x - dir * 50 * k, z: hd.z + rand(-8, 8), h: rand(0, 14), vx: -dir * rand(40, 120), vz: 0, vh: rand(30, 90), tint: 0x7a6a54, scale: rand(0.5, 1), decal: false, life: 30 });
      }
    });
    hg.setDepth(S.heads.length ? Math.max(...S.heads.map((h) => h.z)) + 0.5 : hz.z);
  }

  // a galloping horse, side on (feet at x, z), phase p: a heavy draught horse, flat out
  horse(g, x, z, k, dir, p) {
    const c = 0x24180f; const hi = 0x3a2818; const rim = 0xff8a3a;
    const bob = Math.abs(Math.sin(p)) * 6 * k;
    const by = z - 52 * k - bob; // the belly line
    const X = (dx) => x + dx * dir * k;
    // legs: thigh and cannon, the far pair darker; front pair reaching, back pair driving
    const leg = (hx, ph, col, w) => {
      const sw = Math.sin(p + ph);
      const kx = X(hx + sw * 14); const ky = by + 26 * k - Math.max(0, sw) * 6 * k;
      const fx = X(hx + sw * 26 - Math.max(0, -sw) * 10); const fy = z - Math.max(0, Math.cos(p + ph)) * 14 * k;
      g.lineStyle(w * k, col, 1).lineBetween(X(hx), by - 4 * k, kx, ky).lineBetween(kx, ky, fx, fy);
      g.fillStyle(0x0e0a06, 1).fillRect(fx - 5 * k, fy - 5 * k, 10 * k, 6 * k); // the hoof
    };
    leg(38, Math.PI, 0x170f09, 9); leg(-40, Math.PI * 1.5, 0x170f09, 11);
    // the barrel of the body, the haunch and the chest
    g.fillStyle(c, 1).fillEllipse(x, by - 22 * k, 130 * k, 56 * k);
    g.fillCircle(X(-42), by - 28 * k, 30 * k).fillCircle(X(40), by - 26 * k, 27 * k);
    // neck: a thick wedge stretched forward, and the head
    g.fillTriangle(X(26), by - 50 * k, X(52), by - 6 * k, X(92), by - 70 * k);
    g.fillTriangle(X(26), by - 50 * k, X(80), by - 80 * k, X(92), by - 70 * k);
    g.fillEllipse(X(98), by - 70 * k, 44 * k, 22 * k);
    g.fillTriangle(X(80), by - 82 * k, X(86), by - 98 * k, X(90), by - 80 * k); // an ear laid back
    g.fillStyle(0xffd0a0, 1).fillRect(X(100) - 2 * k, by - 76 * k, 4 * k, 3 * k); // the white of an eye
    leg(30, 0, c, 10); leg(-34, Math.PI * 0.5, c, 12);
    // firelight along the back, the mane and the tail streaming behind
    g.lineStyle(3 * k, rim, 0.7).lineBetween(X(-60), by - 46 * k, X(20), by - 50 * k);
    g.lineStyle(6 * k, 0x120c08, 1).lineBetween(X(84), by - 84 * k, X(30), by - 54 * k + Math.sin(p * 2) * 4 * k);
    g.lineStyle(7 * k, 0x120c08, 1).lineBetween(X(-64), by - 36 * k, X(-104), by - 42 * k + Math.sin(p * 2 + 1) * 8 * k);
    g.lineStyle(2 * k, hi, 1).lineBetween(X(-30), by - 4 * k, X(30), by - 2 * k);
  }

  // The wood's swinging log (a blade hazard with `look: 'log'`, data/stageWood.js): a trunk
  // slung level on two ropes from a bough out of sight, swinging across the road. The painted
  // fallen trunk (bridge_log.png) where it's loaded, end-on to its swing.
  drawSwingLog(g, hz) {
    const s = this.stage.bladeState(hz);
    const len = 320;
    const pivotY = hz.z - 80 - len + 60;
    const tx = s.tipX; const ty = pivotY + Math.cos(s.a) * len;
    g.fillStyle(0x000000, 0.25).fillRect(hz.x - 110, hz.z - 2, 220, 4);
    g.fillStyle(0x000000, 0.35 + 0.25 * Math.abs(s.speed)).fillEllipse(tx, hz.z, 140, 12);
    // the two ropes, a little apart in depth so they read as two
    g.lineStyle(3, 0x6a5a40, 1);
    g.lineBetween(hz.x - 46, pivotY, tx - 46, ty - 10).lineBetween(hz.x + 46, pivotY, tx + 46, ty - 10);
    g.lineStyle(1, 0xa89870, 0.6);
    g.lineBetween(hz.x - 45, pivotY, tx - 45, ty - 10).lineBetween(hz.x + 47, pivotY, tx + 47, ty - 10);
    const T = this.scene.textures;
    if (T.exists('bridge-log')) {
      hz.log ??= this.scene.add.image(0, 0, 'bridge-log').setOrigin(0.5, 0.4);
      hz.log.setVisible(true).setPosition(tx, ty).setScale(160 / hz.log.frame.width).setRotation(-s.a * 0.35).setDepth(hz.z + 1.1);
    } else {
      g.fillStyle(0x3a2a1a, 1).fillRoundedRect(tx - 80, ty - 16, 160, 32, 14);
      g.fillStyle(0x5a4028, 1).fillRoundedRect(tx - 78, ty - 14, 156, 10, 6);
      g.fillStyle(0x8a6a48, 1).fillEllipse(tx + 78, ty, 14, 30);
    }
    // the rope lashings round it
    g.fillStyle(0x7a6a48, 1).fillRect(tx - 50, ty - 18, 7, 34).fillRect(tx + 43, ty - 18, 7, 34);
    const near = Math.abs(this.scene.player.x - hz.x) < 500;
    if (near && Math.abs(s.speed) > 0.98 && hz.t - (hz.lastWhoosh ?? -99) > 30) {
      hz.lastWhoosh = hz.t;
      playSfx(this.scene, 'heavySwing', { volume: 0.3, pitch: -900, minGapMs: 0 });
    }
    g.setDepth(hz.z + 1);
  }

  drawBlade(g, hz) {
    const s = this.stage.bladeState(hz);
    const len = 320;
    const pivotY = hz.z - 80 - len + 60; // above the top of the screen
    const tipY = hz.z - 70;
    const px = hz.x;
    const tx = s.tipX;
    const ty = pivotY + Math.cos(s.a) * len;
    // its lane on the floor: a dark scored line, and the blade's shadow racing along it
    g.fillStyle(0x000000, 0.25).fillRect(hz.x - 110, hz.z - 2, 220, 4);
    g.fillStyle(0x6a0a0a, 0.35).fillRect(hz.x - 110, hz.z - 1, 220, 1);
    g.fillStyle(0x000000, 0.4 + 0.25 * Math.abs(s.speed)).fillEllipse(tx, hz.z, 50, 8);
    // the chain's physics (view/BladeChain.js), stepped once per sim frame
    hz.chain = hz.chain ?? new BladeChain();
    const frame = this.scene.world.frame;
    hz.chain.step(frame - (hz.chainFrame ?? frame), len, s.omega);
    hz.chainFrame = frame;
    this.drawChain(g, hz.chain.points(px, pivotY, tx, ty), hz, s);
    // the crescent blade, turned with the swing (and kicked off its line by the chain)
    // (the angle is negated: the chain hangs at +a, toward +x, so the blade's own down
    // axis, (-sin, cos) after a turn of ang, has to turn the other way to line up with it)
    const ang = -(s.a + hz.chain.bladeTilt(len));
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const P = (lx, ly) => ({ x: tx + lx * c - ly * sn, y: ty + lx * sn + ly * c });
    if (this.painted.has('blade')) {
      // the painted blade (hung by its own short chain: the drawn chain above runs into it)
      hz.bladeImg = hz.bladeImg ?? this.scene.add.image(0, 0, 'blade').setOrigin(0.5, 1);
      const bl = P(0, 24);
      hz.bladeImg.setVisible(true).setPosition(bl.x, bl.y).setRotation(ang).setScale(0.5).setDepth(hz.z + 1.1);
    } else {
      const blade = [P(-46, -6), P(-30, 10), P(0, 22), P(30, 10), P(46, -6), P(24, 4), P(0, 10), P(-24, 4)];
      g.fillStyle(0x2a2a30, 1).fillPoints(blade, true);
      const edge = [P(-44, -4), P(-28, 11), P(0, 23), P(28, 11), P(44, -4), P(26, 8), P(0, 16), P(-26, 8)];
      g.fillStyle(0xc8ccd8, 1).fillPoints(edge, true);
      g.fillStyle(0x8a0a0a, 0.8).fillPoints([P(-10, 14), P(10, 14), P(4, 22), P(-4, 22)], true); // blood on the edge
    }
    // whoosh when it sweeps through the bottom
    const near = Math.abs(this.scene.player.x - hz.x) < 500;
    if (near && Math.abs(s.speed) > 0.98 && hz.t - (hz.lastWhoosh ?? -99) > 30) {
      hz.lastWhoosh = hz.t;
      playSfx(this.scene, 'heavySwing', { volume: 0.25, pitch: -500, minGapMs: 0 });
    }
    g.setDepth(hz.z + 1);
  }


  // The hanging chain along pts (pivot first, blade last; see view/BladeChain.js): real
  // interlocking links forged from round iron bar, each turned a quarter from the last, so
  // they alternate between open rings seen face-on and links seen edge-on that cross in
  // front of them. Each link is shaded as a rounded bar (dark rim, shadowed side, inner
  // edge, highlight and a glint on the side facing the light), with its weld seam, its own
  // rust and pitting, and a smudge of shadow where the next link bears on it. The chain
  // twists a little along its length, more while it swings fast, so the rings widen and
  // narrow. At the top: an iron ceiling plate, bolted, with a shackle the chain hangs from.
  drawChain(g, pts, hz, s) {
    const C = CHAIN;
    // arc length along the bent chain, and a point + direction at any distance down it
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const len = cum[cum.length - 1];
    const at = (d) => {
      let i = 1;
      while (i < pts.length - 1 && cum[i] < d) i++;
      const p = pts[i - 1];
      const q = pts[i];
      const sl = cum[i] - cum[i - 1] || 1;
      const u = Math.max(0, Math.min(1, (d - cum[i - 1]) / sl));
      return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u, ux: (q.x - p.x) / sl, uy: (q.y - p.y) / sl };
    };
    // an ellipse around (cx, cy) on the axes (ux, uy) / its normal, a along and b across,
    // from angle t0 to t1
    const ring = (cx, cy, ux, uy, a, b, t0 = 0, t1 = Math.PI * 2, n = 16) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = t0 + ((t1 - t0) * i) / n;
        const la = Math.cos(t) * a;
        const lb = Math.sin(t) * b;
        out.push({ x: cx + ux * la - uy * lb, y: cy + uy * la + ux * lb });
      }
      return out;
    };
    const rnd = (k, salt) => { const v = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453; return v - Math.floor(v); };

    // the ceiling mount: a bolted iron plate, a forged lug under it, and a shackle with its pin
    // (shaken by a blow coming up the chain)
    const jolt = hz.chain?.jolt ?? 0;
    const x0 = pts[0].x + Math.sin((hz.t ?? 0) * 2.7) * jolt * 1.6;
    const y0 = pts[0].y + Math.cos((hz.t ?? 0) * 3.1) * jolt * 0.8;
    g.fillStyle(C.dark, 1).fillRect(x0 - 17, y0 - 12, 34, 10);
    g.fillStyle(C.iron, 1).fillRect(x0 - 16, y0 - 11, 32, 8);
    g.fillStyle(C.shade, 1).fillRect(x0 - 16, y0 - 5, 32, 2);
    g.fillStyle(C.light, 0.6).fillRect(x0 - 16, y0 - 11, 32, 1.2);
    g.fillStyle(C.rust, 0.55).fillRect(x0 - 9, y0 - 6, 7, 2).fillRect(x0 + 6, y0 - 10, 5, 3);
    for (const bx of [-12, -5, 5, 12]) {
      g.fillStyle(C.dark, 1).fillCircle(x0 + bx, y0 - 7, 1.7);
      g.fillStyle(C.iron, 1).fillCircle(x0 + bx, y0 - 7, 1.1);
      g.fillStyle(C.glint, 0.8).fillCircle(x0 + bx - 0.4, y0 - 7.5, 0.45);
    }
    g.fillStyle(C.dark, 1).fillRect(x0 - 3.5, y0 - 3, 7, 5);
    g.fillStyle(C.iron, 1).fillRect(x0 - 2.5, y0 - 3, 5, 4);
    g.fillStyle(C.light, 0.5).fillRect(x0 - 2.5, y0 - 3, 1, 4);
    const d0 = at(4);
    const sh = ring(x0 + d0.ux * 1.5, y0 + d0.uy * 1.5, d0.ux, d0.uy, 4.5, 4, -Math.PI / 2, Math.PI / 2, 12);
    g.lineStyle(C.wire + 1.6, C.dark, 1).strokePoints(sh, false);
    g.lineStyle(C.wire + 0.4, C.iron, 1).strokePoints(sh, false);
    g.lineStyle(0.8, C.light, 0.7).strokePoints(sh.slice(0, 7), false);
    g.fillStyle(C.dark, 1).fillRect(x0 - 6, y0 - 1.2, 12, 2.6);
    g.fillStyle(C.iron, 1).fillRect(x0 - 5.5, y0 - 0.8, 11, 1.8);
    for (const e of [-6, 6]) g.fillStyle(C.dark, 1).fillCircle(x0 + e, y0, 1.6).fillStyle(C.shade, 1).fillCircle(x0 + e, y0, 1);

    const start = 9;
    const count = Math.max(2, Math.round((len - start) / C.pitch));
    const pitch = (len - start) / count;
    // the twist: a slow wind along the chain, wound tighter the faster it's swinging
    hz.twist = (hz.twist ?? 0) + (s?.omega ?? 0) * 2;
    const spin = 0.15 + 0.3 * Math.min(1, Math.abs(s?.omega ?? 0) / 0.02);
    const links = [];
    for (let k = 0; k <= count; k++) {
      const p = at(start + k * pitch);
      const twist = Math.sin(k * 0.45 + hz.twist) * spin;
      links.push({ ...p, face: k % 2 === 0, twist, k });
    }
    const a = C.length / 2;

    // the face-on rings
    for (const l of links) {
      if (!l.face) continue;
      const { x, y, ux, uy, k } = l;
      const lit = Math.atan2(-0.6 * -uy - 0.8 * ux, -0.6 * ux - 0.8 * uy); // light from up and to the left
      const b = Math.max(C.wire * 0.8, (C.width / 2) * Math.cos(l.twist)) - C.wire / 2;
      const ra = a - C.wire / 2;
      const loop = ring(x, y, ux, uy, ra, b);
      g.lineStyle(C.wire + 1.4, C.dark, 1).strokePoints(loop, true);
      g.lineStyle(C.wire, C.iron, 1).strokePoints(loop, true);
      // the shadowed half, and the dark line where the bar curves away into the hole
      g.lineStyle(C.wire * 0.55, C.shade, 1).strokePoints(ring(x, y, ux, uy, ra + 0.25, b + 0.25, lit + Math.PI - 1.5, lit + Math.PI + 1.5, 10), false);
      g.lineStyle(0.6, C.dark, 0.7).strokePoints(ring(x, y, ux, uy, ra - C.wire * 0.42, Math.max(0.3, b - C.wire * 0.42)), true);
      // the bar's highlight and one glint
      g.lineStyle(C.wire * 0.38, C.light, 0.9).strokePoints(ring(x, y, ux, uy, ra + 0.15, b + 0.15, lit - 0.85, lit + 0.85, 8), false);
      const gl = ring(x, y, ux, uy, ra + 0.2, b + 0.2, lit, lit, 1)[0];
      g.fillStyle(C.glint, 0.9).fillCircle(gl.x, gl.y, 0.55);
      // rust: a patch or two eaten into the bar, and a pit
      const patches = 1 + Math.floor(rnd(k, 1) * 2);
      for (let r = 0; r < patches; r++) {
        const t0 = rnd(k, 2 + r) * Math.PI * 2;
        g.lineStyle(C.wire * (0.4 + rnd(k, 5 + r) * 0.3), r ? C.rustDark : C.rust, 0.6).strokePoints(ring(x, y, ux, uy, ra, b, t0, t0 + 0.5 + rnd(k, 8 + r) * 0.9, 5), false);
      }
      const pit = ring(x, y, ux, uy, ra, b, rnd(k, 11) * 6.28, 0, 1)[0];
      g.fillStyle(C.rustDark, 0.9).fillCircle(pit.x, pit.y, 0.45);
      // the weld seam, across the bar on one long side
      const sm = ring(x, y, ux, uy, ra, b, Math.PI / 2, 0, 1)[0];
      g.lineStyle(0.6, C.dark, 0.8).lineBetween(sm.x - ux * 0.8, sm.y - uy * 0.8, sm.x + ux * 0.8, sm.y + uy * 0.8);
      // shadow where the links above and below bear on it, inside each end
      for (const e of [-1, 1]) g.fillStyle(C.dark, 0.55).fillCircle(x + ux * e * (ra - C.wire * 0.9), y + uy * e * (ra - C.wire * 0.9), 1.1);
    }
    // then the edge-on links over them: each one's near bar crosses in front of the rings it
    // threads through, which is what makes them read as linked rather than stacked
    for (const l of links) {
      if (l.face) continue;
      const { x, y, ux, uy, k } = l;
      const b = Math.max(C.wire * 0.6, (C.width / 2) * Math.abs(Math.sin(l.twist)));
      const side = -0.6 * -uy - 0.8 * ux >= 0 ? 1 : -1; // which side of it faces the light
      g.fillStyle(C.dark, 1).fillPoints(ring(x, y, ux, uy, a + 0.7, b + 0.7), true);
      g.fillStyle(C.iron, 1).fillPoints(ring(x, y, ux, uy, a, b), true);
      g.fillStyle(C.shade, 1).fillPoints(ring(x - uy * -side * b * 0.45, y + ux * -side * b * 0.45, ux, uy, a - 0.6, b * 0.5), true);
      if (b - C.wire > 0.45) g.fillStyle(C.dark, 0.95).fillPoints(ring(x, y, ux, uy, a - C.wire, b - C.wire), true); // turned far enough to see into
      const hx = -uy * side * b * 0.5;
      const hy = ux * side * b * 0.5;
      g.lineStyle(0.8, C.light, 0.85).lineBetween(x - ux * (a - 1.6) + hx, y - uy * (a - 1.6) + hy, x + ux * (a - 1.6) + hx, y + uy * (a - 1.6) + hy);
      g.fillStyle(C.glint, 0.9).fillCircle(x - ux * (a - 2.2) + hx, y - uy * (a - 2.2) + hy, 0.55);
      // the weld bulge in its middle, and rust
      g.lineStyle(0.6, C.dark, 0.7).lineBetween(x + uy * b, y - ux * b, x - uy * b, y + ux * b);
      const ro = (rnd(k, 3) - 0.5) * (a * 1.4);
      g.fillStyle(rnd(k, 4) < 0.5 ? C.rust : C.rustDark, 0.8).fillCircle(x + ux * ro, y + uy * ro, 0.6 + rnd(k, 6) * 0.6);
    }
  }

  // ------------------------------------------------------------ events

  listen() {
    const ev = this.scene.world.events;
    listenScorpion(this);
    ev.on('propHit', ({ prop, dir }) => this.propHit(prop, dir));
    ev.on('propBreak', ({ prop, dir, blast, power }) => this.propBreak(prop, dir, blast, power));
    ev.on('propImpact', ({ prop }) => {
      const v = this.propSprites.get(prop.id);
      if (!v) return;
      if (v.pair?.state === 'falling') { this.pairFrame(v.pair, 2); this.shatter.lampLands(prop, v, true); return; }
      this.shatter.lampLands(prop, v);
    });
    // a hay cart catches (a lamp fell on it): the painted cart alight, then charred
    ev.on('propIgnite', ({ prop }) => {
      const v = this.propSprites.get(prop.id);
      if (v?.pair) { v.pair.state = 'burning'; v.pair.lit = this.scene.time.now; playSfx(this.scene, 'fireWhoosh', { volume: 0.9, pitch: -400, minGapMs: 0 }); return; }
      if (!v?.img?.active) return;
      // the hay catches: a burst of flame, then the painted cart alight fades in over it
      const g = this.scene.gore;
      g.fx('fx-fireburst', prop.x, prop.z - (prop.y ?? 0) - 40, prop.z + 2, { size: 150, add: true, dur: 700, grow: 1.5, drift: 30 });
      g.fx('fx-smoke', prop.x, prop.z - 90, prop.z + 1, { size: 140, dur: 2200, grow: 1.8, alpha: 0.7, drift: 70 });
      if (this.scene.textures.exists('cartwreck-broken')) {
        const lit = this.scene.add.image(v.img.x, v.img.y, 'cartwreck-broken').setOrigin(0.5, 1).setScale(v.img.scaleX, v.img.scaleY).setFlipX(v.img.flipX).setDepth(v.img.depth + 0.01).setAlpha(0);
        this.scene.tweens.add({ targets: lit, alpha: 1, duration: 900, onComplete: () => { if (v.img.active) v.img.setTexture('cartwreck-broken'); lit.destroy(); } });
      }
      playSfx(this.scene, 'fireWhoosh', { volume: 0.9, pitch: -400, minGapMs: 0 });
    });
    ev.on('propBurnt', ({ prop }) => {
      const v = this.propSprites.get(prop.id);
      if (v?.pair) { v.pair.state = 'burnt'; this.pairFrame(v.pair, 7); this.scene.gore.fx('fx-smoke', prop.x, prop.z - 90, prop.z + 1, { size: 120, dur: 3000, grow: 1.8, alpha: 0.6, drift: 80 }); return; }
      if (!v?.img?.active || prop.broken) return;
      // burnt out: the charred skeleton of the cart (view/propArt.js), smoking
      if (this.art2.has('haycart-burnt')) {
        const w = v.img.displayWidth;
        v.img.setTexture('haycart-burnt').clearTint().setScale(w / this.scene.textures.get('haycart-burnt').getSourceImage().width);
        this.scene.gore.fx('fx-smoke', prop.x, prop.z - 70, prop.z + 1, { size: 120, dur: 3000, grow: 1.8, alpha: 0.6, drift: 80 });
      } else v.img.setTexture('cartwreck').setTint(0x3a2c26);
    });
    // knocked off its stack: it tumbles, turning over as it drops (syncStacked)
    ev.on('propKnocked', ({ prop }) => {
      playSfx(this.scene, 'doorClose2', { volume: 0.55, pitch: -200 + Math.random() * 300, minGapMs: 0 });
      this.chips(prop, 4, prop.fall?.dir > 0 ? 1 : -1);
    });
    // a barrel knocked over: it goes down on its side, then rolls (syncTumble)
    ev.on('propTip', ({ prop, dir }) => {
      const v = this.propSprites.get(prop.id);
      if (!v?.img?.active) return;
      playSfx(this.scene, 'kick', { volume: 0.7, pitch: -600, minGapMs: 0 });
      playSfx(this.scene, 'doorClose1', { volume: 0.5, pitch: 200, minGapMs: 0 });
      this.chips(prop, 6, dir);
      v.tipped = { t: 0, dir, w: v.img.displayWidth, h: v.img.displayHeight };
      v.rim?.setVisible(false);
    });
    ev.on('propRest', ({ prop }) => {
      playSfx(this.scene, 'kick', { volume: 0.35, pitch: -300, minGapMs: 0 });
      this.shatter.dust(prop, 0x8a7a64, 0);
    });
    // a crate stacked on one that broke lands: a thud and dust
    ev.on('propLand', ({ prop }) => {
      playSfx(this.scene, 'kick', { volume: 0.6, pitch: -900, minGapMs: 0 });
      this.shatter.dust(prop, 0x8a7a64, 1);
    });
    ev.on('chestOpen', ({prop}) => {
      const v=this.propSprites.get(prop.id);
      if(!v)return;
      v.img.setTexture('prop-chest-open').clearTint();
      if(v.light)lightProp(v.img,v.light);
      this.scene.tweens.add({targets:v.img,scaleY:v.s*1.08,duration:120,yoyo:true,ease:'Sine.easeOut'});
    });
    ev.on('bladeStruck', ({ hazard, dir, force }) => {
      const s = this.stage.bladeState(hazard);
      hazard.chain?.kick(dir, force ? 1.4 : 1); // the blow shakes the chain as well as turning the swing
      // and the jolt up the chain shakes grit loose from round the ceiling mount
      for (let i = 0; i < 10; i++) {
        this.scene.gore.spawn({ x: hazard.x + rand(-14, 14), z: hazard.z, h: 330 + rand(0, 12), vx: rand(-20, 20), vz: 0, vh: rand(-30, 10), tint: 0x8a8070, scale: rand(0.15, 0.35), decal: false, life: 70 });
      }
      playSfx(this.scene, 'block', { volume: 1, pitch: force ? -900 : -300, minGapMs: 0 });
      playSfx(this.scene, 'heavySwing', { volume: 0.6, pitch: -700, minGapMs: 0 });
      this.scene.gore.spark(s.tipX, hazard.z - 30, 30, force ? 0xffb060 : 0xfff0c0, 26);
      this.scene.fx?.shake(5, 12);
      this.scene.callout(force ? 'BLADE HURLED BACK!' : 'BLADE STRUCK!', '#ffd24a', 22);
    });
    ev.on('propKick', ({ prop, dir }) => {
      playSfx(this.scene, 'kick', { volume: 0.9, pitch: -100, minGapMs: 0 });
      this.chips(prop, 8, dir);
    });
    ev.on('pickup', (e) => this.pickup(e));
    ev.on('hazardFire', ({ hazard }) => {
      if (Math.abs(this.scene.player.x - hazard.x) < 600) playSfx(this.scene, 'fireWhoosh', { volume: 0.5, minGapMs: 0 });
    });
    ev.on('beamCrash', ({ hazard: hz }) => {
      const y = hz.y ?? 0;
      if (Math.abs(this.scene.player.x - hz.x) < 700) {
        playSfx(this.scene, 'kick', { volume: 0.9, pitch: -1500, minGapMs: 0 });
        playSfx(this.scene, 'fireWhoosh', { volume: 0.4, minGapMs: 0 });
        this.scene.fx?.shake(6, 14);
      }
      this.scene.gore.spark(hz.x, hz.z, y + 10, 0xffa040, 26);
      for (let i = 0; i < 18; i++) {
        this.scene.gore.spawn({ x: hz.x + rand(-hz.w / 2, hz.w / 2), z: hz.z + rand(-6, 6), h: y + 4, vx: rand(-160, 160), vz: rand(-30, 30), vh: rand(80, 260), tint: i % 3 ? 0x3a2414 : 0xff8a30, texture: 'px', scale: rand(0.8, 1.8), decal: false, life: rand(30, 60) });
      }
    });
    ev.on('stampedeWarn', ({ hazard: hz }) => {
      if (this.scene.player.x > hz.x0 - 700 && this.scene.player.x < hz.x1 + 700) {
        playSfx(this.scene, 'kick', { volume: 0.7, pitch: -2000, minGapMs: 0 });
        this.scene.fx?.shake(3, 40);
      }
    });
    ev.on('stampedeBurst', ({ hazard: hz }) => {
      // the herd breaks out of the door: a thud of hooves and a burst of dust and embers
      const d = hz.door;
      if (!d || Math.abs(this.scene.player.x - d.x) > 1100) return;
      playSfx(this.scene, 'kick', { volume: 0.8, pitch: -2400, minGapMs: 0 });
      this.scene.fx?.shake(5, 30);
      for (let i = 0; i < 14; i++) {
        this.scene.gore.spawn({ x: d.x + rand(-45, 45), z: d.z + rand(0, 24), h: rand(0, 60), vx: (hz.dir ?? 1) * rand(30, 160), vz: rand(20, 120), vh: rand(40, 140), tint: i % 4 ? 0x8a7a64 : 0xff8a30, scale: rand(0.7, 1.5), decal: false, life: rand(30, 55) });
      }
    });
    ev.on('hazardHit', ({ fighter, kind }) => { if (kind === 'arrow') this.pinArrows(fighter); });
    ev.on('shellLaunch', ({ hazard: hz }) => {
      if (hz.look === 'arrows') {
        // the bowmen loose: a hiss of arrows overhead, the posts' bowmen lean into it
        if (Math.abs(this.scene.player.x - (this.stage.section?.x0 ?? 0)) < 2400) playSfx(this.scene, 'whiff', { volume: 0.6, pitch: 700, minGapMs: 0 });
        for (const pr of this.stage.props) {
          if (pr.kind !== 'archers' || pr.broken || (hz.silence && pr.tag !== hz.silence)) continue;
          this.siege.volley(pr);
        }
        return;
      }
      // the catapults on the heights kick as they throw
      const near = Math.abs(this.scene.player.x - (this.stage.section?.x0 ?? 0)) < 2400;
      if (near) playSfx(this.scene, 'heavySwing', { volume: 0.5, pitch: -900, minGapMs: 0 });
      for (const pr of this.stage.props) {
        if (pr.kind !== 'catapult' || pr.broken || (hz.silence && pr.tag !== hz.silence)) continue;
        this.siege.throw(pr);
      }
    });
    ev.on('shellLand', ({ hazard: hz, shell: s }) => {
      const y = s.y ?? 0;
      if (hz.look === 'arrows') {
        // a volley landing: a patter of thuds, dirt kicked up, the arrows left standing in it
        if (Math.abs(this.scene.player.x - s.x) < 800) playSfx(this.scene, 'kick', { volume: 0.35, pitch: 900, minGapMs: 0 });
        this.scene.gore.spark(s.x, s.z, y + 4, 0xd8c8a8, 8);
        this.plantArrows(hz, s);
        return;
      }
      if (Math.abs(this.scene.player.x - s.x) < 800) {
        playSfx(this.scene, 'kick', { volume: 1, pitch: -1700, minGapMs: 0 });
        this.scene.fx?.shake(7, 14);
      }
      this.scene.gore.spark(s.x, s.z, y + 10, 0xd8c8a8, 20);
      for (let i = 0; i < 22; i++) {
        this.scene.gore.spawn({ x: s.x + rand(-30, 30), z: s.z + rand(-8, 8), h: y + 4, vx: rand(-220, 220), vz: rand(-40, 40), vh: rand(120, 360), tint: i % 3 ? 0x4a4650 : 0x8a8070, texture: 'px', scale: rand(0.8, 2), decal: false, life: rand(30, 70) });
      }
      const ring = this.scene.add.ellipse(s.x, s.z - y, 30, 10).setStrokeStyle(3, 0xd8c8b0, 0.8).setDepth(DEPTH.shadows + 0.1);
      this.scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 300, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    });
    ev.on('collapseStart', ({ chained }) => {
      playSfx(this.scene, 'kick', { volume: 1, pitch: -2200, minGapMs: 0 });
      this.scene.fx?.shake(10, 40);
      this.scene.callout(chained ? 'FASTER!' : 'RUN!', '#ffb070', 30); // (chained: the next stretch of the chase, the rock still coming)
    });
    ev.on('wayOpen', ({ block: b }) => {
      playSfx(this.scene, 'block', { volume: 0.9, pitch: -900, minGapMs: 0 });
      this.scene.fx?.shake(5, 16);
      for (let i = 0; i < 16; i++) {
        this.scene.gore.spawn({ x: rand(b.x0, b.x1), z: rand(b.z0 ?? 300, b.z1 ?? 500), h: rand(10, 120), vx: rand(-80, 80), vz: 0, vh: rand(40, 160), tint: 0x6a6258, texture: 'px', scale: rand(0.8, 1.6), decal: false, life: rand(30, 60) });
      }
    });
    ev.on('secretFound', ({ count, total }) => this.scene.callout(`SECRET FOUND  ${count}/${total}`, '#ffd24a', 26));
  }

  // kicked crates and chests skidding down the lane: rattling, hopping, trailing splinters
  syncKicked() {
    for (const pr of this.stage.props) {
      if (!pr.fly || pr.broken) continue;
      const v = this.propSprites.get(pr.id);
      const t = pr.fly.left;
      v.img.setPosition(pr.x, pr.z - (pr.y ?? 0) - Math.abs(Math.sin(t * 0.045)) * 9).setAngle(Math.sin(t * 0.09) * 7 * pr.fly.dir);
      v.shadow?.setPosition(pr.x, pr.z - (pr.y ?? 0));
      moveGround(v.ground, pr.x, pr.z - (pr.y ?? 0), { grit: false }); // (its grit stays where it stood)
      v.rim?.setPosition(pr.x - v.img.displayWidth * 0.32, pr.z - (pr.y ?? 0) - v.img.displayHeight * 0.55);
      if (Math.floor(t / 40) !== Math.floor((t + 11) / 40)) this.chips(pr, 2, -pr.fly.dir);
    }
  }

  // crates stacked on others: where they are now (one comes down when what it stood on goes)
  syncStacked() {
    for (const pr of this.stage.props) {
      if (pr.under === undefined || pr.broken) continue;
      const v = this.propSprites.get(pr.id);
      if (!v?.img?.active || pr.fly) continue;
      const y = pr.y ?? 0;
      v.img.setPosition(pr.x, pr.z - y).setDepth(pr.z);
      if (pr.fall) { v.spun = (v.spun ?? 0) + pr.fall.dir * (pr.fall.spin ? 2.2 : 1); v.img.setAngle(v.spun); }
      else if (v.spun) {
        // down: it settles on whichever face it landed nearest (a crate lands on a side)
        const flat = Math.round(v.spun / 90) * 90;
        v.spun += (flat - v.spun) * 0.3;
        if (Math.abs(flat - v.spun) < 0.5) v.spun = flat % 360 || 0;
        v.img.setAngle(v.spun);
      }
      v.rim?.setPosition(pr.x - v.img.displayWidth * 0.32, pr.z - y - v.img.displayHeight * 0.55);
      if (v.ground && !v.landed && !pr.fall && pr.y === (pr.floorY ?? 0)) { v.landed = true; moveGround(v.ground, pr.x, pr.z - y); v.ground.forEach((g) => g.setVisible(true)); }
    }
  }

  // tipped barrels: going over onto their side, then rolling down the lane, bobbing on the staves
  syncTumble() {
    for (const pr of this.stage.props) {
      if (!pr.tipped || pr.broken) continue;
      const v = this.propSprites.get(pr.id);
      const T = v?.tipped;
      if (!T || !v.img.active) continue;
      T.t = Math.min(1, T.t + 0.12);
      const e = 1 - (1 - T.t) * (1 - T.t);
      const y = pr.z - (pr.y ?? 0);
      // (turned about its middle: lying down, it is as tall as it was wide)
      const cy = y - (T.h / 2) * (1 - e) - (T.w / 2) * e;
      const bob = pr.tumble ? Math.abs(Math.sin(pr.x * 0.08 + pr.z * 0.12)) * 2 : 0;
      // once it's down: the painted barrel lying on its side (view/propArt.js street)
      if (T.t >= 1 && this.art2.has('prop-barrel-tipped')) {
        // (rolling: the painted barrel on its side throwing dust; at rest, lying still; a tar barrel spills its tar)
        const tar = v.key?.includes('tar');
        const want = pr.tumble && this.art2.has('barrel-rolling') ? 'barrel-rolling' : tar && this.art2.has('barrel-tarspill') ? 'barrel-tarspill' : 'prop-barrel-tipped';
        if (T.art !== want) { T.art = want; v.img.setTexture(want).setScale((T.h * 1.05) / this.scene.textures.get(want).getSourceImage().width).setFlipX(T.dir < 0); if (v.light) lightProp(v.img, v.light); }
        v.img.setOrigin(0.5, 1).setAngle(0).setPosition(pr.x, y - bob).setDepth(pr.z);
        moveGround(v.ground, pr.x, y, { grit: false });
        if (pr.tumble && Math.random() < 0.3) this.scene.gore.spawn({ x: pr.x, z: pr.z + 3, h: 2, vx: rand(-20, 20), vz: -pr.tumble.zDir * rand(10, 40), vh: rand(20, 60), tint: 0x3a2e22, scale: rand(0.4, 0.8), decal: false, life: 25 });
        continue;
      }
      v.img.setOrigin(0.5, 0.5).setPosition(pr.x, cy - bob).setAngle(T.dir * 90 * e + (v.tilt ?? 0) * (1 - e)).setDepth(pr.z);
      moveGround(v.ground, pr.x, y, { grit: false });
      if (pr.tumble && Math.random() < 0.3) this.scene.gore.spawn({ x: pr.x, z: pr.z + 3, h: 2, vx: rand(-20, 20), vz: -pr.tumble.zDir * rand(10, 40), vh: rand(20, 60), tint: 0x3a2e22, scale: rand(0.4, 0.8), decal: false, life: 25 });
    }
  }

  // the convoy's wagon rolling up the road (Stage.updateRolling): it rocks on its wheels and
  // throws up mud; gone round the bend once it escapes
  syncRolling() {
    for (const pr of this.stage.props) {
      if (!pr.roll || pr.broken) continue;
      const v = this.propSprites.get(pr.id);
      if (!v?.img?.active) continue;
      if (pr.escaped) {
        if (!v.gone) { v.gone = true; this.scene.tweens.add({ targets: [v.img, v.shadow, v.under, ...(v.ground ?? []), v.rim].filter(Boolean), alpha: 0, duration: 900 }); }
        continue;
      }
      if (v.gone) { v.gone = false; v.under?.setAlpha(0.55); v.img.setAlpha(1); v.shadow?.setAlpha(0.35); v.ground?.forEach((g, i) => g.setAlpha(i ? 1 : 0.85)); v.rim?.setAlpha(0.4); } // (back where it started: the checkpoint)
      const moving = pr.x > (pr.roll.from ?? pr.x) && !pr.halted; // (halted: stage/WoodTraps.js)
      const t = this.scene.time.now / 16.7;
      v.img.setPosition(pr.x, pr.z - (pr.y ?? 0) - (moving ? Math.abs(Math.sin(t * 0.25)) * 2 : 0)).setAngle(moving ? Math.sin(t * 0.13) * 0.8 : 0);
      v.shadow?.setPosition(pr.x, pr.z - (pr.y ?? 0));
      moveGround(v.ground, pr.x, pr.z - (pr.y ?? 0));
      // its weight in the mud: a dark pool of shadow under the bed, and the two ruts its wheels
      // cut behind it, back to where it started rolling
      v.under ??= this.scene.add.ellipse(0, 0, pr.w * 1.05, 26, 0x000000, 0.55).setDepth(DEPTH.floor + 2);
      v.under.setPosition(pr.x, pr.z - 2);
      v.ruts ??= this.scene.add.graphics().setDepth(DEPTH.floor + 1.5);
      v.rutFrom ??= pr.x;
      if (Math.abs((v.rutTo ?? -1) - pr.x) > 2) {
        v.rutTo = pr.x;
        const from = Math.min(v.rutFrom, pr.x) - pr.w * 0.35;
        v.ruts.clear();
        for (const [dz, a] of [[-10, 0.45], [4, 0.6]]) {
          v.ruts.fillStyle(0x0a0806, a).fillRect(from, pr.z + dz - 3, pr.x - pr.w * 0.3 - from, 6);
          v.ruts.fillStyle(0x6a7a84, 0.12).fillRect(from, pr.z + dz - 3, pr.x - pr.w * 0.3 - from, 1.5); // (water in them)
        }
      }
      if (moving && Math.floor(t) % 6 === 0) {
        this.scene.gore.spawn({ x: pr.x - pr.w / 2 + 10, z: pr.z + 4, h: 4, vx: -rand(20, 70), vz: 0, vh: rand(20, 60), tint: 0x3a2e22, scale: rand(0.4, 0.8), decal: false, life: 30 });
      }
    }
  }

  update() {
    if (!this.chestHint) this.chestHint=this.scene.add.text(0,0,'E / D-PAD UP · OPEN',{fontFamily:'Georgia',fontSize:'15px',color:'#ffe0a0',stroke:'#17100a',strokeThickness:4}).setOrigin(.5,1);
    const chest=this.stage.chestPrompt;
    this.chestHint.setVisible(!!chest && !chest.opened);
    if(chest)this.chestHint.setPosition(chest.x,chest.z-(chest.y??0)-chest.h-10).setDepth(chest.z+100);
    this.siege.update();
    this.syncStacked();
    this.syncPairs();
    this.syncTumble();
    this.shatter.update(this.scene.game.loop.delta);
    this.syncRolling();
    this.syncKicked();
    this.syncPickups();
    this.drawHazards();
  }
}
