import 'dotenv/config';

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { spawnSync } from 'child_process';
import { chromium } from '@playwright/test';

import {
  getTicket,
  getAccessToken,
  replyToTicket
} 
from './fetch-ticket';

import { getTask } from './fetch-task';


// ============================================================
// READLINE
// ============================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


function ask(question: string): Promise<string> {

  return new Promise(resolve => {

    rl.question(question, answer => {

      resolve((answer || '').trim());

    });

  });

}


// ============================================================
// EMAIL LIST PARSER (comma-separated -> trimmed array)
// ============================================================

function parseEmailList(input: string): string[] {

  return input
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0);

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


// ============================================================
// LOGIN ERROR MESSAGES
// ============================================================

const LOGIN_ERROR_SNIPPETS = [
  'login not created',
  'invalid credentials',
  'kindly contact hr',
];


// ============================================================
// CHECK CREDENTIALS
// ============================================================

async function checkCredentials(
  url: string,
  username: string,
  password: string
): Promise<boolean> {

  const browser = await chromium.launch();

  try {

    const page = await browser.newPage();

    await page.goto(url);

    await page
      .getByRole('textbox', { name: 'Username' })
      .fill(username);

    await page
      .getByRole('textbox', { name: 'Password' })
      .fill(password);

    await page
      .getByRole('button', { name: 'Sign In' })
      .click();

    await page
      .waitForLoadState('networkidle')
      .catch(() => { });

    const bodyText =
      await page
        .locator('body')
        .innerText()
        .catch(() => '');

    const lower =
      bodyText.toLowerCase();

    const hasError =
      LOGIN_ERROR_SNIPPETS.some(
        snippet => lower.includes(snippet)
      );

    return !hasError;

  }

  finally {

    await browser.close();

  }

}


// ============================================================
// FIND PLAYWRIGHT PROJECT ROOT
// ============================================================

function findProjectRoot(
  startPath: string
): string {

  let currentPath =
    path.resolve(
      path.dirname(startPath)
    );

  while (true) {

    const playwrightConfigTs =
      path.join(
        currentPath,
        'playwright.config.ts'
      );

    const playwrightConfigJs =
      path.join(
        currentPath,
        'playwright.config.js'
      );

    const packageJson =
      path.join(
        currentPath,
        'package.json'
      );


    // Prefer Playwright config
    if (
      fs.existsSync(playwrightConfigTs) ||
      fs.existsSync(playwrightConfigJs)
    ) {

      return currentPath;

    }


    // package.json fallback
    if (
      fs.existsSync(packageJson)
    ) {

      return currentPath;

    }


    const parentPath =
      path.dirname(currentPath);


    if (
      parentPath === currentPath
    ) {

      break;

    }


    currentPath =
      parentPath;

  }


  return path.resolve(
    path.dirname(startPath)
  );

}


// ============================================================
// RUN EXISTING PLAYWRIGHT TEST
// ============================================================
// Returns both whether the run passed AND the resolved project
// root, since the caller needs projectRoot to correctly locate
// the report files this run just generated (they're written
// relative to projectRoot, not to this script's own cwd).

