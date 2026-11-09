import { z } from 'zod';

import { noop } from '@leather.io/utils';

import { IS_TEST_ENV } from '@shared/environment';
import { onLoggerError } from '@shared/logger';

export const testErrorBufferKey = 'verify:backgroundErrors';
const maxTestErrors = 100;
const consoleErrorMethod = 'error';

const testErrorEntriesSchema = z.array(z.object({ ts: z.number(), message: z.string() }));

type TestErrorEntry = z.infer<typeof testErrorEntriesSchema>[number];

interface InitTestErrorBufferOptions {
  enabled?: boolean;
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
}

function formatPart(part: unknown) {
  if (part instanceof Error) return `${part.name}: ${part.message}`;
  if (typeof part === 'string') return part;
  try {
    return JSON.stringify(part) ?? String(part);
  } catch {
    return String(part);
  }
}

export function formatTestErrorMessage(parts: readonly unknown[]) {
  return parts.map(formatPart).join(' ');
}

function readEntries(value: unknown) {
  const parsed = testErrorEntriesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

async function seedBuffer() {
  try {
    const stored = await chrome.storage.session.get(testErrorBufferKey);
    if (Array.isArray(stored[testErrorBufferKey])) return;
    await chrome.storage.session.set({ [testErrorBufferKey]: [] });
  } catch {
    return;
  }
}

async function appendEntry(previous: Promise<void>, entry: TestErrorEntry) {
  await previous;
  try {
    const stored = await chrome.storage.session.get(testErrorBufferKey);
    const entries = [...readEntries(stored[testErrorBufferKey]), entry].slice(-maxTestErrors);
    await chrome.storage.session.set({ [testErrorBufferKey]: entries });
  } catch {
    return;
  }
}

function readEventError(event: Event): unknown {
  if ('reason' in event) return event.reason;
  if ('error' in event && event.error !== undefined && event.error !== null) return event.error;
  if ('message' in event) return event.message;
  return event.type;
}

export function initTestErrorBuffer({
  enabled = IS_TEST_ENV,
  target = globalThis,
}: InitTestErrorBufferOptions = {}) {
  if (!enabled) return noop;

  let queue = seedBuffer();

  function record(parts: readonly unknown[]) {
    queue = appendEntry(queue, { ts: Date.now(), message: formatTestErrorMessage(parts) });
  }

  const stopLoggerErrors = onLoggerError((message, ...args) => record([message, ...args]));

  const originalConsoleError: unknown = Reflect.get(console, consoleErrorMethod);
  Reflect.set(console, consoleErrorMethod, (...args: unknown[]) => {
    record(args);
    if (typeof originalConsoleError === 'function')
      Reflect.apply(originalConsoleError, console, args);
  });

  function onEventError(event: Event) {
    record([readEventError(event)]);
  }
  target.addEventListener('error', onEventError);
  target.addEventListener('unhandledrejection', onEventError);

  return () => {
    stopLoggerErrors();
    Reflect.set(console, consoleErrorMethod, originalConsoleError);
    target.removeEventListener('error', onEventError);
    target.removeEventListener('unhandledrejection', onEventError);
  };
}
