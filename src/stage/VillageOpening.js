import { createEnemy } from '../entities/Enemy.js';

// THE STANDOFF (Nick, 2026-10-23), fixed-tick staging so both online players see it frame
// for frame. The Ashen grunts stand in formation on the right, Brother Cinder and Varek
// behind them with a villager on his knees at Varek's feet. The Oath Keepers sprint in
// from the left and skid to a stop facing the line. The held 'opening' beat
// (data/stageVillage.js) plays the words; its silent third line is Varek's mace coming
// down on the villager (OPENING.strike); then "Cut them down!". The two commanders turn and
// run off to the right, the front rank charges, the HUD comes up and the heroes are freed.
// The formation is real troops; the commanders are protected scene actors (no boss events
// or rewards). A skipped scene still kills the villager: what it changes isn't skippable.
export const OPENING = {
  rush: 58,       // frames of the sprint in
  skid: 18,       // then the skid to a stop
  from: -230, to: 150, // where the heroes run from and stop
  run: 9,         // the commanders' run off (px a frame)
  gone: 1420,     // ...until they're this far along, out of sight
  charge: 30,     // frames the front rank charges before the heroes are let go
  strikeLine: 2,  // the opening beat's silent line: the strike
  captive: 'captive',
  // the blow (Nick's QA, 2026-10-24: more weight): the mace hangs at the top of his
  // swing before it drops, the frame freezes on the hit, then the swing follows through
  apex: 6,        // frames before contact that the mace is at the top of the swing...
  hang: 14,       // ...and how long it hangs there (the villager's dread peaks)
  freeze: 9,      // the hit: everything holds this many frames
};

// The line isn't a grid (Nick's playtest, 2026-10-24): a loose mob, hand-placed, each grunt
// with his own habits. Until he turns to face the heroes he mills about (pacing his own
// stretch of road, some of them watching Varek and the villager); after that he holds his
// ground with the odd shift of weight. The front three charge on the order, each at his own
// pace and a beat apart; the rear three are let go raggedly after them. Fixed numbers, no
// dice, so both online players see the same mob.
export const MOB = [
  // x, z: where he stands; look: which way he faces while milling (1 = toward Varek);
  // pace: how far he walks to and fro; rest: frames he stands at each end; turn: the
  // frame he squares up to the heroes; shift: frames between his weight shifts after that;
  // delay/speed: his charge; hold: frames he waits after the heroes are let go (rear rank)
  { x:598, z:452, look:-1, pace:22, rest:20, turn:34, shift:70, delay:0,  speed:4.4 },
  { x:631, z:371, look: 1, pace:0,  rest:0,  turn:52, shift:95, delay:6,  speed:3.7 },
  { x:654, z:316, look: 1, pace:34, rest:14, turn:66, shift:83, delay:11, speed:4.0 },
  { x:690, z:476, look:-1, pace:16, rest:30, turn:44, shift:110, hold:16 },
  { x:716, z:401, look: 1, pace:0,  rest:0,  turn:72, shift:77, hold:29 },
  { x:744, z:333, look:-1, pace:26, rest:24, turn:58, shift:101, hold:41 },
];

export class VillageOpening {
  constructor(stage) {
    this.stage = stage;
    this.age = 0; this.phase = 'arrive'; this.active = true;
    this.troops = (stage.section.waves[0] ?? []).map((type,i) => {
      const m = MOB[i % MOB.length], f = createEnemy(stage.world,type,m.x,m.z);
      f.invincible = true; f.cinematic = true;
      f.front = m.hold == null; // (the ones nearest the heroes: they charge first)
      f.mob = m; f.facing = m.look;
      return f;
    });
    this.commanders = [
      { type:'penitent',name:'Brother Cinder',x:800,z:315,size:1.3 },
      { type:'gladiator',name:'Varek, the Ash Captain',x:860,z:432,size:1.75,varek:true },
    ].map(def => {
      const f = createEnemy(stage.world,def.type,def.x,def.z);
      f.stats = {...f.stats,name:def.name,size:def.size,boss:false};
      f.invincible = true; f.cinematic = true; f.unbounded = true;
      if (def.varek) this.varek = f;
      return f;
    });
    stage.waveIndex = 1;
    for (const [i,p] of stage.players.entries()) {
      p.x = OPENING.from-i*46; p.unbounded=true; p.awe=2;
    }
    stage.world.holdStill(2);
  }

