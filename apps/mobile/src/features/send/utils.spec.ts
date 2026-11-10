import { queryClient } from '@/queries/query';
import { analytics } from '@/utils/analytics';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultCurrentNetwork } from '@leather.io/models';
import type { AddressComplianceCheckResult, UserSettings } from '@leather.io/services';

import { addressComplianceValidator } from './utils';

interface HoistedMocks {
  checkAddressCompliance: Mock<(address: string) => Promise<AddressComplianceCheckResult>>;
}

const h = vi.hoisted(
  (): HoistedMocks => ({
    checkAddressCompliance: vi.fn(),
  })
);

vi.mock('@leather.io/services', () => ({
  getComplianceService: () => ({ checkAddressCompliance: h.checkAddressCompliance }),
  isOfflineComplianceCheckReason: (reason: string) => reason === 'leather_api_offline',
}));

vi.mock('@/queries/query', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  };
});

vi.mock('@/utils/analytics', () => ({
  analytics: { track: vi.fn() },
}));

const testAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const testSettings: UserSettings = {
  network: defaultCurrentNetwork,
  quoteCurrency: 'USD',
  assetVisibility: {},
};

function validate(address: string) {
  return addressComplianceValidator({
    address,
    shouldCheckCompliance: true,
    screeningPoint: 'send_form_btc',
    settings: testSettings,
  });
}

describe(addressComplianceValidator.name, () => {
  beforeEach(() => {
    queryClient.clear();
    h.checkAddressCompliance.mockReset();
    vi.mocked(analytics.track).mockReset();
  });

  it('caches a compliant result across validations', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    expect(await validate(testAddress)).toBe(true);
    expect(await validate(testAddress)).toBe(true);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(1);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('fails and tracks a non-compliant address', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(testAddress)).toBe(false);
    expect(analytics.track).toHaveBeenCalledWith('non_compliant_entity_detected', {
      address: testAddress,
      reason: 'ofac',
      screeningPoint: 'send_form_btc',
    });
  });

  it('tracks an unavailable check, passes and re-screens on the next validation', async () => {
    h.checkAddressCompliance
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'leather_api_http_500' })
      .mockResolvedValueOnce({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(testAddress)).toBe(true);
    expect(analytics.track).toHaveBeenCalledWith('compliance_check_unavailable', {
      address: testAddress,
      reason: 'leather_api_http_500',
      screeningPoint: 'send_form_btc',
    });
    expect(await validate(testAddress)).toBe(false);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });

  it('passes without tracking when the device is offline', async () => {
    h.checkAddressCompliance.mockResolvedValue({
      status: 'unavailable',
      reason: 'leather_api_offline',
    });

    expect(await validate(testAddress)).toBe(true);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('makes one request for concurrent validations of one address', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    const results = await Promise.all([validate(testAddress), validate(testAddress)]);

    expect(results).toEqual([true, true]);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(1);
  });

  it('skips the check when compliance should not be checked', async () => {
    const result = await addressComplianceValidator({
      address: testAddress,
      shouldCheckCompliance: false,
      screeningPoint: 'send_form_btc',
      settings: testSettings,
    });

    expect(result).toBe(true);
    expect(h.checkAddressCompliance).not.toHaveBeenCalled();
  });
});
