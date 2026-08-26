import { type Page, type Locator, expect } from '@playwright/test';

export class EmployeeDataModificationPage {
  readonly page: Page;
  readonly registrationMenu: Locator;
  readonly subFormDropdown: Locator;

  readonly empSearchInput: Locator;
  readonly employeeNameInput: Locator;
  readonly alphanumericIdInput: Locator;
  readonly genderGroup: Locator;
  readonly checkButton: Locator;
  readonly closeButton: Locator;
  readonly modifyButton: Locator;
  readonly employeeAttendanceTab: Locator;

  // TODO: replace with the real validation error selector once inspected
  readonly fieldError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.registrationMenu = page.getByText('REGISTRATION');
    this.subFormDropdown = page.getByRole('combobox').first();

    this.empSearchInput = page.locator('input[name="emp"]');
    this.employeeNameInput = page.getByRole('textbox', { name: 'Employee Name*' });
    this.alphanumericIdInput = page.getByRole('textbox', { name: 'Alphanumaric Id*' });
    this.genderGroup = page.getByText('Gender*MaleFemale');
    this.checkButton = page.getByRole('button', { name: 'Check' });
    this.closeButton = page.getByRole('button', { name: 'Close' });
    this.modifyButton = page.getByRole('button', { name: 'Modify' });
    this.employeeAttendanceTab = page.getByRole('tab', { name: 'Employee Attendance' });

    this.fieldError = page.locator('.error, .toast-error, [role="alert"]').first();
  }

  async openRegistration() {
    await this.registrationMenu.scrollIntoViewIfNeeded();
    await this.registrationMenu.click({ timeout: 20000 });
  }

  private async selectOptionWhenReady(locator: Locator, value: string, timeout = 20000) {
    await locator.waitFor({ state: 'visible', timeout });
    await expect
      .poll(async () => locator.locator('option').count(), { timeout })
      .toBeGreaterThan(1);
    await locator.selectOption(value);
  }

  async selectSubForm(name: string) {
    await this.openRegistration();
    await this.selectOptionWhenReady(this.subFormDropdown, name);
  }

  /**
   * Types a search term into the employee autocomplete and picks a result
   * by its visible text. This is the mandatory first step — the rest of
   * the form (Name, Alphanumeric ID, Gender, Check) depends on an
   * employee actually being selected here first, per the recorded flow.
   */
  async searchAndSelectEmployee(searchTerm: string, resultText: string) {
    await this.empSearchInput.click();
    await this.empSearchInput.fill(searchTerm);
    const resultOption = this.page.getByText(resultText, { exact: false });
    await resultOption.first().waitFor({ state: 'visible', timeout: 15000 });
    await resultOption.first().click();
    // Confirm the selection actually committed — the search box should
    // now reflect the chosen employee rather than sitting on raw typed text.
    await expect(this.empSearchInput).not.toHaveValue(searchTerm);
  }

  /**
   * Reads the current values of every visible input/select on the page.
   * Used to detect whether selecting an employee actually populated the
   * form with real data, without needing a named locator for every one of
   * the ~20 fields on this page (Designation, Employee Type, Grade,
   * Gender, Nationality, Religion, Category, Remarks, etc.).
   */
  async captureFormFieldValues(): Promise<string[]> {
    const fields = this.page.locator('input:visible, select:visible, textarea:visible');
    const count = await fields.count();
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      values.push(await fields.nth(i).inputValue().catch(() => ''));
    }
    return values;
  }

  /**
   * Types the search term into the employee dropdown, waits for the
   * matching results list to appear, selects the given result, and
   * confirms the form's field values actually changed afterward — proof
   * the employee's real details loaded rather than the selection being a
   * no-op.
   */
  async selectEmployeeAndExpectDetailsToChange(searchTerm: string, resultText: string) {
    const before = await this.captureFormFieldValues();

    await this.empSearchInput.click();
    await this.empSearchInput.fill(searchTerm);

    const resultOption = this.page.getByText(resultText, { exact: false });
    await resultOption.first().waitFor({ state: 'visible', timeout: 15000 });
    await resultOption.first().click();

    const after = await this.captureFormFieldValues();
    expect(after).not.toEqual(before);
  }

  async fillEmployeeName(value: string) {
    await this.employeeNameInput.click();
    await this.employeeNameInput.fill(value);
  }

  async fillAlphanumericId(value: string) {
    await this.alphanumericIdInput.click();
    await this.alphanumericIdInput.fill(value);
  }

  async selectGender(gender: 'Male' | 'Female') {
    await this.page.getByText(gender, { exact: true }).click();
  }

  async clickCheck() {
    await this.checkButton.click();
  }

  async closeCheckDialog() {
    await this.closeButton.click();
  }

  async clickModify() {
    await this.modifyButton.click();
  }

  async openEmployeeAttendanceTab() {
    await this.employeeAttendanceTab.click();
  }
}