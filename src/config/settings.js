// settings.js — Global game settings: screen size, arena size, "game feel" timings,
// gore level and debug toggle. Tweak numbers here; no other file needs to change.
//
// NOTE ON UNITS: all combat timing is in FRAMES at a fixed 60 frames per second.
// 1 frame = ~16.7 ms, 6 frames = 100 ms, 60 frames = 1 second.
// Speeds are in pixels per second.

export const SETTINGS = {
  title: 'Blood Axe: Oath of Vengeance',
  width: 960,
  height: 540,
  // The game world is 960 x 540 "units", but it's DRAWN at this multiple (2 = 1920 x 1080),
  // so art, text and effects stay sharp on big screens. Gameplay is unaffected.
  renderScale: 2,
  fps: 60,

  // The test arena. The "floor lane" is the band of ground you can walk up/down in.
  world: {
    width: 5600,       // total stage width in pixels (camera scrolls across it; data/stage.js)
    floorTop: 282,     // highest (furthest back) point you can walk to (238 px of lane: was 330, +25%)
    floorBottom: 520,  // lowest (closest to camera) point you can walk to
    edgePadding: 30,   // keep fighters this far from the arena's left/right edges
  },

  // "Game feel" — the numbers that make combat snappy.
  feel: {
    inputBufferFrames: 8,   // ~133 ms: a button pressed this early still counts
    jumpBufferFrames: 8,    // jump pressed this long before landing still jumps
    coyoteFrames: 6,        // can still jump this long after leaving the ground
    jumpCut: 0.45,          // let go of jump while rising: keep this share of the speed (short hop)
    depthTolerance: 22,     // default: how close in depth (up/down) a hit must be to connect
    maxHitstop: 20,         // cap on freeze frames for any single hit
    killHitstop: 16,        // extra-long freeze on the killing blow
    parryHitstop: 12,       // freeze when a parry lands
    guardBreakFrames: 55,   // how long a guard-broken fighter is stunned
    counterMultiplier: 1.5, // damage bonus when hitting a staggered / guard-broken enemy
    critChance: 0.12,       // chance a hero's clean hit is a CRITICAL (a hero can set stats.critChance)
    critMultiplier: 1.75,   // damage on a critical hit
  },

  // Gore: 0 = OFF, 1 = LOW, 2 = FULL. Press G in game to cycle.
  gore: {
    level: 2,
    names: ['OFF', 'LOW', 'FULL'],
    maxDrops: 700,          // cap on live blood particles (performance safety)
  },

  shake: { enabled: true, scale: 1 },

  // High-res ground art (view/envArt.js). pick: 'cathedral' | 'village' | 'castle'.
  // F3 in the arena cycles through them.
  ground: { pick: 'cathedral', brightness: 0.85 },

  // Music volume 0..1. Press M in game to mute/unmute.
  audio: { music: 0.5, muted: false, sfx: 0.8 },

  // Online co-op: the servers that help two browsers find a path to each other.
  // STUN finds a direct line, which works for many home networks. When the two networks
  // won't allow one (most mobile hotspots and carriers, many routers, offices) the only way
  // through is a TURN relay that passes the game's messages along. PeerJS runs a free one
  // (turn.peerjs.com): it must stay in this list, since giving PeerJS our own list replaces
  // its built-in one. A paid or self-hosted relay can be added beside it, e.g.
  //   { urls: 'turn:<host>:443?transport=tcp', username: '<user>', credential: '<pass>' }
  // broker: the matchmaking server (null = PeerJS's free public one, 0.peerjs.com), or
  //   { host, port, path, secure } for a self-hosted PeerJS server.
  net: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
    ],
    broker: null,
  },

  // Debug overlay (hitboxes, hurtboxes, state names, frame counts). Toggle in game with F2 or `.
  debug: false,
};
