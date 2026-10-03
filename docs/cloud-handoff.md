# Hand-off to the cloud session (2 October 2026)

The local machine only collects art now (ChatGPT can't be reached from the cloud).
Everything below is code work for the cloud session.

## What changed locally since `bcbf732`

- **Hero names**: Rurik (warrior, was Ulric), Oryn (mage), Vexa (rogue). Only the
  display names in `src/data/characters.js`, the README and `docs/itch-controls.md`
  changed. Ids, file names (`ulric_*.png`) and code comments still say Ulric.
- **New hero designs** (approved by the user): `docs/art-refs/mage_ref.png` (old, long
  white braided beard) and `docs/art-refs/rogue_ref.png` (red-haired woman in violet).
  They also replaced the select-screen portraits `assets/ui/hero-mage.png` and
  `hero-rogue.png`.
- **Painted strips** in `assets/sprites/strips/`: `mage_*.png` (9) and `rogue_*.png` (10).
  Layouts and sizes are in `src/data/heroStrips.js`.
- **`src/view/StripHeroView.js`** draws a hero from those strips. `BootScene.buildHeroStrips`
  cuts them; `ArenaScene.makeView` uses the view once every strip in `needs` has loaded.
  The Mage was checked in the running game. **The Rogue runs on her strips without errors but nobody has looked at her on screen**:
  her strips arrived after the code was written, and the per-strip `ref` / `target` values in `heroStrips.js` are first guesses from looking at the images.
- **Kicked crates and chests** (`Stage.updateKicked`, `KICKED`): Rurik's kick, the
  Rogue's kick or the Mage's force blast sends one skidding; it bursts on the first enemy.
- **Struck pendulum blades** (`Stage.strikeBlade`, `BLADE.driven`): any hero attack or
  the Mage's force blast hurls the blade back; it then only cuts enemies.
- The steel title lettering (Metal Mania) was tried and reverted at the user's request: titles use MedievalSharp again.
- Logic tests: 82 pass (run in a browser: `import('/tests/logic-test.js')`).

## To do in the cloud

1. **Rogue view**: check every `HERO_ANIMS.rogue` entry against her strips (open each
   PNG; pose order is in the comments of `heroStrips.js`). Tune per-strip `ref` /
   `target` so she is the same size in every strip, as was done for the Mage. Her
   finishers only borrow attack poses.
2. **Mage changes the user asked for** (in his words where quoted):
   - Jumping teleports: he can blink while in the air.
   - "remove fire wall just earth wall": the barrier button only raises the Earthen
     Bulwark (no tap/hold split, no Infernal Wall).
   - Chain Lightning "feels like a bee bite, needs to feel like a shark bite", and "needs
     a three hit combo": make the electric strike a three-press combo that hits far
     harder (damage, hit-stop, shake, sound, the victim's reaction).
   - Force push: "press and hold for stronger push upon release" (a charge, like the
     lightning's overcharge).
3. **Rogue changes the user asked for**:
   - Her mark (EXPOSED, `kit.expose`) becomes a mark of death: when ANOTHER player hits
     the marked enemy it is "a super critical hit, heavy carnage" (big damage, the
     heaviest gore).
   - The mark lasts about 15% longer (300 frames now, so about 345).
   - She can dive (Falling Viper) out of a jump or a double jump. Check `kit.dive.minHeight`
     and the double-jump path: the user expects it to work from both.
4. **Mage view polish**: his idle loops the hover strip; finishers borrow cast poses;
   no back/front views, so moving up or down the screen shows the side view.
5. The itch build is behind: none of the above is uploaded. Uploading needs the user's
   go-ahead and has to be done from the local machine.

## Not drawn yet (art, local machine only)

Idle strips, back/front movement views, finisher strips and the Mage's jump strip for
both heroes. Prompts are in `docs/mage-art-prompts.md` and `docs/rogue-art-prompts.md`;
their character descriptions are out of date (use the reference images above instead).

## Done in the cloud (2 October 2026, after the hand-off)

- Mage: blinks out of a jump (once per jump, holds his height through it); the barrier
  button only raises the Earthen Bulwark; Chain Lightning is a three-press combo
  (`kit.bolt.combo`), each strike harder, the third floors him; hold kick to charge the
  force push (`kit.force.charge`).
- Rogue: 25% smaller (strips and hurtbox); higher jump (700, vault 1010); her mark is a
  MARK OF DEATH: another player's hit on it is a super critical (x2.6, gore burst,
  spends the mark; `kit.expose.crit`); the mark lasts 345 frames; she dives out of a
  jump, a double jump or an air slash (`kit.dive.minHeight` 22).
- Checked the Rogue on screen at her new size: consistent across strips.
- Still open: Mage view polish (item 4); the itch upload.

## New requests from the user (local session, 2 October 2026, later)

- **Rogue size**: the 25% shrink went too far ("way too small"). She is "supposed to be a little smaller than grunts": size her strips and hurtbox just under the grunt's (compare on screen next to one).
- Extra strips are being collected locally (idle, back/front views, finishers for both heroes) and committed one by one as `assets/sprites/strips/<hero>_<name>.png`; they are not wired in.

## Extra strips collected locally (2 October 2026) - not wired in

All in `assets/sprites/strips/`, one row on black, facing right unless noted.

| File | Poses | What |
|---|---|---|
| `mage_idle.png` | 6 | hovering idle, subtle |
| `mage_hoverU.png` | 8 | hover-glide seen from behind |
| `mage_hoverD.png` | 8 | hover-glide seen from the front |
| `mage_finStorm.png` | 8 | ready, plant, staff up, sparks, staff down, hold, lower, ready |
| `mage_finRupture.png` | 8 | ready, hand out, curl, hold, closing, near fist, fist, lower |
| `mage_finEmbers.png` | 8 | dissolving, re-forming, staff raised, slam, planted, robe blown up, still, turning away |
| `rogue_idle.png` | 6 | low coiled guard; pose 4 is a dagger flourish |
| `rogue_runU.png` | 8 | run seen from behind |

**Style warning:** the three `mage_fin*` strips drifted: they are duller and less detailed than his other strips (yellow lanterns, flatter robe). Next to the hover and cast strips the change will show. Either leave his finishers on the cast poses or have them redrawn.

Not drawn (the user stopped the batch here): `rogue_runD`, `rogue_finPhantom`, `rogue_finLotus`, `rogue_finScarlet`.

## Local session, 2 October 2026 (evening)

- Merged `main-i16vso` into `main` (parallax system, wired strips, Mage finisher fix) and uploaded that build to itch (upload 19519813).
- Parallax art is in: `assets/env/parallax/plx_sky.png`, `plx_clouds.png` (on black), `plx_far.png`, `plx_mid.png`, `plx_near.png`, `plx_fg.png` (on magenta). Chat: "BA · Env · Parallax" (6abfaca4-730c-83ea-bb11-83e6c8aed56d). All six load and show in the arena. `plx_far` and `plx_mid` came out 2508x627 (4:1), the rest 2172x724. `plx_near` has a fallen knight statue in it.
- Rogue made "a touch bigger" at the user's request (still the smallest fighter): strip targets 84/83/73/72 -> 90/89/78/77 in `heroStrips.js`, body 34x86 -> 36x92 in `characters.js`. 89 logic tests pass.
- Not on itch yet: the parallax art and the Rogue size change.

## Local session, 2 October 2026 (night): fixes the user asked for while testing on itch

- itch has upload 19520221 (parallax art + bigger Rogue). `tools/build-release.ps1` now leaves the magenta parallax layers as PNG (JPEG left a purple fringe).
- Grey vertical bar at section joins: the mood overlay now blends across each join and the soot seam is floor-only (`StageView.buildSections`).
- Fire grates: painted blaze `assets/fx/firepit-strip.png` (`FX_STRIPS.firepit`, drawn in `StageView.drawFire`).
- Rogue double jump: `assets/sprites/strips/rogue_flip.png`, played once over 40 ticks (`f.flipFrom`, `StripHeroView`). The importer takes `holes: [[x, y]]` seeds for pockets of background a figure closes off.
- Air steering: holding a direction in a jump turns the fighter and pulls him that way (`airControl` warrior 0.14, mage 0.2, rogue 0.34); with no direction held he keeps his speed.
- Mage blink distance 210 -> 273.
- Title menu: left/right + confirm work on keys and gamepad (`TitleScene.pick`); the online menu takes left/right, A, B from a pad. Typing a room code still needs the keyboard.
- All of this is on itch as upload 19520444.

## Local session, 3 October 2026: more fixes from the user's itch testing (not on itch yet)

- "Grunts revert to old art": dismembering kills and arm-loss used to show the paper doll's parts. `Gore.cutSprite` now cuts the painted frame instead (effects/SpriteCut.js: neck, waist, steep diagonal, knees, blown in two); `Gore.onMaim` throws meat and blood for painted enemies, not the doll's arm. The doll path is only the fallback when no painted sprite is showing.
- Mage: jump 470 -> 575 (about 130 px, just under the Rogue's: a test requires hers to be the highest). Air blink and air attack already worked; checked in the running game.
- Rogue: Shuriken Fan moved from magic (LB) to kick (RT / O) in the air (`states.airKick`).
- 89 logic tests pass.

## Local session, 3 October 2026 (later): stopped mid-boss because the user ran low on usage

Done and pushed (not on itch): sprint for all heroes (left-stick click / C), Rogue shuriken spam on kick, fire-pit blaze kept inside the grate, online version check (`src/net/Version.js`, shown in the lobby, part of the room name), new hero strips wired (sprints, Mage jump + finishers, Rogue front run + finishers). 91 logic tests pass.

**The boss (unfinished).** Approved design: `docs/art-refs/boss_ref.png` (black cape and banners; the user asked for black instead of red). Chat: "Boss Design Description" 6abfc110-bc60-83e9-968a-1b52efb55443 (Bloody Axe project).
- `ENEMIES.warlord` ("Warlord Malgor": stats, four moves, AI), `ENEMY_STRIPS.warlord` (on magenta), `ENEMY_ANIMS.warlord` and the `cell: 2` outsize-frame support in `BootScene.buildEnemyStrips` are written but **never run**: he has only `warlord_walk.png` and `warlord_react.png`. `warlord_atk1` was requested and is sitting in the chat uncollected; `atk2`, `heavy`, `special` are not requested yet (prompts: same wording as the first three, attach `boss_ref.png` every time, magenta background).
- The stage boss is back on Pitlord Kragg until the six strips are in. Then set the throne section's boss to `{ type: 'warlord', name: 'Warlord Malgor, the Oathbreaker', ... }` in `src/data/stage.js` and check him in the game (size, the 6656-px-wide walk texture, cut-out edges).
- Still to build, in the user's words: boss battle music "comes on as the boss slowly walks onto the screen, pounding his feet as he goes, everything shakes, the main characters are frozen in place for a few seconds as he comes out, give him hella hp, and dont spawn helpers in until halfway through his health he will call for help". (Helpers already only come at half health: `bossRage`.) Plan that was about to be written: a `Fighter.awe` freeze counter beside hitstop, `Stage.spawnBoss` putting him off the right edge and walking him in for ~4 s with `bossStomp` events (shake + thud), `playMusic(this, 'boss')` on `bossSpawn`, stage boss `health` around 6.
- The music file the user gave is `C:\Users\nickr\Downloads\06. Nightmare (Legend of Zelda - Link's Awakening) - Lights Out.mp3`. It is not copied into the repo. It is a cover of Nintendo music: the user should decide whether to ship it on a public itch page.

## Boss art complete (3 October 2026) - the rest is code, for the cloud

All six Warlord strips are in `assets/enemies/strips/` on a magenta background, 2172x724, facing right, pose counts as `ENEMY_STRIPS` expects: `warlord_walk` (8), `warlord_react` (6: ready, breathing, block with the gauntlet raised, hit, flying, lying), `warlord_atk1` (5: gauntlet backhand), `warlord_atk2` (5: glaive sweep; pose 3 reaches far forward, it may need `wide`), `warlord_heavy` (6: overhead slam), `warlord_special` (6: ready, then five charging poses, the last the impact). They were checked by eye on a contact sheet only: never cut by the importer, never seen in the game.

To do, in order:
1. Switch the throne boss to the warlord in `src/data/stage.js` (the line carries a comment) and boot the game: check the magenta cut-out leaves no fringe on his black cape, that `cell: 2` frames hold him (weapon overhead in `heavy`), and his size beside the heroes. The release script must not JPEG these (add `warlord_` to the PNG exceptions in `tools/build-release.ps1`, like the parallax layers).
2. The entrance, music and health the user asked for (quoted in the section above).
3. The music file is still only on the user's PC (see above); it has not been added to the repo.

## Local session, 3 October 2026 (after the boss merge)

- **Bug fixed:** `BootScene.buildHeroStrips` used `cell`, which only exists in `buildEnemyStrips` (my slip when adding the boss's outsize frames). It threw, so no hero sheets were registered and the Mage and Rogue fell back to their stand-ins. Any build made from `36a5e96` has this fault.
- **Added outside this session (by the user with another tool), committed here as found, not reviewed or run:** a studio intro video before the game starts (`assets/video/ufo-technologies-intro.mp4`, `src/core/StartupIntro.js`, changes to `index.html`, `src/main.js`) and two changes to `tools/build-release.ps1` (a path check, and copying `tools/sprite-pipeline/palette.png` into the staged build).
- The user says an itch upload made with that other tool left the game "messed up". Not investigated here. Check the staged build (`release/stage`) boots past the intro video, shows the Mage and Rogue painted, and that `?mute=1` testing still works with the intro in the way.

## Cloud session, 3 October 2026 (late): back to local

On `main` now (all tests pass, 2-tab online test passes through a PeerJS stand-in):
- **Online co-op fix:** input delay is measured from the round trip on the select screen (`delayFor` in `src/net/Session.js`); the old fixed 50 ms made both games crawl over real internet lag (62% speed at 100 ms). Time lost waiting is caught up.
- **Version handshake:** on connecting, both games swap version + build time (`handshake` in `src/net/Link.js`); a mismatch stops the join and says who must refresh. `tools/build-release.ps1` stamps `window.BUILD_TIME` into the staged `index.html` (untested here: no PowerShell in the cloud — check the staged `index.html` has a number, not 0).
- **Relay:** `SETTINGS.net.iceServers` (two STUN servers). If two players still can't connect, add a free TURN relay there (e.g. metered.ca).
- **Mage:** turn left/right while a spell winds up; the stone wall holds everyone 12 px off its face (allies cross by roll/blink/vault/jump), every enemy batters it (hp 300, health bar), and it erupts from a glowing fissure in a wave of overshooting slabs. Painted slabs plug in via `assets/fx/earthwall-strip.png` (prompt: section 12 of `docs/mage-art-prompts.md`); not drawn yet.

To do locally: paint the earth-wall slabs, build + upload to itch, then a real two-computer online test (report the exact message if it fails).

## Local session, 3 October 2026 (night)

- Earth-wall slabs painted: `assets/fx/earthwall-strip.png` (6 slabs on magenta). At the user's request they are raw rock and earth only (no masonry) in slate grey, moss green and **teal** magic seams. The wall's coded effects (the glowing fissure, sparks) may still be orange/gold: recolour them to teal to match.
- **Standing instruction from the user:** new art and effects must stop defaulting to red and gold; give each spell, enemy and place its own colours.
- Release build made from this state, checked locally (build time stamped, intro video skips, Mage and Rogue painted, boss sheet and music load) and uploaded to itch as upload 19525664.

## Local, 2026-10-02 (after itch upload 19525664; NOT yet on itch)
- Rogue: each ground shuriken now costs stamina, the same as her roll (`kit.knife.cost` overrides; default `dodge.cost`). Without the stamina the kick button gives the kick. Sim change: both players need the new build.
- Boss kill: a longer slow moment of victory (slow-mo 0.18 for 4.2 s, shake, VICTORY callout) before the tally screen. Not watched in play yet.
- Rogue mines: U mid-roll leaves a mine without ending the roll; rolling through a man plants it ON him (`Mines.stick`, 34-frame fuse): ordinary soldiers are blown to bits 85% of the time, brutes (160+ hp) and bosses take 1.7x mine damage and live. Mine kills are now legs off or blown to bits (no halves: `Gore.cutSprite` mine branch), never a waist cut. Sim change. Logic tests pass; visuals not watched in play.
- Stuck mine: fuse now 62 frames; for the last 44 the victim stands frozen (`f.awe`) realising, in one of four ways (`f.doom.kind`: rigid and rattling / looking both ways / hopping to shake it off / leaning away) (no words over heads: the user did not want text). Procedural on the existing frames, no new art. Seen working once in a real fight; word size untested after enlarging.
- Stage: the two chests are now crates (same drops) and the cracked secret wall with its shrine is gone (user asked). Chat "BA · Enemy · Mine doom poses" (6ac019ed-6f5c-83e9-83de-5802529ff334) drew `<enemy>_doom.png` for all 7 enemies: 4 poses each (rigid / looking back pleading / hopping pulling at it / leaning away), matching `doom.kind` 0-3, mine with violet light drawn on the chest. Kept in docs/art-refs/doom, NOT wired in: waiting for the user to approve. Penitent has small surprise ticks over his head to clean. New HD barrel/crate/jar sheet requested in the same chat (pending).
- Props: new HD barrel / crate / jar (+ smashed) sheet `assets/env/props-hd.png` (3x2, grey-blue wood, verdigris hoops, teal jar), cut by `buildPropSheet(..., PROP_HD, 3, 2, true)` at 4x and drawn at 0.25 scale, about 15% bigger than before. Seen in game (docs/art-refs/props-hd-ingame.png); jars and smashed states not looked at in play.

## itch upload 19527803 (2026-10-02) = main at ac4b517
Shuriken stamina, boss victory beat, roll/stuck mines with the frozen reactions (procedural, doom art not wired), chests->crates, no cracked wall, HD props. Zip hash checked in-page; public page points at 19527803. Not played on itch.

## Cloud, 3 October 2026: mine-doom poses wired in
- The seven `<enemy>_doom.png` strips moved from `docs/art-refs/doom` to `assets/enemies/strips/` and load as the optional `doom` strip (`data/enemyStrips.js`, 4 poses = `f.doom.kind` 0-3). `SpriteEnemyView` shows the pose while a mine is stuck on him, with gentler procedural motion on top (rattle / turning to look each way / hop / edging back). An enemy without the strip, a one-armed one, or the boss still gets the old hit/idle stand-ins.
- Penitent: the surprise ticks are erased at load (`erase` boxes) and the pockets closed off by his flail chain are cut out (`holes`); same for the Butcher's hook chain. No text or marks over anyone's head.
- Checked: every cut pose in the browser (sizes match the react poses, feet on the baseline), and two grunts posed in a live arena with no errors. Not watched through a real mine fuse yet; not on itch.

## Cloud, 2026-10-03
- Earth wall recoloured to match the painted slabs: the fissure, seam glow, crack glow and health bar are teal (no orange/gold left in `EarthWallView`); rock debris, dust, hit sparks, painted-slab tints and the fallback drawn slabs are slate grey instead of brown. Tests pass; not looked at on screen.

## Cloud, 2026-10-03: Vexa plants mines by hand (not on itch)
- Magic (LT / LB / U) with an enemy in kicking distance ahead (`kit.knife.kickReach`, 90 px, same test as her crescent kick) now sticks the mine ON him (`plantTarget` in `src/combat/Rogue.js`, then `Mines.stick`), so the frozen stuck-mine reaction plays. Nobody in reach: the floor mine as before. No new animation: she plants it without breaking stride. Sim change. New logic test covers it; not watched in play.

## Cloud, 2026-10-03: Malgor walks in (not on itch)
- Boss: Warlord Malgor no longer glides in on his standing pose. His entrance (`bossEntrance` state) now plays his existing walk strip (`warlord_walk.png`), with the lumbering sink and sway, one step per `bossStomp` so each screen shake lands on a planted foot (`SpriteEnemyView.walkFrame`). View-only change, no sim change. Checked in a headless browser frame strip; not watched in a real playthrough.

## Cloud, 2026-10-03: online join fixed for two different networks (not on itch)
- Why Nick's friend could not join (itch upload 19531276): `SETTINGS.net.iceServers` listed only STUN, and handing PeerJS our own list replaces its built-in one, which carries PeerJS's free TURN relay (`turn:eu-0/us-0.turn.peerjs.com`, user `peerjs`). Without a relay, two homes behind routers or carrier NAT that won't allow a direct line can't connect. Same-machine and same-Wi-Fi tests always worked, which is why it was missed. The relay is back in `src/config/settings.js`; keep it in the list. `net.broker` can point at a self-hosted PeerJS server if 0.peerjs.com ever goes down.
- Every failed join now ends in a message (`src/net/Link.js`): matchmaker unreachable (12 s), no room with that code, or room found but no line (ICE failed or 30 s). The host now sees "Your friend found this room, but could not connect" in red under the code, and the room stays open. Before, the host saw nothing at all. The host also re-registers if the matchmaker drops its socket.
- Tested in the cloud with two separate Chromium instances, a local PeerJS server and a local TURN server, with every direct (non-relay) candidate dropped to stand in for two networks that won't connect directly. With the relay, the two connect and reach hero select through the relay. With the old STUN-only list, both screens show the failure. A wrong code says "No game found". Not tested: the real turn.peerjs.com / 0.peerjs.com (blocked from the cloud) or a real two-house test. Typing the code still needs a keyboard, and in the itch iframe the game must be clicked first so it has focus.
- To do on the PC: build and upload to itch, then a real two-computer test. Both players must refresh to the new build (the version check will say so otherwise).

## Cloud, 2026-10-03: better explosion chunks (not on itch)
- A painted enemy blown up (stuck or floor mine, lotus, rupture, crushing crit) is now torn into 9-15 jagged pieces of his own sprite frame (`SpriteCuts.shatter` / `tear` in `src/effects/SpriteCut.js`): head, boots, hands, weapon, torso chunks, each with raw meat on its torn edges, blood soaked in and soot. Painted meat, organs, gut, bone, skull and an eye fly with them (`Gore.blowApart`). The old flat coloured squares are gone. Non-mine explodes used to split him in two halves; they now shatter too (fewer, bigger pieces, thrown the way the blow went).
- The mine blast (`RogueFX.blast`) is a fireball with a white-hot core, floor glow, shock ring, dust skirt, embers, gravel and rising smoke, replacing the pink flash circles. A small violet flash keeps it reading as the Rogue's.
- Mist uses a new soft round texture (`softTex` in `Gore.js`), so red mist no longer shows as hard discs.
- Visual only, no sim change. Before/after captures: project files `explosion/`. Not watched at full speed in a real fight.

## Cloud, 2026-10-03: earth wall polish (not on itch)
- The Mage's Earthen Bulwark (`EarthWallView` in `src/effects/MageFX.js`) no longer has teal lines drawn over it: the teal zigzag fissure, the seam lines on every slab and the teal health bar are gone. The magic is only the glowing veins already painted into `assets/fx/earthwall-strip.png`.
- Going up: a dark jagged crack runs across the floor with grit kicked up at its tip; each slab throws real rock chips (new `rockchip` texture) and a skirt of brown dust, and flares briefly as it locks in. No more white dot puffs.
- Hit: the wall jolts away from the blow, slabs near the impact flash, a burst of stone chips and dust comes off the struck face, grit trickles off the top, a small camera shake, and a heavier thud (`earthHit`). The stone near each hit gets knocked a little shorter and the whole wall darkens as it loses health. Health bar is bone on red.
- Broken: slabs topple and sink in a dust cloud with rubble and a bigger shake (`earthBreak` sound; `barrierDown`'s `broken` flag is now passed to the view). Timed out: it just sinks back with a little dust.
- View only, no sim change. Before/after captures: project files `earth-wall/polish/`. Not watched at full speed in a real fight.
