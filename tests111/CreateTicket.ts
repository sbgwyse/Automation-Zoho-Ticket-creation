import * as path from 'path';
import * as fs from 'fs';
import { createTicket, uploadFile as uploadFileToZoho, getAgentIdByEmail } from './zoho-helper';

/**
 * Standalone Zoho Desk ticket creator.
 *
 * Run it from PowerShell whenever YOU want a ticket created — it does not
 * run automatically as part of any test.
 *
 * Examples (PowerShell):
 *   npx ts-node createZohoTicket.ts --module "Duty Roster" --status PASSED
 *   npx ts-node createZohoTicket.ts --module "ELMS Reports" --status FAILED --assignee dsk@wyse.co.in
 *   npx ts-node createZohoTicket.ts --module "Duty Roster" --status PASSED --pdf .\TestResults\Automation_Report.pdf --excel .\TestResults\Automation_Report.xlsx
 *
 * If you add this to package.json:
 *   "scripts": { "create-ticket": "ts-node createZohoTicket.ts" }
 * you can instead run:
 *   npm run create-ticket -- --module "Duty Roster" --status PASSED
 */

interface Args {
  module: string;
  status: 'PASSED' | 'FAILED';
  pdf: string;
  excel: string;
  assignee: string;
  description?: string;
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

  return { module: module!, status, pdf, excel, assignee, description };
}

async function main() {
  const { module, status, pdf, excel, assignee, description } = parseArgs();

  console.log(`Creating Zoho ticket for module: ${module} [${status}]`);

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
    `We have tested the ${module} Form please see the Attachments.<br><br>` +
    `Regards,<br>` +
    `Sanika Gore`;

  const assigneeId = await getAgentIdByEmail(assignee);

  const ticket = await createTicket(
    `${module} - Test Report [${status}]`,
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