import { useMemo } from 'react';

import { type FormikHelpers } from 'formik';
import { z } from 'zod';

import type { CryptoAssetBalance, Sip10Asset } from '@leather.io/models';
import { convertAmountToBaseUnit, isNumber, isString } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { type StacksSendFormValues } from '@shared/models/form.model';

import { getSafeImageCanonicalUri } from '@app/common/stacks-utils';
import { createFormikValidationSchema } from '@app/common/validation/formik-validation-schema';
import { stacksFungibleTokenAmountValidator } from '@app/common/validation/forms/amount-validators';
import {
  getSbtcSponsorshipErrorMessage,
  getSbtcSponsorshipFeeTier,
  getSbtcSponsorshipFees,
  isSbtcSponsorshipEligible,
  subtractSbtcSponsorshipFee,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import {
  useFetchSbtcSponsorshipQuote,
  useGenerateSbtcSponsoredTransferUnsignedTx,
  useSbtcSponsorshipQuote,
} from '@app/features/sbtc-sponsorship/use-sbtc-sponsorship';
import { useToast } from '@app/features/toasts/use-toast';
import { useStxAddressBalance } from '@app/query/stacks/balance/stx-balance.hooks';
import { useStacksTransactionFees } from '@app/query/stacks/fees/stacks-transaction-fees.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';
import {
  useFtTokenTransferUnsignedTx,
  useGenerateFtTokenTransferUnsignedTx,
} from '@app/store/transactions/token-transfer.hooks';

import { useStacksCommonSendForm } from '../../family/stacks/use-stacks-common-send-form';
import { useSendFormNavigate } from '../../hooks/use-send-form-navigate';

function getFeeTypeFromFormValues(values: unknown) {
  if (typeof values !== 'object' || values === null || !('feeType' in values)) return undefined;
  return isString(values.feeType) ? values.feeType : undefined;
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

  const availableTokenBalance = balance.availableBalance;
  const sendMaxBalance = useMemo(
    () => convertAmountToBaseUnit(availableTokenBalance),
    [availableTokenBalance]
  );

  const { initialValues, checkFormValidation, recipient, memo, nonce } = useStacksCommonSendForm({
    symbol: info.symbol,
    availableTokenBalance,
  });

  const toast = useToast();
  const stxAddress = useCurrentStacksAccountAddress();
  const stxBalance = useStxAddressBalance(stxAddress);
  const nextNonce = useNextNonce(stxAddress);
  const isSbtcSponsored = isSbtcSponsorshipEligible({
    contractId: info.contractId,
    isStacksPolicy: policy?.chain === 'stacks',
    sbtcBalance: availableTokenBalance,
    availableStxBalance: stxBalance.value?.stx.availableUnlockedBalance,
    stxFees: stacksFtFees,
  });
  const { data: sbtcSponsorshipQuote } = useSbtcSponsorshipQuote(isSbtcSponsored);
  const fetchSbtcSponsorshipQuote = useFetchSbtcSponsorshipQuote();
  const generateSbtcSponsoredTx = useGenerateSbtcSponsoredTransferUnsignedTx();
  const sbtcSponsorshipFees =
    isSbtcSponsored && stacksFtFees && sbtcSponsorshipQuote
      ? getSbtcSponsorshipFees(stacksFtFees, sbtcSponsorshipQuote, availableTokenBalance)
      : undefined;

  function getSendableTokenBalance(values: unknown) {
    if (!sbtcSponsorshipFees) return availableTokenBalance;
    const fee = sbtcSponsorshipFees[getSbtcSponsorshipFeeTier(getFeeTypeFromFormValues(values))];
    return subtractSbtcSponsorshipFee(availableTokenBalance, fee);
  }

  async function resolveNonce(values: StacksSendFormValues) {
    if (values.nonce) return Number(values.nonce);
    if (isNumber(nextNonce.data?.nonce)) return nextNonce.data.nonce;
    const { data } = await nextNonce.refetch();
    if (!isNumber(data?.nonce)) throw new Error('Unable to determine the account nonce');
    return data.nonce;
  }

  async function previewSbtcSponsoredTransaction(values: StacksSendFormValues) {
    if (!stacksFtFees) {
      toast.error('The STX fee estimate is not available yet. Try again.');
      return;
    }
    try {
      const quote = await fetchSbtcSponsorshipQuote();
      const stxFeeMicro =
        stacksFtFees.options[getSbtcSponsorshipFeeTier(values.feeType)].value.amount.toString(10);
      const sponsoredValues = {
        amount: values.amount,
        recipient: values.recipient,
        memo: values.memo,
      };
      const tx = await generateSbtcSponsoredTx({
        assetId: info.assetId,
        decimals: info.decimals,
        values: sponsoredValues,
        nonce: await resolveNonce(values),
        quote,
        stxFeeMicro,
      });
      if (!tx) return logger.error('Attempted to generate unsigned tx, but tx is undefined');

      void sendFormNavigate.toConfirmSbtcSponsoredTransaction({
        decimals: info.decimals,
        name: info.name,
        tx,
        sbtcSponsorship: {
          quoteId: quote.quoteId,
          stxFeeMicro,
          expiresAt: quote.expiresAt,
          assetId: info.assetId,
          values: sponsoredValues,
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
    stacksFtFees,
    sbtcSponsorship: isSbtcSponsored ? { fees: sbtcSponsorshipFees } : undefined,
    symbol: info.symbol,
    decimals: info.decimals,
    avatar: createFtAvatar(),
    validationSchema: createFormikValidationSchema(values =>
      z.object({
        amount: stacksFungibleTokenAmountValidator(getSendableTokenBalance(values)),
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

      if (isSbtcSponsored) return previewSbtcSponsoredTransaction(values);

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
