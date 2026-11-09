import { describe, expect, test } from 'vitest';

import {
  type VerifyRun,
  isVerifyRunEnabled,
  parseVerifySummary,
  verdictFor,
  verifyConfigEnvVar,
  verifyExitCodes,
  verifyRunFromEnv,
  verifyRunToEnv,
} from './verify-contract.js';

const run: VerifyRun = {
  label: 'receive-dialog',
  feature: 'receive-dialog',
  route: '/',
  open: [{ className: 'HomePage', method: 'goToReceiveDialog' }],
  session: 'signed-in',
  accountType: 'software',
  network: 'mainnet',
  flags: { releaseOnramperBuy: true },
  mocks: { mode: 'list', names: ['setupMockApis', 'mockUnhandledRequests'] },
  ready: 'receive-assets-tab',
  stateSlices: ['active', 'networks', 'wallets'],
  connectTestApp: false,
  allowConsoleErrors: false,
  outDir: '/tmp/verify-results/receive-dialog-20261109-120000',
  timeout: 30000,
};

describe(verifyRunToEnv.name, () => {
  test('round-trips a run through the VERIFY_* env vars', () => {
    const env = verifyRunToEnv(run);
    expect(env.VERIFY_RUN).toBe('1');
    expect(isVerifyRunEnabled(env)).toBe(true);
    expect(verifyRunFromEnv(env)).toEqual(run);
  });

  test('keeps rpc params of any JSON shape', () => {
    const rpcRun: VerifyRun = {
      ...run,
      rpc: { method: 'signMessage', params: [{ message: 'hi' }], paramsSource: 'file' },
    };
    expect(verifyRunFromEnv(verifyRunToEnv(rpcRun)).rpc).toEqual(rpcRun.rpc);
  });
});

describe(verifyRunFromEnv.name, () => {
  test('refuses to run without VERIFY_RUN=1', () => {
    const env = { [verifyConfigEnvVar]: JSON.stringify(run) };
    expect(isVerifyRunEnabled(env)).toBe(false);
    expect(() => verifyRunFromEnv(env)).toThrow('VERIFY_RUN=1');
  });

  test('rejects a config that does not match the contract', () => {
    const env = {
      ...verifyRunToEnv(run),
      [verifyConfigEnvVar]: JSON.stringify({ ...run, session: 'asleep' }),
    };
    expect(() => verifyRunFromEnv(env)).toThrow();
  });
});

describe(verdictFor.name, () => {
  test('is verified without findings', () => {
    expect(verdictFor([])).toBe('verified');
  });

  test('ranks env above errors above ready-not-met', () => {
    const ready = { kind: 'ready-not-met', message: 'x' } as const;
    const consoleError = { kind: 'console-error', message: 'x' } as const;
    const env = { kind: 'env', message: 'x' } as const;
    expect(verdictFor([ready])).toBe('ready-not-met');
    expect(verdictFor([ready, consoleError])).toBe('errors');
    expect(verdictFor([ready, consoleError, env])).toBe('env');
  });

  test('maps every error kind to exit code 3', () => {
    const kinds = [
      'rpc-error',
      'page-error',
      'console-error',
      'background-error',
      'real-request',
      'unapplied-mock',
    ] as const;
    for (const kind of kinds) {
      expect(verifyExitCodes[verdictFor([{ kind, message: kind }])]).toBe(3);
    }
  });

  test('keeps the documented exit codes', () => {
    expect(verifyExitCodes).toEqual({
      verified: 0,
      usage: 1,
      'ready-not-met': 2,
      errors: 3,
      env: 4,
    });
  });
});

describe(parseVerifySummary.name, () => {
  test('parses the summary the spec writes', () => {
    const summary = {
      verdict: 'verified',
      exitCode: 0,
      run,
      findings: [],
      artifacts: ['screenshot.png', 'summary.json'],
      url: 'chrome-extension://id/index.html#/',
      startedAt: '2026-11-09T12:00:00.000Z',
      finishedAt: '2026-11-09T12:00:10.000Z',
    };
    expect(parseVerifySummary(summary)).toEqual(summary);
    expect(() => parseVerifySummary({ ...summary, verdict: 'maybe' })).toThrow();
  });
});
