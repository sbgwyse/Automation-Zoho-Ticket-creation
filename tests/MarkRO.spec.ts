import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function navigateToMarkReportingOfficer(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Configuration');
  await page
    .locator('app-elms-configuration')
    .getByRole('combobox')
    .selectOption('Mark Reporting Officer (RO)');
}

// --- Flow -------------------------------------------------------------

async function markReportingOfficer(
  page: Page,
  employeeId: string,
  employeeResultText: string
) {
  await navigateToMarkReportingOfficer(page);

  // Employee autocomplete — PrimeNG p-autocomplete backed by a real
  // <input name="emp">. The dropdown button alone does not populate
  // results; typing the employee ID triggers the search, and the
  // matching name then appears as a clickable option.
  const employeeInput = page.locator('input[name="emp"]');
  await expect(employeeInput).toBeVisible();
  await employeeInput.click();
  // pressSequentially simulates real keystrokes (keydown/keyup per
  // character), which PrimeNG's autocomplete search listener needs to
  // trigger — a plain fill() sets the value directly and does not
  // reliably fire the search.
  await employeeInput.pressSequentially(employeeId, { delay: 100 });

  // FIX: wait for the suggestions panel itself before searching inside
  // it — the previous version searched the whole page for the option
  // text immediately, before the panel had necessarily rendered, and
  // the app has duplicate-name records elsewhere (two "Slok Jadhav"
  // with different IDs), so matching by name alone is unreliable even
  // when it does render. Match by employee ID (unique) scoped to the
  // panel instead of by name scoped to the whole page.
  const panel = page.locator('.p-autocomplete-panel');
  await expect(panel).toBeVisible({ timeout: 15000 });
  const option = panel.getByText(employeeId, { exact: false }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  // The autocomplete results panel can remain open/overlapping the
  // checkboxes right after selecting an option, which intercepts the
  // next click before it reaches the checkbox. Press Escape to force
  // the panel closed before interacting with anything below it.
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' }).catch(() => {});

  // NOTE: `.first()` here is carried over from the recording. There may
  // be multiple checkboxes on screen (e.g. one per employee row) — worth
  // confirming this is the intended one rather than always the first
  // checkbox on the page.
  const firstCheckbox = page.locator('.p-checkbox-box').first();
  await expect(firstCheckbox).toBeVisible();
  await expect(firstCheckbox).toBeEnabled();
  await firstCheckbox.click();

  // RO checkbox — scoped specifically to the #RO container, so this one
  // is unambiguous regardless of how many other checkboxes exist.
  const roCheckbox = page.locator('#RO > .p-checkbox > .p-checkbox-box');
  await expect(roCheckbox).toBeVisible();
  await expect(roCheckbox).toBeEnabled();
  await roCheckbox.click();

  await page.getByRole('button', { name: 'Save' }).click();
}

// --- Test -------------------------------------------------------------

test('eLMS Configuration - Mark Reporting Officer (RO)', async ({ page }) => {
  await login(page);

  await markReportingOfficer(page, '500100127', '- Slok Jadhav');

  // TODO: replace with an actual success assertion once the save
  // confirmation (dialog/toast) text is confirmed. For example:
  // await expect(page.getByText('Saved successfully')).toBeVisible();
});