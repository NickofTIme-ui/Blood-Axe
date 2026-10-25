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
import { TickController, pressed, held, bitOf, EMPTY } from '../core/TickInput.js';
import { LocalSession, NetSession, snapshot, correct, feedPlayers } from '../net/Session.js';
import { CONTROLS, CONTROLS_P1_SHARED, CONTROLS_P2, actionButtons } from '../config/controls.js';
import { createPlayer } from '../entities/Player.js';
import { createEnemy, offscreenX } from '../entities/Enemy.js';
import { FighterView } from '../view/FighterView.js';
import { SpriteFighterView } from '../view/SpriteFighterView.js';
import { MageView } from '../view/MageView.js';
import { StripHeroView } from '../view/StripHeroView.js';
import { MageFX } from '../effects/MageFX.js';
import { Parallax } from '../view/Parallax.js';
import { HoundView } from '../view/HoundView.js';
import { CrusherView } from '../view/CrusherView.js';
import { RogueFX } from '../effects/RogueFX.js';
import { QuakeFX } from '../effects/QuakeFX.js';
import { WrathFX } from '../effects/WrathFX.js';
import { ProjectileView } from '../view/ProjectileView.js';
import { DebugDraw } from '../view/DebugDraw.js';
import { DEPTH } from '../view/depths.js';
import { bladeWorldPoint } from '../view/BladeTrail.js';
import { Spotlight } from '../view/Spotlight.js';
import { EnemyView } from '../view/EnemyView.js';
import { SpriteEnemyView } from '../view/SpriteEnemyView.js';
import { ENEMY_ART } from '../view/enemyArt.js';
import { Gore } from '../effects/Gore.js';
import { CameraFX } from '../effects/CameraFX.js';
import { SpriteCuts } from '../effects/SpriteCut.js';
import { finisherTargets, IMPALE, impalePierce } from '../combat/Finisher.js';
import { Burning } from '../effects/Burn.js';
import { FireAmbience } from '../core/FireAmbience.js';
import { Stage } from '../stage/Stage.js';
import { StageView } from '../view/StageView.js';
import { TerrainView } from '../view/TerrainView.js';
import { STAGES, nextLevel } from '../data/stages.js';
import { NpcView } from '../view/NpcView.js';
import { SpeakerMarker } from '../view/SpeakerMarker.js';
import { sharedProgress } from '../progression/Progress.js';
import { CHARACTERS } from '../data/characters.js';
import { WAVES, BAD_GUYS, ENEMIES } from '../data/enemies.js';
import { FATALITY_LABELS } from '../combat/Fatality.js';
import { playMusic, playCue, stopMusic, toggleMute } from '../core/Music.js';
import { syncSanctuaryMusic } from '../core/SanctuaryMusic.js';
import { playSfx, fleshBite } from '../core/Sfx.js';
import { BattlefieldAudio } from '../core/BattlefieldAudio.js';
import {MillRescueView} from '../view/MillRescueView.js';
import { runTickJobs } from '../core/TickJobs.js';
import { styleMult } from '../combat/Style.js';
import { TROPHIES, RARITY, LOOT, pickTrophy } from '../data/trophies.js';
import { TEST, toggleTestMode, applyTestMode, levelAfter, showTestTag } from '../config/testMode.js';
import { BirthrightArt } from '../view/BirthrightArt.js';
import { TestNavigator, makePreviewProgress } from '../view/TestNavigator.js';

// Number keys spawn a specific enemy next to you (for testing the roster).
const SPAWN_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'];
const SPAWN_ORDER = [...BAD_GUYS, 'grunt'];

const STEP_MS = 1000 / 60;
const LEVEL_FADE_MS = 700; // out of one campaign level and up into the next (goNextLevel)

// The stages a run can be (data.stage): data/stages.js. The campaign's levels
// (docs/campaign/plan.md) are stages too: 'village' is level 1, 'gallowsWood' level 2.
export { STAGES };
// The sentence's camera (setupSentence): how close it comes in as he kneels, how close it
// has crept by the blow, the punch on the blow, and where it rests while he bleeds out.
const SENTENCE_CAM = { start: 1.12, creep: 1.24, punch: 1.34, after: 1.2 };

