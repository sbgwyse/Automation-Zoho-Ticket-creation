import { test, expect, Page, Locator } from '@playwright/test';

// Credentials should come from environment variables (.env + dotenv, or CI secrets)
// rather than being hardcoded in the spec file.
const USERNAME = process.env.ETAM_USERNAME ?? 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD ?? '$WysE123';

/**
 * Waits for transient overlays/masks to clear. Confirmed via failure log:
 * right after closing the department sidebar with "Done", a
 * `.p-sidebar-mask` / `.p-component-overlay-mask` is still mid-close
 * animation and intercepts pointer events for a few hundred ms, and the
 * `ngx-ui-loader` overlay can also briefly appear during data refreshes.
 */
async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page
    .locator('.ngx-overlay, ngx-ui-loader, .p-component-overlay-mask, .p-sidebar-mask')
    .first()
    .waitFor({ state: 'hidden', timeout })
    .catch(() => {});
}

/**
 * Clicks a locator only once it's no longer disabled. Confirmed via
 * failure log: `getByRole('checkbox').nth(1)` resolved to a real element
 * (not a wrong/missing one) but it carried `class="p-checkbox-box
 * p-disabled"` — the checkbox is disabled until whatever "Done" triggers
 * (contractor/department data refresh) finishes enabling it. Retrying a
 * plain `.click()` on a disabled element never succeeds no matter how
 * long you wait, so this polls for the disabled class to clear first.
 */
async function clickWhenEnabled(locator: Locator, timeout = 20000) {
  await expect(locator).not.toHaveClass(/p-disabled/, { timeout });
  await locator.click();
}

/**
 * Selects a date range by filling the input directly rather than clicking
 * calendar day cells. Confirmed working fix across other Monthly Pay
 * Process pages (Compare Attendance, Lock Attendance) — this app's
 * bs-datepicker calendar is unreliable to click through: the week-number
 * column shares visible text with real day cells (collides with bare
 * getByText(day)), and correct cells can render off-viewport (calendar
 * shows two months side by side). Direct fill avoided all of that on
 * `#reportdaterange`. Falls back to the accessible-name textbox in case
 * this page doesn't expose that id.
 *
 * NOTE (unconfirmed): on Transaction Edit, `.fill()` set the DOM value
 * without the datepicker's own handlers firing, and Angular's internal
 * filter state silently never updated even though the field looked right.
 * If Draft/Final later show data outside this range, or the app behaves
 * as if no range was applied, that's the same failure mode — the fallback
 * is clicking real day cells instead (see selectDateRangeByClick below,
 * currently unused, kept in case direct-fill doesn't hold up here).
 */
async function selectDateRange(page: Page, rangeText: string) {
  const byId = page.locator('#reportdaterange');
  const input = (await byId.count()) > 0
    ? byId
    : page.getByRole('textbox', { name: 'Select Date Range' });

  await input.click();
  await input.fill(rangeText); // confirmed working format: 'DD/MM/YYYY - DD/MM/YYYY'
  await input.press('Enter').catch(() => {});
  await waitForOverlayGone(page);
}

/**
 * Fallback if direct-fill doesn't register with this page's picker.
 * Scopes to the visible month, excluding grayed adjacent-month overflow
 * days, to avoid the week-number/day-number collision. Not currently
 * called — swap in for selectDateRange() if Draft/Final data looks wrong.
 */
async function selectDateRangeByClick(page: Page, startDay: string, endDay: string) {
  await page.getByRole('textbox', { name: 'Select Date Range' }).click();
  const dayCell = (day: string) =>
    page.locator('td:not(.week) span:not(.is-other-month)', { hasText: new RegExp(`^${day}$`) }).first();
  await dayCell(startDay).click();
  await dayCell(endDay).click();
  await waitForOverlayGone(page);
}

// The original recording applied the same date-range + contractor + department
// filter sequence twice (once before "Lock", once before "Draft"/"Final").
// Pulled into a helper so it isn't duplicated verbatim in the test body.
async function applyDateAndFilters(page: Page, dateRange: string) {
  await selectDateRange(page, dateRange);

  await page.getByText('Advance Filter').click();
  await page.getByText('Contractor', { exact: true }).click();
  await page.getByText('--Select a Contractor--').click();
  // NOTE: checkbox/button selection by index (.nth(3), .nth(1)) is
  // order-dependent — if the contractor or department list order changes,
  // these will select the wrong item.
  await clickWhenEnabled(page.getByRole('checkbox').nth(3));
  await waitForOverlayGone(page);
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
  await waitForOverlayGone(page);

  await page.getByText('--Select a Department--').click();
  await clickWhenEnabled(page.getByRole('checkbox').nth(3));
  await waitForOverlayGone(page);
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
  await waitForOverlayGone(page);
  await clickWhenEnabled(page.getByRole('checkbox').nth(3));
  await waitForOverlayGone(page);

  await page.getByRole('button', { name: 'Done' }).click();
  // The sidebar-close animation + data refresh is what was hanging here —
  // wait for both the mask to disappear and the checkbox itself to stop
  // being disabled before clicking it.
  await waitForOverlayGone(page);
  await clickWhenEnabled(page.getByRole('checkbox').nth(1));
}

test('Contractor Employee LOP - Lock, Draft, and Final', async ({ page }) => {

  const DATE_RANGE = '01/08/2026 - 31/08/2026'; // TODO: confirm intended month/range

  await test.step('Login to ETAM Prime', async () => {
    await page.goto('https://presence.tajhotels.com/etam_prime/login');
    await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await waitForOverlayGone(page);
  });

  await test.step('Navigate to Monthly Pay Process > Contractor Employee LOP', async () => {
    await page.getByText('MONTHLY PAY PROCESS').click();
    await page.getByRole('combobox').selectOption('Contractor Employee LOP');
    await waitForOverlayGone(page);
  });

  await test.step('Apply filters and Lock', async () => {
    await applyDateAndFilters(page, DATE_RANGE);
    await page.getByRole('button', { name: 'Lock' }).click();
    await waitForOverlayGone(page);
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
    await waitForOverlayGone(page);
  });

  await test.step('Re-apply filters for report generation', async () => {
    // NOTE: filters appear to reset after Lock, requiring re-selection
    // before Draft/Final can run. Confirm this is actually required by the
    // app (vs. an artifact of how the recording was made) — if the filter
    // state persists after Lock, this whole step may be unnecessary.
    await applyDateAndFilters(page, DATE_RANGE);
  });

  await test.step('Generate Draft report', async () => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Draft' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });

  await test.step('Freeze the report', async () => {
    await page.getByRole('button', { name: 'Freeze' }).click();
    await waitForOverlayGone(page);
    await page.getByRole('button', { name: 'OK' }).click();
    await waitForOverlayGone(page);
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
    await waitForOverlayGone(page);
  });

  await test.step('Generate Final report', async () => {
    const download1Promise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Final' }).click();
    const download1 = await download1Promise;
    expect(download1.suggestedFilename()).toBeTruthy();
  });

});