import { test, expect, Page } from '@playwright/test';

const PAUSE_MS = 500;

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function navigateToLeaveRuleBook(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Configuration');
  await page
    .locator('app-elms-configuration')
    .getByRole('combobox')
    .selectOption('Leave Rule Book');
  await page.waitForTimeout(PAUSE_MS);
}

// --- Flow -------------------------------------------------------------

async function configureLeaveRuleBook(
  page: Page,
  peopleGroupValue: string,
  days: string,
  startMonth: string
) {
  await navigateToLeaveRuleBook(page);

  // People Group — native <select>, options are present on load.
  const peopleGroupSelect = page.locator('select[name="peopleGroup"]');
  await expect(peopleGroupSelect).toBeVisible();
  await expect(peopleGroupSelect).toBeEnabled();
  await peopleGroupSelect.selectOption(peopleGroupValue);

  // Leave Type — native <select>. Angular filters this list to exclude
  // leave types already configured for the chosen People Group (the
  // right-hand table on screen lists existing rules). Each successful
  // Save in this test permanently consumes one Leave Type for this
  // People Group, so a hardcoded value only works once. Instead, wait
  // for the list to load (more than just the "--Select Leave Type--"
  // placeholder) and pick whichever real option is still available.
  const leaveTypeSelect = page.locator('select[name="selectedLeave"]');
  await expect(leaveTypeSelect).toBeVisible();
  await expect(leaveTypeSelect).toBeEnabled({ timeout: 10000 });
  const leaveTypeOptions = leaveTypeSelect.locator('option:not([value="-1"])');
  await expect(leaveTypeOptions.first()).toBeAttached({ timeout: 10000 });
  const firstAvailableValue = await leaveTypeOptions.first().getAttribute('value');
  if (!firstAvailableValue) {
    throw new Error('No Leave Type options are available for this People Group — all leave types may already be configured.');
  }
  await leaveTypeSelect.selectOption(firstAvailableValue);

  // Allow Leave Balance / Payable / Should Check Rule all default to
  // "No" and we're leaving them as-is for this run, so no radio clicks
  // needed here. If a future run needs one set to "Yes", scope the
  // click to that specific field's radiogroup, e.g.:
  // await page.getByText('Payable', { exact: true })
  //   .locator('..')
  //   .getByRole('radio', { name: 'Yes' })
  //   .click();

  await page.getByPlaceholder('Days').fill(days);

  // Leave Start Month — native <select>, identified by its option set
  // (Jan..Dec) rather than a guessed `name` attribute, since we haven't
  // confirmed the real attribute value.
  const leaveStartMonthSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Jan' }) });
  await expect(leaveStartMonthSelect).toBeVisible();
  await leaveStartMonthSelect.selectOption({ label: startMonth });

  await page.getByRole('button', { name: 'Save' }).click();
}

// --- Test -------------------------------------------------------------

test('eLMS Configuration - Leave Rule Book', async ({ page }) => {
  await login(page);

  await configureLeaveRuleBook(
    page,
    '67',   // FTC
    '4',
    'Nov'
  );

  // TODO: replace with an actual success assertion once the save
  // confirmation (dialog/toast) text is confirmed. For example:
  // await expect(page.getByText('Saved successfully')).toBeVisible();
});