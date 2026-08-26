import { Page } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

export class UploadPage {
  readonly page: Page;
  readonly downloadsDir: string;

  constructor(page: Page) {
    this.page = page;
    // Windows default Downloads folder, e.g. C:\Users\sbg\Downloads
    this.downloadsDir = path.join(os.homedir(), 'Downloads');
  }

  async open() {
    await this.page.getByText('UPLOAD', { exact: true }).click();
  }

  async selectUploadType(uploadType: string) {
    await this.page.getByRole('combobox').selectOption(uploadType);
  }

  /**
   * Returns the newest .xls/.xlsx file in the Downloads folder. Called right
   * after triggering a download, so "newest" reliably means "the one we just
   * got" — this sidesteps filename collisions like "UploadTransactionData (10).xls"
   * that Chrome creates when a file with the same name already exists there.
   */
  private getLatestXlsFile(): string {
    const files = fs
      .readdirSync(this.downloadsDir)
      .filter((f) => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'))
      .map((f) => ({
        name: f,
        fullPath: path.join(this.downloadsDir, f),
        mtime: fs.statSync(path.join(this.downloadsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      throw new Error(`No .xls/.xlsx files found in ${this.downloadsDir}`);
    }

    return files[0].fullPath;
  }

  /**
   * Clicks "Download Format With Data", waits for the download to finish,
   * then reads back the newest xls file from the Downloads folder.
   * Returns the full path to that file.
   */
  async downloadFormatAndFetch(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');

    const link = this.page.getByRole('link', { name: 'Download Format With Data' });
    if (await link.count()) {
      await link.click();
    } else {
      await this.page.getByText('Download Format With Data').click();
    }

    const download = await downloadPromise;
    // Ensure the download has actually finished writing to disk before we
    // scan the folder for it.
    await download.path();

    return this.getLatestXlsFile();
  }

  /** "Choose" opens a native file dialog — attach the given file. */
  async chooseFile(filePath: string, containerTestId?: string) {
    const chooseButton = containerTestId
      ? this.page.getByTestId(containerTestId).getByText('Choose')
      : this.page.getByText('Choose');

    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await chooseButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  /** Fallback if "Choose" is actually a plain <input type="file">. */
  async chooseFileDirect(filePath: string, containerTestId?: string) {
    const scope = containerTestId ? this.page.getByTestId(containerTestId) : this.page;
    await scope.locator('input[type="file"]').setInputFiles(filePath);
  }

  async submitUpload() {
    await this.page.locator('p-button').filter({ hasText: 'Upload' }).click();
  }

  /**
   * Full flow: select type -> download the format file -> fetch it back from
   * Downloads -> re-select that same file via "Choose" -> submit upload.
   */
  async completeUploadFlow(uploadType: string, useNativeDialog = true): Promise<string> {
    await this.selectUploadType(uploadType);

    const filePath = await this.downloadFormatAndFetch();

    if (useNativeDialog) {
      await this.chooseFile(filePath);
    } else {
      await this.chooseFileDirect(filePath);
    }

    await this.submitUpload();
    return filePath;
  }
}