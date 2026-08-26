import { test, expect, Page } from '@playwright/test';

test.setTimeout(120000);

const USERNAME = process.env.ETAM_USERNAME || 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD || '$WysE123';

async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page
    .locator('.ngx-overlay, ngx-ui-loader, .p-component-overlay-mask, .p-sidebar-mask')
    .first()
    .waitFor({ state: 'hidden', timeout })
    .catch(() => {});
}

/**
 * Closes whichever PrimeNG multiselect panel is currently open. Confirmed
 * root cause via a real timeout: the Employee multiselect here was opened
 * (`--Select Employee--` click) and a checkbox selected inside it, but the
 * panel was never closed — its `.p-multiselect-header` sat on top of the
 * page and blocked the later Submit click for the full 120s test timeout
 * ("...subtree intercepts pointer events"). Same class of issue already
 * fixed elsewhere in this app (Compare/Lock Attendance, LOP filters):
 * scope the close click to the panel that's actually open (unscoped
 * selectors are a strict-mode violation when multiple multiselects exist
 * on the page), and fall back to a neutral outside-click if the trigger
 * icon itself isn't clickable.
 */
async function closeOpenMultiselect(page: Page) {
  const trigger = page.locator('.p-multiselect-open .p-multiselect-trigger-icon');
  if (await trigger.count()) {
    await trigger.first().click().catch(() => {});
  }
  const panel = page.locator('.p-multiselect-panel:visible, .p-multiselect-open').first();
  if (await panel.count()) {
    // Fallback: click a neutral point outside any panel to force-close it.
    await page.mouse.click(1400, 100).catch(() => {});
  }
  await panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
}

test('Edit Reporting Structure', async ({ page }) => {

  // ==========================
  // LOGIN
  // ==========================
  await page.goto('https://presence.tajhotels.com/etam_prime/login');

  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await waitForOverlayGone(page);

  console.log('Login Successful');

  // ==========================
  // NAVIGATE TO ELMS > eLMS Uploads > Edit Reporting Structure
  // ==========================
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Uploads');
  await page
    .locator('app-elms-uploads')
    .getByRole('combobox')
    .selectOption('Edit Reporting Structure');
  await waitForOverlayGone(page);

  console.log('Edit Reporting Structure Opened');

  // ==========================
  // SELECT EMPLOYEE
  // ==========================
  // NOTE: fragile index-based checkbox selection carried over from the
  // raw recording — no visible employee name/ID was captured, so this
  // just picks whichever employee lands at checkbox index 1. Replace
  // with a label/ID-based locator once you know which employee this
  // should actually be (same issue flagged in other multiselect steps
  // across this project).
  await page.getByText('--Select Employee--').click();
  await page.getByRole('checkbox').nth(1).click();
  await waitForOverlayGone(page);

  // Close the panel before moving on — this is the step that was missing
  // and caused the Submit click to hang (see closeOpenMultiselect above).
  await closeOpenMultiselect(page);

  console.log('Employee Selected (checkbox index 1)');

  // ==========================
  // SELECT REPORTING OFFICER (RO)
  // ==========================
  await page.locator('select[name="ro"]').selectOption('100000001');
  await waitForOverlayGone(page);

  console.log('RO Selected: 100000001');

  // ==========================
  // SUBMIT
  // ==========================
  await page.getByRole('button', { name: 'Submit' }).click();
  await waitForOverlayGone(page);

  console.log('Submit Clicked');

  // ==========================
  // CONFIRMATION DIALOG CLOSE (best-effort)
  // ==========================
  // NOTE: icon-only button, no accessible name in the recording. Kept
  // optional with a short timeout so it doesn't block the whole test
  // if no such dialog actually appears for this flow (as happened with
  // Upload Reporting Structure).
  try {
    await page.getByRole('button').filter({ hasText: /^$/ }).click({ timeout: 5000 });
    console.log('Confirmation Dialog Closed');
  } catch {
    console.log('No confirmation dialog appeared — continuing.');
  }

  await page.screenshot({ path: 'edit_reporting_structure_result.png', fullPage: true });

  console.log('Process Completed');
});