import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
} from '@stacks/transactions';
import { HStack } from 'leather-styles/jsx';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';
import { Approver } from '@leather.io/ui';

import { NoPostConditions } from './no-post-conditions';
import { OriginatorModeNote } from './originator-mode-note';
import { PostConditionList } from './post-condition-list';
import { PostConditionModeBadge } from './post-condition-mode-badge';
import { PostConditionModeWarning } from './post-condition-mode-warning';
import { getPostConditionModeName } from './post-condition-mode.utils';

interface PostConditionsSubheaderProps {
  mode: PostConditionModeName;
}
function PostConditionsSubheader({ mode }: PostConditionsSubheaderProps) {
  return (
    <HStack gap="space.02">
      <Approver.Subheader>Post conditions</Approver.Subheader>
      <PostConditionModeBadge mode={mode} />
    </HStack>
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
  const mode = getPostConditionModeName(postConditionMode);

  if (mode === 'allow')
    return (
      <Approver.Section>
        <PostConditionsSubheader mode={mode} />
        <PostConditionModeWarning />
      </Approver.Section>
    );

  return (
    <Approver.Section>
      <PostConditionsSubheader mode={mode} />
      {postConditions.length ? (
        <>
          <PostConditionList
            postConditions={postConditions.map(pc => ensurePostConditionWireFormat(pc))}
          />
          {mode === 'originator' && <OriginatorModeNote />}
        </>
      ) : (
        <NoPostConditions mode={mode} />
      )}
    </Approver.Section>
  );
}
