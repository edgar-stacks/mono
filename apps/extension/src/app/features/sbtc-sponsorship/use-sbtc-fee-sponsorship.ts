import { useMemo } from 'react';

import type { CryptoAssetBalance, Sip10Asset, StacksTransactionFees } from '@leather.io/models';

import { useStxAccountBalanceByAddresses } from '@app/query/stacks/balance/stx-balance.hooks';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import { createSbtcSponsoredFees, isSbtcContractId } from './sbtc-sponsorship.utils';
import { useSbtcSponsorshipQuote } from './use-sbtc-sponsorship-quote';

interface UseSbtcFeeSponsorshipArgs {
  asset: Sip10Asset;
  balance: CryptoAssetBalance;
  stxFees?: StacksTransactionFees;
}

export function useSbtcFeeSponsorship({ asset, balance, stxFees }: UseSbtcFeeSponsorshipArgs) {
  const policy = useCurrentPolicy();
  const stxBalance = useStxAccountBalanceByAddresses(useCurrentAccountAddresses());

  const unlockedStx =
    stxBalance.state === 'success' ? stxBalance.value.stx.availableUnlockedBalance : undefined;

  const isSponsored =
    isSbtcContractId(asset.contractId) &&
    policy?.chain !== 'stacks' &&
    balance.availableBalance.amount.isGreaterThan(0) &&
    !!stxFees &&
    !!unlockedStx &&
    unlockedStx.amount.isLessThan(stxFees.options.low.value.amount);

  const { data: quote } = useSbtcSponsorshipQuote(isSponsored);

  const sbtcFees = useMemo(
    () =>
      isSponsored && quote && stxFees
        ? createSbtcSponsoredFees(stxFees, quote, asset.decimals)
        : undefined,
    [asset.decimals, isSponsored, quote, stxFees]
  );

  return { isSponsored, quote, sbtcFees };
}
