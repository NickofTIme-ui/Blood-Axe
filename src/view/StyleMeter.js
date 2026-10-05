// StyleMeter.js — The combo counter and style rank on the HUD (right side, under the
// kill count). It only reads the hero's f.style (combat/Style.js): the rank letter, its
// word, a bar filling toward the next rank, and the running hit count. It fades out when
// there's nothing to show and punches in on a rank-up.

import { STYLE } from '../combat/Style.js';
import { FONT, epicFill } from './fonts.js';

// the rank's colours, D (ash) up to SSS (white-hot blood)
const RANK_FILL = [
  ['#c8c0b0', '#8a8070', '#3a342c'],
  ['#e0d0a0', '#a89060', '#4a3418'],
  ['#ffe0a0', '#e0a530', '#6a3c08'],
  ['#ffd0a0', '#f07a18', '#6a2004'],
  ['#ff9a7a', '#e0201a', '#4a0004'],
  ['#ffb0a0', '#ff3020', '#600008'],
  ['#ffffff', '#ff5a40', '#900010'],
];

export class StyleMeter {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.letter = scene.add.text(x, y, '', { fontFamily: FONT.display, fontSize: '46px', align: 'right' })
      .setOrigin(1, 0).setStroke('#0a0000', 6).setDepth(30);
    this.word = scene.add.text(x, y + 50, '', { fontFamily: FONT.display, fontSize: '15px', align: 'right' })
      .setOrigin(1, 0).setStroke('#0a0000', 4).setDepth(30);
    this.barBg = scene.add.rectangle(x, y + 72, 110, 4, 0x000000, 0.6).setOrigin(1, 0.5).setDepth(30);
    this.bar = scene.add.rectangle(x - 110, y + 72, 110, 4, 0xd0302a).setOrigin(0, 0.5).setDepth(31);
    this.hits = scene.add.text(x, y + 80, '', { fontFamily: FONT.ui, fontSize: '16px', color: '#f0e0c0', align: 'right' })
      .setOrigin(1, 0).setStroke('#000000', 4).setDepth(30);
    this.parts = [this.letter, this.word, this.barBg, this.bar, this.hits];
    this.shownRank = -1;
    this.alpha = 0;
  }

  update(f) {
    const s = f?.style;
    const on = s && (s.score > 1 || s.hits > 1);
    this.alpha += ((on ? 1 : 0) - this.alpha) * 0.12;
    for (const p of this.parts) p.setAlpha(this.alpha);
    if (!s) return;
    const r = s.rank;
    const R = STYLE.ranks[r];
    if (r !== this.shownRank) {
      this.letter.setText(R.letter);
      this.word.setText(R.word.toUpperCase());
      epicFill(this.letter, RANK_FILL[r]);
      epicFill(this.word, RANK_FILL[r]);
      if (r > this.shownRank && this.shownRank >= 0) {
        this.letter.setScale(1.6);
        this.scene.tweens.add({ targets: this.letter, scale: 1, duration: 260, ease: 'Back.Out' });
      }
      this.shownRank = r;
    }
    const next = STYLE.ranks[r + 1];
    const k = next ? (s.score - R.at) / (next.at - R.at) : 1;
    this.bar.width = 110 * Math.max(0, Math.min(1, k));
    this.hits.setText(s.hits > 1 ? `${s.hits} HITS` : '');
  }
}
