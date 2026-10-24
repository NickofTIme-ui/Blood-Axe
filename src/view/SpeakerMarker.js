// SpeakerMarker.js — While a story line plays (stage/Story.js), a marker over whoever is
// talking: a hero, an enemy, a villager or one of the Oath Keepers walking along. A voice
// nobody on screen owns (VOICE, a MINER the level never placed) gets none.
//
// THE MARKER (Nick's playtest, 2026-10-24: the old arrowhead was small and easy to lose): a
// bright double chevron in the speaker's side colour (red: the king's men; blue: everyone
// else; data/speakers.js speakerSide), white-rimmed, over a soft glow, the lower chevron
// bobbing and the upper one cascading into it. The dialogue box hangs under the same man's
// feet (screenAt, read by scenes/HUDScene.js).

import { DEPTH } from './depths.js';
import { SETTINGS } from '../config/settings.js';
import { speakerSide } from '../data/speakers.js';

// who's speaking: each voice its own colour (the Oath Keepers as their kits; enemies hot; the king cold)
export const SPEAKER = {
  RURIK: '#f0d0a0', ORYN: '#8ad8e8', VEXA: '#d49aff',
  VAREK: '#ff8a6a', CINDER: '#ff8a6a', MALGOR: '#b8a0ff',
};
export const speakerColor = (who) => SPEAKER[who] ?? '#d8d0c0';

// the marker's colour by side
export const SIDE_COLOR = { foe: 0xff3a2e, ally: 0x4aa0ff, none: 0xd8d0c0 };

const HEAD = 120; // a fighter's head, above his feet (times his size)
const NPC_HEAD = 150; // a villager's (clear of his TALK / OPEN prompt)

// does this name belong to that voice? 'VAREK' is 'Varek, the Ash Captain'; 'HALE' is 'Hale the smith'
const owns = (name, who) => !!name && name.toUpperCase().split(/[^A-Z]+/).includes(who);

export class SpeakerMarker {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH.popups);
  }

  // where the voice's head is now (null: nobody on screen owns it)
  find(who) {
    const s = this.scene;
    const fighters = [...s.players, ...s.world.fighters.filter((f) => f.team !== 'player' && f.alive)];
    const f = fighters.find((q) => owns(q.stats.name, who))
      ?? s.npcView?.companions?.find((c) => c.mode !== 'gone' && owns(c.f.stats.name, who))?.f;
    if (f) return { x: f.x, y: f.z - f.h - HEAD * (f.stats.size ?? 1), feet: f.z };
    const n = s.stage.story?.npcs.find((q) => q.state !== 'gone' && q.state !== 'safe' && owns(q.name, who));
    return n ? { x: n.x, y: n.z - n.h - NPC_HEAD, feet: n.z } : null;
  }

  // the speaker's feet on the screen (960 x 540, the HUD's pixels), for the box under him;
  // null: nobody on screen is speaking
  screenAt() {
    const at = this.at;
    if (!at) return null;
    const v = this.scene.cameras.main.worldView;
    const x = (at.x - v.x) / v.width * SETTINGS.width;
    const y = (at.feet - v.y) / v.height * SETTINGS.height;
    return x < -20 || x > SETTINGS.width + 20 ? null : { x, y };
  }

  update() {
    const g = this.g.clear();
    const line = this.scene.stage?.story?.line;
    const at = line?.text.trim() && this.find(line.who); // (a silent line: nobody is speaking)
    this.at = at || null;
    if (!at) return;
    const col = SIDE_COLOR[speakerSide(line.who)];
    const t = this.scene.time.now;
    const x = at.x;
    const y = at.y + Math.sin(t * 0.007) * 4;
    // a soft glow behind
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.005);
    g.fillStyle(col, 0.16 + 0.1 * pulse).fillCircle(x, y - 10, 20 + 3 * pulse);
    g.fillStyle(col, 0.12).fillCircle(x, y - 10, 12);
    // the upper chevron cascades down into the lower one
    const k = (t % 900) / 900;
    this.chevron(g, x, y - 20 + k * 8, 0.75, col, 0.55 * (1 - k));
    this.chevron(g, x, y, 1, col, 1);
  }

  // a thick down-pointing chevron, its point at (x, y): black outline, white rim, colour fill
  chevron(g, x, y, s, col, a) {
    const w = 15 * s; // half its width
    const h = 13 * s; // its drop
    const th = 7 * s; // its arms' thickness
    const pts = (o) => [
      { x: x - w - o, y: y - h - o * 0.6 }, { x: x - w + th * 0.9 + o * 0.4, y: y - h - o * 0.6 }, { x, y: y - th * 1.1 + o * 0.2 },
      { x: x + w - th * 0.9 - o * 0.4, y: y - h - o * 0.6 }, { x: x + w + o, y: y - h - o * 0.6 }, { x, y: y + o * 1.2 },
    ];
    g.fillStyle(0x000000, 0.8 * a).fillPoints(pts(3), true);
    g.fillStyle(0xffffff, a).fillPoints(pts(1.6), true);
    g.fillStyle(col, a).fillPoints(pts(0), true);
  }
}
