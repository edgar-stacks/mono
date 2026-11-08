import type { PostConditionModeName } from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';

import { Badge, type BadgeProps } from '@leather.io/ui';

const postConditionModeBadges: Record<
  PostConditionModeName,
  { label: string; variant: BadgeProps['variant'] }
> = {
  allow: { label: 'Allow', variant: 'warning' },
  deny: { label: 'Deny', variant: 'default' },
  originator: { label: 'Originator', variant: 'info' },
};

interface PostConditionModeBadgeProps {
  mode: PostConditionModeName;
}
export function PostConditionModeBadge({ mode }: PostConditionModeBadgeProps) {
  const { label, variant } = postConditionModeBadges[mode];
  return (
    <Badge
      data-testid={PostConditionSelectors.PostConditionModeBadge}
      label={label}
      variant={variant}
    />
  );
}
