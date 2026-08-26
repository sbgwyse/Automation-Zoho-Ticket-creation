import type {
  Reporter, FullConfig, Suite, TestCase, TestResult, FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/**
 * All-in-one Playwright reporter: writes both .xlsx and .pdf test
 * reports automatically at the end of `npx playwright test`, in the
 * Module/Website/Version + section/table layout.
 *
 * Wire into playwright.config.ts:
 *   reporter: [['list'], ['./reporting/reporter.ts', { reportTitle: 'Client Registration - Test Report' }]]
 *
 * test.describe() title -> section row (e.g. "Login")
 * test() title           -> "<section> - <test title>" row
 *
 * TODO (Sanika): Module/Website/App+API Version are stubbed below —
 * set ENV_INFO_URL to a real endpoint returning JSON with those fields,
 * or REPORT_MODULE / REPORT_WEBSITE for static fallbacks. Until then
 * everything shows literal "loading..." like your reference screenshot.
 */

interface ReporterOptions {
  reportTitle?: string;
  outDir?: string;
}

interface Row {
  section: string;
  field: string;
  status: 'Passed' | 'Failed' | 'Skipped' | 'Timed Out';
  durationSeconds: number;
  date: string;
  fileKey: string;   // which spec file this test came from — used to group into separate reports
}

const NAVY = 'FF2F4C7C', LIGHT_BLUE = 'FF8DA9C4', GREEN = 'FFC6EFCE', RED = 'FFFFC7CE', YELLOW = 'FFFFEB9C';
const NAVY_HEX = '#2F4C7C', LIGHT_BLUE_HEX = '#8DA9C4', GREEN_HEX = '#C6EFCE', RED_HEX = '#FFC7CE', YELLOW_HEX = '#FFEB9C';
const XL_FILL: Record<string, string> = { Passed: GREEN, Failed: RED, Skipped: YELLOW, 'Timed Out': RED };
const PDF_FILL: Record<string, string> = { Passed: GREEN_HEX, Failed: RED_HEX, Skipped: YELLOW_HEX, 'Timed Out': RED_HEX };

async function fetchEnvInfo() {
  const fallback = {
    module: process.env.REPORT_MODULE ?? 'loading...',
    website: process.env.REPORT_WEBSITE ?? 'loading...',
    appVersion: 'loading...', appReleaseDate: 'loading...',
    apiVersion: 'loading...', apiReleaseDate: 'loading...',
  };
  const url = process.env.ENV_INFO_URL;
  if (!url) return fallback;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`ENV_INFO_URL responded ${res.status}`);
    const d = await res.json();
    return {
      module: d.module ?? fallback.module,
      website: d.website ?? fallback.website,
      appVersion: d.appVersion ?? fallback.appVersion,
      appReleaseDate: d.appReleaseDate ?? fallback.appReleaseDate,
      apiVersion: d.apiVersion ?? fallback.apiVersion,
      apiReleaseDate: d.apiReleaseDate ?? fallback.apiReleaseDate,
    };
  } catch (err) {
    console.warn(`[report] ENV_INFO_URL fetch failed (${(err as Error).message}); using fallback values.`);
    return fallback;
  }
}

function statusToLabel(status: TestResult['status']): Row['status'] {
  if (status === 'passed') return 'Passed';
  if (status === 'skipped') return 'Skipped';
  if (status === 'timedOut') return 'Timed Out';
  return 'Failed';
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

// Nearest enclosing test.describe() title (skips the file-path suite).
function findSectionTitle(test: TestCase): string {
  let suite: Suite | undefined = test.parent;
  while (suite) {
    const isFileSuite = /\.(spec|test)\.[tj]s$/.test(suite.title);
    if (suite.title && !isFileSuite) return suite.title;
    suite = suite.parent;
  }
  return 'Uncategorized';
}

// The spec file's own path (e.g. "tests/LOPReport.spec.ts") — used to
// group tests from different files into separate reports.
function findFileKey(test: TestCase): string {
  let suite: Suite | undefined = test.parent;
  while (suite) {
    if (/\.(spec|test)\.[tj]s$/.test(suite.title)) return suite.title;
    suite = suite.parent;
  }
  return test.location?.file ?? 'unknown-file';
}

// "tests/LOPReport.spec.ts" -> "LOP Report"
function humanizeFileKey(fileKey: string): string {
  const base = path.basename(fileKey).replace(/\.(spec|test)\.[tj]s$/, '');
  const spaced = base
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // acronym run -> next word, e.g. "LOPReport" -> "LOP Report"
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')     // camelCase -> spaced
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function writeExcel(header: Record<string, string>, title: string, rows: Row[], outPath: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');
  ws.columns = [{ width: 45 }, { width: 14 }, { width: 14 }, { width: 22 }];

  const titleRow = ws.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, 4);

  const line = (text: string) => {
    const row = ws.addRow([text]);
    row.font = { bold: true };
    ws.mergeCells(row.number, 1, row.number, 4);
  };
  line(`Module: ${header.module}`);
  line(`Website: ${header.website}`);
  line(`App Version: APP : ${header.appVersion}   Release Date : ${header.appReleaseDate}`);
  line(`API Version: API : ${header.apiVersion}   Release Date : ${header.apiReleaseDate}`);
  ws.addRow([]);

  const tableHeader = ws.addRow(['Form / Field', 'Status', 'Duration (s)', 'Date']);
  tableHeader.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws.autoFilter = { from: { row: tableHeader.number, column: 1 }, to: { row: tableHeader.number, column: 4 } };

  let currentSection: string | null = null;
  for (const r of rows) {
    if (r.section !== currentSection) {
      currentSection = r.section;
      const sectionRow = ws.addRow([r.section]);
      ws.mergeCells(sectionRow.number, 1, sectionRow.number, 4);
      sectionRow.eachCell((c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
      });
    }
    const dataRow = ws.addRow([r.field, r.status, r.durationSeconds, r.date]);
    const statusCell = dataRow.getCell(2);
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_FILL[r.status] ?? 'FFFFFFFF' } };
    statusCell.alignment = { horizontal: 'center' };
    dataRow.getCell(3).alignment = { horizontal: 'right' };
  }

  await wb.xlsx.writeFile(outPath);
}

