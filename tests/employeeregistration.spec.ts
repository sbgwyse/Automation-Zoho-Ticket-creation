import { test, expect, Page } from '@playwright/test';

import { LoginPage } from '../pages/LoginPage';
import { RegistrationFormsPage } from '../pages/RegistrationFormsPage';

const VALID_USERNAME = 'ADMIN/etam100';
const VALID_PASSWORD = '$WysE123';

const EMPLOYEE_ID = '100100111';

test.describe('REGISTRATION', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  let login: LoginPage;
  let registration: RegistrationFormsPage;

  // Login ONLY ONCE before all tests
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    login = new LoginPage(page);
    registration = new RegistrationFormsPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await login.expectLoggedIn();

    await registration.openRegistration();
    await page.waitForTimeout(5000);
  });

  // Close page after all tests
  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Employee Data Modification', () => {

    test.beforeEach(async () => {
      await registration.selectSubForm('Employee Data Modification');
    });

    // ============================================================
    // SHIFT REGISTRATION
    // ============================================================
    test.describe('Shift Registration', () => {

      test.beforeEach(async () => {
        await registration.selectSubForm('Shift Registration');
      });

      test('Verify Shift Registration successfully', async () => {
        await registration.selectDateRange('1', '31');
        await registration.selectEmployee(EMPLOYEE_ID);
        await registration.selectShift('1 - Night Shift');
        await registration.selectDay('Monday');
        await registration.save();

        await expect(registration.okButton).toBeVisible();
        await registration.confirmOK();
      });

    test('Verify Download',async()=> 
    {
        await registration.selectDateRange('1', '31');
        await registration.selectEmployee(EMPLOYEE_ID);
        await registration.selectShift('1 - Night Shift');
        await registration.selectDay('Monday');
        
        await registration.reportButton.click();

        const downloadPromise =
          registration.page.waitForEvent('download');

        await registration.reportButton.click();

        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBeTruthy();
    });

    test('Delete Shift',async()=> 
    {
        await registration.selectDateRange('1', '31');
        await registration.selectEmployee(EMPLOYEE_ID);
        await registration.selectShift('1 - Night Shift');
        await registration.selectDay('Monday');

        await registration.delete();

        await expect(registration.okButton).toBeVisible();
        await registration.confirmOK();
    });

    });

    // ============================================================
    // OFF Policy
    // ============================================================

    test.describe('Off Policy Registration', () => {
    test.beforeEach(async () => {
      await registration.selectSubForm('Off Policy Registration');
    });
 
    test('Verify Off Policy Registration successfully', async () => {
      await registration.selectDateRange('1', '30');
      await registration.selectEmployee(EMPLOYEE_ID);
      await registration.selectPolicy('11 - 2SAT');
      await registration.save();
 
      await expect(registration.okButton).toBeVisible();
      await registration.confirmOK();
    });
 
    test('Verify PDF Report download', async () => {
      await registration.selectDateRange('1', '30');
      await registration.selectEmployee(EMPLOYEE_ID);
 
      const downloadPromise = registration.page.waitForEvent('download');
      await registration.pdfButton.click();
      const download = await downloadPromise;
 
      expect(download.suggestedFilename()).toBeTruthy();
    });
 
    test('Verify Excel Report download', async () => {
      await registration.selectDateRange('1', '30');
      await registration.selectEmployee(EMPLOYEE_ID);
 
      const downloadPromise = registration.page.waitForEvent('download');
      await registration.excelButton.click();
      const download = await downloadPromise;
 
      expect(download.suggestedFilename()).toBeTruthy();
    });
 
    test('Delete Off Policy Registration', async () => {
      await registration.selectDateRange('1', '30');
      await registration.selectEmployee(EMPLOYEE_ID);
      await registration.delete();
      await expect(registration.okButton).toBeVisible();
      await registration.confirmOK();
    });
  });

   // ============================================================
  // SHIFT ROUNDING
  // ============================================================
  test.describe('Shift Rounding', () => {
    test.beforeEach(async () => {
      await registration.selectSubForm('Shift Rounding');
    });
 
    test('Verify Shift Rounding successfully', async () => {
      await registration.selectRoundingShift('1 - Night Shift');
      await registration.fillGraceTimes({
        ingraceOvertime: '10',
        outgrace: '15',
        lateUpto: '10',
        earlyGo: '10',
        shiftGrace: '15',
        hhmm: '18:30',
      });
      await registration.save();
 
      await expect(registration.saveButton).toBeVisible();
    });
  });

  });
});
