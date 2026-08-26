import { test, expect } from '@playwright/test';
import path from 'path';

test('Registration - Enrollment', async ({ page }) => {
  // Login (single-step, current password)
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/client**');

  const loader = page.locator('.ngx-overlay, .ngx-ui-loader');

  // Navigate to Registration > Enrollment
  await page.getByText('REGISTRATION').click();
  await page.getByText('ENROLLMENT').click();
  await loader.waitFor({ state: 'hidden' }).catch(() => {});

  // Look up employee and select from dropdown
  const employeeLookup = page.locator('input[name="fakeusernameremembered"]');
  await employeeLookup.fill('500100123');
  await page.getByText('- Priya Shaha').click();
  await loader.waitFor({ state: 'hidden' }).catch(() => {});

  // --- Fingerprint Enrollment tab ---
  const fpEnrolledDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Enrolled User' }).click();
  await (await fpEnrolledDownload).saveAs(path.join('downloads', 'fp-enrolled-user.csv'));

  const fpToEnrollDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'User To Be Enroll' }).click();
  await (await fpToEnrollDownload).saveAs(path.join('downloads', 'fp-user-to-be-enrolled.csv'));

  await page.getByText('To Enroll Fingerprint To').click();

  // --- Face Enrollment tab ---
  await page.getByRole('tab', { name: 'Face Enrollment' }).click();
  await loader.waitFor({ state: 'hidden' }).catch(() => {});

  const faceEnrolledDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Enrolled User' }).click();
  await (await faceEnrolledDownload).saveAs(path.join('downloads', 'face-enrolled-user.csv'));

  const faceToEnrollDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'User To Be Enroll' }).click();
  await (await faceToEnrollDownload).saveAs(path.join('downloads', 'face-user-to-be-enrolled.csv'));

  await page.getByRole('button', { name: 'Show Image' }).click();
  await page.getByRole('button', { name: 'Show All Image Data' }).click();

  // --- Download Setup tab ---
  await page.getByRole('tab', { name: 'Download Setup' }).click();
  await loader.waitFor({ state: 'hidden' }).catch(() => {});

  const driversDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Device Drivers ' }).click();
  await (await driversDownload).saveAs(path.join('downloads', 'device-drivers.zip'));

  const enrollServiceDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Enrollment Service ' }).click();
  await (await enrollServiceDownload).saveAs(path.join('downloads', 'enrollment-service.zip'));

  await page.getByRole('link', { name: 'Enrollment Setup ', exact: true }).click();
  await page.getByRole('link', { name: 'Web Enroll Document ' }).click();
  await page.getByRole('link', { name: 'Face Enrollment Setup ' }).click();

  const enroll32Popup = page.waitForEvent('popup');
  const enroll32Download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Enroll32 Setup ' }).click();
  const popup = await enroll32Popup;
  await (await enroll32Download).saveAs(path.join('downloads', 'enroll32-setup.exe'));
  await popup.close();
});