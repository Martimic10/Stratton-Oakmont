export interface AccountRow {
  id: string;
  account: string;
  name: string;
  value: number;
  sourceFile?: string;
  /** Sort key controlling table position — lower sorts first. See lib/ledger.ts. */
  order: number;
}

export interface ExtractedAccount {
  account?: string;
  name?: string;
  value: number;
}

export type PhotoStatus = "queued" | "converting" | "reading" | "done" | "failed";

export interface PhotoJob {
  id: string;
  file: File;
  fileName: string;
  status: PhotoStatus;
  accountsFound?: number;
  errorMessage?: string;
  previewUrl?: string;
  /** Position in which the photo was selected/uploaded — drives row ordering regardless of processing completion order. */
  sequence: number;
}
