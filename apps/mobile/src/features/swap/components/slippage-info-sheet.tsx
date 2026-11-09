import { InfoSheet } from '@/features/swap/components/info-sheet/info-sheet';
import { SwapSelectors } from '@/shared/selectors/swap.selectors';
import { t } from '@lingui/core/macro';

import { Text } from '@leather.io/ui/native';

export function SlippageInfoSheet() {
  return (
    <InfoSheet title={t`Slippage tolerance`} testID={SwapSelectors.SlippageInfoSheet}>
      <Text variant="body01">
        {t`The maximum price change you're willing to accept between when you submit and when your swap executes. If the price moves beyond this threshold, the transaction will revert.`}
      </Text>
    </InfoSheet>
  );
}
