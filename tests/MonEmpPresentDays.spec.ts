import { test, expect, Page } from '@playwright/test';

test('Monthly Employee Wise Present Days - edit existing entry (Shiv Kumar / July)', async ({ page }) => {
  const waitForLoaderHidden = async () => {
    const loader = page.locator('.ngx-overlay, ngx-ui-loader');
    await loader.first().waitFor({ state: 'hidden' }).catch(() => {});
  };
  const clickSaveOrModify = async () => {
    const save = page.getByRole('button', { name: 'SAVE' });
    const modify = page.getByRole('button', { name: 'Modify' });
    const button = (await save.isVisible().catch(() => false)) ? save : modify;
    await button.waitFor({ state: 'visible', timeout: 15000 });
    await button.click();
  };
  const checkForDuplicateEntryError = async () => {
    const errorToast = page.getByText('Already Exist for Specified Period');
    if (await errorToast.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error(
        'Save rejected: an entry for this employee/month already exists ("Already Exist for Specified Period"). ' +
        'Load the existing row from the table first if the intent is to edit it, rather than submitting as new.'
      );
    }
  };

  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Monthly Employee Wise Present Days');

  await page.locator('input[name="emp"]').click();
  await page.locator('input[name="emp"]').fill('100000001 - Shiv Kumar');

  await page.getByRole('spinbutton', { name: 'Present Days *' }).click();
  await page.locator('select[name="month"]').selectOption('July');
  await page.getByRole('spinbutton', { name: 'Present Days *' }).click();
  await page.getByRole('spinbutton', { name: 'Present Days *' }).fill('25');

  await waitForLoaderHidden();
  await clickSaveOrModify();
  await checkForDuplicateEntryError();

 
});