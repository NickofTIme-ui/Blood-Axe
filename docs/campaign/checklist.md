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

- [ ] Level transitions: exit loads the next level; carry the heroes, health share and picks
- [ ] Campaign save and CONTINUE on the title (last level reached, its checkpoint)
- [ ] Checkpoints saved per section
- [ ] More rescue kinds: cage (open a lock), execution (stop the swing), escort
- [ ] An interact prompt for survivors (now: walking near them is enough)
- [ ] Boss phases (thresholds that change moves and hazards), reusable
- [ ] Held-scene framework reused for the judgment (detect once, clear combat, place, play, award once)
- [ ] Skill tree: one representative branch for Oryn (Stormcaller)

## Stage 3 — Continuous campaign (graybox)

- [ ] 2 Gallows Wood: convoy, Houndmaster, the execution, the road blocked
- [ ] 3 Hollow Mountain: lifts, counterweights, rivers, Chain Warden, the war machine, the collapse
- [ ] 4 Shattered Ascent: rockfall timing, bombardment, the shelter, the siege commander
- [ ] 5 Iron Gates: siege weapons, the gate from inside, Gate Twins, the Iron Marshal (Malgor), returning villagers
- [ ] 6 Black Keep: courtyard, prison wing, great hall, the Executioner, King Vaurath (three phases)
- [ ] The king's cutaways 2-6 (irritation to desperation), enemy reactions (horns, retreats)
- [ ] Rurik's judgment and execution; the village epilogue
- [ ] The castle growing level by level

## Stage 4 — Character progression

- [ ] Oryn's tree (Stormcaller, Earthshaper, Waywalker)
- [ ] Vexa's tree (Widowmaker, Deathmark, Skydancer)
- [ ] Point pacing across six levels; balance against the bosses

## Stage 5 — Presentation and polish

- [ ] Painted backdrops, houses, props and villagers (requests in `docs/cloud-handoff.md`)
- [ ] King Vaurath's art; the throne room
- [ ] Lighting, sound, dialogue staging

## Stage 6 — Full verification

- [ ] Start to finish with every hero; saves, reloads, skips; the judgment; rewards once; the epilogue
