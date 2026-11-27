// Level 4's siege interactions. All gameplay uses the world's fixed tick/events.
import {AscentWound} from './AscentWound.js';
import {AscentWind} from './AscentWind.js';
export class AscentSiege {
  constructor(stage) {
    this.stage = stage;
    this.wind = new AscentWind(stage); // (the gusts off the peaks: stage/AscentWind.js)
    stage.world.events.on('bossPhase',({boss,phase})=>{
      const n=stage.story.npc('nicholas');
      if(phase.id==='barrage'&&stage.index===5&&n?.state==='guide')this.wound=new AscentWound(stage,boss,n);
    });
    stage.world.events.on('propsDown', ({tag}) => {
      if (tag === 'battery') stage.openWay('batteryGate');
    });
    stage.world.events.on('shellLand',({hazard:h,shell:s})=>{
      if(!h.destructive||h.visualOnly||h.friendly)return;
      for(const p of stage.props){if(p.broken||Math.abs((p.y??0)-(s.y??0))>50)continue;
        if(Math.abs(p.x-s.x)<95+p.w*.25&&Math.abs(p.z-s.z)<48)stage.breakProp(p,Math.sign(p.x-s.x)||1,true,4);
      }
    });
    stage.world.events.on('shellLand', ({hazard, shell}) => {
      if (hazard.visualOnly || hazard.friendly || hazard.silence !== 'battery' || stage.index !== 4) return;
      for (const prop of stage.props) {
        if (prop.tag !== 'battery' || prop.broken || Math.abs(prop.y - shell.y) > 45) continue;
        if (Math.abs(prop.x-shell.x) > prop.w*0.55+24 || Math.abs(prop.z-shell.z) > 54) continue;
        stage.strikeProp(prop, Math.sign(prop.x-shell.x)||1, 4);
        stage.world.events.emit('ascentEngineHit', {prop});
      }
    });
    stage.world.events.on('storyBeat', ({beat}) => {
      if(beat.id==='lastWords')this.farewell=true;
    });
    stage.world.events.on('storyBeatDone', ({beat}) => {
      if(beat.id==='lastWords')this.farewell=false;
    });
    stage.world.events.on('storyCue', ({cue}) => {
      const n=stage.story.npc('nicholas');
      if(n && cue.moment?.startsWith('nicholas')) {n.farewellMoment=cue.moment;n.farewellAt=n.t;}
    });
    stage.world.events.on('npcStruck', ({npc}) => {
      if (npc.id !== 'nicholas') return;
      npc.farewellMoment=null;npc.farewellAt=0;
      // The axe strike supplies its own impact; no unrelated artillery explosion.
    });
  }
  update() {
    this.wind.update();
    const n=this.stage.story.npc('nicholas');
    if(this.wound&&!this.wound.update())this.wound=null;
    if(n?.state==='guide'){n.farewellMoment=null;this.farewell=false;}
    if(this.farewell && n?.state==='dying'){
      // Bring the playable party alongside him while the held scene owns input.
      this.stage.players.filter(p=>p.alive).forEach((p,i)=>{
        const rurik=p.stats.id==='warrior',x=n.x+(rurik?95:195+i*65),z=n.z+(rurik?18:55+i*22);
        p.x+=(x-p.x)*.06;p.z+=(z-p.z)*.06;p.facing=-1;
        p.vx=p.vz=p.vh=0;this.stage.placeOnGround(p);
      });
    }
    // A saved checkpoint may restore the terrain before the broken prop state.
    if (this.stage.props.filter(p=>p.tag==='battery').every(p=>p.broken)) this.stage.openWay('batteryGate');
  }
}
