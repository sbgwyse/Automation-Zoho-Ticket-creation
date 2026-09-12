import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TodaysPunchesPage } from '../pages/TodaysPunchesPage';

/**
 * Dashboard validation suite.
 * Logs in first, then checks the key elements that should be present and
 * working on the dashboard landing page.
 */

const VALID_USERNAME = process.env.ETAM_USERNAME as string;
const VALID_PASSWORD = process.env.ETAM_PASSWORD as string;

test.describe('Dashboard', () => {
  let login: LoginPage;
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    dashboard = new DashboardPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await login.expectLoggedIn();
  });

  test.describe('Dashboard load', () => {
    test('dashboard loads successfully after login', async () => {
      await dashboard.expectDashboardLoaded();
    });
  });

  test.describe('Profile', () => {
    test('profile avatar is visible', async () => {
      await dashboard.expectProfileAvatarVisible();
    });

    test('clicking the profile avatar opens the profile menu/modal', async ({ page }) => {
      await dashboard.openProfileMenu();
      // The page has multiple modal <div>s in the DOM at all times (Bootstrap/MDB
      // pattern) — most are hidden. Only one becomes visible when triggered,
      // marked with a "show" class instead of aria-hidden="true".
      await expect(page.locator('.modal.show, .modal.in').first()).toBeVisible();
    });
  });

  test.describe('Organization info', () => {
    test('sidenav shows the correct organization name', async () => {
      await dashboard.expectOrganizationName('DSK Wyse Test');
    });
  });

  test.describe("Today's Punches card", () => {
    let punches: TodaysPunchesPage;

    test.beforeEach(async ({ page }) => {
      punches = new TodaysPunchesPage(page);
      // This card only appears after navigating via the sidebar icon —
      // it is not present on the plain dashboard landing page.
      await punches.open();
    });

    test('card is visible after navigating to the Today\'s Punches section', async () => {
      await expect(dashboard.todaysPunchesCard).toBeVisible();
    });

    test('Get Data icon on the card is clickable', async () => {
      await expect(dashboard.todaysPunchesGetDataIcon).toBeVisible();
      await dashboard.todaysPunchesGetDataIcon.click();
      // No hard assertion on the resulting data here — that's covered in
      // todays-punches.spec.ts. This just confirms the card itself works.
    });
  });
});