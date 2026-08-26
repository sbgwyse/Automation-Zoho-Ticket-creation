import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { ReportMeta, StepResult } from './reportTypes';

const NAVY = 'FF1F3864';
const HEADER_GRAY = 'FFD9D9D9';
const SUBTITLE_GRAY = 'FF808080';
const GREEN = 'FF008000';
const RED = 'FFC00000';

const COL_COUNT = 4; // Form/Field | Status | Duration (s) | Error

export async function writeExcelReport(results: StepResult[], meta: ReportMeta, fileName: string = 'Automation_Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Automation Report');

  sheet.columns = [
    { width: 45 }, // Form / Field
    { width: 14 }, // Status
    { width: 16 }, // Duration (s)
    { width: 45 }, // Error
  ];

  // --- Title ---
  const titleRow = sheet.addRow([meta.formTitle]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, COL_COUNT);
  titleRow.getCell(1).font = { size: 18, bold: true };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  titleRow.height = 28;

  // --- Run date subtitle ---
  const runDate = new Date().toLocaleString();
  const subtitleRow = sheet.addRow([`Run date: ${runDate}`]);
  sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, COL_COUNT);
  subtitleRow.getCell(1).font = { size: 10, italic: false, color: { argb: SUBTITLE_GRAY } };
  subtitleRow.getCell(1).alignment = { horizontal: 'center' };

  sheet.addRow([]);

  // --- Meta block (Module / Website / App version / API version) ---
  const metaLines: string[] = [`Module: ${meta.module}`, `Website: ${meta.website}`];
  if (meta.appVersion) {
    metaLines.push(
      `App Version: APP : ${meta.appVersion}  Release Date : ${meta.appReleaseDate}`,
    );
  }
  if (meta.apiVersion) {
    metaLines.push(
      `API Version: API : ${meta.apiVersion}  Release Date : ${meta.apiReleaseDate}`,
    );
  }
  metaLines.forEach((line) => {
    const row = sheet.addRow([line]);
    sheet.mergeCells(row.number, 1, row.number, COL_COUNT);
    row.getCell(1).font = { bold: true, size: 10 };
  });

  sheet.addRow([]);

  // --- Table header row ---
  const header = sheet.addRow(['Form / Field', 'Status', 'Duration (s)', 'Error']);
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_GRAY } };
  });

  // --- Section rows + data rows ---
  let currentSection = '';

  results.forEach((r) => {
    if (r.section !== currentSection) {
      currentSection = r.section;
      const sectionRow = sheet.addRow([currentSection]);
      sheet.mergeCells(sectionRow.number, 1, sectionRow.number, COL_COUNT);
      sectionRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sectionRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: NAVY },
      };
      sectionRow.height = 20;
    }

    const row = sheet.addRow([r.field, r.status, r.duration, r.error || '']);

    // Plain bold colored text, no fill — matches the finalized style
    row.getCell(2).font = {
      bold: true,
      color: { argb: r.status === 'Passed' ? GREEN : RED },
    };
  });

  const folder = path.join(process.cwd(), 'TestResults');
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  await workbook.xlsx.writeFile(path.join(folder, `${fileName}.xlsx`));
}