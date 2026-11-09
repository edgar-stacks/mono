import { queryClient } from '@/queries/query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';
import type { AddressComplianceCheckResult, UserSettings } from '@leather.io/services';

import { addressComplianceValidator } from './utils';

const mocks = vi.hoisted(() => ({
  checkAddressCompliance: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@/queries/query', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient() };
});

vi.mock('@/utils/analytics', () => ({
  analytics: { track: mocks.track },
}));

vi.mock('@leather.io/services', () => ({
  getComplianceService: () => ({ checkAddressCompliance: mocks.checkAddressCompliance }),
  isOfflineComplianceCheckReason: (reason: string) => reason === 'leather_api_offline',
}));

const testAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const secondAddress = 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l';

const mainnetSettings: UserSettings = {
  quoteCurrency: 'USD',
  network: defaultNetworksKeyedById.mainnet,
  assetVisibility: {},
};

function validate(address: string, settings: UserSettings = mainnetSettings) {
  return addressComplianceValidator({
    address,
    shouldCheckCompliance: true,
    screeningPoint: 'send_form_btc',
    settings,
  });
}

function mockCheckResult(result: AddressComplianceCheckResult) {
  mocks.checkAddressCompliance.mockResolvedValue(result);
}

describe(addressComplianceValidator.name, () => {
  beforeEach(() => {
    queryClient.clear();
    mocks.checkAddressCompliance.mockReset();
    mocks.track.mockReset();
  });

  it('skips the check when compliance should not be checked', async () => {
    const result = await addressComplianceValidator({
      address: testAddress,
      shouldCheckCompliance: false,
      screeningPoint: 'send_form_btc',
      settings: mainnetSettings,
    });

    expect(result).toBe(true);
    expect(mocks.checkAddressCompliance).not.toHaveBeenCalled();
  });

  it('caches a compliant result', async () => {
    mockCheckResult({ status: 'compliant' });

    expect(await validate(testAddress)).toBe(true);
    expect(await validate(testAddress)).toBe(true);

    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('caches results per network', async () => {
    mockCheckResult({ status: 'compliant' });

    await validate(testAddress);
    await validate(testAddress, { ...mainnetSettings, network: defaultNetworksKeyedById.testnet });

    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });

  it('fails and tracks a non-compliant address', async () => {
    mockCheckResult({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(testAddress)).toBe(false);
    expect(mocks.track).toHaveBeenCalledWith('non_compliant_entity_detected', {
      address: testAddress,
      reason: 'ofac',
      screeningPoint: 'send_form_btc',
    });
  });

  it('fails open on an unavailable check, tracks it and re-screens on the next validation', async () => {
    mocks.checkAddressCompliance
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'leather_api_http_500' })
      .mockResolvedValueOnce({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(testAddress)).toBe(true);
    expect(mocks.track).toHaveBeenCalledWith('compliance_check_unavailable', {
      address: testAddress,
      reason: 'leather_api_http_500',
      screeningPoint: 'send_form_btc',
    });

    expect(await validate(testAddress)).toBe(false);
    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });

  it('does not track an unavailable check caused by the device being offline', async () => {
    mockCheckResult({ status: 'unavailable', reason: 'leather_api_offline' });

    expect(await validate(testAddress)).toBe(true);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('makes one request for concurrent validations of the same address', async () => {
    mockCheckResult({ status: 'compliant' });

    const results = await Promise.all([
      validate(testAddress),
      validate(testAddress),
      validate(secondAddress),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });
});
