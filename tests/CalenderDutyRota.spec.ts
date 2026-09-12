import { test, expect, Page } from '@playwright/test';

// ETAM PRIME - Duty Roster (Shift + WeeklyOff) automation
// Rebuilt directly from a fresh codegen recording. This recording is the
// ground truth going forward for department/contractor selection: BOTH the
// main Department filter and the Advance Filter Department/Contractor
// panels are single-checkbox selections (position 1 in the list), NOT
// multi-select-by-name. That's simpler than — and supersedes — the earlier
// 3-named-department approach, which is the most likely cause of the
// earlier hang on "Sales".
//
// Every interaction has an explicit timeout so a genuinely stuck step fails
// fast with a clear error instead of silently hanging until the whole
// test's timeout kills it.

test.use({ viewport: { width: 1600, height: 1000 } });

const PAUSE_MS = 500;
const ACTION_TIMEOUT = 15000;

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
  // submission.
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.locator('ngx-ui-loader .ngx-overlay').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(PAUSE_MS);
}

async function waitForOverlaysGone(page: Page) {
  const loader = page.locator('.ngx-ui-loader');
  if (await loader.count()) {
    await loader.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

// Scoped specifically to the "Result" confirmation dialog — the earlier
// version used the first icon-only button ANYWHERE on the page, which could
// (and did) click the wrong element, leaving the dialog's mask open and
// silently blocking every click after it.
async function closeResultDialogIfPresent(page: Page) {
  const dialog = page.locator('p-dialog[header="Result"]').first();

  if (!(await dialog.isVisible().catch(() => false))) {
    return;
  }

  const closeIcon = dialog.getByRole('button').filter({ hasText: /^$/ }).first();

  if (await closeIcon.isVisible().catch(() => false)) {
    await closeIcon.click({ timeout: ACTION_TIMEOUT });
  } else {
    // Fallback if the dialog's own close icon isn't found for some reason.
    await page.keyboard.press('Escape').catch(() => {});
  }

  await page
    .locator('.p-dialog-mask')
    .first()
    .waitFor({ state: 'hidden', timeout: ACTION_TIMEOUT })
    .catch(() => {});

  await page.waitForTimeout(PAUSE_MS);
}

async function navigateToDutyRoster(page: Page) {
  await page.getByText('REGISTRATION').click({ timeout: ACTION_TIMEOUT });
  await page.getByRole('combobox').selectOption('Duty Roster');
  await page.waitForTimeout(PAUSE_MS);
}

// Main Department filter: opens the multiselect, ticks the first checkbox,
// closes via the (first, un-indexed) icon-only close button — matches the
// confirmed recording exactly.
async function selectMainDepartment(page: Page) {
  console.log('STEP: Opening main Department filter');
  await page.getByText('--Select a Department--').click({ timeout: ACTION_TIMEOUT });
  await waitForOverlaysGone(page);

  console.log('STEP: Selecting first department checkbox');
  await page.getByRole('checkbox').nth(1).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Closing main Department panel');
  await page.getByRole('button').filter({ hasText: /^$/ }).click({ timeout: ACTION_TIMEOUT });
  await waitForOverlaysGone(page);
}

// Advance Filter: Contractor + Department, each a single-checkbox
// selection, plus the trailing standalone checkbox and Done.
async function applyAdvanceFilter(page: Page) {
  console.log('STEP: Opening Advance Filter');
  await page.getByText('Advance Filter').click({ timeout: ACTION_TIMEOUT });
  await waitForOverlaysGone(page);

  console.log('STEP: Opening Contractor');
  await page.getByText('Contractor').click({ timeout: ACTION_TIMEOUT });
  await page.getByText('--Select a Contractor--').click({ timeout: ACTION_TIMEOUT });
  await waitForOverlaysGone(page);

  console.log('STEP: Selecting first contractor checkbox');
  await page.getByRole('checkbox').nth(1).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Closing Contractor panel');
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click({ timeout: ACTION_TIMEOUT });
  await waitForOverlaysGone(page);

  console.log('STEP: Opening Advance Filter Department');
  await page.getByText('--Select a Department--').click({ timeout: ACTION_TIMEOUT });
  await waitForOverlaysGone(page);

  console.log('STEP: Selecting first department checkbox (Advance Filter)');
  await page.getByRole('checkbox').nth(1).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Closing Advance Filter Department panel');
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click({ timeout: ACTION_TIMEOUT });
  await waitForOverlaysGone(page);

  console.log('STEP: Clicking trailing standalone checkbox');
  const extraCheckbox = page.getByRole('checkbox').nth(1);
  await expect(extraCheckbox).toBeEnabled({ timeout: ACTION_TIMEOUT });
  await extraCheckbox.click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Clicking Done');
  await page.getByRole('button', { name: 'Done' }).click({ timeout: ACTION_TIMEOUT });
  await page.waitForTimeout(PAUSE_MS);
}

// ---------- Tests ----------

test('Duty Roster - assign and delete Shift', async ({ page }) => {
  await login(page);
  await navigateToDutyRoster(page);

  await page.locator('select[name="month"]').selectOption('July');
  await page.locator('select[name="selectedType"]').selectOption('Shift');

  await selectMainDepartment(page);
  await applyAdvanceFilter(page);

  console.log('STEP: Selecting employee Smita Joshi');
  await page.getByRole('cell', { name: 'Smita Joshi' }).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Setting Remark to ShiftB');
  await page.getByLabel('Remark').selectOption('ShiftB');

  console.log('STEP: Saving Shift');
  await page.getByRole('button', { name: 'Save Shift' }).click({ timeout: ACTION_TIMEOUT });
  await closeResultDialogIfPresent(page);

  console.log('STEP: Deleting Shift (first pass)');
  await page.getByRole('button', { name: 'Delete Shift' }).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Selecting employee 100100111 and deleting Shift again');
  await page.getByRole('cell', { name: '100100111' }).click({ timeout: ACTION_TIMEOUT });
  await page.getByRole('button', { name: 'Delete Shift' }).click({ timeout: ACTION_TIMEOUT });
});

test('Duty Roster - assign WeeklyOff', async ({ page }) => {
  await login(page);
  await navigateToDutyRoster(page);

  await page.locator('select[name="month"]').selectOption('July');
  await page.locator('select[name="selectedType"]').selectOption('WeeklyOff');

  // NOTE: the original recording didn't include these filter steps here
  // because it ran right after the Shift flow in the same session, so the
  // filters were already applied. This test starts fresh, so the employee
  // grid is empty until the same filters are applied here too.
  await selectMainDepartment(page);
  await applyAdvanceFilter(page);

  console.log('STEP: Selecting employee 100100111');
  await page.getByRole('cell', { name: '100100111' }).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Clicking calendar day "6 P" (first)');
  await page.getByText('6 P', { exact: true }).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Setting Remark to Additional Off');
  await page.getByLabel('Remark').selectOption('Additional Off');

  console.log('STEP: Clicking calendar day "6 P" (second)');
  await page.getByText('6 P', { exact: true }).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Saving WeeklyOff');
  await page.getByRole('button', { name: 'Save Weeklyoff' }).click({ timeout: ACTION_TIMEOUT });
  await closeResultDialogIfPresent(page);

  // TODO: the recording continues into a second WeeklyOff attempt here —
  // re-selects July, clicks employee 100100111, re-selects WeeklyOff type,
  // clicks employee 100100111 twice more, and sets Remark to
  // 'Variable Weekly Off' — but the recording ends there with no Save
  // click captured, so it's not clear if this is a genuine second save or
  // an incomplete/duplicate recording of the same action. Left out until
  // confirmed by a fresh, complete recording of that specific flow.
});

test('Duty Roster - assign and delete Off Policy', async ({ page }) => {
  await login(page);
  await navigateToDutyRoster(page);

  await page.locator('select[name="month"]').selectOption('March');
  await page.locator('select[name="selectedType"]').selectOption('Off Policy');

  // Off Policy uses the same Department/Advance Filter setup as Shift —
  // apply it fresh here, same as the fix applied to the WeeklyOff test above.
  await selectMainDepartment(page);
  await applyAdvanceFilter(page);

  console.log('STEP: Setting Remark to 7-FRI');
  await page.getByLabel('Remark').selectOption('7-FRI');

  console.log('STEP: Selecting employee 100100111');
  await page.getByRole('cell', { name: '100100111' }).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Setting Remark to 10-1SAT');
  await page.getByLabel('Remark').selectOption('10-1SAT');

  console.log('STEP: Saving Off Policy');
  await page.getByRole('button', { name: 'Save Off Policy' }).click({ timeout: ACTION_TIMEOUT });
  await closeResultDialogIfPresent(page);

  console.log('STEP: Deleting Off Policy (first pass)');
  await page.getByRole('button', { name: 'Delete Off Policy' }).click({ timeout: ACTION_TIMEOUT });

  console.log('STEP: Selecting employee 100100111 and deleting Off Policy again');
  await page.getByRole('cell', { name: '100100111' }).click({ timeout: ACTION_TIMEOUT });
  await page.getByRole('button', { name: 'Delete Off Policy' }).click({ timeout: ACTION_TIMEOUT });
});