import { test, expect, Page } from '@playwright/test';

// ETAM PRIME - Duty Roster (Shift) automation
// Refactored from raw codegen recording using the shared-helper pattern
// established across the Upload / Employee Data Modification / Off Policy specs.
//
// This version adds: selecting multiple departments in the main filter,
// selecting contractors by name (not just checkbox index) in the Advance
// Filter, selecting multiple departments by label in the Advance Filter,
// clicking a specific calendar day, Save Shift, and Delete Shift.

test.use({ viewport: { width: 1600, height: 1000 } });

const PAUSE_MS = 500;

const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = 'ADMIN/etam100';
const PASSWORD = '$WysE123';

// ---------- Shared helpers ----------

async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  // Submit via the button only — pressing Enter here as well double-submits
  // the form and collides with the ngx-ui-loader overlay from the first
  // submission, which previously timed out against a detached button once
  // the page had already navigated.
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.locator('ngx-ui-loader .ngx-overlay').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(PAUSE_MS);
}

async function closeResultDialogIfPresent(page: Page) {
  const okButton = page.getByRole('button', { name: /^(OK|Ok|Close)$/ });
  if (await okButton.isVisible().catch(() => false)) {
    await okButton.click();
    await page.waitForTimeout(PAUSE_MS);
  }
}

// PrimeNG multiselect panels on this app render with appendTo="body",
// so a second click on the trigger (or Escape) doesn't reliably close them.
// A neutral click away from any panel is the fix that's held up across specs.
async function closeOpenPanel(page: Page) {
  await page.mouse.click(1400, 100);
  await page.waitForTimeout(PAUSE_MS);
}

// Multiselect checkboxes here are sometimes momentarily covered by
// transient overlays (p-sidebar-mask, ngx-ui-loader spinner). Wait those
// out before clicking, and confirm the checkbox isn't genuinely disabled.
async function waitForOverlaysGone(page: Page) {
  const loader = page.locator('.ngx-ui-loader');

  if (await loader.count()) {
    await loader.first().waitFor({
      state: 'hidden',
      timeout: 10000
    }).catch(() => {});
  }
}

// Main Department filter: opens the multiselect and ticks the first N
// checkboxes (recorded as three departments), then closes the panel.
async function selectMainDepartments(page: Page, count: number) {
  await page.getByText('--Select a Department--').click();
  await waitForOverlaysGone(page);
  const checkboxes = page.locator('.p-ripple > .p-checkbox > .p-checkbox-box');
  for (let i = 0; i < count; i++) {
    await expect(checkboxes.nth(i)).toBeEnabled();
    await checkboxes.nth(i).click();
  }
  await closeOpenPanel(page);
}

