import { z } from 'zod';

import { IS_TEST_ENV } from '@shared/environment';
import { onLoggerError } from '@shared/logger';

export const backgroundErrorsStorageKey = 'verify:backgroundErrors';

const maxBackgroundErrors = 100;

const backgroundErrorsSchema = z.array(z.object({ ts: z.string(), message: z.string() }));

type BackgroundError = z.infer<typeof backgroundErrorsSchema>[number];

function formatValue(value: unknown): string {
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatErrorMessage(values: readonly unknown[]) {
  return values.map(formatValue).join(' ');
}

async function readBackgroundErrors() {
  const stored = await chrome.storage.session.get(backgroundErrorsStorageKey);
  const parsed = backgroundErrorsSchema.safeParse(stored[backgroundErrorsStorageKey]);
  return parsed.success ? parsed.data : undefined;
}

async function seedBackgroundErrors() {
  if (await readBackgroundErrors()) return;
  await chrome.storage.session.set({ [backgroundErrorsStorageKey]: [] });
}

async function appendBackgroundError(entry: BackgroundError) {
  const current = (await readBackgroundErrors()) ?? [];
  await chrome.storage.session.set({
    [backgroundErrorsStorageKey]: [...current, entry].slice(-maxBackgroundErrors),
  });
}

function eventError(event: Event) {
  if ('reason' in event) return `Unhandled rejection: ${formatValue(event.reason)}`;
  if ('error' in event && event.error !== undefined && event.error !== null) {
    return formatValue(event.error);
  }
  if ('message' in event) return formatValue(event.message);
  return event.type;
}

async function writeAfter(previous: Promise<void>, write: () => Promise<void>) {
  await previous;
  await write().catch(() => undefined);
}

export function initTestErrorBuffer() {
  if (!IS_TEST_ENV) return () => undefined;

  let writes = writeAfter(Promise.resolve(), seedBackgroundErrors);

  function record(message: string) {
    const entry = { ts: new Date().toISOString(), message };
    writes = writeAfter(writes, () => appendBackgroundError(entry));
  }

  function onUncaught(event: Event) {
    record(eventError(event));
  }

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    record(formatErrorMessage(args));
    originalConsoleError(...args);
  };

  const removeLoggerListener = onLoggerError((...args) => record(formatErrorMessage(args)));
  globalThis.addEventListener('error', onUncaught);
  globalThis.addEventListener('unhandledrejection', onUncaught);

  return () => {
    console.error = originalConsoleError;
    removeLoggerListener();
    globalThis.removeEventListener('error', onUncaught);
    globalThis.removeEventListener('unhandledrejection', onUncaught);
  };
}
