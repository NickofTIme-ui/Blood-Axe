// ShoutPlate.js — A shout in the street (a villager's cry for help, the stable master's
// alarm, the hangman's threats) on a scrap of parchment, kept on screen and clear of the HUD.
//
// Nick's second level 1 review (2026-11-03): the shouts were bare words that ran off the
// screen's edge ("...N FIRE!", "...RSES!!") and the miller's cry landed on top of the
// VILLAGERS SAVED counter. Each frame the words are slid inside the camera's view, pushed
// below the HUD's corner and the objective banner, and a parchment plate is drawn under them
// in the same aged paper as the speech bubbles (NpcView drawPrompt).

// the HUD's corners, as fractions of the view (health bars and the tally top left, the
// objective banner top middle)
const HUD_LEFT = { w: 0.215, h: 0.25 };
const BANNER = { x0: 0.3, x1: 0.7, h: 0.17 };
const EDGE = 0.012; // (a little air between the plate and the screen's edge)

export const INK = { dark: '#2a160a', red: '#7a1408' };

export class ShoutPlate {
  // text: a Phaser Text with origin (0.5, 1) — its colour and stroke are set here
  constructor(scene, text, ink = INK.dark) {
    this.scene = scene;
    this.text = text.setColor(ink).setStroke('#000000', 0).setShadow(0, 0, 'rgba(0,0,0,0)', 0);
    this.plate = scene.add.graphics();
    this.on = false;
  }

  setVisible(on) {
    this.on = !!on;
    this.text.setVisible(this.on);
    if (!this.on) this.plate.clear().setVisible(false);
    return this;
  }

  // the words' wanted spot (bottom middle, world px); returns where they went
  place(x, y, { alpha = 1, depth = null } = {}) {
    if (!this.on) return null;
    const t = this.text;
    if (depth != null) t.setDepth(depth);
    const view = this.scene.cameras.main.worldView;
    const w = t.displayWidth, h = t.displayHeight;
    const pad = 8;
    const half = w / 2 + pad, edge = view.width * EDGE;
    // inside the view sideways
    x = Math.max(view.x + edge + half, Math.min(view.right - edge - half, x));
    // and below the HUD: the corner where the bars and the tally are, the banner in the middle
    const left = x - half, right = x + half;
    let minTop = view.y + edge;
    if (left < view.x + view.width * HUD_LEFT.w) minTop = Math.max(minTop, view.y + view.height * HUD_LEFT.h);
    if (right > view.x + view.width * BANNER.x0 && left < view.x + view.width * BANNER.x1) minTop = Math.max(minTop, view.y + view.height * BANNER.h);
    y = Math.max(y, minTop + h + pad);
    // two shouts at once (the miller and his hangman) don't land on each other: a later one
    // this frame steps below any it would overlap
    const frame = this.scene.game.loop.frame;
    const placed = this.scene.shoutPlates?.frame === frame ? this.scene.shoutPlates.list : [];
    this.scene.shoutPlates = { frame, list: placed };
    for (let tries = 0; tries < 4; tries++) {
      const hit = placed.find((b) => Math.abs(b.x - x) < (b.w + w) / 2 + 2 * pad && Math.abs((b.y - b.h / 2) - (y - h / 2)) < (b.h + h) / 2 + pad);
      if (!hit) break;
      y = hit.y + h + 2 * pad;
    }
    placed.push({ x, y, w, h });
    t.setPosition(x, y).setAlpha(alpha);
    this.drawPlate(x, y, w, h, alpha, t.depth);
    return { x, y };
  }

  drawPlate(x, y, w, h, alpha, depth) {
    const g = this.plate.clear().setVisible(true).setAlpha(alpha).setDepth(depth - 0.01);
    const L = x - w / 2 - 10, T = y - h - 6, W = w + 20, H = h + 12;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(L + 2, T + 3, W, H, 5);   // its shadow
    g.fillStyle(0x1a0f08, 0.9).fillRoundedRect(L - 2, T - 2, W + 4, H + 4, 6); // dark ink edge
    g.fillStyle(0xc9b083, 1).fillRoundedRect(L, T, W, H, 4);                // aged paper
    g.fillStyle(0xb39a6c, 1).fillRect(L + 2, T + H * 0.62, W - 4, H * 0.38 - 3); // shaded lower half
    g.fillStyle(0xe2cfa3, 1).fillRect(L + 4, T + 2, W - 8, 2);               // a lit top edge
  }

  destroy() { this.plate.destroy(); this.text.destroy(); }
}
