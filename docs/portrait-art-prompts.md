# Dialogue portraits: ChatGPT / Gemini prompts

The dialogue box (`src/view/DialogueBox.js`) shows the speaker's portrait on the left.
Each portrait is a square PNG at `assets/ui/portraits/<file>.png` (any size; 512 x 512 is
plenty). Drop a file in with the name below and the game uses it on the next load. Until
then the box draws a hooded stand-in with the speaker's initial. Names and files are in
`src/data/speakers.js`.

All in (12 October 2026): `rurik`, `oryn`, `vexa` are cut from the select-screen art; every
other one was made in ChatGPT from the prompts below, four to nine to a grid (the grids are
on Nick's PC in `docs/art-refs/portraits-grid-1..4.png`, not in git) and cut apart into
256 x 256 squares. To redo one, generate it alone and drop it over its file.

## The style (paste this first, every time)

> Square bust portrait for a dark-fantasy pixel-art game's dialogue box. Head and
> shoulders, three-quarter view, facing right, looking toward the viewer. Detailed 16-bit
> style pixel art like a modern SNES-inspired RPG, painterly shading, strong rim light,
> rich but grim colours. Plain very dark background (near black, slight navy), no frame,
> no text, no border. Medieval world burned by a tyrant king; everyone looks tired, dirty
> and hard-worn.

Then add one character line:

## The people

| file | name | prompt |
|---|---|---|
| `daniel` | Daniel (the miners' foreman) | A broad, soot-blackened miner in his 40s, close-cropped dark beard, leather cap with a candle stub, rope over one shoulder, a scar through one eyebrow, determined and steady. |
| `alex` | Alex (freed from the Keep convoy) | A young man in his 20s, gaunt, rope burns on his wrists, torn linen shirt, short messy fair hair, a bruised cheek, defiant eyes. |
| `vincent` | Vincent (the reeve of the lower town) | A grey-haired town reeve in his 50s, trimmed grey beard, worn dark-green wool coat with a tarnished chain of office, singed sleeve, grief and anger in his face. |
| `mathew` | Mathew (a townsman) | A thin townsman in his 30s, hollow cheeks, brown hair tied back, patched brown tunic, a carpenter's apron, wary and astonished. |
| `irvolino` | Irvolino (the miller) | A heavy-set miller in his 40s, round face, thick black moustache, flour and soot on his face and apron, red-rimmed eyes from smoke, coughing relief. |
| `nicholas` | Nicholas, the mountain guide (Nick himself) | Painted from Nick's photo: use the prompt in `docs/nicholas-art-prompts.md` and attach the photo (project files `nick-npc/nick-photo.jpeg`). |
| `hale` | Hale the smith | A big blacksmith in his 50s, bald, thick grey beard, leather apron, burned forearms, wounded and bleeding at the shoulder. |
| `mira` | Mira | A village mother in her 30s, long dark-brown hair loose and wild, plain russet dress, ash on her face, fierce and frightened. |
| `tam` | Tam | A village boy about 10, mop of red-brown hair, soot all over his face, oversized tunic, brave grin. |
| `brann` | Elder Brann | A very old village elder, long white hair and beard, deep wrinkles, heavy wool shawl, a bloodied bandage, solemn. |
| `joren` | Joren (Mira's husband) | A farmer in his 30s, short dark hair, stubble, a rope mark round his neck, torn shirt, relief and fury. |
| `wenna` | Old Wenna | An old village woman in her 70s, white hair in a kerchief, sharp kind eyes, shawl, thin and frail. |
| `ansel` | Ansel the wheelwright | A wiry wheelwright in his 40s, sandy hair and beard, leather vest, grimacing in pain (a broken leg). |
| `tanners-boy` | The Tanner's Boy | A boy about 12, leather-stained hands, short black hair, thin face, scared but proud. |
| `pip` | Pip | A small mine boy about 9, filthy face, too-big leather cap, big eyes, a lamp chain round his neck. |
| `tobin` | Old Tobin | An old miner in his 60s, bald with a grey fringe, chained iron collar, missing teeth, tough. |
| `hilde` | Hilde | A strong miner woman in her 40s, braided blonde hair, iron collar and chain, soot, stubborn jaw. |
| `bram` | Bram | A huge young miner, shaved head, iron chains on his wrists, bruised, gentle eyes. |
| `wren` | Wren | A girl about 8, tangled brown hair, cloak too big for her, clutching a wooden toy, frightened. |

## The king's men

| file | name | prompt |
|---|---|---|
| `vaurath` | King Vaurath, the Ashen Crown | A gaunt tyrant king, pale grey skin, long dark hair, a tall black iron crown of spikes, black-and-gold plate armour, a red cape with gold embroidery, ember-glowing eyes, cold and contemptuous. |
| `malgor` | Malgor | A towering warlord in spiked black-and-gold plate, horned crowned helm with only glowing red eyes visible, menacing. |
| `varek` | Varek, the Ash Captain | A brutal captain in ash-grey gladiator armour, half-helm, burn-scarred grinning face, ash smeared on his skin, embers in the air. |
| `cinder` | Brother Cinder | A hooded penitent monk-warrior, charred rags over chain mail, face hidden in shadow but for a scorched jaw, burning censer chain. |
| `hruk` | Hruk the Hangman | A hulking executioner, black hood with eye holes, bare scarred arms, a noose over his shoulder. |
| `houndmaster` | The Houndmaster | A rangy hunter in furs and studded leather, wild grey beard, a whip coiled at his shoulder, wolfish grin. |
| `warden` | The Chain Warden | A ghoulish jailer, grey corpse skin, hollow eyes, rusted chains wrapped round his body, a ring of keys. |
| `overseer` | The Overseer | A fat mine overseer, sweat and soot, leather apron over mail, a coiled whip, cruel small eyes. |
| `orsk` | Siege Commander Orsk | A battle-scarred siege commander in heavy dented plate, wild red beard, a burning torch light on his face. |
| `messenger` | The king's messenger | A frightened young courier in black-and-red livery, mud-spattered, sweating, eyes downcast. |
| `captain` | The captain | A veteran soldier of the Ashen in a dented black helm and red tabard, grey stubble, afraid. |
