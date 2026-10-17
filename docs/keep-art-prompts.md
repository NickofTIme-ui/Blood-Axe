# Level 6 (The Black Keep): art list (17 Oct 2026)

Nick: "go with it we will tweak it later GO", then "continue". The level was built with
code-drawn stand-ins (`src/view/KeepView.js`); these pictures replace them. Every slot is
wired in `src/data/levelArt.js` (`keep`): drop the file at the path in its heading and the
game uses it, no code needed. Until a file exists the game keeps the code drawing.

Palette: black basalt and soot, cold violet torchlight (the King's fire), molten orange
only where the forge is. The Kings' Root is the one pale place (old grey-white stone).

## How to use

- ChatGPT chat **BA · Level 6 · Black Keep**. Start every prompt with the style block from
  `docs/art-direction.md`:
  > Painted dark-fantasy 16-bit arcade art, matching the attached pictures: chunky readable
  > shapes, soft painted shading, limited palette, light from the upper left plus warm
  > firelight from below. Seen from the game's low three-quarter camera. No text, no
  > watermark, no frame, no border, no people unless asked.
- In the first message attach `assets/env/gates/wall.png`, `assets/env/gates/ground.png`
  and `assets/env/gates/keep_road.png` (match their stone, soot and finish; the Keep in
  keep_road is this level's Keep).
- Reject and redo if: text or signatures, magenta inside the art, a visible seam when two
  copies are put side by side (tiles), a different camera angle.

| # | File | Replaces |
|---|---|---|
| A | `assets/env/keep/sky.png` | the code ash sky |
| B | `assets/env/keep/far.png` | the code Keep silhouette |
| C | `assets/env/keep/ground.png` | the code floor |
| D | `assets/env/keep/tile_causeway.png` | the causeway parapet and gibbets |
| E | `assets/env/keep/tile_hall.png` | the Muster Hall's wall, pillars, banners |
| F | `assets/env/keep/tile_cells.png` | the cell block's tiers |
| G | `assets/env/keep/tile_forge.png` | the forge cavern's ash pipes (Crucible Line and Ash Mill) |
| H | `assets/env/keep/tile_root.png` | the Kings' Root statues |
| I | `assets/env/keep/tile_spire.png` | the Spire's inner wall |
| J | `assets/env/keep/tile_battlements.png` | the Crown Walk / Falling Span merlons |
| K | `assets/env/keep/prop_pin.png` | the mill's iron pins (whole, broken) |
| L | `assets/env/keep/prop_conduit.png` | the throne room's ember conduits (whole, broken) |
| M | `assets/env/keep/prop_spire.png` | the colossus's spires (whole, broken) |
| N | `assets/env/keep/surf_rock_top.png`, `surf_rock_front.png` | ledges and tiers (later) |

Still code after this list: the forge's furnace glow and buckets, the mill stone, the
Spire's passing floors, the throne room walls and the colossus (they move), King Vaurath
and the Keep's new enemies (they use existing sprites with a different look).

---

### A. `sky.png` (opaque, 3:1, about 2172 x 724)
```
[style block] A wide seamless sky strip for a side-scrolling game: no sun, no stars, a low ceiling of black and charcoal ash cloud lit dull violet from below by fires out of sight, ash drifting across it, darker at the top. Tiles seamlessly left and right. No land, no buildings. 3:1, about 2172 x 724. No text.
```

### B. `far.png` (magenta, 3:1, about 2172 x 724)
```
[style block] A wide far-background strip for a side-scrolling game: the Black Keep seen from far below, a vast fortress of black basalt carved out of a mountain, its central tower cut into the shape of a giant seated king on a throne, faceless, with a crown of spires; violet light in a few high windows, smoke rising. Distant and hazy, low contrast, cool. The bottom edge is ragged black rock. FLAT PURE MAGENTA (#FF00FF) sky everywhere above and around it, nothing magenta in the art. Tiles seamlessly left and right. 3:1, about 2172 x 724. No text.
```

### C. `ground.png` (opaque, 2:1, about 1448 x 724)
```
[style block] A seamless floor tile for a side-scrolling brawler, seen from the game's low three-quarter camera: big worn black basalt flagstones, ash in the joints, a few cracks with a faint orange ember glow deep inside, scattered soot. Quiet in the middle (fighters stand on it), slightly darker toward the bottom. Tiles seamlessly on all four sides. 2:1, about 1448 x 724. No text.
```

### D. `tile_causeway.png` (magenta, 3:1, about 2172 x 724)
```
[style block] A seamless strip of a bridge parapet for a side-scrolling game, seen side on: a low wall of black basalt blocks along the back of a stone causeway over a chasm, iron gibbet posts rising from it every so often with empty iron cages hanging from their arms, soot streaks, violet light from a torch on one post. The parapet takes the bottom third of the picture; the gibbets rise above it. FLAT PURE MAGENTA (#FF00FF) everywhere above and between them, nothing magenta in the art. Tiles seamlessly left and right. 3:1, about 2172 x 724. No text.
```

### E. `tile_hall.png` (opaque, 3:2, about 1536 x 1024)
```
[style block] A seamless back-wall strip for a side-scrolling brawler: the inside of a vast black stone muster hall, seen side on. Tall square pillars of black basalt, long black-and-gold banners forty feet long hanging between them, a wooden balcony running along at two-thirds height with crossbow slits, violet torches in iron brackets on the pillars. Very tall and dark at the top, the foot of the wall meets the floor along the bottom edge. Tiles seamlessly left and right. 3:2, about 1536 x 1024. No text, no people.
```

### F. `tile_cells.png` (opaque, 3:2, about 1536 x 1024)
```
[style block] A seamless back-wall strip for a side-scrolling brawler: the inside of a prison cell block, seen side on: five tiers of iron-barred cell doors in black stone, narrow iron galleries along each tier, smoke rolling up, the lowest tier lit orange by fire from below, the upper tiers in violet gloom. The foot of the wall meets the floor along the bottom edge. Tiles seamlessly left and right. 3:2, about 1536 x 1024. No text, no people.
```

### G. `tile_forge.png` (opaque, 3:2, about 1536 x 1024)
```
[style block] A seamless back-wall strip for a side-scrolling brawler: a forge cavern deep under a fortress, seen side on: raw black rock, enormous iron ash pipes as thick as towers running up into darkness with riveted bands, chains, heat haze, everything lit hot orange from below by a furnace out of sight. Darker toward the top. The foot of the wall meets the floor along the bottom edge. Tiles seamlessly left and right. 3:2, about 1536 x 1024. No text, no people.
```

### H. `tile_root.png` (opaque, 3:2, about 1536 x 1024)
```
[style block] A seamless back-wall strip for a side-scrolling brawler: an ancient quiet crypt under a fortress, the one PALE place: old grey-white stone, a row of standing statues of crowned kings carved into the wall, their eyes chiselled out, dust and roots, cold blue-grey light. Calm and eerie, lower contrast than the fight. The foot of the wall meets the floor along the bottom edge. Tiles seamlessly left and right. 3:2, about 1536 x 1024. No text, no people.
```

### I. `tile_spire.png` (opaque, 3:2, about 1536 x 1024)
```
[style block] A seamless back-wall strip for a side-scrolling brawler: the inside of a burning tower's hoist shaft, seen side on: curved black stone wall, iron guide rails and chains running straight up, torn banners, fire glowing orange through slits, sparks rising. The foot of the wall meets the floor along the bottom edge. Tiles seamlessly left and right. 3:2, about 1536 x 1024. No text, no people.
```

### J. `tile_battlements.png` (magenta, 3:1, about 2172 x 724)
```
[style block] A seamless strip of castle battlements for a side-scrolling game, seen side on: a line of black basalt merlons and crenels along the back of a high wall walk, an iron brazier with violet fire between some of them, a torn black-and-gold pennant. The battlements take the bottom third of the picture. FLAT PURE MAGENTA (#FF00FF) sky above, nothing magenta in the art. Tiles seamlessly left and right. 3:1, about 2172 x 724. No text, no people.
```

### K. `prop_pin.png` (magenta, two side by side, 2:1)
```
[style block] Two versions of the same object side by side for a side-scrolling brawler, each in its own half of the picture, same scale, same camera: LEFT, a huge iron locking pin driven down through a mill's stone collar, bolted iron bands, glowing slightly hot; RIGHT, the same pin snapped and bent, sheared iron, sparks. Each about twice as tall as it is wide, its foot on the bottom edge. FLAT PURE MAGENTA (#FF00FF) background everywhere around them, nothing magenta in the art. 2:1, about 1774 x 887. No text.
```

### L. `prop_conduit.png` (magenta, two side by side, 2:1)
```
[style block] Two versions of the same object side by side for a side-scrolling brawler, each in its own half, same scale, same camera: LEFT, a tall iron ember conduit standing in a throne room, a riveted pipe of black iron with glass windows showing violet fire flowing up inside it; RIGHT, the same conduit smashed open, glass broken, the fire gone out, smoking. Each about three times as tall as it is wide, its foot on the bottom edge. FLAT PURE MAGENTA (#FF00FF) background, nothing magenta in the art. 2:1, about 1774 x 887. No text.
```

### M. `prop_spire.png` (magenta, two side by side, 2:1)
```
[style block] Two versions of the same object side by side for a side-scrolling brawler, each in its own half, same scale, same camera: LEFT, a jagged spire of black basalt and gold, one point of a giant stone crown, cracked with violet light glowing in the cracks; RIGHT, the same spire shattered at the base, broken stone and gold, the light gone. Each about twice as tall as it is wide, its foot on the bottom edge. FLAT PURE MAGENTA (#FF00FF) background, nothing magenta in the art. 2:1, about 1774 x 887. No text.
```
