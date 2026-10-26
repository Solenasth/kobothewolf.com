// Strips metadata from PNGs in place, keeping only the pixel-data chunks
// (DESIGN §7). Usage: node scripts/strip-png.ts <file.png>...
import { readFileSync, writeFileSync } from 'node:fs';
import { stripPng } from './assets.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/strip-png.ts <file.png>...');
  process.exit(2);
}
for (const file of files) {
  const before = readFileSync(file);
  const after = stripPng(new Uint8Array(before));
  writeFileSync(file, after);
  console.log(`${file}: ${before.length} → ${after.length} bytes`);
}
