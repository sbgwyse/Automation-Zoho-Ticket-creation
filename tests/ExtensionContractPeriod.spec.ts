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
  // Pressing Enter already submits the form here — a follow-up click on
  // "Sign In" double-submits and collides with the loader overlay, so we
  // submit once (Enter only) and just wait for the overlay to clear.
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  const loader = page.locator('ngx-ui-loader, .ngx-overlay');
  if (await loader.count()) {
    await loader.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
}

async function closeResultDialogIfPresent(page: Page) {
  const dialogClose = page.locator('.p-dialog-header-icons');
  if (await dialogClose.count()) {
    await dialogClose.first().click().catch(() => {});
  }
  const okButton = page.getByRole('button', { name: /ok/i });
  if (await okButton.count()) {
    await okButton.first().click().catch(() => {});
  }
}

/**
 * Selects an employee by ID and full "ID - Name" text.
 * Using the full string with exact:true avoids Playwright strict-mode
 * violations when multiple employees share the same display name.
 */
async function selectEmployeeById(page: Page, employeeId: string, fullLabel: string) {
  const employeeInput = page.locator('input[name="employees"]');
  await employeeInput.click();
  await employeeInput.fill(employeeId);
  await page.getByText(fullLabel, { exact: true }).click();
  await page.waitForTimeout(PAUSE_MS);
}

async function navigateToExtensionOfContractPeriod(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('Extension Of Contract Period');
  await page.waitForTimeout(PAUSE_MS);
}

/**
 * Picks a day from the ngx-bootstrap datepicker. Scoping by the visible
 * month name and excluding "is-other-month" avoids grabbing the wrong
 * cell when adjacent-month days share the same number.
 */
async function selectDatepickerDay(page: Page, monthName: string, day: string) {
  await page.getByPlaceholder('Select Date', { exact: true }).click();
  const monthView = page.locator('bs-days-calendar-view', { hasText: monthName });
  await monthView
    .locator(`[bsdatepickerdaydecorator]:not(.is-other-month) >> text="${day}"`)
    .first()
    .click();
}

// --- Flow -----------------------------------------------------------------

async function extendContractPeriod(
  page: Page,
  employeeId: string,
  employeeFullLabel: string,
  monthName: string,
  day: string,
  openingBalance: string
) {
  await navigateToExtensionOfContractPeriod(page);
  await selectEmployeeById(page, employeeId, employeeFullLabel);

  // Selects run through 1 -> 2 -> 3 sequentially, as recorded — leaving
  // this in case the UI depends on intermediate onChange handlers firing.
  const leaveSelect = page.locator('select[name="selectedLeave"]');
  await leaveSelect.selectOption('1');
  await leaveSelect.selectOption('2');
  await leaveSelect.selectOption('3');

  await selectDatepickerDay(page, monthName, day);

  await page.locator('#contract_opening_bal').click();
  await page.locator('#contract_opening_bal').fill(openingBalance);

  // TODO: the form also shows a required "New Balance" field (red asterisk)
  // separate from Carry Forward Closing Balance / #contract_opening_bal —
  // confirm its DOM id/name and fill it here if it's actually required,
  // e.g.:
  // await page.getByLabel('New Balance').fill(newBalance);

  await page.getByRole('button', { name: 'Submit' }).click();
  await closeResultDialogIfPresent(page);
}

// --- Test -------------------------------------------------------------

test('Extension Of Contract Period - single employee', async ({ page }) => {
  await login(page);

  await extendContractPeriod(
    page,
    '500100222',
    '500100222 - Priya Shaha', // adjust to match the exact rendered "ID - Name" text
    'August', // confirmed from screenshot: picker defaults to August 2026
    '1',
    '30'
  );

  // TODO: replace with an actual success assertion once the confirmation
  // dialog/toast text is confirmed, e.g.:
  // await expect(page.getByText('Contract period extended successfully')).toBeVisible();
});