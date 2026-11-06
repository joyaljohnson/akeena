import { expect, test } from '@playwright/test';
import { enterPin, guide, GUIDE_PIN, GUIDE_TOKEN, mockBackend } from './support';

const link = `/#/g/${GUIDE_TOKEN}`;

test('nothing shows before the PIN, and a wrong PIN opens nothing', async ({ page }) => {
  await mockBackend(page);
  await page.goto(link);
  await expect(page.getByText('A letter for you')).toBeVisible();
  await expect(page.getByText('For the groomsmen')).toHaveCount(0);
  await enterPin(page, '0000');
  await expect(page.getByText(/not quite it/)).toBeVisible();
  await expect(page.getByText('Look 1 dress code')).toHaveCount(0);
});

test('the right PIN opens one page with every chapter, its details and dress code @responsive', async ({
  page,
}) => {
  const { calls } = await mockBackend(page);
  await page.goto(link);
  await enterPin(page, GUIDE_PIN);

  await expect(page.getByRole('heading', { name: 'For the groomsmen' })).toBeVisible();
  for (const n of [1, 2, 3, 4]) {
    await expect(page.getByText(`Look ${n} dress code`)).toBeVisible();
  }
  // The four chapter cards are all open, with their details and a map link.
  await expect(page.getByRole('heading', { name: 'Details' })).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Dress code' })).toHaveCount(4);
  await expect(page.getByRole('link', { name: /opens map/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Join the Grooms men board/ })).toBeVisible();
  await expect(page.getByText('Thank you for standing with us.')).toBeVisible();

  // No instruction text, no sideways scrolling.
  await expect(page.getByText(/\b(tap|click|scroll)\b/i)).toHaveCount(0);
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(wide).toBe(false);

  const unlockCalls = calls.filter((c) => c.fn === 'unlock_guide');
  expect(unlockCalls[0]?.body).toEqual({
    p_token: GUIDE_TOKEN,
    p_pin: GUIDE_PIN,
    p_count_view: true,
  });
});

test('a refresh goes straight back in without counting another view', async ({ page }) => {
  const { calls } = await mockBackend(page);
  await page.goto(link);
  await enterPin(page, GUIDE_PIN);
  await expect(page.getByRole('heading', { name: 'For the groomsmen' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'For the groomsmen' })).toBeVisible();
  await expect(page.getByLabel('PIN digit 1 of 4')).toHaveCount(0);
  const last = calls.filter((c) => c.fn === 'unlock_guide').at(-1);
  expect(last?.body.p_count_view).toBe(false);
});

test('an outfit picture opens large and can be stepped through and closed', async ({ page }) => {
  await mockBackend(page);
  await page.goto(link);
  await enterPin(page, GUIDE_PIN);
  await page
    .getByRole('button', { name: /outfit idea 1, view larger/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Outfit picture' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('1 / 3')).toBeVisible();
  await dialog.getByRole('button', { name: 'Next picture' }).click();
  await expect(dialog.getByText('2 / 3')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('an unknown link and a locked link say so, with no content', async ({ page }) => {
  await mockBackend(page, { checkGuide: () => ({ status: 'unavailable' }) });
  await page.goto(link);
  await expect(page.getByRole('heading', { name: "This page isn't available" })).toBeVisible();

  await page.unroute('https://e2e.supabase.test/rest/v1/rpc/*');
  const until = new Date(Date.now() + 10 * 60_000).toISOString();
  await mockBackend(page, { checkGuide: () => ({ status: 'locked', locked_until: until }) });
  await page.goto(link);
  await page.reload();
  await expect(page.getByText(/Too many tries/)).toBeVisible();
});

test('a chapter with no dress-code entry still shows its details', async ({ page }) => {
  const content = { ...guide().content, chapters: {} };
  await mockBackend(page, { unlockGuide: () => ({ status: 'ok', guide: guide({ content }) }) });
  await page.goto(link);
  await enterPin(page, GUIDE_PIN);
  await expect(page.getByRole('heading', { name: 'Details' })).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Dress code' })).toHaveCount(0);
});
