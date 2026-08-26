import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function navigateToCreateUser(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Configuration');
  await page
    .locator('app-elms-configuration')
    .getByRole('combobox')
    .selectOption('Create User');
}

// --- Flow -------------------------------------------------------------

async function createUser(page: Page, employeeId: string, employeeName: string) {
  // Auto-accept any native browser dialog (confirm/alert) that might
  // appear after an action — otherwise it can block the page and make
  // Playwright report the page/context as closed on the next action.
  page.on('dialog', (dialog) => dialog.accept());

  await navigateToCreateUser(page);

  // Department selector
  await page.getByText('--Select a Department--').click();

  // NOTE: `.nth(1)` on a generic checkbox() locator is fragile — it
  // assumes exactly the same number/order of checkboxes render every
  // time (e.g. the department list). If this breaks, scope it to a
  // specific department by its label text instead, e.g.:
  //   await page.getByRole('row', { name: 'SomeDepartment' }).getByRole('checkbox').click();
  await page.getByRole('checkbox').nth(1).click();

  // Close the department multiselect dropdown before interacting with
  // the employee table underneath it.
  await page.locator('p-multiselect').getByRole('button').click();

  // Select the employee from the visible table by the FULL "<id>-<name>"
  // cell text, exact match. Confirmed root cause elsewhere in this app
  // (ELMS Apply/Cancel Leave employee suggestions): partial/name-only
  // matches hit strict-mode violations whenever two employees share a
  // name — here, two "Dhruv Pokale" rows differ only by ID
  // (500100126 vs 500100555). Matching the full ID-Name string with
  // exact: true is the confirmed fix.
  const employeeCellText = `${employeeId}-${employeeName}`;
  await page.getByRole('cell', { name: employeeCellText, exact: true }).click();

  // NOTE: `.nth(1)` on a generic button() locator — likely a "confirm
  // selection" / "create" action. Worth confirming its accessible name
  // once known, and replacing with getByRole('button', { name: ... }).
  await page.getByRole('button').nth(1).click();
}

// --- Test -------------------------------------------------------------

test('eLMS Configuration - Create User', async ({ page }) => {
  await login(page);

  // Full ID required — a bare name-only string (e.g. '-Dhruv Pokale')
  // can never uniquely resolve when duplicate names exist in the table.
  await createUser(page, '500100126', 'Dhruv Pokale');
});