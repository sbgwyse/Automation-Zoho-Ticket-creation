import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SearchNavigationPage } from '../pages/SearchNavigationPage';

/**
 * Global Search / Navigation box validation.
 * Logs in first, then exercises the "Search Any Option Here" search field
 * used to jump to pages like Dashboard, Registration, etc.
 */

const VALID_USERNAME = process.env.ETAM_USERNAME as string;
const VALID_PASSWORD = process.env.ETAM_PASSWORD as string;

test.describe('Search Navigation', () => {
  let login: LoginPage;
  let search: SearchNavigationPage;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    search = new SearchNavigationPage(page);

    await login.goto();
    await login.login(VALID_USERNAME, VALID_PASSWORD);
    await login.expectLoggedIn();
  });

  test.describe('Empty search', () => {
    test('does not navigate or error when search is submitted empty', async ({ page }) => {
      await search.searchBox.click();
      await search.searchBox.press('Enter');
      // Should stay on the same page / dashboard rather than navigating
      // somewhere unexpected or throwing a client-side error.
      await expect(page).not.toHaveURL(/error|undefined|null/i);
    });
  });

  test.describe('Valid search term', () => {
    test('shows a matching result for "dashboard"', async () => {
      await search.search('dashboard');
      await search.expectResultVisible('Dashboard');
    });

    test('shows a matching result for "registration"', async () => {
      await search.search('registration');
      await search.expectResultVisible('Registration');
    });

    test('navigates to the selected result on click', async ({ page }) => {
      await search.search('dashboard');
      await search.selectResult('Dashboard');
      await expect(page).toHaveURL(/dashboard/i);
    });

    test('navigates to the selected result on Enter key', async ({ page }) => {
      await search.searchAndPressEnter('dashboard');
      await expect(page).toHaveURL(/dashboard/i);
    });
  });

  test.describe('No matching results', () => {
    test('shows a no-results state for a nonsense search term', async () => {
      await search.search('zzzznotarealpagezzzz');
      // TODO: once you confirm the real "no results" UI, this should pass.
      await search.expectNoResults();
    });
  });
});