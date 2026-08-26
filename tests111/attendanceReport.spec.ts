import { test, expect } from '@playwright/test';

test('Download Attendance Report', async ({ page }) => {
  await page.goto('https://presence.attendanceportal.com/etam_prime/login');

  await page.getByPlaceholder('Username').fill('ADMIN/etam492');
  await page.getByPlaceholder('Password').fill('$WysE123');

  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForLoadState('networkidle');

  const downloadPromise = page.waitForEvent('download');

  await page.locator('mdb-icon[icon="download"]').click();

  const download = await downloadPromise;

  await download.saveAs(`downloads/${download.suggestedFilename()}`);

  console.log('Report downloaded successfully');
});