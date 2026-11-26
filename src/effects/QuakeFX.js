// QuakeFX.js — The Warlord's Earthbreaker on screen and in the ears: the tell while the
// glaive goes up, the slam (the whole screen shakes), the crack it leaves in the floor,
// and the wave of broken stone rolling out across the lane. It only listens to world
// events (combat/Quake.js) and reads the live waves; nothing here changes the fight.

import {SPRITES} from '../view/levelArt.js';
import { DEPTH } from '../view/depths.js';
import { softTex } from './Gore.js';
import { playSfx } from '../core/Sfx.js';
import { SETTINGS } from '../config/settings.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const STONE = [0x5a4a3a, 0x6e5c48, 0x82705a, 0x4a3e32];
const DUST = 0x8a7a60;

export class QuakeFX {
  constructor(scene) {
    this.scene = scene;
    this.cracks = [];this.waveArt=new Map();
    scene.world.events.on('quakeEnd',({wave})=>{for(const im of this.waveArt.get(wave.id)??[])im.destroy();this.waveArt.delete(wave.id);});
    softTex(scene);
    const ev = scene.world.events;
    const W = SETTINGS.world;
    this.top = W.floorTop;
    this.bottom = W.floorBottom;

    // the tell: the glaive goes up, the ground starts to tremble and grit runs off it
    ev.on('attackStart', ({ fighter, move }) => {
      if (!move?.shockwave) return;
      playSfx(scene, 'heavySwing', { volume: 0.9, pitch: -900, spread: 60, minGapMs: 0 });
      scene.fx.shake(2, move.startup);
      scene.callout('JUMP!', '#ff9a30', 26);
      for (let i = 0; i < 6; i++) {
        scene.time.delayedCall(i * 120, () => this.dust(fighter.x + rand(-50, 50), fighter.z + rand(-6, 6), 2, 0.6));
      }
    });

    // the slam: the hardest shake in the game, a burst of stone, and a crack in the floor
    ev.on('quakeSlam', ({ x, z }) => {
      playSfx(scene, 'kick', { volume: 1, pitch: -1900, spread: 40, minGapMs: 0 });
      playSfx(scene, 'block', { volume: 0.8, pitch: -1400, spread: 40, minGapMs: 0 });
      scene.fx.shake(16, 32);
      scene.rumble(1, 1, 550);
      for (let i = 0; i < 18; i++) this.rock(x + rand(-30, 30), z + rand(-8, 8), rand(-260, 260), rand(220, 520));
      this.dust(x, z, 14, 1.4);
      this.crack(x, z);
    });

    ev.on('quakeHit', ({ fighter }) => {
      scene.gore.spark(fighter.x, fighter.z, 6, DUST, 10);
      playSfx(scene, 'kick', { volume: 0.7, pitch: -900, spread: 120, minGapMs: 40 });
    });
  }

  // a chunk of floor flung up, falling back down
  rock(x, z, vx, vh, size = 1) {
    this.scene.gore.spawn({ x, z, h: 2, vx, vz: rand(-30, 30), vh, tint: pick(STONE), scale: rand(0.5, 1.1) * size, decal: false, life: 50, spin: rand(-0.3, 0.3) });
  }

  // a soft cloud of dust rolling off the floor
  dust(x, z, n, size = 1) {
    const s = this.scene;
    for (let i = 0; i < n; i++) {
      const img = s.add.image(x + rand(-20, 20), z - rand(0, 10), 'soft').setTint(DUST).setAlpha(0.5)
        .setScale(rand(0.4, 0.8) * size).setDepth(z + 2);
      s.tweens.add({
        targets: img, x: img.x + rand(-60, 60), y: img.y - rand(20, 60), scale: img.scale * 2.2, alpha: 0,
        duration: rand(450, 800), ease: 'Quad.easeOut', onComplete: () => img.destroy(),
      });
    }
  }

  // the split in the floor where the glaive went in: a jagged dark line across the lane
  // at the impact, fading out over a few seconds
  crack(x, z) {
    if(this.scene.textures.exists('lvl-ascent-crater')){
      const im=this.scene.add.image(x,z,'lvl-ascent-crater').setDisplaySize(180,74).setDepth(DEPTH.decals+1);
      this.scene.tweens.add({targets:im,alpha:0,delay:8000,duration:1600,onComplete:()=>im.destroy()});return;
    }
    const g = this.scene.add.graphics().setDepth(DEPTH.decals + 1);
    const lines = [[0x1a120c, 5], [0x3a2a1c, 2]];
    for (const [color, w] of lines) {
      g.lineStyle(w, color, 0.9);
      g.beginPath();
      g.moveTo(x + rand(-6, 6), z - 26);
      for (let y = z - 18; y <= z + 26; y += 8) g.lineTo(x + rand(-12, 12), y);
      g.strokePath();
    }
    this.scene.tweens.add({ targets: g, alpha: 0, delay: 2200, duration: 1200, onComplete: () => g.destroy() });
  }

  // Each frame: the live waves throw up stone and dust along their front, all the way
  // across the lane, so you can see the line you have to jump.
  update() {
    if (this.scene.paused) return;
    const waves = this.scene.world.quakes?.list ?? [];
    for (const w of waves) {
      const S=SPRITES['earthbreaker-wave'];
      if(S){
        let rows=this.waveArt.get(w.id);if(!rows){rows=Array.from({length:7},()=>this.scene.add.image(0,0,S.key,'f0').setOrigin(.5,1));this.waveArt.set(w.id,rows);}
        rows.forEach((im,i)=>{const z=this.top+(i+1)/rows.length*(this.bottom-this.top),y0=Math.floor(i*S.fh/rows.length),y1=Math.floor((i+1)*S.fh/rows.length);im.setTexture(S.key,'f0').setOrigin(w.dir>0?.75:.25,1).setCrop(0,y0,S.fw,y1-y0).setPosition(w.x,this.bottom+5).setFlipX(w.dir<0).setDisplaySize(w.cfg.width+62,this.bottom-this.top+52).setDepth(z+.1).setTint(0xcfc4b6).setAlpha(Math.min(.9,w.t/4));});
        if(w.t%5===0)this.dust(w.x,w.z,1,.65);
        continue;
      }
      for (let i = 0; i < 3; i++) {
        const z = rand(this.top, this.bottom);
        this.rock(w.x + rand(-w.cfg.width / 2, w.cfg.width / 2), z, w.dir * rand(20, 90), rand(160, 340), 1.4);
      }
      if (w.t % 3 === 0) this.dust(w.x, rand(this.top, this.bottom), 1, 0.8);
    }
  }
}
