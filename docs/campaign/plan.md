# The Oath Keepers — campaign plan

Nick's brief (4 October 2026): a six-level campaign, one continuous journey from the burning
home village to the Black Keep, ending with Rurik's judgment. This file is the plan; the
build order and what is done live in `docs/campaign/checklist.md`.

> "We stand for our people. We stand for our home. Whoever brings harm to either will answer to us."

## 1. What the project already has (review, 4 October 2026)

**Reused as is**

| System | Where | Campaign use |
|---|---|---|
| Three heroes with full, distinct kits: Rurik (warrior), Oryn (mage), Vexa (rogue) | `data/characters.js`, `combat/Mage.js`, `combat/Rogue.js` | The Oath Keepers. Untouched. |
| Combat core: combos, parry, guard break, crits, finishers, dismemberment | `combat/`, `effects/` | Everywhere. |
| 7 enemy types + Warlord Malgor (painted strips, AI, jumps) | `data/enemies.js`, `data/enemyStrips.js` | Rank and file, sub-bosses (as tuned elites), the ruler. |
| Sections, checkpoints, waves, breakables, pickups, fire grates, pendulum blades, boss with walk-in entrance and rage adds | `stage/Stage.js` | The level runner for every campaign level. |
| Terrain: ledges, pits, lifts, rotten planks; variable jump, buffer (8 f), coyote time (6 f), ledge forgiveness, tall-stage camera | `stage/Terrain.js` | All platforming. |
| Rest shrines, blood (XP), skill points, per-hero picks, free respec, saved in the browser | `progression/Progress.js`, `scenes/SkillScene.js` | Oath shrines and the skill trees. |
| Rurik's 9-skill tree (3 branches, a major choice at the top) | `data/skills.js`, `combat/Skills.js` | The model for Oryn's and Vexa's trees (already designed in `docs/progression.md`). |
| Online co-op (lockstep, version check) | `net/` | Must stay in step: all campaign logic is sim-side and frame-counted. |
| The Gallows Ascent slice (night cliff climb) | `data/stageGallows.js` | Its mechanics and lessons feed Gallows Wood (level 2). It stays on the title menu as is. |
| The Oath Road (the original stage) | `data/stage.js` | Stays as the classic arena run. Its throne fight (Malgor) is the starting point of the final battle. |

**Missing before this plan** (now being built stage by stage): story delivery (dialogue,
cutaways), NPCs and rescues, story triggers, level-to-level transitions and campaign save,
sub-boss set pieces, Oryn's and Vexa's trees, the final battle's three phases, the judgment
and execution sequence, the epilogue.

## 2. Decisions made (routine; change any of them by saying so)

- **The ruler is King Vaurath, the Ashen Crown** (working name, from the final-boss art
  prompts in project files `final-boss-mockups/`): tall, composed, a crowned closed helm,
  a black greatsword, ash-and-ember sorcery. His Ashen Grunts burned the village. His power
  is shown in the first cutaway: ember-fire gathered in one hand, then a wave of ash that
  puts out every torch in the hall. Until his art exists he is a code-drawn stand-in.
- **Warlord Malgor is the king's champion**, not the king: he stands at the throne in the
  cutaways and is fought at the Iron Gates as **the Iron Marshal** (his art, walk-in and
  Earthbreaker slam are reused). The Oath Road's throne fight stays as it is.
- The King's Executioner and the other sub-bosses are new names on tuned existing enemy
  types until their own art exists.
- **The Oath Road and the Gallows Ascent stay** as separate modes. The campaign is a new
  title-menu entry.
- **The other two Oath Keepers travel with you** even in solo play: they are on screen at
  story moments (opening, the vow, later the shelters and the judgment) and leave to search
  or scout in between, so nobody appears unexplained. Rurik is always among them; at the end
  he steps forward whoever was played.
- **Dialogue is non-blocking** unless it is a short held scene (the vow, the judgment). Held
  scenes freeze the heroes, never during a fight, and any press of jump or attack moves to
  the next line. Lines are timed in game frames, so both online players see the same thing.
- **No morality meter.** Rescues are counted by name (who you saved), not scored. Some
  villagers are already dead when you arrive. Saved villagers show up later (the gate at the
  end of level 1 now; the shelters and the epilogue later).
- **Rescues never fail by timer** in level 1 (it teaches them). Later levels may let a
  captive be lost if you walk away (still no meter, just a missing face later).
- **Graybox first.** New places, NPCs, cutaways and props are drawn in code and clearly
  temporary; the painted replacements are listed as named art requests in
  `docs/cloud-handoff.md`.

## 3. The six levels

