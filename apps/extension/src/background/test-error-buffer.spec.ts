import { afterEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

import { noop } from '@leather.io/utils';

import { logger } from '@shared/logger';

import {
  formatTestErrorMessage,
  initTestErrorBuffer,
  testErrorBufferKey,
} from './test-error-buffer';

let dispose = noop;

function init(target = new EventTarget()) {
  dispose = initTestErrorBuffer({ enabled: true, target });
}

const bufferSchema = z.array(z.object({ ts: z.number(), message: z.string() }));

async function readBuffer() {
  const stored = await chrome.storage.session.get(testErrorBufferKey);
  const value: unknown = stored[testErrorBufferKey];
  return value;
}

async function readEntries() {
  await vi.waitFor(async () => expect(await readBuffer()).toBeDefined());
  return bufferSchema.parse(await readBuffer());
}

async function readMessages() {
  return (await readEntries()).map(entry => entry.message);
}

function errorEvent(type: string, fields: Record<string, unknown>) {
  return Object.assign(new Event(type), fields);
}

afterEach(() => {
  dispose();
  dispose = noop;
  vi.restoreAllMocks();
});

describe(initTestErrorBuffer.name, () => {
  test('does nothing outside a test build', async () => {
    dispose = initTestErrorBuffer({ enabled: false, target: new EventTarget() });
    logger.error('ignored');
    expect(await readBuffer()).toBeUndefined();
  });

  test('seeds an empty buffer so a test build can be told apart', async () => {
    init();
    await vi.waitFor(async () => expect(await readBuffer()).toEqual([]));
  });

  test('records logger errors, console errors, uncaught errors and unhandled rejections', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const target = new EventTarget();
    init(target);

    logger.error('Unable to Initialise Address Monitor: ', new Error('boom'));
    Reflect.apply(Reflect.get(console, 'error'), console, ['console says', { code: 1 }]);
    target.dispatchEvent(errorEvent('error', { error: new TypeError('uncaught') }));
    target.dispatchEvent(errorEvent('unhandledrejection', { reason: 'rejected' }));

    await vi.waitFor(async () => expect(await readMessages()).toHaveLength(4));
    expect(await readMessages()).toEqual([
      'Unable to Initialise Address Monitor:  Error: boom',
      'console says {"code":1}',
      'TypeError: uncaught',
      'rejected',
    ]);
    const [first] = await readEntries();
    expect(first?.ts).toEqual(expect.any(Number));
  });

  test('keeps the last 100 entries', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    init();
    for (let index = 0; index < 105; index++) logger.error(`error ${index}`);

    await vi.waitFor(async () => expect((await readMessages()).at(-1)).toBe('error 104'));
    const messages = await readMessages();
    expect(messages).toHaveLength(100);
    expect(messages[0]).toBe('error 5');
  });

  test('keeps recording after a failed write', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const set = vi.spyOn(chrome.storage.session, 'set');
    init();
    await vi.waitFor(async () => expect(await readBuffer()).toEqual([]));

    set.mockRejectedValueOnce(new Error('quota'));
    logger.error('lost');
    logger.error('kept');

    await vi.waitFor(async () => expect(await readMessages()).toEqual(['kept']));
  });
});

describe(formatTestErrorMessage.name, () => {
  test('joins strings, errors and values that cannot be serialized', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(formatTestErrorMessage(['a', new RangeError('b'), 3, circular])).toBe(
      'a RangeError: b 3 [object Object]'
    );
  });
});
