import {
  type PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
} from '@stacks/transactions';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';
import { Approver } from '@leather.io/ui';

import { NoPostConditions } from './no-post-conditions';
import { OriginatorModeNote } from './originator-mode-note';
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
  postConditionMode,
}: PostConditionsDetailsLayoutProps) {
  const mode = toPostConditionModeName(postConditionMode);

  const subheader = (
    <Approver.Subheader justifyContent="space-between">
      Post conditions
      <PostConditionModeBadge mode={mode} />
    </Approver.Subheader>
  );

  if (mode === 'allow')
    return (
      <>
        <PostConditionModeWarning />
        <Approver.Section>{subheader}</Approver.Section>
      </>
    );

  return (
    <Approver.Section>
      {subheader}
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
