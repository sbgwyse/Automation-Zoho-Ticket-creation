import { test, expect, Page } from '@playwright/test';
 
const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = process.env.ETAM_USERNAME || 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD || '$WysE123';
 
async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page.locator('.ngx-overlay').waitFor({ state: 'hidden', timeout }).catch(() => {});
}
 
async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await waitForOverlayGone(page);
}
 
async function setDateRange(page: Page) {
     await page.getByRole('textbox', { name: 'Select Date Range' }).click();
    await expect(page.getByText('LAST MONTH')).toBeVisible();
    await page.getByText('LAST MONTH').click();
  await waitForOverlayGone(page);
}
 
async function selectDepartments(page: Page) {
  const department = page.locator('p-multiselect[name="deptname"]');

  await department.locator('.p-multiselect-trigger').click();

  const panel = department.locator('.p-multiselect-panel');
  await expect(panel).toBeVisible();

  const departments = panel.locator('li.p-multiselect-item');

  const count = await departments.count();
  console.log(`Departments found: ${count}`);

  for (let i = 0; i < count; i++) {
    await departments.nth(i).click();
  }

  const selectedDepartments = department.locator(
    '.p-multiselect-label .p-multiselect-token'
  );

  await expect(selectedDepartments).toHaveCount(count);

  await department.locator('.p-multiselect-trigger').click();

  await waitForOverlayGone(page);
}

async function selectEmployees(page: Page) {

  const employeeTable = page.locator(
    'p-table[selectionmode="multiple"]'
  );

  const table = employeeTable.locator('table.p-datatable-table');

  const rows = table.locator(
    'tbody tr.p-selectable-row'
  );

  await expect(rows.first()).toBeVisible({
    timeout: 30000
  });

  const employeeCount = await rows.count();

  console.log(`Employees loaded: ${employeeCount}`);

  expect(employeeCount).toBeGreaterThan(0);

  const selectAll = table.locator(
    'thead [role="checkbox"]'
  );

  await expect(selectAll).toBeVisible({
    timeout: 10000
  });

  await page.waitForTimeout(300);

  await selectAll.click();

  await expect(selectAll).toHaveAttribute(
    'aria-checked',
    'true',
    { timeout: 10000 }
  );

  const selectedRows = rows.filter({
    hasClass: 'p-highlight'
  });

  await expect(selectedRows).toHaveCount(
    employeeCount,
    { timeout: 10000 }
  );

  const selectedEmployees = page.getByRole('button', {
    name: /Selected Employees/
  });

  await expect(selectedEmployees).toContainText(
    `Selected Employees : ${employeeCount}`,
    { timeout: 10000 }
  );

  console.log(
    `Selected Employees : ${employeeCount}`
  );
}



async function clickCompareAttendanceData(page: Page) {
  await waitForOverlayGone(page);
  await page.getByRole('button', { name: 'Compare Attendance Data' }).click();
  await waitForOverlayGone(page);
}
 
async function acknowledgeResultDialog(page: Page) {
  const okButton = page.getByRole('button', { name: 'OK' });
  await okButton.waitFor({ state: 'visible', timeout: 20000 });
  await okButton.click();
  await waitForOverlayGone(page);
}
 
test('Lock Attendance - lock and download report', async ({ page }) => {
  test.setTimeout(240_000);
 
  await login(page);
 
  await page.getByText('MONTHLY PAY PROCESS').click();
  await page.getByRole('combobox').selectOption('Compare Attendance');
  await waitForOverlayGone(page);
 
  await setDateRange(page);
  await selectDepartments(page);
  await selectEmployees(page);
  await clickCompareAttendanceData(page);
  await acknowledgeResultDialog(page);
 

  await setDateRange(page);
  await selectDepartments(page);
  await selectEmployees(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Report' }).click();
  const download = await downloadPromise;
 
  await download.saveAs(`downloads/${download.suggestedFilename()}`);
  expect(download.suggestedFilename()).toBeTruthy();
});
 