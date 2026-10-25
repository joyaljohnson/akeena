// Optimises assets-src/ into public/img/ (WebP plus JPEG fallback, 1x and 2x).
// Run: node scripts/build-images.mjs
import { mkdirSync, readdirSync } from 'node:fs';
import { basename, extname } from 'node:path';
import sharp from 'sharp';

const SRC = 'assets-src';
const OUT = 'public/img';
mkdirSync(OUT, { recursive: true });

// Reference-only files never ship.
// The envelope art has its own pipeline (process-art.mjs).
const SKIP = new Set([
  'stamp-reference',
  'envelope-front',
  'envelope-back-body',
  'envelope-flap',
  'envelope-flap-inner',
  'flap-florals',
  'wax-seal',
  'floral-corner',
  'paper-texture',
  'og-envelope',
]);

for (const file of readdirSync(SRC)) {
  const ext = extname(file).toLowerCase();
  const name = basename(file, ext);
  if (!['.jpg', '.jpeg', '.png'].includes(ext) || SKIP.has(name)) continue;
  const img = sharp(`${SRC}/${file}`);
  const { width = 0 } = await img.metadata();
  for (const [suffix, w] of [
    ['', Math.min(width, 720)],
    ['@2x', width],
  ]) {
    if (suffix === '@2x' && width <= 1000) continue;
    const resized = () => sharp(`${SRC}/${file}`).resize({ width: w });
    await resized().webp({ quality: 78 }).toFile(`${OUT}/${name}${suffix}.webp`);
    await resized().jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/${name}${suffix}.jpg`);
  }
  console.log(`built ${name}`);
}
