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
  convertStxFeeToSbtcFee,
  getBalanceAfterSbtcFee,
  getSbtcSponsorshipFeeTier,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { useGenerateSbtcSponsoredTransferUnsignedTx } from '@app/features/sbtc-sponsorship/use-generate-sbtc-sponsored-transfer';
import { useSbtcSponsorshipFees } from '@app/features/sbtc-sponsorship/use-sbtc-sponsorship-fees';
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

const feeFormValueSchema = z.object({ fee: z.union([z.string(), z.number()]).optional() });

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

  const generateSponsoredTx = useGenerateSbtcSponsoredTransferUnsignedTx();
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);
  const sponsorship = useSbtcSponsorshipFees({ asset: info, stxFees: stacksFtFees });

  const availableTokenBalance = balance.availableBalance;
  const sendMaxBalance = useMemo(
    () => convertAmountToBaseUnit(availableTokenBalance),
    [availableTokenBalance]
  );

  function getFees() {
    if (sponsorship.isResolving) return undefined;
    return sponsorship.sbtcFees ?? stacksFtFees;
  }

  const { initialValues, checkFormValidation, recipient, memo, nonce } = useStacksCommonSendForm({
    symbol: info.symbol,
    availableTokenBalance,
  });

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
    stacksFtFees: getFees(),
    isSbtcFeeSponsored: !!sponsorship.sbtcFees,
    symbol: info.symbol,
    decimals: info.decimals,
    avatar: createFtAvatar(),
    validationSchema: createFormikValidationSchema(values =>
      z.object({
        amount: stacksFungibleTokenAmountValidator(
          sponsorship.sbtcFees
            ? getBalanceAfterSbtcFee(
                availableTokenBalance,
                feeFormValueSchema.safeParse(values).data?.fee
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

      if (sponsorship.quote && stacksFtFees) {
        const { quote } = sponsorship;
        const stxFeeMicro =
          stacksFtFees.options[getSbtcSponsorshipFeeTier(values.feeType)].value.amount;
        const txNonce = values.nonce ?? nextNonce?.nonce;
        if (txNonce === undefined || txNonce === '')
          return logger.error('Attempted to generate sponsored tx without a nonce');

        const sponsoredTx = await generateSponsoredTx({
          assetId: info.assetId,
          decimals: info.decimals,
          values,
          feeRecipient: quote.feeRecipientPrincipal,
          sbtcFee: convertStxFeeToSbtcFee(stxFeeMicro, quote),
          stxFeeMicro,
          nonce: txNonce,
        });
        if (!sponsoredTx) return logger.error('Unable to generate the sponsored sBTC transfer');

        return void sendFormNavigate.toConfirmAndSignStacksSip10Transaction({
          decimals: info.decimals,
          name: info.name,
          tx: sponsoredTx,
          sponsorship: {
            quoteId: quote.quoteId,
            stxFeeMicro: stxFeeMicro.toString(10),
            expiresAt: quote.expiresAt,
            assetId: info.assetId,
            formValues: {
              amount: values.amount,
              recipient: values.recipient,
              memo: values.memo,
            },
          },
        });
      }

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
