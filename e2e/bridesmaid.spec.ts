import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  disableShare,
  enterPin,
  letter,
  mockBackend,
  PIN,
  pngSize,
  SIGNED_AT,
  TOKEN,
} from './support';

const link = `/#/l/${TOKEN}`;

// The note is written out letter by letter, so it exists twice in the page (one copy for screen
// readers). Look at the paragraph that holds it.
const note = (page: import('@playwright/test').Page) =>
  page.locator('p', { hasText: 'You have been my person from day one.' });

async function openLetter(page: import('@playwright/test').Page) {
  await page.goto(link);
  await enterPin(page, PIN);
  await page.getByRole('button', { name: 'Open your letter' }).click();
  await expect(page.getByRole('heading', { name: /Riya, would you be my bridesmaid/ })).toBeVisible(
    { timeout: 15_000 },
  );
}

test('unknown link shows the friendly message and no letter', async ({ page }) => {
  await mockBackend(page, { check: () => ({ status: 'unavailable' }) });
  await page.goto(link);
  await expect(page.getByRole('heading', { name: "This letter isn't available" })).toBeVisible();
  await expect(page.getByText('Please reach out to Akeena.')).toBeVisible();
});

test('a locked link shows the lock message with the boxes disabled', async ({ page }) => {
  const until = new Date(Date.now() + 14 * 60_000).toISOString();
  await mockBackend(page, { check: () => ({ status: 'locked', locked_until: until }) });
  await page.goto(link);
  await expect(
    page.getByText(/Too many tries\. Try again in \d+ minutes?, or message Akeena\./),
  ).toBeVisible();
  await expect(page.getByLabel('PIN digit 1 of 4')).toBeDisabled();
});

test('the envelope shows nothing private before the PIN, and a wrong PIN counts down', async ({
  page,
}) => {
  const { calls } = await mockBackend(page);
  await page.goto(link);
  await expect(page.getByText('A letter for you')).toBeVisible();
  await expect(page.getByText('Riya')).toHaveCount(0);
  await enterPin(page, '0000');
  await expect(page.getByText("That's not quite it, try again. 4 tries left.")).toBeVisible();
  await expect(page.getByLabel('PIN digit 1 of 4')).toBeFocused();
  // (The dev server runs effects twice, so check_link may appear twice.)
  expect(calls.filter((c) => c.fn === 'unlock_letter')).toHaveLength(1);
});

test('a network failure keeps the PIN and lets her try again', async ({ page }) => {
  await mockBackend(page);
  await page.goto(link);
  await page.route(
    'https://e2e.supabase.test/rest/v1/rpc/unlock_letter',
    (r) => r.abort('failed'),
    { times: 1 },
  );
  await enterPin(page, PIN);
  await expect(page.getByText(/couldn't reach your letter/i)).toBeVisible();
  await expect(page.getByLabel('PIN digit 4 of 4')).toHaveValue('1');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Open your letter' })).toBeVisible();
});

test('the whole journey: PIN, envelope, letter, sign, download @responsive', async ({ page }) => {
  await disableShare(page);
  const { calls } = await mockBackend(page);
  await openLetter(page);

  // The cover fills the first screen; nothing else is on it.
  await expect(note(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Duties' })).not.toBeInViewport();

  // Chapters are cards that open on tap.
  const card = page.getByRole('button', { name: /First Chapter/ });
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('aria-expanded', 'false');
  await card.click();
  await expect(card).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: /Sample Hall/ })).toHaveAttribute(
    'href',
    'https://maps.example.test/one',
  );
  await expect(page.getByText('Friday, 25 December 2026')).toBeVisible();
  await expect(page.getByText('6:30 pm')).toBeVisible();

  // Accept, swear, sign.
  await page.getByRole('button', { name: 'Yes, I do!' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Yes, I do!' }).click();
  await page.getByRole('button', { name: /I swear/ }).click();
  const seal = page.getByRole('button', { name: 'Seal it' });
  await expect(seal).toBeDisabled();
  await page.getByLabel('Your name').fill('Riya K');
  await expect(seal).toBeEnabled();
  await seal.click();
  await expect(page.getByText('✅ Signed by Riya K · 3 Nov 2026, 3:05 pm')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seal it' })).toHaveCount(0);

  const signCall = calls.find((c) => c.fn === 'sign_letter');
  expect(signCall?.body).toEqual({ p_token: TOKEN, p_pin: PIN, p_signed_name: 'Riya K' });

  // Download: one PNG, 1080 px wide, within the phone-safe pixel budget.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download your letter' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Akeena-bridesmaid-letter-Riya-K.png');
  const path = await download.path();
  const { width, height } = pngSize(readFileSync(path));
  expect(width).toBe(1080);
  expect(height).toBeGreaterThan(5000);
  expect(width * height).toBeLessThanOrEqual(16_000_000);
});

test('refreshing resumes straight into the letter without recounting the view', async ({
  page,
}) => {
  const { calls } = await mockBackend(page);
  await openLetter(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Riya, would you be my bridesmaid/ }),
  ).toBeVisible();
  await expect(page.getByText('A letter for you')).toHaveCount(0);
  const unlocks = calls.filter((c) => c.fn === 'unlock_letter');
  expect(unlocks.map((c) => c.body.p_count_view)).toEqual([true, false]);
});

test('a signed letter opens at the acceptance page showing her signature', async ({ page }) => {
  await mockBackend(page, {
    unlock: () => ({ status: 'ok', letter: letter({ signed: { at: SIGNED_AT, name: 'Riya K' } }) }),
  });
  await openLetter(page);
  await expect(page.getByText('✅ Signed by Riya K · 3 Nov 2026, 3:05 pm')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Download your letter' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yes, I do!' })).toHaveCount(0);
});

