import type { AccountRow, ExtractedAccount } from "./types";

let idCounter = 0;
export function makeId(): string {
  idCounter += 1;
  return `row-${Date.now()}-${idCounter}`;
}

/** Spacing between photo sequence numbers, leaving room for every row extracted from one photo to sort together. */
export const PHOTO_ORDER_STEP = 1000;
/** Manual/pasted rows always sort after any realistic number of photos (well under this many). */
export const MANUAL_ORDER_BASE = 10_000_000;

export function sortRowsByOrder(rows: AccountRow[]): AccountRow[] {
  return [...rows].sort((a, b) => a.order - b.order);
}

/**
 * Converts extracted accounts into ledger rows, ordered by the photo's upload
 * sequence rather than when its extraction happened to finish — photos are
 * processed with limited concurrency, so completion order isn't upload order.
 */
export function accountsToRows(
  accounts: ExtractedAccount[],
  sourceFile: string | undefined,
  photoSequence: number
): AccountRow[] {
  return accounts.map((a, index) => ({
    id: makeId(),
    account: a.account ?? "",
    name: a.name ?? "",
    value: a.value,
    sourceFile,
    order: photoSequence * PHOTO_ORDER_STEP + index,
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
 * Result is re-sorted by `order` so rows always land in upload order.
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

  return { rows: sortRowsByOrder(rows), addedCount, skippedDuplicateCount };
}

/**
 * Parses a newline-separated block of pasted dollar values into ledger rows.
 * Accepts formats like "$13,408.31", "13408.31", "13,408".
 */
export function parsePastedValues(text: string, baseOrder: number): AccountRow[] {
  const lines = text.split(/\r?\n/);
  const rows: AccountRow[] = [];
  let index = 0;

  for (const line of lines) {
    const cleaned = line.replace(/[^0-9.\-]/g, "");
    if (cleaned === "") continue;
    const value = Number(cleaned);
    if (!Number.isFinite(value) || value <= 0) continue;
    rows.push({ id: makeId(), account: "", name: "", value, order: baseOrder + index });
    index += 1;
  }

  return rows;
}
