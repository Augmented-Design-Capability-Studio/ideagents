// Caps how many model calls run at once. Playing out futures branches at
// every step, so without a cap a single click fires a dozen requests together
// and runs straight into the API's rate limit.
export function createLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  const release = () => {
    active -= 1;
    queue.shift()?.();
  };

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
