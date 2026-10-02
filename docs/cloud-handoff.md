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
