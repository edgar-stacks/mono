import BigNumber from 'bignumber.js';

import { SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET, STX_DECIMALS } from '@leather.io/constants';
import { FeeTypes, type Money, type StacksTransactionFees } from '@leather.io/models';
import { LeatherApiError, type SbtcSponsorshipQuote } from '@leather.io/services';
import { createMoney, isNumber, isString } from '@leather.io/utils';

export const sbtcFeeCurrency = 'sBTC';
export const sbtcDecimals = 8;

export const sponsoredTransactionLocalBroadcastErrorMessage =
  'Sponsored transactions are submitted through the sponsor and cannot be broadcast by the wallet';

const sbtcContractIds = [SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET].map(
  assetId => assetId.split('::')[0]
);

export function isSbtcContractId(contractId: string) {
  return sbtcContractIds.includes(contractId);
}

type SbtcFeeTier = keyof StacksTransactionFees['options'];

const feeTypeToTier: Record<string, SbtcFeeTier> = {
  [FeeTypes[FeeTypes.Low]]: 'low',
  [FeeTypes[FeeTypes.Middle]]: 'standard',
  [FeeTypes[FeeTypes.High]]: 'high',
};

export function getSbtcFeeTier(feeType: string | undefined): SbtcFeeTier {
  if (!feeType) return 'standard';
  return feeTypeToTier[feeType] ?? 'standard';
}

export function getStxFeeMicroForFeeType(fees: StacksTransactionFees, feeType?: string) {
  return fees.options[getSbtcFeeTier(feeType)].value.amount;
}

type SbtcFeeQuote = Pick<SbtcSponsorshipQuote, 'satsPerStx' | 'minFeeSats' | 'maxFeeSats'>;

interface ConvertStxFeeToSbtcFeeSatsArgs {
  stxFeeMicro: BigNumber.Value;
  quote: SbtcFeeQuote;
}

export function convertStxFeeToSbtcFeeSats({ stxFeeMicro, quote }: ConvertStxFeeToSbtcFeeSatsArgs) {
  const stxFee = new BigNumber(stxFeeMicro).shiftedBy(-STX_DECIMALS);
  const feeSats = stxFee
    .multipliedBy(new BigNumber(quote.satsPerStx))
    .integerValue(BigNumber.ROUND_CEIL);
  const minFeeSats = new BigNumber(quote.minFeeSats);
  const maxFeeSats = new BigNumber(quote.maxFeeSats);
  return BigNumber.min(BigNumber.max(feeSats, minFeeSats), maxFeeSats);
}

function toSbtcFeeMoney(stxFee: Money, quote: SbtcFeeQuote): Money {
  return createMoney(
    convertStxFeeToSbtcFeeSats({ stxFeeMicro: stxFee.amount, quote }),
    sbtcFeeCurrency,
    sbtcDecimals
  );
}

export function convertStxFeesToSbtcFees(
  fees: StacksTransactionFees,
  quote: SbtcFeeQuote
): StacksTransactionFees {
  const { low, standard, high } = fees.options;
  return {
    ...fees,
    options: {
      low: { ...low, value: toSbtcFeeMoney(low.value, quote) },
      standard: { ...standard, value: toSbtcFeeMoney(standard.value, quote) },
      high: { ...high, value: toSbtcFeeMoney(high.value, quote) },
    },
  };
}

export function parseFeeFormValue(fee: unknown, decimals: number) {
  if (!isNumber(fee) && !isString(fee)) return new BigNumber(0);
  const value = new BigNumber(fee);
  if (value.isNaN() || value.isNegative()) return new BigNumber(0);
  return value.shiftedBy(decimals).integerValue(BigNumber.ROUND_CEIL);
}

export function subtractFeeFromBalance(balance: Money, feeBaseUnits: BigNumber): Money {
  const remaining = BigNumber.max(balance.amount.minus(feeBaseUnits), 0);
  return createMoney(remaining, balance.symbol, balance.decimals);
}

export function hasInsufficientStxForFees(stxBalance: Money, fees: StacksTransactionFees) {
  return stxBalance.amount.isLessThan(fees.options.low.value.amount);
}

export function isSbtcQuoteExpired(expiresAt: string, now = Date.now()) {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return true;
  return expiry <= now;
}

const requoteErrorCodes = ['quote_expired', 'stale_nonce'];

function getSponsorshipErrorCode(error: unknown) {
  if (!LeatherApiError.isLeatherApiError(error)) return undefined;
  return error.data?.code;
}

export function isSbtcRequoteError(error: unknown) {
  const code = getSponsorshipErrorCode(error);
  return !!code && requoteErrorCodes.includes(code);
}

const notEligibleReasonMessages: Record<string, string> = {
  insufficient_sbtc: 'Your sBTC balance cannot cover the amount plus the fee',
  bad_transfer_entry: 'The sponsor could not verify this transfer',
  fee_too_low: 'The sBTC fee is too low for the sponsor to pay the network fee',
  fee_too_high: 'The sBTC fee is higher than the sponsor allows',
  float_low: 'Sponsored sends are temporarily unavailable. Try again later',
};

const errorCodeMessages: Record<string, string> = {
  quote_expired: 'The fee quote expired. Review the updated fee and confirm again',
  not_eligible: 'This transaction is not eligible for sponsorship',
  stale_nonce: 'Your account nonce changed. Review the updated fee and confirm again',
  broadcast_failed: 'The sponsor could not broadcast this transaction',
  upstream_unavailable: 'The sponsorship service is unavailable. Try again later',
  rate_limited: 'Too many requests to the sponsorship service. Try again in a moment',
};

const defaultSponsorshipErrorMessage = 'The sponsored transaction could not be submitted';

export function getSbtcSponsorshipErrorMessage(error: unknown) {
  if (!LeatherApiError.isLeatherApiError(error)) return defaultSponsorshipErrorMessage;
  const code = error.data?.code;
  const reason = error.data?.reason;
  if (code === 'not_eligible' && reason && notEligibleReasonMessages[reason]) {
    return notEligibleReasonMessages[reason];
  }
  if (code && errorCodeMessages[code]) return errorCodeMessages[code];
  return error.data?.error ?? defaultSponsorshipErrorMessage;
}