  // how far the heroes' run in has got (0..1), the skid included
  get progress() { return Math.min(1,this.age/(OPENING.rush+OPENING.skid)); }
  // where a hero is along the run in: a flat sprint, then easing to a stop in the skid
  runX(t) {
    const R=OPENING.rush, S=OPENING.skid, span=OPENING.to-OPENING.from;
    const v=span/(R+S/2); // the sprint's speed (the skid covers half what it would at speed)
    if(t<=R)return OPENING.from+v*t;
    if(t>=R+S)return OPENING.to;
    const k=(t-R)/S;
    return OPENING.from+v*R+v*S*(k-k*k/2);
  }
  get skidding() { return this.age>OPENING.rush && this.age<=OPENING.rush+OPENING.skid; }

  pose(f,x,z,moving,facing=1,state=moving?'walk':'idle') {
    f.vx=(x-f.x)*60; f.x=x; f.z=z; f.h=f.floor=0; f.vh=f.vz=0;
    f.facing=facing; f.sprinting=moving;
    if(f.state!==state)f.fsm.change(state);
    f.fsm.frame++;
  }

  // Before the order: one grunt's milling. Pacing his stretch of road and facing the way he
  // walks until his turn comes; then squared up to the heroes, shifting his weight now and then.
  mill(f) {
    const m=f.mob, t=this.age;
    if(t<m.turn&&m.pace){
      const leg=m.pace+m.rest, k=(t+m.pace*2)%(leg*2); // (each starts partway along)
      const out=k<leg, step=Math.min(m.pace,out?k:k-leg);
      const at=out?step:m.pace-step, walking=(out?k:k-leg)<m.pace;
      const dir=(out?1:-1)*m.look;
      this.pose(f,m.x+at*m.look,f.z,walking,walking?dir:m.look);
      f.sprinting=false;
      return;
    }
    if(t<m.turn){this.pose(f,f.x,f.z,false,m.look);return;}
    // squared up: every so often a short step, alternately in and out of the lane
    const s=(t-m.turn)%m.shift, n=Math.floor((t-m.turn)/m.shift);
    const moving=n>0&&s<8;
    this.pose(f,f.x,f.z+(moving?(n%2?0.75:-0.75):0),moving,-1);
    f.sprinting=false;
  }

  get captive() { return this.stage.story?.npc(OPENING.captive); }

  // Varek's mace comes down: a heavy overhead blow, frame-stepped by hand (he stays frozen)
  strike() {
    if(this.struck)return;
    this.struck=1;
    const f=this.varek;
    f.facing=-1;
    if(f.stats.moves.heavy)f.fsm.change('heavy');
    f.facing=-1;
  }

  kill() {
    const n=this.captive;
    this.killed=true;
    if(n&&n.state!=='dead'){
      n.state='dead';n.t=0;n.slain=true;n.freeze=OPENING.freeze;
      this.stage.world.events.emit('openingKill',{npc:n,by:this.varek,x:n.x,z:n.z,dir:-1});
    }
  }

