import { test, expect, Page, Download } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * ETAM PRIME - eLMS Uploads - Year End Leave Process Upload
 * Downloads the "Download Format With Data" file for each leave type (CL, PL).
 */

const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = 'ADMIN/etam100';
const PASSWORD = '$WysE123';

const DOWNLOAD_DIR = path.resolve(__dirname, '../downloads');
const PAUSE_MS = 500; // small settle time between Angular/PrimeNG UI transitions

const EMPLOYEE_IDS = ['500100123', '500100126', '500100127'];
const LEAVE_TYPES = ['CL', 'PL'] as const;

// ---------- Helpers ----------

async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('ELMS')).toBeVisible({ timeout: 15000 });
}

async function navigateToYearEndLeaveUpload(page: Page) {
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('eLMS Uploads');
  await page
    .locator('app-elms-uploads')
    .getByRole('combobox')
    .selectOption('Year End Leave Process Upload');
  await page.waitForTimeout(PAUSE_MS);
}

async function closeResultDialogIfPresent(page: Page) {
  const dialogCloseBtn = page.locator('.p-dialog .p-dialog-header-close, .modal .close');
  if (await dialogCloseBtn.first().isVisible().catch(() => false)) {
    await dialogCloseBtn.first().click();
    await page.waitForTimeout(PAUSE_MS);
  }
}

async function selectDepartmentFilter(page: Page) {
  await page.getByText('--Select a Department--').click();
  await page.getByRole('checkbox').nth(1).click();
  await page
    .locator('p-multiselect')
    .filter({ hasText: 'EngineeringFood &' })
    .getByRole('button')
    .click();
  await page.waitForTimeout(PAUSE_MS);
}

async function selectPeopleGroupFilter(page: Page) {
  await page.getByText('--Select Peoplegroup--').click();
  await page.getByRole('checkbox').nth(1).click();
  await page
    .locator('p-multiselect')
    .filter({
      hasText:
        'ApprenticeConsultantDirectorExpatFTCHistoryStaffSupervisorTASTraineeUnclassified',
    })
    .getByRole('button')
    .click();
  await page.waitForTimeout(PAUSE_MS);
}

async function selectEmployees(page: Page, employeeIds: string[]) {
  for (const id of employeeIds) {
    await page.getByRole('cell', { name: id }).click();
  }
}

async function saveDownload(download: Download, filenamePrefix: string) {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  const suggested = download.suggestedFilename();
  const ext = path.extname(suggested) || '.xlsx';
  const target = path.join(DOWNLOAD_DIR, `${filenamePrefix}${ext}`);
  await download.saveAs(target);
  return target;
}

/**
 * Runs the full "Download Format With Data" flow for a single leave type.
 * Assumes the eLMS Uploads > Year End Leave Process Upload screen is already open.
 */
async function downloadYearEndLeaveFormat(page: Page, leaveType: (typeof LEAVE_TYPES)[number]) {
  await page.locator('select[name="leavetype"]').selectOption(leaveType);
  await page.waitForTimeout(PAUSE_MS);

  await selectDepartmentFilter(page);
  await selectPeopleGroupFilter(page);

  await page.locator('#getcontractor').check();
  await page.waitForTimeout(PAUSE_MS);

  await selectEmployees(page, EMPLOYEE_IDS);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Format With Data' }).click();
  const download = await downloadPromise;

  const savedPath = await saveDownload(download, `year-end-leave-${leaveType}`);
  expect(fs.existsSync(savedPath)).toBeTruthy();

  await closeResultDialogIfPresent(page);
}

// ---------- Test ----------

test('eLMS Year End Leave Process Upload - CL and PL downloads', async ({ page }) => {
  await login(page);
  await navigateToYearEndLeaveUpload(page);

  for (const leaveType of LEAVE_TYPES) {
    await test.step(`Download format with data - ${leaveType}`, async () => {
      await downloadYearEndLeaveFormat(page, leaveType);
    });
  }
});