import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('Employee Data Modification - PDF and Excel Report', async ({ page }) => {

  await test.step('Login to ETAM Prime', async () => {
    await page.goto('https://presence.tajhotels.com/etam_prime/login');
    await page.getByRole('textbox', { name: 'Username' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
    await page.getByRole('button', { name: 'Sign In' }).click();
  });

  await test.step('Navigate to Employee Data Modification', async () => {
    await page.getByText('REGISTRATION').click();
    await page.getByRole('combobox').selectOption('Employee Data Modification');
  });

  await test.step('Search and select employee', async () => {
    await page.locator('p-autocomplete').getByRole('button').click();
    await page.getByText('- Shiv Kumar').click();
  });

  await test.step('Open Modify', async () => {
    await page.getByRole('button', { name: 'Modify' }).click();
  });

  await test.step('Download PDF Report', async () => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF Report' }).click();
    const download = await downloadPromise;

    const downloadDir = './downloads';
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    const filePath = './downloads/EmployeeDataModification.pdf';
    await download.saveAs(filePath);
    console.log('Downloaded:', filePath);
  });

  await test.step('Download Excel Report', async () => {
    const download1Promise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel Report' }).click();
    const download1 = await download1Promise;

    const downloadDir = './downloads';
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    const filePath = './downloads/EmployeeDataModification.xlsx';
    await download1.saveAs(filePath);
    console.log('Downloaded:', filePath);
  });

  console.log('Finished test cases:');
  console.log('  Login to ETAM Prime');
  console.log('  Navigate to Employee Data Modification');
  console.log('  Search and select employee');
  console.log('  Open Modify');
  console.log('  Download PDF Report');
  console.log('  Download Excel Report');
  console.log('Test Completed');

});