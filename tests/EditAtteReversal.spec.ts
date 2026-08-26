import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = process.env.ETAM_USERNAME || 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD || '$WysE123';

const EMPLOYEE_ID = '500100123';
const EMPLOYEE_NAME_HINT = 'Priya Shaha'; // used to pick the right autocomplete row

/**
 * Waits for the app's global loading spinner to clear. This app shows
 * ".ngx-overlay" after many actions (filter changes, saves, etc.) while
 * it fetches data, and that overlay intercepts clicks aimed at elements
 * underneath it if you click too soon. Same overlay pattern as the Lock
 * Attendance flow.
 */
async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page.locator('.ngx-overlay').waitFor({ state: 'hidden', timeout }).catch(() => {});
}

async function login(page: Page) {
  await test.step('Login', async () => {
    await page.goto(BASE_URL);
    await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await waitForOverlayGone(page);
  });
}

async function navigateToEditAttendanceReversal(page: Page) {
  await test.step('Navigate to Monthly Pay Process > Edit Attendance Reversal', async () => {
    await page.getByText('MONTHLY PAY PROCESS').click();
    await page.getByRole('combobox').selectOption('Edit Attendance Reversal');
    await waitForOverlayGone(page);
  });
}

/**
 * Types the employee ID into the search box and picks the matching
 * autocomplete suggestion. Waits for the suggestion to actually appear
 * before clicking it, rather than assuming it's already rendered
 * (the original recorded flow clicked immediately after fill, which is
 * a likely source of flakiness if the lookup is async).
 */
async function selectEmployee(page: Page, employeeId: string, nameHint: string) {
  await test.step(`Select employee ${employeeId} (${nameHint})`, async () => {
    const empInput = page.locator('input[name="emp"]');
    await empInput.click();

    // .fill() sets the value directly and skips real keystroke events —
    // if this is an Angular live-search input wired to (input) or
    // (keyup), fill() alone may never trigger the lookup. Type it out
    // instead so each keystroke fires normally.
    await empInput.pressSequentially(employeeId, { delay: 100 });

    // Loosened from an exact "- Priya Shaha" match: case-insensitive,
    // no assumption about a leading "- " prefix, since we haven't
    // confirmed the exact rendered text for this flow yet.
    const suggestion = page.getByText(new RegExp(nameHint, 'i'));
    await suggestion.waitFor({ state: 'visible', timeout: 20000 });
    await suggestion.click();
    await waitForOverlayGone(page);
  });
}

/**
 * Opens the date range picker and clicks two day cells by visible text.
 * ⚠️ Carried over from the recorded flow as-is: `.first()` for day "1"
 * and `.nth(2)` for day "3" are positional and assume a specific month
 * layout (which row/column "1" and "3" land in). This is the same class
 * of fragility flagged in the Lock Attendance script's calendar clicks.
 * If this becomes flaky, prefer a date-range input you can `.fill()`
 * directly (as used in later Lock Attendance revisions), or scope these
 * to the visible calendar panel rather than the whole page.
 */
/**
 * Clicks a day cell by its visible number, excluding disabled cells.
 * The calendar pads each month's grid with grayed-out days from the
 * adjacent month (e.g. the July panel's last row shows August 1-8 as
 * disabled filler) — those carry the same text as the real day and
 * intercept clicks since they're non-interactive, which is what caused
 * the original `.nth(2)` to hang (confirmed via the failure log: the
 * resolved element had `class="disabled ..."`). Scoping to gridcells
 * that don't contain a `.disabled` span avoids counting those filler
 * days at all.
 */
async function selectCalendarDay(page: Page, day: string) {
  const cell = page
    .locator('td[role="gridcell"]:not(:has(span.disabled))')
    .getByText(day, { exact: true });
  await cell.first().click();
}

async function selectDateRange(page: Page) {
  await test.step('Select date range (day 1 to day 3)', async () => {
    await page.getByRole('textbox', { name: 'Select Date Range' }).click();
    await selectCalendarDay(page, '1');
    await selectCalendarDay(page, '3');
    await waitForOverlayGone(page);
  });
}

async function save(page: Page) {
  await test.step('Save', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForOverlayGone(page);
  });
}

test('Edit Attendance Reversal', async ({ page }) => {
  test.setTimeout(120_000);

  await login(page);
  await navigateToEditAttendanceReversal(page);
  await selectEmployee(page, EMPLOYEE_ID, EMPLOYEE_NAME_HINT);
  await selectDateRange(page);
  await save(page);
});