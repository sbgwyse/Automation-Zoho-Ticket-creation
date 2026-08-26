import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.locator('i').click(); // show/hide password icon
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('ELMS')).toBeVisible({ timeout: 30000 });
}

test.describe('Apply/Cancel Compensatory Off', () => {

  test('Apply Compensatory Off for an employee', async ({ page }) => {

    await test.step('Login to ETAM PRIME', async () => {
      await login(page);
    });

    await test.step('Open Apply/Cancel Compensatory Off', async () => {
      await page.getByText('ELMS').click();
      await page.getByRole('combobox').selectOption('Apply/Cancel Compensatory Off');
    });

    await test.step('Search and select employee', async () => {
      const employeeInput = page.locator('input[name="employees"]');
      await employeeInput.click();
      await employeeInput.fill('500100123-Priya Shaha');

      // Scope to the actual employee listbox — getByRole('option') without
      // scoping also matches native <select> options elsewhere on the page
      // (e.g. the hidden "--Select Option--" in the report-type dropdown),
      // which is invisible and caused the previous click to fail.
      const employeeListbox = page.getByRole('listbox');
      await employeeListbox.waitFor({ state: 'visible', timeout: 15000 });
      await employeeListbox.getByRole('option').first().click({ force: true });
    });

    await test.step('Compensatory Off - Select date range', async () => {
      // The visible label reads "OT Date Range", but the textbox's actual
      // accessible name (confirmed from the page snapshot) is still
      // "Select Date Range" — that's the placeholder text Playwright
      // matches on, not the adjacent label.
      await page.getByRole('textbox', { name: 'Select Date Range' }).click();

      // Wait for the calendar overlay to actually render before clicking
      // inside it — avoids racing the open animation.
      const overlay = page.locator('.p-datepicker, .p-calendar-panel, [class*="calendar"], [class*="datepicker"]').last();
      await overlay.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

      // NOTE: matching bare "1" text is fragile — the calendar shows two
      // months side by side plus faded days from adjacent months, so "1"
      // can appear more than once. This preserves your recorded behavior
      // (click the first match twice — start and end of a single-day
      // range), but if this becomes unreliable, scope it to a specific
      // month panel or use a "TODAY" quick-select button instead, the way
      // the ELMS Reports date range does.
      const dayOne = page.getByText('1', { exact: true }).first();
      await dayOne.click();
      await dayOne.click();
    });

    await test.step('Set Pre-Approved checkbox', async () => {
      // The page snapshot confirms this is the only true checkbox-role
      // element on the form (the "Resigned" toggle is a switch, not a
      // checkbox), so no name matching is needed — it's already unique.
      // Optional field: delete this step entirely if the request should
      // NOT be pre-approved.
      await page.getByRole('checkbox').click({ force: false });
    });

    await test.step('Submit', async () => {
      const submitButton = page.getByRole('button', { name: /submit|apply/i });

      if ((await submitButton.count()) === 0) {
        // Self-diagnosing: the Submit button wasn't in the page snapshot
        // yet at the point of the last failure (form wasn't complete). If
        // it's still missing now, dump the page's visible button text so
        // the next failure tells us the real label instead of guessing.
        const allButtonText = await page.getByRole('button').allInnerTexts().catch(() => []);
        throw new Error(`No Submit/Apply button found. Visible buttons on page: ${JSON.stringify(allButtonText)}`);
      }

      await submitButton.click();
    });

  });

});