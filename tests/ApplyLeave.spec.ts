import { test, expect } from '@playwright/test';

// Widen the viewport so the date-range popup (which renders two full
// calendar months side by side) fits entirely on screen. Without this,
// Playwright can locate the correct day cell but fail to click it because
// it's positioned outside the visible browser window.
test.use({ viewport: { width: 1600, height: 1000 } });

test('Apply/Cancel Leave - submit leave for an employee', async ({ page }) => {
  // --- Login ---
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // --- Navigate to ELMS > Apply/Cancel Leave ---
  await page.getByText('ELMS').click();
  await page.getByRole('combobox').selectOption('Apply/Cancel Leave');

  const employeeInput = page.locator('input[name="employees"]');
  await employeeInput.click();
  await employeeInput.pressSequentially('500100444', { delay: 100 });
  const employeeOption = page.getByText('500100444 - Smita Joshi', { exact: true });
  await employeeOption.waitFor({ state: 'visible', timeout: 20000 });
  await employeeOption.click();

  // --- Leave Type ---
  await page.locator('select[name="selectedLeave"]').selectOption('2');

  // --- Date range ---
  // This is an ngx-bootstrap datepicker (confirmed by the
  // "bsdatepickerdaydecorator" attribute in the failure log). Its real
  // day cells are <span bsDatepickerDayDecorator>, and greyed-out days
  // from the adjacent month carry a genuine "is-other-month" class —
  // so we can exclude them precisely instead of guessing .nth() indices.
  // We also scope by the visible month name ("July") since both the left
  // and right calendars have their own real (non-"other-month") day cells.
  await page.getByRole('textbox', { name: 'Select Date Range' }).click();

  const julyCalendar = page.locator('bs-days-calendar-view', { hasText: 'July' });
  const dayCell = (day: string) =>
    julyCalendar.locator('span[bsdatepickerdaydecorator]:not(.is-other-month)', {
      hasText: new RegExp(`^${day}$`),
    });

  await dayCell('1').first().scrollIntoViewIfNeeded();
  await dayCell('1').first().click(); // start date
  await dayCell('2').first().scrollIntoViewIfNeeded();
  await dayCell('2').first().click(); // end date

  // --- Submit ---
  await page.getByRole('button', { name: 'Submit Leave' }).click();

  // Optional: assert a success indicator appears after submission.
  // await expect(page.getByText('Leave applied successfully')).toBeVisible();
});