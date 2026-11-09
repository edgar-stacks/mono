import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountAddresses } from '@leather.io/models';

import type { HiroStacksApiClient } from '../../../infrastructure/api/hiro/hiro-stacks-api.client';
import type { HiroPrincipalNftBalance } from '../../../infrastructure/api/hiro/hiro-stacks-api.types';
import type { SettingsService } from '../../../infrastructure/settings/settings.service';
import { createTestUserSettings } from '../../../test/balances-settings';
import { createMock } from '../../../test/create-mock';
import type { StackingDaoLstService } from './stacking-dao-lst.service';
import { StackingDaoStStxService } from './stacking-dao-ststx.service';
import { ststxWithdrawNftIdentifier } from './stacking-dao.constants';

describe(StackingDaoStStxService.name, () => {
  const withdrawalNfts: HiroPrincipalNftBalance[] = [
    {
      asset_identifier: ststxWithdrawNftIdentifier,
      value: { hex: '0x0100000000000000000000000000000001', repr: 'u1' },
    },
  ];

  const getAddressFtBalances = vi
    .fn()
    .mockResolvedValue({ limit: 0, offset: 0, total: 0, results: [] });
  const getPrincipalNftBalances = vi.fn().mockResolvedValue(withdrawalNfts);
  const hiroStacksApiClient = createMock<HiroStacksApiClient>({
    getAddressFtBalances,
    getPrincipalNftBalances,
  });

  const getLstHolding = vi.fn().mockResolvedValue(undefined);
  const getLstWithdrawals = vi.fn().mockResolvedValue([]);
  const stackingDaoLstService = createMock<StackingDaoLstService>({
    getLstHolding,
    getLstWithdrawals,
  });

  const settingsService: SettingsService = { getSettings: () => createTestUserSettings() };

  const service = new StackingDaoStStxService(
    hiroStacksApiClient,
    stackingDaoLstService,
    settingsService
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccountPositions', () => {
    it('requests only the withdrawal NFTs, at most five pages', async () => {
      const signal = new AbortController().signal;
      const account: AccountAddresses = {
        id: { fingerprint: 'fp1', accountIndex: 0 },
        stacks: { stxAddress: 'SP123' },
      };

      await service.getAccountPositions(account, signal);

      expect(getPrincipalNftBalances).toHaveBeenCalledWith(
        'SP123',
        { assetIdentifier: ststxWithdrawNftIdentifier, maxPages: 5 },
        { signal }
      );
      expect(getLstWithdrawals).toHaveBeenCalledWith('ststx', withdrawalNfts, signal);
    });

    it('makes no request without a Stacks address', async () => {
      const account: AccountAddresses = { id: { fingerprint: 'fp1', accountIndex: 0 } };

      const positions = await service.getAccountPositions(account);

      expect(positions).toEqual([]);
      expect(getPrincipalNftBalances).not.toHaveBeenCalled();
    });
  });
});
