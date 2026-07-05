export interface AccountRow {
  id: string;
  account: string;
  name: string;
  value: number;
  sourceFile?: string;
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
}
