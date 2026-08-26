import { test, expect } from '@playwright/test';

test('Shift Registration - filter and save', async ({ page }) => {

  await test.step('Login to ETAM Prime', async () => {
    await page.goto('https://presence.tajhotels.com/etam_prime/login');
    await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
    await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
    await page.getByRole('button', { name: 'Sign In' }).click();
  });

  await test.step('Navigate to Shift Registration', async () => {
    await page.getByText('REGISTRATION').click();
    await page.getByRole('combobox').selectOption('Shift Registration');
  });

  await test.step('Select date range', async () => {
    const loader = page.locator('.ngx-overlay.loading-foreground').first();
    await loader.waitFor({ state: 'hidden' });
    await page.getByRole('textbox', { name: 'Select Date Range' }).click();

    const calendar = page.locator('.bs-datepicker-body').nth(1);

    await calendar
      .locator('span:not(.is-other-month)')
      .filter({ hasText: /^2$/ })
      .click();

    await calendar
      .locator('span:not(.is-other-month)')
      .filter({ hasText: /^4$/ })
      .click();
  });

  await test.step('Select shift and day', async () => {
    await page.locator('select[name="selectedShift"]').selectOption('2 - shift 1');
    await page.locator('select[name="selectedDay"]').selectOption('All Day');
  });

 await test.step('Select department', async () => {
  const mainFilter = page.locator('app-employeesearch');
 
  await mainFilter.getByText('--Select a Department--').click();
 
  const panel = page.locator('.p-multiselect-panel');
  await expect(panel).toBeVisible();
 
  await mainFilter.getByRole('checkbox').nth(1).click();
 
  const loader = page.locator('.ngx-overlay.loading-foreground');
  if (await loader.count()) {
    await loader.first().waitFor({ state: 'hidden' });
  }
 
  await page.mouse.click(1400, 100);
 
  await expect(panel).toBeHidden();
});
  const advanceFilter = page.getByRole('complementary');


  await test.step('Apply advance filter - contractor', async () => {

    await page.getByText('Advance Filter').click();
    await page.locator('#contractor').click();

    await page.waitForTimeout(1000);
    const sidebar = page.getByRole('complementary');

    const contractorDropdown = sidebar
      .locator('p-multiselect[name="contractorname"]');

    await contractorDropdown.click();

    const contractorPanel = page.locator('.p-multiselect-panel');
    await contractorPanel.waitFor({ state: 'visible' });

    await contractorPanel
      .locator('.p-multiselect-header .p-checkbox')
      .click();

    await contractorDropdown.click();


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


  await test.step('Select employees and save', async () => {

    const employeeTable = page.locator('app-employeesearch p-table');

    await employeeTable
      .locator('tbody tr.p-selectable-row')
      .nth(0)
      .click();

    await employeeTable
      .locator('tbody tr.p-selectable-row')
      .nth(1)
      .click();

    await expect(
      page.getByText(/Selected Employees/)
    ).toContainText('2');


    await page
      .locator('app-shift-registration')
      .getByRole('button', { name: 'Save' })
      .click();

  });

});