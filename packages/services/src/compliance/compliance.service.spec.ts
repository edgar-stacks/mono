import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultCurrentNetwork } from '@leather.io/models';

import {
  type LeatherApiAddressComplianceCheck,
  type LeatherApiClient,
} from '../infrastructure/api/leather/leather-api.client';
import { LeatherApiError } from '../infrastructure/api/leather/leather-api.error';
import { type SettingsService } from '../infrastructure/settings/settings.service';
import { createTestUserSettings } from '../test/balances-settings';
import { createMock } from '../test/create-mock';
import { ComplianceService, isOfflineComplianceCheckReason } from './compliance.service';

const testAddress = 'bc1qtest';

function makeService(
  fetchAddressComplianceCheck: () => Promise<LeatherApiAddressComplianceCheck>,
  mode: 'mainnet' | 'testnet' = 'mainnet'
) {
  const mockClient = createMock<LeatherApiClient>({ fetchAddressComplianceCheck });
  const mockSettings: SettingsService = {
    getSettings() {
      return createTestUserSettings({
        network: {
          ...defaultCurrentNetwork,
          chain: {
            ...defaultCurrentNetwork.chain,
            bitcoin: { ...defaultCurrentNetwork.chain.bitcoin, mode },
          },
        },
      });
    },
  };
  return new ComplianceService(mockClient, mockSettings);
}

function makeCheckResponse(
  status: LeatherApiAddressComplianceCheck['status'],
  checks: LeatherApiAddressComplianceCheck['checks']
): LeatherApiAddressComplianceCheck {
  return { address: testAddress, status, checks };
}

