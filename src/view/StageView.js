// StageView.js — Draws THE OATH ROAD's moving parts (stage/Stage.js): each section's
// floor and light, the breakable props, pickups, fire grates and pendulum blades, and
// reacts to the stage's events with debris, flames, sparks and sound.
//
// Props and pickups are painted here as small canvas textures (pixel art at 2x), so the
// stage works with no extra image files.

import { SETTINGS } from '../config/settings.js';
import { DEPTH } from './depths.js';
import { PICKUPS } from '../data/stage.js';
import { playSfx } from '../core/Sfx.js';
import { buildPropSheet, PROP_HD } from './propSheet.js';
import { FX } from './stripImporter.js';
import { BladeChain } from './BladeChain.js';

const rand = (a, b) => a + Math.random() * (b - a);

// The pendulum blades' chain (world px): one link's outer length and width, the round
// bar it's forged from, the spacing of the links (a link's length less the two bars that
// interlock), and its rusted-iron colours (matched to the painted blade's own chain).
const CHAIN = {
  length: 12, width: 7.5, wire: 2, pitch: 8,
  dark: 0x140e0b, shade: 0x3a2e28, iron: 0x5e4d42, light: 0xc09c80, glint: 0xf0dcc8, rust: 0x8a4424, rustDark: 0x5a2814,
};