function runPlaywrightTest(
  testFilePath: string,
  url: string,
  username: string,
  password: string,
  sourceType: 'ticket' | 'task',
  sourceId: string,
  reportTitle: string,
  subject: string,
  description: string,
  requesterEmail: string
): { passed: boolean; projectRoot: string } {

  console.log('\n==========================================');
  console.log('       PLAYWRIGHT TEST CASE RUNNER');
  console.log('==========================================\n');


  // ----------------------------------------------------------
  // Find project root
  // ----------------------------------------------------------

  const projectRoot =
    findProjectRoot(testFilePath);


  // ----------------------------------------------------------
  // Relative test path
  // ----------------------------------------------------------

  const relativeTestPath =
    path
      .relative(
        projectRoot,
        testFilePath
      )
      .replace(/\\/g, '/');


  console.log('PLAYWRIGHT PROJECT');
  console.log('------------------------------------------');

  console.log(
    `Root : ${projectRoot}`
  );

  console.log(
    `File : ${relativeTestPath}`
  );

  console.log('------------------------------------------\n');


  // ----------------------------------------------------------
  // Find Playwright executable
  // ----------------------------------------------------------

  const playwrightCommand =
    process.platform === 'win32'
      ? path.join(
          projectRoot,
          'node_modules',
          '.bin',
          'playwright.cmd'
        )
      : path.join(
          projectRoot,
          'node_modules',
          '.bin',
          'playwright'
        );


  console.log(
    `Playwright executable: ${playwrightCommand}`
  );


  if (
    !fs.existsSync(playwrightCommand)
  ) {

    console.error(
      '\n❌ Playwright executable not found!'
    );

    console.error(
      `Expected: ${playwrightCommand}`
    );

    console.error(
      '\nRun npm install inside the Playwright project.'
    );

    return { passed: false, projectRoot };

  }


  // ----------------------------------------------------------
  // Find Playwright CLI
  // ----------------------------------------------------------

  const playwrightCli =
    path.join(
      projectRoot,
      'node_modules',
      'playwright',
      'cli.js'
    );


  console.log(
    `Playwright CLI: ${playwrightCli}`
  );


  if (
    !fs.existsSync(playwrightCli)
  ) {

    console.error(
      '\n❌ Playwright CLI not found!'
    );

    console.error(
      `Expected: ${playwrightCli}`
    );

    console.error(
      '\nRun npm install inside the Playwright project.'
    );

    return { passed: false, projectRoot };

  }


  // ----------------------------------------------------------
  // Display metadata
  // ----------------------------------------------------------

  console.log('\n==========================================');
  console.log('RUNNING EXISTING PLAYWRIGHT TEST');
  console.log('==========================================');

  console.log(
    `Report Title : ${reportTitle}`
  );

  console.log(
    `Source       : ${sourceType}`
  );

  console.log(
    `Source ID    : ${sourceId}`
  );

  console.log(
    `URL          : ${url}`
  );

  console.log(
    `Test File    : ${relativeTestPath}`
  );

  console.log(
    `Mode         : HEADed`
  );

  console.log('==========================================\n');


  // ----------------------------------------------------------
  // Run existing test
  // ----------------------------------------------------------

  const result =
    spawnSync(
      process.execPath,
      [
        playwrightCli,
        'test',
        relativeTestPath,
        '--headed',
      ],
      {
        cwd: projectRoot,

        stdio: 'inherit',

        shell: false,

        // Pass useful information to the existing
        // Playwright test through environment variables.
        env: {
          ...process.env,

          // Force report generation on every run through this script,
          // regardless of what's set (or not set) in .env
          GENERATE_REPORT: 'true',

          TEST_URL: url,

          TEST_USERNAME: username,

          TEST_PASSWORD: password,

          REPORT_TITLE: reportTitle,

          SOURCE_TYPE: sourceType,

          SOURCE_ID: sourceId,

          TICKET_SUBJECT: subject,

          TICKET_DESCRIPTION: description,

          REQUESTER_EMAIL: requesterEmail,
        },
      }
    );


  // ----------------------------------------------------------
  // Process-start error
  // ----------------------------------------------------------

  if (
    result.error
  ) {

    console.error(
      '\n❌ Failed to start Playwright:'
    );

    console.error(
      result.error
    );

    return { passed: false, projectRoot };

  }


  // ----------------------------------------------------------
  // Result
  // ----------------------------------------------------------

  console.log(
    `\nPlaywright exit status: ${result.status}`
  );

  console.log(
    `Playwright signal: ${result.signal}`
  );


  if (
    result.status === 0
  ) {

    console.log(
      '\n=========================================='
    );

    console.log(
      '✅ TEST EXECUTION COMPLETED'
    );

    console.log(
      '==========================================\n'
    );

    return { passed: true, projectRoot };

  }


  console.log(
    '\n=========================================='
  );

  console.log(
    '❌ TEST EXECUTION FAILED'
  );

  console.log(
    '=========================================='
  );

  console.log(
    '\nReport will still be generated.\n'
  );


  return { passed: false, projectRoot };

}


// ============================================================
// MAIN
// ============================================================

