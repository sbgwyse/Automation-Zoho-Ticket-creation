import { test, expect, Page } from '@playwright/test';

// ---- Shared helpers (mirrors compareAttendance.spec.ts / lockAttendance.spec.ts / resetMobileSetting.spec.ts) ----

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  // Pressing Enter here already submits the form — do NOT also click 'Sign In'
  // afterwards, that double-submits and collides with the loader overlay.
  // The raw recording did both; keep only one.
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByText('ADMINISTRATION').waitFor({ state: 'visible' });
}

async function waitForLoaderHidden(page: Page) {
  const loader = page.locator('.ngx-overlay, ngx-ui-loader');
  await loader.first().waitFor({ state: 'hidden' }).catch(() => {});
}

async function closeResultDialogIfPresent(page: Page) {
  const dialog = page.locator('p-dialog[header="Result"]');
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.locator('.p-dialog-header-icons').click();
    await dialog.waitFor({ state: 'hidden' }).catch(() => {});
  }
}

// Opens the Department multiselect and ticks each label in `labels`,
// scoped to the currently-open panel.
async function selectDepartments(page: Page, labels: string[]) {
  await page.getByText('--Select a Department--').click();
  const panel = page.locator('.p-multiselect-panel').first();
  await panel.waitFor({ state: 'visible' });
  await waitForLoaderHidden(page);

  for (const label of labels) {
    // panel can auto-close after a pick on some screens — reopen if needed
    if (!(await panel.isVisible().catch(() => false))) {
      await page.getByText('--Select a Department--').click();
      await panel.waitFor({ state: 'visible' });
    }
    await panel.getByText(label, { exact: true }).click();
    await waitForLoaderHidden(page);
  }

  // close: try the panel's own (icon-only) close button first, fall back to outside-click
  const closeBtn = page.getByRole('button').filter({ hasText: /^$/ }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  } else {
    await page.mouse.click(1400, 100);
  }
  await panel.waitFor({ state: 'hidden' }).catch(() => {});
}

test('Apply Mobile Setting - ADMINISTRATION', async ({ page }) => {
  await login(page);

  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Apply Mobile Setting');

  // Department labels confirmed from other Monthly Pay Process screens
  await selectDepartments(page, ['Engineering', 'Food & Beverage', 'Sales']);

  // Select-all header checkbox in the employee grid (same pattern as Lock Attendance)
  await waitForLoaderHidden(page);
  await page.locator('p-tableheadercheckbox > .p-checkbox > .p-checkbox-box').click();

  await page.locator('select[name="designname"]').selectOption('Team Leader');

  // --- TODO: unlabeled checkbox block below ---
  // The raw recording drove this block entirely through a generic Angular
  // state-class locator: `.p-element.ng-untouched.ng-pristine.ng-valid > .p-checkbox > .p-checkbox-box`.
  // That's fragile in a way not yet seen elsewhere in this suite: clicking a
  // checkbox changes its own ng-untouched/ng-pristine classes, so re-running
  // `.first()` against the same selector afterwards resolves to a DIFFERENT
  // (the next still-untouched) checkbox rather than re-clicking the same one.
  // The 4 clicks below are reproduced positionally as recorded, but they are
  // NOT verified to hit the same logical toggles on a rerun. Needs a
  // screenshot of this screen (like the Lock Attendance "Presume Present"
  // fix) to replace with real labels before this can be trusted.
  await waitForLoaderHidden(page);
  await page.locator('.p-element.ng-untouched.ng-pristine.ng-valid > .p-checkbox > .p-checkbox-box').first().click();
  await page.locator('p-checkbox').nth(2).click();
  await page.locator('.p-element.ng-untouched.ng-pristine.ng-valid > .p-checkbox > .p-checkbox-box').first().click();

  await page.locator('select[name="location"]').selectOption('1113');
  await page.getByRole('radio', { name: 'Yes' }).check();

  // TODO: same fragile-class caveat as above for these last two checkboxes
  await page.locator('.p-element.ng-untouched.ng-pristine.ng-valid > .p-checkbox > .p-checkbox-box').first().click();
  await page.locator('.p-element.ng-untouched.ng-pristine.ng-valid > .p-checkbox > .p-checkbox-box').click();

  await waitForLoaderHidden(page);
  await page.getByRole('button', { name: 'Modify' }).click();
  await closeResultDialogIfPresent(page);
});