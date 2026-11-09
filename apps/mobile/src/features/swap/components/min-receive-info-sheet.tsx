import { InfoSheet } from '@/features/swap/components/info-sheet/info-sheet';
import { SwapSelectors } from '@/shared/selectors/swap.selectors';
import { t } from '@lingui/core/macro';

import { Text } from '@leather.io/ui/native';

export function MinReceiveInfoSheet() {
  return (
    <InfoSheet title={t`Minimum receive`} testID={SwapSelectors.MinReceiveInfoSheet}>
      <Text variant="body01">
        {t`The guaranteed minimum amount you‘ll receive based on your slippage tolerance. If the final amount falls below this, the transaction will automatically revert.`}
      </Text>
    </InfoSheet>
  );
}
