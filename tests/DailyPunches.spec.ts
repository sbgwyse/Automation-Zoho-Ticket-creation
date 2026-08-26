import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Credentials should come from environment variables (.env + dotenv, or CI
// secrets) rather than being hardcoded in the spec file.
const USERNAME = process.env.ETAM_USERNAME ?? 'ADMIN/etam100';
const PASSWORD = process.env.ETAM_PASSWORD ?? '$WysE123';

async function waitForOverlayGone(page: Page, timeout = 15000) {
  await page
    .locator('.ngx-overlay, ngx-ui-loader, .p-component-overlay-mask, .p-sidebar-mask')
    .first()
    .waitFor({ state: 'hidden', timeout })
    .catch(() => {});
}

async function login(page: Page) {
  await page.goto('https://presence.tajhotels.com/etam_prime/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await waitForOverlayGone(page);
}

async function navigateToDailyPunches(page: Page) {
  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Daily Punches');
  await waitForOverlayGone(page);
}

/**
 * The results table header row exposes a combobox for filtering punches by
 * direction (out / in / inout). Selecting a new value re-renders the
 * "Download" button's data; a fresh download is triggered per filter value.
 */
async function downloadPunchesFiltered(page: Page, filterValue: 'out' | 'in' | 'inout') {
  await page
    .getByRole('row', { name: 'Emp. ID Name DATE Gate-ID' })
    .getByRole('combobox')
    .selectOption(filterValue);
  await waitForOverlayGone(page);

  const downloadPromise = page.waitForEvent('download');
  // NOTE: accessible name captured with a leading space (" Download") —
  // likely an icon + text button where the icon glyph renders as
  // whitespace in the accessibility tree. Left as-is since it matched
  // in the recording; if this stops matching, try a role-only lookup
  // scoped near the table instead.
  await page.getByRole('button', { name: ' Download' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBeTruthy();

  const savePath = path.join(
    'downloads',
    `daily-punches-${filterValue}-${download.suggestedFilename()}`
  );
  await download.saveAs(savePath);
}

// --- Test -------------------------------------------------------------

test('Daily Punches - Download by direction (out/in/inout)', async ({ page }) => {
  await login(page);

  await test.step('Navigate to Daily Punches', async () => {
    await navigateToDailyPunches(page);
  });

  await test.step('Filter and show results', async () => {
    await page.getByRole('textbox', { name: 'From Date*' }).fill('2026-08-01');
    await page.getByRole('button', { name: 'Show' }).click();
    await waitForOverlayGone(page);
  });

  await test.step('Download - Out punches', async () => {
    await downloadPunchesFiltered(page, 'out');
  });

  await test.step('Download - In punches', async () => {
    await downloadPunchesFiltered(page, 'in');
  });

  await test.step('Download - In+Out punches', async () => {
    await downloadPunchesFiltered(page, 'inout');
  });
});