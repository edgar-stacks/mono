import { describe, expect, test } from 'vitest';

import {
  type VerifyRun,
  decideVerdict,
  parseFlags,
  parseVerifyEnv,
  toVerifyEnv,
  verifyExitCodes,
} from './verify-contract.js';

const run: VerifyRun = {
  label: 'receive-dialog',
  featureId: 'receive-dialog',
  path: '/',
  open: ['HomePage.goToReceiveDialog'],
  session: 'signed-in',
  accountType: 'software',
  network: 'mainnet',
  flags: { releaseOnramperBuy: true, releaseTrendingTokens: false },
  mocks: { mode: 'list', names: ['setupMockApis', 'mockUnhandledRequests'] },
  ready: 'receive-assets-tab',
  stateSlices: ['active', 'networks', 'wallets'],
  connectTestApp: false,
  allowConsoleErrors: false,
  outDir: '/tmp/verify-results/receive-dialog-20261109-101500',
  timeoutMs: 30_000,
};

const clean = {
  readyMet: true,
  unexpectedConsoleErrors: 0,
  backgroundErrors: 0,
  realRequests: 0,
  unappliedMocks: [],
  mocksNone: false,
};

describe(toVerifyEnv.name, () => {
  test('round-trips a run through VERIFY_* variables', () => {
    const env = toVerifyEnv(run);
    expect(env.VERIFY_RUN).toBe('1');
    expect(env.VERIFY_FLAGS).toBe('releaseOnramperBuy=true,releaseTrendingTokens=false');
    expect(parseVerifyEnv(env)).toEqual({ ok: true, value: run });
  });

  test('round-trips rpc runs and no mocks', () => {
    const rpcRun: VerifyRun = {
      ...run,
      featureId: undefined,
      open: [],
      flags: {},
      mocks: { mode: 'none' },
      rpc: { method: 'signPsbt', params: { hex: 'ab' }, hasParams: true },
      connectTestApp: true,
    };
    expect(parseVerifyEnv(toVerifyEnv(rpcRun))).toEqual({ ok: true, value: rpcRun });
    const catalogRun: VerifyRun = {
      ...rpcRun,
      rpc: { method: 'getAddresses', catalogId: 'getAddresses', hasParams: false },
    };
    expect(parseVerifyEnv(toVerifyEnv(catalogRun))).toEqual({ ok: true, value: catalogRun });
  });
});

describe(parseVerifyEnv.name, () => {
  test('refuses to run without VERIFY_RUN=1', () => {
    expect(parseVerifyEnv({ ...toVerifyEnv(run), VERIFY_RUN: undefined })).toEqual({
      ok: false,
      error: 'VERIFY_RUN is not 1',
    });
  });

  test('reports invalid fields', () => {
    const result = parseVerifyEnv({ ...toVerifyEnv(run), VERIFY_SESSION: 'asleep' });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('session');
    expect(
      parseVerifyEnv({ ...toVerifyEnv(run), VERIFY_RPC_METHOD: 'x', VERIFY_RPC_PARAMS: '{' })
    ).toMatchObject({ ok: false });
  });
});

describe(parseFlags.name, () => {
  test('parses name=bool pairs and rejects anything else', () => {
    expect(parseFlags('a=true, b=false')).toEqual({ ok: true, value: { a: true, b: false } });
    expect(parseFlags(undefined)).toEqual({ ok: true, value: {} });
    expect(parseFlags('a=yes')).toEqual({
      ok: false,
      error: "flag 'a=yes' must look like name=true or name=false",
    });
  });
});

describe(decideVerdict.name, () => {
  test('verifies a ready screen with no errors', () => {
    expect(decideVerdict(clean)).toEqual({ verdict: 'verified', reasons: [] });
  });

  test('reports ready-not-met before ordinary errors', () => {
    const decision = decideVerdict({ ...clean, readyMet: false, backgroundErrors: 1 });
    expect(decision.verdict).toBe('ready-not-met');
    expect(decision.reasons).toEqual([
      'ready selector never appeared',
      '1 background error recorded',
    ]);
  });

  test('an rpc error before an approver is an error', () => {
    const decision = decideVerdict({ ...clean, readyMet: false, rpcErrorBeforeApprover: '4001' });
    expect(decision.verdict).toBe('errors');
    expect(decision.reasons[0]).toBe('rpc request failed before an approver opened: 4001');
  });

  test('console errors, background errors, real requests and unapplied mocks are errors', () => {
    const decision = decideVerdict({
      ...clean,
      unexpectedConsoleErrors: 2,
      backgroundErrors: 1,
      realRequests: 3,
      unappliedMocks: ['mockNope'],
    });
    expect(decision).toEqual({
      verdict: 'errors',
      reasons: [
        '2 page or console errors not in the console allowlist',
        '1 background error recorded',
        '3 requests reached the real network under mocks',
        'mock registry cannot apply: mockNope',
      ],
    });
  });

  test('real requests do not fail a run without mocks', () => {
    expect(decideVerdict({ ...clean, realRequests: 3, mocksNone: true }).verdict).toBe('verified');
  });

  test('maps every verdict to its exit code', () => {
    expect(verifyExitCodes).toEqual({
      verified: 0,
      usage: 1,
      'ready-not-met': 2,
      errors: 3,
      env: 4,
    });
  });
});
