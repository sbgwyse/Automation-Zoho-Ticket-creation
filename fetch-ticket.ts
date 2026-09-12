import 'dotenv/config';
import fetch from 'node-fetch';
import * as fs from 'fs';
import FormData from 'form-data';

import {
  getAgentIdByEmail
} from './zoho-helper';

let InternalTicketId = "";
// ============================================================
// Upload file to Zoho Desk
// ============================================================

export async function uploadFile(file: string): Promise<string> {

  if (!fs.existsSync(file)) {
    throw new Error(`File Not Found Exception: ${file}`);
  }

  const form = new FormData();

  form.append(
    'file',
    fs.createReadStream(file)
  );

  const response = await fetch(
    'https://desk.zoho.in/api/v1/uploads',
    {
      method: 'POST',

      headers: {
        Authorization:
          `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,

        'X-com-zoho-desk-organizationid':
          `${process.env.ZOHO_ORG_ID}`,

        ...form.getHeaders()
      },

      body: form
    }
  );

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(
      JSON.stringify(data)
    );
  }

  return data.id;
}


// ============================================================
// Get Zoho Access Token
// ============================================================

export async function getAccessToken(): Promise<string> {

  const {
    ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN,
    ZOHO_ACCOUNTS_DOMAIN
  } = process.env as any;


  const tokenRes = await fetch(
    `${ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token` +
    `?grant_type=refresh_token` +
    `&client_id=${ZOHO_CLIENT_ID}` +
    `&client_secret=${ZOHO_CLIENT_SECRET}` +
    `&refresh_token=${ZOHO_REFRESH_TOKEN}`,
    {
      method: 'POST'
    }
  );


  const tokenData: any =
    await tokenRes.json();


  if (!tokenData.access_token) {

    console.error(
      'Failed to get access token:',
      tokenData
    );

    throw new Error(
      'Failed to get Zoho access token'
    );
  }


  return tokenData.access_token;
}


// ============================================================
// Fetch ticket data
// ============================================================

async function fetchTicketData(
  ticketId: string,
  accessToken: string
) {

  const {
    ZOHO_API_DOMAIN,
    ZOHO_ORG_ID
  } = process.env as any;


  // ----------------------------------------------------------
  // Get ticket
  // ----------------------------------------------------------

  const ticketRes = await fetch(

    `${ZOHO_API_DOMAIN}/api/v1/tickets/${ticketId}`,

    {
      headers: {

        Authorization:
          `Zoho-oauthtoken ${accessToken}`,

        'X-com-zoho-desk-organizationid':
          ZOHO_ORG_ID,

        'Accept-Encoding':
          'identity'
      }
    }
  );


  const ticketData: any =
    await ticketRes.json();


  if (!ticketRes.ok) {

    console.error(
      'Ticket fetch failed:',
      ticketData
    );

    throw new Error(
      'Failed to fetch ticket'
    );
  }


  // ----------------------------------------------------------
  // Get conversations
  // ----------------------------------------------------------

  const convRes = await fetch(

    `${ZOHO_API_DOMAIN}/api/v1/tickets/${ticketId}/conversations`,

    {
      headers: {

        Authorization:
          `Zoho-oauthtoken ${accessToken}`,

        'X-com-zoho-desk-organizationid':
          ZOHO_ORG_ID,

        'Accept-Encoding':
          'identity'
      }
    }
  );


  const convData: any =
    await convRes.json();


  const conversations =
    convData.data || [];


  const description =
    conversations
      .map(
        (c: any) =>
          (c.summary || '').trim()
      )
      .filter(Boolean)
      .join('\n---\n');


  return {

    id:
      ticketData.id,

    subject:
      ticketData.subject || '',

    description,

    requesterEmail:

      ticketData.email ||

      ticketData.contact?.email ||

      ticketData.requester?.email ||

      ''
  };
}

let ticketId = "";
// ============================================================
// Get ticket by ticket number
// ============================================================

export async function getTicket(
  ticketNumber: string
) {

  const accessToken =
    await getAccessToken();


  const searchResult =
    await searchTicketByNumber(
      ticketNumber,
      accessToken
    );


  console.log(
    'Ticket search response:',
    JSON.stringify(
      searchResult,
      null,
      2
    )
  );


  const tickets =
    searchResult.data || [];


  if (!tickets.length) {

    throw new Error(
      `No ticket found for ticket number: ${ticketNumber}`
    );
  }


  const ticket =
    tickets[0];


  if (!ticket.id) {

    throw new Error(
      `Ticket search returned a result but no internal ticket ID: ${
        JSON.stringify(ticket)
      }`
    );
  }


  console.log(
    `Found ticket ${ticketNumber}. Internal ID: ${ticket.id}`
  );
  ticketId = ticket.id;
  InternalTicketId =  ticketId;
  return fetchTicketData(
    ticket.id,
    accessToken
  );
}


// ============================================================
// Search ticket by ticket number
// ============================================================

async function searchTicketByNumber(
  ticketNumber: string,
  accessToken: string
) {

  const {
    ZOHO_API_DOMAIN,
    ZOHO_ORG_ID
  } = process.env as any;


  const cleanNumber =
    ticketNumber
      .trim()
      .replace(/^#/, '');


  const url =
    `${ZOHO_API_DOMAIN}/api/v1/tickets/search` +
    `?ticketNumber=${encodeURIComponent(cleanNumber)}`;


  console.log(
    'Searching ticket:',
    url
  );


  const res =
    await fetch(
      url,
      {
        headers: {

          Authorization:
            `Zoho-oauthtoken ${accessToken}`,

          'X-com-zoho-desk-organizationid':
            ZOHO_ORG_ID,

          Accept:
            'application/json'
        }
      }
    );


  const text =
    await res.text();


  let data: any;


  try {

    data =
      text
        ? JSON.parse(text)
        : {};

  } catch {

    data = {
      raw: text
    };
  }


  if (!res.ok) {

    throw new Error(
      `Zoho ticket search failed (${res.status}): ${
        JSON.stringify(data)
      }`
    );
  }


  return data;
}


// ============================================================
// REPLY TO EXISTING TICKET
// ============================================================
//
// NOTE: Zoho Desk's sendReply endpoint requires a "to" field —
// without it, Zoho reports "Empty Recipients" for To/Cc/Bcc
// even though attachments and content are otherwise valid.
// "to" is now a required parameter, with an optional "cc".


export async function replyToTicket(
  ticketId: string,
  accessToken: string,
  content: string,
  to: string,
  attachments: {
    path: string;
    name: string;
  }[] = [],
  cc?: string
) {

  const {
    ZOHO_API_DOMAIN,
    ZOHO_ORG_ID
  } = process.env as any;

  if (!to) {
    throw new Error(
      'replyToTicket called with no "to" recipient — Zoho Desk requires one to send a reply.'
    );
  }


  const attachmentIds: string[] = [];


  // ----------------------------------------------------------
  // 1. Upload attachments to EXISTING ticket
  // ----------------------------------------------------------

  for (const att of attachments) {

    if (!fs.existsSync(att.path)) {

      console.warn(
        `Attachment not found, skipping: ${att.path}`
      );

      continue;
    }


    console.log(
      `Uploading attachment: ${att.path}`
    );


    const form =
      new FormData();


    form.append(
      'file',
      fs.createReadStream(att.path),
      {
        filename: att.name
      }
    );


    const uploadRes =
      await fetch(

        `${ZOHO_API_DOMAIN}/api/v1/uploads`,

        {
          method: 'POST',

          headers: {

            Authorization:
              `Zoho-oauthtoken ${accessToken}`,

            'X-com-zoho-desk-organizationid':
              ZOHO_ORG_ID,

            ...form.getHeaders()
          },

          body:
            form as any
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
        raw: uploadText
      };
    }


    if (!uploadRes.ok) {

      console.error(
        `Attachment upload failed for ${att.name}`,
        uploadData
      );

      continue;
    }


    console.log(
      `Attachment uploaded successfully: ${att.name}`
    );


    console.log(
      'Attachment response:',
      JSON.stringify(
        uploadData,
        null,
        2
      )
    );


    if (uploadData.id) {

      attachmentIds.push(
        uploadData.id
      );
    }
  }


  // ----------------------------------------------------------
  // 2. Send email reply to EXISTING ticket
  // ----------------------------------------------------------

  console.log(
    `Sending reply to existing ticket: ${ticketId}`
  );

  console.log(`${ZOHO_API_DOMAIN}/api/v1/tickets/${InternalTicketId}/sendReply`);

  const replyPayload: any = {
    channel: 'EMAIL',
    to,
    fromEmailAddress: "support@wyse.co.in",
    contentType: 'plainText',
    content: content,
    isForward: false,
    attachmentIds: attachmentIds
  };

  if (cc) {
    replyPayload.cc = cc;
  }

  console.log(
    'Send reply payload:',
    JSON.stringify(
      { ...replyPayload, content: '[reply content]' },
      null,
      2
    )
  );

  const replyRes =
    await fetch(

      `${ZOHO_API_DOMAIN}/api/v1/tickets/${InternalTicketId}/sendReply`,
      {
        method: 'POST',

        headers: {

          Authorization:
            `Zoho-oauthtoken ${accessToken}`,

          'X-com-zoho-desk-organizationid':
            ZOHO_ORG_ID,

          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify(replyPayload)
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
      raw: replyText
    };
  }


  if (!replyRes.ok) {

    console.error(
      `Ticket reply failed (${replyRes.status}):`,
      replyData
    );

    throw new Error(
      `Failed to reply to ticket ${ticketId}`
    );
  }


  console.log(
    `Successfully replied to ticket ${ticketId}`
  );


  return replyData;
}


// ============================================================
// MAIN
// ============================================================

async function main() {

  // Example:
  // npm run start -- --ticket=123456

  const arg =
    process.argv.find(
      a =>
        a.startsWith('--ticket=')
    );


  if (!arg) {

    console.error(
      'Missing --ticket=<ticket number> argument.'
    );

    process.exit(1);
  }


  const ticketNumber =
    arg.split('=')[1];


  // ----------------------------------------------------------
  // Get access token
  // ----------------------------------------------------------

  console.log(
    'Getting access token...'
  );


  const accessToken =
    await getAccessToken();


  console.log(
    'Access token obtained.'
  );


  // ----------------------------------------------------------
  // Find EXISTING ticket
  // ----------------------------------------------------------

  console.log(
    `Finding existing ticket #${ticketNumber}...`
  );


  const ticket =
    await getTicket(
      ticketNumber
    );


  console.log(
    '\n================ TICKET FOUND ================'
  );


  console.log(
    'ID:',
    InternalTicketId
  );


  console.log(
    'Subject:',
    ticket.subject
  );


  console.log(
    'Requester Email:',
    ticket.requesterEmail
  );


  console.log(
    '\nContent:\n',
    ticket.description || '(none)'
  );


  console.log(
    '================================================'
  );


  // ----------------------------------------------------------
  // Reply to EXISTING ticket
  // ----------------------------------------------------------

  const replyContent = `
    <p>Dear Team,</p>

    <p>
      We have completed the testing.
      Please see the attached test reports.
    </p>

    <p>
      Regards,<br>
      Sanika Gore
    </p>
  `;


  const replyResult =
    await replyToTicket(

      InternalTicketId,

      accessToken,

      replyContent,

      ticket.requesterEmail,

      [
        {
          path:
            './reports/test-report.xlsx',

          name:
            'test-report.xlsx'
        },

        {
          path:
            './reports/test-report.pdf',

          name:
            'test-report.pdf'
        }
      ]
    );


  console.log(
    '\n================ REPLY SENT ================'
  );


  console.log(
    JSON.stringify(
      replyResult,
      null,
      2
    )
  );


  console.log(
    '=============================================='
  );
}


// ============================================================
// RUN
// ============================================================

if (require.main === module) {

  main()
    .catch(err => {

      console.error(
        'Error:',
        err
      );

      process.exit(1);
    });
}