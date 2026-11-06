// Turns a folder of saved outfit pictures into the web set for the groomsmen page.
//   node scripts/process-groomsmen.mjs "<folder with one sub-folder per chapter>"
// Sub-folder names decide the chapter (Maduram -> 1, Betrothal -> 2, English -> 3, Church -> 4).
// Output goes to private-media/groomsmen (upload these) and public/dev-media/groomsmen (local
// preview only). Both are gitignored: the pictures are third-party and never enter the repo.
// File names are random so the public storage links can't be guessed.
import { randomBytes } from 'node:crypto';
import { mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/process-groomsmen.mjs <folder>');
  process.exit(1);
}

const CHAPTERS = [
  ['ch1', /maduram/i],
  ['ch2', /betroth/i],
  ['ch3', /english|revelry/i],
  ['ch4', /church/i],
];
const WIDTH = 720;
const out = 'private-media/groomsmen';
const dev = 'public/dev-media/groomsmen';
rmSync(out, { recursive: true, force: true });
rmSync(dev, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
mkdirSync(dev, { recursive: true });

/** Cuts away black letterbox bars (top and bottom) that came with some saved pictures. */
async function cropBars(file) {
  const base = sharp(file).rotate();
  const meta = await base.metadata();
  const raw = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = raw.info;
  const isBlackRow = (y) => {
    let dark = 0;
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * channels;
      if (raw.data[i] < 14 && raw.data[i + 1] < 14 && raw.data[i + 2] < 14) dark++;
    }
    return dark / Math.ceil(width / 4) > 0.98;
  };
  let top = 0;
  while (top < height / 3 && isBlackRow(top)) top++;
  let bottom = height - 1;
  while (bottom > (height * 2) / 3 && isBlackRow(bottom)) bottom--;
  const cut = { left: 0, top, width: meta.width ?? width, height: bottom - top + 1 };
  return sharp(file).rotate().extract(cut);
}

const manifest = {};
for (const dir of readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const chapter = CHAPTERS.find(([, re]) => re.test(dir.name))?.[0];
  if (!chapter) {
    console.warn(`skipped folder: ${dir.name}`);
    continue;
  }
  const files = readdirSync(join(src, dir.name))
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
  manifest[chapter] = [];
  for (const f of files) {
    const name = `${randomBytes(12).toString('hex')}.webp`;
    const buf = await (await cropBars(join(src, dir.name, f)))
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    writeFileSync(join(out, name), buf);
    writeFileSync(join(dev, name), buf);
    const m = await sharp(buf).metadata();
    manifest[chapter].push({ file: name, width: m.width, height: m.height });
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(
  Object.entries(manifest)
    .map(([c, a]) => `${c}: ${a.length}`)
    .join('  '),
);
