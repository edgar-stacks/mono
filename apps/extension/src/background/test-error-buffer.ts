import { IS_TEST_ENV } from '@shared/environment';
import { onLoggerError } from '@shared/logger';

const backgroundErrorsStorageKey = 'verify:backgroundErrors';
const maxBufferedErrors = 100;

interface BufferedError {
  ts: number;
  message: string;
}

function formatArg(arg: unknown) {
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg) ?? String(arg);
  } catch {
    return String(arg);
  }
}

function formatArgs(args: readonly unknown[]) {
  return args.map(formatArg).join(' ');
}

async function writeAfter(previous: Promise<void>, errors: readonly BufferedError[]) {
  await previous;
  try {
    await chrome.storage.session.set({ [backgroundErrorsStorageKey]: errors });
  } catch {
    return;
  }
}

export function initTestErrorBuffer() {
  if (!IS_TEST_ENV) return;

  const errors: BufferedError[] = [];
  const writes = { pending: Promise.resolve() };

  function persist() {
    writes.pending = writeAfter(writes.pending, [...errors]);
  }

  function record(message: string) {
    errors.push({ ts: Date.now(), message });
    if (errors.length > maxBufferedErrors) errors.splice(0, errors.length - maxBufferedErrors);
    persist();
  }

  persist();

  onLoggerError((...args) => record(formatArgs(args)));

  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    consoleError(...args);
    record(formatArgs(args));
  };

  addEventListener('error', (event: ErrorEvent) => record(event.message || formatArg(event.error)));
  addEventListener('unhandledrejection', (event: PromiseRejectionEvent) =>
    record(`Unhandled rejection: ${formatArg(event.reason)}`)
  );
}
