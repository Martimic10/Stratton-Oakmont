import type { AccountRow } from "./types";
import { computeQuarterlyFee, formatNumber } from "./fee";

const HEADER = ["Account #", "Name", "Account Value", "Quarterly Fee"];

function buildRows(rows: AccountRow[], annualRate: number): string[][] {
  const body = rows.map((r) => {
    const fee = computeQuarterlyFee(r.value, annualRate);
    return [r.account, r.name, formatNumber(r.value), formatNumber(fee)];
  });

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalFee = rows.reduce((sum, r) => sum + computeQuarterlyFee(r.value, annualRate), 0);
  const totalRow = [`${rows.length} accounts`, "Total", formatNumber(totalValue), formatNumber(totalFee)];

  return [HEADER, ...body, totalRow];
}

export function toTsv(rows: AccountRow[], annualRate: number): string {
  return buildRows(rows, annualRate)
    .map((cols) => cols.join("\t"))
    .join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: AccountRow[], annualRate: number): string {
  return buildRows(rows, annualRate)
    .map((cols) => cols.map(csvEscape).join(","))
    .join("\r\n");
}

export function downloadCsv(rows: AccountRow[], annualRate: number, filename = "quarterly-fees.csv") {
  const csv = toCsv(rows, annualRate);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
