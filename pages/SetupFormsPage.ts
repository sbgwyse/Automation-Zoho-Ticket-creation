import { type Page, type Locator, expect } from '@playwright/test';

export class SetupFormsPage {
  readonly page: Page;
  readonly setupMenu: Locator;
  readonly masterDropdown: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly confirmDeleteButton: Locator;

  // --- Contractor Master ---
  readonly contractorNameInput: Locator;
  readonly contractorAddressInput: Locator;

  // --- Shift Master ---
  readonly shiftNameInput: Locator;
  readonly shiftStartTimeInput: Locator;
  readonly shiftEndTimeInput: Locator;
  readonly lunchOutInput: Locator;
  readonly lunchInInput: Locator;
  readonly breakShiftFromInput: Locator;
  readonly breakShiftToInput: Locator;
  readonly modifyButton: Locator;
  readonly breakShiftYesToggle: Locator;

  // --- Leave Type Master ---
  readonly statusDropdown: Locator;
  readonly firstToggle: Locator;

  // TODO: replace with the real validation error selector once inspected
  readonly fieldError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.setupMenu = page.getByText('SETUP');
    this.masterDropdown = page.getByRole('combobox').first();
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, delete it!' });
    this.fieldError = page.locator('.error, .toast-error, [role="alert"]').first();

    // Contractor Master
    this.contractorNameInput = page.getByRole('textbox', { name: 'Contractor Name', exact: true });
    this.contractorAddressInput = page.getByRole('textbox', { name: 'Address*' });

    // Shift Master
    this.shiftNameInput = page.getByRole('textbox', { name: 'Shift Name*' });
    this.shiftStartTimeInput = page.getByRole('textbox', { name: 'Shift Start Time *' });
    this.shiftEndTimeInput = page.getByRole('textbox', { name: 'Shift End Time *' });
    this.lunchOutInput = page.getByRole('textbox', { name: 'Lunch Out' });
    this.lunchInInput = page.getByRole('textbox', { name: 'Lunch In' });
    this.breakShiftFromInput = page.getByRole('textbox', { name: 'Break Shift Hour From' });
    this.breakShiftToInput = page.getByRole('textbox', { name: 'Break Shift Hour To' });
    this.modifyButton = page.getByRole('button', { name: 'Modify' });
    this.breakShiftYesToggle = page.getByText('Yes', { exact: true });

    // Leave Type Master
    this.statusDropdown = page.locator('select[name="status"]');
    this.firstToggle = page.locator('.mat-slide-toggle-bar').first();
  }

  async openSetup() {
    await this.setupMenu.click();
  }

  async selectMaster(masterName: string) {
    await this.openSetup();
    await this.masterDropdown.selectOption(masterName);
  }

  async save() {
    await this.saveButton.click();
  }

  async reset() {
    await this.resetButton.click();
  }

  // ---------- Contractor Master ----------
  async addContractor(name: string, address: string) {
    await this.contractorNameInput.fill(name);
    await this.contractorAddressInput.fill(address);
    await this.save();
  }

  async expectContractorInTable(name: string) {
    await expect(this.page.getByRole('cell', { name })).toBeVisible();
  }

  async deleteContractorByName(name: string) {
    const row = this.page.getByRole('row', { name: new RegExp(name) });
    await row.locator('i').click();
    await this.confirmDeleteButton.click();
  }

  // ---------- Shift Master ----------
  async fillShiftTimes(opts: {
    name?: string;
    startTime?: string;
    endTime?: string;
    lunchOut?: string;
    lunchIn?: string;
    breakFrom?: string;
    breakTo?: string;
  }) {
    if (opts.name !== undefined) await this.shiftNameInput.fill(opts.name);
    if (opts.startTime !== undefined) await this.shiftStartTimeInput.fill(opts.startTime);
    if (opts.endTime !== undefined) await this.shiftEndTimeInput.fill(opts.endTime);
    if (opts.lunchOut !== undefined) await this.lunchOutInput.fill(opts.lunchOut);
    if (opts.lunchIn !== undefined) await this.lunchInInput.fill(opts.lunchIn);
    if (opts.breakFrom !== undefined) await this.breakShiftFromInput.fill(opts.breakFrom);
    if (opts.breakTo !== undefined) await this.breakShiftToInput.fill(opts.breakTo);
  }

  async selectExistingShiftRow(shiftName: string) {
    await this.page.getByRole('cell', { name: shiftName }).click();
  }

  async clickModify() {
    await this.modifyButton.click();
  }

  /** Must be clicked before Break Shift Hour From/To become fillable */
  async enableBreakShift() {
    await this.breakShiftYesToggle.click();
  }

  // ---------- Leave Type Master ----------
  async setStatus(value: 'active' | 'inactive') {
    await this.statusDropdown.selectOption(value);
  }

  async toggleFirstLeaveType() {
    await this.firstToggle.click();
  }
}