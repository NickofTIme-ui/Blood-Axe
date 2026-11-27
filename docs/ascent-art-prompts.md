# The Shattered Ascent (level 4): Claude's polish, the painted pieces still wanted

Nick, 2026-11-27: "level 4 has good framework but needs 2 heavy coats of polish, the art
style is good but execution is UGLY". The scene plates ChatGPT painted for the level are
good; what made it ugly was how they were laid out (one cliff-road painting copied four
times end to end, the gorge crossing with no view behind it, code boxes for rocks). The
code now lays the level out as one continuous painting (`view/AscentPlates.js` SPOTS) and
names the paintings it still wants; each stand-in (a mirrored neighbour) is replaced the
moment its file exists. No code change is needed to plug these in.

ChatGPT chat: **BA · Level 4 · Ascent polish**. Attach `assets/env/ascent/scene_road.png`
as the style reference to every scene prompt. Scenes: opaque, about 2172 x 724 (3:1), the
same camera height, horizon and perspective as the reference: the road's far edge (the
cliff foot) about 55% of the way down, the road filling the bottom 45%, nothing standing
on the road itself. Pieces: flat pure magenta (#FF00FF) background, nothing magenta in the art.

## 1. `assets/env/ascent/scene_road_b.png` (opaque)
> Same painted dark-fantasy style, same camera, horizon and perspective as the reference
> picture. Another stretch of the same old mountain road cut into a grey cliff, under the
> same low storm sky: here an old stone waystation tower has half collapsed against the
> cliff, its fallen blocks heaped at the cliff foot, a snapped rope rail hanging from iron
> rings, a weathered carved waystone leaning over, a wind-bent dead pine. Snow-streaked
> peaks far behind on the right. The road in the bottom 45% is worn flagstones and grit,
> empty, nothing standing on it. No people, no text. 3:1.

## 2. `assets/env/ascent/scene_road_c.png` (opaque)
> Same style, camera, horizon and perspective as the reference. The same cliff road where
> enemy sappers broke it: heavy timber shoring props wedged against the cliff, picks and
> shovels, heaps of broken rock and a sapper's lean-to tent of dark hide at the cliff foot,
> a torn red war banner on a pole snapping in the wind, a coil of rope, a small brazier gone
> cold. The road in the bottom 45% is empty grit and cracked flagstones. No people, no text. 3:1.

## 3. `assets/env/ascent/scene_causeway.png` (opaque)
> Same style, camera and horizon as the reference. The cliff road reaches a deep gorge: on
> the left quarter and the right quarter, the road and the cliff foot as in the reference;
> in the middle HALF the ground falls away into a sheer misty chasm, far cliffs and a thin
> waterfall in the haze, and across the gorge on a black crag the huge dark castle (black
> stone towers, faint cold violet windows) small with distance. The broken stumps of an old
> stone causeway's far parapet stick out from both edges of the chasm. No bridge deck
> across the middle (it is drawn separately). No people, no text. 3:1.

## 4. `assets/env/ascent/scene_camp_b.png` (opaque)
> Same style, camera and horizon as the reference. The other half of an enemy siege camp on
> a mountain shelf: the commander's great tent of dark red hide with a war banner of a black
> crown on red, a rack of long axes and hammers, a big war drum, stacked round catapult
> stones, a wooden prisoner cage standing empty with its door open, two campfires, storm
> sky and peaks behind. The ground in the bottom 45% is trampled mud and grit, empty. No
> people, no text. 3:1.

## 5. `assets/env/ascent/boulder.png` (on magenta)
> Same painted style. One big grey granite boulder fallen from a cliff, sharp broken faces,
> lichen in the cracks, a spill of smaller rocks and grit round its foot, seen from the side
> at a low three-quarter angle, wider than it is tall (about 2:1). FLAT PURE MAGENTA
> background. No text.

When a picture lands: save it at the exact path above and reload the game; nothing else.
