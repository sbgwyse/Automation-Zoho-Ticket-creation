import { test, expect } from '@playwright/test';
 import *as XLSX from 'xlsx';
import fs from 'fs';

test.setTimeout(180000);

test('Cluster HR Upload', async ({ page }) => {

  // ==========================
  // LOGIN
  // ==========================
  await page.goto('http://192.168.0.23:4220/etam_prime_taj/login');

  await page.getByPlaceholder('Username').fill('ADMIN/Wyse');
  await page.getByPlaceholder('Password').fill('$WysE123');

  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForTimeout(15000);

  console.log('Login Successful');

  // ==========================
  // OPEN CLUSTER HR UPLOAD
  // ==========================
  await page.getByText('CLUSTER HR UPLOAD').click();

  await page.waitForTimeout(3000);

  console.log('Cluster HR Upload Opened');

  // ==========================
  // CREATE DOWNLOAD FOLDER
  // ==========================
  if (!fs.existsSync('./downloads')) {
    fs.mkdirSync('./downloads');
  }

  // ==========================
  // DOWNLOAD FILE
  // ==========================
  const downloadPromise = page.waitForEvent('download');

  await page.getByText('DOWNLOAD FORMAT WITH DATA').click();

  const download = await downloadPromise;

  const downloadedFile =
    `./downloads/ClusterHR_${Date.now()}.xlsx`;

  await download.saveAs(downloadedFile);

  console.log('File Downloaded Successfully');

  // ==========================
  // READ DATA FROM TestData.xlsx
  // ==========================
  const dataWorkbook =
    XLSX.readFile('./TestData.xlsx');

  const dataSheet =
    dataWorkbook.Sheets[dataWorkbook.SheetNames[0]];

  const data =
    XLSX.utils.sheet_to_json(dataSheet);

  const hotelManagerId =
    data[0].Hotel_Manager_Alfanumeric_id;

  const clusterHrId =
    data[0].Cluster_HR_Alfanumeric_ID;

  console.log('Hotel Manager ID:', hotelManagerId);
  console.log('Cluster HR ID:', clusterHrId);

  // ==========================
// UPDATE DOWNLOADED EXCEL
// ==========================

const workbook = XLSX.readFile(downloadedFile);

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Fill all rows from TestData.xlsx
for (let i = 0; i < data.length; i++) {

  const rowNumber = i + 2; // Start from row 2

  sheet[`A${rowNumber}`] = {
    t: 's',
    v: data[i].Hotel_Manager_Alfanumeric_id
  };

  sheet[`B${rowNumber}`] = {
    t: 's',
    v: data[i].Cluster_HR_Alfanumeric_ID
  };
}

// Update sheet range
sheet['!ref'] = `A1:B${data.length + 1}`;

const updatedFile =
  `./downloads/ClusterHR_Filled_${Date.now()}.xlsx`;

XLSX.writeFile(workbook, updatedFile);

console.log('Excel Updated Successfully');

  // ==========================
  // VERIFY EXCEL DATA
  // ==========================
  const verifyWorkbook =
    XLSX.readFile(updatedFile);

  const verifySheet =
    verifyWorkbook.Sheets[verifyWorkbook.SheetNames[0]];

  console.log('A2 =', verifySheet['A2']?.v);
  console.log('B2 =', verifySheet['B2']?.v);

  // ==========================
  // CHOOSE UPDATED FILE
  // ==========================
  await page.setInputFiles(
    'input[type="file"]',
    updatedFile
  );

  console.log('File Selected');

  await page.waitForTimeout(5000);

  // ==========================
  // CLICK UPLOAD
  // ==========================
  await page.getByRole('button', {
    name: /upload/i
  }).click();

  console.log('Upload Button Clicked');

  await page.waitForTimeout(10000);

  // ==========================
  // SCREENSHOT
  // ==========================
  await page.screenshot({
    path: 'upload_result.png',
    fullPage: true
  });

  console.log('Process Completed');
});