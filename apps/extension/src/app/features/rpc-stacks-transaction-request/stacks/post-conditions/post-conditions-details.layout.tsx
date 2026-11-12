import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
} from '@stacks/transactions';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';
import { Approver, Badge } from '@leather.io/ui';

import { NoPostConditions } from './no-post-conditions';
import { PostConditionList } from './post-condition-list';
import { PostConditionModeWarning } from './post-condition-mode-warning';

const postConditionModeLabel: Record<PostConditionModeName, string> = {
  allow: 'Allow mode',
  deny: 'Deny mode',
  originator: 'Originator mode',
};

function toPostConditionModeName(
  mode: PostConditionMode | PostConditionModeName
): PostConditionModeName {
  if (mode === PostConditionMode.Allow || mode === 'allow') return 'allow';
  if (mode === PostConditionMode.Originator || mode === 'originator') return 'originator';
  return 'deny';
}

interface PostConditionModeSubheaderProps {
  postConditionMode: PostConditionModeName;
}
function PostConditionModeSubheader({ postConditionMode }: PostConditionModeSubheaderProps) {
  return (
    <Approver.Subheader gap="space.02">
      Post conditions
      <Badge
        label={postConditionModeLabel[postConditionMode]}
        variant={postConditionMode === 'allow' ? 'warning' : 'default'}
      />
    </Approver.Subheader>
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
  const modeName = toPostConditionModeName(postConditionMode);

  if (modeName === 'allow')
    return (
      <Approver.Section>
        <PostConditionModeSubheader postConditionMode={modeName} />
        <PostConditionModeWarning />
      </Approver.Section>
    );

  return (
    <Approver.Section>
      <PostConditionModeSubheader postConditionMode={modeName} />
      {postConditions.length ? (
        <PostConditionList
          postConditions={postConditions.map(pc => ensurePostConditionWireFormat(pc))}
        />
      ) : (
        <NoPostConditions postConditionMode={modeName} />
      )}
    </Approver.Section>
  );
}
