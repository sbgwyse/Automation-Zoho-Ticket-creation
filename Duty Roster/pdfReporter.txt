import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { ReportMeta, StepResult } from './reportTypes';

const NAVY = '#1F3864';
const HEADER_GRAY = '#D9D9D9';
const SUBTITLE_GRAY = '#808080';
const GREEN = '#008000';
const RED = '#C00000';

const PAGE_MARGIN = 40;
const COL_X = { field: 50, status: 300, duration: 400, error: 470 };
const ROW_HEIGHT = 18;
const SECTION_ROW_HEIGHT = 22;

export async function writePdfReport(results: StepResult[], meta: ReportMeta) {
  const folder = path.join(process.cwd(), 'TestResults');
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  const file = path.join(folder, 'Automation_Report.pdf');
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  doc.pipe(fs.createWriteStream(file));

  const pageWidth = doc.page.width - PAGE_MARGIN * 2;

  function drawHeader() {
    doc.fillColor('black').font('Helvetica-Bold').fontSize(20);
    doc.text(meta.formTitle, PAGE_MARGIN, doc.y, { align: 'center', width: pageWidth });

    doc.moveDown(0.3);
    doc.fillColor(SUBTITLE_GRAY).font('Helvetica').fontSize(10);
    doc.text(`Run date: ${new Date().toLocaleString()}`, PAGE_MARGIN, doc.y, {
      align: 'center',
      width: pageWidth,
    });

    doc.moveDown(1);
    doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
    doc.text(`Module: ${meta.module}`, PAGE_MARGIN, doc.y);
    doc.text(`Website: ${meta.website}`, PAGE_MARGIN, doc.y);
    if (meta.appVersion) {
      doc.text(
        `App Version: APP : ${meta.appVersion}  Release Date : ${meta.appReleaseDate}`,
        PAGE_MARGIN,
        doc.y,
      );
    }
    if (meta.apiVersion) {
      doc.text(
        `API Version: API : ${meta.apiVersion}  Release Date : ${meta.apiReleaseDate}`,
        PAGE_MARGIN,
        doc.y,
      );
    }

    doc.moveDown(0.8);
    drawTableHeader();
  }

  function drawTableHeader() {
    const y = doc.y;
    doc.rect(PAGE_MARGIN, y, pageWidth, ROW_HEIGHT).fill(HEADER_GRAY);
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
    doc.text('Form / Field', COL_X.field, y + 4);
    doc.text('Status', COL_X.status, y + 4);
    doc.text('Duration (s)', COL_X.duration, y + 4);
    doc.text('Error', COL_X.error, y + 4);
    doc.y = y + ROW_HEIGHT + 4;
  }

  function ensureSpace(height: number) {
    if (doc.y + height > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
      drawTableHeader();
    }
  }

  drawHeader();

  let currentSection = '';

  results.forEach((r) => {
    if (r.section !== currentSection) {
      currentSection = r.section;
      ensureSpace(SECTION_ROW_HEIGHT);
      const y = doc.y;
      doc.rect(PAGE_MARGIN, y, pageWidth, SECTION_ROW_HEIGHT).fill(NAVY);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(11);
      doc.text(currentSection, COL_X.field, y + 5);
      doc.y = y + SECTION_ROW_HEIGHT + 4;
    }

    ensureSpace(ROW_HEIGHT);
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor('black');
    doc.text(r.field, COL_X.field, y, { width: COL_X.status - COL_X.field - 10 });

    doc.font('Helvetica-Bold').fillColor(r.status === 'Passed' ? GREEN : RED);
    doc.text(r.status, COL_X.status, y);

    doc.font('Helvetica').fillColor('black');
    doc.text(r.duration, COL_X.duration, y);
    doc.text(r.error || '', COL_X.error, y, { width: pageWidth - (COL_X.error - PAGE_MARGIN) });

    doc.y = y + ROW_HEIGHT;
  });

  doc.end();
}