import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
 
// ==========================
// HELPER FUNCTIONS
// ==========================
 
async function selectRandomOption(dropdown) {
 
  const count =
    await dropdown.locator('option').count();
 
  if (count > 1) {
 
    const randomIndex =
      Math.floor(Math.random() * (count - 1)) + 1;
 
    await dropdown.selectOption({
      index: randomIndex
    });
  }
}
 
async function selectRandomCheckboxes(locator) {
 
  const count =
    await locator.count();
 
  for (let i = 0; i < count; i++) {
 
    if (Math.random() > 0.5) {
 
      await locator
        .nth(i)
        .click()
        .catch(() => {});
    }
  }
}
 
async function selectRandomMultiSelect(page) {
 
  const checkboxes =
    page.locator('.p-checkbox-box');
 
  const count =
    await checkboxes.count();
 
  if (count > 0) {
 
    const randomIndex =
      Math.floor(Math.random() * count);
 
    await checkboxes
      .nth(randomIndex)
      .click();
  }
 
  await page.keyboard.press('Escape');
}
 
// ==========================
 
test.setTimeout(180000);
test.afterEach(async ({}, testInfo) => {

  const workbook =
    XLSX.utils.book_new();

  const worksheet =
    XLSX.utils.json_to_sheet([
      {
        TestName: testInfo.title,
        Status: testInfo.status,
        Duration: testInfo.duration,
        Error:
          testInfo.error?.message || '',
        Time:
          new Date().toLocaleString()
      }
    ]);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Result'
  );

  XLSX.writeFile(
    workbook,
    `Result_${Date.now()}.xlsx`
  );
  await test.step('Report Download', async () => {

  const downloadPromise = page.waitForEvent('download');

  await page.getByRole('button', { name: 'Report' }).click();

  const download = await downloadPromise;

  console.log(download.suggestedFilename());
  
});
});
test('New Client Registration', async ({ page }) => {
 
  // ==========================
  // RANDOM DATA
  // ==========================
    const surnames = [
'Sharma',
'Patel',
'Singh',
'Joshi',
'Kulkarni',
'Deshmukh'
];
 
const dealers = [
'Dealer Mumbai',
'ACE Brain',
'abc'
];
 
const statuses = [
'Active',
'Block'
];
 
const languages = [
'ASa',
'EN',
'FR',
'MR'
];
 
const countryData = [
{
country: 'India',
city: 'Mumbai',
state: 'Maharashtra',
address: 'Andheri West',
names: ['Aarav', 'Vihaan', 'Arjun', 'Rahul'],
phonePrefix: '9'
},
{
country: 'France',
city: 'Paris',
state: 'Ile-de-France',
address: 'Champs Elysees',
names: ['Pierre', 'Louis', 'Jean', 'Lucas'],
phonePrefix: '6'
},
{
country: 'Germany',
city: 'Berlin',
state: 'Berlin',
address: 'Alexanderplatz',
names: ['Hans', 'Lukas', 'Felix', 'Max'],
phonePrefix: '1'
},
{
country: 'Oman',
city: 'Muscat',
state: 'Muscat',
address: 'Downtown Street',
names: ['Ahmed', 'Salim', 'Khalid', 'Omar'],
phonePrefix: '9'
},
{
country: 'Bhutan',
city: 'Thimphu',
state: 'Thimphu',
address: 'City Center',
names: ['Tenzin', 'Karma', 'Dorji', 'Pema'],
phonePrefix: '1'
},
{
country: 'SaudiArebia',
city: 'Riyadh',
state: 'Riyadh',
address: 'King Fahd Road',
names: ['Abdullah', 'Faisal', 'Saad', 'Mohammed'],
phonePrefix: '5'
}
];
 
const randomItem = (arr) =>
arr[Math.floor(Math.random() * arr.length)];
 
const location =
randomItem(countryData);
 
const firstName =
randomItem(location.names);
 
const surname =
randomItem(surnames);
 
const clientName =
`${firstName} ${surname}`;
 
const randomDealer =
randomItem(dealers);
 
const randomStatus =
randomItem(statuses);
 
const randomLanguage =
randomItem(languages);
 
const email =
`${firstName.toLowerCase()}${surname.toLowerCase()}${Math.floor(Math.random() * 90 + 10)}@test.com`;
 
const phone =
location.phonePrefix +
Math.floor(
100000000 + Math.random() * 900000000
);
 
console.log('=================================');
console.log('Client Name :', clientName);
console.log('Country     :', location.country);
console.log('City        :', location.city);
console.log('State       :', location.state);
console.log('Address     :', location.address);
console.log('Dealer      :', randomDealer);
console.log('Status      :', randomStatus);
console.log('Language    :', randomLanguage);
console.log('Email       :', email);
console.log('Phone       :', phone);
console.log('=================================');
 
 // ==========================
 
 
  // ==========================
  // LOGIN
  // ==========================
 await test.step('Login', async () => {
  await page.goto(
    'http://192.168.0.23:4220/etam_prime_taj/admin'
  );
 
  await page.getByPlaceholder('Username')
    .fill('ADMIN/Wyse');
 
  await page.getByPlaceholder('Password')
    .fill('$WysE123');
 
  await page.getByRole('button', {
    name: /sign in/i
  }).click();
 
  await page.waitForLoadState('networkidle');
  });
 
  // ==========================
  // CLIENT REGISTRATION
  // ==========================
  
 await test.step('Client Registration', async () => {
  await page.getByRole('link', {
    name: 'CLIENT REGISTRATION'
  }).click();
 
  await page.waitForTimeout(5000);
 
  await expect(
    page.getByText('NEW CLIENT REGISTRATION')
  ).toBeVisible({
    timeout: 30000
  });
 
  await page.getByText(
    'NEW CLIENT REGISTRATION'
  ).click();
 
  await page.waitForLoadState('networkidle');
 
  await page.waitForTimeout(5000);
  });
 
  // ==========================
  // BASIC INFO
  // ==========================
 await test.step('Basic Information', async () => {
  // 1. Client Name
  await page.getByRole('textbox', {
    name: 'Client Name in English *'
  }).fill(clientName);
 
  await page.waitForTimeout(1500);
 
  // 2. Address
  await page.getByRole('textbox', {
    name: 'Address in English *'
  }).fill(location.address);
 
  await page.waitForTimeout(1500);
 
  // 3. City
  await page.getByRole('textbox', {
    name: 'City in English *'
  }).fill(location.city);
 
  await page.waitForTimeout(1500);
 
  // 4. State
  await page.getByRole('textbox', {
    name: 'State in English *'
  }).fill(location.state);
 
  await page.waitForTimeout(1500);
 
  // 5. Country
  await page.locator(
    'select[name="Country_Code"]'
  ).selectOption({
    label: location.country
  });
 
  console.log('Country Selected:', location.country);
 
  await page.waitForTimeout(1500);
 
  // 6. Telephone Number
  await page.getByRole('textbox', {
    name: 'Telephone Number'
  }).fill(phone);
 
  await page.waitForTimeout(1500);
 
  // 7. Email
  await page.getByRole('textbox', {
    name: 'Email *'
  }).fill(email);
 
  console.log('Email Filled');
 
await page.screenshot({
  path: 'after-email.png',
  fullPage: true
});
 
console.log('Reached After Email');
 
   // 8. Dealer Name
  try {
 
  console.log('Starting Dealer Selection');
 
  const dealerDropdown =
    page.locator('select[name="Dealer_id"]');
 
  console.log(
    'Dealer Count:',
    await dealerDropdown.count()
  );
 
  await dealerDropdown.waitFor({
    state: 'visible',
    timeout: 10000
  });
 
  console.log('Dealer Visible');
 
  await selectRandomOption(dealerDropdown);
 
  console.log('Dealer Selected');
 
} catch (error) {
 
  console.log('Dealer Error =>', error);
}
 
  // 9. Status
  const statusDropdown =
    page.locator('select[name="status"]');
 
  await statusDropdown.waitFor({
    state: 'visible'
  });
 
  await statusDropdown.selectOption({
    label: randomStatus
  });
 
  console.log('Status Selected:', randomStatus);
 
  await page.waitForTimeout(3000);
 
// 10. Language Code
const languageDropdown =
  page.locator('select[name="Language_Code"]');
 
await languageDropdown.waitFor({
  state: 'visible'
});
 
// Get all options
const languageOptions = await languageDropdown
  .locator('option')
  .allTextContents();
 
console.log('Available Languages:', languageOptions);
 
// Random option except first (--Select--)
const randomLanguageIndex =
  Math.floor(Math.random() * (languageOptions.length - 1)) + 1;
 
await languageDropdown.selectOption({
  index: randomLanguageIndex
});
 
console.log(
  'Language Selected:',
  languageOptions[randomLanguageIndex]
);
 // SAVE
// --------------------------
await page.getByRole('button', {
  name: 'Save'
}).click();

console.log('Basic Info Saved');

await page.waitForTimeout(3000);

// --------------------------
// REPORT DOWNLOAD
// --------------------------
const downloadPromise =
  page.waitForEvent('download');

await page.getByRole('button', {
  name: 'Report'
}).click();
});
// ==========================
// ==========================
// LICENSE POLICY
// ==========================
 await test.step('License Policy', async () => {
await page.getByText('License Policy').click();
 
await page.waitForTimeout(3000);
 
// Password Change Days
const passwordDays =
Math.floor(Math.random() * 365) + 1;
 
await page.getByRole('textbox', {
  name: 'Password Change in Days *'
}).fill(passwordDays.toString());
 
console.log(
  'Password Change Days:',
  passwordDays
);
await page.waitForTimeout(2000);
 
// ==========================
// RANDOM LICENSE TYPE
// ==========================
 
const licenceDropdown =
  page.getByRole('combobox').first();
 
const licenceOptions =
  await licenceDropdown.locator('option')
    .allTextContents();
 
const randomLicenceIndex =
  Math.floor(
    Math.random() *
    (licenceOptions.length - 1)
  ) + 1;
 
await licenceDropdown.selectOption({
  index: randomLicenceIndex
});
 
console.log(
  'Licence Type:',
  licenceOptions[randomLicenceIndex]
);
 
await page.waitForTimeout(2000);
 
 
 
// ==========================
// RANDOM RADIO BUTTONS
// ==========================
 
const radioButtons =
  page.locator('.mat-radio-container');
 
const radioCount =
  await radioButtons.count();
 
for (let i = 0; i < radioCount; i++) {
 
  if (Math.random() > 0.5) {
 
    await radioButtons
      .nth(i)
      .click()
      .catch(() => {});
 
    await page.waitForTimeout(3000);
  }
}
 
// ==========================
// RANDOM CHECKBOXES
// ==========================
 
const checkBoxes =
  page.locator('.mat-checkbox-inner-container');
 
const checkboxCount =
  await checkBoxes.count();
 
await selectRandomCheckboxes(
  page.locator('.mat-checkbox-inner-container')
);
 
console.log('Random Checkboxes Selected');
 
 
console.log('Random Checkboxes Selected');
 
await page.waitForTimeout(2000);
// ==========================
// PUNCH AVAILABLE DAYS
// ==========================
 
const hrDays =
  Math.floor(Math.random() * 31);
 
await page.getByRole('textbox', {
  name: /Punch Available/i
}).fill(hrDays.toString());
 
console.log(
  'Punch Available Days:',
  hrDays
);
 // SAVE
// --------------------------
await page.getByRole('button', {
  name: 'Save'
}).click();

console.log('License Policy Saved');

await page.waitForTimeout(3000);

// --------------------------
// REPORT DOWNLOAD
// -------------------------
await page.getByRole('button', {
  name: 'Report'
}).click();

await page.waitForTimeout(3000);
 });
// ==========================
// MODULE SELECTION
// ==========================
 await test.step('Module Selection', async () => {

await page.getByText('Module Selection').click();
 
await page.waitForTimeout(2000);
 
// ----- Client Short Name (derived from the client name selected on page 1) -----
// e.g. "Aarav Sharma" -> "AARAVSHA" (first name + first 3 letters of surname)
const clientShortName =
  (firstName + surname.substring(0, 3)).toUpperCase();
 
await page.getByRole('textbox', {
  name: 'Client Short Name'
}).fill(clientShortName);
 
console.log('Client Short Name:', clientShortName);
 
await page.waitForTimeout(1000);
 
// Open service selection and pick ETAM + eLMS
await page.getByText('--Select Services--').click();
 
await page.getByRole('listitem', {
  name: 'ETAM'
}).click();
 
await page.getByRole('listitem', {
  name: 'eLMS'
}).click();
 
// Close the multi-select dropdown
await page.getByRole('button')
  .filter({ hasText: /^$/ })
  .click();
 
console.log('ETAM and eLMS services selected');
 
await page.waitForTimeout(1500);
 
// Combobox tied to the services selection above
await page.getByRole('combobox').selectOption('2');
 
await page.waitForTimeout(1500);
 
// ----- Coff Hours for HOP (random HH:00 between 01:00 and 10:00) -----
const coffHoursHOP =
  Math.floor(Math.random() * 10) + 1;
 
const coffHoursHOPFormatted =
  coffHoursHOP.toString().padStart(2, '0') + ':00';
 
await page.locator('form')
  .filter({ hasText: 'Client Short NameSelect' })
  .getByPlaceholder(':00')
  .fill(coffHoursHOPFormatted);
 
console.log('Coff Hours for HOP:', coffHoursHOPFormatted);
 
await page.waitForTimeout(1000);
 
// ----- Leaves to be deducted (random 1-10) -----
const leavesToBeDeducted =
  Math.floor(Math.random() * 10) + 1;
 
await page.getByRole('textbox', {
  name: 'Leaves to be deducted'
}).fill(leavesToBeDeducted.toString());
 
console.log('Leaves to be deducted:', leavesToBeDeducted);
 
await page.waitForTimeout(1000);
 
await page.getByRole('textbox', {
  name: 'Treat Department As'
}).click();
 
await page.getByRole('textbox', {
  name: 'Treat Sub Department As'
}).click();
 
await page.waitForTimeout(1000);
 
await page.getByText('--Select Other Services--').click();

await page.getByRole('listitem', {
  name: 'TAJ'
}).click();

await page.keyboard.press('Escape');

console.log('Other Service TAJ selected');
 
await page.waitForTimeout(1500);
 
// ----- Coff Hours for WP (random HH:00 between 01:00 and 10:00) -----
const coffHoursWP =
  Math.floor(Math.random() * 10) + 1;
 
const coffHoursWPFormatted =
  coffHoursWP.toString().padStart(2, '0') + ':00';
 
await page.locator('form')
  .filter({ hasText: 'Select Version Premium' })
  .getByPlaceholder(':00')
  .fill(coffHoursWPFormatted);
 
console.log('Coff Hours for WP:', coffHoursWPFormatted);
 
await page.waitForTimeout(1000);
 
// ----- No. of late marks (random 1-10) -----
const noOfLateMarks =
  Math.floor(Math.random() * 10) + 1;
 
await page.getByRole('textbox', {
  name: 'No. of late marks'
}).fill(noOfLateMarks.toString());
 
console.log('No. of late marks:', noOfLateMarks);

console.log('After Version');
const contractorValues = [
  'EMP',
  'CONTRACTOR',
  'VENDOR',
  'OUTSOURCE',
  'TEMP',
  'STAFF'
];

const randomContractor =
  contractorValues[
    Math.floor(Math.random() * contractorValues.length)
  ];

await page.getByRole('textbox', {
  name: 'Treat Contractor As'
}).fill(randomContractor);

console.log(
  'Treat Contractor As:',
  randomContractor
);

// ==========================
// SAVE
// --------------------------
await page.getByRole('button', { name: 'Save'}).click();
console.log('Module Selection Saved');
await page.waitForTimeout(3000);
// --------------------------
// REPORT DOWNLOAD
// --------------------------

await page.getByRole('button', {
  name: 'Report'
}).click();
});
// ==========================
// OTHER INFO TAB
// ==========================
await test.step('Other Info', async () => {
await page.getByText('Other Info').click();

await page.waitForTimeout(2000);

// --------------------------
// Pin Code
// --------------------------
const pinCode =
  Math.floor(100000 + Math.random() * 900000)
    .toString();

await page.getByPlaceholder('Pin Code')
  .fill(pinCode);

console.log('Pin Code:', pinCode);
await page.waitForTimeout(1000);
// --------------------------
// Fax Number
// --------------------------
const faxNumber =
  Math.floor(10000000 + Math.random() * 90000000)
    .toString();

await page.getByPlaceholder('Fax Number')
  .fill(faxNumber);

console.log('Fax Number:', faxNumber);
await page.waitForTimeout(1000);

// --------------------------
// Rounding Off
// --------------------------
const rounding =
  Math.floor(Math.random() * 60) + 1;

await page.getByPlaceholder('Rounding Off')
  .fill(rounding.toString());

console.log('Rounding Off:', rounding);
await page.waitForTimeout(1000);
// --------------------------
// Calendar Date
// --------------------------
const today = new Date();

const day = String(today.getDate())
  .padStart(2, '0');

const month = String(today.getMonth() + 1)
  .padStart(2, '0');

const year = today.getFullYear();

const currentDate =
  `${day}/${month}/${year}`;

await page.getByPlaceholder('DD/MM/YYYY')
  .fill(currentDate);

console.log('Date:', currentDate);

await page.waitForTimeout(1000);

// --------------------------
// Upload Options
// --------------------------
await page.getByText('--Select Upload').click();

await page.waitForTimeout(1000);

// Select Payslip
await page.getByText('PaySlip', {
  exact: true
}).click();

await page.waitForTimeout(1000);

// Select Policy
await page.getByText('Policy', {
  exact: true
}).click();

await page.waitForTimeout(1000);

// Select Notice
await page.getByText('Notice', {
  exact: true
}).click();

await page.waitForTimeout(1000);

// Close dropdown
await page.keyboard.press('Escape');

console.log(
  'Upload Options Selected: PaySlip, Policy, Notice'
);

// --------------------------
// SAVE
// --------------------------
await page.getByRole('button', {
  name: 'Save'
}).click();

console.log('Other Info Saved');

await page.waitForTimeout(3000);
});

  // GO TO MOBILE SETTINGS
  // ==========================
  await test.step('Mobile Settings', async () => {
  await page.getByText('Mobile Settings').click();
 
  console.log('Mobile Settings Opened');
 
  // ==========================
  // ENABLE MOBILE APPLICATION -> SELECT "Yes"
  // ==========================
  await page.getByText('Yes').click();
 
  console.log('Mobile Application set to Yes');
 
  // ==========================
  // MARK "Mobile Attendance" CHECKBOX
  // TODO: Confirm this checkbox is specifically "Mobile Attendance" —
  // codegen captured it generically as the first .mat-checkbox-inner-container.
  // If there are multiple checkboxes on this screen, replace .first() with
  // a more specific locator, e.g. page.getByLabel('Mobile Attendance')
  // ==========================
  await page.locator('.mat-checkbox-inner-container').first().click();
 
  console.log('Mobile Attendance checkbox marked');
 
  // ==========================
  // ATTENDANCE TYPE: SELECT GEO + FACE FOR EVERY ROW
  // TODO: Replace ATTENDANCE_TYPE_ROW_COUNT with the actual number of
  // Attendance Type rows visible on this screen. Also confirm the Geo
  // and Face checkbox locators below match each row correctly —
  // these are placeholders based on the multiselect/checkbox pattern
  // codegen captured (.p-checkbox-box). You likely need a row-scoped
  // locator instead of a global .nth() index once there are multiple rows.
  // ==========================
  const ATTENDANCE_TYPE_ROW_COUNT = 1; // TODO: update to actual row count
 
  for (let row = 0; row < ATTENDANCE_TYPE_ROW_COUNT; row++) {
    console.log(`Setting Geo + Face for Attendance Type row ${row + 1}`);
 
    // Open the multiselect dropdown for this row
    // TODO: if there are multiple rows, this likely needs .nth(row)
    await page.locator('.p-multiselect-trigger-icon').nth(row).click();
 
    // Tick "Geo" checkbox
    // TODO: confirm this is actually the "Geo" option — codegen only
    // captured position (first checkbox in the open dropdown list)
    await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click();
 
    // Tick "Face" checkbox
    // TODO: confirm this is actually the "Face" option — codegen captured
    // it as the 2nd item in a p-multiselectitem list
    await page.locator('p-multiselectitem:nth-child(2) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
 
    // Close the dropdown (codegen captured an icon-only button with no text)
    // TODO: replace with a more specific locator if possible,
    // e.g. page.getByRole('button', { name: 'Close' }) or similar
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
  }
 
  console.log('Geo + Face selected for all Attendance Type rows');
 
  // ==========================
  // MARK "Mobile Leave Application" CHECKBOX
  // TODO: confirm exact locator — not present in your codegen snippet yet.
  // Placeholder using text match; replace with the real one once captured.
  // ==========================
  // await page.getByText('Mobile Leave Application').click();
  console.log('TODO: Mobile Leave Application checkbox — locator not yet captured');
 
  // ==========================
  // SELECT TIME ZONE (any one)
  // TODO: confirm exact locator — not present in your codegen snippet yet.
  // ==========================
  // await page.getByRole('combobox', { name: 'Time Zone' }).selectOption({ index: 1 });
  console.log('TODO: Time Zone selection — locator not yet captured');
 
  // ==========================
  // LOCATION DESCRIPTION
  // ==========================
  await page.getByRole('textbox', { name: 'Location Description' }).click();
  await page.getByRole('textbox', { name: 'Location Description' }).fill('Test Location');
 
  console.log('Location Description filled');
 
  // ==========================
  // LATITUDE / LONGITUDE
  // ==========================
  await page.getByRole('textbox', { name: 'Latitude ?' }).fill('54');
  await page.getByRole('textbox', { name: 'Longitude ?' }).fill('45');
 
  console.log('Latitude/Longitude filled');
 
  // ==========================
  // GEO FENCING -> MARK "Yes"
  // TODO: confirm exact locator for the Geo Fencing "Yes" toggle —
  // not distinctly captured in your codegen snippet (may overlap with
  // the earlier 'Yes' click for Mobile Application). Update once confirmed.
  // ==========================
  // await page.getByText('Yes').nth(1).click();
  console.log('TODO: Geo Fencing Yes toggle — confirm correct locator (may collide with earlier Yes click)');
 
  // ==========================
  // GEO DISTANCE (e.g. 10 or 14)
  // ==========================
  await page.getByRole('textbox', { name: 'Geo. Distance' }).fill('12');
 
  console.log('Geo Distance filled');
});
  // ==========================
  // ADD -> MODIFY -> SAVE
  // ==========================
  await page.getByRole('button', { name: 'Add' }).click();
  console.log('Add clicked');
 
  await page.getByRole('button', { name: 'Modify' }).click();
  console.log('Modify clicked');
 
  await page.getByRole('button', { name: 'Save' }).click();
  console.log('Save clicked');
 
  // ==========================
  // VERIFY SUCCESS MESSAGE
  // TODO: replace 'Success' below with the exact success message text
  // your app actually shows after Save (e.g. a toast/snackbar).

 
  // ==========================
  // SCREENSHOT OF FINAL RESULT
  // ==========================
  await page.screenshot({ path: 'mobile-settings-result.png', fullPage: true });
 
  console.log('Process Completed');
});
test.afterEach(async ({}, testInfo) => {

  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.json_to_sheet([
    {
      TestName: testInfo.title,
      Status: testInfo.status,
      Duration: testInfo.duration,
      Error: testInfo.error?.message || '',
      Time: new Date().toLocaleString()
    }
  ]);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Result');

  XLSX.writeFile(
    workbook,
    `Result_${Date.now()}.xlsx`
  );

});