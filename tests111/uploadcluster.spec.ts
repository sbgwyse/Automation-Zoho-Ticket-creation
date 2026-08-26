
import { test, expect } from '@playwright/test';

test('Login Test', async ({ page }) => {
  await page.goto('http://192.168.0.23:4220/etam_prime_taj/login');

  await page.getByPlaceholder('Username').fill('ADMIN/Wyse');

  // Replace with actual password locator
  await page.getByPlaceholder('Password').fill('$WysE123');

  // Replace with actual login button locator
 await page.getByRole('button', { name: 'Sign In' }).click();
});