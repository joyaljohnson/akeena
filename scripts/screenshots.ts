// Takes a screenshot of every screen at 390x844 using the private design fixture, then builds
// contact sheets. Output goes to qa-screenshots/ (gitignored: it shows the real letter).
// Run: npx tsx scripts/screenshots.ts
import { chromium, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import type { LetterData } from '../src/lib/letterTypes';

// A variable path keeps the type-check working on machines without the private fixture.
const fixturePath = '../src/dev-fixture/fixture';
const { fixture } = (await import(fixturePath)) as { fixture: LetterData };

const PORT = 5198;
const BASE = `http://localhost:${PORT}`;
const OUT = 'qa-screenshots';
const SUPA = 'https://shots.supabase.test';
const TOKEN = '0123456789abcdef0123456789abcdef01234567';
mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  env: {
    ...process.env,
    VITE_SUPABASE_URL: SUPA,
    VITE_SUPABASE_ANON_KEY: 'x',
    VITE_BASE_PATH: '/',
  },
  stdio: 'ignore',
});
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
}

const shots: Array<{ file: string; label: string; group: string }> = [];
async function shot(page: Page, name: string, label: string, group: string) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  shots.push({ file: `${OUT}/${name}.png`, label, group });
}

const payload = (signed: unknown = null) => ({
  name: fixture.name,
  personalNote: fixture.personalNote,
  font: fixture.fontId,
  content: fixture.content,
  signed,
});

async function mock(page: Page, opts: { check?: unknown; failCheck?: boolean } = {}) {
  await page.route(`${SUPA}/rest/v1/rpc/*`, async (route) => {
    const fn = route.request().url().split('/rpc/')[1];
    const body = route.request().postDataJSON() as Record<string, unknown>;
    if (fn === 'check_link' && opts.failCheck) return route.abort('failed');
    let result: unknown = { status: 'unavailable' };
    if (fn === 'check_link') result = opts.check ?? { status: 'ok' };
    if (fn === 'unlock_letter') {
      result =
        body.p_pin === '4821'
          ? { status: 'ok', letter: payload() }
          : { status: 'wrong_pin', attempts_left: 4 };
    }
    if (fn === 'sign_letter') {
      result = {
        status: 'ok',
        letter: payload({ at: new Date().toISOString(), name: String(body.p_signed_name) }),
      };
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });
}

async function scrollLetterTo(page: Page, selector: string) {
  await page.evaluate((sel) => {
    document.querySelector(sel)?.scrollIntoView({ block: 'start' });
  }, selector);
}

await waitForServer();
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  acceptDownloads: true,
});
// Chrome on a Mac would open its share sheet instead of downloading the picture.
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
});

// ---------- Bridesmaid journey ----------
{
  const page = await context.newPage();
  await mock(page);
  await page.goto(`${BASE}/#/l/${TOKEN}`);
  await page.getByText('A letter for you').waitFor();
  await shot(page, '01-envelope-front', 'Envelope front and PIN', 'Envelope');
  await page.getByLabel('PIN digit 1 of 4').click();
  await page.keyboard.type('0000');
  await page.getByText(/not quite it/).waitFor();
  await shot(page, '02-wrong-pin', 'Wrong PIN', 'Envelope');
  await page.keyboard.type('4821');
  await page.getByRole('button', { name: 'Open your letter' }).waitFor({ timeout: 10000 });
  await shot(page, '03-envelope-back', 'Envelope back with the seal', 'Envelope');
  await page.getByRole('button', { name: 'Open your letter' }).click();
  await page.waitForTimeout(1250);
  await shot(page, '04-opening-flap', 'Opening: flap and glow', 'Envelope');
  await page.waitForTimeout(1500);
  await shot(page, '05-opening-letter', 'Opening: the letter rises', 'Envelope');
  await page
    .getByRole('heading', { name: new RegExp(`${fixture.name}, would you be`) })
    .waitFor({ timeout: 10000 });
  await shot(page, '06-cover', 'Cover', 'The letter');
  await scrollLetterTo(page, '[data-page="1"]');
  await shot(page, '07-duties', 'Duties', 'The letter');
  await scrollLetterTo(page, '[data-page="2"]');
  await shot(page, '08-chapters-closed', 'Chapters (closed cards)', 'The letter');

  const cards = page.getByRole('button', { name: /^Chapter (One|Two|Three|Four)/ });
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await cards.nth(i).scrollIntoViewIfNeeded();
    await cards.nth(i).click();
    await page.waitForTimeout(500);
    await cards.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await shot(page, `09-chapter-${i + 1}-open`, `Chapter ${i + 1} (open)`, 'The letter');
    await cards.nth(i).click();
    await page.waitForTimeout(450);
  }

  await scrollLetterTo(page, '[data-page="3"]');
  await shot(page, '10-quote', 'Closing quote', 'Signing');
  await page.getByRole('button', { name: 'Yes, I do!' }).scrollIntoViewIfNeeded();
  await shot(page, '11-accept', 'Will you accept?', 'Signing');
  await page.getByRole('button', { name: 'Yes, I do!' }).click();
  await page.waitForTimeout(250);
  await shot(page, '12-petals', 'Yes, I do! (petals)', 'Signing');
  await page.waitForTimeout(1200);
  await shot(page, '13-oath', 'The oath', 'Signing');
  await page.getByRole('button', { name: /I swear/ }).click();
  await page.getByLabel('Your name').fill('Riya Mathew');
  await shot(page, '14-signature', 'Typing her signature', 'Signing');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await page.waitForTimeout(350);
  await shot(page, '15-stamp-landing', 'Stamp landing', 'Signing');
  await page.waitForTimeout(2600);
  await shot(page, '16-signed', 'Signed, with download', 'Signing');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[aria-label="Your letter"]'))
      (el as HTMLElement).scrollTop = 1e6;
  });

  // The downloadable picture.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download your letter' }).click(),
  ]);
  await download.saveAs(`${OUT}/download-export.png`);
  await page.close();
}

