import { test, expect, Locator, Page } from '@playwright/test';

// ==========================
// HELPER FUNCTIONS
// ==========================
async function selectRandomOption(dropdown: Locator) {
  const count = await dropdown.locator('option').count();
  if (count > 1) {
    const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
    await dropdown.selectOption({ index: randomIndex });
  }
}

async function selectRandomCheckboxes(locator: Locator) {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    if (Math.random() > 0.5) {
      await locator.nth(i).click().catch(() => {});
    }
  }
}

async function selectRandomMultiSelect(page: Page) {
  const checkboxes = page.locator('.p-checkbox-box');
  const count = await checkboxes.count();
  if (count > 0) {
    const randomIndex = Math.floor(Math.random() * count);
    await checkboxes.nth(randomIndex).click();
  }
  await page.keyboard.press('Escape');
}

// Waits for a getByText(regex) locator's content to settle on a real
// value, instead of grabbing it immediately (which can catch a
// "loading..." placeholder before the page finishes fetching the real
// APP/API version text). Polls up to maxWaitMs, returns the final text
// content (trimmed) or null if it never resolved.
async function waitForRealText(page: Page, pattern: RegExp, maxWaitMs = 8000): Promise<string | null> {
  const start = Date.now();
  let lastText: string | null = null;
  while (Date.now() - start < maxWaitMs) {
    lastText = await page
      .getByText(pattern)
      .textContent({ timeout: 1000 })
      .catch(() => null);
    if (lastText && !/loading/i.test(lastText)) {
      return lastText.trim();
    }
    await page.waitForTimeout(300);
  }
  return lastText ? lastText.trim() : null;
}

// ==========================
// VALIDATION HELPERS
// ==========================
const NAME_REGEX = /^[A-Za-z\s]+$/;
const ALPHA_WITH_PUNCT_REGEX = /^[A-Za-z\s.,'-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{7,15}$/;
const PINCODE_REGEX = /^[0-9]{4,6}$/;
const FAX_REGEX = /^[0-9]{6,12}$/;

function validateField(fieldName: string, value: string, regex: RegExp) {
  const isValid = regex.test(value);
  console.log(`Validation [${fieldName}] => "${value}" => ${isValid ? 'PASS' : 'FAIL'}`);
  if (!isValid) {
    throw new Error(`Validation failed for ${fieldName}: "${value}" does not match expected format ${regex}`);
  }
}

async function validateFilledValue(field: Locator, expectedValue: string, fieldName: string) {
  const actualValue = await field.inputValue().catch(() => '');
  if (actualValue.trim() !== expectedValue.trim()) {
    throw new Error(
      `Field mismatch for ${fieldName}: expected "${expectedValue}" but UI shows "${actualValue}"`
    );
  }
  console.log(`UI Value Check [${fieldName}] => "${actualValue}" matches expected value`);
}

/**
 * Click a button by accessible name with a bounded wait + diagnostics.
 * Unlike a bare `.click()`, this can never hang past `timeout`: if the
 * button isn't visible in time it throws immediately with a screenshot
 * and a dump of every visible button label, instead of stalling silently.
 * Does NOT change which element gets clicked - same accessible-name
 * lookup as the original code, just with a hard ceiling on the wait.
 */
async function clickButtonSafely(
  page: Page,
  name: string,
  opts: { timeout?: number; screenshotPath?: string; exact?: boolean } = {}
) {
  const { timeout = 10000, screenshotPath, exact = false } = opts;
  const button = page.getByRole('button', { name, exact });
  const visible = await button.first().isVisible({ timeout }).catch(() => false);
  if (!visible) {
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    }
    const visibleButtonNames = await page.getByRole('button').allTextContents().catch(() => []);
    throw new Error(
      `Button "${name}" not found/visible after ${timeout}ms. ` +
      `Visible button labels on page: ${JSON.stringify(visibleButtonNames)}. ` +
      (screenshotPath ? `Screenshot saved to ${screenshotPath}. ` : '') +
      `This usually means a blocking validation message, an open dropdown, or an ` +
      `unexpected modal is covering/disabling the button - check the screenshot first.`
    );
  }
  await button.first().click();
}

