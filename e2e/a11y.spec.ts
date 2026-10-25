import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { disableShare, enterPin, letter, mockBackend, PIN, SIGNED_AT, TOKEN } from './support';

// WCAG 2.1 A and AA rules, run on every screen a bridesmaid or admin can reach.
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${label}: ${v.id} (${v.impact}) ${v.help}\n   ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join('\n   ')}`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
}

const link = `/#/l/${TOKEN}`;

test.describe('bridesmaid screens', () => {
  test('status screens and the envelope', async ({ page }) => {
    await mockBackend(page, { check: () => ({ status: 'unavailable' }) });
    await page.goto(link);
    await expect(page.getByRole('heading', { name: "This letter isn't available" })).toBeVisible();
    await scan(page, 'unavailable');

    await page.unroute('https://e2e.supabase.test/rest/v1/rpc/*');
    await mockBackend(page);
    await page.goto(link);
    await page.reload();
    await expect(page.getByText('A letter for you')).toBeVisible();
    await scan(page, 'envelope front');

    await enterPin(page, '0000');
    await expect(page.getByText(/not quite it/)).toBeVisible();
    await scan(page, 'envelope wrong pin');

    await enterPin(page, PIN);
    await expect(page.getByRole('button', { name: 'Open your letter' })).toBeVisible();
    await scan(page, 'envelope back');
  });

  test('locked envelope', async ({ page }) => {
    const until = new Date(Date.now() + 10 * 60_000).toISOString();
    await mockBackend(page, { check: () => ({ status: 'locked', locked_until: until }) });
    await page.goto(link);
    await expect(page.getByText(/Too many tries/)).toBeVisible();
    await scan(page, 'locked');
  });

  test('the letter: cover, chapters open, signing steps, signed', async ({ page }) => {
    await disableShare(page);
    await mockBackend(page);
    await page.goto(link);
    await enterPin(page, PIN);
    await page.getByRole('button', { name: 'Open your letter' }).click();
    await expect(
      page.getByRole('heading', { name: /Riya, would you be my bridesmaid/ }),
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(700);
    await scan(page, 'cover');

    for (const card of await page
      .getByRole('button', { name: /Chapter (One|Two|Three|Four)/ })
      .all()) {
      await card.scrollIntoViewIfNeeded();
      await card.click();
    }
    await page.waitForTimeout(700);
    await scan(page, 'chapters open');

    await page.getByRole('button', { name: 'Yes, I do!' }).scrollIntoViewIfNeeded();
    await scan(page, 'acceptance');
    await page.getByRole('button', { name: 'Yes, I do!' }).click();
    await page.waitForTimeout(1500);
    await scan(page, 'oath');
    await page.getByRole('button', { name: /I swear/ }).click();
    await page.getByLabel('Your name').fill('Riya K');
    await page.waitForTimeout(600);
    await scan(page, 'signature form');
    await page.getByRole('button', { name: 'Seal it' }).click();
    await expect(page.getByText(/Signed by Riya K/)).toBeVisible();
    await page.waitForTimeout(1500);
    await scan(page, 'signed');
  });

  test('signed revisit', async ({ page }) => {
    await mockBackend(page, {
      unlock: () => ({
        status: 'ok',
        letter: letter({ signed: { at: SIGNED_AT, name: 'Riya K' } }),
      }),
    });
    await page.goto(link);
    await enterPin(page, PIN);
    await page.getByRole('button', { name: 'Open your letter' }).click();
    await expect(page.getByText(/Signed by Riya K/)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await scan(page, 'signed revisit');
  });
});

test.describe('admin screens', () => {
  const admin = '/#/dev/admin';

  test('login', async ({ page }) => {
    await page.route('https://e2e.supabase.test/**', (r) => r.fulfill({ status: 400, body: '{}' }));
    await page.goto('/#/admin');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await scan(page, 'admin login');
  });

  test('dashboard, form, editor, preview', async ({ page }) => {
    await page.goto(admin);
    await expect(page.getByText('1 of 4 signed')).toBeVisible();
    await scan(page, 'dashboard');

    await page.getByRole('link', { name: 'Add a bridesmaid' }).click();
    await expect(page.getByRole('heading', { name: 'Add a bridesmaid' })).toBeVisible();
    await page.getByRole('button', { name: 'Add bridesmaid' }).click();
    await scan(page, 'add form with errors');

    await page.goto(`${admin}/letter`);
    await expect(page.getByRole('heading', { name: 'Shared letter' })).toBeVisible();
    await scan(page, 'shared letter editor');

    await page.goto(admin);
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Anjali' })
      .getByRole('link', { name: 'Preview' })
      .click();
    await expect(page.getByText(/Preview: this is exactly/)).toBeVisible();
    await page.waitForTimeout(700);
    await scan(page, 'preview');
  });
});
