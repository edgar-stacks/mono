import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';

import { Badge } from '@leather.io/ui';

export function SponsoredFeeBadge() {
  return (
    <Badge
      data-testid={SendCryptoAssetSelectors.SponsoredFeeBadge}
      label="Sponsored"
      ml="space.02"
      variant="info"
    />
  );
}
