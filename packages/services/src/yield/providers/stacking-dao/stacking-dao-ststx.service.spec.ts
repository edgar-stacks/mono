import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountAddresses } from '@leather.io/models';

import type { HiroStacksApiClient } from '../../../infrastructure/api/hiro/hiro-stacks-api.client';
import type {
  HiroAddressFtBalancesResponse,
  HiroPrincipalNftBalance,
} from '../../../infrastructure/api/hiro/hiro-stacks-api.types';
import type { SettingsService } from '../../../infrastructure/settings/settings.service';
import { createTestUserSettings } from '../../../test/balances-settings';
import { createMock } from '../../../test/create-mock';
import type { StackingDaoLstService } from './stacking-dao-lst.service';
import { StackingDaoStStxService } from './stacking-dao-ststx.service';
import { ststxWithdrawNftIdentifier } from './stacking-dao.constants';

describe(StackingDaoStStxService.name, () => {
  const stxAddress = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';
  const ftBalances: HiroAddressFtBalancesResponse = { limit: 0, offset: 0, total: 0, results: [] };
  const withdrawalNfts: HiroPrincipalNftBalance[] = [
    { asset_identifier: ststxWithdrawNftIdentifier, value: { hex: '0x0101', repr: 'u1' } },
  ];

  const getAddressFtBalances = vi.fn();
  const getPrincipalNftBalances = vi.fn();
  const getLstHolding = vi.fn();
  const getLstWithdrawals = vi.fn();

  const service = new StackingDaoStStxService(
    createMock<HiroStacksApiClient>({ getAddressFtBalances, getPrincipalNftBalances }),
    createMock<StackingDaoLstService>({ getLstHolding, getLstWithdrawals }),
    createMock<SettingsService>({ getSettings: () => createTestUserSettings() })
  );

  beforeEach(() => {
    vi.clearAllMocks();
    getAddressFtBalances.mockResolvedValue(ftBalances);
    getPrincipalNftBalances.mockResolvedValue(withdrawalNfts);
    getLstHolding.mockResolvedValue(undefined);
    getLstWithdrawals.mockResolvedValue([]);
  });

  it('requests only the ststx withdrawal NFTs, up to five pages', async () => {
    const signal = new AbortController().signal;
    const account: AccountAddresses = {
      id: { fingerprint: 'fp1', accountIndex: 0 },
      stacks: { stxAddress },
    };

    await service.getAccountPositions(account, signal);

    expect(getPrincipalNftBalances).toHaveBeenCalledWith(
      stxAddress,
      { assetIdentifier: ststxWithdrawNftIdentifier, maxPages: 5 },
      { signal }
    );
    expect(getLstWithdrawals).toHaveBeenCalledWith('ststx', withdrawalNfts, signal);
  });

  it('does not request NFT balances without a Stacks address', async () => {
    const account: AccountAddresses = { id: { fingerprint: 'fp1', accountIndex: 0 } };

    const positions = await service.getAccountPositions(account);

    expect(positions).toEqual([]);
    expect(getPrincipalNftBalances).not.toHaveBeenCalled();
  });
});
