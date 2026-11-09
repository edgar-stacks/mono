import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';

import { Callout } from '@leather.io/ui';

export function SbtcFeeRequoteCallout() {
  return (
    <Callout
      data-testid={SendCryptoAssetSelectors.SbtcFeeRequoteCallout}
      mb="space.05"
      px="space.03"
      title="Fee quote updated"
      variant="warning"
    >
      The previous fee quote expired. Review the updated sBTC fee and confirm again
    </Callout>
  );
}
