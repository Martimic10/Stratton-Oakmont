"use client";

import { useEffect, useRef, useState } from "react";
import type { AccountRow, ExtractedAccount, PhotoJob } from "@/lib/types";
import { DEFAULT_ANNUAL_RATE } from "@/lib/fee";
import { accountsToRows, mergeRows, parsePastedValues, makeId } from "@/lib/ledger";
import { prepareImageForUpload, blobToBase64 } from "@/lib/image";
import { runWithConcurrency } from "@/lib/pool";
import { UploadZone } from "@/components/UploadZone";
import { PhotoProgressList } from "@/components/PhotoProgressList";
import { LedgerTable } from "@/components/LedgerTable";
import { RateInput } from "@/components/RateInput";
import { ExportButtons } from "@/components/ExportButtons";
import { PasteBox } from "@/components/PasteBox";
import { EmptyState } from "@/components/EmptyState";
import { SpotCheckBanner } from "@/components/SpotCheckBanner";

const CONCURRENCY = 3;
const ROWS_STORAGE_KEY = "fee-calc-rows-v1";
const RATE_STORAGE_KEY = "fee-calc-rate-v1";

export default function Home() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [annualRate, setAnnualRate] = useState(DEFAULT_ANNUAL_RATE);
  const [photoJobs, setPhotoJobs] = useState<PhotoJob[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  const loadedFromStorage = useRef(false);
  const jobsRef = useRef<PhotoJob[]>([]);

  useEffect(() => {
    jobsRef.current = photoJobs;
  }, [photoJobs]);

  useEffect(() => {
    try {
      const savedRows = localStorage.getItem(ROWS_STORAGE_KEY);
      const savedRate = localStorage.getItem(RATE_STORAGE_KEY);
      // One-time hydration from localStorage, which is unavailable during SSR —
      // can't be done via lazy useState init without a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedRows) setRows(JSON.parse(savedRows));
      if (savedRate) setAnnualRate(JSON.parse(savedRate));
    } catch {
      // corrupted local storage — ignore and start fresh
    } finally {
      loadedFromStorage.current = true;
    }
  }, []);

  useEffect(() => {
    if (!loadedFromStorage.current) return;
    localStorage.setItem(ROWS_STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    if (!loadedFromStorage.current) return;
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(annualRate));
  }, [annualRate]);

  function updateJob(id: string, patch: Partial<PhotoJob>) {
    setPhotoJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function processJob(job: PhotoJob) {
    try {
      updateJob(job.id, { status: "converting", errorMessage: undefined });
      const { blob, fileName } = await prepareImageForUpload(job.file);

      updateJob(job.id, { status: "reading" });
      const mimeType = blob.type || job.file.type || "image/jpeg";
      const imageBase64 = await blobToBase64(blob);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType, fileName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Extraction failed (${res.status})`);
      }
      const accounts = data.accounts as ExtractedAccount[];

      const incoming = accountsToRows(accounts, job.fileName);
      setRows((prev) => {
        const result = mergeRows(prev, incoming);
        if (result.skippedDuplicateCount > 0) {
          setSkippedDuplicates((s) => s + result.skippedDuplicateCount);
        }
        return result.rows;
      });

      updateJob(job.id, { status: "done", accountsFound: accounts.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error reading this photo";
      updateJob(job.id, { status: "failed", errorMessage: message });
    }
  }

  function handleFilesSelected(files: File[]) {
    const newJobs: PhotoJob[] = files.map((file) => ({
      id: makeId(),
      file,
      fileName: file.name,
      status: "queued",
    }));
    setPhotoJobs((prev) => [...prev, ...newJobs]);
    runWithConcurrency(newJobs, CONCURRENCY, processJob);
  }

  function handleRetry(jobId: string) {
    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job) return;
    updateJob(jobId, { status: "queued", errorMessage: undefined });
    processJob(job);
  }

  function handleAddRow() {
    setRows((prev) => [...prev, { id: makeId(), account: "", name: "", value: 0 }]);
  }

  function handleUpdateRow(id: string, patch: Partial<Pick<AccountRow, "account" | "name" | "value">>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleRemoveRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handlePasteAdd(text: string) {
    const parsed = parsePastedValues(text);
    setRows((prev) => [...prev, ...parsed]);
  }

  const isProcessing = photoJobs.some(
    (j) => j.status === "queued" || j.status === "converting" || j.status === "reading"
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Advisory Quarterly Fee Calculator
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload account summary photos or paste values to compute quarterly fees.
        </p>
      </header>

      <SpotCheckBanner />

      <UploadZone onFilesSelected={handleFilesSelected} disabled={isProcessing} />

      <PhotoProgressList jobs={photoJobs} onRetry={handleRetry} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <RateInput value={annualRate} onChange={setAnnualRate} />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAddRow}
            className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
          >
            Add row
          </button>
          <PasteBox onAdd={handlePasteAdd} />
        </div>
      </div>

      {skippedDuplicates > 0 && (
        <p className="text-sm text-neutral-500">
          Skipped {skippedDuplicates} duplicate account{skippedDuplicates === 1 ? "" : "s"} (already in the ledger).
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <LedgerTable rows={rows} annualRate={annualRate} onUpdateRow={handleUpdateRow} onRemoveRow={handleRemoveRow} />
      )}

      <ExportButtons rows={rows} annualRate={annualRate} />
    </main>
  );
}