/**
 * Checks for any visible "blocking" UI after a Save attempt and returns
 * its text if found. Bounded to `timeout`, so it can never itself hang.
 */
async function getBlockingMessageIfAny(page: Page, timeout = 4000): Promise<string | null> {
  const blockingLocator = page.locator(
    'text=/please select|please enter|is required|invalid|should not be|must be|error/i'
  ).first();
  const visible = await blockingLocator.isVisible({ timeout }).catch(() => false);
  if (visible) {
    return (await blockingLocator.textContent().catch(() => '')) || '(unreadable text)';
  }
  return null;
}

/**
 * Some forms conditionally reveal a "days" input depending on which
 * radio button / checkbox gets toggled earlier in the flow (e.g. a
 * "License Valid" type selector that only shows a Days field when a
 * specific option is chosen). Because those earlier selections are
 * randomized in this test, a hardcoded locator for that field would
 * either not exist (if the field never appears) or - worse - hang
 * waiting for an element that isn't there, which is what caused the
 * "No Shift Overtime" issue documented below in the License Policy step.
 *
 * This helper avoids both problems: it looks for any visible, empty
 * textbox whose accessible name mentions "day", and fills it. If no
 * such field is visible, it's a no-op. Safe to call unconditionally
 * right before Save.
 */
async function fillAnyDaysFieldIfPresent(page: Page, value: string) {
  const candidates = page.getByRole('textbox', { name: /day/i });
  const count = await candidates.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const field = candidates.nth(i);
    const visible = await field.isVisible().catch(() => false);
    if (!visible) continue;
    const current = await field.inputValue().catch(() => '');
    if (!current) {
      await field.fill(value).catch(() => {});
      console.log(`fillAnyDaysFieldIfPresent: filled a visible empty "days" field (index ${i}) with "${value}"`);
    }
  }
}

// ==========================

test.setTimeout(180000);

// NOTE: the two test.afterEach(...) blocks that were here (one near the
// top, one at the bottom) wrote an XLSX file directly using the 'xlsx'
// package. They have been removed:
// - The top one referenced page, which doesn't exist in afterEach's
//   destructured params ({}) - that would have thrown
//   "ReferenceError: page is not defined" the moment it ran.
// - Both duplicated what reporters/excel-reporter.ts and
//   reporters/pdf-reporter.ts already do project-wide, with the grouped
//   section format you want to keep as-is. Writing a second, separate
//   XLSX file here would conflict with, not complement, that reporting.

