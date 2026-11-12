import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { Box } from 'leather-styles/jsx';

import { Badge, BasicTooltip } from '@leather.io/ui';

const sponsoredFeeTooltip =
  'A Leather sponsor pays the STX network fee for this transaction. In return, the sBTC fee shown is included in your transfer and goes to the sponsor.';

export function SponsoredFeeBadge() {
  return (
    <BasicTooltip label={sponsoredFeeTooltip} side="bottom">
      <Box data-testid={SharedComponentsSelectors.SponsoredFeeBadge} display="inline-flex">
        <Badge label="Sponsored" variant="info" />
      </Box>
    </BasicTooltip>
  );
}
