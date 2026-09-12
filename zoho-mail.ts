
 
import 'dotenv/config';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
 
export async function sendEmailWithReport(
  accessToken: string,
  ticketId: string,
  to: string[],
  cc: string[],
  subject: string,
  content: string,
  attachmentPaths: string[]
) {
  const {
    ZOHO_API_DOMAIN,
    ZOHO_ORG_ID,
  } = process.env;
 
  if (!ZOHO_API_DOMAIN || !ZOHO_ORG_ID) {
    throw new Error(
      'Missing ZOHO_API_DOMAIN or ZOHO_ORG_ID in .env'
    );
  }
 
  if (!to || !to.length) {
    throw new Error(
      'sendEmailWithReport called with no TO address'
    );
  }
 
  console.log('Sending email...');
  console.log(`TO: ${to.join(', ')}`);
  console.log(`CC: ${cc?.join(', ') || '(none)'}`);
  console.log(`Ticket ID: ${ticketId}`);
 
  // ============================================================
  // 1. Upload attachments to Zoho Desk
  // ============================================================
  //
  // NOTE: Zoho Desk's /uploads endpoint requires a proper
  // multipart/form-data request with the file under a field
  // named "file" — sending the raw bytes as the body with
  // Content-Type: application/octet-stream (the old approach)
  // is rejected with "errorType: missing, fieldName: /file"
  // because Zoho never receives a recognizable form field.
 
  const attachmentIds: string[] = [];
 
  for (const filePath of attachmentPaths) {
 
    if (!fs.existsSync(filePath)) {
      console.warn(
        `Report file not found, skipping: ${filePath}`
      );
      continue;
    }
 
    const fileName = path.basename(filePath);
 
    console.log(
      `Uploading attachment: ${fileName}`
    );
 
    const form = new FormData();
 
    form.append(
      'file',
      fs.createReadStream(filePath),
      { filename: fileName }
    );
 
    const uploadRes = await fetch(
      `${ZOHO_API_DOMAIN}/api/v1/uploads`,
      {
        method: 'POST',
 
        headers: {
          Authorization:
            `Zoho-oauthtoken ${accessToken}`,
 
          'X-com-zoho-desk-organizationid':
            ZOHO_ORG_ID,
 
          ...form.getHeaders(),
        },
 
        body: form as any,
      }
    );
 
    const uploadText =
      await uploadRes.text();
 
    let uploadData: any = {};
 
    try {
      uploadData =
        uploadText
          ? JSON.parse(uploadText)
          : {};
    } catch {
      uploadData = {
        raw: uploadText,
      };
    }
 
    if (!uploadRes.ok) {
      console.error(
        `Attachment upload failed (${uploadRes.status}):`,
        uploadData
      );
 
      throw new Error(
        `Failed to upload attachment: ${fileName}`
      );
    }
 
    console.log(
      `Attachment upload response:`,
      JSON.stringify(
        uploadData,
        null,
        2
      )
    );
 
    if (!uploadData.id) {
      throw new Error(
        `Zoho Desk upload did not return attachment ID for ${fileName}`
      );
    }
 
    attachmentIds.push(
      uploadData.id
    );
 
    console.log(
      `Attachment uploaded: ${fileName} -> ${uploadData.id}`
    );
  }
 
  // ============================================================
  // 2. Send email reply through Zoho Desk
  // ============================================================
 
  const replyUrl =
    `${ZOHO_API_DOMAIN}/api/v1/tickets/${ticketId}/sendReply`;
 
  console.log(
    `Sending reply through Zoho Desk: ${replyUrl}`
  );
 
  const payload: any = {
    channel: 'EMAIL',
 
    to: to.join(','),
 
    fromEmailAddress:
      'support@wyse.co.in',
 
    contentType: 'html',
 
    content,
 
    isForward: false,
 
    attachmentIds,
  };
 
  if (cc && cc.length) {
    payload.cc = cc.join(',');
  }
 
  console.log(
    'Send reply payload:',
    JSON.stringify(
      {
        ...payload,
        content: '[email content]',
      },
      null,
      2
    )
  );
 
  const replyRes = await fetch(
    replyUrl,
    {
      method: 'POST',
 
      headers: {
        Authorization:
          `Zoho-oauthtoken ${accessToken}`,
 
        'X-com-zoho-desk-organizationid':
          ZOHO_ORG_ID,
 
        'Content-Type':
          'application/json',
 
        Accept:
          'application/json',
      },
 
      body:
        JSON.stringify(payload),
    }
  );
 
  const replyText =
    await replyRes.text();
 
  let replyData: any = {};
 
  try {
    replyData =
      replyText
        ? JSON.parse(replyText)
        : {};
  } catch {
    replyData = {
      raw: replyText,
    };
  }
 
  if (!replyRes.ok) {
 
    console.error(
      `Zoho Desk sendReply failed (${replyRes.status}):`,
      JSON.stringify(
        replyData,
        null,
        2
      )
    );
 
    throw new Error(
      `Failed to send email through Zoho Desk (${replyRes.status})`
    );
  }
 
  console.log(
    `Email successfully sent to ${to.join(', ')}`
  );
 
  if (cc?.length) {
    console.log(
      `CC: ${cc.join(', ')}`
    );
  }
 
  console.log(
    `Attachments: ${attachmentIds.length}`
  );
 
  return replyData;
}