Geography: the village sits in a river valley. The road north climbs through the Gallows
Wood to a blocked pass; the heroes go under the mountain instead (Hollow Mountain), come
out high on its far side (Shattered Ascent), descend to the Iron Gates of the enemy's
land, and cross it to the Black Keep. Each exit is the next entrance. The castle is drawn
on the far horizon from level 1 and grows: a speck at the village gate, a silhouette over
the wood, a looming shape from the mountainside, filling the sky at the gates.

| # | Level | Look | Traversal focus | Story purpose | Bosses | Set piece | Rescues |
|---|---|---|---|---|---|---|---|
| 1 | **Burning Village** | dusk smoke, ash-blue sky, fires | roofs, fallen beams, collapsing boards, burning cellars | the attack; the vow; prisoners taken north | Brother Cinder (rear-guard, Penitent type), **Varek the Ash Captain** (Gladiator type) | the longhall burning down around the captain fight | defend a family at the well; free the barn (wreckage); reach a boy on a burning roof (optional) |
| 2 | **Gallows Wood** | wet black pines, mist, lantern-lit road | streams, fallen trees, high branches, ambushes you can read | catch the convoy; the road is blocked | **The Houndmaster** (Stalker type + hounds) | the prisoner convoy (carts on the move) | stop an execution; open the cages |
| 3 | **Hollow Mountain** | torchlit mine, cold blue water | lifts, counterweights, underground rivers, vertical chambers | free the worked captives; escape the collapse | The Chain Warden (Ghoul type), **the Ore Crusher** (a war machine) | the mine collapse chase | strike the shackles; reopen the escape passage |
| 4 | **Shattered Ascent** | grey cliffs, wind, the castle close | rockfall timing, crumbling ledges, damaged bridges, bombardment | the castle in full view; the route destroyed | **Siege Commander Orsk** (Berserker type, catapults) | crossing under the bombardment | the shelter: defend the pinned-down villagers |
| 5 | **Iron Gates** | iron, smoke, siege fire | everything combined; inside the gatehouse | breach; the rescued return to help | The Gate Twins (two elites), **the Iron Marshal** (Warlord Malgor) | opening the gate from inside | protect civilians beyond the gate; earlier rescues pay off |
| 6 | **Black Keep** | black stone, violet torches | courtyard, prison wing, great hall, throne chamber | free the prisoners; face the king; the judgment | **The King's Executioner**, **King Vaurath** (three phases) | Rurik's judgment and execution | the prison wing; the epilogue in the village |

Each level: 5-7 sections, a checkpoint at every section, 1-2 oath shrines, at least one
optional route (a character-specific shortcut or a secret), and a quiet stretch after a
big fight.

### Level 1 — Burning Village (built in Stage 1; extended in the polish pass, 4 October 2026)

| § | Section | Content |
|---|---|---|
| I | THE ASHEN ROAD | Arrival. The three see the smoke (opening lines); the other two split off to search. A fallen cart and a beam to hop. Dead villagers along the road. Hale the smith, wounded, tells what happened. Looters at the end. |
| II | THE MARKET SQUARE | Ashen men are harassing a mother and child at the well (defend rescue). Burning carts erupt like fire grates. An oath shrine at the far side. |
| III | THE BURNING ROOFS | Up a cart onto the roofs, along a fallen beam, over burning cellars on charred boards that give way, a beam crashing down (taught alone, on safe ground). Two men waiting on the second roof: a fight on a ledge over the fire. Optional: a high roof where a boy is trapped. |
| IV | THE MILL YARD | A brawl round a raised mill floor; the barn door is pinned by a burning beam (break it: the villagers inside run free). Then the rear guard, Brother Cinder, walks in. |
| V | THE BURNING STABLES | Three waves round the burning stables. Smash the bar off the stable gate and the horses bolt across the yard in three lanes, each warned by dust and hoofprints, trampling Ashen men and heroes alike. |
| VI | THE LONGHALL | A shrine, then the Ash Captain, who directed the attack. At half health he calls his men and the burning longhall starts dropping its beams on everyone. |
| VII | THE NORTH GATE | Quiet. The saved villagers are gathered here. The elder tells them where the prisoners were taken. The vow (held scene). Walk out of the gate: the pursuit begins. |

Then the first **castle cutaway**: King Vaurath, Malgor at his side, learns the Oath
Keepers survived (confidence).

### Level 2 — Gallows Wood (built in Stage 2; extended in the polish pass, 4 October 2026)

