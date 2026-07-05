"use client";

interface RateInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function RateInput({ value, onChange }: RateInputProps) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Annual rate</span>
      <div className="flex items-center rounded-xl border border-neutral-300 px-3 py-2 dark:border-neutral-700">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="w-16 bg-transparent text-right font-mono tabular-nums focus:outline-none"
        />
        <span className="ml-1 text-neutral-500">%</span>
      </div>
    </label>
  );
}
