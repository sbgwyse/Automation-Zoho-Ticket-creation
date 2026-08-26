import { type Page, type Locator, expect } from '@playwright/test';
 
export class RegistrationFormsPage {

  readonly page: Page;
 
  // --- Navigation ---

  readonly registrationMenu: Locator;

  readonly subFormDropdown: Locator;
 
  // --- Shared actions ---

  readonly saveButton: Locator;

  readonly resetButton: Locator;

  readonly deleteButton: Locator;

  readonly okButton: Locator;

  readonly reportButton: Locator;

  readonly dateRangeInput: Locator;
 
  // --- Employee Data Modification ---

  readonly employeeIdInput: Locator;

  readonly employeeNameInput: Locator;

  readonly alphanumericIdInput: Locator;

  readonly checkButton: Locator;

  readonly closeButton: Locator;

  readonly modifyButton: Locator;

  readonly pdfReportButton: Locator;

  readonly excelReportButton: Locator;
 
  // --- Off Policy Registration ---

  readonly policyDropdown: Locator;

  readonly pdfButton: Locator;

  readonly excelButton: Locator;
 
  // --- Shift Registration / Shift Rounding ---

  readonly shiftDropdown: Locator;

  readonly dayDropdown: Locator;

  readonly ingraceOvertimeInput: Locator;

  readonly outgraceInput: Locator;

  readonly lateUptoInput: Locator;

  readonly earlyGoInput: Locator;

  readonly shiftGraceInput: Locator;

  readonly hhmmInput: Locator;
 
  // TODO: replace with the real validation/duplicate error selector once inspected

  readonly fieldError: Locator;
 
