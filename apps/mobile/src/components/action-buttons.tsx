import { useOnramperBuyFlag, useOnramperSellFlag, useSwapFlag } from '@/features/feature-flags';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { t } from '@lingui/core/macro';

import { Button, type ButtonProps } from '@leather.io/ui/native';

interface ActionButtonsProps {
  fullWidth?: boolean;
  size?: ButtonProps['size'];
  onSend?(): void;
  onReceive?(): void;
  onSwap?(): void;
  onBuy?(): void;
  onSell?(): void;
}

export function ActionButtons({
  fullWidth = false,
  size = 'md',
  onSend,
  onReceive,
  onSwap,
  onBuy,
  onSell,
}: ActionButtonsProps) {
  const isSwapEnabled = useSwapFlag();
  const isOnramperBuyEnabled = useOnramperBuyFlag();
  const isOnramperSellEnabled = useOnramperSellFlag();

  return (
    <>
      {onSend && (
        <Button
          onPress={onSend}
          minWidth={86}
          size={size}
          flex={fullWidth ? 1 : 0}
          testID={SharedSelectors.SendButton}
        >
          {t`Send`}
        </Button>
      )}
      {onReceive && (
        <Button
          onPress={onReceive}
          testID={SharedSelectors.ReceiveButton}
          minWidth={86}
          size={size}
          variant="outline"
          flex={fullWidth ? 1 : 0}
        >
          {t`Receive`}
        </Button>
      )}
      {onBuy && isOnramperBuyEnabled && (
        <Button
          onPress={onBuy}
          testID={SharedSelectors.BuyButton}
          minWidth={86}
          size={size}
          variant="outline"
          flex={fullWidth ? 1 : 0}
        >
          {t`Buy`}
        </Button>
      )}
      {onSell && isOnramperSellEnabled && (
        <Button
          onPress={onSell}
          testID={SharedSelectors.SellButton}
          minWidth={86}
          size={size}
          variant="outline"
          flex={fullWidth ? 1 : 0}
        >
          {t`Sell`}
        </Button>
      )}
      {onSwap && isSwapEnabled && (
        <Button
          onPress={onSwap}
          testID={SharedSelectors.SwapButton}
          minWidth={86}
          size={size}
          variant="outline"
          flex={fullWidth ? 1 : 0}
        >
          {t`Swap`}
        </Button>
      )}
    </>
  );
}
