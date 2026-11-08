import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
} from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { Flex, Stack, styled } from 'leather-styles/jsx';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';
import { Approver } from '@leather.io/ui';

import { toPostConditionModeName } from '@app/common/transactions/stacks/post-condition.utils';

import { NoPostConditions } from './no-post-conditions';
import { PostConditionList } from './post-condition-list';
import { PostConditionModeBadge } from './post-condition-mode-badge';
import { PostConditionModeWarning } from './post-condition-mode-warning';

interface PostConditionsDetailsContentProps {
  mode: PostConditionModeName;
  postConditions: PostConditionWire[];
}
function PostConditionsDetailsContent({ mode, postConditions }: PostConditionsDetailsContentProps) {
  if (mode === 'allow') return <PostConditionModeWarning />;

  if (!postConditions.length) return <NoPostConditions isOriginatorMode={mode === 'originator'} />;

  return (
    <Stack gap="space.04">
      <PostConditionList
        postConditions={postConditions.map(pc => ensurePostConditionWireFormat(pc))}
      />
      {mode === 'originator' && (
        <styled.span
          data-testid={PostConditionSelectors.PostConditionOriginatorNote}
          color="ink.text-secondary"
          textStyle="caption.01"
        >
          Only your account is constrained. Contracts this transaction calls can still move their
          own assets.
        </styled.span>
      )}
    </Stack>
  );
}

interface PostConditionsDetailsLayoutProps {
  postConditions: PostConditionWire[];
  postConditionMode?: PostConditionMode | PostConditionModeName;
}
export function PostConditionsDetailsLayout({
  postConditions,
  postConditionMode = PostConditionMode.Deny,
}: PostConditionsDetailsLayoutProps) {
  const mode = toPostConditionModeName(postConditionMode);

  return (
    <Approver.Section>
      <Flex alignItems="center" justifyContent="space-between">
        <Approver.Subheader>Post conditions</Approver.Subheader>
        <PostConditionModeBadge mode={mode} />
      </Flex>
      <PostConditionsDetailsContent mode={mode} postConditions={postConditions} />
    </Approver.Section>
  );
}