  constructor(page: Page) {

    this.page = page;
 
    this.registrationMenu = page.getByText('REGISTRATION');

    this.subFormDropdown = page.getByRole('combobox').first();
 
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });

    this.resetButton = page.getByRole('button', { name: 'Reset' });

    this.deleteButton = page.getByRole('button', { name: 'Delete', exact: true });

    this.okButton = page.getByRole('button', { name: 'OK' });

    this.reportButton = page.getByRole('button', { name: 'Report', exact: true });

    this.dateRangeInput = page.getByRole('textbox', { name: 'Select Date Range' });
 
    this.employeeIdInput = page.getByRole('textbox', { name: 'Employee ID*' });

    this.employeeNameInput = page.getByRole('textbox', { name: 'Employee Name*' });

    this.alphanumericIdInput = page.getByRole('textbox', { name: 'Alphanumaric Id*' });

    this.checkButton = page.getByRole('button', { name: 'Check' });

    this.closeButton = page.getByRole('button', { name: 'Close' });

    this.modifyButton = page.getByRole('button', { name: 'Modify' });

    this.pdfReportButton = page.getByRole('button', { name: 'PDF Report' });

    this.excelReportButton = page.getByRole('button', { name: 'Excel Report' });
 
    this.policyDropdown = page.locator('select[name="selectedPolicy"]');

    this.pdfButton = page.getByRole('button', { name: 'PDF', exact: true });

    this.excelButton = page.getByRole('button', { name: 'Excel', exact: true });
 
    this.shiftDropdown = page.locator('select[name="selectedShift"]');

    this.dayDropdown = page.locator('select[name="selectedDay"]');

    this.ingraceOvertimeInput = page.getByRole('textbox', { name: 'Ingrace Overtime Offset' });

    this.outgraceInput = page.getByRole('textbox', { name: 'Outgrace' });

    this.lateUptoInput = page.getByRole('textbox', { name: 'Late Upto' });

    this.earlyGoInput = page.getByRole('textbox', { name: 'Early Go' });

    this.shiftGraceInput = page.getByRole('textbox', { name: 'Shift Grace' });

    this.hhmmInput = page.getByRole('textbox', { name: 'HH:mm' });
 
    this.fieldError = page.locator('.error, .toast-error, [role="alert"]').first();

  }
 
  // ---------- Navigation ----------

  async openRegistration() {

    await this.registrationMenu.scrollIntoViewIfNeeded();

    await this.registrationMenu.click({ timeout: 20000 });

  }
 
  private async waitForOverlayGone(timeout = 15000) {

    await this.page.locator('.ngx-overlay').waitFor({ state: 'hidden', timeout }).catch(() => {});

  }
 
  private async selectOptionWhenReady(locator: Locator, value: string, timeout = 20000) {

    await locator.waitFor({ state: 'visible', timeout });

    await expect

      .poll(async () => locator.locator('option').count(), { timeout })

      .toBeGreaterThan(1);

    await locator.selectOption(value);

  }
 
  async selectSubForm(name: string) {

    await this.selectOptionWhenReady(this.subFormDropdown, name);

  }
 
  // ---------- Shared: Date Range / Employee grid ----------
 
  /**

   * Clicks the Select Date Range input, then picks the "from" day and "to"

   * day from the calendar by visible day number. Matches the recorded

   * codegen pattern (page.getByText('1', {exact:true}).first() for the

   * start day, page.getByText('31').nth(2) for the end day).

   */

  async selectDateRange(fromDay: string, toDay: string) {

    await this.dateRangeInput.click();

    await this.page.getByText(fromDay, { exact: true }).first().click();

    await this.page.getByText(toDay).nth(2).click();

    await this.waitForOverlayGone();

  }
 
  /**

   * Opens the department multiselect (chip-style, top of the grid) and

   * selects the given departments. The employee grid only shows rows for

   * currently-selected departments, so this must run before an employee

   * will appear — confirmed via screenshot on this app.

   *

   * TODO: 'Engineering' and 'Food & Beverage' were confirmed (via

   * screenshot) to include employee 500100125. If EMPLOYEE_ID changes to

   * someone in a different department, update this list to match.

   */

  async selectDepartments(departments: string[] = ['Engineering', 'Food & Beverage']) {

    const trigger = this.page.locator('.p-multiselect-trigger-icon').first();

    if (!(await trigger.count())) return;
 
    await trigger.click();

    await this.waitForOverlayGone();

    const panel = this.page.locator('.p-multiselect-panel:visible, .p-multiselect-items-wrapper');

    for (const dept of departments) {

      await this.waitForOverlayGone();

      const option = panel.getByText(dept, { exact: true });

      if (await option.count()) {

        await option.click();

      }

      await this.waitForOverlayGone();

    }

    const scopedClose = this.page.locator('.p-multiselect-open .p-multiselect-trigger-icon');

    if (await scopedClose.count()) {

      await scopedClose.click();

    } else {

      await this.page.mouse.click(1400, 100);

    }

    await this.waitForOverlayGone();

  }
 
  /**

   * Ensures the right departments are selected, waits for the employee

   * grid to populate, then clicks the row matching the given employee ID.

   */

  async selectEmployee(employeeId: string) {

    await this.waitForOverlayGone();

    await this.selectDepartments();

    await this.page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});

    await this.page.getByRole('cell', { name: employeeId }).click({ timeout: 20000 });

  }
 
  // ---------- Off Policy Registration ----------

  async selectPolicy(policy: string) {

    await this.selectOptionWhenReady(this.policyDropdown, policy);

  }
 
  // ---------- Shift Registration ----------

  async selectShift(shift: string) {

    await this.selectOptionWhenReady(this.shiftDropdown, shift);

  }
 
  async selectDay(day: string) {

    await this.selectOptionWhenReady(this.dayDropdown, day);

  }
 
  // ---------- Shift Rounding ----------

  async selectRoundingShift(shift: string) {

    await this.selectOptionWhenReady(this.shiftDropdown, shift);

  }
 
  async fillGraceTimes(opts: {

    ingraceOvertime?: string;

    outgrace?: string;

    lateUpto?: string;

    earlyGo?: string;

    shiftGrace?: string;

    hhmm?: string;

  }) {

    if (opts.ingraceOvertime !== undefined) await this.ingraceOvertimeInput.fill(opts.ingraceOvertime);

    if (opts.outgrace !== undefined) await this.outgraceInput.fill(opts.outgrace);

    if (opts.lateUpto !== undefined) await this.lateUptoInput.fill(opts.lateUpto);

    if (opts.earlyGo !== undefined) await this.earlyGoInput.fill(opts.earlyGo);

    if (opts.shiftGrace !== undefined) await this.shiftGraceInput.fill(opts.shiftGrace);

    if (opts.hhmm !== undefined) await this.hhmmInput.fill(opts.hhmm);

  }
 
  // ---------- Shared actions ----------

  async save() {

    await this.saveButton.click();

  }
 
  async confirmOK() {

    await this.okButton.click();

    await this.waitForOverlayGone();

  }
 
  async delete() {

    await this.deleteButton.click();

  }

}
 