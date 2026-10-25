# READ FIRST: where the latest build lives (25 October 2026)

Nick also edits the game with ChatGPT. Those edits live only in his PC folder
`Documents\Codex\Blood Axe Builds` (the one labelled "latest") and are never saved
to git. So cloud work must start from what the PC thread bundles into git (for
example `/mnt/project-files/blood-axe-chatgpt-oct25.bundle`), not from an older
branch, or ChatGPT's work gets lost.

- 25 October 2026: main moved from `9681a37` to `dc564a9` with ChatGPT's Oct 24-25
  work (impale repair, Irvolino waits then escapes slower, street clutter), the
  signpost moved off the church door, head pikes at 0.6 size, and the mill-rescue
  test update. The Red-Blood palette (`claude/redblood-palette`) was dropped at
  Nick's request and is not on main. Not uploaded to itch.
- 25 October 2026: HUD cleanup. In play only the health, stamina and magic bars
  show (plus dialogue, hangman clock, barn tally, boss/enemy bars, combo meter);
  location, objective, level, kills, secrets and gore moved to the pause screen
  (`HUDScene.pauseInfo`, `view/PauseMenu.js`). The bottom controls line is gone.
  Not uploaded to itch.
- 25 October 2026 (cloud, on main, not on itch):
  props are solid and sit in the picture. Crates, barrels, chests, urns and bells
  block you until broken (a man flung or charging into one smashes it), and so do
  the village's signposts, lanterns, debris heaps and head pikes (`Stage.solidAt`).
  The shared props take each level's light, with soft contact shadows and grit
  under every prop and painted block (`src/view/propGround.js`).

- 25 October 2026 (branch `claude/project-thread-gzwx2v`, not on main until Nick says
  push): severed pieces bounce better. Heads, gibs and doll bits are rigid bodies on the
  floor (`effects/Physics.js stepRigid`: bounce lower each time, skid, tip onto a side and
  rest at a natural angle); jointed halves (`FleshChain` with `skid`) bounce off a hard
  landing and skid instead of stopping dead, with a thud and a short smear. F8 test scene
  "Severed pieces: bounce & settle" cuts men down six ways in turn.

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

## PC, 2026-10-08: fall and gore sounds (not on itch)
- Nick's clips, copied from Downloads into `assets/audio/sfx/` and listed in `SFX` in `src/core/Sfx.js`:
  - Cliff or pit drop: `fall-scream-1..3`, one at random, never the same twice running. Water pits (theme `wood` and `mine`) play `playSplash` instead: `water-splash`, then `water-air` under it at 0.35 s, then `water-bubble` at 2.3 s, layered at runtime as one sound.
  - Cut in half (`halfH`, `halfV`, the halve finisher's `sever`, the chain finisher's `chainCut`): `blood-splatter`.
  - Head off (`decap`): `head-off` or `limb-off` at random. Arm off (`maim`) and `limbs` fatality: `limb-off`.
  - Impale finisher, booted off the blade (`kick` beat): `blade-out`.
  - A severed piece hitting the floor (`SpriteCut` and `Dismember` landings): `gore-land` via `landThud`, at most one every 110 ms so a man blown apart gives a few thuds.
- Sim: `Stage.updateFalls` emits `pitDrop` once per fall as a living fighter sinks 20 px below the floor over a pit (`f.pitDropping`, reset when he is back at floor height). Views only, no rolls, so online play stays in step. `TerrainView` plays the sounds.
- Checked in the browser by dropping heroes and enemies into a Gallows pit and a Gallows Wood stream and forcing each kill type. Logic tests pass (browser runner).

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
- **Art**: the prompts for every picture are in `docs/campaign/art-levels-1-2.md` (also in project files `campaign/art/`). Save each at the path in its heading; it shows up in the game with no code change (`src/data/levelArt.js`, `src/view/levelArt.js`). Wired since 5 October 2026: villager, mother, boy and elder sheets, hound and Crusher strips (`SPRITE_SHEETS` in `src/data/levelArt.js`; tested with stand-in sheets). The Houndmaster needs none (he is a stalker). Captive sheet (item 16) wired 5 October 2026. Not yet wired: the cage-cart picture.
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

