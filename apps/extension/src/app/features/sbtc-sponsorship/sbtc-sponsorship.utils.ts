import BigNumber from 'bignumber.js';

import { SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET } from '@leather.io/constants';
import {
  FeeTypes,
  type Money,
  type StacksTransactionFees,
  type TransactionFeeTier,
} from '@leather.io/models';
import {
  LeatherApiError,
  type LeatherSponsorshipErrorCode,
  type LeatherSponsorshipQuote,
  getErrorDetail,
} from '@leather.io/services';
import { createMoney, microStxToStx } from '@leather.io/utils';

type NumberInput = BigNumber | number | string;

const sbtcContractIds = [SBTC_ASSET_ID_MAINNET, SBTC_ASSET_ID_TESTNET].map(
  assetId => assetId.split('::')[0]
);

export function isSbtcContractId(contractId: string) {
  return sbtcContractIds.includes(contractId);
}

interface IsSbtcSponsorshipEligibleArgs {
  contractId: string;
  isStacksPolicy: boolean;
  sbtcBalance: Money;
  availableStxBalance?: Money;
  stxFees?: StacksTransactionFees;
}
export function isSbtcSponsorshipEligible({
  contractId,
  isStacksPolicy,
  sbtcBalance,
  availableStxBalance,
  stxFees,
}: IsSbtcSponsorshipEligibleArgs) {
  if (!stxFees || !availableStxBalance || isStacksPolicy || !isSbtcContractId(contractId))
    return false;
  if (!sbtcBalance.amount.isGreaterThan(0)) return false;
  return availableStxBalance.amount.isLessThan(stxFees.options.low.value.amount);
}

type SbtcSponsorshipFeeQuote = Pick<
  LeatherSponsorshipQuote,
  'satsPerStx' | 'minFeeSats' | 'maxFeeSats'
>;

export function calculateSbtcSponsorshipFee(
  stxFeeMicro: NumberInput,
  { satsPerStx, minFeeSats, maxFeeSats }: SbtcSponsorshipFeeQuote
) {
  const fee = microStxToStx(stxFeeMicro)
    .multipliedBy(satsPerStx)
    .integerValue(BigNumber.ROUND_CEIL);
  return BigNumber.min(BigNumber.max(fee, minFeeSats), maxFeeSats);
}

const feeTiersByFeeType = new Map<string, TransactionFeeTier>([
  [FeeTypes[FeeTypes.Low], 'low'],
  [FeeTypes[FeeTypes.Middle], 'standard'],
  [FeeTypes[FeeTypes.High], 'high'],
]);

export function getSbtcSponsorshipFeeTier(feeType?: string): TransactionFeeTier {
  if (!feeType) return 'standard';
  return feeTiersByFeeType.get(feeType) ?? 'standard';
}

export type SbtcSponsorshipFees = Record<TransactionFeeTier, Money>;

export function getSbtcSponsorshipFees(
  stxFees: StacksTransactionFees,
  quote: SbtcSponsorshipFeeQuote,
  sbtcBalance: Money
): SbtcSponsorshipFees {
  function toSbtcFee(tier: TransactionFeeTier) {
    return createMoney(
      calculateSbtcSponsorshipFee(stxFees.options[tier].value.amount, quote),
      sbtcBalance.symbol,
      sbtcBalance.decimals
    );
  }
  return { low: toSbtcFee('low'), standard: toSbtcFee('standard'), high: toSbtcFee('high') };
}

export function subtractSbtcSponsorshipFee(sbtcBalance: Money, fee: Money) {
  const remaining = sbtcBalance.amount.minus(fee.amount);
  return createMoney(BigNumber.max(remaining, 0), sbtcBalance.symbol, sbtcBalance.decimals);
}

export function isSbtcSponsorshipQuoteExpired(expiresAt: string, now = Date.now()) {
  const expiresAtMs = new Date(expiresAt).getTime();
  return !(expiresAtMs > now);
}

function getSponsorshipErrorData(error: unknown) {
  if (!(error instanceof LeatherApiError)) return undefined;
  return error.data;
}

const requoteErrorCodes: string[] = [
  'quote_expired',
  'stale_nonce',
] satisfies LeatherSponsorshipErrorCode[];

export function isSbtcSponsorshipRequoteError(error: unknown) {
  const code = getSponsorshipErrorData(error)?.code;
  return code !== undefined && requoteErrorCodes.includes(code);
}

const notEligibleMessage = "This transfer isn't eligible for sBTC fee payment";

const errorMessagesByCode = new Map<string, string>([
  ['quote_expired', 'The sBTC fee quote expired. Review the updated fee and confirm again.'],
  ['stale_nonce', 'The account nonce changed. Review the updated transaction and confirm again.'],
  [
    'broadcast_failed',
    "The sponsor couldn't broadcast the transaction. Your sBTC hasn't moved. Try again in a moment.",
  ],
  [
    'upstream_unavailable',
    "The sponsor couldn't reach the Stacks network. Your sBTC hasn't moved. Try again in a moment.",
  ],
  ['rate_limited', 'Too many requests. Wait a moment and try again.'],
]);

const outdatedFeeMessage =
  'The quoted fee is out of date. Review the updated fee and confirm again.';

const notEligibleReasonMessages = new Map<string, string>([
  ['insufficient_sbtc', 'Your sBTC balance no longer covers the amount plus the fee.'],
  [
    'bad_transfer_entry',
    'The amount must be positive and the recipient cannot be your own address.',
  ],
  ['fee_too_low', outdatedFeeMessage],
  ['fee_too_high', outdatedFeeMessage],
  ['float_low', 'The sponsor is temporarily out of STX. Pay the fee in STX or try again later.'],
]);

function getNotEligibleMessage(reason?: string) {
  if (!reason) return notEligibleMessage;
  const reasonMessage = notEligibleReasonMessages.get(reason);
  if (reasonMessage) return `${notEligibleMessage}. ${reasonMessage}`;
  return `${notEligibleMessage} (${reason})`;
}

export function getSbtcSponsorshipErrorMessage(error: unknown) {
  const data = getSponsorshipErrorData(error);
  if (data?.code === 'not_eligible') return getNotEligibleMessage(data.reason);
  const message = data?.code ? errorMessagesByCode.get(data.code) : undefined;
  return message ?? getErrorDetail(error) ?? 'Something went wrong';
}