// ---------- Status screens ----------
for (const [name, label, opts] of [
  ['17-unavailable', 'Link not available', { check: { status: 'unavailable' } }],
  [
    '18-locked',
    'Locked',
    { check: { status: 'locked', locked_until: new Date(Date.now() + 12 * 60000).toISOString() } },
  ],
  ['19-connection', 'Connection problem', { failCheck: true }],
] as const) {
  const page = await context.newPage();
  await mock(page, opts);
  await page.goto(`${BASE}/#/l/${TOKEN}`);
  await page.waitForTimeout(1200);
  await shot(page, name, label, 'Status');
  await page.close();
}

// ---------- Admin (in-memory stand-in, nothing saved) ----------
{
  const page = await context.newPage();
  await page.route(`${SUPA}/**`, (r) => r.fulfill({ status: 400, body: '{}' }));
  await page.goto(`${BASE}/#/admin`);
  await page.getByRole('button', { name: 'Sign in' }).waitFor();
  await shot(page, '20-admin-login', 'Admin sign-in', 'Admin');
  await page.goto(`${BASE}/#/dev/admin`);
  await page.getByText(/of 4 signed/).waitFor();
  await shot(page, '21-admin-dashboard', 'Dashboard', 'Admin');
  await page.evaluate(() => window.scrollTo(0, 560));
  await shot(page, '22-admin-dashboard-2', 'Dashboard (more)', 'Admin');
  await page.goto(`${BASE}/#/dev/admin/new`);
  await page.getByRole('heading', { name: 'Add a bridesmaid' }).waitFor();
  await page.getByLabel('Name', { exact: true }).fill('Priya');
  await page.getByLabel('Personal note').fill('You light up every room I walk into.');
  await page.getByRole('button', { name: 'Generate' }).click();
  await shot(page, '23-admin-add', 'Add a bridesmaid', 'Admin');
  await page.evaluate(() => window.scrollTo(0, 1500));
  await shot(page, '24-admin-add-preview', 'Add: handwriting and live preview', 'Admin');
  await page.goto(`${BASE}/#/dev/admin/letter`);
  await page.getByRole('heading', { name: 'Shared letter' }).waitFor();
  await shot(page, '25-admin-editor', 'Shared letter editor', 'Admin');
  await page.goto(`${BASE}/#/dev/admin`);
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Anjali' })
    .getByRole('link', { name: 'Preview' })
    .click();
  await page.getByText(/Preview: this is exactly/).waitFor();
  await shot(page, '26-admin-preview', 'Preview', 'Admin');
  await page.close();
}

await browser.close();

// ---------- Contact sheets ----------
const groups = [...new Set(shots.map((s) => s.group))];
for (const group of groups) {
  const items = shots.filter((s) => s.group === group);
  const cellW = 300;
  const cellH = Math.round((844 / 390) * cellW);
  const cols = Math.min(4, items.length);
  const rows = Math.ceil(items.length / cols);
  const pad = 16;
  const labelH = 30;
  const width = cols * (cellW + pad) + pad;
  const height = rows * (cellH + labelH + pad) + pad;
  const composites = [];
  for (const [i, s] of items.entries()) {
    const x = pad + (i % cols) * (cellW + pad);
    const y = pad + Math.floor(i / cols) * (cellH + labelH + pad);
    composites.push({
      input: await sharp(readFileSync(s.file)).resize(cellW, cellH).png().toBuffer(),
      left: x,
      top: y + labelH,
    });
    composites.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${cellW}" height="${labelH}"><text x="0" y="20" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#3a2f2a">${s.label.replace(/&/g, '&amp;')}</text></svg>`,
      ),
      left: x,
      top: y,
    });
  }
  await sharp({ create: { width, height, channels: 4, background: '#f3ecdf' } })
    .composite(composites)
    .png()
    .toFile(`${OUT}/sheet-${group.toLowerCase().replace(/[^a-z]+/g, '-')}.png`);
}
console.log(`Saved ${shots.length} screenshots and ${groups.length} sheets in ${OUT}/`);
stop();
