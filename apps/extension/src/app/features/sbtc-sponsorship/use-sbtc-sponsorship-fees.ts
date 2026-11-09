import { useMemo } from 'react';

import type { Sip10Asset, StacksTransactionFees } from '@leather.io/models';

import { useWalletType } from '@app/common/use-wallet-type';
import { useSbtcSponsorshipQuote } from '@app/query/sbtc/sbtc-sponsorship.query';
import { useStxAccountBalanceByAddresses } from '@app/query/stacks/balance/stx-balance.hooks';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import {
  createSbtcSponsorshipFees,
  isSbtcContractId,
  isStxBalanceBelowLowestFee,
} from './sbtc-sponsorship.utils';

interface UseSbtcSponsorshipFeesArgs {
  asset: Sip10Asset;
  stxFees?: StacksTransactionFees;
}
export function useSbtcSponsorshipFees({ asset, stxFees }: UseSbtcSponsorshipFeesArgs) {
  const policy = useCurrentPolicy();
  const { walletType } = useWalletType();
  const stxBalance = useStxAccountBalanceByAddresses(useCurrentAccountAddresses());

  const canBeSponsored =
    isSbtcContractId(asset.contractId) && walletType === 'software' && policy?.chain !== 'stacks';
  const isLoadingStxBalance = stxBalance.state === 'loading';
  const isEligible =
    canBeSponsored &&
    stxBalance.state === 'success' &&
    !!stxFees &&
    isStxBalanceBelowLowestFee(stxBalance.value.stx.availableUnlockedBalance, stxFees);

  const { data: quote, isLoading: isLoadingQuote } = useSbtcSponsorshipQuote(isEligible);
  const sponsorshipQuote = isEligible ? quote : undefined;

  const sbtcFees = useMemo(
    () =>
      stxFees && sponsorshipQuote
        ? createSbtcSponsorshipFees(stxFees, sponsorshipQuote, asset.decimals)
        : undefined,
    [asset.decimals, sponsorshipQuote, stxFees]
  );

  return {
    isResolving: canBeSponsored && (isLoadingStxBalance || (isEligible && isLoadingQuote)),
    quote: sponsorshipQuote,
    sbtcFees,
  };
}
