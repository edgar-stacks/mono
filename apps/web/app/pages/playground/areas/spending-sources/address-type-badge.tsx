import { styled } from 'leather-styles/jsx';
import { formatCryptoPrecise, formatCurrency } from '~/utils/currency-formatter';

import { createMoney, createMoneyFromDecimal, satToBtc } from '@leather.io/utils';

import { mockBtcPriceUsd } from './spending-sources.mock-data';
import type { SpendingAddressType } from './spending-sources.utils';

export const addressTypeDetails: Record<SpendingAddressType, { label: string; prefix: string }> = {
  nativeSegwit: { label: 'Native SegWit', prefix: 'bc1q' },
  taproot: { label: 'Taproot', prefix: 'bc1p' },
};

export function formatSats(sats: number) {
  return formatCryptoPrecise(createMoney(sats, 'BTC'));
}

export function formatSatsInUsd(sats: number) {
  return formatCurrency(createMoneyFromDecimal(satToBtc(sats).times(mockBtcPriceUsd), 'USD'));
}

interface AddressTypeBadgeProps {
  type: SpendingAddressType;
}

export function AddressTypeBadge({ type }: AddressTypeBadgeProps) {
  return (
    <styled.span
      textStyle="label.03"
      fontFamily="mono"
      bg="orange.background-primary"
      color="orange.text-primary"
      borderRadius="xs"
      px="space.01"
      flexShrink={0}
      aria-label={addressTypeDetails[type].label}
    >
      {addressTypeDetails[type].prefix}
    </styled.span>
  );
}
