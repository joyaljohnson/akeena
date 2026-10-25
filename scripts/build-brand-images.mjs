// Draws the tiny wax-seal favicon, the iOS touch icon and the generic link-preview image
// (public/og-envelope.jpg). Shapes only (no text, no names, no dates): it is shown to anyone
// who sees the link. Run: node scripts/build-brand-images.mjs
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const petals = [0, 45, 90, 135, 180, 225, 270, 315]
  .map(
    (a) =>
      `<ellipse cx="0" cy="-15" rx="9" ry="14" fill="#E9C8C2" stroke="#B98580" stroke-width="0.9" transform="rotate(${a})"/>`,
  )
  .join('');
const inner = [22, 112, 202, 292]
  .map(
    (a) =>
      `<ellipse cx="0" cy="-7" rx="6" ry="9" fill="#F3DCD5" stroke="#B98580" stroke-width="0.8" transform="rotate(${a})"/>`,
  )
  .join('');

const seal = (id) => `
  <defs>
    <radialGradient id="w${id}" cx="38%" cy="32%" r="75%">
      <stop offset="0" stop-color="#F3DCD5"/><stop offset="0.55" stop-color="#D9B0AA"/><stop offset="1" stop-color="#B98580"/>
    </radialGradient>
  </defs>
  <path fill="url(#w${id})" d="M50 4c9 0 12 6 20 7s17 4 19 13-3 13-1 21 8 14 3 22-12 8-17 15-9 12-18 12-12-7-20-8-17-3-21-12 4-13 2-21S5 50 9 41s12-8 16-15 10-22 25-22Z"/>
  <g transform="translate(50 50)">${petals}${inner}<circle r="4.5" fill="#C99894" stroke="#B98580" stroke-width="0.8"/></g>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${seal('f')}</svg>`;
writeFileSync('public/favicon.svg', favicon);

await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#F7F1E6"/><g transform="translate(25 25) scale(1.3)">${seal('a')}</g></svg>`,
  ),
)
  .png()
  .toFile('public/apple-touch-icon.png');

// 1200 x 630: a closed ivory envelope with a wax seal on a soft background.
const ew = 640;
const eh = 435;
const ex = (1200 - ew) / 2;
const ey = (630 - eh) / 2;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#FBF3EC"/><stop offset="1" stop-color="#EFE4D2"/></radialGradient>
    <linearGradient id="env" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDFAF3"/><stop offset="1" stop-color="#EEE4D0"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#3A2F2A" flood-opacity="0.25"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g filter="url(#sh)">
    <rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" rx="14" fill="url(#env)" stroke="#DCCDAF" stroke-width="2"/>
  </g>
  <path d="M${ex + 3} ${ey + eh - 3} L${ex + ew / 2} ${ey + eh * 0.55} L${ex + ew - 3} ${ey + eh - 3}" fill="none" stroke="#DCCDAF" stroke-width="2"/>
  <path d="M${ex + 3} ${ey + 3} L${ex + ew / 2} ${ey + eh * 0.55} L${ex + ew - 3} ${ey + 3} Z" fill="#F6EEDD" stroke="#D9C9A8" stroke-width="2" stroke-linejoin="round"/>
  <g transform="translate(${1200 / 2 - 62} ${ey + eh * 0.55 - 72}) scale(1.24)">${seal('o')}</g>
</svg>`;
await sharp(Buffer.from(og)).jpeg({ quality: 82, mozjpeg: true }).toFile('public/og-envelope.jpg');
console.log('Wrote favicon.svg, apple-touch-icon.png, og-envelope.jpg');
