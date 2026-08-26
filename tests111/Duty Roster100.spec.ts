import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { writeExcelReport } from '../reportcode/excelReporter';
import { writePdfReport } from '../reportcode/pdf-reporter';
import { ReportMeta, StepResult } from '../reportcode/reportTypes';

test.setTimeout(300000); // 5 minutes

test('Duty Roster Excel Upload', async ({ page }) => {
  const MODULE_NAME = 'Duty Roster';
  const WEBSITE_URL = 'https://presence.tajhotels.com/etam_prime/login';

  // Collected as the test runs, then handed to the report writers at the end.
  const results: StepResult[] = [];
  let meta: ReportMeta = {
    formTitle: 'Duty Roster Excel Upload - Test Report',
    module: MODULE_NAME,
    website: WEBSITE_URL,
  };

  // Wraps test.step() so we can record pass/fail + duration + error
  // for every step without relying on testInfo.steps (not available
  // inside the test body, only inside a custom Reporter's onTestEnd).
  async function runStep(title: string, fn: () => Promise<void>) {
    const start = Date.now();
    const idx = title.indexOf(' - ');
    const section = idx === -1 ? 'General' : title.slice(0, idx).trim();
    const field = idx === -1 ? title : title.slice(idx + 3).trim();

    await test.step(title, async () => {
      try {
        await fn();
        results.push({
          section,
          field,
          status: 'Passed',
          duration: ((Date.now() - start) / 1000).toFixed(2),
        });
      } catch (err) {
        results.push({
          section,
          field,
          status: 'Failed',
          duration: ((Date.now() - start) / 1000).toFixed(2),
          error: err instanceof Error ? err.message : String(err),
        });
        throw err; // keep original test failure behavior
      }
    });
  }

  try {
    await runStep('Login - Enter credentials and sign in', async () => {
      await page.goto(WEBSITE_URL);

      // Scrape live App/API version + release date off the login footer
      // (e.g. "APP : 5.1.5 Release Date : 07/07/2026", "API : 1.6.9679.30627 Release Date : ...")
      const appFooterText = (await page.getByText(/APP\s*:/i).first().textContent()) ?? '';
      const apiFooterText = (await page.getByText(/API\s*:/i).first().textContent()) ?? '';

      const appMatch = appFooterText.match(
        /APP\s*:\s*([\d.]+)\s*Release Date\s*:\s*([\d/]+(?:\s+[\d:]+)?)/i,
      );
      const apiMatch = apiFooterText.match(
        /API\s*:\s*([\d.]+)\s*Release Date\s*:\s*([\d/]+(?:\s+[\d:]+)?)/i,
      );

      meta = {
        ...meta,
        appVersion: appMatch?.[1] ?? '',
        appReleaseDate: appMatch?.[2]?.trim() ?? '',
        apiVersion: apiMatch?.[1] ?? '',
        apiReleaseDate: apiMatch?.[2]?.trim() ?? '',
      };

      await page.getByRole('textbox', { name: 'Username' }).fill('ADMIN/etam100');
      await page.getByRole('textbox', { name: 'Password' }).fill('$WysE123');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.waitForLoadState('networkidle');
    });

    await runStep('Login - Navigate to Registration', async () => {
      await page.getByText('REGISTRATION').click();
      await page.waitForTimeout(2000);
    });

    await runStep('Duty Roster - Select Duty Roster module', async () => {
      await page.getByRole('combobox').selectOption('Duty Roster');
      await page.waitForTimeout(1000);
    });

    await runStep('Duty Roster - Open Excel Upload', async () => {
      await page.getByText('Excel Upload').click();
      await page.waitForTimeout(2000);
    });

    await runStep('Duty Roster - Select date range', async () => {
      await page.getByRole('textbox', { name: 'Select Date Range' }).click();
      await page.waitForTimeout(1000);
      await page.getByText('1', { exact: true }).first().click();
      await page.getByText('1', { exact: true }).first().click();
    });

    await runStep('Duty Roster - Select RO', async () => {
      await page.locator('.p-multiselect-trigger-icon').first().click();
      await page.waitForTimeout(1000);
      await page.locator('.p-checkbox-box').nth(1).click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    });

    await runStep('Duty Roster - Open Advance Filter', async () => {
      await page.getByText('Advance Filter').click();
      await page.waitForTimeout(1000);
    });

    await runStep('Duty Roster - Select Contractor', async () => {
      await page
        .locator('#contractor > .mat-radio-label > .mat-radio-container > .mat-radio-outer-circle')
        .click();
      await page.getByText('--Select a Contractor--').click();
      await page.waitForTimeout(1000);
      await page.getByRole('checkbox').nth(3).click();
      await page.locator('.p-multiselect-header').click();
      await page.waitForTimeout(1000);
      await page.getByRole('button').filter({ hasText: /^$/ }).nth(2).click();
      await page.waitForTimeout(1000);
    });

    await runStep('Duty Roster - Select Department', async () => {
      await page.getByText('--Select a Department--').click();
      await page.waitForTimeout(1000);
      await page.getByRole('checkbox').nth(3).click();
      await page.getByRole('button').filter({ hasText: /^$/ }).nth(2).click();
      await page.waitForTimeout(1000);
    });

    await runStep('Duty Roster - Select Employee', async () => {
      await page.getByRole('checkbox').nth(3).click();
      await page.getByRole('button', { name: 'Done' }).click();
      await page.waitForTimeout(3000);
    });

    await runStep('Duty Roster - Confirm Employee Grid', async () => {
      await page.getByRole('checkbox').nth(1).click();
    });

    await runStep('Duty Roster - Download Format With Data', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download Format With Data' }).click();
      const download = await downloadPromise;

      const downloadDir = './downloads';
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
      }

      const filePath = './downloads/DutyRoster.xlsx';
      await download.saveAs(filePath);
      console.log('Downloaded:', filePath);
    });

    await runStep('Duty Roster - Upload Excel File', async () => {
      const uploadFile = path.join(process.cwd(), 'DutyRoster_Upload.xlsx');
      console.log('Uploading file:', uploadFile);

      await page.locator('input[name="file"]').setInputFiles(uploadFile);
      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: 'Upload' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
    });
  } finally {
    // Runs whether the test passed or failed, so the report always
    // reflects exactly how far the run got.
    await writeExcelReport(results, meta);
    await writePdfReport(results, meta);
    console.log(
      `Reports generated: ${results.filter((r) => r.status === 'Passed').length} passed, ${
        results.filter((r) => r.status === 'Failed').length
      } failed`,
    );
  }
});