// reportAdapter.ts
//
// Bridges the two report data shapes in this project:
//   - TestRecord[]  (collected automatically by custom-report.ts from
//                    Playwright's own test/step results)
//   - StepResult[] + ReportMeta  (what excelReporter.ts / pdfReporter.ts
//                    expect — section/field rows plus a module/website/
//                    version header)
//
// Each test becomes a section (navy banner); each step within it becomes
// one row. Tests with no recorded steps still get a single row using the
// test's own title/status/duration.

import { TestRecord } from './reportBuilder';
import { ReportMeta, StepResult } from './reportTypes';

function capitalizeStatus(status: string): string {
  switch (status) {
    case 'passed':
      return 'Passed';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
  }
}

export function toStyledReport(records: TestRecord[]): { meta: ReportMeta; results: StepResult[] } {
  const first = records[0];
  const firstMeta = first?.reportMeta;

  // appVersion/apiVersion aren't collected anywhere in the live pipeline yet,
  // so they're left blank — excelReporter/pdfReporter both skip those lines
  // when the value is falsy.
  const meta: ReportMeta = {
    formTitle: firstMeta?.formTitle || first?.title || 'Automation Test Report',
    module: firstMeta?.formTitle || first?.title || '',
    website: firstMeta?.websiteUrl || '',
    appVersion: '',
    appReleaseDate: '',
    apiVersion: '',
    apiReleaseDate: '',
  };

  const results: StepResult[] = [];

  records.forEach((record) => {
    const section = record.reportMeta?.formTitle || record.title;

    if (record.steps.length === 0) {
      results.push({
        section,
        field: record.title,
        status: capitalizeStatus(record.status),
        duration: (record.durationMs / 1000).toFixed(2),
        error: undefined,
      });
      return;
    }

    record.steps.forEach((step) => {
      results.push({
        section,
        field: step.title,
        status: capitalizeStatus(step.status),
        duration: (step.durationMs / 1000).toFixed(2),
        error: step.error,
      });
    });
  });

  return { meta, results };
}
