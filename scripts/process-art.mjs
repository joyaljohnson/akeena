// Turns the artwork in assets-src/ into web-ready files in public/img/.
//  - The seal, florals and corner arrive on a flat dark backdrop; that backdrop is cut away here
//    (a soft-edged matte, with the backdrop colour removed from the edges so no dark halo shows).
//  - The paper texture is made seamless so it can repeat.
//  - Everything is WebP, sized for a phone at 2x.
// Run: npm run art:build
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets-src';
const OUT = 'public/img';
mkdirSync(OUT, { recursive: true });

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Removes a flat or gently shaded dark backdrop. Returns RGBA pixels with a clean alpha. */
async function cutOut(file, { low = 16, high = 52, enclosed = false } = {}) {
  const { data, info } = await sharp(`${SRC}/${file}`)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y) => (y * w + x) * 3;

  // Backdrop colour at any point: blend of the four corner colours (the backdrop is a soft gradient).
  const corner = (cx, cy) => {
    const s = [0, 0, 0];
    let n = 0;
    for (let dy = 0; dy < 24; dy++)
      for (let dx = 0; dx < 24; dx++) {
        const i = px(
          Math.min(w - 1, Math.max(0, cx + dx - 12)),
          Math.min(h - 1, Math.max(0, cy + dy - 12)),
        );
        s[0] += data[i];
        s[1] += data[i + 1];
        s[2] += data[i + 2];
        n++;
      }
    return s.map((v) => v / n);
  };
  const tl = corner(12, 12),
    tr = corner(w - 13, 12),
    bl = corner(12, h - 13),
    br = corner(w - 13, h - 13);
  const bg = (x, y) => {
    const u = x / (w - 1),
      v = y / (h - 1);
    return [0, 1, 2].map(
      (k) => (tl[k] * (1 - u) + tr[k] * u) * (1 - v) + (bl[k] * (1 - u) + br[k] * u) * v,
    );
  };
  const dist = (x, y) => {
    const b = bg(x, y),
      i = px(x, y);
    return Math.hypot(data[i] - b[0], data[i + 1] - b[1], data[i + 2] - b[2]);
  };

  // Backdrop = pixels that look like the backdrop AND connect to the picture's edge, so a dark
  // crevice inside the artwork stays solid (the seal). With `enclosed`, backdrop showing through
  // small gaps between leaves and petals is removed as well (the florals).
  const isBg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const k = y * w + x;
    if (!isBg[k] && dist(x, y) < high) {
      isBg[k] = 1;
      stack.push(k);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const k = stack.pop();
    const x = k % w,
      y = (k / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  if (enclosed) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (dist(x, y) < high) isBg[y * w + x] = 1;
  }

  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x,
        i = px(x, y),
        o = k * 4;
      let a = 1;
      if (isBg[k]) a = smooth(low, high, dist(x, y));
      if (a < 0.004) continue;
      const b = bg(x, y);
      for (let c = 0; c < 3; c++) {
        // Remove the backdrop's share of an edge pixel so it does not leave a dark fringe.
        out[o + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - a) * b[c]) / a)));
      }
      out[o + 3] = Math.round(a * 255);
    }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

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

// --- pieces on a dark backdrop -------------------------------------------------------------
await save(await cutOut('wax-seal.png'), 'wax-seal', { width: 360, trim: true });
await save(
  await cutOut('flap-florals.png', { low: 24, high: 64, enclosed: true }),
  'flap-florals',
  { width: 900, trim: true },
);
await save(
  await cutOut('floral-corner.png', { low: 24, high: 64, enclosed: true }),
  'floral-corner',
  { width: 640, trim: true },
);

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

const seal = await sharp(`${OUT}/wax-seal.webp`).png().toBuffer();
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