async function main() {

  console.log('\n=================================');
  console.log('ZOHO DESK TEST AUTOMATION');
  console.log('=================================\n');


  // ==========================================================
  // GET TICKET / TASK ARGUMENT
  // ==========================================================

  const ticketArg =
    process.argv.find(
      a => a.startsWith('--ticket=')
    );


  const taskArg =
    process.argv.find(
      a => a.startsWith('--task=')
    );


  let sourceType:
    'ticket' | 'task';


  let sourceId:
    string;


  if (ticketArg) {

    sourceType =
      'ticket';

    sourceId =
      ticketArg.split('=')[1];

  }

  else if (taskArg) {

    sourceType =
      'task';

    sourceId =
      taskArg.split('=')[1];

  }

  else {

    const type =
      await ask(
        'Ticket or Task? '
      );


    sourceType =
      type
        .toLowerCase()
        .startsWith('task')
        ? 'task'
        : 'ticket';


    sourceId =
      await ask(
        'Enter ID: '
      );

  }


  displayEmailDirectory();
  // ==========================================================
  // EMAIL RECIPIENTS (asked upfront, right after ticket/task ID)
  // ==========================================================

  const toInput =
    await ask(
      '\nEnter TO email address: '
    );

  const ccInput =
    await ask(
      'Enter CC email address: '
    );

  const emailToList =
    parseEmailList(toInput);
  console.log(emailToList);
  const emailCcList =
    parseEmailList(ccInput);
  console.log(emailCcList);

  // ==========================================================
  // VARIABLES
  // ==========================================================

  let subject = '';

  let description = '';

  let requesterEmail = '';
  
  let ticketId = '';

  // ==========================================================
  // FETCH TICKET / TASK
  // ==========================================================

  console.log('\nFetching...');


  if (
    sourceType === 'ticket'
  ) {

    const ticket =
      await getTicket(
        sourceId
      );
    ticketId = ticket.id;

    subject =
      ticket.subject;


    description =
      ticket.description;


    requesterEmail =
      ticket.requesterEmail || '';

  }

  else {

    const task =
      await getTask(
        sourceId
      );


    subject =
      task.subject;


    description =
      task.description;


    requesterEmail =
      (task as any).requesterEmail || '';

  }


  // ==========================================================
  // DISPLAY REQUIREMENTS
  // ==========================================================

  console.log(
    '\n============== REQUIREMENTS =============='
  );

  console.log(
    subject
  );

  console.log(
    '------------------------------------------'
  );

  console.log(
    description
  );

  console.log(
    '==========================================\n'
  );


  // ==========================================================
  // DETECT URL
  // ==========================================================

  const urlMatch =
    description.match(
      /https?:\/\/\S+/
    );


  const detectedUrl =
    urlMatch
      ? urlMatch[0]
          .replace(/[.,]+$/, '')
      : '';


  const url =
    await ask(
      `URL ${
        detectedUrl
          ? `[Enter=${detectedUrl}]`
          : ''
      }: `
    )
    || detectedUrl;


  if (!url) {

    console.error(
      'URL missing'
    );

    rl.close();

    process.exit(1);

  }


  // ==========================================================
  // CREDENTIAL LOOP
  // ==========================================================

  let username = '';

  let password = '';

  let credentialsValid = false;


  while (
    !credentialsValid
  ) {

    username =
      await ask(
        'Username: '
      );


    password =
      await ask(
        'Password: '
      );


    console.log(
      '\nChecking Credentials...'
    );


    credentialsValid =
      await checkCredentials(
        url,
        username,
        password
      );


    if (
      !credentialsValid
    ) {

      console.log(
        '❌ Wrong. Please try again.\n'
      );

    }

    else {

      console.log(
        '✅ Success\n'
      );

    }

  }


  // ==========================================================
  // REPORT TITLE
  // ==========================================================

  const reportTitle =
    await ask(
      `Report title [Enter=${subject}]: `
    )
    || subject;


  // ==========================================================
  // EXISTING PLAYWRIGHT TEST FILE
  // ==========================================================

  console.log('\n==========================================');

  console.log(
    '       EXISTING PLAYWRIGHT TEST'
  );

  console.log(
    '==========================================\n'
  );


  const inputPath =
    await ask(
      'Enter the full path of the Playwright test file:\n> '
    );


  if (
    !inputPath.trim()
  ) {

    console.error(
      '\n❌ No test file path entered.'
    );

    rl.close();

    process.exit(1);

  }


  // Remove surrounding quotes
  const testFilePath =
    path.resolve(
      inputPath
        .trim()
        .replace(
          /^["']|["']$/g,
          ''
        )
    );


  console.log(
    `\nTest file: ${testFilePath}`
  );


  // ==========================================================
  // CHECK FILE EXISTS
  // ==========================================================

  if (
    !fs.existsSync(testFilePath)
  ) {

    console.error(
      '\n❌ Test file not found!'
    );

    console.error(
      `Path: ${testFilePath}`
    );

    rl.close();

    process.exit(1);

  }


  // ==========================================================
  // CHECK TEST FILE EXTENSION
  // ==========================================================

  const extension =
    path
      .extname(testFilePath)
      .toLowerCase();


  if (
    extension !== '.ts' &&
    extension !== '.js' &&
    extension !== '.mts' &&
    extension !== '.mjs'
  ) {

    console.error(
      '\n❌ Invalid test file type.'
    );

    console.error(
      'Please select a Playwright test file such as .spec.ts or .spec.js'
    );

    rl.close();

    process.exit(1);

  }


  // ==========================================================
  // RUN EXISTING TEST
  // ==========================================================

  const { passed: testPassed, projectRoot } =
    runPlaywrightTest(
      testFilePath,
      url,
      username,
      password,
      sourceType,
      sourceId,
      reportTitle,
      subject,
      description,
      requesterEmail
    );


  const outDir =
    path.join(
      projectRoot,
      'TestResults'
    );


  const pdfPath =
    path.join(
      outDir,
      'Automation_Report.pdf'
    );


  const excelPath =
    path.join(
      outDir,
      'Automation_Report.xlsx'
    );


  const reportAttachments =
    [
      pdfPath,
      excelPath
    ]
    .filter(
      p => fs.existsSync(p)
    );


  // ==========================================================
  // CHECK REPORT FILES
  // ==========================================================

  if (
    reportAttachments.length < 2
  ) {

    console.warn(
      '\n⚠️ Could not find both report files at the expected paths:\n' +
      `   ${pdfPath}\n` +
      `   ${excelPath}\n` +
      'Adjust the paths above if generatePDF/generateExcel write elsewhere.\n'
    );

  }


  // ==========================================================
  // SUMMARY
  // ==========================================================
  // Description format matches createTicket.ts: "Dear Team, We
  // have tested the <module> Form please see the Attachments.
  // Regards, <who>" — module is derived from the actual test
  // file that was run, not the ticket subject.

  const testFileModule =
    path
      .basename(testFilePath)
      .replace(/\.spec\.(ts|js|mts|mjs)$/i, '');

  const who = 'Sanika Gore';

  const summary =
    `Dear Team,\n` +
    `We have checked and observed that the ${testFileModule} Form is  working as expected.\n` +
    `Please see the Attachments.\n\n` +
    `Regards,\n` +
    `${who}`;


  // ==========================================================
  // REPLY TO ZOHO TICKET
  // ==========================================================

  if (
    sourceType === 'ticket'
  ) {

    console.log(
      '\nReplying to ticket...'
    );

    console.log(
      `Attaching ${reportAttachments.length} report file(s): ${reportAttachments.map(p => path.basename(p)).join(', ') || '(none found)'}`
    );


    try {

      const accessToken =
        await getAccessToken();


      await replyToTicket(
        sourceId,

        accessToken,

        summary.replace(
          /\n/g,
          '<br>'
        ),

        emailToList.join(',') || requesterEmail,

        reportAttachments.map(
          p => ({
            path: p,
            name: path.basename(p)
          })
        ),

        emailCcList.length ? emailCcList.join(',') : undefined
      );


      console.log(
        'Ticket reply sent.'
      );

    }

    catch (err) {

      console.error(
        'Failed to reply to ticket:',
        err
      );

    }

  }

  else {

    console.log(
      '\nSkipping ticket reply (source is a task, not a ticket).'
    );

  }


  // ==========================================================
  // FINAL
  // ==========================================================

  console.log(
    '\nCheck TestResults folder.'
  );


  rl.close();

}


// ============================================================
// ERROR HANDLING
// ============================================================

main()
  .catch(err => {

    console.error(
      err
    );

    rl.close();

    process.exit(1);

  });