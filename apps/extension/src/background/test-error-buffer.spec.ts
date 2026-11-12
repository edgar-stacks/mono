import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

const environment = vi.hoisted(() => ({ isTestEnv: true }));

vi.mock('@shared/environment', () => ({
  get IS_TEST_ENV() {
    return environment.isTestEnv;
  },
}));

const storageKey = 'verify:backgroundErrors';

type GlobalListener = (event: unknown) => void;

interface Harness {
  stored(): unknown;
  setCalls(): number;
  failNextWrite(): void;
  dispatch(type: string, event: unknown): void;
}

function installHarness(): Harness {
  const store = new Map<string, unknown>();
  const listeners = new Map<string, GlobalListener[]>();
  const state = { setCalls: 0, failNextWrite: false };
  vi.stubGlobal('chrome', {
    storage: {
      session: {
        set(items: Record<string, unknown>) {
          state.setCalls += 1;
          if (state.failNextWrite) {
            state.failNextWrite = false;
            return Promise.reject(new Error('quota exceeded'));
          }
          Object.entries(items).forEach(([key, value]) => store.set(key, value));
          return Promise.resolve();
        },
      },
    },
  });
  vi.stubGlobal('addEventListener', (type: string, listener: GlobalListener) => {
    listeners.set(type, [...(listeners.get(type) ?? []), listener]);
  });
  return {
    stored: () => store.get(storageKey),
    setCalls: () => state.setCalls,
    failNextWrite() {
      state.failNextWrite = true;
    },
    dispatch(type, event) {
      (listeners.get(type) ?? []).forEach(listener => listener(event));
    },
  };
}

async function flushWrites() {
  for (let tick = 0; tick < 10; tick++) await new Promise(resolve => setTimeout(resolve, 0));
}

async function loadModules() {
  const { initTestErrorBuffer } = await import('./test-error-buffer');
  const { logger } = await import('@shared/logger');
  return { initTestErrorBuffer, logger };
}

const bufferedErrorsSchema = z.array(z.object({ ts: z.number(), message: z.string() }));

function messagesOf(value: unknown) {
  return bufferedErrorsSchema.parse(value).map(entry => entry.message);
}

beforeEach(() => {
  vi.resetModules();
  environment.isTestEnv = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('initTestErrorBuffer', () => {
  test('does nothing outside a test build', async () => {
    environment.isTestEnv = false;
    const harness = installHarness();
    const { initTestErrorBuffer, logger } = await loadModules();
    initTestErrorBuffer();
    logger.error('ignored');
    await flushWrites();
    expect(harness.setCalls()).toBe(0);
    expect(harness.stored()).toBeUndefined();
  });

  test('seeds an empty list so a test build can be told apart', async () => {
    const harness = installHarness();
    const { initTestErrorBuffer } = await loadModules();
    initTestErrorBuffer();
    await flushWrites();
    expect(harness.stored()).toEqual([]);
  });

  test('records logger.error, console.error, uncaught errors and unhandled rejections', async () => {
    const harness = installHarness();
    const { initTestErrorBuffer, logger } = await loadModules();
    initTestErrorBuffer();
    logger.error('Unable to Initialise Address Monitor: ', new Error('offline'));
    console.error('console failure', { code: 7 });
    harness.dispatch('error', { message: 'Uncaught TypeError: x is undefined' });
    harness.dispatch('unhandledrejection', { reason: 'boom' });
    await flushWrites();
    const messages = messagesOf(harness.stored());
    expect(messages).toHaveLength(4);
    expect(messages[0]).toContain('Unable to Initialise Address Monitor:');
    expect(messages[0]).toContain('offline');
    expect(messages[1]).toBe('console failure {"code":7}');
    expect(messages[2]).toBe('Uncaught TypeError: x is undefined');
    expect(messages[3]).toBe('Unhandled rejection: boom');
  });

  test('keeps the last 100 errors', async () => {
    const harness = installHarness();
    const { initTestErrorBuffer, logger } = await loadModules();
    initTestErrorBuffer();
    for (let index = 0; index < 105; index++) logger.error(`error ${index}`);
    await flushWrites();
    const messages = messagesOf(harness.stored());
    expect(messages).toHaveLength(100);
    expect(messages[0]).toBe('error 5');
    expect(messages[99]).toBe('error 104');
  });

  test('keeps going after a failed write', async () => {
    const harness = installHarness();
    const { initTestErrorBuffer, logger } = await loadModules();
    initTestErrorBuffer();
    await flushWrites();
    harness.failNextWrite();
    logger.error('lost write');
    await flushWrites();
    logger.error('next write');
    await flushWrites();
    expect(messagesOf(harness.stored())).toEqual(['lost write', 'next write']);
  });
});
