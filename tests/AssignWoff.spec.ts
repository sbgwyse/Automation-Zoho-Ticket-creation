import { test, expect } from '@playwright/test';

// Selects every enabled checkbox inside an open PrimeNG multiselect panel.
// Falls back to clicking each individually if a single "select all" master
// checkbox isn't present/reliable for a given panel.
async function selectAllCheckboxes(panel: import('@playwright/test').Locator) {
  const masterCheckbox = panel.locator('.p-multiselect-header .p-checkbox-box');
  if (await masterCheckbox.count() > 0) {
    await masterCheckbox.first().click();
    return;
  }
  const checkboxes = panel.locator('.p-checkbox-box:not(.p-disabled)');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    await checkboxes.nth(i).click();
  }
}

test('Assign Weekly Off - full flow', async ({ page }) => {

  await test.step('Login to ETAM Prime', async () => {
    await page.goto('https://presence.tajhotels.com/etam_prime/login');
    await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
    await page.getByRole('button', { name: 'Sign In' }).click();
  });

  await test.step('Navigate to Assign Weekly Off', async () => {
    await page.getByText('REGISTRATION').click();
    await page.getByRole('combobox').selectOption('Assign Weekly Off');
    await page.locator('select[name="month"]').selectOption('July');
    await page.getByLabel('Remark').selectOption('Pending Off');
  });

  await test.step('Select department (main filter)', async () => {
    await page.locator('.ng-tns-c138-8.p-multiselect-trigger').click();

    const panel = page.locator('.p-multiselect-panel');
    await panel.waitFor({ state: 'visible' });
    await selectAllCheckboxes(panel);

    await page.keyboard.press('Escape');
  });

  await test.step('Advance Filter - contractor and department', async () => {
    await page.getByText('Advance Filter').click();

    const sidebar = page.getByRole('complementary');

    await sidebar.getByText('Contractor').click();
    await sidebar.getByText('--Select a Contractor--').click();

    const contractorPanel = sidebar.locator('.p-multiselect-panel');
    await contractorPanel.waitFor({ state: 'visible' });
    await selectAllCheckboxes(contractorPanel);
    await page.keyboard.press('Escape');

    await sidebar.getByText('--Select a Department--').click();

    const departmentPanel = sidebar.locator('.p-multiselect-panel');
    await departmentPanel.waitFor({ state: 'visible' });
    await selectAllCheckboxes(departmentPanel);
    await page.keyboard.press('Escape');

    // FRAGILE: a third checkbox click outside the two dropdowns above —
    // verify what this targets (looked like a separate, standalone control
    // in the codegen recording, not a multiselect panel) before relying on it.
    await sidebar.getByRole('checkbox').nth(3).click();

    await sidebar.getByRole('button', { name: 'Done' }).click();
  });

  await test.step('Select employees', async () => {
    const searchBox = page.getByPlaceholder('Search Name,Id,AlphaNum');
    const employeeIds = ['500100555', '500100666', '500100777'];

    for (const id of employeeIds) {
      await searchBox.fill(id);
      await searchBox.press('Enter');

      await page
        .getByRole('row', { name: id })
        .getByRole('checkbox')
        .check();

      await searchBox.fill('');
      await searchBox.press('Enter');
    }
  });

  await test.step('Set remark and weekly off dates', async () => {
    await page.getByLabel('Remark').selectOption('Pending Off');
    await page.getByLabel('Tuesday July 7').click();
    await page.getByLabel('Wednesday July 8').click();
    await page.getByLabel('Thursday July 9').getByText('9').click();
  });

  await test.step('Save', async () => {
    await page.getByRole('button', { name: 'Save' }).click();

    // FRAGILE: unnamed button after Save — likely a confirmation dialog
    // button, NOT a multiselect. Give it a proper name-based locator once
    // you know its label.
    await page.getByRole('button').filter({ hasText: /^$/ }).click();

    await page.getByRole('button', { name: 'Deselect All' }).click();
  });

  console.log('Assign Weekly Off - full flow completed.');

});
