# Background art: ChatGPT prompts (parallax layers)

The backdrop is built from layers that scroll at different speeds (`src/data/parallax.js`,
`src/view/Parallax.js`). Paint them in a new chat called **BA · Env · Parallax** in the
"Bloody Axe" ChatGPT project. Attach `assets/env/sky.png` and a screenshot of the arena to
the first message so the style and palette match.

Save each one as `assets/env/parallax/<file>`. A layer starts showing as soon as its file
is there; nothing else needs to change. Until the middle layers exist, the game uses the
old sky with fog and ash.

## Rules for every layer (already in each prompt)

- Very wide panorama: **3:1 or wider** (for example 3072 x 1024), landscape.
- The LEFT and RIGHT edges must continue into each other (the layer repeats sideways).
- Painted dark-fantasy 16-bit arcade style, the same burning blood-red palette as the sky.
- No people, no text, no frame, no border.
- Layers that are cut out are painted on a **flat pure magenta (#FF00FF)** background
  (clouds on **pure black**). Nothing magenta in the art itself.

---

## 1. Sky: `plx_sky.png` (opaque, the furthest)

> A very wide, seamless panorama sky for my dark-fantasy 16-bit beat 'em up, in the
> style of the attached sky: a burning blood-red and black storm sky, a huge pale red
> moon low on the left third, lightning deep in the clouds, a glow of fire along the
> bottom edge. NO land at all. The left and right edges must join seamlessly. 3:1 or wider.

## 2. Clouds: `plx_clouds.png` (on black, drifts slowly)

> Same style. A very wide, seamless strip of separate drifting smoke and storm clouds,
> lit red and orange from below, on a PURE BLACK background (nothing else black in the
> picture). Gaps of empty black between the clouds. Edges join seamlessly. 3:1 or wider.

## 3. Far: `plx_far.png` (on magenta)

> Same style. A very wide, seamless silhouette strip of DISTANT mountains and a ruined
> burning city: cathedral spires, broken towers, a castle on a crag, smoke columns, tiny
> fires. Hazy and dark red, little detail (it is far away). The bottom 25% is solid dark
> ground. Everything above the skyline is FLAT PURE MAGENTA (#FF00FF). Edges join
> seamlessly. 3:1 or wider.

## 4. Mid: `plx_mid.png` (on magenta)

> Same style. A very wide, seamless strip of MIDDLE-DISTANCE ruins: broken city walls,
> collapsed arches, a burnt watchtower, gallows, dead trees, braziers. More detail and
> darker than the far layer, with orange firelight on their edges. The bottom 20% is solid
> rubble. Everything above is FLAT PURE MAGENTA. Edges join seamlessly. 3:1 or wider.

## 5. Near: `plx_near.png` (on magenta)

> Same style. A very wide, seamless strip of NEAR ruins just behind a road: a low broken
> stone wall, toppled statues, iron spikes with skulls, banners, an archway, rubble heaps.
> Detailed, dark stone with red and orange light. Mostly low (the top half of the picture
> is mostly empty), the bottom 30% solid wall and rubble. Everything else FLAT PURE
> MAGENTA. Edges join seamlessly. 3:1 or wider.

## 6. Foreground: `plx_fg.png` (on magenta, over the fighters at the top of the screen)

> Same style. A very wide, seamless strip of things HANGING DOWN from above, close to the
> viewer: heavy chains, hooks, a broken wooden beam, tattered banners, dead roots. Dark
> silhouettes with a little red rim light. They hang only from the TOP edge and reach no
> lower than the top third of the picture. Everything else FLAT PURE MAGENTA. Edges join
> seamlessly. 3:1 or wider.
