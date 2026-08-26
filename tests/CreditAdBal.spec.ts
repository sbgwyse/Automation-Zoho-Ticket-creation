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
  await page.getByRole('button', { name: 'Sign In' }).click();
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

async function navigateToCreditAdvanceBalance(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('Credit Advance Balance');
  await page.waitForTimeout(PAUSE_MS);
}

/**
 * Selects a leave type by its visible label text rather than a guessed
 * `value` attribute. The original recording captured "undefined" for this
 * select (a codegen artifact — the real value attribute wasn't captured),
 * and a follow-up guess of '1' turned out not to match any real option
 * either: selectOption() with a non-matching value doesn't fail fast, it
 * just retries "did not find some options" until the test timeout (confirmed
 * via a 180s hang). This fails fast with the real option list instead of
 * silently hanging if the label doesn't match.
 */
async function selectLeaveTypeByLabel(page: Page, labelText: string) {
  const select = page.locator('select[name="selectedLeave"]');
  await select.waitFor({ state: 'visible', timeout: 15000 });

  const optionTexts = await select.locator('option').allTextContents();
  const trimmed = optionTexts.map((t) => t.trim());

  if (!trimmed.includes(labelText)) {
    throw new Error(
      `Leave type "${labelText}" not found in select[name="selectedLeave"]. ` +
      `Available options: ${JSON.stringify(trimmed)}`
    );
  }

  await select.selectOption({ label: labelText });
}

// --- Flow -------------------------------------------------------------

async function creditAdvanceBalance(
  page: Page,
  peopleGroupValue: string,
  advanceBalance: string,
  leaveTypeLabel: string
) {
  await navigateToCreditAdvanceBalance(page);

  await page.locator('select[name="selectedPeopleGroup"]').selectOption(peopleGroupValue);

  const advanceBalanceField = page.getByRole('spinbutton', { name: 'Advance Balance*' });
  await advanceBalanceField.click();
  await advanceBalanceField.fill(advanceBalance);

  await page.getByRole('button', { name: 'Save' }).click();
  await closeResultDialogIfPresent(page);

  // Select by visible label instead of a guessed value attribute — see
  // selectLeaveTypeByLabel for why.
  await selectLeaveTypeByLabel(page, leaveTypeLabel);

  // Recording clicked into Advance Balance again but never re-filled it
  // before the second Save — left as-is, but worth confirming whether the
  // second save is meant to reuse the first value or needs its own amount.
  await advanceBalanceField.click();

  await page.getByRole('button', { name: 'Save' }).click();
  await closeResultDialogIfPresent(page);
}

// --- Test -------------------------------------------------------------

test('Credit Advance Balance', async ({ page }) => {
  await login(page);

  await creditAdvanceBalance(
    page,
    '67',
    '2',
    'Casual Leave' // TODO: confirm the real label — placeholder, guessed like '1' was
  );

  // TODO: replace with an actual success assertion once the confirmation
  // dialog/toast text is confirmed, e.g.:
  // await expect(page.getByText('Advance balance credited successfully')).toBeVisible();
});