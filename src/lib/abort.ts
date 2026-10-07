// Native file reads and some fetch implementations can outlive an abort.
// Settle the caller immediately, while still handling any late task rejection.
export async function withAbort<T>(signal: AbortSignal, task: () => Promise<T>): Promise<T> {
  if (signal.aborted) throw new Error('Photo scan cancelled.');
  let onAbort!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error('Photo scan cancelled.'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([cancelled, task()]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
