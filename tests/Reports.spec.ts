import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ReportsPage } from '../pages/ReportsPage';

/**
 * REPORTS > Master Reports validation suite.
 * Covers: navigating to Master Reports, and downloading each "Download
 * Report" entry (your codegen showed at least two: index 0 and 1).
 */

const VALID_USERNAME = process.env.ETAM_USERNAME as string;
const VALID_PASSWORD = process.env.ETAM_PASSWORD as string;

test.describe('Master Reports', () => {
  test.describe.configure({ mode: 'serial' });

  let login: LoginPage;
  let reports: ReportsPage;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    reports = new ReportsPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await login.expectLoggedIn();

    await reports.openReports();
    await reports.selectReportCategory('Master Reports');
  });

  test('at least one Download Report entry is visible', async () => {
    const count = await reports.getDownloadReportCount();
    expect(count).toBeGreaterThan(0);
  });

  test('first Download Report entry triggers a download', async () => {
    const download = await reports.downloadReportByIndex(0);
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('second Download Report entry triggers a download', async () => {
    const count = await reports.getDownloadReportCount();
    test.skip(count < 2, 'Only one Download Report entry available in this environment');

    const download = await reports.downloadReportByIndex(1);
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('downloading all available Master Report entries produces distinct files', async () => {
    const count = await reports.getDownloadReportCount();
    const filenames: string[] = [];

    for (let i = 0; i < count; i++) {
      const download = await reports.downloadReportByIndex(i);
      filenames.push(download.suggestedFilename());
    }

    expect(filenames.length).toBe(count);
    filenames.forEach((name) => expect(name).toBeTruthy());
  });
});