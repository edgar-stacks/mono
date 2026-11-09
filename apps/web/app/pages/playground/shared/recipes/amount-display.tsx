import { Stack, styled } from 'leather-styles/jsx';

type AmountDisplaySize = 'large' | 'small';

interface AmountDisplayProps {
  amount: string;
  symbol: string;
  fiat?: string;
  size?: AmountDisplaySize;
}

export function AmountDisplay({ amount, symbol, fiat, size = 'large' }: AmountDisplayProps) {
  return (
    <Stack gap="space.01" alignItems={size === 'large' ? 'center' : 'flex-end'}>
      <styled.span
        textStyle={size === 'large' ? 'heading.02' : 'label.02'}
        fontVariantNumeric="tabular-nums"
      >
        {amount} {symbol}
      </styled.span>
      {fiat && (
        <styled.span
          textStyle="caption.01"
          color="ink.text-subdued"
          fontVariantNumeric="tabular-nums"
        >
          {fiat}
        </styled.span>
      )}
    </Stack>
  );
}
