import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import fs from 'fs';

test.setTimeout(180000);

test('Within Year Leave Balance Upload', async ({ page }) => {

  // ==========================
  // LOGIN
  // ==========================
  await page.goto('https://presence.tajhotels.com/etam_prime/login');

  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');

  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForTimeout(15000);

  console.log('Login Successful');

  // ==========================
  // NAVIGATE TO ELMS > eLMS Uploads > Within Year Leave Balance Upload
  // ==========================
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Uploads');
  await page
    .locator('app-elms-uploads')
    .getByRole('combobox')
    .selectOption('Within Year Leave Balance Upload');

  await page.waitForTimeout(3000);

  console.log('Within Year Leave Balance Upload Opened');

  // ==========================
  // FILTERS: Leave Type / Department / Peoplegroup / Designation
  // ==========================
  await page.locator('select[name="leavetype"]').selectOption('CL');

  // Department multiselect
  await page.getByText('--Select a Department--').click();
  await page.getByRole('checkbox').nth(1).click();
  await page.locator('p-multiselect').first().getByRole('button').click();

  // Peoplegroup multiselect
  await page.getByText('--Select Peoplegroup--').click();
  await page.getByRole('checkbox').nth(1).click();
  await page.locator('p-multiselect').nth(1).getByRole('button').click();

  await page.locator('select[name="designname"]').selectOption('Team Leader');

  // First click opens the employee selection panel
  await page.getByRole('button', { name: 'Download Format With Data' }).click();

  await page.getByText('Contractor').click();
  await page.locator('#getcontractor').check();

  const employeeIds = ['500100123', '500100125', '500100127', '500100129'];
  for (const employeeId of employeeIds) {
    await page.getByRole('cell', { name: employeeId }).click();
  }

  // ==========================
  // CREATE DOWNLOAD FOLDER
  // ==========================
  if (!fs.existsSync('./downloads')) {
    fs.mkdirSync('./downloads');
  }

  // ==========================
  // DOWNLOAD FILE (second click on same button triggers actual download)
  // ==========================
  const downloadPromise = page.waitForEvent('download');

  await page.getByRole('button', { name: 'Download Format With Data' }).click();

  const download = await downloadPromise;

  const downloadedFile = `./downloads/WithinYearLeaveBalance_${Date.now()}.xlsx`;

  await download.saveAs(downloadedFile);

  console.log('File Downloaded Successfully');

  
  const verifyWorkbook = XLSX.readFile(downloadedFile);
  const verifySheet = verifyWorkbook.Sheets[verifyWorkbook.SheetNames[0]];

  console.log('EmpId (B2) =', verifySheet['B2']?.v);
  console.log('Contract_Opening_Balance (J2) =', verifySheet['J2']?.v);

  // ==========================
  // CHOOSE THE DOWNLOADED FILE
  // ==========================
  // Already on the Within Year Leave Balance Upload screen from earlier —
  // re-selecting the same dropdown option here would trigger Angular to
  // reset/reload the section, wiping out the file input right after we
  // set it (this caused the "File Not Selected" error). So just set the
  // file directly.
  await page.setInputFiles('input[type="file"]', downloadedFile);

  console.log('File Selected');

  await page.waitForTimeout(5000);

  // ==========================
  // CLICK UPLOAD
  // ==========================
  await page.getByRole('button', { name: /upload/i }).click();

  console.log('Upload Button Clicked');

  await page.waitForTimeout(10000);

  // ==========================
  // SCREENSHOT
  // ==========================
  await page.screenshot({
    path: 'within_year_leave_balance_upload_result.png',
    fullPage: true
  });

  console.log('Process Completed');
});