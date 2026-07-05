import type { AccountRow, ExtractedAccount } from "./types";

let idCounter = 0;
export function makeId(): string {
  idCounter += 1;
  return `row-${Date.now()}-${idCounter}`;
}

export function accountsToRows(accounts: ExtractedAccount[], sourceFile?: string): AccountRow[] {
  return accounts.map((a) => ({
    id: makeId(),
    account: a.account ?? "",
    name: a.name ?? "",
    value: a.value,
    sourceFile,
  }));
}

export interface MergeResult {
  rows: AccountRow[];
  addedCount: number;
  skippedDuplicateCount: number;
}

/**
 * Dedupes by account number across the existing ledger and newly extracted rows.
 * Rows with no account number (manual entries) are never treated as duplicates.
 */
export function mergeRows(existing: AccountRow[], incoming: AccountRow[]): MergeResult {
  const seen = new Set(existing.filter((r) => r.account.trim() !== "").map((r) => r.account.trim()));
  const rows: AccountRow[] = [...existing];
  let addedCount = 0;
  let skippedDuplicateCount = 0;

  for (const row of incoming) {
    const key = row.account.trim();
    if (key !== "" && seen.has(key)) {
      skippedDuplicateCount += 1;
      continue;
    }
    if (key !== "") seen.add(key);
    rows.push(row);
    addedCount += 1;
  }

  return { rows, addedCount, skippedDuplicateCount };
}

/**
 * Parses a newline-separated block of pasted dollar values into ledger rows.
 * Accepts formats like "$13,408.31", "13408.31", "13,408".
 */
export function parsePastedValues(text: string): AccountRow[] {
  const lines = text.split(/\r?\n/);
  const rows: AccountRow[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/[^0-9.\-]/g, "");
    if (cleaned === "") continue;
    const value = Number(cleaned);
    if (!Number.isFinite(value) || value <= 0) continue;
    rows.push({ id: makeId(), account: "", name: "", value });
  }

  return rows;
}