| § | Section | Content |
|---|---|---|
| I | THE WOOD ROAD | The others scout ahead. A fallen pine, a stream crossed on a log. The convoy's rear guard. |
| II | THE HANGING TREE | Joren (Mira's husband) on the rope: kill the hangmen before it runs out (execution; too slow and he's lost). A shrine. |
| III | THE CAGE CARTS | Stepping stones over a ravine stream. The broken carts: two cages to open once the guards are dead (cage). |
| IV | THE OLD FORD | Ansel the wheelwright, lame, follows you across; an ambush on the road (escort). |
| V | THE CONVOY | The convoy's last prisoner wagon rolls up the road once the fight starts. Wreck it through three waves of guards and the prisoners run free (they wait at the pass); too slow and it gets away with them (rescue 'convoy'). |
| VI | THE KENNELS | A shrine; **the Houndmaster** comes in with two war hounds; three more at two thirds, his frenzy (and two more) at one third (boss phases). |
| VII | THE BLOCKED ROAD | The pass buried by their own men; a pilgrim (ask him); the tracks turn into the old mine. |

Then the second cutaway (irritation). Its painted art: docs/campaign/art-levels-1-2.md.

### Level 3 — Hollow Mountain (built 4 October 2026, code art)

| § | Section | Content |
|---|---|---|
| I | THE MINE MOUTH | The tracks lead in; an ore cart to hop; the first Ashen guards. |
| II | THE WORKINGS | Captives chained to posts (Old Tobin, Hilde, a group of miners): strike the shackles. A shrine. |
| III | THE LIFT SHAFT | Up onto the gallery, rotten planks over the shaft; a lift to a high ledge where Pip was left (optional); the portcullis held down by a counterweight: break its chain. |
| IV | THE UNDERGROUND RIVER | Stepping stones and a log over cold water; **the Chain Warden** (a ghoul) calls up more at half health. |
| V | THE CRUSHER HALL | A shrine, then **the Ore Crusher**: a war machine that never flinches. At two thirds its furnace vents through the floor grates; at one third it goes into overdrive and the roof starts falling. |
| VI | THE COLLAPSE | The mountain comes down behind you: run ahead of the falling rock, over a chasm, and dig out the passage where the last miners are trapped. |
| VII | THE FAR SIDE | Daylight; the Black Keep across the gorge; the freed miners gather. |

Then the third cutaway (frustration: he hurls the war map, sends for the Siege Commander).
Its painted art: items 18-25 in docs/campaign/art-levels-1-2.md.

### Level 4 — The Shattered Ascent (built 5 October 2026, code art)

| § | Section | Content |
|---|---|---|
| I | THE CLIFF ROAD | Out on the mountain's far face; the others take the high paths; loose rock (taught alone); a horn above; the first Ashen on the road. |
| II | THE BROKEN STAIR | Steps cut in the cliff, a ledge that gives way over the drop, men waiting on the landing; Wren the goatherd up the goat path (optional). A shrine. |
| III | THE SHELTER | The miners freed in the mountain went up the road ahead and are pinned under an overhang: defend them (defend). The first catapult stones, one at a time. Hilde (if saved) says her brother is at the battery. |
| IV | THE BOMBARDMENT | The crossing: open road under the catapults (two stones a volley, each landing spot shown by its shadow), the half-gone bridge over the gorge (no stone lands by a drop). |
| V | THE BATTERY | Up onto the heights: smash the three catapults (each one gone, one stone fewer; the way on stays shut until all three are wrecked); Bram, Hilde's brother, chained to the stone pile (wreckage). |
| VI | THE SIEGE CAMP | A shrine; **Siege Commander Orsk** (Berserker type). At two thirds he has the Keep fire on his own camp (it hits his men too); at one third he goes berserk. |
| VII | THE HIGH PASS | Horns from the Keep: the Ashen fall back to the Iron Gates; the saved gather; the Iron Gates below. |

Then the fourth cutaway (unease: the retreat's horns; he burns the captain who brings the
news to ash). Its painted art: items 32-38 in docs/campaign/art-levels-1-2.md.

### The king's arc (cutaways at milestones only)

| After | His mood | Scene |
|---|---|---|
| Level 1 | confidence | told they live; Malgor asks to ride out and is refused; a wave of ash puts out every torch; "a minor inconvenience" |
| Level 2 | irritation | the convoy lost; he strikes the throne and cracks it; Malgor is refused again; "let them dig for them" (built) |
| Level 3 | frustration | the mine collapse failed; he sends the siege commander to destroy the route (built) |
| Level 4 | unease | horns; troops pulled back to the gates; he kills a captain who brings bad news (built) |
| Level 5 | fear | the gates fall; he orders the prison wing burned with the prisoners in it |
| Level 6 entry | desperation | he sends everyone, then the Executioner; seals himself in the throne room |

