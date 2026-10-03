// Link.js — The wire between two players' browsers (online co-op).
//
// The two browsers talk to each other directly (WebRTC). To find each other they need an
// introduction: the host registers under a short room code with a public matchmaking
// service, the guest asks that service for the same code, and from then on the service
// is out of the picture. PeerJS (https://peerjs.com, its free public service) does the
// introductions; its script is only fetched when someone actually opens the online menu,
// so the single-player game never depends on it.
//
//   const link = await hostRoom(code)   // resolves when a friend has joined
//   const link = await joinRoom(code)   // resolves when connected to the host
//   link.send(obj)  link.onData(fn)  link.onClose(fn)  link.close()
//
// Many networks (mobile hotspots and carriers, some routers, offices) don't allow a direct
// line between two homes; then the line goes through a TURN relay (config/settings.js
// net.iceServers). Every way a join can fail ends in a message on both players' screens:
// the matchmaker can't be reached, no room has that code, or the room was found but no
// line could be made.

import { simVersion } from './Version.js';
import { SETTINGS } from '../config/settings.js';

// (STUN and TURN servers, and the matchmaker if not PeerJS's own: config/settings.js net)
const peerOptions = () => ({
  ...(SETTINGS.net?.broker ?? {}),
  config: { iceServers: SETTINGS.net?.iceServers ?? [] },
});

// How long each step may take before the player is told it failed.
export const WAIT = {
  broker: 12000,  // reaching the matchmaker
  line: 30000,    // from the room being found to the line being open (relays can be slow)
};

const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const prefix = () => 'blood-axe-oath-';

// When the line is up, both say which game they're running (net/Version.js) and when it
// was built (window.BUILD_TIME, stamped by tools/build-release.ps1). Different games
// can't play together (the two would drift apart at once), so the join fails — with a
// message saying who has to refresh — instead of a fight that falls apart.
export const buildTime = () => Number(globalThis.BUILD_TIME) || 0;
export function handshake(link, version = simVersion()) {
  return new Promise((resolve, reject) => {
    const mine = { k: 'hello', v: version, built: buildTime() };
    link.onData((m) => {
      if (m?.k !== 'hello') return;
      link.onData(null); // (anything after this waits for the next listener)
      if (m.v === mine.v) return resolve(link);
      link.close();
      let msg = `Your friend is running a different version of the game\n(yours ${mine.v}, theirs ${m.v}).`;
      if (m.built && mine.built && m.built !== mine.built) {
        msg += m.built > mine.built
          ? '\nTheirs is newer: refresh this page (Ctrl+F5) and try again.'
          : '\nYours is newer: they need to refresh their page (Ctrl+F5).';
      } else msg += '\nBoth refresh the page (Ctrl+F5) and try again.';
      reject(new Error(msg));
    });
    link.send(mine);
    setTimeout(() => reject(new Error('Connected, but your friend\'s game did not answer.\nBoth refresh the page (Ctrl+F5) and try again.')), 8000);
  });
}

let loading = null;
function loadPeerJs() {
  if (window.Peer) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error('Could not reach the matchmaking service (are you online?)')); };
    document.head.appendChild(s);
  });
  return loading;
}

// Room codes: 4 letters, none that are easily confused when read out.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function newCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return c;
}

function wrap(peer, conn) {
  const link = {
    data: null, closed: null, open: true, q: [],
    send(obj) { if (link.open) { try { conn.send(obj); } catch { /* closing */ } } },
    // (messages that arrive while nobody is listening — between the lobby and the game
    // starting — are kept and handed to the next listener, in order)
    onData(fn) { link.data = fn; if (fn) { const q = link.q; link.q = []; q.forEach((m) => fn(m)); } },
    onClose(fn) { link.closed = fn; if (fn && !link.open) fn(); },
    close() { link.open = false; try { conn.close(); } catch { /* */ } try { peer.destroy(); } catch { /* */ } },
  };
  conn.on('data', (m) => (link.data ? link.data(m) : link.q.push(m)));
  const gone = () => { if (!link.open) return; link.open = false; link.closed?.(); };
  conn.on('close', gone);
  conn.on('error', gone);
  peer.on('disconnected', () => { /* the matchmaker dropped: the direct line still works */ });
  return link;
}

const friendly = (err) => {
  const t = err?.type ?? '';
  if (t === 'unavailable-id') return 'That room code is in use — try again.';
  if (t === 'peer-unavailable') return 'No game found with that code.\nCheck the code, and that your friend is still on the HOST screen.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Could not reach the matchmaking service.\nCheck your internet connection and try again.';
  if (t === 'browser-incompatible') return 'This browser cannot do online play.';
  return err?.message ?? 'Connection failed.';
};

