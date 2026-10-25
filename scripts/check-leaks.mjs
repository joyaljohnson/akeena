// Fails if private letter details appear in dist/. Terms come from the gitignored
// letter-content.md (venues and map links), so no private text lives in this script.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

if (!existsSync('letter-content.md')) {
  console.log('check-leaks: letter-content.md not present, skipping.');
  process.exit(0);
}
const src = readFileSync('letter-content.md', 'utf8');
const terms = new Set();
for (const m of src.matchAll(/https:\/\/(?:maps\.app\.goo\.gl|pin\.it)\/[\w-]+/g)) terms.add(m[0]);
for (const m of src.matchAll(/Venue name: \*\*(.+?)\*\*/g)) if (m[1]) terms.add(m[1]);

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const hits = [];
for (const file of walk('dist')) {
  const text = readFileSync(file, 'latin1');
  for (const t of terms) if (text.includes(t)) hits.push(`${file}: ${t}`);
}
if (hits.length) {
  console.error('LEAK:\n' + hits.join('\n'));
  process.exit(1);
}
console.log(`check-leaks: ${terms.size} private terms, none found in dist/.`);
