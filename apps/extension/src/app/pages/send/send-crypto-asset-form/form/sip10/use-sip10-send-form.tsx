import { useMemo } from 'react';

import { type FormikHelpers, getIn } from 'formik';
import { z } from 'zod';

import type { CryptoAssetBalance, Sip10Asset } from '@leather.io/models';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { type StacksSendFormValues } from '@shared/models/form.model';

import { getSafeImageCanonicalUri } from '@app/common/stacks-utils';
import { createFormikValidationSchema } from '@app/common/validation/formik-validation-schema';
import { stacksFungibleTokenAmountValidator } from '@app/common/validation/forms/amount-validators';
import {
  convertStxFeeToSbtcFeeSats,
  getStxFeeMicroForFeeType,
  parseFeeFormValue,
  sbtcFeeCurrency,
  subtractFeeFromBalance,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { useGenerateSbtcSponsoredTransferUnsignedTx } from '@app/features/sbtc-sponsorship/use-generate-sbtc-sponsored-transfer';
import { useSbtcSponsorship } from '@app/features/sbtc-sponsorship/use-sbtc-sponsorship';
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

  const sponsorship = useSbtcSponsorship({ asset: info, stxFees: stacksFtFees });
  const generateSponsoredTx = useGenerateSbtcSponsoredTransferUnsignedTx();
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);

  const availableTokenBalance = balance.availableBalance;
  const sendMaxBalance = useMemo(
    () => convertAmountToBaseUnit(availableTokenBalance),
    [availableTokenBalance]
  );

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

  function getAmountBalance(values: unknown) {
    if (!sponsorship.isSponsored) return availableTokenBalance;
    if (getIn(values, 'feeCurrency') !== sbtcFeeCurrency) return availableTokenBalance;
    const fee: unknown = getIn(values, 'fee');
    return subtractFeeFromBalance(
      availableTokenBalance,
      parseFeeFormValue(fee, availableTokenBalance.decimals)
    );
  }

  async function previewSponsoredTransaction(values: StacksSendFormValues) {
    const { quote } = sponsorship;
    if (!quote || !stacksFtFees) return;
    const stxFeeMicro = getStxFeeMicroForFeeType(stacksFtFees, values.feeType);
    const formValues = {
      amount: String(values.amount),
      recipient: values.recipient,
      memo: values.memo || undefined,
      feeType: values.feeType,
    };
    const tx = await generateSponsoredTx({
      assetId: info.assetId,
      values: formValues,
      feeRecipient: quote.feeRecipientPrincipal,
      feeSats: convertStxFeeToSbtcFeeSats({ stxFeeMicro, quote }),
      nonce: values.nonce ?? nextNonce?.nonce ?? 0,
    });
    if (!tx) return logger.error('Attempted to generate sponsored tx, but tx is undefined');

    void sendFormNavigate.toConfirmAndSignStacksSip10Transaction({
      decimals: info.decimals,
      name: info.name,
      tx,
      sponsorship: {
        quoteId: quote.quoteId,
        stxFeeMicro: stxFeeMicro.toString(10),
        expiresAt: quote.expiresAt,
        assetId: info.assetId,
        formValues,
      },
    });
  }

  return {
    availableTokenBalance,
    initialValues,
    sendMaxBalance,
    stacksFtFees: sponsorship.isLoading ? undefined : (sponsorship.sbtcFees ?? stacksFtFees),
    isSponsored: sponsorship.isSponsored,
    symbol: info.symbol,
    decimals: info.decimals,
    avatar: createFtAvatar(),
    validationSchema: createFormikValidationSchema(values =>
      z.object({
        amount: stacksFungibleTokenAmountValidator(getAmountBalance(values)),
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

      if (sponsorship.isSponsored && values.feeCurrency === sbtcFeeCurrency) {
        return previewSponsoredTransaction(values);
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
