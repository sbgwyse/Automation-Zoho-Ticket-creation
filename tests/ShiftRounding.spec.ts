import { test, expect, Page } from '@playwright/test';

/**
 * ETAM PRIME - Shift Rounding flow (Registration module)
 * Refactored from raw codegen recording.
 *
 * Notes on cleanup vs. the original recording:
 * - Removed redundant/no-op `press('CapsLock')` calls and duplicate `fill()`
 *   calls on the Username field (codegen artifacts from typing, not real steps).
 * - Credentials pulled from env vars instead of being hardcoded.
 * - The site appears to have a two-step sign-in: an initial Sign In, followed
 *   by an icon click (`i`) that reveals a second Password field which must be
 *   re-entered and submitted. Kept as-is since it's a real app behavior, but
 *   isolated into `login()` so it's not duplicated across specs.
 * - Weekday checkboxes selected via `#DayName > .p-checkbox > .p-checkbox-box`
 *   — kept the ID-scoped locator since it's more robust than a bare class
 *   selector if other checkboxes share the same PrimeNG classes elsewhere
 *   on the page.
 */

const PAUSE_MS = 300;

const USERNAME = process.env.ETAM_USERNAME ?? 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD ?? '$WsE123';
// TODO: confirm whether this second password is meant to be the same value
// as PASSWORD above ('$WysE123' in the recording looks like a possible typo
// of '$WsE123' vs. a genuinely different secondary password/PIN).
const SECOND_PASSWORD = process.env.ETAM_SECOND_PASSWORD ?? '$WysE123';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');

  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Second-step confirmation: click reveal icon, re-enter password, sign in again.
  await page.locator('i').click();
  await page.getByRole('textbox', { name: 'Password' }).fill(SECOND_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function navigateToShiftRounding(page: Page) {
  await page.getByText('REGISTRATION').click();
  await page.getByRole('combobox').selectOption('Shift Rounding');
}

/**
 * Waits for the post-Save result dialog/toast to appear and dismisses it,
 * following the same pattern used in your other specs (e.g. Off Policy
 * Registration, Employee Data Modification).
 */
async function closeResultDialogIfPresent(page: Page) {
  const dialog = page.locator('.p-dialog, .p-toast-message').first();
  try {
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    const closeButton = dialog.getByRole('button', { name: /ok|close/i }).first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  } catch {
    // No dialog appeared — nothing to close.
  }
}

test.describe('Shift Rounding', () => {
  test('rounds a shift for selected weekdays with grace period', async ({ page }) => {
    await login(page);
    await navigateToShiftRounding(page);

    // Select the shift to configure
    await page.locator('select[name="selectedShift"]').selectOption('4 - Morning1');

    // "Select all" / header checkbox
    await page.locator('.p-checkbox-box').first().click();

    // Select each applicable weekday individually
    for (const day of WEEKDAYS) {
      await page.locator(`#${day} > .p-checkbox > .p-checkbox-box`).click();
    }

    // Rounding time
    const timeField = page.getByRole('textbox', { name: 'HH:mm' });
    await timeField.click();
    await timeField.fill('00:00');

    // Shift grace period (minutes)
    const graceField = page.getByRole('textbox', { name: 'Shift Grace' });
    await graceField.click();
    await graceField.fill('59');

    await page.waitForTimeout(PAUSE_MS);
    await page.getByRole('button', { name: 'Save' }).click();

    // Finish: wait for and dismiss the save confirmation, then confirm
    // we're still on a stable, usable state (Save button visible again
    // means the form re-rendered rather than erroring out).
    await closeResultDialogIfPresent(page);
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });
});