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
// Some networks (strict offices, some mobile carriers) don't allow direct connections;
// there the join simply fails with a message.

import { simVersion } from './Version.js';
import { SETTINGS } from '../config/settings.js';

// (STUN, and a TURN relay if one is configured: config/settings.js net.iceServers)
const peerOptions = () => ({ config: { iceServers: SETTINGS.net?.iceServers ?? [] } });

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
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Could not reach the matchmaking service.';
  if (t === 'browser-incompatible') return 'This browser cannot do online play.';
  return err?.message ?? 'Connection failed.';
};

// Host: open a room. Returns { link: Promise<link>, cancel() }; onReady() fires once the
// room is registered (the code can be shown).
export function hostRoom(code, onReady) {
  let peer = null;
  let cancelled = false;
  const link = loadPeerJs().then(() => new Promise((resolve, reject) => {
    if (cancelled) return reject(new Error('cancelled'));
    peer = new window.Peer(prefix() + code, peerOptions());
    peer.on('open', () => onReady?.());
    peer.on('error', (e) => reject(new Error(friendly(e))));
    peer.on('connection', (conn) => {
      conn.on('open', () => handshake(wrap(peer, conn)).then(resolve, reject));
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
    peer = new window.Peer(peerOptions());
    peer.on('error', (e) => reject(new Error(friendly(e))));
    peer.on('open', () => {
      const conn = peer.connect(prefix() + code.toUpperCase(), { reliable: true, serialization: 'json' });
      conn.on('open', () => handshake(wrap(peer, conn)).then(resolve, reject));
      conn.on('error', (e) => reject(new Error(friendly(e))));
      setTimeout(() => reject(new Error('No answer from that room.\nThe room was found but no direct line could be made:\none of your networks blocks it (a relay server is needed: see config/settings.js).')), 15000);
    });
  }));
  return { link, cancel() { cancelled = true; try { peer?.destroy(); } catch { /* */ } } };
}
