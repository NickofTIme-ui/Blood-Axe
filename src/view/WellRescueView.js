import { DEPTH } from './depths.js';
import { FONT } from './fonts.js';
import { ShoutPlate, INK } from './ShoutPlate.js';
import { SPRITES } from './levelArt.js';

// The well's set piece (stage/WellRescue.js) on screen: the butcher's taunts over his head
// (red ink on parchment, like the hangman's: view/ShoutPlate.js), and the bucket rope when
// the boy is hauled up out of the well. Mira and the boy themselves: view/NpcView.js.
const CRANK = 107; // the windlass, px above the ground (its painting, assets/env/village/well.png)

export class WellRescueView {
  constructor(scene, stage) {
    this.scene = scene; this.stage = stage; this.rig = stage.wellRescue;
    this.shout = scene.add.text(0, 0, '', { fontFamily: FONT.display, fontSize: '17px', color: '#ffb08a', align: 'center', wordWrap: { width: 240 } })
      .setOrigin(0.5, 1).setDepth(DEPTH.popups).setVisible(false);
    this.plate = new ShoutPlate(scene, this.shout, INK.red);
    this.rope = scene.add.graphics();
  }

  update() {
    const r = this.rig, b = r.bark, f = r.butcher;
    // holding the boy, painted: he's drawn in his hold (view/NpcView.js drawWellHold), so his
    // own sprite stands down (his shadow stays)
    if (f?.alive && r.boy?.held && SPRITES['boy-held'] && SPRITES['butcher-hold']) {
      const v = this.scene.views.get(f.id); v?.sprite?.setVisible(false); v?.puppet?.root?.setVisible(false);
    }
    const on = !!b && !!f?.alive && !this.stage.story.holding;
    this.plate.setVisible(on);
    if (on) {
      const pop = Math.min(1, b.age / 8), fade = Math.min(1, (b.life - b.age) / 20), shake = r.live ? Math.sin(b.age * 1.3) * 1.5 : 0;
      this.shout.setText(b.text).setScale(0.8 + 0.2 * pop);
      this.plate.place(f.x + shake, f.z - f.h - 150, { alpha: fade });
    }
    // the bucket rope, taut, while he comes up it
    this.rope.clear();
    const boy = r.boy;
    if (r.phase === 'hauling' && boy?.shown && r.t < r.D.haul * 0.7) {
      const m = r.D.mouth;
      this.rope.setDepth(m.z + 1).lineStyle(2, 0x8a7350, 1)
        .lineBetween(m.x, m.z - CRANK, boy.x, boy.z - boy.h - 52);
    }
  }
}
