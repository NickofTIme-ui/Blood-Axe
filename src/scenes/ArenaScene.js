// ArenaScene.js — The test level. Builds the world, player, enemy waves, camera,
// effects and views, then runs the simulation at a fixed 60 steps per second.
//
// Flow each browser frame:
//   1. handle system keys (debug, gore, restart, menu)
//   2. run as many fixed 1/60 s simulation steps as time has passed
//   3. update visuals (views, debug overlay)

import { SETTINGS } from '../config/settings.js';
import { World } from '../core/World.js';
import { InputManager, realPads } from '../core/InputManager.js';
import { TickController, pressed } from '../core/TickInput.js';
import { LocalSession, NetSession, snapshot, correct, feedPlayers } from '../net/Session.js';
import { CONTROLS, CONTROLS_P1_SHARED, CONTROLS_P2 } from '../config/controls.js';
import { createPlayer } from '../entities/Player.js';
import { createEnemy } from '../entities/Enemy.js';
import { FighterView } from '../view/FighterView.js';
import { SpriteFighterView } from '../view/SpriteFighterView.js';
import { MageView } from '../view/MageView.js';
import { StripHeroView } from '../view/StripHeroView.js';
import { MageFX } from '../effects/MageFX.js';
import { Parallax } from '../view/Parallax.js';
import { RogueFX } from '../effects/RogueFX.js';
import { ProjectileView } from '../view/ProjectileView.js';
import { DebugDraw } from '../view/DebugDraw.js';
import { DEPTH } from '../view/depths.js';
import { EnemyView } from '../view/EnemyView.js';
import { SpriteEnemyView } from '../view/SpriteEnemyView.js';
import { ENEMY_ART } from '../view/enemyArt.js';
import { Gore } from '../effects/Gore.js';
import { CameraFX } from '../effects/CameraFX.js';
import { SpriteCuts } from '../effects/SpriteCut.js';
import { finisherTargets, IMPALE, impalePierce } from '../combat/Finisher.js';
import { Burning } from '../effects/Burn.js';
import { Stage } from '../stage/Stage.js';
import { StageView } from '../view/StageView.js';
import { WAVES, BAD_GUYS, ENEMIES } from '../data/enemies.js';
import { FATALITY_LABELS } from '../combat/Fatality.js';
import { playMusic, toggleMute } from '../core/Music.js';
import { playSfx } from '../core/Sfx.js';

// Number keys spawn a specific enemy next to you (for testing the roster).
const SPAWN_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'];
const SPAWN_ORDER = [...BAD_GUYS, 'grunt'];

