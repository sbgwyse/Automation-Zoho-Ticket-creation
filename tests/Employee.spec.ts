import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { EmployeeDataModificationPage } from '../pages/EmployeeDataModificationPage';
 
// const VALID_USERNAME = process.env.ETAM_USERNAME as string;
// const VALID_PASSWORD = process.env.ETAM_PASSWORD as string;
 
const VALID_USERNAME = 'ADMIN/etam100';
const VALID_PASSWORD = '$WysE123';
const TEST_EMPLOYEE_SEARCH = '100';
const TEST_EMPLOYEE_RESULT = 'Shiv Kumar';
 
test.describe('Employee Data Modification', () => {
  test.describe.configure({ mode: 'serial' });
 
  let login: LoginPage;
  let empData: EmployeeDataModificationPage;
 
  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    empData = new EmployeeDataModificationPage(page);
 
    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await login.expectLoggedIn();
 
    await empData.selectSubForm('Employee Data Modification');
   await page.waitForTimeout(5000);
  });
 
  test.describe('Employee selection is mandatory first', () => {
    test('Check button is not usable without an employee selected first', async () => {
      const isVisible = await empData.checkButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(empData.checkButton).toBeDisabled();
      } else {
        await expect(empData.checkButton).not.toBeVisible();
      }
    });
 
    test('searching and selecting an employee commits the selection', async () => {
      await empData.searchAndSelectEmployee(TEST_EMPLOYEE_SEARCH, TEST_EMPLOYEE_RESULT);
    });
 
    test('selecting an employee from the typed dropdown updates the form details', async () => {
      await empData.selectEmployeeAndExpectDetailsToChange(TEST_EMPLOYEE_SEARCH, TEST_EMPLOYEE_RESULT);
    });
  });
 
  test.describe('Field validation (after employee selected)', () => {
    test.beforeEach(async () => {
      await empData.searchAndSelectEmployee(TEST_EMPLOYEE_SEARCH, TEST_EMPLOYEE_RESULT);
    });
 
    test('Employee Name is read-only and reflects the selected employee', async () => {
      await expect(empData.employeeNameInput).toHaveAttribute('readonly', '');
      await expect(empData.employeeNameInput).not.toHaveValue('');
    });
 
    test('Alphanumeric ID is read-only and reflects the selected employee', async () => {
      await expect(empData.alphanumericIdInput).toHaveAttribute('readonly', '');
    });
 
    // test('Check succeeds after employee is selected', async () => {
    //   await empData.selectGender('Male');
    //   await empData.clickCheck();
    //   await empData.closeCheckDialog();
    // });
  });
 
  test.describe('Modify flow', () => {
    test('Modify opens the Employee Attendance tab without error', async () => {
      await empData.searchAndSelectEmployee(TEST_EMPLOYEE_SEARCH, TEST_EMPLOYEE_RESULT);
      await empData.clickModify();
      await empData.openEmployeeAttendanceTab();
      await expect(empData.employeeAttendanceTab).toBeVisible();
    });
  });
});
 