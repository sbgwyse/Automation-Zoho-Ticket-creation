import { Page, Download, Locator } from '@playwright/test';

/**
 * Page object for the Reports section of ETAM Prime.
 * TODO: every selector below is a best guess based on common patterns —
 * verify each against the real UI (use `npx playwright codegen <url>`
 * against the Reports screen to confirm exact roles/text/labels).
 */
export class ReportsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to the Reports section from wherever the app currently is. */
  async openReports(): Promise<void> {
    // TODO: confirm this is a nav link/button labeled "Reports"
    await this.page.getByRole('link', { name: /reports/i }).click();
  }

  /**
   * Select a report category from the Reports sidebar/tabs,
   * e.g. 'Master Reports'.
   */
  async selectReportCategory(categoryName: string): Promise<void> {
    // TODO: confirm whether this is a tab, link, or list item
    await this.page.getByText(categoryName, { exact: true }).click();
  }

  /** Locator for every "Download Report" entry currently visible. */
  private downloadReportLocator(): Locator {
    // TODO: confirm the accessible name — codegen showed "Download Report"
    // buttons/links; adjust role if they're rendered as icons/buttons instead
    return this.page.getByRole('button', { name: /download report/i });
  }

  /** How many "Download Report" entries are currently visible. */
  async getDownloadReportCount(): Promise<number> {
    return this.downloadReportLocator().count();
  }

  /**
   * Click the Nth "Download Report" entry (0-indexed) and wait for the
   * resulting file download.
   */
  async downloadReportByIndex(index: number): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadReportLocator().nth(index).click(),
    ]);
    return download;
  }
}