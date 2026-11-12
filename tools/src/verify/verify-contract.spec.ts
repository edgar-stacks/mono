import { describe, expect, test } from 'vitest';

import {
  type VerifyPlan,
  decideVerdict,
  parseVerifySummary,
  readVerifyPlanEnv,
  verifyExitCodes,
  verifyPlanEnv,
} from './verify-contract.js';

const plan: VerifyPlan = {
  label: 'receive-dialog',
  featureId: 'receive-dialog',
  route: '/',
  open: ['HomePage.goToReceiveDialog'],
  session: 'signed-in',
  accountType: 'software',
  network: 'mainnet',
  flags: { releaseOnramperSell: true },
  mocksMode: 'default',
  mocks: ['setupMockApis', 'mockUnhandledRequests'],
  ready: 'receive-assets-tab',
  stateSlices: ['active', 'networks', 'wallets'],
  connectTestApp: false,
  allowConsoleErrors: false,
  timeoutMs: 30000,
};

describe(readVerifyPlanEnv.name, () => {
  test('round-trips the plan the CLI writes', () => {
    const env = verifyPlanEnv(plan, '/tmp/out');
    expect(env.VERIFY_RUN).toBe('1');
    expect(readVerifyPlanEnv(env)).toEqual({ ok: true, plan, outDir: '/tmp/out' });
  });

  test('keeps rpc params through the env', () => {
    const rpcPlan: VerifyPlan = {
      ...plan,
      rpc: { method: 'getAddresses', paramsSource: 'file', params: { network: 'mainnet' } },
    };
    const result = readVerifyPlanEnv(verifyPlanEnv(rpcPlan, '/tmp/out'));
    expect(result.ok && result.plan.rpc).toEqual(rpcPlan.rpc);
  });

  test('explains a missing or broken env', () => {
    expect(readVerifyPlanEnv({})).toEqual({
      ok: false,
      error: 'VERIFY_RUN is not 1; run it through pnpm lt verify extension',
    });
    expect(readVerifyPlanEnv({ VERIFY_RUN: '1', VERIFY_PLAN: '{}' })).toEqual({
      ok: false,
      error: 'VERIFY_OUT_DIR is not set',
    });
    const broken = readVerifyPlanEnv({
      VERIFY_RUN: '1',
      VERIFY_OUT_DIR: '/tmp',
      VERIFY_PLAN: '{"label":',
    });
    expect(broken.ok ? '' : broken.error).toContain('VERIFY_PLAN is not a valid plan');
    const invalid = readVerifyPlanEnv({
      ...verifyPlanEnv(plan, '/tmp'),
      VERIFY_PLAN: JSON.stringify({ ...plan, session: 'asleep' }),
    });
    expect(invalid.ok).toBe(false);
  });
});

describe(decideVerdict.name, () => {
  test('ranks env over errors over a missing ready selector', () => {
    expect(decideVerdict({ envErrors: ['no dist'], errors: ['x'], readyMet: false })).toBe('env');
    expect(decideVerdict({ envErrors: [], errors: ['page error'], readyMet: true })).toBe('errors');
    expect(decideVerdict({ envErrors: [], errors: [], readyMet: false })).toBe('ready-not-met');
    expect(decideVerdict({ envErrors: [], errors: [], readyMet: true })).toBe('verified');
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

describe(parseVerifySummary.name, () => {
  test('accepts a summary the spec writes and rejects anything else', () => {
    const summary = {
      verdict: 'verified',
      exitCode: 0,
      label: 'receive-dialog',
      featureId: 'receive-dialog',
      ready: 'receive-assets-tab',
      readyMet: true,
      reasons: [],
      artifacts: ['summary.json'],
      startedAt: '2026-11-09T07:41:17.000Z',
      durationMs: 1200,
      plan,
    };
    expect(parseVerifySummary(JSON.stringify(summary))).toEqual(summary);
    expect(parseVerifySummary('not json')).toBeUndefined();
    expect(parseVerifySummary(JSON.stringify({ ...summary, verdict: 'maybe' }))).toBeUndefined();
  });
});
