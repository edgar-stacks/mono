import { queryClient } from '@/queries/query';
import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest';

import { defaultCurrentNetwork, defaultNetworksKeyedById } from '@leather.io/models';
import type { AddressComplianceCheckResult, UserSettings } from '@leather.io/services';

import { addressComplianceValidator } from './utils';

interface HoistedMocks {
  checkAddressCompliance: Mock<(address: string) => Promise<AddressComplianceCheckResult>>;
  track: Mock;
}

const h = vi.hoisted(
  (): HoistedMocks => ({
    checkAddressCompliance: vi.fn(),
    track: vi.fn(),
  })
);

vi.mock('@leather.io/services', () => ({
  getComplianceService: () => ({ checkAddressCompliance: h.checkAddressCompliance }),
  isOfflineComplianceCheckReason: (reason: string) => reason === 'leather_api_offline',
}));

vi.mock('@/utils/analytics', () => ({
  analytics: { track: h.track },
}));

vi.mock('@/queries/query', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient() };
});

const testAddress = 'bc1qtest';

const mainnetSettings: UserSettings = {
  network: defaultCurrentNetwork,
  quoteCurrency: 'USD',
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

describe(addressComplianceValidator.name, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  test('skips the check when the address should not be screened', async () => {
    const result = await addressComplianceValidator({
      address: testAddress,
      shouldCheckCompliance: false,
      screeningPoint: 'send_form_btc',
      settings: mainnetSettings,
    });

    expect(result).toBe(true);
    expect(h.checkAddressCompliance).not.toHaveBeenCalled();
  });

  test('caches a compliant result across validations', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    expect(await validate(testAddress)).toBe(true);
    expect(await validate(testAddress)).toBe(true);

    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(1);
    expect(h.track).not.toHaveBeenCalled();
  });

  test('fails and tracks a non-compliant address', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(testAddress)).toBe(false);

    expect(h.track).toHaveBeenCalledWith('non_compliant_entity_detected', {
      address: testAddress,
      reason: 'ofac',
      screeningPoint: 'send_form_btc',
    });
  });

  test('tracks an unavailable check and re-screens it on the next validation', async () => {
    h.checkAddressCompliance
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'leather_api_http_500' })
      .mockResolvedValueOnce({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(testAddress)).toBe(true);
    expect(h.track).toHaveBeenCalledWith('compliance_check_unavailable', {
      address: testAddress,
      reason: 'leather_api_http_500',
      screeningPoint: 'send_form_btc',
    });

    expect(await validate(testAddress)).toBe(false);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });

  test('does not track an unavailable check when the device is offline', async () => {
    h.checkAddressCompliance.mockResolvedValue({
      status: 'unavailable',
      reason: 'leather_api_offline',
    });

    expect(await validate(testAddress)).toBe(true);

    expect(h.track).not.toHaveBeenCalled();
  });

  test('makes one request for concurrent validations of the same address', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    const results = await Promise.all([validate(testAddress), validate(testAddress)]);

    expect(results).toEqual([true, true]);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(1);
  });

  test('screens the same address again on another network', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    await validate(testAddress);
    await validate(testAddress, { ...mainnetSettings, network: defaultNetworksKeyedById.testnet });

    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });
});
