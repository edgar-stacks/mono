import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

import { defaultCurrentNetwork, defaultNetworksKeyedById } from '@leather.io/models';
import type { AddressComplianceCheckResult, UserSettings } from '@leather.io/services';

import { stringField } from '@shared/forms/field-schemas';

import { queryClient } from '@app/common/persistence';

import { complianceValidator } from './compliance-validators';

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

vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: h.track },
}));

vi.mock('@app/common/persistence', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient() };
});

const testAddress = 'bc1qtest';

const mainnetSettings: UserSettings = {
  network: defaultCurrentNetwork,
  quoteCurrency: 'USD',
  assetVisibility: {},
};

function createRecipientSchema(settings: UserSettings = mainnetSettings) {
  return stringField().check(
    complianceValidator(
      z.refine<string | undefined>(() => true),
      'send_form_btc',
      settings
    )
  );
}

async function validate(address: string, settings?: UserSettings) {
  const result = await createRecipientSchema(settings).safeParseAsync(address);
  return result.success;
}

describe(complianceValidator.name, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
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
