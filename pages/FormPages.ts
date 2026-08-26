import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the form under test.
 *
 * HOW TO WIRE THIS UP TO YOUR REAL FORM:
 * 1. Run `npx playwright codegen <your-form-url>` to record real selectors.
 * 2. Replace the locators below with the ones codegen gives you
 *    (prefer getByLabel / getByRole / getByTestId over CSS selectors).
 * 3. Update the field list / methods to match your actual form fields.
 */
export class FormPage {
  readonly page: Page;

  // --- Locators (placeholders — replace with real ones from codegen) ---
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly phoneInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;

  // Error message locators — adjust to how your app renders validation errors
  readonly nameError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordError: Locator;
  readonly phoneError: Locator;
  readonly termsError: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nameInput = page.getByLabel('Name', { exact: false });
    this.emailInput = page.getByLabel('Email', { exact: false });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.phoneInput = page.getByLabel('Phone', { exact: false });
    this.termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
    this.submitButton = page.getByRole('button', { name: /submit|register|sign up/i });

    this.nameError = page.getByTestId('name-error');
    this.emailError = page.getByTestId('email-error');
    this.passwordError = page.getByTestId('password-error');
    this.confirmPasswordError = page.getByTestId('confirm-password-error');
    this.phoneError = page.getByTestId('phone-error');
    this.termsError = page.getByTestId('terms-error');
    this.successMessage = page.getByTestId('success-message');
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  async fillName(value: string) {
    await this.nameInput.fill(value);
  }

  async fillEmail(value: string) {
    await this.emailInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async fillConfirmPassword(value: string) {
    await this.confirmPasswordInput.fill(value);
  }

  async fillPhone(value: string) {
    await this.phoneInput.fill(value);
  }

  async acceptTerms() {
    await this.termsCheckbox.check();
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Convenience helper to fill the whole form in one call */
  async fillForm(data: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    acceptTerms?: boolean;
  }) {
    if (data.name !== undefined) await this.fillName(data.name);
    if (data.email !== undefined) await this.fillEmail(data.email);
    if (data.password !== undefined) await this.fillPassword(data.password);
    if (data.confirmPassword !== undefined) await this.fillConfirmPassword(data.confirmPassword);
    if (data.phone !== undefined) await this.fillPhone(data.phone);
    if (data.acceptTerms) await this.acceptTerms();
  }

  async expectSuccess() {
    await expect(this.successMessage).toBeVisible();
  }
}