import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly loginErrorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.loginErrorMessage = page.locator('.error, .toast-error, [role="alert"]').first();
  }

  async goto() {
    await this.page.goto('https://presence.tajhotels.com/etam_prime/login');
  }

  async fillUsername(value: string) {
    await this.usernameInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async submit() {
    await this.signInButton.click();
  }

  async login(username: string, password: string) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async expectDashboardVisible() {
    await expect(this.page.locator('mat-sidenav-container')).toBeVisible();
  }
}
