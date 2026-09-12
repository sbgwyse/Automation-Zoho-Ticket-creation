// email-helper.ts
//
// Sends the test-result email (with PDF/Excel attachments) via SMTP,
// using nodemailer. Requires these vars in .env:
//
//   SMTP_HOST=smtp.office365.com        (or your provider's SMTP host)
//   SMTP_PORT=587
//   SMTP_SECURE=false                   (true only if using port 465)
//   SMTP_USER=sbg@wyse.co.in
//   SMTP_PASS=your-smtp-password-or-app-password
//   SMTP_FROM=sbg@wyse.co.in            (optional, defaults to SMTP_USER)
//
// Install the package first (not yet in package.json):
//   npm install nodemailer
//   npm install --save-dev @types/nodemailer

import 'dotenv/config';
import nodemailer from 'nodemailer';

export interface SendReportEmailArgs {
  to: string[];       // recipient emails
  cc?: string[];       // cc emails, optional
  subject: string;
  description: string; // email body text
  attachments?: string[]; // absolute file paths (PDF, Excel, etc.)
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Missing SMTP config — set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env (see email-helper.ts header comment).',
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendReportEmail(args: SendReportEmailArgs): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: args.to.join(', '),
    cc: args.cc && args.cc.length ? args.cc.join(', ') : undefined,
    subject: args.subject,
    html: args.description.replace(/\n/g, '<br>'),
    attachments: (args.attachments || []).map((filePath) => ({ path: filePath })),
  });
}
