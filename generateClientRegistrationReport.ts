import { writePdfReport } from './pdfReporter';
import { writeExcelReport } from './excelReporter';
import { ReportMeta, StepResult } from './reportTypes';

// --- Meta info shown at the top of both reports ---
const meta: ReportMeta = {
  formTitle: 'Client Registration - Test Report',
  module: 'ADMIN/Wyse',
  website: 'http://192.168.0.23:4220/etam_prime_taj/admin',
  appVersion: 'TODO', // fill in real value - do not leave as "loading..."
  appReleaseDate: 'TODO',
  apiVersion: 'TODO',
  apiReleaseDate: 'TODO',
};

// --- Step results, grouped by section ---
// Add more rows/sections below as you complete more test steps.
const results: StepResult[] = [
  { section: 'Login', field: 'Login - Navigate and sign in', status: 'Passed', duration: '20' },
  { section: 'Login', field: 'Login - Navigate to New Client Registration form', status: 'Passed', duration: '10' },

  { section: 'Basic Info', field: 'TODO - add remaining steps here', status: 'Passed', duration: '0' },
];

async function main() {
  await writePdfReport(results, meta);
  await writeExcelReport(results, meta);
  console.log('Reports generated in ./TestResults');
}

main().catch((err) => {
  console.error('Report generation failed:', err);
  process.exit(1);
});
