import { TestInfo } from '@playwright/test';
import { ReportMeta } from './reportTypes';

/**
 * Call this at the start of a test to populate the Module / Website /
 * App Version / API Version block at the top of the generated PDF & Excel
 * report. Without this call, testReporter.ts falls back to blank values.
 */
export async function attachReportMeta(testInfo: TestInfo, meta: ReportMeta) {
  await testInfo.attach('report-meta', {
    body: JSON.stringify(meta),
    contentType: 'application/json',
  });
}