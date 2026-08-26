export interface ReportMeta {
  formTitle: string;
  module: string;
  website: string;
  appVersion: string;
  appReleaseDate: string;
  apiVersion: string;
  apiReleaseDate: string;
}

export interface StepResult {
  section: string;
  field: string;
  status: string; // 'Passed' | 'Failed' | 'Skipped'
  duration: string; // seconds, already formatted
  error?: string;
}
