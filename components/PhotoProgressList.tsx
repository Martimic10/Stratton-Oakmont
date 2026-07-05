"use client";

import type { PhotoJob } from "@/lib/types";

interface PhotoProgressListProps {
  jobs: PhotoJob[];
  onRetry: (jobId: string) => void;
}

const STATUS_LABEL: Record<PhotoJob["status"], string> = {
  queued: "Queued",
  converting: "Converting…",
  reading: "Reading…",
  done: "Done",
  failed: "Failed",
};

function statusClasses(status: PhotoJob["status"]): string {
  switch (status) {
    case "done":
      return "text-green-700 dark:text-green-400";
    case "failed":
      return "text-red-700 dark:text-red-400";
    case "reading":
    case "converting":
      return "text-blue-700 dark:text-blue-400";
    default:
      return "text-neutral-500";
  }
}

export function PhotoProgressList({ jobs, onRetry }: PhotoProgressListProps) {
  if (jobs.length === 0) return null;

  const doneCount = jobs.filter((j) => j.status === "done").length;
  const activeJob = jobs.find((j) => j.status === "reading" || j.status === "converting");
  const total = jobs.length;
  const activeIndex = activeJob ? jobs.indexOf(activeJob) + 1 : Math.min(doneCount + 1, total);

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      {activeJob && (
        <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Reading photo {activeIndex} of {total}…
        </p>
      )}
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {jobs.map((job) => (
          <li key={job.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-neutral-700 dark:text-neutral-300">{job.fileName}</span>
            <div className="flex shrink-0 items-center gap-2">
              <span className={statusClasses(job.status)}>
                {job.status === "done" && job.accountsFound !== undefined
                  ? `Done: ${job.accountsFound} account${job.accountsFound === 1 ? "" : "s"}`
                  : STATUS_LABEL[job.status]}
              </span>
              {job.status === "failed" && (
                <button
                  type="button"
                  onClick={() => onRetry(job.id)}
                  className="min-h-8 rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                >
                  Retry
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {jobs
        .filter((j) => j.status === "failed" && j.errorMessage)
        .map((j) => (
          <p key={`${j.id}-err`} className="mt-2 text-xs text-red-600 dark:text-red-400">
            {j.fileName}: {j.errorMessage}
          </p>
        ))}
    </div>
  );
}
