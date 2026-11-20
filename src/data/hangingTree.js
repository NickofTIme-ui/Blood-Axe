// hangingTree.js — Where things hang from Gallows Wood's painted hanging tree
// (assets/env/wood/hanging_tree.png, 1536 x 1024, drawn by view/WoodView.js between
// gallows.x - 260 and gallows.x + 120, its foot on gallows.z).
//
// Nick, 2026-11-20: "at the hanging tree must fix the guys hanging it looks bad". The dead and
// Joren's rope used to start at a flat line (gallows.z - 214) that ran through the canopy and
// the open sky; now every rope is tied round a real bough of the painting, measured from it
// (its underside, so the knot sits on the wood).
export const TREE_ART = { w: 1536, h: 1024, left: -260, right: 120 };

// the boughs' tie points, in the painting's pixels
// (the underside of each limb: the dead hang in front of the tree, so the rope comes out
// from under the wood, a twist of it round the limb)
export const BOUGHS = {
  left: { x: 190, y: 456 },      // the big low limb out to the left of the trunk, out near its end
  leftIn: { x: 320, y: 488 },    // the same limb, nearer the trunk
  inner: { x: 1040, y: 444 },    // the long bough to the right, near the trunk
  tip: { x: 1176, y: 352 },      // out near its tip, past the dead: Joren's rope
};

// a tie point in the world: { x, y } (y: screen height, as the tree is drawn)
export function boughPoint(gallows, name) {
  const b = BOUGHS[name] ?? BOUGHS.inner;
  const s = (TREE_ART.right - TREE_ART.left) / TREE_ART.w;
  return { x: gallows.x + TREE_ART.left + b.x * s, y: gallows.z - TREE_ART.h * s + b.y * s, s };
}
