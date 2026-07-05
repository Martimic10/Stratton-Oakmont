export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
      <p>No accounts yet. Get started by:</p>
      <ul className="mt-2 space-y-1">
        <li>📷 Uploading photos of your account summary pages, or</li>
        <li>✏️ Pasting a list of dollar values below</li>
      </ul>
    </div>
  );
}
