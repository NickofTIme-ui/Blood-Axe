// Heading.js — Which way a walking character is seen from, so walking up the screen
// shows his back and walking down shows his front instead of a side view sliding
// vertically. Five views (mirrored left/right by the sprite's flip = 8 directions):
//
//   side      profile                          anim: walk
//   upDiag    three-quarter BACK view          anim: walkUD
//   up        back view, walking away          anim: walkU
//   downDiag  three-quarter FRONT view         anim: walkDD
//   down      front view, walking at us        anim: walkD
//
// A character supplies whichever of those he has art for; a missing one falls back to
// the nearest he does have, and finally to the side walk. The gameplay root (feet) never
// moves: only the picture changes.
//
// The view is chosen from the real movement vector, with hysteresis: a boundary has to
// be crossed by a clear margin, and held for a few ticks, before the picture changes —
// so a stick resting near a boundary can't make him flicker between two views.

export const HEADING_ANIM = { side: 'walk', upDiag: 'walkUD', up: 'walkU', downDiag: 'walkDD', down: 'walkD' };
const FALLBACK = {
  up: ['walkU', 'walkUD'], upDiag: ['walkUD', 'walkU'],
  down: ['walkD', 'walkDD'], downDiag: ['walkDD', 'walkD'],
  side: [],
};

const DIAG = 22.5;   // degrees off horizontal where the three-quarter view starts
const VERT = 67.5;   // ...and where the full back / front view starts
const MARGIN = 9;    // how far past a boundary it must go to switch
const SETTLE = 4;    // ticks a new view must hold before it's shown

export class Heading {
  constructor() {
    this.dir = 'side';
    this.want = 'side';
    this.since = 0;
  }

  // vx, vz: velocity (px/s; vz < 0 = up the screen, away from the camera). Call once
  // per game tick while walking. Returns the view to draw.
  update(vx, vz) {
    const speed = Math.hypot(vx, vz);
    if (speed < 12) return this.dir; // barely moving: keep what he's showing
    const ang = Math.atan2(Math.abs(vz), Math.abs(vx)) * 180 / Math.PI; // 0 = sideways, 90 = straight up/down
    const band = this.dir === 'side' ? 0 : this.dir.endsWith('Diag') ? 1 : 2;
    // boundaries shift away from the band he's already in
    const b1 = DIAG + (band === 0 ? MARGIN : band >= 1 ? -MARGIN : 0);
    const b2 = VERT + (band <= 1 ? MARGIN : -MARGIN);
    const nb = ang < b1 ? 0 : ang < b2 ? 1 : 2;
    const curUp = this.dir.startsWith('up');
    const up = nb === 0 ? curUp : Math.abs(vz) < 8 ? curUp : vz < 0;
    const next = nb === 0 ? 'side' : `${up ? 'up' : 'down'}${nb === 1 ? 'Diag' : ''}`;
    if (next === this.dir) { this.want = next; this.since = 0; return this.dir; }
    if (next !== this.want) { this.want = next; this.since = 0; }
    if (++this.since >= SETTLE) { this.dir = next; this.since = 0; }
    return this.dir;
  }

  reset() { this.dir = 'side'; this.want = 'side'; this.since = 0; }
}

// The walk animation for a heading out of an animation set (falls back toward the side walk).
export function headingAnim(anims, dir) {
  for (const name of FALLBACK[dir] ?? []) if (anims[name]) return anims[name];
  return anims.walk;
}
