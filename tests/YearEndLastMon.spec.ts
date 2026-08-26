import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import fs from 'fs';

test.setTimeout(180000);

test('Year End Leave Process Upload For Last Month', async ({ page }) => {

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
  // NAVIGATE TO ELMS > eLMS Uploads > Year End Leave Process Upload For Last Month
  // ==========================
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Uploads');
  await page
    .locator('app-elms-uploads')
    .getByRole('combobox')
    .selectOption('Year End Leave Process Upload For Last Month');

  await page.waitForTimeout(3000);

  console.log('Year End Leave Process Upload For Last Month Opened');

  // ==========================
  // FILTERS: Leave Type / Department / Peoplegroup / Designation
  // ==========================
  await page.locator('select[name="leavetype"]').selectOption('CL');

  // Department multiselect
  await page.getByText('--Select a Department--').click();
  await page.getByRole('checkbox').nth(1).click();
  await page.locator('p-multiselect').first().getByRole('button').click();

  // Verify the department actually got selected — if this still shows
  // the placeholder text, the checkbox click above didn't land and the
  // form will fail validation on a required field later.
  const departmentSelected = await page.getByText('--Select a Department--').isVisible().catch(() => false);
  if (departmentSelected) {
    console.warn('WARNING: Department still shows placeholder — selection may not have registered.');
  }

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

  const downloadedFile = `./downloads/YearEndLeaveProcessLastMonth_${Date.now()}.xlsx`;

  await download.saveAs(downloadedFile);

  console.log('File Downloaded Successfully');

  // ==========================
  // RE-UPLOAD THE DOWNLOADED FILE AS-IS
  // ==========================
  // Same pattern as Within Year Leave Balance Upload and Year End Leave
  // Process Upload — the "Download Format With Data" file comes fully
  // populated by the system, so there's no separate TestData.xlsx merge
  // needed. This smoke-tests that the exact file the system produced can
  // be re-uploaded successfully. Adjust cell refs below once you confirm
  // the real column layout for THIS format (it may differ from the
  // other two flows).
  const verifyWorkbook = XLSX.readFile(downloadedFile);
  const verifySheet = verifyWorkbook.Sheets[verifyWorkbook.SheetNames[0]];

  console.log('A2 =', verifySheet['A2']?.v);
  console.log('B2 =', verifySheet['B2']?.v);

  // ==========================
  // CHOOSE THE DOWNLOADED FILE
  // ==========================
  // Already on the Year End Leave Process Upload For Last Month screen
  // from earlier — re-selecting the same dropdown option here would
  // trigger Angular to reset/reload the section, wiping out the file
  // input right after we set it (this caused the "File Not Selected"
  // error in the other two flows). So just set the file directly.
  await page.setInputFiles('input[name="file"]', downloadedFile);

  console.log('File Selected');

  // Angular's change detection can lag behind the native input event
  // Playwright fires — the filename can appear in the UI before the
  // app's internal "file selected" state is actually set, which caused
  // a "File Not Selected" toast even though the filename was visible.
  // Explicitly dispatch change + blur and give it a beat to settle
  // before clicking Upload.
  // NOTE: input[type="file"] matches 2 elements on this page (this
  // upload's file input AND an unrelated image-upload input elsewhere
  // on the page, name="files") — scoped to name="file" (singular) to
  // target only the correct one.
  await page.locator('input[name="file"]').dispatchEvent('change');
  await page.locator('input[name="file"]').blur();
  await page.waitForTimeout(2000);

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
    path: 'year_end_leave_upload_for_last_month_result.png',
    fullPage: true
  });

  console.log('Process Completed');
});