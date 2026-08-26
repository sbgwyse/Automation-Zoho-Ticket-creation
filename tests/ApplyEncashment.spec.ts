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
  // Wait for the loading overlay to clear before interacting further
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

/**
 * Selects an employee by ID and full "ID - Name" text.
 * Using the full string with exact:true avoids Playwright strict-mode
 * violations when multiple employees share the same display name.
 */
async function selectEmployeeById(page: Page, employeeId: string, fullLabel: string) {
  const employeeInput = page.locator('input[name="employees"]');
  await employeeInput.click();
  await employeeInput.fill(employeeId);
  await page.getByText(fullLabel, { exact: true }).click();
  await page.waitForTimeout(PAUSE_MS);
}

async function navigateToApplyEncashment(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('Apply Encashment');
  await page.waitForTimeout(PAUSE_MS);
}

// --- Flow -------------------------------------------------------------

async function applyEncashment(
  page: Page,
  employeeId: string,
  employeeFullLabel: string,
  leaveValue: string
) {
  await navigateToApplyEncashment(page);
  await selectEmployeeById(page, employeeId, employeeFullLabel);

  await page.locator('select[name="selectedLeave"]').selectOption(leaveValue);
  await page.getByRole('button', { name: 'Submit' }).click();

  await closeResultDialogIfPresent(page);
}

// --- Test ---------------------------------------------------------------

test('Apply Encashment - single employee', async ({ page }) => {
  await login(page);

  await applyEncashment(
    page,
    '500100222',
    '500100222 - Priya Shaha', // adjust to match the exact rendered "ID - Name" text
    '2'
  );

  // TODO: replace with an actual success assertion once the confirmation
  // dialog/toast text is confirmed, e.g.:
  // await expect(page.getByText('Encashment applied successfully')).toBeVisible();
});