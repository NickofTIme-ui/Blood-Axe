import { playSfx } from './Sfx.js';

const SWORD_USERS = new Set(['grunt', 'thrall', 'stalker', 'gladiator', 'warlord', 'king']);
export function playSwordSheath(scene) {
  playSfx(scene, [['swordSheath1', 1], ['swordSheath2', 1]], { volume: 0.55, spread: 55, minGapMs: 350 });
}

// Cosmetic only: these random choices never touch simulation RNG or combat timing.
export class BattlefieldAudio {
  constructor(scene) {
    this.scene = scene;
    this.pending = new Set();
    this.nextDraw = 0;
    this.nextVolley = 0;
    this.steps = new Map();
    scene.world.events.on('millTrapdoor',()=>playSfx(scene,'gateClose',{volume:.75,spread:50,minGapMs:0}));
    scene.world.events.on('millBondsCut',()=>playSfx(scene,'bladeOut',{volume:.5,spread:50,minGapMs:0}));
    scene.world.events.on('lockPick', () => playSfx(scene, 'lockUnlock', {volume: 0.5}));
    scene.world.events.on('wayOpen', () => playSfx(scene, 'gateOpen', {volume: 0.55, minGapMs: 400}));
    scene.world.events.on('chestOpen', () => playSfx(scene, [['chestOpen1',1],['chestOpen2',1]], {volume:0.65,spread:50}));
    scene.world.events.on('fighterAdded', f => {
      // Troops already stationed in the scene have their weapons drawn.
      if (f.team === 'enemy' && f.entering && SWORD_USERS.has(f.stats.id)) this.pending.add(f);
    });
    scene.world.events.on('shellLaunch', ({ hazard, count }) => {
      if (hazard.look === 'arrows') this.volley(count);
    });
  }
  update() {
    const s = this.scene;
    if (s.paused || s.leaving || s.sound.locked) return;
    const cam = s.cameras.main.worldView;
    for (const f of s.players ?? []) {
      const last = this.steps.get(f);
      const moving = f.alive && f.grounded && (f.state === 'walk' || f.state === 'run') && !f.hitstop && f.stats.id !== 'mage';
      const state = { x:f.x, z:f.z, distance:last?.distance ?? 0, moving, tick:s.world.frame };
      if (moving && last?.moving && last.tick !== s.world.frame) {
        const distance = Math.hypot(f.x-last.x,(f.z-last.z)*(f.stats.walkSpeed/f.stats.depthSpeed || 1));
        if (distance < 40) state.distance += distance;
        const stride = f.sprinting ? 77 : 64;
        if (state.distance >= stride) {
          state.distance %= stride;
          playSfx(s,'stoneStep',{volume:f.sprinting?0.42:0.29,spread:90,minGapMs:70});
        }
      } else if (!moving) state.distance = 0;
      this.steps.set(f,state);
    }
    for (const f of this.pending) {
      if (!f.alive || !s.world.fighters.includes(f)) { this.pending.delete(f); continue; }
      if (f.x < cam.left || f.x > cam.right) continue;
      if (s.time.now < this.nextDraw) break;
      this.pending.delete(f);
      this.nextDraw = s.time.now + 320 + Math.random() * 180;
      playSfx(s, [['swordUnsheath1', 1], ['swordUnsheath2', 1]], { volume: 0.48, spread: 70, minGapMs: 0 });
      break;
    }
  }
  volley(count = 1) {
    const s = this.scene;
    if (s.paused || s.leaving || s.time.now < this.nextVolley) return;
    this.nextVolley = s.time.now + 240;
    const layers = Math.min(4, Math.max(2, count));
    const first = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < layers; i++) {
      const fire = () => {
        if (!s.sys.isActive() || s.paused || s.leaving) return;
        // One clear release leads the volley; alternating quieter shots give it width
        // without burying every layer under the fire/music bed.
        const key = `bowShot${i % 2 ? 3 - first : first}`;
        playSfx(s, key, { volume: i === 0 ? 0.95 : 0.52 / Math.sqrt(layers - 1), spread: 65, minGapMs: 0 });
      };
      if (!i) fire(); else s.time.delayedCall(i * 42 + Math.random() * 22, fire);
    }
  }
}