export class StageView {
  constructor(scene, stage) {
    this.scene = scene;
    this.stage = stage;
    this.makeTextures();
    this.buildSections();
    this.propSprites = new Map();
    for (const pr of stage.props) this.propSprites.set(pr.id, this.makeProp(pr));
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
    this.hd = buildPropSheet(this.scene, 'props-hd-src', PROP_HD, 3, 2, true); // (replaces the old breakables)
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
    this.canvasTex('pk-meat', 40, 30, (c) => {
      c.fillStyle = '#e8dcc0'; c.fillRect(2, 13, 14, 5); c.beginPath(); c.arc(4, 12, 3, 0, 7); c.arc(4, 19, 3, 0, 7); c.fill();
      c.fillStyle = '#8a3a1a'; c.beginPath(); c.ellipse(26, 15, 13, 11, 0, 0, 7); c.fill();
      c.fillStyle = '#c86a3a'; c.beginPath(); c.ellipse(24, 12, 8, 6, 0, 0, 7); c.fill();
    });
    this.canvasTex('pk-wine', 22, 40, (c) => {
      c.fillStyle = '#2a0a14'; c.fillRect(8, 0, 6, 12); c.fillStyle = '#6a1a2a'; c.beginPath(); c.ellipse(11, 26, 10, 13, 0, 0, 7); c.fill();
      c.fillStyle = '#c84a5a'; c.fillRect(5, 20, 3, 9); c.fillStyle = '#d8b080'; c.fillRect(7, 0, 8, 3);
    });
    this.canvasTex('pk-mana', 22, 36, (c) => {
      c.fillStyle = '#c8c8d0'; c.fillRect(8, 0, 6, 9); c.fillStyle = '#1a3aaa'; c.beginPath(); c.arc(11, 23, 11, 0, 7); c.fill();
      c.fillStyle = '#6a9aff'; c.beginPath(); c.arc(8, 20, 4, 0, 7); c.fill();
    });
    this.canvasTex('pk-relic', 30, 36, (c) => {
      c.fillStyle = '#b08020'; c.beginPath(); c.moveTo(3, 2); c.lineTo(27, 2); c.lineTo(20, 18); c.lineTo(10, 18); c.closePath(); c.fill();
      c.fillRect(13, 18, 4, 10); c.fillRect(7, 28, 16, 5);
      c.fillStyle = '#ffe080'; c.fillRect(6, 4, 5, 8); c.fillStyle = '#c0161c'; c.fillRect(13, 8, 4, 4);
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
    this.canvasTex('prop-wagon', 420, 240, (c, w, h) => wagon(c, w, h, false));
    this.canvasTex('prop-wagon-broken', 420, 240, (c, w, h) => wagon(c, w, h, true));
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
        scene.add.tileSprite(sec.x0, top, width, H - top, key).setOrigin(0).setDepth(DEPTH.floor + 1.5)
          .setTileScale(s, s).setTint(Phaser.Display.Color.GetColor(b, b, b));
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
    const key = `prop-${pr.kind}`;
    // (a level's painted prop, data/levelArt.js: sized to the prop, whatever size it was painted)
    const lvl = (this.scene.registry.get('levelArt') ?? []).includes(key);
    const s = lvl ? (pr.w * 1.3) / this.scene.textures.get(key).getSourceImage().width : this.hd.has(key) ? 0.25 : 0.5;
    if (pr.kind === 'wall') {
      // set into the back wall: the alcove waits behind it
      const y = SETTINGS.world.floorTop - 4;
      const alcove = this.scene.add.image(pr.x, y, 'alcove').setOrigin(0.5, 1).setScale(s).setDepth(DEPTH.floor + 2.5).setVisible(false);
      const img = this.scene.add.image(pr.x, y, key).setOrigin(0.5, 1).setScale(s).setDepth(DEPTH.floor + 2.6);
      return { img, alcove, s };
    }
    // (y: up on a ledge, it's drawn on the ledge; its shadow too, just over the ledge's top)
    const y = pr.y ?? 0;
    const img = this.scene.add.image(pr.x, pr.z - y, key).setOrigin(0.5, 1).setScale(s).setDepth(pr.z);
    const shadow = this.scene.add.ellipse(pr.x, pr.z - y, pr.w * 1.2, 10, 0x000000, 0.35).setDepth(y ? pr.z - 0.3 : DEPTH.shadows);
    return { img, shadow, s };
  }

  propHit(pr, dir) {
    const v = this.propSprites.get(pr.id);
    playSfx(this.scene, pr.kind === 'wall' ? 'block' : 'kick', { volume: 0.5, pitch: pr.kind === 'wall' ? -600 : -200, minGapMs: 0 });
    this.scene.tweens.add({ targets: v.img, x: pr.x + dir * 4, duration: 40, yoyo: true, repeat: 1 });
    this.chips(pr, 6, dir);
    if (pr.kind !== 'wall') v.img.setTint(0xd8c8b8); // knocked about: duller, dustier
    if (pr.kind === 'wall') v.img.setTint(0xffffff - 0x101010 * (5 - pr.hp));
  }

  propBreak(pr, dir, blast = false) {
    const v = this.propSprites.get(pr.id);
    playSfx(this.scene, 'kick', { volume: blast ? 1 : 0.8, pitch: blast ? -700 : -400, minGapMs: 0 });
    this.scene.fx?.shake(pr.kind === 'wall' || blast ? 6 : 3, blast ? 14 : 10);
    this.chips(pr, pr.kind === 'wall' ? 40 : blast ? 46 : 18, dir);
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
    const wreck = pr.kind === 'chest' ? 'prop-chest-open' : `prop-${pr.kind}-broken`;
    if (this.scene.textures.exists(wreck)) {
      v.img.setTexture(wreck).setOrigin(0.5, 1).setPosition(pr.x, pr.z - (pr.y ?? 0)).setDepth(pr.z - 0.2).clearTint();
      v.img.setScale(v.s * 1.25, v.s * 0.6);
      this.scene.tweens.add({ targets: v.img, scaleX: v.s, scaleY: v.s, duration: 160, ease: 'Back.easeOut' });
      v.shadow?.setAlpha(0.2);
    } else {
      v.img.destroy();
      v.shadow?.destroy();
    }
    if (v.alcove) {
      v.alcove.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: v.alcove, alpha: 1, duration: 500 });
      this.scene.callout('A HIDDEN SHRINE!', '#ffd24a', 24);
    }
  }

