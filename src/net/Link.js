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

const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'blood-axe-oath-';

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
  if (t === 'peer-unavailable') return 'No game found with that code.';
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
    peer = new window.Peer(PREFIX + code);
    peer.on('open', () => onReady?.());
    peer.on('error', (e) => reject(new Error(friendly(e))));
    peer.on('connection', (conn) => {
      conn.on('open', () => resolve(wrap(peer, conn)));
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
    peer = new window.Peer();
    peer.on('error', (e) => reject(new Error(friendly(e))));
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
      conn.on('open', () => resolve(wrap(peer, conn)));
      conn.on('error', (e) => reject(new Error(friendly(e))));
      setTimeout(() => reject(new Error('No answer from that room.')), 15000);
    });
  }));
  return { link, cancel() { cancelled = true; try { peer?.destroy(); } catch { /* */ } } };
}
