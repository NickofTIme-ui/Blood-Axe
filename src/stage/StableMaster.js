// A local performance, not a story beat: it never holds the player or opens UI.
// ALARM: two hops of panic (crouch, leap, land), a moment pointing at the fire, a turn;
// then he FLEES: he picks up speed over a few strides, and his run frames follow the
// ground he covers (view/StableMasterView.js), so his boots never slide.
export const STABLE_MASTER = {
  hop: 72, hops: 2,    // each hop: crouch, airborne, land
  crouch: 14, air: 36, // frames of a hop spent crouched, then in the air
  hopHeight: 18,
  alarm: 210,          // the whole alarm (the rest of it: pointing, then the turn)
  turn: 14,            // its last frames: he turns to run
  speed: 230 / 60,     // top running pace, px a frame
  accel: 0.22,         // px a frame he gains each frame until he's at it
  cycle: 128,          // ground covered by one full run cycle (two strides)
  bob: 3,              // how far a stride lifts him
  flee: 850,           // gone this far back up the street
};

export function updateStableMaster(n,heroes,terrain) {
  const S=STABLE_MASTER;
  const floor=Math.max(0,terrain?.groundAt(n.x,n.z)??0);
  let lift=0;
  if(n.state==='waiting'){
    if(heroes.some(p=>p.x>=n.warningAt&&p.x<n.home.x+450)){
      n.state='alarm';n.t=0;
    }
  }else if(n.state==='alarm'){
    const hop=n.t<S.hop*S.hops?(n.t%S.hop-S.crouch)/S.air:-1;
    if(hop>0&&hop<1)lift=S.hopHeight*4*hop*(1-hop);
    if(n.t>=S.alarm){n.state='fleeing';n.t=0;n.v=0;n.stride=0;}
  }else if(n.state==='fleeing'){
    n.v=Math.min(S.speed,(n.v??0)+S.accel);
    n.x-=n.v;n.dir=-1;n.stride=(n.stride??0)+n.v;
    // two strides a cycle; he's lowest as each foot lands, highest pushing off
    lift=S.bob*(n.v/S.speed)*Math.abs(Math.sin(n.stride/S.cycle*Math.PI*2));
    if(n.x<n.home.x-S.flee)n.state='gone';
  }
  n.h=floor+lift;
}

// Which of the sheet's frames he shows: 0 stand, 1 crouch, 2 leap, 3 point,
// then the run cycle (`run` frames from 4).
export function stableMasterFrame(n,run=4) {
  const S=STABLE_MASTER;
  if(n.state==='fleeing'){
    const ramp=Math.min(1,(n.stride??0)/(S.cycle/run)); // (his first step out of the turn)
    return 4+(ramp<1?0:Math.floor((n.stride/S.cycle)*run)%run);
  }
  if(n.state!=='alarm')return 0;
  if(n.t<S.hop*S.hops){
    const at=n.t%S.hop;
    return at<S.crouch?1:at<S.crouch+S.air?2:at<S.crouch+S.air+10?1:3;
  }
  if(n.t>=S.alarm-S.turn)return 0;
  return Math.floor(n.t/20)%3===2?1:3; // pointing at the fire, jabbing at it
}
