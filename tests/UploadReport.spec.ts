import { test, expect, Page, Download } from '@playwright/test';
import path from 'path';

const PAUSE_MS = 2500;
const downloadsDir = 'C:\\Users\\sbg\\Desktop\\SANIKA\\zoho-test-automation-copy\\downloads';

// Types confirmed working so far, in order. Add more here once each new
// type's flow has been confirmed via codegen.
const UPLOAD_TYPES = [
  'Employee Registration',
  'Transaction Data',
  'Variable Weekly Off',
  'Additional Weekly Off',
  'Pending Weekly Off',
  'Mark Employee As Present',
  'Employee Wise Holiday Upload',
  'Shift Upload',
  'Card Ids',
  'Upload PStar To P',
];

async function saveDownload(download: Download): Promise<string> {
  const savePath = path.join(downloadsDir, download.suggestedFilename());
  await download.saveAs(savePath);
  return savePath;
}

async function closeResultDialogIfPresent(page: Page) {
  const resultDialog = page.locator('p-dialog').filter({ hasText: 'Result' });
  const isVisible = await resultDialog.isVisible().catch(() => false);
  if (!isVisible) return;

  console.log('Result dialog detected — attempting to close it.');

  // Try several selector strategies first, in order of likely reliability.
  const candidates = [
    resultDialog.getByRole('button', { name: /close/i }),
    resultDialog.locator('button[aria-label="Close"]'),
    resultDialog.locator('.p-dialog-header-icon'),
    resultDialog.locator('.p-dialog-header-close'),
    resultDialog.locator('.pi-times'),
    resultDialog.locator('svg').first(),
    resultDialog.getByText('×', { exact: true }),
  ];

  let closed = false;
  for (const candidate of candidates) {
    const count = await candidate.count().catch(() => 0);
    if (count > 0) {
      try {
        await candidate.first().click({ timeout: 2000 });
        closed = true;
        break;
      } catch {
        // try next candidate
      }
    }
  }

  if (!closed) {
    await page.keyboard.press('Escape').catch(() => {});
  }

  await page.waitForTimeout(500);
  let stillVisible = await resultDialog.isVisible().catch(() => false);

  // GUARANTEED FALLBACK: if nothing above worked, forcibly remove the
  // dialog and its overlay mask from the DOM via JS. This doesn't depend
  // on knowing the real close button's markup at all — it just ensures
  // the blocking overlay is gone so the test can continue. This is a
  // pragmatic unblock, not a simulation of a real user closing the dialog.
  if (stillVisible) {
    console.log('Selector/Escape attempts failed — force-removing dialog via JS.');
    await page.evaluate(() => {
      document.querySelectorAll('p-dialog, .p-dialog-mask').forEach((el) => {
        (el as HTMLElement).style.display = 'none';
        el.remove();
      });
    });
    await page.waitForTimeout(500);
    stillVisible = await resultDialog.isVisible().catch(() => false);
    console.log(stillVisible ? 'Dialog still detected after force-remove.' : 'Dialog force-removed successfully.');
  } else {
    console.log('Result dialog closed normally.');
  }

  await page.waitForTimeout(PAUSE_MS);
}

async function runUploadFlow(page: Page, uploadType: string) {
  // Reset the Upload panel before each type for a clean state.
  await page.getByText('UPLOAD', { exact: true }).click();
  await page.waitForTimeout(PAUSE_MS);

  await page.getByRole('combobox').selectOption(uploadType);
  await page.waitForTimeout(PAUSE_MS);

  const downloadPromise = page.waitForEvent('download');
  const link = page.getByRole('link', { name: 'Download Format With Data' });
  if (await link.count()) {
    await link.click();
  } else {
    await page.getByText('Download Format With Data').click();
  }
  const download = await downloadPromise;
  const filePath = await saveDownload(download);
  console.log(`[${uploadType}] saved to: ${filePath}`);
  await page.waitForTimeout(PAUSE_MS);

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('Choose').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  await page.waitForTimeout(PAUSE_MS);

  await page.locator('p-button').filter({ hasText: 'Upload' }).click();
  await page.waitForTimeout(PAUSE_MS);

  await closeResultDialogIfPresent(page);
}

test('Upload Report — all confirmed types sequentially', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);

  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(PAUSE_MS);

  for (const uploadType of UPLOAD_TYPES) {
    console.log(`\n--- Starting: ${uploadType} ---`);
    await runUploadFlow(page, uploadType);
    console.log(`--- Finished: ${uploadType} ---`);
  }
});