// Advance Filter -> Contractor: ticks the first checkbox, then selects
// specific contractors by their visible name text.
async function selectContractors(page: Page, contractorNames: string[]) {
  console.log('STEP 1: Opening Contractor');

  const sidebar = page.locator('.p-sidebar').last();

  await expect(sidebar).toBeVisible({
    timeout: 15000
  });

  console.log('STEP 2: Sidebar is visible');

  const contractor = sidebar.getByText('Contractor', {
    exact: true
  }).first();

  await expect(contractor).toBeVisible({
    timeout: 15000
  });

  console.log('STEP 3: Contractor visible');

  await contractor.click();

  await page.waitForTimeout(500);

  console.log('STEP 4: Contractor clicked');

  const dropdown = sidebar.getByText(
    '--Select a Contractor--',
    {
      exact: true
    }
  ).first();

  await expect(dropdown).toBeVisible({
    timeout: 15000
  });

  console.log('STEP 5: Contractor dropdown visible');

  await dropdown.click();

  await page.waitForTimeout(500);

  console.log('STEP 6: Contractor dropdown opened');

  for (const name of contractorNames) {
    console.log(`STEP 7: Selecting ${name}`);

    const option = page.getByText(name, {
      exact: true
    }).last();

    await expect(option).toBeVisible({
      timeout: 15000
    });

    await option.click();

    await page.waitForTimeout(500);
  }

  console.log('STEP 8: Contractors selected');

  await page.mouse.click(1000, 100);

  await page.waitForTimeout(500);

  console.log('STEP 9: Contractor panel closed');
}
// Advance Filter -> Department: selects specific departments by their
// accessible label (as recorded), rather than by checkbox index.
async function selectAdvanceFilterDepartments(page: Page, departmentLabels: string[]) {
  await page.getByText('--Select a Department--').click();
  await waitForOverlaysGone(page);

  for (const label of departmentLabels) {
    await page.getByLabel(label).getByText(label).click();
  }

  // Icon-only close button on the department multiselect panel.
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
}
async function applyAdvanceFilter(page: Page, contractorNames: string[], departmentLabels: string[]) {
  // Wait out any overlay from the preceding department multiselect close
  // before touching Advance Filter — clicking through an overlay is a
  // silent no-op rather than a thrown error, which is why this step can
  // appear to "do nothing".
  await waitForOverlaysGone(page);
  const advanceFilterTrigger = page.getByText('Advance Filter', { exact: true });
  await expect(advanceFilterTrigger).toBeVisible();
  await advanceFilterTrigger.scrollIntoViewIfNeeded();
  await advanceFilterTrigger.click();
  await waitForOverlaysGone(page);

  await selectContractors(page, contractorNames);
  await selectAdvanceFilterDepartments(page, departmentLabels);

  // A further standalone checkbox in the Advance Filter sidebar (recorded
  // as index 1) — confirm it isn't disabled before clicking.
  const extraCheckbox = page.getByRole('checkbox').nth(1);
  await expect(extraCheckbox).toBeEnabled();
  await extraCheckbox.click();

  await page.getByRole('button', { name: 'Done' }).click();
  await page.waitForTimeout(PAUSE_MS);
}

// Selects an employee by ID (grid cell), dismisses the loading overlay
// that appears after selection, clicks the target calendar day, then
// saves the shift and dismisses the resulting confirmation dialog.
async function assignShiftAndSelectDay(page: Page, employeeId: string) {
  const cell = page.getByRole('cell', { name: employeeId });
  await expect(cell).toBeVisible();
  await cell.click();

  const overlay = page.locator('.ngx-overlay').first();
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click();
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  // Structural locator taken directly from codegen — pinned to the 3rd row
  // / 3rd cell of the currently-rendered month view. This is fragile
  // across different months/years (the 3rd cell of the 3rd row won't
  // always be the intended date); worth swapping for a locator scoped by
  // the visible day-of-month text if this spec is reused for other months.
  await page
    .locator(
      'div:nth-child(2) > div > mwl-calendar-month-view > .cal-month-view > .cal-days > div:nth-child(3) > .cal-cell-row > mwl-calendar-month-cell:nth-child(3) > .cal-cell-top'
    )
    .click();

  await page.getByRole('button', { name: 'Save Shift' }).click();
  // Icon-only close button on the post-save confirmation dialog.
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
}

// ---------- Test ----------

test('Duty Roster - assign and delete Shift', async ({ page }) => {
  await login(page);

  await page.getByText('REGISTRATION').click();
  await page.getByRole('combobox').selectOption('Duty Roster');

  await page.locator('select[name="month"]').selectOption('July');
  await page.locator('select[name="selectedType"]').selectOption('Shift');
  await page.getByLabel('Remark').selectOption('ShiftB');

  // Main Department filter (multiselect) — three departments recorded
  await selectMainDepartments(page, 3);

  // Advance Filter: Contractor (by name) + Department (by label)
  await applyAdvanceFilter(page, ['John S', 'Michel Doe'], ['Food & Beverage', 'Engineering', 'Sales']);

  // Assign shift: select employee, pick calendar day, save
  await assignShiftAndSelectDay(page, '500100444');

  // Recorded as a follow-on action in the same flow
  await page.getByRole('button', { name: 'Delete Shift' }).click();
});