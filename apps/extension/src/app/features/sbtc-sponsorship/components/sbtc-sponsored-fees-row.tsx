import { useState } from 'react';

import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { useField } from 'formik';
import { HStack } from 'leather-styles/jsx';

import { FeeTypes } from '@leather.io/models';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import { FeeEstimateSelect } from '@app/components/fees-row/components/fee-estimate-select';
import { FeesRowLayout } from '@app/components/fees-row/components/fees-row.layout';
import { TransactionFee } from '@app/components/fees-row/components/transaction-fee';

import { type SbtcSponsorshipFees } from '../sbtc-sponsorship.utils';
import { useSelectedSbtcSponsorshipFee } from '../use-selected-sbtc-sponsorship-fee';
import { SponsoredBadge } from './sponsored-badge';

const feeTypeIndexByTier: Record<keyof SbtcSponsorshipFees, number> = {
  low: FeeTypes.Low,
  standard: FeeTypes.Middle,
  high: FeeTypes.High,
};

interface SbtcSponsoredFeesRowProps {
  fees: SbtcSponsorshipFees;
}
export function SbtcSponsoredFeesRow({ fees }: SbtcSponsoredFeesRowProps) {
  const [, , feeTypeHelper] = useField<string>('feeType');
  const [isSelectVisible, setIsSelectVisible] = useState(false);
  const { tier, fee } = useSelectedSbtcSponsorshipFee(fees);

  return (
    <FeesRowLayout
      data-testid={SharedComponentsSelectors.FeeRow}
      feeField={
        <HStack gap="space.02" justifyContent="flex-end" width="100%">
          <SponsoredBadge />
          <TransactionFee
            fee={convertAmountToBaseUnit(fee).toString()}
            feeCurrencySymbol={fee.symbol}
            usdAmount={null}
          />
        </HStack>
      }
      isSponsored={false}
      selectInput={
        <FeeEstimateSelect
          allowCustom={false}
          isVisible={isSelectVisible}
          onSelectItem={index => {
            void feeTypeHelper.setValue(FeeTypes[index]);
            setIsSelectVisible(false);
          }}
          onSetIsSelectVisible={setIsSelectVisible}
          selectedItem={feeTypeIndexByTier[tier]}
        />
      }
    />
  );
}
