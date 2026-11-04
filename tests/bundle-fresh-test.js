// The itch build ships dist/game.js instead of src/ (itch's 1000-file limit), so it
// must be bundled from the src/ that is committed. Fix a failure with: npm run bundle
import { readFileSync } from 'node:fs';
import { srcHash } from '../tools/src-hash.mjs';

const root = new URL('..', import.meta.url).pathname;
const first = readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8').split('\n', 1)[0];
const want = srcHash(root);
if (first !== `// src-hash: ${want}`) {
  console.error('FAIL  dist/game.js is out of date with src/. Run: npm run bundle');
  process.exit(1);
}
console.log('bundle checks passed: dist/game.js matches src/');
