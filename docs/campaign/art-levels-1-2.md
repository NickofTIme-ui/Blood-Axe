# Art for levels 1 and 2: ChatGPT prompts

The painted art for THE BURNING VILLAGE and GALLOWS WOOD. Every picture plugs in by its
file name alone. Until a file exists, the game keeps drawing that piece in code, so the
art can arrive in any order.

Paint them in the "Bloody Axe" ChatGPT project, one chat per level:
**BA · Level 1 · Burning Village** and **BA · Level 2 · Gallows Wood**. In the first
message of each chat, attach `assets/env/parallax/plx_far.png`,
`assets/enemies/strips/grunt_walk.png` and a screenshot of that level in the game
(project files `campaign/burning-village/` and `campaign/gallows-wood/`), so the style
and scale match.

## Rules for every picture (each prompt below repeats them)

- The game's style: painted dark-fantasy 16-bit arcade art, the same as the attached pictures.
- No text, no frame, no border, no signature.
- **Cut-out pieces** are painted on a flat pure magenta (#FF00FF) background, with nothing
  magenta in the art itself. **Character and creature strips** are on plain black, like
  every enemy strip.
- Strips: one row, facing right, side view, evenly spaced, nothing touching, feet on one
  baseline, no ground drawn.
- **Wide strips** must have left and right edges that continue into each other, because
  they repeat sideways. They are 3:1 or wider (for example 3072 x 1024).

Save each file at the path in its heading.

---

## LEVEL 1: THE BURNING VILLAGE

Palette: night; orange fire and red embers against cold blue smoke; timber, thatch and
plaster.

### 1. `assets/env/village/sky.png` (opaque, the furthest layer)
> A very wide seamless night sky for my dark-fantasy 16-bit beat 'em up, in the style of
> the attached pictures: deep blue-black sky choked with rolling smoke, lit orange from
> below by a burning village out of frame, a pale moon high on the right, a few stars
> through the smoke. NO land. Left and right edges join seamlessly. 3:1 or wider. No text.

### 2. `assets/env/village/far.png` (on magenta)
> Same style. A very wide seamless strip of a DISTANT river valley at night: low hills,
> the far half of the village burning across the river (tiny roofs on fire, smoke
> columns), dark woods; on the far right horizon a small black castle on a crag against
> the moon. Hazy, little detail. The bottom 25% is solid dark ground. Everything above the
> skyline is FLAT PURE MAGENTA (#FF00FF). Edges join seamlessly. 3:1 or wider.

### 3. `assets/env/village/mid.png` (on magenta)
> Same style. A very wide seamless strip of MIDDLE-DISTANCE village rooftops: steep
> thatched and shingled roofs, some burning with tall flames, some already burnt to black
> rafters, a mill wheel, a bell tower, smoke. Darker than the far layer, firelight on the
> edges. The bottom 20% solid. Everything above FLAT PURE MAGENTA. Edges join seamlessly.
> 3:1 or wider.

### 4. `assets/env/village/wall.png` (on magenta, the street's back wall, repeats)
> Same style. A very wide seamless strip of the BACK ROW of a medieval village street,
> seen straight on: timber-frame and plaster houses side by side, doors, shutters,
> windows glowing orange from fires inside, one house burnt out, smoke stains, a fallen
> sign. Detailed and close. The houses fill the bottom 85% of the picture; above the
> rooftops is FLAT PURE MAGENTA. Edges join seamlessly. 3:1 or wider.

### 5. `assets/env/village/ground.png` (opaque, the street under the fight)
> Same style. A very wide seamless picture of a muddy village street seen from a low
> three-quarter angle (the far edge at the top, the near edge at the bottom, like a stage
> floor): packed mud and broken cobbles, cart ruts, puddles reflecting fire, scattered
> straw, ash and embers. No people, no objects taller than a stone. Left and right edges
> join seamlessly. 3:1 (for example 2172 x 724).

### 6. Set pieces (on magenta, each one picture, seen straight on, about 1536 x 1024)
- `assets/env/village/well.png`
  > Same style. A village well in a market square: a round stone well with a little
  > wooden roof and a bucket on a rope, a burning market stall behind it. FLAT PURE
  > MAGENTA background. No people.
- `assets/env/village/barn.png`
  > Same style. The front of a big timber barn with tall double doors held shut by a
  > fallen burning roof beam (the beam is NOT drawn: just the shut doors, scorched),
  > hay sticking out of the loft, smoke from the roof. FLAT PURE MAGENTA background.
- `assets/env/village/stables.png`
  > Same style. A long wooden stable block on fire: stalls behind a heavy barred gate,
  > horses' heads rearing in panic inside, flames on the roof, smoke. FLAT PURE MAGENTA
  > background.
- `assets/env/village/longhall.png`
  > Same style. The front of a Norse-style longhall: carved dragon-head gables, a huge
  > door, shields on the walls, the roof on fire. Wide (about 2:1). FLAT PURE MAGENTA
  > background.
- `assets/env/village/pikes.png`
  > Same style. A cluster of three crooked wooden pikes driven into the mud, a severed
  > human head on each (grim but not cartoonish), dried blood run down the shafts, a crow
  > perched on the middle one, a torn banner of the Ashen King tied below. Tall and narrow
  > (about 1:1.4). FLAT PURE MAGENTA background.
- `assets/env/village/gate.png`
  > Same style. A village's north gate in a log palisade: two watch platforms, the gate
  > standing open onto a dark road into pine woods. FLAT PURE MAGENTA background.

### 7. Props (on magenta)
- `assets/env/village/prop_wreckage.png`, two pictures side by side
  > Same style. Left: a heavy burning roof beam fallen across a doorway, flames along it.
  > Right: the same beam smashed into two charred halves, smoking. FLAT PURE MAGENTA
  > background, nothing touching.
- `assets/env/village/prop_cart.png`, two pictures side by side
  > Same style. Left: a tipped-over wooden hay cart, unburnt. Right: the same cart
  > burning with tall flames. FLAT PURE MAGENTA background.

### 8. Villagers (on black, the same size as the grunt strip)
The game picks these up as soon as they are in the folder (data/levelArt.js SPRITE_SHEETS):
the villager for everyone, the mother for the family, the boy for the children, the elder
for Elder Brann. Each one switches over on its own.
- `assets/sprites/npc/villager.png`, 8 poses
  > A sprite strip of a medieval peasant man (no weapon, homespun tunic, muted browns),
  > one row on plain black, facing right, the same size and style as the attached grunt
  > strip. Poses: 1 standing scared; 2 cowering, arms over head; 3 waving for help;
  > 4-6 running (three frames); 7 sitting wounded, holding his side; 8 kneeling. No text.
- `assets/sprites/npc/mother.png`, 6 poses
  > The same, a peasant woman holding a small boy's hand: 1 standing, 2 cowering over
  > him, 3 waving, 4-6 running together.
- `assets/sprites/npc/boy.png`, 6 poses
  > The same, a boy of about ten: 1 standing, 2 cowering, 3 waving with both arms,
  > 4-6 running.
- `assets/sprites/npc/elder.png`, 4 poses
  > The same, a grey-bearded village elder with a staff: 1 standing leaning on it,
  > 2 sitting wounded, 3 pointing north, 4 kneeling.

### 9. The stampede (on black)
- `assets/fx/horse_gallop.png`, 6 poses
  > A 6-frame gallop cycle of a panicked draught horse, mane and tail streaming, a few
  > embers on its back, one row on plain black, facing right, side view, painted
  > dark-fantasy 16-bit style. Evenly spaced, nothing touching. No text.

---

## LEVEL 2: GALLOWS WOOD

Palette: wet black pines, blue-grey mist, mud, and the warm lanterns of the convoy road.

### 10. `assets/env/wood/sky.png` (opaque)
> A very wide seamless night sky over a forest: cold grey-blue, thin clouds, a pale moon,
> mist rising at the bottom. NO land. Edges join seamlessly. 3:1 or wider. No text.

### 11. `assets/env/wood/far.png` (on magenta)
> Same style. A very wide seamless strip of DISTANT pine-covered ridges in mist, and on
> the right a black castle on a crag with a faint purple glow (closer and bigger than it
> looked from the village). Pale with haze. Bottom 25% solid. Above the skyline FLAT
> PURE MAGENTA. Edges join seamlessly. 3:1 or wider.

### 12. `assets/env/wood/mid.png` (on magenta)
> Same style. A very wide seamless strip of a dense PINE FOREST in the middle distance:
> ranks of tall black pines, mist between them, a few dead trees. Darker than the far
> layer. Bottom 20% solid. Everything above FLAT PURE MAGENTA. Edges join seamlessly.
> 3:1 or wider.

### 13. `assets/env/wood/wall.png` (on magenta, behind the road, repeats)
> Same style. A very wide seamless strip of the edge of a dark pine forest right behind
> a road: thick black wet trunks, ferns and roots, a lantern post with a warm light, a
> wayside shrine. The trunks rise out of the top of the picture. FLAT PURE MAGENTA
> between the trunks. Edges join seamlessly. 3:1 or wider.

### 14. `assets/env/wood/ground.png` (opaque)
> Same style. A very wide seamless picture of a muddy forest road seen from a low
> three-quarter angle (far edge at the top, near edge at the bottom): black mud, deep
> cart ruts full of water, pine needles, roots, small stones. Edges join seamlessly.
> 3:1 (for example 2172 x 724).

### 15. Set pieces (on magenta)
- `assets/env/wood/hanging_tree.png`
  > Same style. A huge dead oak with one long bough reaching out to the right over a
  > road, a noose hanging from the bough (empty). FLAT PURE MAGENTA background.
- `assets/env/wood/cage_cart.png`, two pictures side by side
  > Same style. Left: a broken prisoner cart with an iron cage on it, the cage door shut
  > with a padlock, empty inside. Right: the same with the cage door swung open. FLAT
  > PURE MAGENTA background, nothing touching.
- `assets/env/wood/convoy_wagon.png`, two pictures side by side
  > Same style. Left: a long armoured prisoner wagon of the Ashen King's army, black iron
  > plates, barred windows, a black and crimson banner, big spoked wheels, seen side on,
  > facing right (no horses). Right: the same wagon wrecked: a wheel smashed, the bed
  > tipped, the back door hanging open. FLAT PURE MAGENTA background, nothing touching.
- `assets/env/wood/kennels.png`
  > Same style. A row of crude wooden dog kennels and iron cages at the edge of a forest
  > clearing, chains, gnawed bones, a torch. FLAT PURE MAGENTA background.
- `assets/env/wood/rockslide.png`
  > Same style. A tall heap of boulders and broken trees blocking a mountain pass, seen
  > straight on. FLAT PURE MAGENTA background.
- `assets/env/wood/stream.png`
  > Same style. A fast black forest stream seen from a low three-quarter angle, white
  > water around stones, a wide strip (about 3:1). FLAT PURE MAGENTA around it.
- `assets/env/wood/log.png` and `assets/env/wood/stones.png`
  > Same style. A fallen pine trunk lying left to right (to walk across). / Three flat
  > wet stepping stones. Each on FLAT PURE MAGENTA.

### 16. Villager poses for the wood (on black, same rules as item 8)
Not wired in yet: until it is, the wood's captives use `villager.png`. Paint item 8 first.
- `assets/sprites/npc/captive.png`, 6 poses
  > The peasant man from `villager.png` (attach it): 1 standing with hands bound, a noose
  > round his neck; 2 hanging, kicking; 3 cowering in a cage; 4 gripping cage bars;
  > 5-6 limping with a crutch.

### 17. The hounds and the Houndmaster (on black, same rules as every enemy strip)
- `assets/enemies/strips/hound_walk.png` (6), `hound_atk1.png` (4), `hound_react.png` (3),
  `hound_doom.png` (4)
  > A sprite strip of a war hound of the Ashen King: a huge lean black mastiff with
  > iron-studded collar and spiked armour plates on its back, red eyes, the same size as a
  > crouching man, one row on plain black, facing right, matching the attached enemy
  > strips in style. walk: a 6-frame prowling run. atk1: 1 crouch, 2 leaping lunge jaws
  > open, 3 biting, 4 landing. react: 1-3 yelping, knocked back. doom: 1-4 collapsing
  > dead. No text.
  The hounds switch over once all four strips are in.
- The Houndmaster needs no strips of his own: he is a stalker (data/stageWood.js
  `type: 'stalker'`), so he already wears the stalker's painted strips. Skip him.

---

## LEVEL 3: HOLLOW MOUNTAIN

Chat: **BA · Level 3 · Hollow Mountain**. Attach the same reference pictures plus a
screenshot of the mine in the game. The look: black rock lit warm by torches, timber
props, ore-cart rails, cold blue water and blue ore glinting in the walls; at the very end,
grey daylight and the Black Keep across a gorge.

### 18. `assets/env/mine/sky.png` (opaque, the furthest layer)
> Same style. A very wide seamless picture of the deep dark inside a mountain: a rock
> ceiling hung with stalactites, almost black, a faint warm haze low down. Left and right
> edges join seamlessly. 3:1 or wider.

### 19. `assets/env/mine/far.png` (on magenta)
> Same style. A very wide seamless strip of far mine galleries: dark tunnel mouths framed
> in old timber at different heights, ladders, a few distant torches. Everything sits in
> the middle band of the picture; above and below is FLAT PURE MAGENTA. Edges join
> seamlessly. 3:1 or wider.

### 20. `assets/env/mine/mid.png` (on magenta)
> Same style. A very wide seamless strip of huge rock pillars left standing by miners,
> braced with timber, flecks of blue ore, chains hanging between them. FLAT PURE MAGENTA
> between and above the pillars. Edges join seamlessly. 3:1 or wider.

### 21. `assets/env/mine/wall.png` (on magenta, the rock wall behind the lane, repeats)
> Same style. A very wide seamless strip of a mine tunnel's back wall seen straight on:
> rough black rock, timber frames (two posts and a beam) every so often, veins of glowing
> blue ore, picks and buckets left leaning, a torch bracket or two. The wall fills the
> bottom 85% of the picture; above it is FLAT PURE MAGENTA. Edges join seamlessly.

### 22. `assets/env/mine/ground.png` (opaque, the tunnel floor)
> Same style. A very wide seamless picture of a mine tunnel floor seen from a low
> three-quarter angle (the far edge at the top, the near edge at the bottom): packed grit
> and rock, ore-cart rails on wooden sleepers running along it, puddles, chips of ore.
> Nothing taller than a stone. Left and right edges join seamlessly. 3:1.

### 23. Set piece (on magenta, about 1536 x 1024)
- `assets/env/mine/furnace.png`
  > Same style. A great iron ore furnace built into a rock wall: a glowing open mouth,
  > riveted iron hood, chains and bellows, heaps of ore and coal before it. FLAT PURE
  > MAGENTA background. No people.

### 24. Props (on magenta, two pictures side by side: whole, then broken)
- `assets/env/mine/prop_shackle.png`
  > Same style. Left: a thick wooden post with an iron ring and a heavy chain hanging from
  > it. Right: the same post split, the chain snapped and lying loose. FLAT PURE MAGENTA.
- `assets/env/mine/prop_counterweight.png`
  > Same style. Left: a huge iron counterweight block hanging on a chain from a timber
  > frame. Right: the frame broken, the weight fallen and cracked on the ground. FLAT PURE
  > MAGENTA.
- `assets/env/mine/prop_rubble.png`
  > Same style. Left: a heap of fallen rock choking a tunnel. Right: the same rock dug out
  > and scattered low. FLAT PURE MAGENTA.

### 25. The Ore Crusher (on black, same rules as every enemy strip, about twice a man's size)
- `assets/enemies/strips/crusher_walk.png` (6), `crusher_atk1.png` (4), `crusher_heavy.png` (5),
  `crusher_doom.png` (5)
  > A sprite strip of THE ORE CRUSHER, a war machine of the Ashen King: a boxy riveted
  > iron hulk on two great iron wheels, a spiked grinding drum on arms at the front, a
  > pile-driver arm with a huge iron hammer on top, a furnace grate glowing in its belly
  > and a chimney trailing smoke at the back, rust streaks. One row on plain black, facing
  > right. walk: a 6-frame roll forward, the drum turning. atk1: the drum shoved forward,
  > spinning, sparks. heavy: 1-3 the hammer hauled up high while the furnace flares, 4-5 it
  > slams down in front. doom: 1-5 it tips, the furnace goes out, smoke pours out. No text.
  The Crusher switches over once all four strips are in.

---

## SURFACES: the roofs, beams and ledges you stand on (all levels)

Opaque, seamless tiles: left and right edges join (and top and bottom for the `px` ones),
about 1024 x 512, no magenta, no objects, no people. Same painted style. They go in each
level's folder and replace the striped boxes.

### 26. `assets/env/village/surf_roof_top.png`
> Same style. Seamless texture of dark clay roof shingles seen from above at a low angle,
> scorched, embers caught between them, the far edge darker.
### 27. `assets/env/village/surf_roof_front.png`
> Same style. Seamless texture of a timber-frame house front: dark beams, plaster, one
> shuttered window glowing with fire inside.
### 28. `assets/env/village/surf_beam.png`
> Same style. Seamless texture of a long charred timber beam seen side on, wood grain,
> glowing cracks.
### 29. `assets/env/village/surf_board.png`
> Same style. Seamless texture of charred floorboards seen from above, orange fire glowing
> through the gaps.
### 30. `assets/env/wood/surf_rock_top.png`, `surf_rock_front.png`, `surf_log.png`, `surf_plank.png`
> Same style, four textures for a dark wet pine forest: mossy flat rock from above; a rough
> rock face side on; a fallen pine trunk with bark side on; old wet planks from above.
### 31. `assets/env/mine/surf_rock_top.png`, `surf_rock_front.png`, `surf_plank.png`
> Same style, three textures for a torchlit mine: flat black rock with grit from above; a
> rough rock face with timber props and blue ore flecks side on; rotten mine planks from
> above.
