import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
} from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { HStack, styled } from 'leather-styles/jsx';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';
import { Approver } from '@leather.io/ui';

import { NoPostConditions } from './no-post-conditions';
import { PostConditionList } from './post-condition-list';
import { PostConditionModeBadge } from './post-condition-mode-badge';
import { PostConditionModeWarning } from './post-condition-mode-warning';
import { toPostConditionModeName } from './post-condition-mode.utils';

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
      <HStack gap="space.02" alignItems="center">
        <Approver.Subheader>Post conditions</Approver.Subheader>
        <PostConditionModeBadge mode={mode} />
      </HStack>
      {mode === 'allow' && <PostConditionModeWarning />}
      {mode !== 'allow' && postConditions.length > 0 && (
        <>
          {mode === 'originator' && (
            <styled.p
              data-testid={PostConditionSelectors.OriginatorModeNote}
              color="ink.text-secondary"
              textStyle="caption.01"
              pb="space.03"
            >
              Only your account is constrained. Contracts this transaction calls can still move
              their own assets.
            </styled.p>
          )}
          <PostConditionList
            postConditions={postConditions.map(pc => ensurePostConditionWireFormat(pc))}
          />
        </>
      )}
      {mode !== 'allow' && postConditions.length === 0 && <NoPostConditions mode={mode} />}
    </Approver.Section>
  );
}
