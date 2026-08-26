import { test, expect } from '@playwright/test';

test.setTimeout(120000);

// Fixed file already sitting in the Playwright project's downloads
// folder — no fresh download step, upload this file directly.
const FILE_PATH = 'C:\\Users\\sbg\\PlaywrightProject\\downloads\\TYL.xlsx';

test('Upload Thank You Leaves - from downloads folder', async ({ page }) => {

  // ==========================
  // LOGIN
  // ==========================
  await page.goto('https://presence.tajhotels.com/etam_prime/login');

  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');

  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForTimeout(15000);

  console.log('Login Successful');

  // ==========================
  // NAVIGATE TO ELMS > eLMS Uploads > Upload Thank You Leaves
  // ==========================
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Uploads');
  await page
    .locator('app-elms-uploads')
    .getByRole('combobox')
    .selectOption('Upload Thank You Leaves');

  await page.waitForTimeout(3000);

  console.log('Upload Thank You Leaves Opened');

  // ==========================
  // SELECT THE EXISTING FILE FROM THE DOWNLOADS FOLDER
  // ==========================
  // PrimeNG "advanced" p-fileupload widget. Try the Choose-button +
  // filechooser approach first (bounded to 10s so it can't hang), fall
  // back to directly targeting whatever file input exists in the DOM.
  let fileAttached = false;
  try {
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
    await page.getByText('Choose').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(FILE_PATH);
    fileAttached = true;
    console.log('File Selected via filechooser event:', FILE_PATH);
  } catch {
    console.warn('filechooser event did not fire within 10s — falling back to direct input targeting.');
  }

  if (!fileAttached) {
    const fallbackInput = page.locator('input[type="file"]').first();
    await fallbackInput.setInputFiles(FILE_PATH, { timeout: 10000 });
    await fallbackInput.dispatchEvent('change');
    console.log('File Selected via fallback input targeting:', FILE_PATH);
  }

  await page.waitForTimeout(3000);

  // ==========================
  // CLICK UPLOAD
  // ==========================
  try {
    await page.locator('p-button').filter({ hasText: 'Upload' }).click({ timeout: 8000 });
  } catch {
    console.warn('p-button locator failed — falling back to role-based match.');
    await page.getByRole('button', { name: /upload/i }).click({ timeout: 8000 });
  }

  console.log('Upload Button Clicked');

  await page.waitForTimeout(10000);

  // ==========================
  // CONFIRMATION DIALOG CLOSE (best-effort)
  // ==========================
  try {
    await page.getByRole('button').filter({ hasText: /^$/ }).click({ timeout: 5000 });
    console.log('Confirmation Dialog Closed');
  } catch {
    console.log('No confirmation dialog appeared — continuing.');
  }

  // ==========================
  // SCREENSHOT
  // ==========================
  await page.screenshot({
    path: 'upload_thank_you_leaves_result.png',
    fullPage: true
  });

  console.log('Process Completed');
});