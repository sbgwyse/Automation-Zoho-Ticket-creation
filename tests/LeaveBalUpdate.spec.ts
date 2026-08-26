import { test, expect, Page } from '@playwright/test';

test.setTimeout(120000);

const STEP_TIMEOUT = 10000; // per-action timeout applied to key locators below
const SECTION_PAUSE = 2000; // pause between sections for the UI to settle

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100', { timeout: STEP_TIMEOUT });
  await page.getByRole('textbox', { name: 'Password' }).click({ timeout: STEP_TIMEOUT });
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123', { timeout: STEP_TIMEOUT });
  await page.getByRole('button', { name: 'Sign In' }).click({ timeout: STEP_TIMEOUT });
  await page.waitForTimeout(15000);
  console.log('Login Successful');
}

async function navigateToLeaveBalanceUpdate(page: Page) {
  await page.getByText('ELMS').click({ timeout: STEP_TIMEOUT });
  await page.getByRole('combobox').selectOption('eLMS Uploads', { timeout: STEP_TIMEOUT });
  await page
    .locator('app-elms-uploads')
    .getByRole('combobox')
    .selectOption('Leave Balance Update', { timeout: STEP_TIMEOUT });
  await page.waitForTimeout(SECTION_PAUSE);
  console.log('Leave Balance Update Opened');
}

test('Leave Balance Update', async ({ page }) => {
  await login(page);
  await navigateToLeaveBalanceUpdate(page);

  // ==========================
  // SELECT EMPLOYEE
  // ==========================
  await page.locator('input[name="employees"]').click({ timeout: STEP_TIMEOUT });
  await page.locator('input[name="employees"]').fill('500100123', { timeout: STEP_TIMEOUT });

  // NOTE: matches by partial name text. If this employee ID has a
  // duplicate name elsewhere in the system (as seen in the Apply/Cancel
  // Leave flow — e.g. two "Slok Jadhav" entries), this could hit a
  // Playwright strict-mode violation. Prefer the full "ID - Name" text
  // with exact: true if that happens here too.
  await page.getByText('- Priya Shaha').click({ timeout: STEP_TIMEOUT });

  console.log('Employee Selected: 500100123 - Priya Shaha');
  await page.waitForTimeout(SECTION_PAUSE);

  // ==========================
  // SELECT LEAVE (dropdown steps through options 1 -> 2, matching the
  // recorded codegen sequence)
  // ==========================
  await page.locator('select[name="selectedLeave"]').selectOption('1', { timeout: STEP_TIMEOUT });
  await page.locator('select[name="selectedLeave"]').selectOption('2', { timeout: STEP_TIMEOUT });
  await page.waitForTimeout(SECTION_PAUSE);

  // ==========================
  // CONTRACT DATE RANGE
  // ==========================
  await page.locator('input[name="contractfromdate"]').click({ timeout: STEP_TIMEOUT });
  await page.locator('input[name="contractfromdate"]').fill('01/01/2026', { timeout: STEP_TIMEOUT });

  await page.locator('input[name="contracttodate"]').click({ timeout: STEP_TIMEOUT });
  await page.locator('input[name="contracttodate"]').fill('31/12/2026', { timeout: STEP_TIMEOUT });
  await page.waitForTimeout(SECTION_PAUSE);

  // ==========================
  // OPENING / CLOSING BALANCE
  // ==========================
  await page.locator('#contract_opening_bal').click({ timeout: STEP_TIMEOUT });
  await page.locator('#contract_opening_bal').fill('24', { timeout: STEP_TIMEOUT });

  await page.locator('#contract_closing_bal').click({ timeout: STEP_TIMEOUT });
  await page.locator('#contract_closing_bal').fill('0', { timeout: STEP_TIMEOUT });

  await page.locator('#same_as_above').check({ timeout: STEP_TIMEOUT });
  await page.waitForTimeout(SECTION_PAUSE);

  // ==========================
  // SUBMIT
  // ==========================
  await page.getByRole('button', { name: 'Submit' }).click({ timeout: STEP_TIMEOUT });

  console.log('Submit Clicked');

  await page.waitForTimeout(3000);

  // ==========================
  // CONFIRMATION DIALOG CLOSE
  // ==========================
  // NOTE: this button has no accessible name in the recording
  // (filter({ hasText: /^$/ }) matches an icon-only button — likely a
  // dialog close/OK icon). Fragile if more than one icon-only button is
  // on screen at this point; scope to the dialog container if this
  // starts hitting a strict-mode violation.
  await page.getByRole('button').filter({ hasText: /^$/ }).click({ timeout: STEP_TIMEOUT });

  console.log('Confirmation Dialog Closed');
  await page.waitForTimeout(SECTION_PAUSE);

  await page.screenshot({ path: 'leave_balance_update_result.png', fullPage: true });

  console.log('Process Completed');
});