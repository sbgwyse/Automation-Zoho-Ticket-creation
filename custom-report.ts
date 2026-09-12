// custom-report.ts
//
// Playwright reporter — runs automatically after every `npx playwright test`
// (it's wired up in playwright.config.ts). Its behavior is controlled by two
// environment variables, so this ONE file supports all three workflows
// without ever needing to be edited by hand:
//
//   GENERATE_REPORT=true   -> build the PDF/Excel report at the end of the run
//   GENERATE_REPORT=false  -> skip building the report; only save the raw
//                             run data (test-results/last-run-records.json)
//                             so "npm run generate-report" can build it later
//   CREATE_TICKET=true     -> after the report is built, file a Zoho ticket
//                             (only takes effect when GENERATE_REPORT=true)
//
// Don't set these by hand — use the npm scripts in package.json:
//   npm run test:report      -> Case 1: run tests + report, no ticket
//   npm run test:only        -> Case 2: run tests only, report NOT built yet
//   npm run generate-report  -> Case 2 (part 2): build the report whenever
//                                you want, from the last "test:only" run
//   npm run test:full        -> Case 3: run tests + report + ticket, in one go

import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

import * as fs from 'fs';
import * as path from 'path';
import {
  TestRecord,
  StepRecord,
  AttachmentRecord,
  ReportMeta,
} from './reporters/reportBuilder';
import { toStyledReport } from './reporters/reportAdapter';
import { writeExcelReport } from './reporters/excelReporter';
import { writePdfReport } from './reporters/pdfReporter';
import { createTicket, uploadFile as uploadFileToZoho, getAgentIdByEmail } from './zoho-helper';

const STYLED_REPORT_DIR = 'TestResults';
const STYLED_PDF_PATH = path.join(STYLED_REPORT_DIR, 'Automation_Report.pdf');
const STYLED_EXCEL_PATH = path.join(STYLED_REPORT_DIR, 'Automation_Report.xlsx');

export default class CustomReport implements Reporter {
  private records: TestRecord[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const steps: StepRecord[] = result.steps
      .filter((s) => s.category === 'test.step')
      .map((s) => ({
        title: s.title,
        status: s.error ? 'failed' : 'passed',
        durationMs: s.duration,
        error: s.error?.message,
      }));

    const attachments: AttachmentRecord[] = result.attachments
      .filter((a) => a.contentType.startsWith('image/') && a.path)
      .map((a) => ({
        name: a.name,
        filePath: a.path!,
      }));

    let reportMeta: ReportMeta | undefined;

    const metaAttachment = result.attachments.find((a) => a.name === 'report-meta');

    if (metaAttachment?.body) {
      try {
        reportMeta = JSON.parse(metaAttachment.body.toString('utf-8'));
      } catch {
        // ignore malformed meta
      }
    }

    this.records.push({
      title: test.title,
      status: result.status,
      durationMs: result.duration,
      steps,
      attachments,
      reportMeta,
    });
  }

  async onEnd(result: FullResult) {
    if (this.records.length === 0) return;

    const outDir = 'test-results';
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Always save the raw run data, regardless of GENERATE_REPORT, so the
    // report can still be built later with "npm run generate-report".
    fs.writeFileSync(
      path.join(outDir, 'last-run-records.json'),
      JSON.stringify(this.records, null, 2),
    );

    const shouldGenerateReport = process.env.GENERATE_REPORT === 'true';

    if (!shouldGenerateReport) {
      console.log(
        'GENERATE_REPORT is not "true" — skipping report generation this run. ' +
          'Run "npm run generate-report" whenever you want the PDF/Excel report for it.',
      );
      return;
    }

    const { meta, results } = toStyledReport(this.records);

    await writeExcelReport(results, meta);
    await writePdfReport(results, meta);

    console.log('Report generated:', STYLED_PDF_PATH, STYLED_EXCEL_PATH);

    if (process.env.CREATE_TICKET === 'true') {
      await this.createZohoTicket(STYLED_PDF_PATH, STYLED_EXCEL_PATH);
    }
  }

  private async createZohoTicket(pdfPath: string, excelPath: string) {
    try {
      const failedCount = this.records.filter((r) => r.status !== 'passed').length;
      const overallStatus = failedCount > 0 ? 'FAILED' : 'PASSED';
      const moduleName =
        this.records[0]?.reportMeta?.formTitle || this.records[0]?.title || 'Automation';

      const uploadIds: string[] = [];
      if (fs.existsSync(pdfPath)) uploadIds.push(await uploadFileToZoho(pdfPath));
      if (fs.existsSync(excelPath)) uploadIds.push(await uploadFileToZoho(excelPath));

      const description =
        `Dear Team,<br>` +
        `We have tested the ${moduleName} please see the Attachments.<br><br>` +
        `Regards,<br>` +
        `Sanika Gore`;

      const assigneeId = await getAgentIdByEmail(process.env.ZOHO_ASSIGNEE || 'sbg@wyse.co.in');

      const ticket = await createTicket(
        `${moduleName} - Test Report [${overallStatus}]`,
        description,
        uploadIds,
        assigneeId,
      );

      console.log('Zoho ticket created:', ticket.id);
    } catch (err) {
      console.error('Failed to create Zoho ticket:', err);
    }
  }
}
