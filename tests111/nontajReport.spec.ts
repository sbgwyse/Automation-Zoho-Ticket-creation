import { test, expect } from '@playwright/test';

test('Attendance Report Download', async ({ page }) => {

  // Login
  await page.goto('https://presence.attendanceportal.com/etam_prime/login');

  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam492');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');

  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for dashboard
  await page.waitForLoadState('networkidle');

  // Open Reports Menu
  await page.getByText('REPORTS').click();

  // Select Attendance Reports
  await page.getByRole('combobox').selectOption('Attendance Reports');

  // Close overlay if present
  await page.locator('.ngx-overlay').first().click();

  // Select Attendance Report
  await page.locator('select[name="selectedReports"]')
    .selectOption('Attendance Report');

  // Select All Departments (based on your recorded checkbox)
  await page.getByRole('checkbox').nth(1).check();

  // Click Show
  await page.getByRole('button', { name: 'Show' }).click();

  // Wait for report data to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Download Excel
  const downloadPromise = page.waitForEvent('download');

  await page.getByRole('button', { name: /Download Excel/i }).click();

  const download = await downloadPromise;

  console.log('Downloaded File:', download.suggestedFilename());

  await download.saveAs(
    `downloads/${download.suggestedFilename()}`
  );

  // Verify file type
  expect(download.suggestedFilename()).toContain('.xls');
});