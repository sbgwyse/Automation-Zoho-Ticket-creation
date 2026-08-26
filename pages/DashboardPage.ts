import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly sidenavContainer: Locator;
  readonly profileAvatar: Locator;
  readonly organizationName: Locator;
  readonly todaysPunchesCard: Locator;
  readonly todaysPunchesGetDataIcon: Locator;
  readonly closeDialogButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidenavContainer = page.locator('mat-sidenav-container');
    this.profileAvatar = page.getByRole('img');
    this.organizationName = this.sidenavContainer.getByText('DSK Wyse Test');
    this.todaysPunchesCard = page
      .locator('mdb-card-title')
      .filter({ hasText: 'Todays Punches Get Data' });
    this.todaysPunchesGetDataIcon = this.todaysPunchesCard.locator('i');
    this.closeDialogButton = page.getByRole('dialog').getByText('Close');
  }

  async expectDashboardLoaded() {
    await expect(this.sidenavContainer).toBeVisible();
  }

  async expectProfileAvatarVisible() {
    await expect(this.profileAvatar).toBeVisible();
  }

  async openProfileMenu() {
    await this.profileAvatar.click();
  }

  async expectOrganizationName(name: string = 'DSK Wyse Test') {
    await expect(this.sidenavContainer.getByText(name)).toBeVisible();
  }

  async expectTodaysPunchesCardVisible() {
    await expect(this.todaysPunchesCard).toBeVisible();
  }

  async closeAnyOpenDialog() {
    if (await this.closeDialogButton.isVisible().catch(() => false)) {
      await this.closeDialogButton.click();
    }
  }
}