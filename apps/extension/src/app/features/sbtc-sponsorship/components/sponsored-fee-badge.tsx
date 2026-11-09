import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';

import { BadgeWithTooltip } from '@app/ui/components/badge/badge-with-tooltip';

const sponsoredFeeInfo =
  'A Leather sponsor pays the STX network fee for this transaction. In return, the sBTC fee shown is included in your transfer and goes to the sponsor.';

export function SponsoredFeeBadge() {
  return (
    <BadgeWithTooltip
      data-testid={SharedComponentsSelectors.SponsoredFeeBadge}
      hoverLabel={sponsoredFeeInfo}
      label="Sponsored"
      variant="info"
    />
  );
}
