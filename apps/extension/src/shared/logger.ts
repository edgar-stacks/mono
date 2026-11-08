import pino from 'pino';
import { Subject, defer, mergeMap } from 'rxjs';

import { IS_TEST_ENV } from './environment';
import { redactLogArgs } from './logger-redaction';
import { appendLogToBrowserStorage } from './logger-storage';

const logs$ = new Subject<pino.LogEvent>();

const maximumConcurrentLogAppends = 1;

logs$
  // `chrome.storage` has no append API. Appending logs requires reading the
  // whole log, and writing it back. This is expensive, but not a problem when
  // logs are periodic. Though, when multiple logs happen quickly, we need to
  // queue appends, otherwise one append might get overwritten by the other.
  // Here we defer the promise, and only handle a single concurrent append at a
  // given time.
  .pipe(mergeMap(log => defer(() => appendLogToBrowserStorage(log)), maximumConcurrentLogAppends))
  .subscribe();

const pinoLogger = pino({
  enabled: !IS_TEST_ENV,
  level: 'info',
  browser: {
    asObject: false,
    transmit: {
      level: 'info',
      send(_level, logEvent) {
        if (!chrome) return;
        logs$.next(logEvent);
      },
    },
  },
});

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LoggerFnApi = (msg: string, ...args: unknown[]) => void;

function isLevelEnabled(level: LogLevel) {
  return pinoLogger.levels.values[level] >= pinoLogger.levelVal;
}

function log(level: LogLevel, args: unknown[]) {
  if (!isLevelEnabled(level)) return;
  pinoLogger[level](...redactLogArgs(args));
}

// Pino offers a handful of APIs to log messages. Here we enforce a single one,
// described by `LoggerFnApi`
export const logger: Record<LogLevel, LoggerFnApi> = {
  debug(...args) {
    log('debug', args);
  },
  info(...args) {
    log('info', args);
  },
  warn(...args) {
    log('warn', args);
  },
  error(...args) {
    log('error', args);
  },
};
