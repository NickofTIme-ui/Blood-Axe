// SpeakerMarker.js — While a story line plays (stage/Story.js), a small bobbing marker in
// the speaker's colour over whoever is talking: a hero, an enemy, a villager or one of
// the Oath Keepers walking along. A voice nobody on screen owns (VOICE, a MINER the level
// never placed) gets none; the subtitle strip (scenes/HUDScene.js) still names it.

import { DEPTH } from './depths.js';

// who's speaking: each voice its own colour (the Oath Keepers as their kits; enemies hot; the king cold)
export const SPEAKER = {
  RURIK: '#f0d0a0', ORYN: '#8ad8e8', VEXA: '#d49aff',
  VAREK: '#ff8a6a', CINDER: '#ff8a6a', MALGOR: '#b8a0ff',
};
export const speakerColor = (who) => SPEAKER[who] ?? '#d8d0c0';

const HEAD = 120; // a fighter's head, above his feet (times his size)
const NPC_HEAD = 132; // a villager's (clear of his TALK / OPEN prompt)

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
    if (f) return { x: f.x, y: f.z - f.h - HEAD * (f.stats.size ?? 1) };
    const n = s.stage.story?.npcs.find((q) => q.state !== 'gone' && q.state !== 'safe' && owns(q.name, who));
    return n ? { x: n.x, y: n.z - n.h - NPC_HEAD } : null;
  }

  update() {
    const g = this.g.clear();
    const line = this.scene.stage?.story?.line;
    const at = line && this.find(line.who);
    if (!at) return;
    const col = Phaser.Display.Color.HexStringToColor(speakerColor(line.who)).color;
    const y = at.y + Math.sin(this.scene.time.now * 0.008) * 3;
    // a down-pointing arrowhead, dark-rimmed so it reads on fire and on stone alike
    g.fillStyle(0x000000, 0.85).fillTriangle(at.x - 14, y - 17, at.x + 14, y - 17, at.x, y + 4);
    g.fillStyle(col, 1).fillTriangle(at.x - 10, y - 14, at.x + 10, y - 14, at.x, y);
  }
}