  chips(pr, n, dir) {
    const colors = pr.kind === 'wall' ? [0x5a524a, 0x3e3732, 0x8a8070] : pr.kind === 'urn' ? [0x9a5a3a, 0x3a1e14]
      : pr.kind === 'chest' ? [0x5a3418, 0x3a3a42, 0xc8a040] : [0x7a4a24, 0x3a2210, 0x5a5a62];
    const gore = this.scene.gore;
    for (let i = 0; i < n; i++) {
      gore.spawn({
        x: pr.x + rand(-pr.w / 2, pr.w / 2), z: pr.z + rand(-4, 4), h: (pr.y ?? 0) + rand(8, pr.h),
        vx: dir * rand(40, 260) + rand(-80, 80), vz: rand(-40, 40), vh: rand(120, 380),
        tint: colors[i % colors.length], texture: 'px', scale: rand(0.8, 2), decal: false, life: rand(40, 90), spin: rand(-10, 10),
      });
    }
  }

  // ------------------------------------------------------------ pickups

  syncPickups() {
    const live = new Set(this.stage.pickups);
    for (const pk of this.stage.pickups) {
      if (this.pickupSprites.has(pk)) continue;
      const img = this.scene.add.image(pk.x, pk.z, `pk-${pk.kind}`).setOrigin(0.5, 1).setScale(pk.kind === 'shrine' ? 0.7 : 0.75);
      const glow = this.scene.add.image(pk.x, pk.z - 12, 'glow').setScale(1.4).setTint(PICKUPS[pk.kind].color).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
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
    playSfx(this.scene, 'block', { volume: 0.4, pitch: 900, minGapMs: 0 });
    this.scene.gore.spark(pk.x, pk.z, 20, def.color, 14);
    const what = def.heal && def.mana ? 'FULLY RESTORED' : def.heal ? `+HEALTH  (${def.label})` : def.mana ? '+MANA' : def.label;
    this.scene.callout(what, def.score ? '#ffd24a' : '#e0c080', 22);
  }

  // ------------------------------------------------------------ hazards

  drawHazards() {
    const cam = this.scene.cameras.main.worldView;
    for (const hz of this.stage.hazards) {
      if (hz.type === 'stampede') { this.drawStampede(hz, cam); continue; }
      if (hz.type === 'collapse') { this.drawCollapse(hz, cam); continue; }
      if (hz.type === 'bombard') { this.drawBombard(hz); continue; }
      if (hz.x < cam.x - 200 || hz.x > cam.right + 200) {
        hz.view?.setVisible(false);
        hz.hot?.setVisible(false);
        hz.bladeImg?.setVisible(false);
        hz.glow?.setVisible(false);
        hz.g?.setVisible(false);
        continue;
      }
      if (hz.type === 'fire') this.drawFire(hz);
      else if (hz.type === 'beam') this.drawBeam(hz);
      else {
        hz.g = hz.g ?? this.scene.add.graphics();
        this.drawBlade(hz.g.clear().setVisible(true), hz);
      }
    }
  }

  drawFire(hz) {
    if (!hz.view) {
      const cart = hz.look === 'cart';
      hz.view = this.scene.add.image(hz.x, hz.z, cart ? 'cartwreck' : 'grate').setDisplaySize(hz.w, hz.d * (cart ? 1 : 0.75)).setDepth(DEPTH.floor + 4);
      // (painted sheet: the same grate red-hot, faded in over the cold one as it heats)
      if (!cart && this.painted.has('grate-hot')) hz.hot = this.scene.add.image(hz.x, hz.z, 'grate-hot').setDisplaySize(hz.w, hz.d * 0.75).setDepth(DEPTH.floor + 4.05).setAlpha(0);
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
    // warning: the grate glows hotter and embers rise — readable well before it goes off
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
    if (!live) return;
    const { phase, warnT, since } = this.stage.beamPhase(hz);
    if (hz.look === 'rock') { this.drawRockfall(g, hz, gy, y, phase, warnT, since); return; }
    if (phase === 'warn') {
      // the shadow and the reach, growing and darkening
      g.fillStyle(0x000000, 0.2 + 0.45 * warnT).fillEllipse(hz.x, gy, hz.w * (0.6 + 0.6 * warnT), hz.d * 0.5 * (0.6 + 0.6 * warnT));
      g.lineStyle(2, 0xffa050, 0.35 + 0.5 * warnT).strokeEllipse(hz.x, gy, hz.w * 1.2, hz.d * 0.6);
      // the beam itself, high up and shaking loose
      const shake = Math.sin(hz.t * 1.3) * 3 * warnT;
      const by = gy - 230 + warnT * 30;
      g.fillStyle(0x2a1a10, 1).fillRect(hz.x - hz.w / 2 + shake, by, hz.w, 14);
      g.fillStyle(0xff7a2a, 0.9).fillRect(hz.x - hz.w / 2 + 6 + shake, by + 4, hz.w - 12, 3);
      if (hz.t % 4 === 0) {
        this.scene.gore.spawn({ x: hz.x + rand(-hz.w / 2, hz.w / 2), z: hz.z, h: y + 220, vx: rand(-10, 10), vz: 0, vh: -rand(10, 60), tint: 0xffa040, scale: rand(0.25, 0.5), decal: false, life: 50 });
      }
    } else if (since < 70) {
      // down: it lies across the ground, burning out
      const a = 1 - since / 70;
      g.fillStyle(0x2a1a10, a).fillRect(hz.x - hz.w / 2 - 8, gy - 10, hz.w + 16, 12);
      g.fillStyle(0xff7a2a, a * 0.9).fillRect(hz.x - hz.w / 2, gy - 7, hz.w, 3);
    }
  }

  // The mine's version of a falling beam (look 'rock'): grit trickling from a crack in the
  // roof and a shadow spreading under it, then a slab of rock that shatters where it lands.
  drawRockfall(g, hz, gy, y, phase, warnT, since) {
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
    for (const s of shells) {
      s.gy ??= this.stage.terrain ? Math.max(0, this.stage.terrain.groundAt(s.x, s.z)) : 0;
      const k = Math.max(0, Math.min(1, (hz.t - s.from) / Math.max(1, s.land - s.from)));
      const gy = s.z - s.gy;
      const R = hz.radius ?? 64;
      g.fillStyle(0x000000, 0.15 + 0.5 * k).fillEllipse(s.x, gy, R * (0.5 + 1.1 * k), R * 0.38 * (0.5 + 1.1 * k));
      g.lineStyle(2, 0xff5a3a, 0.25 + 0.55 * k).strokeEllipse(s.x, gy, R * 2, R * 0.75);
      if (k < 0.45) continue;
      // the stone: the last half of its flight, falling steeply onto the mark
      const f = (k - 0.45) / 0.55;
      const sy = gy - 720 * (1 - f) * (1 - f) - 12;
      const sx = s.x - 120 * (1 - f);
      st.setDepth(s.z + 1);
      // (a pitch-soaked stone, burning: it reads against the sky and the Keep alike)
      for (let k2 = 1; k2 <= 4; k2++) st.fillStyle(k2 < 3 ? 0xff7a30 : 0x6a6460, 0.35 - k2 * 0.06).fillCircle(sx - 26 * k2 * (1 - f * 0.6), sy - 60 * k2 * (1 - f * 0.6), 11 - k2);
      st.fillStyle(0xffb050, 1).fillCircle(sx, sy, 17);
      st.fillStyle(0x2a2420, 1).fillCircle(sx + 2, sy + 2, 13);
      st.fillStyle(0xff8a30, 1).fillCircle(sx - 5, sy - 5, 5);
    }
  }

  // The mine coming down behind you (Stage 'collapse'): a wall of falling rock at the front,
  // boulders tumbling out of the roof, a fog of dust, and nothing but black behind it.
  drawCollapse(hz, cam) {
    const g = hz.g = hz.g ?? this.scene.add.graphics();
    g.clear();
    const on = hz.front != null && hz.front > cam.x - 300;
    g.setVisible(on);
    if (!on) return;
    const t = this.scene.time.now / 16.7;
    const fx = hz.front;
    const moving = fx < hz.to;
    g.setDepth(DEPTH.floor + 900); // (in front of the lane: it's the mountain falling)
    const top = cam.y - 50; const bot = cam.bottom + 50;
    // behind the front: dark, filled with rubble
    g.fillStyle(0x050506, 0.96).fillRect(Math.min(cam.x - 50, fx - 2000), top, fx - 40 - Math.min(cam.x - 50, fx - 2000), bot - top);
    // the ragged face of the fall
    g.fillStyle(0x1a1a1e, 1);
    for (let y = top; y < bot; y += 36) {
      const j = Math.sin(y * 0.13 + t * (moving ? 0.4 : 0.05)) * 18;
      g.fillTriangle(fx - 60, y, fx + j, y + 18, fx - 60, y + 40);
    }
    // boulders falling through the front
    if (moving) {
      for (let i = 0; i < 6; i++) {
        const ph = ((t * 0.02 + i * 0.37) % 1);
        const bx = fx - 30 + Math.sin(i * 4.1) * 30;
        const byy = top + ph * (bot - top);
        const r = 10 + (i % 3) * 7;
        g.fillStyle(0x3a3640, 1).fillCircle(bx, byy, r);
        g.fillStyle(0x56505a, 1).fillCircle(bx - r * 0.3, byy - r * 0.3, r * 0.45);
      }
      if (Math.floor(t) % 2 === 0) {
        const z = rand(SETTINGS.world.floorTop, SETTINGS.world.floorBottom);
        this.scene.gore.spawn({ x: fx + rand(0, 30), z, h: rand(0, 60), vx: rand(40, 160), vz: 0, vh: rand(20, 120), tint: 0x6a6258, scale: rand(0.8, 1.6), decal: false, life: 40 });
      }
      if (Math.floor(t) % 20 === 0 && Math.abs(this.scene.player.x - fx) < 800) this.scene.fx?.shake(2, 10);
    }
    // the dust cloud rolling ahead of it
    g.fillStyle(0x8a8070, 0.18).fillRect(fx - 20, top, 90, bot - top);
    g.fillStyle(0x8a8070, 0.08).fillRect(fx + 70, top, 90, bot - top);
  }

  // The stables' stampede (Stage 'stampede'): first dust boiling out of the stable door and
  // hoofprints flashing along the lane it will take, then the horses themselves, flat out,
  // manes streaming, embers on their backs. Painted gallop frames (assets/fx/horse_gallop.png)
  // when they exist; drawn here until then.
  drawStampede(hz, cam) {
    const g = hz.g = hz.g ?? this.scene.add.graphics();
    g.clear();
    const S = this.stage.stampedeState(hz);
    const on = S.phase !== 'idle' && hz.x1 > cam.x - 200 && hz.x0 < cam.right + 200;
    g.setVisible(on);
    for (const sp of hz.horseImgs ?? []) sp.setVisible(false);
    if (!on) return;
    const y = hz.z;
    const t = this.scene.time.now / 16.7;
    if (S.phase === 'warn') {
      const w = S.warnT;
      g.setDepth(hz.z - hz.d / 2);
      // the lane: a band of churned ground, and arrows of hoofprints pulsing along it
      g.fillStyle(0x000000, 0.12 + 0.18 * w).fillRect(hz.x0, y - hz.d / 2, hz.x1 - hz.x0, hz.d);
      const dir = hz.dir ?? 1;
      for (let x = hz.x0 + 40; x < hz.x1; x += 90) {
        const a = 0.15 + 0.5 * w * (0.5 + 0.5 * Math.sin(t * 0.3 - x * 0.02 * dir));
        g.fillStyle(0xffb070, a);
        g.fillTriangle(x, y - 10, x, y + 10, x + 16 * dir, y);
      }
      // dust boiling out at the start
      const sx = dir > 0 ? hz.x0 : hz.x1;
      if (Math.floor(t) % 3 === 0) {
        this.scene.gore.spawn({ x: sx + rand(-20, 40) * dir, z: y + rand(-hz.d / 2, hz.d / 2), h: rand(0, 30), vx: dir * rand(20, 90), vz: 0, vh: rand(10, 50), tint: 0x8a7a64, scale: rand(0.6, 1.2) * (0.5 + w), decal: false, life: 40 });
      }
      return;
    }
    const tex = this.scene.textures.exists('horse-gallop-0');
    hz.horseImgs ??= [];
    S.heads.forEach((hd, i) => {
      const k = 1 + (hd.z - 400) / 900;
      if (tex) {
        const sp = hz.horseImgs[i] ??= this.scene.add.image(0, 0, 'horse-gallop-0').setOrigin(0.5, 1);
        sp.setTexture(`horse-gallop-${Math.floor(t * 0.35 + i * 2) % 6}`).setPosition(hd.x, hd.z).setFlipX(S.dir < 0)
          .setDisplaySize(170 * k, 120 * k).setDepth(hd.z).setVisible(true);
      } else this.horse(g, hd.x, hd.z, k, S.dir, t * 0.45 + i * 1.7);
      g.fillStyle(0x000000, 0.35).fillEllipse(hd.x, hd.z, 150 * k, 18 * k);
      if (Math.floor(t + i) % 2 === 0) {
        this.scene.gore.spawn({ x: hd.x - S.dir * 50, z: hd.z + rand(-8, 8), h: rand(0, 14), vx: -S.dir * rand(40, 120), vz: 0, vh: rand(30, 90), tint: 0x7a6a54, scale: rand(0.5, 1), decal: false, life: 30 });
      }
    });
    g.setDepth(S.heads.length ? Math.max(...S.heads.map((h) => h.z)) + 0.5 : hz.z);
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
    ev.on('propHit', ({ prop, dir }) => this.propHit(prop, dir));
    ev.on('propBreak', ({ prop, dir, blast }) => this.propBreak(prop, dir, blast));
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
    ev.on('shellLaunch', ({ hazard: hz }) => {
      // the catapults on the heights kick as they throw
      const near = Math.abs(this.scene.player.x - (this.stage.section?.x0 ?? 0)) < 2400;
      if (near) playSfx(this.scene, 'heavySwing', { volume: 0.5, pitch: -900, minGapMs: 0 });
      for (const pr of this.stage.props) {
        if (pr.kind !== 'catapult' || pr.broken || (hz.silence && pr.tag !== hz.silence)) continue;
        const v = this.propSprites.get(pr.id);
        if (v?.img) this.scene.tweens.add({ targets: v.img, angle: -4, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
      }
    });
    ev.on('shellLand', ({ shell: s }) => {
      const y = s.y ?? 0;
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
    ev.on('collapseStart', () => {
      playSfx(this.scene, 'kick', { volume: 1, pitch: -2200, minGapMs: 0 });
      this.scene.fx?.shake(10, 40);
      this.scene.callout('RUN!', '#ffb070', 30);
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
      if (Math.floor(t / 40) !== Math.floor((t + 11) / 40)) this.chips(pr, 2, -pr.fly.dir);
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
        if (!v.gone) { v.gone = true; this.scene.tweens.add({ targets: [v.img, v.shadow], alpha: 0, duration: 900 }); }
        continue;
      }
      if (v.gone) { v.gone = false; v.img.setAlpha(1); v.shadow?.setAlpha(0.35); } // (back where it started: the checkpoint)
      const moving = pr.x > (pr.roll.from ?? pr.x);
      const t = this.scene.time.now / 16.7;
      v.img.setPosition(pr.x, pr.z - (pr.y ?? 0) - (moving ? Math.abs(Math.sin(t * 0.25)) * 2 : 0)).setAngle(moving ? Math.sin(t * 0.13) * 0.8 : 0);
      v.shadow?.setPosition(pr.x, pr.z - (pr.y ?? 0));
      if (moving && Math.floor(t) % 6 === 0) {
        this.scene.gore.spawn({ x: pr.x - pr.w / 2 + 10, z: pr.z + 4, h: 4, vx: -rand(20, 70), vz: 0, vh: rand(20, 60), tint: 0x3a2e22, scale: rand(0.4, 0.8), decal: false, life: 30 });
      }
    }
  }

  update() {
    this.syncRolling();
    this.syncKicked();
    this.syncPickups();
    this.drawHazards();
  }
}
