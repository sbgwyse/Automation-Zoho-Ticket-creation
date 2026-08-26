import type {
  Reporter,
  TestCase,
  TestResult as PwTestResult,
  FullResult,
} from '@playwright/test/reporter';
import { writeExcelReport } from './excelReporter';
import { writePdfReport } from './pdfReporter';
import { ReportMeta, StepResult } from './reportTypes';

/**
 * Splits a test.step() title of the form "Section - Field description"
 * into { section, field }. Falls back to "General" if there's no " - ".
 *
 * This is the piece that was previously missing: without it, the reporter
 * has no way to group rows under section headers like "Login",
 * "Duty Roster", etc., and without walking result.steps at all you only
 * ever get a single top-level "General - (whole test)" row.
 */
function splitTitle(title: string): { section: string; field: string } {
  const idx = title.indexOf(' - ');
  if (idx === -1) {
    return { section: 'General', field: title };
  }
  return {
    section: title.slice(0, idx).trim(),
    field: title.slice(idx + 3).trim(),
  };
}

export default class CustomReporter implements Reporter {
  private results: StepResult[] = [];
  private meta: ReportMeta | null = null;

  onTestEnd(test: TestCase, result: PwTestResult) {
    // Pull the report-meta attachment (module/website/app+api version info)
    const metaAttachment = result.attachments.find(
      (a) => a.name === 'report-meta',
    );
    if (metaAttachment?.body) {
      try {
        this.meta = JSON.parse(metaAttachment.body.toString('utf-8'));
      } catch {
        // malformed meta shouldn't crash the report — fall back to defaults in onEnd
      }
    }

    // IMPORTANT: only pick up top-level test.step() calls (category === 'test.step').
    // result.steps also contains internal Playwright steps (e.g. 'pw:api', expect
    // assertions) — including those would blow up the report with noise, and
    // *omitting* this filter entirely (i.e. reading result.status directly instead
    // of walking result.steps) is what produces the single
    // "General - (whole test)" row you were seeing: that happens when the report
    // is built from the overall TestResult instead of its child steps.
    const topLevelSteps = result.steps.filter(
      (s) => s.category === 'test.step',
    );

    if (topLevelSteps.length === 0) {
      // Safety net: if no steps were recorded (e.g. spec wasn't refactored,
      // or failed before any step ran), still emit one row so nothing is lost.
      const { section, field } = splitTitle(test.title || 'General - (whole test)');
      this.results.push({
        section,
        field,
        status: result.status === 'passed' ? 'Passed' : 'Failed',
        duration: (result.duration / 1000).toFixed(1),
        error: result.error?.message,
      });
      return;
    }

    for (const step of topLevelSteps) {
      const { section, field } = splitTitle(step.title);
      this.results.push({
        section,
        field,
        status: step.error ? 'Failed' : 'Passed',
        duration: (step.duration / 1000).toFixed(1),
        error: step.error?.message,
      });
    }
  }

  async onEnd(_result: FullResult) {
    const meta: ReportMeta = this.meta ?? {
      formTitle: 'Automation Test Report',
      module: '',
      website: '',
      appVersion: '',
      appReleaseDate: '',
      apiVersion: '',
      apiReleaseDate: '',
    };

    await writeExcelReport(this.results, meta);
    await writePdfReport(this.results, meta);
  }
}