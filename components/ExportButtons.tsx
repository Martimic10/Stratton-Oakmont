"use client";

import { useState } from "react";
import type { AccountRow } from "@/lib/types";
import { downloadCsv, toTsv } from "@/lib/export";

interface ExportButtonsProps {
  rows: AccountRow[];
  annualRate: number;
}

export function ExportButtons({ rows, annualRate }: ExportButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const tsv = toTsv(rows, annualRate);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleCopy}
        disabled={rows.length === 0}
        className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium active:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:active:bg-neutral-800"
      >
        {copied ? "Copied!" : "Copy table"}
      </button>
      <button
        type="button"
        onClick={() => downloadCsv(rows, annualRate)}
        disabled={rows.length === 0}
        className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium active:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:active:bg-neutral-800"
      >
        Download CSV
      </button>
    </div>
  );
}