describe(ComplianceService.name, () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('checkAddressCompliance', () => {
    it('returns compliant without calling the api on non-mainnet networks', async () => {
      let apiCalled = false;
      const service = makeService(() => {
        apiCalled = true;
        return Promise.resolve(makeCheckResponse('non_compliant', []));
      }, 'testnet');

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'compliant' });
      expect(apiCalled).toBe(false);
    });

    it('returns compliant when the api reports the address compliant', async () => {
      const service = makeService(() =>
        Promise.resolve(
          makeCheckResponse('compliant', [
            { type: 'ofac', result: 'pass' },
            { type: 'risk_screening', result: 'pass' },
          ])
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'compliant' });
    });

    it('returns non_compliant with the failed check reason when the api reports the address non-compliant', async () => {
      const service = makeService(() =>
        Promise.resolve(
          makeCheckResponse('non_compliant', [
            { type: 'ofac', result: 'fail' },
            { type: 'risk_screening', result: 'pass' },
          ])
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'non_compliant', reason: 'ofac' });
    });

    it('includes the provider in the reason when present on a failed check', async () => {
      const service = makeService(() =>
        Promise.resolve(
          makeCheckResponse('non_compliant', [
            { type: 'ofac', result: 'pass' },
            { type: 'risk_screening', result: 'fail', provider: 'chainalysis' },
          ])
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'non_compliant', reason: 'risk_screening_chainalysis' });
    });

    it('returns non_compliant with unknown reason when the api reports non-compliant without failed checks', async () => {
      const service = makeService(() => Promise.resolve(makeCheckResponse('non_compliant', [])));

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'non_compliant', reason: 'unknown' });
    });

    it('returns unavailable with the errored check reason when the api reports unavailable', async () => {
      const service = makeService(() =>
        Promise.resolve(
          makeCheckResponse('unavailable', [
            { type: 'ofac', result: 'pass' },
            { type: 'risk_screening', result: 'error', errorReason: 'rate_limited' },
          ])
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'unavailable', reason: 'risk_screening_rate_limited' });
    });

    it('includes the provider in the reason when present on an errored check', async () => {
      const service = makeService(() =>
        Promise.resolve(
          makeCheckResponse('unavailable', [
            { type: 'ofac', result: 'pass' },
            {
              type: 'risk_screening',
              result: 'error',
              errorReason: 'rate_limited',
              provider: 'chainalysis',
            },
          ])
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({
        status: 'unavailable',
        reason: 'risk_screening_chainalysis_rate_limited',
      });
    });

    it('joins reasons when multiple checks errored', async () => {
      const service = makeService(() =>
        Promise.resolve(
          makeCheckResponse('unavailable', [
            { type: 'ofac', result: 'error', errorReason: 'upstream_error' },
            { type: 'risk_screening', result: 'error', errorReason: 'rate_limited' },
          ])
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({
        status: 'unavailable',
        reason: 'ofac_upstream_error,risk_screening_rate_limited',
      });
    });

    it('returns unavailable with unknown_error when the api reports unavailable without errored checks', async () => {
      const service = makeService(() => Promise.resolve(makeCheckResponse('unavailable', [])));

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'unavailable', reason: 'unknown_error' });
    });

    it('returns unavailable with the http status when the api rejects the request', async () => {
      const service = makeService(() =>
        Promise.reject(
          new LeatherApiError(
            'https://api.leather.io/v1/compliance/addresses/bc1qtest',
            500,
            'Internal Server Error'
          )
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'unavailable', reason: 'leather_api_http_500' });
    });

    it('returns unavailable when the request never reaches the api', async () => {
      vi.useFakeTimers();
      const service = makeService(() => Promise.reject(new TypeError('Failed to fetch')));

      const resultPromise = service.checkAddressCompliance(testAddress);
      await vi.runAllTimersAsync();

      expect(await resultPromise).toEqual({
        status: 'unavailable',
        reason: 'leather_api_network_error',
      });
    });

    it('returns unavailable with leather_api_offline when the device has no connectivity', async () => {
      vi.useFakeTimers();
      vi.stubGlobal('navigator', { onLine: false });
      const service = makeService(() => Promise.reject(new TypeError('Failed to fetch')));

      const resultPromise = service.checkAddressCompliance(testAddress);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toEqual({ status: 'unavailable', reason: 'leather_api_offline' });
      expect(result.status === 'unavailable' && isOfflineComplianceCheckReason(result.reason)).toBe(
        true
      );
    });

    it('keeps the http reason when the device has no connectivity', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      const service = makeService(() =>
        Promise.reject(
          new LeatherApiError(
            'https://api.leather.io/v1/compliance/addresses/bc1qtest',
            503,
            'Service Unavailable'
          )
        )
      );

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'unavailable', reason: 'leather_api_http_503' });
    });

    it('retries once after a delay when the request fails with a network error', async () => {
      vi.useFakeTimers();
      const fetchAddressComplianceCheck = vi
        .fn<() => Promise<LeatherApiAddressComplianceCheck>>()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(makeCheckResponse('compliant', []));
      const service = makeService(fetchAddressComplianceCheck);

      const resultPromise = service.checkAddressCompliance(testAddress);
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchAddressComplianceCheck).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(749);
      expect(fetchAddressComplianceCheck).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(await resultPromise).toEqual({ status: 'compliant' });
      expect(fetchAddressComplianceCheck).toHaveBeenCalledTimes(2);
    });

    it('retries a network error only once', async () => {
      vi.useFakeTimers();
      const fetchAddressComplianceCheck = vi
        .fn<() => Promise<LeatherApiAddressComplianceCheck>>()
        .mockRejectedValue(new TypeError('Failed to fetch'));
      const service = makeService(fetchAddressComplianceCheck);

      const resultPromise = service.checkAddressCompliance(testAddress);
      await vi.runAllTimersAsync();

      expect(await resultPromise).toEqual({
        status: 'unavailable',
        reason: 'leather_api_network_error',
      });
      expect(fetchAddressComplianceCheck).toHaveBeenCalledTimes(2);
    });

    it.each([
      [
        'an http error',
        new LeatherApiError(
          'https://api.leather.io/v1/compliance/addresses/bc1qtest',
          500,
          'Internal Server Error'
        ),
      ],
      ['an unrecognized error', new Error('Rate limited call undefined')],
      ['a rate limiter timeout', Object.assign(new Error('Timed out'), { name: 'TimeoutError' })],
    ])('does not retry %s', async (_, error) => {
      const fetchAddressComplianceCheck = vi
        .fn<() => Promise<LeatherApiAddressComplianceCheck>>()
        .mockRejectedValue(error);
      const service = makeService(fetchAddressComplianceCheck);

      await service.checkAddressCompliance(testAddress);

      expect(fetchAddressComplianceCheck).toHaveBeenCalledTimes(1);
    });

    it('returns unavailable with leather_api_timeout when the rate limiter queue times out', async () => {
      const timeoutError = new Error('Promise timed out after 30000 milliseconds');
      timeoutError.name = 'TimeoutError';
      const service = makeService(() => Promise.reject(timeoutError));

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'unavailable', reason: 'leather_api_timeout' });
    });

    it('does not retry a network error when the caller aborted the request', async () => {
      const abortController = new AbortController();
      const networkError = new TypeError('Failed to fetch');
      const fetchAddressComplianceCheck = vi
        .fn<() => Promise<LeatherApiAddressComplianceCheck>>()
        .mockImplementation(() => {
          abortController.abort();
          return Promise.reject(networkError);
        });
      const service = makeService(fetchAddressComplianceCheck);

      await expect(
        service.checkAddressCompliance(testAddress, abortController.signal)
      ).rejects.toBe(networkError);
      expect(fetchAddressComplianceCheck).toHaveBeenCalledTimes(1);
    });

    it('rethrows an AbortError when the caller aborts during the retry delay', async () => {
      vi.useFakeTimers();
      const abortController = new AbortController();
      const fetchAddressComplianceCheck = vi
        .fn<() => Promise<LeatherApiAddressComplianceCheck>>()
        .mockRejectedValue(new TypeError('Failed to fetch'));
      const service = makeService(fetchAddressComplianceCheck);

      const resultPromise = service.checkAddressCompliance(testAddress, abortController.signal);
      const assertion = expect(resultPromise).rejects.toMatchObject({ name: 'AbortError' });
      await vi.advanceTimersByTimeAsync(100);
      abortController.abort();
      await vi.runAllTimersAsync();

      await assertion;
      expect(fetchAddressComplianceCheck).toHaveBeenCalledTimes(1);
    });

    it('returns unavailable with unknown_error for unrecognized errors', async () => {
      const service = makeService(() => Promise.reject(new Error('Rate limited call undefined')));

      const result = await service.checkAddressCompliance(testAddress);

      expect(result).toEqual({ status: 'unavailable', reason: 'leather_api_unknown_error' });
    });

    it('rethrows instead of returning unavailable when the caller aborted the request', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      const service = makeService(() => Promise.reject(abortError));
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        service.checkAddressCompliance(testAddress, abortController.signal)
      ).rejects.toBe(abortError);
    });
  });
});
