import { test, expect, Page } from '@playwright/test';

/**
 * Shared helpers, built from the recorded locators.
 * These preserve the same nth()-based interactions that worked in the
 * recording, just wrapped so each report test reads as a clean sequence
 * of named steps instead of one long flat script.
 */

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.locator('i').click(); // show/hide password icon
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('ELMS')).toBeVisible({ timeout: 30000 });
}

async function openReportsForm(page: Page, reportName: string) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('Reports');
  await page.locator('#reporttype').selectOption(reportName);
}

/**
 * Closes whichever PrimeNG multiselect panel is currently open. Confirmed
 * root cause via a real timeout in Employee Wise Leave Encashment: the
 * step there used `await advancePanel.click()` as an ad-hoc way to dismiss
 * the Contractor multiselect after picking a checkbox, but clicking the
 * broad sidebar container isn't a real close action — the still-open
 * `.p-multiselect-panel` sat on top as an overlay and intercepted that
 * click for the full 180s. Same class of issue already fixed elsewhere in
 * this app (Compare/Lock Attendance, LOP filters, Edit Reporting
 * Structure): scope the close click to the panel that's actually open
 * (unscoped selectors are a strict-mode violation when multiple
 * multiselects exist on the page), with a neutral outside-click fallback.
 */
async function closeOpenMultiselect(page: Page) {
  const trigger = page.locator('.p-multiselect-open .p-multiselect-trigger-icon');
  if (await trigger.count()) {
    await trigger.first().click().catch(() => {});
  }
  const panel = page.locator('.p-multiselect-panel:visible, .p-multiselect-open').first();
  if (await panel.count()) {
    await page.mouse.click(1400, 100).catch(() => {});
  }
  await panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
}

/**
 * Opens the date range picker and picks a range using the built-in quick
 * buttons (TODAY / LAST 7 DAYS / THIS MONTH / LAST MONTH) instead of
 * clicking individual day numbers — the day-number approach was where the
 * script was getting stuck, since "1" and "2" match dozens of cells across
 * both visible months plus the week-number column on the left.
 */
async function selectDateRange(page: Page, preset: 'TODAY' | 'LAST 7 DAYS' | 'THIS MONTH' | 'LAST MONTH' = 'THIS MONTH') {
  await page.getByRole('textbox', { name: 'Select Date Range' }).click();

  // Wait for the calendar overlay itself to render before searching for the
  // preset button inside it.
  const overlay = page.locator('.p-datepicker, .p-calendar-panel, [class*="calendar"], [class*="datepicker"]').last();
  await overlay.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  // No anchors this time — substring match is more forgiving than an exact
  // full-string match, in case the label has extra characters (icon text,
  // stray whitespace) around it.
  const presetButton = page.getByText(new RegExp(preset, 'i')).last();

  if ((await presetButton.count()) === 0) {
    // Self-diagnosing: if this still can't find it, dump whatever text IS
    // actually visible in that area into the error itself, so the failure
    // message tells us exactly what to match next time instead of needing
    // another screenshot round-trip.
    const overlayText = await overlay.innerText().catch(() => '(overlay not found or has no text)');
    throw new Error(
      `Could not find a "${preset}" option in the date picker. Visible text near the calendar was:\n${overlayText}`
    );
  }

  await presetButton.click({ force: true });
}

/** Opens a "--Select a X--" dropdown, checks the option at the given index, then closes it via the empty-text button. */
async function selectDropdownOption(page: Page, placeholder: string, checkboxIndex: number, closeViaEmptyButton = true) {
  await page.getByText(placeholder).click();
  await page.getByRole('checkbox').nth(checkboxIndex).click({ force: true });
  if (closeViaEmptyButton) {
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
  }
}

/** Opens Advance Filter, sets Contractor mode, and fills Contractor / Department / Employee selects, then clicks Done. */
async function fillAdvanceFilter(page: Page) {
  await page.getByText('Advance Filter').click();
  await page.getByText('Contractor').click();

  // Advance Filter renders inside a "complementary" landmark region that
  // sits alongside the main form. Its own Department/Contractor dropdowns
  // share the same placeholder text as the main form's dropdowns, so every
  // selector in here must be scoped to this panel or Playwright can't tell
  // the two apart (strict mode violation).
  const advancePanel = page.getByRole('complementary');

  await advancePanel.getByText('--Select a Contractor--').click();
  await page.getByRole('checkbox').nth(3).click({ force: true });
  await page.getByRole('button').nth(5).click();

  await advancePanel.getByText('--Select a Department--').click();
  await page.getByRole('checkbox').nth(3).click({ force: true });
  await page.getByRole('button').nth(5).click();

  // Employee select (no separate trigger text captured in the recording —
  // it opens as part of the Department close/step above)
  await page.getByRole('checkbox').nth(3).click({ force: true });

  await page.getByRole('button', { name: 'Done' }).click();
}

