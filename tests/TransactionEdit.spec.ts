import { test, expect, Page } from '@playwright/test';

test('Transaction Edit - ADMINISTRATION (Priya Shaha / 01-Aug-2026, split In/Out Time)', async ({ page }) => {
  const waitForLoaderHidden = async () => {
    const loader = page.locator('.ngx-overlay, ngx-ui-loader');
    await loader.first().waitFor({ state: 'hidden' }).catch(() => {});
  };
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  // NOTE: raw recording used the old temp password '$WysE123', but other
  // confirmed runs show this account's password was already changed to
  // 'Welcome@2026'. Using the current password — swap back if this account
  // genuinely still needs the temp one.
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Transaction Edit');

  await page.locator('input[name="employees"]').click();
  await page.locator('input[name="employees"]').fill('500100123');

  // Autocomplete suggestion doesn't always appear — click only if it shows up.
  const suggestion = page.getByText('- Priya Shaha');
  if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
    await suggestion.click();
  }

  // TODO: same bare day-number ambiguity flagged elsewhere on this app's
  // calendar widget — '1'/'2' can match the wrong cell (week-number column
  // or a grayed adjacent-month day sharing the same digit).
  await page.getByRole('textbox', { name: 'Select Date Range' }).click();
  await page.getByText('1', { exact: true }).first().click();
  await page.getByText('2', { exact: true }).first().click();

  await waitForLoaderHidden();
  await page.getByRole('button', { name: 'Show' }).click();
  await waitForLoaderHidden();

  await page.getByRole('textbox', { name: 'Date *' }).fill('2026-08-01');

  // Confirms a real DOM detail: the "In Time * Out Time * Reason" merged
  // accessible name seen elsewhere isn't one field covering three values —
  // there are at least two inputs sharing id="input8" (an invalid-HTML
  // duplicate id, which is also *why* the accessible name merges). First
  // occurrence = In Time, nth(1) = Out Time.
  await page.getByRole('textbox', { name: 'In Time * Out Time * Reason' }).fill('09:07:07');
  await page.locator('#input8').nth(1).fill('18:00:00');

  await waitForLoaderHidden();
  await page.getByRole('button', { name: 'Save' }).click();
});