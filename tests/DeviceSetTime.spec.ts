import { test, expect } from '@playwright/test';

test('Device Set Time', async ({ page }) => {
  // Login (single-step, current password)
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/client**');

  // Navigate to Device Set Time
  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Device Set Time');

  // Set timezone and gate, then submit
  const loader = page.locator('.ngx-overlay, .ngx-ui-loader');
  await loader.waitFor({ state: 'hidden' }).catch(() => {});

  await page.locator('#timezones').selectOption('GMT-09:00 Alaska');
  await page.getByLabel('Gate Id*').selectOption('00-00-00-00-00-02');

  await loader.waitFor({ state: 'hidden' }).catch(() => {});
  await page.getByRole('button', { name: 'Set Time' }).click();
});