Enemy behaviour follows him: horns and retreating troops after level 4, men left behind as
sacrifices in level 5, his own bridges destroyed in front of his men.

### The final battle (Black Keep, throne chamber)

- **Phase 1, controlled** (100-66%): precise greatsword cuts and a measured ember bolt,
  one attack at a time, long readable tells. Platforms: the dais and two side galleries.
- **Phase 2, anger** (66-33%): ash waves along the floor (jump them, like Malgor's
  Earthbreaker), pillars brought down (falling debris with ground warnings), the side
  galleries break.
- **Phase 3, desperation** (33-0%): committed lunges across the room that leave his blade
  stuck in the stone (the punish window), a wild double ash wave, guards thrown at you.
- Throughout: warnings on the ground, the player and platforms in frame (no off-screen
  attacks).

### Rurik's judgment (mandatory ending)

A one-shot, save-safe sequence, on the framework built in Stage 2 (`stage/Sequence.js`:
the level's `sequence` data names the section, the places, the scene and the reward):
1. Detect King Vaurath's defeat once (`campaign.kingDown` saved immediately).
2. Stop combat: clear enemies, projectiles, mines, walls, hazards; heroes to idle.
3. Place the heroes and the camera: the king on his knees centre stage; Rurik steps forward;
   the other two either side.
4. Charges, sentence, execution, aftermath (held scene, skippable line by line or whole).
5. Mark the king dead and the campaign complete; award completion rewards once (claim key).
6. Fade to the village epilogue: rebuilding, the saved villagers present.

Skipping jumps to step 5 with the same outcome. Reloading after step 1 lands at step 2;
after step 5 it goes straight to the epilogue.

Working dialogue (Rurik): "For the burning of our village. For the murder of our people.
For those you chained and carried away. These are your crimes. We swore you would answer
for them. I sentence you to death."

## 4. Shared systems (Stage 2 and on)

- **Level transitions**: after a level's tally, ENTER loads the next level's start; the run
  carries the heroes, their picks and their health (at least half). CONTINUE on the title
  starts at the last checkpoint reached (built in Stage 2).
- **Checkpoints**: every section start (exists); saved to the campaign file at each section.
- **NPCs and rescue states**: `trapped | threatened | escort → free → fleeing → safe`, or
  `lost`; kinds `defend`, `wreckage`, `reach` (built in level 1), `cage` (hold INTERACT at
  the lock once the guards are dead), `execution` (kill the hangmen before the rope runs
  out) and `escort` (he follows; enemies near him wear his nerve down) (built in Stage 2,
  used in Gallows Wood). INTERACT is E / D-pad up.
- **Story triggers**: beats fired by position, a section's clear, a rescue or a boss's rage;
  calm beats wait until no enemy is alive (built in level 1).
- **Boss encounters**: walk-in entrance (exists), phase thresholds (`boss.phases`: adds,
  brain, damage, speed, lines, hazards `when: 'phase:<id>'`; built in Stage 2, the
  Houndmaster uses two), scripted hazards on rage (level 1: the falling beams).
- **Campaign save**: levels done, checkpoints, rescued villagers by name, rewards claimed,
  the judgment flags (`progress.data.campaign`, started in level 1).

## 5. Character progression

Already built: shared blood and points, per-hero picks, free respec at shrines, no enemy
scaling, traversal never needs a skill (a bot proves every main route with no upgrades).

Campaign pacing target: about 4-6 points a level (fight first clears, secrets, optional
fights, levels from blood), so a full tree (18) completes near the end of level 6 only if
the player hunts everything. Points carry between levels and heroes.

Trees: Rurik's is built. Oryn (Stormcaller / Earthshaper / Waywalker) and Vexa
(Widowmaker / Deathmark / Skydancer) are designed in `docs/progression.md` and are built
in Stage 4, with one representative branch (Oryn's Stormcaller) done in Stage 2.

## 6. Development stages

1. **Burning Village playable slice** (graybox): route, combat, platforming, rescues,
   checkpoints, two bosses, the castle landmark, the first cutaway.
2. **Shared systems**: transitions, campaign save and continue, more rescue kinds,
   phase-based bosses, one branch of Oryn's tree.
3. **Continuous campaign**: levels 2-6 in graybox, the king's arc, the full ending.
4. **Character progression**: Oryn's and Vexa's trees complete; balance against the campaign.
5. **Presentation**: painted backdrops and props, NPC art, lighting, audio, staging.
6. **Full verification**: start to finish with every hero, saves, skips, the judgment.
