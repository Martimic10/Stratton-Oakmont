"use client";

import type { AccountRow } from "@/lib/types";
import { computeQuarterlyFee, formatCurrency } from "@/lib/fee";

interface LedgerTableProps {
  rows: AccountRow[];
  annualRate: number;
  onUpdateRow: (id: string, patch: Partial<Pick<AccountRow, "account" | "name" | "value">>) => void;
  onRemoveRow: (id: string) => void;
}

export function LedgerTable({ rows, annualRate, onUpdateRow, onRemoveRow }: LedgerTableProps) {
  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalFee = rows.reduce((sum, r) => sum + computeQuarterlyFee(r.value, annualRate), 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-800 dark:bg-neutral-900">
            <th className="px-3 py-3 font-medium">Account #</th>
            <th className="px-3 py-3 font-medium">Name</th>
            <th className="px-3 py-3 text-right font-medium">Account Value</th>
            <th className="px-3 py-3 text-right font-medium">Quarterly Fee</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
              <td className="px-3 py-2">
                <input
                  value={row.account}
                  onChange={(e) => onUpdateRow(row.id, { account: e.target.value })}
                  className="w-full min-w-24 rounded-lg border border-transparent bg-transparent px-2 py-2 focus:border-neutral-300 focus:bg-white focus:outline-none dark:focus:border-neutral-700 dark:focus:bg-neutral-800"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={row.name}
                  onChange={(e) => onUpdateRow(row.id, { name: e.target.value })}
                  className="w-full min-w-40 rounded-lg border border-transparent bg-transparent px-2 py-2 focus:border-neutral-300 focus:bg-white focus:outline-none dark:focus:border-neutral-700 dark:focus:bg-neutral-800"
                />
              </td>
              <td className="px-3 py-2 text-right">
                <input
                  inputMode="decimal"
                  value={row.value}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/[^0-9.\-]/g, ""));
                    onUpdateRow(row.id, { value: Number.isFinite(v) ? v : 0 });
                  }}
                  className="w-full min-w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 text-right font-mono tabular-nums focus:border-neutral-300 focus:bg-white focus:outline-none dark:focus:border-neutral-700 dark:focus:bg-neutral-800"
                />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
                {formatCurrency(computeQuarterlyFee(row.value, annualRate))}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onRemoveRow(row.id)}
                  aria-label={`Remove ${row.name || row.account || "row"}`}
                  className="min-h-10 min-w-10 rounded-lg text-neutral-400 active:bg-neutral-100 active:text-red-600 dark:active:bg-neutral-800"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-300 bg-neutral-50 font-medium dark:border-neutral-700 dark:bg-neutral-900">
            <td className="px-3 py-3" colSpan={2}>
              {rows.length} account{rows.length === 1 ? "" : "s"}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">
              {formatCurrency(totalValue)}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">
              {formatCurrency(totalFee)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
