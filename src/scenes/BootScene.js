// BootScene.js — Runs first. Loads sprite sheets (listed in data/sprites.js) and
// creates the tiny placeholder textures used for blood and particles.

import { PORTRAIT_IDS } from '../data/speakers.js';
import { SPRITES } from '../data/sprites.js';
import { SETTINGS } from '../config/settings.js';
import { MUSIC } from '../core/Music.js';
import { SFX } from '../core/Sfx.js';
import { buildEnemyArt, preloadEnemyOverrides } from '../view/enemyArt.js';
import { CHARACTER_STRIPS, ANIM_OVERRIDES, FX_STRIPS } from '../data/spriteStrips.js';
import { importFxStrip, paletteFrom, FX, FRAME } from '../view/stripImporter.js';
import { cutStrip } from '../view/stripCache.js';
import { ENEMY_STRIPS, ENEMY_ANIMS, LOOKS, scaredAnims } from '../data/enemyStrips.js';
import { HERO_STRIPS, HERO_ANIMS } from '../data/heroStrips.js';
import { ENEMIES } from '../data/enemies.js';
import { CHARACTERS } from '../data/characters.js';
import { HUD_SRC, buildHudArt } from '../view/hudArt.js';
import { preloadGrounds, buildGrounds, buildSky, buildPillars, buildParallax } from '../view/envArt.js';
import { PARALLAX_LAYERS } from '../data/parallax.js';
import { preloadLevelArt, buildLevelArt, isLevelArtKey } from '../view/levelArt.js';
import { warmGore } from '../effects/goreArt.js';
import { introFinished } from '../core/StartupIntro.js';
import {HERO_HD} from '../data/heroHdAssets.js';
import {preloadHeroHd,installHeroHd} from '../view/heroHd.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    preloadHeroHd(this);
    for(const name of ['gallows','mechanisms','irvolino-bound','executioner-actions','executioner-lever','irvolino-rescue'])this.load.image(`mill-${name}`,`assets/npcs/mill-rescue/${name}.png`);
    this.load.image('pause-frame','assets/ui/pause-frame.png');
    this.load.image('blood-ink-sheet','assets/fx/blood-ink-sheet.png');
    this.load.image('rurik-oathkeeper-raised','assets/cinematics/rurik-oathkeeper-raised.png');
    this.load.image('hakon-farewell','assets/cinematics/church-hakon-farewell-somber.png');
    this.load.image('hakon-last-breath','assets/cinematics/church-hakon-last-breath-somber.png');
    this.load.image('hakon-dying','assets/cinematics/hakon-dying.png');
    this.load.image('hakon-mourned','assets/cinematics/church-hakon-mourned-somber.png');
    this.load.image('hakon-dead','assets/cinematics/hakon-dead.png');
    this.load.image('town-church','assets/env/village/town-church.png');
    this.load.image('church-bearers-src','assets/npcs/church-bearers.png');
    this.load.image('church-bearers-elsbeth-src','assets/npcs/mill-rescue/church-bearers-elsbeth.png');
    this.cameras.main.setOrigin(0, 0).setZoom(SETTINGS.renderScale ?? 1); // draw at full resolution
    for (const [key, s] of Object.entries(SPRITES)) {
      this.load.image(key, HERO_HD.base.file);
      this.load.json(`${key}-data`, s.data);
    }
    for (const [key, file] of Object.entries(MUSIC)) this.load.audio(key, file);
    for (const [key, file] of Object.entries(SFX)) this.load.audio(key, file);
    preloadEnemyOverrides(this);
    this.load.image('shrine-oath-src', 'assets/env/shrine_oath.png'); // the painted oath shrine (view/TerrainView.js drawRests)
    this.load.image('water-src', 'assets/env/water.png'); // the painted stream (view/TerrainView.js drawPits)
    this.load.image('cage-src', 'assets/env/cage.png'); // the painted cage (view/NpcView.js drawCaptive)
    this.load.image('arrow-src', 'assets/fx/arrow.png'); // the painted Ashen war arrow, cut out (view/StageView.js 'arrow-fly')
    this.load.image('lantern-src', 'assets/env/lantern.png'); // the painted lantern post (view/TerrainView.js drawLanterns)
    // the Burning Village's torch posts and the mill's raised floor (view/TerrainView.js; until
    // they're painted, docs/level1-art-prompts.md, both are drawn in code)
    this.load.image('village-torch-src', 'assets/env/village/torch.png');
    this.load.image('village-mill-src', 'assets/env/village/mill_floor.png');
    this.load.image('gates-brazier-src', 'assets/env/gates/brazier.png');
    this.load.image('keep-hall', 'assets/env/keep_hall.png'); // the Black Keep's throne room (scenes/CutawayScene.js)
    this.load.image('bridge-log-src', 'assets/env/bridge_log.png'); // the painted log bridge (view/TerrainView.js drawBlock)
    this.load.image('bodies-src', 'assets/env/bodies.png'); // the painted fallen villagers (view/NpcView.js drawBodies)
    this.load.spritesheet('stable-master', 'assets/npcs/stable-master-frames.png',{frameWidth:338,frameHeight:240});
    this.load.image('gore-painted-atlas','assets/fx/gore-painted-atlas.png');
    this.load.image('rubble-wall-src', 'assets/env/mine/rubble_wall.png'); // the cave's boulder wall (view/TerrainView.js drawRubble)
    this.load.image('collapse-wall-src', 'assets/env/mine/collapse_wall.png'); // the mine's spike chase: the wall's face (view/StageView.js paintedCollapse)
    this.load.image('collapse-spikes-src', 'assets/env/mine/collapse_spikes.png'); // ...and its six spikes
    this.load.image('rockfall-src', 'assets/env/mine/rockfall.png'); // the falling rock: the slab and its heap (view/StageView.js paintedRockfall)
    for (const [name, s] of Object.entries(FX_STRIPS)) this.load.image(`fxsrc-${name}`, s.file);
    for (const [id, strips] of Object.entries(ENEMY_STRIPS)) {
      for (const [name, s] of Object.entries(strips)) this.load.image(`estrip-${id}-${name}`, s.file);
    }
    this.load.image('sprite-palette', 'tools/sprite-pipeline/palette.png');
    this.load.image('hud-src', HUD_SRC);
    this.load.image('cover', 'assets/ui/cover.jpg'); // title screen (scenes/TitleScene.js)
    // character select (scenes/SelectScene.js): the cathedral, and each hero's full-body art
    this.load.image('select-bg', 'assets/ui/select-bg.jpg');
    for (const id of Object.keys(CHARACTERS)) this.load.image(`hero-src-${id}`, `assets/ui/hero-${id}-hd.png`);
    this.load.image('oathkeeper-art', 'assets/ui/oathkeeper.png'); // Rurik's blade, painted (the skill screen's lore page)
    this.load.image('props-hd-src', 'assets/env/props-hd.png'); // the breakables, repainted
    this.load.image('props-src', 'assets/env/props.png'); // painted props & traps (view/propSheet.js)
    this.load.image('pickups-hd-src', 'assets/env/pickups-hd.png'); // the pickups, repainted (until then: cut from props.png)
    preloadGrounds(this);
    // the layered backdrop (data/parallax.js): any layer not painted yet simply isn't there
    for (const L of PARALLAX_LAYERS) this.load.image(`plxsrc-${L.name}`, `assets/env/parallax/${L.file}`);
    preloadLevelArt(this); // (the campaign levels' painted art: data/levelArt.js)
    this.load.image('king-vaurath', 'assets/enemies/king_vaurath_stand.png'); // the king in his cutaways (scenes/CutawayScene.js)
    // the speakers' portraits for the dialogue box (data/speakers.js; one not painted yet gets a stand-in)
    for (const id of PORTRAIT_IDS) this.load.image(`portrait-${id}`, `assets/ui/portraits/${id}.png`);
    this.load.on('loaderror', (file) => { if (!file.key?.startsWith('plxsrc-') && !file.key?.startsWith('portrait-') && !isLevelArtKey(file.key) && file.key !== 'boss' && file.key !== 'fxsrc-earthwall' && !['pickups-hd-src', 'village-torch-src', 'village-mill-src', 'gates-brazier-src'].includes(file.key)) console.warn(`[boot] Could not load ${file.src}`); }); // (unpainted backdrop layers are expected)

    const bar = this.add.rectangle(480 - 150, 270, 0, 6, 0xc0161c).setOrigin(0, 0.5);
    this.add.rectangle(480, 270, 304, 10).setStrokeStyle(1, 0x5a3030);
    this.load.on('progress', (v) => { bar.width = 300 * v; });
  }

  create() {
    // Hakon's dialogue portrait is the face from his new character painting.
    if(this.textures.exists('hakon-dying')) {
      const src=this.textures.get('hakon-dying').getSourceImage();
      const c=document.createElement('canvas');c.width=c.height=128;
      const ctx=c.getContext('2d');ctx.fillStyle='#151116';ctx.fillRect(0,0,128,128);
      const side=src.height*0.34;
      ctx.drawImage(src,src.width*0.34,src.height*0.02,side,side,0,0,128,128);
      if(this.textures.exists('portrait-hakon'))this.textures.remove('portrait-hakon');
      this.textures.addCanvas('portrait-hakon',c);
    }
    // Slice each sheet into frames named f0, f1, f2... and keep pixels crisp.
    for (const key of Object.keys(SPRITES)) {
      const meta = this.cache.json.get(`${key}-data`);
      if (!meta || !this.textures.exists(key)) continue;
      const tex = this.textures.get(key);
      meta.visualRes=HERO_HD.res;
      const fw=meta.frameWidth*HERO_HD.res,fh=meta.frameHeight*HERO_HD.res;
      const cols = Math.floor(tex.source[0].width / fw);
      for (let i = 0; i < meta.frameCount; i++) {
        tex.add(`f${i}`, 0, (i % cols) * fw, Math.floor(i / cols) * fh,fw,fh);
      }
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('dot', 8, 8); // round particle / blood drop
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('px', 4, 4);  // square chunk
    g.destroy();

    buildEnemyArt(this); // paint every enemy's body parts (view/enemyArt.js)
    warmGore(this);      // pre-paint wounds, bones and organs (effects/goreArt.js)
    this.finish();
  }

  // The slow part — cutting the sprite strips — runs a strip at a time with a progress
  // bar, so the screen never just freezes; cut sheets are kept between visits
  // (view/stripCache.js), so it's only slow the first time.
  async finish() {
    const t0 = performance.now();
    this.cutTotal = [...Object.values(CHARACTER_STRIPS), ...Object.values(ENEMY_STRIPS), ...Object.values(HERO_STRIPS).map((h) => h.strips)].reduce((n, s) => n + Object.keys(s).length, 0);
    this.cutDone = 0;
    this.cutFresh = 0;
    this.add.rectangle(480, 300, 304, 10).setStrokeStyle(1, 0x5a3030);
    this.cutBar = this.add.rectangle(480 - 150, 300, 0, 6, 0xe0a030).setOrigin(0, 0.5);
    this.cutText = this.add.text(480, 322, 'Sharpening the blades…', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#b8a890' }).setOrigin(0.5, 0);
    try {
      await this.buildStrips();
    } catch (err) {
      console.warn('[boot] strips failed', err);
    }
    console.info(`[boot] sprite strips ready in ${Math.round(performance.now() - t0)} ms (${this.cutFresh} cut, ${this.cutDone - this.cutFresh} from cache)`);
    if (!this.sys.isActive()) return;
    buildHudArt(this, 0.19, SETTINGS.renderScale ?? 1); // knight-armour bars (view/hudArt.js)
    this.registry.set('grounds', buildGrounds(this));    // high-res floor options (view/envArt.js)
    this.registry.set('sky', buildSky(this));
    this.registry.set('pillars', buildPillars(this));
    this.registry.set('parallax', buildParallax(this, PARALLAX_LAYERS));
    this.registry.set('levelArt', buildLevelArt(this));
    this.buildHeroArt();

    await introFinished; // the opening cinematic crossfades into the title (core/StartupIntro.js)
    if (this.sys.isActive()) this.scene.start('Title');
  }

  // One strip: from the cache if it's there, else cut now. Lets the screen redraw between
  // fresh cuts so the bar moves.
  async cut(img, spec, palette) {
    const out = await cutStrip(img, spec, palette);
    this.cutDone++;
    if (!out.cached) {
      this.cutFresh++;
      this.cutBar.width = 300 * Math.min(1, this.cutDone / this.cutTotal);
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  }

  // Character-select hero art: painted on black, cut out and trimmed to the figure here
  // (texture `hero-<id>`, drawn at half scale for crispness). Missing art = no texture.
  buildHeroArt() {
    for (const id of Object.keys(CHARACTERS)) {
      const key = `hero-src-${id}`;
      if (!this.textures.exists(key)) continue;
      try {
        const { canvas } = importFxStrip(this.textures.get(key).getSourceImage(), { frames: 1, height: 400 });
        if (this.textures.exists(`hero-${id}`)) this.textures.remove(`hero-${id}`);
        this.textures.addCanvas(`hero-${id}`, canvas);
      } catch (err) {
        console.warn(`[boot] hero art ${id} failed`, err);
      }
    }
  }

  // Named enemies' sprite strips (data/enemyStrips.js), cut at twice the detail. An
  // enemy gets a sheet once all its strips are in; until then it keeps the paper doll.
  // Returns { id: { key, anims, res, fw, fh, ax, ay } }.
  async buildEnemyStrips(src) {
    const RES = 2;
    const sheets = {};
    for (const [id, strips] of Object.entries(ENEMY_STRIPS)) {
      const E = ENEMIES[id] ?? ENEMIES[LOOKS[id]]; // (a boss's own look: his kind's size)
      const target = Math.round((E?.body.h ?? 110) * 1.07); // Ulric: 108 body -> 116 art
      const cell = E?.cell ?? 1;
      const have = new Set();
      let fw = 0; let fh = 0;
      for (const [name, s] of Object.entries(strips)) {
        const img = src(`estrip-${id}-${name}`);
        if (!img) continue;
        try {
          // (cell: an outsize enemy's frames are cut that many times the usual size, at
          //  the same detail per pixel, so he fits his frame and stays as sharp as the rest)
          const out = await this.cut(img, { target: target / cell, ...s, res: RES * cell }, null);
          const tk = `enemy-${id}-${name}`;
          if (this.textures.exists(tk)) this.textures.remove(tk);
          const tex = this.textures.addCanvas(tk, out.canvas);
          for (let i = 0; i < out.count; i++) tex.add(`f${i}`, 0, i * out.fw, 0, out.fw, out.fh);
          fw = out.fw; fh = out.fh;
          have.add(name);
        } catch (err) {
          console.warn(`[boot] enemy strip ${id}/${name} failed`, err);
        }
      }
      // only switch an enemy over once its whole set is in (no half-animated enemies)
      if (Object.entries(strips).some(([name, s]) => !s.optional && !have.has(name))) continue;
      const anims = {};
      for (const [a, o] of Object.entries(ENEMY_ANIMS[id] ?? {})) {
        if ((o.needs ?? []).every((n) => have.has(n))) anims[a] = o;
      }
      // one-armed and terrified: a set per lost arm, only when both its strips are in
      const scared = {};
      for (const side of ['B', 'F', 'N']) {
        if (have.has(`flee${side}`) && have.has(`cower${side}`)) scared[side] = scaredAnims(side);
      }
      sheets[id] = { key: `enemy-${id}`, anims, scared, res: RES, fw, fh, ax: FRAME.AX * RES * cell, ay: FRAME.AY * RES * cell };
    }
    return sheets;
  }

  // The strip-only heroes (data/heroStrips.js: the Mage, the Rogue), cut like the enemies.
  // A hero gets a sheet once every strip he needs is in. Returns { id: { key, anims, ... } }.
  async buildHeroStrips(src) {
    const RES = 2;
    const sheets = {};
    for (const [id, h] of Object.entries(HERO_STRIPS)) {
      const have = new Set();
      let fw = 0; let fh = 0;
      for (const [name, s] of Object.entries(h.strips)) {
        const img = src(`hstrip-${id}-${name}`);
        if (!img) continue;
        try {
          const out = await this.cut(img, { ref: 0, target: h.target, ...s, res: RES }, null);
          const tk = `hero-${id}-${name}`;
          if (this.textures.exists(tk)) this.textures.remove(tk);
          const tex = this.textures.addCanvas(tk, out.canvas);
          for (let i = 0; i < out.count; i++) tex.add(`f${i}`, 0, i * out.fw, 0, out.fw, out.fh);
          fw = out.fw; fh = out.fh;
          have.add(name);
        } catch (err) {
          console.warn(`[boot] hero strip ${id}/${name} failed`, err);
        }
      }
      if (h.needs.some((n) => !have.has(n))) continue;
      // optional animations (back/front views, a real idle) only if their strips loaded
      const anims = {};
      for (const [k, a] of Object.entries(HERO_ANIMS[id])) if (!a.needs || a.needs.every((n) => have.has(n))) anims[k] = a;
      if (anims.idleStrip) { anims.idle = anims.idleStrip; delete anims.idleStrip; }
      sheets[id] = { key: `hero-${id}`, anims, res: RES, fw, fh, ax: FRAME.AX * RES, ay: FRAME.AY * RES };
    }
    return sheets;
  }

  // Cut the extra animation strips into frames (view/stripImporter.js) and switch the
  // animations that use them over (data/spriteStrips.js).
  async buildStrips() {
    const src = (k) => (this.textures.exists(k) ? this.textures.get(k).getSourceImage() : null);
    const palette = paletteFrom(src('sprite-palette'));
    for (const [key, strips] of Object.entries(CHARACTER_STRIPS)) {
      if(key==='ulric'||key==='ulricOath')continue; // HD strips are already compiled.
      const meta = this.cache.json.get(`${key}-data`);
      if (!meta) continue;
      const have = new Set();
      const scales = {};
      for (const [name, s] of Object.entries(strips)) {
        const img = src(`strip-${key}-${name}`);
        if (!img) continue;
        try {
          // ChatGPT fits the figures to the image height, so "same scale" means the same
          // share of the image height: rescale by the height ratio.
          const from = s.scaleFrom && scales[s.scaleFrom];
          const spec = from ? { ...s, scale: from.scale * (from.h / img.height) * (s.sizeFix ?? 1) } : s;
          const { canvas, count, scale, swords } = await this.cut(img, spec, palette);
          scales[name] = { scale, h: img.height };
          const tk = `${key}-${name}`;
          if (this.textures.exists(tk)) this.textures.remove(tk);
          const tex = this.textures.addCanvas(tk, canvas);
          const cw = canvas.width / count; // (wider than the standard cell for strips marked `wide`)
          for (let i = 0; i < count; i++) tex.add(`f${i}`, 0, i * cw, 0, cw, meta.frameHeight);
          meta.stripOrigin = meta.stripOrigin ?? {};
          meta.stripOrigin[name] = (meta.anchorX + (cw - meta.frameWidth) / 2) / cw;
            (meta.stripSwords??={})[name]=swords;
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
          have.add(name);
        } catch (err) {
          console.warn(`[boot] strip ${key}/${name} failed`, err);
        }
      }
      for (const [anim, o] of Object.entries(ANIM_OVERRIDES[key] ?? {})) {
        if ((o.needs ?? []).every((n) => have.has(n))) meta.anims[anim] = o;
      }
    }
    this.registry.set('enemySprites', await this.buildEnemyStrips(src));
    this.registry.set('heroSprites', installHeroHd(this));
    for (const [name, s] of Object.entries(FX_STRIPS)) {
      const img = src(`fxsrc-${name}`);
      if (!img) continue;
      const { canvas, count, fw, fh } = importFxStrip(img, s);
      const tk = `fx-${name}`;
      if (this.textures.exists(tk)) this.textures.remove(tk);
      const tex = this.textures.addCanvas(tk, canvas);
      for (let i = 0; i < count; i++) tex.add(`f${i}`, 0, i * fw, 0, fw, fh);
      FX[name] = { key: tk, count, fw, fh, fps: s.fps ?? 12 };
    }
  }
}


