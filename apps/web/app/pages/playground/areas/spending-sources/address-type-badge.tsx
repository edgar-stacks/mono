import { styled } from 'leather-styles/jsx';
import { formatCryptoPrecise } from '~/utils/currency-formatter';

import { createMoney } from '@leather.io/utils';

import { type SpendingAddressType } from './spending-sources.utils';

export const addressTypeDetails: Record<SpendingAddressType, { label: string; prefix: string }> = {
  nativeSegwit: { label: 'Native SegWit', prefix: 'bc1q' },
  taproot: { label: 'Taproot', prefix: 'bc1p' },
};

export function formatSats(sats: number) {
  return formatCryptoPrecise(createMoney(sats, 'BTC'));
}

interface AddressTypeBadgeProps {
  type: SpendingAddressType;
}

export function AddressTypeBadge({ type }: AddressTypeBadgeProps) {
  return (
    <styled.span
      display="inline-flex"
      alignItems="center"
      flexShrink={0}
      px="space.01"
      borderRadius="xs"
      bg="orange.background-primary"
      color="orange.action-primary-default"
      textStyle="label.03"
      fontFamily="mono"
      aria-label={addressTypeDetails[type].label}
    >
      {addressTypeDetails[type].prefix}
    </styled.span>
  );
}