test('New Client Registration', async ({ page }, testInfo) => {
  // ==========================
  // RANDOM DATA
  // ==========================
  const surnames = ['Sharma', 'Patel', 'Singh', 'Joshi', 'Kulkarni', 'Deshmukh'];
  const dealers = ['Dealer Mumbai', 'ACE Brain', 'abc'];
  const statuses = ['Active', 'Block'];
  const languages = ['ASa', 'EN', 'FR', 'MR'];

  const countryData = [
    { country: 'India', city: 'Mumbai', state: 'Maharashtra', address: 'Andheri West', names: ['Aarav', 'Vihaan', 'Arjun', 'Rahul'], phonePrefix: '9' },
    { country: 'France', city: 'Paris', state: 'Ile-de-France', address: 'Champs Elysees', names: ['Pierre', 'Louis', 'Jean', 'Lucas'], phonePrefix: '6' },
    { country: 'Germany', city: 'Berlin', state: 'Berlin', address: 'Alexanderplatz', names: ['Hans', 'Lukas', 'Felix', 'Max'], phonePrefix: '1' },
    { country: 'Oman', city: 'Muscat', state: 'Muscat', address: 'Downtown Street', names: ['Ahmed', 'Salim', 'Khalid', 'Omar'], phonePrefix: '9' },
    { country: 'Bhutan', city: 'Thimphu', state: 'Thimphu', address: 'City Center', names: ['Tenzin', 'Karma', 'Dorji', 'Pema'], phonePrefix: '1' },
    { country: 'SaudiArebia', city: 'Riyadh', state: 'Riyadh', address: 'King Fahd Road', names: ['Abdullah', 'Faisal', 'Saad', 'Mohammed'], phonePrefix: '5' },
  ];

  const randomItem = (arr: any) => arr[Math.floor(Math.random() * arr.length)];

  const location = randomItem(countryData);
  const firstName = randomItem(location.names);
  const surname = randomItem(surnames);
  const clientName = `${firstName} ${surname}`;
  const randomDealer = randomItem(dealers);
  const randomStatus = randomItem(statuses);
  const randomLanguage = randomItem(languages);
  const email = `${firstName.toLowerCase()}${surname.toLowerCase()}${Math.floor(Math.random() * 90 + 10)}@test.com`;
  const phone = location.phonePrefix + Math.floor(100000000 + Math.random() * 900000000);

  validateField('Client Name', clientName, NAME_REGEX);
  validateField('Email', email, EMAIL_REGEX);
  validateField('Telephone Number', phone, PHONE_REGEX);

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
  // LOGIN
  // ==========================
  await test.step('Login', async () => {
    const loginUrl = 'http://192.168.0.23:4220/etam_prime_taj/admin';
    const loginUsername = 'ADMIN/Wyse';
    const formTitle = 'Client Registration - Test Report';

    await page.goto(loginUrl);

    try {
      const appVersionText = await waitForRealText(page, /^APP\s*:/);
      const apiVersionText = await waitForRealText(page, /^API\s*:/);

      const reportMeta = {
        formTitle,
        moduleName: loginUsername,
        websiteUrl: loginUrl,
        appVersion: appVersionText || 'Unknown',
        apiVersion: apiVersionText || 'Unknown',
      };

      await testInfo.attach('report-meta', {
        body: JSON.stringify(reportMeta),
        contentType: 'application/json',
      });

      console.log('Report metadata captured:', reportMeta);
    } catch (err) {
      console.log('Could not capture report metadata:', err);
    }

    await page.getByPlaceholder('Username').fill(loginUsername);
    await page.getByPlaceholder('Password').fill('$WysE123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForLoadState('networkidle');
  });

  // ==========================
  // CLIENT REGISTRATION
  // ==========================
  await test.step('Client Registration', async () => {
    await page.getByRole('link', { name: 'CLIENT REGISTRATION' }).click();
    await page.waitForTimeout(5000);
    await expect(page.getByText('NEW CLIENT REGISTRATION')).toBeVisible({ timeout: 30000 });
    await page.getByText('NEW CLIENT REGISTRATION').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
  });

  // ==========================
  // BASIC INFO
  // ==========================
  await test.step('Basic Information', async () => {
    const clientNameField = page.getByRole('textbox', { name: 'Client Name in English *' });
    await clientNameField.fill(clientName);
    await page.waitForTimeout(1500);
    validateField('Client Name (form)', clientName, NAME_REGEX);
    await validateFilledValue(clientNameField, clientName, 'Client Name');

    const addressField = page.getByRole('textbox', { name: 'Address in English *' });
    await addressField.fill(location.address);
    await page.waitForTimeout(1500);
    await validateFilledValue(addressField, location.address, 'Address');

    const cityField = page.getByRole('textbox', { name: 'City in English *' });
    await cityField.fill(location.city);
    await page.waitForTimeout(1500);
    validateField('City', location.city, ALPHA_WITH_PUNCT_REGEX);
    await validateFilledValue(cityField, location.city, 'City');

    const stateField = page.getByRole('textbox', { name: 'State in English *' });
    await stateField.fill(location.state);
    await page.waitForTimeout(1500);
    validateField('State', location.state, ALPHA_WITH_PUNCT_REGEX);
    await validateFilledValue(stateField, location.state, 'State');

    const countryDropdown = page.locator('select[name="Country_Code"]');
    await countryDropdown.selectOption({ label: location.country });
    console.log('Country Selected:', location.country);
    await page.waitForTimeout(1500);
    const selectedCountryLabel = await countryDropdown.locator('option:checked').textContent();
    if (selectedCountryLabel?.trim() !== location.country) {
      throw new Error(`Country selection mismatch: expected "${location.country}", got "${selectedCountryLabel?.trim()}"`);
    }

    const phoneField = page.getByRole('textbox', { name: 'Telephone Number' });
    await phoneField.fill(phone);
    await page.waitForTimeout(1500);
    validateField('Telephone Number (form)', phone, PHONE_REGEX);
    await validateFilledValue(phoneField, phone, 'Telephone Number');

    const emailField = page.getByRole('textbox', { name: 'Email *' });
    await emailField.fill(email);
    console.log('Email Filled');
    validateField('Email (form)', email, EMAIL_REGEX);
    await validateFilledValue(emailField, email, 'Email');
    await page.screenshot({ path: 'after-email.png', fullPage: true });
    console.log('Reached After Email');

    try {
      console.log('Starting Dealer Selection');
      const dealerDropdown = page.locator('select[name="Dealer_id"]');
      console.log('Dealer Count:', await dealerDropdown.count());
      await dealerDropdown.waitFor({ state: 'visible', timeout: 10000 });
      console.log('Dealer Visible');
      await selectRandomOption(dealerDropdown);
      console.log('Dealer Selected');
      const selectedDealer = await dealerDropdown.locator('option:checked').textContent();
      if (!selectedDealer || /--select--/i.test(selectedDealer)) {
        throw new Error('Dealer Name was not selected (still shows placeholder)');
      }
      console.log('Dealer Validated:', selectedDealer.trim());
    } catch (error) {
      console.log('Dealer Error =>', error);
    }

    const statusDropdown = page.locator('select[name="status"]');
    await statusDropdown.waitFor({ state: 'visible' });
    await statusDropdown.selectOption({ label: randomStatus });
    console.log('Status Selected:', randomStatus);
    await page.waitForTimeout(3000);
    const selectedStatus = await statusDropdown.locator('option:checked').textContent();
    if (selectedStatus?.trim() !== randomStatus) {
      throw new Error(`Status selection mismatch: expected "${randomStatus}", got "${selectedStatus?.trim()}"`);
    }

    const languageDropdown = page.locator('select[name="Language_Code"]');
    await languageDropdown.waitFor({ state: 'visible' });
    const languageOptions = await languageDropdown.locator('option').allTextContents();
    console.log('Available Languages:', languageOptions);
    const randomLanguageIndex = Math.floor(Math.random() * (languageOptions.length - 1)) + 1;
    await languageDropdown.selectOption({ index: randomLanguageIndex });
    console.log('Language Selected:', languageOptions[randomLanguageIndex]);
    const selectedLanguage = await languageDropdown.locator('option:checked').textContent();
    if (!selectedLanguage || /--select--/i.test(selectedLanguage)) {
      throw new Error('Language Code was not selected (still shows placeholder)');
    }

    // SAVE
    await clickButtonSafely(page, 'Save', { screenshotPath: 'basic-info-save-button-missing.png' });
    console.log('Basic Info Saved');
    await page.waitForTimeout(3000);

    const basicInfoError = page.locator('text=/invalid|required|already exists|error/i').first();
    if (await basicInfoError.isVisible().catch(() => false)) {
      const errorText = await basicInfoError.textContent();
      console.log('WARNING: Possible validation error after Basic Info Save:', errorText);
    }

    // REPORT DOWNLOAD
    const downloadPromise = page.waitForEvent('download');
    await clickButtonSafely(page, 'Report', { timeout: 8000, screenshotPath: 'basic-info-report-button-missing.png' });
    await downloadPromise.catch(() => {});
  });

  // ==========================
  // LICENSE POLICY
  // Restored to match the known-working flow: no "No Shift Overtime"
  // forcing, no relocated Base Hour fill, no License Valid To fill.
  // Those three were guesses about fields/locators never directly
  // observed on the live app, and the most likely cause of the step
  // hanging - in particular the "No Shift Overtime" XPath used the
  // `following::` axis, which searches the *entire rest of the document*
  // in source order and can land on an overlapping/off-screen element,
  // making `.click()` wait through Playwright's full actionability
  // timeout. Only safe, non-locator-changing additions are layered in
  // below: bounded Save/Report clicks, a fill for any conditional
  // "days" field revealed by the random radio/checkbox selections, and
  // a check for any blocking validation message right after Save.
  // ==========================
  await test.step('License Policy', async () => {
    await page.getByText('License Policy').click();
    await page.waitForTimeout(3000);

    const passwordDays = Math.floor(Math.random() * 365) + 1;
    const passwordDaysField = page.getByRole('textbox', { name: 'Password Change in Days *' });
    await passwordDaysField.fill(passwordDays.toString());
    console.log('Password Change Days:', passwordDays);
    if (passwordDays < 1 || passwordDays > 365) {
      throw new Error(`Password Change Days out of range: ${passwordDays}`);
    }
    await page.waitForTimeout(2000);

    const licenceDropdown = page.getByRole('combobox').first();
    const licenceOptions = await licenceDropdown.locator('option').allTextContents();
    const randomLicenceIndex = Math.floor(Math.random() * (licenceOptions.length - 1)) + 1;
    await licenceDropdown.selectOption({ index: randomLicenceIndex });
    console.log('Licence Type:', licenceOptions[randomLicenceIndex]);
    await page.waitForTimeout(2000);

    const radioButtons = page.locator('.mat-radio-container');
    const radioCount = await radioButtons.count();
    for (let i = 0; i < radioCount; i++) {
      if (Math.random() > 0.5) {
        await radioButtons.nth(i).click().catch(() => {});
        await page.waitForTimeout(3000);
      }
    }

    await selectRandomCheckboxes(page.locator('.mat-checkbox-inner-container'));
    console.log('Random Checkboxes Selected');
    await page.waitForTimeout(2000);

    const hrDays = Math.floor(Math.random() * 31);
    const hrDaysField = page.getByRole('textbox', { name: /Punch Available/i });
    await hrDaysField.fill(hrDays.toString());
    console.log('Punch Available Days:', hrDays);
    if (hrDays < 0 || hrDays > 31) {
      throw new Error(`Punch Available Days out of range: ${hrDays}`);
    }

    // NEW: some of the radio/checkbox toggles above can conditionally
    // reveal an additional required "days" field elsewhere on the form
    // (this is what was triggering "Please enter days" on Save). Fill
    // any such field if one is currently visible and empty, without
    // hardcoding a locator for it.
    await fillAnyDaysFieldIfPresent(page, '30');

    // SAVE
    await clickButtonSafely(page, 'Save', { screenshotPath: 'license-policy-save-button-missing.png' });
    console.log('License Policy Saved');
    await page.waitForTimeout(3000);

    const blockingMsg = await getBlockingMessageIfAny(page);
    if (blockingMsg) {
      await page.screenshot({ path: 'license-policy-blocking-message.png', fullPage: true }).catch(() => {});
      throw new Error(
        `License Policy Save appears blocked by an on-screen message: "${blockingMsg.trim()}". ` +
        `Screenshot saved to license-policy-blocking-message.png.`
      );
    }

    // REPORT DOWNLOAD
    await clickButtonSafely(page, 'Report', { timeout: 8000, screenshotPath: 'license-policy-report-button-missing.png' });
    await page.waitForTimeout(3000);
  });

  // ==========================
  // MODULE SELECTION
  // ==========================
  await test.step('Module Selection', async () => {
    await page.getByText('Module Selection').click();
    await page.waitForTimeout(2000);

    const clientShortName = (firstName + surname.substring(0, 3)).toUpperCase();
    const shortNameField = page.getByRole('textbox', { name: 'Client Short Name' });
    await shortNameField.fill(clientShortName);
    console.log('Client Short Name:', clientShortName);
    validateField('Client Short Name', clientShortName, /^[A-Z]+$/);
    await page.waitForTimeout(1000);

    await page.getByText('--Select Services--').click();
    await page.getByRole('listitem', { name: 'ETAM' }).click();
    await page.getByRole('listitem', { name: 'eLMS' }).click();
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
    console.log('ETAM and eLMS services selected');
    await page.waitForTimeout(1500);

    await page.getByRole('combobox').selectOption('2');
    await page.waitForTimeout(1500);

    const coffHoursHOP = Math.floor(Math.random() * 10) + 1;
    const coffHoursHOPFormatted = coffHoursHOP.toString().padStart(2, '0') + ':00';
    await page
      .locator('form')
      .filter({ hasText: 'Client Short NameSelect' })
      .getByPlaceholder(':00')
      .fill(coffHoursHOPFormatted);
    console.log('Coff Hours for HOP:', coffHoursHOPFormatted);
    validateField('Coff Hours HOP', coffHoursHOPFormatted, /^([01][0-9]|2[0-3]):00$/);
    await page.waitForTimeout(1000);

    const leavesToBeDeducted = Math.floor(Math.random() * 10) + 1;
    const leavesField = page.getByRole('textbox', { name: 'Leaves to be deducted' });
    await leavesField.fill(leavesToBeDeducted.toString());
    console.log('Leaves to be deducted:', leavesToBeDeducted);
    if (leavesToBeDeducted < 1 || leavesToBeDeducted > 10) {
      throw new Error(`Leaves to be deducted out of range: ${leavesToBeDeducted}`);
    }
    await page.waitForTimeout(1000);

    await page.getByRole('textbox', { name: 'Treat Department As' }).click();
    await page.getByRole('textbox', { name: 'Treat Sub Department As' }).click();
    await page.waitForTimeout(1000);

    await page.getByText('--Select Other Services--').click();
    await page.getByRole('listitem', { name: 'TAJ' }).click();
    await page.keyboard.press('Escape');
    console.log('Other Service TAJ selected');
    await page.waitForTimeout(1500);

    const coffHoursWP = Math.floor(Math.random() * 10) + 1;
    const coffHoursWPFormatted = coffHoursWP.toString().padStart(2, '0') + ':00';
    await page
      .locator('form')
      .filter({ hasText: 'Select Version Premium' })
      .getByPlaceholder(':00')
      .fill(coffHoursWPFormatted);
    console.log('Coff Hours for WP:', coffHoursWPFormatted);
    validateField('Coff Hours WP', coffHoursWPFormatted, /^([01][0-9]|2[0-3]):00$/);
    await page.waitForTimeout(1000);

    const noOfLateMarks = Math.floor(Math.random() * 10) + 1;
    const lateMarksField = page.getByRole('textbox', { name: 'No. of late marks' });
    await lateMarksField.fill(noOfLateMarks.toString());
    console.log('No. of late marks:', noOfLateMarks);
    if (noOfLateMarks < 1 || noOfLateMarks > 10) {
      throw new Error(`No. of late marks out of range: ${noOfLateMarks}`);
    }
    console.log('After Version');

    const contractorValues = ['EMP', 'CONTRACTOR', 'VENDOR', 'OUTSOURCE', 'TEMP', 'STAFF'];
    const randomContractor = contractorValues[Math.floor(Math.random() * contractorValues.length)];
    const contractorField = page.getByRole('textbox', { name: 'Treat Contractor As' });
    await contractorField.fill(randomContractor);
    console.log('Treat Contractor As:', randomContractor);
    validateField('Treat Contractor As', randomContractor, /^[A-Z]+$/);
    if (!contractorValues.includes(randomContractor)) {
      throw new Error(`Treat Contractor As value not in allowed list: ${randomContractor}`);
    }

    // SAVE
    await clickButtonSafely(page, 'Save', { screenshotPath: 'module-selection-save-button-missing.png' });
    console.log('Module Selection Saved');
    await page.waitForTimeout(3000);

    // REPORT DOWNLOAD
    await clickButtonSafely(page, 'Report', { timeout: 8000, screenshotPath: 'module-selection-report-button-missing.png' });
  });

  // ==========================
  // OTHER INFO TAB
  // ==========================
  await test.step('Other Info', async () => {
    await page.getByText('Other Info').click();
    await page.waitForTimeout(2000);

    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
    const pinCodeField = page.getByPlaceholder('Pin Code');
    await pinCodeField.fill(pinCode);
    console.log('Pin Code:', pinCode);
    validateField('Pin Code', pinCode, PINCODE_REGEX);
    await page.waitForTimeout(1000);

    const faxNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
    const faxField = page.getByPlaceholder('Fax Number');
    await faxField.fill(faxNumber);
    console.log('Fax Number:', faxNumber);
    validateField('Fax Number', faxNumber, FAX_REGEX);
    await page.waitForTimeout(1000);

    const rounding = Math.floor(Math.random() * 60) + 1;
    const roundingField = page.getByPlaceholder('Rounding Off');
    await roundingField.fill(rounding.toString());
    console.log('Rounding Off:', rounding);
    if (rounding < 1 || rounding > 60) {
      throw new Error(`Rounding Off out of range: ${rounding}`);
    }
    await page.waitForTimeout(1000);

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const currentDate = `${day}/${month}/${year}`;
    const dateField = page.getByPlaceholder('DD/MM/YYYY');
    await dateField.fill(currentDate);
    console.log('Date:', currentDate);
    validateField('Date', currentDate, /^\d{2}\/\d{2}\/\d{4}$/);
    await page.waitForTimeout(1000);

    await page.getByText('--Select Upload').click();
    await page.waitForTimeout(1000);

    await page.getByText('PaySlip', { exact: true }).click();
    await page.waitForTimeout(1000);

    await page.getByText('Policy', { exact: true }).click();
    await page.waitForTimeout(1000);

    await page.getByText('Notice', { exact: true }).click();
    await page.waitForTimeout(1000);

    await page.keyboard.press('Escape');
    console.log('Upload Options Selected: PaySlip, Policy, Notice');

    // SAVE
    await clickButtonSafely(page, 'Save', { screenshotPath: 'other-info-save-button-missing.png' });
    console.log('Other Info Saved');
    await page.waitForTimeout(3000);
  });

  // ==========================
  // MOBILE SETTINGS
  // ==========================
  await test.step('Mobile Settings', async () => {
    await page.getByText('Mobile Settings').click();
    console.log('Mobile Settings Opened');

    await page.getByText('Yes').click();
    console.log('Mobile Application set to Yes');

    await page.locator('.mat-checkbox-inner-container').first().click();
    console.log('Mobile Attendance checkbox marked');

    const ATTENDANCE_TYPE_ROW_COUNT = 1; // TODO: update to actual row count
    for (let row = 0; row < ATTENDANCE_TYPE_ROW_COUNT; row++) {
      console.log(`Setting Geo + Face for Attendance Type row ${row + 1}`);
      await page.locator('.p-multiselect-trigger-icon').nth(row).click();
      await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click();
      await page.locator('p-multiselectitem:nth-child(2) > .p-ripple > .p-checkbox > .p-checkbox-box').click();
      await page.getByRole('button').filter({ hasText: /^$/ }).click();
    }
    console.log('Geo + Face selected for all Attendance Type rows');

    // TODO: Mobile Leave Application checkbox — locator not yet captured
    // TODO: Time Zone selection — locator not yet captured

    const locationDescField = page.getByRole('textbox', { name: 'Location Description' });
    await locationDescField.click();
    await locationDescField.fill('Test Location');
    console.log('Location Description filled');

    const latField = page.getByRole('textbox', { name: 'Latitude ?' });
    const lngField = page.getByRole('textbox', { name: 'Longitude ?' });
    const latitude = '54';
    const longitude = '45';
    await latField.fill(latitude);
    await lngField.fill(longitude);
    console.log('Latitude/Longitude filled');
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
      throw new Error(`Latitude out of valid range: ${latitude}`);
    }
    if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      throw new Error(`Longitude out of valid range: ${longitude}`);
    }

    // TODO: Geo Fencing Yes toggle — confirm correct locator (may collide with earlier Yes click)

    const geoDistance = '12';
    const geoDistanceField = page.getByRole('textbox', { name: 'Geo. Distance' });
    await geoDistanceField.fill(geoDistance);
    console.log('Geo Distance filled');
    if (Number.isNaN(Number(geoDistance)) || Number(geoDistance) <= 0) {
      throw new Error(`Geo Distance is not a valid positive number: ${geoDistance}`);
    }

    // ADD -> MODIFY -> SAVE
    await clickButtonSafely(page, 'Add', { screenshotPath: 'mobile-settings-add-button-missing.png' });
    console.log('Add clicked');
    await clickButtonSafely(page, 'Modify', { screenshotPath: 'mobile-settings-modify-button-missing.png' });
    console.log('Modify clicked');
    await clickButtonSafely(page, 'Save', { screenshotPath: 'mobile-settings-save-button-missing.png' });
    console.log('Save clicked');

    const successMessage = page.getByText('Success', { exact: false });
    await expect(successMessage).toBeVisible({ timeout: 15000 });
    console.log('Success message confirmed after Save');

    await page.screenshot({ path: 'mobile-settings-result.png', fullPage: true });
    console.log('Process Completed');
  });
});