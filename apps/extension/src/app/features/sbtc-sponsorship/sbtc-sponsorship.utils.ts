import BigNumber from 'bignumber.js';

import {
  BTC_DECIMALS,
  SBTC_ASSET_ID_MAINNET,
  SBTC_ASSET_ID_TESTNET,
  STX_DECIMALS,
} from '@leather.io/constants';
import { FeeTypes, type Money, type StacksTransactionFees } from '@leather.io/models';
import {
  LeatherApiError,
  type SbtcSponsorshipQuote,
  getErrorDetail,
  getLeatherSponsorshipErrorCode,
} from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

export const sbtcFeeSymbol = 'sBTC';

export const sponsoredFeeTooltip =
  'A Leather sponsor pays the STX network fee for this transaction. In return, the sBTC fee shown is included in your transfer and goes to the sponsor.';

const sbtcContractIds = [SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET].map(
  assetId => assetId.split('::')[0]
);

export function isSbtcContractId(contractId: string) {
  return sbtcContractIds.includes(contractId);
}

type SbtcSponsorshipFeeTier = keyof StacksTransactionFees['options'];

export type SbtcSponsorshipFees = Record<SbtcSponsorshipFeeTier, Money>;

const feeTiersByFeeType: Record<string, SbtcSponsorshipFeeTier> = {
  [FeeTypes[FeeTypes.Low]]: 'low',
  [FeeTypes[FeeTypes.Middle]]: 'standard',
  [FeeTypes[FeeTypes.High]]: 'high',
};

export function getSbtcSponsorshipFeeTier(feeType: string): SbtcSponsorshipFeeTier {
  return feeTiersByFeeType[feeType] ?? 'standard';
}

type SbtcSponsorshipRate = Pick<SbtcSponsorshipQuote, 'satsPerStx' | 'minFeeSats' | 'maxFeeSats'>;

export function convertStxFeeToSbtcFee(
  stxFeeMicroStx: BigNumber.Value,
  { satsPerStx, minFeeSats, maxFeeSats }: SbtcSponsorshipRate
): Money {
  const feeSats = new BigNumber(stxFeeMicroStx)
    .shiftedBy(-STX_DECIMALS)
    .multipliedBy(satsPerStx)
    .integerValue(BigNumber.ROUND_CEIL);
  const clampedFeeSats = BigNumber.min(BigNumber.max(feeSats, minFeeSats), maxFeeSats);
  return createMoney(clampedFeeSats, sbtcFeeSymbol, BTC_DECIMALS);
}

export function getSbtcSponsorshipFees(
  stxFees: StacksTransactionFees,
  quote: SbtcSponsorshipRate
): SbtcSponsorshipFees {
  const { low, standard, high } = stxFees.options;
  return {
    low: convertStxFeeToSbtcFee(low.value.amount, quote),
    standard: convertStxFeeToSbtcFee(standard.value.amount, quote),
    high: convertStxFeeToSbtcFee(high.value.amount, quote),
  };
}

interface IsEligibleForSbtcSponsorshipArgs {
  contractId: string;
  isStacksPolicy: boolean;
  sbtcBalance: Money;
  availableStxBalance: Money;
  lowestStxFee: Money;
}
export function isEligibleForSbtcSponsorship({
  contractId,
  isStacksPolicy,
  sbtcBalance,
  availableStxBalance,
  lowestStxFee,
}: IsEligibleForSbtcSponsorshipArgs) {
  return (
    isSbtcContractId(contractId) &&
    !isStacksPolicy &&
    sbtcBalance.amount.isGreaterThan(0) &&
    availableStxBalance.amount.isLessThan(lowestStxFee.amount)
  );
}

export function isSbtcSponsorshipQuoteExpired(expiresAt: string, now = Date.now()) {
  const expiresAtMs = Date.parse(expiresAt);
  return Number.isNaN(expiresAtMs) || expiresAtMs <= now;
}

const notEligibleMessage = "This transfer isn't eligible for sBTC fee payment";

const notEligibleReasonMessages: Record<string, string> = {
  insufficient_sbtc: 'Your sBTC balance no longer covers the amount plus the fee.',
  bad_transfer_entry: 'The amount must be positive and the recipient cannot be your own address.',
  fee_too_low: 'The quoted fee is out of date. Review the updated fee and confirm again.',
  fee_too_high: 'The quoted fee is out of date. Review the updated fee and confirm again.',
  float_low: 'The sponsor is temporarily out of STX. Pay the fee in STX or try again later.',
};

function getNotEligibleMessage(reason: string | undefined) {
  if (!reason) return notEligibleMessage;
  const reasonMessage = notEligibleReasonMessages[reason];
  if (reasonMessage) return `${notEligibleMessage}. ${reasonMessage}`;
  return `${notEligibleMessage} (${reason})`;
}

export function getSbtcSponsorshipErrorMessage(error: unknown) {
  switch (getLeatherSponsorshipErrorCode(error)) {
    case 'quote_expired':
      return 'The sBTC fee quote expired. Review the updated fee and confirm again.';
    case 'stale_nonce':
      return 'The account nonce changed. Review the updated transaction and confirm again.';
    case 'not_eligible':
      return getNotEligibleMessage(
        LeatherApiError.isLeatherApiError(error) ? error.data?.reason : undefined
      );
    case 'broadcast_failed':
      return "The sponsor couldn't broadcast the transaction. Your sBTC hasn't moved. Try again in a moment.";
    case 'upstream_unavailable':
      return "The sponsor couldn't reach the Stacks network. Your sBTC hasn't moved. Try again in a moment.";
    case 'rate_limited':
      return 'Too many requests. Wait a moment and try again.';
    default:
      return getErrorDetail(error) ?? 'Something went wrong';
  }
}

export function isSbtcSponsorshipRequoteError(error: unknown) {
  const code = getLeatherSponsorshipErrorCode(error);
  return code === 'quote_expired' || code === 'stale_nonce';
}