export const NO_LINE = 'Found your friend\'s room, but could not connect to it.\nOne of your networks is blocking the connection\nand the relay server could not get through either.\nTry again; if it keeps failing, try another network\n(e.g. not a phone hotspot or work/school network).';
export const NO_LINE_HOST = 'Your friend found this room, but could not connect to it:\none of your networks blocked the line and the relay didn\'t get through.';
const NO_BROKER = 'Could not reach the matchmaking service.\nCheck your internet connection and try again.';

// Watch a connection that is being set up: calls fail(msg) if the browsers give up on
// finding a path (ICE "failed") or it isn't open within WAIT.line. Returns stop().
function watchLine(conn, fail) {
  const started = Date.now();
  const timer = setInterval(() => {
    const pc = conn.peerConnection;
    const ice = pc?.iceConnectionState;
    if (ice === 'failed' || pc?.connectionState === 'failed' || Date.now() - started > WAIT.line) fail(NO_LINE);
  }, 250);
  return () => clearInterval(timer);
}

// Host: open a room. Returns { link: Promise<link>, cancel() }; onReady() fires once the
// room is registered (the code can be shown). onTrouble(msg) fires when a friend found the
// room but the line to them failed: the room stays open so they can try again.
export function hostRoom(code, onReady, onTrouble) {
  let peer = null;
  let cancelled = false;
  let registered = false;
  const link = loadPeerJs().then(() => new Promise((resolve, reject) => {
    if (cancelled) return reject(new Error('cancelled'));
    const fail = (msg) => { try { peer.destroy(); } catch { /* */ } reject(new Error(msg)); };
    peer = new window.Peer(prefix() + code, peerOptions());
    const brokerTimer = setTimeout(() => { if (!registered) fail(NO_BROKER); }, WAIT.broker);
    peer.on('open', () => { registered = true; clearTimeout(brokerTimer); onReady?.(); });
    peer.on('error', (e) => {
      // (a guest's failed attempt is handled per connection below, and a dropped matchmaker
      // by 'disconnected'; anything else ends the room)
      if (registered && ['webrtc', 'peer-unavailable', 'network', 'disconnected'].includes(e?.type)) return;
      fail(friendly(e));
    });
    // The matchmaker dropped us (idle socket, sleeping laptop): re-register, or nobody can find the room.
    peer.on('disconnected', () => { if (!cancelled && !peer.destroyed) { try { peer.reconnect(); } catch { /* */ } } });
    peer.on('connection', (conn) => {
      let done = false;
      const stop = watchLine(conn, () => {
        if (done) return;
        done = true; stop();
        try { conn.close(); } catch { /* */ }
        onTrouble?.(NO_LINE_HOST);
      });
      conn.on('error', () => { if (!done) { done = true; stop(); onTrouble?.(NO_LINE_HOST); } });
      conn.on('open', () => {
        if (done) return;
        done = true; stop();
        handshake(wrap(peer, conn)).then(resolve, (e) => fail(e.message));
      });
    });
  }));
  return { link, cancel() { cancelled = true; try { peer?.destroy(); } catch { /* */ } } };
}

// Guest: join a room by its code.
export function joinRoom(code) {
  let peer = null;
  let cancelled = false;
  const link = loadPeerJs().then(() => new Promise((resolve, reject) => {
    if (cancelled) return reject(new Error('cancelled'));
    let settled = false;
    let stop = () => {};
    const fail = (msg) => {
      if (settled) return;
      settled = true; stop(); clearTimeout(brokerTimer);
      try { peer.destroy(); } catch { /* */ }
      reject(new Error(msg));
    };
    peer = new window.Peer(peerOptions());
    const brokerTimer = setTimeout(() => fail(NO_BROKER), WAIT.broker);
    peer.on('error', (e) => fail(friendly(e)));
    peer.on('open', () => {
      clearTimeout(brokerTimer);
      const conn = peer.connect(prefix() + code.toUpperCase(), { reliable: true, serialization: 'json' });
      stop = watchLine(conn, fail);
      conn.on('error', (e) => fail(friendly(e)));
      conn.on('open', () => {
        if (settled) return;
        stop();
        handshake(wrap(peer, conn)).then((l) => { settled = true; resolve(l); }, (e) => fail(e.message));
      });
    });
  }));
  return { link, cancel() { cancelled = true; try { peer?.destroy(); } catch { /* */ } } };
}
