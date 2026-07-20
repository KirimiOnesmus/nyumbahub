'use strict';


async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        const value = await worker(items[currentIndex], currentIndex);
        results[currentIndex] = { ok: true, value };
      } catch (error) {
        results[currentIndex] = { ok: false, error };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, runWorker));

  return results;
}

module.exports = { mapWithConcurrency };