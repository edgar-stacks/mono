import BigNumber from 'bignumber.js';

import { SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET, STX_DECIMALS } from '@leather.io/constants';
import {
  FeeTypes,
  type Money,
  type StacksTransactionFeeQuote,
  type StacksTransactionFees,
  type TransactionFeeTier,
} from '@leather.io/models';
import { LeatherApiError, getErrorDetail } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

export const sbtcFeeCurrency = 'sBTC';

const sbtcContractIds = [SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET].map(
  assetId => assetId.split('::')[0]
);

export function isSbtcContractId(contractId: string) {
  return sbtcContractIds.includes(contractId);
}

interface SbtcSponsorshipRate {
  satsPerStx: string;
  minFeeSats: number;
  maxFeeSats: number;
}

interface ConvertStxFeeToSbtcFeeArgs extends SbtcSponsorshipRate {
  stxFeeMicro: BigNumber.Value;
}

export function convertStxFeeToSbtcFee({
  stxFeeMicro,
  satsPerStx,
  minFeeSats,
  maxFeeSats,
}: ConvertStxFeeToSbtcFeeArgs) {
  const sats = new BigNumber(stxFeeMicro)
    .shiftedBy(-STX_DECIMALS)
    .multipliedBy(satsPerStx)
    .integerValue(BigNumber.ROUND_CEIL);
  return BigNumber.min(BigNumber.max(sats, minFeeSats), maxFeeSats);
}

const feeTiersByFeeType: Record<string, TransactionFeeTier> = {
  [FeeTypes[FeeTypes.Low]]: 'low',
  [FeeTypes[FeeTypes.Middle]]: 'standard',
  [FeeTypes[FeeTypes.High]]: 'high',
};

export function getSbtcSponsorshipFeeTier(feeType: string | undefined): TransactionFeeTier {
  return (feeType && feeTiersByFeeType[feeType]) || 'standard';
}

function toSbtcFeeQuote(
  quote: StacksTransactionFeeQuote,
  rate: SbtcSponsorshipRate,
  decimals: number
): StacksTransactionFeeQuote {
  const sats = convertStxFeeToSbtcFee({ ...rate, stxFeeMicro: quote.value.amount });
  return { ...quote, value: createMoney(sats, sbtcFeeCurrency, decimals) };
}

export function createSbtcSponsoredFees(
  stxFees: StacksTransactionFees,
  rate: SbtcSponsorshipRate,
  decimals: number
): StacksTransactionFees {
  return {
    ...stxFees,
    options: {
      low: toSbtcFeeQuote(stxFees.options.low, rate, decimals),
      standard: toSbtcFeeQuote(stxFees.options.standard, rate, decimals),
      high: toSbtcFeeQuote(stxFees.options.high, rate, decimals),
    },
  };
}

export function getSbtcSponsoredBalanceLessFee(
  balance: Money,
  sbtcFees: StacksTransactionFees | undefined,
  feeType: string | undefined
) {
  const fee = sbtcFees?.options[getSbtcSponsorshipFeeTier(feeType)].value.amount ?? 0;
  const remaining = BigNumber.max(balance.amount.minus(fee), 0);
  return createMoney(remaining, balance.symbol, balance.decimals);
}

export function isSbtcSponsorshipQuoteExpired(expiresAt: string, now = Date.now()) {
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresAtMs) || expiresAtMs <= now;
}

const requoteErrorCodes = ['quote_expired', 'stale_nonce'];

function getSbtcSponsorshipErrorCode(error: unknown) {
  if (!LeatherApiError.isLeatherApiError(error)) return undefined;
  return error.data?.code;
}

export function isSbtcSponsorshipRequoteError(error: unknown) {
  const code = getSbtcSponsorshipErrorCode(error);
  return code !== undefined && requoteErrorCodes.includes(code);
}

const errorMessagesByCode: Record<string, string> = {
  quote_expired: 'The sBTC fee quote expired. Review the updated fee and confirm again.',
  stale_nonce: 'The account nonce changed. Review the updated transaction and confirm again.',
  broadcast_failed:
    "The sponsor couldn't broadcast the transaction. Your sBTC hasn't moved. Try again in a moment.",
  upstream_unavailable:
    "The sponsor couldn't reach the Stacks network. Your sBTC hasn't moved. Try again in a moment.",
  rate_limited: 'Too many requests. Wait a moment and try again.',
};

const notEligibleReasonMessages: Record<string, string> = {
  insufficient_sbtc: 'Your sBTC balance no longer covers the amount plus the fee.',
  bad_transfer_entry: 'The amount must be positive and the recipient cannot be your own address.',
  fee_too_low: 'The quoted fee is out of date. Review the updated fee and confirm again.',
  fee_too_high: 'The quoted fee is out of date. Review the updated fee and confirm again.',
  float_low: 'The sponsor is temporarily out of STX. Pay the fee in STX or try again later.',
};

const notEligibleMessage = "This transfer isn't eligible for sBTC fee payment";

function getNotEligibleMessage(reason: string | undefined) {
  if (!reason) return notEligibleMessage;
  const reasonMessage = notEligibleReasonMessages[reason];
  if (reasonMessage) return `${notEligibleMessage}. ${reasonMessage}`;
  return `${notEligibleMessage} (${reason})`;
}

export function getSbtcSponsorshipErrorMessage(error: unknown) {
  const code = getSbtcSponsorshipErrorCode(error);
  if (code === 'not_eligible' && LeatherApiError.isLeatherApiError(error))
    return getNotEligibleMessage(error.data?.reason);
  const codeMessage = code ? errorMessagesByCode[code] : undefined;
  return codeMessage ?? getErrorDetail(error) ?? 'Something went wrong';
}
