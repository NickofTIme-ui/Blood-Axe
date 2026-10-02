// Boxes.js — Hitboxes (what hurts) and hurtboxes (what can be hurt).
//
// Boxes in data files are written relative to the fighter's FEET, facing right:
//   { x: forward offset, y: height above ground of the box's bottom, w: width, h: height }
// toWorldBox() flips them when the fighter faces left and converts to world space.
//
// Because the game is 2.5D, two boxes only touch if they overlap left/right,
// overlap in height, AND are close enough in depth (the floor-lane "z" axis).

export function toWorldBox(owner, box) {
  const left = owner.facing >= 0 ? owner.x + box.x : owner.x - box.x - box.w;
  const bottom = owner.h + box.y;
  return { left, right: left + box.w, bottom, top: bottom + box.h, z: owner.z };
}

export function overlaps(a, b, depthTolerance) {
  return (
    a.left < b.right && a.right > b.left &&
    a.bottom < b.top && a.top > b.bottom &&
    Math.abs(a.z - b.z) <= depthTolerance
  );
}

// Centre of the overlapping area — where blood and sparks should appear.
export function contactPoint(a, b) {
  const x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2;
  const h = (Math.max(a.bottom, b.bottom) + Math.min(a.top, b.top)) / 2;
  return { x, h };
}
