import { test, expect, Page } from '@playwright/test';
 
const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = process.env.ETAM_USERNAME || 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD || '$WysE123';
 
/**
 * Waits for the app's global loading spinner to clear. This app shows
 * ".ngx-overlay" after many actions (filter changes, saves, etc.) while
 * it fetches data, and that overlay intercepts clicks aimed at elements
 * underneath it if you click too soon.
 */
async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page.locator('.ngx-overlay').waitFor({ state: 'hidden', timeout }).catch(() => {});
}
 
async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await waitForOverlayGone(page);
}
 
async function setDateRange(page: Page) {
     await page.getByRole('textbox', { name: 'Select Date Range' }).click();
    await expect(page.getByText('LAST MONTH')).toBeVisible();
    await page.getByText('LAST MONTH').click();
  await waitForOverlayGone(page);
}
 
/**
 * Opens the department multiselect and picks entries via the virtual
 * scroll viewport, matching the exact recorded flow.
 */
// async function selectDepartments(page: Page) {
 
//    await page.locator('.p-multiselect-trigger-icon').first().click();

//   await waitForOverlayGone(page);

//   await page.waitForTimeout(2000); 
//   await page.getByRole('checkbox').nth(2).click();
//   await page.locator('cdk-virtual-scroll-viewport').click();
//   await waitForOverlayGone(page);
//   await page.getByRole('checkbox').nth(2).click();
//   await waitForOverlayGone(page);
// }
 

async function selectDepartments(page: Page) {
  const departmentTrigger = page.locator('.p-multiselect-trigger-icon').first();

  await departmentTrigger.click();

  // Wait for the department dropdown/checkboxes to appear
  const checkbox = page.getByRole('checkbox').nth(2);
  await checkbox.waitFor({
    state: 'visible',
    timeout: 15000,
  });

  // Give the UI a moment to finish rendering/animation
  await page.waitForTimeout(500);

  await checkbox.click();

  // Preserve your recorded flow
  await page.locator('cdk-virtual-scroll-viewport').click();

  await waitForOverlayGone(page);

  await checkbox.waitFor({
    state: 'visible',
    timeout: 15000,
  });

  await page.waitForTimeout(500);

  await checkbox.click();

  await waitForOverlayGone(page);
}


async function clickLockAttendanceData(page: Page) {
  await waitForOverlayGone(page);
  await page.getByRole('button', { name: 'Lock Attendance Data' }).click();
  await waitForOverlayGone(page);
}
 
async function acknowledgeResultDialog(page: Page) {
  const okButton = page.getByRole('button', { name: 'OK' });
  await okButton.waitFor({ state: 'visible', timeout: 20000 });
  await okButton.click();
  await waitForOverlayGone(page);
}
 
test('Lock Attendance - lock and download report', async ({ page }) => {
  test.setTimeout(240_000);
 
  await login(page);
 
  await page.getByText('MONTHLY PAY PROCESS').click();
  await page.getByRole('combobox').selectOption('Lock Attendance');
  await waitForOverlayGone(page);
 
  // Phase 1: filters, lock attendance, acknowledge result
  await setDateRange(page);
  await selectDepartments(page);
  await clickLockAttendanceData(page);
  await acknowledgeResultDialog(page);
 
  // First "Report" click right after OK — per the recorded flow this
  // primes the report screen; the real download only fires after
  // re-applying filters below.
 
 
  // Phase 2: re-apply filters, then the second "Report" click downloads
  await setDateRange(page);
  await selectDepartments(page);
  // The recorded flow clicks the virtual-scroll viewport a second time
  // here before the final checkbox selection — preserved as recorded.
//   await page.getByRole('checkbox').nth(2).click();
//   await waitForOverlayGone(page);

//   await page.locator('cdk-virtual-scroll-viewport').click();
//   await waitForOverlayGone(page);
  
 
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Report' }).click();
  const download = await downloadPromise;
 
  await download.saveAs(`downloads/${download.suggestedFilename()}`);
  expect(download.suggestedFilename()).toBeTruthy();
});
 