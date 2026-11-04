// src-hash.mjs - one fingerprint of every file in src/ (line endings ignored, so a
// Windows checkout gives the same hash). dist/game.js carries the hash of the src it
// was bundled from; build-release.py and tests/bundle-fresh-test.js compare it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

export function srcHash(root) {
  const src = join(root, 'src');
  const files = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p); else files.push(p);
    }
  };
  walk(src);
  const h = createHash('sha256');
  for (const p of files.map((f) => relative(src, f).split(sep).join('/')).sort()) {
    h.update(p + '\n');
    h.update(readFileSync(join(src, p), 'utf8').replace(/\r\n/g, '\n'));
    h.update('\n\0\n');
  }
  return h.digest('hex');
}
