import type {
  Reporter,
  TestCase,
  TestResult as PwTestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as path from 'path';
import { writeExcelReport } from './excelReporter';
import { writePdfReport } from './pdfReporter';
import { ReportMeta, StepResult } from './reportTypes';

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

function sanitizeFileName(name: string): string {
  // Strip characters that aren't safe in Windows file names
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

interface TestGroup {
  specFile: string;
  testTitle: string;
  results: StepResult[];
  meta: ReportMeta | null;
}

export default class CustomReporter implements Reporter {
  // Keyed by test.id, so every individual test case gets its own report
  private testGroups: Map<string, TestGroup> = new Map();

  onTestEnd(test: TestCase, result: PwTestResult) {
    const key = test.id;

    if (!this.testGroups.has(key)) {
      this.testGroups.set(key, {
        specFile: test.location.file,
        testTitle: test.title,
        results: [],
        meta: null,
      });
    }
    const group = this.testGroups.get(key)!;

    const metaAttachment = result.attachments.find(
      (a) => a.name === 'report-meta',
    );
    if (metaAttachment?.body) {
      try {
        group.meta = JSON.parse(metaAttachment.body.toString('utf-8'));
      } catch {
        // malformed meta shouldn't crash the report
      }
    }

    const topLevelSteps = result.steps.filter(
      (s) => s.category === 'test.step',
    );

    if (topLevelSteps.length === 0) {
      const { section, field } = splitTitle(test.title || 'General - (whole test)');
      group.results.push({
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
      group.results.push({
        section,
        field,
        status: step.error ? 'Failed' : 'Passed',
        duration: (step.duration / 1000).toFixed(1),
        error: step.error?.message,
      });
    }
  }

  async onEnd(_result: FullResult) {
    const dateStr = new Date().toISOString().slice(0, 10);

    for (const group of this.testGroups.values()) {
      const specName = path.basename(group.specFile).replace(/\.spec\.ts$/, '');
      const testName = sanitizeFileName(group.testTitle);
      const fileName = `${specName}_${testName}_${dateStr}`;

      const meta: ReportMeta = group.meta ?? {
        formTitle: group.testTitle,
        module: '',
        website: '',
        appVersion: '',
        appReleaseDate: '',
        apiVersion: '',
        apiReleaseDate: '',
      };

      await writeExcelReport(group.results, meta, fileName);
      await writePdfReport(group.results, meta, fileName);
    }
  }
}