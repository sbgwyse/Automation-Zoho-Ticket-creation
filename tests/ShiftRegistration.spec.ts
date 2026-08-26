import { test, expect } from '@playwright/test';
test('test', async ({ page }) => {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByText('REGISTRATION').click();
  await page.locator('div').filter({ hasText: '--Select Option--Employee' }).nth(1).click();
  await page.getByRole('combobox').selectOption('Shift Registration');
  await page.getByRole('textbox', { name: 'Select Date Range' }).click();
  await page.getByText('14').first().click();
  await page.getByText('15').nth(2).click();
  await page.locator('select[name="selectedShift"]').selectOption('5 - Morning shift');
  await page.locator('select[name="selectedDay"]').selectOption('Thursday');
  await page.getByText('--Select a Department--').click();
  await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click();
  await page.locator('p-multiselectitem:nth-child(2) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
  await page.locator('p-multiselectitem:nth-child(3) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
  await page.getByText('Advance Filter').click();
  await page.getByText('Contractor').click();
  await page.getByText('--Select a Contractor--').click();
  await page.getByRole('checkbox').nth(3).click();
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
  await page.getByText('--Select a Department--').click();
  await page.getByRole('checkbox').nth(3).click();
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
  await page.getByRole('checkbox').nth(3).click();
  await page.getByRole('button', { name: 'Done' }).click();

  // The IDs below don't appear in the default employee table — the search
  // box ("Type id and press enter to search") has to be used to bring each
  // one in before its cell can be clicked. This is what the test was
  // hanging on.
  const employeeSearch = page.getByPlaceholder(/Search Name.*Id.*AlphaNum/i);
  for (const id of ['500100666', '500100777', '500100888']) {
    await employeeSearch.fill(id);
    await employeeSearch.press('Enter');
    await page.getByRole('cell', { name: id, exact: true }).click();
  }

  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
});