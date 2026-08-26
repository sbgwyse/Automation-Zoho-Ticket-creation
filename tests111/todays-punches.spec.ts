import { test, expect } from '@playwright/test';

test('Get Today Punches Data', async ({ page }) => {
  test.setTimeout(120000);

  // 1. Login
  await page.goto('https://presence.attendanceportal.com/etam_prime/login');

  await page.getByPlaceholder('Username').fill('ADMIN/etam492');
  await page.getByPlaceholder('Password').fill('$WysE123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // 2. Wait for dashboard load
  await page.waitForLoadState('networkidle');

  // 3. Click "Todays Punches" safely
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.getByText(/todays punches/i).click(),
  ]);

  // 4. Wait for table rows (stable wait)
  await page.waitForSelector('table tbody tr', { timeout: 60000 });

  // 5. Extract data
  const punches = await page.$$eval('table tbody tr', rows => {
    return rows.map(row => {
      const cols = row.querySelectorAll('td');

      return {
        employee: cols[0]?.textContent?.trim() || '',
        punchIn: cols[1]?.textContent?.trim() || '',
        punchOut: cols[2]?.textContent?.trim() || '',
        status: cols[3]?.textContent?.trim() || '',
      };
    });
  });

  // 6. Output
  console.log('Today Punch Data:', punches);

  // 7. Validation
  expect(punches.length).toBeGreaterThan(0);
});