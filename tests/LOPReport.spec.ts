import { test, expect } from '@playwright/test';

// Credentials should come from environment variables (.env + dotenv, or CI secrets)
// rather than being hardcoded in the spec file.
const USERNAME = process.env.ETAM_USERNAME ?? 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD ?? 'Welcome@2026';

test('LOP Report - Draft and Final generation', async ({ page }) => {

  await test.step('Login to ETAM Prime', async () => {
    await page.goto('https://presence.tajhotels.com/etam_prime/login');
    await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
  });

  await test.step('Navigate to Monthly Pay Process > LOP Report', async () => {
    await page.getByText('MONTHLY PAY PROCESS').click();
    await page.getByRole('combobox').selectOption('LOP Report');
  });

  await test.step('Select date range', async () => {
    await page.getByRole('textbox', { name: 'Select Date Range' }).click();
    // NOTE: index-based day selection (.getByText('1').nth(5)) is brittle —
    // it depends on the calendar's current month/leading blank cells.
    // Prefer a locator scoped to the calendar body, e.g.:
    //   page.locator('.p-datepicker-calendar td:not(.p-datepicker-other-month) >> text="1"')
    // Left as-is here since the exact calendar markup wasn't available to verify.
    await page.getByText('1').nth(5).click();
    await page.getByText('1').nth(5).click();
  });

  await test.step('Select department filter (Food & Beverage)', async () => {
    await page.getByText('--Select a Department--').click();
    await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click();
    await page.getByRole('listitem', { name: 'Food & Beverage' }).click();
    // NOTE: nth-child(3) checkbox selection is order-dependent — if the
    // department/filter list order changes, this will select the wrong item.
    await page.locator('p-multiselectitem:nth-child(3) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
    // NOTE: icon-only buttons matched via empty-text filter can resolve to the
    // wrong element if multiple icon buttons are present. Consider scoping via
    // a parent container or aria-label instead.
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
  });

  await test.step('Apply advance filter', async () => {
    await page.getByText('Advance Filter').click();
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
    await page.getByRole('checkbox').nth(1).click();
  });

  await test.step('Generate Draft LOP report (download 1)', async () => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Draft LOP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });

  await test.step('Generate Draft LOP report (download 2)', async () => {
    // NOTE: Draft LOP is clicked a second time here, producing a second
    // download. Confirm this is intentional (e.g. re-generation after a
    // filter tweak) rather than left over from recording.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Draft LOP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });

  await test.step('Generate Final LOP report', async () => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Final LOP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });

  await test.step('Freeze the LOP report', async () => {
    await page.getByRole('button', { name: 'Freeze' }).click();
    await page.getByRole('button', { name: 'OK' }).click();
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
  });

});