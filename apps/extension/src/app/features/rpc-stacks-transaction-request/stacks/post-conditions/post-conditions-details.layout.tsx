import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
} from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { HStack, styled } from 'leather-styles/jsx';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';
import { Approver } from '@leather.io/ui';

import { postConditionModeToName } from '@app/common/transactions/stacks/post-condition.utils';

import { NoPostConditions } from './no-post-conditions';
import { PostConditionList } from './post-condition-list';
import { PostConditionModeBadge } from './post-condition-mode-badge';
import { PostConditionModeWarning } from './post-condition-mode-warning';

interface PostConditionsDetailsLayoutProps {
  postConditions: PostConditionWire[];
  postConditionMode?: PostConditionMode | PostConditionModeName;
}
export function PostConditionsDetailsLayout({
  postConditions,
  postConditionMode = PostConditionMode.Deny,
}: PostConditionsDetailsLayoutProps) {
  const mode = postConditionModeToName(postConditionMode);

  function renderContent() {
    if (mode === 'allow') return <PostConditionModeWarning />;
    if (!postConditions.length) return <NoPostConditions mode={mode} />;
    return (
      <>
        <PostConditionList
          postConditions={postConditions.map(pc => ensurePostConditionWireFormat(pc))}
        />
        {mode === 'originator' && (
          <styled.p
            data-testid={PostConditionSelectors.OriginatorModeNote}
            mt="space.04"
            color="ink.text-secondary"
            textStyle="caption.01"
          >
            Only your account is constrained. Contracts this transaction calls can still move their
            own assets.
          </styled.p>
        )}
      </>
    );
  }

  return (
    <Approver.Section>
      <HStack alignItems="center" justifyContent="space-between">
        <Approver.Subheader>Post conditions</Approver.Subheader>
        <PostConditionModeBadge mode={mode} />
      </HStack>
      {renderContent()}
    </Approver.Section>
  );
}
