// generateReport.ts
//
// Builds the PDF/Excel report from the LAST test run's saved data
// (test-results/last-run-records.json) — no tests are re-run.
//
// Use this after: npm run test:only
// Run it whenever YOU want the report built:
//   npm run generate-report

import * as fs from 'fs';
import * as path from 'path';
import {
  TestRecord,
  buildFileDate,
  generatePdfReport,
  generateExcelReport,
} from './reportBuilder';

async function main() {
  const recordsPath = path.join('test-results', 'last-run-records.json');

  if (!fs.existsSync(recordsPath)) {
    console.error(
      `No saved run found at ${recordsPath}. Run "npm run test:only" first, then run this command.`,
    );
    process.exit(1);
  }

  const records: TestRecord[] = JSON.parse(fs.readFileSync(recordsPath, 'utf-8'));

  const outDir = 'test-results';
  const date = new Date();
  const fileDate = buildFileDate(date);

  const pdfPath = await generatePdfReport(records, date, outDir, fileDate);
  const excelPath = await generateExcelReport(records, outDir, fileDate);

  console.log('Report generated:', pdfPath, excelPath);
}

main().catch((err) => {
  console.error('Failed to generate report:', err);
  process.exit(1);
});
