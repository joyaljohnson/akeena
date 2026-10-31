// Turns the artwork in assets-src/ into web-ready files in public/img/.
//  - The paper texture is made seamless so it can repeat.
//  - Everything is WebP, sized for a phone at 2x.
// Run: npm run art:build
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets-src';
const OUT = 'public/img';
mkdirSync(OUT, { recursive: true });

async function save(img, name, { width, trim = false, quality = 82, lossless = false }) {
  let p = img;
  if (trim) {
    const buf = await p.png().toBuffer();
    p = sharp(buf).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 });
    const t = await p.png().toBuffer();
    p = sharp(t).extend({
      top: 6,
      bottom: 6,
      left: 6,
      right: 6,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }
  const buf = await p
    .resize({ width, withoutEnlargement: true })
    .webp(lossless ? { lossless: true, effort: 5 } : { quality, alphaQuality: 90, effort: 5 })
    .toBuffer();
  await sharp(buf).toFile(`${OUT}/${name}.webp`);
  const m = await sharp(buf).metadata();
  console.log(`${name}.webp  ${m.width}x${m.height}  ${(buf.length / 1024).toFixed(0)} KB`);
  return m;
}

// --- opaque pictures -------------------------------------------------------------------------
const flat = (file, name, width, quality = 78) =>
  save(sharp(`${SRC}/${file}`), name, { width, quality });
await flat('envelope-front.png', 'envelope-front', 1000);
await flat('envelope-back-body.png', 'envelope-back', 1000);
await flat('envelope-flap-inner.png', 'envelope-inner', 1000, 72);

// Seamless paper. The supplied picture carries faint blocky steps in its background tone (left over
// from its own compression), which show as pale rectangles on a bright screen. So keep only the
// fine fibres (the picture minus a blurred copy of itself) and lay them over a flat paper colour.
// Then mirror it into a 2x2 block so every edge matches its neighbour and it can repeat.
for (const [paperName, base] of [
  ['paper', [251, 247, 239]], // the envelope's paper colour (--paper)
  ['paper-river', [242, 248, 244]], // the letter's mint paper (river palette)
]) {
  const SIZE = 512;
  const src = await sharp(`${SRC}/paper-texture.png`)
    .resize(SIZE, SIZE)
    .removeAlpha()
    .raw()
    .toBuffer();
  const soft = await sharp(src, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .blur(7)
    .raw()
    .toBuffer();
  const fibres = Buffer.alloc(src.length);
  for (let i = 0; i < src.length; i++) {
    const detail = src[i] - soft[i];
    // Ignore the faint grain and block steps; keep only real strands.
    const v = Math.abs(detail) < 5 ? 0 : detail;
    fibres[i] = Math.max(0, Math.min(255, Math.round(base[i % 3] + v)));
  }
  const tile = await sharp(fibres, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .png()
    .toBuffer();
  const flopped = await sharp(tile).flop().toBuffer();
  const flipped = await sharp(tile).flip().toBuffer();
  const both = await sharp(tile).flip().flop().toBuffer();
  const block = await sharp({
    create: { width: SIZE * 2, height: SIZE * 2, channels: 3, background: '#fff' },
  })
    .composite([
      { input: tile, left: 0, top: 0 },
      { input: flopped, left: SIZE, top: 0 },
      { input: flipped, left: 0, top: SIZE },
      { input: both, left: SIZE, top: SIZE },
    ])
    .png()
    .toBuffer();
  // Lossless, so the flat paper stays exactly flat (lossy compression adds pale rectangles).
  await save(sharp(block), paperName, { width: 1024, lossless: true });
}

// --- link preview and icons --------------------------------------------------------------------
await sharp(`${SRC}/og-envelope.jpg`)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile('public/og-envelope.jpg');
console.log('og-envelope.jpg 1200x630');

// The seal is drawn (public/img/paw-seal.svg); the icons are rendered from it.
const seal = await sharp('public/img/paw-seal.svg', { density: 300 }).png().toBuffer();
const onIvory = async (size, pad) =>
  sharp({ create: { width: size, height: size, channels: 4, background: '#F7F1E6' } }).composite([
    {
      input: await sharp(seal)
        .resize(size - pad * 2, size - pad * 2, { fit: 'inside' })
        .toBuffer(),
      gravity: 'centre',
    },
  ]);
await (await onIvory(180, 22)).png().toFile('public/apple-touch-icon.png');
await sharp(seal).resize(64, 64, { fit: 'inside' }).png().toFile('public/favicon.png');
console.log('apple-touch-icon.png, favicon.png');
