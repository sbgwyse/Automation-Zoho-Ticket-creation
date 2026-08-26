// replyToTicket.ts
//
// Adds a comment (with the latest report attached) to an EXISTING Zoho
// ticket that's already assigned to you — instead of creating a new one.
//
// You give it the ticket ID/number yourself; it does not search or guess.
//
// Run it after testing, from PowerShell:
//   npx ts-node replyToTicket.ts --ticket WBSPL16629 --status PASSED
//   npx ts-node replyToTicket.ts --ticket 16629 --status FAILED --module "Duty Roster"
//
// Or with an npm script (added to package.json):
//   npm run reply-ticket -- --ticket WBSPL16629 --status PASSED
//
// --ticket accepts what you see on the ticket (e.g. "WBSPL16629"), the bare
// number ("16629"), or the raw internal Zoho ticket ID — any non-digit
// characters are stripped and the ticket is looked up by number first,
// falling back to treating it as a raw internal ID if that lookup fails.
//
// By default it looks for the most recently generated report in
// test-results/ (report-*.pdf / report-*.xlsx, from "npm run test:report",
// "npm run test:full", or "npm run generate-report"). Override with
// --pdf / --excel if you want to attach specific files instead.

import * as path from 'path';
import * as fs from 'fs';
import {
  getTicketByNumber,
  getTicketById,
  addCommentToTicket,
  attachFileToTicket,
} from './zoho-helper';

/** Resolves whatever the user typed (display number, prefixed number, or
 * raw internal ID) to the ticket's real internal ID. */
async function resolveTicketId(input: string): Promise<string> {
  const digitsOnly = input.replace(/\D/g, '');

  if (digitsOnly) {
    try {
      const found = await getTicketByNumber(digitsOnly);
      console.log(`Matched "${input}" to ticket #${found.ticketNumber}: "${found.subject}"`);
      return found.id;
    } catch (err) {
      console.log(`Could not find a ticket by number "${digitsOnly}", trying "${input}" as a raw ticket ID...`);
    }
  }

  // Fall back to treating the input as the raw internal ticket ID.
  const found = await getTicketById(input);
  return found.id;
}

interface Args {
  ticket: string;
  status: 'PASSED' | 'FAILED';
  module: string;
  pdf?: string;
  excel?: string;
  comment?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback?: string) => {
    const idx = argv.indexOf(`--${flag}`);
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : fallback;
  };

  const ticket = get('ticket');
  if (!ticket) {
    console.error('Missing required flag: --ticket <id>');
    process.exit(1);
  }

  const status = (get('status', 'PASSED') as 'PASSED' | 'FAILED');
  const module = get('module', 'Automation')!;
  const pdf = get('pdf');
  const excel = get('excel');
  const comment = get('comment');

  return { ticket: ticket!, status, module, pdf, excel, comment };
}

/** Finds the newest file in test-results/ matching a given prefix+extension. */
function findLatestReportFile(outDir: string, extension: string): string | undefined {
  if (!fs.existsSync(outDir)) return undefined;

  const candidates = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith('report-') && f.endsWith(extension))
    .map((f) => ({ file: f, mtime: fs.statSync(path.join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  return candidates.length > 0 ? path.join(outDir, candidates[0].file) : undefined;
}

async function main() {
  const { ticket, status, module, pdf, excel, comment } = parseArgs();

  const outDir = 'test-results';
  const pdfPath = pdf ?? findLatestReportFile(outDir, '.pdf');
  const excelPath = excel ?? findLatestReportFile(outDir, '.xlsx');

  console.log(`Looking up ticket "${ticket}"...`);
  const internalId = await resolveTicketId(ticket);

  if (pdfPath && fs.existsSync(pdfPath)) {
    console.log('Attaching PDF:', pdfPath);
    await attachFileToTicket(internalId, pdfPath);
  } else {
    console.log('No PDF report found to attach (run "npm run generate-report" first, or pass --pdf).');
  }

  if (excelPath && fs.existsSync(excelPath)) {
    console.log('Attaching Excel:', excelPath);
    await attachFileToTicket(internalId, excelPath);
  } else {
    console.log('No Excel report found to attach (run "npm run generate-report" first, or pass --excel).');
  }

  const defaultComment =
    `Dear Team,<br>` +
    `We have re-tested the ${module} Form — status: <b>${status}</b>. Please see the attached report.<br><br>` +
    `Regards,<br>` +
    `Sanika Gore`;

  console.log('Adding comment to ticket...');
  await addCommentToTicket(internalId, comment ?? defaultComment);

  console.log(`Done — ticket "${ticket}" updated.`);
}

main().catch((err) => {
  console.error('Failed to update ticket:', err);
  process.exit(1);
});
