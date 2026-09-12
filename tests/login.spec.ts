import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { LoginPage } from '../pages/LoginPage';

dotenv.config();

const validUsername = process.env.ETAM_USERNAME;
const validPassword = process.env.ETAM_PASSWORD;


if (!validUsername || !validPassword) {
  throw new Error(
    `ETAM_USERNAME or ETAM_PASSWORD is missing from the .env file.\n` +
    `Resolved cwd: ${process.cwd()}\n` +
    `ETAM_USERNAME present: ${!!validUsername}, ETAM_PASSWORD present: ${!!validPassword}\n` +
    `Make sure a .env file exists at the project root (same folder as playwright.config.ts) ` +
    `with lines like:\n  ETAM_USERNAME=your_username\n  ETAM_PASSWORD=your_password`
  );
}

test.describe('Login', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Validation errors', () => {

    test('shows an error when username is empty', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.fillUsername('');
      await loginPage.fillPassword(validPassword);
      await loginPage.submit();

      // TODO: replace with the actual validation message / locator ETAM shows
      await expect(page.getByText(/username.*required/i)).toBeVisible();
    });

    test('shows an error when password is empty', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.fillUsername(validUsername);
      await loginPage.fillPassword('');
      await loginPage.submit();

      // TODO: replace with the actual validation message / locator ETAM shows
      await expect(page.getByText(/password.*required/i)).toBeVisible();
    });

  });

  test.describe('Wrong credentials', () => {

    test('rejects an incorrect username', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.login(
        'wrong_username',
        validPassword
      );

      // TODO: replace with the actual "invalid credentials" message ETAM shows
      await expect(page.getByText(/invalid.*(username|credentials)/i)).toBeVisible();
    });

  });

  test('successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login(
      validUsername,
      validPassword
    );

    // TODO: replace with the real post-login URL or dashboard element
    await expect(page).toHaveURL(/dashboard/i);
  });

});