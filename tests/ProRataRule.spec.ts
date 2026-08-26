import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function navigateToProRataRules(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Configuration');
  await page
    .locator('app-elms-configuration')
    .getByRole('combobox')
    .selectOption('Pro Rata Rules');
}

// --- Flow -------------------------------------------------------------

async function configureProRataRule(
  page: Page,
  peopleGroupValue: string,
  leaveTypeValue: string,
  maxPresentDay: string,
  leaveToCredit: string
) {
  await navigateToProRataRules(page);

  // People Group — native <select>, options are present on load.
  const peopleGroupSelect = page.locator('select[name="peopleGroup"]');
  await expect(peopleGroupSelect).toBeVisible();
  await expect(peopleGroupSelect).toBeEnabled();
  await peopleGroupSelect.selectOption(peopleGroupValue);

  // Leave Type — native <select>. As with the Leave Rule Book form,
  // this list is likely filtered by Angular to exclude leave types
  // already configured for the chosen People Group, and its options
  // may only load after People Group changes. Wait for the target
  // option to actually be attached before selecting.
  const leaveTypeSelect = page.locator('select[name="selectedLeave"]');
  await expect(leaveTypeSelect).toBeVisible();
  await expect(leaveTypeSelect).toBeEnabled({ timeout: 10000 });
  await expect(
    leaveTypeSelect.locator(`option[value="${leaveTypeValue}"]`)
  ).toHaveCount(1, { timeout: 10000 });
  await leaveTypeSelect.selectOption(leaveTypeValue);

  await page.locator('#max_present_day').fill(maxPresentDay);
  await page.locator('#leave_to_credit').fill(leaveToCredit);

  await page.getByRole('button', { name: 'Save' }).click();
}

// --- Test -------------------------------------------------------------

test('eLMS Configuration - Pro Rata Rules', async ({ page }) => {
  await login(page);

  await configureProRataRule(
    page,
    '1',    // All Peoplegroups
    '3',    // SICK LEAVE
    '10',   // Max Present Day
    '1'     // Leave to Credit
  );

  // TODO: replace with an actual success assertion once the save
  // confirmation (dialog/toast) text is confirmed. For example:
  // await expect(page.getByText('Saved successfully')).toBeVisible();
});