import { Flex, styled } from 'leather-styles/jsx';

interface AmountDisplayProps {
  amount: string;
  symbol: string;
  fiatAmount?: string;
  size?: 'large' | 'small';
}

export function AmountDisplay({ amount, symbol, fiatAmount, size = 'large' }: AmountDisplayProps) {
  return (
    <Flex direction="column" gap="space.01" data-recipe="amount-display">
      <styled.span
        textStyle={size === 'large' ? 'heading.03' : 'label.01'}
        color="ink.text-primary"
        fontVariantNumeric="tabular-nums"
      >
        {amount} {symbol}
      </styled.span>
      {fiatAmount ? (
        <styled.span
          textStyle="caption.01"
          color="ink.text-subdued"
          fontVariantNumeric="tabular-nums"
        >
          {fiatAmount}
        </styled.span>
      ) : null}
    </Flex>
  );
}
