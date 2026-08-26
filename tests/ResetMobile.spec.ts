import { test, expect, Page } from '@playwright/test';

const USERNAME = process.env.ETAM_USERNAME ?? 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD ?? '$WysE123';

async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page.locator('.ngx-overlay, .ngx-ui-loader').first()
    .waitFor({ state: 'hidden', timeout })
    .catch(() => {});
}

async function closeOpenMultiselect(page: Page) {
  const scopedClose = page.locator('.p-multiselect-open .p-multiselect-trigger-icon');
  if (await scopedClose.count()) {
    await scopedClose.click();
  } else {
    // neutral outside-click fallback — confirmed pattern for this app's
    // PrimeNG multiselect panels when the trigger-icon isn't findable
    await page.mouse.click(1400, 100);
  }
  await waitForOverlayGone(page);
}

async function closeResultDialogIfPresent(page: Page) {
  const dialog = page.locator('p-dialog[header="Result"], .p-dialog:has-text("Result")').first();
  if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
    const closeIcon = dialog.locator('.p-dialog-header-icons, [aria-label="Close"]').first();
    if (await closeIcon.count()) {
      await closeIcon.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.locator('.p-dialog-mask').first()
      .waitFor({ state: 'hidden', timeout: 10000 })
      .catch(() => {});
  }
}

test('Reset Mobile Setting - by Department', async ({ page }) => {

  await test.step('Login', async () => {
    await page.goto('https://presence.tajhotels.com/etam_prime/login');
    await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await waitForOverlayGone(page);
  });

  await test.step('Navigate to Administration > Reset Mobile Setting', async () => {
    await page.getByText('ADMINISTRATION').click();
    await page.getByRole('combobox').selectOption('Reset Mobile Setting');
    await waitForOverlayGone(page);
  });

  await test.step('Select department (3 options)', async () => {
    await page.getByText('--Select a Department--').click();
    await waitForOverlayGone(page);

    // Positional checkbox selection carried over from your latest
    // recording (select-all-style first checkbox + two specific
    // p-multiselectitem rows). Same app-wide caveat as elsewhere:
    // nth-child position is order-dependent — if the department list
    // order changes, this selects the wrong items.
    await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click();
    await waitForOverlayGone(page);
    await page.locator('p-multiselectitem:nth-child(2) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
    await waitForOverlayGone(page);
    await page.locator('p-multiselectitem:nth-child(3) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
    await waitForOverlayGone(page);

    await closeOpenMultiselect(page);
  });

  await test.step('Select employee', async () => {
    await page.getByRole('cell', { name: '500100123' }).click({ timeout: 20000 });
    await waitForOverlayGone(page);
  });

  await test.step('Reset Mobile Settings', async () => {
    await page.getByRole('button', { name: 'Reset Mobile Settings' }).click();
    await closeResultDialogIfPresent(page);
  });

});