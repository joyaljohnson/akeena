import { expect, test } from '@playwright/test';

// The admin screens run against the in-memory stand-in at #/dev/admin: nothing is saved anywhere.
const admin = '/#/dev/admin';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('the dashboard shows progress and a status for each bridesmaid', async ({ page }) => {
  await page.goto(admin);
  await expect(page.getByText('1 of 4 signed')).toBeVisible();
  await expect(page.getByText(/Signed by Riya M · \d+ \w+ 20\d\d/)).toBeVisible();
  await expect(page.getByText(/Opened · first opened .* · 4 views/)).toBeVisible();
  await expect(page.getByText('Not opened')).toHaveCount(2);
  await expect(page.getByText('Deactivated', { exact: true })).toBeVisible();
  // A signed letter cannot be edited.
  const riya = page.getByRole('listitem').filter({ hasText: 'Riya' });
  await expect(riya.getByRole('button', { name: 'Edit' })).toBeDisabled();
});

test('copy actions put the right things on the clipboard', async ({ page }) => {
  await page.goto(admin);
  const anjali = page.getByRole('listitem').filter({ hasText: 'Anjali' });
  await anjali.getByRole('button', { name: 'Copy PIN' }).click();
  await expect(page.getByText('PIN copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('1357');

  await anjali.getByRole('button', { name: 'Copy link' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/#\/l\/token2a+$/);

  await anjali.getByRole('button', { name: 'Copy message' }).click();
  const msg = await page.evaluate(() => navigator.clipboard.readText());
  expect(msg).toContain('Hey Anjali');
  expect(msg).toContain('1357');
  expect(msg).toMatch(/Open it here: http.*\/#\/l\/token2a+/);
});

test('add a bridesmaid: validation, a generated PIN, a live preview, then saved', async ({
  page,
}) => {
  await page.goto(admin);
  await page.getByRole('link', { name: 'Add a bridesmaid' }).click();

  await page.getByRole('button', { name: 'Add bridesmaid' }).click();
  await expect(page.getByText('Please enter a name.')).toBeVisible();
  await expect(page.getByText('The PIN must be exactly 4 digits.')).toBeVisible();

  await page.getByLabel('Name', { exact: true }).fill('Priya');
  await page.getByLabel('Personal note').fill('You light up every room.');
  await page.getByLabel('PIN', { exact: true }).fill('4821'); // already Riya's
  await page.getByRole('button', { name: 'Add bridesmaid' }).click();
  await expect(page.getByText('Another bridesmaid already has that PIN.').first()).toBeVisible();

  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByLabel('PIN', { exact: true })).toHaveValue(/^\d{4}$/);
  await page.getByText('Allura').click();

  // The cover preview follows what is typed.
  const preview = page.getByLabel('Preview of the cover');
  await expect(preview.getByText('Priya, would you be my bridesmaid?')).toBeVisible();
  await expect(preview.getByText('You light up every room.')).toBeVisible();

  await page.getByRole('button', { name: 'Add bridesmaid' }).click();
  await expect(page.getByText('Priya added')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Priya' })).toBeVisible();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Priya' }).getByText('Font: Allura'),
  ).toBeVisible();
});

test('the note counter stops at 600 characters', async ({ page }) => {
  await page.goto(`${admin}/new`);
  await page.getByLabel('Personal note').fill('x'.repeat(650));
  await expect(page.getByText('650 / 600')).toBeVisible();
  await page.getByRole('button', { name: 'Add bridesmaid' }).click();
  await expect(page.getByText('Please keep the note to 600 characters.')).toBeVisible();
});

test('preview shows the real letter with a banner, and replays the envelope', async ({ page }) => {
  await page.goto(admin);
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Anjali' })
    .getByRole('link', { name: 'Preview' })
    .click();
  await expect(page.getByText(/Preview: this is exactly what/)).toContainText('Anjali');
  await expect(
    page.getByRole('heading', { name: /Anjali, would you be my bridesmaid/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Replay envelope' }).click();
  await expect(page.getByText('A letter for you')).toBeVisible();
  await page.getByLabel('PIN digit 1 of 4').click();
  await page.keyboard.type('1357');
  await expect(page.getByRole('button', { name: 'Open your letter' })).toBeVisible();
});

test('deactivate and reactivate, reorder, and a strong warning before deleting a signed letter', async ({
  page,
}) => {
  await page.goto(admin);
  const meera = page.getByRole('listitem').filter({ hasText: 'Meera' });
  await meera.getByRole('button', { name: 'Deactivate' }).click();
  await expect(meera.getByText('Deactivated', { exact: true })).toBeVisible();
  await meera.getByRole('button', { name: 'Reactivate' }).click();
  await expect(meera.getByText('Deactivated', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Move Meera up' }).click();
  const names = page.getByRole('listitem').getByRole('heading');
  await expect(names).toHaveText(['Riya', 'Meera', 'Anjali', 'Divya']);

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Riya' })
    .getByRole('button', { name: 'Delete' })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('has already signed');
  await expect(dialog.getByRole('button', { name: 'Delete signed letter' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Riya' })).toBeVisible();

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Divya' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Divya' })).toHaveCount(0);
});

test('the shared letter editor explains mistakes and only saves valid changes', async ({
  page,
}) => {
  await page.goto(`${admin}/letter`);
  const save = page.getByRole('button', { name: 'Save changes' });
  await expect(save).toBeDisabled();
  await expect(
    page.getByText("Changes apply to all letters that aren't signed yet."),
  ).toBeVisible();

  await page.getByLabel('Cover headline').fill('Would you be my bridesmaid?');
  await expect(page.getByText('Include {name} so each cover shows her name.')).toBeVisible();
  await expect(save).toBeDisabled();
  await page.getByLabel('Cover headline').fill('{name}, will you stand with me?');
  await expect(save).toBeEnabled();

  await page.getByLabel('Google Maps link').first().fill('not a link');
  await expect(
    page.getByText('Please paste a full Google Maps link, starting with https://'),
  ).toBeVisible();
  await page.getByLabel('Google Maps link').first().fill('https://maps.example.test/new');

  await page.getByRole('button', { name: 'Add a duty' }).click();
  await page.getByRole('textbox', { name: 'Duty 4' }).fill('Keep the secrets');
  await save.click();
  await expect(page.getByText('Saved. Unsigned letters now show this version.')).toBeVisible();
  await expect(save).toBeDisabled();
});

test('the real admin address asks for sign-in and never shows the dashboard to strangers', async ({
  page,
}) => {
  await page.route('https://e2e.supabase.test/**', (r) =>
    r.fulfill({
      status: 400,
      contentType: 'application/json',
      body: '{"msg":"Invalid login credentials"}',
    }),
  );
  await page.goto('/#/admin');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Bridesmaids', { exact: true })).toHaveCount(0);
  await page.getByLabel('Email').fill('someone@example.test');
  await page.getByLabel('Password').fill('nope');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText("That email or password isn't right.")).toBeVisible();
});
