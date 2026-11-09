import { describe, expect, test } from 'vitest';

import { getBtcAddAccountApprovalMode, getPolicyApprovalMode, policyCallout } from './policy-match';

const whitelistedOrigin = 'https://app.leather.io';
const otherOrigin = 'https://evil.example.com';

describe(getPolicyApprovalMode.name, () => {
  test('returns add when both frame and top origins are whitelisted', () => {
    expect(getPolicyApprovalMode(whitelistedOrigin, whitelistedOrigin)).toBe('add');
  });

  test('returns verify when a whitelisted origin is embedded in a non-whitelisted page', () => {
    expect(getPolicyApprovalMode(whitelistedOrigin, otherOrigin)).toBe('verify');
  });

  test('returns verify when a non-whitelisted origin is embedded in a whitelisted page', () => {
    expect(getPolicyApprovalMode(otherOrigin, whitelistedOrigin)).toBe('verify');
  });

  test('returns verify when the top origin is unknown', () => {
    expect(getPolicyApprovalMode(whitelistedOrigin, null)).toBe('verify');
    expect(getPolicyApprovalMode(whitelistedOrigin, undefined)).toBe('verify');
    expect(getPolicyApprovalMode(whitelistedOrigin, '')).toBe('verify');
  });

  test('returns verify when neither origin is whitelisted', () => {
    expect(getPolicyApprovalMode(otherOrigin, otherOrigin)).toBe('verify');
  });
});

describe(getBtcAddAccountApprovalMode.name, () => {
  test('returns add for a multisig descriptor from a whitelisted origin', () => {
    expect(getBtcAddAccountApprovalMode(whitelistedOrigin, whitelistedOrigin, 'multisig')).toBe(
      'add'
    );
  });

  test('returns verify for a multisig descriptor from another origin', () => {
    expect(getBtcAddAccountApprovalMode(otherOrigin, otherOrigin, 'multisig')).toBe('verify');
  });

  test('returns verify for a timelocked descriptor even from a whitelisted origin', () => {
    expect(getBtcAddAccountApprovalMode(whitelistedOrigin, whitelistedOrigin, 'timelocked')).toBe(
      'verify'
    );
    expect(getBtcAddAccountApprovalMode(otherOrigin, otherOrigin, 'timelocked')).toBe('verify');
  });
});

describe(policyCallout.name, () => {
  test('names the multisig account by default', () => {
    expect(policyCallout('mismatch', 'Bitcoin')).toEqual({
      variant: 'warning',
      message:
        "Your active Bitcoin account isn't connected to this multisig account. You need to use an account that is connected to this multisig account.",
    });
  });

  test('names the given subject', () => {
    expect(policyCallout('mismatch', 'Bitcoin', 'this vault').message).toBe(
      "Your active Bitcoin account isn't connected to this vault. You need to use an account that is connected to this vault."
    );
    expect(policyCallout('match', 'Bitcoin', 'this timelocked address')).toEqual({
      variant: 'info',
      message: 'You need to use an account that is connected to this timelocked address.',
    });
  });

  test('warns when there is no active account', () => {
    expect(policyCallout('no-active-account', 'Stacks')).toEqual({
      variant: 'warning',
      message:
        'No active Stacks account. You need to use an account that is connected to this multisig account.',
    });
  });
});
