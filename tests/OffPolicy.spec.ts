import { test, expect } from '@playwright/test';

test('Off Policy Registration - filters, save, PDF, Excel, delete', async ({ page }) => {

  await test.step('Login to ETAM Prime', async () => {
    await page.goto('https://presence.tajhotels.com/etam_prime/login');
    await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
    await page.getByRole('button', { name: 'Sign In' }).click();
  });

  await test.step('Navigate to Off Policy Registration', async () => {
    await page.getByText('REGISTRATION').click();
    await page.getByRole('combobox').selectOption('Off Policy Registration');
  });

  await test.step('Select date range (1st to 2nd)', async () => {
    await page.getByRole('textbox', { name: 'Select Date Range' }).click();
    await page.getByText('1', { exact: true }).first().evaluate((el) => (el as HTMLElement).click());
    await page.getByText('2', { exact: true }).first().evaluate((el) => (el as HTMLElement).click());
  });

  await test.step('Select policy', async () => {
    await page.locator('select[name="selectedPolicy"]').selectOption('2 - SAT');
  });

  await test.step('Select department (3 options)', async () => {
    await page.getByText('--Select a Department--').click();
    await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click();
    await page.locator('p-multiselectitem:nth-child(2) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
    await page.locator('p-multiselectitem:nth-child(3) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
  });

  await test.step('Apply advance filter - contractor', async () => {

    await page.getByText('Advance Filter').click();
    await page.locator('#contractor').click();

    await page.waitForTimeout(1000);
    const sidebar = page.getByRole('complementary');

    const contractorDropdown = sidebar
      .locator('p-multiselect[name="contractorname"]');

    const contractorPanel = page.locator('.p-multiselect-panel');

    // The contractor multiselect uses placement="top", so its panel renders
    // directly over its own trigger button. The '#contractor' click above may
    // have already opened it — re-clicking the trigger while the panel is
    // open gets intercepted by the panel's own filter input and hangs.
    // Only click to open if it isn't already open.
    const contractorAlreadyOpen = await contractorPanel.isVisible().catch(() => false);
    if (!contractorAlreadyOpen) {
      await contractorDropdown.click();
    }

    await contractorPanel.waitFor({ state: 'visible' });

    await contractorPanel
      .locator('.p-multiselect-header .p-checkbox')
      .click();

    // Close by clicking a neutral point on the page instead of clicking the
    // dropdown again (same overlap problem as opening it) or Escape (doesn't
    // dismiss this panel). Same approach already used for the department panel below.
    await page.mouse.click(1400, 100);
    await expect(contractorPanel).toBeHidden();

    const departmentDropdown = sidebar
      .locator('p-multiselect[name="deptname"]')
      .filter({ hasText: '--Select a Department--' });

    await departmentDropdown.click();

    const departmentPanel = page.locator('.p-multiselect-panel');
    await departmentPanel.waitFor({ state: 'visible' });

    await departmentPanel
      .locator('.p-multiselect-header .p-checkbox')
      .click();

    await page.mouse.click(1400, 100);

    await expect(departmentPanel).toBeHidden();

  });
  await test.step('Select employee and confirm', async () => {

    const sidebar = page.getByRole('complementary');

    const employeeTable = sidebar.locator('p-table');

    await employeeTable
      .locator('tbody tr.p-selectable-row')
      .first()
      .click();

    await expect(
      sidebar.getByText(/Selected Employees:/)
    ).toContainText('1');

    await sidebar.getByRole('button', { name: 'Done' }).click();

  });
  

await test.step('Save', async () => {

    const saveBtn = page.getByRole('button', { name: 'Save' });

    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    await saveBtn.click();

});

  await test.step('Download PDF report - 500100124', async () => {
    await page.getByRole('button', { name: 'PDF' }).click();
    await page.getByRole('cell', { name: '500100124' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF' }).click();
    const download = await downloadPromise;
  });

  await test.step('Download Excel report', async () => {
    const download1Promise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel' }).click();
    const download1 = await download1Promise;
  });

  await test.step('Delete', async () => {
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
  });

  console.log('Finished test cases:');
  console.log('  Login to ETAM Prime');
  console.log('  Navigate to Off Policy Registration');
  console.log('  Select date range (1st to 2nd)');
  console.log('  Select policy');
  console.log('  Select department (3 options)');
  console.log('  Apply advance filter - contractor');
  console.log('  Apply advance filter - department');
  console.log('  Select employee type / additional filter');
  console.log('  Save');
  console.log('  Download PDF report - 500100124');
  console.log('  Download Excel report');
  console.log('  Delete');
  console.log('Test Completed');

});