import { QueryClient } from '@tanstack/react-query';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultCurrentNetwork } from '@leather.io/models';
import type { AddressComplianceCheckResult, UserSettings } from '@leather.io/services';

import { btcAddressValidator } from '@shared/forms/address-validators';
import { stringField } from '@shared/forms/field-schemas';
import { analytics } from '@shared/utils/analytics';

import { queryClient } from '@app/common/persistence';

import { complianceValidator } from './compliance-validators';

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

vi.mock('@app/common/persistence', () => ({
  queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
}));

vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: vi.fn() },
}));

const testAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const testSettings: UserSettings = {
  network: defaultCurrentNetwork,
  quoteCurrency: 'USD',
  assetVisibility: {},
};

function validate(address: string) {
  return stringField()
    .check(complianceValidator(btcAddressValidator(), 'send_form_btc', testSettings))
    .safeParseAsync(address);
}

describe(complianceValidator.name, () => {
  beforeEach(() => {
    queryClient.clear();
    h.checkAddressCompliance.mockReset();
    vi.mocked(analytics.track).mockReset();
  });

  it('caches a compliant result across validations', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    const first = await validate(testAddress);
    const second = await validate(testAddress);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(1);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('fails and tracks a non-compliant address', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'non_compliant', reason: 'ofac' });

    const result = await validate(testAddress);

    expect(result.success).toBe(false);
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

    const first = await validate(testAddress);
    const second = await validate(testAddress);

    expect(first.success).toBe(true);
    expect(analytics.track).toHaveBeenCalledWith('compliance_check_unavailable', {
      address: testAddress,
      reason: 'leather_api_http_500',
      screeningPoint: 'send_form_btc',
    });
    expect(second.success).toBe(false);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });

  it('passes without tracking when the device is offline', async () => {
    h.checkAddressCompliance.mockResolvedValue({
      status: 'unavailable',
      reason: 'leather_api_offline',
    });

    const result = await validate(testAddress);

    expect(result.success).toBe(true);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('makes one request for concurrent validations of one address', async () => {
    h.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    const results = await Promise.all([validate(testAddress), validate(testAddress)]);

    expect(results.every(result => result.success)).toBe(true);
    expect(h.checkAddressCompliance).toHaveBeenCalledTimes(1);
  });

  it('skips the check for an invalid address', async () => {
    await validate('not-an-address');

    expect(h.checkAddressCompliance).not.toHaveBeenCalled();
  });
});
