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

## Cloud, 2026-10-03: release build made in the cloud (not on itch)
- `tools/build-release.py` is a Linux/macOS twin of `build-release.ps1` (same PNG->JPEG rules and exceptions, BUILD_TIME stamp, palette copy, forward-slash zip). Needs Pillow.
- Merged PRs #1 (teal earth wall) and #2 (doom poses wired) into `main` (only the hand-off notes conflicted). Built from `main` at cd257fb: 298 files, zip 134 MB, all logic tests pass. Booted the staged build headless: title, Rurik, Oryn and Vexa painted, parallax and all seven doom sheets load, no errors beyond the sandbox blocking Google Fonts.
- Not uploaded: the cloud environment cannot reach itch.io and has no butler API key. To upload from the PC: pull `main`, run `tools/build-release.ps1`, upload `release/blood-axe-web.zip`.

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

## Cloud, 2026-10-03: Storm Judgment lightning no longer sticks (not on itch)

- The Mage's STORM JUDGMENT left a cluster of lightning frozen over his staff after the
  finisher. Its gather beat throws a new bolt every few ticks from inside a tick job, and
  the scene's job loop rebuilt its list with `filter`, dropping any job added while it
  ran. Those bolts were drawn once and never cleared. The loop now lives in
  `src/core/TickJobs.js` (`runTickJobs`) and keeps jobs started mid-run. Test added.
- Nick asked for the finisher's lightning to come out of the staff's tip, the source of
  its power. The seize bolts, the gather's crackle and the killing bolt now all start
  at the lantern (they used to fall from the top of the screen). `finStorm` in
  `src/data/heroStrips.js` marks the lantern in each pose (`tips`);
  `StripHeroView.staffTip()` turns that into a screen point and `MageFX.staffTip` uses
  it, falling back to the old fixed offset. Other strips can get `tips` the same way.
  Filmed in the cloud: project files `mage-storm/`.

## Cloud, 2026-10-03: Mage blocks with his staff (not on itch)
- His block (and parry) used `react` pose 0, which holds the staff trailing behind him and reads as a flinch. It now shows `combo2` pose 3: both hands on the staff, raised diagonally across the front of him (`HERO_ANIMS.mage.block` in `src/data/heroStrips.js`). Reuses existing art, no new strip needed. Before/after: project files `mage-block/`.
- If Nick wants a purpose-made guard (staff held level in front, both hands, a little shield glow), that would be one new pose to paint; not requested yet.

