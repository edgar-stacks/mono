import { type PostConditionModeName } from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';

import { Badge } from '@leather.io/ui';

const postConditionModeLabel = {
  allow: 'Allow',
  deny: 'Deny',
  originator: 'Originator',
} as const satisfies Record<PostConditionModeName, string>;

const postConditionModeBadgeVariant = {
  allow: 'warning',
  deny: 'default',
  originator: 'info',
} as const satisfies Record<PostConditionModeName, string>;

interface PostConditionModeBadgeProps {
  mode: PostConditionModeName;
}
export function PostConditionModeBadge({ mode }: PostConditionModeBadgeProps) {
  return (
    <Badge
      data-testid={PostConditionSelectors.PostConditionModeBadge}
      label={postConditionModeLabel[mode]}
      variant={postConditionModeBadgeVariant[mode]}
    />
  );
}