function writePdf(header: Record<string, string>, title: string, rows: Row[], outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);

    const COL_X = [40, 300, 380, 450];
    const COL_W = [260, 80, 70, 105];
    const RIGHT = 40 + 260 + 80 + 70 + 105;
    const ROW_H = 20;

    doc.font('Helvetica-Bold').fontSize(16).fillColor('black').text(title);
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(`Module: ${header.module}`);
    doc.text(`Website: ${header.website}`);
    doc.text(`App Version: APP : ${header.appVersion}   Release Date : ${header.appReleaseDate}`);
    doc.text(`API Version: API : ${header.apiVersion}   Release Date : ${header.apiReleaseDate}`);
    doc.moveDown(0.6);

    let y = doc.y;
    const ensureSpace = (needed: number) => {
      if (y + needed > doc.page.height - 40) { doc.addPage(); y = 40; }
    };
    const drawHeaderRow = () => {
      ensureSpace(ROW_H);
      doc.rect(COL_X[0], y, RIGHT - COL_X[0], ROW_H).fill(NAVY_HEX);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
      ['Form / Field', 'Status', 'Duration (s)', 'Date'].forEach((h, i) => doc.text(h, COL_X[i] + 4, y + 5, { width: COL_W[i] - 8 }));
      y += ROW_H;
    };
    drawHeaderRow();

    let currentSection: string | null = null;
    for (const r of rows) {
      if (r.section !== currentSection) {
        currentSection = r.section;
        ensureSpace(ROW_H);
        doc.rect(COL_X[0], y, RIGHT - COL_X[0], ROW_H).fill(LIGHT_BLUE_HEX);
        doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
        doc.text(r.section, COL_X[0] + 4, y + 5);
        y += ROW_H;
      }
      ensureSpace(ROW_H);
      doc.rect(COL_X[0], y, RIGHT - COL_X[0], ROW_H).stroke('#D9D9D9');
      doc.rect(COL_X[1], y, COL_W[1], ROW_H).fill(PDF_FILL[r.status] ?? '#FFFFFF');
      doc.fillColor('black').font('Helvetica').fontSize(9);
      doc.text(r.field, COL_X[0] + 4, y + 5, { width: COL_W[0] - 8 });
      doc.text(r.status, COL_X[1] + 4, y + 5, { width: COL_W[1] - 8, align: 'center' });
      doc.text(String(r.durationSeconds), COL_X[2] + 4, y + 5, { width: COL_W[2] - 8, align: 'right' });
      doc.text(r.date, COL_X[3] + 4, y + 5, { width: COL_W[3] - 8 });
      y += ROW_H;
    }
    doc.end();
  });
}

export default class XlsxPdfReporter implements Reporter {
  private options: ReporterOptions;
  private rows: Row[] = [];
  private startedAt = new Date();

  constructor(options: ReporterOptions = {}) {
    this.options = options;
  }

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startedAt = new Date();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const section = findSectionTitle(test);
    this.rows.push({
      section,
      field: `${section} - ${test.title}`,
      status: statusToLabel(result.status),
      durationSeconds: Math.round(result.duration / 100) / 10,
      date: formatDate(new Date(result.startTime)),
      fileKey: findFileKey(test),
    });
  }

  async onEnd(_result: FullResult) {
    const env = await fetchEnvInfo();
    const outDir = this.options.outDir ?? path.join('test-results', 'reports');
    fs.mkdirSync(outDir, { recursive: true });
    const dateStamp = this.startedAt.toISOString().slice(0, 10);

    // Group rows by spec file — one xlsx + one pdf per file, so running
    // the whole tests/ folder produces a separate report per module
    // instead of one file lumping every spec together.
    const byFile = new Map<string, Row[]>();
    for (const row of this.rows) {
      const list = byFile.get(row.fileKey) ?? [];
      list.push(row);
      byFile.set(row.fileKey, list);
    }

    // If a fixed reportTitle was passed AND there's only one file's
    // worth of tests, honor it as-is (covers "run a single spec"
    // usage). Otherwise each file gets its own humanized title, so a
    // full-folder run produces distinctly-named reports per module.
    const singleFileRun = byFile.size === 1 && this.options.reportTitle;

    for (const [fileKey, rows] of byFile) {
      const humanized = humanizeFileKey(fileKey);
      const title = singleFileRun ? this.options.reportTitle! : `${humanized} - Test Report`;
      const moduleName = process.env.REPORT_MODULE ?? humanized;
      const header = { ...env, module: moduleName };

      const baseName = `${moduleName.replace(/[\\/:*?"<>|]/g, '_')}_${dateStamp}`;
      const xlsxPath = path.join(outDir, `${baseName}.xlsx`);
      const pdfPath = path.join(outDir, `${baseName}.pdf`);

      await writeExcel(header, title, rows, xlsxPath);
      await writePdf(header, title, rows, pdfPath);

      console.log(`[report] Wrote ${xlsxPath}`);
      console.log(`[report] Wrote ${pdfPath}`);
    }
    console.log('');
  }
}