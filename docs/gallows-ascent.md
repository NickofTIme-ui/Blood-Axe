# The Gallows Ascent — the platforming slice

Title screen → **THE GALLOWS ASCENT (NEW)** → pick a hero. (Data: `src/data/stageGallows.js`.)
A night climb up the hangman's cliff, mist-blue and rust, lanterns marking the route.

## How platforming works (all heroes, all stages)

The Golden Axe floor lane is kept everywhere: you still walk up and down the screen. On
top of it a stage can now have **terrain** (`src/stage/Terrain.js`):

- **Ledges / steps**: raised blocks of the lane. Anything over 10 px is a wall until you
  jump high enough; then you land on top. Walk off the edge and you drop.
- **Pits**: fall in and you're out of the fight — an enemy dies (kick them in!), a hero
  is put back on the last firm ground he stood on, minus 12% health, untouchable for a second.
- **Lifts**: the gibbet cage carries you across a pit; the hoist rides up and down.
- **Rotten planks**: stood on, they shake for about half a second, drop, and come back later.

Feel changes (every stage, including the Oath Road):
- **Variable jump height**: tap jump for a short hop, hold it for the full jump.
- Jump buffering (8 frames) and coyote time (6 frames) now matter: they were already in.
- **Ledge forgiveness**: you keep your footing a few pixels past an edge.
- A jump into a ledge's face keeps its momentum and carries you over the top once you're
  high enough.
- On a tall stage the camera rises with the ground under you (not with every jump).

## The route

| # | Section | What it teaches | Fight |
|---|---|---|---|
| I | THE HANGMAN'S STAIR | Jumping up low steps; one gap whose "fall" is just a lower step. No way to fail. | none |
| II | THE GIBBET YARD | Open-ground brawl. Ends at a **rest shrine**. Optional: ring the **bell** to fight Pitlord Kragg. | grunts + butcher; stalker + grunt + berserker |
| III | THE ROTTEN CLIMB | Ride the gibbet cage over a pit, then cross rotten planks that give way. The **roost** (secret) is the high ledge with the violet cage. | none |
| IV | THE BROKEN WALK | A narrow walk in three pieces over the dark: enemies come along it jumping the gaps; kick them into the gaps. The Penitent can't jump them and holds his piece. | 3 grunts; Penitent + ghoul |
| V | THE BLADE GALLERY | Two levels: stalkers drop off the balcony onto you while the floor fills; strike the pendulum blades into them. | 2 stalkers + 2 grunts; berserker + ghoul + grunt |
| VI | THE GALLOWS | The final fight: a rest shrine first, then the scaffold (step up, trapdoor over a drop), the hoist, a fire grate. **Hruk the Hangman** (elite berserker) calls men at half health. | grunt + ghoul + stalker; Hruk + 3 |

Checkpoints: every section start (a death puts you back there with its fight reset). A
fall into a pit puts you back on the last firm ground: never more than a few seconds.

## Who can go where

The main route is built for the weakest jumper, Rurik (rises 89 px, carries 107 px on the
flat): steps of at most 40 px, gaps of at most 64 px. A test plays it with every hero,
no upgrades, no falls (`gallows: every hero finishes the main route...`).

| | Rurik | Oryn | Vexa |
|---|---|---|---|
| Main route | yes | yes (his jump is floatier: tap it on the planks) | yes |
| The roost (secret: relic + skill point) | with **Wind Step** (his tree) | yes: jump against its face, he rises over | yes: double jump |
| Enemies into pits | Sparta kick | Force blast | crescent kick |

## What to playtest

1. **Movement responsiveness**: do short hops and full jumps come out when you mean
   them? Does a jump pressed just before landing still fire? Running off a ledge and
   jumping a beat late?
2. **Jump fairness**: the stair, the cage, the planks, the broken walk. Any jump that
   felt like luck? Any landing you couldn't see? Oryn on the planks especially.
3. **Camera**: climbing to the roost and on the gallows; does it show where you're
   landing? Does it lurch?
4. **Navigation**: did the lanterns, the lit ledge lips and the violet cage lead you?
   Did you find the roost? The bell?
5. **Combat variety**: open yard vs the broken walk vs the two-level gallery vs the
   gallows. Does each ask for something different? Did you kick men into the gaps,
   strike a blade into them, catch a stalker dropping off the balcony?
6. **Pacing**: the order is stair → fight → climb → fight → fight → rest → boss. Too
   long between rests? Too much walking?
7. **Upgrade impact** (Rurik): buy Leap Smash at the first shrine. Can you feel it?
   Wind Step → the roost. Berserk vs Oath of Fury: does the choice feel like one?
8. **Visual readability**: can you always tell what you can stand on, what's a pit,
   which plank is about to drop, where the enemies are when you're in the air?
9. **Fun**: which section would you replay? Which would you cut?

Known gaps: all slice art is temporary (`docs/gallows-art-needed.md`); only Rurik has a
tree; no progression online; enemies don't climb ledges taller than ~60 px (by design:
the roost and balcony are safe ground for a moment).