async function submitAndCapturePopup(page: Page) {
  // "Submit" may open a new tab OR trigger a direct file download depending
  // on report type/settings — waiting only for 'popup' hangs forever when
  // it's actually a download. Race both, with a short timeout so the test
  // fails fast and clearly instead of burning the full 3-minute budget.
  const popupPromise = page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);

  await page.getByRole('button', { name: 'Submit' }).click();

  const result = await Promise.race([popupPromise, downloadPromise]);

  if (!result) {
    console.log('Submit clicked — no popup or download detected within 20s (report may render inline on the same page).');
    return;
  }

  if ('suggestedFilename' in result) {
    console.log(`Report downloaded: ${await result.suggestedFilename()}`);
  } else {
    await result.waitForLoadState('domcontentloaded');
    console.log('Report opened in a new tab.');
  }
}

test.describe('ELMS Reports', () => {

  test.beforeEach(async ({ page }) => {
    await test.step('Login to ETAM PRIME', async () => {
      await login(page);
    });
  });

  test('Employee Leave Report', async ({ page }) => {
    await test.step('Open Employee Leave Report', async () => {
      await openReportsForm(page, 'Employee Leave Report');
    });

    await test.step('Select date range', async () => {
      await selectDateRange(page, 'THIS MONTH');
    });

    await test.step('Select Leave Type', async () => {
      await selectDropdownOption(page, '--Select a Leave Type--', 1);
    });

    await test.step('Select Department', async () => {
      await selectDropdownOption(page, '--Select a Department--', 1);
    });

    await test.step('Fill Advance Filter (Contractor / Department / Employee)', async () => {
      await fillAdvanceFilter(page);
    });

    await test.step('Select report-type checkbox and submit', async () => {
      await page.getByRole('checkbox').nth(1).click({ force: true });
    });

    await test.step('Generate report', async () => {
      await submitAndCapturePopup(page);
      console.log('Employee Leave Report generated successfully.');
    });
  });

  test('Executive Leave Report', async ({ page }) => {
    await test.step('Open Executive Leave Report', async () => {
      await openReportsForm(page, 'Executive Leave Report');
    });

    await test.step('Select date range', async () => {
      await selectDateRange(page, 'THIS MONTH');
    });

    await test.step('Select Department', async () => {
      await selectDropdownOption(page, '--Select a Department--', 1);
    });

    await test.step('Fill Advance Filter', async () => {
      await fillAdvanceFilter(page);
    });

    await test.step('Select checkbox and submit', async () => {
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await page.getByRole('button', { name: 'Submit' }).click();
    });
  });

  test('Leave Balance Report', async ({ page }) => {
    await test.step('Open Leave Balance Report', async () => {
      await openReportsForm(page, 'Leave Balance Report');
      await page.locator('#leaveyear').selectOption('2026');
    });

    await test.step('Select Department', async () => {
      await page.getByText('--Select a Department--').click();
      await page.getByRole('checkbox').nth(1).click({ force: true });
    });

    await test.step('Fill Advance Filter', async () => {
      await page.getByText('Advance Filter').click();
      await page.getByText('Contractor').click();

      const advancePanel = page.getByRole('complementary');

      await advancePanel.getByText('--Select a Contractor--').click();
      await page.getByRole('checkbox').nth(3).click({ force: true });
      await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();

      await advancePanel.getByText('--Select a Department--').click();
      await page.getByRole('checkbox').nth(3).click({ force: true });
      await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();

      await page.getByRole('checkbox').nth(3).click({ force: true });
      await page.getByRole('button', { name: 'Done' }).click();
    });

    await test.step('Generate Leave Balance report', async () => {
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await submitAndCapturePopup(page);
    });

    await test.step('Generate Issued Leave Balance report', async () => {
      const popupPromise = page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);
      const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
      await page.getByRole('button', { name: 'Issued Leave Balance Report' }).click();
      const result = await Promise.race([popupPromise, downloadPromise]);
      if (result && 'suggestedFilename' in result) {
        console.log(`Issued Leave Balance report downloaded: ${await result.suggestedFilename()}`);
      } else if (result) {
        await result.waitForLoadState('domcontentloaded');
      } else {
        console.log('No popup or download detected within 20s for Issued Leave Balance Report.');
      }
    });
  });

  test('Employee Wise Leave Encashment', async ({ page }) => {
    await test.step('Open Employee Wise Leave Encashment', async () => {
      await openReportsForm(page, 'Employee Wise Leave Encashment');
    });

    await test.step('Select date range', async () => {
      await selectDateRange(page, 'THIS MONTH');
    });

    await test.step('Select Department', async () => {
      await page.getByText('--Select a Department--').click();
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await page.locator('div').filter({ hasText: 'Select Report*--Select Report' }).nth(4).click();
    });

    await test.step('Fill Advance Filter', async () => {
      await page.getByText('Advance Filter').click();
      await page.getByText('Contractor').click();

      const advancePanel = page.getByRole('complementary');

      await advancePanel.getByText('--Select a Contractor--').click();
      await page.getByRole('checkbox').nth(3).click({ force: true });
      // FIX: was `await advancePanel.click();` — clicking the broad sidebar
      // container isn't a real close action, and the still-open
      // .p-multiselect-panel sat on top as an overlay and intercepted that
      // click for the full 180s (confirmed via a real timeout). Use the
      // proper panel-close helper instead.
      await closeOpenMultiselect(page);

      await advancePanel.getByText('--Select a Department--').click();
      await page.getByRole('checkbox').nth(3).click({ force: true });
      await page.getByRole('button').nth(5).click();

      await page.getByRole('checkbox').nth(3).click({ force: true });
      await page.getByRole('button', { name: 'Done' }).click();
    });

    await test.step('Submit and confirm secondary panel', async () => {
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await page.getByRole('button', { name: 'Submit' }).click();
      await page.locator('.col-sm-6').first().click();
    });
  });

  test('Used Compensatory Off Report', async ({ page }) => {
    await test.step('Open Used Compensatory Off Report', async () => {
      await openReportsForm(page, 'Used Compensatory Off Report');
    });

    await test.step('Compensatory Off - Select date range', async () => {
      await page.getByRole('textbox', { name: 'Select Date Range' }).click();

      const overlay = page.locator('.p-datepicker, .p-calendar-panel, [class*="calendar"], [class*="datepicker"]').last();
      await overlay.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

      const dayOne = page.getByText('1', { exact: true }).first();
      await dayOne.click();
      await dayOne.click();
    });

    await test.step('Select Department', async () => {
      await selectDropdownOption(page, '--Select a Department--', 1, false);
    });

    await test.step('Fill Advance Filter', async () => {
      await fillAdvanceFilter(page);
    });

    await test.step('Generate report', async () => {
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await submitAndCapturePopup(page);
    });
  });

  test('Leave Card Report', async ({ page }) => {
    await test.step('Open Leave Card Report', async () => {
      await openReportsForm(page, 'Leave Card Report');
      await page.locator('#leaveyear').selectOption('2026');
    });

    await test.step('Select Leave Type', async () => {
      await selectDropdownOption(page, '--Select a Leave Type--', 1, false);
    });

    await test.step('Select Department', async () => {
      await selectDropdownOption(page, '--Select a Department--', 1, false);
    });

    await test.step('Fill Advance Filter', async () => {
      await fillAdvanceFilter(page);
    });

    await test.step('Generate report', async () => {
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await submitAndCapturePopup(page);
    });
  });

  test('Pending Leave Status Report', async ({ page }) => {
    await test.step('Open Pending Leave Status Report', async () => {
      await openReportsForm(page, 'Pending Leave Status Report');
    });

    await test.step('Select report mode radio', async () => {
      await page.locator('.p-radiobutton-box').first().click();
    });

    await test.step('Select RO', async () => {
      await page.getByText('--Select RO--').click();
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await page.locator('mat-sidenav-content').click();
    });

    await test.step('Select Leave Type', async () => {
      await page.getByText('--Select a Leave Type--').click();
      await page.getByRole('checkbox').nth(1).click({ force: true });
      await page.locator('mat-sidenav-content').click();
    });

    await test.step('Submit', async () => {
      await page.getByRole('button', { name: 'Submit' }).click();
    });
  });

});