// EpilogueScene.js — THE END OF THE OATH KEEPERS (campaign level 6, the Black Keep: the
// stage's `epilogue`). Played once the Keep is won, before the tally.
//
// Two painted pictures (ChatGPT, assets/scenes/epilogue_*.png; a dark stand-in until they
// exist), drifting slowly, each with its lines in the story's box:
//   'fall'  the Black Keep falling into its own forge at dawn, the ash sky breaking
//   'home'  spring in the village, rebuilt: the people brought home standing in it, the
//           three Oath Keepers on the road, seen from behind
// Then the oath, spoken one last time, THE OATH IS KEPT, and the thanks.
// How many were brought home is read from the campaign save (progress.rescuedIds()).
// View only (nothing in the simulation waits on it): a press or a click moves it on,
// ESC skips to the end. Online, each machine plays its own and the tally waits for both.

import { SETTINGS } from '../config/settings.js';
import { FONT, epicFill } from '../view/fonts.js';
import { playMusic } from '../core/Music.js';
import { DialogueBox } from '../view/DialogueBox.js';

export const EPILOGUE_ART = { fall: 'assets/scenes/epilogue_fall.jpg', home: 'assets/scenes/epilogue_home.jpg' };

// the beats: a picture, then its lines (n: how many were brought home)
export function epilogueBeats(n = 0) {
  const home = n > 0
    ? `${n} of our people came home. They built it again, stone by stone.`
    : 'They built it again, stone by stone.';
  return [
    { pic: 'fall' },
    { who: 'VOICE', text: '(the Black Keep sliding into its own forge; the ash sky tearing open; the first dawn in years)' },
    { who: 'ORYN', text: 'Look. The sky. It\'s only a sky again.' },
    { who: 'VEXA', text: 'Every chain in that place just broke at once.' },
    { pic: 'home' },
    { who: 'VOICE', text: `(spring, in the village that burned) ${home}` },
    { who: 'VEXA', text: 'You know they\'ll want a statue.' },
    { who: 'RURIK', text: 'Let them build a wall instead. And a school.' },
    { who: 'ORYN', text: 'And if another crown comes up that road?' },
    { who: 'RURIK', text: 'Then it finds us here.' },
    { oath: true },
  ];
}

export class EpilogueScene extends Phaser.Scene {
  constructor() { super('Epilogue'); }

  init(data) {
    this.onDone = data.onDone;
    this.beats = epilogueBeats(data.rescued ?? 0);
    this.step = -1;
    this.done = false;
    this.busy = false;
  }

  preload() {
    for (const [k, file] of Object.entries(EPILOGUE_ART)) if (!this.textures.exists(`epilogue-${k}`)) this.load.image(`epilogue-${k}`, file);
    this.load.on('loaderror', () => {}); // (a picture not painted yet: its stand-in)
  }

