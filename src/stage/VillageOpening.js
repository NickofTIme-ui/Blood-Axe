import { createEnemy } from '../entities/Enemy.js';

// Fixed-tick staging: the formation is real troops; the two commanders are protected
// scene actors and withdraw before control returns. No boss events or rewards.
export class VillageOpening {
  constructor(stage) {
    this.stage = stage;
    this.age = 0; this.phase = 'arrive'; this.active = true;
    this.troops = (stage.section.waves[0] ?? []).map((type,i) => {
      const f = createEnemy(stage.world,type,610 + Math.floor(i/3)*62,310+(i%3)*62);
      f.invincible = true; f.cinematic = true;
      return f;
    });
    this.commanders = [
      { type:'penitent',name:'Brother Cinder',x:790,z:315,size:1.3 },
      { type:'gladiator',name:'Varek, the Ash Captain',x:845,z:430,size:1.75 },
    ].map(def => {
      const f = createEnemy(stage.world,def.type,def.x,def.z);
      f.stats = {...f.stats,name:def.name,size:def.size,boss:false};
      f.invincible = true; f.cinematic = true; f.unbounded = true;
      return f;
    });
    stage.waveIndex = 1;
    for (const [i,p] of stage.players.entries()) {
      p.x = -210-i*46; p.unbounded=true; p.awe=2;
    }
    stage.world.holdStill(2);
  }

  get progress() { return Math.min(1,this.age/72); }

  pose(f,x,z,moving) {
    f.x=x; f.z=z; f.h=f.floor=0; f.vh=f.vz=0;
    f.vx=moving ? 300 : 0; f.facing=1; f.sprinting=moving;
    const state=moving?'walk':'idle';
    if(f.state!==state)f.fsm.change(state);
    f.fsm.frame++;
  }

  update() {
    if(!this.active)return false;
    const st=this.stage;
    if(st.index!==0){this.cancel();return false;}
    this.age++;
    st.world.holdStill(2);
    for(const [i,p] of st.players.entries()) {
      this.pose(p,-210+360*this.progress-i*46,Math.min(500,440+i*26),this.progress<1);
      p.awe=2;
    }
    for(const f of this.troops){f.awe=2;f.invincible=true;f.vx=f.vz=0;f.facing=-1;}
    if(this.age>=72&&this.phase==='arrive')this.phase='words';
    const spent=st.story.done.has('opening') || (st.story.beats.find(b=>b.id==='opening')?.fired&&!st.story.busy);
    if(spent&&this.phase!=='withdraw') {this.phase='withdraw';this.retreat=0;}
    if(this.phase==='withdraw') {
      this.retreat++;
      for(const f of this.commanders)this.pose(f,f.x+5.5,f.z,true);
      if(this.retreat>=92){
        this.active=false;this.phase='done';
        for(const f of this.commanders)f.removeMe=true;
        for(const f of this.troops){f.cinematic=false;f.invincible=false;f.awe=0;}
        for(const p of st.players){
          p.unbounded=false;p.awe=0;p.sprinting=false;p.vx=0;p.fsm.change('idle');
          for(const action of Object.keys(p.controller.pressAge))p.controller.pressAge[action]=Infinity;
        }
        st.world.hold=null; st.fightOn=true;
        st.world.events.emit('fightStart',{index:st.index,section:st.section});
      }
    }else for(const f of this.commanders){f.facing=-1;f.awe=2;f.invincible=true;}
    return true;
  }

  cancel() {
    if(!this.active)return;
    this.active=false;
    for(const f of [...this.commanders,...this.troops])f.removeMe=true;
    for(const p of this.stage.players){p.unbounded=false;p.awe=0;p.vx=0;p.sprinting=false;}
    this.stage.world.hold=null;
  }
}
