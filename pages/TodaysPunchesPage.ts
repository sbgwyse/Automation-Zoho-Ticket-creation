import { type Page, type Locator, expect } from '@playwright/test';

export class TodaysPunchesPage {
  readonly page: Page;
  readonly openTodaysPunchesMenuItem: Locator;
  readonly getDataButton: Locator;
  readonly downloadButton: Locator;
  readonly resultsTable: Locator;
  readonly resultsTableRows: Locator;
  readonly noDataMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.openTodaysPunchesMenuItem = page.locator('i').nth(3);

    this.getDataButton = page
      .locator('mdb-card-title')
      .filter({ hasText: 'Todays Punches Get Data' })
      .locator('i');

    this.downloadButton = page.locator('mdb-icon').nth(2);

    this.resultsTable = page.locator('table');
    this.resultsTableRows = page.locator('table tbody tr');

    this.noDataMessage = page.getByText(/no (data|records) found/i);
  }

  async open() {
    await this.openTodaysPunchesMenuItem.click();
  }

  async fetchData() {
    await this.getDataButton.click();
  }

  async expectDataLoaded() {
    await Promise.race([
      this.resultsTableRows.first().waitFor({ state: 'visible', timeout: 15000 }),
      this.noDataMessage.waitFor({ state: 'visible', timeout: 15000 }),
    ]);
  }

  async expectRowsVisible(minCount: number = 1) {
    await expect(this.resultsTableRows).toHaveCount(minCount, { timeout: 15000 });
  }

  async downloadPunchesFile() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadButton.click();
    return downloadPromise;
  }
}