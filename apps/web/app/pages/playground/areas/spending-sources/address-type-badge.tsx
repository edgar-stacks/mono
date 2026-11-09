import { styled } from 'leather-styles/jsx';

interface AddressTypeBadgeProps {
  prefix: string;
}

export function AddressTypeBadge({ prefix }: AddressTypeBadgeProps) {
  return (
    <styled.span
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      minWidth="40px"
      height="24px"
      px="space.02"
      borderRadius="xs"
      bg="orange.background-primary"
      color="orange.action-primary-default"
      textStyle="label.03"
    >
      {prefix}
    </styled.span>
  );
}
