# Blood-Axe art direction

The visual standard every level, prop, effect and new picture is held to. Started on
level 1 (the Burning Village) on 10 October 2026; the code side lives in
`src/view/atmosphere.js` (depth washes, soft shadows) and `src/view/dangerCue.js` (the
enemies' danger glint).

## What the game already does well (build on it)

- Painted dark-fantasy 16-bit look: heavy readable figures, warm firelight against cold
  night, gore that lands.
- Each level owns a palette: village smoke-violet + fire orange, wood cold green-grey,
  mine black + torch amber, ascent wind grey, gates soot + violet Keep.
- Edges by light and shade, not drawn lines (Nick's rule; `drawVillageBlock`).

## The weaknesses found (in the running game, at 960x540)

1. **No depth.** Sky, far town, back wall and street were all equally sharp and
   contrasty: the house fronts competed with the fighters.
2. **Busy combat floor.** The painted street (puddles, cobbles) is as loud in the middle
   of the lane as at its edges.
3. **Figures float.** A hard flat ellipse under each man doesn't sit on painted ground.
4. **Burning cellars** were stacked bands (visible banding) with ruled orange edge lines.
5. **Water** was a flat scrolling tile: no depth, no banks, no foam.
6. **Danger cue in the scenery's colour.** The enemies' wind-up tint was orange, the same
   orange as every fire in the village.

## The rules

**Value hierarchy (most important).** Back to front: background lowest contrast and
coolest; back wall a step up; the lane mid; figures, hazards and pickups highest. A thing
that matters may be brighter or more saturated than its surroundings; scenery may not.

**Three planes.**
- *Background*: softened by the level's air (`AIR` in `atmosphere.js`): blacks lifted,
  highlights dimmed, a little cooler. Lights (fires, windows) are drawn above the veil so
  they still glow.
- *Playable ground*: crisp. A walkable top is lighter than the face below it; the lip
  where you land is the brightest part of a ledge (light), the face under it falls into
  shadow. No ruled outline strokes.
- *Combat*: figures stand on a soft contact shadow; the middle of the lane is left quiet.

**Colour language.**
- Fire orange: only where something burns.
- Enemy danger: red-white (`DANGER` in `dangerCue.js`): the wind-up tint and a four-point
  glint drawn over everything. Never orange (the scenery owns orange).
- Hazard on the ground: red pulsing ring (falling beams), glowing cracks (giving boards).
- Safety: the oath shrine's cold blue-white.
- Rewards: gold / warm white, small and brief.

**Shapes.** Big shapes first, then detail. Detail gathers at landmarks (the well, the
barn, the longhall, shrines); the floor between them stays calm. Silhouettes of ledges are
worn and chipped (`raggedRect`), never ruled rectangles, but their walkable edge stays
straight where top meets face so nothing gaps.

**Effects budget.** Impacts strong and brief. Sparks and embers small and few near the
lane; nothing that hangs over a man. No new bloom, no outlines, no screen shake or
hit-stop changes without Nick's say-so.

**Water.** Deep and dark down the middle, shallower and lighter toward the banks, wet dark
mud outside the banks, broken foam along them moving with the current; no shimmer.

## Done on level 1, and across the game where it's generic

| Change | Where | Levels |
|---|---|---|
| Far-layer haze, back-wall veil + contact shadow at its foot, floor occlusion band | `atmosphere.js` `applyAtmosphere`, called from `TerrainView` | all five (per-theme `AIR`) |
| Soft contact shadows under heroes, enemies, hounds, the Crusher | `atmosphere.js` `softShadow` | all |
| Burning cellars: smooth heat gradient, shadowed side walls, breathing glow, a few sparks; no ruled lip lines | `TerrainView.burningCellar` | village |
| Streams: depth, wet banks, moving foam | `TerrainView.waterDepth` | wood, mine |
| Danger glint + red wind-up tint | `dangerCue.js`, `SpriteEnemyView`, `EnemyView` | all |

All view-only: no collision, timing, AI, camera or sim change.

## New art: the ChatGPT brief

Paint in the "Bloody Axe" ChatGPT project. Attach every time: a screenshot of the level in
play (project files `art-direction/before/`), `assets/env/parallax/plx_far.png` and
`assets/enemies/strips/grunt_walk.png` for style and scale.

**The style block** (start every prompt with it):

> Painted dark-fantasy 16-bit arcade art, matching the attached pictures: chunky readable
> shapes, soft painted shading, limited palette, light from the upper left plus warm
> firelight from below. Seen from the game's low three-quarter camera. No text, no
> watermark, no frame, no border, no people unless asked.

**Rules for the result** (reject and repaint if broken): no warped perspective or melted
geometry; no text or signatures; seamless where asked (check by placing two copies side
by side); flat pure magenta #FF00FF exactly where a cut-out is asked for and nowhere in the
art; same light direction as the level; nothing smaller than about 4 game pixels of
detail (it turns to mud at 960x540).

The prompts are in `docs/art-direction-prompts.md`, each with file name, size, purpose
and how it plugs in. Every picture has a code fallback, so they can arrive in any order.

## Animation (Blender)

The heroes and enemies are painted frame strips, not rigs, so a Blender rig can't drive
them directly, and 3D renders would not match the painted style. Blender is still useful
on Nick's PC for:
- **Pose reference**: block a pose sequence on a mannequin (anticipation, strike, follow
  through, settle), render silhouettes, and attach them to the ChatGPT prompt for a strip
  so the poses have weight and a clean arc. Script: `tools/blender/pose_reference.py`.
- **Props and environment motion** (a falling beam, a swinging sign): rendered to a strip
  on magenta at the strip sizes `stripImporter.js` expects.
Timing stays in code (`ENEMY_ANIMS`, `HERO_ANIMS`): a new strip replaces pictures only,
never frame counts the hitboxes read, unless Nick approves.
