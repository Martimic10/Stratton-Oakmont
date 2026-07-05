/**
 * Runs `handler` over `items` with at most `concurrency` in flight at once.
 * Each item's success/failure is isolated — one rejection never aborts the others.
 */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        await handler(items[index]);
      } catch {
        // handler is expected to catch its own errors and record status;
        // this guards the pool loop itself from stopping on an unexpected throw.
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
}
