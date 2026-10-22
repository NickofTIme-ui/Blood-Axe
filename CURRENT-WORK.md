# Resumed October 20, 2026

Nick explicitly resumed the paused work. The older WORK-PAUSED-2026-10-20.md is historical context, not a current pause instruction.

## Completed now: Irvolino mill rescue

- Real mill-platform encounter, 25-second operating countdown beginning with the mill fight. Interruption/knockback stops lever progress until the hangman returns. A newly painted eight-pose lever sequence replaces the rejected empty-hand swing; grip is drawn around the handle, with frames anchored to one pivot. Separate scaffold art no longer contains a duplicate lever.
- Hangman is prepositioned, killable, and uses fresh executioner strips. Kill stops the timer; a melee weapon hit at the elevated bonds frees Irvolino. Rescue/recovery animation plays before he leaves. Do not revert this to automatic rescue on kill.
- Failure plays trapdoor/drop/rope-catch/body sway. Hangman then joins combat. Irvolino remains lost. Elsbeth is a separate saved NPC identity, replaces him in vigil/mourning/procession, has her own portrait/dialogue, and a new procession sheet replaces Irvolino with her beside Hale. The other barn villagers remain a distinct rescue.
- Existing Hakon/father/sword dialogue and pacing preserved; one conditional Elsbeth line occupies Irvolino's response slot only on failure.
- F8 test navigator has both mill rescue and trapdoor-failure shortcuts. Cinder test shortcut resolves the rescue first to isolate his encounter.
- New sources: src/stage/MillRescue.js, src/view/MillRescueView.js, src/view/MillHangingArt.js. Art: assets/npcs/mill-rescue. Built-in image generation prompts: art/mill-rescue/integration-prompts.json. Updated standalone animation: art/mill-rescue/irvolino-hanging-preview.gif.
- 21 test scripts pass. New tests cover timer start/holds, kill stopping timer, actual bond collision height, irreversible failure, replacement identity, retry reset, and Elsbeth entering the church without dead Irvolino returning. Existing route fixtures explicitly resolve the new mandatory interaction; dedicated rescue tests cover its mechanics.
- Hidden Chrome check booted real game, captured live encounter/failure/rescue, verified a real attack cuts bonds and failure activates Elsbeth, and reported zero JavaScript errors. Script: tools/check-mill-browser.mjs; screenshots: art/mill-rescue/live-check. Minor final carrier crossfade fix verified with church and rescue tests.
- Accessible launcher remains C:/Users/nickr/Documents/Codex/Blood Axe Builds/Play Blood Axe.cmd. Check latest.json for most recent dated build; earlier builds preserved.

## Completed: three main characters HD integration

All three approved hero identities now use the new painted gameplay art. Production compilation covers 99 unique sheets / 640 poses, with 89 runtime strips plus Rurik's packed base atlas. Both old-sword and Oathkeeper variants include the new wide cross, return, and overhead combo. Original attack timing, hitboxes, stats, approved blood, and father dialogue remain unchanged.

HD atlas loader preserves logical character size and foot anchors. New sword landmarks drive trails; wider/taller combo frames prevent blade cropping. Rurik's finImpale pose 7 leg/grips repaired. Oryn remains electric and Vexa retains her red hair, purple cloak and curved daggers. Character selection uses approved HD masters.

Hidden Chrome verifies all three live heroes use new textures at resolution 2 and reports zero JavaScript errors. Live captures: art/hero-refresh/hd-review/live. All 22 test scripts pass, including new real-atlas/runtime-animation-reference checks. Build refreshed with tools/build-local.ps1; accessible launcher remains in Blood Axe Builds. Original game untouched.

Supplied AudioElk roll clip now plays for Rurik and Vexa, normalized with short fades; other roll sounds unchanged.
## First-level polish — October 20 evening

- Varek execution equipment is separated from the kneeling body before the neck cut; each piece tumbles/bounces and settles flat independently. Actual hidden-browser check confirms two landed equipment pieces, near-zero final rotation/spin, no errors. Source gear masks are imported-frame coordinates.
- Oryn idle holds one stable painted pose with a continuous five-second, 4.4px peak-to-peak hover, very small sway and softer cloth ripple. Removed idle pose cycling/scale pulsing; hover clock follows simulation ticks rather than monitor refresh.
- Gallows replaced with straight front-elevation art, true alpha, level beam/deck, no duplicate stairs/legs. Rope/hatch/captive aligned to new deck. Actual rescue and failure branches pass. Resolved mill scene stops redundant canvas uploads after settling; offscreen culling retained.
- Archer bow WAVs boosted with controlled peaks; clear lead release and quieter staggered layers, four-voice cap. Originals retained. Full suite now 24 scripts, all passing.
