import fetch from 'node-fetch';
import 'dotenv/config';
import FormData from 'form-data';
import fs from 'fs';
import {
  getTicket,
  getAccessToken,
  replyToTicket
} 
from './fetch-ticket';

export async function getAgentIdByEmail(email: string): Promise<string> {
  const response = await fetch(
    `https://desk.zoho.in/api/v1/agents?searchStr=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
        'X-com-zoho-desk-organizationid': process.env.ZOHO_ORG_ID!,
      },
    },
  );
 
  const data = await response.json();
 
  if (!response.ok) {
    throw new Error(`Zoho Desk Agent Lookup Error: ${JSON.stringify(data)}`);
  }
 
  const agent = (data.data || []).find(
    (a: any) => a.emailId?.toLowerCase() === email.toLowerCase(),
  );
 
  if (!agent) {
    throw new Error(`No Zoho agent found with email: ${email}`);
  }
 
  return agent.id;
}
 
export async function createTicket(
    subject: string,
    description: string,
    uploadIds?: string[],
    assigneeId?: string
) {
    
    const body: any = {
        subject,
        departmentId: process.env.ZOHO_DEPARTMENT_ID,
        contactId: process.env.ZOHO_CONTACT_ID,
        description,
        priority: "Low",
        status: "Open",
    };

    if (uploadIds && uploadIds.length > 0) {
        body.uploads = uploadIds;
    }

    if (assigneeId) {
        body.assigneeId = assigneeId;
    }
    const accessToken =
        await getAccessToken();
        console.log(`Access Token use for creating ticket: ${accessToken}`);
    const response = await fetch(
        "https://desk.zoho.in/api/v1/tickets",
        {
            method: "POST",
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                "X-com-zoho-desk-organizationid": process.env.ZOHO_ORG_ID!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        }
    );


    const data = await response.json();

  if (!response.ok) {
    throw new Error(`Zoho Desk Error: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function uploadFile(file: string): Promise<string> {
    if(!fs.existsSync(file))
    {
        throw new Error(`File Not FOund Exception :${file}`);
    }
    const form = new FormData();

    form.append("file", fs.createReadStream(file));
    const accessToken =
        await getAccessToken();
    const response = await fetch(
        "https://desk.zoho.in/api/v1/uploads",
        {
            method: "POST",
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                "X-com-zoho-desk-organizationid": `${process.env.ZOHO_ORG_ID}`,
                ...form.getHeaders()
            },
            body: form
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data.id;
}

export async function getTicketByNumber(ticketNumber: string): Promise<any> {
  const response = await fetch(
    `https://desk.zoho.in/api/v1/tickets/search?ticketNumber=${encodeURIComponent(ticketNumber)}`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${await getAccessToken()}`,
        'X-com-zoho-desk-organizationid': process.env.ZOHO_ORG_ID!,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Zoho Desk Ticket Search Error: ${JSON.stringify(data)}`);
  }

  const match = (data.data || [])[0];

  if (!match) {
    throw new Error(`No Zoho ticket found with ticket number: ${ticketNumber}`);
  }

  return match;
}

export async function getTicketById(ticketId: string): Promise<any> {
  const response = await fetch(
    `https://desk.zoho.in/api/v1/tickets/${ticketId}`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${await getAccessToken()}`,
        'X-com-zoho-desk-organizationid': process.env.ZOHO_ORG_ID!,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Zoho Desk Get Ticket Error: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function addCommentToTicket(
  ticketId: string,
  content: string,
  isPublic: boolean = true,
): Promise<any> {
  const response = await fetch(
    `https://desk.zoho.in/api/v1/tickets/${ticketId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${await getAccessToken()}`,
        'X-com-zoho-desk-organizationid': process.env.ZOHO_ORG_ID!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        contentType: 'html',
        isPublic,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Zoho Desk Add Comment Error: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function attachFileToTicket(ticketId: string, file: string): Promise<any> {
  if (!fs.existsSync(file)) {
    throw new Error(`File Not Found Exception: ${file}`);
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(file));

  const response = await fetch(
    `https://desk.zoho.in/api/v1/tickets/${ticketId}/attachments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${await getAccessToken()}`,
        'X-com-zoho-desk-organizationid': `${process.env.ZOHO_ORG_ID}`,
        ...form.getHeaders(),
      },
      body: form,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Zoho Desk Attach File Error: ${JSON.stringify(data)}`);
  }

  return data;
}