# The Oath Keepers — development checklist

The plan: `docs/campaign/plan.md`. `[x]` done and checked, `[~]` built but only partly
checked (says how), `[ ]` not started. Graybox means code-drawn temporary art.

## Stage 1 — Burning Village playable slice

- [x] Project review and campaign plan saved (`docs/campaign/plan.md`)
- [x] Level data: six sections, terrain, hazards, villagers, story (`src/data/stageVillage.js`)
- [x] Title menu entry: CAMPAIGN: THE BURNING VILLAGE (solo)
- [x] Story beats: by position, event, rescue, boss; calm and held scenes; frame-timed (`src/stage/Story.js`)
- [x] Dialogue box with speaker colours; letterbox for held scenes (`HUDScene`)
- [x] Villagers and rescue states: defend (the well), wreckage (the barn), reach (the boy on the roof)
- [x] Saved villagers gather at the north gate; the family's line there only if they were saved
- [x] Rescues and the finished level saved once in the campaign save (`Progress.campaign`)
- [x] Falling burning beams (taught alone on the roofs; the longhall's only after the captain rages; hurt enemies too)
- [x] Burning carts erupting (fire hazard, new look), burning cellars (pits), charred boards that give way
- [x] Section fights that wait for you (`fightAt`); the level ends at the gate, after the vow (`exit`)
- [x] Rear-guard sub-boss Brother Cinder walks in without freezing anyone; Varek the Ash Captain's entrance freezes them
- [x] The other two Oath Keepers on screen at the opening and at the gate (Rurik always among the three)
- [x] The castle on the horizon (`src/view/castle.js`)
- [x] Cutaway prototype: King Vaurath learns they survived (`src/scenes/CutawayScene.js`), skippable
- [x] Tally: who was saved, the road on
- [x] Logic tests: route with every hero (no upgrades, no falls), story order, held-scene skip, all three rescues, beams, rage beams, entrances, saving, online timing
- [~] Seen in a headless browser at every section (screenshots); not played through by a person
- [ ] Online co-op and 2-player local campaign (the level is solo from the menu; its logic is sim-side, so it should hold in step)

## Stage 2 — Shared systems

- [x] Level transitions: after the tally ENTER loads the next level (same heroes, their picks, the health they walked out with, at least half) (`ArenaScene.goNextLevel`, `data/stages.js`)
- [x] Campaign save and CONTINUE on the title (the level and section last reached) (`Progress.campaign.at`, `TitleScene`)
- [x] Checkpoints saved per section; starting at one skips what came before (beats spent, the saved there, the unsaved gone) (`Story.skipTo`)
- [x] More rescue kinds: cage (hold INTERACT at the lock once the guards are dead), execution (kill the hangmen before the rope runs out; too slow and he's lost), escort (he follows; enemies near him freeze him and wear his nerve down; lost at zero) (`stage/Story.js`)
- [x] Lost villagers: saved as lost, named in the tally, a line said; dying puts the section back (rope and all)
- [x] INTERACT: E / D-pad up; a prompt over whoever you can talk to or free, a meter for a lock, a rope, a nerve (`view/NpcView.js`)
- [x] Boss phases (thresholds that add men, change his brain, damage and speed; their own lines and hazards), reusable; the old half-health rage is the default (`Stage.updateBossPhases`)
- [x] Ending-sequence framework for the judgment: defeat caught once and saved, combat cleared, everyone placed, the scene, the reward once, then the end; reload-safe at every step; skipping gives the same result (`stage/Sequence.js`; proven by tests on a test stage, used for real in Stage 3)
- [x] Skill tree: Oryn's Stormcaller branch (Forked Bolt, Static Charge, Thunderhead) (`data/skills.js`, `combat/Storm.js`); his other two branches shown as planned
- [x] Gallows Wood laid out in graybox to use all of it (six sections, the Houndmaster with two phases, the second king cutaway) (`data/stageWood.js`, `view/WoodView.js`)
- [x] Logic tests: the wood walked by every hero, its story and rescues, each rescue kind (and failing it), INTERACT, boss phases, the sequence (once, skips, reloads), checkpoints, the save, the Stormcaller
- [~] Seen in a headless browser: the wood's sections, the village tally -> ENTER -> Gallows Wood (save points at the wood), CONTINUE from the title into the wood's third section; not played through by a person
- [ ] Online co-op and 2-player local campaign (all of it is sim-side and frame-timed; the transition rides in the online records; untried)
- [ ] A whole-scene skip key for held scenes (now: each line skips with jump / attack)

## Stage 3 — Continuous campaign (graybox)

- [~] 2 Gallows Wood: built in Stage 2 (road, hanging tree, cage carts, ford, kennels, blocked road); still to add: the convoy on the move (the set piece), real hounds, its art
- [~] 3 Hollow Mountain: built (4 October 2026) in code art: chained captives (shackle posts), the lift shaft and the portcullis on its counterweight, the underground river and the Chain Warden, THE ORE CRUSHER (a war machine: `crusher`, `view/CrusherView.js`, iron armour, furnace and overdrive phases), the collapse chase (hazard `collapse`), the escape passage dug out, daylight and the Keep. Tests: every hero walks it. Still to do: a person playing it; its painted art (items 18-25 in `art-levels-1-2.md`)
- [~] 4 Shattered Ascent: built (5 October 2026) in code art (`data/stageAscent.js`, `view/AscentView.js`): loose rock, the broken stair, THE SHELTER (defend the miners), THE BOMBARDMENT (hazard `bombard`: catapult stones aimed at the heroes, shadows first, never by a drop), the half-gone bridge, THE BATTERY (catapult props; `silence`: one stone fewer per catapult; `needs`: the way on waits until all are smashed), Bram (Hilde's brother), Wren (optional), SIEGE COMMANDER ORSK (barrage and berserk phases), the retreat's horns. Tests: every hero walks it; the bombardment, the shelter, Orsk. Seen in a headless browser. Still to do: a person playing it; its painted art (items 32-38 in `art-levels-1-2.md`)
- [ ] 5 Iron Gates: siege weapons, the gate from inside, Gate Twins, the Iron Marshal (Malgor), returning villagers
- [ ] 6 Black Keep: courtyard, prison wing, great hall, the Executioner, King Vaurath (three phases)
- [~] The king's cutaways: 1 (confidence), 2 (irritation), 3 (frustration: the war map hurled) and 4 (unease: the horns, the captain burned) built; 5-6 to come; enemy reactions (horns and the retreat at the end of level 4 done)
- [ ] Rurik's judgment and execution (on the Stage 2 framework); the village epilogue
- [~] The castle growing level by level (bigger over the wood)

## Stage 4 — Character progression

- [~] Oryn's tree: Stormcaller built (Stage 2); Earthshaper, Waywalker to build
- [ ] Vexa's tree (Widowmaker, Deathmark, Skydancer)
- [ ] Point pacing across six levels; balance against the bosses

## Polish pass on levels 1 and 2 (Nick, 4 October 2026: art, longer, more set pieces and fights; Stage 3 waits)

- [x] Art prompts for both levels (`docs/campaign/art-levels-1-2.md`); painted art plugs in by file name (`src/data/levelArt.js`), code art stays until then
- [x] Village: THE BURNING STABLES (the stampede set piece: hazard `stampede`, `when: 'freed:<npc>'`), two men on the second roof
- [x] Wood: THE CONVOY (a rolling wagon prop, rescue 'convoy'), war hounds (`hound`, `view/HoundView.js`), the Houndmaster's escort and pack
- [x] The other two Oath Keepers slip away up the lanes and stay hidden until the meeting place (Nick: seeing them by accident broke the immersion)
- [x] Fix: enemies brought on from off-screen stood inside raised ground (the mill yard softlock); a stuck latecomer is brought round
- [~] Checked: logic tests and headless screenshots; not played by a person
- [~] The art itself (generated in ChatGPT on Nick's PC): as of 5 October 2026 00:50 UTC the Burning Village is done (items 1-7 and 9: backdrop, set pieces, props, stampede horse), saved on the PC but NOT pushed (git on the PC has no GitHub login). Left: the pikes picture, villagers (8), terrain-block art (needs a code slot first), all of Gallows Wood (10-17), all of Hollow Mountain (18-25)
- [~] Painted strips for the villagers, the hounds and the Ore Crusher: the slots are in (5 October 2026, `SPRITE_SHEETS` in `src/data/levelArt.js`; each switches over when its files are in); the pictures are not painted yet. The Houndmaster is a stalker and already wears the stalker's strips. The wood's captive sheet (item 16) is wired too

## Stage 5 — Presentation and polish

- [ ] Painted backdrops, houses, props and villagers (requests in `docs/cloud-handoff.md`)
- [ ] King Vaurath's art; the throne room
- [ ] Lighting, sound, dialogue staging

## Stage 6 — Full verification

- [ ] Start to finish with every hero; saves, reloads, skips; the judgment; rewards once; the epilogue