## Cloud, 2026-10-05: level 5, THE IRON GATES (branch claude/campaign-level-5-u65mi8, off the campaign branch; not on main, not on itch)
- Built in its own thread while the campaign thread paints art; to be merged into `claude/project-thread-l70xhx`. Code art: `src/data/stageGates.js`, `src/view/GatesView.js`. The ascent now leads into it; it names THE BLACK KEEP as next (not built).
- Route: the killing ground (thralls the King shut outside, as a horde), the gatehouse (pitch grates, the stair, the rotten floor), the winch room (THE GATE TWINS, Hask and Hrolf; break both winch chains and the gate rises), the gate yard (the counter-attack; the people saved earlier come back), the lower town (the King burning his own people: defend the townsfolk, free the granary), MALGOR, THE IRON MARSHAL (archers on the wall at two thirds, rage at one third), the Keep road.
- New systems: `boss.twin` (two bosses; when one dies the other takes the HUD bar and fights harder, `boss.grief`; story key `twin:<section>`), props with the same `tag` and `opens` (the way opens only when all are broken), hazards with `if` / `unless` (story conditions), `bombard.friendly` (the rescued's slings: only hit the Ashen, never a boss), villagers with `if` (who stands at the Keep road depends on who was saved in levels 1-4), the `winch` prop.
- The fifth king cutaway ('fear': Malgor's helm rolled to the dais, the fire in his hand gutters out, he orders the prison wing burned).
- Art prompts: items 41-47 in `docs/campaign/art-levels-1-2.md`. The twins wear the Gladiator's strips, Malgor his own. Screens: project files `campaign/iron-gates/`.
- Checked: logic tests (every hero walks it, the twins and the gate, the returning slings, Malgor's phases), the sweep bot from every checkpoint with every hero, headless screenshots. Not played by a person.

## Paused, 2026-10-05 00:55 UTC (Nick out of usage until it refreshes)
- Campaign branch `claude/project-thread-l70xhx` is pushed (latest: heads on pikes in the village); it's PR #12 into main, open, waiting on Nick's OK to merge.
- **Art (committed from the PC, 2026-10-05 03:20 UTC)**: everything `levelArt.js` had a slot for before the `surfaces` commit is painted and pushed: items 1-7 and 9 (village backdrop, well, barn, stables, longhall, gate, wreckage, cart, horse gallop), 10-15 for the wood (backdrop, hanging tree, kennels, rockslide, convoy wagon, cage cart) and 18-24 for the mine (backdrop, furnace, shackle, counterweight, rubble). Checked loading in the game (muted). Cut-out pictures had the magenta unmixed into real alpha on the PC (smoke was coming out purple), so they're RGBA PNGs. ChatGPT chats: "BA · Level 1 · Burning Village", "BA · Level 2 · Gallows Wood", "BA · Level 3 · Hollow Mountain".
- **Surface tiles (items 26-31) painted and committed too** (2026-10-05 ~03:50 UTC): all 11 `surf_*.png`, opaque; checked loading in the village (the beams show painted wood).
- **Figures and pikes painted too** (2026-10-05 ~05:15 UTC, ChatGPT chat "BA · Campaign · Figures"): `pikes.png`, villager (8), mother (6), boy (6), elder (4), hound walk/atk1/react/doom and crusher walk/atk1/heavy/doom, at the frame counts in `SPRITE_SHEETS`. ChatGPT spaced figures unevenly, so each strip was re-packed on the PC into equal cells, one figure centred per cell, on black. All 12 `spr-*` textures build at boot (checked, muted). The hound's react poses are drawn rearing and larger than its run; the tallest-pose scaling may make it look smaller in those frames. Not watched in a fight.
- **Art not done yet**: stream/log/stones (item 15, no slot), captive sheet (item 16, not wired). Mute any test load (`?mute=1`).
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
  The dropped reliquary is a code-drawn stand-in: prompts 39-40 in
  `/mnt/project-files/campaign/art/art-levels-1-2.md` (icons are not wired in yet).
- **Hordes**: a new fodder enemy, the Ashen Thrall (`ENEMIES.thrall`, 30 health, wears the
  grunt's strips via `strips: 'grunt'`). One horde wave of 10-11 per campaign level (Market
  Square, the Convoy, the Workings), announced "THE HORDE".

## Cloud, 2026-10-05: animation smoothing (branch claude/animation-smoothing-6anlb4, not on itch)
View-only, no sim or input timing changed: eased key-pose timing, squash and stretch on
jumps, landings and hits, lean blended across state changes (src/view/animFeel.js).
Painting notes for strips (key poses, frame counts): docs/animation-poses.md. Before/after
GIFs: project files, animation/.

## FOR THE PC, next time Nick wakes it (written 2026-10-05 13:55 UTC)
Since the PC went offline the cloud merged into `claude/project-thread-l70xhx` (now 5444d91):
level 4 THE SHATTERED ASCENT, the combat round (juggles, style rank, trophies, thralls), the
animation pass, the playtest soft-lock fixes, the captive slot and level 5 THE IRON GATES (art
items 41-47). The 5 October push from the PC never reached GitHub; the PC holds 3 unpushed art commits on the
same branch (villagers, hounds, Crusher, pikes). On Nick's next message, in one go:
1. `git pull --no-rebase origin claude/project-thread-l70xhx` (a merge, keep both sides;
   on a conflict in docs keep both sections).
2. `git push origin claude/project-thread-l70xhx`: the GitHub sign-in window opens and Nick
   only clicks Sign in.
3. Build with `tools/build-release.ps1` and upload to itch like build 19540958 (Nick approves
   the prompt). Test the build muted (`?mute=1`) and close the tabs after.
4. Then the painting queue in `/mnt/project-files/campaign/art/art-levels-1-2.md` (the shared
   copy is newer than the repo's: Gallows Wood 10-17, Hollow Mountain 18-24, the ascent
   32-38, trophies 39-40). Pose rules: `docs/animation-poses.md`.

## PC, 2026-10-08: King Vaurath concept art
- Approved design: `docs/art-refs/finalboss_concept_face.png` (Nick said "thats it"): long pale hair, ember-orange eyes, ember cracks down the cheeks, spiked gold crown, black-and-gold plate with ember seams, fur collar, black and crimson cape, black greatsword with an ember edge, ember fire in the free hand. The closed-helm first try is `finalboss_concept.png`. Chat: "BA · Boss · Ashen King" (6ac2b5ed-1d2c-83ea-bc85-d7474d6caa6f).
- These are design sheets, not game art. **Cloud, 2026-10-08:** the cutaways now show him from the face sheet: its side view, cut out to `assets/enemies/king_vaurath_stand.png` (transparent PNG, facing right, flipped in the scene), standing before a bigger code-drawn throne (`KING_ART` in `src/scenes/CutawayScene.js` holds his size and the eye/hand points). Checked in a headless browser on the first cutaway only. A painted throne pose can still replace it later.
## Local, 2026-10-08: Rurik's floor strike, controller remap, title menu (not on itch yet)

- **Leap Smash / Skyfall cooldown**: `kit.plunge.cooldown` 90 frames (1.5 s) from each
  smash (`f.cool.plunge`, `plungeReady` in `combat/Skills.js`). Skyfall's own bounce may
  still smash once more; nothing else can until it cools. The Skyfall bounce also no
  longer re-arms on the crater it lands in (`Fighter.js`), which was an endless pogo.
- **Leap Smash animation**: a 7-frame hang with the blade raised (cleave poses 1-3), wind
  streaks and a trail on the drop, the chop just before the floor, the blade buried for
  `PLUNGE_LAND` frames then wrenched out (`plungeWrench` event). Impact: flash at the
  point, a radial crack, stone and dust (`ArenaScene` `leapSmash`). Code and tweens only,
  no new strips; a dedicated "sword into the ground" strip would still look better.
- **Gamepad**: RT = block / parry, RB = Sparta kick (they swapped). README, itch controls
  doc and the skill screen footer updated.
- **Title menu**: the campaign is the big featured button (CONTINUE, or BEGIN), then NEW
  CAMPAIGN, 2 PLAYERS (campaign co-op from the same checkpoint) and DIRECTOR'S CUT. The
  Director's Cut holds the Oath Road (1 or 2 players), online co-op, the Gallows Ascent
  and RESET HERO LEVEL (press twice: `Progress.resetLevel` clears blood, every hero's
  picks and the point milestones; keeps the campaign place, villagers and trophies).
- No Node on this PC: `tests/browser.html` runs the logic tests in the browser (with
  `tests/node-fs-shim.js`). All pass.

## PC, 2026-10-08: painted oath shrine
- The kneel-shrine (`rest.kind: 'oath'`, all five campaign levels) is now painted: `assets/env/shrine_oath.png` (500×512 on magenta, cut out at load with `keyLayer`), drawn 170 px tall by `drawRests` in `src/view/TerrainView.js`; the code-drawn stone stays as the fallback. Kept PNG in `tools/build-release.ps1` (JPEG would smear the magenta). Chat "Paint Oath Shrine Prop" (6ac8090f-b6f8-83ea-8290-4b95d56efe8c). The Gallows blood altars are still code-drawn.

## PC, 2026-10-08: painted water, cage, lantern, Black Keep; bigger captives; boss entrances freeze everyone
- New art (chat "Paint Stream Texture", 6ac80b1b-266c-83ea-b386-b64b95a10f5b): `assets/env/water.png` (1024 seamless tile, the wood/mine streams, `drawPits`, scrolling toward the camera), `assets/env/cage.png` (shut | broken open, on magenta; `paintedCage()` in `src/view/NpcView.js` draws it over the prisoners), `assets/env/lantern.png` (post with a cold green lantern, on magenta; `drawLanterns`, not in the village, which keeps its torches), `assets/env/keep_hall.png` (the Black Keep throne room behind the cutaways; the code-drawn room stays as the fallback). cage/lantern are kept PNG in `tools/build-release.ps1`.
- `captive` sheet `height` 150 → 250 (`src/data/levelArt.js`): its tallest pose is the hanging one with the rope, so standing captives came out far smaller than villagers.
- Boss entrance (`Stage.spawnBoss`): with `freeze` on, every other enemy is frozen (`awe`) as long as the heroes are. Boss entry `size` (`makeBoss` → `stats.size`, drawn bigger by SpriteEnemyView, looks only): Brother Cinder 1.3. Cut-in-half splatter at 75% (`TRIM` in `src/core/Sfx.js`).
- Bridges and edges (same day): painted faces (`surface()` tiles) and the painted streams are cut with a worn, chipped geometry mask (`raggedRect` in `src/view/TerrainView.js`) and the ruled rim lines are wobbly (`raggedLine`), so ledges no longer read as ruled rectangles. Log bridges over water get the painted fallen tree `assets/env/bridge_log.png` along their front (`LOG_FIT`); the Shattered Ascent's half-gone bridge uses `assets/env/ascent/surf_plank.png`. Both cut from chat "Paint Bridge Props" (6ac80f07-4060-83e8-bc2e-c0a761b22cdb), raw in `assets/incoming/bridges_raw.png`.
- Fallen villagers (`bodies` in a level's data) are painted: `assets/env/bodies.png` (3 poses, transparent, cut by `cutPieces` in `src/view/envArt.js`, drawn `BODY_W` long by `drawBodies`). The mine's boulder wall (`mat: 'rubble'`) is `assets/env/mine/rubble_wall.png` (magenta, `drawRubble`). Chat "Paint Villager Prop Sheet" (6ac810f2-43f0-83e9-b5ff-a1b31e2a86ed).
- Fixed: the skill tree screen never closed on the second shrine visit (`SkillScene.closing` was never reset; the scene is reused). Skill tree rebalanced: skills cost 2/4/6 by tier (a tree is 36), `levelStep` 300, `startPoints` 2.

## Cloud, 2026-10-09: the cage stays put when its prisoners run
- Fixed: opening a cage (Gallows Wood's tanner's boys and Old Wenna) made the cage run off to the flee point while the prisoners vanished. `drawCaptive` (`src/view/NpcView.js`) drew the cage at the NPC's live `x/z`; it now anchors the cage at `n.home` and draws the prisoners themselves (three for a `group`) standing by the door, running to `flee`, then waiting at `gather`.

## Cloud, 2026-10-09: enemies no longer vanish on screen (not on itch)
- Nick: "bad guys sometimes come in from the left it seems and dissapear". A man walking on stays `entering` until he's within 400 px of a hero (`ENTER.onScreen`), but half a screen is 480, so he can be in view and still entering. Stuck there 3 s (usually behind a stream or ledge the heroes just crossed, so on the left), `Stage.updateLatecomers` teleported him to the other side, and a second time deleted him: he vanished in plain sight.
- Now a stuck latecomer that any hero's screen can show (`inView` in `src/entities/Enemy.js`) simply arrives where he stands (`entering` off, held inside the bounds) and fights as normal. Only men out of sight are brought round or let go. Logic test added. Sim change: both online players need the new build.

## Cloud, 2026-10-10: the Mage's staff blows refill his mana (not on itch)
- Nick: "when the mage hits with his melee he earns mana ... the amount of damage he inflicts with the hit in mana". New stat `manaOnMelee` (`src/data/characters.js`, Mage: 1): on a clean melee hit, `CombatSystem.resolve` gives the attacker mana equal to the health the blow took (so no overkill on a kill), capped at `maxMana`. Spells, blocked hits and parried swings give nothing. Logic test added. Sim change: both online players need the new build.

## Cloud, 2026-10-10: story lines moved to a bottom subtitle strip (not on itch)
- Nick: the conversation lines sat in the middle of the screen over the fight. `HUDScene.makeDialogue` now draws them as a full-width strip along the bottom edge (`DIALOGUE_H` 46 px): the speaker's name in his colour (`SPEAKER`), the line beside it, "SPACE / J — next" bottom-right on held scenes. It sits over the bottom letterbox bar in held scenes.
- While a line is up, the enemy health strip and the co-op "waiting for your partner" text step up by the strip's height (`this.lift`), and the controls hint at the bottom is hidden. Checked in the browser with 2 players in the Burning Village. HUD only, no sim change.
- Same day, Nick's follow-up: a bobbing arrowhead in the speaker's colour now sits over whoever is talking (`src/view/SpeakerMarker.js`, which also holds the `SPEAKER` colours). It matches the line's `who` against heroes, enemies, the walking Oath Keepers and villagers by name word ('VAREK' finds 'Varek, the Ash Captain'); a voice nobody on screen owns (VOICE, MINER) gets none.
- Controller: D-pad right moves any story line on, D-pad left skips the whole conversation, in fights too (`Story.play`; keys N / X, player 2 on keys NUMPAD 9 / NUMPAD +). A and X still move held scenes on. The strip's bottom-right says so. Logic test added. Sim change: both online players need the new build.

## Cloud, 2026-10-10: the Burning Village's hop-over obstacles are painted (not on itch)
- Nick: the obstacles to jump at the start of level 1 "look so bad". They were terrain blocks drawn as plain timber boxes: a cart (x 470) that read as a crate, a beam across the road (x 780) that read as a standing post, and the cart against the first house (x 2900).
- Terrain blocks take an optional `look` (`src/data/stageVillage.js`): `'cart'` draws the painted hay cart (`prop_cart.png`, whole half; two, back to back, on a deep block), `'wreckage'` a low line of charred timbers and rubble heaped right across the road (`prop_wreckage.png`, burnt-out half, smoke cropped). `drawPaintedBlock` in `src/view/TerrainView.js`; collision unchanged, the art is a little wider than the block. No new art needed; a block keeps its old drawing if the picture is missing. Screenshots in project files `campaign/burning-village/obstacles/`.
- Same day, Nick: "the falling stuff on level one ... i cant tell what are why its happening". Those are the falling burning beams (hazard `beam`: the roofs at x 3160, the mill yard, the longhall in Varek's rage). They were a thin code-drawn bar hanging high up that vanished and reappeared on the ground. Now (`drawBeam`/`beamLog` in `src/view/StageView.js`, view only) the beam is a painted charred, iron-strapped log cut from `prop_wreckage.png` with a fire glow, hanging lower (175 px up) and shaking, and in the last fifth of the warning it visibly drops onto the ring, landing on the frame it strikes; the warning ring is red and pulses. The roofs' hint now says "Beams fall where the ground glows red; charred boards give way".
- Same day, Nick on the Burning Roofs: "you cannot tell the edges". In `drawVillageBlock` (`src/view/TerrainView.js`) every village block's edges now read through light and shade, not drawn lines (Nick doesn't want rim lines): a soft dark falloff behind the back edge, a warm firelight cast on the walkable top brightening toward the front lip, and the face under the lip falling into shadow. The village no longer draws the beige rim lines. The boy's high roof was drawn as a beam (narrow blocks were beams); now a narrow block is a beam only over a cellar. Charred boards rest on short burnt joist stubs instead of long stilts. Burning cellars (`drawPits`) are no longer flat black: they warm to red embers at the bottom and the glow breathes. View only.

## Cloud, 2026-10-10: the last missing level art is painted (not on itch)
- Painted in ChatGPT on Nick's PC (desktop app, thread "Paint Stream Texture" in the Bloody Axe project) from the prompts in project files `campaign/art/art-still-missing.md`, and committed as found: `assets/env/ascent/ground.png` and all eleven `assets/env/gates/*.png` (sky, far, mid, wall, ground, gatehouse, winch_room, town, inner_wall, keep_road, prop_winch). They plug in by file name through `src/data/levelArt.js`; no code changed. Not yet looked at in play: check the magenta cut-outs for fringe and the sizes in the Iron Gates.
- Every picture `levelArt.js` loads now exists. Still not loaded by the game (so not painted): the wood's stream/log/stones and the trophy icons.

## Cloud, 2026-10-10: level 2 music, again (not on itch)
- Nick: Gallows Wood's music still didn't start on arriving from level 1. Main (with the Oct 9 fix, `b537a4e`) was run headless: level 1 into level 2 and level 2 started directly both bring Wilderness up to full volume, so a build from before Oct 9 still has the old fault. Rebuild and upload to get the fix.
- Hardened anyway: `fade()` in `src/core/Music.js` now steps on the game's `step` event (every frame, whatever the scenes do) instead of a 16 ms timer that a busy level can starve, and starts from the volume last set rather than the audio thread's lagging reading.

## Cloud, 2026-10-10: TEST MODE for playtesting (not on itch)
- Nick: "a test mode in the game i can skip levels and have infinite health mana". `src/config/testMode.js`. On with `?test=1` on the game's address (e.g. `index.html?test=1`), or SHIFT+F9 in a fight (again to turn it off). Off in normal play and never online. A "TEST MODE" tag in the top-right corner shows while it's on.
- While on: heroes are topped up to full health, mana and stamina every tick, and can't be killed (`f.immortal` floors damage at 1 health in `CombatSystem.resolve` and `Stage.hurt`; pits still knock you back to the checkpoint). Keys in a fight: END next checkpoint (from the last, the next level), PAGE DOWN / PAGE UP next / previous level, in campaign order then the Oath Road and the Gallows Ascent (`levelOrder`). Bound in `ArenaScene.setupTestKeys`.
- Skill points and the campaign save still count in test mode. Logic test added; checked headless in the browser (refill, END, PAGE UP/DOWN, SHIFT+F9 off). Local only, so no sim change for online.
## Cloud, 2026-10-10: art-direction pass, level 1 first (not on itch, NOT SEEN IN GAME)
- Nick asked for a lead-art-director pass (richer maps, cleaner edges, better water, readable combat, no gameplay changes). The standard is written down in `docs/art-direction.md`; ChatGPT prompts and an asset checklist in `docs/art-direction-prompts.md` (results go to `assets/incoming/`, never over live files).
- Code, all view-only: `src/view/atmosphere.js` lays per-theme depth washes over every level (`AIR`: haze over the far layers, a veil + contact shadow on the back wall, occlusion along the street's back edge) and gives every fighter a soft contact shadow (`softShadow`, in place of the flat ellipse). Burning cellars (`TerrainView.burningCellar`): smooth heat gradient, shadowed side walls, sparks, no ruled orange lip lines. Streams (`TerrainView.waterDepth`, wood and mine): deep channel, wet banks, moving foam. Enemy wind-ups (`src/view/dangerCue.js`): the telegraph tint is red instead of orange (orange is the fires' colour) and a red-white glint flashes over everything as a big wind-up starts.
- `tools/blender/pose_reference.py`: blocks an attack as mannequin silhouettes on magenta and saves the .blend, as a pose guide for a ChatGPT strip. Run here with the `bpy` module (renders fine); not run in Nick's Blender.
- **Not checked on screen**: the headless browser in the cloud hung loading the arena this session (before and after the change), so no screenshots were taken. Logic tests pass and every changed module imports. Check in a local build: the haze strength per level (`AIR` numbers), the cellars, the streams in Gallows Wood, the glint on a heavy swing. To back any piece out, set its `AIR` entry to 0 or revert the commit.

## Cloud, 2026-10-11: Rurik, the People's King (not on itch)
- Nick: Rurik's tree and its presentation needed work; his flame power upgraded in the tree, "much more powerful", enemies blow up; his sword needs lore and weight; he should feel like "the true king of the people".
- **His sword is OATHKEEPER, the Hearthfire Blade** (`src/data/oathkeeper.js`): forged from iron every house in the valley gave, quenched in every hearth; it goes to the one the valley chooses. Read on the skill screen's new third page (O / RB: SKILLS → TROPHIES → HIS BLADE), with the painted sword: Nick's pick from the ChatGPT mock-ups (sheet `docs/art-refs/oathkeeper_mockups.png`, crop `oathkeeper_ref.png`, cut-out `assets/ui/oathkeeper.png`, loaded as `oathkeeper-art`; the old code drawing is only a fallback). Select screen: new description, "BLADE: OATHKEEPER". `CHARACTERS.warrior.title` = THE PEOPLE'S KING, `blade` = 'Oathkeeper'.
- **Weight (view only)**: his smears use Oathkeeper's palette (wider dark mass, old gold, gold, white-gold light, white edge, `OATH_LAYERS` in `src/view/Smear.js`); every sword hit knocks white-gold sparks out with a low thud; big cuts (overhand, cleave, thrust, whirlwind) also dip the camera and ring gold (`ArenaScene.oathkeeperBite`). Frame data untouched.
- **Fourth branch, THE KING'S WRATH** (`src/data/skills.js`, logic `src/combat/Wrath.js` + `kingcast`/`kingsfire` states in `src/combat/Skills.js`, look `src/effects/WrathFX.js`): Oathkeeper Wakes (Hearthfire Bolt: bigger, faster, pierces, 34 dmg, 20 mana, 60 max mana, regen 2.5, kills explode), Kingsfire (HOLD U / LB 12 frames: sword into the floor, six fire pillars march out, 44 each, kills explode; 40 mana; a sword kill gives 5 mana), The King's Wrath (50 mana: roar, untouchable, a ring of fire, the road both ways, nine pillars; each man the fire kills blasts the men around him, three deep). Fire never forces a boss to blow apart (`CombatSystem`). A tree is now 48 points. Sim change: both online players need the new build.
- **Skill screen redrawn** for every hero (`src/scenes/SkillScene.js`): the hero's portrait looming behind, each branch a hanging banner, skills as riveted plates with a gem whose shape says the kind, chain between tiers that lights when taken, tier numerals, a reading panel at the foot, drifting embers, a flare when a skill is taken. Handles 3 or 4 branches.
- **Art still needed (Nick's PC)**: `docs/rurik-art-prompts.md` (copy in project files `rurik/`): (the Oathkeeper design is approved and saved) a People's King portrait, repainting all `ulric_*` strips with the new sword (same names and sizes, no code change), and a new `ulric_wrath.png` (Kingsfire borrows the cleave poses until then).
- Logic tests: 5 new (bolt, Kingsfire tap/hold/mana, sword-kill mana, the Wrath's ring and chain blast); all pass. Checked in a headless browser with before/after shots in project files `rurik/`. Not played by a person.

## Cloud, 2026-10-11: TEST MODE switch in the Director's Cut (not on itch)
- Nick couldn't find test mode in itch upload 19680474. It was in that build, but on itch the game runs in a frame, so `?test=1` on the page address never reaches it, and SHIFT+F9 only works in a fight (and needs Fn on many laptops).
- The title screen's DIRECTOR'S CUT now has a TEST MODE: ON / OFF button (`TitleScene.toggleTest`). The choice is remembered on that computer (`localStorage` key `bloodAxe.testMode`, `src/config/testMode.js`), so it stays on across levels and reloads until switched off. `?test=1` and SHIFT+F9 still work. Checked in the browser: toggle, tag, remembered after a reload, hero can't die in the Arena.

## Cloud, 2026-10-11: boss entrances freeze the whole field (not on itch)
- Nick: while a boss walked in and the hero stood frozen, other enemies still hit him. The bosses' escorts (Malgor, Orsk, the Houndmaster's hounds, the Ore Crusher's grunt) were spawned after the freeze was handed out, so they walked in and attacked; knives and arrows in flight, traps and mines also kept going.
- Now `World.holdStill(frames, keep)` (called from `Stage.spawnBoss` for every boss whose entrance doesn't say `freeze: false`) holds every fighter but the boss (and his twin), projectiles, walls, mines, quakes, storms and hit checks until he has arrived; anyone spawned meanwhile is held too. The stage's traps and its stuck-latecomer check wait as well. Dying clears it. Test: "boss: while he walks in, the whole field freezes". Not checked on screen.

## Cloud, 2026-10-11: Rurik's SHOULDER SMASH (not on itch)
- Nick: "give rurik when his sprinting a shoulder smash fully flesh it out and have it animated and put in the game".
- **Sprint (C / left-stick click) + J / X** on the ground: `moves.shoulder` in `src/data/characters.js`, state `shoulder` (`makeAttackState`), started in `tryActions` only from a sprinting walk (`src/entities/fighterStates.js`). 6 startup, 16 active, 20 recovery; 14 stamina; 16 damage; lunges at 480 through the whole run and hits each man in his path once (`pierce`); throws them (860, 380) knocked down and bowling into whoever is behind; breaks guards; smashes props (bowl moves already do); super armour through the run (`ATTACK_STATES` in `CombatSystem`). A slash, cleave, roll or block can come out of the skid (frames 30-42).
- **Look**: no painted strip yet, so it uses his sprint poses for the run (two frames each) and the kick's planted pose for the skid (`ANIM_OVERRIDES.ulric.shoulder` in `src/data/spriteStrips.js`), with a lean, a sink and an impact jolt laid over them in `SpriteFighterView`, plus dust off his boots. Each hit: a deep crunch and a plate clang, camera jolt and zoom punch on the first man, a gold ring, debris flying ahead, and a "SHOULDER SMASH!" / "RAN THROUGH N!" call-out (`ArenaScene.shoulderImpact`). The HUD hint and README list it.
- **Art (Nick's PC)**: prompt 5 in `docs/rurik-art-prompts.md` makes `ulric_shoulder.png` (6 poses); the cloud wires it once it exists.
- Logic test added (the line goes down, stamina, plain slash when not sprinting, guard break, armour). Sim change: online players both need the new build.

## Cloud, 2026-10-12: the impale finisher's victim hangs like a ragdoll (not on itch)
- Nick: in Rurik's back-stab lift "the feet dangling really bad", make the body "more like a ragdoll".
- View only (`src/view/ImpaledRig.js`), no sim change. Once his boots leave the floor his legs are a two-link pendulum (thigh on the hips, shin on the knee) under gravity, thrown about by how the blade moves him; knees only bend backwards. The legs are now the straight, together legs of his lying pose, cut at the knee and hung from the hips (the old code cut the wrong end of the lying pose, so it fell back on the striding hit-pose legs). Which end of the lying pose is the feet is measured (the thinner end). Torso and head also rock with the heave.
- Before/after: project files `rurik/impale-ragdoll-before-after.png`. Logic tests all pass.

## Cloud, 2026-10-12: the Sentence is timed to its own music (not on itch)
- Nick sent the track ("16. Cutscene Black Cell Yes", 22.3 s) for every boss execution: build through the kneel and the crimes, end on the slice. Now `assets/audio/sentence.mp3` (cover art stripped), key `sentence` in `MUSIC` (`src/core/Music.js`, gain 0.85), played once with the new `playCue` (the boss track fades out first with `stopMusic`); when it has played out the stage's track comes back.
- Its swell crests at 16.55 s (measured loudness: peak 15.96-16.65 s, then it falls away into a quiet tail). `Sentence.clock` counts frames on the track's timeline; the blade lands at `SENTENCE.slice` = 993 frames. When the hero stands at the boss's side, the lines share out the time left before the swing (in proportion to their length, at least 60 frames each, `Story` beats can now carry per-line `times`); the swing starts so its first active frame is the crest. The words run at up to 0.6x the story's reading time (`SENTENCE.pace`; a line is about 2-3 s); if that still doesn't fit, the track starts up to 2 s late (`SENTENCE.late`: a silence while he drops). A skipped line moves the clock on, and the arena seeks the music with it (`ArenaScene.syncSentenceMusic`, corrects drift over 0.15 s, stops at the blow so the fall plays out on its own). The slow motion when he's beaten is gone (it would have pulled the scene off the music); the blow's slow motion stays.
- Logic test added (all three heroes' blades land on the crest; watched through the music never jumps; skipped, it jumps and still lands on it). In the headless browser the track starts and follows the clock, but that browser runs the game at about a sixth of real speed, so the real-time sync is not checked by eye: play one boss locally. Sim change: both online players need the new build.

## Cloud, 2026-10-11: THE SENTENCE, every boss executed (not on itch)
- Nick: like Ned Stark, a beaten boss kneels, the hero proclaims his crimes and swings the blade himself, "retribution and revenge"; and the Oath Keepers swear it at the start of the story.
- `src/stage/Sentence.js` (run from `Stage.update`): every section boss is `spare` (health stops at 1). Beaten, the whole field holds still (`World.holdStill`, released with the new `World.release()`), projectiles drop, he kneels (new `kneel` fighter state), the hero who beat him walks to his side (`fighter.scripted`: the scene moves his legs, the pad's presses are dropped except to move the lines on), the charges, the boss's last words and the sentence play as a held story beat (skippable like any held scene), a silence, then the hero's own killing move, swung planted: Rurik's heavy cleave (decap), Vexa's light3 (decap), Oryn's staff light3 (headPop) (`sentence` in `src/data/characters.js`). On its first active frame the boss dies with that fatality through the normal kill path (gore cuts the painted sprite). Then his men break and run off the edge of the room (`EnemyBrain.routed`) and the section clears as before.
- Crimes per boss in each stage file (`boss.sentence: { speaker, crimes, last }`); the Ore Crusher has `sentence: false`. The twins: the first to fall dies fighting, the survivor kneels. The king's level will use `stage/Sequence.js` (the judgment); Sentence stands aside for a section a `sequence` ends.
- Story: the opening of Burning Village now has the pledge ("Each of them kneels, hears his crimes, and pays for them."), and the vow at the north gate a callback line.
- Arena (`ArenaScene.setupSentence`): camera closes in, a thud on the knees; the blow: a long hit-stop, slow motion, white-red flash, zoom punch, the heaviest shake and sounds, a neck fountain, RETRIBUTION; then HIS MEN BREAK AND RUN.
- Art (Nick's PC): `docs/kneel-art-prompts.md`, an optional 3-pose `<enemy>_kneel.png` per boss sheet. Until then his standing pose is sunk to the knee and cropped (`SpriteEnemyView`, and `SpriteCut` cuts him where he kneels).
- Logic tests: 6 new (the whole scene, every hero's blow, skipping, the twins, the machine, crimes for every boss); all pass. Checked in a headless browser for all three heroes. Sim change: both online players need the new build.

## Cloud, 2026-10-11: the Mine's chained prisoners (not on itch)
- Nick: the chained NPCs in the Mine "look so small, low quality"; he wants variety in their looks and all of them improved.
- They were the village's peasant sheet cut at 150 px, so a standing man came out about 71 px against the heroes' ~96, and every one was the same man. Now (`src/view/NpcView.js` `PRISONERS`, `drawChained`, `chain`) they use new cuts of the same paintings at the heroes' height (`SPRITE_SHEETS.miner` = villager.png at 205, `'miner-old'` = elder.png at 192; the captive sheet is already hero-sized), so they are bigger and keep more of the painted detail. Each prisoner has his own look: Old Tobin is the old man (kneeling / calling out), Hilde and Bram (the Ascent) the bound captive, the three chained miners a mix of sheets, each with his own tint (soot, torchlight, pale), size and two poses he moves between on his own beat. A drawn iron chain (links face-on and edge-on, an ankle cuff; taut while he pulls) runs from each ankle to the post. Freed, they stand and run as before (Tobin hobbles: the elder sheet has no run).
- **Art still needed (Nick's PC)**: real variety needs new faces and bodies (Hilde is still drawn as a man). `docs/mine-prisoner-art-prompts.md` has one ChatGPT prompt per prisoner (`assets/sprites/npc/prisoner_tobin.png`, `_hilde`, `_bram`, `_a`, `_b`, `_c`, 7 poses each). Each sheet is already listed in `SPRITE_SHEETS` and is used, untinted, the moment its file is in the folder; until then the stand-ins above (the missing files log a 404 at boot, like the other unpainted strips).
- **Not checked on screen**: the headless browser's renderer crashed every time it loaded the Mine this session, so the before/after in project files `mine-prisoners/before-after.jpg` is a composite drawn from the same sheets at the game's sizes, tints and chain shape, not a game capture. Logic tests pass. Check in a local build: their size next to the heroes, the chain's anchor on the painted post, Tobin's hobble when freed.

## Cloud, 2026-10-11: the mine's spike chase is the level's main event (not on itch)
- Nick: in Hollow Mountain he likes the spike chase (the collapse: the wall of rock spikes after the Ore Crusher) and wants it longer, with perilous jumps and more danger, as the level's main feature.
- **Three stretches, each a checkpoint** (`src/data/stageMine.js`): THE COLLAPSE (the old planks over the chasm, then a spur of rock to climb), THE BROKEN GALLERY (up onto the gallery, then pillar to pillar over the drop, two of them rotten planks that fall away), THE LAST LEAP (a rain of falling rock, then the chasm on planks that climb to the far bank, rock still falling on whoever stops to dig out the passage). The level is 11700 wide (was 9400): the far side and everything on it moved on 2300 px. New story lines at the gallery and the last leap.
- **The wall** (`Stage.updateCollapse`): faster each stretch (95, 105, 118 px/s, was 64), lurches forward in surges (`surge`), and never drops off screen (more than `COLLAPSE.chase` behind the hindmost hero, it runs at 2.2x). The next stretch's wall picks up where the last one was (no jump ahead); a death puts it back at that stretch's start. Caught: hurt and thrown 170 px on, onto firm ground (`collapseLanding`: never into a drop or onto a rotten plank).
- **Look** (`StageView.drawCollapse`, code art): a ragged wall of big faceted rock spikes; during a surge they thrust out with glowing tips, a rumble and a harder shake; the screen's left edge pulses red when it's at a hero's heels; "FASTER!" as each new stretch starts.
- Tuning: a clean run keeps 100-400 px ahead; hesitating at every jump gets caught and can die (that's the point). Speeds are per stretch in `stageMine.js`, catch-up and throw in `COLLAPSE` (`Stage.js`).
- Tests: the collapse test rewritten, one new (the three stretches hand over, catch up, reset on death); every hero still walks the whole level without a fall. Captured in a headless browser (project files `spike-chase/`). Not played by a person. No new art needed.
- **Art hooks for the chase** (2026-10-12): prompts are items 48-50 in `docs/campaign/art-levels-1-2.md` (copy in project files `spike-chase/`). `assets/env/mine/collapse_wall.png` + `collapse_spikes.png` replace the code-drawn wall (`StageView.paintedCollapse`, both needed), `rockfall.png` replaces the code-drawn falling rock everywhere (`StageView.paintedRockfall`). Loaded in `BootScene`; tested with placeholder pictures in a headless browser (then removed).

## Magnific on the level grounds (11 October 2026)

Magnific can't be reached from the cloud, so it runs on the local machine. The guide with
settings and prompts per level is in the project files (`magnific-ground/magnific-ground-guide.md`).
After running a ground through Magnific, `python tools/ground-fit.py <magnific.png> <level>`
shrinks it back to 2172 x 724, matches its colour to the original and writes
`assets/env/<level>/ground.png` (the game shows the ground at about 1:1 at 1080p, so the gain is
crispness, not size). Nothing has been run through Magnific yet; start with the village.

## Cloud, 2026-10-12: the Burning Village street, Magnific pass (not on itch)
- Nick ran the village street through Magnific (Image Editor, Creative mode: crisper mud, stones and straw, clean puddles; it redrew the layout) and approved it for the campaign: `assets/env/village/ground.png` is the new one (1448 x 724, colour-matched to the old one with `tools/ground-fit.py`; the old one is in git history). Before/after in project files `magnific-ground/results/`.
- Also tried: Rurik's walk frame through Magnific (project files `magnific-rurik/`).
- **Magnific grounds for Gallows Wood, Iron Gates, Shattered Ascent and the Mine are now in the game** (2026-10-15, Nick: "get it all in the game"), copied from project files `magnific-ground/results/fitted/<level>-ground.png`. Ascent and Mine are the "photorealistic, not cartoony" redo. Wood and Gates were checked in a headless game screenshot; Ascent and the Mine weren't (the headless browser can't start those two levels), so look at them on the PC.
- **HUD bars (health, stamina, magic)**: `assets/ui/hud-source.png` is now a Magnific pass (Image Editor, Creative, "photorealistic, gritty, weathered, not cartoony"), resized to the old 1672x941. The bars landed in the same place, so `src/view/hudArt.js` BARS needed no change. The three fill strips were then saturation/contrast boosted because Magnific's fills read grey at game size. Raw output and before/after in project files `magnific-hud/`.

## Cloud, 12 October 2026: dialogue boxes with portraits (art to do on the PC)

- Every story line now shows in `src/view/DialogueBox.js`: navy panel, gold frame, the
  speaker's portrait on the left, their name in gold, a pulsing ▸. Quiet ground, held
  scenes and the king's cutaways get the full box; a line said while enemies are alive
  gets a slim strip (380 x 58) on the bottom edge (the full box is 420 x 96, centred) so the fight stays in view. Off-screen
  cries and sounds (`VOICE`) show as italic narration with no portrait.
- Names and portrait files: `src/data/speakers.js`. Nick's names went to the voices that
  only had a trade: Daniel (MINER), Alex (PRISONER), Aldric (REEVE; was Vincent until Vincent became his own character), Mathew (TOWNSMAN),
  Irvolino (MILLER), Nicholas (PILGRIM). The `who` keys in the stage data are unchanged.
- **Portraits**: every speaker has one in `assets/ui/portraits/<file>.png` (256 square): the
  three heroes cut from their select art, the other 31 made in ChatGPT (prompts and how in
  `docs/portrait-art-prompts.md`). A speaker added later without one gets a hooded stand-in.
- The Ashen Road's wreckage is now two heaps at the back of the road (it was the same timbers stamped eight times across the lane; Nick found it fake).

## Cloud, 2026-10-12: level ends blend into the next level (not on itch)
- **The camera no longer looks past a level's end** (`ArenaScene.updateStageCamera`): a last stretch narrower than the screen (Gallows Wood, Hollow Mountain, Shattered Ascent) used to widen the view to the right, into black void and flat placeholder colour. It now widens to the left instead.
- **Fade between levels** (`ArenaScene.goNextLevel`, `LEVEL_FADE_MS`): ENTER on the tally fades the level and tally to black, and the next level fades up out of it, instead of a hard cut. No ticks pass while it fades, so online both machines still leave on the same tick.
- **Gallows Wood's end**: the painted rockslide now fills the end of the road in front of the lane, and the plain rock block under it isn't drawn (`hideArt` on a terrain block, `TerrainView.drawBlock`).
- **Hollow Mountain's end**: the painted mine wall stops at the far side, and the tunnel mouth opens on THE SHATTERED ASCENT's own painted sky and peaks, with the cave's dark fading into the light (`MineView.paintedDaylight`). Before, the mine wall ran to the end and "out into the light" showed no light.
- **Shattered Ascent's end**: the painted view of the Iron Gates runs to the level's end and fades into the cliff wall on its left (`PaintedLevel.piece` takes `feather` now); the flat grey gradient and code-drawn cliff edge are only drawn when the view isn't painted.
- No new art was needed. Before/after captures in project files `level-ends/`. Checked in a headless browser, not played by a person.

## Cloud, 2026-10-12: Nick in the game, Nicholas the mountain guide (not on itch; art to do on the PC)
- Nick asked to be in the game as a good guy who guides the heroes through a quieter, later level, then dies at the end and leaves them some heroic last words. That's **Nicholas** (`NICHOLAS` in `src/data/speakers.js`, portrait `nicholas`). He's the wounded pilgrim at the end of Gallows Wood, who now says who he is and that he'll find them on the far side of the mountain. On **the Shattered Ascent** he's waiting at the start. He leads them up the old road and calls out the loose rock, the broken stair, the catapults and the bridge (those lines used to be Oryn's and Vexa's "from above"). The Keep's stones strike him down in Orsk's camp, and when the camp is won he gives his last words in a held scene, then he's dead. At the high pass Rurik says "For Nicholas".
- **The guide** (`stage/Story.js` `guide`, `GUIDE`): he stays a little ahead of the leading hero, stops short of a fight that isn't won yet, and keeps back behind the heroes during one. He climbs ledges. Where he can't walk (a drop, rotten planks) he goes round and fades back in ahead. He falls on the first of `falls` (the barrage phase, or the camp being won). Rising at the camp checkpoint puts him back on his feet. Starting past the camp, he's gone. View: `NpcView.drawGuide`.
- **His art is in**: `assets/ui/portraits/nicholas.png` and `assets/sprites/npc/nicholas.png` (9 poses: stand, braced, point, walk x3, wounded, kneel, dead). Both were made in ChatGPT from Nick's photo (project files `nick-npc/nick-photo.jpeg`, not in the repo), and the strip was repacked into equal cells. The prompts are in `docs/nicholas-art-prompts.md`.
- Tests: the guide walks every hero up the whole level, he waits at fight lines, he's struck down and stands up again at the checkpoint, and the wood's pilgrim is Nicholas. Checked in a headless browser, not played by a person.

## Cloud, 2026-10-12: Vincent, the Gatewright (Iron Gates; not on itch)
- Nick's friend **Vincent** is a major ally in THE IRON GATES (level 5), the other end of the
  campaign from Nicholas (Gallows Wood and the Ascent). He's the young engineer who built the
  gates, the winch and the Gate Scorpion; the King caged him for unbarring the sally port for
  the men shut outside ("live and let live"). Full write-up: `docs/vincent-art-prompts.md`.
- **Gatehouse:** caged on the guardroom landing; a hero holds INTERACT at the lock. The
  gatehouse isn't won until he's out (`section.frees`, `stage/Stage.js`). A held scene after.
- **Gate yard:** his **Gate Scorpion** (Stage hazard `ballista`, `updateBallista`): it picks the
  lane with the most Ashen, rolls to it while the lane glows, and looses a bolt down the whole
  yard that skewers every Ashen man in that lane (never a hero, never a boss).
- **Marshal's yard:** when Malgor "will not fall", one bolt for him (`bossShot`): knocked flat,
  15% of his health, never the kill.
- **Keep road:** he waits (`npcs[].posts`, `stage/Story.js`) and tells them about a postern
  into the Black Keep, for when that level is built.
- The reeve who was called Vincent is now **Aldric** (`data/speakers.js`, portrait renamed to
  `aldric.png`).
- **Art (made in ChatGPT from his photo, 12 October 2026, in the chat "Create Pixel Portrait"):**
  `assets/ui/portraits/vincent.png` (cut to 256 square), `assets/sprites/npc/vincent.png` (9 poses;
  re-spaced into even cells for the importer) and `assets/sprites/npc/scorpion.png` (the closed-in
  black pockets made transparent). Raw downloads are on the PC in `assets\incoming\vincent`.
  Prompts: `docs/vincent-art-prompts.md`. Nick: all art is made in ChatGPT; the cloud doesn't
  draw art in code (the code-drawn stand-ins are only a fallback if a file is missing).
- Tests: three new "gates: Vincent" tests; the Iron Gates walker now frees him. Checked in a
  headless browser (the cage, the yard, three Ashen on one bolt); nobody has played it yet.
## PC, 2026-10-12: ChatGPT art for the spike chase, prisoners, kneels, jumps and Kingsfire (not on itch)
- **Landed (30 files, no code change; each loads by its file name):** `assets/env/mine/collapse_wall.png`, `collapse_spikes.png`, `rockfall.png` (on magenta, Hollow Mountain chat); `assets/sprites/npc/prisoner_tobin|hilde|bram|a|b|c.png` (7 poses each, new chat "BA · Mine prisoners"); `assets/enemies/strips/<enemy>_kneel.png` for berserker, gladiator, stalker, penitent, ghoul (each enemy's own chat) and warlord (new chat "BA · Enemy · Malgor (warlord)", on magenta); `<enemy>_jump.png` + `_drop.png` for grunt, butcher, berserker, gladiator, stalker, penitent, ghoul; `assets/sprites/strips/ulric_wrath.png` (new chat "BA · Hero · Rurik King", with the Oathkeeper ref).
- **Skipped:** nothing. Some sheets came out 1774 x 887 instead of 2172 x 724; the importer doesn't mind.
- **Checked** in `tools/strip-check.html` for every enemy: every strip splits into the right number of poses. **Not run:** `npm test` (no Node on the PC; only PNGs were added). Not watched in a fight.
- **For the cloud:**
  - `jump` and `kneel` in `src/data/enemyStrips.js` use `ref: 0`, so the whole strip is scaled until pose 0 is a standing man's height. Pose 0 is a crouch (jump) or a half-kneel (kneel), so those strips come out about 1.4-1.6x too big next to the walk. Suggest `ref: 1` for jump (the push-off is near standing height), or a fixed scale taken from the enemy's walk for both.
  - The stalker and penitent `_drop` pose 1 have a small stray dark block at the bottom left (the `erase` spec can paint it out).
  - `ulric_wrath.png` still needs wiring into `src/data/spriteStrips.js` (see `docs/rurik-art-prompts.md` section 4).

## Cloud, 2026-10-12: the new ChatGPT strips wired and sized (not on itch)
- `jump`, `drop` and `kneel` (`src/data/enemyStrips.js`) were sized from pose 0 (a crouch / a half-kneel), so they came out about 1.5x too big. New importer option `refFrac: [pose, share]` (`src/view/stripImporter.js`): that pose is `share` of a standing man. jump `[1, 0.95]`, drop `[1, 1]`, kneel `[1, 0.68]`. Checked in `tools/strip-check.html` for every enemy: now the walk's size.
- The stalker's and penitent's `_drop` pose 0 had the cliff edge he steps off drawn under him; painted out with `erase`.
- `ulric_wrath.png` is wired: strip `wrath` (`src/data/spriteStrips.js`, sized from pose 5, standing) and the `kingsfire` anim (poses 0-2 over the gathering/roar, 3 on the release, 4 buried while the fire runs, 5 wrenched free). `SpriteFighterView` uses it over the borrowed cleave poses. Not watched in a fight.
- Audit of art still not made in ChatGPT: project files `art-audit/non-chatgpt-art.md` (left: Orsk's and the Gate Twins' own strip sets, Rurik's launcher and Oathkeeper repaint, the Gallows Ascent, the Rogue's mine, the cutaway messenger, spell projectiles).

## Cloud, 2026-10-15: the painted prisoners are in (not on itch)
- The six ChatGPT prisoner sheets (`assets/sprites/npc/prisoner_*.png`, landed 12 October) had their seven figures crowded into the left of a wide canvas, so the game's equal-cell cut would have sliced through them. Each file is now re-laid: one figure per equal cell, feet on one line, every raised hand kept with its own figure (each figure is grown from a seed on its body, low in its cell, through its own pixels, so a hand reaching over the next figure stays with its arm).
- `SPRITE_SHEETS` heights retuned so a standing prisoner is about hero height: Tobin 215 (~92 px), Hilde 213 (~90), Bram 250 (~102), miners a/b/c 233/225/205 (~96/95/90). `NpcView` spaces the three chained miners 46 px apart (was 40). The painted sheets replace the stand-ins and their tints automatically.
- Not checked on screen (same headless crash as before); project files `mine-prisoners/before-after-painted.jpg` is a composite at game sizes. Check Hilde and Tobin at the posts and the miners' run when freed.

## Cloud, 2026-10-15: hooks for the last non-ChatGPT art (not on itch)
- **Orsk and the Gate Twins' own looks:** a boss's stage entry can name `look` (`stageAscent.js` Orsk `look: 'orsk'`, `stageGates.js` both twins `look: 'twin'`). `ArenaScene.makeView` uses that sheet when all six main strips are in, else his kind's as before. `ENEMY_STRIPS.orsk` / `.twin` (`bossSet`: the six + optional kneel, jump, drop) and `LOOKS` (look -> kind, for his size and his animations) in `src/data/enemyStrips.js`. Prompts: `docs/boss-look-art-prompts.md`.
- **Rurik's Rising Cleave:** strip `launcher` (`assets/sprites/strips/ulric_launcher.png`, 5 poses) and its anim in `src/data/spriteStrips.js`; until it exists the launcher borrows light2. Prompt in the same doc.
- **The Gallows Ascent:** `LEVEL_ART.gallows` (`assets/env/gallows/`: sky, far, mid, wall, ground, surf_rock_top, surf_rock_front, surf_plank). `TerrainView.drawBackdrop`/`drawFloor` draw each painted piece where it exists, the code art elsewhere (the code sky always stays behind: the camera climbs). Prompts: `docs/gallows-art-prompts.md`. Its set pieces (cage lift, scaffold, bell, roost, altar) still need code before art would show.
- Tests pass. The headless browser couldn't boot the game in time this session, so the Gallows hook isn't checked on screen.

## Cloud, 2026-10-15: story text waits for a button (on itch 19787736)
- Nick: "the text in the game goes way too fast, you must click a button for text to progress." No line moves on by itself any more (`LINE.wait` in `src/stage/Story.js`).
- In a level, any player moves a line on with a mouse click, D-pad right or N. In a held scene SPACE / J (pad A / X) work too. D-pad left or X still skips the whole conversation. During a fight SPACE and J stay jump and attack, so it's click, N or D-pad right there. The click goes through the player's button record (`ArenaScene` pointerdown → `padRight`), so it works online. The box hint now says CLICK.
- The sentence (`src/stage/Sentence.js`): the music plays on through the words' share of the track, then pauses (`Sentence.waiting`, `ArenaScene.syncSentenceMusic`) until the last line is moved on. It never steps back, and the blade still lands on the crest.
- The king's cutaways: lines wait for a click, SPACE, ENTER, J or pad A. His acts (the ember wave, the fist, the horns...) still play out by themselves.
- Tests: the level-walking bots still time lines out (`LINE.wait = false` at the top of `tests/logic-test.js`). Three new tests check the wait. Not tried in the browser.

## Cloud, 2026-10-15: the Sentence gets a spotlight, a slow push-in, and no two deaths alike (on itch 19787736)
- Nick: clean up the execution on Rurik and the enemy, a dramatic spotlight on the two of them when it begins, a little zoom in, "a big moment"; heads come off and bodies fall in different ways.
- **Spotlight** (`src/view/Spotlight.js`, run from `ArenaScene.setupSentence`/`updateSentenceCam`): when the boss is beaten the arena darkens (to 80%) except a soft oval pool around the boss and the hero, a warm shaft of light from above and a glow on the floor at their feet. It follows them while the hero walks up, opens wider on the blow so the head is seen to go, and fades back up when his men run. A RenderTexture that rides with the camera; view only, nothing the sim reads. Strength and size: `LOOK` at the top of the file.
- **Camera**: the camera now centres on the pair (`updateCamFocus`), not on the hero, for the whole scene. It closes in to 1.12x as he kneels, then creeps in to about 1.24x through the words, so the blow falls at its closest; the punch is 1.34x, it rests at 1.2x while he bleeds out, and comes back out when it's over (`SENTENCE_CAM` in `ArenaScene.js`).
- **How he goes** (`HEADS`/`BODIES`, `Sentence.howHeGoes`): each execution rolls one of five heads (flung high; rolled back to the executioner's feet; popped straight up; tipped off in front of his knees; skidded away across the floor) and one of five falls (slumps onto his front; kneels a long moment swaying, then pitches over; falls back; knocked flat by the blow; a shudder and a collapse). Never the same head or fall as the last boss's. Rolled with the world's dice, so both online machines see the same one (sim change: both players need the new build). Thrown in `Gore.sentenceCut`; a rolling head is `SpriteCut` `roll` (it turns with its speed and smears the floor), the sway and shudder are `sway`/`shudder` on the kneeling body. Oryn's staff still always pops the head; only his body's fall varies. Bosses without painted art (the old doll) keep the old decap.
- **Clean-up**: the executioner stands a little further off (`Sentence.place`, at least 104 px and half the boss's body width past the blow's reach) so the two pictures no longer run into each other; the full white screen flash on the blow is now a short red-white flash over the arena, so the blow itself stays visible.
- Logic test added (the kill carries how he goes; same seed, same deaths; never twice running; every variant comes up). All tests pass. Filmed in the headless browser on the Ash Captain (project files `sentence/spotlight-sequence.jpg`, `spotlight-walk-up.jpg`); the camera also comes down to the pair while zoomed so they sit clear of the words box. Not played by a person or tried online.
- **Last words** (Nick: "he usually asks any last words, some have some last words others do not"): after the charges the hero now asks "Any last words?" (`ASK` in `Sentence.js`). A boss with `last` answers; one marked `silent: true` says nothing ("...", head kept down) and the hero says "Nothing. So be it." before the sentence. Silent for now: Hruk the Hangman (Gallows) and the Warden (Mine); their written lines are kept in the data, so remove `silent: true` to give them back. Logic test added.

## PC, 2026-10-15: ChatGPT art for Orsk, the Gate Twins, the Rising Cleave and the Gallows Ascent (on itch 19787736)
- **Landed (23 files, no code change):** `assets/enemies/strips/orsk_walk|react|atk1|atk2|heavy|special|kneel.png` (chat "BA · Boss · Orsk"), `twin_walk|react|atk1|atk2|heavy|special|kneel.png` (chat "BA · Boss · Gate Twins"), `assets/sprites/strips/ulric_launcher.png` ("BA · Hero · Rurik King"), and `assets/env/gallows/sky|far|mid|wall|ground|surf_rock_top|surf_rock_front|surf_plank.png` ("BA · Level · Gallows Ascent"; far, mid and wall on magenta).
- **Checked:** `tools/strip-check.html?id=orsk` and `?id=twin` show every strip split into the right number of poses. The Gallows pictures weren't looked at in the level. `npm test` not run (no Node on the PC). Not watched in a fight.
- **Skipped:** the optional `orsk_`/`twin_` jump and drop strips (not in this pass). The Twins came out dark iron with warm torchlight rather than pure cold grey.
- **For the cloud:** the kneel scale note from 12 October applies to `orsk_kneel` and `twin_kneel` too. `surf_rock_top.png` shows a strip of the ledge's front face along its near edge.

## Cloud, 2026-10-15: second ChatGPT batch checked (on itch 19787736)
- Orsk's and the Gate Twins' strips (76318a4) cut cleanly in `tools/strip-check.html` at their kinds' size; tests pass. `assets/env/gallows/ground.png` had a 170 px pure-black band along its top (ChatGPT's empty "far edge"); cropped off so the floor starts at the slate. The Gallows layers have their magenta skylines; not yet seen inside the level (the headless browser still can't boot the game in time).

## Cloud, 2026-10-15: Irvolino redrawn from his photo (on itch 19787736)
- Nick sent a photo of the real Irvolino (the miller, `MILLER` in `src/data/speakers.js`, Burning Village barn) and asked for his art to look like him.
- **Portrait** `assets/ui/portraits/irvolino.png`: redone in ChatGPT on Nick's PC from the photo (chat "Create Pixel Art Portrait"), cut to 256 square.
- **New sprite** `assets/sprites/npc/irvolino.png`: 8 poses in the villager sheet's order (stand, cower, wave, run x3, sit, kneel), same chat, re-packed one figure per equal cell with the feet on one line. `SPRITE_SHEETS.irvolino` (`src/data/levelArt.js`), `CELLS.irvolino` (`src/view/NpcView.js`). He's now the front man of the three who come out of the barn (the `group` pose for npc `barn`); the other two stay villagers, and without the file he falls back to the villager.
- Raw downloads and the photo are on the PC in `assets\incoming\irvolino` (the photo is also in project files `irvolino-npc/`, not in the repo). Prompts: `docs/irvolino-art-prompts.md`.
- Tests pass; in a headless browser both files load at boot. He hasn't been seen coming out of the barn in play yet.

## Cloud, 2026-10-15: Nicholas moves and looks better (on itch 19787736)
- Nick: Nicholas's "animation is horrible", his art "doesn't match up with the rest", and "he jerks around when you go near him... not in the way but there".
- **The jerk** (`Story.updateGuide`): blocked at a drop he went "round by his own way" to the nearest firm spot, which was where he already stood, so he faded out and in every half second (700+ times in a bot run of the Ascent; now 1). He also flipped between ahead and behind at the edge of a fight's range. Now: a fight starts for him at 520 px and ends only past 640 (`GUIDE.calm`); he sets off only once his spot is 70 px off (`go`), eases in and out of his walk (`accel`), catches up faster when left behind (`catchUp`); where his spot is unreachable he waits (`parked`) instead of flickering; going round, he fades out first, then in. He walks his own lane 60 px up the road from the lead (`lane`, `laneSlack`), so he isn't on top of the heroes. Stopped ahead he looks on up the road and now and then points the way; in a fight he faces the heroes.
- **His walk** (`NpcView.drawGuide`): the frame follows the ground he covers (one beat per 24 px, `GUIDE_STEP`), so his feet don't skate; a soft sink on each footfall, no sway while walking. The sheet's three walk poses are the same stride drawn three times, so a real walk needs art: prompt in `docs/nicholas-art-prompts.md` section 3 (`assets/sprites/npc/nicholas_walk.png`, 8 poses). The code uses it as soon as the file is in (`SPRITE_SHEETS['nicholas-walk']`).
- **His look** (`data/levelArt.js`): as tall as Rurik (height 235, was 210); `centre: true` cuts each pose round its own torso (the pointing pose used to hop ~17 px sideways); `grade` (new `gradeSheet` in `src/view/levelArt.js`): more contrast and colour, a dark ink line and a pale rim light, like the heroes' strips.
- **His walk strip is in** (same day): `assets/sprites/npc/nicholas_walk.png`, 8 poses, made in ChatGPT on Nick's PC (chat "Create Nicholas Sprite Strip", with `ulric_walk2.png` as the style reference; raw download in `assets\incoming\nicholas_walk_raw.png` on the PC). Repacked into equal 300 px cells. It came out crisp and outlined already, so its grade is light (`'nicholas-walk'` in `data/levelArt.js`, height 232 puts his head where it is standing). One frame per 16 px of road (`WALK_STEP`). Checked as a composite at game scale (project files `nick-npc/nicholas-walk-cycle.gif`); not yet watched in a running game.

## Cloud, 2026-10-15: fix, the first execution softlocked (on itch 19787736)
- Nick (itch upload 19781820): "couldn't progress past the first dialogue box" at the first execution. Cause: the boss's taunt from the start of the fight (Varek's 'captain' beat) was often still up when he was beaten, because lines now wait for a press (e38a8b6) and nobody presses N mid-fight. During the sentence the hero's pad belongs to the scene and his presses are dropped except for the sentence's own lines, so that taunt could never be moved on, and the sentence's lines queued behind it forever.
- Fix: `Story.cutShort(keep)` ends the line that's up (as if skipped) and spends any waiting beats; `Sentence` calls it when the boss is beaten and on every tick of the words, so nothing but the sentence is said then. Logic test added (fails without the fix). Sim change: both online players need the new build.

## PC, 2026-10-15: Rurik's Oathkeeper repaint, waiting in assets/incoming/rurik/ (not live)
- 19 repainted strips (`docs/rurik-art-prompts.md` section 3, chat "BA · Hero · Rurik King"), same names, all 2172 x 724, same pose counts as the live ones: `ulric_combo1-3`, `cleave`, `slash`, `thrust`, `charge`, `chargewalk`, `walk2`, `walkU`, `walkD`, `walkUD`, `walkDD`, `sprint`, `kick2`, `roll_up2`, `roll_down2`, `finimpale`, `finthroat`. Force-added (`assets/incoming/` is gitignored); the game doesn't load them. Not moved into `assets/sprites/strips/` until Nick has looked. Skipped as unused: `ulric_kick`, `roll_up`, `roll_down` and the main grid `ulric.png`.

## itch upload 19787736 (2026-10-15) = main at 1ff8e9b
- Live on the page, embedded and checked in the running build (boots, Nicholas's walk sheet loads). 333 MB zip, 37 parts, same chunked Chrome upload as before.
- Includes the first-execution softlock fix and Nicholas's 8-pose walk. Rurik's repaint in `assets/incoming/rurik/` is in the repo but not loaded, so it isn't live.
- Online play: the softlock fix changed the sim, so both players need this build (refresh the page).

## PC, 2026-10-15: Nick's story change, Rurik earns Oathkeeper (for the cloud)
- Nick: "so he starts the game with his same sword he has had, and no fire power until receiving the sword and power. passed down by his family bloodline for eons". Rurik starts with his old sword and none of the Oathkeeper/King's Wrath fire powers. Partway through the story he receives Oathkeeper and its power, an heirloom of his bloodline handed down for ages. That's when the fire powers unlock and his look changes.
- Art: keep the current live `ulric_*` strips (old sword) for before he has it. The repainted set in `assets/incoming/rurik/` becomes his look after he receives it (a second strip set, swapped in at that moment, not a replacement). Where and how he receives it (scene, who hands it over) is still to be decided with Nick.
- Nick: "receiving sword must feel important". Make it a set-piece moment, not a pickup: the fight stops, a cutaway or slow beat, the blade waking with fire, a line or two about the bloodline, his look switching to the Oathkeeper strips on screen, then the first use of the new power. Scene and giver still to be decided with Nick.

## Cloud, 2026-10-15: Rurik's birthright, Oathkeeper given at the end of level 1 (on itch 19788756)
- Nick: Rurik starts with "his same sword", no fire, until he's given Oathkeeper "at the end of the first level, by someone of significance": his father's sword (the father was killed in the attack), passed down his bloodline "for eons", and "receiving sword must feel important".
- **The scene** (`src/data/stageVillage.js`, beat `elder`, now a held scene at the north gate): Elder Brann tells him his father **Hakon** held the gate alone until the last child was out, and dying said "give it to my son"; Brann gives him Oathkeeper, forged in the valley's first fire by the first of his line, only steel in any other hand. On Rurik's line "It is warm..." the line's cue (`['RURIK', '...', { flag: 'oathkeeper' }]`, new in `Story.js`: a line's third item, done when it comes up, and at the beat's end if skipped) sets campaign flag `oathkeeper`. Then Vexa spots the Ashen stragglers; the gate now has two waves (`fightAfter: 'elder'`, new in `Stage.js`) so his first fire is used at once; then the vow.
- **The moment** (`ArenaScene.setupBirthright` / `oathkeeperGiven`): the music falls away, the sentence's spotlight on Brann and Rurik, slow zoom in; on the cue a white-gold flash, two fire pillars round him, embers drawn up, shake and rumble, steel ring, "OATHKEEPER" big, then "THE BLADE OF HIS BLOOD · HIS FIRE IS AWAKE", then (if he's played) the Firebolt button. His sheet swaps on the spot; a glow stays on him to the end of the scene. Works with Rurik as the companion too.
- **Before / after** (`CHARACTERS.warrior.birthright`, `Progress.statsFor`, `Progress.hasFlag`): before the flag he wears `before` (sprite `ulric` = the old strips, `spell: null`, no `blade`); THE KING'S WRATH branch has `needs: 'oathkeeper'` (blocker `'sealed'`, picks dormant; skill screen banner "Sealed: the blade of his blood", blade page says it waits at the north gate). After: sprite `ulricOath` (the repaint, moved to `assets/sprites/strips/oathkeeper/`; `CHARACTER_STRIPS.ulricOath` in `spriteStrips.js`, wrath and launcher strips still the old ones), Firebolt back. Old saves past level 1 count as having it (`FLAG_BY_LEVEL`). Online play has no progress, so Rurik has it from the start there.
- Lore rewritten for the bloodline (`src/data/oathkeeper.js`, title "The Blade of His Blood").
- Tests pass (2 new: before/after stats and sealing; the scene sets the flag once, watched or skipped, and the stragglers come only after). **Not seen in a running game**: the ceremony, the sheet swap and the boot cutting 21 more strips are unchecked on screen.

## itch upload 19788756 (2026-10-15) = main at 413bd51
- Live on the page and embedded. 338 MB zip, 36 parts, same chunked Chrome upload as before; SHA-256 checked in the page before handing it to itch.
- Includes Rurik's birthright (Oathkeeper given at the end of level 1, the repainted strips swapped in), the first-execution softlock fix and Nicholas's walk. Checked in the running build: boots, build stamp matches, all 21 `strip-ulricOath-*` textures load. The ceremony itself is still not watched in play.
- Online play: both players need this build (refresh the page).

## Cloud, 2026-10-16: Vexa's idle steadied (not on itch)
- Nick: "Vexa's idle animation is horrible". Cause: it cycled through all six poses of `rogue_idle.png` at 6 fps (0,1,2,1,0,...). ChatGPT paints every pose afresh and a few px off the last (up to 2.5 game px), so she shivered in place and her hair, cloak and armour crawled like static.
- Fix (`src/data/heroStrips.js`, data only): the idle strip gets a `nudge` per pose that lines its body up on pose 0's, and her idle now holds pose 0 with the same procedural breathing Rurik uses (`breathe: true`), playing the dagger flourish (pose 3) for half a second every ~4 s. Poses 1, 2, 4 and 5 are no longer used.
- Before/after GIF: project files `vexa-idle/vexa-idle-before-after.gif`. Tests pass; checked by cutting the strip with the game's own importer, not yet watched in a running game.
- Art, optional: a real breathing idle needs poses that differ only in what moves. If Nick wants one, ask ChatGPT for poses edited from one image (same pixels, only chest/hair/cloak tips changed) rather than a fresh 6-pose row.

## Cloud, 2026-10-16: R only works on the death screen (not on itch)
- Nick: "r to restart keeps making me and other players replay the same level... only can restart when dead". R (and the pad's Y) now acts only when everyone is down: rise at the last checkpoint. Paused, won or mid-fight it does nothing; Esc goes back to character select (`ArenaScene.systemKeys`).
- The pause menu and the won tally no longer offer R (`HUDScene`: "R — RESTART THE STAGE" and "R — RIDE AGAIN" removed); `docs/itch-controls.md` updated. Online it still rides in the tick records, so one player's R rises both only on the shared death screen. The online "partner not responding, press R to carry on alone" prompt is unchanged (it doesn't replay the level).
- Tests pass. Not seen in a running game.
## Cloud, 2026-10-16: fix, Rurik started level 1 already holding Oathkeeper (itch 19788756)
- Nick: "rurik starts with the damn sword". Cause: `Progress.hasFlag('oathkeeper')` counted any save that had ever finished level 1 (`FLAG_BY_LEVEL`, meant for old saves) as having the sword, and NEW CAMPAIGN keeps the campaign data, so anyone who had played level 1 before (Nick) started it with Oathkeeper. A flag set by the scene once also stuck for every replay.
- Fix: `Progress.play(stageId)` (called by the arena before stats, and by the select screen): playing level 1 clears `oathkeeper`, and the finished-level stand-in doesn't count while level 1 is being played. So level 1 always starts with the old sword until Brann's scene; level 2 on, an old save still has it. Select screen shows the stats he'll start with ("BLADE: HIS OLD SWORD", no spell). Test added (fails without the fix). Not yet checked in a running game.

## Cloud, 2026-10-16: fix, the Mage's floor circle stayed behind (not on itch)
- Nick: "When Mage goes away his little circle magic thing under him stays behind". Cause: the companion Oath Keepers (`NpcView.updateCompanions`) are hidden by switching off only their sprite and shadow, and their view stops updating, so the Mage's hover graphics (`effects/MageHover.js`: rune circle, boot glow, motes, lantern sparks) kept their last frame on the road where he went out of sight. While walking off into the dark the circle also stayed at full strength, because his fade was set after his view drew.
- Fix: `MageHover.hide()` clears all of it at once; `MageHover.update` does that whenever his sprite is hidden; `StripHeroView.hide()` / `MageView.hide()` hide the whole figure; `NpcView` hides companions through `hideView()` and passes the fade in before the update (`view.fade`, multiplied into the strip view's alpha). Death, removal and online drop-out already went through `destroy()` or the fade-out and were fine. View-only: no sim change, online needs no matching build.

## Cloud, 2026-10-16: lines said in passing go by themselves (not on itch)
- Nick: "when someone isnt having a conversation with you they are just telling you something in passing then make the chat box dissapear automatically but otherwise i like to get time to read". `Story.passing(beat)` in `src/stage/Story.js` splits them.
- Conversations still wait for a press (`LINE.wait`): held scenes (the openings, the elder, the sentence), a villager you walk up to or ask (Hale, Nicholas on the wood road), and any beat with two speakers or more where one is a hero (Vincent's postern talk, Rurik and Vexa over the Marshal). Narration (VOICE) doesn't count as a speaker.
- Everything else is in passing and goes by itself: cries for help, boss taunts and phase shouts, remarks, a freed villager's thanks, the calm "the captain is ahead" lines. Time up by length (`LINE.pass`: 1.5 s + 4 frames a letter, 10 s at most; a 60-letter line ~5.5 s, about 1.5x the old timing). A press still moves one on sooner. A beat can set `passing: true / false` to override.
- The execution softlock fix (b7733ff, `Story.cutShort`) is untouched; its test now forces the boss taunt to wait so it still guards it (a passing taunt can't block it anyway: it times out).
- Tests pass (the old "mid-fight lines wait too" test now checks the split). Not tried in the browser.

## Cloud, 2026-10-16: fix, executed bosses kept their heads (not on itch yet)
- Nick (itch upload 19788756): "executions dont seem to lose their heads". Cause: most bosses now kneel in painted kneeling art (`<enemy>_kneel.png`, drawn at about 0.68 of standing height), but `SpriteCut.split` still cut the neck at standing neck height (0.83), which passes over a kneeling man's head, so nothing came off.
- Fix (`src/effects/SpriteCut.js`): on a painted kneel, the cut finds the top of his head in the frame itself (`headTop`, the first row with solid pixels, measured once per frame) and cuts `HEAD` (0.19 of his height) below it; a waist cut on a painted kneel goes halfway between his head and his knees. The sunk-and-cropped standing kneel (no kneel art) is unchanged. View only, no sim change.
- Checked in the headless browser on the Ash Captain: the helmeted head pops off and the body falls back (project files `sentence/head-off-fixed.jpg`). Logic tests pass (they don't load the view).

## Cloud, 2026-10-16: ragdoll deaths and knockdowns (not on itch)
- Nick: "is there a way to give more physics to the sprites so they don't flop over stiff... this guy's ball and chain is standing like it's on a pole... RAGDOLL", "weapons, body parts, limbs, all of it", "for everything, not just one action".
- **Every painted enemy** (all kinds, scared one-armed sets and bosses included) now goes down as a ragdoll: `src/view/Ragdoll.js`. His painted lying pose (react pose 5) is cut into head / torso / thighs / shins, hinged at neck, hips and knees, and simulated (Verlet, joint limits that bend only the way a body bends, floor contact, friction). Thrown by the blow, it lands, slides and settles into exactly the painted lying pose, so the painted get-up takes over without a jump. Corpses fade as before.
- **Gear** (`src/data/ragdollGear.js`, per enemy, frame px of the lying pose): flail balls, the butcher's hook and the stalker's chained blade hang and swing on simulated chains from the hand (the Iron Penitent's ball is the one Nick saw on a pole); swords, axes, maces, cleavers and shields are lifted off the body, held during a knockdown and let go on death, tumbling and landing on their own. If a react strip is redrawn these numbers must be re-measured (a gear whose grip/ball centre isn't on a painted pixel is simply left painted).
- **Cut-up kills** (`Gore.cutSprite`: decap, head pop, halved, legs taken): what's left with joints is a ragdoll too (headless body crumples, legs fold, the top half flops as it flies), via `SpriteEnemyView.ragdollCut` and a `rag` mode in `effects/SpriteCut.js`; the piece keeps bleeding (and holding gut ropes) from the ragdoll's cut end. The Sentence's beheading (`Gore.sentenceCut`), finisher splits (`applyCut`) and the impale rig are untouched.
- View-only and cosmetic: the game still decides where the man is; the doll is pulled along after `x`/`h` every frame. Nothing is synced online and no logic test changed (`npm test` passes). `view/frameMeasure.js` now holds the pixel measuring `ImpaledRig` used.
- Checked in a running game (headless, filmed frame by frame) for knockdown, knockdown + get-up, death on the spot and the cut kills. Nick should play it: the feel (how far bodies flip, how fast they settle) is tunable in `Ragdoll.start` (impulses) and `LIMITS`. A joint held at its limit loses 40% of its speed (else a propped body winds up its fall and jumps), and a cut-off piece left propped upright is tipped over.
- Nick, after playing: "when hitting enemies as they are falling they float slowly at times, can we make them fall faster?" Two causes, both fixed: (1) the doll added a juggle pop to his fall instead of taking the game's new speed, and didn't follow his height in the air; it now does both. (2) Sim change: a flung enemy (knockdown, on the way down) falls with `JUGGLE.fallGravity` (1.8x) gravity (`Fighter.js`, tunable in `combat/Juggle.js`); the rise after a hit is unchanged, so juggles still pop as high. Same sim on both online machines. Filmed a 3-hit juggle: he lands about 6 frames sooner and the doll lands with him.

## Cloud, 2026-10-17: halved men read as cut in two again; cut pieces tumble; loose hands fall (not on itch)
- Nick: "people dont get split in half anymore ?"; then "when npcs are cut into pieces the pieces move and roll around very stiff... add more physics", and "when you slice someone in half midway with rurik his finisher can the severed hands just fall... better than them floating".
- Cause of the first: the kill still picked the halving (the callout showed), but since the ragdoll work both halves were ragdolls that started together, the legs dropped the same way the top was thrown, and the fall-faster change (`JUGGLE.fallGravity`) pulled the thrown top half down 1.8x as hard. The top landed hips to hips with the legs: one whole body on the floor.
- Fix (`view/Ragdoll.js`, `view/SpriteEnemyView.js ragdollCut`): a cut-off ragdoll piece falls with plain gravity (the knocked-down man keeps the heavier fall); the legs stand 14 frames (2 for legs taken) as the top goes (`hold`), then fold back the way the blade came (`lean`), away from the top half. Filmed: before, he lies whole; after, the legs stand, the top flies and lands well clear.
- Stiff pieces (`effects/SpriteCut.js update`, the flying image pieces: heads, diagonal halves, finisher halves, gibs): a little air drag, more and livelier bounces (from 90 px/s, the skid turning slide into spin with a random kick), on the floor they slide and roll by friction and rock down onto their flattest side instead of easing flat; toppling legs go over faster the further they lean and bounce back once off the floor.
- Loose hands (`SpriteCut.bake / loose`): after a waist or diagonal cut, any part of a half not joined to the rest of it (a hand and forearm hanging at the hip, the sword in it) is lifted out into its own piece that drops and tumbles. Not on necks or legs, not on a kneeling man; dropped again when the half becomes a ragdoll (`dropLoose`), since the ragdoll is drawn from the lying pose that has his hands.
- View only, nothing synced online; `npm test` passes. Seen headless (halved grunt and the chain's finishing waist cut on the Burning Gate), not played by hand; the throw, the 14-frame stand and the rocking (`spin += err * 16`, `*= 0.86`) are the numbers to tune.

## Cloud, 2026-10-16: falling wood replaced by arrows and catapults (not on itch)
- Nick: "the random wood falling in the game sucks, we need to change it to enemy arrows and catapults which you finally reach at some point in the level and take them out". Every falling wooden beam is gone (the rock-falls in the mine, the ascent and the gates' stair stay).
- **Burning Village**: from THE BURNING ROOFS on, arrow volleys fall on you (`bombard` with the new `look: 'arrows'` and `upto: 'mill'`). Two archer posts (new prop `archers`, tag `millArchers`) stand either side of the mill in THE MILL YARD; each one wrecked halves the volley, both gone and it stops (Rurik: "That is their archers done."). THE LONGHALL: when Varek rages his archers loose on the hall from a post at the far end (`hallArchers`), until it's wrecked. Hints and lines updated.
- **Iron Gates, THE LOWER TOWN**: the two falling beams are now a catapult up the street (`townCatapult`) throwing burning stones until you wreck it.
- New in `Stage.js`: `bombard.upto: '<sectionId>'` (keeps shooting through later sections), `look: 'arrows'` (lighter: a hit staggers, `hitstun`, instead of knocking flat; only keeps 45 px clear of a drop). New hazard hurt kind `'arrow'` (pierce, callout "PIERCED!"). View (`StageView.js`): arrows drop in a ragged sheaf onto the red ring and stay stuck in the ground a moment; the archer post is drawn in code for now (`prop-archers` / `-broken`).
- **Art, optional (ChatGPT on the PC)**: `assets/env/village/prop_archers.png`, an Ashen archer post (timber hoarding on legs, plank mantlet, three hooded bowmen with bows drawn, a red pennant), magenta background, facing left (they shoot at the heroes coming from the left), two states side by side (standing | wrecked). Then add `props: { archers: { file: 'prop_archers.png', pair: true } }` to the village's entry in `src/data/levelArt.js` (and to the gates' if it should be used there too). The painted catapult already shows in the gates (its texture is shared).
- Tests: 3 new/rewritten (village arrows and posts, the longhall's rage volleys, the gates' catapult); all pass. Headless screenshots in project files `arrows-catapults/`.

## Cloud, 2026-10-16: no enemy ever pops into view, in any level (not on itch)
- Nick: "enemies MUST appear far off screen then jump, or walk their way onto screen" (they appeared out of nowhere on the burning roofs). Cause: a section's `spawns` spots (and `inPlace` men) were used as given, even when the spot was on screen: the roofs' two men appeared on the second roof right in front of you when you reached `fightAt`. An audit found 32 pop-ins: the roofs, the square, the hanging tree, the broken stair, the battery, the gatehouse, the Gallows Ascent's walk and gallery, and two bosses without an entrance (Hruk the Hangman, the Gate Twins), who appeared about 420 px from the hero.
- Fix (`src/stage/Stage.js`, `src/entities/Enemy.js`):
  - Any wave man whose spot is in view when the wave comes now starts off-screen on that side, in the spot's lane, and walks or jumps on (`spawnWave`).
  - A section whose first wave is all `inPlace` (the roofs, square, tree, stair, gatehouse) has those men set down when the way to it opens (`placeWaiting`, from `clearSection`), while nobody can see the spots. They stand and watch (`lurking`: not counted by `livingFoes`, so rests and calm lines still work) until the fight starts (`fightAt` / `fightAfter` / section entry), or a hero gets within 180 px, or they're struck. Starting or rising at that section's checkpoint places them at once (the screen is only coming up).
  - Bosses without an entrance walk on from off-screen like a wave man (the twins from the stair side, since the great gate seals the right). Bosses with an entrance are unchanged.
- Test added: the bot walks all seven levels and fails on any enemy created where a screen can see him (32 before, 0 after). One test changed: the gatehouse Vincent test now clears the guardroom's waiting men. Checked the roofs in a headless browser: both men stand on the second roof as you come over the first, then fight; no errors. Shots: project files `no-pop-ins/`. Sim change: both online players need the new build. Hazards were not touched.

## Cloud, 2026-10-16: the Burning Roofs read clearer; the boy is three jumps up (not on itch)
- Nick: the roofs "still lack clear fidelity... respect the player with clear visuals", and walking up the side of the wall to the boy "is really bad looking... jump up several platforms".
- Cause of the wall: the boy's high roof stood on the second roof, but its timber front was drawn down to the street (`down = b.top`), so it hung over the roof you fight on and anyone at the back of the roof was drawn walking up a house front. `TerrainView.supportTop` now finds what a block stands on and its front comes down only that far (village blocks).
- **The climb** (`src/data/stageVillage.js`): the single +85 hop is now three +45 jumps along the back of the second roof: a chimney stack (`look: 'chimney'`, code-drawn stone, `drawChimney`), a dormer, the ridge where Tam waits (x 3628-3680, top 275; Tam moved to x 3656 z 298). Each is 34 deep against the back of the lane (hold up and you're lined up), so it shows as a lit ledge, not a tall pale wall. Optional, as before; the main route and the fight are unchanged.
- **Readability, light and shade only (still no rim lines)**: a smoke veil dims the backdrop behind the roofs (`veils` in the level data, `TerrainView.drawVeils`), since the backdrop's houses are the same shingles and timber as the roofs you stand on; the roofs' house fronts are darker so the walkable top is always the lighter face; a top's end darkens into a drop past it (`shadeEnds`); the dark band behind a back edge is no longer drawn behind steps or charred boards (it showed as black boxes floating there).
- Tests: the boy's test now climbs all three steps with every hero (3 jumps each). `tools/campaign-sweep.js` learned to climb steps toward a ledge it can't jump to and to land on a narrow step; Rurik and Oryn reach Tam from the roofs checkpoint. The sweep's mill-yard STUCK (Brother Cinder kneeling) and Vexa's viper lunges off the second roof both happen on main too.
- Before/after: project files `campaign/burning-village/roofs-cleanup/`. Seen in the running game (headless Chromium), not played by hand.
- Art, optional (ChatGPT on the PC): the big roof tops still use `surf_roof_top.png`, shingles painted head on, which reads a little like a wall. A tile painted as a walkable roof seen from above at a low angle (ridge boards or a planked walkway over shingles, rows getting smaller toward the top edge, warm firelight from below, opaque, seamless left-right, 1774x887) would replace it with no code change.

## Cloud, 2026-10-16: the stables stampede made a real moment (not on itch)
- Nick: the horses "look like ghosts, you barely see the arrows, they dont even come out of the stable". Causes: the gallop strip was cut with `keyLayer('black')`, which turns everything darker than mid-grey see-through (half of each dark horse vanished), and each 362x724 frame was squashed into 170x120; the lanes started at the section's left edge (x 6200), not the gate (x 6370); the warning was faint orange triangles (the fire's colour).
- Horses (`src/view/envArt.js keyFigure`, `src/data/levelArt.js` strip `key: 'figure', trim, grade`): black cut by flood fill from the edges so coats stay solid, empty rows trimmed so they keep their shape, graded with an ink line and firelit edges. Drawn at their own aspect (140 px tall, bigger than a man).
- Out of the door (`Stage.stampedePath / stampedeAt`, `STABLE_DOOR` in `stageVillage.js`): every run comes out of the gate's threshold, slants down the yard and turns along its lane; lane 1 right, lane 2 left, lane 3 right; 2 runs each (was 3), a 40-frame beat after the bar breaks before the first warning, warning 90 frames (was 80). One trample per run at most (unchanged 50-frame cooldown), jumping still clears them.
- Warning (`StageView.drawStampede`): the whole path lights up as a red band with big red-white chevrons pulsing out of the door the way they'll run (the danger colour from `dangerCue.js`), dust boils from the doorway; the rest of the path stays dimly lit while the herd is on it. A thud, shake and burst of dust when they break out (`stampedeBurst`). Horses come out small and shadowed, growing as they reach the yard.
- Gate (`VillageView.updateStables`): once freed, the painted gate is drawn thrown open, two leaves on their hinges, the dark stable and a flickering fire glow inside.
- Tests pass (stables test updated: horses come out of the door, warned first, both ways). Seen in a headless browser (before/after in project files `stable-stampede/`). `tools/campaign-sweep.js village --section 4` gets through the stables; it then sticks in the longhall fight, same as on main without this change.
- Art, optional: a gallop strip painted at an angle (coming toward the camera) would sell the first steps out of the door better than the side-on one; not needed.

## Cloud, 2026-10-16: the villagers at hero size, and easy to spot (not on itch)
- Nick: "Hale the npc doesnt pop out enough, and way too small, you need to really see the npcs to interact with them"; "mira is also too small same as hale, any npc thats this size needs to be bigger".
- **Bigger** (`SPRITE_SHEETS` in `src/data/levelArt.js`): the village sheets were cut so a standing man was about 70 px, against the heroes' ~115. Now villager, mother and Irvolino are cut at 235 (standing ~110), the elder at 228, the boy at 170 (~80, a ten-year-old). That covers Hale, Mira, Tam, Elder Brann, Irvolino and every generic villager (roofs, barn, cellars, the gathered at the gate). Groups are spaced wider to fit (`NpcView.js`); prompts, meters and the speaker marker sit higher (`SpeakerMarker.js` `NPC_HEAD` 150).
- **Easier to see**: those sheets get the same grade as Nicholas (`NPC_GRADE`: more contrast and colour, a dark ink outline, a pale rim of light) so they separate from the painted street. Hale now stands instead of sitting against the wall.
- **Someone with something to say** (`NpcView.hasWord`: a `talk` not yet heard): a warm pulsing glow behind him and a speech bubble bobbing over his head until a hero comes near (Hale, Nicholas when wounded).
- Not changed: the mine prisoners, captives, Vincent and Nicholas were already cut at about hero height (90-118 px).
- Checked: logic tests pass; headless screenshots of Hale (and Mira, Tam). Not played by a person.

## Cloud, 2026-10-16: fireball impact sound (not on itch)
- Nick's clip (`fireball-impact.mp3`, sent in the project chat) is `assets/audio/sfx/fire-impact.mp3`, key `fireImpact` in `SFX`. Trimmed to the burst (0.17 s of silence off the front, cut at 1.9 s with a fade from 1.37 s, 1.8 s long) and peaked at -1.5 dB like `fire-whoosh`.
- `ProjectileView` plays it when a fire bolt (Firebolt, Hearthfire Bolt) bursts: on each body it hits (the Hearthfire runs through several), on a guard or parry, or on the ground or a wall; not when it just burns out in the air. Enemy fire at half volume, like the cast. The cast whoosh and lava loop are unchanged. View only, no sim change.

## Cloud, 2026-10-16: the crackle of fire under anything burning (not on itch)
- Nick: "this sound plays in the background of the first level along with everything else. its burning fire sound so anytime theres something in the game burning play this dont overpower the other sounds".
- **The file**: Nick's `fire-ambience.mp3`, made into a seamless loop (its last 2 s crossfaded into its start) and re-encoded at 128 kbps without the cover art: `assets/audio/sfx/fire-ambience.mp3` (1.4 MB, 86 s), key `fireAmbience` in `SFX` (`src/core/Sfx.js`).
- **`src/core/FireAmbience.js`**: one looped copy per arena (`ArenaScene.fireAmbience`), never stacked. Its level is the larger of a **bed** and **fire near the screen**:
  - Bed: `fireBed: 1` on a level or a section plays it low the whole time. Set on the Burning Village (all of it), the Iron Gates' Lower Town (the burning town) and the Oath Road's Burning Gate.
  - Near: fire grates and burning carts (louder as they flare), a burning beam pinning a door (`wreckage`), a body or part on fire (`Burn.js`), a wall of fire; each lifts it a little, fading over a screen past the camera's edge.
  - Levels: bed 0.16, fire at its most 0.3, of the effects volume (`SETTINGS.audio.sfx`). The file is about as loud as the battle music, so the bed sits about 10 dB under the music. It eases in and out over 0.6 s and fades while leaving a level. The M key (music mute) doesn't touch it, like every other effect.
  - Not counted: wall torches, braziers and lanterns, so the other levels don't crackle all the way through.
- Checked: logic tests pass; headless Chromium loaded every level with one copy of the loop and no errors. Not heard by a person: tune `BED` / `NEAR` at the top of `FireAmbience.js` if it sits too loud or too quiet.

## Cloud, 2026-10-16: better-looking arrows (not on itch)
- Nick: the arrows over the roofs "need to look much higher quality, and not as straight and rigid". `StageView.js`: a detailed arrow texture drawn in code (`arrow-fly`: iron bodkin with a glint, shaded ash shaft, grey and Ashen-red fletching, horn nock). Each arrow flies a real arc (`arrowPath`) from the nearest standing archer post, or from high over its side when the post is off screen (`ARROWS.seen`), turns nose-down as it falls, flutters, leaves a faint streak; volleys are loosed ragged, not all at once. Landed arrows stick in at the angle they came down (head buried, `setCrop`), quiver on impact, kick up dirt and fade after ~3 s (`plantArrows`).
- View only (the sim and the tests are unchanged). Screens: project files `arrows-catapults/arrows-v2-*.png`.

## Cloud + PC, 2026-10-16: ChatGPT art for the archer posts, the arrow and Rurik's Oathkeeper moves (not on itch)
- Nick: "get art for archer towers, and arrows, as well as any art rurik or his abilities like his fire bolt needs now", then "you do it". Prompts: project files `archer-rurik-art/archer-rurik-art-prompts.md`. Made in ChatGPT on Nick's PC by Claude through his Chrome (chats "BA · Level 1 · Burning Village" and "BA · Hero · Rurik King"), pushed to the work branch, wired in the cloud.
- **Archer post**: `assets/env/village/prop_archers.png` (standing | wrecked, magenta), `props.archers` in the village's `levelArt.js`. Replaces the code drawing.
- **Arrow**: `assets/fx/arrow.png` (cut out, 640 wide), loaded as `arrow-src`; the `arrow-fly` texture in `StageView.js` draws it in place of the code arrow when it's there. The arrows' flight code is untouched.
- **Rurik with Oathkeeper** (`CHARACTER_STRIPS.ulricOath` / `ANIM_OVERRIDES.ulricOath` in `spriteStrips.js`, files in `assets/sprites/strips/oathkeeper/`): the moves that still came off his old sheet now have Oathkeeper poses: `ulric_cast` (Firebolt throw), `ulric_air` (jump + air slash), `ulric_block`, `ulric_hurt` (hit, knockdown, getup); plus `ulric_leapsmash` (the `plunge` state, `SpriteFighterView`) and `ulric_shoulder` (Shoulder Smash; the view's added lean is cut to 40% over it), and the Rising Cleave repainted (`ulric_launcher`, now in `REPAINTED`). Before Brann gives him the sword (level 1) all of these stay on the old sheet / borrowed poses.
- **Fire**: `assets/fx/hearthfire-strip.png` (FX `hearthfire`, the Hearthfire Bolt's own white-gold strip instead of the tinted Firebolt; `ProjectileView`) and `assets/fx/kingsfire-pillar-strip.png` (FX `kingsfire`; `WrathFX.pillar` plays it with an additive glow copy instead of the colour layers; embers, stones, smoke kept).
- Spares in `assets/incoming/`: `rurik/ulric_leapsmash_alt.png`, `hearthfire_strip_try1.png`. Not made: the People's King portrait (optional).
- The pillar strip's smoke came back tinted pink by the magenta; the pink was pulled out of the file itself.
- Checked: logic tests pass; in headless Chromium every new strip cuts at boot and stands the same size as his other strips (contact sheet), the fire strips load, and the Mill Yard shows the painted posts (one wrecked) under painted arrows. The moves themselves (throw, jump, block, hits, Leap Smash, Shoulder Smash, the pillar, the Hearthfire Bolt) were not watched in play.

## Cloud, 2026-10-17: level 1 cleanup: the back of the street, sharper pickups (not on itch)
- Nick: "focus on the first level, there are invisible walls around lots of spots and art, theres items that have very low res art... the chicken, magic potions".
- **Invisible wall**: walked the whole Burning Village with the terrain and the lane drawn over it. The terrain blocks match their art; the wall was the back of the lane: you stopped at z 282 with about 40 px of painted street still between you and the house fronts. A stage can now set `laneTop` (`Stage` sets `world.bounds.minZ`); the village's is 248, at the foot of the houses. Everything built against the back of the lane moved with it (`LANE_TOP`, `FULL`, `BACK(d)` in `stageVillage.js`: the roofs and cellars, the steps up to Tam and Tam himself, the mill's raised floor); blood decals clamp to the stage's lane. Other levels unchanged.
- **Pickups**: the meat, wine, mana and relic were cut from `props.png` at the size they're drawn and blown up blocky. Now cut at 4x and smoothed (`PICKUP_HD`, drawn at 1/4: same size on screen). A repainted sheet `assets/env/pickups-hd.png` (with the trophy) replaces them when it exists.
- **Art still needed** (prompts: `docs/level1-art-prompts.md`, copy in project files `level-one/`): the pickups sheet (A), a torch post `assets/env/village/torch.png` (B, the 5 torches are code), the mill's raised floor `assets/env/village/mill_floor.png` (C, it reads as a house in the yard). All three are wired and picked up when the file lands.
- `tools/campaign-sweep.js`: the bot no longer aims for a step behind the locked camera (it got stuck in the square going for the road's cart). The sweep's boss-kneel stops (mill, hall) were there before this change.
- Checked: logic tests pass; headless screenshots (project files `level-one/`). Not played by a person.

## Cloud + PC, 2026-10-17: health and mana jars, a new trophy, secret treasures (not on itch)
- Nick: "what is that golden box thing that looks horrible, chat gpt it, i want a green magic jar to be for health, a blue one for magic... then some secret items too... remove the chicken and the wine".
- **Gone**: the roast meat and the wine, in every level. Every `drop: 'meat' | 'wine'` is now `drop: 'health'` (the green jar, heals 45%, like the meat did). `PICKUPS` in `data/stage.js`.
- **New art**: `assets/env/pickups-hd.png`, made in ChatGPT on Nick's PC by Claude (chat "Create Item Sheet Image"): green health jar, blue mana jar, the boss trophy (the gold box was a code drawing), and three secret treasures. Cut by `PICKUP_PAINTED` in `view/propSheet.js` (3 x 2 on black, 4x, drawn at 1/4). A copy is in `assets/incoming/` on Nick's PC.
- **Secret treasures**: `relic` (the Oath Chalice), `ring` (Hakon's signet), `rune` (a runestone of the first fire), each a secret worth a skill point like the relic. Level 1 had no secrets; now two: an urn behind the road's burnt timbers (`rune`, reachable now the lane goes back further) and an urn on the chimney, the first step up to Tam (`ring`).
- Checked: logic tests pass; headless screenshot of every pickup in the street (project files `level-one/new-pickups-in-game.png`).
## Cloud, 2026-10-17: boss entrances 35% faster (not on itch)
- Nick: "when a boss comes out the freeze and walk takes a little too long lets speed that whole thing up by 35 percent".
- `ENTRANCE_PACE = 1.35` at the top of `src/stage/Stage.js`, applied in `spawnBoss`: every boss (and twin) walks in 1.35x faster, his stomps come 1.35x more often (the walk cycle keeps time with them, so feet still land on the shakes), and the frozen "awe" after he arrives is cut by the same factor. The field's freeze is worked out from the faster walk, so it ends with him. The level data (`boss.entrance` in each `stage*.js`) is unchanged; set the constant back to 1 to undo.
- The whole sequence now takes 1/1.35 of the time (about 26% less), e.g. a standard entrance goes from about 8.1 s to 6.0 s. If Nick meant 35% less time, use 1.54.
- Checked: logic tests pass. Not watched in play.

## Cloud, 2026-10-17: no two enemies alike (not on itch)
- Nick: "to give more variety can you change colors on bad npcs? especially the grunts? change walking speeds and heights too so theres more varience to gameplay".
- **`variety`** on an enemy kind (`src/data/enemies.js`, guide at the top), rolled once per man as he spawns by `vary()` in `src/entities/Enemy.js`, from the world's dice (`world.roll`), so both machines of an online game see the same men. Each man gets his own copy of the stats; the kind's numbers are untouched. Bosses (`makeBoss`) are rebuilt from the kind as before and wear no dye.
  - Grunts and thralls: walk speed x0.78..1.25, height x0.86..1.16 (`stats.size`, looks only, like a boss's size), health follows height (grunt x1.5 of the height change, thrall x1), and one of eight dyes (two of them "as painted").
  - Butcher, stalker, penitent, berserker, ghoul, gladiator: milder, speed x0.88..1.14, height x0.94..1.06, no dye. Hounds: speed only (their code-drawn view has no size yet).
- **Dyes** (`src/view/dye.js`): a WebGL shader shifts only the olive-green cloth band the Legion's rags are painted in (crimson, frost, violet, ash, rust, moss); armour, steel, leather and blood keep their colour. No new textures. Applied to the sprite, its ragdoll and the pieces it's cut into. On the canvas renderer every man is as painted. No new art needed for the grunts; the other kinds' cloth is painted in other colours, so they'd each need their own band in `dye.js` before they can be dyed.
- Also fixed: a crowd shoved against the room's edge could push a man a few px out through it (`World.separate` now keeps bounded fighters inside).
- Checked: logic tests pass, plus a new `variety:` test (ranges, same seed same men, the kind untouched). In headless Chromium eight painted grunts and thralls stood dyed (crimson, moss, rust...) and kept the dye as ragdolls; no errors. Not watched in real play by a person. Screens: project files `enemy-variety/`.

## Cloud, 2026-10-17: the Ore Crusher a regular enemy, its wheels turning, no shrinking (not on itch)
- Nick: "the ore crush wheels need to spin and instead of a boss treatment it just needs to be a regular bad guy same health, just have him come in 4 or 5 times this map sometime 2 at a time", then "crushers size also when attacking shrinks please fix".
- **Regular enemy**: `crusher` in `src/data/enemies.js` now has a grunt's health (70, was 220); still iron (`machine`: never staggered). Hollow Mountain (`src/data/stageMine.js`) sends it five times: the Mine Mouth's second wave (one), the Workings' first (one) and second (two), the river bank before the Chain Warden (one), and the Crusher Hall's new second wave (two). The Crusher Hall has no boss now: no entrance, phases or sentence; its two furnace vents run from the start and the overdrive rockfall is gone. The overseer's line plays as you reach the hall's fight (`at: 6150`); his furnace/overdrive lines are gone. The Crusher Core trophy can still come from other bosses' drops (`pickTrophy`).
- **Shrinking**: each painted strip is scaled to its own tallest pose, so the slam (hammer up high) drew the machine about a quarter smaller. Each Crusher strip now has its own `height` in `SPRITE_SHEETS` (`src/data/levelArt.js`: walk 380, atk1 395, heavy 495, doom 355), matched by eye on the rear wheel and hull, and the atk1/heavy frames sit down onto their ground line (`FOOT` in `CrusherView.js`) instead of hovering over the sparks/dust.
- **Wheels**: the six painted walk poses all have the wheels at the same angle, so `CrusherView.js` cuts the rear wheel's spokes and the drum's face out of the first walk pose as discs (`wheelTexture`) and turns them over the painting: the rear wheel rolls with the ground covered, the drum grinds all the time (faster on the move). The drum's arm is cut out of the disc and masked off so it stays still. Only over the walk strip (the grind strip's drum is painted turning). Hub positions are in source pixels of `crusher_walk.png` (`WHEEL`, `DRUM`): if that file is repainted, re-measure them.
- Checked: logic tests pass (new: the Crusher is a regular enemy, five times, twice in pairs; still iron). In headless Chromium the painted Crusher walked, slammed and ground with the wheel turning and the slam the walk's size. Not played by a person.

## itch upload 19800511 (2026-10-16) = main at f540b01
- Live on the page and embedded. 338 MB zip, 36 parts, same chunked Chrome upload; SHA-256 checked in the page before handing it to itch.
- Includes the ragdolls, arrow volleys and catapults, execution heads on kneeling bosses, the stables stampede, villagers at hero size, enemy walk-ons and the Burning Roofs cleanup. Tests pass. Nick to check the first execution and Tam on the roofs.
- Online play: both players need this build (refresh the page).

## itch upload 19803627 (2026-10-16) = main at cda2b32
- Live on the page and embedded. 338 MB zip, 36 parts, same chunked Chrome upload; SHA-256 checked in the page before handing it to itch.
- Adds the faster ragdoll falls (heavier fall gravity in a knockdown, juggle hits take the game's speed) on top of 19800511.
- (These two notes were committed on the PC but never pushed; added here with 19814146.)

## itch upload 19814146 (2026-10-16) = main at 8e88bbc
- Live on the page and embedded. 342 MB zip, 38 parts, same chunked Chrome upload; SHA-256 checked in the page before handing it to itch.
- Adds the halved-men fix (legs stand then fold, top half falls clear, pieces bounce and roll, loose hands drop) and the village carts and stable-gate bar. Tests pass; the autoplay bot reached the boss on the staged copy with no errors, and the hosted copy boots into a fight cleanly.
- Still unpainted, so they 404 on itch as expected: `assets/env/village/torch.png` and `mill_floor.png` (the game skips them).
- Online play: both players need this build (refresh the page).

## Cloud, 2026-10-17: level 5 art list; Vincent's and Nicholas's lines rewritten (not on itch)
- Nick: "get the art going for the 5th level", and the dialogue: Vincent's "live and let live" and Nicholas's "the mountain man" were cheesy; "short amazing tight dialogue like a game of thrones novel". Keep the action.
- **Level 5 = THE IRON GATES.** Every backdrop and set piece is painted; what's still code: the gatehouse stair and landing, the rotten floor, the ram on the road, the town's cart, and the lamp posts (the wood's green lanterns). Prompts: `docs/gates-art-prompts.md` (copy in project files `gates-art/`), five pictures. All wired: `surfaces` and `props.ram` in the gates' `levelArt.js` entry, `look: 'ram'` / `'cart'` on the two blocks (`TerrainView.drawPaintedBlock` now runs outside the village), the brazier in `drawLanterns` (`gates-brazier-src`). The town's cart already shows the village's painted burnt cart.
- **Dialogue** (`stageGates.js`: every Vincent line; `stageAscent.js` and `stageWood.js`: every Nicholas line). Same beats, ids, triggers and speakers; only the words. "Live and let live" and "a mountain man sent you" are gone.
- Checked: logic tests pass; headless shots of the gates (the cart in the town). Not played by a person.

## Cloud + PC, 2026-10-17: level 5 art painted (not on itch)
- The five pictures from `docs/gates-art-prompts.md`, made in ChatGPT on Nick's PC by Claude (chat "Create Fortress Landing Tile", the gates' wall, ground and the village cart attached as references): `assets/env/gates/surf_rock_top.png`, `surf_rock_front.png`, `surf_plank.png`, `prop_ram.png`, `brazier.png`. No code change: the slots were wired in the previous commit.
- The brazier's smoke was tinted pink by the magenta; the cloud un-mixed it into grey smoke with real transparency (RGBA). **On the PC**: the five files sit untracked in `assets/env/gates/` (the brazier there is the pink one). Delete them before `git pull`, or the pull refuses.
- Checked in headless Chromium: the gatehouse stair and landing are painted stone, the ram stands on the Killing Ground road, braziers burn along the level. Shots: project files `gates-art/`. Not played by a person.

## Cloud, 2026-10-17: dialogue rewrite (not on itch)
- Nick asked for short, hard dialogue "like a Game of Thrones novel", keeping the action and the NPCs he put in. 170 lines rewritten across all five levels and the King's cutaways (`src/data/stage*.js`, `src/scenes/CutawayScene.js`); beat ids, triggers, cues and who speaks where are unchanged.
- Vincent loses "live and let live" ("I build gates, not graves"; at the postern: "Every door I built for him opens for you now"). Nicholas loses "a mountain man sent you" (last words: "he'll ask who you are. Tell him: the ones he couldn't burn").
- This replaces the Vincent and Nicholas wording from the level 5 art commit (7233cea) with the lines Nick approved here.
- The pledge test follows the new opening line. Full before/after list: project files `dialogue-rewrite/dialogue-rewrite.md`.

## Cloud, 2026-10-17: level 6 THE BLACK KEEP, the finale (not on itch)
- Nick asked for a full design of the final level (project files `final-level/black-keep-final-level.md`, with the story), then "go with it we will tweak it later GO".
- **The level**: `src/data/stageKeep.js` (`blackKeep`, chapter VI, `next: null`, ends on THE OATH IS KEPT). The gates now lead to it. 11 sections, about 17,400 px: the gale on the causeway, the Muster Hall's balcony crossbows, the burning cells (three cages: the village's people, the smith's apprentices, Ilse), the Executioner on the scaffold (defend the kneeling line), the Crucible Line (buckets carry you back toward the furnace), the Ash Mill (break three pins to stop the stone; the Forgemaster), the quiet Kings' Root, the Spire hoist (men drop in from the floors going by), the Crown Walk twin knights, the Falling Span, the Ashen Throne. Those saved on earlier levels come back for the end (Vincent, the miners, Joren) and in the colossus fight (the miners' and convoy's slings).
- **King Vaurath** (`ENEMIES.king`): phase 1 duel (he guards most of a blow, ward 0.3; three parries or guard breaks open him for 160 frames; a blow into his guard burns back: `emberCounter`). 75%: the Keep obeys (four ember conduits ward him to 35% while any stands; floor fire). 50%: the Colossus (he is held in the statue's chest, untouchable, until its three spires break; then he drops into the heart). 25%: the last ground (the room closes in, falling rock). Then the usual sentence (VAURATH lines).
- **New Stage features** (`src/stage/Stage.js`, documented at the top): `boss.duel`, `phases[].ward / hold / release / squeeze`, hazard `drift` (wind/turning floor, warnings, shelter, bands), terrain `carry`, wave spawn `drop`, `until: 'clear'`. Story triggers `fight:<id>`, `counter`, `heart`. CombatSystem multiplies damage by `defender.ward`.
- **Art**: all code-drawn for now (`src/view/KeepView.js` backdrop with the seated-statue Keep, the throne walls that fall and the colossus that wakes; canvas props pin/conduit/spire). Painted art from ChatGPT is still to do.
- Checked: logic tests pass (new: wired in, all three heroes walk it with no fall and save everyone, the duel, the colossus hold/heart/squeeze, the gale; plus the no-pop-in and boss tests). A real-fight bot (SweepBot) beat the whole level with all three heroes. Not played by a person.
- On branch `claude/project-thread-7f2vw8`, not merged to main.

## Cloud, 2026-10-17: archer posts and catapults animated (not on itch)
- Nick: "lets animate them heavily the shooting and the destruction", and "the catapult bullets also need art". New `src/view/SiegeAnim.js`: the painted `prop_archers.png` / `prop_catapult.png` are cut at load into moving parts (the three bowmen; the catapult's arm and the stone in its sling; `CUTS` holds the cut lines in the paintings' pixels, so a repaint needs them re-measured). A volley: each bowman draws (leans back), looses (snaps forward), an arrow leaves his bow; idle they breathe. A throw: the arm winds back over the top, whips past its rest, the stone flies, the frame bucks, dust; a new stone is loaded. Hits: flinch/rattle. Wrecked: the painting bursts into tumbling chunks with gravity and a bounce, the bowmen are thrown off, the arm snaps away, the stone rolls, dust clouds, the catapult's wreck smoulders.
- The stones in the air now use the painted stone from the catapult's sling (`drawStone` in `StageView.js`), spinning, burning, with a fire-and-smoke tail and embers, coming from the catapult's side. Without the painted art the old drawn ones stand in.
- View only; tests pass. Pushed before being watched in a running game (Nick said push); a headless film was running at the time.

## Cloud, 2026-10-17: Nick's flesh-hit sound mixed into sword and Rogue hits (not on itch)
- `assets/audio/sfx/stationary-kill.mp3` (Nick's upload) is SFX key `stationaryKill`. It plays on about half of the player's sword hits (`ArenaScene` hit handler) and half of the Rogue's melee cuts (`ROGUE_SOUNDS.hitFlesh`); `fleshBite()` in `core/Sfx.js` picks, never three in a row the same way.

## Cloud, 2026-10-17: the new opening cinematic, music from 17 s (not on itch)
- Nick: "add in the new cinematic for the games opening ... i want the music to kick in at 17 second mark".
- `assets/video/opening-cinematic.mp4` is the 41 s cut from Nick's ChatGPT "opening cinematic" chat (the Rurik version: story card, the march home, the burning village, Rurik draws, the Blood Axe title card). Re-encoded from ChatGPT's 88 MB file to 50 MB (H.264 CRF 21, 1080p, faststart); its own audio track was dropped since the cinematic always plays muted. The original is on the PC at `assets/incoming/opening-cinematic-new.mp4`.
- `THEME_AT` in `src/core/StartupIntro.js` is 17 (was 7): "The Battle" starts 17 s in, or at once on a skip.
- Checked in headless Chromium (with a VP9 stand-in, since its build lacks H.264): the film plays all 41 s, the theme starts at 17.0 s, it crossfades into the title. Tests pass.

## itch upload 19827076 (2026-10-17) = main at 928c05e
- Live on the page and embedded. 385 MB zip, 39 parts, same chunked Chrome upload; SHA-256 checked in the page before handing it to itch.
- Adds the new 41 s opening cinematic (music from 17 s), Nick's flesh-hit and Mage shock/lightning sounds, and the archer/catapult animations. Checked on the hosted copy with ?mute=1: the cinematic loads and hands over to the title; all 599 files load.
- Gotcha: the first try (19826617) broke because two files were fetched before itch finished unpacking, and itch's CDN cached the 404s for 31 days. After an upload, wait for itch to finish unpacking before loading any game file URL.
- Not in it: the Black Keep (level 6) branch, which isn't merged to main.
- Online play: both players need this build (refresh the page).

## Cloud, 2026-10-17: online co-op plays the campaign
- Nick: "have online play the campaign as normal with all the latest updated" (it used to play only the old Oath Road).
- ONLINE CO-OP is on the main menu now (`TitleScene`); the Director's Cut keeps the Oath Road online as OATH ROAD: ONLINE (`openLobby('oath')`).
- The host decides where it starts (`SelectScene.netStart`): his campaign checkpoint, or the Burning Village; the 'start' message carries the level, section and who he has saved, so both machines build the same level. The host's save follows the game (checkpoints, levels, the saved: `ArenaScene.netSave`), so CONTINUE picks up there. Who was saved carries level to level online (`netCampaign`).
- Level end online: each machine plays the king's scene and its tally in its own time, so a new held bit `ready` (`TickInput` ACTIONS, set through `NetSession.extraHeld`) says when this machine's tally is up. ENTER from a ready player counts; both games go on the same tick once both are ready (`ArenaScene.netWonKeys`), with WAITING FOR YOUR PARTNER meanwhile.
- Still not online: skill trees, shrine spending and trophies' stats (each hero plays with his base sheet; Rurik has Oathkeeper from the start). The fingerprint (`net/Version.js`) now covers the campaign levels too.
- Tests: two machines over a laggy wire play two minutes of the Burning Village alike (villagers and story too); the ready bit crosses the wire.
- Online play: both players need this build (refresh the page).

## itch upload 19830412 (2026-10-17) = main at 785ae7d
- Live on https://knickoftime.itch.io/blood-axe-oath-of-vengeance and embedded. 385 MB zip, 39 parts, same chunked Chrome upload; SHA-256 checked in the page; waited for itch to unpack before loading any file; all 599 files load.
- Adds online co-op on the campaign (ONLINE CO-OP on the main menu).
- Online play: both players need this build (refresh the page).

## Cloud + PC, 2026-10-17: the Black Keep painted, its music, the stage-clear tune (for itch)
- Nick: "continue", then sent "12 Showdown" ("the last level song") and "06 Stage Clear" ("when you beat a level sound"), then "ill test the game just load everything in and update itch".
- **Art**: 13 pictures made in ChatGPT on Nick's PC (chat "Create Fortress Landing Tile"), prompts in `docs/keep-art-prompts.md`: `assets/env/keep/` sky, far (the Keep with the seated king), ground, `tile_causeway/hall/cells/forge/root/spire/battlements` (a wall per part of the Keep: `LEVEL_ART.keep.tiles`, `PaintedLevel.tile`), `prop_pin/conduit/spire` (whole + broken, trimmed to their content). Raw downloads are in the PC's `assets/incoming/keep_*.png` (untracked there). Still code: ledge surfaces, the throne room's walls and the colossus, the forge's buckets and mill stone.
- **Music**: `assets/audio/showdown.mp3` (`MUSIC.showdown`, gain 0.46) is the Black Keep's track (`STAGE_KEEP.music`) and King Vaurath keeps it (`boss.music`, read by ArenaScene's bossSpawn). `assets/audio/stage-clear.mp3` (`MUSIC.clear`) plays once on every `stageWon`.
- Checked: tests pass; headless shots of the causeway, muster hall, cells, crucible, spire, crown walk and throne with the painted art. Not played by a person.

## itch upload 19836140 (2026-10-17) = main at 9b7d110
- Live on https://knickoftime.itch.io/blood-axe-oath-of-vengeance and embedded. 382 MB zip (616 files), 41 parts, same chunked Chrome upload; SHA-256 checked in the page; waited for itch to unpack (checked with cache-busted URLs only) before loading any file; all 616 files load.
- Adds the Black Keep (level 6): its painted art (`assets/env/keep/`), `showdown.mp3` and the stage-clear tune.
- Checked with ?mute=1: the game boots into the opening cinematic with no console errors. The Chrome tab closed before I could watch it reach the title.
- Online play: both players need this build (refresh the page).

## PC, 2026-10-22: ChatGPT (Codex) work from Oct 18-20 is the new base
- Nick worked on the game with Codex while Claude was away, in a separate clone: `C:\Users\nickr\Documents\Codex\2026-10-18\ive\outputs\blood-axe-our-copy` (started from 8c55ec4, all uncommitted). Its playable builds are in `Documents\Codex\Blood Axe Builds` (newest `build-2026-10-20-210732`). Nick: "i want you to be sure our work continues on that new build".
- Copied every changed and new file from that clone into blood-axe (393 files, checked identical) and committed on branch `codex-oct20`. Left out its `art/` working folder (464 MB of prompts, previews and review renders; the game and tests don't read it) and `magnific-ground/`.
- What it adds, mostly level 1: HD painted Rurik/Oryn/Vexa (`src/view/heroHd.js`, `src/data/heroHdAssets.js`, `assets/sprites/heroes-hd/`) and Rurik's new X X X combo; the Irvolino mill rescue with a 25 s timer, killable hangman, hanging on failure and Elsbeth as his replacement (`src/stage/MillRescue.js`, `src/view/MillRescueView.js`, `MillHangingArt.js`); painted gore and new cut/physics code (`src/effects/Physics.js`, `CutGeometry.js`, `SplitSeam.js`, `FleshChain.js`); Varek's gear falling off at his execution; a straight gallows, the town church, the mill, openable chests (E / D-pad Up); Oryn's hover idle; a painted pause menu with Cinzel / Source Sans 3 fonts; sanctuary music and bow, roll, door, gate, chest and sheath sounds; an F8 test navigator.
- Codex's own notes are in `CURRENT-WORK.md`, `WORK-PAUSED-2026-10-20.md` (historical) and `AGENTS.md` at the repo root. `npm test` now runs 24 test scripts. Codex reported all passing; not re-run here (no Node on the PC). Run `npm test` in the cloud before pushing to main.
- Not pushed and not on itch yet.

## Cloud, 2026-10-23: dialogue box rules, the father's scene, no fanfare after level 1 (not on itch)
- Box rules (`MINOR` / `ALWAYS_BOXED` in `src/data/speakers.js`): minor villagers (Hale, Mira, Tam, Elsbeth and the like) never get the dialogue box; in a held scene their line floats over their head (`Story.bark`, `NpcView.fieldWords`) and moves on by itself. Irvolino (MILLER) always speaks in the full box with his portrait, in passing too. Heroes, Hakon, Nicholas, Vincent and the villains keep the box.
- The father's scene (`elder` beat, `stageVillage.js`): Rurik "Father, I'm here. The children in the church... they are safe." / Hakon "Good. Take the sword. I can't hold it." / Rurik "Then I'll hold it for both of us." / Hakon "Let me look at you." (two lines shorter than before).
- `STAGE_VILLAGE.clearTune: false`: no stage-clear fanfare when level 1 is won (ArenaScene's `stageWon`); every other level keeps it.
- npm test passes. On branch `claude/project-thread-o8oxi3`, not on main or itch.

## Cloud, 2026-10-23: Burning Roofs art pass (on main)
- Sky stripes over the roofs: the smoke veil (`TerrainView.drawVeils`) was 8 px strips overlapping by half a pixel; now one gradient image. Same fix for every strip-drawn fade on the roof, beam and chimney blocks (`vFade` / `hFade`: one gradient-filled rect).
- The black box over the burning cellars: their back is now the painted house front in deep shadow (`burningCellar`).
- Roofs: a ridge beam along the back and an eave board along the lip (painted `surf_beam`, running past the ends), more broken shingle edges, corner and foot shading on the house fronts.
- New ChatGPT art in `assets/env/village/` (prompts: project files `burning-roofs-art/prompts.md`): `stables_open.png` (swaps in for `stables.png` when the horses break out, replacing the code-drawn gate leaves), `decor_signpost`, `decor_lantern`, `decor_debris`, `decor_debris2` placed by `STAGE_VILLAGE.decor` (`VillageView.drawDecor`). The five files are also already in the PC's blood-axe folder (untracked there).

## Cloud, 2026-10-23: village shrines and the roof-start wall (not on itch)

- Both oath shrines in the Burning Village (market square, longhall) now stand at the back
  of the lane on a solid, unclimbable footprint (`shrineFootprint` in `src/data/stageVillage.js`;
  rest `solid: true` makes `TerrainView.drawRests` stand the art on the ground in front).
  Kneeling still works from in front of them.
- A heap of burnt timbers, too high to climb, fills the gap behind the cart at the start of
  the Burning Roofs: you can no longer walk up beside the first house and be drawn over its roof.
  The way up is the cart.
- Code only; no new art needed.
## Cloud, 2026-10-23: the hangman's warning and the barn barricades (level 1, mill yard)
- Nick asked for a warning that the executioner is about to kill the hostage unless he's stopped, and breakable barricades on the barn with a "Villagers Saved" tally.
- **Warning** (`src/stage/MillRescue.js`, `src/view/MillRescueView.js`, `HUDScene.updateRescueAlert`): the hangman shouts over his head (no dialogue box) as he takes his place, at the lever, when he's knocked off it, at his last words and just before the drop. A clock at the top centre says STOP THE EXECUTIONER! / KEEP HIM OFF THE LEVER! / HE'S PULLING THE LEVER! / CUT IRVOLINO'S BONDS! with the rope's seconds (drains only while he's at the lever). Steel-drawn and iron-ring sounds on `millWarning` (`BattlefieldAudio`). Timings: `MILL` in MillRescue.js (unchanged 25 s rope).
- **Barn**: the burning beam is gone; one `barricade` prop (`PROPS.barricade`, `lift` draws it up on the painted doorway) on the barn doors (Nick, 2026-10-23: one spot, not three); all three villager groups (`mill-villagers`, `barn-west`, `barn-east`, `people: 3`) share its tag `barn`, so smashing it frees all nine (one shared callout: npc `savedAs`). Painted: `assets/env/village/prop_barricade.png` (intact | smashed on magenta, ChatGPT chat "BA - Level 1 - Burning Village", prompt in project files barn-barricade/; `LEVEL_ART.village.props.barricade`; kept PNG in build-release.ps1). The code-drawn planks stay as the fallback. `section.tally` + `Story.tally` drive "VILLAGERS SAVED n / 9" under the objective, with a figure per person.
- **Art still needed**: the barricades are drawn in code (StageView `prop-barricade`). Paint `assets/env/village/prop_barricade.png` in ChatGPT on the PC: whole on the left half, smashed on the right, magenta background, then add `barricade: { file: 'prop_barricade.png', pair: true }` to `LEVEL_ART.village.props` (left out until the file exists, so nothing fails to load). Prompt: project files `barn-barricade/barricade-art-prompt.md`.
- Tests: new `tests/hangman-warning-barn-test.js`; `npm test` all pass. Headless browser shots checked; not played by a person.

## Cloud, 2026-10-23: painted torch flames everywhere (on main)
- Nick's list: replace legacy torch/fire sprites. Survey of all 7 levels found the Burning Village's 5 torch posts were still code-drawn (a black stick and a gradient blob: `assets/env/village/torch.png` never existed), and every small stand-in fire used the same drawn `'flame'` blob. The Iron Gates braziers were painted but their flame never moved.
- New: `assets/fx/torch-flame-strip.png` (8-frame painted flicker loop, ChatGPT) as `FX_STRIPS.torchflame`, played by `src/view/TorchFlame.js` (each torch on its own frame and speed). Used by the village torch posts, the gates braziers (over the painted fire), VillageView's stand-in roof fires and the cutaway's violet torches (until its painting). New `assets/env/village/torch.png` (ChatGPT): timber post with an empty iron cresset of embers; the living flame sits in it (`TORCH_CUP` in TerrainView).
- Originals from ChatGPT are in `assets/incoming/torch-flame-v1.png`, `torch-post-v1.png` on the PC; prompts in the project files `torch-fire/torch-fire-prompts.md`. Test: `tests/torch-flame-test.js`.

## Cloud, 2026-10-23: the market square's well is solid (not on itch)

- The well painting in the Burning Village square (well, burning stall, crates and barrels:
  `assets/env/village/well.png`) now stands on one solid, unclimbable footprint covering its
  whole width (`wellFootprint` in `src/data/stageVillage.js`, x 2096-2404, from the back of
  the lane to z 290). Heroes stop just in front of it, so they are drawn over its foot, and
  Mira's family (z 300) stands clear. Test: "village: nobody walks through the market well".
## Cloud, 2026-10-23: stray purple line on the Burning Roofs removed (on main)
- Nick saw an "unfinished purple line" over the chimney urn on THE BURNING ROOFS. It was the Gallows Ascent's crow-cage cue (`TerrainView.drawRoostCue`: a grey box on a line, lit violet), which drew beside ANY raised secret, so it hung in mid-air by the village's chimney urn. Now drawn only on the Gallows stage. Code only; no art needed. Shot: project files `purple-line/before-after.png`.


## Cloud, 2026-10-23: a bigger stampede, men thrown into it (not on itch)

- Nick asked for the horses to come out more times and for many more enemies to get smashed. Each of the three lanes now runs 5 times (was 2) with herds of 5, 6 and 5 (was 3, 4, 3): a run every ~110 frames for ~27 s.
- `fodder` on a stampede hazard (`Stage.sendFodder`): each time its run is warned, that roster comes on from off-screen on the side the herd is running to, down its lane, straight into the horses (trampled Ashen men still blow apart). Capped at `STAMPEDE.maxFoes` (12) living foes; only while the stables are the current section and no boss is up, even after its waves are beaten.
- The stables' fight isn't won while a fodder stampede is still running (`Stage.stampedeSending`). Trample damage to heroes 20 (was 26); jumping still clears them.
- Campaign bot from section 4: same result as main (gets through the stables with no deaths, then stops at Varek kneeling, as before); ~20 s longer at the stables.

## Cloud, 2026-10-23: Varek's headless body goes limp (not on itch)

- Nick: after the longhall execution Varek's body stayed stiff. A body beheaded on painted kneeling art now kneels its usual beat (sway/shudder as before), then turns into a jointed body (`SpriteCuts.limpen`, `view/FlexibleCut.js`) pushed the way its sentence says (`limp` in the `sentenceCut` table, `effects/Gore.js`) and folds and flops down under gravity. The head-only cut is unchanged; all of it is view-side, the online sim is untouched.
- Fix in `FlexibleCut.contact`: a band's floor contact is weighted along the band, not the frame's vertical, so a band lying flat (kneeling shins) no longer launches the body into the air.

## Cloud, 2026-10-23: cinematic music on the first footstep, 12.6 s (on main, not on itch)
- Nick: "have the music start on the opening cinematic as soon as the text goes away and the next scene begins".
- Measured in `assets/video/opening-cinematic.mp4`: the story card's text fades out by 11.9 s and the first shot (the boots on the march) cuts in at 12.0 s. Then Nick: "the moment the foot step hits the ground". The boot comes down from 12.1 s and its sole lands with a puff of dust at 12.6 s, so `THEME_AT` in `src/core/StartupIntro.js` is 12.6 (was 17). The track has no lead-in silence. A skip still starts the theme at once.
## Cloud, 2026-10-23: the level 1 opening standoff (not on itch)

- Nick's script for the start of the Burning Village, built on the existing `src/stage/VillageOpening.js` (fixed-tick, so online stays in step): the grunts in formation on the right, Brother Cinder and Varek behind them with a villager kneeling at Varek's feet (npc `captive`, the painted villager sheet's kneel pose). The heroes sprint in from the left and skid to a stop (dust off their boots).
- The held `opening` beat is now Nick's lines: Rurik "Stand down! Your slaughter ends here!", Varek "Oathkeepers... You're too late to save anyone.", a silent line (`moment: 'openingStrike'`) where Varek's overhead mace comes down and the villager pitches forward dead (blood burst + shake: `openingKill` in ArenaScene), then Varek "Cut them down!". Then both commanders turn and run off right, the front rank charges, and the heroes are let go; the rear rank follows a beat later.
- The HUD (bars, counts, style meter, objective, controls hint) stays hidden through the scene and fades in as the fight starts (`HUDScene.chrome` / `updateChrome`). The enemy strip skips cinematic men.
- The old opening lines (Cinder's "let me finish it", Varek's "hold the mill", the pledge) are gone from it; Rurik's pledge ("Every captain... Each pays.") is now a held beat `pledge` said over the dead villager once the formation is cut down. A skipped scene still kills the villager; a checkpoint start past section I finds him dead.
- Code only, no new art. Tests: `tests/village-opening-test.js` (watched-through scene), `npm test` all pass.

## 2026-10-23: King's Fire unlock notice (main 94b24ab)
- When Rurik raises Oathkeeper at the deathbed (line `moment: 'swordRaised'`), a NEW ABILITY plaque fades in to the right of the painted cinematic: KING'S FIRE, "Press [U] or [LB] to hurl Oathkeeper's fire". `src/view/AbilityNotice.js`, shown by `HUDScene.newAbility`, called from `ArenaScene.oathkeeperRaised` / `rurikButtons`.
- The buttons come from the bindings of whoever plays Rurik (`actionButtons` in `config/controls.js`): P2 on the number pad sees NUM 5; nothing is shown when Rurik is only a companion. It is the tap (Firebolt); the hold (Kingsfire skill) still needs the skill tree. Code only, no new art.

## Cloud, 2026-10-23: Character Select no longer drops you on the old Oath Road

Pause menu > Character Select (and Esc on the pause / death / win screen) started the
character select with no stage, so picking a hero loaded the old Oath Road test stage
("some weird old build"). `ArenaScene.selectData()` now sends you back into the run you
were in: a campaign level resumes at the saved checkpoint (like CONTINUE), any other
stage restarts that stage. Not on itch yet. The itch packager (tools/build-release.py)
copies only src/lib/assets fresh each time and the game has no service worker, so no
stale files ship.

## Cloud, 2026-10-23: block and roll cut any move short (not on itch)
- All three heroes: a fresh block press (parry, then guard if held) or a roll / blink
  press instantly cancels any ground action at any frame: swings, the kick, heavy,
  charge and thrust, spells and skill moves. Jumps and air moves are not cancelled.
  Code: `actionCancel` in src/entities/fighterStates.js, called from Fighter.update.
  Replaces the old per-hero `rollCancel` flag (which skipped the kick).
## Cloud, 2026-10-23: the Ashen Road's obstacles moved to the edges (not on itch)
- Nick: "Move the obstacles to the sides not in the middle of the beginning of the game, they are annoying".
- In `src/data/stageVillage.js` terrain, section I: the hay cart (was mid-road at x 470-560, z 390-470) now stands against the back of the road at x 390-480 (clear of the pikes), the rear rubble heap sits a little further back (z 276-292, the secret urn still behind it) and the other heap (was mid-road at z 364-380) is at the front edge (z 478-494). The middle of the road is open from x 300 to 1000.
- Logic test reworked: every hero walks the road both ways at z 338, 400 and 450 without a block; the cart and both heaps are still solid. Checked in a headless screenshot. No new art.


## Cloud, 2026-10-23: the Sunder, X, X, Y, Y (not on itch)

- Nick: "X X then Y hits them into the air for a juggle, if you hit Y again you viciously slash them in half in a downward slash". X, X, Y (keys J, J, K) was already Rurik's Rising Cleave launcher. Pressing Y (K) again while the launcher's recovery runs, and only if it connected, is now the SUNDER (`moves.sunder` in `characters.js`, state `sunder` in `fighterStates.js`, tuning `SUNDER` in `combat/Juggle.js`): he leaps up after the launched man (aimed at where he'll top out; the men he launched float while he rises), hangs a beat with the blade overhead, then comes down in one cut.
- A man still in the air always dies to it, split head to groin with the halves thrown apart (`CombatSystem`: `sunder`, fatality `halfV`, never the attached split), "SUNDERED!" callout. Anyone it catches on the floor takes a 34 chop; a boss (never juggled) just takes the chop. Landing: dust, shake, a 20-frame buried recovery (roll out from frame 10).
- View: borrows the Leap Smash poses (`anims.plunge`, Oathkeeper only) or the cleave's before he has the sword, plus a big downward smear. No new art needed; a dedicated strip would be a nice-to-have.
- Tests: two `sunder:` cases in `tests/logic-test.js`; `npm test` all pass.

## Cloud, 2026-10-24: enemies go down whole, no more cut-out ragdoll (not on itch)

- Nick: "now im seing the art split and cut like southpark characters". Cause: since 2026-10-16 every painted enemy that was knocked down or killed was drawn by `view/Ragdoll.js`, which cut his lying picture into four hinged bands (head, torso, thighs, shins) and folded them at the joints, so a man knocked into the air showed as a paper doll bent into a V.
- `SpriteEnemyView` no longer uses it for knockdowns or deaths. He's drawn whole from his own react strip: knocked flying = pose 4 (the whole body tips back rising, a little forward falling), lying = pose 5. Struck dead on his feet: hit pose for 5 ticks, rocked back, then the knocked-flying pose tipping over for 11 ticks, then lying (`DIE` at the top of the file). A lying corpse that gets cut is still cut as a body on the ground (`prepareCut`).
- The ragdoll is kept only for halves a killing blow has already cut apart (`ragdollCut`). Gear no longer flies loose off ordinary corpses (it stays in the painted lying pose).

## Dyed grunts keep their colour when finished (24 October 2026)

- Dyed grunts and thralls (`view/dye.js`) went back to olive green when finished: the pieces made at death skipped `dyeImage`. Now dyed: the folding halves (`view/FlexibleCut.js` bands), the loose bits (`SpriteCut.split`) and the doll's pieces (`EnemyView.snapshot` carries `dye`, `Dismember` applies it). Checked in the browser with all six fatalities. Any new code that draws a piece of an enemy must call `dyeImage(scene, img, f.dye)`.

## Executioner banner art (2026-10-24)
- The hangman's clock in the mill yard (HUDScene.makeRescueAlert) is now a painted plaque, `assets/ui/executioner-banner.png` (texture `executioner-banner`): iron and bronze like the pause frame, noose-and-axe crest. Painted in ChatGPT on Nick's PC (Bloody axe project chat), raw at `assets/incoming/executioner_banner_raw.png` there, magenta keyed out in the cloud. Title on the plate, countdown in the bottom groove; the old code-drawn box stays as a fallback if the picture is missing.
## Cloud, 2026-10-24: the Sunder stays planted (not on itch)

- Nick: "adjust the X, X, Y combo to keep the character planted during the final swing not that jumping monstrosity". The Sunder no longer leaps. Rurik stays on his feet (`sunder` in `fighterStates.js` zeroes his movement every frame), hauls the blade overhead for `SUNDER.windup` frames while the launched men are drawn down to about chest height `SUNDER.reach` px in front of him, then one cut (`cutFrames`) goes through them into the floor. Hitbox is now floor to 230 px up. Kill, callout, ground slam (`sunderLand`) and the 20-frame buried recovery are unchanged.
- View: always the cleave's poses now (raised, over, down into the floor), no Leap Smash poses and no drop trail.
- Test `sunder: X, X, Y, Y keeps him planted...` asserts his feet never leave the floor; `npm test` all pass.
## Cloud, 2026-10-24: dialogue box overhaul (branch claude/project-thread-yi79ro, not on main or itch)

- Nick's playtest item 2. The box is red for the king's men (`FOES` in `data/speakers.js`) and deep blue for everyone else, using ChatGPT's painted frames (`docs/art/dialogue-box/frame-*.png`, cut by `python tools/build-dialogue-frames.py` into `assets/ui/dialogue/`).
- The box hangs under the speaker's feet (`SpeakerMarker.screenAt` -> `DialogueBox.place`), clamped to the screen; health bars it covers fade. No one on screen: bottom-centre as before.
- New speaker marker: double chevron in the side's colour.
- 13 portraits repainted from the in-game sprites (see `docs/portrait-art-prompts.md`); full-size originals and sprite crops in the project files `dialogue-overhaul/`, and on Nick's PC in `art/dialogue-refs/`. Ilse still has the stand-in portrait.

## Cloud, 2026-10-24: Irvolino's gallows release reworked (not on itch)

- Nick (QA report): from the moment his rope is cut until he's off screen the animations didn't look good. Filmed frame by frame: the painted rescue strip was drawn inside the gallows canvas at a different grade, facing right, then swapped to his sprite (hands-over-head cower, facing left) at 84 frames; the "leap" was a frozen run frame that only dropped down; he stood idle for ~50 frames after landing; then a slow skating run with a talk bubble.
- Now he is one figure from the first frame: the rescue strip re-laid on one floor line as `assets/npcs/mill-rescue/irvolino-freed.png` (`SPRITE_SHEETS['irvolino-freed']`, `CELLS['irvolino-freed']`), graded like his sheet and drawn by `NpcView` (`n.actArt` / `n.act`). Timeline `FREED` + `LEAP` in `src/stage/MillRescue.js`: ropes fall, noose off, knee, thanks, rise, stand; he turns, crouches (squash), hops up and out (tilt), lands with a give at the knees, and sprints off at once (`n.sprint` 190 px/s, legs paced to the ground: `RUN_STEP` in `NpcView`). No talk bubble or halo while he's acting. The gallows canvas keeps a cut rope end swinging (`ropeAge` in `MillHangingArt.js`). `irvolino-rescue.png` is no longer loaded.
- Frames and a GIF: project files `irvolino-release/`.

## Cloud, 2026-10-24: the opening's villager execution reworked (not on itch)

- Nick's QA: "Rework the villager execution animation near the start of the map to improve visual weight, timing, and overall fidelity."
- New painted strip `assets/sprites/npc/villager_death.png` (ChatGPT on Nick's PC, raw at `assets/incoming/villager-death-chatgpt.png` there): begging on his knees, struck, pitching forward, face down. Sheet `villager-death` in `data/levelArt.js`; drawn by `NpcView.drawKneeling` (the old tipping kneel pose stays as the fallback). Each pose sits boots-left in its cell, so the draw is shifted `DEATH_SHIFT` and the blood pool sits at his head `DEATH_HEAD`.
- Timing (`OPENING.apex/hang/freeze` in `stage/VillageOpening.js`): the villager trembles from the start and harder as the mace goes up; Varek's mace hangs 14 frames at the top of the swing, then the hit freezes everything 9 frames (2-frame white flash, the body jolts), he pitches forward and lands with a small bounce. Bigger spray from head height plus mist and a heavier shake (`openingKill` in `ArenaScene`).

## Cloud, 2026-10-24: cinematic music exactly on the boot stomp (branch claude/project-thread-raedb2, not on main yet)

- Nick: the music still did not land on the stomp. Frame by frame, the front boot's sole hits the ground on frame 296 (12.33 s); the dust at 12.6 s comes after. `STOMP_AT` in `src/core/StartupIntro.js` is 12.33 (`THEME_AT` is gone).
- The real lag: the 3 MB title track only began downloading at that moment, and the check rode requestAnimationFrame, which stalls 150-270 ms while Phaser loads during the film. Measured about 0.3 s late.
- Now `prepareTitleTheme` (core/Music.js) fetches and decodes the track when the film starts, and `scheduleTitleTheme` books its start on the Web Audio clock in the last second before the stomp (minus output latency; rebooked if the film stalls or pauses). The title screen adopts it as before. The plain `<audio>` element is the fallback (no Web Audio, decode not done, audio blocked until a click). Measured in Chromium: within 0.03 s of the stomp frame.

## Cloud, 2026-10-24: fire running along the Burning Roofs (branch claude/project-thread-iomfkt, not on main or itch)
- Nick: "add some fire to the rooftops, create fresh fire art to run along the roofs".
- New ChatGPT art: `assets/fx/rooffire-strip.png`, 8 wide, low bands of roof fire (2 across, 4 down), each frame's foot lined up on the same baseline and the magenta already cut to transparency (so the release keeps it a PNG). `FX_STRIPS.rooffire` (columns 2, rows 4). Original sheet on the PC: `assets/incoming/roof-fire-strip.png` (ChatGPT, Bloody axe project chat "Pixel Art Fire Animation Sprite Sheet").
- `src/view/RoofFire.js` lays the bands end to end along a roof's ridge with an overlap, each on its own frame, speed, height and facing (seeded per roof). `TerrainView.drawVillageBlock` calls it for every big village roof (the first roof, the second roof, the last two roofs), behind whoever stands on the roof and in front of the ridge beam; hidden if the block goes. No fallback: without the strip no fire is drawn.
- Test: `tests/roof-fire-test.js`. Checked in headless Chromium shots; not played by a person.
- Sound (Nick, same day: "raise the fire sound when you go near these rooftops"): the village's fire crackle (`assets/audio/sfx/fire-ambience.mp3`, `core/FireAmbience.js`) still plays low through the whole level (`fireBed`), and each roof fire run registers itself on `scene.roofFires`; `FireAmbience.roofPresence` swells the crackle to full (`ROOF = 1`, against the bed's 0.4) as the middle of the screen comes within about half a screen of a burning roof and keeps it there while you're on it.
## Cloud, 2026-10-24: Burning Roofs flattened, painted chimney steps to Tam (branch claude/project-thread-bj40c0, not on main yet)

- Nick: the step up in front of Rurik (beam onto the second roof, +20) was unreadable. The second roof is now level with the beam and the first roof (top 120); the three steps up to Tam are 165 / 210 / 255 (still +45 each) and the two charred boards after it 130.
- All three steps are now painted chimney stacks rising like stairs (ChatGPT on Nick's PC; raw at `assets/incoming/chimney_steps_raw.png` there and in project files `roof-chimneys/`), cut out to `assets/env/village/chimney_1..3.png` (`art: n` on the blocks; `TerrainView.drawChimney` draws the capstone over the walkable top and the brick down to the roof; the code-drawn stack stays as the fallback).


## 2026-10-24: Rurik's opening pledge cut (Nick)
- Nick: "remove the dialogue rurik says in the beginning about killing every captain on their knees, no longer needed". The held `pledge` beat in src/data/stageVillage.js ("Every captain who led them here..." / "Each of them kneels. Each hears his crimes. Each pays.") is gone; after the first fight play just goes on. Boss sentences (stage/Sentence.js) are unchanged. The logic test now checks the beat stays gone.

## Cloud, 2026-10-24: frame-rate pass, no gameplay changes (ON MAIN at cf67e66, not on itch yet)
- Nick: "lots of frame drops, optimise, don't change gameplay". Measured with `tools/perf-profile.mjs` (headless Chromium, the sweep bot plays a level, every frame timed, GL calls counted, CPU profile).
- `view/PaintedFire.js`: the burning buildings' fire masks were repainted and re-uploaded whole (~10 MB) 15 times a second, on screen or not. Now only paintings on screen are repainted (one coming into view is repainted at once). The street wall's tiled overlay never showed repaints (a TileSprite copies its texture once), so it is painted once.
- `scenes/BootScene.js releaseSources`: the source paintings Boot cuts sheets from (estrip-, lvlsrc-, sprsrc-, plxsrc-, fxsrc-, ...) are removed once cut: textures on the graphics card 4.2 GB -> 2.3 GB.
- `effects/Gore.js`: floor blood stamps are queued and painted once a frame per strip (`flushDecals` on the scene's postupdate) instead of one RenderTexture draw (and whole-strip copy) per drop.
- `view/dye.js`: dyed men share a batch until the dye changes (was a flush before and after every one).
- `view/NpcView.js drawPrompt`: the prompt's colour is set only when it changes (a Text colour change re-renders and re-uploads it).
- `main.js`: `render.powerPreference: 'high-performance'` (two-GPU laptops get the strong one).
- Results (headless, software graphics, 600 frames each): Burning Roofs slow frames 222 -> 33; Iron Gates draw calls 139 -> 75 a frame, game-logic time 10 -> 3.6 ms; village road game-logic time 44 -> 6 ms a frame. Texture uploads 5-11 a frame -> under 0.4 on every level tried. npm test passes; `campaign-sweep village --hero warrior` output identical to main (main's own fails there are pre-existing).

## Cloud, 2026-10-24 (later): PRESS ANY KEY before the logo when sound is blocked (branch claude/project-thread-raedb2)

- Nick: the music still was not on the stomp "when the game opens". On a fresh open (no click yet on that site) the browser blocks all sound, so the logo rolled muted and the title theme waited for the first key or click, long after the stomp.
- Now, when the logo's sound is blocked, `StartupIntro.js` holds on a black PRESS ANY KEY screen (`#intro-start` in index.html). The first key or click starts the logo with sound, which also unlocks the Web Audio clock, so the theme is booked on the stomp as before (measured within 0.03 s). Escape or Skip still skip. A controller button does not count as a press for the browser, so it rolls the logo silently with the old Play with sound button. On itch, the Run game click usually unlocks sound already and the screen does not show.

## Cloud, 2026-10-24: the rooftop boy, painted and acted out (on main, not on itch)

- Nick: "improve the art and animation of the kid up on the rooftop". Tam (Burning Roofs, `rescue: 'reach'`) used the shared `boy` sheet's single wave pose.
- New sheet `assets/sprites/npc/boy_roof.png` (ChatGPT on Nick's PC from the boy sheet; raw at `art-work/rooftop-boy/boy-roof-chatgpt.png` there), keyed and re-laid one pose per equal cell, feet on one line: cling, wave A, wave B, call, flinch, reach down, relief, climb down. Sheet `boy-roof` in `data/levelArt.js` (`centre: true`).
- `NpcView.drawStranded` (any `pose: 'child'` with `rescue: 'reach'`, so also Wren and Pip): waiting, he waves, shouts, clings and flinches by turns on his own beat, facing the nearest hero; a hero within 230 px he reaches down; freed, relief then climbing down the back as he fades. Tam has `freeFor: 120` (Story.js now reads a per-NPC `freeFor`) so the relief shows.
