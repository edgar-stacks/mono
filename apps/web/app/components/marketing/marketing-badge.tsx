import { type HTMLStyledProps, styled } from 'leather-styles/jsx';

export function MarketingBadge(props: HTMLStyledProps<'span'>) {
  return (
    <styled.span
      display="inline-flex"
      alignItems="center"
      px="space.02"
      height="22px"
      borderRadius="round"
      border="default"
      textStyle="caption.02"
      color="ink.text-subdued"
      whiteSpace="nowrap"
      {...props}
    />
  );
}
