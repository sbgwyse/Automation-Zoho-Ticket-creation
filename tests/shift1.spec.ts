    import { test, expect } from '@playwright/test';
    
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