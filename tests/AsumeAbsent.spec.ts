import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = process.env.ETAM_USERNAME || 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD || '$WysE123';

const DEPARTMENTS = ['Engineering', 'Food & Beverage'];

/**
 * Waits for the app's global loading spinner to clear. Same overlay
 * pattern used across the other Monthly Pay Process flows.
 */
async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page.locator('.ngx-overlay').waitFor({ state: 'hidden', timeout }).catch(() => {});
}

async function login(page: Page) {
  await test.step('Login', async () => {
    // The Select Date Range widget renders two months side-by-side and
    // can run ~750-800px wide. At the default 1280x720 viewport, opening
    // it near the bottom/edge of the page can push part of it outside
    // the viewport with no scroll able to reach it (confirmed by a
    // failure where the day cell resolved correctly but stayed "outside
    // of the viewport" after Playwright's own scroll attempt). Widening
    // the viewport up front avoids that class of failure everywhere the
    // date picker is used in this script.
    await page.setViewportSize({ width: 1600, height: 950 });

    await page.goto(BASE_URL);
    await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await waitForOverlayGone(page);
  });
}

async function navigateToAssumeAbsent(page: Page) {
  await test.step('Navigate to Monthly Pay Process > Assume Absent', async () => {
    await page.getByText('MONTHLY PAY PROCESS').click();
    await page.getByRole('combobox').selectOption('Assume Absent');
    await waitForOverlayGone(page);
  });
}

/**
 * Clicks a day cell by its visible number, excluding disabled/filler
 * cells from the adjacent month (same fix applied to the Edit Attendance
 * Reversal script — the original `.nth(5)` / `.nth(2)` indices assume a
 * fixed month layout and will hit a disabled duplicate day on months
 * with a different number of weeks).
 */
async function selectCalendarDay(page: Page, day: string) {
  const cell = page
    .locator('td[role="gridcell"]:not(:has(span.disabled))')
    .getByText(day, { exact: true })
    .first();
  await cell.scrollIntoViewIfNeeded();
  await cell.click({ timeout: 15000 });
}

async function setFullMonthDateRange(page: Page) {
  await test.step('Select date range (1st to end of month)', async () => {
    await page.getByRole('textbox', { name: 'Select Date Range' }).click();
    await selectCalendarDay(page, '1');
    await selectCalendarDay(page, '31');
    await waitForOverlayGone(page);
  });
}

/**
 * Opens the department multiselect and ticks each department by its
 * visible label inside the open panel. The original recording mixed
 * three different locator styles for the same kind of click (raw
 * `.p-checkbox-box` CSS path, `getByRole('listitem')`, and an
 * `nth-child` CSS path) — consolidated here into one panel-scoped
 * text lookup per department, and the closing click is scoped to the
 * open multiselect's own trigger icon rather than a bare
 * `getByRole('button').filter({ hasText: /^$/ })`, which matches any
 * empty-label button on the page and is a likely source of misclicks
 * if the page has more than one icon-only button.
 */
async function selectDepartments(page: Page) {
  await test.step('Select departments', async () => {
    const departmentBox = page.getByText('--Select a Department--');
    const panel = page.locator('.p-multiselect-panel').first();
    const loader = page.locator('.ngx-overlay, ngx-ui-loader');

    for (const dept of DEPARTMENTS) {
      await loader.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

      if (!(await panel.isVisible().catch(() => false))) {
        await departmentBox.click();
        await panel.waitFor({ state: 'visible', timeout: 5000 });
      }
      await panel.getByText(dept, { exact: true }).click();
    }

    await loader.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

    if (await panel.isVisible().catch(() => false)) {
      const scopedClose = page.locator('.p-multiselect-open .p-multiselect-trigger-icon');
      if (await scopedClose.count()) {
        await scopedClose.click();
      } else {
        await page.mouse.click(1400, 100); // click-outside fallback
      }
    }
  });
}

/**
 * ⚠️ Carried over from the recording as-is: `getByRole('checkbox').nth(1)`
 * is positional — it selects "whichever checkbox is second on the page",
 * not a specific named row. If the employee grid's row order or column
 * layout ever changes, this will silently tick the wrong row. Prefer
 * scoping to a specific employee ID/name cell (as done in the Lock
 * Attendance and Compare Attendance scripts) once you confirm which row
 * this needs to target.
 */
async function selectEmployeeRow(page: Page) {
  await test.step('Select employee row (positional — see comment)', async () => {
    await page.getByRole('checkbox').nth(1).click();
  });
}

async function submit(page: Page) {
  await test.step('Submit', async () => {
    await page.getByRole('button', { name: 'Submit' }).click();
    await waitForOverlayGone(page);
  });
}

async function downloadReport(page: Page) {
  return await test.step('Download report', async () => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Report' }).click();
    const download = await downloadPromise;
    await download.saveAs(`downloads/${download.suggestedFilename()}`);
    return download;
  });
}

/**
 * ⚠️ Unverified: after Delete, the recording clicks another empty-label
 * button — could be closing a confirmation dialog, or reopening/closing
 * the department dropdown again. Kept as a generic empty-text button
 * click since I can't tell which without seeing what renders after
 * Delete; if this is a confirmation dialog, prefer scoping it the same
 * way as `closeDialogIfPresent` in the Lock Attendance script.
 */
async function deleteAndCloseDialog(page: Page) {
  await test.step('Delete and close resulting dialog/dropdown', async () => {
    await page.getByRole('button', { name: 'Delete' }).click();
    await waitForOverlayGone(page);
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
  });
}

test('Assume Absent - submit, download report, delete', async ({ page }) => {
  test.setTimeout(150_000);

  await login(page);
  await navigateToAssumeAbsent(page);
  await setFullMonthDateRange(page);
  await selectDepartments(page);
  await selectEmployeeRow(page);
  await submit(page);

  const download = await downloadReport(page);
  expect(download.suggestedFilename()).toBeTruthy();

  await deleteAndCloseDialog(page);
});