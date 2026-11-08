import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
} from '@stacks/transactions';
import { Stack } from 'leather-styles/jsx';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';
import { Approver } from '@leather.io/ui';

import { NoPostConditions } from './no-post-conditions';
import { OriginatorPostConditionsNote } from './originator-post-conditions-note';
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

  const subheader = (
    <Approver.Subheader gap="space.02">
      Post conditions
      <PostConditionModeBadge mode={mode} />
    </Approver.Subheader>
  );

  if (mode === 'allow')
    return (
      <Approver.Section>
        {subheader}
        <PostConditionModeWarning />
      </Approver.Section>
    );

  return (
    <Approver.Section>
      {subheader}
      {postConditions.length ? (
        <Stack gap="space.04">
          <PostConditionList
            postConditions={postConditions.map(pc => ensurePostConditionWireFormat(pc))}
          />
          {mode === 'originator' && <OriginatorPostConditionsNote />}
        </Stack>
      ) : (
        <NoPostConditions mode={mode} />
      )}
    </Approver.Section>
  );
}
