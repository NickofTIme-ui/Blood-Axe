// WoodOpening.js — GALLOWS WOOD's opening at the tree line (data/stageWood.js
// `openingScene: 'treeLine'`; Nick, 2026-11-18: "a real opening scene at the tree line").
//
// The burned village is behind them. The Oath Keepers walk in out of the dark on the left,
// all three together, and stop at the edge of the wood where the road goes in under the pines.
// The convoy's ruts and chain marks run on ahead in the mud (view/WoodTrapsView.js drawRuts).
// The held 'opening' beat plays its words over it; its cues are the scene's moments:
//   { convoy: true }  far up the road, between the trees, the convoy's lanterns going away
//   { sfx: woodHowl } a howl, far off in the wood
//   { crows: x }      the crows going up off the road ahead
// Once the words are done the other two go off into the trees to scout (view/NpcView.js,
// `companions.leaveAfter`), the heroes are let go, and the road is theirs.
// Fixed-tick (both online players see it frame for frame), like stage/VillageOpening.js,
// whose shape this keeps (active, progress, update, tail, cancel) so the HUD, the story and
// the companions treat the two the same.
export const TREE_LINE = {
  walk: 120,           // frames of the walk in
  from: -170, to: 150, // where the heroes walk from and stop
  settle: 24,          // frames they stand after the words, before they're let go
};

export class WoodOpening {
  constructor(stage) {
    this.stage = stage;
    this.age = 0; this.active = true; this.walk = true; // (walk: the companions walk in, not sprint)
    this.done = 0;
    for (const [i, p] of stage.players.entries()) { p.x = TREE_LINE.from - i * 46; p.unbounded = true; p.awe = 2; }
    stage.world.holdStill(2);
  }

  // how far the walk in has got (0..1)
  get progress() { return Math.min(1, this.age / TREE_LINE.walk); }

  // the walk: easing to a stop over its last stretch, not a skid
  walkX(t) {
    const k = Math.min(1, t / TREE_LINE.walk);
    const e = k < 0.75 ? k / 0.875 : 0.75 / 0.875 + (1 - 0.75 / 0.875) * (1 - Math.pow(1 - (k - 0.75) / 0.25, 2));
    return TREE_LINE.from + (TREE_LINE.to - TREE_LINE.from) * e;
  }

  pose(f, x, z, moving, facing = 1) {
    f.vx = (x - f.x) * 60; f.x = x; f.z = z; f.h = f.floor = 0; f.vh = f.vz = 0;
    f.facing = facing; f.sprinting = false;
    const state = moving ? 'walk' : 'idle';
    if (f.state !== state) f.fsm.change(state);
    f.fsm.frame++;
  }

  update() {
    if (!this.active) return false;
    const st = this.stage;
    if (st.index !== 0) { this.cancel(); return false; }
    this.age++;
    const story = st.story;
    // (the words said, skipped, or never coming: not playing now nor waiting their turn)
    const spent = !story || story.done.has('opening') || (story.current?.beat.id !== 'opening' && !story.queue.some((b) => b.id === 'opening'));
    if (spent && this.age === 1) {
      // (no words to come at all: the scene was already played. They're simply there)
      for (const [i, p] of st.players.entries()) { p.x = TREE_LINE.to - i * 46; st.placeOnGround?.(p); }
      this.finish();
      return false;
    }
    st.world.holdStill(2);
    for (const [i, p] of st.players.entries()) {
      const t = Math.max(0, this.age - i * 8); // (a step apart)
      this.pose(p, this.walkX(t) - i * 46, Math.min(500, 440 + i * 26), t < TREE_LINE.walk);
      p.awe = 2;
    }
    if (spent && this.age > TREE_LINE.walk) this.done++;
    if (this.done >= TREE_LINE.settle) this.finish();
    return true;
  }

  finish() {
    const st = this.stage;
    this.active = false;
    for (const p of st.players) {
      p.unbounded = false; p.awe = 0; p.sprinting = false; p.vx = 0; p.fsm.change('idle');
      for (const action of Object.keys(p.controller.pressAge ?? {})) p.controller.pressAge[action] = Infinity;
    }
    st.world.hold = null;
  }

  tail() {}

  cancel() {
    if (!this.active) return;
    this.active = false;
    for (const p of this.stage.players) { p.unbounded = false; p.awe = 0; p.vx = 0; p.sprinting = false; }
    this.stage.world.hold = null;
  }
}
