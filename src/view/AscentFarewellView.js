import {HERO_VISUAL_SCALE} from './depths.js';
// Nicholas's farewell: draw attention to the people, then let the mountain go quiet.
import {stopMusic} from '../core/Music.js';
import {playSfx} from '../core/Sfx.js';
import {SPRITES} from './levelArt.js';
import {depthScale} from './depths.js';
export class AscentFarewellView {
 constructor(scene,events){
  this.scene=scene;this.active=false;
  events.on('orskWoundHit',({boss,npc})=>{
   scene.gore.burst(npc.x,npc.z,(npc.h??0)+55,boss.facing,22,1.2);
   playSfx(scene,'dkBone',{volume:.65,pitch:-150,minGapMs:0});
   scene.cameras.main.shake(200,.004);
  });
  events.on('npcStruck',({npc})=>{
   if(npc.id!=='nicholas')return;
   scene.cameras.main.shake(180,.002);
  });
  events.on('storyBeat',({beat})=>{
   if(beat.id!=='lastWords')return;
   const npc=scene.stage.story.npc('nicholas');if(!npc)return;
   this.active=true;this.npc=npc;
   stopMusic(scene,1200);
   scene.cameras.main.zoomTo(scene.baseZoom*1.13,1800,'Sine.easeInOut',true);
   const hero=scene.rurikNow()?.f??scene.player;
   for(const p of scene.players)if(p.alive)p.fsm.change('idle');
   scene.spotlight?.start({x:npc.x,z:npc.z,h:npc.h,stats:{body:{h:80}}},hero);
   if(scene.spotlight)scene.spotlight.dark=.45;
  });
  events.on('storyCue',({cue})=>{
   if(cue.moment==='nicholasDies')playSfx(scene,'block',{volume:.10,pitch:-850,minGapMs:1000});
  });
  events.on('storyBeatDone',({beat})=>{
   if(beat.id!=='lastWords')return;
   this.active=false;scene.spotlight?.stop();
   scene.scene.get('HUD')?.showGo?.(true);
   this.restoreActor();
   scene.cameras.main.zoomTo(scene.baseZoom,1400,'Sine.easeInOut',true);
   // Leave the battlefield music silent through the pass and the survivors.
  });
 }
 restoreActor(){
  this.actor?.setVisible(false);
  if(this.hiddenView?.sprite?.active)this.hiddenView.sprite.setVisible(true);
  this.hiddenView=null;
 }
 update(){
  if(!this.active)return;
  const scene=this.scene,R=scene.rurikNow(),S=SPRITES['rurik-farewell'];
  if(!R||!S)return;
  const f=R.f,n=this.npc;
  if(Math.abs(f.x-(n.x+95))>45)return;
  const moment=n.farewellMoment,frame=moment==='nicholasDies'?3:moment==='nicholasReach'?1:2;
  this.actor??=scene.add.image(0,0,S.key,'f0').setOrigin(.5,1);
  const scale=depthScale(f.z)*.5*HERO_VISUAL_SCALE;
  this.actor.setTexture(S.key,'f'+frame).setPosition(f.x,f.z-f.h)
   .setScale(scale).setFlipX(true).setDepth(f.z+.1).setVisible(true);
  const view=R.played?scene.views.get(f.id):scene.npcView.companions.find(c=>c.id==='warrior')?.view;
  if(this.hiddenView&&this.hiddenView!==view)this.restoreActor();
  this.hiddenView=view;
  view?.sprite?.setVisible(false);
 }
}
