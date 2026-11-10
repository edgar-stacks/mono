import { type PostConditionModeName } from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';

import { Badge, type BadgeProps } from '@leather.io/ui';

const postConditionModeLabels: Record<PostConditionModeName, string> = {
  allow: 'Allow',
  deny: 'Deny',
  originator: 'Originator',
};

const postConditionModeBadgeVariants: Record<PostConditionModeName, BadgeProps['variant']> = {
  allow: 'warning',
  deny: 'default',
  originator: 'info',
};

interface PostConditionModeBadgeProps {
  mode: PostConditionModeName;
}
export function PostConditionModeBadge({ mode }: PostConditionModeBadgeProps) {
  return (
    <Badge
      data-testid={PostConditionSelectors.PostConditionModeBadge}
      label={postConditionModeLabels[mode]}
      variant={postConditionModeBadgeVariants[mode]}
    />
  );
}
