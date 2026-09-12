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
import { TestRecord } from './reporters/reportBuilder';
import { toStyledReport } from './reporters/reportAdapter';
import { writeExcelReport } from './reporters/excelReporter';
import { writePdfReport } from './reporters/pdfReporter';

const STYLED_PDF_PATH = path.join('TestResults', 'Automation_Report.pdf');
const STYLED_EXCEL_PATH = path.join('TestResults', 'Automation_Report.xlsx');

async function main() {
  const recordsPath = path.join('test-results', 'last-run-records.json');

  if (!fs.existsSync(recordsPath)) {
    console.error(
      `No saved run found at ${recordsPath}. Run "npm run test:only" first, then run this command.`,
    );
    process.exit(1);
  }

  const records: TestRecord[] = JSON.parse(fs.readFileSync(recordsPath, 'utf-8'));

  const { meta, results } = toStyledReport(records);

  await writeExcelReport(results, meta);
  await writePdfReport(results, meta);

  console.log('Report generated:', STYLED_PDF_PATH, STYLED_EXCEL_PATH);
}

main().catch((err) => {
  console.error('Failed to generate report:', err);
  process.exit(1);
});
