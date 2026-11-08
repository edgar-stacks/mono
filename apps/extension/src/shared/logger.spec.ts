import type pino from 'pino';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const testnetAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

const appendLogToBrowserStorage = vi.fn<(logEvent: pino.LogEvent) => void>();

vi.mock('pino', async () => {
  const browserPino = await vi.importActual<{ default: unknown }>('pino/browser.js');
  return { default: browserPino.default };
});

vi.mock('./environment', () => ({ IS_TEST_ENV: false }));

vi.mock('./logger-storage', () => ({
  appendLogToBrowserStorage(logEvent: pino.LogEvent) {
    appendLogToBrowserStorage(logEvent);
    return Promise.resolve();
  },
}));

describe('logger with the pino browser build', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {});
    vi.spyOn(console, 'info').mockReturnValue(undefined);
    vi.spyOn(console, 'error').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    appendLogToBrowserStorage.mockClear();
  });

  test('logs without throwing and transmits redacted messages', async () => {
    const { logger } = await import('./logger');

    expect(() => logger.info('Sending', { address: testnetAddress, fee: 500 })).not.toThrow();

    expect(appendLogToBrowserStorage).toHaveBeenCalledTimes(1);
    const [logEvent] = appendLogToBrowserStorage.mock.calls[0];
    expect(logEvent.messages).toEqual(['Sending', { address: '[redacted]', fee: 500 }]);
  });

  test('skips levels below the configured level', async () => {
    const { logger } = await import('./logger');

    expect(() => logger.debug('Debug', { address: testnetAddress })).not.toThrow();

    expect(appendLogToBrowserStorage).not.toHaveBeenCalled();
  });

  test('transmits errors', async () => {
    const { logger } = await import('./logger');

    expect(() => logger.error('Failed', { txid: 'a'.repeat(64) })).not.toThrow();

    expect(appendLogToBrowserStorage).toHaveBeenCalledTimes(1);
    const [logEvent] = appendLogToBrowserStorage.mock.calls[0];
    expect(logEvent.messages).toEqual(['Failed', { txid: '[redacted]' }]);
  });
});
