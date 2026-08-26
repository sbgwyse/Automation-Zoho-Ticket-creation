import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Cluster HR Upload - Download Format With Data', async ({ page }) => {

  // Login
  await page.goto('http://192.168.0.23:4220/etam_prime_taj/login');

  await page.getByPlaceholder('Username').fill('ADMIN/Wyse');
  await page.getByPlaceholder('Password').fill('$WysE123');

  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for dashboard
  await page.waitForLoadState('networkidle');

  // Click CLUSTER HR UPLOAD from left menu
  await page.getByText('CLUSTER HR UPLOAD', { exact: false }).click();

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Start download listener
  const downloadPromise = page.waitForEvent('download', {
    timeout: 60000
  });

  // Click Download Format With Data
  await page.getByText('DOWNLOAD FORMAT WITH DATA', {
    exact: false
  }).click();

  const download = await downloadPromise;

  // Create downloads folder
  if (!fs.existsSync('downloads')) {
    fs.mkdirSync('downloads');
  }

  const filePath = `downloads/${download.suggestedFilename()}`;

  await download.saveAs(filePath);

  console.log('Downloaded:', filePath);

  expect(fs.existsSync(filePath)).toBeTruthy();
});