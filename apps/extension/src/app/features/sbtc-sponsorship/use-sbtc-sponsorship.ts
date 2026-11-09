import { useMemo } from 'react';

import type { Sip10Asset, StacksTransactionFees } from '@leather.io/models';
import type { SbtcSponsorshipQuoteRequest } from '@leather.io/services';

import { useWalletType } from '@app/common/use-wallet-type';
import { useSbtcSponsorshipQuoteQuery } from '@app/query/sbtc/sbtc-sponsorship.query';
import { useStxAddressBalance } from '@app/query/stacks/balance/stx-balance.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import {
  convertStxFeesToSbtcFees,
  hasInsufficientStxForFees,
  isSbtcContractId,
} from './sbtc-sponsorship.utils';

export function useSbtcSponsorshipNetwork(): SbtcSponsorshipQuoteRequest['network'] {
  const network = useCurrentNetwork();
  return network.chain.bitcoin.mode === 'mainnet' ? 'mainnet' : 'testnet';
}

interface UseSbtcSponsorshipArgs {
  asset: Sip10Asset;
  stxFees?: StacksTransactionFees;
}
export function useSbtcSponsorship({ asset, stxFees }: UseSbtcSponsorshipArgs) {
  const { walletType } = useWalletType();
  const policy = useCurrentPolicy();
  const stxAddress = useCurrentStacksAccountAddress();
  const stxBalance = useStxAddressBalance(stxAddress);
  const { data: nextNonce } = useNextNonce(stxAddress);
  const network = useSbtcSponsorshipNetwork();

  const canUseSponsorship =
    isSbtcContractId(asset.contractId) && walletType === 'software' && policy?.chain !== 'stacks';
  const isCheckingBalance = canUseSponsorship && (stxBalance.state === 'loading' || !stxFees);

  const isEligible =
    canUseSponsorship &&
    stxBalance.state === 'success' &&
    !!stxFees &&
    hasInsufficientStxForFees(stxBalance.value.stx.availableUnlockedBalance, stxFees);

  const nonce = nextNonce?.nonce;
  const quoteQuery = useSbtcSponsorshipQuoteQuery(
    { network, sender: stxAddress, nonce: nonce ?? 0 },
    isEligible && nonce !== undefined
  );
  const quote = quoteQuery.data;

  const sbtcFees = useMemo(
    () => (isEligible && quote && stxFees ? convertStxFeesToSbtcFees(stxFees, quote) : undefined),
    [isEligible, quote, stxFees]
  );

  return {
    isSponsored: isEligible && !!quote,
    isLoading: isCheckingBalance || (isEligible && !quoteQuery.isError && !quote),
    quote,
    sbtcFees,
  };
}
