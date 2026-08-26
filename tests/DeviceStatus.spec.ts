import { test, expect } from '@playwright/test';

test('Device Status', async ({ page }) => {
  // Login (single-step, current password)
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/client**');

  // Navigate to Device Status
  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Device Status');
  const loader = page.locator('.ngx-overlay, .ngx-ui-loader');
  const headerRow = page.getByRole('row', { name: 'MAC-Address Gate-Id Alias' });

  // NOTE: confirmed via a real run hanging for the full 180s timeout —
  // scoping this locator to the literal text 'Status ALL' breaks the
  // moment a filter is actually selected, because the column header text
  // reflects the currently-applied filter (almost certainly becomes
  // 'Status ON' / 'Status OFF' once selected, not just 'Status ALL').
  // After the first successful selectOption('ON'), the old locator no
  // longer matches anything on the page, so the next selectOption('OFF')
  // waits forever for a column header that doesn't exist anymore. Fixed
  // by matching on a partial/regex 'Status' instead of the exact,
  // filter-state-dependent string.
  const statusFilter = page.getByRole('columnheader', { name: /Status/ }).getByRole('combobox');

  // Refresh/sort the device list
  await loader.waitFor({ state: 'hidden' }).catch(() => {});
  await headerRow.locator('i').click();

  // Cycle the Status filter: ON -> OFF -> ALL
  await loader.waitFor({ state: 'hidden' }).catch(() => {});
  await statusFilter.selectOption('ON');
  await loader.waitFor({ state: 'hidden' }).catch(() => {});
  await statusFilter.selectOption('OFF');
  await loader.waitFor({ state: 'hidden' }).catch(() => {});
  await statusFilter.selectOption('ALL');

  // Refresh/sort again
  await loader.waitFor({ state: 'hidden' }).catch(() => {});
  await headerRow.locator('i').click();
});