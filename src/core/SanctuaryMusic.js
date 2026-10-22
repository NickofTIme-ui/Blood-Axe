import { playMusic } from './Music.js';

// The sanctuary theme takes over only after Varek's battle and execution finish.
// Repeated calls preserve the same loop, including throughout the father's scene.
export function syncSanctuaryMusic(scene, play = playMusic) {
  const st=scene.stage;
  if(scene.stageId!=='village'||scene.leaving||st?.section?.id!=='gate'||st.sentence?.running||st.sequence?.running)return false;
  const father=st.story?.npc('hakon');
  if(!father||!scene.players.some(p=>p.alive&&Math.abs(p.x-father.x)<=700))return false;
  play(scene,'sanctuary');
  return true;
}
