import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Credentials should come from environment variables (.env + dotenv, or CI
// secrets) rather than being hardcoded in the spec file.
// NOTE: this recording used 'ADMIN/etam101' — different from the 'etam100'
// account used in most other flows in this project. Confirm this is
// intentional (a distinct test account for this module) before relying on
// the default below.
const USERNAME = process.env.ETAM_USERNAME ?? 'ADMIN/etam101';
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
  // NOTE: a second recording confirmed the same double-submit bug flagged
  // elsewhere in this app — pressing Enter on Password already submits
  // the form, so following up with a Sign In click double-submits and
  // can collide with the loader overlay. Submit once (Enter) and skip the
  // extra click.
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  // NOTE: a second, simpler recording confirmed a generic unnamed button
  // click reliably appears right after login — likely a real recurring
  // post-login popup/dialog dismissal rather than one-off recorder noise.
  // Kept best-effort since its exact purpose still isn't confirmed.
  await page.getByRole('button').first().click({ timeout: 3000 }).catch(() => {});
  await waitForOverlayGone(page);
}

async function navigateToDailyQueryMobile(page: Page) {
  await page.getByText('ADMINISTRATION').click();
  await page.getByRole('combobox').selectOption('Daily Query Mobile');
  await waitForOverlayGone(page);
}

/**
 * Direction is chosen via mat-radio buttons rather than a select (unlike
 * Daily Punches, which uses a combobox for the same kind of filter).
 * Radios are scoped by their element id where the recording captured one
 * (#OUT, #IN/OUT); the first/default radio (presumably "IN") has no id
 * captured and is selected positionally — worth confirming its real id
 * with a screenshot if this becomes fragile.
 */
async function selectDirectionRadio(page: Page, direction: 'default' | 'OUT' | 'IN/OUT') {
  const radio =
    direction === 'default'
      ? page.locator('.mat-radio-outer-circle').first()
      : page.locator(`[id="${direction}"] .mat-radio-outer-circle`);
  await radio.click();
  await waitForOverlayGone(page);
}

async function downloadDailyQuery(page: Page, label: string) {
  const downloadPromise = page.waitForEvent('download');
  // NOTE: accessible name captured with TWO leading spaces ('  Download')
  // — different from the single-leading-space variant seen on the Daily
  // Punches Download button. Likely icon + text rendering differences
  // between the two screens; kept exact to match this recording.
  await page.getByRole('button', { name: '  Download' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBeTruthy();
  await download.saveAs(
    path.join('downloads', `daily-query-mobile-${label}-${download.suggestedFilename()}`)
  );
}

// --- Test -------------------------------------------------------------

test('Daily Query Mobile - Download IN/OUT', async ({ page }) => {
  await login(page);

  await test.step('Navigate to Daily Query Mobile', async () => {
    await navigateToDailyQueryMobile(page);
  });

  await test.step('Set date and show results', async () => {
    // NOTE: a simpler recording confirmed Show works with no radio click
    // at all — the default direction is already selected, so no explicit
    // radio click is needed before Show.
    await page.getByRole('textbox', { name: 'Date*' }).fill('2026-08-01');
    await page.getByRole('button', { name: 'Show' }).click();
    await waitForOverlayGone(page);
  });

  await test.step('Download - IN/OUT', async () => {
    await selectDirectionRadio(page, 'IN/OUT');
    await downloadDailyQuery(page, 'in-out');
  });
});