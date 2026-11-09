import { BadgeWithTooltip } from '@app/ui/components/badge/badge-with-tooltip';

import { sponsoredFeeTooltip } from '../sbtc-sponsorship.utils';

export function SponsoredBadge() {
  return <BadgeWithTooltip hoverLabel={sponsoredFeeTooltip} label="Sponsored" variant="info" />;
}
