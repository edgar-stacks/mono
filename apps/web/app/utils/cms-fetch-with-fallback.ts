const cmsTimeoutMs = 5000;

export async function fetchCmsWithFallback<T>(
  fetchContent: (signal: AbortSignal) => Promise<T>,
  fallback: T,
  timeoutMs = cmsTimeoutMs
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetchContent(controller.signal), timeout]);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
