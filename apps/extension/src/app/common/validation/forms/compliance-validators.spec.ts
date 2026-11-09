import { z } from 'zod';

import { defaultNetworksKeyedById } from '@leather.io/models';
import type { AddressComplianceCheckResult, UserSettings } from '@leather.io/services';

import { queryClient } from '@app/common/persistence';

import { stxAddressValidator } from './address-validators';
import { complianceValidator } from './compliance-validators';

const mocks = vi.hoisted(() => ({
  checkAddressCompliance: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@app/common/persistence', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient() };
});

vi.mock('@leather.io/services', () => ({
  getComplianceService: () => ({ checkAddressCompliance: mocks.checkAddressCompliance }),
  isOfflineComplianceCheckReason: (reason: string) => reason === 'leather_api_offline',
}));

vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: mocks.track },
}));

const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const secondAddress = 'SP000000000000000000002Q6VF78';

const mainnetSettings: UserSettings = {
  quoteCurrency: 'USD',
  network: defaultNetworksKeyedById.mainnet,
  assetVisibility: {},
};

function createSchema(settings: UserSettings = mainnetSettings) {
  return z
    .string()
    .check(complianceValidator(stxAddressValidator('Invalid address'), 'send_form_stx', settings));
}

async function validate(address: string, settings?: UserSettings) {
  const result = await createSchema(settings).safeParseAsync(address);
  return result.success;
}

function mockCheckResult(result: AddressComplianceCheckResult) {
  mocks.checkAddressCompliance.mockResolvedValue(result);
}

describe(complianceValidator.name, () => {
  beforeEach(() => {
    queryClient.clear();
    mocks.checkAddressCompliance.mockReset();
    mocks.track.mockReset();
  });

  it('skips the check for values that are not addresses', async () => {
    expect(await validate('not-an-address')).toBe(true);
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
      screeningPoint: 'send_form_stx',
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
      screeningPoint: 'send_form_stx',
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
