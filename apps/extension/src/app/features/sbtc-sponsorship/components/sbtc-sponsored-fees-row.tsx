import { useState } from 'react';

import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { useField } from 'formik';
import { Box, HStack } from 'leather-styles/jsx';

import { FeeTypes, type TransactionFeeTier } from '@leather.io/models';
import { SkeletonLoader } from '@leather.io/ui';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import { FeeEstimateSelect } from '@app/components/fees-row/components/fee-estimate-select';
import { FeesRowLayout } from '@app/components/fees-row/components/fees-row.layout';
import { TransactionFee } from '@app/components/fees-row/components/transaction-fee';

import { type SbtcSponsorshipFees, getSbtcSponsorshipFeeTier } from '../sbtc-sponsorship.utils';
import { SponsoredFeeBadge } from './sponsored-fee-badge';

const feeTypeIndexByTier: Record<TransactionFeeTier, number> = {
  low: FeeTypes.Low,
  standard: FeeTypes.Middle,
  high: FeeTypes.High,
};

interface SbtcSponsoredFeesRowProps {
  fees?: SbtcSponsorshipFees;
}
export function SbtcSponsoredFeesRow({ fees }: SbtcSponsoredFeesRowProps) {
  const [feeTypeField, , feeTypeHelper] = useField<string>('feeType');
  const [isSelectVisible, setIsSelectVisible] = useState(false);

  if (!fees) return <SkeletonLoader isLoading height="32px" width="100%" />;

  const selectedFee = fees[getSbtcSponsorshipFeeTier(feeTypeField.value)];

  function onSelectItem(index: number) {
    void feeTypeHelper.setValue(FeeTypes[index]);
    setIsSelectVisible(false);
  }

  return (
    <FeesRowLayout
      data-testid={SharedComponentsSelectors.FeeRow}
      feeField={
        <Box flexShrink={0} textAlign="right" whiteSpace="nowrap">
          <TransactionFee
            fee={convertAmountToBaseUnit(selectedFee).toFixed()}
            feeCurrencySymbol={selectedFee.symbol}
            usdAmount={null}
          />
        </Box>
      }
      isSponsored={false}
      selectInput={
        <HStack gap="space.02">
          <FeeEstimateSelect
            allowCustom={false}
            isVisible={isSelectVisible}
            onSelectItem={onSelectItem}
            onSetIsSelectVisible={setIsSelectVisible}
            selectedItem={feeTypeIndexByTier[getSbtcSponsorshipFeeTier(feeTypeField.value)]}
          />
          <SponsoredFeeBadge />
        </HStack>
      }
    />
  );
}
