import { useMemo } from 'react';

import BigNumber from 'bignumber.js';
import { type FormikHelpers } from 'formik';
import { z } from 'zod';

import type { CryptoAssetBalance, Money, Sip10Asset } from '@leather.io/models';
import { convertAmountToBaseUnit, createMoney } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { type StacksSendFormValues } from '@shared/models/form.model';

import { getSafeImageCanonicalUri } from '@app/common/stacks-utils';
import { createFormikValidationSchema } from '@app/common/validation/formik-validation-schema';
import { stacksFungibleTokenAmountValidator } from '@app/common/validation/forms/amount-validators';
import {
  type SbtcSponsorshipFees,
  getSbtcSponsorshipErrorMessage,
  getSbtcSponsorshipFeeTier,
  getSbtcSponsorshipFees,
  isEligibleForSbtcSponsorship,
  isSbtcContractId,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { useBuildSbtcSponsoredTransfer } from '@app/features/sbtc-sponsorship/use-build-sbtc-sponsored-transfer';
import { useToast } from '@app/features/toasts/use-toast';
import {
  useFetchSbtcSponsorshipQuote,
  useSbtcSponsorshipQuote,
} from '@app/query/sbtc/sbtc-sponsorship.hooks';
import { useStxAccountBalanceByAddresses } from '@app/query/stacks/balance/stx-balance.hooks';
import { useStacksTransactionFees } from '@app/query/stacks/fees/stacks-transaction-fees.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';
import {
  useFtTokenTransferUnsignedTx,
  useGenerateFtTokenTransferUnsignedTx,
} from '@app/store/transactions/token-transfer.hooks';

import { useStacksCommonSendForm } from '../../family/stacks/use-stacks-common-send-form';
import { useSendFormNavigate } from '../../hooks/use-send-form-navigate';

const feeTypeValuesSchema = z.object({ feeType: z.string() });

function subtractFeeFromBalance(balance: Money, fee: Money | undefined) {
  if (!fee) return balance;
  return createMoney(
    BigNumber.max(balance.amount.minus(fee.amount), 0),
    balance.symbol,
    balance.decimals
  );
}

function getSelectedSponsorshipFee(fees: SbtcSponsorshipFees | undefined, values: unknown) {
  if (!fees) return undefined;
  const feeType = feeTypeValuesSchema.safeParse(values).data?.feeType ?? '';
  return fees[getSbtcSponsorshipFeeTier(feeType)];
}

interface UseSip10SendFormArgs {
  balance: CryptoAssetBalance;
  info: Sip10Asset;
}
export function useSip10SendForm({ balance, info }: UseSip10SendFormArgs) {
  const generateTx = useGenerateFtTokenTransferUnsignedTx(info);
  const policy = useCurrentPolicy();

  const sendFormNavigate = useSendFormNavigate();

  const unsignedTx = useFtTokenTransferUnsignedTx(info);
  const { data: stacksFtFees } = useStacksTransactionFees(
    unsignedTx,
    policy?.chain === 'stacks' ? policy.publicKeys.length : undefined
  );

  const toast = useToast();
  const isStacksPolicy = policy?.chain === 'stacks';
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);
  const stxBalance = useStxAccountBalanceByAddresses(useCurrentAccountAddresses());
  const availableStxBalance = stxBalance.value?.stx.availableUnlockedBalance;
  const isSponsorshipCandidate = isSbtcContractId(info.contractId) && !isStacksPolicy;
  const isSponsored =
    isSponsorshipCandidate &&
    !!stacksFtFees &&
    !!availableStxBalance &&
    isEligibleForSbtcSponsorship({
      contractId: info.contractId,
      isStacksPolicy,
      sbtcBalance: balance.availableBalance,
      availableStxBalance,
      lowestStxFee: stacksFtFees.options.low.value,
    });
  const quote = useSbtcSponsorshipQuote(isSponsored);
  const fetchSbtcSponsorshipQuote = useFetchSbtcSponsorshipQuote();
  const buildSbtcSponsoredTransfer = useBuildSbtcSponsoredTransfer();
  const sponsoredFees =
    isSponsored && quote.data ? getSbtcSponsorshipFees(stacksFtFees, quote.data) : undefined;
  const isLoadingSponsorship =
    isSponsorshipCandidate && (stxBalance.state === 'loading' || (isSponsored && quote.isLoading));

  const availableTokenBalance = balance.availableBalance;
  const sendMaxBalance = useMemo(
    () => convertAmountToBaseUnit(availableTokenBalance),
    [availableTokenBalance]
  );

  const { initialValues, checkFormValidation, recipient, memo, nonce } = useStacksCommonSendForm({
    symbol: info.symbol,
    availableTokenBalance,
  });

  async function previewSponsoredTransaction(values: StacksSendFormValues) {
    const stxFee = stacksFtFees?.options[getSbtcSponsorshipFeeTier(values.feeType)].value;
    if (!stxFee) {
      toast.error('The STX fee estimate is not available yet. Try again.');
      return;
    }
    try {
      const sponsorshipNonce = values.nonce ? Number(values.nonce) : nextNonce?.nonce;
      if (sponsorshipNonce === undefined) throw new Error('The account nonce is not available yet');
      const freshQuote = await fetchSbtcSponsorshipQuote();
      const stxFeeMicro = stxFee.amount.toFixed();
      const sponsorshipValues = {
        amount: values.amount,
        recipient: values.recipient,
        memo: values.memo,
      };
      const { tx } = await buildSbtcSponsoredTransfer({
        assetId: info.assetId,
        decimals: info.decimals,
        values: sponsorshipValues,
        nonce: sponsorshipNonce,
        quote: freshQuote,
        stxFeeMicro,
      });
      void sendFormNavigate.toConfirmAndSignStacksSip10Transaction({
        decimals: info.decimals,
        name: info.name,
        tx,
        sponsorship: {
          quoteId: freshQuote.quoteId,
          stxFeeMicro,
          expiresAt: freshQuote.expiresAt,
          assetId: info.assetId,
          values: sponsorshipValues,
        },
      });
    } catch (error) {
      logger.error('Failed to build the sponsored sBTC transfer', error);
      toast.error(getSbtcSponsorshipErrorMessage(error));
    }
  }

  function createFtAvatar() {
    return {
      avatar: info.contractId,
      imageCanonicalUri: getSafeImageCanonicalUri(info.imageCanonicalUri, info.name),
    };
  }

  return {
    availableTokenBalance,
    initialValues,
    sendMaxBalance,
    stacksFtFees: isLoadingSponsorship ? undefined : stacksFtFees,
    sponsoredFees,
    symbol: info.symbol,
    decimals: info.decimals,
    avatar: createFtAvatar(),
    validationSchema: createFormikValidationSchema(values =>
      z.object({
        amount: stacksFungibleTokenAmountValidator(
          subtractFeeFromBalance(
            availableTokenBalance,
            getSelectedSponsorshipFee(sponsoredFees, values)
          )
        ),
        recipient,
        memo,
        nonce,
      })
    ),

    async previewTransaction(
      values: StacksSendFormValues,
      formikHelpers: FormikHelpers<StacksSendFormValues>
    ) {
      const isFormValid = await checkFormValidation(values, formikHelpers);
      if (!isFormValid) return;

      if (sponsoredFees) return previewSponsoredTransaction(values);

      const tx = await generateTx(values);
      if (!tx) return logger.error('Attempted to generate unsigned tx, but tx is undefined');

      void sendFormNavigate.toConfirmAndSignStacksSip10Transaction({
        decimals: info.decimals,
        name: info.name,
        tx,
      });
    },
  };
}