  create() {
    const W = SETTINGS.width; const H = SETTINGS.height;
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1);
    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0);
    this.pics = this.add.container(0, 0);
    this.ui = this.add.container(0, 0);
    this.ui.add(this.add.rectangle(0, 0, W, 54, 0x000000).setOrigin(0));
    this.ui.add(this.add.rectangle(0, H, W, 54, 0x000000).setOrigin(0, 1));
    const cap = this.add.text(W / 2, 27, 'THE OATH KEEPERS', { fontFamily: FONT.display, fontSize: '22px' }).setOrigin(0.5).setStroke('#000000', 5);
    cap.setLetterSpacing?.(6);
    epicFill(cap, ['#fff4d8', '#e0b060', '#6a4010']);
    this.ui.add(cap);
    this.box = new DialogueBox(this);
    this.ui.add(this.box.root);
    this.box.setAlpha(0);
    this.end = this.add.container(0, 0).setAlpha(0);

    const k = this.input.keyboard;
    k?.on('keydown', (e) => {
      if (['Escape', 'Backspace'].includes(e.key)) this.skip();
      else if ([' ', 'Enter', 'j', 'J'].includes(e.key)) this.next();
    });
    this.input.gamepad?.on('down', (pad, button) => {
      if (button.index === 0) this.next();
      else if ([1, 8, 9].includes(button.index)) this.skip();
    });
    this.input.on('pointerdown', () => this.next());
    playMusic(this, 'warmap', { fadeIn: 2400 }); // ("14 Ending")
    this.next();
  }

  // a painted picture, drifting in slowly over the last (or its dark stand-in)
  picture(id) {
    const W = SETTINGS.width; const H = SETTINGS.height;
    const key = `epilogue-${id}`;
    let img;
    if (this.textures.exists(key)) {
      img = this.add.image(W / 2, H / 2, key);
      const s = Math.max(W / img.width, H / img.height) * 1.08;
      img.setScale(s);
      this.tweens.add({ targets: img, scale: s * 1.06, x: W / 2 + (id === 'fall' ? -20 : 20), duration: 26000, ease: 'Sine.easeInOut' });
    } else {
      img = this.add.graphics();
      const [top, low] = id === 'fall' ? [0x1a1018, 0x6a3a28] : [0x2a3a4a, 0x8a7a50];
      img.fillGradientStyle(top, top, low, low, 1).fillRect(0, 0, W, H);
    }
    img.setAlpha(0);
    this.pics.add(img);
    this.busy = true;
    this.box.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 1400, onComplete: () => { this.busy = false; this.next(); } });
  }

  say(who, text) {
    this.tweens.killTweensOf(this.box.root);
    this.box.show(who, text, 'full', 'CLICK / SPACE  next      ESC  skip').setAlpha(0);
    this.tweens.add({ targets: this.box.root, alpha: 1, duration: 250 });
  }

  next() {
    if (this.done || this.busy) return;
    if (this.oathShown) { this.finish(); return; }
    this.step++;
    const b = this.beats[this.step];
    if (!b) { this.oath(); return; }
    if (b.pic) { this.picture(b.pic); return; }
    if (b.oath) { this.oath(); return; }
    this.say(b.who, b.text);
  }

  skip() { if (!this.oathShown) { this.step = this.beats.length; this.oath(); } else this.finish(); }

  // the oath, one last time, and the end
  oath() {
    if (this.oathShown) return;
    this.oathShown = true;
    this.busy = true;
    const W = SETTINGS.width; const H = SETTINGS.height;
    this.tweens.add({ targets: this.box.root, alpha: 0, duration: 400 });
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0);
    const lines = ['We stand for our people.', 'We stand for our home.'];
    const said = lines.map((l, i) => this.add.text(W / 2, H * 0.34 + i * 40, l, { fontFamily: FONT.display, fontSize: '26px', color: '#f0e6d0' }).setOrigin(0.5).setStroke('#000000', 5).setAlpha(0));
    const title = this.add.text(W / 2, H * 0.56, 'THE OATH IS KEPT', { fontFamily: FONT.display, fontSize: '46px' }).setOrigin(0.5).setStroke('#000000', 7).setAlpha(0);
    title.setLetterSpacing?.(8);
    epicFill(title, ['#fff4d8', '#e0b060', '#6a4010']);
    const thanks = this.add.text(W / 2, H * 0.72, 'THANK YOU FOR PLAYING  ·  BLOOD AXE: OATH OF VENGEANCE', { fontFamily: FONT.display, fontSize: '16px', color: '#c8b890' }).setOrigin(0.5).setStroke('#000000', 4).setAlpha(0);
    this.end.add([shade, ...said, title, thanks]);
    this.end.setAlpha(1);
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 0.55, duration: 900 });
    said.forEach((t, i) => this.tweens.add({ targets: t, alpha: 1, delay: 700 + i * 1300, duration: 900 }));
    this.tweens.add({ targets: title, alpha: 1, delay: 3600, duration: 1400 });
    this.tweens.add({ targets: thanks, alpha: 1, delay: 5200, duration: 1200, onComplete: () => { this.busy = false; } });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const cb = this.onDone;
      this.scene.stop();
      cb?.();
    });
  }
}
