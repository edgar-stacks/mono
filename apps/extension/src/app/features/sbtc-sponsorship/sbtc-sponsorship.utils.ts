import BigNumber from 'bignumber.js';

import { SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET, STX_DECIMALS } from '@leather.io/constants';
import { FeeTypes, type Money, type StacksTransactionFees } from '@leather.io/models';
import { LeatherApiError, type SbtcSponsorshipQuote } from '@leather.io/services';
import { createMoney, isNumber, isString, unitToFractionalUnit } from '@leather.io/utils';

type SbtcSponsorshipFeeTier = 'low' | 'standard' | 'high';

export const sbtcFeeSymbol = 'sBTC';

const sbtcContractIds = [SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET].map(
  assetId => assetId.split('::')[0]
);

export function isSbtcContractId(contractId: string) {
  return sbtcContractIds.includes(contractId);
}

export function getSbtcSponsorshipFeeTier(feeType: string | undefined): SbtcSponsorshipFeeTier {
  if (feeType === FeeTypes[FeeTypes.Low]) return 'low';
  if (feeType === FeeTypes[FeeTypes.High]) return 'high';
  return 'standard';
}

type SbtcFeeQuote = Pick<SbtcSponsorshipQuote, 'satsPerStx' | 'minFeeSats' | 'maxFeeSats'>;

export function convertStxFeeToSbtcFee(
  stxFeeMicro: BigNumber.Value,
  { satsPerStx, minFeeSats, maxFeeSats }: SbtcFeeQuote
) {
  const sats = new BigNumber(stxFeeMicro)
    .shiftedBy(-STX_DECIMALS)
    .multipliedBy(satsPerStx)
    .integerValue(BigNumber.ROUND_CEIL);
  return BigNumber.min(BigNumber.max(sats, minFeeSats), maxFeeSats);
}

export function createSbtcSponsorshipFees(
  stxFees: StacksTransactionFees,
  quote: SbtcFeeQuote,
  decimals: number
): StacksTransactionFees {
  function toSbtcFee(fee: Money) {
    return createMoney(convertStxFeeToSbtcFee(fee.amount, quote), sbtcFeeSymbol, decimals);
  }
  const { low, standard, high } = stxFees.options;
  return {
    ...stxFees,
    options: {
      low: { ...low, value: toSbtcFee(low.value) },
      standard: { ...standard, value: toSbtcFee(standard.value) },
      high: { ...high, value: toSbtcFee(high.value) },
    },
  };
}

export function isStxBalanceBelowLowestFee(stxBalance: Money, stxFees: StacksTransactionFees) {
  return stxBalance.amount.isLessThan(stxFees.options.low.value.amount);
}

export function getBalanceAfterSbtcFee(balance: Money, fee: unknown): Money {
  if (!isNumber(fee) && !isString(fee)) return balance;
  const feeAmount = new BigNumber(fee);
  if (feeAmount.isNaN()) return balance;
  const remaining = balance.amount.minus(unitToFractionalUnit(balance.decimals)(feeAmount));
  return createMoney(BigNumber.max(remaining, 0), balance.symbol, balance.decimals);
}

export function isSbtcSponsorshipQuoteExpired(
  { expiresAt }: Pick<SbtcSponsorshipQuote, 'expiresAt'>,
  now = Date.now()
) {
  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs <= now;
}

const requoteErrorCodes = ['quote_expired', 'stale_nonce'];

const sponsorshipErrorMessages: Record<string, string> = {
  quote_expired: 'The fee quote expired. Review the updated fee and confirm again',
  stale_nonce: 'Your account nonce changed. Review the updated fee and confirm again',
  not_eligible: 'This transaction is not eligible for a sponsored fee',
  broadcast_failed: 'The sponsor could not broadcast this transaction',
  upstream_unavailable: 'Fee sponsorship is temporarily unavailable. Try again later',
  rate_limited: 'Too many requests to the sponsor. Wait a moment and try again',
};

const notEligibleReasonMessages: Record<string, string> = {
  insufficient_sbtc: 'Not enough sBTC to cover the amount and the fee',
  bad_transfer_entry: 'The sponsor rejected this transfer. Go back and try again',
  fee_too_low: 'The sBTC fee is below the sponsor minimum. Go back and try again',
  fee_too_high: 'The sBTC fee is above the sponsor maximum. Go back and try again',
  float_low: 'Fee sponsorship is temporarily unavailable. Try again later',
};

const defaultSponsorshipErrorMessage = 'Unable to submit the sponsored transaction';

function getSbtcSponsorshipErrorCode(error: unknown) {
  if (!(error instanceof LeatherApiError)) return undefined;
  return error.data?.code;
}

export function isSbtcSponsorshipRequoteError(error: unknown) {
  const code = getSbtcSponsorshipErrorCode(error);
  return code !== undefined && requoteErrorCodes.includes(code);
}

export function getSbtcSponsorshipErrorMessage(error: unknown) {
  if (!(error instanceof LeatherApiError)) return defaultSponsorshipErrorMessage;
  const { code, reason } = error.data ?? {};
  if (code === 'not_eligible' && reason && notEligibleReasonMessages[reason]) {
    return notEligibleReasonMessages[reason];
  }
  if (code && sponsorshipErrorMessages[code]) return sponsorshipErrorMessages[code];
  return defaultSponsorshipErrorMessage;
}
