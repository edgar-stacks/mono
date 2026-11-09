import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

import { logger } from '@shared/logger';

import { backgroundErrorsStorageKey, initTestErrorBuffer } from './test-error-buffer';

const environment = vi.hoisted(() => ({ isTestEnv: true }));

vi.mock('@shared/environment', async importOriginal => ({
  ...(await importOriginal<object>()),
  get IS_TEST_ENV() {
    return environment.isTestEnv;
  },
}));

const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

let scope: EventTarget;
let dispose: () => void;

const storedErrorsSchema = z.array(z.object({ ts: z.string(), message: z.string() })).optional();

async function readStoredErrors() {
  const stored = await chrome.storage.session.get(backgroundErrorsStorageKey);
  return storedErrorsSchema.parse(stored[backgroundErrorsStorageKey]);
}

async function readStoredMessages() {
  const stored = await readStoredErrors();
  return stored?.map(entry => entry.message);
}

async function expectStoredMessages(messages: string[]) {
  await vi.waitFor(async () => expect(await readStoredMessages()).toEqual(messages));
}

beforeEach(() => {
  environment.isTestEnv = true;
  scope = new EventTarget();
  vi.stubGlobal('addEventListener', scope.addEventListener.bind(scope));
  vi.stubGlobal('removeEventListener', scope.removeEventListener.bind(scope));
});

afterEach(() => {
  dispose();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe(initTestErrorBuffer.name, () => {
  test('does nothing outside the test build', async () => {
    environment.isTestEnv = false;
    dispose = initTestErrorBuffer();
    logger.error('ignored');
    await expect(readStoredErrors()).resolves.toBeUndefined();
  });

  test('seeds an empty list so a test build can be told apart', async () => {
    dispose = initTestErrorBuffer();
    await expectStoredMessages([]);
  });

  test('keeps errors already recorded when the worker starts again', async () => {
    const earlier = { ts: '2026-11-09T00:00:00.000Z', message: 'earlier' };
    await chrome.storage.session.set({ [backgroundErrorsStorageKey]: [earlier] });
    dispose = initTestErrorBuffer();
    logger.error('later');
    await expectStoredMessages(['earlier', 'later']);
  });

  test('records logger.error, uncaught errors and unhandled rejections', async () => {
    dispose = initTestErrorBuffer();
    logger.error('Unable to Initialise Address Monitor: ', new Error('offline'));
    logger.error('plain', { code: 4 });
    scope.dispatchEvent(Object.assign(new Event('error'), { error: new TypeError('boom') }));
    scope.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'nope' }));

    await vi.waitFor(async () => expect(await readStoredMessages()).toHaveLength(4));
    const stored = await readStoredErrors();
    expect(stored?.map(entry => entry.message)).toEqual([
      expect.stringContaining('Unable to Initialise Address Monitor:  Error: offline'),
      'plain {"code":4}',
      expect.stringContaining('TypeError: boom'),
      'Unhandled rejection: nope',
    ]);
    expect(stored?.[0]?.ts).toMatch(isoTimestamp);
  });

  test('records console.error and still writes it to the console', async () => {
    const write = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dispose = initTestErrorBuffer();
    console.error('Failed to init', new Error('storage'));
    await vi.waitFor(async () => expect(await readStoredMessages()).toHaveLength(1));
    expect(await readStoredMessages()).toEqual([
      expect.stringContaining('Failed to init Error: storage'),
    ]);
    expect(write).toHaveBeenCalledWith('Failed to init', expect.any(Error));
  });

  test('restores console.error once disposed', () => {
    const original = console.error;
    dispose = initTestErrorBuffer();
    expect(console.error).not.toBe(original);
    dispose();
    expect(console.error).toBe(original);
  });

  test('keeps the last 100 errors', async () => {
    dispose = initTestErrorBuffer();
    for (let index = 0; index < 105; index++) logger.error(`error ${index}`);
    await vi.waitFor(async () => expect((await readStoredMessages())?.at(-1)).toBe('error 104'));
    const messages = await readStoredMessages();
    expect(messages).toHaveLength(100);
    expect(messages?.[0]).toBe('error 5');
  });

  test('keeps recording after a failed write', async () => {
    dispose = initTestErrorBuffer();
    await expectStoredMessages([]);
    const set = vi
      .spyOn(chrome.storage.session, 'set')
      .mockRejectedValueOnce(new Error('quota exceeded'));
    logger.error('lost');
    logger.error('kept');
    await expectStoredMessages(['kept']);
    expect(set).toHaveBeenCalledTimes(2);
  });

  test('stops recording once disposed', async () => {
    dispose = initTestErrorBuffer();
    await expectStoredMessages([]);
    dispose();
    logger.error('after dispose');
    scope.dispatchEvent(Object.assign(new Event('error'), { error: new Error('late') }));
    await expectStoredMessages([]);
  });
});
