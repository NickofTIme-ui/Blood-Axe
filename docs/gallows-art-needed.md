# The Gallows Ascent: temporary art and what to paint

Everything in the slice is drawn in code for now (`src/view/TerrainView.js`, the bell in
`src/view/StageView.js`, the tree screen in `src/scenes/SkillScene.js`). It reads, but it
is flat. Paint these to replace it (same rules as the other strips: one row, flat
background, facing right):

**Palette:** night mist-blue and rust. Rock is cold grey-blue; wood is rotten brown; iron
is dark steel with rust; lanterns warm amber; the secret violet; the shrines blood red.
(The standing instruction holds: no defaulting to red and gold for effects.)

## Environment (needed most)

1. **Backdrop layers** (parallax, 4:1 like the Oath Road's): night sky with a hazy moon;
   far cliffs with gibbets and hanging cages; nearer crags; a mist band. On black / magenta.
2. **Cliff wall** behind the lane (tiling, ~150 px tall at game scale).
3. **Floor** tile: wet slate, mist-blue (tiling).
4. **Ledge kit** (tiling pieces): a rock ledge's TOP (flagstones, lighter than anything
   else on the ground, a bright worn lip along the front edge) and its FRONT FACE (dark
   rock), plus end caps. Must stay the clearest surface on screen: that's where you land.
5. **Pit** edge: the lip of a drop into black, a cold glow on the edge.
6. **Gibbet cage** (the moving lift): an iron cage platform on a chain, top and front.
7. **Rotten plank** on two ropes: whole, cracking (3 frames of shaking), and the broken pieces.
8. **Gallows scaffold**: steps, the platform, the TRAPDOOR (shut / dropping), the noose beam.
9. **Hoist** (the vertical lift at the gallows) and the **crow's nest** ledge.
10. **The roost**: a pillar of rock with a crow-cage on top, glowing violet (the secret's cue).
11. **Lantern post** (lit; a 4-frame flicker).
12. **Rest shrine**: a blood altar with two candles (idle glow; a kneel/lit state).
13. **The bell** on its post (whole / rung and fallen).

## Characters and effects

14. **Rurik, Leap Smash**: a 3-pose strip — sword overhead falling, impact (one knee,
    blade driven down), rising. It borrows the Cleave's poses for now.
15. **Leap Smash crater**: dust ring and cracked stone (6 frames, on magenta).
16. **Rurik, double jump** (Wind Step): a short flip or cape-snap strip (it shows the plain
    jump pose now).

## UI

17. **Skill tree frame** and **9 skill icons** for Rurik (Keen Edge, Executioner's Arc,
    Berserk, Bloodrush, Iron Wall, Oath of Fury, Leap Smash, Wind Step, Skyfall). The
    screen is plain panels and text now.
