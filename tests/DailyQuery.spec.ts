import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
const ACTION_TIMEOUT = 15000;
const BASE_URL = 'https://presence.tajhotels.com/etam_prime/login';
const USERNAME = 'ADMIN/etam101';
const PASSWORD = '$WysE123';
const QUERY_DATE = '2026-08-01';

async function waitForOverlaysGone(page: Page) {
  const loader = page.locator('.ngx-ui-loader');
  if (await loader.count()) {
    await loader.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).click();
  
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.getByRole('button').click({ timeout: 5000 }).catch(() => {});

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await waitForOverlaysGone(page);
}
async function navigateToDailyQueryMobile(page: Page) {
  console.log('STEP: Navigating to Daily Query Mobile');
  await page.getByText('ADMINISTRATION').click({ timeout: ACTION_TIMEOUT });
  await page.getByRole('combobox').selectOption('Daily Query Mobile');
  await waitForOverlaysGone(page);
}
async function selectDirectionRadio(page: Page, id: string) {
  const radio = page.locator(`[id="${id}"]`);

  for (let attempt = 1; attempt <= 5; attempt++) {
    await waitForOverlaysGone(page);
    try {
      await radio.click({ timeout: ACTION_TIMEOUT });
      return;
    } catch (err) {
      if (attempt === 5) throw err;
      console.log(`STEP: Retrying ${id} radio click (attempt ${attempt})`);
      await page.waitForTimeout(300);
    }
  }
}

async function clickShowAndDownload(page: Page, label: string) {
  console.log(`STEP: Clicking Show (${label})`);
  await page.getByRole('button', { name: 'Show' }).click({ timeout: ACTION_TIMEOUT });

  console.log(`STEP: Downloading (${label})`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '  Download' }).click({ timeout: ACTION_TIMEOUT });
  const download = await downloadPromise;

  const downloadDir = './downloads';
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
  }

  const filePath = `${downloadDir}/${download.suggestedFilename()}`;
  await download.saveAs(filePath);
  console.log('Downloaded:', filePath);
}

test('Daily Query Mobile - download by direction', async ({ page }) => {
  await login(page);
  await navigateToDailyQueryMobile(page);

  console.log('STEP: Filling Date');
  await page.getByRole('textbox', { name: 'Date*' }).fill(QUERY_DATE);

  await clickShowAndDownload(page, 'default');

  console.log('STEP: Switching to OUT direction');
  await selectDirectionRadio(page, 'OUT');
  await clickShowAndDownload(page, 'OUT');
});