import { useField } from 'formik';

import { type SbtcSponsorshipFees, getSbtcSponsorshipFeeTier } from './sbtc-sponsorship.utils';

export function useSelectedSbtcSponsorshipFee(fees: SbtcSponsorshipFees) {
  const [feeTypeField] = useField<string>('feeType');
  const tier = getSbtcSponsorshipFeeTier(feeTypeField.value);
  return { tier, fee: fees[tier] };
}
