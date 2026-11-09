import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';

import { Badge } from '@leather.io/ui';

export function SponsoredFeeBadge() {
  return (
    <Badge
      data-testid={SharedComponentsSelectors.SponsoredFeeBadge}
      label="Sponsored"
      variant="info"
    />
  );
}
