import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultCurrentNetwork, defaultNetworksKeyedById } from '@leather.io/models';
import type { AddressComplianceCheckResult, UserSettings } from '@leather.io/services';

import { addressComplianceValidator } from './utils';

const mocks = vi.hoisted(() => ({
  checkAddressCompliance: vi.fn<(address: string) => Promise<AddressComplianceCheckResult>>(),
  track: vi.fn(),
}));

vi.mock('@leather.io/services', () => ({
  getComplianceService: () => ({ checkAddressCompliance: mocks.checkAddressCompliance }),
  isOfflineComplianceCheckReason: (reason: string) => reason === 'leather_api_offline',
}));

vi.mock('@/utils/analytics', () => ({
  analytics: { track: mocks.track },
}));

vi.mock('@/queries/query', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) };
});

const mainnetSettings: UserSettings = {
  quoteCurrency: 'USD',
  network: defaultCurrentNetwork,
  assetVisibility: {},
};

const testnetSettings: UserSettings = {
  ...mainnetSettings,
  network: defaultNetworksKeyedById.testnet,
};

let addressCounter = 0;

function uniqueAddress() {
  addressCounter += 1;
  return `bc1qcompliancetest${addressCounter}`;
}

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
    mocks.checkAddressCompliance.mockReset();
    mocks.track.mockReset();
  });

  it('caches a compliant result so a second validation makes no new request', async () => {
    const address = uniqueAddress();
    mocks.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    expect(await validate(address)).toBe(true);
    expect(await validate(address)).toBe(true);

    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('fails and tracks a non-compliant address', async () => {
    const address = uniqueAddress();
    mocks.checkAddressCompliance.mockResolvedValue({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(address)).toBe(false);

    expect(mocks.track).toHaveBeenCalledWith('non_compliant_entity_detected', {
      address,
      reason: 'ofac',
      screeningPoint: 'send_form_btc',
    });
  });

  it('fails open and tracks an unavailable check, then re-screens on the next validation', async () => {
    const address = uniqueAddress();
    mocks.checkAddressCompliance
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'leather_api_http_500' })
      .mockResolvedValueOnce({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(address)).toBe(true);
    expect(mocks.track).toHaveBeenCalledWith('compliance_check_unavailable', {
      address,
      reason: 'leather_api_http_500',
      screeningPoint: 'send_form_btc',
    });

    expect(await validate(address)).toBe(false);
    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });

  it('does not track an unavailable check caused by the device being offline', async () => {
    const address = uniqueAddress();
    mocks.checkAddressCompliance.mockResolvedValue({
      status: 'unavailable',
      reason: 'leather_api_offline',
    });

    expect(await validate(address)).toBe(true);

    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('makes one request for concurrent validations of the same address', async () => {
    const address = uniqueAddress();
    mocks.checkAddressCompliance.mockResolvedValue({ status: 'compliant' });

    const results = await Promise.all([validate(address), validate(address)]);

    expect(results).toEqual([true, true]);
    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a result across networks', async () => {
    const address = uniqueAddress();
    mocks.checkAddressCompliance
      .mockResolvedValueOnce({ status: 'compliant' })
      .mockResolvedValueOnce({ status: 'non_compliant', reason: 'ofac' });

    expect(await validate(address, testnetSettings)).toBe(true);
    expect(await validate(address, mainnetSettings)).toBe(false);

    expect(mocks.checkAddressCompliance).toHaveBeenCalledTimes(2);
  });

  it('skips the check when the address does not need screening', async () => {
    const result = await addressComplianceValidator({
      address: uniqueAddress(),
      shouldCheckCompliance: false,
      screeningPoint: 'send_form_btc',
      settings: mainnetSettings,
    });

    expect(result).toBe(true);
    expect(mocks.checkAddressCompliance).not.toHaveBeenCalled();
  });
});