const STEP_MS = 1000 / 60;

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('Arena');
  }

  // data: { characterId } for one player, or { players: [heroId, heroId], mode } for two.
  //   mode  'solo' | 'local' (two players, this computer) | 'net' (online co-op)
  //   net   { link, index } — the connection and which player this machine is (0 = host)
  //   seed  the world's dice (online: both machines are given the same one)
  init(data) {
    this.heroIds = data.players ?? [data.characterId ?? 'warrior'];
    this.characterId = this.heroIds[0];
    this.mode = data.mode ?? (this.heroIds.length > 1 ? 'local' : 'solo');
    this.netInfo = this.mode === 'net' ? data.net : null;
    this.seed = data.seed;
    this.keepSession = !!data.keepSession; // a restart inside an online game: same session, ticks carry on
  }

  // What to start this scene again with (restart the stage).
  restartData() {
    return {
      players: this.heroIds, mode: this.mode, net: this.netInfo, keepSession: true,
      seed: this.mode === 'net' ? (this.world.seed + 1) >>> 0 : undefined, // (the same new dice on both machines)
    };
  }

  create() {
    const W = SETTINGS.world;
    this.baseZoom = SETTINGS.renderScale ?? 1; // draw at full resolution (see main.js)
    this.cameras.main.setZoom(this.baseZoom);
    this.cameras.main.setBounds(0, 0, W.width, SETTINGS.height);
    // a restart reuses this scene object: forget what the last run left behind
    this.ground = null;
    this.paused = false;
    this.slowUntil = 0;
    this.drawBackground();

    this.world = new World({ seed: this.seed });
    this.setupSession();
    this.gore = new Gore(this);
    this.fx = new CameraFX(this);
    this.cuts = new SpriteCuts(this); // finisher pieces (effects/SpriteCut.js)
    this.burning = new Burning(this); // bodies and parts cooking in the fire (effects/Burn.js)
    this.timeScale = 1;               // < 1 = slow motion (finishers)
    this.tickJobs = [];               // effects that run once per game tick (slowed with it)
    this.debugDraw = new DebugDraw(this);
    this.views = new Map();
    this.projectileViews = new Map();
    this.accumulator = 0;
    this.wave = 0;
    this.waveTimer = 60;
    this.kills = 0;

    // Views follow the world: one view per fighter.
    const ev = this.world.events;
    ev.on('fighterAdded', (f) => this.views.set(f.id, this.makeView(f)));
    ev.on('fighterRemoved', (f) => {
      this.views.get(f.id)?.destroy();
      this.views.delete(f.id);
    });

    // Combat events -> effects
    ev.on('hit', (e) => {
      // (lightning, force and the fire wall leave no blood: the Mage's effects show them)
      if (!e.move.noBlood) this.gore.onHit(e);
      this.fx.shake(e.move.shake ?? 0, 8);
      if (e.superCrit) this.superCritFX(e);
      else if (e.counter) this.popup(e.x, e.z - e.h - 30, 'COUNTER!', '#ffd24a');
      if (e.move.fx === 'kick') this.kickImpact(e.x, e.z, e.h, e.dir);
      if (e.move.cut === 'fire') this.fireImpact(e.x, e.z, e.h);
      if (e.move.impale) this.impaleFX(e);
    });
    // hold-attack power thrust: a scrape of steel as both hands lock on, a ring when full
    ev.on('chargeStart', ({ fighter }) => {
      if (fighter.team === 'player') playSfx(this, 'swingAlt', { volume: 0.25, pitch: -500, spread: 60 });
    });
    ev.on('chargeFull', ({ fighter }) => {
      playSfx(this, 'block', { volume: 0.22, pitch: 700, spread: 40 });
      // a small cold glint running up the blade — no big glow
      const tipX = fighter.x + fighter.facing * 70;
      const tipY = fighter.z - fighter.h - 44;
      const glint = this.add.image(tipX, tipY, 'dot').setTint(0xffffff).setScale(0.9, 0.35).setDepth(fighter.z + 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: glint, x: fighter.x + fighter.facing * 20, scaleX: 0.2, alpha: 0, duration: 220, onComplete: () => glint.destroy() });
    });
    ev.on('bowl', (e) => {
      playSfx(this, 'kick', { volume: 0.45, pitch: -250, spread: 150, minGapMs: 70 }); // bodies crashing into bodies
      this.fx.shake(4, 8);
      this.gore.spark(e.x, e.z, e.h, 0xffe0a0, 10);
      // one call-out per pile-up: count the pins instead of stacking popups
      const now = this.world.frame;
      if (now - (this.lastBowl ?? -99) > 45) { this.bowlCount = 0; }
      this.bowlCount = (this.bowlCount ?? 0) + 1;
      this.lastBowl = now;
      this.callout(this.bowlCount > 1 ? `STRIKE! x${this.bowlCount + 1}` : 'STRIKE!', '#ffd24a');
    });
    ev.on('guardSwap', ({ fighter: f }) => {
      // steel glint as the guard whips round
      this.gore.spark(f.x + f.facing * 18, f.z, 70, 0xdfe8ff, 10);
    });
    this.setupFinishers(ev);
    this.mageFX = new MageFX(this); // the Mage's spells and barriers (effects/MageFX.js)
    this.rogueFX = new RogueFX(this); // the Rogue's mines, marks and steel (effects/RogueFX.js)
    ev.on('kill', (e) => {
      this.kills++;
      if (e.finisher) return; // executions do their own gore (setupFinishers)
      // killed by fire (a grate, or a fire spell that didn't blow him apart): no fountain
      // of blood — he burns (the 'burning' state, effects/Burn.js)
      const byFire = ['fire', 'shock'].includes(e.move?.cut) && (!e.fatality || e.fatality === 'none') && e.defender.team === 'enemy';
      if (byFire) {
        this.burning.ignite(e.defender, 'fighter', e.move.cut === 'shock' ? 0.7 : 0.3); // (lightning chars)
        this.fx.shake(3, 8);
        return;
      }
      const apart = this.gore.onKill(e, this.views.get(e.defender.id));
      this.fx.shake(apart ? 9 : 7, apart ? 18 : 14);
      if (apart) this.fatalityFX(e);
    });
    ev.on('maim', (e) => {
      this.gore.onMaim(e, this.views.get(e.defender.id));
      this.fx.shake(4, 10);
      this.popup(e.x, e.z - e.h - 30, e.limb === 'armF' ? 'DISARMED!' : 'ARM OFF!', '#ff3a2a');
    });
    ev.on('swing', ({ fighter, move }) => {
      if (move.fx !== 'quake') return;
      const x = fighter.x + fighter.facing * ((move.hitbox.x + move.hitbox.w) - 20);
      this.fx.shake(move.shake ?? 5, 10);
      for (let i = 0; i < 3; i++) this.gore.spark(x + (i - 1) * 20, fighter.z, 2, 0x8a7a60, 10);
    });
    ev.on('block', (e) => {
      this.gore.spark(e.x, e.z, e.h, 0xfff2a0, 8);
      this.fx.shake(1, 4);
      playSfx(this, 'block', { volume: 0.8 });
    });
    ev.on('parry', (e) => {
      this.gore.spark(e.x, e.z, e.h, 0xffffff, 22);
      this.fx.shake(3, 8);
      playSfx(this, 'block', { volume: 1, pitch: 250 }); // brighter ring for a parry
      this.callout('PARRY!', '#ffffff');
    });
    ev.on('guardBreak', (e) => {
      if (e.move.fx === 'kick') this.kickImpact(e.x, e.z, e.h, e.dir);
      this.gore.spark(e.x, e.z, e.h, 0xff9a30, 16);
      this.fx.shake(5, 10);
      playSfx(this, 'block', { volume: 1, pitch: -300, minGapMs: 0 }); // deeper crunch as the guard caves
      this.callout('GUARD BREAK', '#ff9a30');
    });
    // Swing sounds fire the instant the attack starts (on the button press), hit or miss:
    //   combo 1 = swoosh (or the extra swing sound), 2 = slice 2, 3 = the finisher slice
    const SWING_SOUNDS = {
      light1: [['whiff', 2], ['swingAlt', 1]],
      light2: [['second', 2], ['swingAlt', 1]],
      light3: 'finisher',
      heavy: 'heavySwing',
      thrust: 'heavySwing',
    };
    ev.on('attackStart', ({ fighter, state }) => {
      const key = SWING_SOUNDS[state];
      if (!key || fighter.stats.archetype) return; // (heroes with their own kit sound their own swings)
      const loud = fighter.team === 'player' ? 1 : 0.4;
      const vol = state === 'heavy' || state === 'thrust' ? 0.8 : state === 'light3' ? 0.7 : 0.6;
      playSfx(this, key, { volume: vol * loud, spread: state === 'heavy' ? 100 : 150, minGapMs: 40 });
    });
    ev.on('attackStart', ({ fighter, state }) => {
      if (state === 'airAttack') playSfx(this, [['whiff', 2], ['swingAlt', 1]], { volume: fighter.team === 'player' ? 0.6 : 0.25 });
    });
    ev.on('roll', ({ fighter }) => {
      playSfx(this, 'roll', { volume: fighter.team === 'player' ? 0.7 : 0.3, spread: 120 });
      this.gore.spark(fighter.x, fighter.z, 2, 0x8a7a60, 6); // a puff of dust as he hits the floor
    });
    ev.on('jump', ({ fighter, airJump }) => {
      // push-off: a lighter, higher tap of the same impact
      playSfx(this, 'jump', { volume: (fighter.team === 'player' ? 0.35 : 0.15) * (airJump ? 0.7 : 1), pitch: 350, spread: 100, minGapMs: 80 });
    });
    ev.on('jumpLand', ({ fighter }) => {
      playSfx(this, 'jump', { volume: fighter.team === 'player' ? 0.75 : 0.3, spread: 120, minGapMs: 80 });
      this.gore.spark(fighter.x, fighter.z, 2, 0x8a7a60, 8); // dust off the landing
    });
    // Busy fight = the occasional distant sword clash, mixed low.
    this.actionHits = [];
    ev.on('hit', () => {
      const now = this.time.now;
      this.actionHits.push(now);
      while (this.actionHits.length && now - this.actionHits[0] > 2500) this.actionHits.shift();
      const busy = this.actionHits.length >= 4;
      if (busy && now - (this.lastClash ?? 0) > 2200 && Math.random() < 0.45) {
        this.lastClash = now;
        playSfx(this, 'clash', { volume: 0.28, spread: 200 });
      }
    });
    ev.on('landHard', ({ fighter }) => this.fx.shake(fighter.alive ? 1.5 : 3, 6));

    // The heroes, in player order. Each reads a TickController: the session hands it that
    // tick's button record (core/TickInput.js), whoever's fingers it came from.
    this.players = this.heroIds.map((id, i) => createPlayer(this.world, new TickController(), id, 220 - i * 46, 430 + i * 26));
    this.players.forEach((p, i) => { p.seat = i; }); // whose button record drives him (stays put if a partner leaves)
    this.player = this.players[this.session.localIndex] ?? this.players[0]; // "my" hero on this machine
    // two of the same hero: the second wears a cold steel-blue cast so you can tell them apart
    this.players.forEach((p, i) => { if (i > 0 && this.heroIds[i] === this.heroIds[0]) p.tint = 0x9fc0ff; });
    this.deadTicks = 0;
    this.camFocus = this.add.zone(this.player.x, this.player.z, 1, 1);
    this.cameras.main.startFollow(this.camFocus, true, 0.12, 0);
    this.cameras.main.roundPixels = true;

    // THE OATH ROAD (data/stage.js): sections, hazards, breakables, checkpoints, the boss.
    // The old endless waves stay on key 9 for testing, off by default.
    this.wavesOn = false;
    this.stage = new Stage(this.world);
    this.stageView = new StageView(this, this.stage);
    this.setupStageEvents(ev);
    this.stage.start(this.players);
    ev.on('revive', ({ fighter }) => {
      this.callout(fighter === this.player ? 'ON YOUR FEET' : 'YOUR PARTNER RISES', '#e0c080', 24);
      this.gore.spark(fighter.x, fighter.z, 40, 0xffe0a0, 14);
    });
    this.camL = this.world.bounds.minX - 30;
    this.camR = this.world.bounds.maxX + 30;

    this.scene.launch('HUD', { arena: this });
    this.events.once('shutdown', () => {
      this.scene.stop('HUD');
      // stop anything still roaring (e.g. a Firebolt's loop) when the arena closes
      for (const v of this.projectileViews.values()) v.loop?.stop(0);
      this.mageFX?.destroy();
      this.rogueFX?.destroy();
    });

    // Test keys — only with the debug overlay on (F2), so nobody breaks a run by accident:
    // 1-7 spawn an enemy, 0 clears every enemy, 9 toggles the old endless waves, F3 floor art.
    // (never online: a spawn on one machine only would split the two games apart)
    const dev = (fn) => () => { if (SETTINGS.debug && !this.paused && !this.session.net) fn(); };
    SPAWN_KEYS.forEach((k, i) => {
      this.input.keyboard.on(`keydown-${k}`, dev(() => this.spawnNear(SPAWN_ORDER[i])));
    });
    this.input.keyboard.on('keydown-ZERO', dev(() => this.clearEnemies()));
    this.input.keyboard.on('keydown-F3', dev(() => this.cycleGround()));
    this.input.keyboard.on('keydown-NINE', dev(() => {
      this.wavesOn = !this.wavesOn;
      this.popup(this.player.x, this.player.z - 150, this.wavesOn ? 'WAVES ON' : 'WAVES OFF', '#e0c080');
    }));
    // Pause: P / Enter / Start — and by itself whenever the window loses focus or the tab
    // is hidden, so nothing happens to you while you're away.
    this.paused = false;
    // (not online: there the pause is shared, and only a button press may do it)
    const autoPause = () => { if (!this.session.net) this.setPaused(true); };
    this.game.events.on('blur', autoPause);
    this.game.events.on('hidden', autoPause);
    this.events.once('shutdown', () => {
      SPAWN_KEYS.forEach((k) => this.input.keyboard.off(`keydown-${k}`));
      this.input.keyboard.off('keydown-ZERO');
      this.input.keyboard.off('keydown-F3');
      this.input.keyboard.off('keydown-NINE');
      this.game.events.off('blur', autoPause);
      this.game.events.off('hidden', autoPause);
      if (this.paused) { this.sound.resumeAll(); this.paused = false; } // never leave the sound frozen
    });

    playMusic(this, 'battle');
  }

  // Sparta kick landing: shockwave ring, dust off the floor, heavy shake.
  kickImpact(x, z, h, dir) {
    playSfx(this, 'kick', { volume: 1, spread: 90, minGapMs: 60 });
    this.fx.shake(9, 16);
    const ring = this.add.circle(x, z - h, 10).setStrokeStyle(4, 0xfff0c0, 0.9).setDepth(DEPTH.popups - 2);
    this.tweens.add({ targets: ring, radius: 70, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    const flash = this.add.circle(x, z - h, 26, 0xffffff, 0.8).setDepth(DEPTH.popups - 2).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
    this.gore.spark(x, z, h, 0xffffff, 18);
    for (let i = 0; i < 10; i++) {
      this.gore.spawn({
        x: x - dir * 20, z: z + (Math.random() - 0.5) * 10, h: 2,
        vx: dir * (80 + Math.random() * 200), vz: (Math.random() - 0.5) * 60, vh: 60 + Math.random() * 120,
        tint: 0x8a7a60, scale: 0.6 + Math.random() * 0.6, decal: false, life: 20,
      });
    }
  }

  // Power thrust run through a body. The blade tip bursts out of his BACK at the height
  // it went in (chest, gut, shoulder, arm, leg...), blood sprays out the far side, and
  // the tip stays in him, riding with him, while the thrust is held.
  impaleFX(e) {
    const def = e.defender;
    const dir = e.dir;
    const bodyW = def.stats.body.w;
    const rel = Math.max(0, Math.min(1, (e.h - def.h) / def.stats.body.h)); // 0 feet .. 1 head
    const region = rel > 0.8 ? 'neck' : rel > 0.58 ? 'chest' : rel > 0.4 ? 'gut' : 'leg';
    const lead = e.nth ?? 1;
    playSfx(this, 'kick', { volume: lead === 1 ? 0.9 : 0.55, pitch: lead === 1 ? -350 : -150, spread: 80, minGapMs: 30 });
    playSfx(this, 'finisher', { volume: 0.4, pitch: -200, spread: 80, minGapMs: 30 });
    this.fx.shake(lead === 1 ? 5 : 2.5, 7);
    if (this.gore.level > 0) {
      // out of the back: a hard directional jet; a little back out of the entry wound
      const backX = def.x + dir * bodyW * 0.45;
      this.gore.burst(backX, def.z, e.h, dir, Math.round((region === 'chest' || region === 'gut' ? 34 : 20) * this.gore.amount), 1.6);
      this.gore.burst(def.x - dir * bodyW * 0.3, def.z, e.h, -dir, Math.round(8 * this.gore.amount), 0.6);
      if (region === 'gut') this.gore.burst(backX, def.z, e.h - 6, dir, Math.round(10 * this.gore.amount), 0.9);
    }
    // the tip standing out of his back
    const tip = this.add.graphics().setDepth(def.z + 0.6);
    const len = 30;
    const draw = (x, y, a) => {
      tip.clear().setAlpha(a);
      const s = dir;
      tip.fillStyle(0x6a0404, 1).fillTriangle(x, y - 2.6, x, y + 2.6, x + s * len * 0.35, y);   // blood-coated root
      tip.fillStyle(0xcfcfd8, 1).fillTriangle(x + s * 4, y - 2.2, x + s * 4, y + 2.2, x + s * len, y);
      tip.fillStyle(0xffffff, 0.9).fillTriangle(x + s * 6, y - 1.6, x + s * 6, y - 0.6, x + s * (len - 3), y - 0.2);
      tip.fillStyle(0x8a0303, 0.85).fillRect(x + s * 2, y - 2.4, s * 9, 4.8);                  // his blood on the steel
    };
    const atk = e.attacker;
    const relH = e.h - def.h; // how far up his body the blade went in
    const hold = 20;          // frames the blade stays in him
    const fade = 12;
    let t = 0;
    const tick = this.time.addEvent({
      delay: 1000 / 60, repeat: -1, // runs until it removes itself (below)
      callback: () => {
        t++;
        if (!tip.active) { tick.remove(); return; }
        // (an impale finisher keeps it in him until he's booted off the blade)
        const stillIn = (atk.state === 'thrust' && t <= hold) || (atk.state === 'execute' && def.state === 'executed');
        if (stillIn && atk.state === 'execute') t = Math.min(t, hold);
        const x = def.x + dir * bodyW * 0.42;
        const y = def.z - def.h - relH;
        draw(x, y, stillIn ? 1 : Math.max(0, 1 - (t - hold) / fade));
        tip.setDepth(def.z + 0.6);
        if (stillIn && t % 3 === 0 && this.gore.level > 0) {
          this.gore.spawn({ x: x + dir * 8, z: def.z, h: def.h + relH - 2, vx: dir * 30, vz: 0, vh: -10, tint: 0x7a0303, scale: 0.35 });
        }
        if (t >= hold + fade) { tip.destroy(); tick.remove(); }
      },
    });
  }

  // The Rogue's MARK OF DEATH paid off by a teammate: a super critical — carnage.
  superCritFX(e) {
    this.callout('SUPER CRITICAL!', '#ff3050', 30);
    this.fx.shake(12, 18);
    this.rumble(1, 1, 220);
    this.slowmo(0.4, 260);
    playSfx(this, 'kick', { volume: 1, pitch: -900, minGapMs: 0 });
    playSfx(this, 'finisher', { volume: 0.9, pitch: -500, minGapMs: 0 });
    const g = this.gore;
    if (g.level > 0) {
      g.burst(e.x, e.z, e.h, e.dir, Math.round(90 * g.amount), 2);
      g.burst(e.x, e.z, e.h, -e.dir, Math.round(30 * g.amount), 1.2);
      g.mist(e.x, e.z, e.h, 12);
      for (let i = 0; i < 8; i++) g.splat(e.x + e.dir * (10 + Math.random() * 80), e.z + (Math.random() - 0.5) * 12, 1 + Math.random() * 2.5);
    } else g.spark(e.x, e.z, e.h, 0xffffff, 30);
  }

  // Firebolt hit: burst of flame and embers.
  fireImpact(x, z, h) {
    const boom = this.add.circle(x, z - h, 14, 0xffa030, 0.9).setDepth(DEPTH.popups - 2).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: boom, scale: 3, alpha: 0, duration: 220, ease: 'Cubic.easeOut', onComplete: () => boom.destroy() });
    this.gore.spark(x, z, h, 0xffc040, 16);
    this.gore.spark(x, z, h, 0xff5010, 12);
  }

  // Big dismemberment: shout it, punch the camera.
  fatalityFX(e) {
    const label = FATALITY_LABELS[e.fatality];
    if (label) this.popup(e.defender.x, e.z - e.defender.stats.body.h - 40, label, '#ff2a1a', 26);
    const cam = this.cameras.main;
    if (['halfH', 'halfV', 'explode', 'decap'].includes(e.fatality)) {
      cam.zoomTo(this.baseZoom * 1.07, 90, 'Quad.easeOut', true);
      this.time.delayedCall(260, () => cam.zoomTo(this.baseZoom, 380, 'Quad.easeInOut', true));
    }
    if (e.fatality === 'explode') cam.flash(120, 140, 10, 10);
  }

  // ------------------------------------------------------------ the stage

  setupStageEvents(ev) {
    // (the HUD starts a frame after the arena: until it's up, it picks the state up itself)
    const hud = () => { const h = this.scene.get('HUD'); return h?.arena === this && h.card?.active ? h : null; };
    ev.on('sectionStart', ({ index, section }) => {
      hud()?.sectionCard?.(index, section);
      if (index > 0) playSfx(this, 'block', { volume: 0.4, pitch: -900, minGapMs: 0 }); // the way shuts behind you
    });
    ev.on('sectionClear', ({ last }) => {
      if (last) return;
      this.callout('GO  →', '#ffd24a', 30);
      hud()?.showGo?.(true);
    });
    // the boss walks in: every footfall a thud that shakes the whole screen
    ev.on('bossStomp', ({ x, z }) => {
      playSfx(this, 'kick', { volume: 0.9, pitch: -1600, spread: 60, minGapMs: 0 });
      this.fx.shake(6, 12);
      this.rumble(0.8, 0.2, 140);
      for (let i = 0; i < 8; i++) this.gore.spawn({ x: x + (Math.random() - 0.5) * 60, z, h: 2, vx: (Math.random() - 0.5) * 160, vz: 0, vh: 40 + Math.random() * 90, tint: 0x8a7a60, scale: 0.5 + Math.random() * 0.5, decal: false, life: 20 });
    });
    ev.on('bossArrived', () => {
      this.fx.shake(10, 20);
      playSfx(this, 'kick', { volume: 1, pitch: -1900, minGapMs: 0 });
    });
    ev.on('bossSpawn', ({ boss }) => {
      playMusic(this, 'boss'); // (until the boss track is added, the battle music plays on)
      this.callout(boss.stats.name.toUpperCase(), '#ff2a1a', 26);
      this.fx.shake(6, 20);
      playSfx(this, 'kick', { volume: 1, pitch: -1200, minGapMs: 0 });
      hud()?.showBoss?.(boss);
    });
    ev.on('bossRage', () => {
      this.callout('HE CALLS HIS DOGS!', '#ff9a30', 24);
      this.fx.shake(5, 14);
    });
    ev.on('hazardHit', ({ fighter, kind }) => {
      if (fighter === this.player) this.callout(kind === 'fire' ? 'BURNED!' : 'SLASHED!', '#ff9a30', 20);
    });
    ev.on('stageWon', ({ stats }) => {
      this.slowmo(0.3, 1500);
      // (the tally is read when it's shown: the killing blow's own kill lands a beat later)
      this.time.delayedCall(1800, () => hud()?.showVictory?.({ ...stats, ...this.stage.stats }));
    });
  }

  // The camera follows the stage's lock smoothly: when a section shuts behind you the
  // left edge slides up rather than jumping.
  updateStageCamera() {
    const b = this.world.bounds;
    const tl = b.minX - 30;
    const tr = b.maxX + 30;
    this.camL += (tl - this.camL) * 0.06;
    this.camR += (tr - this.camR) * 0.15;
    if (Math.abs(tl - this.camL) < 0.5) this.camL = tl;
    this.cameras.main.setBounds(this.camL, 0, Math.max(SETTINGS.width, this.camR - this.camL), SETTINGS.height);
  }

  // Fell: rise at the section's start, healed, with its fight reset.
  riseAtCheckpoint() {
    this.stage.respawn();
    if (!this.stage.bossSpawned) playMusic(this, 'battle'); // (died to the boss: back to the battle track)
    this.cuts.clear();
    this.burning.clear();
    this.timeScale = 1;
    this.slowUntil = 0;
    this.cameras.main.zoomTo(this.baseZoom, 400, 'Sine.easeOut', true);
    this.scene.get('HUD')?.clearDeath?.();
    this.callout('RISE AGAIN', '#e0c080', 28);
  }

  // ------------------------------------------------------------ finishers
  // (combat/Finisher.js). The timeline's beats arrive as events; this is the show.

  // Slow motion for `ms` real milliseconds, then it eases back (see update()).
  slowmo(scale, ms) {
    this.timeScale = Math.min(this.timeScale, scale);
    this.slowUntil = Math.max(this.slowUntil ?? 0, this.time.now + ms);
  }

  // Run fn(t) once per game tick for n ticks (so it slows down with slow motion).
  everyTick(n, fn) {
    const j = (t) => fn(t);
    j.t = 0;
    j.n = n;
    this.tickJobs.push(j);
  }

  setupFinishers(ev) {
    ev.on('finisherStart', ({ kind, targets }) => {
      this.cameras.main.zoomTo(this.baseZoom * 1.1, 240, 'Quad.easeOut', true);
      this.execCam = true;
      playSfx(this, 'swingAlt', { volume: 0.4, pitch: -600, spread: 60 });
      if (kind === 'chain') this.callout(`EXECUTION x${targets.length}`, '#ff2a1a');
    });
    ev.on('finisherBeat', (b) => this.finisherFX(b));
    // a finisher cut him in two: the pieces are the sprite itself (effects/SpriteCut.js)
    ev.on('finisherSplit', ({ victim: v, cut, pieces }) => {
      const dir = v.execBy?.facing ?? v.facing;
      const H = v.stats.body.h;
      const h = v.h + H * (cut === 'legs' ? 0.3 : cut === 'neck' ? 0.83 : 0.5);
      v.pieces = pieces;
      const style = v.execStyle; // set for the chain's cuts (its streak was drawn at contact)
      if (!style) this.slashStreak(v.x, v.z - h, v.stats.body.w, dir, v.z);
      const g = this.gore;
      if (g.level > 0) {
        // the cut opens: a hard spray out the front, some out the back, a red mist
        // (the chain's cuts are about the swordplay: a clean spray along the blade's
        // path, not a cloud that hides the bodies coming apart)
        const lean = style ? 0.35 : 1;
        g.burst(v.x, v.z, h, dir, Math.round(55 * lean * g.amount), 1.4);
        g.burst(v.x, v.z, h, -dir, Math.round(25 * lean * g.amount), 0.9);
        if (!style) g.mist(v.x, v.z, h, cut === 'neck' ? 6 : 9);
        const d = g.dismemberer;
        const kinds = cut === 'neck' ? ['meat2', 'sinew'] : cut === 'legs' ? ['meat1', 'sinew', 'meat3'] : ['gut', 'organ', 'meat1', 'meat3', 'sinew', 'gut'];
        if (!style) d?.bits(v.x, v.z - h, v.z, kinds, cut === 'neck' ? 3 : 6, 0.6, dir);
        if (style) { pieces.upper.bleed = 50; pieces.lower.bleed = 70; }
        // guts spilling out of both halves of a waist cut, swinging as the pieces move
        if (cut === 'waist' || cut === 'waistPerch') {
          d?.rope(this.cuts.cutPoint(pieces.upper), v.z + 1, { chunk: pieces.upper, lenU: 45 + Math.random() * 30, dir, power: 0.5 });
          d?.rope(this.cuts.cutPoint(pieces.lower), v.z + 2, { chunk: pieces.lower, lenU: 35 + Math.random() * 25, dir: -dir, power: 0.4 });
        }
      }
      if (style) {
        // the chain's cuts: each half keeps the momentum it had. The top goes the way the
        // blade was travelling — slid down and back off a falling cut, flicked up by a
        // rising one, carried clean away by the flat finishing stroke — and his legs,
        // still running, manage half a stride before they go over.
        // (the world's dice, not Math.random: a flying torso can knock men down, so
        // both machines of an online game must throw it the same way)
        let n = 0;
        const r = (a, b) => a + this.world.roll(v.id, 40 + n++) * (b - a);
        if (style === 'down') this.cuts.launch(pieces.upper, -dir * r(50, 90), r(60, 110), -dir * r(2, 3.5));
        else if (style === 'up') this.cuts.launch(pieces.upper, dir * r(110, 170), r(250, 310), dir * r(4, 6));
        else this.cuts.launch(pieces.upper, dir * r(230, 300), r(330, 400), dir * r(8, 11));
        pieces.lower.vx = (v.execVx || v.facing * 120) * 0.55;
        pieces.lower.fallDir = Math.sign(pieces.lower.vx) || dir;
        pieces.lower.stand = 12;
      } else if (cut !== 'waistPerch' && cut !== 'legs') {
        const up = cut === 'neck' ? 1.3 : 1;
        const w = (k) => this.world.roll(v.id, 50 + k);
        this.cuts.launch(pieces.upper, dir * (160 + w(0) * 140) * up, (320 + w(1) * 160) * up, dir * (8 + w(2) * 8) * up);
      }
      // waistPerch: the top half just sits there on its legs — waiting for the boot
    });
  }

  finisherFX(beat) {
    const { type, victim: v, attacker: p, dir } = beat;
    const H = v.stats.body.h;
    const g = this.gore;
    const bloody = g.level > 0;
    const amt = g.amount ?? 1;
    const rnd = (a, b) => a + Math.random() * (b - a);
    switch (type) {
      case 'slit': {
        this.slowmo(0.28, 420);
        this.fx.shake(4, 10);
        playSfx(this, 'finisher', { volume: 0.9, pitch: -350, spread: 60 });
        playSfx(this, 'swingAlt', { volume: 0.5, pitch: 300, spread: 60 });
        this.popup(v.x, v.z - v.h - H - 34, 'THROAT CUT!', '#ff2a1a', 24);
        if (!bloody) break;
        // a hard spray out of the front of his neck, then it keeps pumping while he's held
        const nx = v.x + dir * v.stats.body.w * 0.32;
        const nh = v.h + H * 0.82;
        g.burst(nx, v.z, nh, dir, Math.round(45 * amt), 1.5);
        this.everyTick(46, (t) => {
          if (t % 2) return;
          const beat = 0.5 + 0.5 * Math.max(0, Math.sin(t * 0.45));
          g.spawn({
            x: v.x + dir * v.stats.body.w * 0.32, z: v.z + rnd(-2, 2), h: v.h + H * 0.8,
            vx: dir * rnd(90, 220) * beat, vz: rnd(-15, 15), vh: rnd(10, 90) * beat, tint: 0x8a0303, scale: rnd(0.35, 0.7),
          });
          if (t % 10 === 0) g.splat(v.x + dir * rnd(20, 70), v.z + rnd(-4, 4), rnd(0.9, 1.8));
        });
        break;
      }
      case 'drop':
        this.fx.shake(2, 6);
        if (bloody) this.time.delayedCall(500, () => { for (let i = 0; i < 6; i++) g.splat(v.x + rnd(-30, 30), v.z + rnd(-5, 5), rnd(2.5, 4.5), 0.6); });
        break;
      case 'stab': {
        // the blade goes through: no slow motion — a hard freeze (hit-stop, in the game
        // logic), one sharp kick of the camera, the heaviest stab sound, a rumble
        const ph = impalePierce(v);            // height on his body
        const outX = () => v.x + dir * v.stats.body.w * 0.4;
        playSfx(this, 'kick', { volume: 1, pitch: -500, spread: 40, minGapMs: 0 });
        playSfx(this, 'finisher', { volume: 0.95, pitch: -450, spread: 40, minGapMs: 0 });
        this.fx.shake(6, 5);
        this.rumble(1, 0.8, 140);
        this.popup(v.x, v.z - v.h - H - 34, 'SKEWERED!', '#ff2a1a', 24);
        if (!bloody) break;
        g.burst(outX(), v.z, v.h + ph, dir, Math.round(40 * amt), 1.7);              // out of his chest
        g.burst(v.x - dir * v.stats.body.w * 0.3, v.z, v.h + ph, -dir, Math.round(10 * amt), 0.6); // back up the blade
        // while he's on the steel it runs out of him and down, wherever the blade takes him
        this.everyTick(IMPALE.kick - IMPALE.stab, (t) => {
          if (v.state !== 'executed') return false;
          if (t % 3 === 0) g.spawn({ x: outX() + rnd(-4, 4), z: v.z + rnd(-2, 2), h: v.h + ph - 3, vx: dir * rnd(5, 45), vz: rnd(-8, 8), vh: rnd(-20, 20), tint: 0x7a0303, scale: rnd(0.3, 0.55) });
          if (t % 14 === 0) g.splat(v.x + rnd(-10, 14), v.z + rnd(-3, 3), rnd(0.8, 1.6));
          return true;
        });
        break;
      }
      case 'raised':
        // full height: a small, low settle as his whole weight hangs on the blade
        this.fx.shake(1.6, 9);
        this.rumble(0.5, 0.15, 200);
        playSfx(this, 'swingAlt', { volume: 0.35, pitch: -900, spread: 30, minGapMs: 0 });
        break;
      case 'kick':
        this.rumble(0.7, 0.9, 110);
        this.slowmo(0.45, 200);
        this.kickImpact(v.x - dir * 8, v.z, v.h + H * 0.5, dir);
        if (bloody) this.everyTick(30, (t) => { if (t % 2 === 0) g.spawn({ x: v.x - dir * 6, z: v.z, h: v.h + H * 0.5, vx: -dir * rnd(10, 60), vz: 0, vh: rnd(0, 40), tint: 0x7a0303, scale: rnd(0.3, 0.6) }); });
        break;
      case 'sever':
        this.slowmo(0.28, 420);
        this.fx.shake(7, 12);
        playSfx(this, 'heavySwing', { volume: 0.8, spread: 60 });
        playSfx(this, 'finisher', { volume: 0.7, pitch: -500, spread: 60 });
        g.spark(v.x, v.z, v.h + H * 0.5, 0xdfe8ff, 16);
        this.popup(v.x, v.z - v.h - H - 34, 'CUT IN HALF!', '#ff2a1a', 24);
        break;
      case 'boot': {
        // punted clean off his own legs, a spinning, bleeding bowling ball
        this.slowmo(0.4, 260);
        const up = v.pieces?.upper;
        const hx = up ? up.x : v.x;
        this.kickImpact(hx - dir * 6, v.z, (up?.h ?? H * 0.5), dir);
        playSfx(this, 'kick', { volume: 1, pitch: -200, spread: 60, minGapMs: 0 });
        const w = (a, b, k) => a + this.world.roll(v.id, 60 + k) * (b - a); // (repeatable: it bowls men over)
        this.cuts.launch(up, dir * w(720, 860, 0), w(300, 380, 1), dir * w(11, 16, 2), { bowl: true });
        if (bloody) g.burst(hx, v.z, up?.h ?? H * 0.5, dir, Math.round(30 * amt), 1.2);
        this.callout('BOOTED!', '#ff2a1a');
        break;
      }
      case 'chainHit': {
        // the blade connects. No slow motion: the freeze is the hit-stop (in the game
        // logic), with one short kick of the camera, one clean sound and a pulse — a
        // little more of each for the last man of three.
        const { style, last, count } = beat;
        const big = last && count > 2;
        const tilt = style === 'down' ? -0.46 : style === 'up' ? 0.46 : 0; // matches the cut line
        const hh = v.h + H * (style === 'finish' ? 0.5 : 0.58);
        this.slashStreak(v.x, v.z - hh, v.stats.body.w * (big ? 1.25 : 1), dir, v.z, tilt * dir);
        this.fx.shake(big ? 5 : 2.5, big ? 6 : 4);
        this.rumble(big ? 0.9 : 0.5, big ? 0.9 : 0.6, big ? 110 : 60);
        playSfx(this, 'finisher', { volume: big ? 1 : 0.75, pitch: style === 'down' ? 60 : style === 'up' ? 260 : -320, spread: 30, minGapMs: 0 });
        if (last) playSfx(this, 'heavySwing', { volume: big ? 0.8 : 0.5, spread: 30, minGapMs: 0 });
        g.spark(v.x, v.z, hh, 0xdfe8ff, big ? 14 : 8);
        break;
      }
      case 'chainCut':
        break;
    }
  }

  // Controller vibration (strong = the heavy low motor, weak = the buzzy one), 0..1.
  rumble(strong, weak, ms) {
    try {
      for (const pad of navigator.getGamepads?.() ?? []) {
        pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {});
      }
    } catch { /* no rumble on this pad / browser */ }
  }

  // The blade's path through a body: a hot white streak along the cut that flares and
  // thins out in a few frames (y = screen y of the cut).
  slashStreak(x, y, bodyW, dir, z, angle = null) {
    const len = bodyW * 2.6;
    const tilt = angle ?? (Math.random() - 0.5) * 0.12;
    const g = this.add.graphics().setDepth(z + 1).setBlendMode(Phaser.BlendModes.ADD);
    g.setPosition(x, y).setRotation(tilt);
    g.fillStyle(0xff3020, 0.55).fillRect(-len / 2, -3, len, 6);
    g.fillStyle(0xffd0b0, 0.9).fillRect(-len / 2, -1.2, len, 2.4);
    g.fillStyle(0xffffff, 1).fillRect(-len * 0.35, -0.6, len * 0.7, 1.2);
    g.scaleX = 0.2;
    this.tweens.add({ targets: g, scaleX: 1, duration: 60, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: g, alpha: 0, scaleY: 0.2, delay: 90, duration: 220, onComplete: () => g.destroy() });
    this.gore.spark(x + dir * len * 0.45, z, z - y, 0xffffff, 8);
  }

  // A mark over the runner you're right behind: execute him now.
  updateFinisherMarker() {
    const p = this.player;
    if (this.execCam && p.state !== 'execute') {
      this.cameras.main.zoomTo(this.baseZoom, 420, 'Quad.easeInOut', true);
      this.execCam = false;
    }
    const g = this.finMark ?? (this.finMark = this.add.graphics().setDepth(DEPTH.popups - 3));
    g.clear();
    if (!p.alive || !['idle', 'walk'].includes(p.state)) return;
    const t = finisherTargets(p, this.world.fighters)[0];
    if (!t) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now * 0.012);
    const x = t.x;
    const y = t.z - t.h - t.stats.body.h * 1.07 - 14 - pulse * 3;
    g.fillStyle(0x000000, 0.6).fillTriangle(x - 9, y - 11, x + 9, y - 11, x, y + 2);
    g.fillStyle(0xd01010, 0.75 + 0.25 * pulse).fillTriangle(x - 7, y - 10, x + 7, y - 10, x, y);
    g.fillStyle(0xffffff, 0.8).fillRect(x - 1, y - 9, 2, 5);
  }

  clearEnemies() {
    for (const f of this.world.fighters) if (f.team === 'enemy') f.removeMe = true;
    this.wavesOn = false;
    this.popup(this.player.x, this.player.z - 150, 'ENEMIES CLEARED  (9 = waves on)', '#e0c080');
  }

  spawnNear(typeId) {
    if (!ENEMIES[typeId] || !this.player.alive) return;
    const b = this.world.bounds;
    const x = Math.max(b.minX, Math.min(b.maxX, this.player.x + this.player.facing * 260));
    const z = Math.max(b.minZ, Math.min(b.maxZ, this.player.z));
    createEnemy(this.world, typeId, x, z);
  }

  // Rigged enemies get the paper-doll view; heroes use their sprite (or placeholder shapes).
  makeView(f) {
    // named enemies with hand-animated strips (data/enemyStrips.js); the doll runs underneath
    const sheet = f.team === 'enemy' && !this.dollsOnly && this.registry.get('enemySprites')?.[f.stats.id];
    if (sheet && f.stats.art && ENEMY_ART[f.stats.art]) return new SpriteEnemyView(this, f, sheet);
    if (f.stats.art && ENEMY_ART[f.stats.art]) return new EnemyView(this, f);
    // the Mage and the Rogue, once their painted strips are all in (data/heroStrips.js)
    const hero = f.team === 'player' && this.registry.get('heroSprites')?.[f.stats.id];
    if (hero) return new StripHeroView(this, f, hero);
    if (f.stats.archetype === 'mage') return new MageView(this, f); // (his stand-in puppet: view/MageView.js)
    const key = f.stats.sprite;
    if (key && this.textures.exists(key) && this.cache.json.exists(`${key}-data`)) {
      return new SpriteFighterView(this, f, key);
    }
    return new FighterView(this, f);
  }

  // Who's playing and where their buttons come from (net/Session.js).
  setupSession() {
    const old = this.keepSession ? this.registry.get('session') : null;
    if (this.mode === 'local') {
      // gamepads are handed out first: one pad = player 2 has it; two pads = one each
      const pads = realPads().length;
      const samplers = pads >= 2
        ? [new InputManager(this, CONTROLS, { pad: 0 }), new InputManager(this, CONTROLS_P2, { pad: 1, keyboard: false })]
        : [new InputManager(this, CONTROLS_P1_SHARED, { pad: null }), new InputManager(this, CONTROLS_P2, { pad: pads ? 0 : null })];
      this.session = new LocalSession(samplers);
    } else if (this.mode === 'net') {
      this.session = old?.net ? old : new NetSession(this.netInfo.link, this.netInfo.index, null, this.netInfo.game ?? 0, this.netInfo.delay);
      this.session.setSamplers([new InputManager(this)]);
      // the guest's safety net: pulled back into line with the host if it ever drifts
      this.session.onCorrect = (host, mine) => correct(this.world, host, mine);
      this.session.onGone = () => { if (this.sys.isActive()) this.goAlone(); };
      this.wentAlone = false;
    } else {
      this.session = new LocalSession([new InputManager(this)]);
    }
    this.session.tick = this.session.tick ?? 0;
    this.registry.set('session', this.session);
    // this machine's own device: local-only keys (mute, gore, debug) are read from it
    this.controls = this.session.net ? this.session.sampler : this.session.samplers[0];
  }

  get allDead() { return this.players.every((p) => !p.alive); }

  // Online, and the other player is gone for good: finish the fight alone. His hero
  // leaves the field (nobody is pressing his buttons).
  goAlone() {
    const s = this.session;
    if (!s.net || this.wentAlone) return;
    this.wentAlone = true;
    s.alone = true;
    // (pressed R while the partner was silent: hang up, so his side learns at once too)
    try { s.link.close?.(); } catch { /* already gone */ }
    for (const p of this.players) {
      if (p === this.player) continue;
      p.health = 0;
      p.removeMe = true;
    }
    this.players = [this.player];
    this.stage.players = this.players;
    this.callout('PARTNER DISCONNECTED', '#ff9a30', 24);
  }

  // ------------------------------------------------------------ main loop

  update(_time, delta) {
    this.localKeys();
    const s = this.session;

    // slow motion eases back to full speed once its moment has passed
    if (!this.paused) {
      if (this.time.now > (this.slowUntil ?? 0)) this.timeScale += (1 - this.timeScale) * 0.12;
      if (this.timeScale > 0.995) this.timeScale = 1;
    }
    this.accumulator += Math.min(delta, 100) * (this.paused ? 1 : this.timeScale);
    s.pump(s.tick);
    let steps = 0;
    while (this.accumulator >= STEP_MS && steps < 5) {
      // online: no tick without both players' buttons for it — wait for the wire
      if (!s.ready(s.tick)) {
        // (keep a few ticks of time owed, so once the wire catches up the game does too,
        // instead of running behind real time after every hiccup)
        this.accumulator = Math.min(this.accumulator, STEP_MS * 4);
        // partner gone quiet (closed the tab, lost the line): after a few seconds
        // you may carry on by yourself with R
        if (s.stall > 240) { this.controls.read(); if (this.controls.consume('restart')) this.goAlone(); }
        break;
      }
      const recs = s.take(s.tick);
      const tick = s.tick++;
      this.accumulator -= STEP_MS;
      steps++;
      // pause / restart / leave ride in the records, so both machines do them on the same tick
      if (this.systemKeys(recs)) return; // (the scene is changing)
      if (this.paused) continue;         // paused: ticks still pass (and buttons are read), the world holds still
      feedPlayers(this.players, recs);
      this.world.tick();
      this.keepTogether();
      this.stage.update();
      this.deadTicks = this.allDead ? this.deadTicks + 1 : 0;
      this.gore.update();
      for (const v of this.views.values()) v.applyCut?.(); // (bodies come apart on the tick, not on a screen refresh)
      this.cuts.update();
      this.burning.update([...this.stage.activeFires(), ...this.world.barriers.fireRegions()]);
      this.tickJobs = this.tickJobs.filter((j) => j(++j.t) !== false && j.t < (j.n ?? 999));
      this.updateWaves();
      s.afterTick?.(tick, () => snapshot(this.world));
    }

    for (const v of this.views.values()) v.update();
    this.parallax.update(Math.min(delta, 100) / 1000 * (this.paused ? 0 : 1));
    this.mageFX.update();
    this.rogueFX.update();
    this.updateCamFocus();
    this.updateFinisherMarker();
    this.stageView.update();
    this.updateStageCamera();
    this.syncProjectileViews();
    this.debugDraw.draw(this.world);
  }

  // Keys that only matter on this machine (they don't touch the simulation).
  localKeys() {
    const c = this.controls;
    if (c.consume('debug')) SETTINGS.debug = !SETTINGS.debug;
    if (c.consume('gore')) {
      SETTINGS.gore.level = (SETTINGS.gore.level + 1) % SETTINGS.gore.names.length;
      if (SETTINGS.gore.level === 0) this.gore.clearDecals();
    }
    if (c.consume('mute')) toggleMute();
  }

  // Pause, restart and leave, from this tick's records (any player may press them).
  // Returns true if the scene is ending.
  systemKeys(recs) {
    const any = (a) => recs.some((r) => pressed(r, a));
    const dead = this.allDead;
    const won = this.stage?.phase === 'won';
    if (any('pause')) {
      // (everyone down: Start / Enter is "rise again", as the death screen says — after
      // a beat, so the blow that killed you can't also skip the death)
      if (dead && !won) { if (this.deadTicks > 20) this.riseAtCheckpoint(); }
      else this.setPaused(!this.paused);
      return false;
    }
    // R: dead = rise at the last checkpoint; paused or won = restart the stage.
    // (In the middle of a fight it does nothing — one stray key can't wipe a run.)
    if (any('restart')) {
      if (dead && !won) { this.setPaused(false); this.riseAtCheckpoint(); return false; }
      if (this.paused || won) { this.setPaused(false); this.scene.restart(this.restartData()); return true; }
      return false;
    }
    // Esc: playing = pause; paused / dead / won = back to character select.
    if (any('menu')) {
      if (this.paused || dead || won) {
        this.setPaused(false);
        this.scene.start('Select', { mode: this.mode, net: this.netInfo });
        return true;
      }
      this.setPaused(true);
    }
    return false;
  }

  // Two heroes on one screen can't walk out of each other's sight: past a screen's
  // width apart they're held (online each has his own screen, so no leash).
  keepTogether() {
    if (this.mode !== 'local') return;
    const up = this.players.filter((p) => p.alive);
    if (up.length < 2) return;
    const [a, b] = up;
    const max = SETTINGS.width - 150;
    const gap = Math.abs(a.x - b.x);
    if (gap <= max) return;
    const mid = (a.x + b.x) / 2;
    for (const p of up) p.x = mid + Math.sign(p.x - mid) * (max / 2);
  }

  // What the camera follows: my hero (or, while I'm down, my partner); with two players
  // on this screen, the point between them.
  updateCamFocus() {
    const up = this.players.filter((p) => p.alive);
    let x;
    if (this.mode === 'local' && up.length) x = up.reduce((s, p) => s + p.x, 0) / up.length;
    else x = (this.player.alive || !up.length ? this.player : up[0]).x;
    this.camFocus.setPosition(x, this.player.z);
  }

  // Freeze / unfreeze everything: simulation, tweens, timers and sound. Safe to call
  // repeatedly (tabbing away pauses; only the player resumes).
  setPaused(on) {
    if (on === this.paused) return;
    // nothing to pause on the death or victory screens (they have their own prompts)
    if (on && (this.allDead || this.stage?.phase === 'won' || !this.sys.isActive())) return;
    this.paused = on;
    if (on) {
      this.tweens.pauseAll();
      this.time.paused = true;
      this.sound.pauseAll();
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
      this.sound.resumeAll();
    }
    this.scene.get('HUD')?.showPause?.(on);
  }

  syncProjectileViews() {
    const alive = new Set(this.world.projectiles);
    for (const p of alive) {
      if (!this.projectileViews.has(p)) this.projectileViews.set(p, new ProjectileView(this, p));
      this.projectileViews.get(p).update();
    }
    for (const [p, view] of this.projectileViews) {
      if (!alive.has(p)) { view.destroy(); this.projectileViews.delete(p); }
    }
  }

  // ------------------------------------------------------------ enemy waves

  updateWaves() {
    if (!this.wavesOn || this.world.livingEnemies().length > 0 || !this.player.alive) return;
    if (--this.waveTimer > 0) return;
    this.wave++;
    this.spawnWave(this.waveRoster(this.wave));
    this.world.events.emit('wave', this.wave);
    this.waveTimer = 120;
  }

  // Scripted line-ups first (data/enemies.js WAVES), then random mixes.
  waveRoster(n) {
    if (n <= WAVES.length) return WAVES[n - 1];
    const size = Math.min(7, 3 + Math.floor(n / 3));
    return Array.from({ length: size }, () => (Math.random() < 0.25 ? 'grunt' : BAD_GUYS[Math.floor(Math.random() * BAD_GUYS.length)]));
  }

  spawnWave(roster) {
    const b = this.world.bounds;
    const W = SETTINGS.world;
    for (let i = 0; i < roster.length; i++) {
      let side = i % 2 === 0 ? 1 : -1;
      let x = this.player.x + side * (560 + i * 50);
      if (x < b.minX + 20 || x > b.maxX - 20) {
        side = -side;
        x = this.player.x + side * (560 + i * 50);
      }
      x = Math.max(b.minX, Math.min(b.maxX, x));
      const z = W.floorTop + 20 + Math.random() * (W.floorBottom - W.floorTop - 40);
      createEnemy(this.world, roster[i], x, z);
    }
  }

  // ------------------------------------------------------------ visuals

  // Call-outs go to the HUD banner at the top of the screen — never over the action.
  callout(text, color, size) {
    this.scene.get('HUD')?.callout?.(text, color, size);
  }

  // (old position arguments kept so existing calls still work; the text goes to the banner)
  popup(_x, _y, text, color, size = 22) {
    this.callout(text, color, size);
  }

  // High-res ground art (view/envArt.js), repeated along the arena. It spans from the base
  // of the back wall to the bottom of the screen. Returns false if no ground art loaded.
  makeGround(name) {
    const W = SETTINGS.world;
    const H = SETTINGS.height;
    const ready = this.registry.get('grounds') ?? [];
    if (!ready.length) return false;
    name = name ?? (ready.includes(SETTINGS.ground.pick) ? SETTINGS.ground.pick : ready[0]);
    this.groundName = name;
    const key = `ground-${name}`;
    const top = W.floorTop - 50;
    const height = H - top;
    const tex = this.textures.get(key).getSourceImage();
    const s = height / tex.height; // fit the picture's height to the floor band
    if (!this.ground) {
      this.ground = this.add.tileSprite(0, top, W.width, height, key).setOrigin(0).setDepth(DEPTH.floor + 1);
    } else {
      this.ground.setTexture(key);
    }
    this.ground.setTileScale(s, s);
    // calm it down a touch so fighters and blood read clearly on top
    const b = Math.round(255 * (SETTINGS.ground.brightness ?? 1));
    this.ground.setTint(Phaser.Display.Color.GetColor(b, b, b));
    return true;
  }

  // F3: cycle through the ground options while choosing one.
  cycleGround() {
    const ready = this.registry.get('grounds') ?? [];
    if (ready.length < 2) return;
    const next = ready[(ready.indexOf(this.groundName) + 1) % ready.length];
    this.makeGround(next);
    this.callout(`GROUND: ${next.toUpperCase()}`, '#e0c080', 20);
  }

  // Placeholder backdrop: sky, parallax mountains, pillars and a stone floor.
  drawBackground() {
    const W = SETTINGS.world;
    const H = SETTINGS.height;

    // (the camera is zoomed by renderScale around its centre, so the fixed / parallax
    //  layers are drawn extra wide to always cover the view)
    const pad = SETTINGS.width * 2;
    // the layered backdrop: sky, distant ruins, fog and ash, each at its own depth
    // (view/Parallax.js, data/parallax.js); the old flat sky only if there's no art at all
    this.parallax?.destroy();
    this.parallax = new Parallax(this);
    if (!this.parallax.layers.length) {
      const sky = this.add.graphics().setDepth(DEPTH.sky).setScrollFactor(0, 1);
      sky.fillGradientStyle(0x2a0f14, 0x2a0f14, 0x5a2a1a, 0x5a2a1a, 1);
      sky.fillRect(-pad, -200, SETTINGS.width + pad * 2, W.floorTop + 200);
    }

    const floor = this.add.graphics().setDepth(DEPTH.floor);
    floor.fillStyle(0x2e2622, 1);
    floor.fillRect(0, W.floorTop - 50, W.width, H - W.floorTop + 50);
    floor.fillStyle(0x1f1916, 1);
    floor.fillRect(0, W.floorTop - 50, W.width, 12);
    const hasGround = this.makeGround();
    // Pillars along the back wall so scrolling is easy to see (drawn over the ground's top edge)
    const kinds = this.registry.get('pillars') ?? 0;
    if (kinds) {
      // painted pillars (view/envArt.js): base on the floor's far edge, tops past the
      // top of the screen, variants mixed in a fixed order so it never looks random-noisy
      const baseY = W.floorTop - 30;
      const tall = baseY + 40;
      const order = [0, 3, 1, 2, 3, 0, 2, 1]; // never the same one twice in a row
      for (let x = 100, n = 0; x < W.width; x += 320, n++) {
        const key = `pillar-${order[n % order.length] % kinds}`;
        const src = this.textures.get(key).getSourceImage();
        const img = this.add.image(x, baseY, key).setOrigin(0.5, 1).setDepth(DEPTH.floor + 2);
        img.setScale(Math.min(tall / src.height, 150 / src.width)); // cap width on squat ones
        if (n % 2) img.setFlipX(true);
      }
    } else {
      const pillars = this.add.graphics().setDepth(DEPTH.floor + 2);
      for (let x = 80; x < W.width; x += 320) {
        pillars.fillStyle(0x3b302b, 1);
        pillars.fillRect(x, W.floorTop - 230, 44, 190);
        pillars.fillStyle(0x4a3d36, 1);
        pillars.fillRect(x - 8, W.floorTop - 240, 60, 14);
        pillars.fillRect(x - 8, W.floorTop - 52, 60, 12);
      }
    }
    if (!hasGround) this.drawFloorLines(floor);
  }

  // Floor stones (placeholder, only when there's no ground art)
  drawFloorLines(floor) {
    const W = SETTINGS.world;
    const H = SETTINGS.height;
    floor.lineStyle(1, 0x3a302b, 1);
    for (let y = W.floorTop - 20; y < H; y += 38) floor.lineBetween(0, y, W.width, y);
    for (let x = 0; x < W.width; x += 96) {
      for (let y = W.floorTop - 20, row = 0; y < H; y += 38, row++) {
        const ox = row % 2 ? 48 : 0;
        floor.lineBetween(x + ox, y, x + ox, y + 38);
      }
    }
  }
}
