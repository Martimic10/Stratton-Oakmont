"use client";

import { useState } from "react";

interface PasteBoxProps {
  onAdd: (text: string) => void;
}

export function PasteBox({ onAdd }: PasteBoxProps) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
      >
        Paste values
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
        Paste a list of dollar values, one per line
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"13,408.31\n$27,500\n8901.42"}
        rows={5}
        className="w-full rounded-xl border border-neutral-300 p-3 font-mono text-sm tabular-nums focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (text.trim()) onAdd(text);
            setText("");
            setOpen(false);
          }}
          className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white active:bg-blue-700"
        >
          Add rows
        </button>
        <button
          type="button"
          onClick={() => {
            setText("");
            setOpen(false);
          }}
          className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
