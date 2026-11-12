const cmsRequestTimeoutMs = 5_000;

export async function withFallback<T>(
  request: Promise<T>,
  fallback: T,
  timeoutMs = cmsRequestTimeoutMs
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    return await Promise.race([request.catch(() => fallback), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
