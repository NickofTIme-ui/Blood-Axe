# ChatGPT prompts for the art-direction pass

Follows `docs/art-direction.md` (read "New art: the ChatGPT brief" first: what to attach,
the style block, the reject rules). Save every result into `assets/incoming/` under the
name given, NOT over the live file: the cloud checks it in the game and only then swaps it
in, keeping the original. Every live picture has a fallback, so none of these blocks
anything.

Checklist (tick when saved, then again when checked in game):

| # | Save as | Replaces / adds | Why | Saved | In game |
|---|---|---|---|---|---|
| 1 | `incoming/village_surf_roof_top_v2.png` | `env/village/surf_roof_top.png` | the roof tops are the Burning Roofs' combat floor; the current shingles are big and loud, men blend into them | ☐ | ☐ |
| 2 | `incoming/village_ground_v2.png` | `env/village/ground.png` | quiet middle band where the fighting is, detail kept to the back and front edges | ☐ | ☐ |
| 3 | `incoming/water_v2.png` | `env/water.png` | a stream with a clear deep channel and paler shallows, painted to run top to bottom | ☐ | ☐ |
| 4 | `incoming/ulric_leapsmash.png` | new strip (Rurik's Leap Smash) | the smash borrows cleave poses; a "blade driven into the ground" strip | ☐ | ☐ |
| 5 | `incoming/village_cellar.png` | new (burning cellar walls) | the cellars are code gradients; a painted charred cellar would sit better | ☐ | ☐ |

Rogue and Mage strips still owed are in `docs/rogue-art-prompts.md` /
`docs/mage-art-prompts.md` (rogue_runD and three finishers; the Mage finishers that
drifted in style). Use the current hero reference images, not those docs' descriptions.

---

### 1. `village_surf_roof_top_v2.png`
Attach: a Burning Roofs screenshot, `assets/env/village/surf_roof_top.png`.
```
[style block] A seamless texture of an old slate-and-shingle village roof seen from above at a low angle, as a stage floor (far edge at the top, near edge at the bottom). Smaller shingles than the attached roof (about 40 rows from top to bottom), even rows, LOW CONTRAST: muted grey-brown slate, soft soot, a few scorch marks, no holes, no big highlights, nothing that looks like a hole or an edge. It is a surface people fight on, so it must stay calm and darker than a figure. Left and right edges join seamlessly. 2:1, about 1774 x 887. Opaque, no magenta.
```

### 2. `village_ground_v2.png`
Attach: an Ashen Road screenshot, `assets/env/village/ground.png`.
```
[style block] A very wide seamless street of packed mud and broken cobbles in a burning village at night, seen from a low three-quarter angle like a stage floor (far edge at the top, near edge at the bottom). Keep the same colours and light as the attached street, but make the MIDDLE 60% of the height calm and even: dark packed earth with only faint cobbles, no puddles, no straw, no debris there. Put the detail at the edges: ash drifts and scattered cobbles along the top edge, a few puddles reflecting orange fire and some straw along the bottom edge. Nothing taller than a stone, no people. Left and right edges join seamlessly. 3:1, about 2172 x 724. Opaque.
```

### 3. `water_v2.png`
Attach: `assets/env/water.png`, a Gallows Wood screenshot.
```
[style block] A seamless square texture of a fast, cold forest stream seen from above, flowing from the top of the picture to the bottom. A dark deep channel down the middle (black-green), paler brown-green shallows toward the left and right edges with a few smooth stones showing through, thin streaks of white foam following the current. Calm enough that a figure stands out against it; no glare, no sparkles. Seamless top-to-bottom AND left-to-right. 1024 x 1024. Opaque.
```

### 4. `ulric_leapsmash.png`
Attach: `assets/sprites/strips/ulric_cleave.png` and `ulric_combo3.png` (his look, size and style) and the pose guide `art-direction/ref_leapsmash.png` in project files (rendered by `tools/blender/pose_reference.py`).
```
[style block] A sprite strip of the attached warrior (same armour, red cape, greatsword, same size and facing right) in 6 poses in one row, evenly spaced, following the attached pose guide left to right: 1 crouched, gathering to leap; 2 high in the air, blade raised over his head with both hands; 3 starting the downward chop, body arching forward; 4 the blade driven deep into the ground, knees bent, cape flying up; 5 still kneeling, wrenching the blade out; 6 standing again, blade up. Flat pure magenta #FF00FF background, nothing magenta on him. No ground drawn, no effects, no text.
```

### 5. `village_cellar.png`
Attach: a Burning Roofs screenshot (cellars visible).
```
[style block] A seamless vertical texture of the inside of a burnt-out cellar seen from above and in front: charred stone walls dropping into darkness, broken black joists, the bottom glowing with red-hot embers and small flames, smoke. Darkest at the top, red-orange glow at the bottom. No people, no text. Left and right edges join seamlessly. 1:2, about 768 x 1536. Opaque.
```
