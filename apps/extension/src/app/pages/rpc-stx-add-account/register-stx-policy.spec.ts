import { describe, expect, test } from 'vitest';

import { WalletDefaultNetworkConfigurationIds, defaultNetworksKeyedById } from '@leather.io/models';

import { createStxPolicyRegistration } from './stx-policy-registration';

const pubkeyA = '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f';
const pubkeyB = '024d4b6cd1361032ca9bd2aeb9d900aa4d45d9ead80ac9423374c451a7254d0766';

const mainnet = defaultNetworksKeyedById[WalletDefaultNetworkConfigurationIds.mainnet];
const testnet = defaultNetworksKeyedById[WalletDefaultNetworkConfigurationIds.testnet];

const baseParams = {
  publicKeys: [pubkeyA, pubkeyB],
  threshold: 2,
  name: 'Treasury vault',
};

describe(createStxPolicyRegistration.name, () => {
  test('uses the resolved network for STX address derivation and policy identity', () => {
    const registration = createStxPolicyRegistration({
      params: { ...baseParams, network: 'testnet' },
      fingerprint: 'deadbeef',
      accountIndex: 0,
      network: testnet,
    });

    expect(registration.result.address).toBe('SN3CFXKD81GREH6MYFW4P9VKSSR2N525W3K30KYER');
    expect(registration.addPolicyPayload.policy).toEqual(
      expect.objectContaining({
        id: 'deadbeef/0/SN3CFXKD81GREH6MYFW4P9VKSSR2N525W3K30KYER/testnet',
        networkId: 'testnet',
        address: registration.result.address,
      })
    );
  });

  test('uses mainnet when the popup resolves to mainnet', () => {
    const registration = createStxPolicyRegistration({
      params: baseParams,
      fingerprint: 'deadbeef',
      accountIndex: 0,
      network: mainnet,
    });

    expect(registration.result.address).toBe('SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1');
    expect(registration.addPolicyPayload.policy.networkId).toBe('mainnet');
  });

  test('registers on the resolved network when the request omits network', () => {
    const registration = createStxPolicyRegistration({
      params: baseParams,
      fingerprint: 'deadbeef',
      accountIndex: 0,
      network: testnet,
    });

    expect(registration.result.address).toBe('SN3CFXKD81GREH6MYFW4P9VKSSR2N525W3K30KYER');
    expect(registration.addPolicyPayload.policy.networkId).toBe('testnet');
  });

  test('returns an added result with the derived address as the account id', () => {
    const registration = createStxPolicyRegistration({
      params: baseParams,
      fingerprint: 'deadbeef',
      accountIndex: 0,
      network: mainnet,
    });

    expect(registration.result.added).toBe(true);
    expect(registration.result.accountId).toBe(registration.result.address);
  });

  test('truncates the stored name to the account name cap', () => {
    const registration = createStxPolicyRegistration({
      params: { ...baseParams, name: 'a'.repeat(50) },
      fingerprint: 'deadbeef',
      accountIndex: 0,
      network: mainnet,
    });

    expect(registration.addPolicyPayload.name).toBe('a'.repeat(35));
  });
});