  update() {
    if(!this.active)return false;
    const st=this.stage;
    if(st.index!==0){this.cancel();return false;}
    this.age++;
    st.world.holdStill(2);
    for(const [i,p] of st.players.entries()) {
      const moving=this.age<=OPENING.rush;
      // the skid: feet planted, sliding to a stop in his stance
      this.pose(p,this.runX(Math.min(this.age,OPENING.rush+OPENING.skid))-i*46,Math.min(500,440+i*26),moving);
      if(this.skidding&&(this.age-OPENING.rush)%3===1)st.world.events.emit('openingSkid',{fighter:p,first:this.age===OPENING.rush+1});
      p.awe=2;
    }
    if(this.phase!=='withdraw')for(const f of this.troops){f.awe=2;f.invincible=true;this.mill(f);}
    if(this.age>=OPENING.rush+OPENING.skid&&this.phase==='arrive')this.phase='words';
    const story=st.story;
    const c=story.current;
    // the silent line: his blow
    if(c?.beat.id==='opening'&&c.cued?.has(OPENING.strikeLine))this.strike();
    if(this.struck&&this.struck<999) {
      const f=this.varek, m=f.move;
      this.struck++;
      if(f.state==='heavy'&&m){
        const hit=m.startup+1;
        // the top of the swing: the mace hangs a moment; the hit: the frame freezes
        const atTop=f.fsm.frame===hit-OPENING.apex&&(this.hung??=0)<OPENING.hang;
        if(atTop)this.hung++;
        else if(this.frozen>0)this.frozen--;
        else f.fsm.frame++;
        if(f.fsm.frame===hit&&!this.killed){this.kill();this.frozen=OPENING.freeze;}
        if(f.fsm.frame>=m.startup+m.active+m.recovery)f.fsm.change('idle');
      }else this.kill();
      if(f.state!=='heavy')this.struck=999;
    }
    // the man at his feet: shaking from the start, worse as the mace goes up
    const n=this.captive;
    if(n&&n.state!=='dead')n.dread=this.struck?Math.min(1,0.4+(this.hung??0)/OPENING.hang*0.6):0.25;
    const spent=story.done.has('opening') || (story.beats.find(b=>b.id==='opening')?.fired&&!story.busy);
    if(spent&&this.phase!=='withdraw') {
      this.phase='withdraw';this.retreat=0;
      this.kill(); // (the scene skipped before his blow: it still fell)
      if(this.varek.state==='heavy')this.varek.fsm.change('idle');
    }
    if(this.phase==='withdraw') {
      this.retreat++;
      // the commanders turn and run off to the right
      for(const f of this.commanders)this.pose(f,f.x+OPENING.run,f.z,true,1);
      // the front rank charges at them
      for(const f of this.troops){
        f.awe=2;f.invincible=true;
        if(f.front&&this.retreat>f.mob.delay){
          const target=st.players.reduce((a,p)=>!a||Math.abs(p.z-f.z)<Math.abs(a.z-f.z)?p:a,null);
          const dz=target?Math.sign(target.z-f.z)*Math.min(1.5,Math.abs(target.z-f.z)):0;
          this.pose(f,f.x-f.mob.speed,f.z+dz,true,-1);
        }else this.pose(f,f.x,f.z,false,-1);
      }
      if(this.retreat>=OPENING.charge){
        this.active=false;this.phase='done';
        for(const f of this.troops){
          f.cinematic=false;f.invincible=false;f.sprinting=false;
          f.awe=f.mob.hold??0; // (the rear rank raggedly after them)
          f.fsm.change('idle');
        }
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

  // After the heroes are let go: the commanders are still running off the screen. Keep
  // them out of the fight (frozen, untouchable) until they're gone.
  tail() {
    if(this.active||!this.commanders.some(f=>!f.removeMe))return;
    for(const f of this.commanders){
      if(f.removeMe)continue;
      f.awe=2;f.invincible=true;
      this.pose(f,f.x+OPENING.run,f.z,true,1);
      if(f.x>OPENING.gone)f.removeMe=true; // (well off the screen)
    }
  }

  cancel() {
    if(!this.active)return;
    this.active=false;
    for(const f of [...this.commanders,...this.troops])f.removeMe=true;
    for(const p of this.stage.players){p.unbounded=false;p.awe=0;p.vx=0;p.sprinting=false;}
    this.stage.world.hold=null;
    const n=this.captive; if(n)n.state='dead';
  }
}
