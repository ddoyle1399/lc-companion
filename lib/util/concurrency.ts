/**
 * Run `task` over `items` with at most `limit` concurrent invocations.
 * Preserves input order in the results array.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await task(items[i]);
    }
  });

  await Promise.all(workers);
  return results;
}