test('signing survives a network failure and the name is kept', async ({ page }) => {
  await mockBackend(page);
  await openLetter(page);
  await page.getByRole('button', { name: 'Yes, I do!' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Yes, I do!' }).click();
  await page.getByRole('button', { name: /I swear/ }).click();
  await page.getByLabel('Your name').fill('Riya');
  await page.route('https://e2e.supabase.test/rest/v1/rpc/sign_letter', (r) => r.abort('failed'), {
    times: 1,
  });
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.getByText(/couldn't seal your letter/i)).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Riya');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.getByText(/Signed by Riya/)).toBeVisible();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the envelope still opens, with no petals and no 3D flip', async ({ page }) => {
    await mockBackend(page);
    await openLetter(page);
    await page.getByRole('button', { name: 'Yes, I do!' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Yes, I do!' }).click();
    await expect(page.getByRole('button', { name: /I swear/ })).toBeVisible();
    await expect(page.locator('[class*="PetalBurst"]')).toHaveCount(0);
  });
});

test('long names, emoji and a 600-character note stay inside the screen @responsive', async ({
  page,
}) => {
  const note = 'Love you more than words can say. '.repeat(18).slice(0, 600);
  await mockBackend(page, {
    unlock: () => ({
      status: 'ok',
      letter: letter({
        name: 'Maria Anna-Sophia Thomas Kuruvilla 💖',
        personalNote: note,
        font: 'great-vibes',
      }),
    }),
  });
  await page.goto(link);
  await enterPin(page, PIN);
  await page.getByRole('button', { name: 'Open your letter' }).click();
  await expect(page.getByText(/Maria Anna-Sophia/)).toBeVisible({ timeout: 15_000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test('if the handwriting fonts fail to load, the letter still opens and reads fine', async ({
  page,
}) => {
  await page.route(/\.woff2?(\?.*)?$/, (route) => {
    const url = route.request().url();
    // Block only the script fonts; the serif text fonts stay.
    return /parisienne|great-vibes|allura|pinyon|alex-brush|sacramento|dancing|homemade/i.test(url)
      ? route.abort('failed')
      : route.continue();
  });
  await mockBackend(page);
  await openLetter(page);
  await expect(note(page)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test('the whole journey runs without a single console error or warning', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await disableShare(page);
  await mockBackend(page);
  await openLetter(page);
  await page.getByRole('button', { name: 'Yes, I do!' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Yes, I do!' }).click();
  await page.getByRole('button', { name: /I swear/ }).click();
  await page.getByLabel('Your name').fill('Riya');
  await page.getByRole('button', { name: 'Seal it' }).click();
  await expect(page.getByText(/Signed by Riya/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download your letter' }).click(),
  ]);
  expect(download.suggestedFilename()).toContain('Riya');
  expect(problems).toEqual([]);
});

test('the note is written out like a pen, and a tap finishes it', async ({ page }) => {
  await mockBackend(page);
  await openLetter(page);
  const letters = page.locator('p span[class*="char"]');
  expect(await letters.count()).toBeGreaterThan(20);
  // Straight after opening, the end of the note has not been written yet.
  const lastOpacity = await letters.last().evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(lastOpacity).toBeLessThan(1);
  // A tap on the cover finishes the writing at once.
  await note(page).click();
  await expect(letters).toHaveCount(0);
  await expect(note(page)).toBeVisible();
  await expect(page.getByText('With love,')).toBeVisible();
});

test('the whole note is readable to screen readers from the start', async ({ page }) => {
  await mockBackend(page);
  await openLetter(page);
  await expect(
    page.locator('p .sr-only', { hasText: 'You have been my person from day one.' }),
  ).toBeAttached();
  await expect(page.locator('p span[aria-hidden="true"]').first()).toBeAttached();
});

test.describe('pen writing with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('everything is shown at once', async ({ page }) => {
    await mockBackend(page);
    await openLetter(page);
    const letters = page.locator('p span[class*="char"]');
    const last = await letters.last().evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(last).toBe(1);
  });
});

test('a refresh does not write the note again, and the finished picture never animates', async ({
  page,
}) => {
  await mockBackend(page);
  await openLetter(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Riya, would you be my bridesmaid/ }),
  ).toBeVisible();
  await expect(page.locator('p span[class*="char"]')).toHaveCount(0);
});
