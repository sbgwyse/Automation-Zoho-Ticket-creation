import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = 'ADMIN/etam100';
const PASSWORD = '$WysE123';

const PAUSE_MS = 500;

// --- Shared helpers -------------------------------------------------------

async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  const loader = page.locator('ngx-ui-loader, .ngx-overlay');
  if (await loader.count()) {
    await loader.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
}

async function navigateToSetLeaveEncashmentWithinYear(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('Set Leave Encashment Within Year');
  await page.waitForTimeout(PAUSE_MS);
}

// --- Flow -------------------------------------------------------------

async function setLeaveEncashmentWithinYear(page: Page) {
  await navigateToSetLeaveEncashmentWithinYear(page);

  // Main Department multiselect.
  // NOTE: checkbox selection is by nth() index here, carried over as-is from
  // the recording. This is fragile — if the department list order changes,
  // the wrong department gets selected. Prefer selecting by accessible
  // label/name once you know the real department names (as was done in
  // other specs, e.g. employeeLeaveReport.spec.ts).
  await page.getByText('--Select a Department--').click();
  await page.getByRole('checkbox').nth(2).click();

  // Open Advance Filter sidebar
  await page.getByText('Advance Filter').click();
  await page.getByText('Contractor').click();

  // Advance Filter > Contractor multiselect
  await page.getByText('--Select a Contractor--').click();
  await page.getByRole('checkbox').nth(4).click();
  await page.getByRole('button').nth(5).click();

  // Advance Filter > Department multiselect
  await page.getByText('--Select a Department--').click();
  await page.getByRole('checkbox').nth(4).click();
  await page.getByRole('button').nth(5).click();

  // Extra standalone checkbox in the Advance Filter sidebar (seen in other
  // ELMS flows too, e.g. employeeLeaveReport.spec.ts)
  await page.getByRole('checkbox').nth(4).click();
  await page.getByRole('button', { name: 'Done' }).click();

  // Final selection checkbox on the main form, then submit
  await page.getByRole('checkbox').nth(2).click();
  await page.getByRole('button', { name: 'Set Leave Encashment' }).click();
}

// --- Test -------------------------------------------------------------

test('Set Leave Encashment Within Year', async ({ page }) => {
  await login(page);

  await setLeaveEncashmentWithinYear(page);

  // TODO: replace with an actual success assertion once the confirmation
  // dialog/toast text is confirmed, e.g.:
  // await expect(page.getByText('Leave encashment set successfully')).toBeVisible();
});