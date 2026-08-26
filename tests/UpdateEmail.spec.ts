import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function navigateToUpdateEmailId(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Configuration');
  await page
    .locator('app-elms-configuration')
    .getByRole('combobox')
    .selectOption('Update e-Mail Id');
}

// --- Flow -------------------------------------------------------------

async function updateEmailId(
  page: Page,
  employeeId: string,
  newEmail: string
) {
  await navigateToUpdateEmailId(page);

  // Employee autocomplete — same PrimeNG p-autocomplete pattern as
  // Mark Reporting Officer. pressSequentially fires real keystroke
  // events, which the search listener needs; a plain fill() may not
  // reliably trigger it.
  const employeeInput = page.locator('input[name="emp"]');
  await expect(employeeInput).toBeVisible();
  await employeeInput.click();
  await employeeInput.pressSequentially(employeeId, { delay: 100 });

  // NOTE: `#pr_id_5_list` is a PrimeNG auto-generated ID (the number
  // increments based on how many PrimeNG components have rendered on
  // the page before this one). It can shift between sessions or if the
  // page layout changes, which would silently break this selector.
  // If this becomes flaky, replace with a role/text-based locator for
  // the matching result instead, e.g.:
  //   await page.getByRole('option', { name: employeeResultText }).click();
  await page.locator('#pr_id_5_list').click({ timeout: 15000 });

  const emailInput = page.getByRole('textbox').last();
  await emailInput.click();
  await emailInput.fill(newEmail);

  await page.getByRole('button', { name: 'Update' }).click();
}

// --- Test -------------------------------------------------------------

test('eLMS Configuration - Update e-Mail Id', async ({ page }) => {
  await login(page);

  await updateEmailId(page, '500100123', 'pri@email.com');

  // TODO: replace with an actual success assertion once the update
  // confirmation (dialog/toast) text is confirmed. For example:
  // await expect(page.getByText('Updated successfully')).toBeVisible();
});