// How far above the floor a tall stage's camera can climb (px)
const CAM_CLIMB = 360;

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
    this.stageId = STAGES[data.stage] ? data.stage : 'oath';
    this.stageData = STAGES[this.stageId];
    // the campaign: start at a saved checkpoint (CONTINUE), and the health the heroes
    // walked out of the last level with (shares of their max, in player order)
    this.startSection = data.section ?? 0;
    this.testPreview=!!data.testPreview;
    this.testMoment=data.testMoment;
    this.carry = data.carry ?? null;
    this.leaving = false;
    this.campaign = !!(this.stageData.exit || this.stageData.sequence);
    // online, the campaign's story so far (who was saved), the same on both machines: the
    // host's checkpoint to begin with (SelectScene.netStart), then carried level to level
    this.netCampaign = this.mode === 'net' ? data.netCampaign ?? null : null;
  }

  // Where CHARACTER SELECT (pause menu, Esc) goes back into: the run you were in. A
  // campaign level = the campaign's saved checkpoint, as CONTINUE on the title (online
  // the host's checkpoint decides: SelectScene.netStart); any other stage = that stage
  // again. Never left unset: unset is the old Oath Road (data/stage.js).
  selectData() {
    let stage = this.stageId;
    let section;
    if (this.campaign && this.mode !== 'net') {
      const at = sharedProgress(this.registry).campaign.at;
      if (at && STAGES[at.level]) { stage = at.level; section = at.section; }
      else section = this.stage?.checkpoint ?? 0;
    }
    return { mode: this.mode, net: this.netInfo, stage, section };
  }

  // What to start this scene again with (restart the stage).
  restartData() {
    return {
      players: this.heroIds, mode: this.mode, net: this.netInfo, keepSession: true, stage: this.stageId,
      netCampaign: this.netCampaign,
      testPreview:this.testPreview,
      seed: this.mode === 'net' ? (this.world.seed + 1) >>> 0 : undefined, // (the same new dice on both machines)
    };
  }

  create() {
    const W = SETTINGS.world;
    this.baseZoom = SETTINGS.renderScale ?? 1; // draw at full resolution (see main.js)
    this.cameras.main.setZoom(this.baseZoom);
    this.stageWidth = this.stageData.width ?? W.width;
    this.camTop = this.stageData.tall ? -CAM_CLIMB : 0; // (a tall stage: the camera climbs with you)
    this.cameras.main.setBounds(0, this.camTop, this.stageWidth, SETTINGS.height - this.camTop);
    // a restart reuses this scene object: forget what the last run left behind
    this.ground = null;
    this.paused = false;
    this.slowUntil = 0;
    if (!this.stageData.theme) this.drawBackground(); // (a themed stage draws its own: view/TerrainView.js)
    else { this.parallax?.destroy(); this.parallax = { update() {}, destroy() {}, layers: [] }; }

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
    this.battlefieldAudio = new BattlefieldAudio(this);
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
      else if (e.crit) this.critFX(e);
      else if (e.counter) this.popup(e.x, e.z - e.h - 30, 'COUNTER!', '#ffd24a');
      if (e.move.fx === 'kick') this.kickImpact(e.x, e.z, e.h, e.dir);
      if (e.move.cut === 'fire') this.fireImpact(e.x, e.z, e.h);
      if (e.move.impale) this.impaleFX(e);
      if (e.move.shoulder) this.shoulderImpact(e);
      else if (e.kind === 'melee' && e.attacker?.stats.blade) this.oathkeeperBite(e);
      // a sword cut from our side (not a kick, the shoulder or fire; the Mage and Rogue
      // sound their own): now and then the blade biting flesh
      if (e.kind === 'melee' && e.attacker?.team === 'player' && !e.attacker.stats.archetype
        && e.move.fx !== 'kick' && !e.move.shoulder && e.move.cut !== 'fire' && fleshBite()) {
        playSfx(this, 'stationaryKill', { volume: 0.75, spread: 120, minGapMs: 60 });
      }
    });
    // the SHOULDER SMASH sets off: a grunt, the plant, dust off his back foot
    ev.on('attackStart', ({ fighter: f, state }) => {
      if (state !== 'shoulder') return;
      const loud = f.team === 'player' ? 1 : 0.4;
      playSfx(this, 'heavySwing', { volume: 0.55 * loud, pitch: -700, spread: 80 });
      playSfx(this, 'jump', { volume: 0.6 * loud, pitch: -300, minGapMs: 0 });
      this.gore.spark(f.x - f.facing * 24, f.z, 2, 0x8a7a60, 12);
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
    this.setupSentence(ev);
    this.mageFX = new MageFX(this); // the Mage's spells and barriers (effects/MageFX.js)
    this.rogueFX = new RogueFX(this); // the Rogue's mines, marks and steel (effects/RogueFX.js)
    this.quakeFX = new QuakeFX(this); // the Warlord's Earthbreaker slam and its shockwave (effects/QuakeFX.js)
    this.wrathFX = new WrathFX(this); // Rurik's Kingsfire and the King's Wrath, and men blown apart by his fire (effects/WrathFX.js)
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
      playSfx(this, 'limbOff', { volume: 0.85, spread: 80, minGapMs: 60 });
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
      launcher: 'finisher',
      sunder: 'heavySwing',
      heavy: 'heavySwing',
      thrust: 'heavySwing',
    };
    ev.on('attackStart', ({ fighter, state }) => {
      const key = SWING_SOUNDS[state];
      if (!key || fighter.stats.archetype) return; // (heroes with their own kit sound their own swings)
      const loud = fighter.team === 'player' ? 1 : 0.4;
      const vol = state === 'heavy' || state === 'thrust' || state === 'sunder' ? 0.8 : state === 'light3' ? 0.7 : 0.6;
      playSfx(this, key, { volume: vol * loud, spread: state === 'heavy' ? 100 : 150, minGapMs: 40 });
    });
    ev.on('attackStart', ({ fighter, state }) => {
      if (state === 'airAttack') playSfx(this, [['whiff', 2], ['swingAlt', 1]], { volume: fighter.team === 'player' ? 0.6 : 0.25 });
    });
    // the Sunder (X, X, Y, Y) slams into the floor: the cut goes on into the ground
    ev.on('sunderLand', ({ fighter, hit }) => {
      playSfx(this, 'kick', { volume: 0.85, pitch: -1400, spread: 60, minGapMs: 0 });
      this.fx.shake(hit ? 9 : 5, 12);
      if (hit) this.rumble?.(0.7, 0.3, 160);
      for (let i = 0; i < 10; i++) this.gore.spawn({ x: fighter.x + fighter.facing * 40 + (Math.random() - 0.5) * 50, z: fighter.z, h: 2, vx: (Math.random() - 0.5) * 220, vz: 0, vh: 60 + Math.random() * 140, tint: 0x8a7a60, scale: 0.5 + Math.random() * 0.6, decal: false, life: 22 });
    });
    ev.on('kill', (e) => { if (e.sunder) this.callout('SUNDERED!', '#ff2a1a', 34); });
    ev.on('roll', ({ fighter }) => {
      const heroRoll=fighter.team==='player'&&['warrior','rogue'].includes(fighter.stats.id);
      playSfx(this, heroRoll?'heroRoll':'roll', { volume: fighter.team === 'player' ? 0.7 : 0.3, spread: heroRoll?65:120 });
      this.gore.spark(fighter.x, fighter.z, 2, 0x8a7a60, 6); // a puff of dust as he hits the floor
    });
    ev.on('jump', ({ fighter, airJump }) => {
      // push-off: a lighter, higher tap of the same impact
      playSfx(this, 'stoneJump', { volume: (fighter.team === 'player' ? 0.55 : 0.2) * (airJump ? 0.7 : 1), pitch: 0, spread: 65, minGapMs: 80 });
    });
    ev.on('jumpLand', ({ fighter }) => {
      playSfx(this, 'jump', { volume: fighter.team === 'player' ? 0.75 : 0.3, spread: 120, minGapMs: 80 });
      this.gore.spark(fighter.x, fighter.z, 2, 0x8a7a60, 8); // dust off the landing
    });
    // the opening (stage/VillageOpening.js): the heroes' boots skidding them to a stop, and
    // Varek's mace coming down on the kneeling villager
    ev.on('openingSkid', ({ fighter, first }) => {
      this.gore.spark(fighter.x + fighter.facing * 10, fighter.z, 2, 0x9a8a70, 9);
      if (first) playSfx(this, 'jump', { volume: 0.6, pitch: -400, minGapMs: 0 });
    });
    ev.on('openingKill', ({ x, z, dir }) => {
      // the mace lands on the back of his head (about 70 px up on a kneeling man): the
      // spray goes forward, away from the blow, and hangs in the air through the freeze
      if (this.gore.level === 0) this.gore.spark(x, z, 70, 0xffffff, 16);
      else {
        this.gore.burst(x, z, 70, dir, 40, 1.4);
        this.gore.mist(x + dir * 10, z, 70, 6);
        this.gore.splat(x + dir * 30, z + 2, 1.6);
      }
      this.fx.shake(10, 20);
      playSfx(this, 'stationaryKill', { volume: 1, minGapMs: 0 });
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
    // the skill tree's moves (combat/Skills.js)
    // Leap Smash: the blade goes into the floor point first just ahead of his feet — a white
    // flash at the point, the floor split out from it, stone and dust thrown up
    ev.on('plungeStart', () => playSfx(this, 'heavySwing', { volume: 0.8, pitch: -500, minGapMs: 0 }));
    ev.on('plungeWrench', ({ fighter }) => {
      const tx = fighter.x + fighter.facing * 38;
      playSfx(this, 'block', { volume: 0.5, pitch: -1100, minGapMs: 0 });
      for (let i = 0; i < 6; i++) this.quakeFX.rock(tx + (Math.random() - 0.5) * 12, fighter.z, fighter.facing * -(40 + Math.random() * 120), 140 + Math.random() * 160, 0.6);
      this.quakeFX.dust(tx, fighter.z, 3, 0.7);
    });
    ev.on('leapSmash', ({ fighter, x, z, h, radius, launch }) => {
      this.fx.shake(launch ? 12 : 9, 16);
      this.rumble(1, 1, launch ? 380 : 260);
      playSfx(this, 'kick', { volume: 1, pitch: -1300, minGapMs: 0 });
      playSfx(this, 'block', { volume: 0.9, pitch: -1600, minGapMs: 0 });
      const y = z - Math.max(0, h);
      const tx = x + (fighter?.facing ?? 1) * 38; // where the point goes in
      const star = this.add.graphics().setDepth(z + 0.6).setBlendMode(Phaser.BlendModes.ADD);
      for (let i = 0; i < 10; i++) {
        const a = Math.PI + (i / 9) * Math.PI; // a fan up off the floor
        const len = 30 + Math.random() * 46;
        star.lineStyle(i % 3 ? 2 : 4, 0xfff4d8, 1).lineBetween(tx, y, tx + Math.cos(a) * len, y + Math.sin(a) * len * 0.8);
      }
      star.fillStyle(0xffffff, 0.9).fillCircle(tx, y, 12);
      this.tweens.add({ targets: star, alpha: 0, duration: 220, ease: 'Quad.easeIn', onComplete: () => star.destroy() });
      // the floor split out from the point, in jagged branches flat on the lane
      const crack = this.add.graphics().setDepth(DEPTH.decals + 1);
      const branches = launch ? 9 : 7;
      for (const [color, w] of [[0x140e09, 5], [0x3a2a1c, 2]]) {
        for (let b = 0; b < branches; b++) {
          let a = (b / branches) * Math.PI * 2 + (b * 0.7) % 0.5;
          let cx = tx, cy = y;
          crack.lineStyle(w, color, 0.9).beginPath().moveTo(cx, cy);
          const reach = (launch ? 0.55 : 0.45) * radius;
          for (let s = 0; s < 4; s++) {
            a += ((b * 13 + s * 7) % 5 - 2) * 0.12;
            cx += Math.cos(a) * reach / 4; cy += Math.sin(a) * reach / 4 * 0.3;
            crack.lineTo(cx, cy);
          }
          crack.strokePath();
        }
      }
      this.tweens.add({ targets: crack, alpha: 0, delay: 2400, duration: 1400, onComplete: () => crack.destroy() });
      for (let i = 0; i < (launch ? 18 : 12); i++) this.quakeFX.rock(tx + (Math.random() - 0.5) * 30, z + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 420, 200 + Math.random() * 300);
      this.quakeFX.dust(tx, z, launch ? 12 : 8, 1.2);
      const ring = this.add.ellipse(x, y, 40, 12).setStrokeStyle(3, 0xd8c8a8, 0.9).setDepth(z + 0.5);
      this.tweens.add({ targets: ring, scaleX: (radius * 2) / 40, scaleY: (radius * 0.5) / 12, alpha: 0, duration: 280, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      for (let i = 0; i < 16; i++) this.gore.spawn({ x: x + (Math.random() - 0.5) * radius, z, h: Math.max(0, h) + 2, vx: (Math.random() - 0.5) * 300, vz: 0, vh: 120 + Math.random() * 220, tint: 0x8a7a60, texture: 'px', scale: 0.8 + Math.random(), decal: false, life: 30 + Math.random() * 20 });
    });
    ev.on('skillProc', ({ fighter, skill }) => {
      if (fighter !== this.player) return;
      if (skill === 'ironWall') this.callout('IRON WALL!', '#ffd24a', 22);
      if (skill === 'bloodrush') this.gore.spark(fighter.x, fighter.z, Math.max(0, fighter.floor) + 60, 0xff3a2a, 8);
    });

    // The heroes, in player order. Each reads a TickController: the session hands it that
    // tick's button record (core/TickInput.js), whoever's fingers it came from.
    this.players = this.heroIds.map((id, i) => createPlayer(this.world, new TickController(), id, 220 - i * 46, 430 + i * 26));
    this.players.forEach((p, i) => { p.seat = i; }); // whose button record drives him (stays put if a partner leaves)
    // PROGRESSION (progression/Progress.js): blood, skill points and each hero's picks.
    // Not online: both machines would have to agree on every pick.
    sharedProgress(this.registry);
    this.progress = this.mode === 'net' ? null : this.registry.get('progress');
    if(this.testPreview && this.progress) {
      this.progress=makePreviewProgress(this.progress,this.stageData,this.startSection);
    }
    this.progress?.play(this.stageId); // (level 1: Rurik's old sword until Brann gives him Oathkeeper)
    // online, the host's own campaign save still follows the game (checkpoints, levels,
    // the saved), so CONTINUE picks up there next time. Written to only, never read here.
    this.netSave = this.mode === 'net' && this.netInfo?.index === 0 && this.campaign ? this.registry.get('progress') : null;
    this.applySkills(true);
    // (on from the last level: a little worn, never on his last legs)
    if (this.carry) this.players.forEach((p, i) => { p.health = p.stats.maxHealth * Math.max(0.5, Math.min(1, this.carry.health?.[i] ?? 1)); });
    this.player = this.players[this.session.localIndex] ?? this.players[0]; // "my" hero on this machine
    // two of the same hero: the second wears a cold steel-blue cast so you can tell them apart
    this.players.forEach((p, i) => { if (i > 0 && this.heroIds[i] === this.heroIds[0]) p.tint = 0x9fc0ff; });
    this.deadTicks = 0;
    this.camFocus = this.add.zone(this.player.x, this.player.z, 1, 1);
    this.cameras.main.startFollow(this.camFocus, true, 0.12, this.stageData.tall ? 0.09 : 0);
    this.cameras.main.roundPixels = true;
    if (this.carry) this.cameras.main.fadeIn(LEVEL_FADE_MS * 1.4, 0, 0, 0); // (on from the last level: up out of its black)

    // THE OATH ROAD (data/stage.js): sections, hazards, breakables, checkpoints, the boss.
    // The old endless waves stay on key 9 for testing, off by default.
    this.wavesOn = false;
    // (the campaign save: who was saved and lost before, and the one-time flags. Not
    // online: both machines would have to agree on it)
    const C = this.progress?.campaign;
    const back = this.startSection > 0;
    const NC = this.netCampaign;
    this.stage = new Stage(this.world, this.stageData, C ? {
      saved: this.progress.rescuedIds(), flags: { ...C.flags },
      rescued: back ? this.progress.rescuedIds() : undefined, lost: back ? this.progress.lostIds() : undefined,
    } : NC ? { saved: [...(NC.saved ?? [])], flags: {}, rescued: NC.rescued, lost: NC.lost } : {});
    this.gore.dismemberer.minZ = this.world.bounds.minZ; // (a stage's own lane: `laneTop`)
    this.stageView = new StageView(this, this.stage);
    this.millRescueView=this.stage.millRescue?new MillRescueView(this,this.stage):null;
    // (after the StageView: it makes the 'glow' texture the terrain's lanterns use)
    this.terrainView = this.stage.terrain || this.stageData.theme ? new TerrainView(this, this.stage) : null;
    // a campaign level's villagers, its dead and the other Oath Keepers (view/NpcView.js)
    this.npcView = this.stage.story ? new NpcView(this, this.stage) : null;
    this.speakerMarker = this.stage.story ? new SpeakerMarker(this) : null; // over whoever is talking
    this.cutawayOn = false;
    this.scene.stop('Cutaway');
    this.setupStageEvents(ev);
    this.setupProgressEvents(ev);
    this.setupBirthright(ev);
    this.stage.start(this.players, { section: this.startSection });
    this.prepareTestMoment();
    this.nextReady = false;
    this.tallyUp = false;   // (this machine's tally is on screen: the 'ready' bit online)
    this.netGo = null;      // (online: a ready player asked to go on: netWonKeys)
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
    this.setupTestKeys();
    // A click moves a story line on, as D-pad right / N does (stage/Story.js: the lines wait
    // for a press). It rides in this machine's buttons, so online both games see it.
    const clickLine = () => { if (!this.paused && this.stage.story?.line) this.controls?.registerPress('padRight'); };
    this.input.on('pointerdown', clickLine);
    this.events.once('shutdown', () => this.input.off('pointerdown', clickLine));
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

    playMusic(this, this.stageData.music ?? 'battle');
    this.fireAmbience = new FireAmbience(this); // the crackle of whatever is burning
  }

  // Sparta kick landing: shockwave ring, dust off the floor, heavy shake.
  // SHOULDER SMASH: plate into a man at a full run. A deep armoured crunch, a jolt of the
  // camera, a gold ring, the dust and bits of him knocked flying ahead; the first man calls
  // the move, every man after him counts up.
  shoulderImpact(e) {
    const f = e.attacker;
    const n = f?.attackInfo?.hitList.size ?? 1;
    const dir = e.dir;
    playSfx(this, 'kick', { volume: 1, pitch: -900, spread: 80, minGapMs: 30 });
    playSfx(this, 'block', { volume: 0.5, pitch: -1300, spread: 80, minGapMs: 30 }); // plate on plate
    this.fx.shake(n === 1 ? 11 : 7, 16);
    if (n === 1) {
      const cam = this.cameras.main;
      cam.zoomTo(this.baseZoom * 1.035, 50, 'Quad.easeOut', true);
      this.time.delayedCall(110, () => cam.zoomTo(this.baseZoom, 260, 'Quad.easeOut', true));
    }
    const y = e.z - e.h;
    const ring = this.add.ellipse(e.x, y, 34, 34, 0xffd070, 0).setStrokeStyle(4, 0xffe6a0, 0.95)
      .setDepth(DEPTH.popups - 2).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scaleX: 3.4, scaleY: 2.4, alpha: 0, duration: 240, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    const flash = this.add.circle(e.x, y, 16, 0xfff0c0, 0.5).setDepth(DEPTH.popups - 2).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 110, onComplete: () => flash.destroy() });
    this.gore.spark(e.x, e.z, e.h, 0xffd070, 10);
    for (let i = 0; i < 14; i++) {
      this.gore.spawn({
        x: e.x, z: e.z + (Math.random() - 0.5) * 14, h: 2 + Math.random() * 10,
        vx: dir * (160 + Math.random() * 260), vz: (Math.random() - 0.5) * 80, vh: 80 + Math.random() * 160,
        tint: 0x8a7a60, scale: 0.6 + Math.random() * 0.7, decal: false, life: 24,
      });
    }
    if (f?.team === 'player') this.callout(n === 1 ? 'SHOULDER SMASH!' : `RAN THROUGH ${n}!`, '#ffd24a');
  }

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

  // A hero's random critical hit: a sharp callout, a hard thump, an extra spray.
  critFX(e) {
    this.callout(e.riposte ? 'RIPOSTE!' : e.counter ? 'CRITICAL COUNTER!' : 'CRITICAL!', e.riposte ? '#ffffff' : '#ff8a2a', e.riposte ? 30 : 26);
    if (e.riposte) this.fx.shake(9, 14);
    this.fx.shake(6, 10);
    this.rumble(0.6, 0.6, 120);
    playSfx(this, 'kick', { volume: 0.8, pitch: -400, spread: 80 });
    const g = this.gore;
    if (g.level > 0 && !e.move.noBlood) g.burst(e.x, e.z, e.h, e.dir, Math.round(30 * g.amount), 1.4);
    else g.spark(e.x, e.z, e.h, 0xffd080, 14);
  }

  // OATHKEEPER biting (Rurik's sword, data/oathkeeper.js): the weight of it in the hit. A
  // deep thud under the steel, hearth-embers knocked out of the blade at the contact, and
  // on the big cuts (the overhand, the cleave, the thrust, the whirlwind) the camera dips
  // with the blow and a ring of gold sparks. View only: the frame data is untouched.
  oathkeeperBite(e) {
    const big = (e.move.hitstop ?? 0) >= 10 || e.move.knockdown;
    playSfx(this, 'kick', { volume: big ? 0.55 : 0.3, pitch: big ? -1700 : -1300, spread: 60, minGapMs: 40 });
    this.gore.spark(e.x, e.z, e.h, 0xfff0c0, big ? 14 : 6);
    this.gore.spark(e.x, e.z, e.h, 0xe0b450, big ? 10 : 4);
    if (!big) return;
    this.fx.shake((e.move.shake ?? 4) + 3, 10);
    const cam = this.cameras.main;
    cam.zoomTo(this.baseZoom * 1.025, 50, 'Quad.easeOut', true);
    this.time.delayedCall(90, () => cam.zoomTo(this.baseZoom, 220, 'Quad.easeOut', true));
    const ring = this.add.ellipse(e.x, e.z - e.h, 30, 30, 0xffd070, 0).setStrokeStyle(3, 0xffe0a0, 0.9)
      .setDepth(DEPTH.popups - 2).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 200, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
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
    if (label && !e.sentence) this.popup(e.defender.x, e.z - e.defender.stats.body.h - 40, label, '#ff2a1a', 26); // (a sentence says its own word)
    const cam = this.cameras.main;
    if (['halfH', 'halfV', 'explode', 'decap'].includes(e.fatality)) {
      cam.zoomTo(this.baseZoom * 1.07, 90, 'Quad.easeOut', true);
      this.time.delayedCall(260, () => cam.zoomTo(this.baseZoom, 380, 'Quad.easeInOut', true));
    }
    if (e.fatality === 'explode') cam.flash(120, 140, 10, 10);
    if (e.fatality === 'halfH' || e.fatality === 'halfV') playSfx(this, 'bloodSplatter', { volume: 0.9, spread: 80, minGapMs: 60 });
    if (e.fatality === 'decap') playSfx(this, [['headOff', 1], ['limbOff', 1]], { volume: 0.9, spread: 80, minGapMs: 60 });
    if (e.fatality === 'limbs') playSfx(this, 'limbOff', { volume: 0.9, spread: 80, minGapMs: 60 });
  }

  // ------------------------------------------------------------ the stage

  setupStageEvents(ev) {
    // (the HUD starts a frame after the arena: until it's up, it picks the state up itself)
    const hud = () => { const h = this.scene.get('HUD'); return h?.arena === this && h.card?.active ? h : null; };
    ev.on('sectionStart', ({ index, section }) => {
      hud()?.sectionCard?.(index, section);
      // a campaign checkpoint: CONTINUE starts here
      if (this.campaign) (this.progress ?? this.netSave)?.reach(this.stageId, index);
      if (index > 0) playSfx(this, 'block', { volume: 0.4, pitch: -900, minGapMs: 0 }); // the way shuts behind you
    });
    ev.on('sectionClear', ({ last, section }) => {
      if (last) return;
      // (a stretch with no fight — a climb — opens at once: no GO, its hint stays up)
      if (!section.waves?.length && !section.boss) return;
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
      playMusic(this, this.stage.section?.boss?.music ?? 'boss'); // (a boss's own `music`: King Vaurath keeps the finale's track)
      this.callout(boss.stats.name.toUpperCase(), '#ff2a1a', 26);
      this.fx.shake(6, 20);
      playSfx(this, 'kick', { volume: 1, pitch: -1200, minGapMs: 0 });
      hud()?.showBoss?.(boss);
    });
    // (the twins) one is down: his brother takes his place on the bar, and goes wild
    ev.on('twinFall', ({ left }) => {
      this.callout('HE AVENGES HIS BROTHER!', '#ff9a30', 26);
      this.fx.shake(7, 18);
      playSfx(this, 'kick', { volume: 0.9, pitch: -1500, minGapMs: 0 });
      hud()?.showBoss?.(left);
    });
    ev.on('bossRage', () => {
      if (this.stage.section?.boss?.phases) return; // (a boss with phases: each says its own)
      this.callout('HE CALLS HIS DOGS!', '#ff9a30', 24);
      this.fx.shake(5, 14);
    });
    // a boss with phases moves on to the next: a roar, the screen shakes, its call-out
    ev.on('bossPhase', ({ phase }) => {
      this.callout(phase.callout ?? 'HE FIGHTS HARDER!', '#ff9a30', 26);
      this.fx.shake(7, 18);
      this.rumble(0.7, 0.4, 300);
      playSfx(this, 'kick', { volume: 0.9, pitch: -1500, minGapMs: 0 });
    });
    ev.on('npcLost', ({ npc }) => {
      this.netSave?.lose(npc.id);
      this.callout(`${npc.name.toUpperCase()}  ·  LOST`, '#a09080', 24);
      playSfx(this, 'kick', { volume: 0.5, pitch: -2200, minGapMs: 0 });
    });
    ev.on('npcFollow', ({ npc }) => this.callout(`${npc.name.toUpperCase()}  ·  FOLLOWS YOU`, '#e8f0ff', 20));
    ev.on('npcRescued', ({ npc }) => {
      this.netSave?.rescue(npc.id);
      this.callout(`${(npc.savedAs ?? npc.name).toUpperCase()}  ·  SAVED`, // (savedAs: groups freed together share one callout)
        '#e8f0ff', 24);
      playSfx(this, 'block', { volume: 0.5, pitch: 400, minGapMs: 0 });
      this.gore.spark(npc.x, npc.z, Math.max(0, npc.h) + 40, 0xe8f0ff, 16);
    });
    ev.on('hazardHit', ({ fighter, kind }) => {
      if (fighter === this.player) this.callout(kind === 'fire' ? 'BURNED!' : kind === 'beam' ? 'CRUSHED!' : kind === 'arrow' ? 'PIERCED!' : 'SLASHED!', '#ff9a30', 20);
    });
    ev.on('stageWon', ({ stats }) => {
      // (the level's beaten: the stage-clear tune, once, in place of its track; not where the level says clearTune: false)
      if (this.stageData.clearTune !== false) playCue(this, 'clear');
      if (this.stageData.exit) { this.campaignLevelDone(stats, hud); return; }
      // a long slow moment of victory: he falls at a crawl, the screen shudders, the
      // word hangs there, and only then the tally comes up
      this.slowmo(0.18, 4200);
      this.fx.shake(10, 30);
      this.rumble(1, 0.5, 600);
      this.callout('VICTORY', '#bfe8ff', 40);
      // (the tally is read when it's shown: the killing blow's own kill lands a beat later)
      this.time.delayedCall(4800, () => hud()?.showVictory?.({ ...stats, ...this.stage.stats }));
    });
  }

  // A campaign level walked out of: the level is saved as done (once), the king's scene
  // plays (skippable), then the tally with who was saved and where the road goes next.
  campaignLevelDone(stats, hud) {
    const D = this.stageData;
    const N = nextLevel(D);
    const title = D.doneTitle ?? 'THE PURSUIT GOES ON';
    this.callout(title, '#bfe8ff', 34);
    (this.progress ?? this.netSave)?.finishLevel(D.id, N ? D.next.id : null);
    const story = this.stage.story;
    const saved = (story?.npcs ?? []).filter((n) => story.isRescued(n.id)).map((n) => n.name);
    const lost = (story?.npcs ?? []).filter((n) => story.lost.has(n.id)).map((n) => n.name);
    const tally = () => {
      hud()?.showVictory?.({
        ...stats, ...this.stage.stats,
        campaign: {
          title, saved, lost,
          next: D.next ? `NEXT  ·  ${N?.chapter ?? D.next.chapter ?? ''}  ${D.next.name}${N ? '' : '  (not built yet)'}` : '',
          onward: N ? `ENTER  —  ON TO ${N.name}` : null,
        },
      });
      this.nextReady = !!N; // (ENTER: on to the next level, once the tally is up)
      this.tallyUp = true;
    };
    if (!D.cutaway) { this.time.delayedCall(1600, tally); return; }
    this.time.delayedCall(1800, () => {
      if (!this.sys.isActive()) return;
      this.cutawayOn = true;
      this.scene.launch('Cutaway', { kind: D.cutaway, onDone: () => { this.cutawayOn = false; tally(); } });
    });
  }

  // TEST MODE (config/testMode.js): SHIFT+F9 turns it on or off; while on, END is the next
  // checkpoint and PAGE UP / PAGE DOWN the previous / next level. Never online.
  setupTestKeys() {
    showTestTag();
    const key = (name, fn) => {
      const h = (e) => {
        if (this.session.net || this.cutawayOn || this.skillOpen) return;
        e.preventDefault?.(); // (F9 is Reader View in some browsers)
        fn(e);
      };
      this.input.keyboard.on(`keydown-${name}`, h);
      this.events.once('shutdown', () => this.input.keyboard.off(`keydown-${name}`, h));
    };
    key('F9', (e) => {
      if (!e.shiftKey) return;
      const on = toggleTestMode();
      if (!on) applyTestMode(this.players);
      this.callout(on ? 'TEST MODE ON' : 'TEST MODE OFF', '#ffd27a', 24);
    });
    const go = (stage, section = 0) => {
      if (!TEST.on) return;
      this.setPaused(false);
      this.scene.restart({ ...this.restartData(), stage, section });
    };
    if(!this.session.net) {
      this.testNavigator=new TestNavigator(this,(stage,section,testMoment)=>{
        if(!TEST.on)toggleTestMode();
        this.setPaused(false);
        this.scene.restart({...this.restartData(),stage,section,testMoment,testPreview:true});
      });
      key('F8',()=>this.testNavigator.toggle());
    }
    key('PAGE_DOWN', () => go(levelAfter(this.stageId, 1)));
    key('PAGE_UP', () => go(levelAfter(this.stageId, -1)));
    key('END', () => {
      const i = this.stage.index + 1;
      go(...(i < this.stage.sections.length ? [this.stageId, i] : [levelAfter(this.stageId, 1)]));
    });
  }

  prepareTestMoment(){
    if(!this.testPreview||this.stageId!=='village')return;
    const st=this.stage,kind=this.testMoment;
    if(['mill-rescue','mill-failure'].includes(kind)){
      this.player.x=4750;this.player.z=400;st.fightOn=true;
      if(kind==='mill-failure')st.millRescue.clock=1310;
    }
    if(['cinder','varek'].includes(kind)){
      if(kind==='cinder')st.millRescue.save();
      st.fightOn=true;st.waveIndex=99;st.waveDelay=0;
      this.player.x=(st.section.fightAt??st.section.x0+200)+50;
    }
    if(kind==='impale'){
      // the impale, on demand (Nick, 2026-10-25): on the quiet end of the roofs, clear of
      // their fight, a one-armed grunt runs from you; another each time one is finished
      for(const e of this.world.fighters)if(e.team==='enemy'&&e.x>=st.section.x0&&e.x<st.section.x1)e.removeMe=true;
      this.player.x=st.section.x0+420;this.player.facing=-1;
      const runner=()=>{
        const p=this.player,w=this.world;
        if(this.paused||w.fighters.some(e=>e.testRunner&&e.state!=='dead'))return;
        const e=createEnemy(w,'grunt',p.x+p.facing*80,p.z,{entering:false});
        e.maimed={armB:true};e.testRunner=true;e.facing=p.facing;st.setOnGround(e);
        this.callout('GET BEHIND HIM AND HOLD ATTACK','#ffd27a',22);
      };
      this.time.delayedCall(600,runner);
      this.time.addEvent({delay:1800,loop:true,callback:runner});
    }
    if(kind==='horses'){
      this.player.x=6250;
      const gate=st.props.find(p=>p.tag==='stables');
      if(gate)st.breakProp(gate,1);
    }
    if(kind==='gore')this.goreShowcase();
    if(['handoff','raise'].includes(kind)){
      this.player.x=8830;this.player.z=330;
      this.player.controller.registerPress('padUp');
      st.story.update();
      if(kind==='raise')this.time.delayedCall(150,()=>{
        const c=st.story.current;
        if(c?.beat.id!=='elder')return;
        c.index=c.beat.lines.findIndex(l=>l[2]?.moment==='swordRaised');c.age=0;
        for(let i=0;i<=c.index;i++)st.story.lineCue(c,i);
      });
    }
  }

  // Test scene: a man walks up and is cut down, each a different way in turn, so the
  // severed pieces' bounce, tumble and settle can be watched (effects/SpriteCut.js).
  goreShowcase(){
    const kinds=['decap','halfH','halfV','limbs','headPop','explode'];
    let n=0,target=null;
    // (the street's own fight is sent away: only the one man at a time)
    this.events.on('update',()=>{for(const f of this.world.fighters)if(f.team==='enemy'&&f!==target&&f.alive)f.removeMe=true;});
    this.time.addEvent({delay:1300,loop:true,callback:()=>{
      const p=this.player;
      if(target?.alive){
        const kind=kinds[n++%kinds.length];
        this.world.combat.resolve(p,target,{damage:9999,cut:'slash',unblockable:true,fatality:kind,knockback:{x:220,y:380}},{kind:'melee',dir:p.facing,contact:{x:target.x,h:target.h+target.stats.body.h*.5}});
        this.popup(target.x,target.z-170,kind.toUpperCase(),'#e0c080');
        target=null;return;
      }
      target=createEnemy(this.world,'grunt',p.x+p.facing*120,p.z);
      target.facing=-p.facing;if(target.controller)target.controller.cooldown=9999;
    }});
  }

  // On to the campaign's next level: the same heroes, the health they walked out with.
  // The level and its tally fade to black first, and the next fades up out of it (create),
  // so one level's art never cuts straight onto the next's. (No ticks pass meanwhile:
  // update, so both online machines leave on the same one.)
  goNextLevel() {
    const N = nextLevel(this.stageData);
    if (!N || this.leaving) return;
    this.nextReady = false;
    this.leaving = true;
    const carry = { health: this.players.map((p) => p.health / p.stats.maxHealth) };
    // online: who this level saved goes on with the story (as the campaign save does)
    if (this.netCampaign) {
      const story = this.stage.story;
      const saved = new Set([...(this.netCampaign.saved ?? []), ...(story?.npcs ?? []).filter((n) => story.isRescued(n.id)).map((n) => n.id)]);
      this.netCampaign = { saved: [...saved] };
    }
    const go = () => { this.setPaused(false); this.scene.restart({ ...this.restartData(), stage: this.stageData.next.id, section: 0, carry }); };
    const hudCam = this.scene.get('HUD')?.cameras?.main;
    hudCam?.fadeOut(LEVEL_FADE_MS, 0, 0, 0);
    this.cameras.main.fadeOut(LEVEL_FADE_MS, 0, 0, 0);
    this.time.delayedCall(LEVEL_FADE_MS + 60, go);
  }

  // ------------------------------------------------------------ progression

  // Each hero's stats with his skill picks (a fresh copy each time; health kept in proportion).
  applySkills(fresh = false) {
    if (!this.progress) return;
    for (const p of this.players) {
      const id = this.heroIds[p.seat] ?? this.characterId;
      const share = fresh ? 1 : p.health / p.stats.maxHealth;
      const was = p.stats.sprite;
      p.stats = this.progress.statsFor(id, CHARACTERS[id]);
      // (another sheet: Rurik's old sword, or Oathkeeper once it's his)
      if (p.stats.sprite !== was && this.views?.has(p.id)) { this.views.get(p.id).destroy(); this.views.set(p.id, this.makeView(p)); }
      p.health = Math.max(1, p.stats.maxHealth * share);
      p.airJumpsLeft = Math.min(p.airJumpsLeft, p.stats.airJumps ?? 0);
    }
  }

  setupProgressEvents(ev) {
    const P = this.progress;
    if (!P) return;
    const gain = (text) => this.callout(text, '#ffd24a', 24);
    ev.on('kill', (e) => {
      if (e.defender?.team !== 'enemy') return;
      // (the killer's style rank pays more blood: combat/Style.js)
      const lv = P.addBlood(P.bloodFor(e.defender.stats) * (e.defender.stats.boss ? 3 : 1) * styleMult(e.attacker));
      if (lv > 0) { gain(`LEVEL ${P.level}  ·  +${lv} SKILL POINT`); playSfx(this, 'block', { volume: 0.6, pitch: 700, minGapMs: 0 }); }
    });
    ev.on('sectionClear', ({ section }) => {
      if (!section.waves?.length && !section.boss) return; // (only fights)
      if (P.claim(`${this.stageId}:${section.id}`)) this.time.delayedCall(900, () => gain('FIRST CLEAR  ·  +1 SKILL POINT'));
    });
    ev.on('secretFound', ({ pickup }) => {
      if (P.claim(`${this.stageId}:secret:${Math.round(pickup.x)}`)) this.time.delayedCall(900, () => gain('+1 SKILL POINT'));
    });
    ev.on('challengeStart', () => this.callout('THE BELL TOLLS — HE ANSWERS', '#ff9a30', 24));
    ev.on('challengeWon', ({ prop }) => {
      if (P.claim(`${this.stageId}:bell:${Math.round(prop.x)}`)) gain('CHALLENGE WON  ·  +1 SKILL POINT');
      else this.callout('CHALLENGE WON', '#ffd24a', 24);
    });
    ev.on('restTouch', ({ fighter }) => {
      if (fighter !== this.player) return;
      this.callout('RESTED  ·  stand still to kneel and spend your points', '#ff9a7a', 20);
      playSfx(this, 'block', { volume: 0.4, pitch: 500, minGapMs: 0 });
    });
    ev.on('restKneel', ({ fighter }) => { if (fighter === this.player) this.openSkills(); });
    // a villager saved: kept in the campaign save (they show up later), a little blood
    ev.on('npcRescued', ({ npc }) => {
      if (P.rescue(npc.id)) P.addBlood(30);
    });
    ev.on('npcLost', ({ npc }) => P.lose(npc.id));
    ev.on('horde', ({ count }) => { this.callout(`THE HORDE  ·  ${count} OF THEM`, '#ff9a30', 28); this.fx?.shake(4, 30); });
    // BOSS LOOT: a trophy picked up — which one is decided now, from what's owned (data/trophies.js)
    ev.on('lootDrop', ({ pickup: pk }) => {
      if (pk.from === 'boss') this.time.delayedCall(700, () => this.callout('HE DROPPED SOMETHING', '#ffd24a', 22));
    });
    ev.on('pickup', ({ pickup: pk }) => {
      if (pk.kind !== 'trophy') return;
      const id = pickTrophy(pk, P.trophies.owned, this.world.roll(Math.round(pk.x), 4200));
      playSfx(this, 'block', { volume: 0.7, pitch: 1100, minGapMs: 0 });
      if (!id) { P.addBlood(LOOT.dupeBlood); gain(`NOTHING NEW  ·  +${LOOT.dupeBlood} BLOOD`); return; }
      const T = TROPHIES[id];
      const got = P.addTrophy(id);
      this.callout(`${RARITY[T.rarity].label}:  ${T.name.toUpperCase()}`, '#ffd24a', 26);
      const note = got.worn ? 'WORN' : 'KEPT  ·  your trophy slots are full';
      this.time.delayedCall(1500, () => this.callout(`${T.text}  ·  ${note}`, '#e0c080', 18));
      // worn at once (online, both games change stats together at the next shrine instead)
      if (got.worn && !this.session?.net) this.applySkills();
    });
    // an ending sequence's steps (the judgment), saved the moment they happen
    ev.on('campaignFlag', ({ key }) => P.setFlag(key));
    ev.on('sequenceAward', ({ reward }) => { if (reward && P.claim(reward)) gain('+1 SKILL POINT'); });
  }

  // ------------------------------------------------------------ Rurik's birthright

  // OATHKEEPER IS HIS (data/stageVillage.js 'elder', data/characters.js birthright): Elder
  // Brann gives Rurik his dead father's sword at the north gate. The scene is lit like a
  // sentence (the room goes dark round the two of them, the music falls away), and on the
  // line he takes it the blade wakes: a column of fire round him, a white-gold flash, the
  // ground shaking, its name over the screen, and he stands there with Oathkeeper in his
  // hand (his look and his fire change on the spot: Progress.statsFor).
  setupBirthright(ev) {
    this.birthrightArt = new BirthrightArt(this);
    this.events.once('shutdown',()=>this.birthrightArt.clear());
    const gives = (beat) => beat.lines.some((l) => l[2]?.flag === 'oathkeeper');
    const cam = this.cameras.main;
    ev.on('storyBeat', ({ beat }) => {
      if (!gives(beat) || !this.spotlight) return;
      const R = this.rurikNow();
      const brann = this.stage.story?.npcs.find((n) => n.id === 'hakon');
      if (!R || !brann) return;
      if(this.stageId==='village')playMusic(this,'sanctuary');
      else stopMusic(this, 1800);
      this.spotlight.start({ x: brann.x, z: brann.z, h: 0, stats: { body: { h: 70 } } }, R.f);
      cam.zoomTo(this.baseZoom * 1.1, 1800, 'Sine.easeInOut', true);
      this.birthrightCam = true;
      this.birthrightActive = true;
      this.birthrightArt.show('farewell');
    });
    ev.on('campaignFlag', ({ key }) => { if (key === 'oathkeeper') this.oathkeeperGiven(); });
    ev.on('storyCue',({cue})=>{
      if(cue.moment==='fatherDies')this.birthrightArt.grief();
      if(cue.moment==='mourning'||cue.moment==='fatherRest')this.birthrightArt.show('aftermath');
      if(cue.moment==='swordRaised')this.oathkeeperRaised();
    });
    ev.on('storyBeatDone', ({ beat }) => {
      if (!gives(beat)) return;
      this.birthrightActive=false;
      this.birthrightArt.clear();
      this.spotlight?.stop();
      if (this.birthrightCam) { cam.zoomTo(this.baseZoom, 900, 'Quad.easeInOut', true); this.birthrightCam = false; }
      this.birthGlow?.forEach((g) => this.tweens.add({ targets: g, alpha: 0, duration: 900, onComplete: () => g.destroy() }));
      this.birthGlow = null;
      if(this.stageId!=='village')playMusic(this, this.stageData.music ?? 'battle');
    });
  }

  // Rurik on the field: the hero (if he's played) or the companion beside you.
  rurikNow() {
    const p = this.players.find((q) => (this.heroIds?.[q.seat] ?? this.characterId) === 'warrior');
    if (p) return { f: p, played: true, swap: () => {} }; // (applySkills changed his sheet)
    const c = this.npcView?.companions?.find((k) => k.id === 'warrior');
    if (c) return { f: c.f, played: false, swap: () => { c.view.destroy(); c.f.stats = this.progress?.statsFor('warrior', CHARACTERS.warrior) ?? c.f.stats; c.view = this.makeView(c.f); } };
    return null;
  }

  oathkeeperGiven() {
    this.applySkills(); // (his fire, his look)
    const R = this.rurikNow();
    if (!R) return;
    R.swap();
  }

  oathkeeperRaised() {
    this.birthrightArt.show('raise');
    this.cameras.main.flash(160,255,224,170);
    this.rumble(0.35,0.2,450);
    playSfx(this,'block',{volume:0.45,pitch:600,minGapMs:0});
    this.callout('OATHKEEPER','#ffe0a0',38);
    // and the fire is his: NEW ABILITY, KING'S FIRE, on the button that throws it
    const buttons=this.rurikButtons('magic');
    if(buttons)this.time.delayedCall(700,()=>this.scene.get('HUD')?.newAbility?.({
      name:"KING'S FIRE",buttons,verb:'Press',after:"to hurl Oathkeeper's fire",
    }));
  }

  // The labels of the buttons that do `action` for whoever plays Rurik here (his own
  // bindings: a shared keyboard, player 2's number pad, a gamepad). null: nobody here
  // plays him (he's a companion, or the other machine's hero online).
  rurikButtons(action) {
    const R=this.rurikNow();
    if(!R?.played)return null;
    const inp=this.mode==='net'?(R.f===this.player?this.session?.samplers?.[0]:null):this.session?.samplers?.[R.f.seat];
    if(!inp&&this.mode==='net')return null;
    return actionButtons(action,inp?.bindings??CONTROLS,{keyboard:inp?.useKeyboard??true,pad:inp?inp.padSlot!==null:true});
  }

  openSkills() {
    if (this.skillOpen || !this.progress) return;
    this.skillOpen = true;
    this.scene.launch('Skills', { arena: this, heroId: this.heroIds[this.player.seat] ?? this.characterId, progress: this.progress });
  }

  closeSkills() {
    this.skillOpen = false;
    // (the buttons pressed in the tree don't carry into the fight)
    for (const smp of this.session.samplers ?? [this.controls]) { smp?.read?.(); if (smp) smp.lastPresses = []; }
    for (const p of this.players) p.controller.clearBuffer?.();
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
    // (a stretch narrower than the screen, like a level's last few steps: the view widens
    // to the left, never past the level's end, where nothing is drawn)
    const w = Math.max(SETTINGS.width, this.camR - this.camL);
    const x = Math.max(0, Math.min(this.camL, this.stageWidth - w));
    this.cameras.main.setBounds(x, this.camTop, w, SETTINGS.height - this.camTop);
  }

  // Fell: rise at the section's start, healed, with its fight reset.
  riseAtCheckpoint() {
    this.stage.respawn();
    if (!this.stage.bossSpawned) playMusic(this, this.stageData.music ?? 'battle'); // (died to the boss: back to the battle track)
    this.cuts.clear();
    this.burning.clear();
    this.wrathFX.clear();
    this.world.wraths.clear();
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

  // A beaten boss's sentence (stage/Sentence.js): the field goes still, the lights go
  // down on him and the hero who beat him (view/Spotlight.js) and the camera settles on
  // the two of them and closes in, slowly, all through the words; the words are the story
  // strip's; the blow is the hardest thing in the game: a long freeze, slow motion, a
  // red-white flash, the heaviest shake and sounds, the head going (one of several ways,
  // Sentence HOW HE GOES) and the neck pumping; then the lights come up and his men run.
  setupSentence(ev) {
    const cam = this.cameras.main;
    this.spotlight = new Spotlight(this);
    this.events.once('shutdown', () => this.spotlight?.destroy());
    ev.on('sentenceStart', ({ boss: b, hero: h }) => {
      // (no slow motion: the scene runs on the music's time, see syncSentenceMusic)
      stopMusic(this, 700);
      this.sentenceSong = null;
      this.fx.shake(5, 14);
      this.rumble(0.8, 0.4, 260);
      cam.zoomTo(this.baseZoom * SENTENCE_CAM.start, 1600, 'Sine.easeInOut', true);
      this.sentenceCam = true;
      this.spotlight.start(b, h);
      playSfx(this, 'swingAlt', { volume: 0.5, pitch: -1100, spread: 30, minGapMs: 0 });
      this.popup(b.x, b.z - b.h - b.stats.body.h * (b.stats.size ?? 1) - 40, 'BEATEN', '#d8c8b0', 22);
    });
    ev.on('sentenceKneel', ({ boss: b }) => {
      // the knees hit the ground
      this.time.delayedCall(260, () => {
        if (!this.sys.isActive()) return;
        playSfx(this, 'kick', { volume: 0.9, pitch: -1900, minGapMs: 0 });
        this.fx.shake(3, 8);
        for (const s of [-1, 1]) this.gore.spark(b.x + s * 16, b.z, 4, 0x8a7a60, 8);
      });
    });
    ev.on('sentenceStrike', ({ boss: b, hero: h, dir }) => {
      const H = b.stats.body.h * (b.stats.size ?? 1);
      const kneck = H * 0.57; // (the neck of a man on his knees)
      const neck = b.z - b.h - kneck;
      this.slowmo(0.14, 1300);
      this.fx.shake(14, 26);
      this.rumble(1, 1, 450);
      // (a hot red-white flash over the arena, not a white screen: the blow is still seen)
      const fl = this.add.rectangle(cam.midPoint.x, cam.midPoint.y, 6000, 4000, 0xff9a80, 0.38)
        .setDepth(DEPTH.popups - 3).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: fl, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => fl.destroy() });
      this.spotlight.strike();
      cam.zoomTo(this.baseZoom * SENTENCE_CAM.punch, 110, 'Quad.easeOut', true);
      this.time.delayedCall(1500, () => { if (this.sys.isActive() && this.sentenceCam) cam.zoomTo(this.baseZoom * SENTENCE_CAM.after, 900, 'Quad.easeInOut', true); });
      playSfx(this, 'heavySwing', { volume: 1, spread: 30, minGapMs: 0 });
      playSfx(this, 'finisher', { volume: 1, pitch: -650, spread: 30, minGapMs: 0 });
      playSfx(this, 'kick', { volume: 0.9, pitch: -1400, minGapMs: 0 });
      playSfx(this, 'bloodSplatter', { volume: 1, spread: 40, minGapMs: 0 });
      this.slashStreak(b.x, neck, b.stats.body.w * 1.6, dir, b.z);
      this.gore.spark(b.x, b.z, b.h + kneck, 0xffffff, 26);
      const g = this.gore;
      if (g.level > 0) {
        // a fountain from the neck, straight up and over, for the length of the slow motion
        const amt = g.amount ?? 1;
        g.burst(b.x, b.z, b.h + kneck, dir, Math.round(80 * amt), 1.9);
        g.mist(b.x, b.z, b.h + kneck, 10);
        this.everyTick(70, (t) => {
          if (t % 2) return;
          const r = (lo, hi) => lo + Math.random() * (hi - lo);
          g.spawn({ x: b.x + r(-4, 4), z: b.z + r(-2, 2), h: b.h + kneck - 4, vx: dir * r(20, 140), vz: r(-15, 15), vh: r(180, 380) * (1 - t / 90), tint: 0x8a0303, scale: r(0.4, 0.8) });
          if (t % 12 === 0) g.splat(b.x + dir * r(10, 70), b.z + r(-5, 5), r(1.2, 2.4));
        });
      }
      this.callout('RETRIBUTION', '#ff2a1a', 46);
    });
    ev.on('sentenceDone', ({ routed }) => {
      if (this.sentenceCam) { cam.zoomTo(this.baseZoom, 900, 'Quad.easeInOut', true); this.sentenceCam = false; }
      this.spotlight.stop();
      if (routed.length) this.callout('HIS MEN BREAK AND RUN', '#ffd24a', 24);
    });
  }

  // The sentence's music (stage/Sentence.js `clock`): it starts when the clock reaches
  // its first note and is kept on the clock (a skipped line jumps it on) until the blade
  // falls; then it plays out its fall on its own, and the stage's track comes back.
  syncSentenceMusic() {
    const S = this.stage.sentence;
    if (!S?.running || S.step === 'after' || this.paused) return;
    const want = S.clock / 60;
    if (want < 0) return;
    const s = this.sentenceSong;
    if (!s) {
      this.sentenceSong = playCue(this, 'sentence', want, () => {
        if (this.sys.isActive()) playMusic(this, this.stageData.music ?? 'battle');
      }) ?? false;
    } else {
      // (the words' share of the track is played out and the last line not yet moved on:
      // the music waits with it)
      if (S.waiting && s.isPlaying) s.pause();
      else if (!S.waiting && s.isPaused) s.resume();
      if (s.isPlaying && Math.abs(s.seek - want) > 0.15) s.setSeek(want);
    }
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
        const wound = () => this.views.get(v.id)?.rig?.pin;
        const outX = () => wound()?.x ?? (v.x + dir * v.stats.body.w * 0.4);
        const outH = () => wound() ? v.z-wound().y : v.h+ph;
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
          if (t % 3 === 0) g.spawn({ x: outX() + rnd(-4, 4), z: v.z + rnd(-2, 2), h: outH() - 3, vx: dir * rnd(5, 45), vz: rnd(-8, 8), vh: rnd(-20, 20), tint: 0x7a0303, scale: rnd(0.3, 0.55) });
          if (t % 14 === 0) g.splat(v.x + rnd(-10, 14), v.z + rnd(-3, 3), rnd(0.8, 1.6));
          return true;
        });
        break;
      }
      case 'raised': {
        // heaved up off his feet: the weight comes onto the blade — a heavy jolt, and the
        // wound opens as he slides down the steel
        this.fx.shake(4, 8);
        this.rumble(0.8, 0.3, 160);
        playSfx(this, 'finisher', { volume: 0.6, pitch: -900, spread: 30, minGapMs: 0 });
        playSfx(this, 'swingAlt', { volume: 0.4, pitch: -1000, spread: 30, minGapMs: 0 });
        const pin = this.views.get(v.id)?.rig?.pin;
        if (bloody && pin) {
          g.burst(pin.x, v.z, v.z - pin.y, dir, Math.round(22 * amt), 1.1);
          for (let i = 0; i < 4; i++) g.splat(v.x + rnd(-14, 14), v.z + rnd(-3, 3), rnd(1, 2));
        }
        break;
      }
      case 'kick': {
        // BOOM: the boot lands, the blade rips back out of him and he goes flying off it,
        // spraying out of both holes, trailing blood the length of his flight
        const pin = this.views.get(v.id)?.rig?.pin;
        const hero = this.views.get(p.id)?.sprite;
        const boot = hero?.texture.key.endsWith('-finImpale')
          ? bladeWorldPoint(hero, { x: 490, y: 300 })
          : { x: p.x + dir * 72, y: p.z - p.h - 78 };
        const woundX = pin?.x ?? v.x, woundH = pin ? v.z - pin.y : v.h + H * 0.68;
        playSfx(this, 'kick', { volume: 1, pitch: -700, spread: 30, minGapMs: 0 });
        playSfx(this, 'bladeOut', { volume: 1, spread: 40, minGapMs: 0 });
        playSfx(this, 'bloodSplatter', { volume: 0.9, spread: 60, minGapMs: 0 });
        this.fx.shake(10, 12);
        this.rumble(1, 1, 180);
        this.slowmo(0.55, 160);
        // a hot, tight flash where the boot hits (not a ring: the body is the show)
        const fl = this.add.circle(boot.x, boot.y, 7, 0xffe0b0, 0.7).setDepth(v.z + 2).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: fl, scale: 2.4, alpha: 0, duration: 90, ease: 'Quad.easeOut', onComplete: () => fl.destroy() });
        g.spark(boot.x, v.z, v.z - boot.y, 0xffffff, 12);
        this.callout('OFF THE BLADE!', '#ff2a1a', 26);
        if (!bloody) break;
        g.burst(woundX, v.z, woundH, dir, Math.round(40 * amt), 1.9);   // out the front, the way he goes
        g.burst(woundX, v.z, woundH, -dir, Math.round(18 * amt), 1.1);  // back along the blade as it comes out
        g.mist(woundX, v.z, woundH, 3);
        g.dismemberer?.bits(woundX, v.z - woundH, v.z, ['meat1', 'sinew', 'meat3'], 4, 0.8, dir);
        // the trail: it pours out of him all the way through the air, and splashes where he lands
        this.everyTick(46, (t) => {
          if (t > 6 && v.h <= v.floor + 1) { g.splat(v.x, v.z, rnd(2.5, 4)); return false; } // (down)
          const hh = v.h + H * 0.55;
          g.spawn({ x: v.x - dir * rnd(0, 8), z: v.z + rnd(-2, 2), h: hh, vx: -dir * rnd(20, 90), vz: rnd(-10, 10), vh: rnd(20, 90), tint: 0x8a0303, scale: rnd(0.4, 0.75) });
          if (t % 6 === 0) g.splat(v.x - dir * rnd(10, 40), v.z + rnd(-4, 4), rnd(1.2, 2.4));
          return true;
        });
        break;
      }
      case 'sever':
        this.slowmo(0.28, 420);
        this.fx.shake(7, 12);
        playSfx(this, 'heavySwing', { volume: 0.8, spread: 60 });
        playSfx(this, 'finisher', { volume: 0.7, pitch: -500, spread: 60 });
        playSfx(this, 'bloodSplatter', { volume: 0.9, spread: 80, minGapMs: 0 });
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
      case 'chainCut': // (the blade through and gone: he comes apart)
        playSfx(this, 'bloodSplatter', { volume: 0.8, spread: 80, minGapMs: 60 });
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
    if (f.stats.view === 'hound') return new HoundView(this, f); // (code-drawn until its strips exist)
    if (f.stats.view === 'crusher') return new CrusherView(this, f);
    // named enemies with hand-animated strips (data/enemyStrips.js); the doll runs underneath
    // (strips: wears another's; a boss's own set (`look`) once it's painted, else his kind's)
    const sheets = this.registry.get('enemySprites');
    const sheet = f.team === 'enemy' && !this.dollsOnly && (sheets?.[f.stats.look] ?? sheets?.[f.stats.strips ?? f.stats.id]);
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
      // (my tally is up, the king's scene over: held in my records so both games know)
      this.session.extraHeld = () => (this.tallyUp && !this.cutawayOn ? bitOf('ready') : 0);
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
    this.battlefieldAudio?.update();
    this.fireAmbience?.update(delta); // (fades out while leaving)
    if (this.leaving) return; // (fading out to the next level: goNextLevel)
    this.localKeys();
    const s = this.session;

    // slow motion eases back to full speed once its moment has passed
    if (!this.paused) {
      if (this.time.now > (this.slowUntil ?? 0)) this.timeScale += (1 - this.timeScale) * 0.12;
      if (this.timeScale > 0.995) this.timeScale = 1;
    }
    this.accumulator += Math.min(delta, 100) * (this.paused ? 1 : this.timeScale);
    if (this.skillOpen) this.accumulator = 0; // (kneeling at a shrine: the fight holds still)
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
      if (!s.net) applyTestMode(this.players); // (test mode: can't die, mana never runs out)
      this.world.tick();
      this.keepTogether();
      this.stage.update();
      this.deadTicks = this.allDead ? this.deadTicks + 1 : 0;
      this.gore.update();
      for (const v of this.views.values()) v.applyCut?.(); // (bodies come apart on the tick, not on a screen refresh)
      this.cuts.update();
      this.burning.update([...this.stage.activeFires(), ...this.world.barriers.fireRegions()]);
      runTickJobs(this);
      this.updateWaves();
      s.afterTick?.(tick, () => snapshot(this.world));
    }

    this.syncSentenceMusic();
    syncSanctuaryMusic(this);
    for (const v of this.views.values()) v.update();
    this.liftShadows();
    this.terrainView?.update();
    this.npcView?.update();
    this.speakerMarker?.update();
    this.parallax.update(Math.min(delta, 100) / 1000 * (this.paused ? 0 : 1));
    this.mageFX.update();
    this.rogueFX.update();
    this.quakeFX.update();
    this.wrathFX.update();
    this.updateCamFocus();
    this.updateSentenceCam();
    this.updateFinisherMarker();
    this.stageView.update();
    this.millRescueView?.update();
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
    if (this.session.net && this.campaign && this.stage?.phase === 'won') return this.netWonKeys(recs);
    if (this.cutawayOn) return false; // (the king's scene has the keys: Esc there skips it, not the run)
    const any = (a) => recs.some((r) => pressed(r, a));
    const dead = this.allDead;
    const won = this.stage?.phase === 'won';
    // a campaign level won and its tally up: ENTER goes on to the next level (both online
    // machines on the same tick: it rides in the records)
    if (won && this.nextReady && any('pause')) { this.goNextLevel(); return true; }
    if(this.paused){
      const menu=this.scene.get('HUD')?.pauseMenu;
      if(menu){
        const leaving=menu.handle(recs);
        // The button used to resume must not also swing or jump on this tick.
        return leaving || !this.paused;
      }
    }
    if (any('pause')) {
      // (everyone down: Start / Enter is "rise again", as the death screen says — after
      // a beat, so the blow that killed you can't also skip the death)
      if (dead && !won) { if (this.deadTicks > 20) this.riseAtCheckpoint(); }
      else this.setPaused(!this.paused);
      return false;
    }
    // R: only on the death screen (everyone down) = rise at the last checkpoint. Any other
    // time it does nothing: playing, paused or won, a stray R can't replay the level. To
    // leave a level, Esc back to character select. (Online the records carry it, so one
    // player's R acts for both only when both are down.)
    if (any('restart')) {
      if (dead && !won) { this.setPaused(false); this.riseAtCheckpoint(); }
      return false;
    }
    // Esc: playing = pause; paused / dead / won = back to character select.
    if (any('menu')) {
      if (this.paused || dead || won) {
        this.setPaused(false);
        this.scene.start('Select', this.selectData());
        return true;
      }
      this.setPaused(true);
    }
    return false;
  }

  // Online, a campaign level won: each machine plays the king's scene and puts up its
  // tally in its own time, so nothing local may decide when the game moves on. Only the
  // records do: a press of ENTER (or Esc after the last level) from a player whose tally
  // is up counts, and both games go on the tick every player still here is ready.
  netWonKeys(recs) {
    const live = this.players.map((p) => recs[p.seat] ?? EMPTY);
    const ready = (r) => held(r, 'ready');
    if (!this.netGo) {
      if (recs.some((r) => ready(r) && pressed(r, 'pause'))) this.netGo = 'next';
      else if (recs.some((r) => ready(r) && pressed(r, 'menu'))) this.netGo = 'leave';
      else return false;
      if (!live.every(ready)) this.callout('WAITING FOR YOUR PARTNER', '#9fd0ff', 20);
    }
    if (!live.every(ready)) return false;
    const go = this.netGo;
    this.netGo = null;
    if (go === 'next' && nextLevel(this.stageData)) { this.goNextLevel(); return true; }
    this.scene.stop('Cutaway');
    this.scene.start('Select', this.selectData());
    return true;
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

  // The sentence's camera: while the words are said it keeps closing in on the pair, a
  // little every frame, so the blow falls at its closest (SENTENCE_CAM.creep); the spotlight
  // follows them.
  updateSentenceCam() {
    this.spotlight?.update();
    const S = this.stage.sentence;
    const cam = this.cameras.main;
    // (zoomed in, the camera may come down to them: on a flat stage it never moves up or down)
    const ly = this.sentenceCam ? 0.06 : this.stageData.tall ? 0.09 : 0;
    if (cam.lerp.y !== ly) cam.setLerp(0.12, ly);
    if (!this.sentenceCam || !S?.running || this.paused) return;
    if (cam.zoomEffect?.isRunning) return;
    if (S.step === 'speak' || S.step === 'raise') {
      const want = this.baseZoom * SENTENCE_CAM.creep;
      cam.setZoom(cam.zoom + (want - cam.zoom) * 0.004);
    }
  }

  // What the camera follows: my hero (or, while I'm down, my partner); with two players
  // on this screen, the point between them; during a sentence, the hero and the man on
  // his knees.
  updateCamFocus() {
    const up = this.players.filter((p) => p.alive);
    let x;
    const S = this.stage.sentence;
    const pair = S?.running && S.boss && S.hero;
    if (pair) x = (S.boss.x + S.hero.x) / 2;
    else if (this.mode === 'local' && up.length) x = up.reduce((s, p) => s + p.x, 0) / up.length;
    else x = (this.player.alive || !up.length ? this.player : up[0]).x;
    // a tall stage: the camera rises with the ground under you (not with every jump), with
    // room above your head; on the floor it sits where it always has
    let y = this.player.z;
    // (the pair a little below the middle of the view, clear of the words' box)
    if (pair) y = Math.max(S.boss.z, S.hero.z) - S.hero.stats.body.h * 0.2;
    else if (this.stageData.tall) {
      const who = this.player.alive || !up.length ? this.player : up[0];
      const ground = this.mode === 'local' && up.length ? Math.max(...up.map((p) => Math.max(0, p.floor))) : Math.max(0, who.floor);
      y = who.z - ground - 70;
    }
    this.camFocus.setPosition(x, y);
  }

  // Up on a ledge, a fighter's shadow lies on the ledge (the views put it on the floor).
  liftShadows() {
    if (!this.stage.terrain) return;
    for (const [id, v] of this.views) {
      const f = this.world.fighters.find((o) => o.id === id);
      if (!f || !v.shadow) continue;
      const g = Math.max(0, f.floor);
      if (g > 0) v.shadow.setPosition(f.x, f.z - g).setDepth(f.z - 0.4);
      else if (v.shadow.depth !== DEPTH.shadows) v.shadow.setDepth(DEPTH.shadows);
      // (over a pit: no ground to cast it on)
      if (f.floor < -1) { v.shadow.setVisible(false); v.pitHid = true; } else if (v.pitHid) { v.shadow.setVisible(true); v.pitHid = false; }
    }
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
    const W = SETTINGS.world;
    const heroes = this.players.filter((p) => p.alive);
    for (let i = 0; i < roster.length; i++) {
      // from off-screen, alternating sides; they walk on (Enemy.js offscreenX)
      const x = offscreenX(this.world, heroes, i % 2 === 0 ? 1 : -1, i >> 1);
      const z = W.floorTop + 20 + Math.random() * (W.floorBottom - W.floorTop - 40);
      createEnemy(this.world, roster[i], x, z, { entering: true });
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
