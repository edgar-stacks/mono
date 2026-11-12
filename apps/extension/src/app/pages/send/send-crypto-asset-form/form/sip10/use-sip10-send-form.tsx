import { useMemo } from 'react';

import { type FormikHelpers } from 'formik';
import { z } from 'zod';

import type { CryptoAssetBalance, Sip10Asset } from '@leather.io/models';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { type StacksSendFormValues } from '@shared/models/form.model';

import { getSafeImageCanonicalUri } from '@app/common/stacks-utils';
import { createFormikValidationSchema } from '@app/common/validation/formik-validation-schema';
import { stacksFungibleTokenAmountValidator } from '@app/common/validation/forms/amount-validators';
import {
  getSbtcSponsoredBalanceLessFee,
  getSbtcSponsorshipErrorMessage,
  getSbtcSponsorshipFeeTier,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { useBuildSbtcSponsoredTransfer } from '@app/features/sbtc-sponsorship/use-build-sbtc-sponsored-transfer';
import { useSbtcFeeSponsorship } from '@app/features/sbtc-sponsorship/use-sbtc-fee-sponsorship';
import { useToast } from '@app/features/toasts/use-toast';
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

const feeTypeFormValueSchema = z.object({ feeType: z.string().optional() });

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

  const sponsorship = useSbtcFeeSponsorship({ asset: info, balance, stxFees: stacksFtFees });
  const buildSbtcSponsoredTransfer = useBuildSbtcSponsoredTransfer();
  const toast = useToast();
  const { data: nextNonce } = useNextNonce(useCurrentStacksAccountAddress());

  const availableTokenBalance = balance.availableBalance;
  const sendMaxBalance = useMemo(
    () => convertAmountToBaseUnit(availableTokenBalance),
    [availableTokenBalance]
  );

  const { initialValues, checkFormValidation, recipient, memo, nonce } = useStacksCommonSendForm({
    symbol: info.symbol,
    availableTokenBalance,
  });

  async function previewSbtcSponsoredTransaction(values: StacksSendFormValues) {
    const tier = getSbtcSponsorshipFeeTier(values.feeType);
    const stxFeeMicro = stacksFtFees?.options[tier].value.amount.toString(10);
    if (!stxFeeMicro) return toast.error('The STX fee estimate is not available yet. Try again.');
    const { quote } = sponsorship;
    if (!quote) return toast.error('The sBTC fee quote is not available yet. Try again.');
    const nonce =
      values.nonce === undefined || values.nonce === '' ? nextNonce?.nonce : values.nonce;
    if (nonce === undefined)
      return toast.error('The account nonce is not available yet. Try again.');
    const formValues = {
      amount: values.amount,
      recipient: values.recipient,
      memo: values.memo,
      feeType: values.feeType,
    };
    try {
      const tx = await buildSbtcSponsoredTransfer({
        assetId: info.assetId,
        decimals: info.decimals,
        formValues,
        quote,
        stxFeeMicro,
        nonce,
      });
      void sendFormNavigate.toConfirmSbtcSponsoredTransfer({
        decimals: info.decimals,
        name: info.name,
        tx,
        sponsorship: {
          quoteId: quote.quoteId,
          stxFeeMicro,
          expiresAt: quote.expiresAt,
          assetId: info.assetId,
          formValues,
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
    symbol: info.symbol,
    decimals: info.decimals,
    avatar: createFtAvatar(),
    sponsorship,
    validationSchema: createFormikValidationSchema(values =>
      z.object({
        amount: stacksFungibleTokenAmountValidator(
          sponsorship.isSponsored
            ? getSbtcSponsoredBalanceLessFee(
                availableTokenBalance,
                sponsorship.sbtcFees,
                feeTypeFormValueSchema.safeParse(values).data?.feeType
              )
            : availableTokenBalance
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

      if (sponsorship.isSponsored) return previewSbtcSponsoredTransaction(values);

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
