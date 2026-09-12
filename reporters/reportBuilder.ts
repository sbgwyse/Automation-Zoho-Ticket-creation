// reportBuilder.ts
//
// Shared PDF/Excel report-building logic. Used by BOTH:
//   - custom-report.ts   (the automatic Playwright reporter)
//   - generateReport.ts  (the on-demand "build the report later" script)
// so the report format only lives in one place.

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

export interface StepRecord {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
}

export interface AttachmentRecord {
  name: string;
  filePath: string;
}

export interface ReportMeta {
  formTitle: string;
  websiteUrl: string;
  sourceType: string;
  sourceId: string;
  subject: string;
  description: string;
}

export interface TestRecord {
  title: string;
  status: string;
  durationMs: number;
  steps: StepRecord[];
  attachments: AttachmentRecord[];
  reportMeta?: ReportMeta;
}

/** Formats a date as DD-MM-YYYY for use in report file names. */
export function buildFileDate(date: Date): string {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('-');
}

export function generatePdfReport(
  records: TestRecord[],
  date: Date,
  outDir: string,
  fileDate: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(outDir, `report-${fileDate}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(18).text('Automation Test Report', { align: 'center' });
    doc.fontSize(10).fillColor('gray').text(date.toString(), { align: 'center' });
    doc.fillColor('black');
    doc.moveDown(1.5);

    records.forEach((record, idx) => {
      if (idx > 0) doc.addPage();

      const meta = record.reportMeta;

      doc.fontSize(14).text(meta?.formTitle || record.title, { underline: true });

      if (meta) {
        doc.fontSize(9).fillColor('gray');
        doc.text(`Website: ${meta.websiteUrl}`);
        doc.text(`Source: ${meta.sourceType} #${meta.sourceId}`);
        doc.text(`Subject: ${meta.subject}`);
        doc.fillColor('black');
      }

      doc.moveDown(0.4);

      doc
        .fontSize(11)
        .fillColor(record.status === 'passed' ? 'green' : 'red')
        .text(`Status: ${record.status.toUpperCase()}`);

      doc
        .fillColor('black')
        .fontSize(10)
        .text(`Duration: ${(record.durationMs / 1000).toFixed(2)}s`);

      doc.moveDown(0.5);

      doc.fontSize(12).text('Steps:', { underline: true });

      record.steps.forEach((step) => {
        const color = step.status === 'passed' ? 'green' : step.status === 'failed' ? 'red' : 'gray';

        doc
          .fontSize(10)
          .fillColor(color)
          .text(`[${step.status.toUpperCase()}] ${step.title} (${(step.durationMs / 1000).toFixed(2)}s)`);

        if (step.error) {
          doc.fontSize(9).fillColor('red').text(step.error, { indent: 12 });
        }
      });

      doc.fillColor('black');

      if (record.attachments.length) {
        doc.moveDown(0.5);
        doc.fontSize(12).text('Screenshots:', { underline: true });

        record.attachments.forEach((att) => {
          try {
            doc.moveDown(0.3);
            doc.fontSize(9).text(att.name);
            doc.image(att.filePath, { fit: [480, 300] });
          } catch {
            doc.fontSize(9).fillColor('red').text(`(could not embed ${att.name})`);
            doc.fillColor('black');
          }
        });
      }
    });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

export async function generateExcelReport(
  records: TestRecord[],
  outDir: string,
  fileDate: string,
): Promise<string> {
  const filePath = path.join(outDir, `report-${fileDate}.xlsx`);
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Summary');

  summarySheet.columns = [
    { header: 'Test', key: 'title', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Duration (s)', key: 'duration', width: 14 },
    { header: 'Subject', key: 'subject', width: 30 },
    { header: 'Website', key: 'website', width: 30 },
  ];

  summarySheet.getRow(1).font = { bold: true };

  records.forEach((r) => {
    summarySheet.addRow({
      title: r.title,
      status: r.status,
      duration: (r.durationMs / 1000).toFixed(2),
      subject: r.reportMeta?.subject || '',
      website: r.reportMeta?.websiteUrl || '',
    });
  });

  const stepsSheet = workbook.addWorksheet('Steps');

  stepsSheet.columns = [
    { header: 'Test', key: 'test', width: 40 },
    { header: 'Step', key: 'step', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Duration (s)', key: 'duration', width: 14 },
    { header: 'Error', key: 'error', width: 50 },
  ];

  stepsSheet.getRow(1).font = { bold: true };

  records.forEach((r) => {
    r.steps.forEach((s) => {
      stepsSheet.addRow({
        test: r.title,
        step: s.title,
        status: s.status,
        duration: (s.durationMs / 1000).toFixed(2),
        error: s.error || '',
      });
    });
  });

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
