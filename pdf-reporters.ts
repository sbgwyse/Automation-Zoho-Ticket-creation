import type {
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
 
/**
 * Custom Playwright reporter that writes a PDF report, mirroring the
 * grouped Excel report (sections per form, pass/fail status, date column).
 *
 * SCOPED: only generates output for New-client-reg1.spec.ts. Other spec
 * files are tracked internally (so nothing breaks if more specs run in the
 * same command) but no PDF is written for them.
 *
 * Usage (playwright.config.ts):
 *   reporter: [
 *     ['html'],
 *     ['./reporters/excel-reporter.ts'],
 *     ['./reporters/pdf-reporter.ts'],
 *   ],
 */
 
const TARGET_SPEC_BASENAME = 'New-client-reg1';
 
interface RowData {
  section: string;
  stepName: string;
  status: string;
  durationMs: number;
  error: string;
}
 
interface ReportMeta {
  formTitle: string;
  moduleName: string;
  websiteUrl: string;
  appVersion: string;
  apiVersion: string;
}
 
function statusLabel(status: string): string {
  switch (status) {
    case 'passed':
      return 'Passed';
    case 'failed':
      return 'Failed';
    case 'timedOut':
      return 'Timed Out';
    case 'skipped':
      return 'Skipped';
    case 'interrupted':
      return 'Interrupted';
    default:
      return status;
  }
}
 
// Splits a step title like "Basic Info - Client Name" into
// { section: "Basic Info", field: "Client Name" }.
function splitStepTitle(title: string): { section: string; field: string } {
  const sepIndex = title.indexOf(' - ');
  if (sepIndex === -1) {
    return { section: 'General', field: title };
  }
  return {
    section: title.slice(0, sepIndex).trim(),
    field: title.slice(sepIndex + 3).trim(),
  };
}
 
function flattenSteps(steps: TestStep[], rows: RowData[]) {
  for (const step of steps) {
    if (step.category === 'test.step') {
      const { section, field } = splitStepTitle(step.title);
      rows.push({
        section,
        stepName: field,
        status: step.error ? 'Failed' : 'Passed',
        durationMs: step.duration,
        error: step.error ? (step.error.message ?? String(step.error)) : '',
      });
    }
    if (step.steps?.length) {
      flattenSteps(step.steps, rows);
    }
  }
}
 
class PdfReporter {
  rowsBySpec: Map<string, RowData[]>;
  metaBySpec: Map<string, ReportMeta>;
  runDate: Date;
 
  constructor() {
    this.rowsBySpec = new Map();
    this.metaBySpec = new Map();
    this.runDate = new Date();
  }
 
  onBegin(_config: FullConfig, _suite: Suite) {
    this.rowsBySpec = new Map();
    this.metaBySpec = new Map();
    this.runDate = new Date();
  }
 
  // Reads the 'report-meta' attachment a test step attaches via
  // testInfo.attach(), if present.
  private extractMeta(result: TestResult): ReportMeta | null {
    const attachment = result.attachments.find((a) => a.name === 'report-meta');
    if (!attachment || !attachment.body) {
      return null;
    }
    try {
      return JSON.parse(attachment.body.toString('utf-8'));
    } catch {
      return null;
    }
  }
 
  onTestEnd(test: TestCase, result: TestResult) {
    const specFile = path.basename(test.location.file).replace(/\.spec\.(ts|js)$/, '');
 
    if (!this.rowsBySpec.has(specFile)) {
      this.rowsBySpec.set(specFile, []);
    }
    const rows = this.rowsBySpec.get(specFile)!;
 
    if (!this.metaBySpec.has(specFile)) {
      const meta = this.extractMeta(result);
      if (meta) {
        this.metaBySpec.set(specFile, meta);
      }
    }
 
    const stepRows: RowData[] = [];
    flattenSteps(result.steps, stepRows);
 
    if (stepRows.length > 0) {
      rows.push(...stepRows);
    } else {
      rows.push({
        section: 'General',
        stepName: '(whole test)',
        status: statusLabel(result.status),
        durationMs: result.duration,
        error: result.error ? (result.error.message ?? String(result.error)) : '',
      });
    }
  }
 
  private formatDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
 
  private formatDateTime(d: Date): string {
    return d.toLocaleString();
  }
 
  async onEnd() {
    // Only generate a PDF for the target spec - skip everything else.
    const rows = this.rowsBySpec.get(TARGET_SPEC_BASENAME);
    if (!rows) {
      return;
    }
 
    const fileDateStr = this.formatDate(this.runDate);
    const dateStr = this.formatDateTime(this.runDate);
    const outputFile = path.join('test-results', `${TARGET_SPEC_BASENAME}(${fileDateStr}).pdf`);
 
    const outDir = path.dirname(outputFile);
    if (outDir && !fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
 
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(outputFile);
    doc.pipe(writeStream);
 
    // Look up metadata before drawing the title, since the title itself
    // now comes from meta.formTitle (e.g. "Client Registration - Test
    // Report") rather than the spec filename.
    const meta = this.metaBySpec.get(TARGET_SPEC_BASENAME);
    const titleText = meta?.formTitle || `${TARGET_SPEC_BASENAME} - Test Report`;
 
    // ---------- Title ----------
    doc.fontSize(18).font('Helvetica-Bold').text(titleText, {
      align: 'center',
    });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#555555').text(`Run date: ${dateStr}`, {
      align: 'center',
    });
    doc.fillColor('#000000');
    doc.moveDown(1);
 
    // ---------- Metadata header: module name, website URL, version ----------
    if (meta) {
      const metaLines = [
        `Module: ${meta.moduleName}`,
        `Website: ${meta.websiteUrl}`,
        `App Version: ${meta.appVersion}`,
        `API Version: ${meta.apiVersion}`,
      ];
 
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1F1F1F');
      for (const line of metaLines) {
        doc.text(line, doc.page.margins.left, doc.y, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });
        doc.moveDown(0.2);
      }
      doc.fillColor('#000000').font('Helvetica');
      doc.moveDown(0.8);
    }
 
    // Group rows by section, preserving first-seen order.
    const sectionOrder: string[] = [];
    const sectionMap = new Map<string, RowData[]>();
    for (const row of rows) {
      if (!sectionMap.has(row.section)) {
        sectionMap.set(row.section, []);
        sectionOrder.push(row.section);
      }
      sectionMap.get(row.section)!.push(row);
    }
 
    let totalPassed = 0;
    let totalFailed = 0;
 
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colFieldWidth = pageWidth * 0.45;
    const colStatusWidth = pageWidth * 0.15;
    const colDurationWidth = pageWidth * 0.15;
    const colErrorWidth = pageWidth * 0.25;
 
    for (const section of sectionOrder) {
      // Page break safeguard before drawing a section header too.
      if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
      }
 
      // Section header bar - extra gap above so it never visually touches
      // the previous section's last row.
      doc.moveDown(1.2);
      const sectionY = doc.y;
      doc.rect(doc.page.margins.left, sectionY, pageWidth, 22).fill('#2F5496');
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(section, doc.page.margins.left + 6, sectionY + 5, { width: pageWidth - 12 });
      doc.fillColor('#000000');
      // Move the cursor explicitly past the header bar itself, then add
      // breathing room before the first row.
      doc.y = sectionY + 22;
      doc.moveDown(0.6);
 
      for (const row of sectionMap.get(section)!) {
        const fieldText = `${row.section} - ${row.stepName}`;
        const durationSec = Math.round(row.durationMs / 1000).toString();
        const errorText = row.error ? row.error.slice(0, 300) : '';
 
        // Measure how tall each column's wrapped text will actually be,
        // so the row height matches the tallest column - this is what
        // prevents the next row/section from overlapping a wrapped row.
        const fieldHeight = doc.font('Helvetica').fontSize(9).heightOfString(fieldText, { width: colFieldWidth });
        const errorHeight = doc.font('Helvetica').fontSize(8).heightOfString(errorText, { width: colErrorWidth });
        const rowHeight = Math.max(fieldHeight, errorHeight, 12) + 6; // +6 padding between rows
 
        // Page break safeguard before drawing a row, now based on its
        // actual measured height rather than a fixed guess.
        if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }
 
        const rowStartY = doc.y;
 
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#000000')
          .text(fieldText, doc.page.margins.left, rowStartY, {
            width: colFieldWidth,
          });
 
        let statusColor = '#9C6500';
        if (row.status === 'Passed') {
          statusColor = '#006100';
          totalPassed++;
        } else if (row.status === 'Failed' || row.status === 'Timed Out') {
          statusColor = '#9C0006';
          totalFailed++;
        }
 
        doc
          .fillColor(statusColor)
          .font('Helvetica-Bold')
          .text(row.status, doc.page.margins.left + colFieldWidth, rowStartY, {
            width: colStatusWidth,
          });
        doc.fillColor('#000000').font('Helvetica');
 
        doc.text(durationSec, doc.page.margins.left + colFieldWidth + colStatusWidth, rowStartY, {
          width: colDurationWidth,
        });
 
        doc
          .fontSize(8)
          .fillColor('#9C0006')
          .text(
            errorText,
            doc.page.margins.left + colFieldWidth + colStatusWidth + colDurationWidth,
            rowStartY,
            { width: colErrorWidth }
          );
        doc.fillColor('#000000').fontSize(9);
 
        // Advance the cursor by the actual measured row height, not a
        // fixed moveDown() guess - this is the core fix for overlapping text.
        doc.y = rowStartY + rowHeight;
      }
    }
 
    doc.moveDown(1);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total Steps: ${rows.length}  |  Passed: ${totalPassed}  |  Failed: ${totalFailed}`);
 
    doc.end();
 
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });
 
    console.log(`\nPDF test report written to: ${path.resolve(outputFile)}\n`);
  }
}
 
export default PdfReporter;