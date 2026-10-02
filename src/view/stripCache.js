// stripCache.js — Cutting ~80 sprite strips takes several seconds, so each cut sheet is
// kept in the browser (IndexedDB) and reused on the next visit. The first load cuts them
// (with a progress bar, never a frozen screen); every load after that is near-instant.
//
// A sheet is reused only if nothing that made it has changed: the key is the strip's
// settings, a fingerprint of the source picture, the palette, and a fingerprint of the
// importer's own code (IMPORT_SIG) — edit the importer or redraw a strip and that sheet
// is simply cut again. No cache (private window, blocked storage) = it just cuts.

import { importCharacterStrip, IMPORT_SIG } from './stripImporter.js';

const DB = 'blood-axe-strips';
const STORE = 'sheets';

function hash(str, h = 2166136261) {
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => resolve(null);
      rq.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
async function get(key) {
  const d = await db();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const rq = d.transaction(STORE).objectStore(STORE).get(key);
      rq.onsuccess = () => resolve(rq.result ?? null);
      rq.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function put(key, value) {
  const d = await db();
  if (!d) return;
  try { d.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key); } catch { /* full / blocked: fine */ }
}

// A cheap fingerprint of a picture: its size and a small downscaled copy of it.
const probe = document.createElement('canvas');
probe.width = 96; probe.height = 32;
const pctx = probe.getContext('2d', { willReadFrequently: true });
function fingerprint(img) {
  pctx.clearRect(0, 0, 96, 32);
  pctx.drawImage(img, 0, 0, 96, 32);
  const d = pctx.getImageData(0, 0, 96, 32).data;
  let h = 2166136261;
  for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); }
  return `${img.width}x${img.height}:${(h >>> 0).toString(36)}`;
}

let paletteSig = null;

// Same result as importCharacterStrip, from the cache when it can. { canvas, count, scale, fw, fh, cached }
export async function cutStrip(img, spec, palette) {
  if (palette && paletteSig === null) paletteSig = hash(JSON.stringify(palette));
  const key = `${IMPORT_SIG}|${palette ? paletteSig : '-'}|${hash(JSON.stringify(spec))}|${fingerprint(img)}`;
  const rec = await get(key);
  if (rec?.blob) {
    try {
      const bmp = await createImageBitmap(rec.blob);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width; canvas.height = bmp.height;
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0);
      bmp.close?.();
      return { canvas, ...rec.meta, cached: true };
    } catch { /* unreadable: cut it again */ }
  }
  const out = importCharacterStrip(img, spec, palette);
  out.canvas.toBlob((blob) => {
    if (blob) put(key, { blob, meta: { count: out.count, scale: out.scale, fw: out.fw, fh: out.fh } });
  }, 'image/png');
  return { ...out, cached: false };
}
