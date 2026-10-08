# Blood Axe: Oath of Vengeance

A gritty side-scrolling fantasy brawler inspired by Golden Axe, built with Phaser 3 and
plain JavaScript: one test arena, three playable classes, six named bad guys (plus grunts)
with their own weapons and movesets, full dismemberment gore, music, and a full combat core.

---

## How to play it (Windows)

1. Open the `blood-axe` folder (in your Documents).
2. **Double-click `start-game.bat`.**
   - A black window opens. That's the tiny local web server — leave it open.
   - The very first time, it downloads the Phaser game engine (needs internet once).
   - Your web browser opens the game automatically.
3. To stop: close the black window.

If Windows shows a blue "Windows protected your PC" box, click **More info → Run anyway**
(it's just the start script). If the browser doesn't open, go to `http://localhost:8123`.

**Why not just double-click `index.html`?** Browsers block modern JavaScript modules
from files opened directly, so the game needs that little server.

**After editing a file:** just refresh the browser page (F5). No restart needed.

---

## Controls

| Action | Keyboard | Gamepad (Xbox layout) |
|---|---|---|
| Move (left/right + up/down on the floor) | WASD or Arrow keys | Left stick (the D-pad no longer moves you: it's for moves) |
| Rurik's **Whirlwind Cleave** (360 swing; skill: Executioner's Arc) | H | D-pad Down |
| Light attack (tap 3× for combo) | J | X |
| Heavy attack (breaks guard) | K | Y |
| **Sparta kick** (breaks blocks & shields, sends them bowling into others) | O | RB |
| Block (hold) / **Parry** (tap just before a hit) | L | RT |
| Turn your guard while blocking | ← / → while holding block | stick while holding RT |
| Dodge roll (invincible at the start; up/down rolls into or out of the screen) | Shift or I (+ direction) | B |
| Magic | U | LB or LT |
| Jump (Rogue: press again for double jump) | Space | A |
| Attack while jumping | J in the air | X in the air |
| Debug overlay (hitboxes, states, frames) | F2 or ` | — |
| Gore level (FULL → OFF → LOW) | G | — |
| Music on/off | M | — |
| Spawn an enemy next to you (testing) | 1–6 = the six bad guys, 7 = grunt | — |
| Clear all enemies (also stops new waves) | 0 | — |
| Waves on/off | 9 | — |
| Restart | R | Start |
| Character select | Esc | Back/View |

Rebind anything in `src/config/controls.js`.

### The three heroes play differently

The table above is **Rurik's** kit. The Mage and the Rogue use the same buttons for their own moves:

| Button | Rurik (Warrior) | Oryn (Mage) | Vexa (Rogue) |
|---|---|---|---|
| Light (J) | 3-hit sword combo | 3-hit staff combo (the 3rd lets out a pressure pulse) | 4-hit dagger combo (the 4th **exposes** the target) |
| Heavy (K) | Cleave | **Chain Lightning**: leaps from body to body; hold to overcharge | **Viper Strike**: bursts through up to 3 men; exposes |
| Kick (O) | Sparta kick | **Force Blast**: a cone of force that hurls men back | Crescent kick; **down + O** = sweep; nobody close = **throwing knife** |
| Dodge (Shift / I) | Roll | **Blink**: teleport | Acrobatic evade. Slip a blow at the last instant (**Shadow Window**) and your next hit exposes that man |
| Magic (U) | Firebolt | **Arcane Barrier**: tap = Infernal Wall (fire), hold = Earthen Bulwark (stone) | **Widow Mine**: dropped without stopping (2 at once) |
| Jump (Space) | Jump | Levitate | Jump / double jump. Run at a teammate and jump to **Ally Vault** off him |
| In the air | J: air slash | J: staff chop | J: slash, **O: Shuriken Fan** (at the top of a vault: **Death From Above**), **K: Falling Viper** |

**Exposed** (violet-red mark over his head): every player does +25% damage to him for 5 seconds.
**Barriers** stop only enemies: allies walk, blink and shoot straight through them. Enemies wait at a wall; brutes can batter the stone one down.
**Finishers** behind a fleeing enemy: Rurik = throat (tap J), impale (hold J), halve (K), chain (O or 2+ runners).
The Mage = Storm Judgment (J), Arcane Rupture (K), Gate of Embers (O). The Rogue = Phantom Requiem (J), Black Lotus (K), Scarlet Sky (O).
The Mage's and the Rogue's finishers take one, two or three runners at once.

All their numbers are in `src/data/characters.js` (each hero's `kit` block).

### Combat tips
- **Combos:** J, J, J. Press J again while the previous swing is still finishing — early presses are buffered.
- **Light into heavy:** J then K chains into the heavy.
- **Cancel:** you can dodge or block out of the end of most attacks (windows are set per move).
- **Parry:** tap L right as an enemy's swing lands. The enemy staggers and your next hit is a **COUNTER** (+50% damage).
- **Block** drains stamina. At zero stamina — or when hit by a heavy — your **guard breaks**.
- **Heavy wind-up** flashes orange so you can read it (and dodge or parry it).

---

## THE CAMPAIGN: THE OATH KEEPERS (new, levels 1 and 2 of 6)

Pick **CAMPAIGN: THE BURNING VILLAGE** on the title screen. Rurik, Oryn and Vexa come home
from the ford to find their village burning. Save who you can (the family at the well, the
people in the barn, a boy on a burning roof), break the rear guard, kill the Ash Captain,
make the vow at the north gate, and walk out after the prisoners. Then a first look at
King Vaurath in the Black Keep.

When the tally is up, **Enter** goes on to level 2, **GALLOWS WOOD**: the convoy's road
through the pines. Cut Joren down from the hanging tree before the rope runs out, open the
cages on the broken carts, walk Ansel across the ford through an ambush, and kill the
Houndmaster (he calls his pack, then goes into a frenzy). The pass is buried; the way on is
the mine (level 3, not built yet).

- **E** (keyboard) or **D-pad up** (pad) is INTERACT: hold it at a cage's lock, press it
  to talk to someone who has something to say.
- Lines of dialogue play at the top of the screen. During a held scene (the opening, the
  vow) everyone stands still: **Space / J** moves to the next line.
- Burning carts flare up after they glow; burning beams fall where their shadow grows.
- The saved villagers are kept in your save: they wait at the end of the level, and later
  levels remember them. Someone you were too slow for is lost (no score, just a missing
  face). Dying puts the section back as it was, rope and all.
- **CONTINUE** on the title starts the campaign at the last checkpoint (every section).
- Oryn has a skill tree now: **THE STORMCALLER** (Forked Bolt, Static Charge, Thunderhead).
  His other two branches are shown as planned.
- Everything new in these levels is temporary art (drawn in code).

The whole plan (six levels, the king, the final battle, Rurik's judgment):
`docs/campaign/plan.md`; what's built so far: `docs/campaign/checklist.md`.

## THE GALLOWS ASCENT (new: platforming and skill trees)

Pick **THE GALLOWS ASCENT (NEW)** on the title screen. A night climb with ledges, pits, a
moving gibbet cage, rotten planks that give way, a secret ledge and an optional bell fight.

- **Tap jump for a short hop, hold it for a full jump** (this works everywhere now).
- Fall into a pit: you're back on the last firm ground, a little hurt. Enemies don't come back:
  kick them in.
- Kills give **blood** (experience): levels and milestones give **skill points**.
- At a **blood altar** (rest shrine) you're healed; **stand still** at it to kneel and open
  the skill tree (arrows / D-pad, J / Enter / A take, R / Y respec for free; Esc, B or Backspace — or B / Back / Start on a pad,
  or click the button — goes back to the fight).
  Rurik's tree is in; Oryn's and Vexa's come next.

Design, who-can-reach-what and the playtest checklist: `docs/gallows-ascent.md`. The rules
of progression: `docs/progression.md`. All of the slice's art is temporary:
`docs/gallows-art-needed.md` lists what to paint.

## The bad guys

| Key | Name | Weapon | Moveset |
|---|---|---|---|
| 1 | **Gorrak the Flayer** | Cleaver + chained meat hook | Hack → Backhand Hack, *Butcher's Block* overhead (breaks guard), **Meat Hook** yanks you in from range |
| 2 | **Sliv the Hollow** | Twin daggers + chain-sickle | Poke → Poke → Gut Stab 3-hit combo, *Lunging Shank* dive, **Chain Sickle** whipped out at range |
| 3 | **The Iron Penitent** | Spiked ball on a long chain | Flail Swing → Return Swing (huge reach), *Penance* overhead crash (quake, can't be interrupted), **Chain Storm** spin that hits both sides |
| 4 | **Vorn Skullsplitter** | Great cleaver-axe | Hack → Rising Hack → Skull Splitter, *Headsman* overhead, **Berserk Rush** unstoppable charge |
| 5 | **Grubb Rotchain** | Rusty knife + chain mace | Knife slash → Chain Mace swing, *Skull Crusher* slam, **Mace Whirl** while stalking forward |
| 6 | **Pitlord Kragg** | Spiked mace + spiked shield | Blocks a lot. Mace Bash → Uppercut launcher, *Crowd Breaker* overhead, **Shield Rush** charge |

Orange flashing = a heavy or unstoppable move is winding up. Waves mix them in (see `WAVES` in `data/enemies.js`).

## Gore

Kills tear enemies apart based on **what hit them and how hard** (`combat/Fatality.js`):

| Your attack | Cut type | What happens |
|---|---|---|
| Rurik light 1–2, Rogue attacks | slash | heads and limbs off; high hits decapitate |
| Rurik light 3 | cleave | cut in half at the waist |
| Rurik heavy / air attack | chop | split down the middle, or beheaded |
| Mage staff | blunt | skulls burst |
| Fireball / Earth Shatter | fire / crush | blown to pieces |

Weak finishing blows lop off a limb; strong ones (heavies, counters, overkill) split and explode.
Big blade hits can also cut an arm off a **living** enemy: lose the shield arm and Kragg can't block
or shield-rush; lose the weapon arm and they're swinging a bloody stump for 40% damage.
Pieces bounce, spray from their stumps, and stay on the floor for a while. **G** cycles FULL / LOW / OFF.

**Enemy art** comes from ChatGPT-made *parts sheets* in `assets/enemies/` (one PNG per enemy,
every body part drawn separately on magenta). `src/data/enemyParts.js` says where each part is on
its sheet; the game cuts them out at startup. That separation is what lets enemies come apart.
Any part missing from a sheet falls back to the code-painted version in `view/enemyArt.js`.
Prompts and progress notes: `tools/enemy-parts/`.

## Music

`assets/audio/title-the-battle.mp3` plays on the title / character select screen,
`assets/audio/gameplay-battle-field.mp3` in battle. Volume: `audio.music` in `config/settings.js`.

Sound effects (`assets/audio/sfx/`, list in `src/core/Sfx.js`, volume `audio.sfx`):
block clang on blocks / parries / guard breaks, swoosh when a light swing misses, a slice on the
2nd and 3rd combo swings, an extra swing sound mixed in at random, and a distant sword clash
mixed low now and then when the fight gets busy. The Mage's lightning (`elec-*.wav`) is
synthesised by `tools/sfx-gen/electric.js`, so it is ours outright.

## HUD

Knight-armour health / stamina / magic bars (top-left) come from the ChatGPT artwork
`assets/ui/hud-source.png`, cut up at startup by `src/view/hudArt.js`. Enemy names and health
sit in a strip along the bottom; call-outs (WAVE, DECAPITATED!, STRIKE!...) appear in a banner
at the top. Nothing is written over the fighters.

---

## Folder guide

```
blood-axe/
├── start-game.bat          double-click to play
├── index.html              the web page that loads the game
├── README.md               this file
├── lib/phaser.min.js       game engine (downloaded on first start)
├── assets/sprites/         sprite sheets (ulric.png + ulric.json)
├── tools/serve.ps1         the tiny local web server
├── tools/sprite-gen/       script that generates Rurik's pixel-art sheet
├── tests/logic-test.js     automated combat checks (optional, needs Node.js)
└── src/
    ├── main.js             starts Phaser, lists the scenes
    ├── config/
    │   ├── settings.js     screen/arena size, game-feel timings, gore, debug
    │   └── controls.js     key + gamepad bindings
    ├── data/
    │   ├── characters.js   Warrior / Mage / Rogue stats + frame data   <-- balance here
    │   ├── sprites.js      which sprite sheets to load
    │   └── enemies.js      enemy stats, moves and AI tuning
    ├── core/
    │   ├── Controller.js   abstract controller + input buffer
    │   ├── InputManager.js keyboard/gamepad -> actions
    │   ├── StateMachine.js generic state machine
    │   ├── World.js        the combat simulation (fixed 60 fps)
    │   └── EventBus.js     events like 'hit' / 'kill' for effects to react to
    ├── combat/
    │   ├── Boxes.js        hitbox / hurtbox maths (with depth)
    │   ├── MoveRunner.js   startup / active / recovery helpers
    │   └── CombatSystem.js parry, block, guard break, damage, knockback, hitstop
    ├── entities/
    │   ├── Fighter.js      shared base for players and enemies
    │   ├── fighterStates.js every state: idle, walk, jump, attacks, block, parry, dodge, cast, hitstun, knockdown, getup, dead…
    │   ├── Player.js       creates a player fighter
    │   ├── Enemy.js        creates enemies + the AI brain
    │   └── Projectile.js   spells
    ├── effects/
    │   ├── Gore.js         blood bursts, floor splatter, finishers, dismember hook
    │   └── CameraFX.js     screen shake
    ├── view/               ALL the drawing
    │   ├── FighterView.js        placeholder shapes
    │   ├── SpriteFighterView.js  real sprite sheets (Rurik)
    │   ├── ProjectileView.js
    │   ├── DebugDraw.js
    │   └── depths.js
    └── scenes/
        ├── BootScene.js    creates textures / will load art
        ├── SelectScene.js  character select
        ├── ArenaScene.js   the test level, waves, camera, effects
        └── HUDScene.js     health / stamina / mana bars
```

### How the pieces fit
- **Game logic never draws, and art never decides gameplay.** `World` runs fighters and
  combat; `view/` just reads fighter state and draws it. Swapping rectangles for sprites
  only touches `view/FighterView.js` (and loading art in `BootScene.js`).
- **Players and enemies are the same `Fighter`.** The only difference is the controller:
  keyboard for the player, an AI "brain" for enemies. Same states, same rules.
- **All timings are in frames at 60 fps** (6 frames = 0.1 s), so the debug overlay's
  numbers match the data files exactly.

---

## Common tweaks

| I want to… | Edit |
|---|---|
| Make the Warrior hit harder | `meleeMult` or a move's `damage` in `data/characters.js` |
| Make an attack faster | lower its `startup` / `recovery` |
| Make hits feel heavier | raise a move's `hitstop` and `shake` |
| Easier/harder parries | `parryWindow` per character |
| Longer dodge invincibility | `dodge.iframes` |
| More forgiving button timing | `inputBufferFrames` in `config/settings.js` |
| Smarter/aggressive enemies | the `ai` block in `data/enemies.js` |
| Tone down gore by default | `gore.level` in `config/settings.js` (0 = off) |
| Add a character | copy a block in `data/characters.js`, give it a new id — it appears on the select screen |

---

## Optional: run the automated combat tests
If you install Node.js (nodejs.org), open a terminal in this folder and run
`node tests/logic-test.js`. It checks combos, buffering, blocking, parrying,
guard breaks, dodging, spells, double jump, kills and enemy AI.

---

## Sprites
Rurik (the Warrior) uses a pixel-art sprite sheet: `assets/sprites/ulric.png`, with
`assets/sprites/ulric.json` describing frame size and which frames make each animation.
Attack animations follow the move's frame data, so the swing you see always lines up with
the hitbox. To give another character a sprite, add a sheet to `src/data/sprites.js` and set
`sprite: '<key>'` on that character in `data/characters.js`. Remove the `sprite` line to go
back to placeholder shapes.
