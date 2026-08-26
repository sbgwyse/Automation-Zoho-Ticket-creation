import { test, expect, Page } from '@playwright/test';

// ---- Shared helpers (mirrors resetMobileSetting.spec.ts / applyMobileSetting.spec.ts) ----

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByText('ADMINISTRATION').waitFor({ state: 'visible' });
}

async function waitForLoaderHidden(page: Page) {
  const loader = page.locator('.ngx-overlay, ngx-ui-loader');
  await loader.first().waitFor({ state: 'hidden' }).catch(() => {});
}

// Fills the employee-id field. TODO: unconfirmed whether this is a plain
// input or a PrimeNG/mat autocomplete that requires picking a suggestion —
// the raw recording only .fill()'d it, which works for a plain input but
// can silently fail to "select" an employee on an autocomplete widget. This
// best-effort fallback presses ArrowDown+Enter if a suggestion list appears;
// remove it if the field turns out to be a plain input.
async function fillEmployeeId(page: Page, value: string) {
  const field = page.locator('#employeeid');
  await field.click();
  await field.fill(value);
  const suggestion = page.locator('.p-autocomplete-panel li, .mat-autocomplete-panel mat-option').first();
  if (await suggestion.isVisible({ timeout: 1000 }).catch(() => false)) {
    await suggestion.click();
  }
  await waitForLoaderHidden(page);
}

test('Assign Menu - ADMINISTRATION', async ({ page }) => {
  await login(page);

  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Assign Menu');

  // --- Employee 1: Ravi Sahu ---
  await fillEmployeeId(page, '100100111 - Ravi Sahu');

  // TODO: this block relies on generic PrimeNG/mat state classes and
  // positional div:nth-child selectors, none of which are confirmed labels.
  // A screenshot of this screen (module tree + radio group) would let these
  // be replaced with real names, same as done for the other ADMINISTRATION flows.
  await page.locator('.p-checkbox-box').first().click();
  await page.locator('.mat-radio-outer-circle').first().click();
  await page.locator('.p-element.ng-untouched > .p-checkbox > .p-checkbox-box').first().click();

  await page.getByText('Shift Upload').click();
  await page.locator('div:nth-child(3) > .p-element > .p-checkbox > .p-checkbox-box').click();
  await page.locator('div:nth-child(4) > .p-element > .p-checkbox > .p-checkbox-box').click();

  await waitForLoaderHidden(page);
  await page.getByRole('button', { name: 'Save' }).click();
  await waitForLoaderHidden(page);

  // --- Employee 2: Amit Sharma ---
  await fillEmployeeId(page, '440100111 - Amit Sharma');

  await page.locator('.mat-radio-outer-circle').first().click();
  // #ELMS is a confirmed stable id — leave as-is
  await page.locator('#ELMS > .mat-radio-label > .mat-radio-container > .mat-radio-outer-circle').click();
  await page.locator('.p-element.ng-untouched > .p-checkbox > .p-checkbox-box').first().click();
  await page.locator('.p-fluid > div:nth-child(2) > .p-element > .p-checkbox > .p-checkbox-box').click();

  await waitForLoaderHidden(page);
  await page.getByRole('button', { name: 'Save' }).click();
  await waitForLoaderHidden(page);

  // --- Delete All RO Rights ---
  await page.getByRole('button', { name: 'Delete All RO Rights' }).click();
  await page.getByRole('button', { name: 'Yes, delete it!' }).click();
  await waitForLoaderHidden(page);
});