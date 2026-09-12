import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { spawn } from 'child_process';
import { createTicket, uploadFile as uploadFileToZoho, getAgentIdByEmail } from './zoho-helper';
interface Args {
  module: string;
  status: 'PASSED' | 'FAILED';
  pdf: string;
  excel: string;
  assignee: string;
  description?: string;
  subject?: string;
  to?: string;
  cc?: string;
  who?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback?: string) => {
    const idx = argv.indexOf(`--${flag}`);
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : fallback;
  };

  const module = get('module', 'General');
  const status = (get('status', 'PASSED') as 'PASSED' | 'FAILED');
  const pdf = get('pdf', path.join(process.cwd(), 'TestResults', 'Automation_Report.pdf'))!;
  const excel = get('excel', path.join(process.cwd(), 'TestResults', 'Automation_Report.xlsx'))!;
  const assignee = get('assignee', 'sbg@wyse.co.in')!;
  const description = get('description');
  const subject = get('subject');
  const to = get('to');
  const cc = get('cc');
  const who = get('who');

  return { module: module!, status, pdf, excel, assignee, description, subject, to, cc, who };
}

// ============================================================
// DISPLAY EMAIL DIRECTORY FROM data/*.csv
// ============================================================

function displayEmailDirectory(): void {

  const dataDir = path.join(__dirname, 'data');

  if (!fs.existsSync(dataDir)) {
    console.warn(`\n⚠️ Data folder not found: ${dataDir}\n`);
    return;
  }

  const csvFiles = fs
    .readdirSync(dataDir)
    .filter(file => file.toLowerCase().endsWith('.csv'));

  if (csvFiles.length === 0) {
    console.warn(`\n⚠️ No CSV file found in: ${dataDir}\n`);
    return;
  }

  // If contacts.csv exists, use it. Otherwise use the first CSV file.
  const preferredFile =
    csvFiles.find(file => file.toLowerCase() === 'zohoContacts.csv') ||
    csvFiles[0];

  const csvPath = path.join(dataDir, preferredFile);

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8').trim();

    if (!csvContent) {
      console.warn(`\n⚠️ CSV file is empty: ${csvPath}\n`);
      return;
    }

    const lines = csvContent
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0);

    const headers = lines[0]
      .split(',')
      .map(header => header.trim());

    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(value => value.trim());

      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      return row;
    });

    console.log('\n================================================');
    console.log('             EMAIL DIRECTORY');
    console.log('================================================');
    console.log(`CSV File: ${preferredFile}\n`);

    console.table(rows);

    console.log('================================================\n');

  } catch (error) {
    console.error(`\n❌ Failed to read CSV file: ${csvPath}`);
    console.error(error);
    console.log('');
  }
}

// Prompts the user for any of subject/to/cc that weren't already supplied via CLI flags.
async function promptForMissing(args: Args): Promise<Required<Pick<Args, 'subject' | 'to' | 'cc' | 'who'>>> {
  const rl = readline.createInterface({ input, output });

  try {
    const defaultSubject = ``;
    const subject =
      args.subject ??
      ((await rl.question(`Subject [${defaultSubject}]: `)) || defaultSubject);

    // Show the email directory (from data/*.csv) right after the subject
    // is captured, so the user has TO/CC options in front of them.
    displayEmailDirectory();

    const to = args.to ?? (await rl.question(`To : `));

    const cc = args.cc ?? (await rl.question(`CC : `));

    const defaultWho = 'Sanika Gore';
    const who =
      args.who ??
      ((await rl.question(`Who (raised by) [${defaultWho}]: `)) || defaultWho);

    return { subject, to, cc, who };
  } finally {
    rl.close();
  }
}

// Prompts the user with a yes/no question and returns true for y/yes (case-insensitive).
async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function runPlaywrightTest(testFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Running Playwright test: ${testFile}`);
    const child = spawn('npx', ['playwright', 'test', testFile], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, GENERATE_REPORT: 'true' },
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`Test exited with code ${code} (continuing to attach whatever report was generated).`);
      } else {
        console.log('Test finished successfully.');
      }
      resolve();
    });

    child.on('error', reject);
  });
}

async function main() {
  const args = parseArgs();
  const { module, status, pdf, excel, description } = args;

  const { subject, to, cc, who } = await promptForMissing(args);

  if (!to) {
    throw new Error('A "To" email address is required.');
  }

  console.log(`Module: ${module} [${status}]`);
  console.log(`Subject: ${subject}`);
  console.log(`To: ${to}`);
  console.log(`CC: ${cc || '(none)'}`);
  console.log(`Who: ${who}`);

  const confirmed = await confirm('Raise ticket? (y/n): ');
  if (!confirmed) {
    console.log('Aborted. No ticket was created.');
    return;
  }

  const defaultTestFile = 'tests/DutyRoster100.spec.ts';
  const testFileRl = readline.createInterface({ input, output });
  let testFile: string;
  try {
    testFile =
      (await testFileRl.question(`Test file path [${defaultTestFile}]: `)) || defaultTestFile;
  } finally {
    testFileRl.close();
  }

  await runPlaywrightTest(testFile);

  console.log('Creating Zoho ticket...');

  // Use the actual test file's base name (e.g. "tests/WFH.spec.ts" -> "WFH")
  // in the description, since that's what was actually tested this run.
  const testFileModule = path.basename(testFile).replace(/\.spec\.ts$/i, '');

  const uploadIds: string[] = [];

  if (fs.existsSync(pdf)) {
    console.log('Attaching PDF:', pdf);
    uploadIds.push(await uploadFileToZoho(pdf));
  } else {
    console.log('PDF not found, skipping attachment:', pdf);
  }

  if (fs.existsSync(excel)) {
    console.log('Attaching Excel:', excel);
    uploadIds.push(await uploadFileToZoho(excel));
  } else {
    console.log('Excel not found, skipping attachment:', excel);
  }

  const defaultDescription =
    `Dear Team,<br>` +
    `We have tested the ${testFileModule} Form please see the Attachments.<br><br>` +
    `Regards,<br>` +
    `${who}`;

  // "To" becomes the ticket's assignee/contact.
  const assigneeId = await getAgentIdByEmail(to);

  if (cc) {
    console.log('Note: CC is not applied to the ticket (Zoho Desk API does not support it at creation) — captured for reference only:', cc);
  }

  const ticket = await createTicket(
    subject,
    description ?? defaultDescription,
    uploadIds,
    assigneeId,
  );

  console.log('Zoho ticket created:', ticket.id);
}

main().catch((err) => {
  console.error('Failed to create Zoho ticket:', err);
  process.exit(1);
});