## Cloud, 2026-10-03: critical hits for every hero (not on itch)
- Nick asked for critical hits for all good guys. Before this the only crit was Vexa's mark of death (the SUPER CRITICAL a teammate lands on her marked man).
- Now any hero's clean hit (not blocked or parried) has a 12% chance to be a CRITICAL for 1.75x damage: `SETTINGS.feel.critChance` / `critMultiplier`; a hero can override with `stats.critChance`. Enemies never crit. A super critical never also rolls a normal crit.
- Rolled with `world.roll()` in `CombatSystem.resolve`, so online co-op stays in step. The hit event carries `crit`; `ArenaScene.critFX` shows "CRITICAL!" (or "CRITICAL COUNTER!"), a small shake, a thump and an extra spray.
- `tests/logic-test.js` turns crits off by default (they'd make damage comparisons flaky) and has its own crit test for all three heroes.

## Cloud, 2026-10-03: Mage hover upgrade (not on itch)
- Nick asked for a higher-grade hover: "perhaps effects, his cape moving better". New `src/effects/MageHover.js`, hooked into `StripHeroView` for any hero with `stats.hover` (only the Mage). It only runs while he hovers (idle / gliding, not sprinting) and is visual only, no sim change.
- Cloth: a WebGL pipeline (`MageCloth`, a `SinglePipeline` with its own fragment shader) ripples the painted cape and robe from the waist down, most along the trailing back edge, with extra streaming while he glides. Each frame is scanned once for the figure box, the staff column and the lantern, so the staff, boots and lantern stay still. It switches off at once for every other state. On the canvas renderer the shader is skipped.
- Float: the single sine bob is now a slow swell under a quicker bob, with a slight sway; the floor shadow shrinks and grows with the height.
- Magic: a slow-turning rune circle on the floor under him, a glow at his boots, motes rising under the hem, and the lantern breathing light (halo behind him) and shedding sparks.
- Finisher code untouched. Checked in a headless browser (idle, glide, combo, spells, sprint, knockdown): no errors. Before/after GIFs: project files `mage-hover/`. Not watched at full speed on a real GPU.

## Cloud, 2026-10-03: Malgor's Earthbreaker slam (not on itch)
- New boss move `ENEMIES.warlord.moves.special2` (Earthbreaker): a long tell (glaive up, the ground trembles, "JUMP!" banner), then the glaive goes into the floor. It can't be blocked or parried (`unblockable`, checked in `CombatSystem.resolve`), has super armor, and gives the hardest screen shake in the game plus pad rumble.
- The slam splits the floor and sends a shockwave out both ways across the whole depth of the lane (`src/combat/Quake.js`, `world.quakes`). Anyone on the ground when the front reaches him is knocked down (also unblockable); a hero whose feet are more than 26 px up lets it roll under. It rolls 620 px each way at 420 px/s. One blow per man between the glaive and the two waves; the boss's own men are never hurt.
- `cooldown` on a move (frames before it can be used again, via `f.cool`) keeps him to one slam every 7 s at most. His AI rolls it within 380 px.
- Visuals in `src/effects/QuakeFX.js`: dust during the tell, flung floor chunks, a crack decal that fades, and stone and dust thrown up along each wave's front. No new art: it reuses his `heavy` strip with a longer hold at the top. If it should get its own strip, ask for `warlord_slam.png` (6 poses on magenta, same 2172x724 as his others: ready, glaive lifting, glaive high over his head, driving down, blade buried in the floor, pulling it free).
- Sim change: both online players need the new build. Logic tests cover the guard, parry, jump, wave both ways, cooldown and that his AI uses it.

## Cloud, 2026-10-03: enemies always walk on from off-screen (not on itch)
- Nick: "always have the bad guys walk onto the screen, not spawning visibly in". Waves used to spawn about 500 px from the hero but clamped inside the section, so near a wall, or in a room narrower than a screen, they popped into view.
- `offscreenX` in `src/entities/Enemy.js` places each man past the edge of anything a hero's screen can show (centred on the hero, held inside the camera bounds, never narrower than a screen), plus a margin. It reads only sim state, so both online machines agree. `createEnemy(..., { entering: true })` lets him stand outside the bounds (`unbounded`) and his brain only walks him in until he's inside the bounds and within 400 px of a hero; then he fights as normal. Hazards skip him while he's entering. Stage waves, boss adds and the test-arena waves (key 9) all use it; Malgor's own entrance is unchanged; the debug spawn-near key still drops a man beside you.
- Checked in a headless browser: every enemy spawned outside the view and first showed up at the screen edge, walking. Logic test added (hero at the start, at the right wall, mid-room). Sim change: both online players need the new build.

## Cloud, 2026-10-03: Mage lightning sounds (not on itch)
The Mage's lightning has its own electric sounds now: a rising hum while the bolt charges, a
zap when it leaves the staff, a stuttering shock buzz when it hits, a short snap for each fork,
and a thunderclap on the third chain hit and Storm Judgment. They are five WAVs in
`assets/audio/sfx/elec-*.wav`, made in code by `tools/sfx-gen/electric.js` (no samples, so no
licence question). Wired in through `MAGE_SOUNDS` in `src/effects/MageFX.js`. To tweak one, edit
the generator and run `node tools/sfx-gen/electric.js`.

## Cloud, 2026-10-03: real chain on the pendulum blades (not on itch)
- The swinging blades used to hang from a dotted line of grey squares. `StageView.drawChain` now draws real interlocking links in rusted iron matched to the painted blade's own chain: open oval rings seen face-on alternating with links seen edge-on that cross in front of them, a highlight on the lit side and rust on the shadow side, a slow twist along the chain, and an iron ceiling plate with rivets and an eye at the pivot. Each link has its weld seam, rust patches, pitting, a glint and contact shadows. Sizes and colours are in `CHAIN` at the top of `StageView.js`.
- Chain physics (`src/view/BladeChain.js`), built around the blade being far heavier than the chain (Nick: "more bottom heavy"). The blade's weight pulls the chain tight, so it hangs straight through a normal swing, and a blow makes it shudder and snap straight in a moment rather than flop. The blade hangs from the last link like a short heavy pendulum: it lags a touch at each end of the swing, and when struck it carries on for an instant, swings back past the chain's line and settles. The blow shakes the ceiling mount and knocks grit loose from it.
- Sim change (`Stage.js`): a struck blade used to jump to the bottom of its arc, and jump again when the driven spell ended (its swing halved at once). It now reverses where it is (`strikeBlade` picks the point of the wide arc it's already at), and the extra width and speed bleed away over a few swings (`BLADE.bleed`, `hz.amp`, `hz.rate`). `bladeState` also returns `omega`. Damage, reach and the driven time are unchanged. Logic test: "blade: a struck blade reverses where it is...".
- Fixed: the blade was drawn turned the wrong way relative to its chain (mirrored tilt, about 16 degrees at the ends of the swing). It now lines up with the chain.
- Before/after captures and a GIF of a strike: project files `trap-chain/` (`chain-physics-heavy.gif` is the current one).

## Cloud, 2026-10-04: balance pass, the game was too easy (not on itch)
- **Twice the enemies:** every wave in `src/data/stage.js` is its old line-up written twice (4-6 men a wave), and Malgor calls eight men at half health instead of four.
- **Mage (Oryn) slightly weaker:** health 110 -> 100, mana regen 7 -> 5/s, spell damage x1.4 -> x1.25, blink 14 -> 18 stamina. Chain Lightning casts for 16 mana (was 12) and the 2nd and 3rd strikes now cost 8 and 10 more (`kit.bolt.combo.manaCost`; no mana, no follow-up). Force Blast now costs 12 mana (`moves.kick.manaCost`) and its cooldown is 90 frames (was 75). Earth wall 50 mana (was 40), 9 s cooldown (was 7).
- **Rogue (Vexa) slightly weaker:** Widow Mines now cost 20 mana each, dropped, planted or out of a roll (they were free); mana regen 3 -> 2.5/s. Mine damage 46 -> 40. Viper Strike 14 stamina (was 10). Shuriken Fan costs 20 stamina (`kit.fan.stamina`; was free). Mark of Death super critical x2.6 -> x2.3.
- Rurik is unchanged. Sim change: both online players need the new build. Two new logic tests cover the costs and the wave sizes; a bot played the stage through. Not played by a person yet.

## Cloud, 2026-10-04: platforming, THE GALLOWS ASCENT and progression (not on itch)
- **Terrain** (`src/stage/Terrain.js`): ledges, pits, lifts, rotten planks on the floor lane. A fighter's `h` is now absolute; `floor` is the ground under him and `air` = h - floor (checks that meant "off the ground" use `air`). With no terrain every floor is 0: the Oath Road plays as before (tests + a bot run of it confirm).
- **Feel**: variable jump height (`FEEL.jumpCut`, every stage), ledge forgiveness (`FOOT`), jumps keep momentum against a ledge face, enemies avoid pits, jump gaps and hop ledges (`EnemyBrain.terrainSteer`).
- **THE GALLOWS ASCENT** (`src/data/stageGallows.js`, title menu): 6 sections, design and playtest list in `docs/gallows-ascent.md`. Placeholder art in `src/view/TerrainView.js`; what to paint in `docs/gallows-art-needed.md`.
- **Progression** (`src/progression/Progress.js`, `src/data/skills.js`, `src/combat/Skills.js`, `src/scenes/SkillScene.js`): shared blood/points, per-hero picks, free respec at shrines, Rurik's 9-skill tree. Rules: `docs/progression.md`. Off online.
- Tests: terrain, jump, pits, lifts, planks, blink, skills, shrines, the bell, a route bot that finishes the main route with each hero, and the roost's reachability.

## Cloud, 2026-10-04 (later): platforming with teeth, enemy jumps, skill fixes (not on itch)
- **Higher jumps** for everyone: Rurik 680/1900 (rises 122), Oryn 650/1300 (162), Vexa 800/1900 (168), enemies 560/1700 (92). A tapped jump is a 54-70 px hop.
- **Gallows rebuilt around them**: held-jump steps (85-90), gaps over pits, rising rotten planks (30-frame fuse), a faster cage, roost 150 px up. Pit falls cost 20%. A route bot finishes it with every hero; a fight bot wins it with Oryn and Vexa.
- **Enemies jump properly**: a crouch before a hop up (`f.jumpPrep`, the readable wind-up), rise / top / fall poses, a landing squash, and a deliberate short hop DOWN off ledges (`airKind 'drop'`). Painted strips `<enemy>_jump.png` (4) and `_drop.png` (3) plug in by name; until then the walk frames are squashed and stretched (`SpriteEnemyView.ledgePose`). Prompts: `docs/enemy-jump-art-prompts.md`.
- **D-pad freed**: it no longer moves a hero (left stick only); its buttons are actions `padUp/padDown/padLeft/padRight` (new tick bits). Menus still use it. **D-pad Down / H = Rurik's Whirlwind Cleave.**
- **Skill tree**: Wind Step first, Leap Smash second; Keen Edge = +25% on every sword blow; Executioner's Arc = the Whirlwind Cleave (360: front then behind, a turn and a full-circle smear; also cancels out of the combo). The tree closes on Esc / B / Backspace, pad B / Back / Start, or a click (it trapped players before: Enter didn't close it and B on the keyboard wasn't bound).
- Fixed: landing with the stick pushed and letting go kept the sprint on.

## Cloud, 2026-10-04 (end): handed back to local
- **Triple guts** (`SETTINGS.gore.guts = 3`, `effects/Dismember.js` `rope()` and `bits()`): every gut rope comes with two more beside it (varied length, some spilling the other way) and every loose gut/organ piece brings two more; the live-rope cap scales with it. Tests pass; **not yet seen in the browser** (the check was stopped when the work moved back to local). Look at a waist cut, a split and an explode kill, and watch the frame rate in a big fight. Turn it down in `src/config/settings.js` if it's too much or too slow.
- Everything from this cloud session is on `main`: platforming + THE GALLOWS ASCENT, progression + Rurik's tree, higher jumps, enemy jump/drop poses, the D-pad freed (Down / H = Whirlwind Cleave), the skill-tree exit fix.
- **Not on itch.** To upload: pull `main`, run `tools/build-release.ps1`, upload `release/blood-axe-web.zip`.
- Art waiting to be painted: `docs/gallows-art-needed.md`, `docs/enemy-jump-art-prompts.md`.

## Cloud, 2026-10-04: THE CAMPAIGN, stage 1 — THE BURNING VILLAGE (graybox; branch claude/project-thread-l70xhx, not on main, not on itch)
- Nick's campaign brief is planned in `docs/campaign/plan.md` (six levels, the king's arc, the final battle, Rurik's judgment) with the build checklist in `docs/campaign/checklist.md`.
- Title menu: **CAMPAIGN: THE BURNING VILLAGE** (solo). Level 1 in six sections: the Ashen Road, the Market Square, the Burning Roofs, the Mill Yard (Brother Cinder, the rear guard), the Longhall (Varek, the Ash Captain), the North Gate (the vow). Data: `src/data/stageVillage.js`.
- New systems: story beats and villagers with rescue states (`src/stage/Story.js`: defend / wreckage / reach), fights that wait for you (`fightAt`), a level exit after the last words (`exit`), falling burning beams (hazard `beam`, `when: 'rage'` for the longhall), burning carts (fire `look: 'cart'`), the wreckage prop, the dialogue box (HUD), the other two Oath Keepers drawn at the opening and the gate (`src/view/NpcView.js`), the castle on the horizon (`src/view/castle.js`), the first king cutaway (`src/scenes/CutawayScene.js`), and the campaign save (`Progress.campaign`: levels done, villagers saved).
- The ruler is **King Vaurath, the Ashen Crown** (working name from the final-boss mock-up prompts); Malgor is his champion and stands at the throne in the cutaway. Vaurath is a code-drawn stand-in until his art exists.
- Story lines are timed in game frames and all rescue logic is sim-side, so online co-op should stay in step, but the campaign is only on the solo menu entry for now and has not been tried online.
- Checked: logic tests (every hero walks the level with no upgrades and no falls; story order; skipping; all three rescues; beams; saving) and headless-browser screenshots of every section and the cutaway. Not played through by a person.

### Art requests for THE BURNING VILLAGE (all temporary art now; same rules as before: magenta background, facing right, no text)
1. `village_backdrop_far.png` — parallax: a river valley at night under smoke, the rest of the village burning across it, hills, and on the far right horizon a small black castle against a pale moon (the Black Keep). 2508x627 like `plx_far`.
2. `village_houses.png` — the street's back wall, tiling: timber-and-plaster houses, some burning, some burnt out, doors and windows lit from inside. 2172x724.
3. `village_barn.png`, `village_longhall.png`, `village_gate.png` — the three set-piece fronts (barn with big doors; the longhall with carved dragon gables, roof on fire; the north gate palisade with the gate open).
4. `village_roof_tiles.png` — top-down-ish shingle texture for walkable roofs, and `village_boards.png` for the charred boards (ember cracks).
5. `npc_villager_strip.png` — a peasant (no weapon) in 8 poses: stand, cower, wave for help, run (3), sit wounded, kneel. Then a woman with a child, and a boy. Muted homespun colours.
6. `prop_wreckage.png` — a fallen burning beam across a door (+ broken state), and `prop_cart_burning.png`.
7. `king_vaurath_*` — per `final-boss-mockups/final-boss-chatgpt-prompts.md`; the cutaway uses his throne pose once it exists.

## Cloud, 2026-10-04: THE CAMPAIGN, stage 2 — shared systems and GALLOWS WOOD (graybox; branch claude/project-thread-l70xhx, not on main, not on itch)
- After the village's tally, **Enter** goes on to level 2, **GALLOWS WOOD** (`src/data/stageWood.js`, backdrop `src/view/WoodView.js`). **CONTINUE** on the title starts the campaign at the last section reached (`Progress.campaign.at`). The stage list moved to `src/data/stages.js`.
- New rescue kinds in `src/stage/Story.js`: **cage** (hold INTERACT at the lock once the guards are dead), **execution** (kill the hangmen before the rope runs out, or he's lost), **escort** (he follows; enemies near him wear his nerve down). INTERACT is **E** / **D-pad up** (`padUp`; P2 on the keys: numpad 8). Prompts and meters are drawn over the villagers (`src/view/NpcView.js`).
- **Boss phases** (`boss.phases` in a section; `Stage.updateBossPhases`): the Houndmaster calls his pack at 2/3 and goes into a frenzy at 1/3. Bosses without phases rage at half health as before.
- **The ending framework** for Rurik's judgment (`src/stage/Sequence.js`): tested on a test stage; the real judgment comes with the Black Keep (stage 3).
- **Oryn's skill tree**: THE STORMCALLER (Forked Bolt, Static Charge, Thunderhead: `src/data/skills.js`, `src/combat/Storm.js`); his other two branches show as PLANNED.
- The second king cutaway ('convoy': irritation, he cracks the throne) in `src/scenes/CutawayScene.js`.
- Checked: logic tests (all pass) and headless-browser screenshots. Not played through by a person; not tried online.

### Art requests for GALLOWS WOOD (temporary art now; same rules: magenta background, facing right, no text)
1. `wood_backdrop_far.png` — parallax: wet black pines in mist under a pale moon, a ridge, the Black Keep's silhouette over it (bigger than from the village). 2508x627 like `plx_far`.
2. `wood_trunks.png` — the road's back wall, tiling: tall black pine trunks, ferns, a lantern post. 2172x724.
3. `wood_hanging_tree.png` — a dead oak with a long bough over the road and a rope (empty: the villager is drawn separately).
4. `prop_cage_cart.png` — a broken prisoner cart with an iron cage on it: shut (with a padlock), and open (door swung).
5. `wood_stream.png` — a fast black stream seen from above at an angle; `wood_log.png` a fallen pine to walk across; `wood_stones.png` stepping stones.
6. `wood_rockslide.png` — boulders heaped across a mountain pass.
7. `npc_villager_strip.png` additions: hands bound on the rope (standing, then hanging), cowering in a cage, limping with a crutch, kneeling to pick a lock is the hero's (no new hero art needed).
8. `boss_houndmaster_*` — a kennel master (Stalker build) with a whip and a horn; and `enemy_hound_*` (the pack), for stage 3.


## Cloud, 2026-10-04 (night): polish pass on levels 1 and 2 (branch claude/project-thread-l70xhx, not on main, not on itch)
- Nick asked to polish the first two levels before the rest: painted art, a little longer, more set pieces and fights. Stage 3 waits.
- **Art**: the prompts for every picture are in `docs/campaign/art-levels-1-2.md` (also in project files `campaign/art/`). Save each at the path in its heading; it shows up in the game with no code change (`src/data/levelArt.js`, `src/view/levelArt.js`). Wired since 5 October 2026: villager, mother, boy and elder sheets, hound and Crusher strips (`SPRITE_SHEETS` in `src/data/levelArt.js`; tested with stand-in sheets). The Houndmaster needs none (he is a stalker). Not yet wired: the captive sheet (item 16), the cage-cart picture.
- **Burning Village**: new section THE BURNING STABLES (the stampede), an ambush on the roofs. 9400 wide.
- **Gallows Wood**: new section THE CONVOY (the rolling prisoner wagon), war hounds with the Houndmaster. 9200 wide.
- The other two heroes now slip away up a lane at the start and stay hidden until the meeting place.
- Fixed Nick's playtest softlock in the mill yard (an enemy spawned inside the roof behind).

## Cloud, 2026-10-04 (night): level 3, HOLLOW MOUNTAIN (branch claude/project-thread-l70xhx, not on main, not on itch)
- Nick asked to keep building level 3 alongside the polish. It's in, with code art: `src/data/stageMine.js`, `src/view/MineView.js`, `src/view/CrusherView.js`. Gallows Wood now leads into it.
- New systems: terrain blocks with a `tag` that a prop's `opens` removes (`Stage.openWay`: the portcullis and the fallen rock), the collapse chase (hazard `collapse`), rock-falls (beam hazards with `look: 'rock'`), war machines (`machine: true`: never flinch), fire grates can now wait on a boss phase (`when`).
- The third king cutaway ('collapse': frustration, the war map hurled).
- Art prompts: items 18-25 in `docs/campaign/art-levels-1-2.md` (the mine and the Ore Crusher). Crusher strips are wired (5 October 2026).
- Checked: logic tests (every hero walks it, the gate, the collapse, both bosses) and headless screenshots. Not played by a person.

## Cloud, 2026-10-05: level 4, THE SHATTERED ASCENT (branch claude/campaign-level-4-guc3fp, off the campaign branch; not on main, not on itch)
- Built in its own thread while the campaign thread paints art; to be merged into `claude/project-thread-l70xhx`. Code art: `src/data/stageAscent.js`, `src/view/AscentView.js`. Hollow Mountain now leads into it; it names THE IRON GATES as next (not built).
- New systems: the bombardment (hazard `bombard`: volleys aimed at the heroes, landing spots shown first, no stone within 170 px of a drop; `silence: '<tag>'` thins it per smashed prop; `when` works as for beams), the catapult prop, `section.needs` (the fight isn't won until every prop with that tag is broken) and the story key `broken:<tag>`.
- The fourth king cutaway ('retreat': unease; horns, the captain burned to ash).
- Art prompts: items 32-38 in `docs/campaign/art-levels-1-2.md` (the ascent's backdrop, four set pieces, the catapult). Orsk wears the Berserker's strips. Screens: project files `campaign/shattered-ascent/`.
- Checked: logic tests (every hero walks it, the bombardment, the shelter, Orsk) and headless screenshots. Not played by a person.

## Paused, 2026-10-05 00:55 UTC (Nick out of usage until it refreshes)
- Campaign branch `claude/project-thread-l70xhx` is pushed (latest: heads on pikes in the village); it's PR #12 into main, open, waiting on Nick's OK to merge.
- **Art**: painting in ChatGPT on Nick's PC finished everything level 1 can use: backdrop (items 1-5), the five set pieces (well, barn, stables, longhall, gate), both props (wreckage, cart; whole and broken) and the stampede horse. All only on the PC in `assets/env/village/` and `assets/fx/`, uncommitted (no GitHub login there). Not yet: pikes picture, villagers. Next: Gallows Wood, then Hollow Mountain.
- **Code needed for art (cloud)**: terrain blocks (the roofs and beams you jump on: tan striped boxes, `view/TerrainView.js`) have no painted-art slot; villager, hound, Houndmaster and Crusher views have no sprite-strip loaders yet. The PC copy of `art-levels-1-2.md` predates the pikes item; pull the branch first. Mute any test load (`?mute=1`).
- **itch**: a campaign build is zipped on the PC (`release\blood-axe-web.zip`); the upload was blocked by the PC's safety check and waits on Nick (upload it himself at itch.io/game/edit/5082289, or approve it on the PC). itch still runs 19540958.
- **Play link**: publishing the web build as a private claude.ai page was blocked pending Nick's yes.
- **Code next**: level 4, Shattered Ascent (the Siege Commander); wire villager, hound, Houndmaster and Crusher strips once their art exists; the king's art is in Nick's ChatGPT folder "Ashen King".

## Cloud, 2026-10-05: hack-and-slash pillars (branch claude/combat-pillars-2znjh7, off the campaign branch)

Code only, not on itch. Logic tests cover all of it.

- **Air juggles** (`src/combat/Juggle.js`): Rurik's J, J, K is the RISING CLEAVE launcher
  (`moves.launcher`, borrows light2's poses until a strip exists). Any hero's hit on a flying
  enemy keeps him up; air attacks chain three a jump while they connect, the third spikes him
  and he bounces once. Bosses and the Crusher are never juggled.
- **Combo counter and style rank** (`src/combat/Style.js`, HUD `src/view/StyleMeter.js`):
  D to SSS, right side of the HUD. The rank multiplies the blood each kill pays.
- **Riposte** (`CombatSystem.js`, `RIPOSTE`): the first melee hit after a parry on that man is
  a sure critical, x1.6 more, long freeze, "RIPOSTE!" call-out.
- **Boss loot: trophies** (`src/data/trophies.js`, saved in `Progress.trophies`): every boss
  drops his own legendary the first time; men with 130+ health drop a common/rare 12% of the
  time. Three worn slots; O / RT on the skill screen opens the TROPHIES page (wear / take off).
  The dropped reliquary is a code-drawn stand-in: prompts 32-33 in
  `/mnt/project-files/campaign/art/art-levels-1-2.md` (icons are not wired in yet).
- **Hordes**: a new fodder enemy, the Ashen Thrall (`ENEMIES.thrall`, 30 health, wears the
  grunt's strips via `strips: 'grunt'`). One horde wave of 10-11 per campaign level (Market
  Square, the Convoy, the Workings), announced "THE HORDE".
