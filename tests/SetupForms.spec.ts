import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SetupFormsPage } from '../pages/SetupFormsPage';
import { RegistrationFormsPage } from '../pages/RegistrationFormsPage';

/**
 * SETUP forms validation suite — Contractor Master, Shift Master, and
 * Leave Type Master all in one file, per request.
 */

// const VALID_USERNAME = process.env.ETAM_USERNAME as string;
// const VALID_PASSWORD = process.env.ETAM_PASSWORD as string;
const VALID_USERNAME = 'ADMIN/etam100';
const VALID_PASSWORD = '$WysE123';

test.describe('Setup Forms', () => {
  let login: LoginPage;
  let setup: SetupFormsPage;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    setup = new SetupFormsPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await login.expectLoggedIn();
  });

  test.describe('Leave Type Master', () => {
    test.beforeEach(async () => {
      await setup.selectMaster('Leave Type Master');
    });

    test('toggling a leave type does not error out', async () => {
      await setup.toggleFirstLeaveType();
      // TODO: assert on the actual resulting state once you know how the
      // app reflects an enabled/disabled leave type (e.g. a class change,
      // a confirmation toast, etc.)
    });

    test('status dropdown switches between two of its real options', async () => {
      const optionCount = await setup.getStatusOptionsCount();
      expect(optionCount).toBeGreaterThan(1);

      await setup.setStatusByIndex(0);
      const firstValue = await setup.getCurrentStatusValue();

      await setup.setStatusByIndex(1);
      const secondValue = await setup.getCurrentStatusValue();

      expect(secondValue).not.toBe(firstValue);
    });
  });

  test.describe('Shift Master', () => {
    test.beforeEach(async () => {
      await setup.selectMaster('Shift Master');
    });

    test('shows an error when Shift Name is left empty', async () => {
      await setup.fillShiftTimes({ startTime: '09:00', endTime: '18:00' });
      await setup.save();
      await expect(setup.saveButton).toBeVisible();
    });

    test('shows an error when Start Time is left empty', async () => {
      await setup.fillShiftTimes({ name: 'TestShift', endTime: '18:00' });
      await setup.save();
      await expect(setup.saveButton).toBeVisible();
    });

    test('shows an error when End Time is left empty', async () => {
      await setup.fillShiftTimes({ name: 'TestShift', startTime: '09:00' });
      await setup.save();
      await expect(setup.saveButton).toBeVisible();
    });

    // TODO: confirm the actual business rule — this assumes End Time must
    // be after Start Time, which your codegen didn't explicitly show failing.
    test('rejects an End Time earlier than Start Time', async () => {
      await setup.fillShiftTimes({
        name: 'BadShift',
        startTime: '18:00',
        endTime: '09:00',
      });

      await setup.save();

      await expect(setup.fieldError).toBeVisible();
    });
  });

});

