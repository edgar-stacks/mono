import { styled } from 'leather-styles/jsx';

import { addressTypeDetails } from './spending-sources-format';
import type { SpendingSourceType } from './spending-sources.utils';

interface AddressTypeBadgeProps {
  type: SpendingSourceType;
}

export function AddressTypeBadge({ type }: AddressTypeBadgeProps) {
  return (
    <styled.span
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      minWidth="40px"
      px="space.02"
      py="2px"
      borderRadius="xs"
      bg="orange.background-primary"
      color="orange.action-primary-default"
      fontFamily="mono"
      textStyle="label.03"
    >
      {addressTypeDetails[type].prefix}
    </styled.span>
  );
}
